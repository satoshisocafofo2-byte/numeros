import test from "node:test";
import assert from "node:assert/strict";

// MockAPI falsa em memória: /usuarios/:id e /partidas. O ranking (/api) falha, como sem Supabase.
function setup({ schemaHasTitleFields = true, matches = [], initial = {} } = {}) {
  const user = { id: "7", username: "ana", salt: "s", passwordHash: "h", role: "user", ...initial };
  const puts = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes("/api/leaderboard")) throw new Error("sem servidor de ranking");
    if (u.includes("/usuarios/7")) {
      if (opts.method === "PUT") {
        const body = JSON.parse(opts.body);
        puts.push(body);
        for (const [k, v] of Object.entries(body)) {
          if (schemaHasTitleFields || (k !== "titles" && k !== "equippedTitle")) user[k] = v;
        }
      }
      return new Response(JSON.stringify(user), { status: 200 });
    }
    if (u.includes("/partidas")) return new Response(JSON.stringify(matches), { status: 200 });
    return new Response("nf", { status: 404 });
  };
  return { user, puts };
}

const base = (n, over) => ({ id: String(n), playerName: "ana", owner: "ana", gameMode: "Online", score: 400, result: "Victory", date: new Date(Date.UTC(2026, 0, n + 1)).toISOString(), ...over });
const { syncTitles, equipTitle, loadStored } = await import("../src/services/titleService.js");
const session = { id: "7", username: "ana" };

test("desbloqueia, salva na conta e preserva hash/salt", async () => {
  const { user, puts } = setup({ matches: [base(1)] });
  const r = await syncTitles(session);
  assert.deepEqual(r.newly, ["the-newblood"]);
  assert.ok(JSON.parse(user.titles)["the-newblood"]);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].passwordHash, "h");
  assert.equal(puts[0].salt, "s");
});

test("persistência: depois de 'recarregar', continua desbloqueado e sem duplicar", async () => {
  const { user, puts } = setup({ matches: [base(1)] });
  await syncTitles(session);
  const stored = await loadStored(session);
  assert.ok(stored.unlocked["the-newblood"]);
  const again = await syncTitles(session);
  assert.deepEqual(again.newly, []);
  assert.equal(puts.length, 1); // 2ª sincronização não grava nada
  assert.equal(Object.keys(JSON.parse(user.titles)).length, 1);
});

test("título guardado nunca é perdido, mesmo que o histórico seja apagado", async () => {
  const { puts } = setup({ matches: [], initial: { titles: JSON.stringify({ "the-newblood": "2026-01-02T00:00:00.000Z" }), equippedTitle: "the-newblood" } });
  const r = await syncTitles(session);
  assert.ok(r.unlocked["the-newblood"]);
  assert.equal(r.equipped, "the-newblood");
  assert.deepEqual(r.newly, []);
  assert.equal(puts.length, 0);
});

test("equipar: só um por vez, só desbloqueado, e fica salvo", async () => {
  const { user } = setup({ matches: Array.from({ length: 10 }, (_, i) => base(i + 1)) });
  const s = await syncTitles(session);
  assert.ok(s.unlocked["the-newblood"] && s.unlocked["challenger"] && s.unlocked["iron-will"]);
  assert.equal(await equipTitle(session, "challenger"), "challenger");
  assert.equal(user.equippedTitle, "challenger");
  assert.equal(await equipTitle(session, "iron-will"), "iron-will");
  assert.equal(user.equippedTitle, "iron-will"); // trocou, não acumulou
  await assert.rejects(() => equipTitle(session, "voidwalker"), /não foi desbloqueado/);
  assert.equal(await equipTitle(session, ""), "");
  assert.equal(user.equippedTitle, "");
});

test("partidas cadastradas à mão não desbloqueiam nada", async () => {
  setup({ matches: Array.from({ length: 60 }, (_, i) => base(i + 1, { origin: "manual" })) });
  const r = await syncTitles(session);
  assert.deepEqual(r.newly, []);
});

test("sem os campos na MockAPI, avisa em vez de fingir que salvou", async () => {
  setup({ schemaHasTitleFields: false, matches: [base(1)] });
  await assert.rejects(() => syncTitles(session), /Faltam os campos/);
});

test("sessão antiga sem id pede novo login", async () => {
  setup();
  await assert.rejects(() => syncTitles({ username: "ana" }), /saia e entre de novo/);
});
