import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        icon: true,
        source: true,
      },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load categories.", error: String(error) },
      { status: 500 }
    );
  }
}
