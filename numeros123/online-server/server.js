"use strict";
/*
 * Números em Duelo — servidor do modo Online
 *
 * Não simula o jogo: cada jogador roda o próprio tabuleiro no navegador
 * dele (igual ao modo Local, cada Board tem seu próprio sorteio de
 * peças). Este servidor só faz o "cabo" entre os dois — repassa placar,
 * combo e fim de jogo em tempo real, e cuida do pareamento (partida
 * rápida ou sala por código). Isso mantém o servidor extremamente leve:
 * nenhuma lógica de jogo, nenhum banco de dados, só um relay em memória.
 */

const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3001;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1 pra evitar confusão
const MATCH_TIMEOUT_MS = 60_000; // tempo máx. esperando na fila de partida rápida

function randomCode(len = 4) {
  let out = "";
  for (let i = 0; i < len; i++) out += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return out;
}

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

// server HTTP simples só pra health check (Render/UptimeRobot fazem ping aqui)
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Números em Duelo — servidor online OK\n");
});

const wss = new WebSocketServer({ server: httpServer });

/** @type {Map<string, {code: string, players: WebSocket[], names: string[]}>} */
const rooms = new Map();
/** fila de partida rápida: sockets esperando adversário aleatório */
let quickQueue = [];

function cleanupSocket(ws) {
  quickQueue = quickQueue.filter((s) => s !== ws);

  if (ws.roomCode) {
    const room = rooms.get(ws.roomCode);
    if (room) {
      const other = room.players.find((p) => p !== ws);
      send(other, { type: "opponent-left" });
      if (other) other.roomCode = null;
      rooms.delete(ws.roomCode);
    }
    ws.roomCode = null;
  }
}

function startMatch(wsA, wsB) {
  const code = randomCode();
  const room = { code, players: [wsA, wsB], names: [wsA.playerName, wsB.playerName] };
  rooms.set(code, room);
  wsA.roomCode = code;
  wsB.roomCode = code;
  send(wsA, { type: "matched", room: code, you: wsA.playerName, opponent: wsB.playerName });
  send(wsB, { type: "matched", room: code, you: wsB.playerName, opponent: wsA.playerName });
}

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.roomCode = null;
  ws.playerName = "Jogador";

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "quick": {
        ws.playerName = String(msg.name || "Jogador").slice(0, 24) || "Jogador";
        // procura alguém livre na fila (nunca pareia o socket com ele mesmo)
        quickQueue = quickQueue.filter((s) => s !== ws && s.readyState === s.OPEN);
        const opponent = quickQueue.shift();
        if (opponent) {
          startMatch(opponent, ws);
        } else {
          quickQueue.push(ws);
          send(ws, { type: "queued" });
          ws._queueTimeout = setTimeout(() => {
            if (quickQueue.includes(ws)) {
              quickQueue = quickQueue.filter((s) => s !== ws);
              send(ws, { type: "queue-timeout" });
            }
          }, MATCH_TIMEOUT_MS);
        }
        break;
      }

      case "create": {
        ws.playerName = String(msg.name || "Jogador").slice(0, 24) || "Jogador";
        let code = randomCode();
        let tries = 0;
        while (rooms.has(code) && tries < 20) {
          code = randomCode();
          tries += 1;
        }
        // sala "pendente": só 1 jogador ainda, guardamos com prefixo pra não
        // colidir com o mapa de salas cheias usado por startMatch()
        rooms.set(code, { code, players: [ws], names: [ws.playerName], pending: true });
        ws.roomCode = code;
        send(ws, { type: "created", room: code });
        break;
      }

      case "join": {
        ws.playerName = String(msg.name || "Jogador").slice(0, 24) || "Jogador";
        const code = String(msg.room || "").toUpperCase().trim();
        const room = rooms.get(code);
        if (!room || !room.pending) {
          send(ws, { type: "error", message: "Sala não encontrada (ou já começou)." });
          return;
        }
        const host = room.players[0];
        room.pending = false;
        room.players = [host, ws];
        room.names = [host.playerName, ws.playerName];
        host.roomCode = code;
        ws.roomCode = code;
        send(host, { type: "matched", room: code, you: host.playerName, opponent: ws.playerName });
        send(ws, { type: "matched", room: code, you: ws.playerName, opponent: host.playerName });
        break;
      }

      case "score": {
        const room = rooms.get(ws.roomCode);
        if (!room || room.pending) return;
        const other = room.players.find((p) => p !== ws);
        send(other, { type: "opponent-score", score: msg.score, combo: msg.combo });
        break;
      }

      case "gameover": {
        const room = rooms.get(ws.roomCode);
        if (!room || room.pending) return;
        const other = room.players.find((p) => p !== ws);
        send(other, { type: "opponent-gameover", score: msg.score });
        break;
      }

      case "leave": {
        cleanupSocket(ws);
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", () => {
    if (ws._queueTimeout) clearTimeout(ws._queueTimeout);
    cleanupSocket(ws);
  });
});

// keepalive / detecta sockets mortos (redes móveis derrubam sem avisar)
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);

wss.on("close", () => clearInterval(pingInterval));

httpServer.listen(PORT, () => {
  console.log(`Servidor online do Números em Duelo rodando na porta ${PORT}`);
});
