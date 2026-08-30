// ========================================
// 数据层 - localStorage 封装
// ========================================

const STORAGE_KEY = 'club_reports_v1';
const ADMIN_KEY = 'club_admin_session';

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getReports() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}

function saveReports(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function getNextId() {
  const reports = getReports();
  return reports.length > 0 ? Math.max(...reports.map(r => r.id)) + 1 : 1;
}

function addReport(report) {
  const reports = getReports();
  reports.push(report);
  saveReports(reports);
}

function deleteReportById(id) {
  const reports = getReports().filter(r => r.id !== id);
  saveReports(reports);
}

function getUniquePeipeis() {
  const reports = getReports();
  return [...new Set(reports.map(r => r.peipei).filter(Boolean))].sort();
}

// ---- Admin session ----
function setAdminSession(user) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify({ user: user, time: Date.now() }));
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_KEY);
}

function getAdminSession() {
  try {
    const sess = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
    if (sess && sess.time && (Date.now() - sess.time < 24 * 60 * 60 * 1000)) {
      return sess;
    }
  } catch (e) {}
  return null;
}

function isAdminLoggedIn() {
  return getAdminSession() !== null;
}

// ---- Demo data ----
function initDemoData() {
  const existing = getReports();
  if (existing.length > 0) return;
  const demo = [
    { id: 1, date: '2026-08-28', banban: '小星星', peipei: '阿狸', zhishu: '江浩', project: '王者娱乐', unit_price: 88.00, actual_amount: 70.40, created_at: '2026-08-28T10:30:00Z' },
    { id: 2, date: '2026-08-28', banban: '月亮船', peipei: '小鹿', zhishu: '江浩', project: '相机', unit_price: 150.00, actual_amount: 120.00, created_at: '2026-08-28T14:20:00Z' },
    { id: 3, date: '2026-08-29', banban: '风之子', peipei: '阿狸', zhishu: '江浩', project: '王者娱乐', unit_price: 66.00, actual_amount: 52.80, created_at: '2026-08-29T09:15:00Z' },
    { id: 4, date: '2026-08-29', banban: '云朵', peipei: '小鹿', zhishu: '江浩', project: '王者娱乐', unit_price: 99.99, actual_amount: 79.99, created_at: '2026-08-29T16:45:00Z' },
    { id: 5, date: '2026-08-29', banban: '夜行者', peipei: '阿狸', zhishu: '江浩', project: '其他', unit_price: 200.00, actual_amount: 160.00, created_at: '2026-08-29T20:00:00Z' },
    { id: 6, date: '2026-08-30', banban: '阳光', peipei: '小鹿', zhishu: '江浩', project: '相机', unit_price: 120.00, actual_amount: 96.00, created_at: '2026-08-30T11:30:00Z' },
    { id: 7, date: '2026-08-30', banban: '彩虹', peipei: '阿狸', zhishu: '江浩', project: '王者娱乐', unit_price: 50.00, actual_amount: 40.00, created_at: '2026-08-30T13:00:00Z' },
    { id: 8, date: '2026-08-30', banban: '流星', peipei: '小鹿', zhishu: '江浩', project: '王者娱乐', unit_price: 80.00, actual_amount: 64.00, created_at: '2026-08-30T15:20:00Z' },
  ];
  saveReports(demo);
}

// 自动初始化
initDemoData();
