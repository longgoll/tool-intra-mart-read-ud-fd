import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserCategory, UserDefinition } from '@/lib/types/user-definition.types';
import { indexedDBService } from '@/lib/services/indexeddb.service';
import { searchIndexService } from '@/lib/services/search-index.service';

interface AppContextType {
  // Data state
  isDataLoaded: boolean;
  isIndexing: boolean;
  categories: UserCategory[];

  // Methods
  loadDataFromDB: () => Promise<void>;
  getDefinitionsByCategory: (categoryId: string) => Promise<UserDefinition[]>;
  getDefinition: (definitionId: string) => Promise<UserDefinition | undefined>;
  clearData: () => Promise<void>;

  // Upload state
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;

  // Stats
  stats: {
    definitionCount: number;
    categoryCount: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    definitionCount: 0,
    categoryCount: 0,
  });

  // Initialize: Check if we have data in IndexedDB on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await indexedDBService.init();
        const hasData = await indexedDBService.hasData();

        if (hasData) {
          await loadDataFromDB();
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  /**
   * Load data from IndexedDB
   */
  const loadDataFromDB = async () => {
    try {
      setIsIndexing(true);

      // Load categories
      const cats = await indexedDBService.getCategories();
      setCategories(cats);

      // Build search index
      const allDefinitions = await indexedDBService.getAllDefinitions();
      await searchIndexService.buildIndex(allDefinitions);

      // Update stats
      const count = await indexedDBService.countDefinitions();
      setStats({
        definitionCount: count,
        categoryCount: cats.length,
      });

      setIsDataLoaded(true);
    } catch (error) {
      console.error('Failed to load data from IndexedDB:', error);
      throw error;
    } finally {
      setIsIndexing(false);
    }
  };

  /**
   * Get definitions by category
   */
  const getDefinitionsByCategory = async (categoryId: string): Promise<UserDefinition[]> => {
    return indexedDBService.getDefinitionsByCategory(categoryId);
  };

  /**
   * Get single definition
   */
  const getDefinition = async (definitionId: string): Promise<UserDefinition | undefined> => {
    return indexedDBService.getDefinition(definitionId);
  };

  /**
   * Clear all data
   */
  const clearData = async () => {
    await indexedDBService.clear();
    searchIndexService.clear();
    setCategories([]);
    setStats({ definitionCount: 0, categoryCount: 0 });
    setIsDataLoaded(false);
    setUploadedFile(null);
  };

  return (
    <AppContext.Provider
      value={{
        isDataLoaded,
        isIndexing,
        categories,
        loadDataFromDB,
        getDefinitionsByCategory,
        getDefinition,
        clearData,
        uploadedFile,
        setUploadedFile,
        stats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
