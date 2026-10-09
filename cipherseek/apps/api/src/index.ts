import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pino } from "pino";
import { getDb, logAuditEvent, resetDatabase } from "./database";
import { uploadRequestSchema, searchRequestSchema } from "shared";

const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
  },
  redact: ["req.headers.authorization", "body.document.ciphertext"],
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

app.get("/api/health", async (req, res) => {
  try {
    await getDb(); // Ensure DB is initialized
    res.json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/documents", async (req, res) => {
  try {
    const { document, indexUpdates } = uploadRequestSchema.parse(req.body);
    const db = await getDb();
    
    await db.run("BEGIN TRANSACTION");
    try {
      await db.run(
        "INSERT INTO documents (id, ciphertext, nonce, fileName) VALUES (?, ?, ?, ?)",
        document.id, document.ciphertext, document.nonce, document.fileName
      );

      for (const [token, ids] of Object.entries(indexUpdates)) {
        const existing = await db.get("SELECT document_ids FROM index_tokens WHERE token = ?", token);
        let newIds = new Set(ids);
        if (existing) {
          const existingIds = JSON.parse(existing.document_ids) as string[];
          existingIds.forEach((id) => newIds.add(id));
          await db.run("UPDATE index_tokens SET document_ids = ? WHERE token = ?", JSON.stringify(Array.from(newIds).sort()), token);
        } else {
          await db.run("INSERT INTO index_tokens (token, document_ids) VALUES (?, ?)", token, JSON.stringify(Array.from(newIds).sort()));
        }
      }
      await db.run("COMMIT");
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }

    await logAuditEvent("UPLOAD", {
      documentId: document.id,
      fileName: document.fileName,
      ciphertextLength: document.ciphertext.length,
      tokensUpdated: Object.keys(indexUpdates).length,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Upload failed");
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/documents", async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db.all("SELECT id, fileName, createdAt FROM documents");
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

let activeAttack: string | null = null;

app.get("/api/documents/:id", async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db.get("SELECT * FROM documents WHERE id = ?", req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Not found" });
    }

    if (activeAttack === "CORRUPT_CIPHERTEXT") {
      doc.ciphertext = doc.ciphertext.substring(0, doc.ciphertext.length - 10) + "CORRUPTED1";
      await logAuditEvent("ATTACK_EXECUTED", { type: activeAttack, documentId: req.params.id });
    }

    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/search", async (req, res) => {
  const start = Date.now();
  try {
    const { tokens, operator } = searchRequestSchema.parse(req.body);
    const db = await getDb();
    const results: Record<string, string[]> = {};
    
    for (const token of tokens) {
      const row = await db.get("SELECT document_ids FROM index_tokens WHERE token = ?", token);
      let ids = row ? (JSON.parse(row.document_ids) as string[]) : [];

      if (activeAttack && ids.length > 0) {
        if (activeAttack === "OMIT_RESULT") {
          ids.pop();
          await logAuditEvent("ATTACK_EXECUTED", { type: activeAttack, token });
        } else if (activeAttack === "MODIFY_RESULT") {
          ids[0] = "tampered-id-12345";
          await logAuditEvent("ATTACK_EXECUTED", { type: activeAttack, token });
        } else if (activeAttack === "ADD_FABRICATED") {
          ids.push("fabricated-id-99999");
          await logAuditEvent("ATTACK_EXECUTED", { type: activeAttack, token });
        } else if (activeAttack === "STALE_LIST") {
          ids = [];
          await logAuditEvent("ATTACK_EXECUTED", { type: activeAttack, token });
        }
      }
      
      results[token] = ids.sort();
    }

    const durationMs = Date.now() - start;

    await logAuditEvent("SEARCH", {
      tokensQueried: tokens.length,
      resultsCount: Object.values(results).flat().length,
      durationMs,
    });

    res.json({ results, durationMs });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/audit", async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all("SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT 100");
    // Parse details back to JSON object for the frontend
    const parsed = events.map(e => ({ ...e, details: JSON.parse(e.details) }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/demo/reset", async (req, res) => {
  try {
    await resetDatabase();
    activeAttack = null;
    await logAuditEvent("DEMO_RESET", {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/demo/attack", async (req, res) => {
  try {
    const { attackType } = req.body;
    activeAttack = attackType;
    await logAuditEvent("ATTACK_SIMULATION_ENABLED", { attackType });
    res.json({ success: true, activeAttack });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
// Initialize DB and then start server
getDb().then(() => {
  app.listen(PORT, () => {
    logger.info(`API server running on port ${PORT}`);
  });
}).catch(err => {
  logger.error(err, "Failed to initialize database");
  process.exit(1);
});
