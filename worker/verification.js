const reply = (body, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" }
});

export async function verificationRoute(request, env, identity = null) {
  const url = new URL(request.url);
  if (!["/api/etat", "/api/fiches", "/edition/outils.html"].includes(url.pathname)) return null;
  if (url.pathname === "/edition/outils.html") return request.method === "GET" ? null : new Response(null, { status: 405, headers: { Allow: "GET" } });
  if (request.method !== "GET") {
    const response = reply({ message: "Méthode non autorisée." }, 405);
    response.headers.set("Allow", "GET");
    return response;
  }
  if (url.pathname === "/api/etat") {
    // identity provient uniquement de la validation cryptographique côté serveur.
    return reply({ ecriture: Boolean(identity && env.OUTILS), edition: "/edition/outils.html", ...(identity ? { email: identity.email } : {}) });
  }
  const cursor = url.searchParams.get("cursor") || undefined;
  if (cursor && cursor.length > 2048) return reply({ message: "Curseur invalide." }, 400);
  if (!env.OUTILS) return reply({ message: "Le stockage R2 n’est pas configuré." }, 503);
  try {
    const listing = await env.OUTILS.list({ prefix: "fiches/", limit: 20, cursor });
    const fiches = Object.create(null);
    for (const { key } of listing.objects) {
      if (!key.startsWith("fiches/") || !key.endsWith(".json")) continue;
      const object = await env.OUTILS.get(key);
      if (!object) throw new Error("Fiche absente.");
      const fiche = await object.json();
      if (!fiche || typeof fiche !== "object" || Array.isArray(fiche)) throw new Error("Fiche invalide.");
      // Champs déjà publics du catalogue uniquement, jamais les contacts,
      // commentaires, e-mails ou champs personnalisés.
      const publique = {};
      for (const field of ["numero", "nom", "url", "description", "categorie", "acces", "date", "source"]) {
        if (typeof fiche[field] === "string" || typeof fiche[field] === "number" || fiche[field] === null) {
          publique[field] = fiche[field];
        }
      }
      fiches[key.slice(7, -5)] = publique;
    }
    return reply({ fiches, ...(listing.truncated ? { next: listing.cursor } : {}) });
  } catch {
    return reply({ message: "Lecture R2 temporairement indisponible." }, 503);
  }
}
