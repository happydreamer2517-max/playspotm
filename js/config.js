/* ══════════════════════════════════
   config.js — 전역 설정값
   여기만 수정하면 전체에 반영됩니다
══════════════════════════════════ */

const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyAaQZ7QsllWc_S6XRsfk9kkhFyaqqsG56_u9cYqHkYhGcznqb3JzXsfxLbzMGzMbVnDA/exec',
  SESSION_KEY: 'qms_session',
  PERM_KEY: 'qms_perms',
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

/* 권한 설정 — 페이지 목록 */
const PAGES = [
  { key: 'home',      label: '홈 대시보드' },
  { key: 'logistics', label: '물류 관리' },
  { key: 'sales',     label: '영업 관리' },
  { key: 'machine',   label: '머신 출고' },
  { key: 'users',     label: '사용자 관리' },
  { key: 'perms',     label: '권한 설정' },
];

/* ── 권한 레벨 ──
   'none' = 접근 불가
   'view' = 열람만 가능
   'edit' = 수정 가능 (열람 포함)
*/
const PERM_LEVELS = ['none', 'view', 'edit'];

const PERM_LABEL = {
  none: { text: '없음', icon: '✕', cls: 'pl-none' },
  view: { text: '열람', icon: '👁', cls: 'pl-view' },
  edit: { text: '수정', icon: '✏️', cls: 'pl-edit' },
};

/* 기본 권한 */
const DEFAULT_PERMS = {
  admin:   { home:'edit', logistics:'edit', sales:'edit', machine:'edit', users:'edit', perms:'edit' },
  manager: { home:'edit', logistics:'edit', sales:'edit', machine:'edit', users:'view', perms:'none' },
  staff:   { home:'view', logistics:'view', sales:'view', machine:'view', users:'none', perms:'none' },
  viewer:  { home:'view', logistics:'view', sales:'none', machine:'none', users:'none', perms:'none' },
};

/* 권한 헬퍼 */
const Perm = {
  _get() {
    const raw = localStorage.getItem(CONFIG.PERM_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_PERMS));
  },
  level(role, page) {
    return this._get()[role]?.[page] || 'none';
  },
  canView(role, page) {
    const lv = this.level(role, page);
    return lv === 'view' || lv === 'edit';
  },
  canEdit(role, page) {
    return this.level(role, page) === 'edit';
  },
};
