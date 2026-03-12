import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        createdAt: true,
        savingsVault: {
          select: {
            amount: true,
          },
        },
        transactions: { select: { id: true } },
      },
    });

    return NextResponse.json({
      user: {
        id: profile.id,
        username: profile.username,
        createdAt: profile.createdAt,
        transactionCount: profile.transactions.length,
        savingsAmount: Number(profile.savingsVault?.amount || 0),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load profile.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const nextUsername = body.username
      ? String(body.username).trim().toLowerCase()
      : null;
    const nextPassword = body.password ? String(body.password) : null;

    if (!nextUsername && !nextPassword) {
      return NextResponse.json(
        { message: "Nothing to update." },
        { status: 400 }
      );
    }

    if (nextUsername && !/^[a-zA-Z0-9_]{3,24}$/.test(nextUsername)) {
      return NextResponse.json(
        {
          message:
            "Username must be 3-24 characters and can only contain letters, numbers, or underscore.",
        },
        { status: 400 }
      );
    }

    if (nextPassword && nextPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (nextUsername) {
      const existing = await prisma.user.findUnique({
        where: { username: nextUsername },
        select: { id: true },
      });
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { message: "Username is already taken." },
          { status: 409 }
        );
      }
    }

    const updateData = {};
    if (nextUsername) {
      updateData.username = nextUsername;
      updateData.name = nextUsername;
    }
    if (nextPassword) {
      updateData.passwordHash = await bcrypt.hash(nextPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully.",
      user: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update profile.", error: String(error) },
      { status: 500 }
    );
  }
}
