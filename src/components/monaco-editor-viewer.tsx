import Editor from '@monaco-editor/react';
import { UserDefinition } from '@/lib/types/user-definition.types';
import {
  extractDefinitionContent,
  getEditorLanguage,
} from '@/lib/user-definition-parser';
import { Copy, Download, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface MonacoEditorViewerProps {
  definition: UserDefinition | null;
}

export function MonacoEditorViewer({ definition }: MonacoEditorViewerProps) {
  const { theme } = useTheme();

  if (!definition) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <FileCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Chưa mở file nào</h3>
          <p className="text-sm">
            Chọn một file từ file explorer để xem nội dung
          </p>
        </div>
      </div>
    );
  }

  const content = extractDefinitionContent(definition);
  const language = getEditorLanguage(definition.definitionType);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Đã copy vào clipboard');
    } catch (error) {
      toast.error('Không thể copy');
      console.error(error);
    }
  };

  const handleDownload = () => {
    const extension =
      definition.definitionType === 'sql'
        ? '.sql'
        : definition.definitionType === 'javascript'
        ? '.js'
        : '.txt';
    const filename = `${definition.definitionId}${extension}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Đã tải xuống ${filename}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <FileCode className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">{definition.definitionName}</h3>
            <p className="text-xs text-muted-foreground">
              {definition.definitionId} • {definition.definitionType}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Copy code"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Tải xuống"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={content}
          theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
            },
          }}
        />
      </div>

      {/* Footer - Additional Info */}
      <div className="flex items-center justify-between p-2 border-t bg-muted/10 text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>Version: {definition.version}</span>
          <span>Category: {definition.categoryId}</span>
        </div>
        <div>
          <span>{content.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  );
}
