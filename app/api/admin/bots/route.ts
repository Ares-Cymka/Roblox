import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createBotAccountSchema } from "@/server/validators/bot";
import { createBotAccount, listBotAccounts } from "@/server/services/bot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bots = await listBotAccounts();
    return NextResponse.json({ bots });
  } catch {
    return NextResponse.json(
      { error: "Failed to load bot accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createBotAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const bot = await createBotAccount(parsed.data);
    return NextResponse.json({ bot }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A bot with this game and username already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create bot account" },
      { status: 500 }
    );
  }
}
