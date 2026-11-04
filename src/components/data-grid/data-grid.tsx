import { useCallback, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { flexRender } from "@tanstack/react-table"
import type { RowData } from "@tanstack/react-table"

import type { Column, RowsChangeData } from "react-data-grid"

import { DataGrid as ReactDataGrid } from "#/components/ui/data-grid"
import type { DataTableInstance } from "#/lib/data-table-types"
import { cn } from "#/lib/utils"

import { DataTablePagination } from "../data-table/data-table-pagination"
import { getEditCell } from "./data-grid-edit-cell"

type GridRow = Record<string, unknown>

interface DataGridProps<TData extends RowData> {
  table: DataTableInstance<TData>
  isEditable?: boolean
  onRowsChange?: (rows: GridRow[], data: RowsChangeData<GridRow>) => void
  className?: string
  children?: ReactNode
}

export function DataGrid<TData extends RowData>({
  table,
  isEditable = true,
  onRowsChange,
  className,
  children,
}: DataGridProps<TData>) {
  const rowModel = table.getRowModel()
  const gridRows = useMemo(
    () => rowModel.rows.map((row) => row.original as GridRow),
    [rowModel.rows]
  )

  // Sync local rows from external data (e.g. after query refetch) without useEffect
  const [prevGridRows, setPrevGridRows] = useState(gridRows)
  const [localRows, setLocalRows] = useState<GridRow[]>(gridRows)
  if (prevGridRows !== gridRows) {
    setPrevGridRows(gridRows)
    setLocalRows(gridRows)
  }

  // Helper to check if a string is a UUID
  const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  // Helper to get joined table name from column name (e.g., project_id -> projects)
  const getJoinedTableName = (colName: string) => {
    if (colName === "org_id") return "organisations"
    if (colName.endsWith("_id")) {
      return colName.slice(0, -3) + "s" // project_id -> projects
    }
    return colName
  }

  const gridColumns: Column<GridRow>[] = table
    .getHeaderGroups()
    .flatMap((headerGroup) =>
      headerGroup.headers.map((header) => {
        const meta = header.column.columnDef.meta?.field
        return {
          key: header.id,
          name: header.id,
          renderHeaderCell: () =>
            header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext()),
          renderEditCell: isEditable ? getEditCell(meta) : undefined,
          renderCell: ({ row }: { row: GridRow }) => {
            const value = row[header.id]
            const stringValue = value?.toString()

            // If value is UUID and there's a nested joined object, render the name
            if (isUUID(stringValue || "")) {
              const joinedTableName = getJoinedTableName(header.id)
              const joinedObj = row[joinedTableName] as
                | Record<string, unknown>
                | null
                | undefined
              if (joinedObj && typeof joinedObj.name === "string") {
                return joinedObj.name
              }
            }

            return stringValue ?? ""
          },
        }
      })
    )

  const handleRowsChange = useCallback(
    (rows: GridRow[], changeData: RowsChangeData<GridRow>) => {
      setLocalRows(rows)
      onRowsChange?.(rows, changeData)
    },
    [onRowsChange]
  )

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {children}
      <ReactDataGrid
        className="min-h-0 flex-1 overflow-auto!"
        columns={gridColumns}
        rows={localRows}
        onRowsChange={handleRowsChange}
        defaultColumnOptions={{ resizable: true }}
        renderers={{
          noRowsFallback: (
            <div className="col-span-full py-12 text-center">No Results.</div>
          ),
        }}
      />
      <DataTablePagination table={table} />
    </div>
  )
}
