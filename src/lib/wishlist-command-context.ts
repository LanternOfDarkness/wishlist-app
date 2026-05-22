import { auth } from "@/auth";

export async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

export async function requireAuthenticatedUserId(message = "Unauthorized") {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error(message);
  }

  return userId;
}
