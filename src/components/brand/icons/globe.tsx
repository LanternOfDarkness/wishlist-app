import { cn } from "@/lib/utils";

export function Globe({ className }: { className?: string }) {
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
      <path d="M12 3.4c4.9 0 8.7 3.8 8.7 8.6s-3.8 8.6-8.7 8.6-8.6-3.8-8.6-8.6S7.1 3.4 12 3.4Z" />
      <path d="M3.6 12h16.8" opacity="0.8" />
      <path d="M5.1 7.9c2-1 4.4-1.5 6.9-1.5s4.9.5 6.9 1.5" opacity="0.65" />
      <path d="M5.1 16.1c2 1 4.4 1.5 6.9 1.5s4.9-.5 6.9-1.5" opacity="0.65" />
      <path d="M12 3.4v17.2" opacity="0.55" />
    </svg>
  );
}
