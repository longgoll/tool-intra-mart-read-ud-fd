import JSZip from 'jszip';
import type {
  FileTreeNode,
  ParsedUserDefinition,
  UserCategory,
  UserDefinition,
  UserDefinitionFile,
} from './types/user-definition.types';

/**
 * Parse user definition JSON file
 */
export function parseUserDefinitionFile(
  content: string
): ParsedUserDefinition {
  const data: UserDefinitionFile = JSON.parse(content);

  // Parse userDefinitions from JSON strings
  const userDefinitions: UserDefinition[] = data.userDefinitions.map((def) =>
    JSON.parse(def)
  );

  return {
    userCategories: data.userCategories,
    userDefinitions,
  };
}

/**
 * Build file tree structure from parsed user definitions
 */
export function buildFileTree(
  parsed: ParsedUserDefinition
): FileTreeNode[] {
  const { userCategories, userDefinitions } = parsed;

  // Create a map of categories for quick lookup
  const categoryMap = new Map<string, UserCategory>();
  userCategories.forEach((cat) => {
    categoryMap.set(cat.categoryId, cat);
  });

  // Build tree structure
  const tree: FileTreeNode[] = [];

  // Group definitions by category
  const definitionsByCategory = new Map<string, UserDefinition[]>();
  userDefinitions.forEach((def) => {
    if (!definitionsByCategory.has(def.categoryId)) {
      definitionsByCategory.set(def.categoryId, []);
    }
    definitionsByCategory.get(def.categoryId)!.push(def);
  });

  // Create folder nodes for each category
  userCategories.forEach((category) => {
    const definitions = definitionsByCategory.get(category.categoryId) || [];

    // Sort definitions by sortNumber
    definitions.sort((a, b) => a.sortNumber - b.sortNumber);

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
  });

  return tree;
}

/**
 * Get file extension based on definition type
 */
export function getFileExtension(definitionType: string): string {
  switch (definitionType.toLowerCase()) {
    case 'sql':
      return '.sql';
    case 'javascript':
    case 'js':
      return '.js';
    default:
      return '.txt';
  }
}

/**
 * Get Monaco editor language based on definition type
 */
export function getEditorLanguage(definitionType: string): string {
  switch (definitionType.toLowerCase()) {
    case 'sql':
      return 'sql';
    case 'javascript':
    case 'js':
      return 'javascript';
    default:
      return 'plaintext';
  }
}

/**
 * Extract content from user definition
 */
export function extractDefinitionContent(definition: UserDefinition): string {
  const { definitionType, definitionData } = definition;

  if (definitionType === 'sql' && definitionData.elementProperties.query) {
    return definitionData.elementProperties.query;
  }

  if (
    definitionType === 'javascript' &&
    definitionData.elementProperties.script
  ) {
    return definitionData.elementProperties.script;
  }

  // Fallback: return stringified definition data
  return JSON.stringify(definitionData, null, 2);
}

/**
 * Read ZIP file and extract user_definition.json
 */
export async function readZipFile(file: File): Promise<ParsedUserDefinition> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  // Find user_definition.json file
  const userDefFile = zipContent.file('user_definition.json');

  if (!userDefFile) {
    throw new Error(
      'Không tìm thấy file user_definition.json trong file ZIP'
    );
  }

  // Read file content
  const content = await userDefFile.async('string');

  // Parse and return
  return parseUserDefinitionFile(content);
}

/**
 * Search in file tree
 */
export function searchInTree(
  tree: FileTreeNode[],
  searchTerm: string
): FileTreeNode[] {
  const lowerSearch = searchTerm.toLowerCase();

  function filterNode(node: FileTreeNode): FileTreeNode | null {
    const nameMatches = node.name.toLowerCase().includes(lowerSearch);

    if (node.type === 'file') {
      return nameMatches ? node : null;
    }

    // For folders, check if any children match
    const filteredChildren = node.children
      ?.map(filterNode)
      .filter((n): n is FileTreeNode => n !== null);

    if (filteredChildren && filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        expanded: true, // Auto-expand folders with matches
      };
    }

    return nameMatches ? node : null;
  }

  return tree.map(filterNode).filter((n): n is FileTreeNode => n !== null);
}
