// rag.js — client-side interface to the backend RAG engine (backend/rag_engine.py)
const RAG = {
  async query(question) {
    try {
      return await Api.request('/api/ai/query', {
        method: 'POST',
        body: { question },
      });
    } catch (err) {
      return { answer: 'Ba a iya samun amsa yanzu ba (offline ko an fita daga shiga)', sources: [] };
    }
  },
};
window.RAG = RAG;
