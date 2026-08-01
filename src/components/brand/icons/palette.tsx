import { cn } from "@/lib/utils";

export function Palette({ className }: { className?: string }) {
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
      <path d="M12.1 4c4.6-.2 7.9 2.9 7.9 6.6 0 3.8-3.5 6.8-7.6 6.8-1.4 0-2.3-.9-2.3-2 0-.6.3-1.2.7-1.6.7-.7 1.5-1.3 1.5-2.4 0-1.1-.9-1.8-2.3-1.8H8.3C6 10.6 4.2 9.9 4.1 8 4 6.2 7.5 4.1 12.1 4Z" />
      <circle cx="8.8" cy="6.3" r="1.1" opacity="0.75" />
      <circle cx="16.6" cy="7.6" r="1.1" opacity="0.75" />
      <circle cx="17.4" cy="12.7" r="1" opacity="0.75" />
      <circle cx="11.9" cy="14.9" r="0.9" opacity="0.6" />
    </svg>
  );
}
