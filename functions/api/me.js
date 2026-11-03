import { getSession } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSession(request, env);

  if (!user) {
    return Response.json({ success: false }, { status: 401 });
  }

  return Response.json({
    success: true,
    user: {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role
    }
  });
}
