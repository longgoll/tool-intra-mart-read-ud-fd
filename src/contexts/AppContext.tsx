import { createContext, useContext, useState, ReactNode } from 'react';
import { ParsedUserDefinition } from '@/lib/types/user-definition.types';

interface AppContextType {
  parsedData: ParsedUserDefinition | null;
  setParsedData: (data: ParsedUserDefinition | null) => void;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [parsedData, setParsedData] = useState<ParsedUserDefinition | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  return (
    <AppContext.Provider
      value={{
        parsedData,
        setParsedData,
        uploadedFile,
        setUploadedFile,
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
