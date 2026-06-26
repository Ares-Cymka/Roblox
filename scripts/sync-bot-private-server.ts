import { PrismaClient, GameType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const privateServerUrl = process.env.BOT_PRIVATE_SERVER_URL?.trim();
  if (!privateServerUrl) {
    console.error("BOT_PRIVATE_SERVER_URL is not set in .env");
    process.exit(1);
  }

  const bot = await prisma.botAccount.updateMany({
    where: { game: GameType.MM2, robloxUsername: "radiomirrorq" },
    data: { privateServerUrl },
  });

  if (bot.count === 0) {
    console.warn("No MM2 bot radiomirrorq found — run db:seed first.");
    return;
  }

  await prisma.mM2DeliverySession.updateMany({
    where: { privateServerUrl: null },
    data: { privateServerUrl },
  });

  console.log(`Updated MM2 bot privateServerUrl (${bot.count} bot account(s)).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
