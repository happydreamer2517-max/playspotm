/* ══════════════════════════════════
   config.js — 전역 설정값
   여기만 수정하면 전체에 반영됩니다
══════════════════════════════════ */

const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwkopYMM4slKoYnup5oYo6B2QZxJfkImjvRJAaMhpNok9Pn5aSYmHpx_MpmXw5sK1QdDg/exec',
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

/* 기본 권한 (로컬 fallback) */
const DEFAULT_PERMS = {
  admin:   { home:1, logistics:1, sales:1, machine:1, users:1, perms:1 },
  manager: { home:1, logistics:1, sales:1, machine:1, users:0, perms:0 },
  staff:   { home:1, logistics:1, sales:0, machine:0, users:0, perms:0 },
  viewer:  { home:1, logistics:0, sales:0, machine:0, users:0, perms:0 },
};
