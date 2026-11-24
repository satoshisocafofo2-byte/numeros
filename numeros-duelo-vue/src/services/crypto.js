// Hash de senha com PBKDF2-SHA256 (Web Crypto). A senha nunca é guardada: só
// o hash e o "salt" (valor aleatório de cada usuário). Este arquivo também é
// usado pelo scripts/create-admin.mjs, por isso não depende do navegador.

const ITERATIONS = 150000;
const KEY_BITS = 256;

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex) =>
  new Uint8Array((hex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16)));

export function generateSalt() {
  return toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password, saltHex) {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: ITERATIONS },
    key,
    KEY_BITS
  );
  return toHex(bits);
}

// Comparação em tempo constante (evita vazar quantos caracteres batem).
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
