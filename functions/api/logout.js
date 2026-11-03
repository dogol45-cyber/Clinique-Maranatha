import { clearSessionCookie } from "../_lib/auth.js";

export async function onRequestPost() {
  return new Response(JSON.stringify({
    success: true,
    message: "Déconnexion effectuée."
  }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie()
    }
  });
}
