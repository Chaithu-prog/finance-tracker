'use strict';

// ═══════════════════════════════════
// API CLIENT
// ═══════════════════════════════════
const API = {
  BASE: 'https://finance-tracker-wb5m.onrender.com:5000/api',
  getToken: () => localStorage.getItem('ff_token'),
  setToken: (t) => t ? localStorage.setItem('ff_token', t) : localStorage.removeItem('ff_token'),
  async req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const tok = this.getToken();
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    const res = await fetch(this.BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },
  get: (p) => API.req('GET', p),
  post: (p, b) => API.req('POST', p, b),
  put: (p, b) => API.req('PUT', p, b),
  delete: (p) => API.req('DELETE', p),
};

// ═══════════════════════════════════
// STATE
// ═══════════════════════════════════
const S = {
  user: null,
  page: 'dashboard',
  charts: {},
  txFilter: { type: 'all', category: '', search: '' },
  txPage: 1,
  txTotal: 0,
  chatRoom: 'general',
  aiHistory: [],
  currentTicketId: null,
  investFilter: 'all',
  newsFilter: 'all',
  summary: null,
};

// ═══════════════════════════════════
// HELPERS
// ═══════════════════════════════════
function fmt(n) {
  if (n === null || n === undefined) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtK(n) {
  n = Number(n) || 0;
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n;
}
function ge(id) { return document.getElementById(id); }
function setH(id, html) { const el = ge(id); if (el) el.innerHTML = html; }
function setT(id, text) { const el = ge(id); if (el) el.textContent = text; }
function killChart(id) { if (S.charts[id]) { S.charts[id].destroy(); delete S.charts[id]; } }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function toast(msg, type = 'info', sub = '') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div><div class="toast-msg">${msg}</div>${sub ? '<div class="toast-sub">' + sub + '</div>' : ''}</div>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `;
  ge('toast-container').appendChild(el);
  setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 4000);
}

function openModal(id) { const m = ge(id); if (m) m.classList.add('open'); }
function closeModal(id) { const m = ge(id); if (m) m.classList.remove('open'); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = ge(id);
  if (s) s.classList.add('active');
}

function progBar(pct, color = 'sage', height = 8) {
  pct = Math.min(100, Math.max(0, pct));
  const col = pct >= 90 ? 'rose' : pct >= 70 ? 'gold' : color;
  return `<div class="prog-track" style="height:${height}px"><div class="prog-fill ${col}" style="width:${pct}%"></div></div>`;
}

function initials(name) {
  if (!name) return 'FF';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ═══════════════════════════════════
// BOOT
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const token = API.getToken();
  if (token) {
    try {
      const res = await API.get('/auth/me');
      S.user = res.data;
      launchApp();
    } catch {
      API.setToken(null);
      showScreen('s-landing');
    }
  } else {
    showScreen('s-landing');
  }
  setDateDefaults();
});

function setDateDefaults() {
  const today = new Date().toISOString().split('T')[0];
  const txDate = ge('tx-date');
  if (txDate) txDate.value = today;
}

function launchApp() {
  showScreen('s-app');
  updateSidebarUser();
  loadCategoryOptions();
  navTo('dashboard');
}

function updateSidebarUser() {
  if (!S.user) return;
  setT('sidebar-name', S.user.name);
  setT('sidebar-plan', S.user.plan + ' Plan');
  setH('sidebar-avatar', initials(S.user.name));
  const planBadge = ge('settings-plan-badge');
  if (planBadge) planBadge.textContent = S.user.plan;
}

// ═══════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════
const PAGE_META = {
  dashboard: { title: 'Dashboard', sub: 'Your financial overview at a glance', action: 'openAddTransactionModal', actionLabel: '+ Add Transaction' },
  transactions: { title: 'Transactions', sub: 'Track every rupee in and out', action: 'openAddTransactionModal', actionLabel: '+ Add Transaction' },
  budgets: { title: 'Budgets', sub: 'Set limits and stay on track', action: "openModal('modal-add-budget')", actionLabel: '+ New Budget' },
  goals: { title: 'Goals', sub: 'Build your financial future', action: "openModal('modal-add-goal')", actionLabel: '+ New Goal' },
  investments: { title: 'Investments', sub: 'Grow your wealth smartly', action: null, actionLabel: '' },
  reports: { title: 'Reports', sub: 'Deep insights into your finances', action: null, actionLabel: '' },
  news: { title: 'Finance News', sub: 'Stay informed, invest wisely', action: null, actionLabel: '' },
  community: { title: 'Community', sub: 'Learn and grow with others', action: null, actionLabel: '' },
  'ai-advisor': { title: 'AI Advisor', sub: 'Your personal finance coach', action: null, actionLabel: '' },
  profile: { title: 'Profile', sub: 'Manage your account', action: null, actionLabel: '' },
  settings: { title: 'Settings', sub: 'Customize your experience', action: null, actionLabel: '' },
  support: { title: 'Support', sub: 'We\'re here to help', action: null, actionLabel: '' },
};

function navTo(page) {
  S.page = page;
  document.querySelectorAll('.nav-link[data-page]').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
  document.querySelectorAll('.page-content[id^="pg-"]').forEach(p => p.classList.add('hidden'));
  const pg = ge('pg-' + page);
  if (pg) pg.classList.remove('hidden');

  const meta = PAGE_META[page] || { title: page, sub: '', action: null, actionLabel: '' };
  setT('topbar-title', meta.title);
  setT('topbar-sub', meta.sub);
  const btn = ge('topbar-action-btn');
  if (btn) {
    if (meta.action) {
      btn.style.display = '';
      btn.textContent = meta.actionLabel;
      btn.onclick = new Function(meta.action + '()');
    } else {
      btn.style.display = 'none';
    }
  }
  closeSidebar();

  const loaders = {
    dashboard: loadDashboard,
    transactions: loadTransactions,
    budgets: loadBudgets,
    goals: loadGoals,
    investments: loadInvestments,
    reports: loadReports,
    news: loadNews,
    community: () => loadChatMessages(S.chatRoom),
    profile: loadProfile,
    settings: loadSettings,
    support: loadSupportTickets,
    'ai-advisor': () => {},
  };
  if (loaders[page]) loaders[page]();
}

function toggleSidebar() {
  ge('sidebar').classList.toggle('open');
  ge('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  ge('sidebar').classList.remove('open');
  ge('sidebar-overlay').classList.remove('show');
}

// ═══════════════════════════════════
// AUTH
// ═══════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  const btn = ge('login-btn');
  const err = ge('login-error');
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  err.style.display = 'none';
  try {
    const res = await API.post('/auth/login', {
      email: ge('login-email').value,
      password: ge('login-password').value
    });
    API.setToken(res.data.token);
    S.user = res.data.user;
    toast('Welcome back, ' + S.user.name + '!', 'success');
    launchApp();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = ge('reg-btn');
  const err = ge('reg-error');
  err.style.display = 'none';

  const name = ge('reg-name').value;
  const email = ge('reg-email').value;
  const password = ge('reg-password').value;
  const confirm = ge('reg-confirm').value;

  if (password !== confirm) {
    err.textContent = 'Passwords do not match.';
    err.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    err.textContent = 'Password must be at least 6 characters.';
    err.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';
  try {
    const res = await API.post('/auth/register', { name, email, password });
    API.setToken(res.data.token);
    S.user = res.data.user;
    toast('Welcome to FinFolio, ' + S.user.name + '!', 'success');
    launchApp();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account →';
  }
}

function handleLogout() {
  API.setToken(null);
  S.user = null;
  Object.keys(S.charts).forEach(k => { try { S.charts[k].destroy(); } catch (_) {} });
  S.charts = {};
  showScreen('s-landing');
  toast('You have been logged out.', 'info');
}

// ═══════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════
const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Business', 'Investment Returns', 'Rental Income', 'Bonus', 'Gift', 'Other Income'],
  expense: ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities', 'Healthcare', 'Entertainment', 'Education', 'Rent', 'Groceries', 'Personal Care', 'Travel', 'Insurance', 'Subscriptions', 'EMI', 'Other']
};
const CAT_ICONS = {
  'Salary': '💼', 'Freelance': '💻', 'Business': '🏢', 'Investment Returns': '📈',
  'Rental Income': '🏠', 'Bonus': '🎁', 'Gift': '🎀', 'Other Income': '💰',
  'Food & Dining': '🍽️', 'Transport': '🚗', 'Shopping': '🛍️', 'Bills & Utilities': '⚡',
  'Healthcare': '🏥', 'Entertainment': '🎬', 'Education': '📚', 'Rent': '🏠',
  'Groceries': '🛒', 'Personal Care': '💆', 'Travel': '✈️', 'Insurance': '🛡️',
  'Subscriptions': '📱', 'EMI': '🏦', 'Other': '📦', 'Other Expense': '📦'
};

let currentTxType = 'income';

function setTxType(type) {
  currentTxType = type;
  ge('tx-type-income').classList.toggle('active', type === 'income');
  ge('tx-type-expense').classList.toggle('active', type === 'expense');
  updateTxCategoryOptions();
}

function updateTxCategoryOptions() {
  const sel = ge('tx-category');
  if (!sel) return;
  const cats = CATEGORIES[currentTxType] || [];
  sel.innerHTML = '<option value="">Select category</option>' + cats.map(c => `<option value="${c}">${CAT_ICONS[c] || '📦'} ${c}</option>`).join('');
}

function loadCategoryOptions() {
  updateTxCategoryOptions();
  const bsel = ge('budget-category');
  if (bsel) {
    bsel.innerHTML = '<option value="">Select category</option>' + CATEGORIES.expense.map(c => `<option value="${c}">${CAT_ICONS[c] || '📦'} ${c}</option>`).join('');
  }
  const txCatFilter = ge('tx-category-filter');
  if (txCatFilter) {
    const all = [...CATEGORIES.income, ...CATEGORIES.expense];
    txCatFilter.innerHTML = '<option value="">All Categories</option>' + all.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

// ═══════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════
async function loadDashboard() {
  try {
    const res = await API.get('/transactions/summary');
    S.summary = res.data;
    renderDashStats(res.data);
    renderMonthlyChart(res.data.monthly);
    renderCategoryChart(res.data.categoryBreakdown);
    renderHealthRing(res.data);
    loadRecentTransactions();
    loadDashGoals();
  } catch (ex) {
    toast('Failed to load dashboard', 'error');
  }
}

function renderDashStats(data) {
  const balance = (data.monthlyIncome || 0) - (data.monthlyExpense || 0);
  const savingsRate = data.monthlyIncome > 0 ? Math.round((balance / data.monthlyIncome) * 100) : 0;
  setH('dash-stats', `
    <div class="stat-card sage fade-up">
      <div class="stat-icon sage">💰</div>
      <div class="stat-label">Monthly Income</div>
      <div class="stat-value">${fmtK(data.monthlyIncome)}</div>
      <div class="stat-sub">${data.incomeCount || 0} transactions</div>
    </div>
    <div class="stat-card rose fade-up">
      <div class="stat-icon rose">💸</div>
      <div class="stat-label">Monthly Expenses</div>
      <div class="stat-value">${fmtK(data.monthlyExpense)}</div>
      <div class="stat-sub">${data.expenseCount || 0} transactions</div>
    </div>
    <div class="stat-card ${balance >= 0 ? 'sky' : 'rose'} fade-up">
      <div class="stat-icon ${balance >= 0 ? 'sky' : 'rose'}">${balance >= 0 ? '📊' : '⚠️'}</div>
      <div class="stat-label">Net Balance</div>
      <div class="stat-value">${fmtK(Math.abs(balance))}</div>
      <div class="stat-sub ${balance >= 0 ? 'text-sage' : 'text-rose'}">${balance >= 0 ? 'Surplus' : 'Deficit'}</div>
    </div>
    <div class="stat-card gold fade-up">
      <div class="stat-icon gold">🎯</div>
      <div class="stat-label">Savings Rate</div>
      <div class="stat-value">${savingsRate}%</div>
      <div class="stat-sub">${savingsRate >= 20 ? 'Great job!' : 'Aim for 20%+'}</div>
    </div>
  `);
}

function renderMonthlyChart(monthly, chartType = 'bar') {
  killChart('chart-monthly');
  if (!monthly || !monthly.length) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const grouped = {};
  monthly.forEach(m => {
    const key = `${m._id.year}-${m._id.month}`;
    if (!grouped[key]) grouped[key] = { label: months[m._id.month - 1] + ' ' + String(m._id.year).slice(2), income: 0, expense: 0 };
    grouped[key][m._id.type] = m.total;
  });
  const labels = Object.values(grouped).slice(-6).map(g => g.label);
  const incomeData = Object.values(grouped).slice(-6).map(g => g.income);
  const expenseData = Object.values(grouped).slice(-6).map(g => g.expense);

  const ctx = ge('chart-monthly').getContext('2d');
  S.charts['chart-monthly'] = new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets: [
        { label: 'Income', data: incomeData, backgroundColor: chartType === 'bar' ? 'rgba(61,114,100,.7)' : 'rgba(61,114,100,.15)', borderColor: '#3d7264', borderWidth: 2, tension: 0.4, fill: chartType === 'line', pointBackgroundColor: '#3d7264' },
        { label: 'Expense', data: expenseData, backgroundColor: chartType === 'bar' ? 'rgba(184,72,64,.7)' : 'rgba(184,72,64,.1)', borderColor: '#b84840', borderWidth: 2, tension: 0.4, fill: chartType === 'line', pointBackgroundColor: '#b84840' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 }, usePointStyle: true } }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } },
      scales: { x: { grid: { color: '#f0ece5' }, ticks: { font: { family: 'DM Sans', size: 11 } } }, y: { grid: { color: '#f0ece5' }, ticks: { font: { family: 'DM Sans', size: 11 }, callback: v => fmtK(v) } } }
    }
  });
}

function switchDashChart(type, btn) {
  document.querySelectorAll('#dash-chart-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (S.summary) renderMonthlyChart(S.summary.monthly, type);
}

function renderCategoryChart(cats) {
  killChart('chart-category');
  if (!cats || !cats.length) { setH('chart-category', '<div class="empty-state" style="padding:20px"><div class="empty-icon">🍩</div><div class="empty-desc">No expenses this month</div></div>'); return; }
  const colors = ['#b84840','#345f91','#a87228','#3d7264','#7c5cbf','#e07c3a','#3a8fa8','#a84040'];
  const ctx = ge('chart-category').getContext('2d');
  S.charts['chart-category'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c._id),
      datasets: [{ data: cats.map(c => c.total), backgroundColor: colors.slice(0, cats.length), borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 10 }, usePointStyle: true, padding: 10 } }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } }
    }
  });
}

function renderHealthRing(data) {
  const income = data.monthlyIncome || 0;
  const expense = data.monthlyExpense || 0;
  const savingsRate = income > 0 ? (income - expense) / income : 0;
  let score = 0;
  if (income > 0) score += 25;
  if (savingsRate >= 0.2) score += 35;
  else if (savingsRate > 0) score += 15;
  if (expense < income * 0.8) score += 25;
  else if (expense < income) score += 10;
  if (income > 0 && expense > 0) score += 15;
  score = Math.min(100, score);

  const ring = ge('health-ring');
  if (ring) {
    const circumference = 364;
    const offset = circumference - (score / 100) * circumference;
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 200);
    ring.style.stroke = score >= 70 ? 'var(--sage)' : score >= 40 ? 'var(--gold)' : 'var(--rose)';
  }
  setT('health-pct', score + '%');

  const tips = score >= 70 ? ['Great savings rate!', 'Keep tracking consistently'] :
    score >= 40 ? ['Try to save 20% of income', 'Review top spending categories'] :
      ['Start tracking all expenses', 'Set a monthly budget', 'Reduce discretionary spending'];
  setH('health-tips', tips.map(t => `<div class="flex gap-8 mb-8 text-sm"><span>💡</span><span style="color:var(--ink3)">${t}</span></div>`).join(''));
}

async function loadRecentTransactions() {
  try {
    const res = await API.get('/transactions?limit=5');
    if (!res.data.length) { setH('dash-recent-tx', '<div class="empty-state" style="padding:24px"><div class="empty-icon">💳</div><div class="empty-title">No transactions yet</div><div class="empty-desc">Add your first transaction to get started</div></div>'); return; }
    setH('dash-recent-tx', res.data.map(tx => txItem(tx)).join(''));
  } catch (_) {}
}

async function loadDashGoals() {
  try {
    const res = await API.get('/goals');
    const active = res.data.filter(g => g.status === 'active').slice(0, 3);
    if (!active.length) { setH('dash-goals', '<div style="padding:12px;font-size:.85rem;color:var(--ink4)">No active goals. Set one!</div>'); return; }
    setH('dash-goals', active.map(g => {
      const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      return `<div style="margin-bottom:14px">
        <div class="flex-between mb-4"><span style="font-size:.85rem;font-weight:500">${g.icon || '🎯'} ${g.title}</span><span class="text-sm text-muted">${pct}%</span></div>
        ${progBar(pct)}<div class="flex-between mt-4"><span class="text-xs text-muted">${fmt(g.currentAmount)}</span><span class="text-xs text-muted">${fmt(g.targetAmount)}</span></div>
      </div>`;
    }).join(''));
  } catch (_) {}
}

function txItem(tx, showActions = false) {
  const icon = CAT_ICONS[tx.category] || (tx.type === 'income' ? '💰' : '📦');
  return `<div class="tx-item" onclick="openEditTx('${tx._id}')">
    <div class="tx-icon ${tx.type}">${icon}</div>
    <div class="tx-desc">
      <div class="tx-desc-title">${tx.description || tx.category}</div>
      <div class="tx-desc-sub">${tx.category} · ${fmtDate(tx.date)} · ${tx.paymentMethod}</div>
    </div>
    <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}</div>
    <div class="tx-actions">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();deleteTx('${tx._id}')" title="Delete" style="color:var(--rose)">🗑️</button>
    </div>
  </div>`;
}

// ═══════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════
async function loadTransactions() {
  const params = new URLSearchParams({ page: S.txPage, limit: 20 });
  if (S.txFilter.type !== 'all') params.set('type', S.txFilter.type);
  if (S.txFilter.category) params.set('category', S.txFilter.category);
  if (S.txFilter.search) params.set('search', S.txFilter.search);

  setH('tx-list', '<div class="loader"><div class="spinner"></div></div>');
  try {
    const res = await API.get('/transactions?' + params.toString());
    S.txTotal = res.pagination.total;
    if (!res.data.length) {
      setH('tx-list', `<div class="empty-state"><div class="empty-icon">💳</div><div class="empty-title">No transactions found</div><div class="empty-desc">Try adjusting your filters or add a new transaction</div><button class="btn btn-primary" onclick="openAddTransactionModal()">+ Add Transaction</button></div>`);
    } else {
      setH('tx-list', res.data.map(tx => txItem(tx, true)).join(''));
    }
    renderTxPagination(res.pagination);
  } catch (ex) {
    setH('tx-list', '<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Failed to load</div></div>');
  }
}

function renderTxPagination(p) {
  if (p.pages <= 1) { setH('tx-pagination', ''); return; }
  let html = '';
  if (p.page > 1) html += `<button class="btn btn-outline btn-sm" onclick="goTxPage(${p.page-1})">← Prev</button>`;
  html += `<span class="text-sm text-muted">Page ${p.page} of ${p.pages} · ${p.total} transactions</span>`;
  if (p.page < p.pages) html += `<button class="btn btn-outline btn-sm" onclick="goTxPage(${p.page+1})">Next →</button>`;
  setH('tx-pagination', html);
}

function goTxPage(page) { S.txPage = page; loadTransactions(); }
function filterTx(type, btn) {
  document.querySelectorAll('#tx-type-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  S.txFilter.type = type; S.txPage = 1; loadTransactions();
}
function filterTxCategory(val) { S.txFilter.category = val; S.txPage = 1; loadTransactions(); }
let searchDebounce;
function searchTx(val) { clearTimeout(searchDebounce); searchDebounce = setTimeout(() => { S.txFilter.search = val; S.txPage = 1; loadTransactions(); }, 350); }

function openAddTransactionModal() {
  ge('tx-edit-id').value = '';
  ge('tx-modal-title').textContent = 'Add Transaction';
  ge('tx-save-btn').textContent = 'Add Transaction';
  ge('tx-amount').value = '';
  ge('tx-description').value = '';
  ge('tx-note').value = '';
  ge('tx-date').value = new Date().toISOString().split('T')[0];
  setTxType('expense');
  openModal('modal-add-tx');
}

async function openEditTx(id) {
  try {
    const res = await API.get('/transactions?limit=1');
    const allRes = await API.get('/transactions?limit=200');
    const tx = allRes.data.find(t => t._id === id);
    if (!tx) return;
    ge('tx-edit-id').value = tx._id;
    ge('tx-modal-title').textContent = 'Edit Transaction';
    ge('tx-save-btn').textContent = 'Update Transaction';
    setTxType(tx.type);
    ge('tx-amount').value = tx.amount;
    ge('tx-date').value = tx.date.split('T')[0];
    ge('tx-description').value = tx.description || '';
    ge('tx-note').value = tx.note || '';
    ge('tx-payment').value = tx.paymentMethod || 'UPI';
    setTimeout(() => { const sel = ge('tx-category'); if (sel) sel.value = tx.category; }, 50);
    openModal('modal-add-tx');
  } catch (_) {}
}

async function saveTransaction() {
  const btn = ge('tx-save-btn');
  const amount = parseFloat(ge('tx-amount').value);
  const category = ge('tx-category').value;
  const date = ge('tx-date').value;

  if (!amount || amount <= 0) { toast('Please enter a valid amount', 'error'); return; }
  if (!category) { toast('Please select a category', 'error'); return; }
  if (!date) { toast('Please select a date', 'error'); return; }

  const payload = {
    type: currentTxType,
    amount,
    category,
    date,
    description: ge('tx-description').value,
    note: ge('tx-note').value,
    paymentMethod: ge('tx-payment').value
  };

  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const editId = ge('tx-edit-id').value;
    if (editId) {
      await API.put('/transactions/' + editId, payload);
      toast('Transaction updated!', 'success');
    } else {
      await API.post('/transactions', payload);
      toast('Transaction added!', 'success');
    }
    closeModal('modal-add-tx');
    if (S.page === 'dashboard') loadDashboard();
    else if (S.page === 'transactions') loadTransactions();
    else if (S.page === 'budgets') loadBudgets();
    else if (S.page === 'reports') loadReports();
  } catch (ex) {
    toast(ex.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = ge('tx-edit-id').value ? 'Update Transaction' : 'Add Transaction';
  }
}

async function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    await API.delete('/transactions/' + id);
    toast('Transaction deleted', 'info');
    if (S.page === 'dashboard') loadDashboard();
    else loadTransactions();
  } catch (ex) {
    toast(ex.message, 'error');
  }
}

// ═══════════════════════════════════
// GOALS
// ═══════════════════════════════════
async function loadGoals() {
  setH('goals-grid', '<div class="loader"><div class="spinner"></div></div>');
  try {
    const res = await API.get('/goals');
    if (!res.data.length) {
      setH('goals-grid', `<div style="grid-column:1/-1"><div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No goals yet</div><div class="empty-desc">Set your first financial goal and start building your future</div><button class="btn btn-primary" onclick="openModal('modal-add-goal')">+ Create Goal</button></div></div>`);
      return;
    }
    setH('goals-grid', res.data.map(g => goalCard(g)).join(''));
  } catch (_) {
    toast('Failed to load goals', 'error');
  }
}

function goalCard(g) {
  const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 86400000));
  const statusColor = g.status === 'completed' ? 'sage' : g.status === 'paused' ? 'gold' : 'sky';
  return `<div class="card fade-up" style="cursor:default">
    <div class="flex-between mb-12">
      <span style="font-size:1.6rem">${g.icon || '🎯'}</span>
      <span class="badge badge-${statusColor}">${g.status}</span>
    </div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:600;margin-bottom:4px">${g.title}</div>
    <div class="text-xs text-muted mb-12">${g.category} · ${g.priority} Priority</div>
    <div class="flex-between mb-6">
      <span class="text-sm" style="font-weight:600;color:var(--sage)">${fmt(g.currentAmount)}</span>
      <span class="text-sm text-muted">of ${fmt(g.targetAmount)}</span>
    </div>
    ${progBar(pct, 'sage', 10)}
    <div class="flex-between mt-8">
      <span class="text-xs text-muted">${pct}% complete</span>
      <span class="text-xs text-muted">${daysLeft} days left</span>
    </div>
    <div class="flex gap-8 mt-16">
      <button class="btn btn-primary btn-sm" style="flex:1" onclick="openContribute('${g._id}','${g.title}')">+ Contribute</button>
      <button class="btn btn-outline btn-sm btn-icon" onclick="deleteGoal('${g._id}')" title="Delete" style="color:var(--rose)">🗑️</button>
    </div>
  </div>`;
}

async function saveGoal() {
  const title = ge('goal-title').value;
  const target = parseFloat(ge('goal-target').value);
  const deadline = ge('goal-deadline').value;
  if (!title) { toast('Goal title is required', 'error'); return; }
  if (!target || target < 1) { toast('Enter a valid target amount', 'error'); return; }
  if (!deadline) { toast('Please set a deadline', 'error'); return; }
  const iconMap = { 'Emergency Fund':'🛡️', 'Travel':'✈️', 'Education':'📚', 'Home':'🏠', 'Vehicle':'🚗', 'Wedding':'💍', 'Retirement':'🌅', 'Business':'🏢', 'Other':'🎯' };
  const category = ge('goal-category').value;
  try {
    await API.post('/goals', { title, targetAmount: target, deadline, category, description: ge('goal-desc').value, priority: ge('goal-priority').value, icon: iconMap[category] || '🎯' });
    toast('Goal created!', 'success');
    closeModal('modal-add-goal');
    ge('goal-title').value = ''; ge('goal-target').value = ''; ge('goal-deadline').value = ''; ge('goal-desc').value = '';
    loadGoals();
  } catch (ex) { toast(ex.message, 'error'); }
}

function openContribute(goalId, goalName) {
  ge('contrib-goal-id').value = goalId;
  setT('contrib-goal-name', goalName);
  ge('contrib-amount').value = '';
  ge('contrib-note').value = '';
  openModal('modal-contribute');
}

async function saveContribution() {
  const goalId = ge('contrib-goal-id').value;
  const amount = parseFloat(ge('contrib-amount').value);
  if (!amount || amount < 1) { toast('Enter a valid amount', 'error'); return; }
  try {
    await API.post('/goals/' + goalId + '/contribute', { amount, note: ge('contrib-note').value });
    toast('Contribution added! Keep it up! 🎉', 'success');
    closeModal('modal-contribute');
    loadGoals();
    if (S.page === 'dashboard') loadDashboard();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  try {
    await API.delete('/goals/' + id);
    toast('Goal deleted', 'info');
    loadGoals();
  } catch (ex) { toast(ex.message, 'error'); }
}

// ═══════════════════════════════════
// BUDGETS
// ═══════════════════════════════════
async function loadBudgets() {
  setH('budgets-grid', '<div class="loader"><div class="spinner"></div></div>');
  try {
    const res = await API.get('/budgets');
    if (!res.data.length) {
      setH('budgets-grid', `<div style="grid-column:1/-1"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No budgets set</div><div class="empty-desc">Set spending limits for your categories to control your expenses</div><button class="btn btn-primary" onclick="openModal('modal-add-budget')">+ Create Budget</button></div></div>`);
      return;
    }
    setH('budgets-grid', res.data.map(b => budgetCard(b)).join(''));
  } catch (_) { toast('Failed to load budgets', 'error'); }
}

function budgetCard(b) {
  const pct = b.percentage || 0;
  const over = pct >= 100;
  const alert = pct >= (b.alertAt || 80);
  const statusLabel = over ? '🔴 Over budget' : alert ? '⚠️ Near limit' : '✅ On track';
  return `<div class="card fade-up" style="cursor:default">
    <div class="flex-between mb-12">
      <span style="font-size:1.4rem">${CAT_ICONS[b.category] || '💰'}</span>
      <span class="text-xs ${over ? 'text-rose' : alert ? 'text-gold' : 'text-sage'}" style="font-weight:600">${statusLabel}</span>
    </div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:600;margin-bottom:4px">${b.category}</div>
    <div class="flex-between mb-8">
      <span class="text-sm ${over ? 'text-rose' : 'text-ink'}" style="font-weight:600">${fmt(b.spent)} spent</span>
      <span class="text-sm text-muted">limit ${fmt(b.limit)}</span>
    </div>
    ${progBar(pct, 'sage')}
    <div class="flex-between mt-8">
      <span class="text-xs text-muted">${pct}% used</span>
      <span class="text-xs ${over ? 'text-rose' : 'text-sage'}">${over ? 'Over by ' + fmt(b.spent - b.limit) : 'Left: ' + fmt(b.limit - b.spent)}</span>
    </div>
    <button class="btn btn-danger btn-sm mt-12" style="width:100%" onclick="deleteBudget('${b._id}')">Remove Budget</button>
  </div>`;
}

async function saveBudget() {
  const category = ge('budget-category').value;
  const limit = parseFloat(ge('budget-limit').value);
  if (!category) { toast('Select a category', 'error'); return; }
  if (!limit || limit < 1) { toast('Enter a valid limit', 'error'); return; }
  try {
    await API.post('/budgets', { category, limit, alertAt: parseInt(ge('budget-alert').value) || 80 });
    toast('Budget created!', 'success');
    closeModal('modal-add-budget');
    loadBudgets();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function deleteBudget(id) {
  if (!confirm('Remove this budget?')) return;
  try {
    await API.delete('/budgets/' + id);
    toast('Budget removed', 'info');
    loadBudgets();
  } catch (ex) { toast(ex.message, 'error'); }
}

// ═══════════════════════════════════
// REPORTS
// ═══════════════════════════════════
async function loadReports() {
  try {
    const [sumRes, catRes] = await Promise.all([
      API.get('/transactions/summary'),
      API.get('/transactions/top-categories?months=6')
    ]);
    renderReportStats(sumRes.data);
    renderReportTrendChart(sumRes.data.monthly);
    renderReportPieChart(sumRes.data.categoryBreakdown);
    renderTopCats(catRes.data);
    renderSavingsRateChart(sumRes.data.monthly);
  } catch (ex) { toast('Failed to load reports', 'error'); }
}

function renderReportStats(data) {
  const balance = (data.monthlyIncome || 0) - (data.monthlyExpense || 0);
  const avgDaily = data.monthlyExpense > 0 ? Math.round(data.monthlyExpense / 30) : 0;
  setH('reports-stats', `
    <div class="stat-card sage"><div class="stat-icon sage">💰</div><div class="stat-label">This Month Income</div><div class="stat-value">${fmtK(data.monthlyIncome)}</div></div>
    <div class="stat-card rose"><div class="stat-icon rose">💸</div><div class="stat-label">This Month Expense</div><div class="stat-value">${fmtK(data.monthlyExpense)}</div></div>
    <div class="stat-card ${balance >= 0 ? 'sky' : 'rose'}"><div class="stat-icon ${balance >= 0 ? 'sky' : 'rose'}">📊</div><div class="stat-label">Net Savings</div><div class="stat-value">${fmtK(balance)}</div></div>
    <div class="stat-card gold"><div class="stat-icon gold">📅</div><div class="stat-label">Daily Average Spend</div><div class="stat-value">${fmtK(avgDaily)}</div></div>
  `);
}

function renderReportTrendChart(monthly) {
  killChart('chart-report-trend');
  if (!monthly || !monthly.length) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const grouped = {};
  monthly.forEach(m => {
    const key = `${m._id.year}-${m._id.month}`;
    if (!grouped[key]) grouped[key] = { label: months[m._id.month-1] + ' ' + String(m._id.year).slice(2), income: 0, expense: 0 };
    grouped[key][m._id.type] = m.total;
  });
  const vals = Object.values(grouped).slice(-6);
  const ctx = ge('chart-report-trend').getContext('2d');
  S.charts['chart-report-trend'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: vals.map(v => v.label),
      datasets: [
        { label: 'Income', data: vals.map(v => v.income), backgroundColor: 'rgba(61,114,100,.7)', borderColor: '#3d7264', borderWidth: 1 },
        { label: 'Expense', data: vals.map(v => v.expense), backgroundColor: 'rgba(184,72,64,.7)', borderColor: '#b84840', borderWidth: 1 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 } } }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } }, scales: { x: { grid: { color: '#f0ece5' }, ticks: { font: { family: 'DM Sans', size: 11 } } }, y: { grid: { color: '#f0ece5' }, ticks: { font: { family: 'DM Sans', size: 11 }, callback: v => fmtK(v) } } } }
  });
}

function renderReportPieChart(cats) {
  killChart('chart-report-pie');
  if (!cats || !cats.length) return;
  const colors = ['#b84840','#345f91','#a87228','#3d7264','#7c5cbf','#e07c3a','#3a8fa8','#a84040'];
  const ctx = ge('chart-report-pie').getContext('2d');
  S.charts['chart-report-pie'] = new Chart(ctx, {
    type: 'pie',
    data: { labels: cats.map(c => c._id), datasets: [{ data: cats.map(c => c.total), backgroundColor: colors.slice(0, cats.length), borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 10 }, usePointStyle: true } }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } } }
  });
}

function renderTopCats(cats) {
  if (!cats || !cats.length) { setH('report-top-cats', '<div class="text-sm text-muted" style="padding:16px">No expense data available</div>'); return; }
  const max = cats[0].total;
  setH('report-top-cats', cats.map(c => `
    <div style="margin-bottom:14px">
      <div class="flex-between mb-4">
        <span class="text-sm" style="font-weight:500">${CAT_ICONS[c._id] || '📦'} ${c._id}</span>
        <span class="text-sm" style="font-weight:600;color:var(--rose)">${fmt(c.total)}</span>
      </div>
      ${progBar(Math.round((c.total / max) * 100), 'rose')}
      <div class="text-xs text-muted mt-4">${c.count} transactions · avg ${fmt(c.avg)}</div>
    </div>
  `).join(''));
}

function renderSavingsRateChart(monthly) {
  killChart('chart-savings-rate');
  if (!monthly || !monthly.length) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const grouped = {};
  monthly.forEach(m => {
    const key = `${m._id.year}-${m._id.month}`;
    if (!grouped[key]) grouped[key] = { label: months[m._id.month-1], income: 0, expense: 0 };
    grouped[key][m._id.type] = m.total;
  });
  const vals = Object.values(grouped).slice(-6);
  const rates = vals.map(v => v.income > 0 ? Math.round(((v.income - v.expense) / v.income) * 100) : 0);
  const ctx = ge('chart-savings-rate').getContext('2d');
  S.charts['chart-savings-rate'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: vals.map(v => v.label),
      datasets: [{ label: 'Savings Rate %', data: rates, borderColor: '#3d7264', backgroundColor: 'rgba(61,114,100,.1)', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#3d7264' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + ctx.raw + '%' } } }, scales: { x: { grid: { color: '#f0ece5' }, ticks: { font: { family: 'DM Sans', size: 11 } } }, y: { grid: { color: '#f0ece5' }, ticks: { font: { family: 'DM Sans', size: 11 }, callback: v => v + '%' }, suggestedMin: 0, suggestedMax: 50 } } }
  });
}

// ═══════════════════════════════════
// INVESTMENTS
// ═══════════════════════════════════
const INVESTMENTS = [
  { type: 'Mutual Fund', name: 'Parag Parikh Flexi Cap Fund', return: '+22.4% p.a.', risk: 'Moderate', positive: true, tags: ['Equity', 'Multi-cap', 'Long-term'] },
  { type: 'SIP', name: 'Mirae Asset Large Cap Fund', return: '+18.7% p.a.', risk: 'Low-Moderate', positive: true, tags: ['Large Cap', 'Stable', 'SIP Recommended'] },
  { type: 'ETF', name: 'Nifty 50 ETF', return: '+16.2% p.a.', risk: 'Moderate', positive: true, tags: ['Index', 'Passive', 'Diversified'] },
  { type: 'Mutual Fund', name: 'Axis Small Cap Fund', return: '+28.1% p.a.', risk: 'High', positive: true, tags: ['Small Cap', 'Aggressive'] },
  { type: 'SIP', name: 'HDFC Balanced Advantage Fund', return: '+14.3% p.a.', risk: 'Low', positive: true, tags: ['Balanced', 'Conservative'] },
  { type: 'ETF', name: 'Gold BeES ETF', return: '+12.1% p.a.', risk: 'Low', positive: true, tags: ['Gold', 'Hedge', 'Safety'] },
  { type: 'Mutual Fund', name: 'SBI Bluechip Fund', return: '+17.5% p.a.', risk: 'Low-Moderate', positive: true, tags: ['Bluechip', 'Dividend'] },
  { type: 'SIP', name: 'Kotak Emerging Equity Fund', return: '-3.2% (1Y)', risk: 'Very High', positive: false, tags: ['Emerging', 'High Risk'] },
];

function loadInvestments() {
  const riskProfile = S.user?.financialProfile?.riskAppetite || 'Moderate';
  const riskColors = { Low: 'sage', Moderate: 'sky', High: 'rose' };
  setH('risk-profile-content', `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2.5rem;margin-bottom:8px">${riskProfile === 'Low' ? '🛡️' : riskProfile === 'High' ? '🚀' : '⚖️'}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700">${riskProfile} Risk Appetite</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="flex-between"><span class="text-sm text-muted">Recommended Equity</span><strong class="text-sm">${riskProfile === 'Low' ? '30%' : riskProfile === 'High' ? '80%' : '60%'}</strong></div>
      <div class="flex-between"><span class="text-sm text-muted">Debt Allocation</span><strong class="text-sm">${riskProfile === 'Low' ? '50%' : riskProfile === 'High' ? '10%' : '30%'}</strong></div>
      <div class="flex-between"><span class="text-sm text-muted">Gold / Alternatives</span><strong class="text-sm">${riskProfile === 'Low' ? '20%' : riskProfile === 'High' ? '10%' : '10%'}</strong></div>
    </div>
    <div class="divider"></div>
    <p class="text-sm text-muted">Based on your profile, we recommend ${riskProfile === 'Low' ? 'conservative funds with capital protection focus' : riskProfile === 'High' ? 'aggressive growth funds for maximum returns' : 'a balanced mix of growth and stability'}.</p>
    <button class="btn btn-outline btn-sm mt-12 w-full" onclick="navTo('profile')">Update Risk Profile →</button>
  `);
  filterInvest(S.investFilter);
}

function filterInvest(filter, btn) {
  S.investFilter = filter;
  if (btn) {
    btn.closest('.tabs-row') && btn.closest('.tabs-row').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const filtered = filter === 'all' ? INVESTMENTS : INVESTMENTS.filter(i => i.type === filter);
  setH('invest-list', filtered.map(inv => `
    <div class="invest-card fade-up">
      <div class="invest-type badge badge-${inv.risk.includes('High') ? 'rose' : inv.risk === 'Low' ? 'sage' : 'sky'}">${inv.type}</div>
      <div class="invest-name">${inv.name}</div>
      <div class="invest-return ${inv.positive ? 'positive' : 'negative'}">${inv.return}</div>
      <div class="invest-risk">Risk: ${inv.risk}</div>
      <div class="invest-tags">${inv.tags.map(t => `<span class="badge badge-ink" style="font-size:.68rem">${t}</span>`).join('')}</div>
      <button class="btn btn-outline btn-sm mt-12 w-full">Learn More →</button>
    </div>
  `).join(''));
}

// ═══════════════════════════════════
// NEWS (Static curated content)
// ═══════════════════════════════════
const NEWS_ITEMS = [
  { cat: 'market', tag: 'Markets', color: 'var(--sky)', icon: '📈', title: 'Nifty 50 Crosses 22,500 Mark Amid Broad Rally', desc: 'Indian equity markets surged as IT and banking stocks led the rally, with Nifty breaching key resistance levels.', time: '2h ago', emoji: '📊' },
  { cat: 'personal', tag: 'Personal Finance', color: 'var(--sage)', icon: '💰', title: 'SIP Investments Hit Record ₹19,271 Crore in February', desc: 'Systematic Investment Plans see historic inflows as retail investors show growing confidence in equity mutual funds.', time: '4h ago', emoji: '💼' },
  { cat: 'economy', tag: 'Economy', color: 'var(--gold)', icon: '🏛️', title: 'RBI Keeps Repo Rate Unchanged at 6.5%', desc: 'The Reserve Bank of India maintains its stance on inflation management while supporting economic growth.', time: '6h ago', emoji: '🏦' },
  { cat: 'crypto', tag: 'Crypto', color: 'var(--rose)', icon: '🪙', title: 'Bitcoin Tests $70,000 Support as ETF Flows Continue', desc: 'Global cryptocurrency markets remain volatile as institutional demand through ETFs continues at a steady pace.', time: '3h ago', emoji: '₿' },
  { cat: 'personal', tag: 'Tax Planning', color: 'var(--purple)', icon: '📋', title: 'New Tax Regime vs Old: Which is Better in FY25?', desc: 'A detailed analysis of both tax regimes and how to choose the one that saves you more money this financial year.', time: '1d ago', emoji: '📊' },
  { cat: 'market', tag: 'IPO', color: 'var(--sky)', icon: '🚀', title: 'Upcoming IPO Pipeline: Top Picks for Q1 2025', desc: 'Several major companies are set to debut on Indian stock exchanges. Here is what investors need to know.', time: '8h ago', emoji: '📉' },
  { cat: 'economy', tag: 'Real Estate', color: 'var(--gold)', icon: '🏠', title: 'Home Loan Rates: Best Banks Offering Under 8.5%', desc: 'Comparison of home loan interest rates across major banks and NBFCs to help you find the best deal.', time: '1d ago', emoji: '🏡' },
  { cat: 'personal', tag: 'Insurance', color: 'var(--sage)', icon: '🛡️', title: 'Term Insurance: Why You Need It Before 30', desc: 'Financial advisors stress the importance of securing adequate term life insurance while you are young and healthy.', time: '2d ago', emoji: '📋' },
  { cat: 'crypto', tag: 'DeFi', color: 'var(--rose)', icon: '🔗', title: 'India\'s Crypto Tax Clarity Expected in Union Budget', desc: 'Industry stakeholders are awaiting clearer guidelines on virtual digital asset taxation from the government.', time: '5h ago', emoji: '🪙' },
];

function loadNews() { filterNews(S.newsFilter); }
function filterNews(filter, btn) {
  S.newsFilter = filter;
  if (btn) { btn.closest('.tabs-row').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  const filtered = filter === 'all' ? NEWS_ITEMS : NEWS_ITEMS.filter(n => n.cat === filter);
  setH('news-grid', filtered.map(n => `
    <div class="news-card fade-up">
      <div class="news-card-img" style="background:${n.color}22">${n.emoji}</div>
      <div class="news-card-body">
        <div class="news-card-tag" style="color:${n.color}">${n.tag}</div>
        <div class="news-card-title">${n.title}</div>
        <div class="news-card-desc">${n.desc}</div>
        <div class="news-card-meta"><span class="news-card-time">⏱ ${n.time}</span><button class="btn btn-ghost btn-sm" style="font-size:.76rem">Read More →</button></div>
      </div>
    </div>
  `).join(''));
}

// ═══════════════════════════════════
// COMMUNITY CHAT
// ═══════════════════════════════════
const ROOM_META = {
  general: 'General finance discussions',
  investing: 'Investment strategies and tips',
  savings: 'Savings tips and tricks',
  goals: 'Share your financial goals',
  crypto: 'Cryptocurrency discussions',
  tax: 'Tax planning and advice',
  realestate: 'Real estate investment discussions',
  budgeting: 'Budgeting help and advice',
};

function switchRoom(room, btn) {
  S.chatRoom = room;
  document.querySelectorAll('.chat-room-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  setT('chat-room-name', room);
  setT('chat-room-desc', ROOM_META[room] || 'Discussion channel');
  loadChatMessages(room);
}

async function loadChatMessages(room) {
  const container = ge('chat-messages');
  if (!container) return;
  container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  try {
    const res = await API.get('/chat?room=' + room + '&limit=40');
    if (!res.data.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No messages yet</div><div class="empty-desc">Be the first to start the conversation!</div></div>`;
      return;
    }
    container.innerHTML = res.data.map(m => chatMsgHtml(m)).join('');
    container.scrollTop = container.scrollHeight;
  } catch (_) {}
}

function chatMsgHtml(m) {
  const isOwn = S.user && m.user && m.user._id === S.user.id;
  const name = m.user ? m.user.name : 'Unknown';
  const av = initials(name);
  return `<div class="chat-msg ${isOwn ? 'own' : ''}" id="msg-${m._id}">
    <div class="chat-msg-avatar">${av}</div>
    <div class="chat-msg-body">
      <div class="chat-msg-header">
        <span class="chat-msg-name">${name}</span>
        <span class="chat-msg-time">${timeAgo(m.createdAt)}</span>
        ${isOwn ? `<button class="btn btn-ghost btn-sm" onclick="deleteChatMsg('${m._id}')" style="padding:2px 6px;font-size:.72rem;color:var(--rose)">delete</button>` : ''}
      </div>
      <div class="chat-msg-text">${m.message}</div>
      <div class="chat-msg-likes" onclick="likeMsg('${m._id}')">❤️ ${m.likes ? m.likes.length : 0}</div>
    </div>
  </div>`;
}

async function sendChatMessage() {
  const input = ge('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  try {
    const res = await API.post('/chat', { message: msg, room: S.chatRoom });
    const container = ge('chat-messages');
    const empState = container.querySelector('.empty-state');
    if (empState) empState.remove();
    container.insertAdjacentHTML('beforeend', chatMsgHtml(res.data));
    container.scrollTop = container.scrollHeight;
  } catch (ex) { toast(ex.message, 'error'); input.value = msg; }
}

function handleChatKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }

async function likeMsg(id) {
  try { await API.post('/chat/' + id + '/like'); } catch (_) {}
}

async function deleteChatMsg(id) {
  try {
    await API.delete('/chat/' + id);
    const el = ge('msg-' + id);
    if (el) el.remove();
  } catch (ex) { toast(ex.message, 'error'); }
}

// ═══════════════════════════════════
// AI ADVISOR
// ═══════════════════════════════════
const AI_RESPONSES = {
  save: 'Great question! Here are proven ways to save more:\n\n1. **50/30/20 Rule** — 50% needs, 30% wants, 20% savings\n2. **Automate savings** — Set up auto-transfer on salary day\n3. **Track every expense** — Awareness alone reduces spending by 15-20%\n4. **Cut subscriptions** — Review and cancel unused services\n5. **Cook at home** — Dining out is typically 3-4x more expensive\n\nBased on your spending pattern, focus on reducing discretionary expenses first.',
  invest: 'Smart investing for Indians in 2024:\n\n1. **Emergency Fund First** — 6 months expenses in liquid funds\n2. **PPF** — Tax-free, government-backed, 7.1% p.a.\n3. **ELSS Mutual Funds** — Tax saving + equity growth, lock-in 3 years\n4. **Index Funds/ETFs** — Low cost, market returns, Nifty 50\n5. **SIP Strategy** — Start small (₹500/month), increase 10% annually\n\nYour risk profile determines the equity:debt ratio. Want a personalized allocation?',
  budget: 'Here is a budgeting framework for you:\n\n**Monthly Budget Template:**\n- Housing/Rent: 25-30% of income\n- Food & Groceries: 15-20%\n- Transport: 10-15%\n- Healthcare: 5-10%\n- Entertainment: 5-10%\n- Savings & Investments: 20%+\n- Emergency Buffer: 5%\n\nI recommend tracking for 3 months first to understand your actual spending, then set realistic limits.',
  home: 'Buying a home in India — key considerations:\n\n1. **Down Payment** — Save at least 20% (avoids PMI, reduces EMI)\n2. **EMI Rule** — Should not exceed 30-35% of monthly income\n3. **Location Research** — Check metro connectivity, schools, future development\n4. **Legal Due Diligence** — RERA registration, clear title, no encumbrance\n5. **Tax Benefits** — Section 80C (principal), 24(b) (interest up to ₹2L)\n\nFor a ₹50L home, you need ₹10L down payment + ₹2-3L registration costs.',
  debt: 'Debt reduction strategy:\n\n**Avalanche Method** (Mathematically optimal):\n1. List all debts by interest rate (highest first)\n2. Pay minimums on all debts\n3. Put extra money on highest interest debt\n4. Once paid, roll payment to next debt\n\n**Quick wins:**\n- Consolidate high-interest credit card debt\n- Avoid taking new debt while repaying\n- Consider balance transfer offers (0% for 6-12 months)\n- Sell unused assets to accelerate repayment',
  analyze: 'Based on your FinFolio data, here is your spending analysis:\n\n📊 **This Month:**\nYour top expense categories are visible in your dashboard. Common patterns I see:\n\n- **Food & Dining** often represents 20-25% of expenses\n- **Shopping** tends to spike on weekends\n- **Subscriptions** are easy to forget — review yours quarterly\n\n💡 **Recommendations:**\n1. Set category budgets for your top 3 expense areas\n2. Enable budget alerts at 80% usage\n3. Review recurring payments monthly\n\nWant me to help you set up specific budgets?',
};

function getAIResponse(msg) {
  const m = msg.toLowerCase();
  if (m.includes('save') || m.includes('saving')) return AI_RESPONSES.save;
  if (m.includes('invest') || m.includes('mutual') || m.includes('sip') || m.includes('stock')) return AI_RESPONSES.invest;
  if (m.includes('budget') || m.includes('plan') || m.includes('allocat')) return AI_RESPONSES.budget;
  if (m.includes('home') || m.includes('house') || m.includes('property') || m.includes('real estate')) return AI_RESPONSES.home;
  if (m.includes('debt') || m.includes('loan') || m.includes('credit')) return AI_RESPONSES.debt;
  if (m.includes('analy') || m.includes('spend') || m.includes('pattern')) return AI_RESPONSES.analyze;
  return 'That is a great financial question! Here are some general principles:\n\n1. **Track before you optimize** — Know exactly where your money goes\n2. **Pay yourself first** — Save before spending on wants\n3. **Diversify income streams** — Don\'t rely on a single income source\n4. **Invest consistently** — Time in the market beats timing the market\n5. **Review quarterly** — Your financial situation changes, so should your plan\n\nCould you be more specific about what you\'d like help with? I can provide personalized advice on budgeting, investing, debt reduction, or goal planning!';
}

function sendAiPrompt(text) {
  const input = ge('ai-input');
  if (input) { input.value = text; sendAiMessage(); }
}

async function sendAiMessage() {
  const input = ge('ai-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  const container = ge('ai-messages');
  container.insertAdjacentHTML('beforeend', `
    <div class="ai-msg user">
      <div class="ai-msg-icon user">👤</div>
      <div class="ai-bubble user">${msg}</div>
    </div>
  `);
  container.insertAdjacentHTML('beforeend', `<div class="ai-msg" id="ai-typing-indicator">
    <div class="ai-msg-icon bot">🤖</div>
    <div class="ai-bubble bot"><div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div></div>
  </div>`);
  container.scrollTop = container.scrollHeight;

  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

  const typing = ge('ai-typing-indicator');
  if (typing) typing.remove();

  const response = getAIResponse(msg);
  container.insertAdjacentHTML('beforeend', `
    <div class="ai-msg">
      <div class="ai-msg-icon bot">🤖</div>
      <div class="ai-bubble bot">${response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
    </div>
  `);
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════════════
// PROFILE
// ═══════════════════════════════════
async function loadProfile() {
  if (!S.user) return;
  const u = S.user;
  setT('profile-name', u.name);
  setT('profile-email', u.email);
  setT('profile-bio', u.bio || 'No bio added yet.');
  setH('profile-avatar', initials(u.name));
  setH('profile-plan-badge', u.plan + ' Plan');
  setT('profile-joined', 'Joined ' + new Date(u.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
  ge('edit-name').value = u.name || '';
  ge('edit-bio').value = u.bio || '';
  ge('edit-income').value = u.financialProfile?.monthlyIncome || '';
  ge('edit-risk').value = u.financialProfile?.riskAppetite || 'Moderate';

  try {
    const res = await API.get('/transactions/summary');
    const d = res.data;
    setH('profile-stats', `
      <div class="flex-between mb-12"><span class="text-sm text-muted">Monthly Income</span><strong>${fmt(d.monthlyIncome)}</strong></div>
      <div class="flex-between mb-12"><span class="text-sm text-muted">Monthly Expenses</span><strong>${fmt(d.monthlyExpense)}</strong></div>
      <div class="flex-between mb-12"><span class="text-sm text-muted">Net Savings (Month)</span><strong style="color:${(d.monthlyIncome - d.monthlyExpense) >= 0 ? 'var(--sage)' : 'var(--rose)'}">${fmt(d.monthlyIncome - d.monthlyExpense)}</strong></div>
      <div class="flex-between"><span class="text-sm text-muted">Total Transactions</span><strong>${(d.incomeCount || 0) + (d.expenseCount || 0)}</strong></div>
    `);
  } catch (_) {}
}

async function saveProfile(e) {
  e.preventDefault();
  try {
    const res = await API.put('/auth/profile', {
      name: ge('edit-name').value,
      bio: ge('edit-bio').value,
      financialProfile: {
        monthlyIncome: parseFloat(ge('edit-income').value) || 0,
        riskAppetite: ge('edit-risk').value,
      }
    });
    S.user = res.data;
    toast('Profile saved!', 'success');
    updateSidebarUser();
    loadProfile();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function changePassword(e) {
  e.preventDefault();
  const newPass = ge('cp-new').value;
  const confirm = ge('cp-confirm').value;
  if (newPass !== confirm) { toast('Passwords do not match', 'error'); return; }
  try {
    await API.put('/auth/change-password', { currentPassword: ge('cp-current').value, newPassword: newPass });
    toast('Password changed!', 'success');
    ge('cp-current').value = ''; ge('cp-new').value = ''; ge('cp-confirm').value = '';
  } catch (ex) { toast(ex.message, 'error'); }
}

function exportData() { toast('Exporting your data... (Download will start shortly)', 'info'); }
function confirmDeleteAccount() { if (confirm('Are you sure? This will permanently delete your account and all data.')) { toast('Please contact support to delete your account.', 'warning'); } }

// ═══════════════════════════════════
// SETTINGS
// ═══════════════════════════════════
function loadSettings() {
  if (!S.user) return;
  const pref = S.user.preferences || {};
  const currEl = ge('setting-currency');
  if (currEl) currEl.value = pref.currency || 'INR';
  const budgEl = ge('setting-budget');
  if (budgEl) budgEl.value = pref.monthlyBudget || '';
  const notifEl = ge('setting-notif');
  if (notifEl) notifEl.checked = pref.notifications !== false;
  const planEl = ge('settings-plan-badge');
  if (planEl) planEl.textContent = S.user.plan;
}

async function saveSetting(key, value) {
  try {
    const res = await API.put('/auth/profile', { preferences: { [key]: value } });
    S.user = res.data;
    toast('Setting saved', 'success');
  } catch (ex) { toast(ex.message, 'error'); }
}

// ═══════════════════════════════════
// SUPPORT
// ═══════════════════════════════════
async function loadSupportTickets() {
  const container = ge('tickets-list');
  if (!container) return;
  container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  try {
    const res = await API.get('/support');
    if (!res.data.length) {
      container.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-icon">🛟</div><div class="empty-title">No tickets yet</div><div class="empty-desc">Submit a request if you need help</div></div>';
      return;
    }
    container.innerHTML = res.data.map(t => `
      <div class="ticket-item" onclick="openTicket('${t._id}')">
        <div class="ticket-status-dot ${t.status}"></div>
        <div style="flex:1">
          <div style="font-weight:500;font-size:.88rem">${t.subject}</div>
          <div style="font-size:.75rem;color:var(--ink4)">${t.category} · ${fmtDate(t.createdAt)}</div>
        </div>
        <span class="badge badge-${t.status === 'open' ? 'gold' : t.status === 'resolved' ? 'sage' : 'sky'}">${t.status}</span>
      </div>
    `).join('');
  } catch (_) {}
}

async function openTicket(id) {
  S.currentTicketId = id;
  try {
    const res = await API.get('/support/' + id);
    const t = res.data;
    setT('ticket-modal-title', t.subject);
    setH('ticket-detail-content', `
      <div class="flex gap-8 mb-16">
        <span class="badge badge-${t.status === 'open' ? 'gold' : 'sage'}">${t.status}</span>
        <span class="badge badge-ink">${t.category}</span>
        <span class="badge badge-ink">${t.priority} priority</span>
      </div>
      <div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
        ${t.messages.map(m => `
          <div style="display:flex;gap:10px;${m.sender === 'user' ? 'flex-direction:row-reverse' : ''}">
            <div style="width:28px;height:28px;border-radius:50%;background:${m.sender === 'user' ? 'var(--sky-light)' : 'var(--sage-light)'};display:flex;align-items:center;justify-content:center;font-size:.7rem;flex-shrink:0">${m.sender === 'user' ? '👤' : '🛟'}</div>
            <div style="max-width:80%;padding:10px 14px;background:${m.sender === 'user' ? 'var(--sky)' : 'var(--border-light)'};color:${m.sender === 'user' ? '#fff' : 'var(--ink)'};border-radius:12px;font-size:.88rem;line-height:1.5">${m.content}</div>
          </div>
        `).join('')}
      </div>
      <div class="form-group">
        <label class="form-label">Your Reply</label>
        <textarea id="ticket-reply-text" class="form-input" rows="3" placeholder="Type your reply..."></textarea>
      </div>
    `);
    openModal('modal-ticket');
  } catch (ex) { toast(ex.message, 'error'); }
}

async function replyToTicket() {
  const msg = ge('ticket-reply-text')?.value.trim();
  if (!msg || !S.currentTicketId) return;
  try {
    await API.post('/support/' + S.currentTicketId + '/reply', { message: msg });
    toast('Reply sent!', 'success');
    closeModal('modal-ticket');
    loadSupportTickets();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function submitSupportTicket(e) {
  e.preventDefault();
  const btn = ge('sup-submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting...';
  try {
    await API.post('/support', {
      subject: ge('sup-subject').value,
      category: ge('sup-category').value,
      priority: ge('sup-priority').value,
      message: ge('sup-message').value,
    });
    toast('Ticket submitted! We will respond within 24 hours.', 'success');
    ge('sup-subject').value = ''; ge('sup-message').value = '';
    loadSupportTickets();
  } catch (ex) {
    toast(ex.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Submit Ticket';
  }
}
