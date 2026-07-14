// inspection.js — inspection form rendering and submission.
// Offline-first: always cache locally (IndexedDB) so field inspectors can keep
// working without signal; also sync to the backend when a connection is available
// so reports/analytics (which read from the server) reflect this inspection.
const Inspection = {
  async submit(data) {
    const risk = RiskCalculator.calculate(data.findings || []);
    const localRecord = {
      id: Utils.uid('insp'),
      site: data.site,
      date: Utils.formatDate(),
      findings: data.findings || [],
      risk,
      synced: false,
    };

    // Always cache locally first — this must succeed even fully offline.
    await DB.put('inspections', localRecord);

    // Best-effort sync to the backend so it has authoritative, cross-device data.
    try {
      const serverRecord = await Api.request('/api/inspections', {
        method: 'POST',
        body: {
          site: data.site,
          inspector_id: Auth.getSession()?.id,
          findings: data.findings || [],
          risk,
        },
      });
      localRecord.serverId = serverRecord.id;
      localRecord.synced = true;
      await DB.put('inspections', localRecord);
      Utils.toast('An ajiye dubawa (offline + uwar garke)', 'success');
    } catch (err) {
      Utils.toast('An ajiye a na\u02bcura kawai — za a aika lokacin da intanet ya dawo', 'info');
    }

    return localRecord;
  },
};
window.Inspection = Inspection;
