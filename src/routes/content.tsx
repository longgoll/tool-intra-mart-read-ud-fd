import { useState, useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Sidebar } from '@/components/sidebar';
import { MonacoEditorViewer } from '@/components/monaco-editor-viewer';
import { SearchDialog } from '@/components/search-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import type {
  FileTreeNode,
  UserDefinition,
} from '@/lib/types/user-definition.types';
import { FileCode2, Loader2, Settings } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { searchIndexService } from '@/lib/services/search-index.service';
import type { SearchResult } from '@/lib/services/search-index.service';

export function ContentRoute() {
  const { isDataLoaded, categories, stats, getDefinitionsByCategory, getDefinition } = useAppContext();
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedDefinition, setSelectedDefinition] =
    useState<UserDefinition | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'sql' | 'javascript'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>('basic');
  const [advancedSearchQuery, setAdvancedSearchQuery] = useState('');
  const [advancedSearchLogic, setAdvancedSearchLogic] = useState<'AND' | 'OR'>('AND');
  
  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Highlight positions for search results
  const [highlightPositions, setHighlightPositions] = useState<{
    lineNumber: number;
    column: number;
    matchLength: number;
  }[]>([]);

  // Load file tree when categories are available
  useEffect(() => {
    const buildTreeFromDB = async () => {
      if (!isDataLoaded || categories.length === 0) return;

      setIsLoadingTree(true);
      try {
        const tree: FileTreeNode[] = [];

        for (const category of categories) {
          const definitions = await getDefinitionsByCategory(category.categoryId);

          // Create file nodes for definitions
          const fileNodes: FileTreeNode[] = definitions.map((def) => ({
            id: def.definitionId,
            name: def.definitionName,
            type: 'file',
            definition: def,
          }));

          // Create folder node
          const folderNode: FileTreeNode = {
            id: category.categoryId,
            name: category.displayName,
            type: 'folder',
            category,
            children: fileNodes,
            expanded: false,
          };

          tree.push(folderNode);
        }

        setFileTree(tree);
      } catch (error) {
        console.error('Failed to build file tree:', error);
      } finally {
        setIsLoadingTree(false);
      }
    };

    buildTreeFromDB();
  }, [isDataLoaded, categories, getDefinitionsByCategory]);

  // Search with debounce
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const definitionType = searchFilterType === 'all' ? undefined : searchFilterType;
        const categoryId = selectedCategoryId === 'all' ? undefined : selectedCategoryId;
        let results = await searchIndexService.search(searchQuery, {
          limit: 1000,
          definitionType,
          categoryId,
        });

        // Apply advanced search filtering
        if (searchMode === 'advanced' && advancedSearchQuery.trim()) {
          const keywords = advancedSearchQuery
            .split(';')
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);

          if (keywords.length > 0) {
            results = results.filter(result => {
              // Search in all text content of the definition
              const searchableText = [
                result.definition.definitionName,
                result.definition.sqlQuery || '',
                result.definition.javaScriptCode || '',
                ...result.matches.map(m => m.snippet),
              ].join(' ').toLowerCase();

              if (advancedSearchLogic === 'AND') {
                // All keywords must be present
                return keywords.every(keyword => searchableText.includes(keyword));
              } else {
                // At least one keyword must be present
                return keywords.some(keyword => searchableText.includes(keyword));
              }
            });
          }
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchFilterType, selectedCategoryId, searchMode, advancedSearchQuery, advancedSearchLogic]);

  const handleFileSelect = async (node: FileTreeNode) => {
    if (node.type === 'file') {
      // If definition is already in node, use it
      if (node.definition) {
        setSelectedDefinition(node.definition);
        // Clear highlights when selecting from file tree
        setHighlightPositions([]);
      } else {
        // Otherwise, fetch from IndexedDB
        const def = await getDefinition(node.id);
        if (def) {
          setSelectedDefinition(def);
          setHighlightPositions([]);
        }
      }
    }
  };

  const handleSearchSelect = async (definitionId: string) => {
    const def = await getDefinition(definitionId);
    if (def) {
      setSelectedDefinition(def);
      // Clear highlights for quick search dialog
      setHighlightPositions([]);
    }
  };

  const handleSearchResultSelect = async (result: SearchResult) => {
    setSelectedDefinition(result.definition);
    
    // Extract highlight positions from search result matches
    const positions = result.matches
      .filter(match => match.lineNumber && match.column && match.matchLength)
      .map(match => ({
        lineNumber: match.lineNumber!,
        column: match.column!,
        matchLength: match.matchLength!,
      }));
    
    setHighlightPositions(positions);
  };

  const handleClearSearchResults = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHighlightPositions([]);
    setSelectedCategoryId('all');
    setAdvancedSearchQuery('');
    setSearchMode('basic');
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
          {isDataLoaded && (
            <>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  {stats.categoryCount} categories
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span>
                  {stats.definitionCount} definitions
                </span>
              </div>
              <SearchDialog onSelectDefinition={handleSearchSelect} />
            </>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            title="Cài đặt"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Settings Dialog */}
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoadingTree ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : fileTree.length > 0 ? (
          <ResizablePanelGroup direction="horizontal">
            {/* Sidebar - VS Code style with tabs */}
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <Sidebar
                fileTree={fileTree}
                onFileSelect={handleFileSelect}
                selectedFileId={selectedDefinition?.definitionId}
                searchResults={searchResults}
                isSearching={isSearching}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onSearchResultSelect={handleSearchResultSelect}
                searchFilterType={searchFilterType}
                onSearchFilterChange={setSearchFilterType}
                onClearSearchResults={handleClearSearchResults}
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={setSelectedCategoryId}
                searchMode={searchMode}
                onSearchModeChange={setSearchMode}
                advancedSearchQuery={advancedSearchQuery}
                onAdvancedSearchQueryChange={setAdvancedSearchQuery}
                advancedSearchLogic={advancedSearchLogic}
                onAdvancedSearchLogicChange={setAdvancedSearchLogic}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Editor Area */}
            <ResizablePanel defaultSize={75}>
              <div className="h-full">
                <MonacoEditorViewer 
                  definition={selectedDefinition}
                  highlightPositions={highlightPositions}
                />
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
