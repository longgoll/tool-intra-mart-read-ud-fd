import { useState, useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { FileTreeExplorer } from '@/components/file-tree-explorer';
import { MonacoEditorViewer } from '@/components/monaco-editor-viewer';
import type {
  FileTreeNode,
  ParsedUserDefinition,
  UserDefinition,
} from '@/lib/types/user-definition.types';
import { buildFileTree } from '@/lib/user-definition-parser';
import { FileCode2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { ThemeToggle } from '@/components/theme-toggle';

export function ContentRoute() {
  const { parsedData: contextParsedData } = useAppContext();
  const [parsedData, setParsedData] = useState<ParsedUserDefinition | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedDefinition, setSelectedDefinition] =
    useState<UserDefinition | null>(null);

  // Load data từ Context khi component mount
  useEffect(() => {
    if (contextParsedData) {
      setParsedData(contextParsedData);
      const tree = buildFileTree(contextParsedData);
      setFileTree(tree);
    }
  }, [contextParsedData]);

  const handleFileSelect = (node: FileTreeNode) => {
    if (node.type === 'file' && node.definition) {
      setSelectedDefinition(node.definition);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <FileCode2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Logic Designer Viewer</h1>
            <p className="text-xs text-muted-foreground">
              Xem và quản lý Intramart Logic Designer definitions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {parsedData && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                {parsedData.userCategories.length} categories
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span>
                {parsedData.userDefinitions.length} definitions
              </span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {fileTree.length > 0 ? (
          <ResizablePanelGroup direction="horizontal">
            {/* Sidebar - File Tree */}
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <div className="h-full border-r bg-muted/30">
                <FileTreeExplorer
                  tree={fileTree}
                  onFileSelect={handleFileSelect}
                  selectedFileId={selectedDefinition?.definitionId}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Editor Area */}
            <ResizablePanel defaultSize={75}>
              <div className="h-full">
                <MonacoEditorViewer definition={selectedDefinition} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground max-w-md">
              <FileCode2 className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <h2 className="text-2xl font-semibold mb-2">
                Chào mừng đến với Logic Designer Viewer
              </h2>
              <p className="text-sm mb-6">
                Chưa có dữ liệu để hiển thị
              </p>
              <div className="text-left bg-muted/50 rounded-lg p-4 text-xs space-y-2">
                <p className="font-semibold mb-2">Tính năng:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Xem cấu trúc file theo categories</li>
                  <li>Hỗ trợ SQL và JavaScript definitions</li>
                  <li>Syntax highlighting với Monaco Editor</li>
                  <li>Copy và download file dễ dàng</li>
                  <li>Tìm kiếm và điều hướng nhanh</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
