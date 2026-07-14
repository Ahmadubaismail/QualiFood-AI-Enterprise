// api.js — single point of contact with the Flask backend (backend/app.py).
// Every other module (auth.js, rag.js, inspection.js, ...) should call
// Api.request() instead of calling fetch() directly, so auth headers,
// base URL, and error handling stay consistent in one place.
const Api = {
  // Frontend (index.html) runs on :8080, backend (Flask) runs on :5000 — see docs/INSTALL.md.
  // These are different origins, so relative paths like '/api/...' would otherwise hit
  // the frontend's own dev server instead of Flask. Point explicitly at the backend.
  BASE_URL: (location.port === '5000') ? '' : 'http://localhost:5000',

  async request(path, { method = 'GET', body = null, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (auth) {
      const session = Auth.getSession();
      if (session && session.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
    }

    let res;
    try {
      res = await fetch(`${this.BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new Error('Ba a iya haɗawa da uwar garke ba (network/offline)');
    }

    let data = null;
    try { data = await res.json(); } catch { /* empty body is fine for some endpoints */ }

    if (!res.ok) {
      if (res.status === 401 && auth) {
        // Token missing/invalid/expired — force the user back to login.
        Auth.logout();
      }
      const message = (data && data.error) ? data.error : `Request failed (${res.status})`;
      throw new Error(message);
    }

    return data;
  },
};
window.Api = Api;
