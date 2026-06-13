import { prisma } from "@/lib/db/prisma";

const OWNER_ID = "owner";

export async function getOrCreateOwner() {
  let user = await prisma.user.findUnique({ where: { id: OWNER_ID } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: OWNER_ID,
        name: "Owner",
        email: process.env.OWNER_EMAIL ?? "owner@li-autopilot.local",
        settings: {},
      },
    });
  }
  return user;
}

export { OWNER_ID };
