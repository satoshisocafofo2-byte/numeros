# Números em Duelo — Vue 3 + Histórico de Partidas

**Aluno:** Bruno (completar com o nome completo) · **Disciplina:** Programação Web II — CEPRU/Unisc · **Trabalho final:** Minha aplicação Vue

**Recurso na MockAPI:** `https://6afcd6bf2a9c141d36b7c655.mockapi.io/number/api/partidas`

---

## 1. Propósito

Números em Duelo é um jogo de navegador de encaixe e fusão de números (grade 8×5, peças que se fundem em grupos, combo e pressão do adversário), com modos **Solo**, **Local** (2 jogadores no mesmo teclado), **Online** (tempo real, em aparelhos diferentes), **Ranking** e **Histórico**, tudo atrás de um **login**.

Para este trabalho o jogo foi migrado de HTML/CSS/JavaScript puro para **Vue 3 + Vite**, mantendo o visual, a música, os controles e a jogabilidade, e ganhou uma nova função: o **Histórico de Partidas**, um CRUD completo salvo na **MockAPI**. Toda partida terminada é registrada automaticamente e pode ser consultada, buscada, editada e excluída pela nova tela.

## 2. Por que este tema

O jogo já existia e é um projeto meu; um histórico é uma extensão natural dele: o jogador quer saber como foi nas partidas anteriores, e o ranking global só guarda a melhor pontuação de cada nome. Assim o trabalho resolve um problema real do próprio jogo, em vez de ser uma lista genérica de itens.

## 3. Público-alvo

Quem joga Números em Duelo (sozinho, com um amigo no mesmo teclado ou online) e quer acompanhar e organizar o próprio desempenho; também serve ao professor para testar o CRUD com dados que fazem sentido.

## 4. Cadastro principal: partidas

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Gerado pela MockAPI |
| `playerName` | string | Nome do jogador (obrigatório, até 24 caracteres) |
| `owner` | string | Usuário dono da partida (quem a vê no histórico) |
| `gameMode` | string | `Solo`, `Local` ou `Online` |
| `score` | número | Pontuação final (inteiro ≥ 0) |
| `result` | string | `Victory`, `Defeat` ou `Record` |
| `date` | data | Data/hora da partida (string ISO) |

**Registro automático ao terminar a partida**

- **Solo:** grava o nome salvo no navegador (ou "Jogador"), a pontuação, o modo e a data. O resultado é `Record` se a pontuação supera a maior pontuação Solo já registrada; senão `Defeat`. Se o jogador digitar outro nome no pop-up de fim de jogo e enviar ao ranking, o registro do histórico é atualizado (PUT) com esse nome.
- **Local:** grava dois registros (Jogador 1 e Jogador 2), cada um com seu placar e `Victory`/`Defeat`, no primeiro "estouro" de tabuleiro (o mesmo momento em que o jogo anuncia o vencedor).
- **Online:** cada navegador grava a *sua* partida quando os dois jogadores terminaram. Empate é gravado como `Defeat`, porque o enunciado só prevê três valores.
- Um gravador (`useMatchRecorder`) garante **um único registro por partida**, mesmo que o evento de fim de jogo dispare várias vezes. Se a MockAPI estiver fora do ar, aparece um aviso e o jogo continua normalmente.

## 5. Como o Vue conversa com a MockAPI

1. O usuário preenche o formulário (`MatchForm.vue`, campos ligados por `v-model`) e clica em *Cadastrar partida*.
2. O formulário valida os dados; se estiverem inválidos, mostra as mensagens e **não envia nada**. Se estiverem válidos, emite o evento `submit` com o objeto pronto.
3. `MatchHistory.vue` recebe o evento e chama `createMatch()` (ou `updateMatch()` na edição) de `services/matchService.js`, que faz o `fetch` (`POST` / `PUT`) para a MockAPI.
4. A MockAPI responde com o registro salvo (já com o `id`). O componente coloca essa resposta no array reativo `matches` (`matches.value = [created, ...matches.value]`).
5. Como `matches` é reativo, o Vue redesenha a lista sozinho, sem recarregar a página. Ao atualizar o navegador, `load()` faz o `GET` e os dados continuam lá, porque estão na MockAPI.

| Operação | Função | Requisição |
|---|---|---|
| Listar | `listMatches()` | `GET /partidas` |
| Cadastrar | `createMatch(dados)` | `POST /partidas` |
| Editar | `updateMatch(id, dados)` | `PUT /partidas/:id` |
| Excluir | `deleteMatch(id)` | `DELETE /partidas/:id` |

A URL **não** está espalhada pelo código: ela vive só em `src/config.js`, lida de `VITE_MOCKAPI_URL`.

## 6. Componentes e responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `App.vue` | Navegação entre telas (`screen`) e música de fundo |
| `LoginScreen.vue` | Entrar e criar conta |
| `MainMenu.vue` | Menu principal: Local, Solo, Online, Ranking, Histórico e Sair |
| `LocalGame.vue` / `SoloGame.vue` / `OnlineGame.vue` | Telas de jogo: ligam o motor (`Board`) ao Vue (canvas, placar, combo, teclado, loop) e registram a partida |
| `RankingScreen.vue` | Ranking (backend original) |
| `MatchHistory.vue` | Lista, busca por jogador, filtro por modo, mensagens de carregamento/erro/sucesso/vazio, exclusão |
| `MatchForm.vue` | Formulário de cadastro/edição com validação |
| `ConfirmDialog.vue` | Confirmação antes de excluir |
| `services/matchService.js` | Toda a comunicação com a MockAPI |
| `services/rankingService.js` | Ranking (`/api`) |
| `services/authService.js` | Cadastro, login e sessão (recurso `usuarios`) |
| `services/crypto.js` | Hash de senha (PBKDF2-SHA256 com salt) |
| `composables/useAuth.js` | Usuário logado, `isAdmin`, entrar/sair |
| `composables/useMatchRecorder.js` | Registro automático sem duplicar |
| `composables/useGameLoop.js` | Loop de animação do jogo |
| `game/Board.js` | **Motor do jogo, idêntico ao original** (grade, fusão, gravidade, combo, desenho no canvas, toque) |

## 7. Exemplo de estado reativo e props

Em `MatchHistory.vue`, o estado reativo e o filtro que depende dele:

```js
const matches = ref([]);        // lista vinda da MockAPI
const search = ref("");         // ligado ao campo de busca por v-model
const modeFilter = ref("");     // ligado ao <select> por v-model

const filteredMatches = computed(() =>
  matches.value
    .filter((m) => !modeFilter.value || m.gameMode === modeFilter.value)
    .filter((m) => m.playerName.toLowerCase().includes(search.value.trim().toLowerCase()))
);
```

Quando o usuário digita, `search` muda e a lista é recalculada na hora. A mesma tela passa dados ao formulário por **props**:

```vue
<MatchForm :match="editing" :saving="saving" :server-error="formError"
           @submit="save" @cancel="closeForm" />
```

`match` é `null` para cadastrar ou o registro escolhido para editar (o formulário o copia para seus campos), `saving` desabilita o botão durante o envio, e o formulário devolve os dados pelo evento `submit`.

## 8. Validação implementada

No `MatchForm.vue`, a função `validate()` roda antes de qualquer envio:

- **Nome obrigatório:** vazio (ou só espaços) → "Informe o nome do jogador." (máx. 24 caracteres).
- **Pontuação válida:** vazia, negativa, decimal ou não numérica → "A pontuação deve ser um número inteiro maior ou igual a zero."
- Também exige modo, resultado e data.

Se houver erro, a mensagem aparece abaixo do campo e o evento `submit` não é emitido: a requisição nem chega à MockAPI.

## 9. Uma dificuldade e como resolvi

**Registrar a partida sem duplicar.** O evento de fim de jogo pode disparar mais de uma vez: no modo Local, depois que o primeiro tabuleiro estoura o outro continua rodando e também pode estourar; no Online, a função que anuncia o resultado é chamada por dois caminhos. Registrar em cada disparo criaria registros repetidos. A solução foi criar o `useMatchRecorder`, que guarda se a partida atual já foi registrada e ignora as chamadas seguintes; ele é liberado de novo só quando o jogador reinicia ou joga outra vez.

**Outra:** no modo Online o `<canvas>` só existe depois que a tela passa para o passo "jogando" (`v-if`), então o `Board` só pode ser criado após `await nextTick()`.

## 10. Estrutura do projeto

```
index.html
vite.config.js
package.json
.env.example
public/assets/audio/theme.mp3       música (tocando em loop)
api/                                ranking global (funções serverless da Vercel + Supabase), como no original
online-server/                      servidor WebSocket do modo Online, como no original
scripts/create-admin.mjs            cria/redefine a conta de admin (pede a senha no terminal)
src/
  main.js
  App.vue
  config.js                         URL da MockAPI e do servidor online
  styles.css                        CSS original + seção "Histórico de Partidas"
  game/Board.js  game/helpers.js
  components/  (MainMenu, LocalGame, SoloGame, OnlineGame, RankingScreen, MatchHistory, MatchForm, ConfirmDialog)
  composables/ (useGameLoop, useMatchRecorder)
  services/    (matchService, rankingService)
```

## 10b. Login e permissões

- **Contas:** qualquer pessoa cria a sua na tela de login. A senha vira um hash PBKDF2-SHA256 com salt aleatório (Web Crypto) e só o hash vai para a MockAPI; a senha em si nunca é guardada nem enviada.
- **Administrador:** o usuário é `tr3nd_br`. A **senha não está no código**: você a define uma vez com `npm run create-admin` (digitada no terminal, sem aparecer na tela). O mesmo comando redefine a senha se você esquecer. Esse nome é reservado, então ninguém consegue se cadastrar com ele.
- **Admin:** vê o histórico de todos e pode registrar, editar e excluir partidas.
- **Usuário comum:** vê **apenas as próprias partidas** e não pode registrar, editar nem excluir manualmente. As partidas dele continuam sendo gravadas sozinhas ao terminar de jogar (Solo, Local e Online), sempre na conta dele.
- No modo Local, o Jogador 1 é a conta logada e o segundo jogador entra como "Convidado" (as duas linhas pertencem à conta logada).

**Segurança (leia):** a MockAPI é aberta e não tem autenticação, e todo o controle de acesso roda no navegador. Isso organiza o uso do jogo, mas quem conhece a URL da MockAPI consegue ler ou alterar os dados direto, inclusive os hashes das senhas. Para proteção de verdade, o login e o filtro por usuário precisam ficar num backend (por exemplo, nas funções `api/` da Vercel que o projeto já usa).

## 11. Criar o recurso na MockAPI

1. Em [mockapi.io](https://mockapi.io), crie um projeto e um recurso chamado **`partidas`**.
2. Campos do recurso: `playerName` (String), `gameMode` (String), `score` (Number), `result` (String) e `date` (String ou Date). O `id` é gerado automaticamente.
3. Cadastre alguns registros de exemplo para a demonstração (pode ser pela própria tela de histórico).
4. Crie também o recurso **`usuarios`** com os campos `username` (String), `passwordHash` (String), `salt` (String), `role` (String) e `createdAt` (String).
5. No recurso `partidas`, adicione o campo **`owner`** (String).
6. Copie a URL base do projeto (`https://6afcd6bf2a9c141d36b7c655.mockapi.io/number/api`) para o `.env` (veja abaixo). O recurso `partidas` é acrescentado automaticamente.

> A MockAPI pode responder `404` quando o recurso está vazio; a interface trata isso como "lista vazia".

## 12. Instalação e execução

```bash
npm install
cp .env.example .env     # opcional: a URL da MockAPI já é o padrão em src/config.js
npm run create-admin     # cria a conta tr3nd_br (pede a senha no terminal)
npm run dev              # desenvolvimento (http://localhost:5173)
npm run build            # gera a pasta dist
npm run preview          # testa o build
```

O Ranking Global depende das funções em `api/`: em `npm run dev` ele aparece como indisponível, a menos que você defina `VITE_API_PROXY_TARGET` no `.env` (apontando para um deploy da Vercel) ou rode `vercel dev`. O resto do jogo e o Histórico funcionam normalmente.

**Deploy na Vercel:** suba a pasta para o GitHub e importe o projeto; a Vercel detecta o Vite sozinha. Cadastre `VITE_MOCKAPI_URL` (e, se quiser, `VITE_ONLINE_WS_URL`) em *Settings → Environment Variables*.

## 13. Roteiro de testes

- Login: criar conta, sair, entrar; senha errada; nome `tr3nd_br` no cadastro (deve ser recusado).
- Permissões: com conta comum, o Histórico mostra só as suas partidas e não há botões de registrar/editar/excluir; com o admin, aparecem todas e os botões.
- Solo: jogar até estourar → aparece "Partida registrada no histórico." → conferir no histórico (Solo, `Record` na primeira vez).
- Local: estourar um tabuleiro → dois registros (Vitória/Derrota); reiniciar e repetir.
- Online: duas abas/aparelhos, jogar até os dois estourarem → um registro por jogador.
- Histórico: cadastrar, editar, buscar por nome, filtrar por modo, excluir (com confirmação), tentar enviar com nome vazio e pontuação negativa, atualizar a página e conferir que os dados continuam.

---

# Anexos do projeto original

## Controles

- **Local (2 jogadores, mesmo teclado):** Jogador 1 usa `A`/`D` mover,
  `S` descer, `W` derrubar. Jogador 2 usa as setas, `↓` descer, `↑`
  derrubar.
- **Solo e Online:** as mesmas duas combinações de teclas funcionam
  juntas (tanto faz).
- **Toque (celular/tablet):** em qualquer modo, toque na coluna do
  tabuleiro onde quer que a peça caia — ela desliza pra lá e já derruba
  na hora. Cada tabuleiro só reage a toques dentro da própria área, então
  dá pra duas pessoas jogarem lado a lado na mesma tela.

## Sobre a música

O arquivo em `public/assets/audio/theme.mp3` é o que você enviou, tocando em
loop como trilha de fundo. Navegadores bloqueiam áudio automático antes
de qualquer interação do usuário — o jogo tenta iniciar a música no
primeiro toque/clique na página, e tem um botão de mudo (Som on/Som off) no canto
do menu. Ele pesa uns 4 MB; se quiser um carregamento mais leve
(streaming em vez de baixar tudo de uma vez, ou uma versão comprimida),
é só pedir.

## Modo Online (2 jogadores, tempo real, em aparelhos diferentes)

Já vem implementado nesta versão! Cada navegador roda o próprio
tabuleiro (igual ao modo Local) e um servidor pequeno à parte
(`online-server/`) repassa placar/combo/fim de jogo entre os dois em
tempo real — partida rápida com desconhecido ou sala por código de 4
letras pra jogar com alguém específico.

Ele só não funciona **até você hospedar esse servidor** (grátis, uns 5
minutos) e apontar o jogo pra ele — veja o passo a passo completo em
[`online-server/README.md`](online-server/README.md). Sem isso, o botão
**Jogar Online** mostra um aviso pedindo pra configurar. Resumo rápido:

1. Suba a pasta `online-server/` num repositório no GitHub.
2. Crie um **Web Service** grátis apontando pra ela no
   [Render](https://render.com) (`npm install` / `npm start`).
3. Cole a URL que o Render te der (trocando `https://` por `wss://`) em
   `VITE_ONLINE_WS_URL` no `.env` (ou na constante `ONLINE_WS_URL` de `src/config.js`).
4. Reimplante o site na Vercel (e cadastre `VITE_ONLINE_WS_URL` nas variáveis de ambiente de lá).

## Ativando o Ranking Global com Supabase (uns 5 minutos)

Sem isso, o modo Solo e a aba Ranking continuam funcionando, mas
mostram uma mensagem de "ranking não configurado" em vez de salvar
pontuação — as funções em `api/` detectam a ausência das variáveis e
avisam o frontend, em vez de quebrar.

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e
   depois **New Project** (o plano Free não pede cartão e é mais do
   que suficiente pra esse jogo).
2. Dentro do projeto, abra o **SQL Editor** (menu lateral) e rode:

   ```sql
   create table leaderboard (
     id bigint generated always as identity primary key,
     name text not null,
     score integer not null,
     updated_at timestamptz not null default now()
   );

   create unique index leaderboard_name_lower_idx
     on leaderboard (lower(name));
   ```

   Isso cria a tabela e garante um nome único por jogador (sem diferenciar
   maiúsculas/minúsculas), do mesmo jeito que o ranking já se comportava
   antes.
3. Em **Project Settings → API**, copie a **Project URL** e a chave
   **service_role** (não é a `anon` — a `service_role` é a que tem
   permissão de escrita sem precisar configurar políticas de RLS; ela só
   é usada aqui dentro das funções serverless, nunca chega no
   navegador).
4. No painel do seu projeto na Vercel, vá em **Settings → Environment
   Variables** e adicione:
   - `SUPABASE_URL` → a Project URL que você copiou
   - `SUPABASE_SERVICE_ROLE_KEY` → a chave service_role

   (Se preferir, dá pra instalar a integração oficial "Supabase" pelo
   Marketplace da Vercel em vez de colar manualmente — ela já injeta
   essas duas variáveis, junto com outras que este projeto não usa.)
5. Redeploy o projeto na Vercel (aba **Deployments → Redeploy** no
   último deploy) pra essas variáveis passarem a valer.

Depois disso, `api/leaderboard.js` e `api/score.js` passam a ler/gravar
de verdade no Supabase, e o ranking vale pra qualquer pessoa jogando
pelo link, em qualquer aparelho.
