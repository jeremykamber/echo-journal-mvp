mem0 Server Proxy

This small express app provides secure server-side proxy endpoints for mem0 operations so the mem0 API key can be kept on the server.

Endpoints
- POST /api/mem0/add — body: { items: Array, opts?: object }
- GET  /api/mem0/search — query: ?query=...&user_id=...&limit=...
- GET  /api/mem0/get_all — query: ?user_id=...
- DELETE /api/mem0/:id — deletes a memory by id
- GET /api/mem0/health — health check

Running locally
1. Install dependencies: npm install express body-parser cors mem0ai
2. Set env: export MEM0_API_KEY=your_mem0_api_key
3. Start server: node ./server/mem0Server.ts (or run with ts-node)

Notes
- Prefer deploying these routes as serverless functions (Vercel/Netlify) in production.
- Ensure the MEM0_API_KEY is only set in secure server environment variables.
