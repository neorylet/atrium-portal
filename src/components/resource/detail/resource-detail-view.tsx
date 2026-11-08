import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Editor } from "#/components/editor/editor-md"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Label } from "#/components/ui/label"
import { Button } from "#/components/ui/button"
import { Textarea } from "#/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "#/components/ui/dialog"
import { useHasPermission } from "#/hooks/use-permissions"
import { getColumnMetadata } from "#/lib/columns"
import type {
  ColumnSchema,
  ResourceSchema,
  TableMetadata,
} from "#/lib/database-meta.types"
import { getMetaFields, isTableSchema } from "#/lib/database-meta.types"
import { formatTitle } from "#/lib/format"
import { updateResourceMutationOptions } from "#/lib/supabase/data/resource"
import type { FileObject } from "#/types/fields"
import { toast } from "sonner"

import { AllCells } from "../cells/all-cells"
import { UserCell } from "../cells/user-cell"
import { getColumnFieldSpan } from "../resource-form-utils"
import { ResourceAvatarDisplay } from "./resource-avatar-display"
import { ResourceFileDisplay } from "./resource-file-display"
import { InvoiceReceipt } from "./invoice-receipt"

export function ResourceDetailView({
  resourceSchema,
  columnsSchema,
  singleResourceData,
}: {
  resourceSchema: ResourceSchema
  columnsSchema: ColumnSchema[]
  singleResourceData: Record<string, unknown>
}) {
  const queryClient = useQueryClient()
  const schema = resourceSchema.schema ?? ""
  const resource = resourceSchema.name ?? ""
  const tableSchema = isTableSchema(resourceSchema) ? resourceSchema : null
  
  const isClient = !useHasPermission({ schema, resource, action: "update" })
  const isDeliverables = resource === "deliverables"
  
  const { mutateAsync: updateRecord } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )
  
  const handleApprove = async () => {
    try {
      await updateRecord({
        pk: { id: singleResourceData.id },
        data: { status: "approved" }
      })
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Deliverable approved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve")
    }
  }
  
  const handleRequestChanges = async (feedback: string) => {
    try {
      await updateRecord({
        pk: { id: singleResourceData.id },
        data: { status: "changes_requested", client_feedback: feedback }
      })
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Changes requested")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request changes")
    }
  }
  
  if (Object.keys(singleResourceData).length === 0) return null
  
  // ==========================================
  // INVOICE RECEIPT OVERRIDE
  // If the resource is 'invoices', render the custom receipt
  // and completely bypass the generic grid layout below.
  // ==========================================
  if (resource === "invoices") {
    return (
      <div className="flex flex-col gap-6">
        <InvoiceReceipt
          invoiceId={singleResourceData.id as string}
          record={singleResourceData}
        />
      </div>
    )
  }

  // Generic layout for Projects, Deliverables, Organisations, etc.
  const detailColumns =
    columnsSchema?.filter((column) => {
      const name = column.name
      if (["id", "org_id", "project_id"].includes(name)) return false
      if (isClient && isDeliverables && name === "client_feedback") return false
      if (name === "created_by" || name === "updated_by") return true
      return !getMetaFields(resourceSchema).includes(name)
    }) ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>
              {(JSON.parse(resourceSchema.comment ?? "{}") as TableMetadata)
                .name ?? formatTitle(resourceSchema.name)}
            </CardTitle>
            <CardDescription>
              View resource details and properties
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
        {detailColumns.map((column) => {
          const value = singleResourceData?.[column.name]

          const columnMetadata = getColumnMetadata(tableSchema, column)
          const span = getColumnFieldSpan(column, tableSchema)

          return (
            <div
              key={column.id}
              className={
                span === 2
                  ? "flex min-w-0 flex-col gap-1.5 md:col-span-2"
                  : "flex min-w-0 flex-col gap-1.5"
              }
            >
              <Label className="inline-flex items-center gap-1.5 text-sm font-medium">
                {columnMetadata.icon} {formatTitle(columnMetadata.name)}
              </Label>
              <div className="text-sm text-muted-foreground">
                {(column.name === "updated_by" || column.name === "created_by") ? (
                  value ? <UserCell userId={value as string} /> : <span className="text-muted">N/A</span>
                ) : value ? (
                  columnMetadata.variant === "rich_text" ? (
                    <Editor
                      name={columnMetadata.name}
                      value={value as string}
                      disabled
                    />
                  ) : (columnMetadata.variant === "file" || column.name === "file_path" || column.name === "logo_url") ? (
                    <ResourceFileDisplay value={value as any} />
                  ) : columnMetadata.variant === "avatar" ? (
                    <ResourceAvatarDisplay
                      value={(value as FileObject | null) ?? null}
                    />
                  ) : (
                    <AllCells columnMetadata={columnMetadata} value={value} record={singleResourceData} />
                  )
                ) : (
                  <div className="text-muted">N/A</div>
                )}
              </div>
            </div>
          )
        })}

        {isClient && isDeliverables && (
          <div className="md:col-span-2 flex gap-2 mt-4 pt-4 border-t">
            <Button onClick={handleApprove} className="flex-1">
              Approve
            </Button>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" className="flex-1">Request Changes</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Changes</DialogTitle>
                </DialogHeader>
                <Textarea
                  placeholder="Please describe the changes needed..."
                  className="min-h-[120px]"
                  id="changes-feedback"
                />
                <DialogFooter>
                  <DialogTrigger render={<Button variant="outline">Cancel</Button>} />
                  <Button
                    onClick={() => {
                      const textarea = document.getElementById('changes-feedback') as HTMLTextAreaElement
                      if (textarea?.value.trim()) {
                        handleRequestChanges(textarea.value.trim())
                      }
                    }}
                  >
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}