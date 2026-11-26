import { verificationRoute } from './verification.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff' };
    if (url.pathname !== '/api/fiches') return new Response('Adresse inconnue.', { status: 404, headers });
    // Aucune route d’écriture, d’identité, de contact ou de commentaire.
    if (request.method !== 'GET') return new Response('Méthode non autorisée.', {
      status: 405, headers: { ...headers, Allow: 'GET' }
    });
    const response = await verificationRoute(request, { OUTILS: env.OUTILS });
    const result = new Response(response.body, response);
    for (const [name, value] of Object.entries(headers)) result.headers.set(name, value);
    return result;
  }
};
