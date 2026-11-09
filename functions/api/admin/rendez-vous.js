
import { getSession } from "../../_lib/auth.js";

const ROLES_AUTORISES = [
  "administrateur",
  "reception",
  "physiotherapeute",
  "massotherapeute"
];

async function verifierAcces(request, env) {
  const user = await getSession(request, env);

  if (!user) {
    return { error: Response.json(
      { success: false, message: "Connexion requise." },
      { status: 401 }
    ) };
  }

  if (!ROLES_AUTORISES.includes(user.role)) {
    return { error: Response.json(
      { success: false, message: "Accès refusé." },
      { status: 403 }
    ) };
  }

  return { user };
}

function erreur(message, status = 400) {
  return Response.json({ success: false, message }, { status });
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
        ORDER BY nom ASC, prenom ASC
        LIMIT 500
      `).all();

      return Response.json({
        success: true,
        patients: patients.results
      });
    }

    const date = url.searchParams.get("date") || "";

    let requete = `
      SELECT r.id, r.patient_id, r.service, r.date_rendez_vous,
             r.heure, r.statut, r.motif, r.date_creation,
             p.nom, p.prenom, p.telephone
      FROM rendez_vous r
      INNER JOIN patients p ON p.id = r.patient_id
    `;

    let resultat;

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      resultat = await env.DB.prepare(
        requete + " WHERE r.date_rendez_vous = ? ORDER BY r.heure ASC"
      ).bind(date).all();
    } else {
      resultat = await env.DB.prepare(
        requete + " ORDER BY r.date_rendez_vous DESC, r.heure DESC LIMIT 300"
      ).all();
    }

    return Response.json({
      success: true,
      rendezVous: resultat.results
    });
  } catch (error) {
    console.error("ERREUR LISTE RENDEZ-VOUS:", error);
    return erreur("Impossible de charger les rendez-vous.", 500);
  }
}

export async function onRequestPost({ request, env }) {
  const acces = await verifierAcces(request, env);
  if (acces.error) return acces.error;

  try {
    const data = await request.json();

    const patientId = Number(data.patient_id);
    const service = String(data.service || "").trim();
    const date = String(data.date_rendez_vous || "").trim();
    const heure = String(data.heure || "").trim();
    const motif = String(data.motif || "").trim();

    const servicesAutorises = [
      "Physiothérapie",
      "Massothérapie",
      "Rééducation fonctionnelle",
      "Club des AVC",
      "Évaluation",
      "Autre"
    ];

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return erreur("Veuillez sélectionner un patient.");
    }

    if (!servicesAutorises.includes(service)) {
      return erreur("Veuillez sélectionner un service valide.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return erreur("Veuillez saisir une date valide.");
    }

    if (heure && !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) {
      return erreur("Veuillez saisir une heure valide.");
    }

    const patient = await env.DB.prepare(
      "SELECT id FROM patients WHERE id = ?"
    ).bind(patientId).first();

    if (!patient) return erreur("Patient introuvable.", 404);

    const resultat = await env.DB.prepare(`
      INSERT INTO rendez_vous (
        patient_id, service, date_rendez_vous, heure, statut, motif
      )
      VALUES (?, ?, ?, ?, 'en_attente', ?)
    `).bind(
      patientId,
      service,
      date,
      heure || null,
      motif || null
    ).run();

    return Response.json({
      success: true,
      message: "Rendez-vous enregistré avec succès.",
      id: resultat.meta.last_row_id
    }, { status: 201 });

  } catch (error) {
    console.error("ERREUR CREATION RENDEZ-VOUS:", error);
    return erreur("Impossible d'enregistrer le rendez-vous.", 500);
  }
}

export async function onRequestPut({ request, env }) {
  const acces = await verifierAcces(request, env);
  if (acces.error) return acces.error;

  try {
    const data = await request.json();
    const id = Number(data.id);
    const statut = String(data.statut || "").trim();

    const statutsAutorises = [
      "en_attente",
      "confirme",
      "termine",
      "annule"
    ];

    if (!Number.isInteger(id) || id <= 0) {
      return erreur("Identifiant de rendez-vous invalide.");
    }

    if (!statutsAutorises.includes(statut)) {
      return erreur("Statut de rendez-vous invalide.");
    }

    const resultat = await env.DB.prepare(
      "UPDATE rendez_vous SET statut = ? WHERE id = ?"
    ).bind(statut, id).run();

    if (!resultat.meta.changes) {
      return erreur("Rendez-vous introuvable.", 404);
    }

    return Response.json({
      success: true,
      message: "Statut du rendez-vous mis à jour."
    });

  } catch (error) {
    console.error("ERREUR MODIFICATION RENDEZ-VOUS:", error);
    return erreur("Impossible de modifier le rendez-vous.", 500);
  }
}
