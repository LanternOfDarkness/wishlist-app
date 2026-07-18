"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React from "react";

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
    children: React.ReactNode;
    loadingText?: string;
}

export function SubmitButton({ children, loadingText, ...props }: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending || props.disabled} {...props}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText || children}
                </>
            ) : (
                children
            )}
        </Button>
    );
}
