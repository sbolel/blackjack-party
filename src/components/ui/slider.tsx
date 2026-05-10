"use client"

import { ComponentProps, useMemo } from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-secondary/80 border-2 border-border/50 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5 shadow-inner"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-gradient-to-r from-gold/90 to-gold absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full shadow-lg"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-gold bg-gold text-gold-foreground ring-gold/50 block size-6 shrink-0 rounded-full border-3 shadow-xl transition-all hover:scale-110 hover:ring-4 hover:shadow-2xl focus-visible:ring-4 focus-visible:scale-110 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing active:scale-95"
          style={{
            boxShadow: 'inset 0 1px 4px rgba(255, 255, 255, 0.3), inset 0 -1px 4px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
