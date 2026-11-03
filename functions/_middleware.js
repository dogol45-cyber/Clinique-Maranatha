import { getSession } from "./_lib/auth.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const protectedPage = path === "/administration.html";
  const protectedApi = path.startsWith("/api/admin/");

  if (!protectedPage && !protectedApi) {
    return context.next();
  }

  const user = await getSession(context.request, context.env);

  if (!user) {
    if (protectedApi) {
      return Response.json({
        success: false,
        message: "Authentification requise."
      }, { status: 401 });
    }

    return Response.redirect(
      new URL("/connexion.html", url.origin).toString(),
      302
    );
  }

  if (user.role !== "administrateur" &&
      user.role !== "reception" &&
      user.role !== "physiotherapeute" &&
      user.role !== "massotherapeute") {
    return new Response("Accès refusé.", { status: 403 });
  }

  return context.next();
}
