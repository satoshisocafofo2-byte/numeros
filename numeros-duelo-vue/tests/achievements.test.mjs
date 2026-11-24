import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, ACHIEVEMENTS } from "../src/game/achievements.js";

let id = 0;
let day = 0;
const m = (over) => ({ id: String(++id), playerName: "ana", owner: "ana", gameMode: "Online", score: 500, result: "Victory", date: new Date(Date.UTC(2026, 0, 1 + ++day)).toISOString(), ...over });
const byId = (list) => Object.fromEntries(list.map((a) => [a.id, a]));
const wins = (n, over = {}) => Array.from({ length: n }, () => m(over));

test("sem partidas nada é desbloqueado", () => {
  const r = evaluate([], "ana");
  assert.equal(r.length, ACHIEVEMENTS.length);
  assert.ok(r.every((a) => !a.unlocked && a.current === 0));
});

test("Primeiro Sangue: 1ª vitória online, com a data da partida", () => {
  const first = m({ result: "Victory" });
  const r = byId(evaluate([m({ result: "Defeat" }), first], "ana"));
  assert.equal(r["first-blood"].unlocked, true);
  assert.equal(r["first-blood"].unlockedAt, first.date);
});

test("Solo e Local não contam como vitória", () => {
  const r = byId(evaluate([m({ gameMode: "Solo", result: "Record" }), m({ gameMode: "Local", result: "Victory" })], "ana"));
  assert.equal(r["first-blood"].unlocked, false);
});

test("Veterano: 50 partidas de qualquer modo", () => {
  const list = [...wins(25, { gameMode: "Solo", result: "Defeat" }), ...wins(25, { gameMode: "Local", result: "Defeat" })];
  assert.equal(byId(evaluate(list, "ana")).veteran.unlocked, true);
  assert.equal(byId(evaluate(list.slice(1), "ana")).veteran.unlocked, false);
});

test("sequência: derrota zera; 5 = Estrategista, 10 = Imparável", () => {
  const list = [...wins(4), m({ result: "Defeat" }), ...wins(5)];
  let r = byId(evaluate(list, "ana"));
  assert.equal(r.strategist.unlocked, true);
  assert.equal(r.unstoppable.unlocked, false);
  r = byId(evaluate([...list, ...wins(5)], "ana"));
  assert.equal(r.unstoppable.unlocked, true);
});

test("sequência respeita a ordem por data, não a ordem da lista", () => {
  const list = [...wins(3), m({ result: "Defeat" }), ...wins(3)];
  const shuffled = [...list].reverse();
  assert.equal(byId(evaluate(shuffled, "ana")).strategist.unlocked, false);
});

test("Dominador (25) e Lenda da Arena (100) por vitórias", () => {
  assert.equal(byId(evaluate(wins(24), "ana")).dominator.unlocked, false);
  assert.equal(byId(evaluate(wins(25), "ana")).dominator.unlocked, true);
  assert.equal(byId(evaluate(wins(99), "ana"))["arena-legend"].unlocked, false);
  assert.equal(byId(evaluate(wins(100), "ana"))["arena-legend"].unlocked, true);
});

test("pontuação em qualquer modo: Lenda Viva (1000) e Perfeccionista (2000)", () => {
  let r = byId(evaluate([m({ gameMode: "Solo", result: "Record", score: 1000 })], "ana"));
  assert.equal(r["living-legend"].unlocked, true);
  assert.equal(r.perfectionist.unlocked, false);
  r = byId(evaluate([m({ gameMode: "Solo", result: "Record", score: 2000 })], "ana"));
  assert.equal(r.perfectionist.unlocked, true);
});

test("Sobrevivente: só vitória online com pontuação baixa", () => {
  assert.equal(byId(evaluate([m({ score: 300 })], "ana")).survivor.unlocked, true);
  assert.equal(byId(evaluate([m({ score: 301 })], "ana")).survivor.unlocked, false);
  assert.equal(byId(evaluate([m({ score: 10, result: "Defeat" })], "ana")).survivor.unlocked, false);
});

test("Colecionador: depende das outras conquistas e usa a data da que completou", () => {
  const list = [
    m({ gameMode: "Solo", result: "Record", score: 2000 }), // perfeccionista + lenda viva
    ...wins(5, { score: 250 }), // primeiro sangue, sobrevivente, estrategista
    ...wins(50, { gameMode: "Solo", result: "Defeat", score: 5 }), // veterano
  ];
  const r = byId(evaluate(list, "ana"));
  assert.equal(r.collector.unlocked, true);
  assert.equal(r.collector.current, 6);
  assert.equal(r.collector.unlockedAt, r.veteran.unlockedAt);
});

test("ignora Convidado, outro dono e outro nome; compara sem diferenciar maiúsculas", () => {
  const list = [
    m({ playerName: "Convidado", result: "Victory" }),
    m({ owner: "bia", playerName: "bia" }),
    m({ owner: "ana", playerName: "outro" }),
  ];
  assert.equal(byId(evaluate(list, "ana"))["first-blood"].unlocked, false);
  assert.equal(byId(evaluate([m({ owner: "Ana", playerName: "ANA" })], "ana"))["first-blood"].unlocked, true);
});

test("progresso nunca passa da meta", () => {
  const r = byId(evaluate(wins(30), "ana"));
  assert.equal(r.dominator.current, 25);
  assert.equal(r["arena-legend"].current, 30);
});
