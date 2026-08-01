import { cn } from "@/lib/utils";

export function Package({ className }: { className?: string }) {
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
      <path d="M4.3 8.4 12 4.6l7.7 3.8-7.7 4-7.7-4Z" />
      <path d="M4.3 8.4v7.9c0 .9.5 1.5 1.4 1.5h12.6c.9 0 1.4-.6 1.4-1.5V8.4" />
      <path d="M8.2 6.4 12 8.5l3.8-2.1" opacity="0.6" />
      <path d="M12 8.4v9.4" opacity="0.5" />
    </svg>
  );
}
