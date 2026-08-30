// ========================================
// 管理后台逻辑
// 天凛俱乐部 · 报备管理系统
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

  // 加载分成配置显示
  renderSplitConfig();

  updateFilters();
  applyFilters();
});

function updateFilters() {
  const peipeiSel = document.getElementById('fPeipei');
  const changkongSel = document.getElementById('fChangkong');
  const currentP = peipeiSel ? peipeiSel.value : '';
  const currentC = changkongSel ? changkongSel.value : '';

  const peipeis = getUniquePeipeis();
  const changkongs = getUniqueChangkongs();

  if (peipeiSel) {
    peipeiSel.innerHTML = '<option value="">全部陪陪</option>' + peipeis.map(p => '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + '</option>').join('');
    peipeiSel.value = currentP;
  }
  if (changkongSel) {
    changkongSel.innerHTML = '<option value="">全部场控</option>' + changkongs.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
    changkongSel.value = currentC;
  }
}

function applyFilters() {
  const reports = getReports();
  const start = document.getElementById('fStartDate').value;
  const end = document.getElementById('fEndDate').value;
  const peipei = document.getElementById('fPeipei').value;
  const changkong = document.getElementById('fChangkong').value;
  const project = document.getElementById('fProject').value;

  filteredData = reports.filter(r => {
    if (start && r.date < start) return false;
    if (end && r.date > end) return false;
    if (peipei && r.peipei !== peipei) return false;
    if (changkong && r.changkong !== changkong) return false;
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
  document.getElementById('fChangkong').value = '';
  document.getElementById('fProject').value = '';
  applyFilters();
}

function updateStats() {
  const totalOrders = filteredData.length;
  const totalPrice = filteredData.reduce((s, r) => s + r.unit_price, 0);
  const totalPeipei = filteredData.reduce((s, r) => s + (r.split_peipei || 0), 0);
  const activePeipei = new Set(filteredData.map(r => r.peipei)).size;

  const elOrders = document.getElementById('statTotalOrders');
  const elPrice = document.getElementById('statTotalPrice');
  const elPeipei = document.getElementById('statTotalPeipei');
  const elActive = document.getElementById('statActivePeipei');
  const elCount = document.getElementById('recordCount');

  if (elOrders) elOrders.textContent = totalOrders;
  if (elPrice) elPrice.textContent = formatMoney(totalPrice);
  if (elPeipei) elPeipei.textContent = formatMoney(totalPeipei);
  if (elActive) elActive.textContent = activePeipei;
  if (elCount) elCount.textContent = '共 ' + totalOrders + ' 条记录';
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">暂无数据</td></tr>';
    renderPagination(0);
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredData.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageData.map(r => {
    const split = {
      peipei: r.split_peipei || 0,
      changkong: r.split_changkong || 0,
      zhishu: r.split_zhishu || 0,
      owner: r.split_owner || 0
    };
    return '<tr>' +
      '<td>#' + r.id + '</td>' +
      '<td>' + r.date + '</td>' +
      '<td>' + escapeHtml(r.banban) + '</td>' +
      '<td>' + escapeHtml(r.peipei) + '</td>' +
      '<td>' + escapeHtml(r.zhishu) + '</td>' +
      '<td>' + escapeHtml(r.changkong || '-') + '</td>' +
      '<td>' + escapeHtml(r.project) + '</td>' +
      '<td style="text-align:right" class="amount">' + formatMoney(r.unit_price) + '</td>' +
      '<td style="text-align:right">' + formatMoney(split.peipei) + '</td>' +
      '<td style="text-align:right">' + formatMoney(split.changkong) + '</td>' +
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
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无数据</td></tr>';
    return;
  }

  const cfg = getSplitConfig();

  // 按陪陪汇总
  const groups = {};
  filteredData.forEach(r => {
    if (!groups[r.peipei]) groups[r.peipei] = { count: 0, price: 0, peipei: 0, changkong: 0, zhishu: 0, owner: 0 };
    groups[r.peipei].count++;
    groups[r.peipei].price += r.unit_price;
    groups[r.peipei].peipei += (r.split_peipei || 0);
    groups[r.peipei].changkong += (r.split_changkong || 0);
    groups[r.peipei].zhishu += (r.split_zhishu || 0);
    groups[r.peipei].owner += (r.split_owner || 0);
  });

  const sorted = Object.entries(groups).sort((a, b) => b[1].peipei - a[1].peipei);

  let html = sorted.map(([name, d]) => {
    return '<tr>' +
      '<td><strong>' + escapeHtml(name) + '</strong></td>' +
      '<td style="text-align:right">' + d.count + '</td>' +
      '<td style="text-align:right" class="amount">' + formatMoney(d.price) + '</td>' +
      '<td style="text-align:right" class="amount">' + formatMoney(d.peipei) + '</td>' +
      '<td style="text-align:right">' + formatMoney(d.changkong) + '</td>' +
      '<td style="text-align:right">' + formatMoney(d.zhishu) + '</td>' +
      '<td style="text-align:right">' + formatMoney(d.owner) + '</td>' +
      '</tr>';
  }).join('');

  const totalCount = filteredData.length;
  const totalPrice = filteredData.reduce((s, r) => s + r.unit_price, 0);
  const totalPeipei = filteredData.reduce((s, r) => s + (r.split_peipei || 0), 0);
  const totalChangkong = filteredData.reduce((s, r) => s + (r.split_changkong || 0), 0);
  const totalZhishu = filteredData.reduce((s, r) => s + (r.split_zhishu || 0), 0);
  const totalOwner = filteredData.reduce((s, r) => s + (r.split_owner || 0), 0);

  html += '<tr class="total-row">' +
    '<td><strong>合计</strong></td>' +
    '<td style="text-align:right"><strong>' + totalCount + '</strong></td>' +
    '<td style="text-align:right" class="amount"><strong>' + formatMoney(totalPrice) + '</strong></td>' +
    '<td style="text-align:right" class="amount"><strong>' + formatMoney(totalPeipei) + '</strong></td>' +
    '<td style="text-align:right"><strong>' + formatMoney(totalChangkong) + '</strong></td>' +
    '<td style="text-align:right"><strong>' + formatMoney(totalZhishu) + '</strong></td>' +
    '<td style="text-align:right"><strong>' + formatMoney(totalOwner) + '</strong></td>' +
    '</tr>';

  tbody.innerHTML = html;
}

function deleteReport(id) {
  if (!confirm('确定要删除这条报备记录吗？')) return;
  deleteReportById(id);
  applyFilters();
  showToast('删除成功', 'success');
}

// ========================================
// 分成配置管理
// ========================================

function renderSplitConfig() {
  const container = document.getElementById('splitConfigBody');
  if (!container) return;
  const cfg = getSplitConfig();

  container.innerHTML =
    '<tr>' +
      '<td>陪陪</td>' +
      '<td style="text-align:right">' + formatPercent(cfg.peipei) + '</td>' +
      '<td style="text-align:right">' + formatPercent(cfg.changkong) + '</td>' +
      '<td style="text-align:right">' + formatPercent(cfg.zhishu) + '</td>' +
      '<td style="text-align:right">' + formatPercent(cfg.owner) + '</td>' +
      '<td style="text-align:right"><span class="tag tag-green">' + (Math.abs(cfg.peipei + cfg.changkong + cfg.zhishu + cfg.owner - 1.0) < 0.001 ? '合计 100%' : '需调整') + '</span></td>' +
    '</tr>';
}

function toggleSplitEdit() {
  const panel = document.getElementById('splitEditPanel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none';
  panel.style.display = isHidden ? 'block' : 'none';

  if (isHidden) {
    const cfg = getSplitConfig();
    document.getElementById('sPeipei').value = cfg.peipei;
    document.getElementById('sChangkong').value = cfg.changkong;
    document.getElementById('sZhishu').value = cfg.zhishu;
    document.getElementById('sOwner').value = cfg.owner;
    updateSplitPreview();
  }
}

function updateSplitPreview() {
  const p = parseFloat(document.getElementById('sPeipei').value) || 0;
  const c = parseFloat(document.getElementById('sChangkong').value) || 0;
  const z = parseFloat(document.getElementById('sZhishu').value) || 0;
  const o = parseFloat(document.getElementById('sOwner').value) || 0;
  const total = p + c + z + o;
  const el = document.getElementById('splitTotalPreview');
  if (el) {
    el.textContent = '当前合计：' + (total * 100).toFixed(0) + '%';
    el.style.color = Math.abs(total - 1.0) < 0.001 ? 'var(--positive)' : 'var(--danger)';
  }
}

function saveSplitSettings() {
  const p = parseFloat(document.getElementById('sPeipei').value) || 0;
  const c = parseFloat(document.getElementById('sChangkong').value) || 0;
  const z = parseFloat(document.getElementById('sZhishu').value) || 0;
  const o = parseFloat(document.getElementById('sOwner').value) || 0;
  const total = p + c + z + o;

  if (Math.abs(total - 1.0) > 0.001) {
    showToast('分成比例合计必须为 100%，当前 ' + (total * 100).toFixed(1) + '%', 'error');
    return;
  }

  saveSplitConfig({ peipei: p, changkong: c, zhishu: z, owner: o });
  renderSplitConfig();
  applyFilters(); // 重新计算显示
  showToast('分成比例已保存', 'success');
  document.getElementById('splitEditPanel').style.display = 'none';
}

function resetSplitSettings() {
  if (!confirm('确定要恢复默认分成比例吗？')) return;
  resetSplitConfig();
  renderSplitConfig();
  applyFilters();
  showToast('已恢复默认分成比例', 'success');
  document.getElementById('splitEditPanel').style.display = 'none';
}

// ========================================
// 导出功能
// ========================================

function exportData() {
  if (filteredData.length === 0) {
    showToast('没有可导出的数据', 'warning');
    return;
  }

  const cfg = getSplitConfig();

  // 明细表
  const headers = ['ID', '日期', '板板', '陪陪', '直属', '场控', '单子项目', '单价', '陪陪分成', '场控分成', '直属分成', '俱乐部分成', '创建时间'];
  const rows = filteredData.map(r => [
    r.id, r.date, r.banban, r.peipei, r.zhishu, r.changkong || '', r.project,
    r.unit_price.toFixed(2),
    (r.split_peipei || 0).toFixed(2),
    (r.split_changkong || 0).toFixed(2),
    (r.split_zhishu || 0).toFixed(2),
    (r.split_owner || 0).toFixed(2),
    r.created_at
  ]);

  let csv = '\uFEFF' + headers.join(',') + '\n';
  rows.forEach(row => { csv += row.join(',') + '\n'; });

  // 汇总表
  csv += '\n\n分成配置：陪陪 ' + formatPercent(cfg.peipei) + '，场控 ' + formatPercent(cfg.changkong) +
         '，直属 ' + formatPercent(cfg.zhishu) + '，俱乐部 ' + formatPercent(cfg.owner) + '\n\n';
  csv += '按陪陪统计汇总\n';
  csv += '陪陪,总单数,总订单金额,陪陪分成,场控分成,直属分成,俱乐部分成\n';

  const groups = {};
  filteredData.forEach(r => {
    if (!groups[r.peipei]) groups[r.peipei] = { count: 0, price: 0, peipei: 0, changkong: 0, zhishu: 0, owner: 0 };
    groups[r.peipei].count++;
    groups[r.peipei].price += r.unit_price;
    groups[r.peipei].peipei += (r.split_peipei || 0);
    groups[r.peipei].changkong += (r.split_changkong || 0);
    groups[r.peipei].zhishu += (r.split_zhishu || 0);
    groups[r.peipei].owner += (r.split_owner || 0);
  });

  Object.entries(groups).sort((a, b) => b[1].peipei - a[1].peipei).forEach(([name, d]) => {
    csv += [name, d.count, d.price.toFixed(2), d.peipei.toFixed(2), d.changkong.toFixed(2), d.zhishu.toFixed(2), d.owner.toFixed(2)].join(',') + '\n';
  });

  const totalCount = filteredData.length;
  const totalPrice = filteredData.reduce((s, r) => s + r.unit_price, 0);
  const totalPeipei = filteredData.reduce((s, r) => s + (r.split_peipei || 0), 0);
  const totalChangkong = filteredData.reduce((s, r) => s + (r.split_changkong || 0), 0);
  const totalZhishu = filteredData.reduce((s, r) => s + (r.split_zhishu || 0), 0);
  const totalOwner = filteredData.reduce((s, r) => s + (r.split_owner || 0), 0);

  csv += ['合计', totalCount, totalPrice.toFixed(2), totalPeipei.toFixed(2), totalChangkong.toFixed(2), totalZhishu.toFixed(2), totalOwner.toFixed(2)].join(',') + '\n';

  // 下载
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const start = document.getElementById('fStartDate').value || 'all';
  const end = document.getElementById('fEndDate').value || 'all';
  link.href = URL.createObjectURL(blob);
  link.download = '天凛报备汇总_' + start + '_' + end + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);

  showToast('导出成功', 'success');
}

function logout() {
  clearAdminSession();
  showToast('已退出登录', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 400);
}
