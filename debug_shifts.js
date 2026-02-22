import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const shifts = await prisma.shift.findMany({ take: 5 });
    console.log('Sample Shifts:', JSON.stringify(shifts, null, 2));
    const users = await prisma.user.findMany({ take: 5, select: { id: true, username: true } });
    console.log('Sample Users:', JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
