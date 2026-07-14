// ai.js — AI chat screen controller, built on top of RAG
const AI = {
  history: [],

  async ask(question) {
    this.history.push({ role: 'user', text: question });
    this.render();
    this.history.push({ role: 'assistant', text: '…', pending: true });
    this.render();

    const { answer, sources } = await RAG.query(question);
    this.history[this.history.length - 1] = { role: 'assistant', text: answer, sources };
    this.render();
    return answer;
  },

  render() {
    const el = Utils.qs('#ai-chat');
    if (!el) return;
    el.innerHTML = this.history.map(m => `
      <div class="card ai-message ai-message-${m.role}">
        <strong>${m.role === 'user' ? 'Kai' : 'AI'}:</strong> ${m.text}
        ${m.sources && m.sources.length ? `<div class="meta">Tushen bayani: ${m.sources.join(', ')}</div>` : ''}
      </div>
    `).join('') || '<p class="meta">Yi tambaya domin farawa.</p>';
    el.scrollTop = el.scrollHeight;
  },

  bindForm() {
    const form = Utils.qs('#ai-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = Utils.qs('#ai-input');
      const question = input.value.trim();
      if (!question) return;
      input.value = '';
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await this.ask(question);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  },
};

document.addEventListener('DOMContentLoaded', () => AI.bindForm());
window.AI = AI;
