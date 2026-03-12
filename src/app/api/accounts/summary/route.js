import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: { balance: true, currency: true },
    });

    const totalBalance = accounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);
    const currency = accounts[0]?.currency || "MYR";

    return NextResponse.json({
      data: {
        totalBalance,
        currency,
        accountCount: accounts.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load account summary.", error: String(error) },
      { status: 500 }
    );
  }
}
