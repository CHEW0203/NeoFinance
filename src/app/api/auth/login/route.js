import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rememberMe = Boolean(body.rememberMe);

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid username or password." },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Invalid username or password." },
        { status: 401 }
      );
    }

    const { token, expiresAt } = await createUserSession(user.id, rememberMe);
    await setSessionCookie(token, expiresAt);

    return NextResponse.json({
      message: "Login successful.",
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to login.", error: String(error) },
      { status: 500 }
    );
  }
}
