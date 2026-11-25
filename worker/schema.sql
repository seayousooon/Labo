CREATE TABLE IF NOT EXISTS fiches (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    titre TEXT,
    description TEXT,
    categorie TEXT,
    auteur_email TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commentaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fiche_id TEXT NOT NULL,
    texte TEXT NOT NULL,
    auteur_email TEXT NOT NULL,
    FOREIGN KEY (fiche_id) REFERENCES fiches(id)
);

CREATE INDEX IF NOT EXISTS idx_fiches_categorie ON fiches(categorie);
CREATE INDEX IF NOT EXISTS idx_commentaires_fiche_id ON commentaires(fiche_id);
