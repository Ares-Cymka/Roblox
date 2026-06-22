import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addSupportNote } from "@/server/services/support-review";

export const dynamic = "force-dynamic";

const schema = z.object({
  note: z.string().trim().min(1, "Note is required").max(2000),
});

interface RouteContext {
  params: { withdrawalId: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { withdrawalId } = context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await addSupportNote(withdrawalId, parsed.data.note);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to add support note" }, { status: 500 });
  }
}
