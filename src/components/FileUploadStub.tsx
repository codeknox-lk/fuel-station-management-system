'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadStubProps {
  onFileSelect?: (file: File) => void
  onFileRemove?: (file: File) => void
  acceptedTypes?: string[]
  maxSize?: number // in MB
  multiple?: boolean
  className?: string
  placeholder?: string
}

export function FileUploadStub({
  onFileSelect,
  onFileRemove,
  acceptedTypes = ['image/*', '.pdf', '.doc', '.docx'],
  maxSize = 5, // 5MB default
  multiple = false,
  className,
  placeholder = 'Click to upload or drag and drop'
}: FileUploadStubProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles = Array.from(selectedFiles).filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`)
        return false
      }
      return true
    })

    if (multiple) {
      setFiles(prev => [...prev, ...newFiles])
      newFiles.forEach(file => onFileSelect?.(file))
    } else {
      setFiles(newFiles)
      onFileSelect?.(newFiles[0])
    }
  }

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove))
    onFileRemove?.(fileToRemove)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return '🖼️'
    } else if (file.type === 'application/pdf') {
      return '📄'
    } else if (file.type.includes('document') || file.type.includes('text')) {
      return '📝'
    }
    return '📎'
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragOver 
            ? 'border-purple-500 bg-purple-500/10 dark:bg-purple-500/20' 
            : 'border-border hover:border-border'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              {placeholder}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Accepted formats: {acceptedTypes.join(', ')} (Max {maxSize}MB)
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.multiple = multiple
                input.accept = acceptedTypes.join(',')
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement
                  handleFileSelect(target.files)
                }
                input.click()
              }}
            >
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Selected Files:</h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{getFileIcon(file)}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mock Upload Progress */}
      {files.length > 0 && (
        <div className="text-center">
          <Button
            type="button"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => {
              // Mock upload - in real implementation, this would upload to server
              alert('Files uploaded successfully! (This is a mock)')
            }}
          >
            Upload Files
          </Button>
        </div>
      )}
    </div>
  )
}

