import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "financial-tracker-and-analysis",
    timestamp: new Date().toISOString(),
  });
}
