import { cn } from "@/lib/utils";

export function User({ className }: { className?: string }) {
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
      <path d="M12 4.6c2 .1 3.5 1.6 3.5 3.5 0 2-1.6 3.6-3.6 3.6-2-.1-3.5-1.6-3.5-3.6 0-1.9 1.6-3.5 3.6-3.5Z" />
      <path d="M5.2 19.4c.4-3.5 3.1-5.3 6.8-5.3s6.4 1.8 6.8 5.3" />
    </svg>
  );
}
