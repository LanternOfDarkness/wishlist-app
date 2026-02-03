"use client";

import { updateProfile } from "@/actions/update-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "@prisma/client";
import { useState } from "react";

interface SettingsFormProps {
    user: User;
}

export function SettingsForm({ user }: SettingsFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);

        const result = await updateProfile(formData);

        setIsLoading(false);

        if (result?.error) {
            toast.error("Помилка", {
                description: result.error,
            });
        } else {
            toast.success("Успіх!", {
                description: "Твій профіль оновлено.",
            });
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4 max-w-md w-full">
            <div className="space-y-2">
                <Label htmlFor="name">Ім'я</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={user.name || ""}
                    placeholder="Твоє ім'я"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="username">Нікнейм (Slug)</Label>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">wish.velab.space/</span>
                    <Input
                        id="username"
                        name="username"
                        defaultValue={user.username || ""}
                        placeholder="super-nick"
                        required
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Це буде адреса твого вішліста. Тільки латиниця, цифри та дефіс.
                </p>
            </div>

            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Збереження..." : "Зберегти зміни"}
            </Button>
        </form>
    );
}