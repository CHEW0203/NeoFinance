import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

export async function DELETE(_request, context) {
  try {
    const currentUser = await requireCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized. Please login." },
        { status: 401 }
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
        userId: currentUser.id,
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
