
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

    const naissance = String(data.naissance || "").trim();
    const sexe = String(data.sexe || "").trim();
    const email = String(data.email || "").trim();
    const adresse = String(data.adresse || "").trim();
    const responsable = String(data.responsable || "").trim();
    const telresponsable = String(data.telresponsable || "").trim();
    const profession = String(data.profession || "").trim();
    const medecin = String(data.medecin || "").trim();

    const result = await env.DB.prepare(`
      INSERT INTO patients (
        nom,
        prenom,
        date_naissance,
        sexe,
        telephone,
        email,
        adresse,
        personne_responsable,
        telephone_responsable,
        profession,
        medecin_referent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      nom,
      prenom,
      naissance || null,
      sexe || null,
      telephone,
      email || null,
      adresse || null,
      responsable || null,
      telresponsable || null,
      profession || null,
      medecin || null
    ).run();

    return Response.json({
      success: true,
      message: "Patient enregistré avec succès.",
      id: result.meta.last_row_id
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      message: "Une erreur est survenue pendant l'enregistrement."
    }, { status: 500 });
  }
}
