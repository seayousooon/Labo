const endpoint = 'https://labo-catalogue-public.allonsalaplage.workers.dev/api/fiches';
const fields = ['numero', 'nom', 'url', 'description', 'categorie', 'acces', 'date', 'source'];

// Charger toutes les pages avant d’appliquer les changements : pas de catalogue partiel.
export async function readPublicCatalogue(fetchPage = fetch) {
  const fiches = new Map();
  const cursors = new Set();
  let cursor = '';
  for (let page = 0; page < 100; page++) {
    const response = await fetchPage(endpoint + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), {
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Lecture indisponible.');
    const data = await response.json();
    if (!data.fiches || typeof data.fiches !== 'object' || Array.isArray(data.fiches)) throw new Error('Réponse invalide.');
    for (const [id, fiche] of Object.entries(data.fiches)) {
      if (!fiche || typeof fiche !== 'object' || Array.isArray(fiche)) throw new Error('Fiche invalide.');
      const safe = {};
      for (const field of fields) {
        if (typeof fiche[field] !== 'string' && typeof fiche[field] !== 'number' && fiche[field] !== null && fiche[field] !== undefined) throw new Error('Champ invalide.');
        safe[field] = fiche[field];
      }
      if (safe.url != null) {
        const address = new URL(safe.url);
        if (!['http:', 'https:'].includes(address.protocol)) throw new Error('Adresse invalide.');
      }
      fiches.set(id, safe);
    }
    if (!data.next) return fiches;
    if (typeof data.next !== 'string' || data.next.length > 2048 || cursors.has(data.next)) throw new Error('Pagination invalide.');
    cursors.add(data.next);
    cursor = data.next;
  }
  throw new Error('Catalogue trop volumineux.');
}

export async function refreshPublicCatalogue(document, applyFilter, fetchPage = fetch) {
  const status = document.getElementById('edition-status');
  status.textContent = 'Lecture seule — chargement des fiches à jour…';
  try {
    const fiches = await readPublicCatalogue(fetchPage);
    if (!fiches.size) throw new Error('Catalogue vide.');
    const filter = document.getElementById('category');
    for (const row of document.querySelectorAll('tbody tr[data-outil-id]')) {
      const fiche = fiches.get(row.dataset.outilId);
      if (!fiche) continue;
      for (const [index, field] of fields.entries()) {
        if (fiche[field] === undefined) continue;
        if (field === 'url' && fiche.url !== null) {
          const link = row.cells[index].querySelector('a');
          link.href = fiche.url;
          link.textContent = fiche.url;
        } else if (field !== 'url') row.cells[index].textContent = fiche[field] ?? 'Non indiquée';
      }
      if (fiche.categorie != null) {
        row.dataset.category = String(fiche.categorie);
        if (![...filter.options].some(option => option.value === row.dataset.category)) {
          const option = document.createElement('option');
          option.value = option.textContent = row.dataset.category;
          filter.append(option);
        }
      }
    }
    applyFilter();
    status.textContent = 'Lecture seule — fiches actualisées depuis le stockage.';
  } catch {
    status.textContent = 'Lecture seule — actualisation indisponible. Le catalogue fourni avec le site reste affiché ; il peut être ancien.';
  }
}
