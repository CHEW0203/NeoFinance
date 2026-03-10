import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, REMEMBERED_SESSION_DAYS, SHORT_SESSION_DAYS } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function addDays(date, days) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

export async function createUserSession(userId, rememberMe = false) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = addDays(
    new Date(),
    rememberMe ? REMEMBERED_SESSION_DAYS : SHORT_SESSION_DAYS
  );

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      rememberMe,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token, expiresAt) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    await clearSessionCookie();
    return null;
  }

  return session;
}

export async function requireCurrentUser() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }
  return session.user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
  await clearSessionCookie();
}
