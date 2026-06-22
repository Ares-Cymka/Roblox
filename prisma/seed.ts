import { BotStatus, GameType, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const adminUser = await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${adminUser.email}`);

  const botAccount = await prisma.botAccount.upsert({
    where: {
      game_robloxUsername: {
        game: GameType.MM2,
        robloxUsername: "radiomirrorq",
      },
    },
    update: {
      status: BotStatus.ONLINE,
      maxConcurrentDeliveries: 1,
      profileUrl: "https://www.roblox.com/users/search?keyword=radiomirrorq",
    },
    create: {
      game: GameType.MM2,
      robloxUsername: "radiomirrorq",
      profileUrl: "https://www.roblox.com/users/search?keyword=radiomirrorq",
      status: BotStatus.ONLINE,
      maxConcurrentDeliveries: 1,
      currentDeliveries: 0,
    },
  });

  console.log(`MM2 bot account ready: ${botAccount.robloxUsername} (${botAccount.status})`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
