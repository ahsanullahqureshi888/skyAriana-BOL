"use client"

import { startTransition, useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import { flushSync } from "react-dom"
import { Input } from "@/components/ui/input"

type ShipperNameInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
}

// Keep keystrokes local: the editor also renders print/export documents.
export function ShipperNameInput({ value, onValueChange, onBlur, onFocus, ...props }: ShipperNameInputProps) {
  const [text, setText] = useState(value)
  const pendingValues = useRef<string[]>([])

  useLayoutEffect(() => {
    const acknowledged = pendingValues.current.lastIndexOf(value)
    if (acknowledged !== -1) {
      // An older transition must not replace characters already typed locally.
      pendingValues.current.splice(0, acknowledged + 1)
    } else {
      // A loaded document, directory selection, or preset is authoritative.
      pendingValues.current = []
      setText(value)
    }
  }, [value])

  return (
    <Input
      {...props}
      value={text}
      onChange={(event) => {
        const text = event.currentTarget.value
        setText(text)
        pendingValues.current.push(text)
        startTransition(() => onValueChange(text))
      }}
      onFocus={(event) => {
        startTransition(() => onFocus?.(event))
      }}
      onBlur={(event) => {
        // Flush before the subsequent Save, Print, or preset click can read data.
        const text = event.currentTarget.value
        if (text !== value) flushSync(() => onValueChange(text))
        onBlur?.(event)
      }}
    />
  )
}
