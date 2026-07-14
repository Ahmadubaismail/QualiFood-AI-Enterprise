// utils.js — shared helpers used across modules
const Utils = {
  qs: (sel, root = document) => root.querySelector(sel),
  qsa: (sel, root = document) => Array.from(root.querySelectorAll(sel)),

  uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  },

  formatDate(d = new Date()) {
    return d.toISOString().slice(0, 10);
  },

  debounce(fn, wait = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  },

  toast(message, kind = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.classList.add('toast-visible'), 10);
    setTimeout(() => {
      el.classList.remove('toast-visible');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  },
};

window.Utils = Utils;
