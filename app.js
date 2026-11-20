/* ============================================================
   TeamBoard – Group Task Board (Profile Edit Version)
   ============================================================ */

const DB_USERS_KEY = 'teamboard_database_users';
const DB_ACTIVITY_KEY = 'teamboard_database_activity';
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
const toastContainer = document.getElementById('toast-container');

// Profile Edit Ref
const profileTrigger = document.getElementById('profile-trigger');
const profileModal = document.getElementById('profile-modal');
const editProfileInput = document.getElementById('edit-profile-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');

// ---------- Toast Notification ----------
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
  toast.innerHTML = `${icon} <span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---------- Password Visibility Toggle ----------
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', function() {
    const targetId = this.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (input.type === 'password') {
      input.type = 'text';
      this.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      this.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
});

// ---------- Database Helpers ----------
function getFormattedTimestamp() {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function getDatabaseUsers() { return JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]'); }
function saveDatabaseUsers(users) { localStorage.setItem(DB_USERS_KEY, JSON.stringify(users)); }
function getActivityLogs() { return JSON.parse(localStorage.getItem(DB_ACTIVITY_KEY) || '[]'); }
function saveActivityLogs(logs) { localStorage.setItem(DB_ACTIVITY_KEY, JSON.stringify(logs)); }

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

// REGISTER
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  if (!username || !password || !confirm) {
    return showToast('Please fill out all fields.', 'error');
  }

  // Password Requirements
  if (password.length < 8) {
    return showToast('Password must be at least 8 characters long.', 'error');
  }

  if (password !== confirm) {
    return showToast('Passwords do not match.', 'error');
  }

  const users = getDatabaseUsers();
  const userExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());

  if (userExists) {
    return showToast('Account already exists!', 'error');
  }

  users.push({
    username: username,
    password: password,
    dateJoined: getFormattedTimestamp()
  });
  saveDatabaseUsers(users);
  
  showToast('Account created successfully!', 'success');
  registerForm.reset();
  
  setTimeout(() => {
    showLogin.click();
  }, 1000);
});

// LOGIN
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    return showToast('Please enter email and password.', 'error');
  }

  const users = getDatabaseUsers();
  const validUser = users.find(u => 
    u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  const logs = getActivityLogs();
  logs.push({
    username: username,
    status: validUser ? 'SUCCESS' : 'FAILED',
    timestamp: getFormattedTimestamp()
  });
  saveActivityLogs(logs);

  if (!validUser) {
    return showToast('Access Denied: Wrong email or password.', 'error');
  }

  localStorage.setItem(CURRENT_USER_KEY, username);
  loginForm.reset();
  showToast('Login successful!', 'success');
  
  setTimeout(() => {
    showBoard();
  }, 500);
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  boardContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
});

// ---------- Profile Logic ----------
profileTrigger.addEventListener('click', () => {
  const currentUser = localStorage.getItem(CURRENT_USER_KEY);
  editProfileInput.value = currentUser;
  profileModal.classList.remove('hidden');
});

cancelProfileBtn.addEventListener('click', () => {
  profileModal.classList.add('hidden');
});

saveProfileBtn.addEventListener('click', () => {
  const oldUsername = localStorage.getItem(CURRENT_USER_KEY);
  const newUsername = editProfileInput.value.trim();

  if (!newUsername) return showToast('Username cannot be empty.', 'error');
  if (newUsername === oldUsername) {
    profileModal.classList.add('hidden');
    return;
  }

  let users = getDatabaseUsers();
  if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
    return showToast('Username already taken.', 'error');
  }

  // 1. Update User Database
  const userIndex = users.findIndex(u => u.username === oldUsername);
  if (userIndex !== -1) {
    users[userIndex].username = newUsername;
    saveDatabaseUsers(users);
  }

  // 2. Update Tasks assigned to this user
  let tasks = getTasks();
  tasks.forEach(task => {
    if (task.assignee === oldUsername) {
      task.assignee = newUsername;
    }
  });
  saveTasks(tasks);

  // 3. Update Session
  localStorage.setItem(CURRENT_USER_KEY, newUsername);
  
  profileModal.classList.add('hidden');
  showToast('Profile updated successfully!', 'success');
  showBoard(); // Refresh UI
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

  const users = getDatabaseUsers();
  taskAssignee.innerHTML = users.map(u => `<option value="${escapeHTML(u.username)}">${escapeHTML(u.username)}</option>`).join('');

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

  if (!title) return showToast('Task title is required.', 'error');

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
    showToast('Task added successfully!', 'success');
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
  showToast('Task deleted.', 'success');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Init ----------
initTheme();
if (localStorage.getItem(CURRENT_USER_KEY)) showBoard();
