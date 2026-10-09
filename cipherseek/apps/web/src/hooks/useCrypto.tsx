import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { generateKeyMaterial } from "../crypto";

interface CryptoContextType {
  documentKey: CryptoKey | null;
  searchKey: CryptoKey | null;
  isInitialized: boolean;
  initializeKeys: () => Promise<void>;
  resetKeys: () => void;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [documentKey, setDocumentKey] = useState<CryptoKey | null>(null);
  const [searchKey, setSearchKey] = useState<CryptoKey | null>(null);

  const initializeKeys = async () => {
    try {
      const keys = await generateKeyMaterial();
      setDocumentKey(keys.documentKey);
      setSearchKey(keys.searchKey);
    } catch (e) {
      console.error("Failed to initialize keys", e);
    }
  };

  const resetKeys = () => {
    setDocumentKey(null);
    setSearchKey(null);
  };

  return (
    <CryptoContext.Provider
      value={{
        documentKey,
        searchKey,
        isInitialized: !!documentKey && !!searchKey,
        initializeKeys,
        resetKeys,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error("useCrypto must be used within a CryptoProvider");
  }
  return context;
}
