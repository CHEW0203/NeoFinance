import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const [vault, firstAccount] = await Promise.all([
      prisma.savingsVault.findUnique({
        where: { userId: user.id },
        select: { amount: true, updatedAt: true },
      }),
      prisma.account.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { currency: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        amount: Number(vault?.amount || 0),
        updatedAt: vault?.updatedAt || null,
        currency: firstAccount?.currency || "MYR",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load savings.", error: String(error) },
      { status: 500 }
    );
  }
}
