# Servidor do modo Online — Números em Duelo

Servidor Node + WebSocket bem pequeno (não simula o jogo, só repassa
placar/combo/fim de jogo entre os dois navegadores). Feito pra rodar de
graça no [Render](https://render.com).

## Por que um servidor separado?

O resto do site (`index.html`, `game.js`, `api/`) roda na Vercel, que é
serverless — perfeita pra páginas estáticas e pro ranking, mas as funções
lá são sob demanda e não seguram uma conexão aberta. O modo Online
precisa de uma conexão que fique viva o tempo da partida, então mora
num serviço separado (Render), enquanto o resto do site continua na
Vercel.

## Passo a passo (uns 5 minutos)

1. **Crie uma conta** em [render.com](https://render.com) (dá pra entrar
   com o GitHub).
2. **Suba a pasta `online-server/`** (só ela, não o projeto inteiro) pra
   um repositório no GitHub. Se preferir, pode ser um repositório novo
   só com esse conteúdo.
3. No painel do Render, **New → Web Service** e conecte esse
   repositório.
4. Configuração do serviço:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
5. Clique em **Create Web Service** e espere o primeiro deploy terminar
   (a aba de logs mostra `Servidor online do Números em Duelo rodando na
   porta ...` quando estiver pronto).
6. O Render te dá uma URL tipo `https://numeros-duelo-online.onrender.com`.
   Troque `https://` por `wss://` e cole em `game.js`, na constante
   `ONLINE_WS_URL` (bem no início da seção "App / telas"):

   ```js
   const ONLINE_WS_URL = "wss://numeros-duelo-online.onrender.com";
   ```

7. Reimplante o site (a parte estática, na Vercel) com essa mudança. O
   botão **Jogar Online** já passa a funcionar pra qualquer pessoa
   acessando o link, em qualquer aparelho.

> O Render pode pedir um cartão só pra verificação anti-fraude na
> criação da conta (uma cobrança de US$1 que é cancelada na hora) — o
> plano Free em si continua sem custo.

## Sobre o plano grátis (o que esperar)

- **"Dorme" depois de ~15 min sem uso**, e demora uns 30-60s pra
  "acordar" na próxima conexão — é a mensagem que o jogo mostra
  ("pode levar até 1 min na 1ª vez do dia"). Enquanto a partida está
  rolando (mensagens WebSocket ativas), o serviço fica acordado
  normalmente.
- Não precisa de banco de dados nem de nenhuma variável de ambiente —
  tudo fica em memória (salas e fila de partida rápida somem se o
  servidor reiniciar, o que é raro e sem problema pra esse tipo de
  jogo).
- Se quiser manter sempre acordado, dá pra trocar pro plano pago
  (Starter) mais pra frente, ou usar um serviço externo de "ping"
  (ex. UptimeRobot) — não é necessário pra jogar casualmente.

## Testar localmente antes de hospedar

```bash
cd online-server
npm install
npm start
# servidor sobe em ws://localhost:3001
```

Pra testar local, troque temporariamente `ONLINE_WS_URL` em `game.js`
para `"ws://localhost:3001"` (note: `ws://`, sem o "s", só em
`localhost`) e sirva o site com `npx serve .` na pasta principal.

## Como funciona (por dentro)

- **Partida rápida:** o cliente manda `{type:"quick", name}`; o
  servidor guarda numa fila em memória e pareia os dois primeiros que
  aparecerem.
- **Sala por código:** `{type:"create"}` gera um código de 4 caracteres;
  a outra pessoa manda `{type:"join", room:"XXXX"}` pra entrar.
- Depois de pareados, o servidor só repassa `{type:"score"}` e
  `{type:"gameover"}` de um jogador pro outro — o placar, combo e
  aumento de pressão que cada tabuleiro sofre já são calculados no
  próprio navegador, igual ao modo Local.
