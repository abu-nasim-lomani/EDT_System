/**
 * Seed script: Create users for EDT System
 * Run with: npx ts-node scripts/seed-users.ts
 */

import bcrypt from "bcrypt";
import { prisma } from "../src/utils/prisma";

const PASSWORD = "edt@2026"; // shared password for all seeded users

const USERS = [
    // ── Senior Management ──
    { name: "RR", email: "rr@edt.com", role: "SENIOR_MANAGEMENT", designation: "Regional Representative" },
    { name: "DRR", email: "drr@edt.com", role: "SENIOR_MANAGEMENT", designation: "Deputy Regional Representative" },
    { name: "ARR", email: "arr@edt.com", role: "SENIOR_MANAGEMENT", designation: "Assistant Regional Representative" },
    { name: "Sr. Analyst", email: "analyst@edt.com", role: "SENIOR_MANAGEMENT", designation: "Senior Analyst" },

    // ── Project Managers ──
    { name: "PM Alpha", email: "pm.alpha@edt.com", role: "PROJECT_MANAGER", designation: "Project Manager" },
    { name: "PM Beta", email: "pm.beta@edt.com", role: "PROJECT_MANAGER", designation: "Project Manager" },
    { name: "PM Gamma", email: "pm.gamma@edt.com", role: "PROJECT_MANAGER", designation: "Project Manager" },
    { name: "PM Delta", email: "pm.delta@edt.com", role: "PROJECT_MANAGER", designation: "Project Manager" },
] as const;

async function main() {
    console.log("🌱 Seeding users...\n");
    const hashed = await bcrypt.hash(PASSWORD, 10);

    for (const u of USERS) {
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (existing) {
            console.log(`  ⏭  Skipped  ${u.name.padEnd(14)} (already exists)`);
            continue;
        }
        await prisma.user.create({
            data: { name: u.name, email: u.email, password: hashed, role: u.role, designation: u.designation },
        });
        console.log(`  ✅ Created  ${u.name.padEnd(14)} – ${u.email}  [${u.role}]`);
    }

    console.log(`\n🔑 Shared password: ${PASSWORD}`);
    console.log("✨ Done!");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
