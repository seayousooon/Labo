const reply = (body, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" }
});

// Page de vérification en lecture seule ; aucune autorisation Access n'est déduite
// d'un en-tête fourni par le navigateur.
const edition = `<!doctype html>
<html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Consultation des fiches</title>
<h1>Outils pédagogiques</h1><p>Modification désactivée</p>
<button disabled>Ajouter une fiche</button><button disabled>Enregistrer</button>
<p id="statut" role="status">Chargement des fiches…</p><ul id="fiches"></ul>
<button id="suite" hidden>Afficher la suite</button>
<script>
let cursor = "";
const suite = document.getElementById("suite");
async function charger() {
  suite.disabled = true;
  try {
    const response = await fetch("/api/fiches" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""));
    if (!response.ok) throw new Error("Lecture du stockage indisponible.");
    const data = await response.json();
    for (const fiche of Object.values(data.fiches)) {
      const li = document.createElement("li");
      li.textContent = [fiche.nom, fiche.description].filter(Boolean).join(" — ");
      const modifier = document.createElement("button");
      modifier.textContent = "Modifier";
      modifier.disabled = true;
      li.append(" ", modifier);
      document.getElementById("fiches").append(li);
    }
    cursor = data.next || "";
    suite.hidden = !cursor;
    document.getElementById("statut").textContent = "Lecture réussie. Modification désactivée.";
  } catch {
    document.getElementById("statut").textContent = "Impossible de lire les fiches. Réessayez.";
    suite.hidden = false;
  } finally { suite.disabled = false; }
}
suite.addEventListener("click", charger);
charger();
</script></html>`;

export async function verificationRoute(request, env) {
  const url = new URL(request.url);
  if (!["/api/etat", "/api/fiches", "/edition/outils.html"].includes(url.pathname)) return null;
  if (request.method !== "GET") {
    const response = reply({ message: "Méthode non autorisée." }, 405);
    response.headers.set("Allow", "GET");
    return response;
  }
  if (url.pathname === "/api/etat") {
    // L'édition de cette nouvelle interface reste fermée jusqu'à l'intégration
    // d'une validation Access côté serveur. Les routes existantes restent protégées.
    return reply({ ecriture: false, edition: "/edition/outils.html" });
  }
  if (url.pathname === "/edition/outils.html") return new Response(edition, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" }
  });
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
