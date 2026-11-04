import { Outlet, createFileRoute, notFound } from "@tanstack/react-router"

import z from "zod"

import type {
  DatabaseSchemas,
  DatabaseTables,
  DatabaseViews,
} from "#/lib/database-meta.types"
import {
  columnsSchemaQueryOptions,
  resourcePrivilegesQueryOptions,
  tableSchemaQueryOptions,
  viewSchemaQueryOptions,
} from "#/lib/supabase/data/meta"

export const Route = createFileRoute("/$schema/resource/$resource")({
  params: z.object({
    schema: z.string<DatabaseSchemas>(),
    resource: z.string<DatabaseTables<DatabaseSchemas>>(),
  }),
  beforeLoad: async ({ context, params: { schema, resource } }) => {
    const [privileges, tableSchema, columnsSchema] = await Promise.all([
      context.queryClient.query({
        ...resourcePrivilegesQueryOptions(schema, resource),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...tableSchemaQueryOptions(schema, resource),
        // Use a short stale time (30 s) so schema changes — new columns,
        // updated COMMENT metadata — are reflected after a normal refresh
        // instead of requiring a full cache clear.
        staleTime: 1000 * 30,
      }),
      context.queryClient.query({
        ...columnsSchemaQueryOptions(schema, resource),
        // Same: 30 s so post-migration column additions are visible
        // without a full cache wipe.
        staleTime: 1000 * 30,
      }),
    ])

    const viewSchema = !tableSchema
      ? await context.queryClient.query({
          ...viewSchemaQueryOptions(schema, resource),
          staleTime: 1000 * 30,
        })
      : null

    const resourceSchema = tableSchema ?? viewSchema
    if (!resourceSchema) throw notFound()

    return { privileges, resourceSchema, columnsSchema }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
