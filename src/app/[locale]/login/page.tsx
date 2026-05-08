import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTranslations } from "next-intl/server";

export default async function LoginPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Navigation' });

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/20">
            <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl shadow-sm border">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
                        {t('login') || "Sign in / Register"}
                    </h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                        Use your email or Google account to continue
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {/* Email Magic Link Form */}
                    <form
                        action={async (formData) => {
                            "use server";
                            await signIn("nodemailer", formData);
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label htmlFor="email" className="sr-only">
                                Email address
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="name@example.com"
                                className="w-full"
                            />
                        </div>

                        {/*
                            We pass redirectTo in a hidden input or configure it.
                            NextAuth uses this hidden field automatically if named redirectTo.
                        */}
                        <input type="hidden" name="redirectTo" value="/dashboard" />

                        <Button type="submit" className="w-full">
                            Sign in with Email
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-card px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Google Login Form */}
                    <form
                        action={async () => {
                            "use server";
                            await signIn("google", { redirectTo: "/dashboard" });
                        }}
                    >
                        <Button type="submit" variant="outline" className="w-full">
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Sign in with Google
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
