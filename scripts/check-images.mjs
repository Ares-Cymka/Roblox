import { PrismaClient } from '../node_modules/@prisma/client/index.js';
const p = new PrismaClient();
const rows = await p.product.findMany({ select: { imageUrl: true, name: true, game: true }, take: 10 });
console.log(JSON.stringify(rows, null, 2));
await p.$disconnect();
