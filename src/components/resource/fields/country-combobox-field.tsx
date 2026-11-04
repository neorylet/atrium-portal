import { useEffect, useRef, useState } from "react"
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
import {
  COUNTRIES,
  formatCountryLabel,
  getCountryByCode,
  getPrimaryTimezoneForCountry,
} from "#/lib/geo-data"
import type { FieldProps } from "#/types/fields"
import { cn } from "cn"

import { useFieldContext } from "../form-hook"
import { FieldOptionDropdown } from "./field-option-dropdown"

export function CountryComboboxField({ columnMetadata, form }: FieldProps) {
  const field = useFieldContext<string | null>()
  const [open, setOpen] = useState(false)

  const currentValue = (field.state.value as string | null | undefined) ?? ""
  const selectedCountry = getCountryByCode(currentValue)

  const placeholder =
    columnMetadata.placeholder ??
    (field.state.value === "" && columnMetadata.defaultValue
      ? "DEFAULT VALUE"
      : field.state.value === null
        ? "NULL"
        : "Select country...")

  const displayLabel = selectedCountry
    ? formatCountryLabel(selectedCountry.code)
    : currentValue
      ? currentValue
      : placeholder

  // Helper to infer and update timezone
  const applyTimezoneInference = (countryCode: string) => {
    if (!form || !countryCode) return
    const inferred = getPrimaryTimezoneForCountry(countryCode)
    if (inferred) {
      const values = form.state.values as Record<string, unknown> | undefined
      if (values && "timezone" in values) {
        form.setFieldValue("timezone", inferred)
      }
    }
  }

  // React effect for smart timezone inference when country changes
  const isInitialMount = useRef(true)
  const prevCountryRef = useRef(currentValue)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevCountryRef.current = currentValue
      return
    }

    if (currentValue && currentValue !== prevCountryRef.current) {
      prevCountryRef.current = currentValue
      applyTimezoneInference(currentValue)
    }
  }, [currentValue, form])

  const handleSelect = (code: string) => {
    field.handleChange(code)
    applyTimezoneInference(code)
    setOpen(false)
  }

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
              <CommandInput placeholder="Search country by name or code..." />
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRIES.map((country) => {
                    const isSelected =
                      currentValue.toUpperCase() === country.code.toUpperCase()
                    const label = formatCountryLabel(country.code)
                    return (
                      <CommandItem
                        key={country.code}
                        value={`${country.name} ${country.code}`}
                        data-checked={isSelected ? "true" : undefined}
                        onSelect={() => handleSelect(country.code)}
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
