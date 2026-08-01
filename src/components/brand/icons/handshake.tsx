import { cn } from "@/lib/utils";

export function Handshake({ className }: { className?: string }) {
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
      <path d="M3.8 20.6c1.7-1.9 3.9-3.1 6.2-3.1 1.4 0 2.6.5 3.7 1.4" />
      <path d="M20.2 20.6c-1.7-1.9-3.9-3.1-6.2-3.1-1.4 0-2.6.5-3.7 1.4" />
      <path d="M9.6 13.5c1.1-1.4 2.4-2.1 3.6-2.1s2.5.7 3.6 2.1" />
      <path d="M9.9 16.9c1 .5 2.1.8 3.3.8s2.3-.3 3.3-.8" />
      <path d="M10.7 13.9v2.2M12 13.7v2.6M13.3 13.9v2.2" opacity="0.55" />
      <path d="M5.9 20.5l.9-3M18.1 20.5l-.9-3" opacity="0.7" />
    </svg>
  );
}
