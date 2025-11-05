// Types for Intramart Logic Designer user definition structure

export interface UserCategory {
  categoryId: string;
  categoryName: string;
  sortNumber: number;
  iconId: string | null;
  localizes: {
    [locale: string]: {
      locale: string;
      categoryName: string;
    };
  };
  displayName: string;
}

export interface UserDefinitionData {
  elementId: string;
  iconId: string | null;
  elementProperties: {
    query?: string; // For SQL type
    queryType?: string;
    databaseType?: string;
    connectId?: string;
    limitation?: boolean;
    script?: string; // For JavaScript type
  };
  inputDataDefinition?: Record<string, unknown>;
  outputDataDefinition?: Record<string, unknown>;
}

export interface UserDefinition {
  definitionId: string;
  version: number;
  categoryId: string;
  definitionType: 'sql' | 'javascript' | string;
  definitionName: string;
  sortNumber: number;
  definitionData: UserDefinitionData;
  localize: Record<string, string>;
}

export interface UserDefinitionFile {
  userCategories: UserCategory[];
  userDefinitions: string[]; // JSON strings that need to be parsed
}

// Parsed structure for easier usage
export interface ParsedUserDefinition {
  userCategories: UserCategory[];
  userDefinitions: UserDefinition[];
}

// Tree structure for file explorer
export interface FileTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileTreeNode[];
  definition?: UserDefinition; // For file nodes
  category?: UserCategory; // For folder nodes
  expanded?: boolean;
}
