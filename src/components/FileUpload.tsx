import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileArchive, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useAppContext } from '@/contexts/AppContext'
import { parseZipFile } from '@/lib/services/parse-worker.service'
import { indexedDBService } from '@/lib/services/indexeddb.service'

type UploadStatus = 'idle' | 'loading' | 'success' | 'error'

interface FileItem {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface UploadProgress {
  stage: 'unzipping' | 'parsing' | 'processing' | 'saving' | 'indexing';
  percentage?: number;
  message: string;
  currentFileIndex?: number;
  totalFiles?: number;
}

export function FileUpload() {
  const navigate = useNavigate()
  const { loadDataFromDB, setUploadedFile } = useAppContext()
  const [files, setFiles] = useState<FileItem[]>([])
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [totalProcessed, setTotalProcessed] = useState({ categories: 0, definitions: 0 })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): boolean => {
    // Kiểm tra định dạng file
    if (!file.name.endsWith('.zip')) {
      toast.error('Lỗi định dạng', {
        description: 'Chỉ chấp nhận file .zip'
      })
      return false
    }

    // Kiểm tra tên file cụ thể
    if (file.name !== 'im_logicdesigner-data.zip') {
      toast.warning('Cảnh báo', {
        description: `File name: ${file.name}. Đảm bảo đây là file im_logicdesigner-data.zip`
      })
    }

    // Kiểm tra kích thước file (giới hạn 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      toast.error('Lỗi kích thước', {
        description: 'File không được vượt quá 100MB'
      })
      return false
    }

    return true
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = droppedFiles.filter(validateFile)

    if (validFiles.length > 0) {
      const newFiles: FileItem[] = validFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: 'pending'
      }))
      setFiles(prev => [...prev, ...newFiles])
      setStatus('idle')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles)
      const validFiles = filesArray.filter(validateFile)

      if (validFiles.length > 0) {
        const newFiles: FileItem[] = validFiles.map((file) => ({
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          status: 'pending'
        }))
        setFiles(prev => [...prev, ...newFiles])
        setStatus('idle')
      }
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Lỗi', {
        description: 'Vui lòng chọn ít nhất một file để upload'
      })
      return
    }

    setStatus('loading')
    setTotalProcessed({ categories: 0, definitions: 0 })

    const mainToastId = toast.loading('Đang xử lý files...', {
      description: `0/${files.length} files`
    })

    try {
      // Clear old data first
      await indexedDBService.clear()

      let totalCategories = 0
      let totalDefinitions = 0

      // Process each file sequentially
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i]

        // Update file status to processing
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'processing' as const } : f
        ))

        try {
          setProgress({
            stage: 'unzipping',
            message: `File ${i + 1}/${files.length}: ${fileItem.file.name}`,
            currentFileIndex: i + 1,
            totalFiles: files.length
          })

          toast.loading(`File ${i + 1}/${files.length}: ${fileItem.file.name}`, {
            id: mainToastId,
            description: 'Đang giải nén...'
          })

          // Parse file
          const parsed = await parseZipFile(fileItem.file, (prog) => {
            let description = ''

            switch (prog.stage) {
              case 'unzipping':
                description = 'Đang giải nén...';
                break;
              case 'parsing':
                description = 'Đang đọc JSON...';
                break;
              case 'processing':
                description = `Xử lý: ${prog.current || 0}/${prog.total || 0}`;
                break;
            }

            if (prog.percentage) {
              description += ` (${prog.percentage}%)`
            }

            setProgress({
              stage: prog.stage,
              percentage: prog.percentage,
              message: `File ${i + 1}/${files.length}: ${fileItem.file.name}`,
              currentFileIndex: i + 1,
              totalFiles: files.length
            })

            toast.loading(`File ${i + 1}/${files.length}: ${fileItem.file.name}`, {
              id: mainToastId,
              description,
            })
          })

          // Append data to IndexedDB (không clear)
          setProgress({
            stage: 'saving',
            message: `File ${i + 1}/${files.length}: ${fileItem.file.name}`,
            currentFileIndex: i + 1,
            totalFiles: files.length
          })

          toast.loading(`File ${i + 1}/${files.length}: ${fileItem.file.name}`, {
            id: mainToastId,
            description: 'Đang lưu vào database...'
          })

          await indexedDBService.appendParsedData(parsed)

          totalCategories += parsed.userCategories.length
          totalDefinitions += parsed.userDefinitions.length

          setTotalProcessed({
            categories: totalCategories,
            definitions: totalDefinitions
          })

          // Update file status to success
          setFiles(prev => prev.map(f =>
            f.id === fileItem.id ? { ...f, status: 'success' as const } : f
          ))

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Lỗi không xác định'
          
          // Mark file as error
          setFiles(prev => prev.map(f =>
            f.id === fileItem.id ? {
              ...f,
              status: 'error' as const,
              error: errorMsg
            } : f
          ))

          console.error(`Error processing file ${fileItem.file.name}:`, error)
          
          // Continue with next file (không throw error để tiếp tục xử lý)
        }
      }

      // Build search index after all files processed
      setProgress({
        stage: 'indexing',
        message: 'Đang tạo search index...',
        currentFileIndex: files.length,
        totalFiles: files.length
      })

      toast.loading('Đang tạo search index...', { 
        id: mainToastId,
        description: 'Vui lòng đợi...'
      })

      // Update final metadata counts
      const finalCatCount = await indexedDBService.getCategories()
      const finalDefCount = await indexedDBService.countDefinitions()
      
      await indexedDBService.updateMetadata('categoryCount', finalCatCount.length)
      await indexedDBService.updateMetadata('definitionCount', finalDefCount)

      await loadDataFromDB()

      setUploadedFile(files[0]?.file || null)
      setStatus('success')
      setProgress(null)

      const successCount = files.filter(f => f.status === 'success').length
      const errorCount = files.filter(f => f.status === 'error').length

      // Dismiss và hiển thị kết quả cuối cùng
      if (errorCount === 0) {
        toast.success('Xử lý hoàn tất!', {
          id: mainToastId,
          description: `${successCount} files thành công. Tổng: ${totalDefinitions} definitions từ ${totalCategories} categories`,
          duration: 3000
        })
      } else {
        toast.warning('Xử lý hoàn tất với lỗi!', {
          id: mainToastId,
          description: `Thành công: ${successCount}/${files.length} files. Lỗi: ${errorCount} files. Tổng: ${totalDefinitions} definitions`,
          duration: 5000
        })
      }

      // Navigate after delay
      setTimeout(() => {
        navigate({ to: '/content' })
      }, 1500)
    } catch (error) {
      setStatus('error')
      setProgress(null)
      console.error('Upload error:', error)
      toast.error('Xử lý files thất bại', {
        id: mainToastId,
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
        duration: 5000
      })
    }
  }

  const handleReset = () => {
    setFiles([])
    setStatus('idle')
    setProgress(null)
    setTotalProcessed({ categories: 0, definitions: 0 })
  }

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Upload Logic Designer Data
        </CardTitle>
        <CardDescription>
          Upload một hoặc nhiều file im_logicdesigner-data.zip để xử lý cùng lúc
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${status === 'loading' ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            type="file"
            id="file-upload"
            accept=".zip"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={status === 'loading'}
          />

          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <FileArchive className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Kéo thả file vào đây hoặc click để chọn
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Chỉ chấp nhận file .zip (tối đa 100MB mỗi file). Hỗ trợ chọn nhiều file.
              </p>
            </div>
          </label>
        </div>

        {/* File Info */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Đã chọn {files.length} file(s)</p>
              {totalProcessed.definitions > 0 && (
                <p className="text-sm text-muted-foreground">
                  Tổng: {totalProcessed.definitions} definitions, {totalProcessed.categories} categories
                </p>
              )}
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((fileItem) => (
                <div key={fileItem.id} className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{fileItem.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {fileItem.status === 'pending' && status !== 'loading' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(fileItem.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {fileItem.status === 'processing' && (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      )}
                      {fileItem.status === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {fileItem.status === 'error' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  {fileItem.error && (
                    <p className="text-xs text-red-600">{fileItem.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Message */}
        {progress && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {progress.message}
            </p>
            {progress.currentFileIndex && progress.totalFiles && (
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                File {progress.currentFileIndex}/{progress.totalFiles}
              </p>
            )}
            {progress.percentage !== undefined && (
              <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || status === 'loading' || status === 'success'}
            className="flex-1"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang upload...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length > 0 ? `${files.length} file(s)` : 'Files'}
              </>
            )}
          </Button>

          {files.length > 0 && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={status === 'loading'}
            >
              Hủy
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
