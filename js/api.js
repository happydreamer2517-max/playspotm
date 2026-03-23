/* ══════════════════════════════════
   api.js — Google Apps Script 통신
══════════════════════════════════ */

const API = {

  /* JSONP 방식으로 GAS 호출 (CORS 우회) */
  call(params, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const cbName = '_qms_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);

      const timer = setTimeout(() => {
        delete window[cbName];
        reject(new Error('요청 시간이 초과되었습니다.'));
      }, timeoutMs);

      window[cbName] = (data) => {
        clearTimeout(timer);
        delete window[cbName];
        resolve(data);
      };

      const query = Object.entries({ ...params, callback: cbName })
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const script = document.createElement('script');
      script.src = `${CONFIG.GAS_URL}?${query}`;
      script.onerror = () => {
        clearTimeout(timer);
        delete window[cbName];
        script.remove();
        reject(new Error('서버 연결에 실패했습니다.'));
      };
      script.onload = () => script.remove();
      document.head.appendChild(script);
    });
  },

  /* 편의 메서드들 */
  login(userId, pw)       { return this.call({ action: 'login',      userId, pw }); },
  getUsers()              { return this.call({ action: 'getUsers' }); },
  addUser(params)         { return this.call({ action: 'addUser',    ...params }); },
  updateUser(params)      { return this.call({ action: 'updateUser', ...params }); },
  deleteUser(id)          { return this.call({ action: 'deleteUser', id }); },
};
