import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileCode2, Loader2, X, MapPin, Folder } from 'lucide-react';
import type { SearchResult } from '@/lib/services/search-index.service';
import type { UserCategory } from '@/lib/types/user-definition.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchResultsPanelProps {
  results: SearchResult[];
  isSearching: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onSelectResult: (result: SearchResult) => void;
  selectedDefinitionId?: string;
  filterType: 'all' | 'sql' | 'javascript';
  onFilterChange: (filter: 'all' | 'sql' | 'javascript') => void;
  onClearResults: () => void;
  categories: UserCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
}

export function SearchResultsPanel({
  results,
  isSearching,
  query,
  onQueryChange,
  onSelectResult,
  selectedDefinitionId,
  filterType,
  onFilterChange,
  onClearResults,
  categories,
  selectedCategoryId,
  onCategoryChange,
}: SearchResultsPanelProps) {
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Search Input and Filters */}
      <div className="p-3 space-y-3 border-b shrink-0">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm trong tên file và nội dung..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-10 h-9"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearResults}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Folder className="h-3 w-3" />
            Tìm kiếm trong:
          </label>
          <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Chọn thư mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Tất cả thư mục
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.categoryId} value={category.categoryId} className="text-xs">
                  {category.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('all')}
            className="flex-1 h-8 text-xs"
          >
            Tất cả
          </Button>
          <Button
            variant={filterType === 'sql' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('sql')}
            className="flex-1 h-8 text-xs"
          >
            SQL
          </Button>
          <Button
            variant={filterType === 'javascript' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('javascript')}
            className="flex-1 h-8 text-xs"
          >
            JS
          </Button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Results Count */}
        {results.length > 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/20 shrink-0">
            {results.length} {results.length === 1 ? 'kết quả' : 'kết quả'}
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y">
                {results.map((result) => (
                  <button
                    key={result.definition.definitionId}
                    onClick={() => onSelectResult(result)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      selectedDefinitionId === result.definition.definitionId
                        ? 'bg-muted border-l-2 border-primary'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <FileCode2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs truncate">
                            {highlightMatch(result.definition.definitionName, query)}
                          </span>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {result.definition.definitionType}
                          </Badge>
                        </div>
                        {result.matches.slice(0, 2).map((match, i) => (
                          <div key={i} className="text-[11px] text-muted-foreground">
                            <span className="font-medium capitalize">{match.field}:</span>{' '}
                            {match.lineNumber && (
                              <span className="inline-flex items-center gap-1 text-primary mr-1">
                                <MapPin className="h-3 w-3" />
                                L{match.lineNumber}
                              </span>
                            )}
                            <span className="line-clamp-1">
                              {highlightMatch(match.snippet, query)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
                <Search className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Không tìm thấy kết quả</p>
                <p className="text-xs mt-1">Thử từ khóa khác</p>
              </div>
            ) : query.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
                <Search className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Nhập ít nhất 2 ký tự</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
                <Search className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm text-center">Nhập từ khóa để tìm kiếm trong tên file, SQL queries, và JavaScript code</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
