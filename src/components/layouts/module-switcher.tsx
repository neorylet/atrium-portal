import * as React from "react"

import { Link, useRouterState } from "@tanstack/react-router"

import { ChevronsUpDownIcon, FolderIcon, HomeIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "#/components/ui/sidebar"
import { Skeleton } from "#/components/ui/skeleton"
import { useAppConfig } from "#/hooks/use-app-config"
import { useHasRole } from "#/hooks/use-permissions"

export function ModuleSwitcher({
  modules,
  isLoading,
}: {
  modules: {
    name: string
    icon: React.ReactNode
    url: string
  }[]
  isLoading?: boolean
}) {
  const { isMobile } = useSidebar()
  const { location } = useRouterState()
  const { name: appName } = useAppConfig()
  const isAdmin = useHasRole("x-admin")

  const activeModule =
    modules.find((m) => location.pathname.startsWith(m.url)) ?? modules[0]

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Skeleton className="size-8 rounded-lg" />
            <div className="grid flex-1 gap-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!activeModule) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {activeModule.icon}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeModule.name}</span>
              <span className="truncate text-xs">{appName}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="max-h-72 min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Modules
              </DropdownMenuLabel>
              <DropdownMenuItem
                render={<Link to="/" as never />}
                className="gap-2 p-2"
              >
                <HomeIcon className="mr-2 h-4 w-4" />
                Home
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link to="/storage" as never />}
                className="gap-2 p-2"
              >
                <FolderIcon className="mr-2 h-4 w-4" />
                Storage
              </DropdownMenuItem>
              {modules
                .filter((m) => isAdmin !== false || !m.url.includes("/core"))
                .map((module) => (
                <DropdownMenuItem
                  key={module.name}
                  render={<Link to={module.url as never} />}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {module.icon}
                  </div>
                  {module.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
