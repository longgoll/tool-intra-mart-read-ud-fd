import { useState } from 'react';
import { FileTreeExplorer } from '@/components/file-tree-explorer';
import { SearchResultsPanel } from '@/components/search-results-panel';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FolderTree, Search } from 'lucide-react';
import type { FileTreeNode, UserCategory } from '@/lib/types/user-definition.types';
import type { SearchResult } from '@/lib/services/search-index.service';

type SidebarView = 'explorer' | 'search';

interface SidebarProps {
  // Explorer props
  fileTree: FileTreeNode[];
  onFileSelect: (node: FileTreeNode) => void;
  selectedFileId?: string;

  // Search props
  searchResults: SearchResult[];
  isSearching: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchResultSelect: (result: SearchResult) => void;
  searchFilterType: 'all' | 'sql' | 'javascript';
  onSearchFilterChange: (filter: 'all' | 'sql' | 'javascript') => void;
  onClearSearchResults: () => void;
  categories: UserCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
}

export function Sidebar({
  fileTree,
  onFileSelect,
  selectedFileId,
  searchResults,
  isSearching,
  searchQuery,
  onSearchQueryChange,
  onSearchResultSelect,
  searchFilterType,
  onSearchFilterChange,
  onClearSearchResults,
  categories,
  selectedCategoryId,
  onCategoryChange,
}: SidebarProps) {
  const [activeView, setActiveView] = useState<SidebarView>('explorer');

  return (
    <div className="flex h-full">
      {/* Icon Bar - VS Code style */}
      <div className="w-12 bg-muted/30 border-r flex flex-col items-center py-2 gap-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeView === 'explorer' ? 'secondary' : 'ghost'}
                size="icon"
                className={`w-10 h-10 ${
                  activeView === 'explorer' ? 'bg-muted' : ''
                }`}
                onClick={() => setActiveView('explorer')}
              >
                <FolderTree className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>File Explorer</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeView === 'search' ? 'secondary' : 'ghost'}
                size="icon"
                className={`w-10 h-10 relative ${
                  activeView === 'search' ? 'bg-muted' : ''
                }`}
                onClick={() => setActiveView('search')}
              >
                <Search className="h-5 w-5" />
                {searchResults.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Search ({searchResults.length})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeView === 'explorer' ? (
          <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
            <div className="px-4 py-3 border-b bg-background/50 shrink-0">
              <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
                Explorer
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileTreeExplorer
                tree={fileTree}
                onFileSelect={onFileSelect}
                selectedFileId={selectedFileId}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b bg-background/50 shrink-0">
              <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
                Search
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <SearchResultsPanel
                results={searchResults}
                isSearching={isSearching}
                query={searchQuery}
                onQueryChange={onSearchQueryChange}
                onSelectResult={onSearchResultSelect}
                selectedDefinitionId={selectedFileId}
                filterType={searchFilterType}
                onFilterChange={onSearchFilterChange}
                onClearResults={onClearSearchResults}
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={onCategoryChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
