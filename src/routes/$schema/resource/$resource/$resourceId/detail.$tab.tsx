import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router"

import { addEmbedKeys } from "#/components/resource/detail/add-embed-keys"
import { classifyRelationships } from "#/components/resource/detail/classify-relationships"
import { ResourceDetailTab } from "#/components/resource/detail/resource-detail-tab"
import { useHasPermission } from "#/hooks/use-permissions"
import type { TableMetadata } from "#/lib/database-meta.types"
import {
  columnsSchemaQueryOptions,
  relatedTablesSchemaQueryOptions,
  resourcePrivilegesQueryOptions,
} from "#/lib/supabase/data/meta"
import {
  resourceActionsQueryOptions,
  singleForeignTableDataQueryOptions,
  singleResourceDataQueryOptions,
} from "#/lib/supabase/data/resource"

const parentRoute = getRouteApi(
  "/$schema/resource/$resource/$resourceId/detail"
)

export const Route = createFileRoute(
  "/$schema/resource/$resource/$resourceId/detail/$tab"
)({
  loader: async ({ context, params }) => {
    const { schema, resource, resourceId, tab } = params
    
    // If it's the invite tab, exit early so the loader doesn't crash
    if (tab === "invite") return null as any

    const relatedTablesSchema = await context.queryClient.query({
      ...relatedTablesSchemaQueryOptions(schema, resource),
      staleTime: "static",
    })
    const tableMeta = JSON.parse(
      context.tableSchema?.comment ?? "{}"
    ) as TableMetadata
    const metaJoins = tableMeta.query?.join

    const allowedTabs = tableMeta.detail?.tabs
    const timelineTabs = tableMeta.detail?.timelines
    const isTimeline = !!timelineTabs?.includes(tab)
    if (allowedTabs && !allowedTabs.includes(tab) && !isTimeline)
      throw notFound()

    const embeddedTables = addEmbedKeys(
      schema,
      resource,
      relatedTablesSchema,
      metaJoins
    )
    const activeTable = embeddedTables.find((t) => t.__embedKey === tab)
    if (!activeTable) throw notFound()

    const columnsSchema = await context.queryClient.query({
      ...columnsSchemaQueryOptions(activeTable.schema, activeTable.name),
      staleTime: "static",
    })
    const classification = classifyRelationships(
      schema,
      resource,
      activeTable,
      columnsSchema
    )
    if (activeTable.__preferReverse) classification.oneToOne = undefined

    const oneToOne = classification.oneToOne
    if (oneToOne) {
      const primaryKeys = context.tableSchema?.primary_keys ?? []
      const pkName = primaryKeys[0]?.name ?? "id"
      const pk = { [pkName]: resourceId }
      const parent = await context.queryClient.query({
        ...singleResourceDataQueryOptions(schema, resource, pk),
        staleTime: "static",
      })
      const matchValue = parent?.[oneToOne.__parentMatchColumn]
      if (matchValue != null) {
        await context.queryClient.query({
          ...singleForeignTableDataQueryOptions(
            oneToOne.schema,
            oneToOne.name,
            {
              [oneToOne.__foreignMatchColumn]: matchValue,
            }
          ),
          staleTime: "static",
        })
      }
      return { ...classification, isTimeline }
    }

    const many = classification.oneToMany ?? classification.manyToMany
    if (!many) throw notFound()

    const primaryKeys = context.tableSchema?.primary_keys ?? []
    const pkName = primaryKeys[0]?.name ?? "id"
    const pk = { [pkName]: resourceId }
    await context.queryClient.query({
      ...singleResourceDataQueryOptions(schema, resource, pk),
      staleTime: "static",
    })
    context.queryClient.query({
      ...resourceActionsQueryOptions(many.schema, many.name),
      staleTime: "static",
    })

    return { ...classification, isTimeline }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { schema, resource, resourceId, tab } = Route.useParams()
  
  // 1. CALL ALL HOOKS AT THE VERY TOP
  const loaderData = Route.useLoaderData()
  const { pkName } = parentRoute.useLoaderData()
  const pk = { [pkName]: resourceId }

  const { data: record } = useSuspenseQuery(
    singleResourceDataQueryOptions(schema, resource, pk)
  )
  const { authUser, privileges } = Route.useRouteContext()
  const { oneToOne, oneToMany, manyToMany, isTimeline } = loaderData || {}

  const hasParentUpdatePermission = useHasPermission({
    schema,
    resource,
    action: "update",
  })
  const parentUpdatePrivilege = !!privileges?.includes("update")
  const canUpdateParent = authUser
    ? hasParentUpdatePermission && parentUpdatePrivilege
    : parentUpdatePrivilege

  const hasOneToOneUpdatePermission = useHasPermission(
    oneToOne
      ? { schema: oneToOne.schema, resource: oneToOne.name, action: "update" }
      : undefined
  )
  const { data: oneToOnePrivileges } = useQuery({
    ...resourcePrivilegesQueryOptions(
      oneToOne?.schema ?? schema,
      oneToOne?.name ?? resource
    ),
    enabled: !!oneToOne,
  })
  const oneToOneUpdatePrivilege = !!oneToOnePrivileges?.includes("update")
  const canUpdateOneToOne = authUser
    ? hasOneToOneUpdatePermission && oneToOneUpdatePrivilege
    : oneToOneUpdatePrivilege

  // 2. NOW IT IS SAFE TO RETURN EARLY
  if (tab === "invite" || !loaderData) {
    return null // The router will render invite.tsx instead
  }

  const many = oneToMany ?? manyToMany

  return (
    <ResourceDetailTab
      schema={schema}
      resource={resource}
      resourceId={resourceId}
      parentRecord={record}
      oneToOne={oneToOne}
      many={many}
      isTimeline={isTimeline}
      canUpdateOneToOne={canUpdateOneToOne}
      canUpdateParent={canUpdateParent}
    />
  )
}