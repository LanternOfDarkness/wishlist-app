import { cn } from "@/lib/utils";

export function Lock({ className }: { className?: string }) {
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
      <path d="M7 10.6V8.3c0-2.7 2.2-4.9 5-4.9s5 2.2 5 4.9v2.3" />
      <path d="M4.7 10.8c-.8 0-1.3.5-1.3 1.3v7.4c0 .8.5 1.3 1.3 1.3h14.6c.8 0 1.3-.5 1.3-1.3v-7.4c0-.8-.5-1.3-1.3-1.3H4.7Z" />
      <path d="M12 13.3c-.8 0-1.5.6-1.5 1.3 0 .5.3.9.7 1.1v1.7h1.6v-1.7c.4-.2.7-.6.7-1.1 0-.7-.7-1.3-1.5-1.3Z" />
    </svg>
  );
}
