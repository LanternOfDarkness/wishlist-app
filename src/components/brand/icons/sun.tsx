import { cn } from "@/lib/utils";

export function Sun({ className }: { className?: string }) {
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
      <path d="M12 7.6c2.4.1 4.3 2.1 4.3 4.5 0 2.3-1.9 4.2-4.3 4.3-2.3.1-4.3-1.8-4.3-4.2 0-2.4 2-4.6 4.3-4.6Z" />
      <path d="M12 3.1v2.4M12 18.5v2.4M3.1 12h2.4M18.5 12h2.4M5.8 5.8l1.7 1.7M16.5 16.5l1.7 1.7M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7" />
    </svg>
  );
}
