import { NextResponse } from "next/server";
import { deleteCurrentSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await deleteCurrentSession();
    return NextResponse.json({ message: "Logged out successfully." });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to logout.", error: String(error) },
      { status: 500 }
    );
  }
}
