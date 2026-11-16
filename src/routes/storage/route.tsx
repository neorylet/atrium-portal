import { useQuery } from "@tanstack/react-query"
import { Outlet, createFileRoute } from "@tanstack/react-router"

import { FolderIcon } from "lucide-react"

import { ModuleSwitcher } from "#/components/layouts/module-switcher"
import { NavMain } from "#/components/layouts/nav-main"
import { NavResources } from "#/components/layouts/nav-resources"
import { NavSecondary } from "#/components/layouts/nav-secondary"
import { NavUser } from "#/components/layouts/nav-user"
import { QuickSearch } from "#/components/layouts/quick-search"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "#/components/ui/sidebar"
import { Skeleton } from "#/components/ui/skeleton"
import { getAppModules } from "#/hooks/use-modules"
import { useHasRole } from "#/hooks/use-permissions"
import { schemasQueryOptions } from "#/lib/supabase/data/meta"
import { storageBucketsQueryOptions } from "#/lib/supabase/data/storage"

export const Route = createFileRoute("/storage")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(storageBucketsQueryOptions)
  },
  component: RouteComponent,
})

function RouteComponent() {
  const isAdmin = useHasRole("x-admin")
  const { data: buckets = [], isLoading } = useQuery(storageBucketsQueryOptions)
  const { data: schemas = [], isLoading: schemasLoading } = useQuery(schemasQueryOptions)

  const modules = getAppModules(schemas, isAdmin)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="offcanvas" variant="floating">
        <SidebarHeader>
          <ModuleSwitcher modules={modules} isLoading={isLoading || schemasLoading} />
        </SidebarHeader>
        <SidebarContent>
          <NavMain schema="storage" items={[]} />
          {isLoading ? (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel>
                <Skeleton className="h-3 w-16" />
              </SidebarGroupLabel>
              <SidebarMenu className="flex flex-col gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuButton>
                      <Skeleton className="size-4 shrink-0 rounded" />
                      <Skeleton className="h-3 flex-1 rounded" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ) : (
            <NavResources
              schema="storage"
              items={buckets.filter(
                (b) => b.id !== "uploads" && b.id !== "report-templates"
              )}
            />
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupContent>
              <QuickSearch
                schema="storage"
                items={[]}
                resourceItems={buckets
                  .filter(
                    (b) => b.id !== "uploads" && b.id !== "report-templates"
                  )
                  .map((b) => ({
                    ...b,
                    url: `/storage/${b.id}`,
                  }))}
              />
            </SidebarGroupContent>
          </SidebarGroup>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
