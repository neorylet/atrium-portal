import { useMemo, useState } from "react"
import { ChevronsUpDownIcon } from "lucide-react"

import { Button } from "#/components/ui/button"
import { ButtonGroup } from "#/components/ui/button-group"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover"
import { formatTimezoneLabel, getStandardTimezones } from "#/lib/geo-data"
import type { FieldProps } from "#/types/fields"
import { cn } from "cn"

import { useFieldContext } from "../form-hook"
import { FieldOptionDropdown } from "./field-option-dropdown"

export function TimezoneComboboxField({ columnMetadata }: FieldProps) {
  const field = useFieldContext<string | null>()
  const [open, setOpen] = useState(false)

  const timezones = useMemo(() => getStandardTimezones(), [])

  const currentValue = (field.state.value as string | null | undefined) ?? ""

  const placeholder = columnMetadata.placeholder ?? "Select timezone..."

  const displayLabel = currentValue
    ? formatTimezoneLabel(currentValue)
    : placeholder

  return (
    <ButtonGroup className="w-full">
      <ButtonGroup className="w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={columnMetadata.disabled}
                className={cn(
                  "h-8 w-full justify-between px-2.5 font-normal text-left",
                  !currentValue && "text-muted-foreground"
                )}
              />
            }
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent
            className="w-(--anchor-width) min-w-[300px] p-0"
            align="start"
          >
            <Command className="w-full">
              <CommandInput placeholder="Search timezone (e.g. New York, Manila)..." />
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No timezone found.</CommandEmpty>
                <CommandGroup>
                  {timezones.map(({ tz, label, offset }) => {
                    const isSelected = currentValue === tz
                    const searchKey = `${tz} ${tz.replace(/_/g, " ")} ${offset}`
                    return (
                      <CommandItem
                        key={tz}
                        value={searchKey}
                        data-checked={isSelected ? "true" : undefined}
                        onSelect={() => {
                          field.handleChange(tz)
                          setOpen(false)
                        }}
                      >
                        <span className="truncate">{label}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </ButtonGroup>
      <FieldOptionDropdown
        columnMetadata={columnMetadata}
        setValue={(value) => field.handleChange(value ?? null)}
      />
    </ButtonGroup>
  )
}
