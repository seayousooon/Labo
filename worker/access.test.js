import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createAccessIdentity } from './access.js';
import { verificationRoute } from './verification.js';
const issuer = 'https://icy-frost-20ce.cloudflareaccess.com';
const env = { ACCESS_TEAM_DOMAIN: issuer, ACCESS_AUD: 'application-test', OUTILS: {} };
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'test', alg: 'RS256' };
const verify = createAccessIdentity(async url => {
  assert.equal(String(url), issuer + '/cdn-cgi/access/certs');
  return Response.json({ keys: [jwk] });
});
const token = (options = {}, key = privateKey) => new SignJWT({ email: 'autorise@example.com', ...options.claims })
  .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setSubject('user')
  .setIssuer(options.issuer || issuer).setAudience(options.audience || env.ACCESS_AUD)
  .setExpirationTime(options.exp || '5m').sign(key);
const request = jwt => new Request('https://example.com/api/etat', { headers: {
  'Cf-Access-Jwt-Assertion': jwt, 'Cf-Access-Authenticated-User-Email': 'usurpe@example.com'
} });
test('signature réelle, identité signée et état autorisé', async () => {
  const identity = await verify(request(await token()), env);
  assert.deepEqual(identity, { email: 'autorise@example.com' });
  const state = await verificationRoute(request(''), env, identity);
  assert.equal((await state.json()).ecriture, true);
});
test('refus signature falsifiée, audience, émetteur, expiration et e-mail invalides', async () => {
  const other = await generateKeyPair('RS256');
  const invalid = [await token({}, other.privateKey), await token({ audience: 'autre' }),
    await token({ issuer: 'https://autre.cloudflareaccess.com' }), await token({ exp: 1 }),
    await token({ claims: { email: null } }), 'faux'];
  for (const jwt of invalid) assert.equal(await verify(request(jwt), env), null);
});
test('aucune autorisation par e-mail seul, configuration absente ou indisponibilité JWKS', async () => {
  assert.equal(await verify(request(''), env), null);
  assert.equal(await verify(request(await token()), {}), null);
  const unavailable = createAccessIdentity(async () => { throw Error('panne'); });
  assert.equal(await unavailable(request(await token()), env), null);
});
