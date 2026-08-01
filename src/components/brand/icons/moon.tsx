import { cn } from "@/lib/utils";

export function Moon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(className)}
    >
      <path d="M12.3 3.3a6.2 6.2 0 0 0 8.9 9.3c.6.3.5 1.3-.2 1.5a9.3 9.3 0 1 1-8.7-10.8Z" />
    </svg>
  );
}
