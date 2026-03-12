import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

function toPositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toDateStart(value) {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return null;
  const next = new Date(parsed);
  next.setHours(0, 0, 0, 0);
  return next;
}

export async function POST(request) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const body = await request.json();
    const sourceDate = toDateStart(body?.sourceDate);
    const targetAmount = Math.max(0, Number(body?.targetAmount || 0));
    const spentAmount = Math.max(0, Number(body?.spentAmount || 0));
    const requestedAmount = toPositiveNumber(body?.remainingAmount);

    if (!sourceDate) {
      return NextResponse.json({ message: "sourceDate is required." }, { status: 400 });
    }

    if (!requestedAmount) {
      return NextResponse.json({
        data: {
          sourceDate,
          creditedAmount: 0,
          requestedAmount: 0,
          reason: "no_positive_remaining",
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.savingsRollover.findUnique({
        where: {
          userId_sourceDate: {
            userId: user.id,
            sourceDate,
          },
        },
      });
      if (existing) {
        return {
          sourceDate,
          creditedAmount: Number(existing.creditedAmount || 0),
          requestedAmount: Number(existing.requestedAmount || 0),
          reason: "already_rolled",
        };
      }

      const accounts = await tx.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, balance: true },
      });
      if (!accounts.length) {
        throw new Error("No account found for this user.");
      }

      const availableTotal = accounts.reduce(
        (sum, item) => sum + Math.max(0, Number(item.balance || 0)),
        0
      );
      const creditedAmount = Math.min(requestedAmount, availableTotal);

      const vault = await tx.savingsVault.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          amount: 0,
        },
        update: {},
        select: { id: true },
      });

      if (creditedAmount > 0) {
        let remainingToTransfer = creditedAmount;
        for (const account of accounts) {
          if (remainingToTransfer <= 0) break;
          const availableInAccount = Math.max(0, Number(account.balance || 0));
          if (availableInAccount <= 0) continue;
          const deduction = Math.min(remainingToTransfer, availableInAccount);
          await tx.account.update({
            where: { id: account.id },
            data: {
              balance: { decrement: deduction },
            },
          });
          remainingToTransfer -= deduction;
        }

        await tx.savingsVault.update({
          where: { id: vault.id },
          data: {
            amount: { increment: creditedAmount },
          },
        });
      }

      await tx.savingsRollover.create({
        data: {
          sourceDate,
          targetAmount,
          spentAmount,
          requestedAmount,
          creditedAmount,
          userId: user.id,
          savingsVaultId: vault.id,
        },
      });

      return {
        sourceDate,
        creditedAmount,
        requestedAmount,
        reason: creditedAmount > 0 ? "rolled_over" : "insufficient_balance",
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to process budget rollover.", error: String(error) },
      { status: 500 }
    );
  }
}
