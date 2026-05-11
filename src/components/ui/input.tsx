import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-border/40 to-border/60 pointer-events-none" />
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-card to-secondary/80 pointer-events-none" />
      <input
        type={type}
        data-slot="input"
        className={cn(
          "relative flex h-12 w-full rounded-full border-2 border-gold/30 bg-gradient-to-b from-card/95 to-secondary/90 px-5 py-3 text-base font-semibold text-foreground shadow-lg transition-all outline-none backdrop-blur-sm",
          "placeholder:text-muted-foreground/70 placeholder:font-normal",
          "selection:bg-gold/30 selection:text-foreground",
          "hover:border-gold/50 hover:shadow-xl hover:shadow-gold/20",
          "focus-visible:border-gold focus-visible:ring-4 focus-visible:ring-gold/30 focus-visible:shadow-2xl focus-visible:shadow-gold/30 focus-visible:scale-[1.02]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale",
          "aria-invalid:border-destructive/60 aria-invalid:ring-2 aria-invalid:ring-destructive/30",
          "file:inline-flex file:h-8 file:border-0 file:bg-gold/20 file:text-sm file:font-bold file:text-gold-foreground file:rounded-full file:px-4 file:mr-3 file:cursor-pointer hover:file:bg-gold/30",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&[type=number]]:appearance-none",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Input }
