import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Connecting...");
    const period = "30d";
    let startDate;
    const now = new Date();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
    const dateFilter = { gte: startDate };

    console.log("1. projectGroupBy");
    await prisma.project.groupBy({ by: ["status"], _count: { id: true } });

    console.log("2. tasks");
    await prisma.task.findMany({
        where: { createdAt: dateFilter },
        select: { createdAt: true, status: true, endDate: true }
    });

    console.log("3. eventsByType");
    await prisma.event.findMany({
        where: { startDate: dateFilter },
        select: { id: true, type: true }
    });

    console.log("4. usersWithTasks");
    await prisma.user.findMany({
        where: { role: { in: ["PROJECT_MANAGER", "EMPLOYEE"] } },
        select: {
            id: true, name: true,
            assignedTasks: {
                where: { createdAt: dateFilter },
                select: { id: true, status: true }
            }
        }
    });

    console.log("5. conflictCount");
    await prisma.event.count({
        where: {
            startDate: dateFilter,
            status: "SCHEDULED",
            participants: { some: { status: "PENDING" } }
        }
    });
    console.log("Success!");
}
main().catch(e => { console.error("ERROR:"); console.error(e); process.exit(1); });
