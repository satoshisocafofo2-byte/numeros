import test from "node:test";
import assert from "node:assert/strict";
import { TITLES, countableMatches, evaluateTitles, mergeUnlocked, parseUnlocked, rankOf, validEquipped } from "../src/game/titles.js";
import { evaluate } from "../src/game/achievements.js";

let id = 0;
let day = 0;
const m = (over) => ({ id: String(++id), playerName: "ana", owner: "ana", gameMode: "Online", score: 500, result: "Victory", date: new Date(Date.UTC(2026, 0, 1, 0, 0, ++day)).toISOString(), ...over });
const wins = (n, over = {}) => Array.from({ length: n }, () => m(over));
const run = (matches, extra = {}) => {
  const auto = countableMatches(matches, "ana");
  return evaluateTitles({ matches, username: "ana", achievements: evaluate(auto, "ana"), ranking: null, ...extra });
};
const unlockedIds = (r) => Object.keys(r).filter((k) => r[k].unlocked);

/* ---------- a coleção ---------- */
test("existem exatamente 19 títulos, com ids únicos", () => {
  assert.equal(TITLES.length, 19);
  assert.equal(new Set(TITLES.map((t) => t.id)).size, 19);
});

test("nomes exatos, na ordem oficial", () => {
  assert.deepEqual(TITLES.map((t) => t.name), [
    "The Newblood", "Challenger", "Lucky One",
    "Iron Will", "The Conqueror", "The Vanguard",
    "Voidwalker", "The Unforgiven", "Soul Reaper", "King of Ruins", "Apex Predator", "Pillar of Honor",
    "Deathless", "The Eternal King", "Beyond the Void", "The Last Sovereign", "Ascended",
    "The First", "Authority Breaker",
  ]);
});

test("raridades: 3 comuns, 3 raros, 6 épicos, 5 lendários, 2 secretos", () => {
  const count = (r) => TITLES.filter((t) => t.rarity === r).length;
  assert.deepEqual([count("common"), count("rare"), count("epic"), count("legendary"), count("secret")], [3, 3, 6, 5, 2]);
});

test("descrições exatas", () => {
  const d = Object.fromEntries(TITLES.map((t) => [t.name, t.description]));
  assert.equal(d["The Newblood"], "Every legend begins somewhere.");
  assert.equal(d["Lucky One"], "Fortune favors those who refuse to surrender.");
  assert.equal(d["The Vanguard"], "Always the first to lead, never the last to fall.");
  assert.equal(d["Beyond the Void"], "Numbers cannot measure the limits of your power.");
  assert.equal(d["Authority Breaker"], "Even those who rule can be brought down.");
  assert.ok(TITLES.every((t) => t.description && t.requirement));
});

test("só os 2 títulos secretos escondem o requisito", () => {
  assert.deepEqual(TITLES.filter((t) => t.secret).map((t) => t.name), ["The First", "Authority Breaker"]);
});

test("títulos sem dados no projeto estão marcados como indisponíveis, com motivo", () => {
  const unavailable = TITLES.filter((t) => t.kind === "unavailable").map((t) => t.name).sort();
  assert.deepEqual(unavailable, ["Authority Breaker", "Lucky One", "Pillar of Honor", "The First", "The Vanguard"]);
  assert.ok(TITLES.filter((t) => t.kind === "unavailable").every((t) => t.reason.length > 10));
});

/* ---------- regras ---------- */
test("The Newblood: 1ª vitória (online), com a data da partida", () => {
  const first = m({});
  const r = run([m({ result: "Defeat" }), first]);
  assert.equal(r["the-newblood"].unlocked, true);
  assert.equal(r["the-newblood"].unlockedAt, first.date);
  assert.equal(run([m({ gameMode: "Solo", result: "Record" })])["the-newblood"].unlocked, false);
});

test("Challenger: 10 partidas de qualquer modo", () => {
  assert.equal(run(wins(9, { gameMode: "Solo", result: "Defeat" }))["challenger"].unlocked, false);
  assert.equal(run(wins(10, { gameMode: "Solo", result: "Defeat" }))["challenger"].unlocked, true);
});

test("vitórias: 50 / 100 / 150 / 500", () => {
  assert.equal(run(wins(49))["the-conqueror"].unlocked, false);
  assert.equal(run(wins(50))["the-conqueror"].unlocked, true);
  assert.equal(run(wins(99))["voidwalker"].unlocked, false);
  assert.equal(run(wins(100))["voidwalker"].unlocked, true);
  assert.equal(run(wins(149))["soul-reaper"].unlocked, false);
  assert.equal(run(wins(150))["soul-reaper"].unlocked, true);
  assert.equal(run(wins(499))["the-eternal-king"].unlocked, false);
  assert.equal(run(wins(500))["the-eternal-king"].unlocked, true);
});

test("King of Ruins: 500 partidas", () => {
  assert.equal(run(wins(499, { gameMode: "Solo", result: "Defeat" }))["king-of-ruins"].unlocked, false);
  assert.equal(run(wins(500, { gameMode: "Solo", result: "Defeat" }))["king-of-ruins"].unlocked, true);
});

test("sequências 10 / 20 / 50 zeram na derrota", () => {
  const broken = [...wins(9), m({ result: "Defeat" }), ...wins(9)];
  assert.equal(run(broken)["iron-will"].unlocked, false);
  assert.equal(run([...wins(9), ...wins(1)])["iron-will"].unlocked, true);
  assert.equal(run(wins(19))["the-unforgiven"].unlocked, false);
  assert.equal(run(wins(20))["the-unforgiven"].unlocked, true);
  assert.equal(run([...wins(49), m({ result: "Defeat" }), ...wins(49)])["deathless"].unlocked, false);
  assert.equal(run(wins(50))["deathless"].unlocked, true);
});

test("empate (salvo como Defeat) também zera a sequência", () => {
  assert.equal(run([...wins(5), m({ result: "Defeat", score: 100 }), ...wins(5)])["iron-will"].unlocked, false);
});

test("Beyond the Void: ESTRITAMENTE mais de 300.000 pontos", () => {
  assert.equal(run([m({ gameMode: "Solo", result: "Record", score: 300000 })])["beyond-the-void"].unlocked, false);
  assert.equal(run([m({ gameMode: "Solo", result: "Record", score: 300001 })])["beyond-the-void"].unlocked, true);
});

test("Ascended: todas as conquistas de uma categoria (Combate)", () => {
  const combat = [...wins(99), m({ score: 2000 })]; // 100 vitórias seguidas, 1 com 2.000 pontos
  const r = run(combat);
  assert.equal(r["ascended"].unlocked, true);
  assert.equal(run(wins(99))["ascended"].unlocked, false);
});

test("Ascended mostra o progresso da categoria mais adiantada", () => {
  const r = run(wins(5));
  assert.equal(r["ascended"].unlocked, false);
  assert.ok(r["ascended"].target > 0);
});

test("ranking global: Top 10 e 1º lugar", () => {
  const board = (pos) => Array.from({ length: 12 }, (_, i) => ({ name: i + 1 === pos ? "Ana" : `outro${i}`, score: 1000 - i }));
  let r = run([], { ranking: board(10) });
  assert.equal(r["apex-predator"].unlocked, true);
  assert.equal(r["the-last-sovereign"].unlocked, false);
  r = run([], { ranking: board(1) });
  assert.equal(r["apex-predator"].unlocked, true);
  assert.equal(r["the-last-sovereign"].unlocked, true);
  r = run([], { ranking: board(11) });
  assert.equal(r["apex-predator"].unlocked, false);
  assert.equal(run([], { ranking: null })["apex-predator"].unlocked, false);
  assert.equal(rankOf("ANA", board(3)), 3);
});

test("partidas cadastradas à mão (origin = manual) nunca contam", () => {
  const fake = wins(500, { origin: "manual" });
  assert.equal(unlockedIds(run(fake)).length, 0);
  assert.equal(countableMatches([m({ origin: "manual" }), m({ origin: "auto" }), m({})], "ana").length, 2);
});

test("ignora Convidado, outro dono e outro nome", () => {
  const list = [m({ playerName: "Convidado" }), m({ owner: "bia", playerName: "bia" }), m({ playerName: "outro" })];
  assert.equal(unlockedIds(run(list)).length, 0);
});

test("os 5 títulos indisponíveis nunca desbloqueiam, mesmo com estatísticas enormes", () => {
  const r = run(wins(600), { ranking: [{ name: "ana", score: 1 }] });
  for (const k of ["lucky-one", "the-vanguard", "pillar-of-honor", "the-first", "authority-breaker"]) assert.equal(r[k].unlocked, false, k);
});

/* ---------- guardado ---------- */
test("parseUnlocked ignora lixo e ids desconhecidos", () => {
  assert.deepEqual(parseUnlocked("não é json"), {});
  assert.deepEqual(parseUnlocked(undefined), {});
  assert.deepEqual(parseUnlocked('["x"]'), {});
  assert.deepEqual(parseUnlocked('{"challenger":"2026-01-01T00:00:00.000Z","fake":"x"}'), { challenger: "2026-01-01T00:00:00.000Z" });
});

test("mergeUnlocked não concede duas vezes e mantém a data mais antiga", () => {
  const out = mergeUnlocked({ challenger: "2026-02-01T00:00:00.000Z" }, { challenger: "2026-03-01T00:00:00.000Z", "iron-will": "2026-04-01T00:00:00.000Z" });
  assert.equal(out.challenger, "2026-02-01T00:00:00.000Z");
  assert.equal(Object.keys(out).length, 2);
  assert.equal(mergeUnlocked({ challenger: "2026-03-01T00:00:00.000Z" }, { challenger: "2026-01-01T00:00:00.000Z" }).challenger, "2026-01-01T00:00:00.000Z");
});

test("só dá para equipar título desbloqueado", () => {
  assert.equal(validEquipped("challenger", { challenger: "x" }), "challenger");
  assert.equal(validEquipped("challenger", {}), "");
  assert.equal(validEquipped("", { challenger: "x" }), "");
});
