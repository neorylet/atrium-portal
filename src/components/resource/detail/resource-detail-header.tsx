import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { ArchiveIcon } from "lucide-react"
import { toast } from "sonner"

import { ResourceRowActions } from "#/components/resource/resource-row-actions"
import { ConfirmDeleteDialog } from "#/components/shared/confirm-delete-dialog"
import { Button } from "#/components/ui/button"
import { useConfirmAction } from "#/hooks/use-confirm-action"
import { useHasPermission } from "#/hooks/use-permissions"
import type {
  ColumnSchema,
  ResourceSchema,
  TableMetadata,
} from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import {
  deleteResourceMutationOptions,
  resourceActionsQueryOptions,
  updateResourceMutationOptions,
} from "#/lib/supabase/data/resource"

type Props = {
  resourceSchema: ResourceSchema
  columnsSchema: ColumnSchema[]
  record: Record<string, unknown>
  fallbackId: string
}

export function ResourceDetailHeader({
  resourceSchema,
  columnsSchema,
  record,
  fallbackId,
}: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const schema = resourceSchema.schema
  const resource = resourceSchema.name
  const primaryKeys = isTableSchema(resourceSchema)
    ? (resourceSchema.primary_keys ?? [])
    : []

  // Only show archive/delete if they have update/delete permissions
  const hasDeletePermission = useHasPermission({ schema, resource, action: "delete" })
  const canModify = primaryKeys.length > 0 && hasDeletePermission

  const { mutateAsync: deleteRow } = useMutation(
    deleteResourceMutationOptions(schema, resource)
  )
  
  const { mutateAsync: updateRow } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )

  const pk = Object.fromEntries(
    primaryKeys.map((key) => [key.name, record[key.name]])
  )

  const archiveConfirm = useConfirmAction<true>(async () => {
    try {
      // If the table has an archived status, use that instead of deleting
      const hasArchivedStatus = ["projects", "deliverables"].includes(resource)
      
      if (hasArchivedStatus) {
        await updateRow({ pk, data: { status: "archived" } })
        toast.success("Record archived successfully")
        queryClient.invalidateQueries({
          queryKey: ["supasheet", "resource-data", schema, resource],
        })
      } else {
        await deleteRow(pk)
        toast.success("Record deleted")
        navigate({
          to: "/$schema/resource/$resource",
          params: { schema, resource },
        })
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive/delete record"
      )
    }
  })

  const detailMeta = (
    JSON.parse(resourceSchema.comment ?? "{}") as TableMetadata
  ).detail?.header

  const titleKey = detailMeta?.title || "title"
  const titleValue = record[titleKey] || record.title || record.name
  const hasTitle = titleValue != null && titleValue !== ""
  const heading = hasTitle ? String(titleValue) : fallbackId

  const { data: actions = [] } = useQuery(
    resourceActionsQueryOptions(
      resourceSchema.schema as never,
      resourceSchema.name
    )
  )

  const hasArchivedStatus = ["projects", "deliverables"].includes(resource)

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="truncate text-xl font-bold tracking-tight">{heading}</h1>
        </div>

        <div className="flex items-center gap-2">
          <ResourceRowActions
            schema={resourceSchema.schema}
            resource={resourceSchema.name}
            record={record}
            actions={actions}
            columnsSchema={columnsSchema}
            variant="menu"
          />
          {canModify && (
            <Button
              size="sm"
              variant="outline"
              className="px-2 sm:px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={() => archiveConfirm.request(true)}
            >
              <ArchiveIcon className="mr-1.5 size-4" />
              <span className="hidden sm:inline">
                {hasArchivedStatus ? "Archive" : "Delete"}
              </span>
            </Button>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={archiveConfirm.open}
        onOpenChange={(open) => !open && archiveConfirm.cancel()}
        onConfirm={archiveConfirm.confirm}
        title={hasArchivedStatus ? "Archive record?" : "Delete record?"}
        pending={archiveConfirm.pending}
      />
    </div>
  )
}