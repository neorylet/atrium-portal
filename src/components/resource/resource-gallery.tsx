import { useNavigate } from "@tanstack/react-router"

import { EyeIcon, Image as ImageIcon, Paperclip } from "lucide-react"

import { DynamicIcon } from "#/components/resource/resource-definition-utils"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { ButtonGroup } from "#/components/ui/button-group"
import { Card, CardContent } from "#/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty"
import type {
  DatabaseSchemas,
  DatabaseTables,
  DatabaseViews,
  ResourceSchema,
} from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import type { EnumBadgeMeta } from "#/lib/fields"
import { getPkValue } from "#/lib/fields"
import { formatTitle } from "#/lib/format"

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
}: {
  item: GalleryViewData
  schema: S
  resource: DatabaseViews<S> | DatabaseTables<S>
  resourceId: string
}) {
  const navigate = useNavigate()

  const goToDetail = () =>
    navigate({
      to: "/$schema/resource/$resource/$resourceId/detail",
      params: { schema, resource, resourceId },
    })

  return (
    <>
      <Card className="min-h-[220px]">
        <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
          {/* Row 1: Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 flex-1 text-lg font-semibold">
              {item.title}
            </h3>
            {item.badge && (
              <Badge
                variant={item.badgeVariant ?? "outline"}
                className="shrink-0"
              >
                <DynamicIcon iconName={item.badgeIcon} />
                {formatTitle(item.badge)}
              </Badge>
            )}
          </div>

          {/* Row 2: Project & Org Badges */}
          <div className="flex flex-wrap gap-2">
            {item.data.projects?.name && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs">
                {item.data.projects.name}
              </span>
            )}
            {item.data.organisations?.name && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs">
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
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}

          {/* Row 5: Actions (Footer) */}
          <ButtonGroup className="mt-auto w-full">
            <Button variant="secondary" className="flex-1" onClick={goToDetail}>
              <EyeIcon aria-hidden="true" />
              View details
            </Button>
          </ButtonGroup>
        </CardContent>
      </Card>
    </>
  )
}
