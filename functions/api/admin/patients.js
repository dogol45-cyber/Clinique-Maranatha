
import { getSession } from "../../_lib/auth.js";

const ROLES_AUTORISES = [
  "administrateur",
  "reception",
  "physiotherapeute",
  "massotherapeute"
];

function reponseErreur(message, status = 400) {
  return Response.json({ success: false, message }, { status });
}

async function verifierAcces(request, env) {
  const user = await getSession(request, env);

  if (!user) return { error: reponseErreur("Connexion requise.", 401) };

  if (!ROLES_AUTORISES.includes(user.role)) {
    return { error: reponseErreur("Accès refusé.", 403) };
  }

  return { user };
}

export async function onRequestGet({ request, env }) {
  const acces = await verifierAcces(request, env);
  if (acces.error) return acces.error;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const recherche = (url.searchParams.get("recherche") || "").trim();

    if (id !== null) {
      if (!/^\d+$/.test(id)) {
        return reponseErreur("Identifiant de patient invalide.");
      }

      const patient = await env.DB.prepare(`
        SELECT id, numero_dossier, nom, prenom, date_naissance, sexe,
               telephone, email, adresse, personne_responsable,
               telephone_responsable, profession, medecin_referent,
               date_inscription
        FROM patients
        WHERE id = ?
      `).bind(Number(id)).first();

      if (!patient) return reponseErreur("Patient introuvable.", 404);

      return Response.json({ success: true, patient });
    }

    let requete = `
      SELECT id, numero_dossier, nom, prenom, date_naissance, sexe,
             telephone, email, adresse, date_inscription
      FROM patients
    `;

    let resultat;

    if (recherche) {
      requete += `
        WHERE nom LIKE ? OR prenom LIKE ? OR telephone LIKE ?
      `;
      resultat = await env.DB.prepare(
        requete + " ORDER BY id DESC LIMIT 200"
      ).bind(`%${recherche}%`, `%${recherche}%`, `%${recherche}%`).all();
    } else {
      resultat = await env.DB.prepare(
        requete + " ORDER BY id DESC LIMIT 200"
      ).all();
    }

    return Response.json({
      success: true,
      patients: resultat.results
    });
  } catch (error) {
    console.error("ERREUR LISTE PATIENTS:", error);
    return reponseErreur("Impossible de consulter les patients.", 500);
  }
}

export async function onRequestPut({ request, env }) {
  const acces = await verifierAcces(request, env);
  if (acces.error) return acces.error;

  try {
    const data = await request.json();
    const id = Number(data.id);

    if (!Number.isInteger(id) || id <= 0) {
      return reponseErreur("Identifiant de patient invalide.");
    }

    const nom = String(data.nom || "").trim();
    const prenom = String(data.prenom || "").trim();
    const telephone = String(data.telephone || "").trim();

    if (!nom || !prenom || !telephone) {
      return reponseErreur("Le nom, le prénom et le téléphone sont obligatoires.");
    }

    const champs = {
      naissance: String(data.naissance || "").trim(),
      sexe: String(data.sexe || "").trim(),
      email: String(data.email || "").trim(),
      adresse: String(data.adresse || "").trim(),
      responsable: String(data.responsable || "").trim(),
      telresponsable: String(data.telresponsable || "").trim(),
      profession: String(data.profession || "").trim(),
      medecin: String(data.medecin || "").trim()
    };

    const resultat = await env.DB.prepare(`
      UPDATE patients
      SET nom = ?, prenom = ?, date_naissance = ?, sexe = ?,
          telephone = ?, email = ?, adresse = ?,
          personne_responsable = ?, telephone_responsable = ?,
          profession = ?, medecin_referent = ?
      WHERE id = ?
    `).bind(
      nom,
      prenom,
      champs.naissance || null,
      champs.sexe || null,
      telephone,
      champs.email || null,
      champs.adresse || null,
      champs.responsable || null,
      champs.telresponsable || null,
      champs.profession || null,
      champs.medecin || null,
      id
    ).run();

    if (!resultat.meta.changes) {
      return reponseErreur("Patient introuvable ou aucune modification effectuée.", 404);
    }

    return Response.json({
      success: true,
      message: "Dossier du patient mis à jour."
    });
  } catch (error) {
    console.error("ERREUR MODIFICATION PATIENT:", error);
    return reponseErreur("Impossible de modifier le dossier.", 500);
  }
}
