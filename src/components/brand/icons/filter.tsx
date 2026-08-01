import { cn } from "@/lib/utils";

export function Filter({ className }: { className?: string }) {
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
      <path d="M4.3 5.6c5.1.3 10.3.3 15.4 0" />
      <path d="M6.7 9.9c3.5.2 7.1.2 10.6 0" />
      <path d="M9.2 14.2c1.9.1 3.7.1 5.6 0" />
      <path d="M12 14.2v4.4" />
      <path d="M10 18.6h4" />
    </svg>
  );
}
