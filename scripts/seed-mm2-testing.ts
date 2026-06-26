/**
 * Seeds MM2 catalog, bot, bot inventory, and TESTPLAYER customer inventory for local testing.
 *
 * Usage: npm run seed:mm2-testing
 */
import fs from "node:fs";
import path from "node:path";
import {
  BotStatus,
  DeliveryMethod,
  GameType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { syncBotCurrentDeliveries } from "../server/services/bot-capacity";

const prisma = new PrismaClient();

const MM2_BOT_USERNAME = "radiomirrorq";
const TEST_CUSTOMER_CODE = "TESTPLAYER";
const BOT_STOCK_QTY = 10;
const TEST_ITEM_ITEM_ID = "22"; // Celestial — $150, under $200 withdrawal limit

const MM2_INSTRUCTIONS =
  "Join the assigned bot's MM2 private server and wait in the lobby. The delivery bot will send you a trade request. Only accept a trade from the assigned bot username.";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const values = parseCsvLine(lines[lineIndex]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

async function importMm2ProductsFromCsv() {
  const filePath = path.resolve(process.cwd(), "data/mm2-products.csv");
  if (!fs.existsSync(filePath)) {
    throw new Error(`MM2 catalog file not found: ${filePath}`);
  }

  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  let imported = 0;

  for (const row of rows) {
    const itemId = row.id?.trim();
    const name = row.name?.trim();
    if (!itemId || !name) continue;

    const valueRaw = row.value?.trim();
    const value =
      valueRaw && !Number.isNaN(Number(valueRaw))
        ? new Prisma.Decimal(valueRaw)
        : null;

    await prisma.product.upsert({
      where: { game_itemId: { game: GameType.MM2, itemId } },
      create: {
        game: GameType.MM2,
        itemId,
        name,
        rarity: row.rarity?.trim() || null,
        value,
        imageUrl: row.img?.trim() || null,
        stock: 0,
        metadata: row.boxes?.trim() ? { boxes: row.boxes.trim() } : undefined,
      },
      update: {
        name,
        rarity: row.rarity?.trim() || null,
        value,
        imageUrl: row.img?.trim() || null,
      },
    });
    imported++;
  }

  console.log(`MM2 catalog: ${imported} product(s) ready`);
}

async function seedMm2GameConfig() {
  await prisma.gameDeliveryConfig.upsert({
    where: { game: GameType.MM2 },
    create: {
      game: GameType.MM2,
      deliveryMethod: DeliveryMethod.TRADING,
      requiresFriend: true,
      requiresPrivateServer: true,
      requiresCustomerJoin: true,
      requiresManualConfirmation: true,
      instructions: MM2_INSTRUCTIONS,
      averageDeliveryMinutes: 5,
    },
    update: {
      deliveryMethod: DeliveryMethod.TRADING,
      requiresFriend: true,
      requiresPrivateServer: true,
      requiresCustomerJoin: true,
      requiresManualConfirmation: true,
      instructions: MM2_INSTRUCTIONS,
    },
  });
  console.log("MM2 game delivery config ready");
}

async function seedMm2Bot() {
  const privateServerUrl = process.env.BOT_PRIVATE_SERVER_URL?.trim() || null;

  const bot = await prisma.botAccount.upsert({
    where: {
      game_robloxUsername: {
        game: GameType.MM2,
        robloxUsername: MM2_BOT_USERNAME,
      },
    },
    create: {
      game: GameType.MM2,
      robloxUsername: MM2_BOT_USERNAME,
      profileUrl: `https://www.roblox.com/users/search?keyword=${MM2_BOT_USERNAME}`,
      privateServerUrl,
      status: BotStatus.ONLINE,
      maxConcurrentDeliveries: 1,
      currentDeliveries: 0,
    },
    update: {
      status: BotStatus.ONLINE,
      maxConcurrentDeliveries: 1,
      profileUrl: `https://www.roblox.com/users/search?keyword=${MM2_BOT_USERNAME}`,
      ...(privateServerUrl ? { privateServerUrl } : {}),
    },
  });

  console.log(`MM2 bot ready: ${bot.robloxUsername} (${bot.status})`);
  if (privateServerUrl) {
    console.log(`Private server: ${privateServerUrl}`);
  } else {
    console.warn("BOT_PRIVATE_SERVER_URL not set — Join MM2 Server button will be disabled.");
  }

  return bot;
}

async function seedBotInventory(botAccountId: string) {
  const products = await prisma.product.findMany({
    where: { game: GameType.MM2 },
    orderBy: { name: "asc" },
  });

  for (const product of products) {
    await prisma.botInventory.upsert({
      where: {
        botAccountId_productId: {
          botAccountId,
          productId: product.id,
        },
      },
      create: {
        botAccountId,
        productId: product.id,
        quantity: BOT_STOCK_QTY,
        reservedQuantity: 0,
      },
      update: {
        quantity: BOT_STOCK_QTY,
        reservedQuantity: 0,
      },
    });
  }

  console.log(`Bot inventory: ${products.length} MM2 item(s) at qty ${BOT_STOCK_QTY}`);
}

async function seedTestCustomerInventory() {
  const customer = await prisma.customer.upsert({
    where: { testCode: TEST_CUSTOMER_CODE },
    update: { robloxUsername: "TestPlayer" },
    create: {
      testCode: TEST_CUSTOMER_CODE,
      robloxUsername: "TestPlayer",
    },
  });

  const celestial = await prisma.product.findUnique({
    where: {
      game_itemId: { game: GameType.MM2, itemId: TEST_ITEM_ITEM_ID },
    },
  });

  if (!celestial) {
    throw new Error("Celestial (itemId 22) not found — catalog import failed.");
  }

  const existing = await prisma.customerInventory.findFirst({
    where: { customerId: customer.id, productId: celestial.id },
  });

  if (existing) {
    await prisma.customerInventory.update({
      where: { id: existing.id },
      data: { quantity: 1, reservedQuantity: 0 },
    });
  } else {
    await prisma.customerInventory.create({
      data: {
        customerId: customer.id,
        productId: celestial.id,
        quantity: 1,
        reservedQuantity: 0,
      },
    });
  }

  console.log(
    `Test customer ${TEST_CUSTOMER_CODE}: 1x ${celestial.name} ($${celestial.value}) ready to withdraw`
  );
  console.log(`Open /inventory and lookup code: ${TEST_CUSTOMER_CODE}`);
}

async function main() {
  await importMm2ProductsFromCsv();
  await seedMm2GameConfig();
  const bot = await seedMm2Bot();
  await seedBotInventory(bot.id);
  await syncBotCurrentDeliveries(bot.id);
  await seedTestCustomerInventory();

  console.log("\nMM2 testing placeholder setup complete.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
