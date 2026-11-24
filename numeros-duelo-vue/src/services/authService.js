// Contas de usuário na MockAPI (recurso "usuarios"). Campos de cada conta:
// id, username, passwordHash, salt, role ("admin" | "user"), createdAt.
//
// IMPORTANTE: a MockAPI é aberta e não tem autenticação própria; então este
// login organiza o uso do app (cada jogador vê só o próprio histórico), mas
// não substitui um backend de verdade. Veja a seção de segurança no README.

import { USERS_URL, ADMIN_USERNAME, isMockApiConfigured } from "../config.js";
import { generateSalt, hashPassword, safeEqual } from "./crypto.js";

export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,24}$/;
export const MIN_PASSWORD_LENGTH = 6;
const SESSION_KEY = "nd_session";

async function request(path = "", options = {}) {
  if (!isMockApiConfigured()) {
    throw new Error("A URL da MockAPI ainda não foi configurada (veja o README).");
  }
  let response;
  try {
    response = await fetch(`${USERS_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet.");
  }
  if (!response.ok) {
    const error = new Error(
      response.status === 404
        ? "Recurso 'usuarios' não encontrado na MockAPI (veja o README)."
        : `O servidor respondeu com erro ${response.status}.`
    );
    error.status = response.status;
    throw error;
  }
  return response.json();
}

// A busca da MockAPI (?username=) compara por trecho; filtramos o nome exato aqui.
async function findByUsername(username) {
  try {
    const list = await request(`?username=${encodeURIComponent(username)}`);
    const wanted = username.toLowerCase();
    return (Array.isArray(list) ? list : []).find((u) => String(u.username).toLowerCase() === wanted) || null;
  } catch (error) {
    if (error.status === 404) return null; // recurso vazio
    throw error;
  }
}

const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role === "admin" ? "admin" : "user" });

export async function register(username, password) {
  const name = String(username || "").trim();
  if (!USERNAME_RE.test(name)) {
    throw new Error("Usuário: 3 a 24 caracteres (letras, números, ponto, hífen ou sublinhado).");
  }
  if (String(password || "").length < MIN_PASSWORD_LENGTH) {
    throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  // O nome do administrador é reservado: ninguém pode se cadastrar com ele.
  if (name.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    throw new Error("Esse nome de usuário não está disponível.");
  }
  if (await findByUsername(name)) throw new Error("Esse nome de usuário já está em uso.");

  const salt = generateSalt();
  const created = await request("", {
    method: "POST",
    body: JSON.stringify({
      username: name,
      salt,
      passwordHash: await hashPassword(password, salt),
      role: "user", // contas criadas pelo app nunca são admin
      createdAt: new Date().toISOString(),
    }),
  });
  return publicUser(created);
}

export async function login(username, password) {
  const name = String(username || "").trim();
  const fail = new Error("Usuário ou senha incorretos.");
  if (!name || !password) throw fail;

  const user = await findByUsername(name);
  if (!user) throw fail;
  const hash = await hashPassword(password, user.salt);
  if (!safeEqual(hash, user.passwordHash)) throw fail;
  return publicUser(user);
}

/* ----- Sessão (guardada só neste navegador; nunca contém senha nem hash) ----- */

export function loadSession() {
  try {
    const data = JSON.parse(localStorage.getItem(SESSION_KEY));
    return data && data.username ? { id: data.id, username: data.username, role: data.role === "admin" ? "admin" : "user" } : null;
  } catch {
    return null;
  }
}

export function saveSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // armazenamento indisponível: a sessão vale só até recarregar a página
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ok
  }
}
