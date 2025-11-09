import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
// Adjust these imports to match the actual package / path you're using.
// If using the local TS Memory class, import from its path. If using an npm package, use that package name.
import { Memory } from "mem0ai/oss";
import MemoryClient from "mem0ai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const mem0ApiKey = process.env.MEM0_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const qdrantHost = process.env.QDRANT_HOST || "localhost";
const qdrantPort = process.env.QDRANT_PORT ? Number(process.env.QDRANT_PORT) : 6333;
const qdrantApiKey = process.env.QDRANT_API_KEY || "";

console.log("\n========== MEM0 SERVER INITIALIZATION ==========");
console.log(`Qdrant: ${qdrantHost}:${qdrantPort}`);
console.log(`OpenAI API Key: ${openaiApiKey ? "✓ configured" : "✗ NOT configured"}`);
console.log(`Mem0 API Key: ${mem0ApiKey ? "✓ configured" : "✗ using OSS mode"}`);

let mem0Client: any = null;

// if (mem0ApiKey) {
//     try {
//         mem0Client = new MemoryClient({ apiKey: mem0ApiKey });
//         console.log("✓ mem0 API client initialized");
//     } catch (err) {
//         console.error("✗ Failed to initialize mem0 API client:", err);
//         mem0Client = null;
//     }
// } 

// else {
try {
    const QDRANT_URL = `http://${qdrantHost}:${qdrantPort}`;
    console.log("Initializing mem0 OSS with Qdrant...");
    mem0Client = new Memory({
        version: "v1.1",
        embedder: {
            provider: "openai",
            config: {
                apiKey: openaiApiKey || "",
                model: "text-embedding-3-small",
            },
        },
        vectorStore: {
            provider: "qdrant",
            config: {
                // include both keys to match different factory/adapter expectations
                collectionName: "memories",
                vectorSize: 1536,
                embeddingModelDims: 1536,
                apiKey: qdrantApiKey,
                host: qdrantHost,
                port: qdrantPort,
                distance: "Cosine",
            },
        },
        llm: {
            provider: "openai",
            config: {
                apiKey: openaiApiKey || "",
                model: "gpt-4.1-nano",
            },
        },
        historyDbPath: "memory.db",
    });
    console.log(`✓ mem0 OSS initialized with Qdrant at ${qdrantHost}:${qdrantPort}`);
} catch (err) {
    console.error("✗ Failed to initialize mem0 OSS client:", err);
    mem0Client = null;
}
console.log("=============================================\n");

function requireClient(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!mem0Client) return res.status(503).json({ error: "mem0 not configured on server" });
    next();
}

const DEFAULT_USER_ID = "default-user";

function logMem0(action: string, details: any) {
    const timestamp = new Date().toISOString();
    console.log(`[MEM0 ${timestamp}] ${action}:`, details);
}

// POST /api/mem0/add
app.post("/api/mem0/add", requireClient, async (req: express.Request, res: express.Response) => {
    const { items, opts } = req.body || {};
    // Accept both snake_case and camelCase from callers
    const incomingOpts = opts || {};
    logMem0("ADD_REQUEST", { itemCount: items?.length, userId: incomingOpts?.userId ?? incomingOpts?.user_id });

    if (!Array.isArray(items)) {
        logMem0("ADD_ERROR", "items must be an array");
        return res.status(400).json({ error: "items must be an array" });
    }

    try {
        const userId = incomingOpts?.userId ?? incomingOpts?.user_id ?? DEFAULT_USER_ID;
        const agentId = incomingOpts?.agentId ?? incomingOpts?.agent_id;
        const runId = incomingOpts?.runId ?? incomingOpts?.run_id;
        const metadata = incomingOpts?.metadata ?? incomingOpts?.meta ?? {};
        const infer = incomingOpts?.infer ?? true;

        console.log("\n========== MEM0 ADD OPERATION ==========");
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`User ID: ${userId}`);
        console.log(`Item count: ${items.length}`);
        console.log(`Raw items:`, JSON.stringify(items, null, 2));

        const messages = items.map((item: any) => {
            const content = typeof item === "string" ? item : item.memory ?? item.content ?? JSON.stringify(item);
            return { role: "user", content };
        });

        console.log(`Messages to add:`, JSON.stringify(messages, null, 2));
        const addConfig: any = { userId, metadata, infer: true };
        if (agentId) addConfig.agentId = agentId;
        if (runId) addConfig.runId = runId;

        console.log(`Add config being passed to mem0Client.add():`, JSON.stringify(addConfig, null, 2));
        logMem0("ADD_START", { userId, itemCount: messages.length, firstItem: messages[0]?.content?.substring?.(0, 100) });

        // <-- IMPORTANT: pass the config as second arg
        const result = await mem0Client.add(messages, addConfig);

        console.log(`Add operation result:`, JSON.stringify(result, null, 2));
        logMem0("ADD_SUCCESS", {
            userId,
            itemCount: messages.length,
            resultCount: result?.results?.length ?? 0,
            fullResult: JSON.stringify(result).substring(0, 500),
        });

        // Fetch all memories to verify the addition
        console.log(`\nFetching all memories for user ${userId}...`);
        const allMemories = await mem0Client.getAll({ userId });
        console.log(`Total memories in database: ${allMemories?.results?.length || 0}`);
        console.log(`All memories:`, JSON.stringify(allMemories, null, 2));
        console.log("========== END MEM0 ADD OPERATION ==========\n");

        res.json({ success: true, result, allMemories });
    } catch (err) {
        console.log(`\n========== MEM0 ADD ERROR ==========`);

        console.log(`Error type: ${err instanceof Error ? err.constructor.name : typeof err}`);
        console.log(`Error message: ${String(err)}`);
        if (err instanceof Error) {
            console.log(`Stack trace:`, err.stack);
        }
        console.log("========== END MEM0 ADD ERROR ==========\n");
        logMem0("ADD_ERROR", { error: String(err), stack: err instanceof Error ? err.stack : "unknown" });
        res.status(500).json({ success: false, error: String(err) });
    }
});

// GET /api/mem0/search?query=...&user_id=...&limit=10
app.get("/api/mem0/search", requireClient, async (req: express.Request, res: express.Response) => {
    const { query, user_id, limit } = req.query as any;
    const userId = (req.query as any).userId ?? user_id ?? DEFAULT_USER_ID;
    logMem0("SEARCH_REQUEST", { query: (String(query || "")).slice(0, 100), userId, limit });

    if (!query) {
        logMem0("SEARCH_ERROR", "query is required");
        return res.status(400).json({ error: "query is required" });
    }

    try {
        logMem0("SEARCH_START", { userId, query: String(query).substring(0, 100), limit });

        const result = await mem0Client.search(String(query), { userId, limit: limit ? Number(limit) : undefined });

        logMem0("SEARCH_SUCCESS", { userId, resultCount: result?.results?.length || 0, total: result?.total });
        res.json({ success: true, result });
    } catch (err) {
        logMem0("SEARCH_ERROR", { error: String(err) });
        res.status(500).json({ success: false, error: String(err) });
    }
});

// GET /api/mem0/get_all?user_id=...
app.get("/api/mem0/get_all", requireClient, async (req: express.Request, res: express.Response) => {
    const { user_id } = req.query as any;
    const userId = (req.query as any).userId ?? user_id ?? DEFAULT_USER_ID;
    logMem0("GET_ALL_REQUEST", { userId });

    try {
        logMem0("GET_ALL_START", { userId });

        const result = await mem0Client.getAll({ userId });

        logMem0("GET_ALL_SUCCESS", {
            userId,
            resultCount: result?.results?.length || 0,
            total: result?.total,
            fullResult: JSON.stringify(result).substring(0, 300),
        });
        res.json({ success: true, result });
    } catch (err) {
        logMem0("GET_ALL_ERROR", { error: String(err), stack: err instanceof Error ? err.stack : "unknown" });
        res.status(500).json({ success: false, error: String(err) });
    }
});

// DELETE /api/mem0/:id
app.delete("/api/mem0/:id", requireClient, async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    logMem0("DELETE_REQUEST", { id });

    if (!id) {
        logMem0("DELETE_ERROR", "id required");
        return res.status(400).json({ error: "id required" });
    }

    try {
        logMem0("DELETE_START", { id });
        const result = await mem0Client.delete(id);

        logMem0("DELETE_SUCCESS", { id });
        res.json({ success: true, result });
    } catch (err) {
        logMem0("DELETE_ERROR", { id, error: String(err) });
        res.status(500).json({ success: false, error: String(err) });
    }
});

// Simple health check
app.get("/api/mem0/health", (_req: express.Request, res: express.Response) => {
    const isHealthy = Boolean(mem0Client);
    logMem0("HEALTH_CHECK", { healthy: isHealthy });
    res.json({ ok: isHealthy });
});

if (require.main === module) {
    const port = process.env.PORT ? Number(process.env.PORT) : 8787;
    app.listen(port, () => {
        console.log(`mem0 proxy running on http://localhost:${port}`);
    });
}

export default app;
