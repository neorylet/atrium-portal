import { Upload, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "#/components/ui/button"
import { supabase } from "#/lib/supabase/client"
import type { FieldProps } from "#/types/fields"

import { useFieldContext } from "../form-hook"

export function FileUploadField({ columnMetadata }: FieldProps) {
  const field = useFieldContext<string>()
  const [uploading, setUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const bucket = columnMetadata.bucket ?? "deliverable-files"

  const handleFileSelect = async (file: File | null) => {
    if (!file) return

    setUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      field.handleChange(filePath)
      toast.success("File uploaded successfully")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      )
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    field.handleChange("")
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  return (
    <div className="space-y-2">
      {field.state.value ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <span className="flex-1 text-sm truncate">{field.state.value}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"}
            ${uploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input
            type="file"
            onChange={handleInputChange}
            disabled={uploading}
            className="hidden"
            id={`file-upload-${field.name}`}
          />
          <label
            htmlFor={`file-upload-${field.name}`}
            className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : isDragActive ? "Drop file here" : "Drag & drop or click to upload"}
            </p>
          </label>
        </div>
      )}
    </div>
  )
}
