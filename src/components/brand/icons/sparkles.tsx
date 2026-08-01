import { cn } from "@/lib/utils";

export function Sparkles({ className }: { className?: string }) {
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
      <path d="M10.8 3.5l1.2 5.1 5.1 1.2-5.1 1.2-1.2 5.1-1.2-5.1-5.1-1.2 5.1-1.2Z" />
      <path d="M17.9 13.9l.6 2.3 2.3.6-2.3.6-.6 2.3-.6-2.3-2.3-.6 2.3-.6Z" />
      <path d="M6.4 15.4l.5 1.9 1.9.5-1.9.5-.5 1.9-.5-1.9-1.9-.5 1.9-.5Z" />
    </svg>
  );
}
