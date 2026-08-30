// ========================================
// 管理后台逻辑
// ========================================

const PAGE_SIZE = 10;
let currentPage = 1;
let filteredData = [];

document.addEventListener('DOMContentLoaded', function() {
  // 检查登录状态
  if (!isAdminLoggedIn()) {
    showToast('请先登录', 'warning');
    window.location.href = 'login.html';
    return;
  }

  // 显示管理员名
  const sess = getAdminSession();
  const nameEl = document.getElementById('adminName');
  if (nameEl && sess) nameEl.textContent = sess.user;

  // 设置默认日期范围（本月）
  const today = getToday();
  const startOfMonth = today.substring(0, 8) + '01';
  const fStart = document.getElementById('fStartDate');
  const fEnd = document.getElementById('fEndDate');
  if (fStart && !fStart.value) fStart.value = startOfMonth;
  if (fEnd && !fEnd.value) fEnd.value = today;

  updatePeipeiFilter();
  applyFilters();
});

function updatePeipeiFilter() {
  const sel = document.getElementById('fPeipei');
  if (!sel) return;
  const current = sel.value;
  const peipeis = getUniquePeipeis();
  sel.innerHTML = '<option value="">全部陪陪</option>' + peipeis.map(p => '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + '</option>').join('');
  sel.value = current;
}

function applyFilters() {
  const reports = getReports();
  const start = document.getElementById('fStartDate').value;
  const end = document.getElementById('fEndDate').value;
  const peipei = document.getElementById('fPeipei').value;
  const project = document.getElementById('fProject').value;

  filteredData = reports.filter(r => {
    if (start && r.date < start) return false;
    if (end && r.date > end) return false;
    if (peipei && r.peipei !== peipei) return false;
    if (project && r.project !== project) return false;
    return true;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  currentPage = 1;
  renderTable();
  renderSummary();
  updateStats();
}

function resetFilters() {
  document.getElementById('fStartDate').value = '';
  document.getElementById('fEndDate').value = '';
  document.getElementById('fPeipei').value = '';
  document.getElementById('fProject').value = '';
  applyFilters();
}

function updateStats() {
  const totalOrders = filteredData.length;
  const totalPrice = filteredData.reduce((s, r) => s + r.unit_price, 0);
  const totalActual = filteredData.reduce((s, r) => s + r.actual_amount, 0);
  const activePeipei = new Set(filteredData.map(r => r.peipei)).size;

  const elOrders = document.getElementById('statTotalOrders');
  const elPrice = document.getElementById('statTotalPrice');
  const elActual = document.getElementById('statTotalActual');
  const elActive = document.getElementById('statActivePeipei');
  const elCount = document.getElementById('recordCount');

  if (elOrders) elOrders.textContent = totalOrders;
  if (elPrice) elPrice.textContent = formatMoney(totalPrice);
  if (elActual) elActual.textContent = formatMoney(totalActual);
  if (elActive) elActive.textContent = activePeipei;
  if (elCount) elCount.textContent = '共 ' + totalOrders + ' 条记录';
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">暂无数据</td></tr>';
    renderPagination(0);
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredData.slice(start, start + PAGE_SIZE);

  const projectColors = {
    '王者娱乐': 'tag-blue',
    '相机': 'tag-green',
    '其他': 'tag-purple'
  };

  tbody.innerHTML = pageData.map(r => {
    const tagClass = projectColors[r.project] || 'tag-gray';
    return '<tr>' +
      '<td>#' + r.id + '</td>' +
      '<td>' + r.date + '</td>' +
      '<td>' + escapeHtml(r.banban) + '</td>' +
      '<td>' + escapeHtml(r.peipei) + '</td>' +
      '<td>' + escapeHtml(r.zhishu) + '</td>' +
      '<td><span class="tag ' + tagClass + '">' + r.project + '</span></td>' +
      '<td style="text-align:right" class="amount">' + formatMoney(r.unit_price) + '</td>' +
      '<td style="text-align:right" class="amount">' + formatMoney(r.actual_amount) + '</td>' +
      '<td><div class="row-actions"><button class="btn btn-icon btn-sm" onclick="deleteReport(' + r.id + ')" title="删除" style="color:var(--danger)">' + icon('delete', 16) + '</button></div></td>' +
      '</tr>';
  }).join('');

  renderPagination(filteredData.length);
}

function renderPagination(total) {
  const container = document.getElementById('pagination');
  if (!container) return;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  let html = '';

  html += '<button class="btn btn-sm" onclick="goPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>' + icon('left', 16) + '</button>';

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += '<button class="btn btn-sm page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goPage(' + i + ')">' + i + '</button>';
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += '<span class="page-info">...</span>';
    }
  }

  html += '<button class="btn btn-sm" onclick="goPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>' + icon('right', 16) + '</button>';
  html += '<span class="page-info">' + currentPage + ' / ' + totalPages + '</span>';

  container.innerHTML = html;
}

function goPage(p) {
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderTable();
}

function renderSummary() {
  const tbody = document.getElementById('summaryBody');
  if (!tbody) return;

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">暂无数据</td></tr>';
    return;
  }

  const groups = {};
  filteredData.forEach(r => {
    if (!groups[r.peipei]) groups[r.peipei] = { count: 0, price: 0, actual: 0 };
    groups[r.peipei].count++;
    groups[r.peipei].price += r.unit_price;
    groups[r.peipei].actual += r.actual_amount;
  });

  const sorted = Object.entries(groups).sort((a, b) => b[1].actual - a[1].actual);

  let html = sorted.map(([name, d]) => {
    const avg = d.price / d.count;
    return '<tr>' +
      '<td><strong>' + escapeHtml(name) + '</strong></td>' +
      '<td style="text-align:right">' + d.count + '</td>' +
      '<td style="text-align:right" class="amount">' + formatMoney(d.price) + '</td>' +
      '<td style="text-align:right" class="amount" style="color:var(--chart-1)">' + formatMoney(d.actual) + '</td>' +
      '<td style="text-align:right">' + formatMoney(avg) + '</td>' +
      '</tr>';
  }).join('');

  const totalCount = filteredData.length;
  const totalPrice = filteredData.reduce((s, r) => s + r.unit_price, 0);
  const totalActual = filteredData.reduce((s, r) => s + r.actual_amount, 0);
  const totalAvg = totalPrice / totalCount;

  html += '<tr class="total-row">' +
    '<td><strong>合计</strong></td>' +
    '<td style="text-align:right"><strong>' + totalCount + '</strong></td>' +
    '<td style="text-align:right" class="amount"><strong>' + formatMoney(totalPrice) + '</strong></td>' +
    '<td style="text-align:right" class="amount"><strong style="color:var(--chart-1)">' + formatMoney(totalActual) + '</strong></td>' +
    '<td style="text-align:right"><strong>' + formatMoney(totalAvg) + '</strong></td>' +
    '</tr>';

  tbody.innerHTML = html;
}

function deleteReport(id) {
  if (!confirm('确定要删除这条报备记录吗？')) return;
  deleteReportById(id);
  applyFilters();
  showToast('删除成功', 'success');
}

function exportData() {
  if (filteredData.length === 0) {
    showToast('没有可导出的数据', 'warning');
    return;
  }

  // 明细表
  const headers = ['ID', '日期', '板板', '陪陪', '直属', '项目', '单价', '到手金额', '创建时间'];
  const rows = filteredData.map(r => [
    r.id, r.date, r.banban, r.peipei, r.zhishu, r.project,
    r.unit_price.toFixed(2), r.actual_amount.toFixed(2), r.created_at
  ]);

  let csv = '\uFEFF' + headers.join(',') + '\n';
  rows.forEach(row => { csv += row.join(',') + '\n'; });

  // 汇总表
  csv += '\n\n按陪陪统计汇总\n';
  csv += '陪陪,总单数,总订单金额,总到手金额,平均单价\n';

  const groups = {};
  filteredData.forEach(r => {
    if (!groups[r.peipei]) groups[r.peipei] = { count: 0, price: 0, actual: 0 };
    groups[r.peipei].count++;
    groups[r.peipei].price += r.unit_price;
    groups[r.peipei].actual += r.actual_amount;
  });
  Object.entries(groups).sort((a, b) => b[1].actual - a[1].actual).forEach(([name, d]) => {
    csv += [name, d.count, d.price.toFixed(2), d.actual.toFixed(2), (d.price / d.count).toFixed(2)].join(',') + '\n';
  });

  const totalCount = filteredData.length;
  const totalPrice = filteredData.reduce((s, r) => s + r.unit_price, 0);
  const totalActual = filteredData.reduce((s, r) => s + r.actual_amount, 0);
  csv += ['合计', totalCount, totalPrice.toFixed(2), totalActual.toFixed(2), (totalPrice / totalCount).toFixed(2)].join(',') + '\n';

  // 下载
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const start = document.getElementById('fStartDate').value || 'all';
  const end = document.getElementById('fEndDate').value || 'all';
  link.href = URL.createObjectURL(blob);
  link.download = '报备汇总_' + start + '_' + end + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);

  showToast('导出成功', 'success');
}

function logout() {
  clearAdminSession();
  showToast('已退出登录', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 400);
}
