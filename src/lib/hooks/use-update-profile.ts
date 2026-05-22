import { useTransition } from "react";
import { updateProfile } from "@/actions/update-profile";

export function useUpdateProfile() {
  const [isPending, startTransition] = useTransition();

  const execute = (formData: FormData, callbacks?: { onSuccess?: () => void; onError?: (error: string) => void }) => {
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        callbacks?.onSuccess?.();
      } else {
        callbacks?.onError?.(result.error);
      }
    });
  };

  return { execute, isPending };
}
