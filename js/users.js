/* ══════════════════════════════════
   users.js — 사용자 관리
   사용자별 페이지 권한 설정 포함
══════════════════════════════════ */

const Users = {

  list: [],
  filterText: '',
  filterRole: '',
  filterDept: '',
  editingId: null,
  deleteTargetId: null,
  selectedRole: '',
  userPerms: {},  // { perm_logistics: 'view', perm_sales: 'none', perm_machine: 'edit' }

  async load() {
    UI.setSyncState('syncing', '동기화 중...');
    try {
      const res = await API.getUsers();
      if (res.success) {
        this.list = res.users;
        this.render();
        UI.updateBadge('badge-users', this.list.length);
        UI.setSyncState('ok', '구글 시트 연결됨');
      } else {
        UI.setSyncState('error', '불러오기 실패');
        UI.showToast('❌ 사용자 목록을 불러오지 못했습니다.');
      }
    } catch (e) {
      UI.setSyncState('error', '연결 오류');
      UI.showToast('❌ 서버 연결 오류');
    }
  },

  render() {
    const role    = Auth.currentUser?.role;
    const canEdit = Perm.canEdit(role, 'users', Auth.currentUser);

    const filtered = this.list.filter(u => {
      const t = this.filterText;
      const matchText = t ? (u.name?.includes(t) || u.userId?.toLowerCase().includes(t)) : true;
      const matchRole = this.filterRole ? u.role === this.filterRole : true;
      const matchDept = this.filterDept ? u.dept === this.filterDept  : true;
      return matchText && matchRole && matchDept;
    });

    // 추가 버튼 노출
    const addBtn = document.querySelector('[onclick="Users.openAdd()"]');
    if (addBtn) addBtn.style.display = canEdit ? '' : 'none';

    const tbody = document.getElementById('user-table-body');
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:30px;">검색 결과가 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      // 이 유저의 페이지별 권한 뱃지
      const permBadges = USER_PERM_PAGES.map(pg => {
        const lv   = Perm.level(u.role, pg.key, u);
        const meta = PERM_LABEL[lv];
        return `<span class="perm-level-btn ${meta.cls}" style="cursor:default;pointer-events:none;padding:2px 7px;font-size:10px;">
          ${meta.icon} ${pg.label.replace(' 관리','').replace(' 출고','')}
        </span>`;
      }).join('');

      return `
        <tr>
          <td>
            <div class="user-info">
              <div class="avatar ${ROLES[u.role]?.avCls || ''}" style="width:28px;height:28px;font-size:11px;">
                ${(u.name || '?')[0]}
              </div>
              <div class="user-name">${u.name || '—'}</div>
            </div>
          </td>
          <td><span class="user-id">${u.userId || '—'}</span></td>
          <td>${u.rank || '—'}</td>
          <td><span class="badge ${DEPT_CLS[u.dept] || 'b-dept'}">${u.dept || '—'}</span></td>
          <td><span class="badge ${ROLES[u.role]?.cls || ''}">${ROLES[u.role]?.label || u.role}</span></td>
          <td>
            <div style="display:flex;flex-wrap:wrap;gap:3px;">${permBadges}</div>
          </td>
          <td><span class="badge ${u.status === 'active' ? 'b-active' : 'b-inactive'}">${u.status === 'active' ? '활성' : '비활성'}</span></td>
          <td>
            <div class="action-row">
              ${canEdit
                ? `<button class="btn btn-secondary btn-sm" onclick="Users.openEdit('${u.id}')">수정</button>
                   ${u.userId !== 'admin' ? `<button class="btn btn-danger btn-sm" onclick="Users.openDelete('${u.id}')">삭제</button>` : ''}`
                : `<span style="font-size:11px;color:var(--text3);">—</span>`
              }
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  onSearch(v)    { this.filterText = v.toLowerCase(); this.render(); },
  onRoleFilter(v){ this.filterRole = v; this.render(); },
  onDeptFilter(v){ this.filterDept = v; this.render(); },

  /* ── 모달: 사용자별 권한 렌더링 ── */
  renderPermPanel(user = null) {
    const container = document.getElementById('user-perm-panel');
    if (!container) return;

    container.innerHTML = USER_PERM_PAGES.map(pg => {
      // 저장된 개인 권한 or 역할 기본값
      const saved = user ? (user[pg.col] || '') : '';
      // 현재 선택된 역할의 기본 권한
      const roleLv = Perm._rolePerms()[this.selectedRole]?.[pg.key] || 'none';
      const curLv  = saved || '';  // 빈값 = 역할 권한 따름

      return `
        <div class="user-perm-row">
          <div class="user-perm-label">
            <span>${pg.label}</span>
            <span class="user-perm-role-default">역할 기본: ${PERM_LABEL[roleLv]?.icon} ${PERM_LABEL[roleLv]?.text}</span>
          </div>
          <div class="user-perm-btns" data-col="${pg.col}">
            ${['', ...PERM_LEVELS].map(lv => {
              const isSelected = curLv === lv;
              if (lv === '') {
                return `<button class="uperm-btn ${isSelected ? 'selected' : ''}"
                  onclick="Users.selectUserPerm(this,'${pg.col}','')"
                  data-lv="">역할 따름</button>`;
              }
              const meta = PERM_LABEL[lv];
              return `<button class="uperm-btn uperm-${lv} ${isSelected ? 'selected' : ''}"
                onclick="Users.selectUserPerm(this,'${pg.col}','${lv}')"
                data-lv="${lv}">${meta.icon} ${meta.text}</button>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');
  },

  selectUserPerm(btn, col, lv) {
    // 같은 col의 버튼들 선택 해제
    btn.closest('.user-perm-btns').querySelectorAll('.uperm-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this.userPerms[col] = lv;
  },

  /* ── 추가 모달 ── */
  openAdd() {
    if (!Perm.canEdit(Auth.currentUser?.role, 'users', Auth.currentUser)) {
      UI.showToast('⛔ 수정 권한이 없습니다.'); return;
    }
    this.editingId    = null;
    this.selectedRole = '';
    this.userPerms    = {};
    document.getElementById('user-modal-title').textContent = '새 사용자 추가';
    document.getElementById('f-name').value  = '';
    document.getElementById('f-id').value    = '';
    document.getElementById('f-id').readOnly = false;
    document.getElementById('f-rank').value  = '사원';
    document.getElementById('f-dept').value  = '영업';
    document.getElementById('f-pw').value    = '';
    document.getElementById('f-pw2').value   = '';
    document.getElementById('pw-fields').style.display        = 'block';
    document.getElementById('reset-pw-section').style.display = 'none';
    document.querySelectorAll('#role-select-cards .role-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('status-toggle').className        = 'check-toggle on';
    document.getElementById('status-label').textContent       = '활성';
    this.renderPermPanel(null);
    UI.openModal('user-modal');
  },

  /* ── 수정 모달 ── */
  openEdit(id) {
    if (!Perm.canEdit(Auth.currentUser?.role, 'users', Auth.currentUser)) {
      UI.showToast('⛔ 수정 권한이 없습니다.'); return;
    }
    const u = this.list.find(x => String(x.id) === String(id));
    if (!u) return;

    this.editingId    = id;
    this.selectedRole = u.role;
    // 기존 개인 권한 불러오기
    this.userPerms = {};
    USER_PERM_PAGES.forEach(pg => {
      this.userPerms[pg.col] = u[pg.col] || '';
    });

    document.getElementById('user-modal-title').textContent = '사용자 수정';
    document.getElementById('f-name').value  = u.name;
    document.getElementById('f-id').value    = u.userId;
    document.getElementById('f-id').readOnly = true;
    document.getElementById('f-rank').value  = u.rank;
    document.getElementById('f-dept').value  = u.dept;
    document.getElementById('pw-fields').style.display        = 'none';
    document.getElementById('reset-pw-section').style.display = 'block';
    document.getElementById('f-pw-reset').value = '';

    const roleKeys = ['admin','manager','staff','viewer'];
    document.querySelectorAll('#role-select-cards .role-card').forEach((c, i) => {
      c.classList.toggle('selected', roleKeys[i] === u.role);
    });
    const active = u.status === 'active';
    document.getElementById('status-toggle').className  = 'check-toggle ' + (active ? 'on' : 'off');
    document.getElementById('status-label').textContent = active ? '활성' : '비활성';

    this.renderPermPanel(u);
    UI.openModal('user-modal');
  },

  selectRole(role, el) {
    this.selectedRole = role;
    document.querySelectorAll('#role-select-cards .role-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    // 역할 바뀌면 권한 패널 기본값 표시 갱신
    this.renderPermPanel(null);
  },

  /* ── 저장 ── */
  async save() {
    const name   = document.getElementById('f-name').value.trim();
    const userId = document.getElementById('f-id').value.trim();
    const rank   = document.getElementById('f-rank').value;
    const dept   = document.getElementById('f-dept').value;
    const role   = this.selectedRole;
    const status = document.getElementById('status-toggle').classList.contains('on') ? 'active' : 'inactive';

    if (!name)                        { UI.showToast('이름을 입력하세요.'); return; }
    if (!userId || userId.length < 4) { UI.showToast('아이디는 4자 이상이어야 합니다.'); return; }
    if (!role)                        { UI.showToast('역할을 선택하세요.'); return; }

    // 개인 권한값 수집 (빈값 = 역할 따름)
    const permData = {};
    USER_PERM_PAGES.forEach(pg => {
      permData[pg.col] = this.userPerms[pg.col] || '';
    });

    UI.showLoading('저장 중...');
    try {
      let res;
      if (!this.editingId) {
        const pw  = document.getElementById('f-pw').value;
        const pw2 = document.getElementById('f-pw2').value;
        if (!pw || pw.length < 6) { UI.hideLoading(); UI.showToast('비밀번호는 6자 이상이어야 합니다.'); return; }
        if (pw !== pw2)           { UI.hideLoading(); UI.showToast('비밀번호가 일치하지 않습니다.'); return; }
        res = await API.addUser({ name, userId, pw, rank, dept, role, status, ...permData });
      } else {
        const newPw = document.getElementById('f-pw-reset').value;
        res = await API.updateUser({ id: this.editingId, name, rank, dept, role, status, pw: newPw || '', ...permData });
      }
      UI.hideLoading();
      if (res.success) {
        UI.closeModal('user-modal');
        UI.showToast('✅ ' + res.message);
        await this.load();
      } else {
        UI.showToast('❌ ' + res.message);
      }
    } catch (e) {
      UI.hideLoading();
      UI.showToast('❌ 저장 중 오류가 발생했습니다.');
    }
  },

  openDelete(id) {
    if (!Perm.canEdit(Auth.currentUser?.role, 'users', Auth.currentUser)) {
      UI.showToast('⛔ 수정 권한이 없습니다.'); return;
    }
    const u = this.list.find(x => String(x.id) === String(id));
    if (!u) return;
    this.deleteTargetId = id;
    document.getElementById('del-user-name').textContent = `${u.name} (${u.userId})`;
    UI.openModal('del-modal');
  },

  async confirmDelete() {
    if (!this.deleteTargetId) return;
    UI.showLoading('삭제 중...');
    try {
      const res = await API.deleteUser(this.deleteTargetId);
      UI.hideLoading();
      if (res.success) {
        UI.closeModal('del-modal');
        UI.showToast('🗑 사용자가 삭제되었습니다.');
        await this.load();
      } else {
        UI.showToast('❌ ' + res.message);
      }
    } catch (e) {
      UI.hideLoading();
      UI.showToast('❌ 삭제 중 오류가 발생했습니다.');
    }
  },

  checkStrength(val, fillId) {
    let score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const colors = ['#ef4444','#f97316','#eab308','#22c55e'];
    const fill   = document.getElementById(fillId);
    if (fill) {
      fill.style.width      = (score * 25) + '%';
      fill.style.background = score > 0 ? colors[score - 1] : 'transparent';
    }
  },

  toggleStatus(btn) {
    const isOn = btn.classList.contains('on');
    btn.className = 'check-toggle ' + (isOn ? 'off' : 'on');
    document.getElementById('status-label').textContent = isOn ? '비활성' : '활성';
  },
};
