import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ComponentProps } from 'react'

interface ChipButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  value: number
  color?: 'gold' | 'primary' | 'secondary' | 'accent'
}

const chipColors = {
  gold: 'bg-gold text-gold-foreground border-gold-foreground/30',
  primary: 'bg-primary text-primary-foreground border-primary-foreground/30',
  secondary: 'bg-secondary text-secondary-foreground border-secondary-foreground/30',
  accent: 'bg-accent text-accent-foreground border-accent-foreground/30',
}

export function ChipButton({ value, color = 'gold', className, ...props }: ChipButtonProps) {
  return (
    <Button
      variant="default"
      size="lg"
      className={cn(
        'relative aspect-square rounded-full p-0 w-16 h-16',
        chipColors[color],
        className
      )}
      {...props}
    >
      <span className="text-base font-black relative z-10">{value}</span>
    </Button>
  )
}
