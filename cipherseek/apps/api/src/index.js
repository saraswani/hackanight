"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = require("pino");
const database_1 = require("./database");
const shared_1 = require("shared");
const logger = (0, pino_1.pino)({
    level: "info",
    transport: {
        target: "pino-pretty",
    },
    redact: ["req.headers.authorization", "body.document.ciphertext"],
});
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "50mb" }));
app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url }, "Incoming request");
    next();
});
app.get("/api/health", async (req, res) => {
    try {
        await (0, database_1.getDb)(); // Ensure DB is initialized
        res.json({ status: "ok" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/api/documents", async (req, res) => {
    try {
        const { document, indexUpdates } = shared_1.uploadRequestSchema.parse(req.body);
        const db = await (0, database_1.getDb)();
        await db.run("BEGIN TRANSACTION");
        try {
            await db.run("INSERT INTO documents (id, ciphertext, nonce) VALUES (?, ?, ?)", document.id, document.ciphertext, document.nonce);
            for (const [token, ids] of Object.entries(indexUpdates)) {
                const existing = await db.get("SELECT document_ids FROM index_tokens WHERE token = ?", token);
                let newIds = new Set(ids);
                if (existing) {
                    const existingIds = JSON.parse(existing.document_ids);
                    existingIds.forEach((id) => newIds.add(id));
                    await db.run("UPDATE index_tokens SET document_ids = ? WHERE token = ?", JSON.stringify(Array.from(newIds).sort()), token);
                }
                else {
                    await db.run("INSERT INTO index_tokens (token, document_ids) VALUES (?, ?)", token, JSON.stringify(Array.from(newIds).sort()));
                }
            }
            await db.run("COMMIT");
        }
        catch (err) {
            await db.run("ROLLBACK");
            throw err;
        }
        await (0, database_1.logAuditEvent)("UPLOAD", {
            documentId: document.id,
            ciphertextLength: document.ciphertext.length,
            tokensUpdated: Object.keys(indexUpdates).length,
        });
        res.status(201).json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "Upload failed");
        res.status(400).json({ error: err.message });
    }
});
app.get("/api/documents", async (req, res) => {
    try {
        const db = await (0, database_1.getDb)();
        const docs = await db.all("SELECT id, createdAt FROM documents");
        res.json(docs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
let activeAttack = null;
app.get("/api/documents/:id", async (req, res) => {
    try {
        const db = await (0, database_1.getDb)();
        const doc = await db.get("SELECT * FROM documents WHERE id = ?", req.params.id);
        if (!doc) {
            return res.status(404).json({ error: "Not found" });
        }
        if (activeAttack === "CORRUPT_CIPHERTEXT") {
            doc.ciphertext = doc.ciphertext.substring(0, doc.ciphertext.length - 10) + "CORRUPTED1";
            await (0, database_1.logAuditEvent)("ATTACK_EXECUTED", { type: activeAttack, documentId: req.params.id });
        }
        res.json(doc);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/api/search", async (req, res) => {
    const start = Date.now();
    try {
        const { tokens, operator } = shared_1.searchRequestSchema.parse(req.body);
        const db = await (0, database_1.getDb)();
        const results = {};
        for (const token of tokens) {
            const row = await db.get("SELECT document_ids FROM index_tokens WHERE token = ?", token);
            let ids = row ? JSON.parse(row.document_ids) : [];
            if (activeAttack && ids.length > 0) {
                if (activeAttack === "OMIT_RESULT") {
                    ids.pop();
                    await (0, database_1.logAuditEvent)("ATTACK_EXECUTED", { type: activeAttack, token });
                }
                else if (activeAttack === "MODIFY_RESULT") {
                    ids[0] = "tampered-id-12345";
                    await (0, database_1.logAuditEvent)("ATTACK_EXECUTED", { type: activeAttack, token });
                }
                else if (activeAttack === "ADD_FABRICATED") {
                    ids.push("fabricated-id-99999");
                    await (0, database_1.logAuditEvent)("ATTACK_EXECUTED", { type: activeAttack, token });
                }
                else if (activeAttack === "STALE_LIST") {
                    ids = [];
                    await (0, database_1.logAuditEvent)("ATTACK_EXECUTED", { type: activeAttack, token });
                }
            }
            results[token] = ids.sort();
        }
        let finalIds = [];
        if (tokens.length > 0) {
            if (operator === "AND" || operator === "EXACT") {
                finalIds = results[tokens[0]];
                for (let i = 1; i < tokens.length; i++) {
                    finalIds = finalIds.filter(id => results[tokens[i]].includes(id));
                }
            }
            else if (operator === "OR") {
                const all = new Set();
                for (const token of tokens) {
                    results[token].forEach(id => all.add(id));
                }
                finalIds = Array.from(all).sort();
            }
        }
        const durationMs = Date.now() - start;
        await (0, database_1.logAuditEvent)("SEARCH", {
            tokensQueried: tokens.length,
            operator,
            resultsCount: Object.values(results).flat().length,
            durationMs,
        });
        res.json({ results, finalIds, durationMs });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.get("/api/audit", async (req, res) => {
    try {
        const db = await (0, database_1.getDb)();
        const events = await db.all("SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT 100");
        // Parse details back to JSON object for the frontend
        const parsed = events.map(e => ({ ...e, details: JSON.parse(e.details) }));
        res.json(parsed);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/api/demo/reset", async (req, res) => {
    try {
        await (0, database_1.resetDatabase)();
        activeAttack = null;
        await (0, database_1.logAuditEvent)("DEMO_RESET", {});
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/api/demo/attack", async (req, res) => {
    try {
        const { attackType } = req.body;
        activeAttack = attackType;
        await (0, database_1.logAuditEvent)("ATTACK_SIMULATION_ENABLED", { attackType });
        res.json({ success: true, activeAttack });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const PORT = process.env.PORT || 3001;
// Initialize DB and then start server
(0, database_1.getDb)().then(() => {
    app.listen(PORT, () => {
        logger.info(`API server running on port ${PORT}`);
    });
}).catch(err => {
    logger.error(err, "Failed to initialize database");
    process.exit(1);
});
//# sourceMappingURL=index.js.map