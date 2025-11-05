import Editor from '@monaco-editor/react';
import type { UserDefinition } from '@/lib/types/user-definition.types';
import {
  extractDefinitionContent,
  getEditorLanguage,
} from '@/lib/user-definition-parser';
import { Copy, Download, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';

interface HighlightPosition {
  lineNumber: number;
  column: number;
  matchLength: number;
}

interface MonacoEditorViewerProps {
  definition: UserDefinition | null;
  highlightPositions?: HighlightPosition[];
}

export function MonacoEditorViewer({ definition, highlightPositions }: MonacoEditorViewerProps) {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('editor-font-size') || '14', 10);
  });

  // Handle editor mount
  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance;
  };

  // Listen for font size changes from settings
  useEffect(() => {
    const handleFontSizeChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const newSize = parseInt(customEvent.detail, 10);
      setFontSize(newSize);
      
      // Update editor font size
      if (editorRef.current) {
        editorRef.current.updateOptions({ fontSize: newSize });
      }
    };

    window.addEventListener('editor-font-size-change', handleFontSizeChange);
    return () => {
      window.removeEventListener('editor-font-size-change', handleFontSizeChange);
    };
  }, []);

  // Apply highlights when positions change
  useEffect(() => {
    if (!editorRef.current || !highlightPositions || highlightPositions.length === 0) {
      // Clear previous decorations
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current?.deltaDecorations(decorationsRef.current, []) || [];
      }
      return;
    }

    const editor = editorRef.current;

    // Create decorations for highlights
    const newDecorations = highlightPositions.map((pos) => ({
      range: {
        startLineNumber: pos.lineNumber,
        startColumn: pos.column,
        endLineNumber: pos.lineNumber,
        endColumn: pos.column + pos.matchLength,
      },
      options: {
        isWholeLine: false,
        className: 'search-match-highlight',
        inlineClassName: 'search-match-inline',
        overviewRuler: {
          color: '#fbbf24',
          position: 4, // Full width
        },
        minimap: {
          color: '#fbbf24',
          position: 1, // Inline
        },
      },
    }));

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    // Scroll to first match and center it
    if (highlightPositions.length > 0) {
      const firstMatch = highlightPositions[0];
      editor.revealLineInCenter(firstMatch.lineNumber, 0);
      
      // Also set cursor position at the match
      editor.setPosition({
        lineNumber: firstMatch.lineNumber,
        column: firstMatch.column,
      });

      // Flash animation (brief focus)
      setTimeout(() => {
        editor.focus();
      }, 100);
    }
  }, [highlightPositions, definition]);

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
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            fontSize: fontSize,
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
        {/* Custom CSS for highlight styling */}
        <style>{`
          .search-match-highlight {
            background-color: rgba(251, 191, 36, 0.2);
            border: 1px solid rgba(251, 191, 36, 0.5);
          }
          .search-match-inline {
            background-color: rgba(251, 191, 36, 0.3);
            color: inherit;
          }
          .dark .search-match-highlight {
            background-color: rgba(251, 191, 36, 0.15);
            border: 1px solid rgba(251, 191, 36, 0.4);
          }
          .dark .search-match-inline {
            background-color: rgba(251, 191, 36, 0.25);
          }
        `}</style>
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
