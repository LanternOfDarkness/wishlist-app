import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

/**
 * Hand-drawn "lost" eye mark for the 404 page — an almond/lens outline with
 * a circle pupil, `currentColor` stroke. `aria-hidden` because the adjacent
 * heading + description already carry the meaning of the page.
 */
function LostEyeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 12.3c2.6-4.6 6.2-6.9 9.5-6.8 3.3.1 6.8 2.5 9.3 6.8-2.5 4.4-6 6.8-9.3 6.9-3.3.1-6.9-2.2-9.5-6.9Z" />
      <circle cx="12" cy="12.2" r="3.1" />
      <path d="M12 10.4v.2" opacity="0.6" />
    </svg>
  );
}

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="sketch sketch-tight mb-6 flex h-16 w-16 items-center justify-center bg-(--sk-surface) text-(--sk-accent)">
        <LostEyeMark className="wobble-icon h-8 w-8" />
      </div>
      <h1 className="mb-2 font-display text-4xl">
        {t("title")}
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        {t("description")}
      </p>
      <Button asChild size="lg" variant="sketch">
        <Link href="/">{t("homeButton")}</Link>
      </Button>
    </div>
  );
}
