const mem0ProxyUrl = import.meta.env.VITE_MEM0_PROXY_URL || 'http://localhost:8787';

// Browser-side proxy client that calls the backend mem0 server.
// The backend (mem0Server.ts) handles actual mem0 operations.
let mem0Client: any = null;

mem0Client = {
    async add(items: any, opts: any = {}) {
        const resp = await fetch(`${mem0ProxyUrl}/api/mem0/add`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ items, opts }) 
        });
        return resp.json();
    },
    async search(query: string, opts: any = {}) {
        const params = new URLSearchParams({ query: String(query) });
        if (opts?.user_id) params.set('user_id', opts.user_id);
        if (opts?.limit) params.set('limit', String(opts.limit));
        const resp = await fetch(`${mem0ProxyUrl}/api/mem0/search?${params.toString()}`);
        return resp.json();
    },
    async get_all(opts: any = {}) {
        const params = new URLSearchParams();
        if (opts?.user_id) params.set('user_id', opts.user_id);
        const resp = await fetch(`${mem0ProxyUrl}/api/mem0/get_all?${params.toString()}`);
        return resp.json();
    },
    async delete(id: string) {
        const resp = await fetch(`${mem0ProxyUrl}/api/mem0/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return resp.json();
    }
};

console.log(`mem0 proxy client configured to call ${mem0ProxyUrl}`);

export type Mem0SearchResult = { results: Array<any>; total?: number };

export const addMemories = async (items: any, opts: any = {}) => {
    if (!mem0Client) return { success: false, error: new Error('mem0 not configured') };
    try {
        const res = await mem0Client.add(items, opts);
        // Server proxy may wrap response as { success: true, result } — normalize
        if (res && res.success && res.result) return { success: true, result: res.result };
        return { success: true, result: res };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
};

export const searchMemories = async (query: string, opts: any = {}): Promise<{ results: any[]; total?: number; error?: Error | null }> => {
    if (!mem0Client) return { results: [], total: 0, error: null };
    try {
        const res = await mem0Client.search(query, opts);
        // Server proxy returns { success, result } sometimes — normalize
        const payload = res.result || res;
        return { results: payload.results || [], total: payload.total || (payload.results || []).length, error: null };
    } catch (err) {
        return { results: [], total: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
};

export const getAllMemories = async (opts: any = {}) => {
    if (!mem0Client) return { results: [], total: 0 };
    try {
        const res = await mem0Client.get_all(opts);
        const payload = res.result || res;
        return { results: payload.results || [], total: payload.total || (payload.results || []).length };
    } catch (err) {
        return { results: [], total: 0 };
    }
};

export const deleteMemory = async (id: string) => {
    if (!mem0Client) return { success: false };
    try {
        const res = await mem0Client.delete(id);
        const payload = res.result || res;
        return { success: Boolean(payload?.success || res?.success) };
    } catch (err) {
        return { success: false };
    }
};

export const mem0 = mem0Client;

export default mem0Client;
