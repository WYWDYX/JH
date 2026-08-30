// ========================================
// 填报页逻辑
// 天凛俱乐部 · 报备管理系统
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // 设置默认日期
  const dateInput = document.getElementById('rDate');
  if (dateInput) dateInput.value = getToday();

  // 初始化自动补全
  updateDatalists();
});

function updatePreview() {
  const priceInput = document.getElementById('rPrice');
  const previewEl = document.getElementById('previewAmount');
  const hintEl = document.getElementById('priceHint');
  if (!priceInput || !previewEl) return;

  const price = parseFloat(priceInput.value) || 0;
  const split = calculateSplit(price);
  previewEl.textContent = '¥' + split.peipei.toFixed(2);

  if (price <= 0 && priceInput.value !== '') {
    hintEl.classList.add('error');
    priceInput.classList.add('error');
  } else {
    hintEl.classList.remove('error');
    priceInput.classList.remove('error');
  }
}

function updateDatalists() {
  const peipeiDl = document.getElementById('peipeiList');
  const changkongDl = document.getElementById('changkongList');
  if (peipeiDl) {
    const peipeis = getUniquePeipeis();
    peipeiDl.innerHTML = peipeis.map(p => '<option value="' + escapeHtml(p) + '">').join('');
  }
  if (changkongDl) {
    const changkongs = getUniqueChangkongs();
    changkongDl.innerHTML = changkongs.map(c => '<option value="' + escapeHtml(c) + '">').join('');
  }
}

function handleReportSubmit(e) {
  e.preventDefault();
  const price = parseFloat(document.getElementById('rPrice').value);
  if (!price || price <= 0) {
    showToast('单价必须大于 0', 'error');
    return;
  }

  const split = calculateSplit(price);
  const report = {
    id: getNextId(),
    date: document.getElementById('rDate').value,
    banban: document.getElementById('rBanban').value.trim(),
    peipei: document.getElementById('rPeipei').value.trim(),
    zhishu: document.getElementById('rZhishu').value.trim(),
    changkong: document.getElementById('rChangkong').value.trim(),
    project: document.getElementById('rProject').value.trim(),
    unit_price: price,
    split_peipei: split.peipei,
    split_changkong: split.changkong,
    split_zhishu: split.zhishu,
    split_owner: split.owner,
    created_at: new Date().toISOString()
  };

  addReport(report);
  showToast('报备提交成功！陪陪到手 ¥' + split.peipei.toFixed(2), 'success');

  // 重置表单
  document.getElementById('reportForm').reset();
  document.getElementById('rDate').value = getToday();
  updatePreview();
  updateDatalists();

  // 清空粘贴区
  const pasteArea = document.getElementById('pasteArea');
  if (pasteArea) pasteArea.value = '';
}

// ========================================
// 粘贴文本自动识别
// ========================================

function clearPaste() {
  const pasteArea = document.getElementById('pasteArea');
  if (pasteArea) pasteArea.value = '';
}

function parseAndFill() {
  const pasteArea = document.getElementById('pasteArea');
  if (!pasteArea) return;
  const text = pasteArea.value.trim();
  if (!text) {
    showToast('请先粘贴报备文本', 'warning');
    return;
  }

  const result = parseReportText(text);
  if (!result) {
    showToast('未能识别报备格式，请检查文本内容', 'error');
    return;
  }

  // 填充表单
  if (result.date) document.getElementById('rDate').value = result.date;
  if (result.banban) document.getElementById('rBanban').value = result.banban;
  if (result.peipei) document.getElementById('rPeipei').value = result.peipei;
  if (result.zhishu) document.getElementById('rZhishu').value = result.zhishu;
  if (result.changkong) document.getElementById('rChangkong').value = result.changkong;
  if (result.project) document.getElementById('rProject').value = result.project;
  if (result.unit_price) {
    document.getElementById('rPrice').value = result.unit_price;
    updatePreview();
  }

  // 构建识别结果提示
  const filled = [];
  if (result.date) filled.push('日期');
  if (result.banban) filled.push('板板');
  if (result.peipei) filled.push('陪陪');
  if (result.zhishu) filled.push('直属');
  if (result.changkong) filled.push('场控');
  if (result.project) filled.push('单子项目');
  if (result.unit_price) filled.push('单价');

  if (filled.length > 0) {
    showToast('已识别并填充：' + filled.join('、'), 'success');
  } else {
    showToast('未能识别有效字段', 'warning');
  }
}

/**
 * 解析报备文本
 * 支持格式：
 * 接单报备格式
 * 日期：8.30
 * 板板：不知道
 * 陪陪：江浩
 * 直属：纯忌
 * 场控：小白
 * 单子项目：相机
 * 单价：52
 */
function parseReportText(text) {
  const result = {};
  const lines = text.split(/\r?\n/);

  // 字段映射：支持多种别名
  const fieldMap = {
    '日期': ['日期', '时间', 'date'],
    '板板': ['板板', '老板', '客户', 'banban'],
    '陪陪': ['陪陪', '陪玩', 'peipei'],
    '直属': ['直属', '上级', 'zhishu'],
    '场控': ['场控', '场控人员', 'changkong', '控场'],
    '单子项目': ['单子项目', '项目', '游戏', 'project'],
    '单价': ['单价', '价格', '金额', 'unit_price', 'price'],
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 匹配 "键：值" 或 "键:值" 格式
    const match = trimmed.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (!match) continue;

    const rawKey = match[1].trim();
    const rawValue = match[2].trim();

    // 去掉值末尾的备注、截图提示等
    const cleanValue = rawValue.replace(/【.*?】/g, '').replace(/\[.*?\]/g, '').trim();
    if (!cleanValue) continue;

    // 识别字段
    for (const [field, aliases] of Object.entries(fieldMap)) {
      for (const alias of aliases) {
        if (rawKey.includes(alias)) {
          switch (field) {
            case '日期':
              result.date = parseDate(cleanValue);
              break;
            case '板板':
              result.banban = cleanValue;
              break;
            case '陪陪':
              result.peipei = cleanValue;
              break;
            case '直属':
              result.zhishu = cleanValue;
              break;
            case '场控':
              result.changkong = cleanValue;
              break;
            case '单子项目':
              result.project = cleanValue;
              break;
            case '单价':
              const priceMatch = cleanValue.match(/(\d+(?:\.\d+)?)/);
              if (priceMatch) result.unit_price = parseFloat(priceMatch[1]);
              break;
          }
          break;
        }
      }
    }
  }

  // 至少识别到一个有效字段才算成功
  const hasAny = result.date || result.banban || result.peipei ||
                 result.zhishu || result.changkong || result.project || result.unit_price;
  return hasAny ? result : null;
}

/**
 * 解析日期字符串
 * 支持：8.30, 08.30, 2026-08-30, 8/30, 08/30 等
 */
function parseDate(value) {
  const currentYear = new Date().getFullYear();

  // 已经是标准格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // 8.30 或 08.30
  const dotMatch = value.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (dotMatch) {
    const month = String(parseInt(dotMatch[1], 10)).padStart(2, '0');
    const day = String(parseInt(dotMatch[2], 10)).padStart(2, '0');
    return currentYear + '-' + month + '-' + day;
  }

  // 8/30 或 08/30
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const month = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
    const day = String(parseInt(slashMatch[2], 10)).padStart(2, '0');
    return currentYear + '-' + month + '-' + day;
  }

  // 8月30日
  const cnMatch = value.match(/^(\d{1,2})月(\d{1,2})日?$/);
  if (cnMatch) {
    const month = String(parseInt(cnMatch[1], 10)).padStart(2, '0');
    const day = String(parseInt(cnMatch[2], 10)).padStart(2, '0');
    return currentYear + '-' + month + '-' + day;
  }

  return null;
}
