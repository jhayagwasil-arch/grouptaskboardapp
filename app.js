/* ============================================================
   TeamBoard – Group Task Board (Dual Database Version)
   ============================================================ */

// --- GITHUB DATABASE CONFIGURATION ---
// PASTE A BRAND NEW TOKEN HERE FOR YOUR LOCALHOST TEST
const GITHUB_TOKEN = 'github_pat_YOUR_NEW_TOKEN_HERE'; // Paste it here!
const GITHUB_TOKEN = 'ghp_YOUR_TOKEN_HERE'; 
const GITHUB_USERNAME = 'jhayagwasil-arch';
const GITHUB_REPO = 'grouptaskboardapp';

const TASKS_KEY = 'teamboard_tasks';
const CURRENT_USER_KEY = 'teamboard_current_user';
const THEME_KEY = 'teamboard_theme';

// ---------- DOM Refs ----------
const authContainer = document.getElementById('auth-container');
const boardContainer = document.getElementById('board-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const welcomeMessage = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const cancelModal = document.getElementById('cancel-modal');
const profileName = document.getElementById('profile-name');
const profileAvatar = document.getElementById('profile-avatar');
const themeToggles = document.querySelectorAll('.theme-btn');

// ---------- GitHub API Helpers ----------
function encodeBase64(str) { return btoa(unescape(encodeURIComponent(str))); }
function decodeBase64(str) { return decodeURIComponent(escape(atob(str))); }

function getFormattedTimestamp() {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

async function fetchFileFromGitHub(filename) {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    const data = await response.json();
    return { content: data.content ? decodeBase64(data.content) : "", sha: data.sha };
  } catch (error) {
    console.error("DB Error:", error);
    return null;
  }
}

async function writeFileToGitHub(filename, newContent, sha, commitMessage) {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: encodeBase64(newContent),
        sha: sha
      })
    });
    return response.ok;
  } catch (error) {
    console.error("Write Error:", error);
    return false;
  }
}

// ---------- Theme Logic ----------
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    updateThemeIcons('dark');
  } else {
    document.body.classList.remove('dark');
    updateThemeIcons('light');
  }
}
function toggleTheme() {
  if (document.body.classList.contains('dark')) {
    document.body.classList.remove('dark');
    localStorage.setItem(THEME_KEY, 'light');
    updateThemeIcons('light');
  } else {
    document.body.classList.add('dark');
    localStorage.setItem(THEME_KEY, 'dark');
    updateThemeIcons('dark');
  }
}
function updateThemeIcons(theme) {
  themeToggles.forEach(btn => {
    const icon = btn.querySelector('i');
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}
themeToggles.forEach(btn => btn.addEventListener('click', toggleTheme));

// ---------- Auth Logic ----------
showRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  if (password !== confirm) return alert('Passwords do not match.');

  const submitBtn = registerForm.querySelector('button');
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;

  const fileData = await fetchFileFromGitHub('accounts.txt');
  if (!fileData) {
    alert('Cannot connect. Check your token.');
    submitBtn.textContent = 'Create Account';
    submitBtn.disabled = false;
    return;
  }

  const lines = fileData.content.split('\n').filter(line => line.trim() !== '');
  const userExists = lines.some(line => {
    const [u] = line.split('|');
    return u && u.toLowerCase() === username.toLowerCase();
  });

  if (userExists) {
    alert('Account already exists!');
    submitBtn.textContent = 'Create Account';
    submitBtn.disabled = false;
    return;
  }

  const newEntry = `${username}|${password}|${getFormattedTimestamp()}\n`;
  const newContent = fileData.content + (fileData.content.endsWith('\n') || fileData.content === '' ? '' : '\n') + newEntry;
  
  const success = await writeFileToGitHub('accounts.txt', newContent, fileData.sha, `New account: ${username}`);

  if (success) {
    alert('Account saved to accounts.txt! Please log in.');
    registerForm.reset();
    showLogin.click();
  } else {
    alert('Failed to save to GitHub.');
  }
  
  submitBtn.textContent = 'Create Account';
  submitBtn.disabled = false;
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const submitBtn = loginForm.querySelector('button');
  submitBtn.textContent = 'Checking...';
  submitBtn.disabled = true;

  // 1. Check Accounts
  const fileData = await fetchFileFromGitHub('accounts.txt');
  if (!fileData) {
    alert('Cannot connect to database.');
    submitBtn.textContent = 'Login';
    submitBtn.disabled = false;
    return;
  }

  const lines = fileData.content.split('\n').filter(line => line.trim() !== '');
  const validUser = lines.find(line => {
    const parts = line.split('|');
    if (parts.length >= 2) return parts[0].toLowerCase() === username.toLowerCase() && parts[1] === password;
    return false;
  });

  // 2. Log the activity
  const actData = await fetchFileFromGitHub('activity.txt');
  if (actData) {
    const status = validUser ? 'SUCCESS' : 'FAILED';
    const logEntry = `${username}|${status}|${getFormattedTimestamp()}\n`;
    const newActContent = actData.content + (actData.content.endsWith('\n') || actData.content === '' ? '' : '\n') + logEntry;
    await writeFileToGitHub('activity.txt', newActContent, actData.sha, `Login: ${username} (${status})`);
  }

  // 3. Handle Result
  if (!validUser) {
    alert('Access Denied: Wrong account or password.');
    submitBtn.textContent = 'Login';
    submitBtn.disabled = false;
    return;
  }

  localStorage.setItem(CURRENT_USER_KEY, username);
  loginForm.reset();
  submitBtn.textContent = 'Login';
  submitBtn.disabled = false;
  showBoard();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  boardContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
});

// ---------- Board & Tasks Logic ----------
function getTasks() { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); }
function saveTasks(tasks) { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }

function showBoard() {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  if (!user) {
    authContainer.classList.remove('hidden');
    boardContainer.classList.add('hidden');
    return;
  }

  authContainer.classList.add('hidden');
  boardContainer.classList.remove('hidden');
  welcomeMessage.textContent = `Welcome back, ${user}!`;
  profileName.textContent = user;
  profileAvatar.textContent = user.charAt(0).toUpperCase();
  renderBoard();
}

function renderBoard() {
  const tasks = getTasks();
  const lists = {
    todo: document.getElementById('todo-list'),
    inprogress: document.getElementById('inprogress-list'),
    done: document.getElementById('done-list'),
  };

  Object.values(lists).forEach((list) => (list.innerHTML = ''));

  tasks.forEach((task) => {
    const card = document.createElement('div');
    card.className = 'task-card';
    
    card.innerHTML = `
      <h4>${escapeHTML(task.title)}</h4>
      <p>${escapeHTML(task.description || '')}</p>
      <div class="task-meta"><i class="fa-regular fa-user"></i> ${escapeHTML(task.assignee)}</div>
      <div class="task-actions">
        <select class="status-select">
          <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
        <button class="edit-btn"><i class="fa-solid fa-pen"></i></button>
        <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    card.querySelector('.status-select').addEventListener('change', (e) => {
      updateTask(task.id, { status: e.target.value });
    });
    card.querySelector('.edit-btn').addEventListener('click', () => openTaskModal(task));
    card.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id);
    });

    (lists[task.status] || lists.todo).appendChild(card);
  });
}

addTaskBtn.addEventListener('click', () => openTaskModal());
cancelModal.addEventListener('click', () => taskModal.classList.add('hidden'));

function openTaskModal(task = null) {
  const modalTitle = document.getElementById('modal-title');
  const taskId = document.getElementById('task-id');
  const taskTitle = document.getElementById('task-title');
  const taskDesc = document.getElementById('task-desc');
  const taskAssignee = document.getElementById('task-assignee');
  const taskStatus = document.getElementById('task-status');

  fetchFileFromGitHub('accounts.txt').then(fileData => {
    if (fileData) {
      const lines = fileData.content.split('\n').filter(line => line.trim() !== '');
      taskAssignee.innerHTML = lines.map(line => {
        const [u] = line.split('|');
        return u ? `<option value="${escapeHTML(u)}">${escapeHTML(u)}</option>` : '';
      }).join('');
    }
  });

  if (task) {
    modalTitle.textContent = 'Edit Task';
    taskId.value = task.id;
    taskTitle.value = task.title;
    taskDesc.value = task.description || '';
    taskAssignee.value = task.assignee;
    taskStatus.value = task.status;
  } else {
    modalTitle.textContent = 'Add Task';
    taskId.value = '';
    taskForm.reset();
    taskAssignee.value = localStorage.getItem(CURRENT_USER_KEY); 
  }

  taskModal.classList.remove('hidden');
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const assignee = document.getElementById('task-assignee').value;
  const status = document.getElementById('task-status').value;

  if (!title) return alert('Title is required.');

  if (id) {
    updateTask(id, { title, description, assignee, status });
  } else {
    const tasks = getTasks();
    tasks.push({
      id: Date.now().toString(),
      title, description, assignee, status,
      createdAt: new Date().toISOString(),
    });
    saveTasks(tasks);
  }

  taskModal.classList.add('hidden');
  renderBoard();
});

function updateTask(id, updates) {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return;
  tasks[index] = { ...tasks[index], ...updates };
  saveTasks(tasks);
  renderBoard();
}

function deleteTask(id) {
  const tasks = getTasks().filter((t) => t.id !== id);
  saveTasks(tasks);
  renderBoard();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Init ----------
initTheme();
if (localStorage.getItem(CURRENT_USER_KEY)) showBoard();