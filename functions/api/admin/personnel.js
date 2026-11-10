
import { getSession, hashPassword } from "../../_lib/auth.js";

const ROLES = [
  "administrateur",
  "reception",
  "physiotherapeute",
  "massotherapeute"
];

function erreur(message, status = 400) {
  return Response.json({ success: false, message }, { status });
}

async function verifierAdministrateur(request, env) {
  const user = await getSession(request, env);

  if (!user) {
    return { error: erreur("Connexion requise.", 401) };
  }

  if (user.role !== "administrateur") {
    return { error: erreur("Accès réservé à l'administrateur.", 403) };
  }

  return { user };
}

// Lister les comptes du personnel
export async function onRequestGet({ request, env }) {
  const acces = await verifierAdministrateur(request, env);
  if (acces.error) return acces.error;

  try {
    const resultat = await env.DB.prepare(`
      SELECT id, nom, email, role, actif, date_creation
      FROM utilisateurs
      ORDER BY id DESC
    `).all();

    return Response.json({
      success: true,
      utilisateurs: resultat.results
    });
  } catch (error) {
    console.error("ERREUR LISTE PERSONNEL:", error);
    return erreur("Impossible de charger le personnel.", 500);
  }
}

// Créer un compte du personnel
export async function onRequestPost({ request, env }) {
  const acces = await verifierAdministrateur(request, env);
  if (acces.error) return acces.error;

  try {
    const data = await request.json();

    const nom = String(data.nom || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const motDePasse = String(data.mot_de_passe || "");
    const role = String(data.role || "").trim();

    if (nom.length < 2 || nom.length > 100) {
      return erreur("Le nom doit contenir entre 2 et 100 caractères.");
    }

    if (
      email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return erreur("Veuillez saisir une adresse e-mail valide.");
    }

    if (motDePasse.length < 10 || motDePasse.length > 128) {
      return erreur("Le mot de passe doit contenir entre 10 et 128 caractères.");
    }

    if (!ROLES.includes(role)) {
      return erreur("Veuillez sélectionner un rôle valide.");
    }

    const existe = await env.DB.prepare(
      "SELECT id FROM utilisateurs WHERE email = ?"
    ).bind(email).first();

    if (existe) {
      return erreur("Cette adresse e-mail possède déjà un compte.");
    }

    const motDePasseHash = await hashPassword(motDePasse);

    const resultat = await env.DB.prepare(`
      INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role, actif)
      VALUES (?, ?, ?, ?, 1)
    `).bind(nom, email, motDePasseHash, role).run();

    return Response.json({
      success: true,
      message: "Compte du personnel créé avec succès.",
      id: resultat.meta.last_row_id
    }, { status: 201 });

  } catch (error) {
    console.error("ERREUR CREATION PERSONNEL:", error);

    if (String(error.message || "").toLowerCase().includes("unique")) {
      return erreur("Cette adresse e-mail est déjà utilisée.");
    }

    return erreur("Impossible de créer le compte.", 500);
  }
}

// Activer ou désactiver un compte
export async function onRequestPut({ request, env }) {
  const acces = await verifierAdministrateur(request, env);
  if (acces.error) return acces.error;

  try {
    const data = await request.json();
    const id = Number(data.id);
    const actif = data.actif;

    if (!Number.isInteger(id) || id <= 0) {
      return erreur("Identifiant du compte invalide.");
    }

    if (typeof actif !== "boolean") {
      return erreur("État du compte invalide.");
    }

    if (id === acces.user.id && actif === false) {
      return erreur("Vous ne pouvez pas désactiver votre propre compte.");
    }

    const compte = await env.DB.prepare(
      "SELECT id FROM utilisateurs WHERE id = ?"
    ).bind(id).first();

    if (!compte) {
      return erreur("Compte introuvable.", 404);
    }

    await env.DB.prepare(
      "UPDATE utilisateurs SET actif = ? WHERE id = ?"
    ).bind(actif ? 1 : 0, id).run();

    return Response.json({
      success: true,
      message: actif
        ? "Compte activé avec succès."
        : "Compte désactivé avec succès."
    });

  } catch (error) {
    console.error("ERREUR MODIFICATION PERSONNEL:", error);
    return erreur("Impossible de modifier ce compte.", 500);
  }
}
