import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/lib/auth/register-defaults";

function validateRegisterInput(body) {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username) {
    return { ok: false, message: "Username is required." };
  }
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return {
      ok: false,
      message:
        "Username must be 3-24 characters and can only contain letters, numbers, or underscore.",
    };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  return {
    ok: true,
    username: username.toLowerCase(),
    password,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = validateRegisterInput(body);
    if (!validated.ok) {
      return NextResponse.json({ message: validated.message }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: validated.username },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Username is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.username,
        username: validated.username,
        passwordHash,
        occupation: "student",
        salaryRange: null,
        accounts: {
          create: {
            name: "Main Wallet",
            type: "cash",
            balance: 0,
            currency: "MYR",
          },
        },
        categories: {
          create: [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES],
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    const { token, expiresAt } = await createUserSession(user.id, false);
    await setSessionCookie(token, expiresAt);

    return NextResponse.json(
      {
        message: "Registration successful.",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to register user.", error: String(error) },
      { status: 500 }
    );
  }
}
