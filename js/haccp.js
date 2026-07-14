// haccp.js — HACCP critical control point definitions, checklist rendering, and submission
const HACCP = {
  CCPs: [
    { id: 'temp-cold-chain', label: 'Sarkar sanyi (Cold chain)', threshold: '≤ 4°C', critical: true },
    { id: 'temp-cooking', label: 'Zafin dafa abinci', threshold: '≥ 74°C', critical: true },
    { id: 'hygiene-handling', label: 'Tsafta wajen sarrafawa', threshold: 'Visual/checklist', critical: false },
    { id: 'contamination-cross', label: 'Gurɓatawar giciye', threshold: 'Visual/checklist', critical: false },
  ],

  evaluate(readings = {}) {
    return this.CCPs.map(ccp => ({ ...ccp, value: readings[ccp.id] ?? null }));
  },

  render() {
    const el = Utils.qs('#inspection-form');
    if (!el) return;
    el.innerHTML = `
      <form id="haccp-form">
        <div class="field">
          <label for="insp-site">Wurin Dubawa (Site)</label>
          <input type="text" id="insp-site" required placeholder="misali: Kasuwar Kwari, Kano">
        </div>
        <h3>Muhimman Wuraren Kula (Critical Control Points)</h3>
        ${this.CCPs.map(ccp => `
          <div class="card ccp-row" data-ccp="${ccp.id}">
            <div>
              <strong>${ccp.label}</strong>${ccp.critical ? ' <span class="badge badge-danger">Muhimmi</span>' : ''}
              <div class="meta">Iyaka: ${ccp.threshold}</div>
            </div>
            <div class="ccp-toggle" role="group" aria-label="${ccp.label} status">
              <label><input type="radio" name="status-${ccp.id}" value="pass" checked> Yayi daidai</label>
              <label><input type="radio" name="status-${ccp.id}" value="fail"> Bai yi daidai ba</label>
            </div>
          </div>
        `).join('')}
        <button type="submit" class="btn btn-primary">Ajiye Dubawa</button>
      </form>
    `;
    this.bindForm();
  },

  bindForm() {
    const form = Utils.qs('#haccp-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        const site = Utils.qs('#insp-site').value.trim();
        const findings = this.CCPs.map(ccp => {
          const checked = form.querySelector(`input[name="status-${ccp.id}"]:checked`);
          return {
            id: ccp.id,
            label: ccp.label,
            status: checked ? checked.value : 'pass',
            critical: ccp.critical,
          };
        });
        await Inspection.submit({ site, findings });
        App.navigate('dashboard');
        Dashboard.render();
      } catch (err) {
        Utils.toast(err.message, 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  },
};

window.addEventListener('route:changed', (e) => {
  if (e.detail.route === 'inspection') HACCP.render();
});
window.HACCP = HACCP;
