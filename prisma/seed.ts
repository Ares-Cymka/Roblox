import { BotStatus, DeliveryMethod, GameType, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function connectWithRetry(maxAttempts = 5, delayMs = 4000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.warn(
        `Database unreachable (attempt ${attempt}/${maxAttempts}). ` +
          "Neon compute may be waking up — retrying..."
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

const TRADING_INSTRUCTIONS =
  "Step 1: Add the bot as a friend on Roblox.\nStep 2: Join the bot's private server.\nStep 3: Complete the in-game trade.\nStep 4: Wait for website delivery confirmation.";

const MAILBOX_INSTRUCTIONS =
  "Step 1: Confirm your Roblox username.\nStep 2: The bot sends the item through the mailbox system.\nStep 3: Wait for delivery confirmation.";

async function seedGameDeliveryConfigs() {
  const configs = [
    {
      game: GameType.MM2,
      deliveryMethod: DeliveryMethod.TRADING,
      requiresFriend: true,
      requiresPrivateServer: true,
      requiresCustomerJoin: true,
      requiresManualConfirmation: true,
      instructions: TRADING_INSTRUCTIONS,
    },
    {
      game: GameType.ADOPT_ME,
      deliveryMethod: DeliveryMethod.TRADING,
      requiresFriend: true,
      requiresPrivateServer: true,
      requiresCustomerJoin: true,
      requiresManualConfirmation: true,
      instructions: TRADING_INSTRUCTIONS,
    },
    {
      game: GameType.SAB,
      deliveryMethod: DeliveryMethod.TRADING,
      requiresFriend: true,
      requiresPrivateServer: true,
      requiresCustomerJoin: true,
      requiresManualConfirmation: true,
      instructions: TRADING_INSTRUCTIONS,
    },
    {
      game: GameType.GAG2,
      deliveryMethod: DeliveryMethod.MAILBOX,
      requiresFriend: false,
      requiresPrivateServer: false,
      requiresCustomerJoin: false,
      requiresManualConfirmation: true,
      instructions: MAILBOX_INSTRUCTIONS,
    },
  ];

  for (const config of configs) {
    await prisma.gameDeliveryConfig.upsert({
      where: { game: config.game },
      update: config,
      create: config,
    });
    console.log(`Game delivery config ready: ${config.game} (${config.deliveryMethod})`);
  }
}

async function main() {
  await connectWithRetry();

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
      currentDeliveries: 0,
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

  await seedGameDeliveryConfigs();

  const testCustomer = await prisma.customer.upsert({
    where: { testCode: "TESTPLAYER" },
    update: {},
    create: {
      testCode: "TESTPLAYER",
      robloxUsername: "TestPlayer",
    },
  });

  console.log(`Test customer ready: ${testCustomer.testCode}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
