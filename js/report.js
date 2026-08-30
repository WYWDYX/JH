// ========================================
// 填报页逻辑
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // 设置默认日期
  const dateInput = document.getElementById('rDate');
  if (dateInput) dateInput.value = getToday();

  // 初始化陪陪自动补全
  updatePeipeiDatalist();
});

function updatePreview() {
  const priceInput = document.getElementById('rPrice');
  const previewEl = document.getElementById('previewAmount');
  const hintEl = document.getElementById('priceHint');
  if (!priceInput || !previewEl) return;

  const price = parseFloat(priceInput.value) || 0;
  const actual = Math.round(price * 0.8 * 100) / 100;
  previewEl.textContent = '¥' + actual.toFixed(2);

  if (price <= 0 && priceInput.value !== '') {
    hintEl.classList.add('error');
    priceInput.classList.add('error');
  } else {
    hintEl.classList.remove('error');
    priceInput.classList.remove('error');
  }
}

function updatePeipeiDatalist() {
  const dl = document.getElementById('peipeiList');
  if (!dl) return;
  const peipeis = getUniquePeipeis();
  dl.innerHTML = peipeis.map(p => '<option value="' + escapeHtml(p) + '">').join('');
}

function handleReportSubmit(e) {
  e.preventDefault();
  const price = parseFloat(document.getElementById('rPrice').value);
  if (!price || price <= 0) {
    showToast('单价必须大于 0', 'error');
    return;
  }

  const actual = Math.round(price * 0.8 * 100) / 100;
  const report = {
    id: getNextId(),
    date: document.getElementById('rDate').value,
    banban: document.getElementById('rBanban').value.trim(),
    peipei: document.getElementById('rPeipei').value.trim(),
    zhishu: document.getElementById('rZhishu').value.trim() || '江浩',
    project: document.getElementById('rProject').value,
    unit_price: price,
    actual_amount: actual,
    created_at: new Date().toISOString()
  };

  addReport(report);
  showToast('报备提交成功！到手金额 ¥' + actual.toFixed(2), 'success');

  // 重置表单
  document.getElementById('reportForm').reset();
  document.getElementById('rDate').value = getToday();
  document.getElementById('rZhishu').value = '江浩';
  updatePreview();
  updatePeipeiDatalist();
}
