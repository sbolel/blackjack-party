import { ComponentProps } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "chip-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] relative z-[1]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-primary-foreground/30",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive-foreground/30",
        outline:
          "bg-card text-card-foreground border-border hover:bg-card/80",
        secondary:
          "bg-secondary text-secondary-foreground border-secondary-foreground/30",
        ghost:
          "border-transparent shadow-none hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/30",
        link: "text-primary underline-offset-4 hover:underline border-transparent shadow-none chip-button-none",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 rounded-full gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-full px-8 text-base has-[>svg]:px-6",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
