// reports.js — report generation screen (PDF rendered server-side by backend/reports.py)
const Reports = {
  async render() {
    const el = Utils.qs('#reports-list');
    if (!el) return;
    el.innerHTML = '<p class="meta">Ana ɗauko rahotanni…</p>';
    try {
      const inspections = await Api.request('/api/inspections');
      el.innerHTML = inspections.map(i => `
        <div class="card">
          ${i.site} — ${i.date}
          <span class="badge badge-${i.risk}">${i.risk}</span>
          <button class="btn btn-ghost" data-export="${i.id}">Fitar da PDF</button>
        </div>
      `).join('') || '<p class="meta">Babu rahotanni tukuna.</p>';

      el.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', () => this.exportPdf(btn.dataset.export));
      });
    } catch (err) {
      el.innerHTML = `<p class="meta">Ba a iya samun rahotanni ba: ${err.message}</p>`;
    }
  },

  async exportPdf(inspectionId) {
    try {
      Utils.toast('Ana shirya PDF…', 'info');
      await Api.download(`/api/reports/${inspectionId}/pdf`, `qualifood-inspection-${inspectionId}.pdf`);
    } catch (err) {
      Utils.toast(`Ba a iya fitar da PDF ba: ${err.message}`, 'danger');
    }
  },
};
window.addEventListener('route:changed', (e) => { if (e.detail.route === 'reports') Reports.render(); });
window.Reports = Reports;
