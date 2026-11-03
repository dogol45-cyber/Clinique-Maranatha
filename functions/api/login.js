import {
  verifyPassword,
  createSession,
  sessionCookie
} from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!email || !password) {
      return Response.json({
        success: false,
        message: "Veuillez saisir votre e-mail et votre mot de passe."
      }, { status: 400 });
    }

    const user = await env.DB.prepare(`
      SELECT id, nom, email, mot_de_passe_hash, role, actif
      FROM utilisateurs WHERE email = ?
    `).bind(email).first();

    if (!user || user.actif !== 1 ||
        !(await verifyPassword(password, user.mot_de_passe_hash))) {
      return Response.json({
        success: false,
        message: "Identifiants incorrects."
      }, { status: 401 });
    }

    const token = await createSession(user, env.SESSION_SECRET);

    return new Response(JSON.stringify({
      success: true,
      message: "Connexion réussie."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookie(token)
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: "Erreur pendant la connexion."
    }, { status: 500 });
  }
}
