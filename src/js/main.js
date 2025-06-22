// main.js centralizado para Checklist Web App moderno

(function () {
  // Utilidades
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
  const prefix = window.checklistKeyPrefix || 'checklist_';
  const data = window.checklistData || [];
  const main = qs('#main-content');
  let state = {};
  let searchTerm = '';

  // Persistência
  function saveState() {
    localStorage.setItem(prefix + 'state', JSON.stringify(state));
  }
  function loadState() {
    try {
      state = JSON.parse(localStorage.getItem(prefix + 'state')) || {};
    } catch { state = {}; }
  }

  // Dark mode
  function setDarkMode(on) {
    document.body.classList.toggle('dark', on);
    localStorage.setItem('darkmode', on ? '1' : '0');
    const icon = qs('#darkmode-toggle i');
    if (icon) icon.className = on ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  function initDarkMode() {
    const saved = localStorage.getItem('darkmode');
    setDarkMode(saved === '1');
    qs('#darkmode-toggle')?.addEventListener('click', () => {
      setDarkMode(!document.body.classList.contains('dark'));
    });
  }

  // Renderização
  function render() {
    if (!main) return;
    main.innerHTML = '';
    // Ações (apenas busca no topo)
    const actions = document.createElement('div');
    actions.className = 'checklist-actions';
    actions.innerHTML = `
      <input type="search" placeholder="Buscar item..." aria-label="Buscar item" id="search-box">
    `;
    main.appendChild(actions);
    // Listas
    data.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h2>${cat.categoria}</h2>`;
      cat.itens.forEach(item => {
        if (searchTerm && !item.toLowerCase().includes(searchTerm)) return;
        const key = cat.categoria + '_' + item;
        const checked = !!state[key]?.checked;
        // Suporte a múltiplos comentários
        const comments = Array.isArray(state[key]?.comments) ? state[key].comments : [];
        const div = document.createElement('div');
        div.className = 'checklist-item' + (checked ? ' checked' : '');
        div.innerHTML = `
          <input type="checkbox" id="${key}" ${checked ? 'checked' : ''} aria-label="${item}">
          <label class="checklist-label" for="${key}">${item}</label>
          <button class="open-comment-btn" title="Ver/Adicionar comentários" aria-label="Ver/Adicionar comentários para ${item}"><i class="fa-regular fa-comment"></i></button>
        `;
        // Eventos
        div.querySelector('input[type="checkbox"]').addEventListener('change', e => {
          state[key] = state[key] || {};
          state[key].checked = e.target.checked;
          saveState();
          div.classList.add('checked');
          setTimeout(() => div.classList.remove('checked'), 500);
        });
        // Popup de comentários múltiplos
        div.querySelector('.open-comment-btn').addEventListener('click', () => {
          showMultiCommentPopup(key, item, comments);
        });
        card.appendChild(div);
      });
      main.appendChild(card);
    });
    // Busca
    qs('#search-box').value = searchTerm;
    qs('#search-box').addEventListener('input', e => {
      searchTerm = e.target.value.toLowerCase();
      render();
    });
    // Limpar
    qs('#reset-btn').addEventListener('click', () => {
      if (confirm('Limpar todos os checks e comentários?')) {
        state = {};
        saveState();
        render();
      }
    });
    // Exportar
    qs('#export-btn').addEventListener('click', () => {
      window.print();
    });
  }
  // --- Header com perfil e darkmode ---
  // Renderizar header integrado ao layout, não como barra exclusiva
  function renderHeader() {
    // Remove header antigo se existir
    const oldHeader = document.getElementById('app-header');
    if (oldHeader) oldHeader.remove();
    // Integrar ao topo do body, mas sem ocupar espaço extra
    let header = document.createElement('div');
    header.id = 'app-header';
    header.style.position = 'absolute';
    header.style.top = '0';
    header.style.right = '0';
    header.style.zIndex = '100';
    header.style.background = 'none';
    header.style.boxShadow = 'none';
    header.innerHTML = `
      <div class="header-right" style="display:flex;align-items:center;gap:1.2rem;padding:0.7rem 1.2rem;">
        <button class="darkmode-btn" id="darkmode-toggle" title="Alternar modo escuro"><i class="fa-solid fa-${document.body.classList.contains('dark') ? 'sun' : 'moon'}"></i></button>
        <div class="profile-menu">
          <button class="profile-btn" id="profile-btn" title="Perfil"><i class="fa-solid fa-user"></i> ${getCurrentUser() ? getCurrentUser().nome : ''} <i class="fa-solid fa-caret-down"></i></button>
          <div class="profile-dropdown" id="profile-dropdown" style="display:none;">
            <button id="edit-profile-btn"><i class="fa-solid fa-pen"></i> Editar Perfil</button>
            <button id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Sair</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(header);
    // Darkmode toggle
    header.querySelector('#darkmode-toggle').onclick = () => {
      setDarkMode(!document.body.classList.contains('dark'));
      renderHeader();
    };
    // Profile dropdown
    const profileBtn = header.querySelector('#profile-btn');
    const dropdown = header.querySelector('#profile-dropdown');
    profileBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    };
    document.addEventListener('click', () => { dropdown.style.display = 'none'; });
    // Editar perfil
    header.querySelector('#edit-profile-btn').onclick = showEditProfilePopup;
    // Logout
    header.querySelector('#logout-btn').onclick = () => {
      localStorage.removeItem('user_login');
      location.reload();
    };
  }
  // --- Popup para editar perfil ---
  function showEditProfilePopup() {
    const user = getCurrentUser();
    let popup = document.createElement('div');
    popup.className = 'comment-popup';
    popup.innerHTML = `
      <div class="comment-popup-bg"></div>
      <div class="comment-popup-content">
        <h3>Editar Perfil</h3>
        <form id="edit-profile-form" autocomplete="off">
          <label>Nome</label>
          <input type="text" id="edit-nome" value="${user.nome}" required style="margin-bottom:0.7rem;width:100%;padding:0.6rem 1rem;font-size:1rem;">
          <label>Senha atual</label>
          <input type="password" id="edit-senha-atual" placeholder="Senha atual" required style="margin-bottom:0.7rem;width:100%;padding:0.6rem 1rem;font-size:1rem;">
          <label>Nova senha</label>
          <input type="password" id="edit-senha-nova" placeholder="Nova senha" style="margin-bottom:1.1rem;width:100%;padding:0.6rem 1rem;font-size:1rem;">
          <div class="comment-popup-actions">
            <button type="submit" class="comment-popup-save"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
            <button type="button" class="comment-popup-close"><i class="fa-solid fa-xmark"></i> Fechar</button>
          </div>
          <div id="edit-err" style="color:#e74c3c;font-size:0.98rem;margin-top:0.7rem;display:none;"></div>
        </form>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.comment-popup-bg').onclick = close;
    popup.querySelector('.comment-popup-close').onclick = close;
    function close() { document.body.removeChild(popup); }
    popup.querySelector('#edit-profile-form').onsubmit = function(e) {
      e.preventDefault();
      const nome = popup.querySelector('#edit-nome').value.trim();
      const senhaAtual = popup.querySelector('#edit-senha-atual').value.trim();
      const senhaNova = popup.querySelector('#edit-senha-nova').value.trim();
      if (senhaAtual !== user.senha) {
        popup.querySelector('#edit-err').textContent = 'Senha atual incorreta';
        popup.querySelector('#edit-err').style.display = 'block';
        return;
      }
      user.nome = nome;
      if (senhaNova) user.senha = senhaNova;
      saveUsers();
      close();
      renderHeader();
      render();
    };
  }
  // --- Persistência dos usuários ---
  function saveUsers() {
    localStorage.setItem('users', JSON.stringify(USERS));
  }
  function loadUsers() {
    const saved = localStorage.getItem('users');
    if (saved) {
      const arr = JSON.parse(saved);
      for (let i = 0; i < USERS.length; i++) {
        if (arr[i]) {
          USERS[i].nome = arr[i].nome;
          USERS[i].senha = arr[i].senha;
        }
      }
    }
  }
  loadUsers();
  // --- Melhorias no sistema de comentários ---
  const REACTIONS = [
    { icon: '👍', label: 'curtir' },
    { icon: '❤️', label: 'amei' },
    { icon: '😂', label: 'haha' },
    { icon: '😮', label: 'uau' },
    { icon: '😢', label: 'triste' }
  ];
  function showMultiCommentPopup(key, item, comments) {
    let popup = document.createElement('div');
    popup.className = 'comment-popup';
    popup.innerHTML = `
      <div class="comment-popup-bg"></div>
      <div class="comment-popup-content">
        <h3>Comentários para: <span>${item}</span></h3>
        <div class="comment-list" style="max-height:40vh;overflow-y:auto;margin-bottom:1rem;">
          ${comments.length ? comments.map((c, idx) => `
            <div class='comment-item' data-idx='${idx}'>
              <b>${c.user || 'Anônimo'}:</b> <span>${c.text || c}</span>
              <div class="reactions">${REACTIONS.map(r => `<button class="reaction-btn" data-reaction="${r.label}" data-idx="${idx}">${r.icon} <span>${(c.reactions && c.reactions[r.label]) || ''}</span></button>`).join('')}</div>
              <button class="reply-btn" title="Responder" aria-label="Responder comentário"><i class="fa-solid fa-reply"></i></button>
              ${c.replies && c.replies.length ? `<div class='reply-list'>${c.replies.map(r => `<div class='reply-item'><b>${r.user || 'Anônimo'}:</b> <span>${r.text}</span></div>`).join('')}</div>` : ''}
            </div>
          `).join('') : '<div class="comment-item comment-empty">Nenhum comentário ainda.</div>'}
        </div>
        <textarea class="comment-popup-box" placeholder="Digite seu comentário..."></textarea>
        <div class="comment-popup-actions">
          <button class="comment-popup-send"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
          <button class="comment-popup-close"><i class="fa-solid fa-xmark"></i> Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    // Fechar popup
    popup.querySelector('.comment-popup-bg').onclick = close;
    popup.querySelector('.comment-popup-close').onclick = close;
    function close() { document.body.removeChild(popup); }
    // Enviar novo comentário
    popup.querySelector('.comment-popup-send').onclick = function() {
      const textarea = popup.querySelector('.comment-popup-box');
      const val = textarea.value.trim();
      if (!val) return;
      if (!state[key]) state[key] = {};
      if (!Array.isArray(state[key].comments)) state[key].comments = [];
      const user = getCurrentUser();
      state[key].comments.push({ user: user ? user.nome : 'Anônimo', text: val, replies: [], reactions: {} });
      saveState();
      close();
      render();
    };
    // Reações
    popup.querySelectorAll('.reaction-btn').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const idx = +btn.dataset.idx;
        const reaction = btn.dataset.reaction;
        if (!state[key].comments[idx].reactions) state[key].comments[idx].reactions = {};
        state[key].comments[idx].reactions[reaction] = (state[key].comments[idx].reactions[reaction] || 0) + 1;
        saveState();
        close();
        render();
      };
    });
    // Responder comentário
    popup.querySelectorAll('.reply-btn').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const idx = +btn.closest('.comment-item').dataset.idx;
        showReplyPopup(key, idx);
      };
    });
  }
  // Popup para responder comentário
  function showReplyPopup(key, idx) {
    let popup = document.createElement('div');
    popup.className = 'comment-popup';
    popup.innerHTML = `
      <div class="comment-popup-bg"></div>
      <div class="comment-popup-content">
        <h3>Responder comentário</h3>
        <textarea class="comment-popup-box" placeholder="Digite sua resposta..."></textarea>
        <div class="comment-popup-actions">
          <button class="comment-popup-send"><i class="fa-solid fa-paper-plane"></i> Responder</button>
          <button class="comment-popup-close"><i class="fa-solid fa-xmark"></i> Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.comment-popup-bg').onclick = close;
    popup.querySelector('.comment-popup-close').onclick = close;
    function close() { document.body.removeChild(popup); }
    popup.querySelector('.comment-popup-send').onclick = function() {
      const textarea = popup.querySelector('.comment-popup-box');
      const val = textarea.value.trim();
      if (!val) return;
      if (!state[key]) state[key] = {};
      if (!Array.isArray(state[key].comments)) state[key].comments = [];
      if (!Array.isArray(state[key].comments[idx].replies)) state[key].comments[idx].replies = [];
      const user = getCurrentUser();
      state[key].comments[idx].replies.push({ user: user ? user.nome : 'Anônimo', text: val });
      saveState();
      close();
      render();
    };
  }

  // --- Sistema de Login Simples ---
  const USERS = [
    { login: 'satina', senha: 'satina123', nome: 'Sátina' },
    { login: 'matheus', senha: 'matheus123', nome: 'Matheus' }
  ];

  function isLoggedIn() {
    return !!localStorage.getItem('user_login');
  }
  function getCurrentUser() {
    const login = localStorage.getItem('user_login');
    return USERS.find(u => u.login === login);
  }
  function requireLogin() {
    if (!isLoggedIn()) {
      showLoginPopup();
      return false;
    }
    return true;
  }
  function showLoginPopup() {
    let popup = document.createElement('div');
    popup.className = 'comment-popup';
    popup.innerHTML = `
      <div class="comment-popup-bg"></div>
      <div class="comment-popup-content">
        <h3>Login</h3>
        <form id="login-form" autocomplete="off">
          <input type="text" id="login-user" placeholder="Usuário" required style="margin-bottom:0.7rem;width:100%;padding:0.6rem 1rem;font-size:1rem;">
          <input type="password" id="login-pass" placeholder="Senha" required style="margin-bottom:1.1rem;width:100%;padding:0.6rem 1rem;font-size:1rem;">
          <div class="comment-popup-actions">
            <button type="submit" class="comment-popup-save"><i class="fa-solid fa-right-to-bracket"></i> Entrar</button>
          </div>
          <div id="login-err" style="color:#e74c3c;font-size:0.98rem;margin-top:0.7rem;display:none;"></div>
        </form>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.comment-popup-bg').onclick = close;
    function close() { document.body.removeChild(popup); }
    popup.querySelector('#login-form').onsubmit = function(e) {
      e.preventDefault();
      const user = popup.querySelector('#login-user').value.trim().toLowerCase();
      const pass = popup.querySelector('#login-pass').value.trim();
      const found = USERS.find(u => u.login === user && u.senha === pass);
      if (found) {
        localStorage.setItem('user_login', found.login);
        close();
        location.reload();
      } else {
        popup.querySelector('#login-err').textContent = 'Usuário ou senha inválidos';
        popup.querySelector('#login-err').style.display = 'block';
      }
    };
  }

  // --- Proteção de página ---
  if (!isLoggedIn()) {
    showLoginPopup();
  } else {
    // Renderizar header em todas as páginas após login
    if (!isLoggedIn()) {
      showLoginPopup();
    } else {
      // Remove header duplicado se existir
      const oldHeader = document.getElementById('app-header');
      if (oldHeader) oldHeader.remove();
      renderHeader();
      // Inicialização
      function init() {
        loadState();
        initDarkMode();
        render();
        renderSidebarActions();
        renderHeader();
      }

      if (main && data.length) init();
    }
  }
})();
