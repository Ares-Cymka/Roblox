const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.botSession.count();
    console.log("BotSession table exists, count:", count);
  } catch (e) {
    console.log("BotSession table issue:", e.message);
  }

  try {
    const job = await prisma.deliveryJob.findFirst({ select: { controllerType: true } });
    console.log("controllerType field exists, sample:", job ? job.controllerType : "no jobs");
  } catch (e) {
    console.log("controllerType issue:", e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
