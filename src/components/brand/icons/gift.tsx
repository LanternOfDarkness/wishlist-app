import { cn } from "@/lib/utils";

export function Gift({ className }: { className?: string }) {
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
      <path d="M4.3 10.3h15.4" />
      <path d="M4.9 10.3v8.3c0 .9.6 1.4 1.4 1.4h11.4c.8 0 1.4-.5 1.4-1.4v-8.3" />
      <path d="M3.3 7.6c1.5-.2 4.5-.1 8.7-.1s7.2-.1 8.7.1c-.2 1.3-.6 1.8-1.8 1.8H5.1c-1.2 0-1.6-.5-1.8-1.8Z" />
      <path d="M12 7.5c-.2 1.9-.7 2.6-.7 3.1M12 7.5c.2 1.9.7 2.6.7 3.1" />
      <path d="M9.9 8.9c-1.3.2-2.3-.1-2.6-1.1 1.2-.4 2.4-.1 2.6 1.1Z" />
      <path d="M14.1 8.9c1.3.2 2.3-.1 2.6-1.1-1.2-.4-2.4-.1-2.6 1.1Z" />
      <path d="M12 11.1v8.9" opacity="0.5" />
    </svg>
  );
}
