import { getFileIcon } from "#/lib/files"
import { supabase } from "#/lib/supabase/client"
import type { FileObject } from "#/types/fields"

export function FileCell({ value }: { value: FileObject[] | string | null }) {
  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("deliverable-files")
      .createSignedUrl(filePath, 60)
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  // Handle string value (file path) vs array of file objects
  if (typeof value === "string" && value) {
    const fileName = value.split("/").pop() || "Uploaded File"
    const Icon = getFileIcon("")
    return (
      <button
        type="button"
        onClick={() => handleDownload(value)}
        className="flex flex-nowrap items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="size-4" />
        <span>{fileName}</span>
      </button>
    )
  }

  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {value.map((file, index) => {
        const Icon = getFileIcon(file.type)
        return (
          <button
            key={index}
            type="button"
            onClick={() => file.url && handleDownload(file.url)}
            className="flex flex-nowrap items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon className="size-4" />
            <span>{file.name}</span>
          </button>
        )
      })}
    </div>
  )
}
