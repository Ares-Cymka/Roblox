import { GameType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CliOptions {
  game: GameType;
  username: string;
  quantity: number;
  reservedQuantity: number;
}

function parseArgs(argv: string[]): CliOptions {
  let game: string | undefined;
  let username: string | undefined;
  let quantity = 0;
  let reservedQuantity = 0;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--game") game = argv[++i];
    else if (arg === "--username") username = argv[++i];
    else if (arg === "--quantity") quantity = Number(argv[++i]);
    else if (arg === "--reserved") reservedQuantity = Number(argv[++i]);
  }

  if (!game || !username) {
    throw new Error(
      "Usage: npm run sync:bot-inventory -- --game MM2 --username radiomirrorq [--quantity 0] [--reserved 0]"
    );
  }

  if (!Object.values(GameType).includes(game as GameType)) {
    throw new Error(`Invalid game: ${game}`);
  }

  return {
    game: game as GameType,
    username: username.trim(),
    quantity,
    reservedQuantity,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const bot = await prisma.botAccount.findUnique({
    where: {
      game_robloxUsername: {
        game: options.game,
        robloxUsername: options.username,
      },
    },
  });

  if (!bot) {
    throw new Error(
      `Bot not found: ${options.username} (${options.game}). Create it in /admin/bots first.`
    );
  }

  const products = await prisma.product.findMany({
    where: { game: options.game },
    orderBy: { name: "asc" },
  });

  if (products.length === 0) {
    throw new Error(
      `No ${options.game} products in catalog. Run import:products for this game first.`
    );
  }

  let linked = 0;

  for (const product of products) {
    await prisma.botInventory.upsert({
      where: {
        botAccountId_productId: {
          botAccountId: bot.id,
          productId: product.id,
        },
      },
      create: {
        botAccountId: bot.id,
        productId: product.id,
        quantity: options.quantity,
        reservedQuantity: options.reservedQuantity,
      },
      update: {
        quantity: options.quantity,
        reservedQuantity: options.reservedQuantity,
      },
    });
    linked++;
  }

  console.log(`Bot: ${bot.robloxUsername} (${bot.game})`);
  console.log(`Linked ${linked} catalog product(s) to bot inventory.`);
  console.log(`Default quantity: ${options.quantity}, reserved: ${options.reservedQuantity}`);
  console.log("Update real in-game counts in /admin/bots when ready.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
