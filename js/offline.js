// offline.js — connectivity state + sync queue for offline-first PWA behavior
const Offline = {
  isOnline: navigator.onLine,
  syncing: false,

  init() {
    window.addEventListener('online', () => { this.isOnline = true; this.sync(); });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      Utils.toast('Ba a haɗe da intanet ba — ana adanawa a na\u2019urar', 'caution');
    });
    // Also try a sync on startup in case unsynced records were left over
    // from a previous offline session.
    if (this.isOnline) this.sync();
  },

  async sync() {
    if (this.syncing || !Auth.isLoggedIn()) return;
    this.syncing = true;
    try {
      const inspections = await DB.getAll('inspections').catch(() => []);
      const pending = inspections.filter((i) => !i.synced);
      if (!pending.length) return;

      let succeeded = 0;
      for (const record of pending) {
        try {
          const serverRecord = await Api.request('/api/inspections', {
            method: 'POST',
            body: {
              site: record.site,
              inspector_id: Auth.getSession()?.id,
              findings: record.findings || [],
              risk: record.risk,
            },
          });
          record.serverId = serverRecord.id;
          record.synced = true;
          await DB.put('inspections', record);
          succeeded++;
        } catch (err) {
          // Leave this one unsynced and try again on the next sync trigger
          // (e.g. next 'online' event, or next app launch).
          break;
        }
      }

      if (succeeded > 0) {
        Utils.toast(`An aika dubawa ${succeeded} zuwa uwar garke`, 'success');
        if (typeof Dashboard !== 'undefined') Dashboard.render();
      }
    } finally {
      this.syncing = false;
    }
  },
};
document.addEventListener('DOMContentLoaded', () => Offline.init());
window.Offline = Offline;
