import page from "../outils.html";

const fields = ["numero", "nom", "url", "description", "categorie", "acces", "date", "source"];
let initialCatalogue;

async function readCatalogue() {
  if (initialCatalogue) return initialCatalogue;

  const fiches = [];
  const ids = new Set();
  let current;
  const cell = {
    element(element) {
      const index = current.cells.length;
      current.cells.push("");
      current.index = index;
      element.onEndTag(() => { current.index = -1; });
    },
    text(text) {
      if (current.index < fields.length && current.index >= 0) {
        current.cells[current.index] += text.text;
      }
    }
  };
  const rewriter = new HTMLRewriter()
    .on("tr[data-outil-id]", {
      element(row) {
        current = { id: row.getAttribute("data-outil-id"), cells: [], index: -1 };
        row.onEndTag(() => {
          if (!current.id || ids.has(current.id) || current.cells.length !== fields.length + 1) {
            throw new Error("Le tableau contient une fiche invalide.");
          }
          const fiche = Object.fromEntries(fields.map((field, index) => [field, current.cells[index].trim()]));
          // Le texte de HTMLRewriter peut contenir les entités du document.
          for (const field of fields) {
            fiche[field] = fiche[field].replace(/&(amp|lt|gt|quot|#39);/g,
              (_, entity) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[entity]);
          }
          fiche.numero = Number(fiche.numero);
          fiche.date = fiche.date === "Non indiquée" ? null : fiche.date;
          ids.add(current.id);
          fiches.push({ outilId: current.id, ...fiche, personnalises: {} });
        });
      }
    })
    .on("tr[data-outil-id] > td", cell)
    .on("tr[data-outil-id] > th", cell);

  await rewriter.transform(new Response(page)).text();
  if (!fiches.length) throw new Error("Le tableau des outils est vide.");
  initialCatalogue = { seed: fiches, ids, categories: new Set(fiches.map(fiche => fiche.categorie)) };
  return initialCatalogue;
}
const limits = { nom: 160, url: 2048, description: 4000, categorie: 100, acces: 1000, source: 300 };
const createOnly = { onlyIf: new Headers({ "If-None-Match": "*" }) };
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const error = (status, message) => json({ message }, status);
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function validCustom(value, depth = 0) {
  if (typeof value === "boolean" || value === null || Number.isFinite(value)) return true;
  if (typeof value === "string") return value.length <= 2000;
  if (Array.isArray(value)) return depth < 4 && value.length <= 30 && value.every(item => validCustom(item, depth + 1));
  return plain(value) && Object.keys(value).length === 1 && validDate(value.date);
}

function validTool(tool, categories) {
  if (!plain(tool) || !Number.isInteger(tool.numero) || tool.numero < 1 || tool.numero > 999999) return false;
  if (!Object.entries(limits).every(([key, max]) => typeof tool[key] === "string" && tool[key].length <= max)) return false;
  if (!tool.nom.trim() || !categories.has(tool.categorie) || !(tool.date === null || validDate(tool.date))) return false;
  if (!plain(tool.personnalises) || Object.keys(tool.personnalises).length > 30
      || JSON.stringify(tool.personnalises).length > 24000
      || !Object.entries(tool.personnalises).every(([key, value]) => key.trim() && key.length <= 80 && validCustom(value))) return false;
  try {
    return ["http:", "https:"].includes(new URL(tool.url).protocol) && /^https?:\/\//i.test(tool.url);
  } catch {
    return false;
  }
}

async function readPayload(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 131072) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(body + decoder.decode()); } catch { return null; }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && ["/", "/outils.html"].includes(url.pathname)) {
      const html = page.replace('<html lang="fr">', '<html lang="fr" data-worker="oui">')
        .replaceAll('href="./index.html"', 'href="https://seayousooon.github.io/Labo/"');
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (!url.pathname.startsWith("/api/")) return error(404, "Adresse inconnue.");
    const canEdit = Boolean(env.ACCESS_AUD && ctx.access?.aud === env.ACCESS_AUD);
    const bucket = env.OUTILS_R2;
    try {
      const { seed, ids, categories } = await readCatalogue();
      if (request.method === "GET" && url.pathname === "/api/outils") {
        const offset = Number(url.searchParams.get("offset") ?? 0);
        if (!Number.isInteger(offset) || offset < 0 || offset >= seed.length) return error(400, "Page inconnue.");
        const group = seed.slice(offset, offset + 20);
        const outils = await Promise.all(group.map(async tool => {
          const saved = await bucket?.get("fiches/" + tool.outilId + ".json");
          return { fiche: saved ? await saved.json() : tool, version: saved?.etag ?? null };
        }));
        return json({ outils, canEdit: canEdit && Boolean(bucket), next: offset + group.length < seed.length ? offset + group.length : null });
      }
      if (!canEdit) return error(403, "Connexion Cloudflare Access autorisée requise.");
      if (!bucket) return error(503, "Le stockage R2 n’est pas configuré.");
      if (request.method !== "GET" && request.headers.get("origin") !== url.origin) return error(403, "Origine refusée.");

      if (url.pathname === "/api/initialiser" && request.method === "POST") {
        const offset = Number(url.searchParams.get("offset") ?? 0);
        if (![0, 20, 40, 60].includes(offset)) return error(400, "Page inconnue.");
        const marker = "initialisation-v1/" + offset + ".json";
        if (!(await bucket.head(marker))) {
          for (const tool of seed.slice(offset, offset + 20)) {
            await bucket.put("fiches/" + tool.outilId + ".json", JSON.stringify(tool), createOnly);
          }
          await bucket.put(marker, "{}", createOnly);
        }
        return json({ ok: true });
      }

      if (request.method === "GET" && url.pathname === "/api/commentaires") {
        const result = await bucket.list({ prefix: "commentaires/", limit: 20, cursor: url.searchParams.get("cursor") || undefined });
        const items = await Promise.all(result.objects.map(async ({ key }) => (await bucket.get(key))?.json()));
        return json({ items: items.filter(Boolean), next: result.truncated ? result.cursor : null });
      }
      const [, , collection, outilId, section, extra] = url.pathname.split("/");
      if (collection !== "outils" || !ids.has(outilId) || extra) return error(404, "Outil inconnu.");
      const key = "fiches/" + outilId + ".json";
      if (section === "commentaires" && request.method === "POST") {
        const payload = await readPayload(request);
        const texte = typeof payload?.texte === "string" ? payload.texte.trim() : "";
        const id = payload?.id;
        if (!texte || texte.length > 2000 || typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) {
          return error(400, "Commentaire invalide (1 à 2 000 caractères).");
        }
        const commentKey = "commentaires/" + outilId + "/" + id + ".json";
        const comment = { id, outilId, texte, date: new Date().toISOString() };
        if (await bucket.put(commentKey, JSON.stringify(comment), createOnly)) return json(comment, 201);
        const prior = await (await bucket.get(commentKey))?.json();
        return prior?.texte === texte ? json(prior) : error(409, "Ce commentaire a déjà été enregistré.");
      }
      if (!section && request.method === "GET") {
        const saved = await bucket.get(key);
        return saved ? json({ fiche: await saved.json(), version: saved.etag }) : error(404, "Fiche absente.");
      }
      if (!section && request.method === "PUT") {
        const payload = await readPayload(request);
        if (!validTool(payload?.fiche, categories) || typeof payload?.version !== "string" || !/^[a-f0-9]{32}$/.test(payload.version)) {
          return error(400, "Vérifiez les champs, l’URL HTTP/HTTPS et les types des valeurs.");
        }
        const { numero, nom, url, description, categorie, acces, date, source, personnalises } = payload.fiche;
        const fiche = { outilId, numero, nom, url, description, categorie, acces, date, source, personnalises };
        const saved = await bucket.put(key, JSON.stringify(fiche), { onlyIf: { etagMatches: payload.version } });
        return saved ? json({ fiche, version: saved.etag }) : error(409, "La fiche a changé. Fermez puis rouvrez la fiche avant de réappliquer vos changements.");
      }
      return error(404, "Adresse inconnue.");
    } catch {
      return error(503, "Stockage temporairement indisponible.");
    }
  }
};
