import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "mundo_alitas_admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET debe tener al menos 32 caracteres.");
  }
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("Falta configurar ADMIN_PASSWORD.");
  return safeEqual(password, expected);
}

export async function createAdminSession() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = String(issuedAt);
  const value = `${payload}.${signature(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminSessionValid() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;

  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature || !/^\d+$/.test(payload)) return false;

  const issuedAt = Number(payload);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60 || now - issuedAt > SESSION_MAX_AGE_SECONDS) {
    return false;
  }

  return safeEqual(providedSignature, signature(payload));
}
