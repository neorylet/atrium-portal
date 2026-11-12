import { ChevronDownIcon, FilterIcon } from "lucide-react"

import { Button } from "#/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import type { FilterPreset } from "#/lib/database-meta.types"

const ALL_RECORDS_ID = "__all__"

interface ResourceViewFilterPresetsProps {
  filterPresets: FilterPreset[]
  activePresetId?: string
  onFilterChange: (presetId: string) => void
}

export function ResourceViewFilterPresets({
  filterPresets,
  activePresetId = ALL_RECORDS_ID,
  onFilterChange,
}: ResourceViewFilterPresetsProps) {
  if (filterPresets.length === 0) return null

  const activePreset = filterPresets.find((t) => t.id === activePresetId)
  const triggerLabel =
    activePresetId === ALL_RECORDS_ID
      ? "All records"
      : (activePreset?.name ?? activePreset?.label ?? "Custom filter")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <FilterIcon className="size-3" />
        <span className="truncate font-medium">{triggerLabel}</span>
        <ChevronDownIcon className="size-3.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit rounded-lg">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter presets</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup
          value={activePresetId}
          onValueChange={onFilterChange}
        >
          <DropdownMenuRadioItem value={ALL_RECORDS_ID}>
            All records
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {filterPresets.map((preset) => (
            <DropdownMenuRadioItem key={preset.id} value={preset.id}>
              {preset.name ?? preset.label ?? preset.id}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
