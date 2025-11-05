import type { FileTreeNode } from '@/lib/types/user-definition.types';
import { ChevronDown, ChevronRight, FileCode, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileTreeExplorerProps {
  tree: FileTreeNode[];
  onFileSelect: (node: FileTreeNode) => void;
  selectedFileId?: string;
}

export function FileTreeExplorer({
  tree,
  onFileSelect,
  selectedFileId,
}: FileTreeExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const expandAll = () => {
    const allFolderIds = new Set<string>();
    const collectFolderIds = (nodes: FileTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.type === 'folder') {
          allFolderIds.add(node.id);
          if (node.children) {
            collectFolderIds(node.children);
          }
        }
      });
    };
    collectFolderIds(tree);
    setExpandedFolders(allFolderIds);
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const renderTreeNode = (node: FileTreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = node.id === selectedFileId;

    if (node.type === 'folder') {
      return (
        <div key={node.id} className="select-none">
          <div
            className={cn(
              'flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent rounded-md transition-colors',
              isSelected && 'bg-accent'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )}
            <span className="text-sm font-medium">{node.name}</span>
            {node.children && (
              <span className="text-xs text-muted-foreground ml-auto">
                {node.children.length}
              </span>
            )}
          </div>
          {isExpanded && node.children && (
            <div>{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    // File node
    return (
      <div
        key={node.id}
        className={cn(
          'flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent rounded-md transition-colors',
          isSelected && 'bg-primary/10 border-l-2 border-primary'
        )}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
        onClick={() => onFileSelect(node)}
      >
        <FileCode className="h-4 w-4 text-green-600" />
        <span className="text-sm truncate">{node.name}</span>
        {node.definition && (
          <span className="text-xs text-muted-foreground ml-auto">
            {node.definition.definitionType}
          </span>
        )}
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <div className="text-center">
          <FileCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Chưa có file nào</p>
          <p className="text-xs mt-1">Vui lòng tải lên file ZIP</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b shrink-0">
        <span className="text-sm font-semibold">File Explorer</span>
        <div className="flex gap-1">
          <button
            onClick={expandAll}
            className="p-1 hover:bg-accent rounded text-xs"
            title="Mở rộng tất cả"
          >
            ⊞
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-accent rounded text-xs"
            title="Thu gọn tất cả"
          >
            ⊟
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">{tree.map((node) => renderTreeNode(node, 0))}</div>
        </ScrollArea>
      </div>
    </div>
  );
}
