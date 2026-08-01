import { cn } from "@/lib/utils";

export function Star({ className }: { className?: string }) {
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
      <path d="M12 3.3 14 9.6l6.7-.4-5.3 4.1 1.7 6.5-5.1-3.9-5.1 3.9 1.7-6.5-5.3-4.1 6.7.4Z" />
    </svg>
  );
}
