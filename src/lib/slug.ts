export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugifyWithTimestamp(text: string): string {
  const clean = slugify(text);
  return clean.length > 0
    ? `${clean}-${Date.now().toString().slice(-4)}`
    : `item-${Date.now().toString().slice(-4)}`;
}

export function generateUsername(name: string | null | undefined, email: string | undefined): string {
  const emailPrefix = email?.split("@")[0] || "user";
  let base = name
    ? name.toLowerCase().replace(/\s+/g, "").replace(/[^\w-]/g, "")
    : emailPrefix;
  if (base.length < 2) base = emailPrefix;
  if (base.length < 2) base = "user";
  return slugifyWithTimestamp(base);
}
