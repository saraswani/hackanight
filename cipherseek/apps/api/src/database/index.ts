import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data.json');

interface DatabaseSchema {
  documents: any[];
  index_tokens: any[];
  audit_events: any[];
}

let dbInstance: DatabaseSchema;

export async function getDb() {
  if (!dbInstance) {
    if (fs.existsSync(dbPath)) {
      dbInstance = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } else {
      dbInstance = {
        documents: [],
        index_tokens: [],
        audit_events: []
      };
      saveDb();
    }
  }
  
  // Provide mock SQLite API
  return {
    run: async (query: string, ...params: any[]) => {
      // Very basic mock
      if (query.startsWith('INSERT INTO documents')) {
        dbInstance.documents.push({ id: params[0], ciphertext: params[1], nonce: params[2], fileName: params[3], createdAt: new Date().toISOString() });
      } else if (query.startsWith('INSERT INTO index_tokens')) {
        dbInstance.index_tokens.push({ token: params[0], document_ids: params[1] });
      } else if (query.startsWith('UPDATE index_tokens')) {
        const tokenEntry = dbInstance.index_tokens.find(t => t.token === params[1]);
        if (tokenEntry) tokenEntry.document_ids = params[0];
      }
      saveDb();
    },
    get: async (query: string, ...params: any[]) => {
      if (query.startsWith('SELECT document_ids')) {
        return dbInstance.index_tokens.find(t => t.token === params[0]);
      } else if (query.startsWith('SELECT * FROM documents')) {
        return dbInstance.documents.find(d => d.id === params[0]);
      }
      return null;
    },
    all: async (query: string) => {
      if (query.startsWith('SELECT id, fileName, createdAt FROM documents')) {
        return dbInstance.documents;
      } else if (query.startsWith('SELECT * FROM audit_events')) {
        return dbInstance.audit_events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
      }
      return [];
    }
  };
}

function saveDb() {
  fs.writeFileSync(dbPath, JSON.stringify(dbInstance, null, 2));
}

export async function resetDatabase() {
  dbInstance = {
    documents: [],
    index_tokens: [],
    audit_events: []
  };
  saveDb();
}

export async function logAuditEvent(type: string, details: any) {
  if (!dbInstance) await getDb();
  dbInstance.audit_events.push({
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    details: JSON.stringify(details)
  });
  saveDb();
}
