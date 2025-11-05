import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileArchive, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useAppContext } from '@/contexts/AppContext'
import { parseZipFile } from '@/lib/services/parse-worker.service'
import { indexedDBService } from '@/lib/services/indexeddb.service'

type UploadStatus = 'idle' | 'loading' | 'success' | 'error'

interface UploadProgress {
  stage: 'unzipping' | 'parsing' | 'processing' | 'saving' | 'indexing';
  percentage?: number;
  message: string;
}

export function FileUpload() {
  const navigate = useNavigate()
  const { loadDataFromDB, setUploadedFile } = useAppContext()
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)

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

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile)
      setStatus('idle')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile)
      setStatus('idle')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Lỗi', {
        description: 'Vui lòng chọn file để upload'
      })
      return
    }

    setStatus('loading')
    setProgress({ stage: 'unzipping', message: 'Đang giải nén file...' })

    const toastId = toast.loading('Đang xử lý file...', {
      description: 'Giải nén file ZIP'
    })

    try {
      // Parse file ZIP using Web Worker (không block UI)
      const parsed = await parseZipFile(file, (prog) => {
        let message = 'Đang xử lý...';

        switch (prog.stage) {
          case 'unzipping':
            message = 'Đang giải nén file ZIP...';
            break;
          case 'parsing':
            message = 'Đang đọc JSON...';
            break;
          case 'processing':
            message = `Xử lý definitions: ${prog.current || 0}/${prog.total || 0}`;
            break;
        }

        setProgress({
          stage: prog.stage,
          percentage: prog.percentage,
          message,
        });

        toast.loading(message, {
          id: toastId,
          description: prog.percentage ? `${prog.percentage}%` : undefined,
        });
      });

      // Lưu vào IndexedDB
      setProgress({ stage: 'saving', message: 'Đang lưu vào database...' });
      toast.loading('Đang lưu vào database...', { id: toastId });

      await indexedDBService.clear(); // Clear old data
      await indexedDBService.saveParsedData(parsed);

      // Build search index
      setProgress({ stage: 'indexing', message: 'Đang tạo search index...' });
      toast.loading('Đang tạo search index...', { id: toastId });

      await loadDataFromDB();

      setUploadedFile(file)
      setStatus('success')
      setProgress(null)

      toast.success('Xử lý thành công!', {
        id: toastId,
        description: `Đã tải ${parsed.userDefinitions.length} definitions từ ${parsed.userCategories.length} categories`
      })

      // Chuyển sang trang nội dung sau 1 giây
      setTimeout(() => {
        navigate({ to: '/content' })
      }, 1000)
    } catch (error) {
      setStatus('error')
      setProgress(null)
      toast.error('Xử lý file thất bại', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý file'
      })
    }
  }

  const handleReset = () => {
    setFile(null)
    setStatus('idle')
    setProgress(null)
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
          Upload file im_logicdesigner-data.zip để xử lý
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
                Chỉ chấp nhận file .zip (tối đa 100MB)
              </p>
            </div>
          </label>
        </div>

        {/* File Info */}
        {file && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {status === 'loading' && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {status === 'error' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>

            {/* Progress Message */}
            {progress && (
              <div className="text-sm space-y-1">
                <p className="text-blue-600">{progress.message}</p>
                {progress.percentage !== undefined && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Status Message */}
            {status !== 'idle' && !progress && (
              <div className="text-sm">
                {status === 'success' && (
                  <p className="text-green-600">Upload thành công!</p>
                )}
                {status === 'error' && (
                  <p className="text-red-600">Upload thất bại. Vui lòng thử lại.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!file || status === 'loading' || status === 'success'}
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
                Upload File
              </>
            )}
          </Button>

          {file && (
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
