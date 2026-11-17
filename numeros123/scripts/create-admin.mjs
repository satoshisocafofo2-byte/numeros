// Cria (ou redefine a senha de) a conta de administrador na MockAPI.
// A senha é digitada aqui, no seu terminal, e só o HASH vai para a MockAPI:
// ela não fica em nenhum arquivo do projeto.
//
// Uso:  npm run create-admin
// (lê VITE_MOCKAPI_URL do .env ou do ambiente)

import { webcrypto } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import readline from "node:readline";

globalThis.crypto ??= webcrypto;
const { generateSalt, hashPassword } = await import("../src/services/crypto.js");
const { MOCKAPI_BASE_URL } = await import("../src/config.js");

const ADMIN_USERNAME = "tr3nd_br";

function readEnvFile() {
  if (!existsSync(".env")) return {};
  return Object.fromEntries(
    readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
}

// Ordem: variável de ambiente, arquivo .env, URL padrão do src/config.js.
const base = String(process.env.VITE_MOCKAPI_URL || readEnvFile().VITE_MOCKAPI_URL || MOCKAPI_BASE_URL).replace(/\/+$/, "");
if (!base || base.includes("SEU_ID_DO_PROJETO")) {
  console.error("A URL da MockAPI não está configurada (src/config.js ou .env).");
  process.exit(1);
}
const USERS_URL = `${base}/usuarios`;

// Pergunta a senha sem mostrar o que é digitado.
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

const password = await askHidden(`Senha para ${ADMIN_USERNAME}: `);
const again = await askHidden("Repita a senha: ");
if (password.length < 8) {
  console.error("Use uma senha com pelo menos 8 caracteres.");
  process.exit(1);
}
if (password !== again) {
  console.error("As senhas não conferem.");
  process.exit(1);
}

const salt = generateSalt();
const body = JSON.stringify({
  username: ADMIN_USERNAME,
  salt,
  passwordHash: await hashPassword(password, salt),
  role: "admin",
  createdAt: new Date().toISOString(),
});
const headers = { "Content-Type": "application/json" };

// Se já existir, atualiza (redefine a senha); senão, cria.
let existing = null;
const found = await fetch(`${USERS_URL}?username=${encodeURIComponent(ADMIN_USERNAME)}`);
if (found.ok) {
  existing = (await found.json()).find((u) => String(u.username).toLowerCase() === ADMIN_USERNAME) || null;
} else if (found.status !== 404) {
  console.error(`Erro ao consultar a MockAPI (${found.status}).`);
  process.exit(1);
}

const res = existing
  ? await fetch(`${USERS_URL}/${existing.id}`, { method: "PUT", headers, body })
  : await fetch(USERS_URL, { method: "POST", headers, body });

if (!res.ok) {
  console.error(`Não foi possível salvar a conta (${res.status}). Confira se o recurso "usuarios" existe.`);
  process.exit(1);
}
console.log(existing ? "Senha do administrador redefinida." : "Conta de administrador criada.");
