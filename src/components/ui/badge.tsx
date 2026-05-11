import { ComponentProps } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "chip-button inline-flex items-center justify-center rounded-full border-2 px-3 py-1 text-xs font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-primary-foreground/30 [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground border-secondary-foreground/30 [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive-foreground/30 [a&]:hover:bg-destructive/90",
        outline:
          "bg-card text-foreground border-border [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
