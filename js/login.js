// ========================================
// 登录页逻辑
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // 如果已登录，直接跳后台
  if (isAdminLoggedIn()) {
    window.location.href = 'admin.html';
  }
});

function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;

  if (user === 'admin' && pass === 'admin123') {
    setAdminSession(user);
    showToast('登录成功', 'success');
    setTimeout(() => { window.location.href = 'admin.html'; }, 400);
  } else {
    showToast('账号或密码错误', 'error');
  }
}
