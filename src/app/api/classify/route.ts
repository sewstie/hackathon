// POST /api/classify — the server-side boundary for classification.
//
// Runs on the server so the AI key (ANTHROPIC_API_KEY) is never shipped to the
// browser: the client posts the student's text here and gets a structured
// Classification back. The ai module itself never blocks — on any AI problem it
// returns a keyword fallback — so this route always responds with a result for
// a valid body.
import { NextResponse } from "next/server";
import { z } from "zod";

import { classify } from "@/modules/ai";

const requestSchema = z.object({
  text: z.string().min(1).max(500),
  mode: z.enum(["public", "private"]).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected { text: string (1-500 chars), mode?: 'public' | 'private' }." },
      { status: 400 },
    );
  }

  const classification = await classify({
    text: parsed.data.text,
    mode: parsed.data.mode,
  });

  return NextResponse.json(classification);
}
