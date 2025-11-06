/**
 * Search Index Service using FlexSearch
 * Provides fast full-text search across all user definitions
 * Can search in definition names, content (SQL queries, JS scripts)
 */

import { Document } from 'flexsearch';
import type { UserDefinition } from '../types/user-definition.types';
import { extractDefinitionContent } from '../user-definition-parser';

export interface SearchResult {
  definition: UserDefinition;
  matches: {
    field: 'definitionName' | 'content';
    snippet: string;
    lineNumber?: number; // Line number where match was found
    column?: number; // Column number where match starts
    matchLength?: number; // Length of the matched text
  }[];
  score: number;
}

interface SearchDocument {
  definitionId: string;
  definitionName: string;
  content: string;
  categoryId: string;
  definitionType: string;
  [key: string]: string; // Index signature for FlexSearch
}

/**
 * Search Index Service
 * Singleton pattern for managing search index
 */
class SearchIndexService {
  private index: Document<SearchDocument> | null = null;
  private definitionsMap: Map<string, UserDefinition> = new Map();
  private isIndexed = false;

  /**
   * Initialize the search index
   */
  private initIndex() {
    if (this.index) return;

    this.index = new Document<SearchDocument>({
      document: {
        id: 'definitionId',
        index: [
          'definitionName',
          'content',
          'categoryId',
          'definitionType'
        ],
        store: true,
      },
      tokenize: 'full',
      resolution: 9,
      context: {
        depth: 2,
        bidirectional: true,
        resolution: 9,
      },
    });
  }

  /**
   * Build search index from definitions
   * This should be called after loading data from IndexedDB
   */
  async buildIndex(definitions: UserDefinition[]): Promise<void> {
    this.initIndex();
    this.definitionsMap.clear();

    // Add each definition to the index
    for (const definition of definitions) {
      const content = extractDefinitionContent(definition);

      // Store definition in map for quick lookup
      this.definitionsMap.set(definition.definitionId, definition);

      // Add to search index
      const doc: SearchDocument = {
        definitionId: definition.definitionId,
        definitionName: definition.definitionName,
        content,
        categoryId: definition.categoryId,
        definitionType: definition.definitionType,
      };
      await this.index!.addAsync(doc);
    }

    this.isIndexed = true;
  }

  /**
   * Search in the index
   * Returns results sorted by relevance
   */
  async search(
    query: string,
    options: {
      limit?: number;
      fields?: ('definitionName' | 'content')[];
      definitionType?: 'sql' | 'javascript';
      categoryId?: string;
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.index || !this.isIndexed) {
      throw new Error('Search index not initialized. Call buildIndex first.');
    }

    const { limit = 50, fields, definitionType, categoryId } = options;

    // Perform search
    const searchFields = fields || ['definitionName', 'content'];
    const results = await this.index.searchAsync(query, limit, {
      index: searchFields,
      enrich: true,
    });

    // Process and format results
    const formattedResults: SearchResult[] = [];
    const seenIds = new Set<string>();

    for (const fieldResult of results) {
      const field = fieldResult.field as 'definitionName' | 'content';

      for (const item of fieldResult.result) {
        const definitionId = String(item.id);

        // Skip if already added
        if (seenIds.has(definitionId)) continue;

        const definition = this.definitionsMap.get(definitionId);
        if (!definition) continue;

        // Filter by definition type if specified
        if (definitionType && definition.definitionType !== definitionType) {
          continue;
        }

        // Filter by category if specified
        if (categoryId && definition.categoryId !== categoryId) {
          continue;
        }

        seenIds.add(definitionId);

        // Create snippet for the match
        const content = field === 'content'
          ? extractDefinitionContent(definition)
          : definition.definitionName;

        const matchInfo = this.createSnippetWithPosition(content, query);

        formattedResults.push({
          definition,
          matches: [
            {
              field,
              snippet: matchInfo.snippet,
              lineNumber: matchInfo.lineNumber,
              column: matchInfo.column,
              matchLength: query.length,
            },
          ],
          score: 1, // FlexSearch doesn't provide scores directly
        });
      }
    }

    return formattedResults;
  }

  /**
   * Create a text snippet around the search match with position info
   */
  private createSnippetWithPosition(
    text: string,
    query: string,
    contextLength: number = 100
  ): {
    snippet: string;
    lineNumber?: number;
    column?: number;
  } {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return {
        snippet: text.substring(0, contextLength) + '...',
      };
    }

    // Calculate line number and column
    const textBeforeMatch = text.substring(0, index);
    const lines = textBeforeMatch.split('\n');
    const lineNumber = lines.length;
    const column = lines[lines.length - 1].length + 1;

    // Create snippet
    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(text.length, index + query.length + contextLength / 2);

    let snippet = text.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return {
      snippet,
      lineNumber,
      column,
    };
  }

  /**
   * Search only in definition names
   * Faster than full search
   */
  async searchNames(query: string, limit: number = 50): Promise<UserDefinition[]> {
    if (!this.index || !this.isIndexed) {
      throw new Error('Search index not initialized. Call buildIndex first.');
    }

    const results = await this.index.searchAsync(query, limit, {
      index: ['definitionName'],
      enrich: true,
    });

    const definitions: UserDefinition[] = [];

    for (const fieldResult of results) {
      for (const item of fieldResult.result) {
        const definition = this.definitionsMap.get(String(item.id));
        if (definition) {
          definitions.push(definition);
        }
      }
    }

    return definitions;
  }

  /**
   * Search only in content (SQL queries, JS scripts)
   */
  async searchContent(
    query: string,
    definitionType?: 'sql' | 'javascript',
    limit: number = 50
  ): Promise<SearchResult[]> {
    return this.search(query, {
      limit,
      fields: ['content'],
      definitionType,
    });
  }

  /**
   * Clear the index
   */
  clear() {
    this.index = null;
    this.definitionsMap.clear();
    this.isIndexed = false;
  }

  /**
   * Check if index is ready
   */
  isReady(): boolean {
    return this.isIndexed;
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      isIndexed: this.isIndexed,
      definitionsCount: this.definitionsMap.size,
    };
  }
}

// Export singleton instance
export const searchIndexService = new SearchIndexService();
