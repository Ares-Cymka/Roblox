const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const bots = [
    { game: "SAB", username: "rngblox_sab_bot" },
    { game: "ADOPT_ME", username: "rngblox_adoptme_bot" },
    { game: "GAG2", username: "rngblox_gag2_bot" },
  ];

  for (const pb of bots) {
    const r = await prisma.botAccount.upsert({
      where: { game_robloxUsername: { game: pb.game, robloxUsername: pb.username } },
      update: {},
      create: {
        game: pb.game,
        robloxUsername: pb.username,
        profileUrl: "https://www.roblox.com/users/search?keyword=" + pb.username,
        status: "OFFLINE",
        maxConcurrentDeliveries: 1,
        currentDeliveries: 0,
      },
    });
    console.log("Bot ready:", r.game, r.robloxUsername, r.status);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
