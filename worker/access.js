import { createRemoteJWKSet, jwtVerify, customFetch } from "jose";

export function createAccessIdentity(fetchKeys = fetch) {
  const keySets = new Map();
  // Ne jamais utiliser l'e-mail transmis seul dans un en-tête comme autorisation.
  return async function accessIdentity(request, env) {
    const issuer = env.ACCESS_TEAM_DOMAIN;
    if (typeof issuer !== "string" || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)
        || typeof env.ACCESS_AUD !== "string" || !env.ACCESS_AUD) return null;
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token || token.length > 32768) return null;
    try {
      if (!keySets.has(issuer)) keySets.set(issuer, createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs"), { [customFetch]: fetchKeys, timeoutDuration: 5000 }));
      const { payload } = await jwtVerify(token, keySets.get(issuer), {
        issuer, audience: env.ACCESS_AUD, algorithms: ["RS256"], requiredClaims: ["exp", "sub", "email"]
      });
      return typeof payload.email === "string" && payload.email.length <= 254 ? { email: payload.email } : null;
    } catch { return null; }
  }
}

export const accessIdentity = createAccessIdentity();
