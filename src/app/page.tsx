import { SignInButton } from "@/components/sign-in-button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true }
    });

    if (user?.username) {
      redirect(`/wishlist/${user.username}`);
    } else {
      redirect("/dashboard/settings");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Wishlist App MVP</h1>
      <p className="text-muted-foreground">Збережи свої мрії в одному місці</p>
      <SignInButton />
    </main>
  );
}