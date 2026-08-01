import * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "h-4 w-4 cursor-pointer rounded border-border text-primary accent-primary disabled:cursor-not-allowed disabled:opacity-50",
        "sketch-focus",
        className
      )}
      {...props}
    />
  )
}

export { Checkbox }
