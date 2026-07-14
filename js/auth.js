// auth.js — real session handling against backend/auth.py via api.js
const Auth = {
  SESSION_KEY: 'qf_session',

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); }
    catch { return null; }
  },

  setSession(session) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  async register(email, password, role = 'inspector') {
    if (!email || !password) throw new Error('Ana buƙatar imel da kalmar sirri');
    // Registration itself doesn't need an existing token.
    return Api.request('/api/auth/register', {
      method: 'POST',
      body: { email, password, role },
      auth: false,
    });
  },

  async login(email, password) {
    if (!email || !password) throw new Error('Ana buƙatar imel da kalmar sirri');
    const result = await Api.request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    // result = { token, user: { id, email, role } }
    this.setSession({ ...result.user, token: result.token, loginAt: Date.now() });
    return result;
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    App.navigate('login');
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  bindForm() {
    const loginForm = Utils.qs('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
          await this.login(Utils.qs('#email').value.trim(), Utils.qs('#password').value);
          Utils.qs('#bottom-nav').hidden = false;
          App.navigate('dashboard');
          Dashboard.render();
        } catch (err) {
          Utils.toast(err.message, 'danger');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    const registerForm = Utils.qs('#register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
          await this.register(
            Utils.qs('#reg-email').value.trim(),
            Utils.qs('#reg-password').value,
            Utils.qs('#reg-role') ? Utils.qs('#reg-role').value : 'inspector'
          );
          Utils.toast('An yi rajista! Yanzu ku shiga (login).', 'success');
          App.navigate('login');
        } catch (err) {
          Utils.toast(err.message, 'danger');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }
    const toRegister = Utils.qs('#link-to-register');
    if (toRegister) {
      toRegister.addEventListener('click', (e) => { e.preventDefault(); App.navigate('register'); });
    }
    const toLogin = Utils.qs('#link-to-login');
    if (toLogin) {
      toLogin.addEventListener('click', (e) => { e.preventDefault(); App.navigate('login'); });
    }
  },
};

document.addEventListener('DOMContentLoaded', () => Auth.bindForm());
window.Auth = Auth;
