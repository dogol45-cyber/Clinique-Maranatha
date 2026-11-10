
import { getSession } from "../../_lib/auth.js";

const ROLES_AUTORISES = ["administrateur", "reception"];

function erreur(message, status = 400) {
  return Response.json({ success: false, message }, { status });
}

async function verifierAcces(request, env) {
  const user = await getSession(request, env);

  if (!user) return { error: erreur("Connexion requise.", 401) };

  if (!ROLES_AUTORISES.includes(user.role)) {
    return { error: erreur("Accès réservé à l'administration et à la réception.", 403) };
  }

  return { user };
}

export async function onRequestGet({ request, env }) {
  const acces = await verifierAcces(request, env);
  if (acces.error) return acces.error;

  try {
    const url = new URL(request.url);

    if (url.searchParams.get("patients") === "1") {
      const patients = await env.DB.prepare(`
        SELECT id, nom, prenom, telephone
        FROM patients
        ORDER BY nom, prenom
        LIMIT 500
      `).all();

      return Response.json({
        success: true,
        patients: patients.results
      });
    }

    const recherche = (url.searchParams.get("recherche") || "").trim();

    let resultat;

    if (recherche) {
      resultat = await env.DB.prepare(`
        SELECT p.id, p.patient_id, p.montant, p.devise,
               p.mode_paiement, p.statut, p.reference_transaction,
               p.date_paiement, pat.nom, pat.prenom, pat.telephone
        FROM paiements p
        INNER JOIN patients pat ON pat.id = p.patient_id
        WHERE pat.nom LIKE ? OR pat.prenom LIKE ?
           OR pat.telephone LIKE ?
        ORDER BY p.id DESC
        LIMIT 200
      `).bind(`%${recherche}%`, `%${recherche}%`, `%${recherche}%`).all();
    } else {
      resultat = await env.DB.prepare(`
        SELECT p.id, p.patient_id, p.montant, p.devise,
               p.mode_paiement, p.statut, p.reference_transaction,
               p.date_paiement, pat.nom, pat.prenom, pat.telephone
        FROM paiements p
        INNER JOIN patients pat ON pat.id = p.patient_id
        ORDER BY p.id DESC
        LIMIT 200
      `).all();
    }

    return Response.json({
      success: true,
      paiements: resultat.results
    });

  } catch (error) {
    console.error("ERREUR LISTE PAIEMENTS:", error);
    return erreur("Impossible de charger les paiements.", 500);
  }
}

export async function onRequestPost({ request, env }) {
  const acces = await verifierAcces(request, env);
  if (acces.error) return acces.error;

  try {
    const data = await request.json();

    const patientId = Number(data.patient_id);
    const montant = Number(data.montant);
    const devise = String(data.devise || "").trim();
    const mode = String(data.mode_paiement || "").trim();
    const statut = String(data.statut || "").trim();
    const reference = String(data.reference_transaction || "").trim();

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return erreur("Veuillez sélectionner un patient.");
    }

    if (!Number.isFinite(montant) || montant <= 0 || montant > 100000000) {
      return erreur("Veuillez saisir un montant valide.");
    }

    if (!["HTG", "USD"].includes(devise)) {
      return erreur("Devise non autorisée.");
    }

    if (!["Espèces", "Virement", "Chèque", "Autre"].includes(mode)) {
      return erreur("Mode de paiement invalide.");
    }

    if (!["paye", "en_attente"].includes(statut)) {
      return erreur("Statut de paiement invalide.");
    }

    const patient = await env.DB.prepare(
      "SELECT id FROM patients WHERE id = ?"
    ).bind(patientId).first();

    if (!patient) return erreur("Patient introuvable.", 404);

    const resultat = await env.DB.prepare(`
      INSERT INTO paiements (
        patient_id, montant, devise, mode_paiement,
        statut, reference_transaction
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      patientId,
      montant,
      devise,
      mode,
      statut,
      reference || null
    ).run();

    return Response.json({
      success: true,
      message: "Paiement enregistré avec succès.",
      id: resultat.meta.last_row_id
    }, { status: 201 });

  } catch (error) {
    console.error("ERREUR ENREGISTREMENT PAIEMENT:", error);
    return erreur("Impossible d'enregistrer le paiement.", 500);
  }
}
