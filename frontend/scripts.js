// ========== TOKEN MANAGEMENT ==========
function saveToken(token) {
  localStorage.setItem('token', token);
}

function getToken() {
  return localStorage.getItem('token');
}

function isAuthenticated() {
  return !!getToken();
}

function setEditPrivilege(password) {
  const canEdit = password.trim().endsWith('t');
  localStorage.setItem('canEdit', canEdit ? 'true' : 'false');
}

// ========== API HELPERS ==========
async function apiPost(url, data, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = 'Bearer ' + getToken();

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });

  const contentType = res.headers.get('content-type');
  return contentType && contentType.includes('application/json')
    ? await res.json()
    : { message: await res.text() };
    
    return data;
}

async function apiGet(url, auth = false) {
  const headers = {};
  if (auth) headers['Authorization'] = 'Bearer ' + getToken();

  const res = await fetch(url, { headers });
  const contentType = res.headers.get('content-type');
  return contentType && contentType.includes('application/json')
    ? res.json()
    : res.text();
}

// ========== LOGIN ==========
const loginForm = document.querySelector('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginForm.username.value.trim();
    const password = loginForm.password.value.trim();

    try {
      const res = await apiPost('http://localhost:3001/login', { username, password });
      if (res.token) {
        saveToken(res.token);
        setEditPrivilege(password);
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 100); // ⏳ mic delay pentru salvarea tokenului
      } else {
        alert(res.message || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error. Try again.');
    }
  });
}

// ========== REGISTER ==========
const registerForm = document.querySelector('#registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = registerForm.username.value.trim();
    const password = registerForm.password.value.trim();

    try {
      const res = await apiPost('http://localhost:3001/register', { username, password });
      if (res.success || res.message?.toLowerCase().includes('registered')) {
        alert('Registration successful. You can now log in.');
        window.location.href = 'login.html';
      } else {
        alert(res.message || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error. Try again.');
    }
  });
}

// ========== NAVBAR ==========
function buildNavbar() {
  const navbar = document.getElementById('navbarLinks');
  if (!navbar) return;

  const token = getToken();
  const isLoggedIn = !!token;

  if (isLoggedIn) {
    navbar.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="dashboard.html">Dashboard</a></li>
      <li class="nav-item"><a class="nav-link" href="clubs.html">All Clubs</a></li>
      <li class="nav-item"><a class="nav-link" href="profile.html">Profile</a></li>
      <li class="nav-item"><a class="nav-link" href="#" id="logoutBtn">Logout</a></li>
    `;

    setTimeout(() => {
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.clear();
          window.location.href = 'index.html';
        });
      }
    }, 50);
  } else {
    navbar.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
      <li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>
      <li class="nav-item"><a class="nav-link" href="register.html">Register</a></li>
      <li class="nav-item"><a class="nav-link" href="dashboard.html">Dashboard</a></li>
      <li class="nav-item"><a class="nav-link" href="profile.html">Profile</a></li>
    `;
  }
}

// ========== GUARD ==========
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
  }
}

// ========== CONDITIONAL UI ==========
function maybeShowEditButton() {
  const editBtn = document.querySelector('#editBtn');
  if (editBtn && localStorage.getItem('canEdit') === 'true') {
    editBtn.classList.remove('d-none');
  }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  buildNavbar();
  maybeShowEditButton();
});
