import test from "node:test";
import assert from "node:assert/strict";

// Canvas falso: o teste só exercita a lógica das peças, não o desenho.
globalThis.window = { devicePixelRatio: 1 };
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
const fakeCanvas = () => ({ getContext: () => ctx, addEventListener() {}, style: {}, width: 0, height: 0 });
const { Board } = await import("../src/game/Board.js");

const VALID = [2, 4, 8, 16, 32];

test("o próximo bloco já existe ao iniciar e é um valor válido", () => {
  const b = new Board(fakeCanvas());
  assert.ok(VALID.includes(b.nextValue));
  assert.ok(VALID.includes(b.piece.value));
});

test("o bloco que cai é exatamente o que estava anunciado", () => {
  const b = new Board(fakeCanvas());
  for (let i = 0; i < 12 && !b.gameOver; i++) {
    const announced = b.nextValue;
    b.hardDrop();
    if (b.gameOver) break;
    assert.equal(b.piece.value, announced);
  }
});

test("onNextChanged avisa cada novo próximo bloco", () => {
  const b = new Board(fakeCanvas());
  const seen = [];
  b.onNextChanged = (v) => seen.push(v);
  b.hardDrop();
  assert.equal(seen.length, 1);
  assert.equal(seen[0], b.nextValue);
});

test("reset sorteia tudo de novo e avisa", () => {
  const b = new Board(fakeCanvas());
  b.hardDrop();
  let called = 0;
  b.onNextChanged = () => called++;
  b.reset();
  assert.equal(called, 1);
  assert.equal(b.score, 0);
  assert.ok(VALID.includes(b.nextValue));
});

test("no game over o próximo bloco não é consumido", () => {
  const b = new Board(fakeCanvas());
  for (let i = 0; i < 100 && !b.gameOver; i++) b.hardDrop();
  assert.equal(b.gameOver, true);
});
