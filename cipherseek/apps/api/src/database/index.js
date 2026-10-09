"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.resetDatabase = resetDatabase;
exports.logAuditEvent = logAuditEvent;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const dbPath = process.env.DB_PATH || path_1.default.join(__dirname, '../../data.json');
let dbInstance;
async function getDb() {
    if (!dbInstance) {
        if (fs_1.default.existsSync(dbPath)) {
            dbInstance = JSON.parse(fs_1.default.readFileSync(dbPath, 'utf-8'));
        }
        else {
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
        run: async (query, ...params) => {
            // Very basic mock
            if (query.startsWith('INSERT INTO documents')) {
                dbInstance.documents.push({ id: params[0], ciphertext: params[1], nonce: params[2], fileName: params[3], createdAt: new Date().toISOString() });
            }
            else if (query.startsWith('INSERT INTO index_tokens')) {
                dbInstance.index_tokens.push({ token: params[0], document_ids: params[1] });
            }
            else if (query.startsWith('UPDATE index_tokens')) {
                const tokenEntry = dbInstance.index_tokens.find(t => t.token === params[1]);
                if (tokenEntry)
                    tokenEntry.document_ids = params[0];
            }
            saveDb();
        },
        get: async (query, ...params) => {
            if (query.startsWith('SELECT document_ids')) {
                return dbInstance.index_tokens.find(t => t.token === params[0]);
            }
            else if (query.startsWith('SELECT * FROM documents')) {
                return dbInstance.documents.find(d => d.id === params[0]);
            }
            return null;
        },
        all: async (query) => {
            if (query.startsWith('SELECT id, fileName, createdAt FROM documents')) {
                return dbInstance.documents;
            }
            else if (query.startsWith('SELECT * FROM audit_events')) {
                return dbInstance.audit_events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
            }
            return [];
        }
    };
}
function saveDb() {
    fs_1.default.writeFileSync(dbPath, JSON.stringify(dbInstance, null, 2));
}
async function resetDatabase() {
    dbInstance = {
        documents: [],
        index_tokens: [],
        audit_events: []
    };
    saveDb();
}
async function logAuditEvent(type, details) {
    if (!dbInstance)
        await getDb();
    dbInstance.audit_events.push({
        id: crypto_1.default.randomUUID(),
        type,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(details)
    });
    saveDb();
}
//# sourceMappingURL=index.js.map