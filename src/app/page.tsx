import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-4">
      <h1 className="text-4xl font-bold">Wishlist App MVP</h1>
      <p className="text-muted-foreground">Початок роботи</p>
      <Button>Click me</Button>
    </main>
  );
}