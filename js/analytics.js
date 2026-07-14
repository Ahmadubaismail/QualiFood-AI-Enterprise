// analytics.js — analytics screen controller.
// Prefers server-computed analytics (accurate across all inspectors/devices);
// falls back to a local-only estimate from the on-device cache when offline.
const Analytics = {
  async render() {
    let riskSummary, complianceRate, source = 'server';

    try {
      [riskSummary, complianceRate] = await Promise.all([
        Api.request('/api/analytics/risk-summary'),
        Api.request('/api/analytics/compliance').then(r => r.compliance_rate),
      ]);
    } catch (err) {
      source = 'local (offline)';
      const inspections = await DB.getAll('inspections').catch(() => []);
      riskSummary = inspections.reduce((acc, i) => {
        acc[i.risk] = (acc[i.risk] || 0) + 1;
        return acc;
      }, {});
      complianceRate = inspections.length
        ? Math.round(100 * (inspections.filter(i => i.risk === 'safe').length / inspections.length))
        : null;
    }

    const riskMap = { safe: 0, caution: 1, danger: 2 };
    const trend = Object.entries(riskSummary || {})
      .flatMap(([risk, count]) => Array(count).fill(riskMap[risk] ?? 0));
    Charts.drawLine(Utils.qs('#risk-trend-chart'), trend);

    const complianceEl = Utils.qs('#stat-compliance');
    if (complianceEl) {
      complianceEl.textContent = (complianceRate ?? complianceRate === 0) ? `${complianceRate}%` : '—';
    }

    const sourceEl = Utils.qs('#analytics-source');
    if (sourceEl) sourceEl.textContent = `Tushen bayanai: ${source}`;
  },
};
window.addEventListener('route:changed', (e) => {
  if (e.detail.route === 'analytics') Analytics.render();
});
window.Analytics = Analytics;
