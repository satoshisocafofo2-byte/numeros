/*
 * Números em Duelo — versão web
 *
 * A classe Board abaixo é um porte 1:1 da lógica de Board.gd (Godot):
 * mesma grade 8x5, mesma fusão por grupo conectado (flood fill), mesma
 * gravidade, mesmo combo (janela de 2.5s), mesma curva de dificuldade
 * (spawn por "tier" de tempo) e mesma fórmula de pressão do adversário
 * (delay = max(0.18, 0.8 - sqrt(score)*0.035)). Só a camada de desenho
 * (canvas, com cantos arredondados/brilho/animação) e a entrada
 * (teclado + toque via Pointer Events) são específicas da web.
 */

/* ============================== Board ============================== */

const ROWS = 8;
const COLS = 5;
const CELL = 44;
const GAP = 4;
const BOARD_W = COLS * (CELL + GAP) - GAP;
const BOARD_H = ROWS * (CELL + GAP) - GAP;

const COLORS = {
  2: "#3b82f6", 4: "#22c55e", 8: "#ef4444", 16: "#a855f7",
  32: "#f97316", 64: "#eab308", 128: "#ec4899", 256: "#06b6d4",
  512: "#1d4ed8", 1024: "#d4af37", 2048: "#dc2626", 4096: "#dc2626",
};
const EMPTY_COLOR = "#1a1e27";
const COMBO_WINDOW_MS = 2500;
const TAP_DEBOUNCE_MS = 150;

class Board {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onScoreChanged = null; // (score, combo) => void
    this.onGameOver = null;     // () => void
    this.onNextChanged = null;  // (valor do próximo bloco) => void
    this.nextValue = null;      // próximo bloco que vai cair (pré-sorteado)
    this._lastTap = -99999;
    this._resizeCanvas();
    this._bindPointer();
    this.reset();
  }

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = BOARD_W * dpr;
    this.canvas.height = BOARD_H * dpr;
    this.canvas.style.aspectRatio = `${BOARD_W} / ${BOARD_H}`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  reset() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.score = 0;
    this.combo = 0;
    this.gameOver = false;
    this.elapsed = 0;
    this.lastMergeTime = -999999;
    this.waitTime = 0.8;
    this.dropTimer = this.waitTime;
    this.visualRow = 0;
    this.pulses = [];
    this.nextValue = null; // novo jogo: o 1º bloco e o próximo são sorteados agora
    this._spawnPiece();
    this._emitScore();
  }

  _emitScore() {
    if (this.onScoreChanged) this.onScoreChanged(this.score, this.combo);
  }

  // Dificuldade progressiva: quanto mais tempo de partida, maior a chance
  // de números maiores aparecerem (em degraus suaves, não abruptos).
  _getSpawnValue() {
    const tier = Math.min(3, Math.floor(this.elapsed / 25));
    const pools = [[2, 4], [2, 4, 8], [2, 4, 8, 16], [4, 8, 16, 32]];
    const pool = pools[tier];
    let idx = Math.floor(Math.pow(Math.random(), 2) * pool.length);
    idx = Math.min(idx, pool.length - 1);
    return pool[idx];
  }

  _spawnPiece() {
    const col = Math.floor(COLS / 2);
    if (this.grid[0][col] !== 0) {
      this.gameOver = true;
      if (this.onGameOver) this.onGameOver();
      return;
    }
    // O bloco que cai agora é o que estava anunciado como "próximo"; em
    // seguida sorteamos o novo "próximo". Mesma regra de sorteio de antes,
    // só adiantada em uma peça (nada muda na jogabilidade).
    const value = this.nextValue != null ? this.nextValue : this._getSpawnValue();
    this.nextValue = this._getSpawnValue();
    this.piece = { row: 0, col, value };
    this.visualRow = 0;
    if (this.onNextChanged) this.onNextChanged(this.nextValue);
  }

  _canMoveTo(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && this.grid[r][c] === 0;
  }

  moveSide(dir) {
    if (this.gameOver || !this.piece) return;
    const nc = this.piece.col + dir;
    if (this._canMoveTo(this.piece.row, nc)) this.piece.col = nc;
  }

  softDrop() {
    if (this.gameOver || !this.piece) return;
    if (this._canMoveTo(this.piece.row + 1, this.piece.col)) this.piece.row += 1;
    else this._land();
  }

  hardDrop() {
    if (this.gameOver || !this.piece) return;
    while (this._canMoveTo(this.piece.row + 1, this.piece.col)) this.piece.row += 1;
    this._land();
  }

  // Toque/clique: desliza a peça até a coluna alvo (se o caminho estiver
  // livre) e já derruba na hora — mesmo gesto usado na versão mobile.
  moveToColumnAndDrop(column) {
    if (this.gameOver || !this.piece) return;
    while (this.piece.col < column && this._canMoveTo(this.piece.row, this.piece.col + 1)) this.piece.col += 1;
    while (this.piece.col > column && this._canMoveTo(this.piece.row, this.piece.col - 1)) this.piece.col -= 1;
    this.hardDrop();
  }

  // Busca em profundidade: todas as peças conectadas (cima/baixo/esq/dir)
  // com o mesmo valor da célula inicial, incluindo ela mesma.
  _findConnectedGroup(sr, sc) {
    const val = this.grid[sr][sc];
    const visited = new Set();
    const stack = [[sr, sc]];
    const group = [];
    while (stack.length) {
      const [r, c] = stack.pop();
      const key = r + "_" + c;
      if (visited.has(key)) continue;
      visited.add(key);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (this.grid[r][c] !== val) continue;
      group.push([r, c]);
      stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
    return group;
  }

  // Primeiro grupo de 2+ peças iguais conectadas vira uma peça só, na mais
  // perto do chão (critério de desempate: mais à esquerda). Dobra uma vez
  // por peça extra do grupo (3 peças de 16 -> 16 * 2^2 = 64).
  _tryMergeOnce() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] === 0) continue;
        const group = this._findConnectedGroup(r, c);
        if (group.length < 2) continue;

        const val = this.grid[r][c];
        let survivor = group[0];
        for (const pos of group) {
          if (pos[0] > survivor[0] || (pos[0] === survivor[0] && pos[1] < survivor[1])) survivor = pos;
        }
        const newValue = val * Math.pow(2, group.length - 1);
        for (const pos of group) {
          if (pos !== survivor) this.grid[pos[0]][pos[1]] = 0;
        }
        this.grid[survivor[0]][survivor[1]] = newValue;
        this.pulses.push({ r: survivor[0], c: survivor[1], start: performance.now() });
        return newValue - val;
      }
    }
    return 0;
  }

  _applyGravity() {
    for (let c = 0; c < COLS; c++) {
      const vals = [];
      for (let r = 0; r < ROWS; r++) if (this.grid[r][c] !== 0) vals.push(this.grid[r][c]);
      for (let r = ROWS - 1; r >= 0; r--) this.grid[r][c] = vals.length ? vals.pop() : 0;
    }
  }

  _land() {
    this.grid[this.piece.row][this.piece.col] = this.piece.value;

    let gained = 0;
    let g = 1;
    while (g > 0) {
      g = this._tryMergeOnce();
      gained += g;
      this._applyGravity();
    }

    const now = performance.now();
    if (gained > 0) {
      if (now - this.lastMergeTime < COMBO_WINDOW_MS) this.combo += 1;
      else this.combo = 1;
      this.lastMergeTime = now;
      gained = Math.round(gained * (1 + (this.combo - 1) * 0.15));
    } else if (now - this.lastMergeTime > COMBO_WINDOW_MS) {
      this.combo = 0;
    }
    this.score += gained;
    this._emitScore();
    this._spawnPiece();
  }

  // Chamado sempre que a pontuação do ADVERSÁRIO (ou, no solo, o tempo de
  // jogo) muda. Raiz quadrada suaviza a curva; min/max evitam velocidade
  // extrema.
  setOpponentScore(opponentScore) {
    this.waitTime = Math.max(0.18, 0.8 - Math.sqrt(Math.max(0, opponentScore)) * 0.035);
  }

  update(dt) {
    if (this.gameOver) return;
    this.elapsed += dt;
    this.dropTimer -= dt;
    if (this.dropTimer <= 0) {
      this._tick();
      this.dropTimer = this.waitTime;
    }
    // Interpolação visual (não mexe na lógica em si, só deixa a queda
    // suave em vez de "pular" linha a linha).
    const target = this.piece ? this.piece.row : this.visualRow;
    this.visualRow += (target - this.visualRow) * Math.min(1, dt * 16);
  }

  _tick() {
    if (this.gameOver) return;
    if (this.piece && this._canMoveTo(this.piece.row + 1, this.piece.col)) this.piece.row += 1;
    else this._land();
  }

  _bindPointer() {
    this.canvas.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        if (this.gameOver) return;
        const now = performance.now();
        if (now - this._lastTap < TAP_DEBOUNCE_MS) return;
        this._lastTap = now;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

        const column = Math.min(COLS - 1, Math.max(0, Math.floor((x / rect.width) * COLS)));
        this.moveToColumnAndDrop(column);
      },
      { passive: false }
    );
  }

  /* ---------------------------- Desenho ---------------------------- */

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const isPieceCell = this.piece && this.piece.row === r && this.piece.col === c && !this.gameOver;
        if (isPieceCell) continue;
        this._drawCell(r, c, this.grid[r][c], false);
      }
    }
    if (this.piece && !this.gameOver) {
      this._drawCell(this.visualRow, this.piece.col, this.piece.value, true);
    }
  }

  _drawCell(r, c, value, isActive) {
    const ctx = this.ctx;
    const x = c * (CELL + GAP);
    const y = r * (CELL + GAP);
    const color = value ? COLORS[value] || EMPTY_COLOR : EMPTY_COLOR;
    const radius = 9;

    let scale = 1;
    if (!isActive) {
      const pulse = this.pulses.find((p) => p.r === r && p.c === c);
      if (pulse) {
        const t = (performance.now() - pulse.start) / 260;
        if (t < 1) scale = 1 + Math.sin(t * Math.PI) * 0.12;
        else this.pulses.splice(this.pulses.indexOf(pulse), 1);
      }
    }

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    if (isActive) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
    }

    roundRectPath(ctx, x, y, CELL, CELL, radius);
    if (value) {
      const grad = ctx.createLinearGradient(x, y, x, y + CELL);
      grad.addColorStop(0, lighten(color, 0.16));
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = EMPTY_COLOR;
    }
    ctx.fill();

    ctx.shadowBlur = 0;
    if (isActive) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.stroke();
    } else if (!value) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.stroke();
    }

    if (value) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.font = "700 15px " + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(value), cx, cy + 1);
    }
    ctx.restore();
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lighten(hex, amt) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round(255 * amt);
  let g = ((num >> 8) & 0xff) + Math.round(255 * amt);
  let b = (num & 0xff) + Math.round(255 * amt);
  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);
  return `rgb(${r},${g},${b})`;
}

export { Board, ROWS, COLS, CELL, GAP, BOARD_W, BOARD_H, COLORS };
