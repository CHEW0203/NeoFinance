import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@finance.local";

async function getDemoUserId() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });
  return user?.id || null;
}

export async function DELETE(_request, context) {
  try {
    const userId = await getDemoUserId();
    if (!userId) {
      return NextResponse.json(
        { message: "Demo user not found. Run `npm run db:seed` first." },
        { status: 404 }
      );
    }

    const resolvedParams = await context.params;
    const id = String(resolvedParams?.id || "").trim();
    if (!id) {
      return NextResponse.json({ message: "Transaction id is required." }, { status: 400 });
    }

    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        amount: true,
        type: true,
        accountId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const balanceRollback = existing.type === "income" ? -existing.amount : existing.amount;

      await tx.transaction.delete({
        where: { id: existing.id },
      });

      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          balance: { increment: balanceRollback },
        },
      });
    });

    return NextResponse.json({ message: "Transaction deleted." });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete transaction.", error: String(error) },
      { status: 500 }
    );
  }
}
