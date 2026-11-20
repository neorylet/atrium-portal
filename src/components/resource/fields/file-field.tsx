import { useCallback, useEffect, useState } from "react"

import { FileUpIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "#/components/ui/button"
import {
  DEFAULT_MAX_FILE_SIZE,
  isAcceptedFileType,
} from "#/hooks/use-file-upload"
import type { FileColumnMetadata } from "#/lib/database-meta.types"
import { formatFileSize } from "#/lib/files"
import { supabase } from "#/lib/supabase/client"
import { cn } from "#/lib/utils"
import type { FileFieldProps } from "#/types/fields"

import { useFieldContext } from "../form-hook"

export function FileField({ columnMetadata, columnSchema }: FileFieldProps) {
  const field = useFieldContext<string>()
  const config = JSON.parse(columnSchema.comment ?? "{}") as FileColumnMetadata
  const maxSize = config.max_size ?? DEFAULT_MAX_FILE_SIZE
  const maxFiles = config.max_files ?? 1
  const accept = config.accept ?? "*"

  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const currentValue = field.state.value as string | null

  // Handle string value (file path)
  const filePath = currentValue
  const fileName = filePath ? filePath.split("/").pop() || "Uploaded File" : null

  // Generate signed URL for the file path
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (filePath) {
        try {
          const { data, error } = await supabase.storage
            .from("deliverable-files")
            .createSignedUrl(filePath, 60)
          if (data) {
            setSignedUrl(data.signedUrl)
          }
        } catch (error) {
          console.error("Failed to generate signed URL:", error)
        }
      } else {
        setSignedUrl(null)
      }
    }
    generateSignedUrl()
  }, [filePath])

  const handleFileUpload = async (file: File) => {
    if (file.size > maxSize) {
      toast.error(
        `File "${file.name}" exceeds the maximum size of ${formatFileSize(maxSize)}.`
      )
      return
    }

    if (!isAcceptedFileType(file, accept)) {
      toast.error(`File "${file.name}" is not an accepted file type.`)
      return
    }

    setIsUploading(true)
    try {
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${file.name}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from("deliverable-files")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Save only the file path string to the form field
      field.handleChange(filePath)
      toast.success("File uploaded successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileRemove = async () => {
    if (filePath) {
      try {
        await supabase.storage.from("deliverable-files").remove([filePath])
      } catch (error) {
        console.error("Failed to delete file:", error)
      }
    }
    field.handleChange("")
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      {filePath ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <FileUpIcon className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm truncate">{fileName}</span>
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              Download
            </a>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleFileRemove}
            disabled={isUploading}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <input
            type="file"
            accept={Array.isArray(accept) ? accept.join(",") : accept}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
            disabled={isUploading}
            className="hidden"
            id={`file-upload-${columnSchema.name}`}
          />
          <label
            htmlFor={`file-upload-${columnSchema.name}`}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input p-6 transition-colors outline-none hover:bg-accent/30",
              isUploading ? "opacity-50 cursor-not-allowed" : "border-muted-foreground/25"
            )}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div
                className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
                aria-hidden="true"
              >
                <FileUpIcon className="size-4 opacity-60" />
              </div>
              <p className="mb-1.5 text-sm font-medium">
                {isUploading ? "Uploading..." : "Upload file"}
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                Drag & drop or click to browse
              </p>
              <div className="flex flex-wrap justify-center gap-1 text-xs text-muted-foreground/70">
                <span>
                  {Array.isArray(accept)
                    ? accept.join(", ")
                    : accept === "*"
                      ? "All files"
                      : accept}
                </span>
                <span>∙</span>
                <span>Up to {formatFileSize(maxSize)}</span>
              </div>
            </div>
          </label>
        </>
      )}
    </div>
  )
}
