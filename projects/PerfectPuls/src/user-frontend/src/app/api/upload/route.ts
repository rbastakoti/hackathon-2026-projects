import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Forward the multipart form data directly to the FastAPI backend
    const res = await fetch(`${BACKEND_URL}/api/process-pdf`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type — fetch sets it with the correct multipart boundary
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend error: ${res.status}`, detail: text },
        { status: res.status }
      );
    }

    // Try to parse as JSON, fall back to raw text
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ message: text });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach backend", detail: String(err) },
      { status: 503 }
    );
  }
}
