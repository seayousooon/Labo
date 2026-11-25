import page from "../outils.html";
import infoPage0 from "../contact.html";
import infoPage1 from "../aide.html";
import infoPage2 from "../info-site.html";
import infoPage3 from "../accessibilite.html";
import infoPage4 from "../donnees-personnelles.html";
import infoPage5 from "../mentions-legales.html";

const supportingPages = new Map([
  ["/contact.html", infoPage0],
  ["/aide.html", infoPage1],
  ["/info-site.html", infoPage2],
  ["/accessibilite.html", infoPage3],
  ["/donnees-personnelles.html", infoPage4],
  ["/mentions-legales.html", infoPage5]
]);

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

async function readPayload(request, maxBytes = 131072) {
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
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(body + decoder.decode()); } catch { return null; }
}

async function verifyTurnstile(token, env, expectedHostname) {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY || !env.TURNSTILE_ACTION) {
    return error(503, "Turnstile doit être configuré pour enregistrer.");
  }
  if (typeof token !== "string" || !token || token.length > 2048) {
    return error(400, "Effectuez la vérification Turnstile avant d’enregistrer.");
  }
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
  }).then(response => response.ok ? response.json() : null).catch(() => null);
  if (!result) return error(503, "Vérification Turnstile temporairement indisponible.");
  if (!result.success || result.hostname !== expectedHostname || result.action !== env.TURNSTILE_ACTION) {
    return error(403, "Vérification Turnstile refusée. Réessayez.");
  }
  return null;
}


const productionOrigin = "https://labo-outils.allonsalaplage.workers.dev";
const callbackUrl = productionOrigin + "/auth/github/callback";
const stateCookie = "__Host-labo-oauth";
const sessionCookie = "__Host-labo-session";
const encoder = new TextEncoder();

const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

function cookie(name, value, maxAge) {
  return name + "=" + value + "; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=" + maxAge;
}

function readCookie(request, name) {
  const prefix = name + "=";
  return request.headers.get("Cookie")?.split(/;\s*/).find(part => part.startsWith(prefix))?.slice(prefix.length);
}

function redirect(location, ...cookies) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(null, { status: 303, headers });
}

function signingKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function hasGitHubSession(request, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || new URL(request.url).origin !== productionOrigin) return false;
  const parts = /^(\d{10}\.[A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(readCookie(request, sessionCookie) || "");
  if (!parts || Number(parts[1].split(".")[0]) <= Date.now() / 1000) return false;
  const signature = Uint8Array.from(atob(parts[2].replaceAll("-", "+").replaceAll("_", "/") + "="), char => char.charCodeAt(0));
  return crypto.subtle.verify("HMAC", await signingKey(env.GITHUB_CLIENT_SECRET), signature,
    encoder.encode("labo-session-v1:" + env.GITHUB_CLIENT_ID + ":" + parts[1]));
}

const githubFailureMessages = new Map([
  ["cookie", "Le cookie de connexion est absent ou invalide."],
  ["etat", "Le retour GitHub ne correspond pas à la tentative de connexion."],
  ["code", "GitHub n’a pas transmis de code de connexion valide."],
  ["identifiants", "GitHub a rejeté les identifiants de l’application."],
  ["echange", "GitHub n’a pas accepté le code de connexion."],
  ["profil", "Le Worker n’a pas pu lire le profil GitHub."],
  ["echec", "La connexion GitHub a échoué. Veuillez réessayer."]
]);

async function githubAuth(request, env, url) {
  if (url.origin !== productionOrigin) return error(404, "Adresse inconnue.");
  if (request.method === "POST" && url.pathname === "/auth/github/logout") {
    if (request.headers.get("Origin") !== productionOrigin) return error(403, "Origine refusée.");
    return redirect("/outils.html", cookie(sessionCookie, "", 0), cookie(stateCookie, "", 0));
  }
  if (request.method !== "GET" || !["/auth/github/login", "/auth/github/callback"].includes(url.pathname)) {
    return error(404, "Adresse inconnue.");
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return error(503, "Connexion GitHub en cours de configuration.");

  if (url.pathname === "/auth/github/login") {
    const state = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
    const challenge = base64url(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)));
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.search = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID, redirect_uri: callbackUrl, scope: "",
      state, code_challenge: challenge, code_challenge_method: "S256"
    });
    return redirect(authorize.href, cookie(stateCookie, state + "." + verifier, 600));
  }

  const expiredState = cookie(stateCookie, "", 0);
  const pending = /^([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(readCookie(request, stateCookie) || "");
  const code = url.searchParams.get("code");
  const fail = reason => redirect("/outils.html?connexion=" + reason, expiredState);
  if (!pending) return fail("cookie");
  if (pending[1] !== url.searchParams.get("state")) return fail("etat");
  if (!code || code.length > 1024) return fail("code");

  try {
    const exchange = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
        redirect_uri: callbackUrl, code, code_verifier: pending[2]
      }),
      redirect: "manual"
    });
    const result = await exchange.json().catch(() => null);
    if (result?.error === "incorrect_client_credentials") return fail("identifiants");
    const token = result?.access_token;
    if (!exchange.ok || typeof token !== "string" || !token) return fail("echange");

    const profile = await fetch("https://api.github.com/user", {
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "Labo-Outils" },
      redirect: "manual"
    });
    if (!profile.ok) return fail("profil");
    const { login } = await profile.json();
    if (login?.toLowerCase() !== "seayousooon") return redirect("/outils.html?connexion=refusee", expiredState);

    const duration = 3600;
    const value = Math.floor(Date.now() / 1000 + duration) + "." + base64url(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const signature = await crypto.subtle.sign("HMAC", await signingKey(env.GITHUB_CLIENT_SECRET),
      encoder.encode("labo-session-v1:" + env.GITHUB_CLIENT_ID + ":" + value));
    return redirect("/outils.html", expiredState, cookie(sessionCookie, value + "." + base64url(signature), duration));
  } catch {
    return redirect("/outils.html?connexion=echec", expiredState);
  }
}

const contactBodyLimit = 32 * 1024;
const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function contactField(payload, name) {
  return typeof payload?.[name] === "string" ? payload[name].trim() : "";
}

async function contact(request, env, url) {
  const origin = request.headers.get("Origin");
  const allowed = origin && (origin === url.origin || origin === env.ALLOWED_ORIGIN);
  const method = request.method;
  let response;

  if ((origin || method !== "GET") && !allowed) {
    response = error(403, "Origine refusée.");
  } else if (method === "OPTIONS") {
    response = request.headers.get("Access-Control-Request-Method") === "POST"
      ? new Response(null, { status: 204, headers: {
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type"
        } })
      : error(405, "Méthode non autorisée.");
  } else if (method === "GET") {
    response = env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_ACTION
      ? json({ siteKey: env.TURNSTILE_SITE_KEY, action: env.TURNSTILE_ACTION })
      : error(503, "Le formulaire de contact est en cours de configuration.");
  } else if (method === "POST") {
    response = await saveContact(request, env, new URL(origin).hostname);
  } else {
    response = error(405, "Méthode non autorisée.");
  }

  response.headers.append("Vary", "Origin");
  if (method === "OPTIONS") response.headers.append("Vary", "Access-Control-Request-Method");
  if (allowed) response.headers.set("Access-Control-Allow-Origin", origin);
  if (response.status === 405) response.headers.set("Allow", "GET, POST, OPTIONS");
  return response;
}

async function saveContact(request, env, hostname) {
  const payload = await readPayload(request, contactBodyLimit).catch(() => null);
  const email = contactField(payload, "email");
  const sujet = contactField(payload, "sujet");
  const message = contactField(payload, "message");
  if (!plain(payload) || email.length > 254 || !emailPattern.test(email)
      || !sujet || sujet.length > 150 || !message || message.length > 4000) {
    return error(400, "Vérifiez l’adresse électronique, le sujet (1 à 150 caractères) et le message (1 à 4 000 caractères). Le corps JSON est limité à 32 Kio.");
  }

  if (!env.DATA) return error(503, "Le stockage du formulaire est indisponible.");
  const verification = await verifyTurnstile(payload.turnstileToken, env, hostname);
  if (verification) return verification;

  const id = crypto.randomUUID();
  const date = new Date().toISOString();
  const key = "contacts/" + date.slice(0, 10) + "/" + id + ".json";
  try {
    const saved = await env.DATA.put(key, JSON.stringify({ id, date, email, sujet, message }), {
      ...createOnly,
      httpMetadata: { contentType: "application/json; charset=utf-8" }
    });
    return saved ? json({ id }, 201) : error(409, "Envoi en conflit. Réessayez.");
  } catch {
    return error(503, "Le stockage du formulaire est indisponible. Réessayez plus tard.");
  }
}

const homeUrl = "https://seayousooon.github.io/Labo/";
function htmlResponse(html) {
  return new Response(html.replaceAll('href="./index.html"', 'href="' + homeUrl + '"'), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/contact") return contact(request, env, url);
    if (request.method === "GET" && supportingPages.has(url.pathname)) {
      return htmlResponse(supportingPages.get(url.pathname));
    }
    if (url.pathname.startsWith("/auth/github/")) return githubAuth(request, env, url);
    if (request.method === "GET" && ["/", "/outils.html"].includes(url.pathname)) {
      const signedIn = await hasGitHubSession(request, env);
      const outcome = url.searchParams.get("connexion");
      const explanation = outcome === "refusee" ? "Ce compte GitHub ne peut pas modifier les fiches."
        : githubFailureMessages.get(outcome);
      const message = explanation ? "<p>" + explanation + "</p>" : "";
      const controls = signedIn
        ? '<form method="post" action="/auth/github/logout"><button type="submit">Se déconnecter</button></form>'
        : '<p><a href="/auth/github/login">Se connecter avec GitHub pour modifier les outils</a></p>';
      const html = page.replace('<html lang="fr">', '<html lang="fr" data-worker="oui">')
        .replace('<p id="edition-status"', match => (url.origin === productionOrigin ? message + controls : "") + match);
      return htmlResponse(html);
    }
    if (!url.pathname.startsWith("/api/")) return error(404, "Adresse inconnue.");
    const signedIn = await hasGitHubSession(request, env);
    const canEdit = signedIn || Boolean(env.ACCESS_AUD && ctx.access?.aud === env.ACCESS_AUD);
    const bucket = env.DATA;
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
      if (!canEdit) return error(403, "Connectez-vous avec un compte GitHub autorisé.");
      if (!bucket) return error(503, "Le stockage R2 n’est pas configuré.");
      if (request.method !== "GET") {
        const origin = request.headers.get("origin");
        if (!origin || (origin !== url.origin && (signedIn || origin !== env.ALLOWED_ORIGIN))) {
          return error(403, "Origine refusée.");
        }
      }

      if (request.method === "GET" && url.pathname === "/api/turnstile") {
        if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_ACTION) {
          return error(503, "Turnstile doit être configuré pour enregistrer.");
        }
        return json({ siteKey: env.TURNSTILE_SITE_KEY, action: env.TURNSTILE_ACTION });
      }

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

      const commentsRoute = /^\/api\/outils\/([^/]+)\/commentaires$/.exec(url.pathname);
      if (request.method === "GET" && (commentsRoute || url.pathname === "/api/commentaires")) {
        if (commentsRoute && !ids.has(commentsRoute[1])) return error(404, "Outil inconnu.");
        const prefix = commentsRoute ? "commentaires/" + commentsRoute[1] + "/" : "commentaires/";
        const result = await bucket.list({ prefix, limit: 20, cursor: url.searchParams.get("cursor") || undefined });
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
        const verification = await verifyTurnstile(payload.turnstileToken, env, env.TURNSTILE_HOSTNAME || url.hostname);
        if (verification) return verification;
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
        const verification = await verifyTurnstile(payload.turnstileToken, env, env.TURNSTILE_HOSTNAME || url.hostname);
        if (verification) return verification;
        const { numero, nom, url: ficheUrl, description, categorie, acces, date, source, personnalises } = payload.fiche;
        const fiche = { outilId, numero, nom, url: ficheUrl, description, categorie, acces, date, source, personnalises };
        const onlyIf = new Headers({ "If-Match": '"' + payload.version + '"' });
        const saved = await bucket.put(key, JSON.stringify(fiche), { onlyIf }).catch(cause => {
          const code = /\((\d{5})\)/.exec(String(cause?.message ?? ""))?.[1];
          console.error("Échec de l’écriture conditionnelle R2", { code: code ?? "inconnu" });
          throw cause;
        });
        return saved ? json({ fiche, version: saved.etag }) : error(409, "La fiche a changé. Fermez puis rouvrez la fiche avant de réappliquer vos changements.");
      }
      return error(404, "Adresse inconnue.");
    } catch {
      return error(503, "Stockage temporairement indisponible.");
    }
  }
};

export { hasGitHubSession, readPayload, verifyTurnstile, json, error };
