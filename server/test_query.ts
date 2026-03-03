import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting query...");
    const now = new Date();
    try {
        const [
            allProjects,
            allTasks,
            allEvents,
            recentDecisions
        ] = await Promise.all([
            prisma.project.findMany({
                include: {
                    manager: { select: { name: true } },
                    arr: { select: { name: true } },
                    tasks: {
                        select: {
                            id: true,
                            endDate: true,
                            status: true,
                        }
                    },
                    events: {
                        where: { startDate: { gte: now } },
                        select: { id: true }
                    }
                }
            }),
            prisma.task.findMany({
                include: { project: { select: { name: true } } }
            }),
            prisma.event.findMany({
                where: { status: "SCHEDULED" },
                include: { participants: true }
            }),
            prisma.decision.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                include: { event: { select: { title: true } }, task: { select: { status: true } } }
            })
        ]);
        console.log("Query Successful.");
    } catch (e) {
        console.error("Error occurred:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
