import legacyWorker, { hasGitHubSession, readPayload, verifyTurnstile, json, error } from "../index.js";

async function listFiches(request, env) {
  const params = new URL(request.url).searchParams;
  const rawOffset = params.get("offset") ?? "0";
  const offset = Number(rawOffset);
  const categorie = params.get("categorie");
  if (!/^\d+$/.test(rawOffset) || !Number.isSafeInteger(offset) || offset < 0
      || (categorie !== null && categorie.length > 100)) {
    return error(400, "Catégorie ou pagination invalide.");
  }
  const columns = "id, slug, titre, description, categorie, version, updated_at";
  const statement = categorie
    ? env.DB.prepare("SELECT " + columns + " FROM fiches WHERE categorie = ? ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?")
        .bind(categorie, 20, offset)
    : env.DB.prepare("SELECT " + columns + " FROM fiches ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?")
        .bind(20, offset);
  const result = await statement.all();
  if (!result.success) return error(503, "Base de données temporairement indisponible.");
  return json({ fiches: result.results, offset, limit: 20 });
}

async function addComment(request, env, ctx) {
  const signedIn = await hasGitHubSession(request, env);
  const canEdit = signedIn || Boolean(env.ACCESS_AUD && ctx.access?.aud === env.ACCESS_AUD);
  if (!canEdit) return error(403, "Connectez-vous avec un compte GitHub autorisé.");
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!origin || (origin !== url.origin && (signedIn || origin !== env.ALLOWED_ORIGIN))) {
    return error(403, "Origine refusée.");
  }
  const payload = await readPayload(request);
  const ficheId = typeof payload?.ficheId === "string" ? payload.ficheId.trim() : "";
  const texte = typeof payload?.texte === "string" ? payload.texte.trim() : "";
  // Adresse déclarée par l'utilisateur connecté, distincte de l'identité GitHub.
  const auteurEmail = typeof payload?.auteur_email === "string" ? payload.auteur_email.trim() : "";
  if (!ficheId || ficheId.length > 200 || !texte || texte.length > 2000
      || auteurEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auteurEmail)) {
    return error(400, "Renseignez ficheId, texte (1 à 2 000 caractères) et auteur_email.");
  }
  const verification = await verifyTurnstile(payload.turnstileToken, env, env.TURNSTILE_HOSTNAME || new URL(origin).hostname);
  if (verification) return verification;
  const result = await env.DB.prepare(
    "INSERT INTO commentaires (fiche_id, texte, auteur_email) SELECT id, ?, ? FROM fiches WHERE id = ? RETURNING id, fiche_id, texte, auteur_email"
  ).bind(texte, auteurEmail, ficheId).all();
  if (!result.success) return error(503, "Base de données temporairement indisponible.");
  if (!result.results.length) return error(400, "Fiche inconnue.");
  return json(result.results[0], 201);
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    const sqlRead = path === "/api/fiches" && request.method === "GET";
    const sqlWrite = path === "/api/commentaires" && request.method === "POST";
    if (!sqlRead && !sqlWrite) return legacyWorker.fetch(request, env, ctx);
    if (!env.DB) return error(503, "La base D1 n’est pas configurée.");
    try {
      return sqlRead ? await listFiches(request, env) : await addComment(request, env, ctx);
    } catch {
      return error(503, "Base de données temporairement indisponible.");
    }
  }
};
