import { NextResponse } from "next/server";

// Auth disabled
export function GET() {
  return NextResponse.json({ message: "Auth disabled" }, { status: 200 });
}

export function POST() {
  return NextResponse.json({ message: "Auth disabled" }, { status: 200 });
}
