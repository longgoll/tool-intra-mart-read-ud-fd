import { readZipFile } from '@/lib/user-definition-parser';
import type { ParsedUserDefinition } from '@/lib/types/user-definition.types';
import { Upload, FileArchive, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ZipUploaderProps {
  onZipLoaded: (data: ParsedUserDefinition) => void;
}

export function ZipUploader({ onZipLoaded }: ZipUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.zip')) {
        toast.error('Vui lòng chọn file ZIP');
        return;
      }

      setIsLoading(true);
      setFileName(file.name);

      try {
        const parsed = await readZipFile(file);
        onZipLoaded(parsed);
        toast.success(
          `Đã tải ${parsed.userDefinitions.length} definitions từ ${parsed.userCategories.length} categories`
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Lỗi khi đọc file ZIP'
        );
        console.error('Error reading ZIP file:', error);
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onZipLoaded]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClear = () => {
    setFileName(null);
    onZipLoaded({ userCategories: [], userDefinitions: [] });
    toast.info('Đã xóa file');
  };

  return (
    <div className="p-4 border-b bg-muted/30">
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {fileName ? (
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileArchive className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-sm">{fileName}</p>
                <p className="text-xs text-muted-foreground">File đã tải lên</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
              title="Xóa file"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center p-6 cursor-pointer">
            <Upload
              className={`h-10 w-10 mb-3 ${isDragging ? 'text-primary animate-bounce' : 'text-muted-foreground'}`}
            />
            <p className="text-sm font-medium mb-1">
              {isDragging ? 'Thả file vào đây' : 'Tải lên file ZIP'}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Kéo thả hoặc click để chọn file
            </p>
            <p className="text-xs text-muted-foreground">
              im_logicdesigner-data.zip
            </p>
            <input
              type="file"
              accept=".zip"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Đang xử lý...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
