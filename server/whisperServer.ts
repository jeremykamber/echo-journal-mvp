import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

// POST /api/whisper
app.post('/api/whisper', async (req: express.Request, res: express.Response) => {
    try {
        const { filename, content_base64 } = req.body || {};
        if (!content_base64) return res.status(400).json({ success: false, error: 'content_base64 required' });

        const audioBuffer = Buffer.from(String(content_base64), 'base64');

        const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            console.warn('Transcription requested but OPENAI_API_KEY not configured');
            return res.status(501).json({ success: false, error: 'Transcription provider not configured on server' });
        }

        try {
            // Prefer to use FormData/Blob if available in runtime; otherwise fall back to returning an error
            if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
                console.warn('Runtime does not expose FormData/Blob. Consider installing form-data or running on a Node runtime with web-apis.');
                return res.status(500).json({ success: false, error: 'Server runtime missing FormData/Blob support' });
            }

            const form = new FormData();
            const blob = new Blob([audioBuffer]);
            form.append('file', blob, filename || 'audio.webm');
            form.append('model', 'whisper-1');

            const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${openaiKey}`,
                },
                // Node runtimes with web api support accept form as body
                body: form as any,
            });

            if (!r.ok) {
                const text = await r.text();
                console.error('OpenAI transcription error', r.status, text);
                return res.status(502).json({ success: false, error: `transcription provider error: ${r.status}` });
            }

            const d: any = await r.json();
            return res.json({ success: true, text: d?.text || d?.transcript || '' });
        } catch (err) {
            console.error('Failed to call transcription provider:', err);
            return res.status(500).json({ success: false, error: 'Transcription failed on server' });
        }
    } catch (err) {
        console.error('whisper endpoint error:', err);
        return res.status(500).json({ success: false, error: 'server error' });
    }
});

// health
app.get('/api/whisper/health', (_req: express.Request, res: express.Response) => {
    res.json({ ok: Boolean(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY) });
});

if (require.main === module) {
    const port = process.env.WHISPER_PORT ? Number(process.env.WHISPER_PORT) : 8788;
    app.listen(port, () => {
        console.log(`whisper proxy running on http://localhost:${port}`);
    });
}

export default app;
