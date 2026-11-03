const encoder = new TextEncoder();
const ITERATIONS = 100000;
const SESSION_HOURS = 8;

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  );
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations: ITERATIONS,
    hash: "SHA-256"
  }, key, 256);

  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algorithm, iterationsText, saltText, expectedText] = stored.split("$");
    if (algorithm !== "pbkdf2") return false;

    const iterations = Number(iterationsText);
    if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) {
      return false;
    }

    const salt = fromBase64Url(saltText);
    const expected = fromBase64Url(expectedText);

    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = new Uint8Array(await crypto.subtle.deriveBits({
      name: "PBKDF2", salt, iterations, hash: "SHA-256"
    }, key, 256));

    if (bits.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < bits.length; i++) difference |= bits[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function createSession(user, secret) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    uid: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600
  })));

  const signature = toBase64Url(await hmac(payload, secret));
  return `${payload}.${signature}`;
}

export async function getSession(request, env) {
  try {
    if (!env.SESSION_SECRET) return null;

    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)cm_session=([^;]+)/);
    if (!match) return null;

    const [payload, signature] = match[1].split(".");
    if (!payload || !signature) return null;

    const expected = toBase64Url(await hmac(payload, env.SESSION_SECRET));
    if (signature !== expected) return null;

    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (!data.uid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const user = await env.DB.prepare(
      "SELECT id, nom, email, role, actif FROM utilisateurs WHERE id = ?"
    ).bind(data.uid).first();

    if (!user || user.actif !== 1 || user.role !== data.role) return null;
    return user;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `cm_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;
}

export function clearSessionCookie() {
  return "cm_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}
