// Armazenamento do ranking global usando Supabase (Postgres). Sem exigir
// nenhuma configuração extra de código: instale a integração "Supabase"
// no Marketplace da Vercel (ou cole as variáveis manualmente) e as
// variáveis SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aparecem no projeto
// — veja o README na raiz para o passo a passo, incluindo o SQL da
// tabela.
//
// Usamos a service_role key (não a anon key) porque essa função roda só
// no servidor (nunca chega no navegador) e precisa gravar/atualizar
// pontuações sem depender de políticas de RLS — mais simples pra um
// projeto pequeno como esse.
//
// Se as variáveis ainda não estiverem configuradas, getTopScores() e
// submitScore() retornam `null`, e /api/leaderboard e /api/score
// respondem com `{ unconfigured: true }` em vez de quebrar; o frontend
// mostra uma mensagem amigável nesse caso.

import { createClient } from "@supabase/supabase-js";

const TABLE = "leaderboard";

let client;
let clientChecked = false;

function getClient() {
  if (clientChecked) return client;
  clientChecked = true;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export async function getTopScores(limit = 20) {
  const supabase = getClient();
  if (!supabase) return null; // Supabase ainda não conectado neste projeto Vercel

  const { data, error } = await supabase
    .from(TABLE)
    .select("name, score, updated_at")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.map((row) => ({ name: row.name, score: row.score, date: row.updated_at }));
}

// Uma pontuação por nome: só atualiza se a nova for maior que a salva.
// Retorna { rank } (posição no ranking geral, 1 = melhor) ou `null` se o
// Supabase ainda não estiver configurado.
export async function submitScore(name, score) {
  const supabase = getClient();
  if (!supabase) return null;

  const { data: existing, error: selectErr } = await supabase
    .from(TABLE)
    .select("id, score")
    .ilike("name", name)
    .maybeSingle();
  if (selectErr) throw selectErr;

  let finalScore = score;

  if (existing) {
    finalScore = Math.max(existing.score, score);
    if (score > existing.score) {
      const { error: updErr } = await supabase
        .from(TABLE)
        .update({ score, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updErr) throw updErr;
    }
  } else {
    const { error: insErr } = await supabase.from(TABLE).insert({ name, score });
    if (insErr) throw insErr;
  }

  const { count, error: countErr } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .gt("score", finalScore);
  if (countErr) throw countErr;

  return { rank: (count || 0) + 1 };
}
