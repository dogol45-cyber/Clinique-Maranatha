import { hashPassword } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB || !env.ADMIN_SETUP_KEY) {
      return Response.json({
        success: false,
        message: "Configuration initiale indisponible."
      }, { status: 503 });
    }

    const data = await request.json();
    const suppliedKey = String(data.setupKey || "");

    if (suppliedKey !== env.ADMIN_SETUP_KEY) {
      return Response.json({
        success: false,
        message: "Clé de configuration incorrecte."
      }, { status: 403 });
    }

    const nom = String(data.nom || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!nom || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({
        success: false,
        message: "Veuillez vérifier le nom et l'adresse e-mail."
      }, { status: 400 });
    }

    if (password.length < 12 || password.length > 128) {
      return Response.json({
        success: false,
        message: "Le mot de passe doit contenir entre 12 et 128 caractères."
      }, { status: 400 });
    }

    const existing = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM utilisateurs WHERE role = 'administrateur'"
    ).first();

    if (existing.total > 0) {
      return Response.json({
        success: false,
        message: "Un compte administrateur existe déjà."
      }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    await env.DB.prepare(`
      INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role, actif)
      VALUES (?, ?, ?, 'administrateur', 1)
    `).bind(nom, email, passwordHash).run();

    return Response.json({
      success: true,
      message: "Compte administrateur créé. Retirez maintenant ADMIN_SETUP_KEY des secrets Cloudflare."
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      message: "Impossible de créer le compte administrateur."
    }, { status: 500 });
  }
}
