export async function onRequestGet({ env }) {
  try {
    const result = await env.DB
      .prepare("SELECT 1 AS connexion")
      .first();

    return Response.json({
      success: true,
      message: "Connexion à la base de données réussie.",
      database: result
    });
  } catch (error) {
    return Response.json({
      success: false,
      message: "Erreur de connexion à la base de données."
    }, { status: 500 });
  }
}
