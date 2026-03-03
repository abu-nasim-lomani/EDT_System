const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                subTasks: true,
                creator: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
                collaborators: { select: { id: true, name: true, avatar: true } },
                project: { select: { id: true, name: true } }
            }
        });
        console.log("SUCCESS:", tasks.length, "tasks found.");
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
