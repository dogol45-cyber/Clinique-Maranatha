CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_dossier TEXT UNIQUE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance TEXT,
    sexe TEXT,
    telephone TEXT NOT NULL,
    email TEXT,
    adresse TEXT,
    personne_responsable TEXT,
    telephone_responsable TEXT,
    profession TEXT,
    medecin_referent TEXT,
    date_inscription TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (
        role IN ('administrateur', 'reception', 'physiotherapeute', 'massotherapeute')
    ),
    actif INTEGER DEFAULT 1,
    date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rendez_vous (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    service TEXT NOT NULL,
    date_rendez_vous TEXT NOT NULL,
    heure TEXT,
    statut TEXT DEFAULT 'en_attente',
    motif TEXT,
    date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    professionnel_id INTEGER,
    diagnostic TEXT,
    probleme_principal TEXT,
    antecedents TEXT,
    evaluation_fonctionnelle TEXT,
    recommandations TEXT,
    date_evaluation TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (professionnel_id) REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS traitements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    professionnel_id INTEGER,
    description TEXT NOT NULL,
    date_seance TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (professionnel_id) REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS paiements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    montant REAL NOT NULL,
    devise TEXT DEFAULT 'HTG',
    mode_paiement TEXT,
    statut TEXT DEFAULT 'en_attente',
    reference_transaction TEXT,
    date_paiement TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS journal_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER,
    action TEXT NOT NULL,
    date_action TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
);
