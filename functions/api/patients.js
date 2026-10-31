export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    const nom = String(data.nom || "").trim();
    const prenom = String(data.prenom || "").trim();
    const telephone = String(data.telephone || "").trim();

    if (!nom || !prenom || !telephone) {
      return Response.json({
        success: false,
        message: "Le nom, le prénom et le téléphone sont obligatoires."
      }, { status: 400 });
    }

    const result = await env.DB.prepare(`
      INSERT INTO patients (nom, prenom, telephone, email, adresse)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      nom,
      prenom,
      telephone,
      String(data.email || "").trim(),
      String(data.adresse || "").trim()
    ).run();

    return Response.json({
      success: true,
      message: "Patient enregistré avec succès.",
      id: result.meta.last_row_id
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      message: "Impossible d'enregistrer le patient."
    }, { status: 500 });
  }
}
