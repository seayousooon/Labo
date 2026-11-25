import test from "node:test";
import assert from "node:assert/strict";
import { verificationRoute } from "./verification.js";
const req = (path, method = "GET") => new Request("https://example.com" + path, { method });

test("état fermé même avec un faux en-tête Access", async () => {
  const r = await verificationRoute(new Request("https://example.com/api/etat", { headers: { "Cf-Access-Jwt-Assertion": "faux" } }), {});
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ecriture: false, edition: "/edition/outils.html" });
});
test("lecture réelle du bucket vide", async () => {
  let called = false;
  const r = await verificationRoute(req("/api/fiches"), { OUTILS: { list: async options => {
    called = true; assert.equal(options.prefix, "fiches/"); assert.equal(options.limit, 20);
    return { objects: [], truncated: false };
  } } });
  assert.equal(called, true);
  assert.deepEqual(await r.json(), { fiches: {} });
});
test("fiches présentes, pagination et exclusion des données privées", async () => {
  const r = await verificationRoute(req("/api/fiches?cursor=page2"), { OUTILS: {
    list: async options => {
      assert.equal(options.cursor, "page2");
      return { objects: [{ key: "fiches/a.json" }, { key: "contacts/prive.json" }], truncated: true, cursor: "page3" };
    },
    get: async key => {
      assert.equal(key, "fiches/a.json");
      return { json: async () => ({ nom: "<script>test</script>", email: "prive@example.com", auteur_email: "prive@example.com", personnalises: { secret: "prive" } }) };
    }
  } });
  assert.deepEqual(await r.json(), { fiches: { a: { nom: "<script>test</script>" } }, next: "page3" });
});
test("absence ou panne R2 signalée, jamais un faux résultat vide", async () => {
  for (const env of [{}, { OUTILS: { list: async () => { throw Error("secret interne"); } } }]) {
    const r = await verificationRoute(req("/api/fiches"), env);
    assert.equal(r.status, 503);
    assert.doesNotMatch(await r.text(), /secret interne/);
  }
});
test("écritures refusées avant tout accès au stockage", async () => {
  for (const path of ["/api/etat", "/api/fiches", "/edition/outils.html"]) {
    const r = await verificationRoute(req(path, "POST"), {});
    assert.equal(r.status, 405); assert.equal(r.headers.get("Allow"), "GET");
  }
});
test("page en lecture seule et routes existantes non interceptées", async () => {
  const r = await verificationRoute(req("/edition/outils.html"), {});
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Modification désactivée/);
  assert.match(html, /button disabled/);
  assert.match(html, /li.textContent/);
  assert.equal(await verificationRoute(req("/api/initialiser", "POST"), {}), null);
});
