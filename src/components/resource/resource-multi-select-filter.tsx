import { ChevronDownIcon, FilterIcon } from "lucide-react"

import { Button } from "#/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"

interface FilterOption {
  label: string
  value: string
}

interface ResourceMultiSelectFilterProps {
  label: string
  options: FilterOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
}

export function ResourceMultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
}: ResourceMultiSelectFilterProps) {
  const selectedCount = selectedValues.length
  const triggerLabel =
    selectedCount === 0
      ? label
      : selectedCount === 1
        ? options.find((o) => o.value === selectedValues[0])?.label ?? label
        : `${label} (${selectedCount})`

  const handleToggle = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value])
    } else {
      onChange(selectedValues.filter((v) => v !== value))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <FilterIcon className="size-3" />
        <span className="truncate font-medium">{triggerLabel}</span>
        <ChevronDownIcon className="size-3.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit rounded-lg">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={(checked) =>
                handleToggle(option.value, checked === true)
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
