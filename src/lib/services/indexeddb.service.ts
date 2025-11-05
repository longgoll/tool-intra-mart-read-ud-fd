import type {
  UserDefinition,
  UserCategory,
  ParsedUserDefinition
} from '../types/user-definition.types';

const DB_NAME = 'LogicDesignerDB';
const DB_VERSION = 1;

const STORES = {
  DEFINITIONS: 'definitions',
  CATEGORIES: 'categories',
  METADATA: 'metadata',
} as const;

/**
 * IndexedDB Service for storing and querying user definitions
 * Optimized for handling large datasets (2000+ definitions)
 */
class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for user definitions
        if (!db.objectStoreNames.contains(STORES.DEFINITIONS)) {
          const defStore = db.createObjectStore(STORES.DEFINITIONS, {
            keyPath: 'definitionId',
          });
          // Indexes for fast querying
          defStore.createIndex('categoryId', 'categoryId', { unique: false });
          defStore.createIndex('definitionType', 'definitionType', { unique: false });
          defStore.createIndex('definitionName', 'definitionName', { unique: false });
          defStore.createIndex('sortNumber', 'sortNumber', { unique: false });
        }

        // Store for categories
        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          db.createObjectStore(STORES.CATEGORIES, {
            keyPath: 'categoryId',
          });
        }

        // Store for metadata (counts, timestamps, etc.)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Clear all data from the database
   */
  async clear(): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction(
      [STORES.DEFINITIONS, STORES.CATEGORIES, STORES.METADATA],
      'readwrite'
    );

    await Promise.all([
      this.clearStore(transaction, STORES.DEFINITIONS),
      this.clearStore(transaction, STORES.CATEGORIES),
      this.clearStore(transaction, STORES.METADATA),
    ]);
  }

  private clearStore(transaction: IDBTransaction, storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = transaction.objectStore(storeName).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save parsed data to IndexedDB
   * Optimized for bulk insert of large datasets
   */
  async saveParsedData(data: ParsedUserDefinition): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction(
      [STORES.DEFINITIONS, STORES.CATEGORIES, STORES.METADATA],
      'readwrite'
    );

    // Save categories
    const categoryStore = transaction.objectStore(STORES.CATEGORIES);
    for (const category of data.userCategories) {
      categoryStore.put(category);
    }

    // Save definitions (batch insert)
    const defStore = transaction.objectStore(STORES.DEFINITIONS);
    for (const definition of data.userDefinitions) {
      defStore.put(definition);
    }

    // Save metadata
    const metadataStore = transaction.objectStore(STORES.METADATA);
    metadataStore.put({
      key: 'lastUpdated',
      value: new Date().toISOString(),
    });
    metadataStore.put({
      key: 'definitionCount',
      value: data.userDefinitions.length,
    });
    metadataStore.put({
      key: 'categoryCount',
      value: data.userCategories.length,
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<UserCategory[]> {
    const db = await this.init();
    const transaction = db.transaction(STORES.CATEGORIES, 'readonly');
    const store = transaction.objectStore(STORES.CATEGORIES);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get definitions by category ID
   * Optimized with index
   */
  async getDefinitionsByCategory(categoryId: string): Promise<UserDefinition[]> {
    const db = await this.init();
    const transaction = db.transaction(STORES.DEFINITIONS, 'readonly');
    const store = transaction.objectStore(STORES.DEFINITIONS);
    const index = store.index('categoryId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(categoryId);
      request.onsuccess = () => {
        // Sort by sortNumber
        const results = request.result.sort((a, b) => a.sortNumber - b.sortNumber);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get single definition by ID
   */
  async getDefinition(definitionId: string): Promise<UserDefinition | undefined> {
    const db = await this.init();
    const transaction = db.transaction(STORES.DEFINITIONS, 'readonly');
    const store = transaction.objectStore(STORES.DEFINITIONS);

    return new Promise((resolve, reject) => {
      const request = store.get(definitionId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all definitions (use with caution for large datasets)
   * Consider using pagination instead
   */
  async getAllDefinitions(): Promise<UserDefinition[]> {
    const db = await this.init();
    const transaction = db.transaction(STORES.DEFINITIONS, 'readonly');
    const store = transaction.objectStore(STORES.DEFINITIONS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get paginated definitions
   * Better for large datasets
   */
  async getDefinitionsPaginated(
    offset: number = 0,
    limit: number = 100
  ): Promise<UserDefinition[]> {
    const db = await this.init();
    const transaction = db.transaction(STORES.DEFINITIONS, 'readonly');
    const store = transaction.objectStore(STORES.DEFINITIONS);

    return new Promise((resolve, reject) => {
      const results: UserDefinition[] = [];
      let cursor: IDBRequest<IDBCursorWithValue | null>;

      if (offset > 0) {
        cursor = store.openCursor();
        let skipped = 0;
        cursor.onsuccess = (event) => {
          const c = (event.target as IDBRequest).result;
          if (!c) {
            resolve(results);
            return;
          }
          if (skipped < offset) {
            skipped++;
            c.continue();
          } else if (results.length < limit) {
            results.push(c.value);
            c.continue();
          } else {
            resolve(results);
          }
        };
      } else {
        cursor = store.openCursor();
        cursor.onsuccess = (event) => {
          const c = (event.target as IDBRequest).result;
          if (c && results.length < limit) {
            results.push(c.value);
            c.continue();
          } else {
            resolve(results);
          }
        };
      }

      cursor.onerror = () => reject(cursor.error);
    });
  }

  /**
   * Count total definitions
   */
  async countDefinitions(): Promise<number> {
    const db = await this.init();
    const transaction = db.transaction(STORES.DEFINITIONS, 'readonly');
    const store = transaction.objectStore(STORES.DEFINITIONS);

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata
   */
  async getMetadata(key: string): Promise<any> {
    const db = await this.init();
    const transaction = db.transaction(STORES.METADATA, 'readonly');
    const store = transaction.objectStore(STORES.METADATA);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if database has data
   */
  async hasData(): Promise<boolean> {
    try {
      const count = await this.countDefinitions();
      return count > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
