"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { followUser } from "@/actions/follow-user";
import { usePathname } from "next/navigation";
import { Loader2, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface FollowButtonProps {
    userId: string;
    isFollowing: boolean;
}

export function FollowButton({ userId, isFollowing }: FollowButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();

    const handleFollow = async () => {
        setIsLoading(true);
        try {
            await followUser(userId, pathname);
            toast.success(isFollowing ? "Unfollowed" : "Followed successfully");
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollow}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isFollowing ? "Unfollowing..." : "Following..."}
                </>
            ) : isFollowing ? (
                <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unfollow
                </>
            ) : (
                <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                </>
            )}
        </Button>
    );
}
