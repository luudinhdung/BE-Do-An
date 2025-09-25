import { PrismaClient, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.pricingRule.createMany({
    data: [
      { type: MessageType.TEXT, cost: 0 },
      { type: MessageType.IMAGE, cost: 0 },
      { type: MessageType.FILE, cost: 0 },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Seeded default pricing rules with 0đ");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });