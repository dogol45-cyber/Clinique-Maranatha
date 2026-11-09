import { getSession } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await getSession(request, env);

    if (!user) {
      return Response.json({
        success: false,
        message: "Connexion requise."
      }, { status: 401 });
    }

    const autorises = [
      "administrateur",
      "reception",
      "physiotherapeute",
      "massotherapeute"
    ];

    if (!autorises.includes(user.role)) {
      return Response.json({
        success: false,
        message: "Accès refusé."
      }, { status: 403 });
    }

    const totalPatients = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM patients"
    ).first();

    const nouveauxPatients = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM patients
      WHERE date_inscription >= datetime('now', '-30 days')
    `).first();

    const rendezVous = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM rendez_vous
      WHERE date_rendez_vous >= date('now')
        AND statut = 'en_attente'
    `).first();

    const derniersPatients = await env.DB.prepare(`
      SELECT id, nom, prenom, telephone, date_inscription
      FROM patients
      ORDER BY id DESC
      LIMIT 8
    `).all();

    const prochainsRendezVous = await env.DB.prepare(`
      SELECT r.id, r.service, r.date_rendez_vous, r.heure,
             r.statut, p.nom, p.prenom
      FROM rendez_vous r
      INNER JOIN patients p ON p.id = r.patient_id
      WHERE r.date_rendez_vous >= date('now')
      ORDER BY r.date_rendez_vous ASC, r.heure ASC
      LIMIT 8
    `).all();

    return Response.json({
      success: true,
      statistiques: {
        totalPatients: totalPatients.total,
        nouveauxPatients: nouveauxPatients.total,
        rendezVousEnAttente: rendezVous.total
      },
      derniersPatients: derniersPatients.results,
      prochainsRendezVous: prochainsRendezVous.results,
      utilisateur: {
        nom: user.nom,
        role: user.role
      }
    });

  } catch (error) {
    console.error("ERREUR TABLEAU DE BORD:", error);

    return Response.json({
      success: false,
      message: "Impossible de charger le tableau de bord."
    }, { status: 500 });
  }
}
