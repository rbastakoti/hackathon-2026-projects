import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  // Build Gemini request — system instruction + conversation history
  const systemInstruction = {
    parts: [
      {
        text: `You are an expert insurance benefits assistant for PerfectPuls, a healthcare benefits portal.
Your role is to help users understand their insurance coverage in clear, simple language.
Focus on: deductibles, copays, out-of-pocket maximums, provider networks, premiums, claims,
coverage details, prescriptions, mental health benefits, physiotherapy, dental, vision, and wellness.
Always be concise, empathetic, and use plain English — avoid jargon unless you explain it.
When relevant, mention that the user can check their savings dashboard for real-time benefit tracking.`,
      },
    ],
  };

  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: systemInstruction,
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";

  return NextResponse.json({ text });
}
