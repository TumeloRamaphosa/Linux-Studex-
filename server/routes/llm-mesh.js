import { Router } from 'express';

const router = Router();

/**
 * Mount LLM Mesh routes.
 * @param {import('../lib/llm-mesh.js').default} llmMesh
 */
export default function llmMeshRoutes(llmMesh) {
  // GET /api/llm-mesh — full mesh status
  router.get('/', async (req, res) => {
    await llmMesh.scan();
    res.json(llmMesh.getStatus());
  });

  // GET /api/llm-mesh/models — list available models
  router.get('/models', async (req, res) => {
    await llmMesh.scan();
    res.json({
      status: llmMesh.status,
      activeProvider: llmMesh.activeProvider,
      models: llmMesh.models,
      currentModel: llmMesh.currentModel,
    });
  });

  // POST /api/llm-mesh/chat — send a chat to the local LLM
  router.post('/chat', async (req, res) => {
    const { message, systemPrompt, model, temperature, maxTokens } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: message });

    const result = await llmMesh.chat(messages, { model, temperature, maxTokens });
    res.json(result);
  });

  // POST /api/llm-mesh/switch — switch provider
  router.post('/switch', async (req, res) => {
    const { provider } = req.body;
    if (!provider) {
      return res.status(400).json({ error: 'provider is required (lm-studio or ollama)' });
    }
    try {
      llmMesh.setProvider(provider);
      await llmMesh.scan();
      res.json(llmMesh.getStatus());
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/llm-mesh/embed — generate embeddings
  router.post('/embed', async (req, res) => {
    const { text, model } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const result = await llmMesh.embed(text, { model });
    res.json(result);
  });

  return router;
}
