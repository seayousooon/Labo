import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from './public-index.js';
const source = await readFile(new URL('../public-catalogue.js', import.meta.url), 'utf8');
const { readPublicCatalogue, refreshPublicCatalogue } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const req = (path, method = 'GET') => new Request('https://public.example' + path, { method });
test('API publique : champs publics, CORS sans cookies et pagination', async () => {
  const r = await worker.fetch(req('/api/fiches?cursor=suite'), { OUTILS: {
    list: async o => { assert.equal(o.prefix, 'fiches/'); assert.equal(o.cursor, 'suite'); return { objects: [{ key: 'fiches/a.json' }], truncated: true, cursor: 'fin' }; },
    get: async () => ({ json: async () => ({ nom: 'outil', email: 'secret', personnalises: {}, revision: 2, commentaires: ['prive'] }) })
  } });
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(r.headers.get('Access-Control-Allow-Credentials'), null);
  assert.deepEqual(await r.json(), { fiches: { a: { nom: 'outil' } }, next: 'fin' });
});
test('API publique : écritures et routes privées refusées avant R2', async () => {
  const env = { OUTILS: new Proxy({}, { get() { throw Error('Aucun accès attendu'); } }) };
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) assert.equal((await worker.fetch(req('/api/fiches', method), env)).status, 405);
  for (const path of ['/api/etat', '/api/commentaires', '/api/outils/a', '/api/initialiser', '/edition/outils.html', '/contact']) assert.equal((await worker.fetch(req(path), env)).status, 404);
  assert.equal((await worker.fetch(req('/api/fiches'), {})).status, 503);
});
test('lecteur : pages complètes, sans cookies, rejet des liens dangereux et boucles', async () => {
  let calls = 0;
  const result = await readPublicCatalogue(async (url, o) => {
    assert.equal(o.credentials, 'omit');
    if (calls++ === 0) return Response.json({ fiches: { a: { nom: 'un' } }, next: 'a/b' });
    assert.match(url, /cursor=a%2Fb$/); return Response.json({ fiches: { b: { nom: 'deux' } } });
  });
  assert.equal(result.size, 2);
  await assert.rejects(readPublicCatalogue(async () => Response.json({ fiches: {}, next: 'boucle' })));
  await assert.rejects(readPublicCatalogue(async () => Response.json({ fiches: { a: { url: 'javascript:alert(1)' } } })));
  await assert.rejects(readPublicCatalogue(async () => new Response('', { status: 503 })));
});
test('affichage : texte sans HTML, filtre actualisé et message explicite en panne', async () => {
  const status = {}, link = {}, filter = { options: [], append(o) { this.options.push(o); } };
  const row = { dataset: { outilId: 'a' }, cells: Array.from({ length: 8 }, () => ({ textContent: 'initial', querySelector: () => link })) };
  let filtered = false;
  const document = { getElementById: id => id === 'category' ? filter : status, querySelectorAll: () => [row], createElement: () => ({}) };
  await refreshPublicCatalogue(document, () => { filtered = true; }, async () => Response.json({ fiches: { a: { nom: '<img onerror=alert(1)>', url: 'https://example.org/', categorie: 'Nouvelle' } } }));
  assert.equal(row.cells[1].textContent, '<img onerror=alert(1)>'); assert.equal(link.href, 'https://example.org/');
  assert.equal(filter.options[0].value, 'Nouvelle'); assert.equal(filtered, true); assert.match(status.textContent, /actualisées/);
  await refreshPublicCatalogue(document, () => {}, async () => { throw Error('panne'); });
  assert.match(status.textContent, /peut être ancien/); assert.equal(row.cells[1].textContent, '<img onerror=alert(1)>');
});
