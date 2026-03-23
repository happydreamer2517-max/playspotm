/* ══════════════════════════════════
   config.js — 전역 설정값
══════════════════════════════════ */

const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyAaQZ7QsllWc_S6XRsfk9kkhFyaqqsG56_u9cYqHkYhGcznqb3JzXsfxLbzMGzMbVnDA/exec',
  SESSION_KEY: 'qms_session',
  PERM_KEY:    'qms_perms',
};

/* 역할 메타데이터 */
const ROLES = {
  admin:   { label: '관리자', cls: 'b-admin',   avCls: 'av-admin' },
  manager: { label: '매니저', cls: 'b-manager', avCls: 'av-manager' },
  staff:   { label: '직원',   cls: 'b-staff',   avCls: 'av-staff' },
  viewer:  { label: '열람자', cls: 'b-viewer',  avCls: 'av-viewer' },
};

/* 부서 배지 클래스 */
const DEPT_CLS = {
  '경영': 'b-dept',
  '영업': 'b-dept4',
  '운영': 'b-dept3',
  '물류': 'b-dept2',
};

/* 전체 페이지 목록 */
const PAGES = [
  { key: 'home',      label: '홈 대시보드' },
  { key: 'logistics', label: '물류 관리' },
  { key: 'sales',     label: '영업 관리' },
  { key: 'machine',   label: '머신 출고' },
  { key: 'users',     label: '사용자 관리' },
  { key: 'perms',     label: '권한 설정' },
];

/* 사용자별 개인 권한이 적용되는 페이지 */
const USER_PERM_PAGES = [
  { key: 'logistics', label: '물류 관리', col: 'perm_logistics' },
  { key: 'sales',     label: '영업 관리', col: 'perm_sales' },
  { key: 'machine',   label: '머신 출고', col: 'perm_machine' },
];

/* 권한 레벨 */
const PERM_LEVELS = ['none', 'view', 'edit'];

const PERM_LABEL = {
  none: { text: '없음', icon: '✕', cls: 'pl-none' },
  view: { text: '열람', icon: '👁', cls: 'pl-view' },
  edit: { text: '수정', icon: '✏️', cls: 'pl-edit' },
};

/* 역할별 기본 권한 (로컬 fallback) */
const DEFAULT_PERMS = {
  admin:   { home:'edit', logistics:'edit', sales:'edit', machine:'edit', users:'edit', perms:'edit' },
  manager: { home:'edit', logistics:'edit', sales:'edit', machine:'edit', users:'view', perms:'none' },
  staff:   { home:'view', logistics:'view', sales:'view', machine:'view', users:'none', perms:'none' },
  viewer:  { home:'view', logistics:'view', sales:'none', machine:'none', users:'none', perms:'none' },
};

/* ── 권한 헬퍼 ──
   우선순위: 사용자 개인 권한 > 역할 기본 권한
   홈/사용자관리/권한설정은 항상 역할 권한만 적용
*/
const Perm = {
  _rolePerms() {
    const raw = localStorage.getItem(CONFIG.PERM_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_PERMS));
  },

  level(role, page, user = null) {
    // 개인 권한 적용 페이지이고, 유저 정보가 있으면 개인 권한 우선
    const userPermPage = USER_PERM_PAGES.find(p => p.key === page);
    if (userPermPage && user) {
      const userLevel = user[userPermPage.col];
      if (userLevel && PERM_LEVELS.includes(userLevel)) {
        return userLevel;
      }
    }
    // 역할 기본 권한 fallback
    return this._rolePerms()[role]?.[page] || 'none';
  },

  canView(role, page, user = null) {
    const lv = this.level(role, page, user);
    return lv === 'view' || lv === 'edit';
  },

  canEdit(role, page, user = null) {
    return this.level(role, page, user) === 'edit';
  },
};
