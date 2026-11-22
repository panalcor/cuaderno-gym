'use strict';
/* =========================================================
   Cuaderno de Gimnasio — todo se guarda en el móvil (localStorage).
   Copia opcional: archivo .json o Google Drive.
   ========================================================= */
const VERSION = '1.0.0';
const KEY = 'cuadernoGym.v1';

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const f1 = n => (Math.round(n * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
const showNum = v => (v === '' || v == null) ? '' : String(v).replace('.', ',');
const pad = n => String(n).padStart(2, '0');
const dur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m} min`; };
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dShort = t => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}`; };
const dLong = t => { const d = new Date(t); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const restFmt = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;

/* ---------- ejercicios ---------- */
const REGION = { 'Cuádriceps': 'red', 'Isquios': 'red', 'Glúteo': 'red', 'Aductores': 'red', 'Gemelo': 'red',
  'Pecho': 'blue', 'Hombro': 'blue', 'Tríceps': 'blue',
  'Espalda': 'yellow', 'Espalda baja': 'yellow', 'Bíceps': 'yellow', 'Antebrazo': 'yellow',
  'Core': 'green', 'Cuerpo completo': 'violet', 'Cardio': 'violet', 'Movilidad': 'violet' };
const GROUPS = Object.keys(REGION);
const LUG = { G: 'Gimnasio', C: 'Calle', H: 'Casa' };
const MODES = { kg: 'Peso × repeticiones', reps: 'Repeticiones (lastre opcional)', tiempo: 'Tiempo (segundos)', cardio: 'Cardio (minutos y km)' };
const FIELDS = { kg: [['kg', 'kg'], ['reps', 'reps']], reps: [['reps', 'reps'], ['kg', '+kg']], tiempo: [['secs', 'seg']], cardio: [['min', 'min'], ['km', 'km']] };
const plate = g => `<i class="plate p-${REGION[g] || 'violet'}"></i>`;
let EX = new Map();
function rebuildEx() {
  EX = new Map();
  for (const e of window.EXERCISES) EX.set(e.id, e);
  for (const e of S.custom) EX.set(e.id, { ...e, custom: true });
}
const ex = id => EX.get(id) || { id, n: 'Ejercicio eliminado', g: 'Cuerpo completo', e: '—', m: 'kg', l: 'GCH' };
const idOf = name => window.EXERCISE_SLUG(name);

/* ---------- estado ---------- */
let S;
function defaults() {
  return { version: 1, settings: { rest: 90, driveClientId: '', driveAuto: false, driveFileId: null, lastDrive: null, lastExport: null },
    custom: [], routines: [], sessions: [], bodyweight: [], active: null, updatedAt: 0 };
}
function sampleRoutines() {
  const r = (name, items) => ({ id: uid(), name, items: items.map(([n, sets, reps, rest]) => ({ ex: idOf(n), sets, reps: String(reps), rest: rest || 90 })) });
  return [
    r('Torso A', [['Press banca', 4, 6, 150], ['Remo con barra', 4, 8, 120], ['Press militar con barra', 3, 8, 120], ['Jalón al pecho', 3, 10], ['Curl con barra', 3, 10, 60], ['Extensión en polea con cuerda', 3, 12, 60]]),
    r('Pierna', [['Sentadilla', 4, 6, 150], ['Peso muerto rumano', 3, 8, 120], ['Prensa de piernas', 3, 12], ['Curl femoral tumbado', 3, 12, 60], ['Elevación de talones de pie', 4, 12, 60], ['Plancha', 3, 45, 60]]),
    r('Parque (calle)', [['Dominadas', 4, 8, 120], ['Fondos en paralelas', 4, 10, 120], ['Dominadas australianas (remo invertido)', 3, 12], ['Flexiones', 3, 15, 60], ['Sentadilla búlgara', 3, 12, 60], ['Elevación de piernas colgado', 3, 10, 60]]),
    r('Casa', [['Flexiones', 4, 12, 60], ['Sentadilla goblet', 4, 12], ['Remo con mancuerna a una mano', 3, 10, 60], ['Puente de glúteo', 3, 15, 60], ['Press de hombro con mancuernas', 3, 10, 60], ['Plancha', 3, 40, 45]])
  ];
}
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
  S = Object.assign(defaults(), d || {});
  S.settings = Object.assign(defaults().settings, S.settings || {});
  if (!d) S.routines = sampleRoutines();
}
let saveT = null;
function writeNow() {
  clearTimeout(saveT); saveT = null;
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('No se pudo guardar en el móvil: ' + e.message); }
}
function save() { S.updatedAt = Date.now(); writeNow(); }
function saveSoon() { S.updatedAt = Date.now(); clearTimeout(saveT); saveT = setTimeout(writeNow, 400); }
document.addEventListener('visibilitychange', () => { if (document.hidden && saveT) writeNow(); });
window.addEventListener('pagehide', () => { if (saveT) writeNow(); });

/* ---------- cálculos ---------- */
const e1rm = (kg, reps) => reps <= 0 ? 0 : (reps === 1 ? kg : kg * (1 + reps / 30));
function metric(m, sets) {
  if (!sets.length) return 0;
  if (m === 'kg') return Math.max(...sets.map(s => e1rm(num(s.kg), num(s.reps))));
  if (m === 'reps') return Math.max(...sets.map(s => num(s.reps)));
  if (m === 'tiempo') return Math.max(...sets.map(s => num(s.secs)));
  const km = sets.reduce((a, s) => a + num(s.km), 0);
  return km > 0 ? km : sets.reduce((a, s) => a + num(s.min), 0);
}
function metricInfo(m, sets) {
  if (m === 'kg') return { label: '1RM estimado', unit: 'kg' };
  if (m === 'reps') return { label: 'Máximo de repeticiones', unit: 'reps' };
  if (m === 'tiempo') return { label: 'Mejor tiempo', unit: 's' };
  const km = (sets || []).some(s => num(s.km) > 0);
  return km ? { label: 'Distancia', unit: 'km' } : { label: 'Duración', unit: 'min' };
}
const sessVol = s => s.exercises.reduce((a, it) => a + (ex(it.ex).m === 'kg' ? it.sets.reduce((b, x) => b + num(x.kg) * num(x.reps), 0) : 0), 0);
const sessSets = s => s.exercises.reduce((a, it) => a + it.sets.length, 0);
function setText(m, s) {
  if (m === 'kg') return `${showNum(s.kg) || 0} × ${s.reps || 0}`;
  if (m === 'reps') return `${s.reps || 0}${num(s.kg) ? ` (+${showNum(s.kg)} kg)` : ''}`;
  if (m === 'tiempo') return `${s.secs || 0} s`;
  return [num(s.min) ? `${showNum(s.min)} min` : '', num(s.km) ? `${showNum(s.km)} km` : ''].filter(Boolean).join(' · ') || '—';
}
function lastFor(exId, beforeId) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const s = S.sessions[i]; if (s.id === beforeId) continue;
    const it = s.exercises.find(x => x.ex === exId);
    if (it) return { session: s, sets: it.sets };
  }
  return null;
}
function historyFor(exId) {
  const out = [];
  for (const s of S.sessions) { const it = s.exercises.find(x => x.ex === exId); if (it) out.push({ s, sets: it.sets }); }
  return out;
}

/* ---------- interfaz base ---------- */
let current = 'hoy';
function show(tab) {
  current = tab;
  for (const sec of document.querySelectorAll('.screen')) sec.hidden = sec.id !== 's-' + tab;
  for (const t of document.querySelectorAll('.tab')) t.setAttribute('aria-selected', t.dataset.s === tab);
  ({ hoy: renderHoy, entreno: renderEntreno, ejercicios: renderLib, progreso: renderProg, ajustes: renderAjustes })[tab]();
  $('#s-' + tab).scrollTop = 0;
  $('#liveDot').hidden = !S.active;
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => show(t.dataset.s)));

let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }

function openSheet(html, onMount) {
  const b = $('#sheetBody'); b.innerHTML = '<div class="grab"></div>' + html; $('#sheet').hidden = false; b.scrollTop = 0;
  if (onMount) onMount(b);
}
function closeSheet() { $('#sheet').hidden = true; $('#sheetBody').innerHTML = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

function ask(msg, yes = 'Aceptar', no = 'Cancelar', danger = false) {
  return new Promise(res => {
    const box = $('#dialogBox');
    box.innerHTML = `<p>${esc(msg)}</p><div class="row2"><button class="btn ghost" data-r="0">${esc(no)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(yes)}</button></div>`;
    $('#dialog').hidden = false;
    box.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; $('#dialog').hidden = true; res(b.dataset.r === '1'); };
  });
}

/* ---------- gráfica ---------- */
function nice(x) { const p = 10 ** Math.floor(Math.log10(x)); const m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
function lineChart(pts) {
  if (pts.length < 2) return '<p class="empty">Con 2 registros o más aparece la gráfica.</p>';
  const W = 340, H = 180, L = 42, R = 14, T = 12, B = 26;
  const vs = pts.map(p => p.v); let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
  const step = nice((hi - lo) / 4); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const x = i => L + i * (W - L - R) / (pts.length - 1), y = v => T + (hi - v) * (H - T - B) / (hi - lo);
  let g = '';
  for (let v = lo; v <= hi + step / 1000; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${f1(v)}</text>`;
  const last = pts.length - 1, idx = [...new Set([0, Math.round(last / 2), last])];
  const xl = idx.map(i => `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === last ? 'end' : 'middle'}">${dShort(pts[i].t)}</text>`).join('');
  const line = pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ');
  const area = `M${x(0)},${y(lo)} L${pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' L')} L${x(last)},${y(lo)} Z`;
  const dots = pts.map((p, i) => (i === last || pts.length <= 24) ? `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === last ? 5 : 2.5}" fill="${i === last ? 'var(--accent)' : 'var(--surface)'}" stroke="var(--accent)" stroke-width="2"/>` : '').join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfica de progreso">${g}<path d="${area}" fill="var(--accent)" fill-opacity=".12"/><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>${dots}${xl}</svg>`;
}

/* =========================================================
   HOY
   ========================================================= */
function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
function nextRoutineId() {
  if (!S.routines.length) return null;
  const last = [...S.sessions].reverse().find(s => s.routineId && S.routines.some(r => r.id === s.routineId));
  if (!last) return S.routines[0].id;
  const i = S.routines.findIndex(r => r.id === last.routineId);
  return S.routines[(i + 1) % S.routines.length].id;
}
function renderHoy() {
  const now = new Date(), h = now.getHours();
  const ws = +weekStart(), we = ws + 7 * 864e5;
  const wk = S.sessions.filter(s => s.start >= ws && s.start < we);
  const todayIdx = (now.getDay() + 6) % 7;
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => {
    const a = ws + i * 864e5, done = wk.some(s => s.start >= a && s.start < a + 864e5);
    return `<div class="day"><div class="dot ${done ? 'done' : ''} ${i === todayIdx ? 'today' : ''}">${done ? '✓' : ''}</div>${d}</div>`;
  }).join('');
  const vol = wk.reduce((a, s) => a + sessVol(s), 0), time = wk.reduce((a, s) => a + (s.end - s.start), 0);
  const nextId = nextRoutineId();
  const next = S.routines.find(r => r.id === nextId);
  let hero = '';
  if (S.active) {
    const A = S.active, done = A.exercises.reduce((a, it) => a + it.sets.filter(s => s.done).length, 0);
    hero = `<div class="hero"><div class="k">Entreno en curso · empezado a las ${new Date(A.start).getHours()}:${pad(new Date(A.start).getMinutes())}</div>
      <div class="t">${esc(A.name)}</div><ul><li><span>Series hechas</span><span class="num">${done}</span></li></ul>
      <button class="btn primary" data-act="go-entreno">Continuar entreno</button></div>`;
  } else if (next) {
    hero = `<div class="hero"><div class="k">Te toca</div><div class="t">${esc(next.name)}</div>
      <ul>${next.items.slice(0, 6).map(it => `<li><span>${esc(ex(it.ex).n)}</span><span class="num">${it.sets} × ${esc(it.reps)}${ex(it.ex).m === 'tiempo' ? ' s' : ex(it.ex).m === 'cardio' ? ' min' : ''}</span></li>`).join('')}
      ${next.items.length > 6 ? `<li><span>y ${next.items.length - 6} más</span><span></span></li>` : ''}</ul>
      <button class="btn primary" data-act="start" data-id="${next.id}">Empezar entreno</button></div>`;
  }
  const lastPR = findLastPR();
  $('#s-hoy').innerHTML = `
    <p class="sub" style="margin:0">${dLong(now)}</p>
    <h2>${h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'}</h2>
    <div class="label">Esta semana</div><div class="week">${days}</div>
    ${hero}
    <div class="label">Resumen semanal</div>
    <div class="stats">
      <div class="stat"><div class="v">${wk.length}</div><div class="l">sesiones</div></div>
      <div class="stat"><div class="v">${vol >= 1000 ? f1(vol / 1000) + '<small> t</small>' : f1(vol) + '<small> kg</small>'}</div><div class="l">kilos movidos</div></div>
      <div class="stat"><div class="v">${time ? dur(time) : '0 min'}</div><div class="l">entrenando</div></div>
    </div>
    ${lastPR ? `<div class="label">Último récord</div><div class="kv"><span>${plate(ex(lastPR.ex).g)}&nbsp; ${esc(ex(lastPR.ex).n)}</span><b>${lastPR.text}</b></div>` : ''}
    <div class="label">Mis rutinas <button class="link" data-act="new-routine">+ Nueva</button></div>
    ${S.routines.map(r => `<div class="rut"><div class="top"><span class="name">${esc(r.name)}</span>${r.id === nextId && !S.active ? '<span class="badge">Siguiente</span>' : ''}</div>
      <div class="exs">${r.items.map(it => esc(ex(it.ex).n)).join(' · ') || 'Sin ejercicios'}</div>
      <div class="row2" style="margin-top:0"><button class="btn ghost small" style="width:100%" data-act="edit-routine" data-id="${r.id}">Editar</button><button class="btn primary small" style="width:100%" data-act="start" data-id="${r.id}" ${S.active ? 'disabled' : ''}>Empezar</button></div></div>`).join('') || '<p class="empty">Todavía no tienes rutinas.</p>'}
    <button class="btn ghost" data-act="free" ${S.active ? 'disabled' : ''}>Entreno libre (sin rutina)</button>`;
}
function findLastPR() {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const s = S.sessions[i];
    for (const it of s.exercises) {
      const m = ex(it.ex).m, v = metric(m, it.sets);
      const prev = S.sessions.slice(0, i).map(p => p.exercises.find(x => x.ex === it.ex)).filter(Boolean);
      if (prev.length && v > Math.max(...prev.map(p => metric(m, p.sets)))) {
        const best = m === 'kg' ? it.sets.reduce((a, b) => e1rm(num(b.kg), num(b.reps)) > e1rm(num(a.kg), num(a.reps)) ? b : a) : null;
        return { ex: it.ex, text: best ? `${showNum(best.kg)} kg × ${best.reps}` : `${f1(v)} ${metricInfo(m, it.sets).unit}` };
      }
    }
  }
  return null;
}
$('#s-hoy').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'start') startSession(S.routines.find(r => r.id === b.dataset.id));
  else if (a === 'free') startSession(null);
  else if (a === 'go-entreno') show('entreno');
  else if (a === 'new-routine') editRoutine(null);
  else if (a === 'edit-routine') editRoutine(b.dataset.id);
});

/* =========================================================
   ENTRENO
   ========================================================= */
function setsFromHistory(exId, n, reps) {
  const m = ex(exId).m, last = lastFor(exId);
  const out = [];
  for (let j = 0; j < n; j++) {
    const p = last ? (last.sets[j] || last.sets[last.sets.length - 1]) : null;
    const s = { done: false };
    for (const [f] of FIELDS[m]) s[f] = p && p[f] !== undefined ? p[f] : '';
    if (reps !== undefined && reps !== '') {
      const r = parseInt(reps, 10);
      if (Number.isFinite(r)) { if (m === 'kg' || m === 'reps') s.reps = s.reps === '' ? r : s.reps; if (m === 'tiempo' && s.secs === '') s.secs = r; if (m === 'cardio' && s.min === '') s.min = r; }
    }
    out.push(s);
  }
  return out;
}
function startSession(routine) {
  if (S.active) { show('entreno'); return; }
  S.active = { id: uid(), start: Date.now(), name: routine ? routine.name : 'Entreno libre', routineId: routine ? routine.id : null, restEnd: 0, restTotal: 0,
    exercises: routine ? routine.items.map(it => ({ ex: it.ex, rest: it.rest || S.settings.rest, sets: setsFromHistory(it.ex, Math.max(1, it.sets | 0), it.reps) })) : [] };
  save(); show('entreno');
  if (!routine) openPicker(id => { addExerciseToActive(id); });
}
function addExerciseToActive(id) {
  if (!S.active) startSession(null);
  const last = lastFor(id);
  S.active.exercises.push({ ex: id, rest: S.settings.rest, sets: setsFromHistory(id, last ? last.sets.length : 3) });
  save(); show('entreno');
  setTimeout(() => { const s = $('#s-entreno'); s.scrollTop = s.scrollHeight; }, 0);
}
function renderEntreno() {
  const el = $('#s-entreno'), A = S.active;
  if (!A) {
    el.innerHTML = `<h2>Entreno</h2><p class="sub">No hay ningún entreno en marcha.</p>
      <div class="card stack"><p class="muted" style="margin:0">Empieza una de tus rutinas desde <b>Hoy</b> o apunta ejercicios sueltos.</p>
      <button class="btn primary" data-act="free">Empezar entreno libre</button><button class="btn ghost" data-act="go-hoy">Ver mis rutinas</button></div>`;
    return;
  }
  el.innerHTML = `
    <div class="sessionbar"><div style="min-width:0;flex:1"><input class="title-input" id="sessName" value="${esc(A.name)}" aria-label="Nombre del entreno"><p class="sub" style="margin:0">${dLong(A.start)}</p></div><div class="clock" id="clock">00:00</div></div>
    <div class="rest" id="rest" hidden><span class="num" style="font-size:1.5rem;min-width:52px" id="restT">0:00</span><div class="bar"><i id="restBar"></i></div><button data-act="rest-add">+15 s</button><button data-act="rest-skip">Saltar</button></div>
    ${A.exercises.map((it, i) => exCard(it, i)).join('') || '<p class="empty">Añade el primer ejercicio.</p>'}
    <button class="btn ghost" data-act="add-ex">+ Añadir ejercicio</button>
    <div class="row2"><button class="btn danger" data-act="discard">Descartar</button><button class="btn primary" data-act="finish">Terminar y guardar</button></div>`;
  tick();
}
function exCard(it, i) {
  const e = ex(it.ex), F = FIELDS[e.m], last = lastFor(it.ex, S.active.id);
  const prev = last ? last.sets : null;
  return `<div class="ex"><div class="ex-h"><h3>${plate(e.g)}<span>${esc(e.n)}</span></h3><button class="icon" data-act="ex-menu" data-i="${i}" aria-label="Opciones de ${esc(e.n)}">⋯</button></div>
    <div class="meta">${prev ? `Última vez (${dShort(last.session.start)}): ${prev.map(s => setText(e.m, s)).join(', ')}` : 'Primera vez con este ejercicio'} · descanso ${restFmt(it.rest || S.settings.rest)}</div>
    <table class="sets"><thead><tr><th>Serie</th>${F.map(f => `<th>${f[1]}</th>`).join('')}<th>Hecha</th></tr></thead><tbody>
    ${it.sets.map((s, j) => `<tr class="${s.done ? 'done' : ''}"><td>${j + 1}</td>${F.map(([f, lab]) => `<td><input inputmode="decimal" enterkeyhint="next" data-i="${i}" data-j="${j}" data-f="${f}" value="${esc(showNum(s[f]))}" placeholder="${esc(prev && prev[j] ? showNum(prev[j][f]) : '')}" aria-label="${lab} serie ${j + 1}"></td>`).join('')}
      <td><button class="chk" data-act="chk" data-i="${i}" data-j="${j}" aria-label="Marcar serie ${j + 1} como hecha" aria-pressed="${!!s.done}">✓</button></td></tr>`).join('')}
    </tbody></table>
    <div class="ex-f"><button class="link" data-act="del-set" data-i="${i}">− Quitar serie</button><button class="link" data-act="add-set" data-i="${i}">+ Añadir serie</button></div></div>`;
}
const elE = $('#s-entreno');
elE.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'sessName') { S.active.name = t.value; saveSoon(); return; }
  if (t.dataset.f) { const s = S.active.exercises[+t.dataset.i].sets[+t.dataset.j]; s[t.dataset.f] = t.value.trim() === '' ? '' : num(t.value); saveSoon(); }
});
elE.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, i = +b.dataset.i, A = S.active;
  if (a === 'free') return startSession(null);
  if (a === 'go-hoy') return show('hoy');
  if (a === 'add-ex') return openPicker(id => addExerciseToActive(id));
  if (a === 'chk') {
    unlockAudio();
    const it = A.exercises[i], s = it.sets[+b.dataset.j], tr = b.closest('tr');
    s.done = !s.done;
    if (s.done) { // casilla vacía: usar lo de la serie anterior de hoy o, si no, lo que aparece en gris (la última vez)
      const before = it.sets[+b.dataset.j - 1];
      for (const inp of tr.querySelectorAll('input')) {
        if (inp.value !== '') continue;
        const v = before && before[inp.dataset.f] !== '' && before[inp.dataset.f] != null ? before[inp.dataset.f] : (inp.placeholder ? num(inp.placeholder) : '');
        if (v !== '') { inp.value = showNum(v); s[inp.dataset.f] = v; }
      }
      startRest(it.rest || S.settings.rest);
    }
    tr.classList.toggle('done', s.done); b.setAttribute('aria-pressed', s.done); save(); return;
  }
  if (a === 'add-set') { const st = A.exercises[i].sets; const l = st[st.length - 1] || {}; const n = { done: false }; for (const [f] of FIELDS[ex(A.exercises[i].ex).m]) n[f] = l[f] ?? ''; st.push(n); save(); renderEntreno(); return; }
  if (a === 'del-set') { const st = A.exercises[i].sets; if (st.length > 1) { st.pop(); save(); renderEntreno(); } return; }
  if (a === 'ex-menu') return exMenu(i);
  if (a === 'rest-add') { A.restEnd += 15000; A.restTotal += 15; save(); tick(); return; }
  if (a === 'rest-skip') { A.restEnd = 0; save(); tick(); return; }
  if (a === 'discard') { if (await ask('¿Descartar este entreno? Se perderán las series apuntadas.', 'Descartar', 'Volver', true)) { S.active = null; save(); show('hoy'); } return; }
  if (a === 'finish') return finishSession();
});
function exMenu(i) {
  const A = S.active, it = A.exercises[i], e = ex(it.ex);
  const opts = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
  openSheet(`<h3>${esc(e.n)}</h3><p class="sub">${esc(e.g)} · ${esc(e.e)}</p>
    <label class="field">Descanso entre series<select id="restSel">${opts.map(o => `<option value="${o}" ${o === (it.rest || S.settings.rest) ? 'selected' : ''}>${restFmt(o)}</option>`).join('')}</select></label>
    <div class="stack"><div class="row2" style="margin:0"><button class="btn ghost" data-m="up" ${i === 0 ? 'disabled' : ''}>↑ Subir</button><button class="btn ghost" data-m="down" ${i === A.exercises.length - 1 ? 'disabled' : ''}>↓ Bajar</button></div>
    <button class="btn ghost" data-m="swap">Cambiar por otro ejercicio</button>
    <button class="btn ghost" data-m="prog">Ver su progreso</button>
    <button class="btn danger" data-m="del">Quitar del entreno</button></div>`, body => {
    body.querySelector('#restSel').onchange = ev => { it.rest = +ev.target.value; save(); };
    body.onclick = ev => {
      const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return;
      if (m === 'up' || m === 'down') { const j = m === 'up' ? i - 1 : i + 1; [A.exercises[i], A.exercises[j]] = [A.exercises[j], A.exercises[i]]; }
      if (m === 'del') A.exercises.splice(i, 1);
      if (m === 'swap') return openPicker(id => { const last = lastFor(id); A.exercises[i] = { ex: id, rest: it.rest, sets: setsFromHistory(id, it.sets.length || (last ? last.sets.length : 3)) }; save(); closeSheet(); renderEntreno(); });
      if (m === 'prog') { closeSheet(); progEx = it.ex; progTab = 'graficas'; show('progreso'); return; }
      save(); closeSheet(); renderEntreno();
    };
  });
}

/* ---------- temporizadores ---------- */
let audioCtx = null;
function unlockAudio() { try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { audioCtx = null; } }
function beep() {
  try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) { /* sin vibración */ }
  if (!audioCtx) return;
  [0, 0.25, 0.5].forEach(t => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.25, audioCtx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.2); o.connect(g).connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2); });
}
function startRest(s) { S.active.restEnd = Date.now() + s * 1000; S.active.restTotal = s; tick(); }
function tick() {
  const A = S.active; if (!A || current !== 'entreno') return;
  const c = $('#clock'); if (c) { const t = Math.floor((Date.now() - A.start) / 1000); c.textContent = t >= 3600 ? `${Math.floor(t / 3600)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}` : `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; }
  const r = $('#rest'); if (!r) return;
  if (A.restEnd) {
    const left = Math.ceil((A.restEnd - Date.now()) / 1000);
    if (left <= 0) { A.restEnd = 0; save(); r.hidden = true; beep(); toast('Descanso terminado. ¡A por la siguiente serie!'); return; }
    r.hidden = false; $('#restT').textContent = restFmt(left); $('#restBar').style.width = Math.min(100, left / A.restTotal * 100) + '%';
  } else r.hidden = true;
}
setInterval(() => {
  tick();
  if (S.active && S.active.restEnd && current !== 'entreno' && Date.now() >= S.active.restEnd) { S.active.restEnd = 0; save(); beep(); toast('Descanso terminado.'); }
}, 1000);

/* ---------- terminar entreno ---------- */
async function finishSession() {
  const A = S.active;
  const exs = A.exercises.map(it => ({ ex: it.ex, sets: it.sets.filter(s => s.done).map(({ done, ...r }) => r) })).filter(it => it.sets.length);
  if (!exs.length) {
    if (await ask('No has marcado ninguna serie como hecha (botón ✓). ¿Descartar este entreno?', 'Descartar', 'Seguir', true)) { S.active = null; save(); show('hoy'); }
    return;
  }
  const sess = { id: A.id, start: A.start, end: Date.now(), name: A.name.trim() || 'Entreno', routineId: A.routineId, exercises: exs };
  const prs = exs.filter(it => { const m = ex(it.ex).m, h = historyFor(it.ex); return h.length && metric(m, it.sets) > Math.max(...h.map(x => metric(m, x.sets))); });
  S.sessions.push(sess); S.sessions.sort((a, b) => a.start - b.start);
  S.active = null; save(); show('hoy');
  openSheet(`<h3>¡Entreno guardado!</h3><p class="sub">${esc(sess.name)} · ${dLong(sess.start)}</p>
    <div class="stats"><div class="stat"><div class="v">${dur(sess.end - sess.start)}</div><div class="l">duración</div></div>
    <div class="stat"><div class="v">${sessSets(sess)}</div><div class="l">series</div></div>
    <div class="stat"><div class="v">${f1(sessVol(sess))}<small> kg</small></div><div class="l">kilos movidos</div></div></div>
    ${prs.length ? `<div class="label">Récords nuevos</div>${prs.map(it => `<div class="kv"><span>${plate(ex(it.ex).g)}&nbsp; ${esc(ex(it.ex).n)}</span><span class="badge">Récord</span></div>`).join('')}` : ''}
    <button class="btn primary" style="margin-top:14px" data-close>Hecho</button>`, b => b.querySelector('[data-close]').onclick = closeSheet);
  if (S.settings.driveAuto && S.settings.driveClientId) driveBackup().then(() => toast('Copia guardada en Google Drive')).catch(err => toast('No se pudo copiar en Drive: ' + err.message));
}

/* =========================================================
   BIBLIOTECA DE EJERCICIOS
   ========================================================= */
function mountLibrary(root, onPick, compact) {
  const st = { q: '', l: '', g: '', e: '' };
  const mats = [...new Set([...EX.values()].map(e => e.e))].sort((a, b) => a.localeCompare(b, 'es'));
  root.innerHTML = `<input class="search" type="search" placeholder="Buscar: press, dominadas, glúteo…" aria-label="Buscar ejercicio" data-k="q">
    <div class="chips">${[['', 'Todos'], ['G', 'Gimnasio'], ['C', 'Calle'], ['H', 'Casa']].map(([k, n]) => `<button class="chip" data-l="${k}" aria-pressed="${k === ''}">${n}</button>`).join('')}</div>
    <div class="selects"><select data-k="g" aria-label="Grupo muscular"><option value="">Todos los músculos</option>${GROUPS.map(g => `<option>${g}</option>`).join('')}</select>
    <select data-k="e" aria-label="Material"><option value="">Todo el material</option>${mats.map(m => `<option>${esc(m)}</option>`).join('')}</select></div>
    <div class="count"></div><div class="list"></div>`;
  const list = root.querySelector('.list'), count = root.querySelector('.count');
  function draw() {
    const words = norm(st.q).split(/\s+/).filter(Boolean);
    const res = [...EX.values()].filter(e => (!st.l || e.l.includes(st.l)) && (!st.g || e.g === st.g) && (!st.e || e.e === st.e) &&
      words.every(w => norm(e.n + ' ' + e.g + ' ' + e.e).includes(w)))
      .sort((a, b) => GROUPS.indexOf(a.g) - GROUPS.indexOf(b.g) || a.n.localeCompare(b.n, 'es'));
    count.textContent = `${res.length} ejercicio${res.length === 1 ? '' : 's'}`;
    let html = '', g = null;
    for (const e of res) {
      if (e.g !== g) { g = e.g; html += `<div class="ghead">${plate(g)}${esc(g)}</div>`; }
      html += `<button class="item" data-id="${e.id}"><div style="min-width:0"><div class="n">${esc(e.n)}${e.custom ? ' <span class="badge soft">Mío</span>' : ''}</div><div class="d">${esc(e.e)} · ${MODES[e.m].split(' (')[0]}</div></div>
        <div class="places">${[...e.l].map(c => `<span title="${LUG[c]}">${LUG[c]}</span>`).join('')}</div></button>`;
    }
    list.innerHTML = html || '<p class="empty">Ningún ejercicio coincide. Puedes crearlo tú.</p>';
  }
  root.addEventListener('input', ev => { const k = ev.target.dataset.k; if (k) { st[k] = ev.target.value; draw(); } });
  root.addEventListener('click', ev => {
    const c = ev.target.closest('.chip'); if (c) { st.l = c.dataset.l; root.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === c)); draw(); return; }
    const it = ev.target.closest('.item'); if (it) onPick(it.dataset.id);
  });
  draw();
  if (!compact) return;
}
function renderLib() {
  const el = $('#s-ejercicios');
  el.innerHTML = `<h2>Ejercicios</h2><p class="sub">${EX.size} ejercicios para gimnasio, calle y casa</p>
    <button class="btn ghost" data-act="new-ex" style="margin-bottom:12px">+ Crear mi propio ejercicio</button><div id="libRoot"></div>`;
  el.querySelector('[data-act="new-ex"]').onclick = () => editCustom(null);
  mountLibrary($('#libRoot'), exDetail);
}
function openPicker(onPick) {
  openSheet(`<h3>Añadir ejercicio</h3><div id="pickRoot"></div>`, b => mountLibrary(b.querySelector('#pickRoot'), id => { closeSheet(); onPick(id); }));
}
function exDetail(id) {
  const e = ex(id), h = historyFor(id), info = metricInfo(e.m, h.flatMap(x => x.sets));
  const best = h.length ? Math.max(...h.map(x => metric(e.m, x.sets))) : 0;
  openSheet(`<h3>${esc(e.n)}</h3><p class="sub">${plate(e.g)}&nbsp; ${esc(e.g)} · ${esc(e.e)}</p>
    <div class="kv"><span>Dónde</span><b>${[...e.l].map(c => LUG[c]).join(', ')}</b></div>
    <div class="kv"><span>Se apunta como</span><b>${MODES[e.m]}</b></div>
    <div class="kv"><span>Veces hecho</span><b>${h.length}</b></div>
    ${h.length ? `<div class="kv"><span>${info.label} (mejor)</span><b>${f1(best)} ${info.unit}</b></div><div class="kv"><span>Última vez</span><b>${dShort(h[h.length - 1].s.start)} · ${h[h.length - 1].sets.map(s => setText(e.m, s)).join(', ')}</b></div>` : ''}
    <div class="stack" style="margin-top:12px"><button class="btn primary" data-a="add">${S.active ? 'Añadir al entreno en curso' : 'Empezar entreno con este ejercicio'}</button>
    ${h.length ? '<button class="btn ghost" data-a="prog">Ver progreso</button>' : ''}
    ${e.custom ? '<div class="row2" style="margin:0"><button class="btn ghost" data-a="edit">Editar</button><button class="btn danger" data-a="del">Borrar</button></div>' : ''}</div>`, b => {
    b.onclick = async ev => {
      const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'add') { closeSheet(); addExerciseToActive(id); }
      if (a === 'prog') { closeSheet(); progEx = id; progTab = 'graficas'; show('progreso'); }
      if (a === 'edit') editCustom(id);
      if (a === 'del') {
        if (!await ask(`¿Borrar "${e.n}"? Los entrenos ya guardados lo mostrarán como "Ejercicio eliminado".`, 'Borrar', 'Cancelar', true)) return;
        S.custom = S.custom.filter(x => x.id !== id); rebuildEx(); save(); closeSheet(); renderLib();
      }
    };
  });
}
function editCustom(id) {
  const c = id ? { ...S.custom.find(x => x.id === id) } : { id: 'mio-' + uid(), n: '', g: 'Pecho', e: 'Peso corporal', m: 'kg', l: 'G' };
  const mats = window.MATERIALES;
  openSheet(`<h3>${id ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h3>
    <label class="field">Nombre<input id="cN" value="${esc(c.n)}" placeholder="Ej.: Remo en máquina Hammer"></label>
    <div class="selects"><label class="field">Músculo<select id="cG">${GROUPS.map(g => `<option ${g === c.g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
    <label class="field">Material<select id="cE">${mats.map(m => `<option ${m === c.e ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label></div>
    <label class="field">Se apunta como<select id="cM">${Object.entries(MODES).map(([k, v]) => `<option value="${k}" ${k === c.m ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <div class="field">Dónde se puede hacer<div class="chips" style="margin:4px 0">${Object.entries(LUG).map(([k, v]) => `<button class="chip" data-l="${k}" aria-pressed="${c.l.includes(k)}">${v}</button>`).join('')}</div></div>
    <button class="btn primary" id="cSave">Guardar ejercicio</button>`, b => {
    b.querySelectorAll('.chip').forEach(ch => ch.onclick = () => ch.setAttribute('aria-pressed', ch.getAttribute('aria-pressed') !== 'true'));
    b.querySelector('#cSave').onclick = () => {
      c.n = b.querySelector('#cN').value.trim(); if (!c.n) { toast('Escribe un nombre para el ejercicio.'); return; }
      c.g = b.querySelector('#cG').value; c.e = b.querySelector('#cE').value; c.m = b.querySelector('#cM').value;
      c.l = [...b.querySelectorAll('.chip[aria-pressed="true"]')].map(x => x.dataset.l).join('') || 'G';
      const i = S.custom.findIndex(x => x.id === c.id); if (i >= 0) S.custom[i] = c; else S.custom.push(c);
      rebuildEx(); save(); closeSheet(); toast('Ejercicio guardado'); if (current === 'ejercicios') renderLib();
    };
  });
}

/* =========================================================
   RUTINAS
   ========================================================= */
function editRoutine(id) {
  const orig = S.routines.find(x => x.id === id);
  const r = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid(), name: '', items: [] };
  const draw = () => openSheet(`<h3>${orig ? 'Editar rutina' : 'Nueva rutina'}</h3>
    <label class="field">Nombre<input id="rName" value="${esc(r.name)}" placeholder="Ej.: Torso A, Pierna, Parque…"></label>
    <div id="rItems">${r.items.map((it, k) => { const e = ex(it.ex); return `<div class="ritem"><div class="rn">${plate(e.g)}${esc(e.n)}</div>
      <div class="rfields"><label>Series<input data-k="${k}" data-f="sets" inputmode="numeric" value="${it.sets}"></label>
      <label>${e.m === 'tiempo' ? 'Segundos' : e.m === 'cardio' ? 'Minutos' : 'Reps'}<input data-k="${k}" data-f="reps" value="${esc(it.reps)}"></label>
      <label>Desc. (s)<input data-k="${k}" data-f="rest" inputmode="numeric" value="${it.rest}"></label>
      <div class="rbtns"><button data-m="up" data-k="${k}" aria-label="Subir">↑</button><button data-m="down" data-k="${k}" aria-label="Bajar">↓</button><button data-m="del" data-k="${k}" aria-label="Quitar">✕</button></div></div></div>`; }).join('') || '<p class="empty">Añade los ejercicios de esta rutina.</p>'}</div>
    <button class="btn ghost" data-m="add" style="margin-top:4px">+ Añadir ejercicio</button>
    <div class="row2">${orig ? '<button class="btn danger" data-m="remove">Borrar rutina</button>' : '<button class="btn ghost" data-m="cancel">Cancelar</button>'}<button class="btn primary" data-m="save">Guardar</button></div>`, b => {
    b.addEventListener('input', ev => {
      const t = ev.target;
      if (t.id === 'rName') r.name = t.value;
      else if (t.dataset.f) { const it = r.items[+t.dataset.k]; it[t.dataset.f] = t.dataset.f === 'reps' ? t.value : Math.max(0, parseInt(t.value, 10) || 0); }
    });
    b.addEventListener('click', async ev => {
      const btn = ev.target.closest('[data-m]'); if (!btn) return;
      const m = btn.dataset.m, k = +btn.dataset.k;
      if (m === 'add') return openPicker(exId => { const e = ex(exId); r.items.push({ ex: exId, sets: 3, reps: e.m === 'tiempo' ? '30' : e.m === 'cardio' ? '20' : '10', rest: S.settings.rest }); draw(); });
      if (m === 'up' && k > 0) [r.items[k - 1], r.items[k]] = [r.items[k], r.items[k - 1]];
      if (m === 'down' && k < r.items.length - 1) [r.items[k + 1], r.items[k]] = [r.items[k], r.items[k + 1]];
      if (m === 'del') r.items.splice(k, 1);
      if (m === 'cancel') return closeSheet();
      if (m === 'remove') { if (await ask(`¿Borrar la rutina "${r.name}"? Tus entrenos guardados no se borran.`, 'Borrar', 'Cancelar', true)) { S.routines = S.routines.filter(x => x.id !== r.id); save(); closeSheet(); renderHoy(); } return; }
      if (m === 'save') {
        r.name = r.name.trim(); if (!r.name) { toast('Ponle un nombre a la rutina.'); return; }
        r.items.forEach(it => { it.sets = Math.max(1, it.sets | 0); it.rest = it.rest || S.settings.rest; });
        const i = S.routines.findIndex(x => x.id === r.id); if (i >= 0) S.routines[i] = r; else S.routines.push(r);
        save(); closeSheet(); toast('Rutina guardada'); if (current === 'hoy') renderHoy(); return;
      }
      draw();
    });
  });
  draw();
}

/* =========================================================
   PROGRESO
   ========================================================= */
let progTab = 'historial', progEx = null;
function renderProg() {
  const el = $('#s-progreso');
  const seg = `<div class="seg">${[['historial', 'Historial'], ['graficas', 'Ejercicios'], ['peso', 'Peso corporal']].map(([k, n]) => `<button data-t="${k}" aria-pressed="${progTab === k}">${n}</button>`).join('')}</div>`;
  let body = '';
  if (progTab === 'historial') {
    const list = [...S.sessions].reverse(); let mon = '';
    body = list.map(s => {
      const d = new Date(s.start), mk = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
      const head = mk !== mon ? `<div class="label">${mk}</div>` : ''; mon = mk;
      return head + `<button class="hist" data-sid="${s.id}"><div class="date"><b>${d.getDate()}</b><small>${DIAS3[d.getDay()]}</small></div>
        <div><div class="n">${esc(s.name)}</div><div class="d">${dur(s.end - s.start)} · ${sessSets(s)} series · ${f1(sessVol(s))} kg</div></div><span class="muted">›</span></button>`;
    }).join('') || '<p class="empty">Aquí aparecerán tus entrenos cuando termines el primero.</p>';
  } else if (progTab === 'graficas') {
    const used = [...new Set(S.sessions.flatMap(s => s.exercises.map(x => x.ex)))];
    used.sort((a, b) => historyFor(b).length - historyFor(a).length);
    if (!used.length) body = '<p class="empty">Termina algún entreno para ver tu progreso por ejercicio.</p>';
    else {
      if (!progEx || !used.includes(progEx)) progEx = used[0];
      const e = ex(progEx), h = historyFor(progEx), info = metricInfo(e.m, h.flatMap(x => x.sets));
      const pts = h.map(x => ({ t: x.s.start, v: metric(e.m, x.sets) }));
      const lastV = pts[pts.length - 1].v, df = lastV - pts[0].v, best = Math.max(...pts.map(p => p.v));
      body = `<select id="progSel" aria-label="Ejercicio">${used.map(id => `<option value="${id}" ${id === progEx ? 'selected' : ''}>${esc(ex(id).n)} (${historyFor(id).length})</option>`).join('')}</select>
        <div class="chart"><div class="muted" style="font-size:12px;padding-left:4px">${info.label}${e.m === 'kg' ? ' · fórmula de Epley' : ''}</div>
        <div class="big num">${f1(lastV)} <small>${info.unit}</small></div>
        ${pts.length > 1 ? `<div class="delta" style="color:${df >= 0 ? 'var(--ok)' : 'var(--danger)'}">${df >= 0 ? '+' : ''}${f1(df)} ${info.unit} desde ${dShort(pts[0].t)}</div>` : ''}
        ${lineChart(pts)}</div>
        <div class="label">Mejor marca</div><div class="kv"><span>${info.label}</span><b>${f1(best)} ${info.unit}</b></div>
        <div class="label">Últimas sesiones</div>
        ${h.slice(-10).reverse().map(x => `<div class="kv"><span>${dShort(x.s.start)}</span><b style="font-weight:500;text-align:right">${x.sets.map(s => setText(e.m, s)).join(', ')}</b></div>`).join('')}`;
    }
  } else {
    const bw = [...S.bodyweight].sort((a, b) => a.t - b.t);
    const lastW = bw[bw.length - 1];
    body = `<div class="card"><label class="field" style="margin:0">Peso de hoy (kg)<div class="inline"><input id="bwIn" inputmode="decimal" placeholder="${lastW ? showNum(lastW.kg) : 'Ej.: 78,4'}"><button class="btn primary small" id="bwSave">Guardar</button></div></label></div>
      ${bw.length ? `<div class="chart"><div class="big num">${f1(lastW.kg)} <small>kg</small></div>${bw.length > 1 ? `<div class="delta" style="color:var(--muted)">${lastW.kg - bw[0].kg >= 0 ? '+' : ''}${f1(lastW.kg - bw[0].kg)} kg desde ${dShort(bw[0].t)}</div>` : ''}${lineChart(bw.map(x => ({ t: x.t, v: x.kg })))}</div>
      <div class="label">Registros</div>${bw.slice().reverse().slice(0, 30).map(x => `<div class="kv"><span>${dShort(x.t)}/${new Date(x.t).getFullYear()}</span><span><b>${f1(x.kg)} kg</b> <button class="icon" data-bw="${x.t}" aria-label="Borrar registro">✕</button></span></div>`).join('')}`
      : '<p class="empty">Apunta tu peso de vez en cuando para ver cómo evoluciona.</p>'}`;
  }
  el.innerHTML = `<h2>Progreso</h2><p class="sub">${S.sessions.length} entrenos guardados</p>${seg}${body}`;
}
$('#s-progreso').addEventListener('click', async e => {
  const t = e.target.closest('[data-t]'); if (t) { progTab = t.dataset.t; renderProg(); return; }
  const h = e.target.closest('[data-sid]'); if (h) return sessionDetail(h.dataset.sid);
  if (e.target.id === 'bwSave') {
    const v = num($('#bwIn').value); if (v < 20 || v > 400) { toast('Escribe un peso entre 20 y 400 kg.'); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    S.bodyweight = S.bodyweight.filter(x => x.t < +today || x.t >= +today + 864e5); S.bodyweight.push({ t: Date.now(), kg: v }); save(); renderProg(); return;
  }
  const bw = e.target.closest('[data-bw]'); if (bw) { S.bodyweight = S.bodyweight.filter(x => x.t !== +bw.dataset.bw); save(); renderProg(); }
});
$('#s-progreso').addEventListener('change', e => { if (e.target.id === 'progSel') { progEx = e.target.value; renderProg(); } });
function sessionDetail(sid) {
  const s = S.sessions.find(x => x.id === sid); if (!s) return;
  openSheet(`<h3>${esc(s.name)}</h3><p class="sub">${dLong(s.start)} · ${new Date(s.start).getHours()}:${pad(new Date(s.start).getMinutes())}</p>
    <div class="stats"><div class="stat"><div class="v">${dur(s.end - s.start)}</div><div class="l">duración</div></div><div class="stat"><div class="v">${sessSets(s)}</div><div class="l">series</div></div><div class="stat"><div class="v">${f1(sessVol(s))}<small> kg</small></div><div class="l">kilos movidos</div></div></div>
    ${s.exercises.map(it => { const e = ex(it.ex); return `<div class="label">${plate(e.g)} ${esc(e.n)}</div><div class="kv"><span>${it.sets.map((x, j) => `${j + 1}) ${setText(e.m, x)}`).join('<br>')}</span></div>`; }).join('')}
    <div class="row2"><button class="btn danger" data-a="del">Borrar entreno</button><button class="btn ghost" data-a="repeat">Repetir entreno</button></div>`, b => {
    b.onclick = async ev => {
      const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'del' && await ask('¿Borrar este entreno? No se puede deshacer (salvo que tengas una copia).', 'Borrar', 'Cancelar', true)) { S.sessions = S.sessions.filter(x => x.id !== sid); save(); closeSheet(); renderProg(); }
      if (a === 'repeat') {
        if (S.active) { toast('Ya tienes un entreno en marcha.'); return; }
        S.active = { id: uid(), start: Date.now(), name: s.name, routineId: s.routineId, restEnd: 0, restTotal: 0, exercises: s.exercises.map(it => ({ ex: it.ex, rest: S.settings.rest, sets: it.sets.map(x => ({ ...x, done: false })) })) };
        save(); closeSheet(); show('entreno');
      }
    };
  });
}

/* =========================================================
   AJUSTES · COPIAS DE SEGURIDAD
   ========================================================= */
let persisted = null;
function renderAjustes() {
  const st = S.settings, size = new Blob([JSON.stringify(S)]).size;
  const driveReady = !!st.driveClientId.trim();
  $('#s-ajustes').innerHTML = `<h2>Ajustes</h2><p class="sub">Tus datos se guardan en este móvil.</p>
    <div class="set-card"><h3>Entreno</h3><label class="field">Descanso por defecto entre series<select id="restDef">${[30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map(o => `<option value="${o}" ${o === st.rest ? 'selected' : ''}>${restFmt(o)}</option>`).join('')}</select></label></div>

    <div class="set-card"><h3>Copia en un archivo</h3>
      <p>Guarda un archivo con todos tus datos. En Android puedes mandarlo directamente a Google Drive, WhatsApp o el correo.${st.lastExport ? ` Última copia: ${dShort(st.lastExport)}.` : ''}</p>
      <div class="row2" style="margin:0"><button class="btn ghost" id="expBtn">Exportar copia</button><button class="btn ghost" id="impBtn">Importar copia</button></div></div>

    <div class="set-card"><h3>Google Drive (opcional)</h3>
      <div class="status ${st.lastDrive ? 'on' : ''}"><i></i>${st.lastDrive ? `Última copia en Drive: ${dShort(st.lastDrive)} a las ${new Date(st.lastDrive).getHours()}:${pad(new Date(st.lastDrive).getMinutes())}` : driveReady ? 'Configurado. Aún no has hecho ninguna copia.' : 'Sin configurar'}</div>
      <p>La app guarda un único archivo, <code>cuaderno-gym-copia.json</code>, en tu Drive y solo puede ver ese archivo.</p>
      <div class="row2" style="margin:0 0 10px"><button class="btn primary" id="drvSave" ${driveReady ? '' : 'disabled'}>Guardar en Drive</button><button class="btn ghost" id="drvLoad" ${driveReady ? '' : 'disabled'}>Restaurar de Drive</button></div>
      <label class="switch">Copiar en Drive al terminar cada entreno<input type="checkbox" id="drvAuto" ${st.driveAuto ? 'checked' : ''} ${driveReady ? '' : 'disabled'}></label>
      <details ${driveReady ? '' : 'open'}><summary>Configurar conexión con Google</summary>
        <ol><li>Entra en <b>console.cloud.google.com</b> con tu cuenta de Google y crea un proyecto.</li>
        <li>En «APIs y servicios», activa <b>Google Drive API</b>.</li>
        <li>En «Pantalla de consentimiento OAuth» elige <b>Externo</b> y añade tu correo como usuario de prueba.</li>
        <li>En «Credenciales» crea un <b>ID de cliente OAuth</b> de tipo «Aplicación web» y añade como origen autorizado: <code>${esc(location.origin)}</code></li>
        <li>Copia el ID de cliente y pégalo aquí:</li></ol>
        <label class="field">ID de cliente de Google<input id="drvId" value="${esc(st.driveClientId)}" placeholder="123456-abc.apps.googleusercontent.com" autocomplete="off"></label>
        <button class="btn ghost" id="drvIdSave">Guardar ID</button></details></div>

    <div class="set-card"><h3>Datos en este móvil</h3>
      <div class="kv" style="background:var(--surface2)"><span>Entrenos</span><b>${S.sessions.length}</b></div>
      <div class="kv" style="background:var(--surface2)"><span>Rutinas · ejercicios propios</span><b>${S.routines.length} · ${S.custom.length}</b></div>
      <div class="kv" style="background:var(--surface2)"><span>Espacio usado</span><b>${f1(size / 1024)} KB</b></div>
      <div class="kv" style="background:var(--surface2)"><span>Protegido contra borrado automático</span><b>${persisted === null ? '—' : persisted ? 'Sí' : 'No'}</b></div>
      <button class="btn danger" id="wipe" style="margin-top:6px">Borrar todos los datos</button></div>
    <p class="sub" style="text-align:center">Cuaderno de Gimnasio · versión ${VERSION}</p>`;
}
$('#s-ajustes').addEventListener('change', e => {
  if (e.target.id === 'restDef') { S.settings.rest = +e.target.value; save(); toast('Descanso guardado'); }
  if (e.target.id === 'drvAuto') { S.settings.driveAuto = e.target.checked; save(); }
});
$('#s-ajustes').addEventListener('click', async e => {
  const id = e.target.id;
  if (id === 'expBtn') return exportFile();
  if (id === 'impBtn') return $('#fileIn').click();
  if (id === 'drvIdSave') { S.settings.driveClientId = $('#drvId').value.trim(); S.settings.driveFileId = null; gTok = null; save(); renderAjustes(); toast(S.settings.driveClientId ? 'ID guardado. Ya puedes copiar en Drive.' : 'Conexión con Drive quitada'); if (S.settings.driveClientId) loadGsi().catch(() => {}); return; }
  if (id === 'drvSave') { e.target.disabled = true; e.target.textContent = 'Guardando…'; try { await driveBackup(); toast('Copia guardada en Google Drive'); } catch (err) { toast('Drive: ' + err.message); } renderAjustes(); return; }
  if (id === 'drvLoad') { try { const data = await driveRestoreData(); await importData(data, 'Google Drive'); } catch (err) { toast('Drive: ' + err.message); } return; }
  if (id === 'wipe') {
    if (!await ask('¿Borrar TODOS tus datos de este móvil? Entrenos, rutinas y pesos. Exporta una copia antes si la quieres.', 'Borrar todo', 'Cancelar', true)) return;
    const keep = { driveClientId: S.settings.driveClientId };
    S = defaults(); S.settings.driveClientId = keep.driveClientId; S.routines = sampleRoutines(); rebuildEx(); save(); show('hoy'); toast('Datos borrados');
  }
});

async function exportFile() {
  const name = `cuaderno-gym-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(S)], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Copia de Cuaderno de Gimnasio' });
      S.settings.lastExport = Date.now(); save(); renderAjustes(); return;
    }
  } catch (err) { if (err.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  S.settings.lastExport = Date.now(); save(); renderAjustes(); toast('Copia descargada: ' + name);
}
$('#fileIn').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { await importData(JSON.parse(await f.text()), 'el archivo'); } catch (err) { toast('No se pudo leer la copia: ' + err.message); }
});
async function importData(d, origen) {
  if (!d || !Array.isArray(d.sessions) || !Array.isArray(d.routines)) throw new Error('el archivo no es una copia de esta app');
  const when = d.updatedAt ? ` del ${dShort(d.updatedAt)}/${new Date(d.updatedAt).getFullYear()}` : '';
  if (!await ask(`La copia de ${origen}${when} tiene ${d.sessions.length} entrenos y ${d.routines.length} rutinas. ¿Sustituir los datos de este móvil por ella?`, 'Sustituir', 'Cancelar', true)) return;
  const keep = { driveClientId: S.settings.driveClientId, driveAuto: S.settings.driveAuto, driveFileId: S.settings.driveFileId, lastDrive: S.settings.lastDrive };
  S = Object.assign(defaults(), d); S.settings = Object.assign(defaults().settings, d.settings || {}, keep);
  rebuildEx(); save(); show('hoy'); toast('Copia restaurada');
}

/* ---------- Google Drive (Google Identity Services + Drive API v3, permiso drive.file) ---------- */
const DRIVE_NAME = 'cuaderno-gym-copia.json';
let gTok = null, gsiPromise = null;
function loadGsi() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => { gsiPromise = null; rej(new Error('no hay conexión con Google')); };
    document.head.appendChild(s);
  });
  return gsiPromise;
}
async function driveToken() {
  if (gTok && gTok.exp > Date.now()) return gTok.t;
  await loadGsi();
  return new Promise((res, rej) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: S.settings.driveClientId.trim(),
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: r => { if (r.error) return rej(new Error(r.error_description || r.error)); gTok = { t: r.access_token, exp: Date.now() + (Number(r.expires_in) - 120) * 1000 }; res(gTok.t); },
      error_callback: er => rej(new Error(er.type === 'popup_closed' ? 'cerraste la ventana de Google' : er.type === 'popup_failed_to_open' ? 'el navegador bloqueó la ventana de Google' : (er.message || er.type || 'error de acceso')))
    });
    client.requestAccessToken();
  });
}
async function gfetch(url, opt = {}) {
  const t = await driveToken();
  const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + t } });
  if (r.status === 401) gTok = null;
  if (!r.ok) { const err = new Error(`Google respondió ${r.status}`); err.status = r.status; throw err; }
  return r;
}
async function driveFind() {
  if (S.settings.driveFileId) return S.settings.driveFileId;
  const q = encodeURIComponent(`name='${DRIVE_NAME}' and trashed=false`);
  const j = await (await gfetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime%20desc&spaces=drive`)).json();
  const id = j.files && j.files[0] ? j.files[0].id : null;
  if (id) { S.settings.driveFileId = id; save(); }
  return id;
}
async function driveBackup() {
  let id = await driveFind();
  const body = JSON.stringify(S);
  if (id) {
    try { await gfetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }); }
    catch (e) { if (e.status === 404) { S.settings.driveFileId = null; id = null; } else throw e; }
  }
  if (!id) {
    const bd = 'cgym' + uid();
    const meta = { name: DRIVE_NAME, mimeType: 'application/json', description: 'Copia de seguridad de Cuaderno de Gimnasio' };
    const mp = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${bd}--`;
    const r = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + bd }, body: mp });
    S.settings.driveFileId = (await r.json()).id;
  }
  S.settings.lastDrive = Date.now(); save();
}
async function driveRestoreData() {
  const id = await driveFind();
  if (!id) throw new Error('no hay ninguna copia en tu Drive todavía');
  try { return await (await gfetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json(); }
  catch (e) { if (e.status === 404) { S.settings.driveFileId = null; save(); throw new Error('la copia ya no está en tu Drive'); } throw e; }
}

/* =========================================================
   ARRANQUE
   ========================================================= */
load(); rebuildEx();
try { if (localStorage.getItem(KEY) === null) save(); } catch (e) { /* sin almacenamiento */ }
show(S.active ? 'entreno' : 'hoy');
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(p => { persisted = p; }).catch(() => {});
if (S.settings.driveClientId) loadGsi().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
