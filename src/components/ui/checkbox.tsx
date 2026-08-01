import * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      // `.sketch-field` deliberately NOT applied here (plan Stage 3γ said
      // apply it to form controls, but its 1.6px border has no effect on a
      // native checkbox — the browser draws its own box). `accent-primary`
      // resolves through the viewer's per-user --primary and does the real
      // work; `.sketch-focus` supplies the drawn focus stroke.
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
