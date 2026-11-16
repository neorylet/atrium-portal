import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { EyeIcon, Image as ImageIcon, Paperclip, Trash } from "lucide-react"
import { toast } from "sonner"

import { DynamicIcon } from "#/components/resource/resource-definition-utils"
import { ConfirmDeleteDialog } from "#/components/shared/confirm-delete-dialog"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "#/components/ui/button-group"
import { Card, CardContent } from "#/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty"
import { useConfirmAction } from "#/hooks/use-confirm-action"
import { useHasPermission } from "#/hooks/use-permissions"
import type {
  DatabaseSchemas,
  DatabaseTables,
  DatabaseViews,
  PrimaryKey,
  ResourceSchema,
} from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import type { EnumBadgeMeta } from "#/lib/fields"
import { getPkValue } from "#/lib/fields"
import { formatTitle } from "#/lib/format"
import { deleteResourceMutationOptions } from "#/lib/supabase/data/resource"
import { cn } from "#/lib/utils"

export interface GalleryViewData {
  cover: string | null
  title: string | null
  description: string | null
  badge: string | null
  badgeIcon?: EnumBadgeMeta["icon"]
  badgeVariant?: EnumBadgeMeta["variant"]
  data: Record<string, unknown>
}

interface ResourceGalleryProps {
  data: GalleryViewData[]
  resourceSchema: ResourceSchema
}

export function ResourceGallery({
  data,
  resourceSchema,
}: ResourceGalleryProps) {
  const schema = resourceSchema.schema ?? ""
  const resource = resourceSchema.name ?? ""
  const primaryKeys = isTableSchema(resourceSchema)
    ? (resourceSchema.primary_keys ?? [])
    : []
  const isTable = isTableSchema(resourceSchema)

  return (
    <div className="flex flex-col gap-4">
      {data.length === 0 ? (
        <Empty className="min-h-[400px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>No items to display</EmptyTitle>
            <EmptyDescription>
              There are no gallery items available at the moment.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {data.map((item) => {
            const resourceId = getPkValue(item.data, primaryKeys)
            return (
              <GalleryCard
                key={resourceId}
                item={item}
                schema={schema}
                resource={resource}
                resourceId={resourceId}
                primaryKeys={primaryKeys}
                isTable={isTable}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function GalleryCard<S extends DatabaseSchemas>({
  item,
  schema,
  resource,
  resourceId,
  primaryKeys,
  isTable,
}: {
  item: GalleryViewData
  schema: S
  resource: DatabaseViews<S> | DatabaseTables<S>
  resourceId: string
  primaryKeys: PrimaryKey[]
  isTable: boolean
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canDelete = useHasPermission({ schema, resource, action: "delete" })
  const { mutateAsync: deleteRow } = useMutation(
    deleteResourceMutationOptions(schema, resource)
  )

  const goToDetail = () =>
    navigate({
      to: "/$schema/resource/$resource/$resourceId/detail",
      params: { schema, resource, resourceId },
    })

  const deleteConfirm = useConfirmAction(async (target: GalleryViewData) => {
    const pk = Object.fromEntries(
      primaryKeys.map((pkField) => [pkField.name, target.data[pkField.name]])
    )
    try {
      await deleteRow(pk)
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Record deleted")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete record"
      )
    }
  })

  return (
    <>
      <Card className="min-h-[220px]">
        <CardContent className="flex flex-col h-full justify-between gap-3 p-4">
          {/* Row 1: Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold line-clamp-2 flex-1">
              {item.title}
            </h3>
            {item.badge && (
              <Badge variant={item.badgeVariant ?? "outline"} className="shrink-0">
                <DynamicIcon iconName={item.badgeIcon} />
                {formatTitle(item.badge)}
              </Badge>
            )}
          </div>

          {/* Row 2: Project & Org Badges */}
          <div className="flex gap-2 flex-wrap">
            {item.data.projects?.name && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {item.data.projects.name}
              </span>
            )}
            {item.data.organisations?.name && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {item.data.organisations.name}
              </span>
            )}
          </div>

          {/* Row 3: File Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {item.data.file_path ? (
              <>
                <Paperclip className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">File Attached</span>
              </>
            ) : (
              <>
                <Paperclip className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-muted-foreground/50">No File</span>
              </>
            )}
          </div>

          {/* Row 4: Description */}
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Row 5: Actions (Footer) */}
          <ButtonGroup className="w-full mt-auto">
            <Button variant="secondary" className="flex-1" onClick={goToDetail}>
              <EyeIcon aria-hidden="true" />
              View details
            </Button>
            {isTable && canDelete && (
              <>
                <ButtonGroupSeparator />
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => deleteConfirm.request(item)}
                >
                  <Trash />
                </Button>
              </>
            )}
          </ButtonGroup>
        </CardContent>
      </Card>
      <ConfirmDeleteDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && deleteConfirm.cancel()}
        onConfirm={deleteConfirm.confirm}
        title="Delete record?"
        pending={deleteConfirm.pending}
      />
    </>
  )
}
