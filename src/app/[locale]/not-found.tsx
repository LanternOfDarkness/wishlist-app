import { Gift } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Gift size={32} />
      </div>
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight">
        {t("title")}
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        {t("description")}
      </p>
      <Button asChild size="lg">
        <Link href="/">{t("homeButton")}</Link>
      </Button>
    </div>
  );
}
