import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { updateBotAccountSchema } from "@/server/validators/bot";
import {
  deleteBotAccount,
  getBotAccountById,
  updateBotAccount,
} from "@/server/services/bot";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const bot = await getBotAccountById(params.id);
    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }
    return NextResponse.json({ bot });
  } catch {
    return NextResponse.json(
      { error: "Failed to load bot account" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateBotAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const bot = await updateBotAccount(params.id, parsed.data);
    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }
    return NextResponse.json({ bot });
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
      { error: "Failed to update bot account" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await deleteBotAccount(params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete bot account" },
      { status: 500 }
    );
  }
}
