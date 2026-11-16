import * as React from "react"

import { DatabaseIcon, FolderIcon, HomeIcon } from "lucide-react"

export type AppModule = {
  name: string
  icon: React.ReactNode
  url: string
}

export function getAppModules(
  schemas: { schema: string }[],
  isAdmin: boolean | undefined
): AppModule[] {
  const baseModules: AppModule[] = [
    { name: "Home", icon: React.createElement(HomeIcon), url: "/" },
    { name: "Storage", icon: React.createElement(FolderIcon), url: "/storage" },
  ]
  
  const schemaModules: AppModule[] = schemas
    .filter((s) => isAdmin !== false || s.schema !== "core")
    .map((s) => ({
      name: s.schema.charAt(0).toUpperCase() + s.schema.slice(1),
      icon: React.createElement(DatabaseIcon),
      url: `/${s.schema}`,
    }))
  
  return [...baseModules, ...schemaModules]
}
