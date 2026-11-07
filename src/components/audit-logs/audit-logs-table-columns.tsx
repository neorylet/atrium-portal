import { Link } from "@tanstack/react-router"

import { ArrowUpRightIcon } from "lucide-react"

import { DataTableColumnHeader } from "#/components/data-table/data-table-column-header"
import { getDataTableSelectColumn } from "#/components/data-table/data-table-select-column"
import { UserCell } from "#/components/resource/cells/user-cell"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { getColumnDefMeta } from "#/lib/columns"
import type { DataTableColumnDef } from "#/lib/data-table-types"
import type { ColumnSchema } from "#/lib/database-meta.types"
import type { Database } from "#/lib/database.types"
import { formatDate } from "#/lib/format"

export type AuditLog = Database["supasheet"]["Tables"]["audit_logs"]["Row"]

export function getAuditLogsTableColumns({
  columnsSchema,
}: {
  columnsSchema: ColumnSchema<"supasheet">[]
}): DataTableColumnDef<AuditLog>[] {
  return [
    getDataTableSelectColumn<AuditLog>(),
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Created At" />
      ),
      cell: ({ row }) => {
        const value = row.getValue<string>("created_at")
        return (
          <span className="text-sm text-muted-foreground">
            {formatDate(value, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )
      },
      enableColumnFilter: true,
      meta: getColumnDefMeta(
        null,
        columnsSchema.find((col) => col.name === "created_at") as ColumnSchema
      ),
    },
    {
      accessorKey: "created_by",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="User" />
      ),
      cell: ({ row }) => {
        const userId = row.original.created_by
        if (!userId) return <span className="text-sm text-muted-foreground">System</span>
        return <UserCell userId={userId} />
      },
      enableColumnFilter: true,
      meta: getColumnDefMeta(
        null,
        columnsSchema.find((col) => col.name === "created_by") as ColumnSchema
      ),
    },
    {
      accessorKey: "operation",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Operation" />
      ),
      cell: ({ row }) => {
        const op = row.getValue<string>("operation")
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
        let className = ""
        if (op === "INSERT") variant = "default"
        else if (op === "UPDATE") { variant = "outline"; className = "text-blue-500 border-blue-500" }
        else if (op === "DELETE") variant = "destructive"
        return <Badge variant={variant} className={className}>{op}</Badge>
      },
      enableColumnFilter: true,
      meta: getColumnDefMeta(
        null,
        columnsSchema.find((col) => col.name === "operation") as ColumnSchema
      ),
    },
    {
      accessorKey: "table_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Table" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("table_name")}</span>
      ),
      enableColumnFilter: true,
      meta: getColumnDefMeta(
        null,
        columnsSchema.find((col) => col.name === "table_name") as ColumnSchema
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <Link
          to="/core/audit_logs/$auditLogId"
          params={{ auditLogId: row.original.id }}
        >
          <Button variant="outline" size="sm" className="h-8 gap-1">
            View <ArrowUpRightIcon className="size-3" />
          </Button>
        </Link>
      ),
      enableHiding: false,
      enableSorting: false,
      size: 80,
    },
  ]
}