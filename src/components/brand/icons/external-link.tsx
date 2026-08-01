import { cn } from "@/lib/utils";

export function ExternalLink({ className }: { className?: string }) {
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
      <path d="M14.2 4.6H6.9c-1.5 0-2.4 1-2.4 2.4v10.6c0 1.4 1 2.4 2.4 2.4h10.6c1.4 0 2.4-1 2.4-2.4v-3.2" />
      <path d="M14.2 4.6h5.2v5.2" />
      <path d="M19.4 4.6l-7.6 7.6" />
    </svg>
  );
}
