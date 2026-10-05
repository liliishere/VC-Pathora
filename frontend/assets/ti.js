/* =====================================================================
      Pathora — tiny API client shared by every page.
   - Served by the backend (http://localhost:8000)  → LIVE mode, real API.
   - Opened as a file (Figma import, quick demo)     → DEMO mode, pages use built-in demo data.
   ===================================================================== */
const TI = (() => {
  const live = location.protocol === 'http:' || location.protocol === 'https:';
  // If the pages are served by another dev server (e.g. VS Code Live Server on :5500), talk to the API on :8000.
  const base = (live && location.port && location.port !== '8000') ? `${location.protocol}//${location.hostname}:8000` : '';
  const store = { get:k=>{try{return localStorage.getItem(k)}catch(e){return null}}, set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}, del:k=>{try{localStorage.removeItem(k)}catch(e){}} };
  const token = () => store.get('ti_token');
  function guestId(){ let g=store.get('ti_guest'); if(!g){ g='g'+Math.random().toString(36).slice(2)+Date.now().toString(36); store.set('ti_guest',g);} return g; }

  async function http(method, path, body){
    const headers = {'Content-Type':'application/json'};
    if (token()) headers.Authorization = 'Bearer ' + token(); else headers['X-Guest-Id'] = guestId();
    const res = await fetch(base + path, {method, headers, body: body===undefined ? undefined : JSON.stringify(body)});
    const data = await res.json().catch(()=>({}));
    if (res.status === 401 && !path.startsWith('/api/auth/')) { store.del('ti_token'); location.href = '02d-login.html'; }
    if (!res.ok){
      const d = data.detail; const msg = Array.isArray(d) ? (d[0]?.msg || 'Please check the form') : (d || 'Something went wrong');
      const err = new Error(String(msg).replace(/^Value error, /,'')); err.status = res.status; throw err;
    }
    return data;
  }
  let meCache = null;
  async function me(){ if(!live || !token()) return null; if(!meCache) meCache = await http('GET','/api/me'); return meCache; }
  function saveLogin(r){ store.set('ti_token', r.token); meCache = null; }
  async function logout(){ if(live && token()){ try{ await http('POST','/api/auth/logout'); }catch(e){} } store.del('ti_token'); }
  function homeFor(role){ return role==='business' ? '07a-business-home.html' : role==='admin' ? '08a-admin-overview.html' : '06a-traveler-home.html'; }
  /* App pages call TI.guard('traveler' | 'business'): sends people to log in, or to their own app. */
  async function guard(role){
    if(!live) return null;
    if(!token()){ location.href='02d-login.html'; return null; }
    const m = await me();
    if(m && m.role!==role && m.role!=='admin'){ location.href = homeFor(m.role); return null; }
    document.querySelectorAll('[data-me-name]').forEach(e=>e.textContent=m.name);
    document.querySelectorAll('[data-me-initial]').forEach(e=>e.textContent=m.name[0]);
    document.querySelectorAll('[data-quota]').forEach(e=>e.textContent = m.quota_left==null ? 'Unlimited AI questions.' : `${m.quota_left} of ${m.quota_total} AI questions left today.`);
    return m;
  }
  async function tripId(){
    const p = new URLSearchParams(location.search).get('trip'); if(p) return +p;
    const saved = store.get('ti_trip'); const trips = await http('GET','/api/trips');
    if(saved && trips.some(t=>t.id==saved)) return +saved;
    return trips[0]?.id || null;
  }
  function setTrip(id){ store.set('ti_trip', id); }
  return { live, http, me, saveLogin, logout, guard, tripId, setTrip, homeFor, guestId };
})();
