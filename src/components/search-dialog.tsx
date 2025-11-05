import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, FileCode2, Loader2 } from 'lucide-react';
import { searchIndexService } from '@/lib/services/search-index.service';
import type { SearchResult } from '@/lib/services/search-index.service';

interface SearchDialogProps {
  onSelectDefinition: (definitionId: string) => void;
}

export function SearchDialog({ onSelectDefinition }: SearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'sql' | 'javascript'>('all');

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search with debounce
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const definitionType = filterType === 'all' ? undefined : filterType;
        const searchResults = await searchIndexService.search(query, {
          limit: 50,
          definitionType,
        });
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, filterType]);

  const handleSelectResult = (result: SearchResult) => {
    onSelectDefinition(result.definition.definitionId);
    setOpen(false);
    setQuery('');
  };

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Tìm kiếm</span>
          <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Tìm kiếm trong tất cả definitions</DialogTitle>
          <DialogDescription>
            Tìm kiếm trong tên file, SQL queries, và JavaScript code
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nhập từ khóa tìm kiếm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Tất cả
            </Button>
            <Button
              variant={filterType === 'sql' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('sql')}
            >
              SQL
            </Button>
            <Button
              variant={filterType === 'javascript' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('javascript')}
            >
              JavaScript
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="border-t overflow-y-auto max-h-[50vh]">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y">
              {results.map((result) => (
                <button
                  key={result.definition.definitionId}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <FileCode2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {highlightMatch(result.definition.definitionName, query)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {result.definition.definitionType}
                        </Badge>
                      </div>
                      {result.matches.map((match, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          <span className="font-medium capitalize">{match.field}:</span>{' '}
                          <span className="line-clamp-2">
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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Không tìm thấy kết quả</p>
              <p className="text-xs mt-1">Thử từ khóa khác</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nhập ít nhất 2 ký tự để tìm kiếm</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t px-6 py-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Tìm thấy {results.length} kết quả
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
