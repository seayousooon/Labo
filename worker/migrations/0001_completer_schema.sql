-- À exécuter une seule fois sur la base créée avec le schéma initial.
ALTER TABLE fiches ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00';
ALTER TABLE commentaires ADD COLUMN texte TEXT NOT NULL DEFAULT '';
ALTER TABLE commentaires ADD COLUMN auteur_email TEXT NOT NULL DEFAULT '';
