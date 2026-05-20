import type { Prisma } from "@prisma/client";

import { getAuthenticatedUserId } from "./wishlist-command-context";
import { prisma } from "./prisma";

export type DashboardSettingsUser = Prisma.UserGetPayload<{
  include: {
    wishlist: {
      include: {
        items: {
          orderBy: {
            createdAt: "desc";
          };
        };
      };
    };
  };
}>;

export async function getDashboardSettingsIntake() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      wishlist: {
        include: {
          items: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
}
