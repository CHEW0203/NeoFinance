import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        occupation: user.occupation,
        salaryRange: user.salaryRange,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch current user.", error: String(error) },
      { status: 500 }
    );
  }
}
