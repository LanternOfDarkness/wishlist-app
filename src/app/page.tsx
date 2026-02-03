import { SignInButton } from "@/components/sign-in-button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Wishlist App MVP</h1>
      <p className="text-muted-foreground">Збережи свої мрії в одному місці</p>
      <SignInButton />
    </main>
  );
}