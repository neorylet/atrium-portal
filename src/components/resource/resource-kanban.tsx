import { useCallback, useEffect, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { AlignStartHorizontalIcon } from "lucide-react"
import { toast } from "sonner"

import { DynamicIcon } from "#/components/resource/resource-definition-utils"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "#/components/reui/kanban"
import type { KanbanCommitMeta } from "#/components/reui/kanban"
import { Badge } from "#/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty"
import type { ResourceSchema } from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import type { EnumBadgeMeta } from "#/lib/fields"
import { getPkValue } from "#/lib/fields"
import { updateResourceMutationOptions } from "#/lib/supabase/data/resource"
import { cn } from "#/lib/utils"

export interface KanbanViewData {
  title: string | null
  description: string | null
  badge: string | null
  badgeIcon?: EnumBadgeMeta["icon"]
  badgeVariant?: EnumBadgeMeta["variant"]
  date: string | null
  data: Record<string, unknown>
}

export type KanbanViewReducedData = Record<string, KanbanViewData[]>

function seedGroupColumns(
  data: KanbanViewReducedData,
  groupValues: string[],
  groupBy: string
): KanbanViewReducedData {
  // Force the 5 statuses for projects so empty columns show up
  let finalGroupValues = groupValues
  if (groupBy === "status") {
    finalGroupValues = ["planning", "active", "on_hold", "completed", "archived"]
  }

  const seeded: KanbanViewReducedData = {}
  for (const value of finalGroupValues) {
    seeded[value] = data[value] ?? []
  }
  for (const [value, tasks] of Object.entries(data)) {
    if (!(value in seeded)) seeded[value] = tasks
  }
  return seeded
}

export function ResourceKanban({
  data,
  resourceSchema,
  groupBy,
  groupValues = [],
  groupMeta = {},
  readOnly = false,
}: {
  data: KanbanViewReducedData
  resourceSchema: ResourceSchema
  groupBy: string
  groupValues?: string[]
  groupMeta?: Record<string, EnumBadgeMeta>
  readOnly?: boolean
}) {
  const schema = resourceSchema.schema ?? ""
  const resource = resourceSchema.name ?? ""
  const primaryKeys = isTableSchema(resourceSchema)
    ? (resourceSchema.primary_keys ?? [])
    : []

  const navigate = useNavigate({
    from: "/$schema/resource/$resource/kanban/$kanbanId",
  })
  const queryClient = useQueryClient()
  
  const [columns, setColumns] = useState<KanbanViewReducedData>(() =>
    seedGroupColumns(data, groupValues, groupBy)
  )

  useEffect(() => {
    setColumns(seedGroupColumns(data, groupValues, groupBy))
  }, [data, groupValues, groupBy])

  const { mutate: updateResource } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )

  const buildId = useCallback(
    (item: KanbanViewData) => Object.values(item.data).join("/"),
    []
  )

  const handleValueCommit = useCallback(
    (next: KanbanViewReducedData, meta: KanbanCommitMeta<KanbanViewData>) => {
      if (meta.kind !== "item" || meta.activeContainer === meta.overContainer) {
        return
      }
      const item = next[meta.overContainer]?.[meta.overIndex]
      if (!item) return

      const pk = Object.fromEntries(
        primaryKeys.map((pkField) => [pkField.name, item.data[pkField.name]])
      )
      updateResource(
        { pk, data: { [groupBy]: meta.overContainer } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: ["supasheet", "resource-data", schema, resource],
            })
          },
          onError: (err) => {
            setColumns(meta.previousValue)
            toast.error(
              err instanceof Error ? err.message : "Failed to update record"
            )
          },
        }
      )
    },
    [primaryKeys, groupBy, updateResource, queryClient, schema, resource]
  )

  const hasNoData =
    Object.keys(columns).length === 0 ||
    Object.values(columns).every((tasks) => tasks.length === 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {hasNoData ? (
        <Empty className="min-h-[400px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlignStartHorizontalIcon />
            </EmptyMedia>
            <EmptyTitle>No items to display</EmptyTitle>
            <EmptyDescription>
              There are no items available in this kanban view.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Kanban
          className="flex min-h-0 flex-1 flex-col"
          value={columns}
          onValueChange={setColumns}
          onValueCommit={readOnly ? undefined : handleValueCommit}
          getItemValue={buildId}
        >
          <KanbanBoard className="flex min-h-0 flex-1 flex-row overflow-x-auto">
            {/* Changed this to Object.entries(columns) so it renders all seeded columns */}
            {Object.entries(columns).map(([columnValue, tasks]) => {
              const meta = groupMeta[columnValue]
              const humanLabel = columnValue.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())

              return (
                <KanbanColumn
                  key={columnValue}
                  value={columnValue}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-2.5 min-w-[300px] w-[300px] shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DynamicIcon iconName={meta?.icon} />
                      <span className="text-sm font-semibold">
                        {humanLabel}
                      </span>
                      <Badge
                        variant={meta?.variant ?? "secondary"}
                        className="pointer-events-none rounded-sm"
                      >
                        {tasks.length}
                      </Badge>
                    </div>
                  </div>
                  <KanbanColumnContent
                    value={columnValue}
                    className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-0.5"
                  >
                    {tasks.map((task) => {
                      const resourceId = getPkValue(task.data, primaryKeys)
                      return (
                        <KanbanItem
                          key={buildId(task)}
                          value={buildId(task)}
                          disabled={readOnly}
                        >
                          <KanbanItemHandle
                            className="block cursor-pointer rounded-lg bg-card p-3 shadow-xs ring-1 ring-foreground/10"
                            onClick={() =>
                              navigate({
                                to: "/$schema/resource/$resource/$resourceId/detail",
                                params: { schema, resource, resourceId },
                              })
                            }
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="line-clamp-1 text-sm font-medium">
                                  {task.title ?? "Untitled"}
                                </span>
                                {task.badge && (
                                  <Badge
                                    variant={task.badgeVariant}
                                    className="pointer-events-none h-5 px-1.5 text-[11px]"
                                  >
                                    <DynamicIcon iconName={task.badgeIcon} />
                                    {task.badge}
                                  </Badge>
                                )}
                              </div>
                              {task.data.organisations?.name && (
                                <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md w-fit">
                                  {task.data.organisations.name}
                                </span>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                {task.description && (
                                  <span className="line-clamp-1">
                                    {task.description}
                                  </span>
                                )}
                                {task.date && (
                                  <time className="text-[10px] whitespace-nowrap tabular-nums">
                                    {new Date(task.date).toDateString()}
                                  </time>
                                )}
                              </div>
                            </div>
                          </KanbanItemHandle>
                        </KanbanItem>
                      )
                    })}
                  </KanbanColumnContent>
                </KanbanColumn>
              )
            })}
          </KanbanBoard>
          <KanbanOverlay>
            <div className="size-full rounded-md bg-primary/10" />
          </KanbanOverlay>
        </Kanban>
      )}
    </div>
  )
}