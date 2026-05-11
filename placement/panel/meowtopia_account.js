(function () {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1JUQIPd3qTapnYRANptv2RdRwxuH5-hvzTwiDghtyuHCn9km3zcDL2AFRy8w5dWA59w/exec';
  const USER_KEY = 'currentUser';
  const FLAGSHIP_LEVEL_KEY = 'currentLevel';
  const PLACEMENT_LEVEL_KEY = 'placement_level';
  const LEGACY_PLACEMENT_LEVEL_KEY = 'placementLevel';
  const MAX_PLACEMENT_LEVEL = 19;
  const FLAGSHIP_HOME_URL = '../../MeowtopiaFlagship-main/index.html';

  let leaderboardData = [];
  let activeRankType = 'steps';

  function getCurrentUser() {
    return sessionStorage.getItem(USER_KEY) || '';
  }

  function getPageLevel() {
    const match = window.location.pathname.match(/level-(\d+)\.html$/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    const solution = document.body?.dataset?.solution;
    return parseInt(solution || '1', 10);
  }

  function getStoredNumber(key, fallback = 1) {
    const value = parseInt(sessionStorage.getItem(key) || '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function getFlagshipLevel() {
    return getStoredNumber(FLAGSHIP_LEVEL_KEY, 1);
  }

  function getPlacementLevel() {
    const value = Math.max(
      getStoredNumber(PLACEMENT_LEVEL_KEY, 1),
      getStoredNumber(LEGACY_PLACEMENT_LEVEL_KEY, 1)
    );
    return Math.min(value, MAX_PLACEMENT_LEVEL);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setMessage(text, tone = '') {
    const message = document.getElementById('account-message');
    if (!message) {
      return;
    }

    message.textContent = text;
    message.dataset.tone = tone;
  }

  function setButtonBusy(button, isBusy, label, busyLabel) {
    if (!button) {
      return;
    }

    button.disabled = isBusy;
    button.textContent = isBusy ? busyLabel : label;
  }

  function showRegisterPanel(showRegister) {
    const login = document.getElementById('account-login-panel');
    const register = document.getElementById('account-register-panel');
    if (!login || !register) {
      return;
    }

    login.hidden = showRegister;
    register.hidden = !showRegister;
    setMessage('');
  }

  async function handleLogin() {
    const username = document.getElementById('account-login-user')?.value.trim();
    const password = document.getElementById('account-login-pass')?.value.trim();
    const button = document.getElementById('account-login-btn');

    if (!username || !password) {
      setMessage('Please enter both username and password.', 'error');
      return;
    }

    setButtonBusy(button, true, 'START', 'WAITING...');
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'auth', username, password })
      });
      const result = await response.json();

      if (result.status === 'success') {
        const flagshipLevel = result.meowtopiaLevel || result.flagshipLevel || result.level || '1';
        const placementLevel = result.placementLevel || '1';
        sessionStorage.setItem(USER_KEY, username);
        sessionStorage.setItem(FLAGSHIP_LEVEL_KEY, flagshipLevel);
        sessionStorage.setItem(PLACEMENT_LEVEL_KEY, placementLevel);
        sessionStorage.setItem(LEGACY_PLACEMENT_LEVEL_KEY, placementLevel);
        if (result.photo) {
          sessionStorage.setItem('playerPhoto', result.photo);
          localStorage.setItem('playerPhoto', result.photo);
        }
        sessionStorage.setItem('playerPhotoX', result.photoX || '50');
        sessionStorage.setItem('playerPhotoY', result.photoY || '50');
        sessionStorage.setItem('playerPhotoScale', result.photoScale || '1');
        localStorage.setItem('playerPhotoX', result.photoX || '50');
        localStorage.setItem('playerPhotoY', result.photoY || '50');
        localStorage.setItem('playerPhotoScale', result.photoScale || '1');
        renderHomeAccount();
        return;
      }

      if (result.status === 'wrong_password') {
        setMessage('Wrong password.', 'error');
      } else {
        setMessage('Account not found. Please register first.', 'error');
        showRegisterPanel(true);
        document.getElementById('account-reg-user')?.focus();
      }
    } catch (error) {
      setMessage('Connection failed. Please try again.', 'error');
    } finally {
      setButtonBusy(button, false, 'START', 'WAITING...');
    }
  }

  async function handleRegister() {
    const username = document.getElementById('account-reg-user')?.value.trim();
    const password = document.getElementById('account-reg-pass')?.value.trim();
    const confirm = document.getElementById('account-reg-confirm')?.value.trim();
    const button = document.getElementById('account-reg-btn');

    if (!username || !password || !confirm) {
      setMessage('Please fill all fields.', 'error');
      return;
    }

    if (password !== confirm) {
      setMessage('Passwords do not match.', 'error');
      return;
    }

    setButtonBusy(button, true, 'JOIN NOW', 'WAITING...');
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'register', username, password })
      });
      const result = await response.text();

      if (result === 'success') {
        setMessage('Registration successful. Please login.', 'success');
        showRegisterPanel(false);
        const loginUser = document.getElementById('account-login-user');
        if (loginUser) {
          loginUser.value = username;
        }
        document.getElementById('account-login-pass')?.focus();
      } else if (result === 'exists') {
        setMessage('Username already taken.', 'error');
      } else {
        setMessage('Registration failed.', 'error');
      }
    } catch (error) {
      setMessage('Connection failed. Please try again.', 'error');
    } finally {
      setButtonBusy(button, false, 'JOIN NOW', 'WAITING...');
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(FLAGSHIP_LEVEL_KEY);
    sessionStorage.removeItem(PLACEMENT_LEVEL_KEY);
    sessionStorage.removeItem(LEGACY_PLACEMENT_LEVEL_KEY);
    sessionStorage.removeItem('playerPhoto');
    sessionStorage.removeItem('playerPhotoX');
    sessionStorage.removeItem('playerPhotoY');
    sessionStorage.removeItem('playerPhotoScale');
    localStorage.removeItem('playerPhoto');
    localStorage.removeItem('playerPhotoX');
    localStorage.removeItem('playerPhotoY');
    localStorage.removeItem('playerPhotoScale');
    renderHomeAccount();
  }

  function buildAuthCard() {
    const panel = document.createElement('section');
    panel.id = 'account-auth-card';
    panel.className = 'account-auth-card';
    panel.innerHTML = `
      <div class="account-auth-copy">
        <span class="hero-badge">Account</span>
        <h2>Login To Play</h2>
      </div>
      <div class="account-auth-forms">
        <div id="account-login-panel" class="account-form-panel">
          <label for="account-login-user">Name</label>
          <input id="account-login-user" class="account-input" type="text" autocomplete="username" placeholder="Your name">
          <label for="account-login-pass">Password</label>
          <input id="account-login-pass" class="account-input" type="password" autocomplete="current-password" placeholder="Password">
          <button id="account-login-btn" class="account-primary-btn" type="button">START</button>
          <button id="account-show-register" class="account-link-btn" type="button">New cat? Register</button>
        </div>
        <div id="account-register-panel" class="account-form-panel" hidden>
          <label for="account-reg-user">Name</label>
          <input id="account-reg-user" class="account-input" type="text" autocomplete="username" placeholder="Name your cat">
          <label for="account-reg-pass">Password</label>
          <input id="account-reg-pass" class="account-input" type="password" autocomplete="new-password" placeholder="Password">
          <label for="account-reg-confirm">Confirm</label>
          <input id="account-reg-confirm" class="account-input" type="password" autocomplete="new-password" placeholder="Repeat password">
          <button id="account-reg-btn" class="account-primary-btn" type="button">JOIN NOW</button>
          <button id="account-show-login" class="account-link-btn" type="button">Go back to login</button>
        </div>
        <p id="account-message" class="account-message" aria-live="polite"></p>
      </div>
    `;
    return panel;
  }

  function buildProfileCard(username) {
    const panel = document.createElement('section');
    panel.id = 'account-profile-card';
    panel.className = 'account-profile-card';
    panel.innerHTML = `
      <div class="account-avatar" aria-hidden="true">🐱</div>
      <div class="account-profile-copy">
        <span class="hero-badge">Signed In</span>
        <strong>${escapeHtml(username)}</strong>
      </div>
      <button id="account-logout-btn" class="account-secondary-btn" type="button">LOGOUT</button>
    `;
    return panel;
  }

  function buildGameChoiceCard() {
    const panel = document.createElement('section');
    panel.id = 'game-choice-card';
    panel.className = 'game-choice-card';
    panel.innerHTML = `
      <div class="section-heading playful-heading">
        <h2>Choose A Game</h2>
      </div>
      <div class="game-choice-grid">
        <a class="game-choice-tile" href="${FLAGSHIP_HOME_URL}">
          <span class="game-choice-kicker">Game 1</span>
          <strong>MeowtopiaFlagship</strong>
          <span>Level ${escapeHtml(getFlagshipLevel())}</span>
        </a>
        <button id="play-placement-btn" class="game-choice-tile" type="button">
          <span class="game-choice-kicker">Game 2</span>
          <strong>Placement Lab</strong>
          <span>Level ${escapeHtml(getPlacementLevel())}</span>
        </button>
      </div>
    `;
    return panel;
  }

  function wireAuthCard() {
    document.getElementById('account-login-btn')?.addEventListener('click', handleLogin);
    document.getElementById('account-reg-btn')?.addEventListener('click', handleRegister);
    document.getElementById('account-show-register')?.addEventListener('click', () => showRegisterPanel(true));
    document.getElementById('account-show-login')?.addEventListener('click', () => showRegisterPanel(false));

    ['account-login-pass', 'account-reg-confirm'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          if (id === 'account-login-pass') {
            handleLogin();
          } else {
            handleRegister();
          }
        }
      });
    });
  }

  function renderHomeAccount() {
    if (!document.body.classList.contains('game-home')) {
      return;
    }

    const levelPanel = document.querySelector('.level-select-panel');
    document.getElementById('account-auth-card')?.remove();
    document.getElementById('account-profile-card')?.remove();
    document.getElementById('game-choice-card')?.remove();

    const username = getCurrentUser();
    if (username) {
      levelPanel?.classList.add('game-choice-hidden');
      levelPanel?.classList.remove('account-locked');
      syncPlacementLocks();
      const profile = buildProfileCard(username);
      document.querySelector('.game-home-hero')?.after(profile);
      profile.after(buildGameChoiceCard());
      document.getElementById('account-logout-btn')?.addEventListener('click', handleLogout);
      document.getElementById('play-placement-btn')?.addEventListener('click', () => {
        levelPanel?.classList.remove('game-choice-hidden');
        levelPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    levelPanel?.classList.add('account-locked');
    levelPanel?.classList.remove('game-choice-hidden');
    const authCard = buildAuthCard();
    document.querySelector('.game-home-hero')?.after(authCard);
    wireAuthCard();
  }

  function getCardLevel(card) {
    const match = card.getAttribute('href')?.match(/level-(\d+)\.html/i);
    return match ? parseInt(match[1], 10) : 1;
  }

  function syncPlacementLocks() {
    const unlockedLevel = getPlacementLevel();
    document.querySelectorAll('.level-card').forEach(card => {
      const level = getCardLevel(card);
      const isLocked = level > unlockedLevel;
      if (!card.dataset.href && card.getAttribute('href')) {
        card.dataset.href = card.getAttribute('href');
      }

      card.classList.toggle('locked', isLocked);
      card.setAttribute('aria-disabled', isLocked ? 'true' : 'false');
      if (isLocked) {
        card.removeAttribute('href');
        card.title = 'Complete the previous level first.';
      } else if (card.dataset.href) {
        card.setAttribute('href', card.dataset.href);
        card.removeAttribute('title');
      }
    });
  }

  function requireLevelLogin() {
    if (!document.body.classList.contains('game-level')) {
      return;
    }

    if (!getCurrentUser()) {
      window.location.href = 'index.html';
      return;
    }

    if (getPageLevel() > getPlacementLevel()) {
      window.location.href = 'index.html?locked=1';
    }
  }

  function createLeaderboard() {
    if (!document.body.classList.contains('game-level') || document.getElementById('leaderboard-wrapper')) {
      return;
    }

    const wrapper = document.createElement('aside');
    wrapper.id = 'leaderboard-wrapper';
    wrapper.className = 'placement-leaderboard';
    wrapper.innerHTML = `
      <div class="side-leaderboard-content">
        <h3>TOP CATS</h3>
        <div class="rank-tabs" role="tablist" aria-label="Leaderboard sort">
          <button id="tab-steps" class="rank-tab active" type="button">CATS</button>
          <button id="tab-time" class="rank-tab" type="button">TIME</button>
        </div>
        <div id="rankList" class="rank-list" aria-live="polite">Loading...</div>
      </div>
      <button class="bookmark-tab" type="button" aria-label="Toggle leaderboard">
        <span class="bookmark-text">RANK</span>
      </button>
    `;
    document.body.appendChild(wrapper);

    wrapper.querySelector('.bookmark-tab')?.addEventListener('click', toggleLeaderboard);
    document.getElementById('tab-steps')?.addEventListener('click', () => renderRank('steps'));
    document.getElementById('tab-time')?.addEventListener('click', () => renderRank('time'));
    fetchLeaderboard();
  }

  function toggleLeaderboard() {
    const wrapper = document.getElementById('leaderboard-wrapper');
    if (!wrapper) return;
    wrapper.classList.toggle('expanded');
    if (wrapper.classList.contains('expanded')) {
      window.setTimeout(() => showRankChampion(activeRankType), 380);
    }
  }

  async function fetchLeaderboard() {
    const listArea = document.getElementById('rankList');
    if (!listArea) {
      return;
    }

    listArea.textContent = 'Loading...';
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getLeaderboard&game=placement&level=${encodeURIComponent(getPageLevel())}`);
      const data = await response.json();
      leaderboardData = Array.isArray(data) ? data : [];
      renderRank(activeRankType);
    } catch (error) {
      listArea.innerHTML = '<p class="rank-empty rank-error">Load Error</p>';
    }
  }

  function renderRank(type) {
    activeRankType = type;
    const tabSteps = document.getElementById('tab-steps');
    const tabTime = document.getElementById('tab-time');
    const listArea = document.getElementById('rankList');
    if (!listArea) {
      return;
    }

    tabSteps?.classList.toggle('active', type === 'steps');
    tabTime?.classList.toggle('active', type === 'time');

    if (!leaderboardData.length) {
      listArea.innerHTML = '<p class="rank-empty">No records yet</p>';
      return;
    }

    const sorted = [...leaderboardData].sort((a, b) => {
      const primary = rankNumber(a[type]) - rankNumber(b[type]);
      if (primary !== 0) {
        return primary;
      }

      const secondaryType = type === 'steps' ? 'time' : 'steps';
      return rankNumber(a[secondaryType]) - rankNumber(b[secondaryType]);
    });
    const bestByUser = [];
    const seenUsers = new Set();

    sorted.forEach(item => {
      const userKey = String(item.username || item.name || 'Anonymous').trim().toLowerCase();
      if (seenUsers.has(userKey)) {
        return;
      }

      seenUsers.add(userKey);
      bestByUser.push(item);
    });

    listArea.innerHTML = bestByUser.slice(0, 10).map((item, index) => {
      const name = escapeHtml(item.username || item.name || 'Anonymous');
      const avatar = getRankAvatarHtml(item);
      const crown = index === 0 ? '<span class="rank-crown">👑</span>' : '';
      const value = type === 'steps'
        ? `${escapeHtml(item.steps ?? '-')} cats`
        : `${escapeHtml(item.time ?? '-')}s`;
      return `
        <div class="rank-item ${index === 0 ? 'rank-champion' : ''}">
          <div class="rank-player">
            <span class="rank-number">${index + 1}.</span>
            <div class="rank-avatar-wrap">${crown}<div class="rank-avatar">${avatar}</div></div>
            <span>${name}</span>
          </div>
          <strong>${value}</strong>
        </div>
      `;
    }).join('');

    const wrapper = document.getElementById('leaderboard-wrapper');
    if (wrapper?.classList.contains('expanded')) {
      showRankChampion(activeRankType);
    }
  }

  function rankNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : Infinity;
  }

  function getRankAvatarHtml(item) {
    return item && item.photo
      ? `<img src="${escapeHtml(item.photo)}" alt="" style="object-position:${escapeHtml(item.photoX ?? 50)}% ${escapeHtml(item.photoY ?? 50)}%;transform-origin:${escapeHtml(item.photoX ?? 50)}% ${escapeHtml(item.photoY ?? 50)}%;transform:scale(${escapeHtml(item.photoScale ?? 1)});">`
      : '<span>🐱</span>';
  }

  function showRankChampion(type) {
    const wrapper = document.getElementById('leaderboard-wrapper');
    if (wrapper && !wrapper.classList.contains('expanded')) return;
    const champion = [...leaderboardData].sort((a, b) => {
      const primary = rankNumber(a[type]) - rankNumber(b[type]);
      if (primary !== 0) return primary;
      const secondaryType = type === 'steps' ? 'time' : 'steps';
      return rankNumber(a[secondaryType]) - rankNumber(b[secondaryType]);
    })[0];
    if (!champion) return;

    let backdrop = document.getElementById('rankChampionBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'rankChampionBackdrop';
      backdrop.className = 'rank-champion-backdrop';
      document.body.appendChild(backdrop);
    }

    let toast = document.getElementById('rankChampionToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'rankChampionToast';
      toast.className = 'rank-champion-toast';
      document.body.appendChild(toast);
    }

    const anchor = document.querySelector('#rankList .rank-item.rank-champion') || document.querySelector('#rankList .rank-item');
    const rect = anchor ? anchor.getBoundingClientRect() : { left: 12, top: 112, width: 224, height: 44 };
    const label = type === 'time' ? 'TIME CHAMPION' : 'CATS CHAMPION';
    const name = escapeHtml(champion.username || champion.name || 'Anonymous');
    toast.style.left = `${Math.round(rect.left + 8)}px`;
    toast.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
    toast.style.maxWidth = `${Math.max(220, Math.round(rect.width + 28))}px`;
    backdrop.classList.remove('show');
    toast.className = 'rank-champion-toast';
    toast.innerHTML = `<div class="rank-avatar-wrap"><span class="rank-crown">👑</span><div class="rank-avatar">${getRankAvatarHtml(champion)}</div></div><div class="rank-champion-text"><span class="rank-champion-label">${label}</span><span class="rank-champion-name">${name}</span></div>`;
    void toast.offsetWidth;
    backdrop.classList.add('show');
    toast.classList.add('show');
    window.setTimeout(() => {
      toast.classList.remove('show');
      backdrop.classList.remove('show');
    }, 1450);
  }
  function savePlacementRecord(record) {
    const username = getCurrentUser();
    if (!username || !record) {
      return Promise.resolve(false);
    }

    const completedLevel = getPageLevel();
    const nextLevel = Math.min(completedLevel + 1, MAX_PLACEMENT_LEVEL);
    if (nextLevel > getPlacementLevel()) {
      sessionStorage.setItem(PLACEMENT_LEVEL_KEY, String(nextLevel));
      sessionStorage.setItem(LEGACY_PLACEMENT_LEVEL_KEY, String(nextLevel));
    }

    const payload = {
      action: 'savePlacementRecord',
      game: 'placement',
      username,
      level: completedLevel,
      unlockedLevel: nextLevel,
      steps: Number(record.steps || 0),
      time: Number(record.time || 0),
      placement: record.placement || record.circuit || ''
    };

    return fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    }).then(() => {
      setTimeout(fetchLeaderboard, 1200);
      return true;
    }).catch(() => false);
  }

  function init() {
    renderHomeAccount();
    requireLevelLogin();
    createLeaderboard();
  }

  window.MeowtopiaAccount = {
    getCurrentUser,
    getFlagshipLevel,
    getPlacementLevel,
    savePlacementRecord,
    fetchLeaderboard
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
