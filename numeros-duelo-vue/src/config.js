// Configuração central da aplicação. O endereço da MockAPI NÃO fica espalhado
// pelo código: todo acesso passa por aqui (e por services/matchService.js).
//
// Defina VITE_MOCKAPI_URL em um arquivo .env (veja .env.example) ou troque o
// valor padrão abaixo pela URL base do seu projeto na MockAPI.

const PLACEHOLDER = "https://SEU_ID_DO_PROJETO.mockapi.io/api/v1";
// URL padrão do projeto (usada quando VITE_MOCKAPI_URL não está definida).
const DEFAULT_URL = "https://6afcd6bf2a9c141d36b7c655.mockapi.io/number/api";

export const MOCKAPI_BASE_URL = String(import.meta.env?.VITE_MOCKAPI_URL || DEFAULT_URL).replace(/\/+$/, "");

// Nome do recurso criado na MockAPI.
export const MATCHES_RESOURCE = "partidas";

export const MATCHES_URL = `${MOCKAPI_BASE_URL}/${MATCHES_RESOURCE}`;

// Recurso de contas de usuário (criado na MockAPI, veja o README).
export const USERS_RESOURCE = "usuarios";
export const USERS_URL = `${MOCKAPI_BASE_URL}/${USERS_RESOURCE}`;

// Conta de administrador. Só o NOME fica no código; a senha é definida pelo
// script scripts/create-admin.mjs e fica apenas como hash na MockAPI.
export const ADMIN_USERNAME = "tr3nd_br";

export const isMockApiConfigured = () => !MOCKAPI_BASE_URL.includes("SEU_ID_DO_PROJETO");

// Servidor WebSocket do modo Online (precisa começar com "wss://").
export const ONLINE_WS_URL = import.meta.env?.VITE_ONLINE_WS_URL || "wss://numeros-1.onrender.com";
