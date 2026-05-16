import { FIREBASE_CONFIG, DEMO_MODE, FUNCTIONS_REGION } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';

const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const configured = Boolean(
  FIREBASE_CONFIG?.apiKey &&
  FIREBASE_CONFIG?.projectId &&
  !String(FIREBASE_CONFIG.apiKey).includes('PEGA_AQUI') &&
  !String(FIREBASE_CONFIG.projectId).includes('TU_PROYECTO')
);
const firebaseApp = configured ? initializeApp(FIREBASE_CONFIG) : null;
const auth = configured ? getAuth(firebaseApp) : null;
const db = configured ? getFirestore(firebaseApp) : null;
const functions = configured ? getFunctions(firebaseApp, FUNCTIONS_REGION || 'us-central1') : null;
const createInternalUserFn = configured ? httpsCallable(functions, 'createInternalUser') : null;
const SUPER_ROLES = ['super_admin', 'gerente'];
const ROLES = {
  super_admin: 'Super admin', gerente: 'Gerente', mesero: 'Mesero', cajero: 'Cajero', cocina: 'Cocina / producción', domicilio: 'Domiciliario'
};
const PAGES = [
  ['dashboard','📊','Panel'], ['waiter','🍽️','Mesero'], ['cashier','💵','Caja'],
  ['production','👨‍🍳','Cocina'], ['delivery','🛵','Domicilios'], ['credit','🧾','Créditos'],
  ['manager','📈','Gerencia'], ['settings','⚙️','Admin'], ['users','👥','Usuarios']
];
const ACCESS = {
  super_admin: PAGES.map(p=>p[0]), gerente: PAGES.map(p=>p[0]).filter(p=>p!=='users'),
  mesero: ['waiter','dashboard'], cajero: ['cashier','credit','dashboard'],
  cocina: ['production'], domicilio: ['delivery']
};
const TABLES = {
  rooms:'rooms', tables:'restaurant_tables', products:'products', orders:'orders', orderItems:'order_items',
  deliveries:'deliveries', deliveryItems:'delivery_items', customers:'customers', creditMovements:'credit_movements',
  providers:'providers', expenses:'expenses', employees:'employees', employeePayments:'employee_payments',
  sales:'sales', cashSessions:'cash_sessions', notifications:'app_notifications', profiles:'profiles'
};

let audioUnlocked = false;
let installPrompt = null;
let reloadTimer = null;

const state = {
  session: null,
  user: { id:null, name:'Usuario', role:'', email:'' },
  page: 'dashboard', tab: 'products', selectedTable: 'm1', connected: false,
  settings: { brand:'Piqueteadero Luza', logo:'assets/logo.jpg', tax:'Recibo interno POS', receiptNote:'Gracias por su compra' },
  rooms: [], tables: [], products: [], orders: [], deliveries: [], customers: [], creditMovements: [],
  providers: [], expenses: [], employees: [], employeePayments: [], sales: [], cashSessions: [], notifications: [], profiles: []
};

function seed() {
  return {
    rooms: [{id:'r1', name:'Principal'}, {id:'r2', name:'Terraza'}],
    tables: [
      {id:'m1', name:'Mesa 1', room_id:'r1', room:'Principal', capacity:4, active:true},
      {id:'m2', name:'Mesa 2', room_id:'r1', room:'Principal', capacity:4, active:true},
      {id:'m3', name:'Mesa 3', room_id:'r1', room:'Principal', capacity:6, active:true},
      {id:'m4', name:'Mesa 4', room_id:'r2', room:'Terraza', capacity:4, active:true},
      {id:'m5', name:'Mesa 5', room_id:'r2', room:'Terraza', capacity:2, active:true},
      {id:'m6', name:'Mesa 6', room_id:'r2', room:'Terraza', capacity:4, active:true}
    ],
    products: [
      {id:'p1', name:'Picada especial', category:'Platos', area:'cocina', price:42000, cost:23000, stock:12, min_stock:3, active:true},
      {id:'p2', name:'Churrasco', category:'Platos', area:'cocina', price:36000, cost:19000, stock:10, min_stock:3, active:true},
      {id:'p3', name:'Bandeja paisa', category:'Platos', area:'cocina', price:32000, cost:17000, stock:8, min_stock:3, active:true},
      {id:'p4', name:'Salchipapa', category:'Platos', area:'cocina', price:18000, cost:9000, stock:16, min_stock:4, active:true},
      {id:'p5', name:'Limonada natural', category:'Bebidas', area:'cocina', price:8000, cost:2600, stock:25, min_stock:6, active:true},
      {id:'p6', name:'Gaseosa 400 ml', category:'Bebidas', area:'cocina', price:5000, cost:2600, stock:18, min_stock:6, active:true},
      {id:'p7', name:'Cerveza', category:'Bebidas', area:'cocina', price:7000, cost:3600, stock:24, min_stock:8, active:true},
      {id:'p8', name:'Agua', category:'Bebidas', area:'cocina', price:4000, cost:1800, stock:20, min_stock:6, active:true}
    ],
    orders: [], deliveries: [],
    customers: [
      {id:'c0', name:'Cliente contado', doc:'', phone:'', credit_limit:0, balance:0, active:true},
      {id:'c1', name:'Empresa El Mirador', doc:'900000001', phone:'3000000000', credit_limit:600000, balance:125000, active:true},
      {id:'c2', name:'Carlos Restrepo', doc:'1094000000', phone:'3110000000', credit_limit:200000, balance:60000, active:true}
    ],
    creditMovements: [
      {id:'cm1', customer_id:'c1', type:'cargo', amount:125000, created_at: Date.now()-86400000, detail:'Consumo corporativo'},
      {id:'cm2', customer_id:'c2', type:'cargo', amount:90000, created_at: Date.now()-172800000, detail:'Consumo mesa'},
      {id:'cm3', customer_id:'c2', type:'abono', amount:30000, created_at: Date.now()-3600000, detail:'Abono efectivo'}
    ],
    providers: [{id:'v1', name:'Carnes del Valle', phone:'3001112233', active:true}, {id:'v2', name:'Bebidas La 14', phone:'3002223344', active:true}],
    expenses: [{id:'e1', created_at:Date.now()-86400000, type:'proveedor', provider_id:'v1', detail:'Compra carnes fin de semana', amount:350000, method:'transferencia'}],
    employees: [{id:'emp1', name:'Juan Cocina', role:'cocina', base_pay:65000, active:true}, {id:'emp2', name:'Diana Mesera', role:'mesero', base_pay:60000, active:true}, {id:'emp3', name:'Carlos Caja', role:'cajero', base_pay:70000, active:true}],
    employeePayments: [{id:'pay1', employee_id:'emp1', created_at:Date.now()-7200000, concept:'turno', amount:65000, method:'efectivo', detail:'Turno sábado'}],
    sales: [], cashSessions: [], notifications: []
  };
}

function loadLocal() {
  const saved = localStorage.getItem('luza-pos-firebase-v7');
  if (saved) Object.assign(state, JSON.parse(saved));
  else Object.assign(state, seed());
}
function saveLocal() {
  const copy = {...state}; delete copy.session; delete copy.connected;
  localStorage.setItem('luza-pos-firebase-v7', JSON.stringify(copy));
}
function uid(prefix) { return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function product(id) { return state.products.find(x => x.id === id); }
function table(id) { return state.tables.find(x => x.id === id); }
function room(id) { return state.rooms.find(x => x.id === id); }
function customer(id) { return state.customers.find(x => x.id === id); }
function employee(id) { return state.employees.find(x => x.id === id); }
function activeOrder(tableId) { return state.orders.find(o => o.table_id === tableId && !['closed','cancelled'].includes(o.status)); }
function orderTotal(o) { return o.items.reduce((a,it)=>a + (product(it.product_id)?.price || 0) * it.qty, 0); }
function orderCost(o) { return o.items.reduce((a,it)=>a + (product(it.product_id)?.cost || 0) * it.qty, 0); }
function deliveryTotal(d) { return d.items.reduce((a,it)=>a + (product(it.product_id)?.price || 0) * it.qty, 0); }
function deliveryCost(d) { return d.items.reduce((a,it)=>a + (product(it.product_id)?.cost || 0) * it.qty, 0); }
function isAdmin() { return SUPER_ROLES.includes(state.user.role); }
function allowedPages() { return PAGES.filter(p => (ACCESS[state.user.role] || []).includes(p[0])); }
function pageAllowed(p) { return (ACCESS[state.user.role] || []).includes(p); }
function sameDay(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }
function pageMeta(page) {
  return {
    dashboard:['Panel general','Resumen operativo, ventas, rentabilidad y alertas.'],
    waiter:['Interfaz del mesero','Mesas, pedidos, estado de cocina y cambios de mesa.'],
    cashier:['Caja y facturación','Cobro, crédito, recibos y cierre de caja.'],
    production:['Cocina / producción','Comandas unificadas de platos y bebidas.'],
    delivery:['Domicilios','Pedidos, preparación, ruta, entrega y tiempos.'],
    credit:['Créditos','Clientes, cargos, abonos y saldos pendientes.'],
    manager:['Gerencia','Rentabilidad, pagos, empleados, proveedores y análisis.'],
    settings:['Administración','Productos, empleados, proveedores y parámetros.'],
    users:['Usuarios internos','Crear usuarios con usuario, contraseña y rol.']
  }[page] || ['Panel',''];
}

async function boot() {
  loadLocal();
  setupPwa();
  bindChrome();
  if (configured) {
    onAuthStateChanged(auth, async (user) => {
      if (user) await hydrateFirebaseUser(user);
      else showLogin();
      setTimeout(() => $('boot').classList.add('hidden'), 450);
    });
  } else {
    showLogin();
    setTimeout(() => $('boot').classList.add('hidden'), 450);
  }
}

function usernameToEmail(username) {
  return `${String(username || '').trim().toLowerCase().replace(/\s+/g,'')}@luza.local`;
}

function showLogin() {
  $('login').classList.remove('hidden');
  $('app').classList.add('hidden');

  const configWarning = configured ? '' : `
    <div class="danger" style="margin-top:14px;text-align:left">
      <strong>Firebase todavía no está configurado.</strong>
      <p class="small">Edita <b>firebase-config.js</b>, pega la configuración real del proyecto y verifica que <b>DEMO_MODE = false</b>.</p>
    </div>`;

  $('login').innerHTML = `
    <div class="login-card">
      <img src="assets/logo.jpg" alt="Logo">
      <h1>Piqueteadero Luza POS</h1>
      <p>Ingreso seguro con código de usuario y PIN.</p>
      <form id="loginForm" class="form">
        <div class="full">
          <label>Código de usuario</label>
          <input class="input" id="username" type="text" autocomplete="username" placeholder="Ej: admin, cajero1, mesero1" required ${configured ? '' : 'disabled'}>
        </div>
        <div class="full">
          <label>PIN / contraseña</label>
          <input class="input" id="password" type="password" autocomplete="current-password" inputmode="numeric" required ${configured ? '' : 'disabled'}>
        </div>
        <div class="full">
          <button class="btn yellow block" ${configured ? '' : 'disabled'}>Ingresar</button>
        </div>
      </form>
      <p class="small">La app convierte internamente el código a usuario@luza.local para Firebase Auth.</p>
      ${configWarning}
    </div>`;

  if (configured) $('loginForm').onsubmit = loginFirebase;
}

async function loginFirebase(e) {
  e.preventDefault();
  const email = usernameToEmail($('username').value); const password = $('password').value;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await hydrateFirebaseUser(cred.user);
  } catch (error) {
    notify('No se pudo ingresar. Revisa código de usuario o PIN.', 'urgent');
  }
}
async function hydrateFirebaseUser(user) {
  state.session = { uid: user.uid };
  const snap = await getDoc(doc(db, 'profiles', user.uid));
  if (!snap.exists()) {
    showLogin(); notify('El usuario existe en Firebase Auth, pero no tiene perfil/rol en Firestore: profiles/{uid}.', 'urgent'); return;
  }
  const profile = snap.data();
  if (profile.isActive === false) {
    showLogin(); notify('Usuario inactivo. Solicita activación al gerente.', 'urgent'); return;
  }
  state.user = { id: user.uid, name: profile.name || user.email, role: profile.role, email: user.email };
  state.page = (ACCESS[state.user.role] || ['dashboard'])[0];
  await loadFromFirebase();
  setupRealtime();
  $('login').classList.add('hidden'); $('app').classList.remove('hidden'); render();
}

async function loadFromFirebase() {
  if (!configured || !state.session) return;
  state.connected = true;
  const calls = [
    ['rooms','rooms'], ['tables','restaurant_tables'], ['products','products'], ['orders','orders'], ['orderItems','order_items'],
    ['deliveries','deliveries'], ['deliveryItems','delivery_items'], ['customers','customers'], ['creditMovements','credit_movements'],
    ['providers','providers'], ['expenses','expenses'], ['employees','employees'], ['employeePayments','employee_payments'], ['sales','sales'], ['cashSessions','cash_sessions'], ['notifications','app_notifications'], ['profiles','profiles']
  ];
  for (const [key, colName] of calls) {
    const snap = await getDocs(collection(db, colName));
    state[key] = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.created_at||0)-(b.created_at||0));
  }
  const itemsByOrder = Object.groupBy ? Object.groupBy(state.orderItems, x => x.order_id) : groupBy(state.orderItems, 'order_id');
  state.orders = state.orders.map(o => ({...o, items: itemsByOrder[o.id] || []}));
  const itemsByDelivery = Object.groupBy ? Object.groupBy(state.deliveryItems, x => x.delivery_id) : groupBy(state.deliveryItems, 'delivery_id');
  state.deliveries = state.deliveries.map(d => ({...d, items: itemsByDelivery[d.id] || []}));
}
function groupBy(arr, key) { return arr.reduce((a,x)=>((a[x[key]] ||= []).push(x),a),{}); }
function setupRealtime() {
  if (!configured) return;
  ['orders','order_items','deliveries','delivery_items','restaurant_tables','products','sales','expenses','employee_payments','cash_sessions','profiles'].forEach(colName => {
    onSnapshot(collection(db, colName), scheduleReload);
  });
  onSnapshot(collection(db, 'app_notifications'), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        const n = { id: change.doc.id, ...change.doc.data() };
        if (!state.notifications.some(x => x.id === n.id)) {
          state.notifications.push(n);
          notify(n.message || 'Nueva notificación', n.level || 'urgent', n.title || 'Notificación');
        }
      }
    });
    scheduleReload();
  });
}
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => { await loadFromFirebase(); render(); }, 500);
}
function cleanFirestore(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([_,v]) => v !== undefined && typeof v !== 'function'));
}
async function dbUpsert(colName, record) {
  if (!configured || !state.session || !record?.id) return;
  try { await setDoc(doc(db, colName, record.id), cleanFirestore(record), { merge: true }); }
  catch (error) { notify(`Error guardando ${colName}: ${error.message}`, 'urgent'); }
}
async function dbDelete(colName, id) {
  if (!configured || !state.session) return;
  try { await deleteDoc(doc(db, colName, id)); }
  catch (error) { notify(`Error eliminando ${colName}: ${error.message}`, 'urgent'); }
}

function bindChrome() {
  $('modalBg').onclick = (e) => { if (e.target.id === 'modalBg') closeModal(); };
  $('enableSoundBtn').onclick = unlockAudio;
  $('mobileSoundBtn').onclick = unlockAudio;
  $('logoutBtn').onclick = logout;
  $('refreshBtn').onclick = async () => { await loadFromFirebase(); render(); notify('Sincronización ejecutada.', 'soft'); };
}
async function logout() {
  if (configured) await signOut(auth);
  $('app').classList.add('hidden'); showLogin();
}
function setupPwa() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); installPrompt = e; $('installBtn').classList.remove('hidden');
  });
  $('installBtn').onclick = async () => { if (installPrompt) { installPrompt.prompt(); installPrompt = null; $('installBtn').classList.add('hidden'); } };
}
function unlockAudio() {
  audioUnlocked = true;
  ['urgentSound','readySound','softSound'].forEach(id => { const a=$(id); a.volume = 1; a.play().then(()=>a.pause()).catch(()=>{}); a.currentTime = 0; });
  Notification?.requestPermission?.();
  notify('Sonido y notificaciones activados.', 'ready');
}
function playSound(kind='urgent') {
  const audio = $(kind === 'ready' ? 'readySound' : kind === 'soft' ? 'softSound' : 'urgentSound');
  if (!audioUnlocked) return;
  audio.currentTime = 0; audio.volume = 1; audio.play().catch(()=>{});
}
function notify(message, level='soft', title='Piqueteadero Luza') {
  const div = document.createElement('div');
  div.className = `toast ${level === 'urgent' ? 'urgent' : ''}`;
  div.textContent = message;
  $('toastStack').appendChild(div);
  setTimeout(()=>div.remove(), level === 'urgent' ? 8000 : 4200);
  playSound(level === 'urgent' ? 'urgent' : level === 'ready' ? 'ready' : 'soft');
  if (level !== 'soft') {
    $('alarmTitle').textContent = title;
    $('alarmText').textContent = message;
    $('alarm').classList.remove('hidden');
    setTimeout(()=> $('alarm').classList.add('hidden'), 6500);
    navigator.vibrate?.([350,120,350,120,350]);
  }
  if ('Notification' in window && Notification.permission === 'granted' && level !== 'soft') {
    new Notification(title, { body: message, icon: 'assets/logo.jpg' });
  }
}
window.__closeAlarm = () => $('alarm').classList.add('hidden');
function closeModal(){ $('modalBg').classList.remove('open'); $('modal').innerHTML=''; }
function openModal(html){ $('modal').innerHTML=html; $('modalBg').classList.add('open'); }

function render() {
  saveLocal();
  renderShell();
  const [title, sub] = pageMeta(state.page);
  $('pageTitle').textContent = title; $('pageSub').textContent = sub;
  $('userName').textContent = state.user.name; $('userRole').textContent = ROLES[state.user.role] || state.user.role;
  $('mobileRole').textContent = ROLES[state.user.role] || state.user.role;
  $('connectionPill').innerHTML = `<span class="dot ${configured && state.connected ? 'online' : ''}"></span>${configured ? 'Firebase activo' : 'Firebase sin configurar'}`;
  const pageRender = {dashboard, waiter, cashier, production, delivery, credit, manager, settings, users}[state.page] || dashboard;
  $('view').innerHTML = pageRender();
}
function renderShell() {
  const pages = allowedPages();
  $('nav').innerHTML = pages.map(p => `<button class="${state.page===p[0]?'active':''}" onclick="window.__setPage('${p[0]}')"><b>${p[1]}</b>${p[2]}</button>`).join('');
  $('bottomNav').innerHTML = pages.slice(0,5).map(p => `<button class="${state.page===p[0]?'active':''}" onclick="window.__setPage('${p[0]}')"><b>${p[1]}</b><span>${p[2]}</span></button>`).join('');
}
window.__setPage = (p) => { if (!pageAllowed(p)) p = allowedPages()[0]?.[0] || 'dashboard'; state.page = p; render(); };

function dashboard() {
  const openOrders = state.orders.filter(o=>!['closed','cancelled'].includes(o.status));
  const daySales = state.sales.filter(s=>sameDay(s.created_at));
  const ventas = daySales.reduce((a,s)=>a+s.total,0);
  const costs = daySales.reduce((a,s)=>a+s.cost,0);
  const expenses = state.expenses.filter(e=>sameDay(e.created_at)).reduce((a,e)=>a+e.amount,0);
  const payroll = state.employeePayments.filter(e=>sameDay(e.created_at)).reduce((a,e)=>a+e.amount,0);
  const net = ventas - costs - expenses - payroll;
  const low = state.products.filter(p=>p.active && p.stock <= p.min_stock).length;
  return `<div class="hero"><div class="card black"><div class="title"><div><h2>Operación en tiempo real</h2><p>Roles, mesas, producción unificada, caja, domicilios, sonidos fuertes y Firebase.</p></div></div><div class="badges"><span class="badge"><b>${state.tables.filter(t=>t.active).length}</b> mesas</span><span class="badge"><b>${openOrders.length}</b> pedidos activos</span><span class="badge"><b>${low}</b> alertas de stock</span></div></div><div class="grid"><div class="card yellow kpi"><div class="label">Ventas hoy</div><div class="value">${money.format(ventas)}</div></div><div class="card black kpi"><div class="label">Utilidad neta hoy</div><div class="value">${money.format(net)}</div><span class="small">Ventas - costo - gastos - empleados.</span></div></div></div><div class="grid four"><div class="card kpi"><div class="label">Mesas ocupadas</div><div class="value">${state.tables.filter(t=>activeOrder(t.id)).length}</div></div><div class="card kpi"><div class="label">Domicilios</div><div class="value">${state.deliveries.filter(d=>d.status!=='closed').length}</div></div><div class="card kpi"><div class="label">Cartera</div><div class="value">${money.format(state.customers.reduce((a,c)=>a+c.balance,0))}</div></div><div class="card kpi"><div class="label">Pagos empleados</div><div class="value">${money.format(payroll)}</div></div></div><div class="grid two" style="margin-top:16px"><div class="card"><div class="title"><div><h2>Mapa de mesas</h2><p>Visual para operación rápida y redimensionable.</p></div></div><div class="map">${state.tables.map(t=>tableCard(t,false)).join('')}</div></div><div class="card"><div class="title"><div><h2>Alertas visibles</h2><p>Producción y mesero reciben aviso sonoro cuando algo está listo.</p></div></div><div class="list">${state.notifications.slice(-6).reverse().map(n=>`<div class="line"><div><strong>${esc(n.title || 'Notificación')}</strong><span class="small">${esc(n.message)}</span></div><span class="status s-warn">${n.level||'info'}</span></div>`).join('') || '<div class="empty">Sin notificaciones todavía.</div>'}</div></div></div>`;
}
function tableCard(t, clickable=true) {
  const o = activeOrder(t.id);
  const roomName = t.room || room(t.room_id)?.name || 'Principal';
  const cls = !t.active ? 'off' : !o ? '' : o.status === 'bill' ? 'bill' : 'busy';
  const status = !t.active ? ['Inactiva','s-neutral'] : !o ? ['Libre','s-free'] : o.status === 'bill' ? ['Por cobrar','s-bill'] : ['Ocupada','s-busy'];
  return `<button class="table ${cls} ${state.selectedTable===t.id?'selected':''}" ${clickable?`onclick="window.__selectTable('${t.id}')"`:''}><span class="mname">${esc(t.name)}</span><span class="small">${esc(roomName)} · ${t.capacity || 4} puestos</span><span class="status ${status[1]}">${status[0]}</span>${o?`<span class="small">${money.format(orderTotal(o))} · ${orderLabel(o.status)}</span>`:''}</button>`;
}
function orderLabel(status) { return ({open:'En toma',sent:'En cocina',preparing:'Preparando',ready:'Listo',bill:'Cuenta',closed:'Cerrado'})[status] || status; }
window.__selectTable = (id) => { state.selectedTable = id; render(); };

function waiter() {
  const t = table(state.selectedTable) || state.tables.find(t=>t.active);
  if (!t) return `<div class="empty">No hay mesas. Crea mesas desde aquí.</div><button class="btn yellow" onclick="window.__quickTableModal()">Crear mesas</button>`;
  const o = activeOrder(t.id);
  const cats = [...new Set(state.products.map(p=>p.category))];
  return `<div class="split"><div><div class="card"><div class="title"><div><h2>Mesas del mesero</h2><p>Crea mesas, toma pedidos, consulta estado y mueve pedidos si cambian de lugar.</p></div><button class="btn yellow" onclick="window.__quickTableModal()">Crear mesas</button></div><div class="map">${state.tables.filter(t=>t.active).map(t=>tableCard(t,true)).join('')}</div></div><div class="card" style="margin-top:16px"><div class="title"><div><h2>Productos disponibles</h2><p>Platos y bebidas se envían juntos a Cocina / Producción.</p></div></div><div class="toolbar"><select id="catFilter" class="select grow" onchange="window.__filterCat=this.value;render()"><option value="">Todas las categorías</option>${cats.map(c=>`<option ${window.__filterCat===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="catalog">${state.products.filter(p=>p.active && (p.category === (window.__filterCat || p.category))).map(p=>productCard(p,t.id)).join('')}</div></div></div><aside class="card"><div class="title"><div><h2>${esc(t.name)}</h2><p>${esc(t.room || room(t.room_id)?.name || '')}</p></div><span class="status ${o?'s-busy':'s-free'}">${o?'Pedido activo':'Libre'}</span></div>${o?orderPanel(o):`<div class="empty">Mesa libre.</div><button class="btn yellow block" onclick="window.__createOrder('${t.id}')" style="margin-top:12px">Crear pedido</button>`}</aside></div>`;
}
function productCard(p, tableId) {
  const off = !p.active || p.stock <= 0;
  return `<div class="prod ${off?'off':''}"><div class="prodtop"><div><strong class="pname">${esc(p.name)}</strong><div class="small">${esc(p.category)} · Cocina</div></div><span class="price">${money.format(p.price)}</span></div><span class="status ${p.stock<=0?'s-bad':p.stock<=p.min_stock?'s-warn':'s-ok'}">${p.stock<=0?'Agotado':p.stock+' disp.'}</span><button class="btn ${off?'white':'yellow'} block" ${off?'disabled':''} onclick="window.__addItem('${tableId}','${p.id}')">Agregar</button></div>`;
}
function orderPanel(o) {
  return `<div class="list">${o.items.map(it=>orderItemLine(o,it)).join('') || '<div class="empty">Pedido sin productos.</div>'}</div><div style="height:12px"></div><div class="summary"><div class="sr"><span>Estado</span><strong>${orderLabel(o.status)}</strong></div><div class="sr"><span>Total</span><strong>${money.format(orderTotal(o))}</strong></div><div class="sr total"><span>Cocina</span><strong>${o.items.filter(i=>i.status==='ready').length}/${o.items.length} listos</strong></div></div><div class="toolbar" style="margin-top:12px"><button class="btn blue" onclick="window.__sendToKitchen('${o.id}')">Enviar a cocina</button><button class="btn white" onclick="window.__moveOrderModal('${o.id}')">Cambiar mesa</button><button class="btn yellow" onclick="window.__requestBill('${o.id}')">Solicitar cuenta</button></div>`;
}
function orderItemLine(o,it) {
  const p = product(it.product_id);
  const cls = it.status === 'ready' || it.status === 'served' ? 's-ok' : it.status === 'preparing' ? 's-warn' : 's-neutral';
  return `<div class="line"><div><strong>${it.qty} x ${esc(p?.name)}</strong><span class="small">${esc(p?.category)} · ${orderLabel(it.status)}</span></div><div class="line-actions"><button class="btn small white" onclick="window.__incItem('${o.id}','${it.id}',1)">+1</button><button class="btn small white" onclick="window.__incItem('${o.id}','${it.id}',-1)">-1</button><span class="status ${cls}">${orderLabel(it.status)}</span></div></div>`;
}
window.__createOrder = async (tableId) => {
  if (activeOrder(tableId)) return;
  const order = { id:uid('ord'), table_id:tableId, type:'mesa', status:'open', created_at:Date.now(), created_by:state.user.id, items:[] };
  state.orders.push(order); await dbUpsert(TABLES.orders, stripItems(order)); render();
};
function stripItems(o){ const {items, ...rest} = o; return rest; }
window.__addItem = async (tableId, productId) => {
  const p = product(productId); if (!p || p.stock <= 0 || !p.active) return notify('Producto agotado.', 'urgent');
  let o = activeOrder(tableId); if (!o) { await window.__createOrder(tableId); o = activeOrder(tableId); }
  let it = o.items.find(x => x.product_id === productId && x.status === 'pending');
  if (it) it.qty++; else { it = { id:uid('it'), order_id:o.id, product_id:productId, qty:1, status:'pending', created_at:Date.now() }; o.items.push(it); }
  p.stock--; await Promise.all([dbUpsert(TABLES.products, p), dbUpsert(TABLES.orderItems, it)]); render();
};
window.__incItem = async (orderId, itemId, n) => {
  const o = state.orders.find(x=>x.id===orderId); const it = o.items.find(x=>x.id===itemId); const p = product(it.product_id);
  if (n > 0) { if (p.stock <= 0) return notify('No hay stock disponible.', 'urgent'); it.qty++; p.stock--; }
  else { it.qty--; p.stock++; if (it.qty <= 0) { o.items = o.items.filter(x=>x.id!==itemId); await dbDelete(TABLES.orderItems, itemId); } }
  if (it.qty > 0) await dbUpsert(TABLES.orderItems, it);
  await dbUpsert(TABLES.products, p); render();
};
window.__sendToKitchen = async (orderId) => { const o=state.orders.find(x=>x.id===orderId); o.status='sent'; await dbUpsert(TABLES.orders, stripItems(o)); notify(`Pedido enviado a cocina: ${table(o.table_id)?.name}`, 'urgent', 'Nueva comanda'); render(); };
window.__requestBill = async (orderId) => { const o=state.orders.find(x=>x.id===orderId); o.status='bill'; await dbUpsert(TABLES.orders, stripItems(o)); notify(`Cuenta solicitada: ${table(o.table_id)?.name}`, 'ready', 'Caja'); render(); };
window.__moveOrderModal = (orderId) => {
  const o = state.orders.find(x=>x.id===orderId);
  openModal(`<div class="title"><div><h2>Cambiar pedido de mesa</h2><p>Pedido actual: ${esc(table(o.table_id)?.name)}</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div class="full"><label>Nueva mesa libre</label><select id="newTable" class="select">${state.tables.filter(t=>t.active&&!activeOrder(t.id)).map(t=>`<option value="${t.id}">${esc(t.name)} · ${esc(t.room || room(t.room_id)?.name)}</option>`).join('')}</select></div><div class="full"><button class="btn yellow block" onclick="window.__moveOrder('${orderId}',newTable.value)">Mover pedido</button></div></div>`);
};
window.__moveOrder = async (orderId, tableId) => { const o=state.orders.find(x=>x.id===orderId); o.table_id=tableId; state.selectedTable=tableId; await dbUpsert(TABLES.orders, stripItems(o)); closeModal(); render(); };
window.__closeModal = closeModal;

function production() {
  const rows = [];
  state.orders.filter(o=>!['closed','cancelled'].includes(o.status)).forEach(o=>o.items.filter(it=>it.status!=='served').forEach(it=>rows.push({kind:'order', src:o, it, source:table(o.table_id)?.name || 'Mesa'})));
  state.deliveries.filter(d=>d.status!=='closed').forEach(d=>d.items.filter(it=>it.status!=='served').forEach(it=>rows.push({kind:'delivery', src:d, it, source:`Domicilio · ${d.customer_name}`})));
  rows.sort((a,b)=>a.it.created_at-b.it.created_at);
  return `<div class="card"><div class="title"><div><h2>Cocina / producción</h2><p>Platos y bebidas juntos, por orden de llegada. Las alertas suenan fuerte cuando se marca listo.</p></div><button class="btn yellow" onclick="window.__testAlarm()">Probar sonido</button></div><div class="list">${rows.map(r=>prodLine(r)).join('') || '<div class="empty">Sin comandas pendientes.</div>'}</div></div>`;
}
function prodLine(r) {
  const p = product(r.it.product_id);
  return `<div class="line"><div><strong>${r.it.qty} x ${esc(p?.name)}</strong><span class="small">${esc(r.source)} · ${orderLabel(r.it.status)}</span></div><div class="line-actions"><button class="btn small white" onclick="window.__setItemStatus('${r.kind}','${r.src.id}','${r.it.id}','preparing')">Preparar</button><button class="btn small yellow" onclick="window.__setItemStatus('${r.kind}','${r.src.id}','${r.it.id}','ready')">Listo</button><button class="btn small green" onclick="window.__setItemStatus('${r.kind}','${r.src.id}','${r.it.id}','served')">Entregado</button></div></div>`;
}
window.__setItemStatus = async (kind, srcId, itemId, status) => {
  const src = kind === 'order' ? state.orders.find(x=>x.id===srcId) : state.deliveries.find(x=>x.id===srcId);
  const it = src.items.find(x=>x.id===itemId); it.status = status;
  if (kind === 'order') await dbUpsert(TABLES.orderItems, it); else await dbUpsert(TABLES.deliveryItems, it);
  if (status === 'ready') {
    const p = product(it.product_id);
    const msg = `${p?.name} listo para recoger · ${kind === 'order' ? table(src.table_id)?.name : src.customer_name}`;
    state.notifications.push({id:uid('n'), title:'Producto listo', message:msg, level:'ready', created_at:Date.now()});
    await dbUpsert(TABLES.notifications, state.notifications.at(-1));
    notify(msg, 'ready', 'Pedido listo');
  }
  render();
};
window.__testAlarm = () => notify('Prueba de sonido fuerte y notificación visible.', 'urgent', 'Prueba de alarma');

function cashier() {
  const active = state.orders.filter(o=>!['closed','cancelled'].includes(o.status));
  return `<div class="split"><div class="card"><div class="title"><div><h2>Cuentas por mesa</h2><p>Lo que carga el mesero aparece aquí para cobro, crédito o factura.</p></div></div><div class="list">${active.map(cashOrder).join('') || '<div class="empty">No hay cuentas abiertas.</div>'}</div></div><aside class="card black"><div class="title"><div><h2>Caja</h2><p>Ventas por medio de pago.</p></div></div>${cashSummary()}<div class="toolbar" style="margin-top:12px"><button class="btn yellow block" onclick="window.__cashCloseModal()">Cuadrar caja</button></div></aside></div>`;
}
function cashOrder(o) { return `<div class="line"><div><strong>${esc(table(o.table_id)?.name)} · ${money.format(orderTotal(o))}</strong><span class="small">${o.items.length} líneas · ${orderLabel(o.status)}</span></div><div class="line-actions"><button class="btn small yellow" onclick="window.__payModal('${o.id}')">Cobrar / crédito</button><button class="btn small white" onclick="window.__invoiceModal('${o.id}')">Factura</button></div></div>`; }
function payTotals(){ return state.sales.reduce((a,s)=>(a[s.method]=(a[s.method]||0)+s.total,a),{}); }
function cashSummary(){ const t=payTotals(); return `<div class="summary"><div class="sr"><span>Efectivo</span><strong>${money.format(t.efectivo||0)}</strong></div><div class="sr"><span>Nequi</span><strong>${money.format(t.nequi||0)}</strong></div><div class="sr"><span>Tarjeta</span><strong>${money.format(t.tarjeta||0)}</strong></div><div class="sr"><span>Transferencia</span><strong>${money.format(t.transferencia||0)}</strong></div><div class="sr"><span>Crédito</span><strong>${money.format(t.credito||0)}</strong></div><div class="sr total"><span>Total</span><strong>${money.format(state.sales.reduce((a,s)=>a+s.total,0))}</strong></div></div>`; }
window.__payModal = (orderId) => { const o=state.orders.find(x=>x.id===orderId); const total=orderTotal(o); openModal(`<div class="title"><div><h2>Cobrar cuenta</h2><p>${esc(table(o.table_id)?.name)} · ${money.format(total)}</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Método</label><select id="payMethod" class="select" onchange="creditBox.classList.toggle('hidden',this.value!=='credito')"><option value="efectivo">Efectivo</option><option value="nequi">Nequi</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="credito">Crédito cliente</option></select></div><div><label>Valor recibido</label><input id="payAmount" class="input" type="number" value="${total}"></div><div id="creditBox" class="full hidden"><label>Cliente crédito</label><select id="creditClient" class="select">${state.customers.filter(c=>c.id!=='c0'&&c.active).map(c=>`<option value="${c.id}">${esc(c.name)} · ${money.format(c.balance)}</option>`).join('')}</select><button class="btn small white" style="margin-top:8px" onclick="window.__newCustomerModal()">Crear cliente</button></div><div class="full"><button class="btn green block" onclick="window.__closeOrderPayment('${orderId}')">Cerrar cuenta</button></div></div>`); };
window.__closeOrderPayment = async (orderId) => { const o=state.orders.find(x=>x.id===orderId); const method=$('payMethod').value; const total=orderTotal(o); const cost=orderCost(o); const cid=method==='credito' ? $('creditClient').value : 'c0'; const sale={id:uid('sale'),created_at:Date.now(),type:'mesa',method,total,cost,hour:new Date().getHours(),customer_id:cid,order_id:o.id}; state.sales.push(sale); await dbUpsert(TABLES.sales, sale); if(method==='credito'){ const c=customer(cid); c.balance+=total; await dbUpsert(TABLES.customers,c); const cm={id:uid('cm'),customer_id:cid,type:'cargo',amount:total,created_at:Date.now(),detail:`Consumo ${table(o.table_id)?.name}`}; state.creditMovements.push(cm); await dbUpsert(TABLES.creditMovements, cm); } o.status='closed'; o.closed_at=Date.now(); await dbUpsert(TABLES.orders, stripItems(o)); closeModal(); notify('Cuenta cerrada y mesa liberada.', 'ready', 'Caja'); render(); };
window.__invoiceModal = (orderId) => { const o=state.orders.find(x=>x.id===orderId); openModal(`<div class="title"><div><h2>Factura / recibo</h2><p>Documento interno imprimible.</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div>${receipt(o)}<div class="toolbar" style="justify-content:center;margin-top:12px"><button class="btn yellow" onclick="window.print()">Imprimir</button></div>`); };
function receipt(o){ return `<div class="receipt"><img src="assets/logo.jpg"><h3 style="text-align:center;margin:0">Piqueteadero Luza</h3><div style="text-align:center;font-size:.8rem">Recibo interno POS</div><div class="rline"><span>Fecha</span><b>${new Date().toLocaleString('es-CO')}</b></div><div class="rline"><span>Mesa</span><b>${esc(table(o.table_id)?.name)}</b></div>${o.items.map(it=>{const p=product(it.product_id);return `<div class="rline"><span>${it.qty} ${esc(p?.name)}</span><b>${money.format((p?.price||0)*it.qty)}</b></div>`}).join('')}<div class="rline"><span>Total</span><b>${money.format(orderTotal(o))}</b></div><p style="text-align:center;color:#111">Gracias por su compra</p></div>`; }
window.__cashCloseModal = () => { const t=payTotals(); const expected=t.efectivo||0; const total=state.sales.reduce((a,s)=>a+s.total,0); openModal(`<div class="title"><div><h2>Cuadre de caja</h2><p>Sirve para cierre de turno o fin de semana.</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Efectivo esperado</label><input class="input" value="${expected}" readonly></div><div><label>Efectivo contado</label><input id="cashCount" class="input" type="number" value="${expected}"></div><div><label>Total ventas</label><input class="input" value="${total}" readonly></div><div><label>Responsable</label><input id="cashUser" class="input" value="${esc(state.user.name)}"></div><div class="full"><label>Observación</label><textarea id="cashObs">Cierre de caja sin novedad.</textarea></div><div class="full"><button class="btn yellow block" onclick="window.__saveCashClose(${expected},+cashCount.value,cashUser.value,cashObs.value)">Guardar cierre</button></div></div>`); };
window.__saveCashClose = async (expected, counted, user, obs) => { const row={id:uid('cc'),created_at:Date.now(),expected,counted,diff:counted-expected,user_name:user,notes:obs}; state.cashSessions.push(row); await dbUpsert(TABLES.cashSessions,row); closeModal(); render(); };

function delivery() {
  const open = state.deliveries.filter(d=>d.status!=='closed');
  return `<div class="split"><div class="card"><div class="title"><div><h2>Domicilios</h2><p>Pedido, producción, recogida, ruta y cierre.</p></div><button class="btn yellow" onclick="window.__newDeliveryModal()">Nuevo domicilio</button></div><div class="list">${open.map(deliveryCard).join('') || '<div class="empty">No hay domicilios activos.</div>'}</div></div><aside class="card black"><div class="title"><div><h2>Métricas</h2><p>Control de tiempos.</p></div></div><div class="summary"><div class="sr"><span>Activos</span><strong>${open.length}</strong></div><div class="sr"><span>Cerrados</span><strong>${state.deliveries.filter(d=>d.status==='closed').length}</strong></div></div></aside></div>`;
}
function deliveryCard(d){ return `<div class="line"><div><strong>${esc(d.customer_name)} · ${money.format(deliveryTotal(d))}</strong><span class="small">${esc(d.address)} · ${d.status} · ${Math.round((Date.now()-d.created_at)/60000)} min</span></div><div class="line-actions"><button class="btn small yellow" onclick="window.__addDeliveryItems('${d.id}')">Productos</button><button class="btn small white" onclick="window.__nextDelivery('${d.id}')">Avanzar</button><button class="btn small green" onclick="window.__closeDelivery('${d.id}')">Cerrar</button></div></div>`; }
window.__newDeliveryModal = () => openModal(`<div class="title"><div><h2>Nuevo domicilio</h2><p>Se envía a Cocina / Producción.</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Cliente</label><input id="delName" class="input" value="Cliente domicilio"></div><div><label>Teléfono</label><input id="delPhone" class="input"></div><div class="full"><label>Dirección</label><input id="delAddress" class="input" value="Dirección del cliente"></div><div><label>Método</label><select id="delMethod" class="select"><option value="efectivo">Efectivo</option><option value="nequi">Nequi</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="credito">Crédito</option></select></div><div><label>Domiciliario</label><input id="delCourier" class="input" value="Domiciliario 1"></div><div class="full"><button class="btn yellow block" onclick="window.__createDelivery()">Crear domicilio</button></div></div>`);
window.__createDelivery = async () => { const d={id:uid('del'),customer_name:$('delName').value,phone:$('delPhone').value,address:$('delAddress').value,method:$('delMethod').value,courier:$('delCourier').value,status:'created',created_at:Date.now(),items:[]}; state.deliveries.push(d); await dbUpsert(TABLES.deliveries, stripItems(d)); closeModal(); notify('Domicilio creado.', 'ready'); render(); };
window.__addDeliveryItems = (id) => { const d=state.deliveries.find(x=>x.id===id); openModal(`<div class="title"><div><h2>Agregar productos</h2><p>${esc(d.customer_name)}</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="catalog">${state.products.filter(p=>p.active).map(p=>`<div class="prod ${p.stock<=0?'off':''}"><strong>${esc(p.name)}</strong><span class="small">${money.format(p.price)} · stock ${p.stock}</span><button class="btn small yellow" ${p.stock<=0?'disabled':''} onclick="window.__addDelItem('${id}','${p.id}')">Agregar</button></div>`).join('')}</div>`); };
window.__addDelItem = async (did,pid) => { const d=state.deliveries.find(x=>x.id===did),p=product(pid); if(p.stock<=0)return notify('Agotado','urgent'); let it=d.items.find(x=>x.product_id===pid&&x.status==='pending'); if(it)it.qty++; else { it={id:uid('di'),delivery_id:did,product_id:pid,qty:1,status:'pending',created_at:Date.now()}; d.items.push(it); } p.stock--; await Promise.all([dbUpsert(TABLES.deliveryItems,it), dbUpsert(TABLES.products,p)]); render(); };
window.__nextDelivery = async (id) => { const d=state.deliveries.find(x=>x.id===id); const flow=['created','in_preparation','ready','picked_up','on_the_way','delivered']; d.status=flow[Math.min(flow.indexOf(d.status)+1, flow.length-1)]; await dbUpsert(TABLES.deliveries, stripItems(d)); render(); };
window.__closeDelivery = async (id) => { const d=state.deliveries.find(x=>x.id===id); const sale={id:uid('sale'),created_at:Date.now(),type:'domicilio',method:d.method,total:deliveryTotal(d),cost:deliveryCost(d),hour:new Date().getHours(),delivery_id:d.id}; state.sales.push(sale); await dbUpsert(TABLES.sales,sale); d.status='closed'; d.closed_at=Date.now(); await dbUpsert(TABLES.deliveries, stripItems(d)); notify('Domicilio cerrado y cobrado.','ready'); render(); };

function credit() {
  const clients = state.customers.filter(c=>c.id!=='c0');
  return `<div class="split"><div class="card"><div class="title"><div><h2>Clientes crédito</h2><p>Cuentas por cobrar, cargos y abonos.</p></div><button class="btn yellow" onclick="window.__newCustomerModal()">Nuevo cliente</button></div><div class="list">${clients.map(c=>creditLine(c)).join('') || '<div class="empty">Sin clientes crédito.</div>'}</div></div><aside class="card black"><div class="title"><div><h2>Cartera total</h2><p>Saldo pendiente.</p></div></div><div class="summary"><div class="sr"><span>Clientes</span><strong>${clients.length}</strong></div><div class="sr total"><span>Saldo</span><strong>${money.format(clients.reduce((a,c)=>a+c.balance,0))}</strong></div></div></aside></div>`;
}
function creditLine(c){ return `<div class="line"><div><strong>${esc(c.name)} · ${money.format(c.balance)}</strong><span class="small">${esc(c.doc||'Sin doc')} · límite ${money.format(c.credit_limit)}</span></div><div class="line-actions"><button class="btn small yellow" onclick="window.__manualCreditCharge('${c.id}')">Cargar</button><button class="btn small green" onclick="window.__payCreditModal('${c.id}')">Abono</button><button class="btn small white" onclick="window.__creditHistory('${c.id}')">Historial</button></div></div>`; }
window.__newCustomerModal = () => openModal(`<div class="title"><div><h2>Nuevo cliente crédito</h2></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Nombre</label><input id="cn" class="input" value="Nuevo cliente"></div><div><label>Documento/NIT</label><input id="cd" class="input"></div><div><label>Teléfono</label><input id="ct" class="input"></div><div><label>Límite crédito</label><input id="cl" class="input" type="number" value="200000"></div><div class="full"><button class="btn yellow block" onclick="window.__addCustomer()">Crear cliente</button></div></div>`);
window.__addCustomer = async () => { const c={id:uid('c'),name:$('cn').value,doc:$('cd').value,phone:$('ct').value,credit_limit:+$('cl').value||0,balance:0,active:true}; state.customers.push(c); await dbUpsert(TABLES.customers,c); closeModal(); render(); };
window.__payCreditModal = (cid) => { const c=customer(cid); openModal(`<div class="title"><div><h2>Registrar abono</h2><p>${esc(c.name)} · ${money.format(c.balance)}</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Valor</label><input id="pa" class="input" type="number" value="${c.balance}"></div><div><label>Método</label><select id="pm" class="select"><option>efectivo</option><option>nequi</option><option>transferencia</option><option>tarjeta</option></select></div><div class="full"><button class="btn green block" onclick="window.__payCredit('${cid}',+pa.value,pm.value)">Guardar abono</button></div></div>`); };
window.__payCredit = async (cid, amount, method) => { const c=customer(cid); amount=Math.max(0,Math.min(amount||0,c.balance)); if(!amount)return notify('Valor inválido','urgent'); c.balance-=amount; const mv={id:uid('cm'),customer_id:cid,type:'abono',amount,created_at:Date.now(),detail:'Abono '+method}; state.creditMovements.push(mv); await Promise.all([dbUpsert(TABLES.customers,c),dbUpsert(TABLES.creditMovements,mv)]); closeModal(); render(); };
window.__manualCreditCharge = (cid) => openModal(`<div class="title"><div><h2>Cargar consumo</h2></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Valor</label><input id="chg" class="input" type="number" value="50000"></div><div class="full"><label>Detalle</label><input id="chgd" class="input" value="Consumo restaurante"></div><div class="full"><button class="btn yellow block" onclick="window.__chargeCredit('${cid}',+chg.value,chgd.value)">Cargar</button></div></div>`);
window.__chargeCredit = async (cid, amount, detail) => { const c=customer(cid); c.balance+=amount; const mv={id:uid('cm'),customer_id:cid,type:'cargo',amount,created_at:Date.now(),detail}; state.creditMovements.push(mv); await Promise.all([dbUpsert(TABLES.customers,c),dbUpsert(TABLES.creditMovements,mv)]); closeModal(); render(); };
window.__creditHistory = (cid) => { const c=customer(cid); const rows=state.creditMovements.filter(m=>m.customer_id===cid).sort((a,b)=>b.created_at-a.created_at); openModal(`<div class="title"><div><h2>Historial de crédito</h2><p>${esc(c.name)}</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="list">${rows.map(m=>`<div class="line"><div><strong>${m.type==='cargo'?'Cargo':'Abono'} ${money.format(m.amount)}</strong><span class="small">${new Date(m.created_at).toLocaleString('es-CO')} · ${esc(m.detail)}</span></div><span class="status ${m.type==='cargo'?'s-warn':'s-ok'}">${m.type}</span></div>`).join('') || '<div class="empty">Sin movimientos.</div>'}</div>`); };

function manager() {
  const total=state.sales.reduce((a,s)=>a+s.total,0), costs=state.sales.reduce((a,s)=>a+s.cost,0), exp=state.expenses.reduce((a,e)=>a+e.amount,0), payroll=state.employeePayments.reduce((a,e)=>a+e.amount,0), net=total-costs-exp-payroll;
  return `<div class="hero"><div class="card black"><div class="title"><div><h2>Gerencia y rentabilidad real</h2><p>Ventas, costos, gastos, proveedores y pagos a empleados.</p></div><button class="btn yellow" onclick="window.__exportExcel()">Exportar Excel</button></div><div class="badges"><span class="badge"><b>${money.format(total)}</b> ventas</span><span class="badge"><b>${money.format(payroll)}</b> empleados</span><span class="badge"><b>${money.format(net)}</b> neto</span></div></div><div class="grid"><div class="card yellow kpi"><div class="label">Utilidad neta</div><div class="value">${money.format(net)}</div></div><div class="card kpi"><div class="label">Margen neto</div><div class="value">${total?Math.round(net/total*100):0}%</div></div></div></div><div class="grid four"><div class="card kpi"><div class="label">Ventas</div><div class="value">${money.format(total)}</div></div><div class="card kpi"><div class="label">Costo producto</div><div class="value">${money.format(costs)}</div></div><div class="card kpi"><div class="label">Gastos</div><div class="value">${money.format(exp)}</div></div><div class="card black kpi"><div class="label">Empleados</div><div class="value">${money.format(payroll)}</div></div></div><div class="grid two" style="margin-top:16px"><div class="card"><div class="title"><div><h2>Pagos a empleados</h2><p>Nómina, turnos, bonos, domicilios, anticipos y descuentos.</p></div><button class="btn yellow" onclick="window.__employeePaymentModal()">Registrar pago</button></div><div class="list">${state.employeePayments.slice().reverse().map(p=>`<div class="line"><div><strong>${esc(employee(p.employee_id)?.name||'Empleado')} · ${money.format(p.amount)}</strong><span class="small">${p.concept} · ${p.method} · ${esc(p.detail||'')}</span></div><span class="status s-warn">pago</span></div>`).join('')||'<div class="empty">Sin pagos.</div>'}</div></div><div class="card"><div class="title"><div><h2>Productos más vendidos</h2><p>Movilidad de productos.</p></div></div>${bars(topProducts())}</div></div><div class="grid two" style="margin-top:16px"><div class="card"><div class="title"><div><h2>Gastos / proveedores</h2></div><button class="btn yellow" onclick="window.__expenseModal()">Nuevo gasto</button></div><div class="list">${state.expenses.slice().reverse().map(e=>`<div class="line"><div><strong>${esc(e.detail)} · ${money.format(e.amount)}</strong><span class="small">${e.type} · ${e.method}</span></div></div>`).join('')||'<div class="empty">Sin gastos.</div>'}</div></div><div class="card"><div class="title"><div><h2>Cuadres de caja</h2></div><button class="btn white" onclick="window.__cashCloseModal()">Cuadrar</button></div><div class="list">${state.cashSessions.slice().reverse().map(c=>`<div class="line"><div><strong>${new Date(c.created_at).toLocaleString('es-CO')} · dif. ${money.format(c.diff)}</strong><span class="small">${esc(c.user_name)} · ${esc(c.notes)}</span></div></div>`).join('')||'<div class="empty">Sin cierres.</div>'}</div></div></div>`;
}
function topProducts() { const m={}; state.sales.forEach(s=>{const o=state.orders.find(x=>x.id===s.order_id); if(o) o.items.forEach(it=>{const p=product(it.product_id); m[p?.name]=(m[p?.name]||0)+it.qty;}); const d=state.deliveries.find(x=>x.id===s.delivery_id); if(d) d.items.forEach(it=>{const p=product(it.product_id); m[p?.name]=(m[p?.name]||0)+it.qty;});}); const arr=Object.entries(m).sort((a,b)=>b[1]-a[1]); return arr.length?arr:[['Sin ventas',0]]; }
function bars(data){ const max=Math.max(1,...data.map(x=>x[1])); return `<div class="bars">${data.map(([n,v])=>`<div class="barrow"><span>${esc(n)}</span><div class="track"><div class="fill" style="width:${(v/max)*100}%"></div></div><strong>${v}</strong></div>`).join('')}</div>`; }
window.__employeePaymentModal = () => openModal(`<div class="title"><div><h2>Registrar pago a empleado</h2></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Empleado</label><select id="empPayId" class="select">${state.employees.map(e=>`<option value="${e.id}">${esc(e.name)} · ${ROLES[e.role]||e.role}</option>`).join('')}</select></div><div><label>Concepto</label><select id="empConcept" class="select"><option>turno</option><option>nómina</option><option>anticipo</option><option>bono</option><option>horas extra</option><option>domicilios</option><option>descuento</option></select></div><div><label>Valor</label><input id="empAmount" class="input" type="number" value="65000"></div><div><label>Método</label><select id="empMethod" class="select"><option>efectivo</option><option>nequi</option><option>transferencia</option></select></div><div class="full"><label>Detalle</label><input id="empDetail" class="input" value="Pago de turno"></div><div class="full"><button class="btn yellow block" onclick="window.__saveEmployeePayment()">Guardar pago</button></div></div>`);
window.__saveEmployeePayment = async () => { const row={id:uid('ep'),employee_id:$('empPayId').value,concept:$('empConcept').value,amount:+$('empAmount').value||0,method:$('empMethod').value,detail:$('empDetail').value,created_at:Date.now(),created_by:state.user.id}; state.employeePayments.push(row); await dbUpsert(TABLES.employeePayments,row); closeModal(); render(); };
window.__expenseModal = () => openModal(`<div class="title"><div><h2>Nuevo gasto o proveedor</h2></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Tipo</label><select id="exType" class="select"><option value="proveedor">Proveedor</option><option value="servicio">Servicio</option><option value="compra">Compra</option><option value="gasto">Gasto</option></select></div><div><label>Valor</label><input id="exAmount" class="input" type="number" value="100000"></div><div><label>Método</label><select id="exMethod" class="select"><option>efectivo</option><option>nequi</option><option>transferencia</option><option>tarjeta</option></select></div><div class="full"><label>Detalle</label><input id="exDetail" class="input" value="Pago proveedor"></div><div class="full"><button class="btn yellow block" onclick="window.__saveExpense()">Guardar gasto</button></div></div>`);
window.__saveExpense = async () => { const row={id:uid('ex'),created_at:Date.now(),type:$('exType').value,amount:+$('exAmount').value||0,method:$('exMethod').value,detail:$('exDetail').value}; state.expenses.push(row); await dbUpsert(TABLES.expenses,row); closeModal(); render(); };


function users() {
  if (state.user.role !== 'super_admin') {
    return `<div class="empty">Solo el super admin puede crear usuarios internos.</div>`;
  }
  const profileRows = (state.profiles || []).filter(p => p.role);
  return `<div class="grid two">
    <div class="card">
      <div class="title"><div><h2>Crear usuario interno</h2><p>El empleado entra con usuario y contraseña. No necesita correo.</p></div></div>
      <div class="form">
        <div><label>Nombre</label><input id="newUserName" class="input" value="Nuevo usuario"></div>
        <div><label>Usuario</label><input id="newUsername" class="input" value="mesero1" autocomplete="off"></div>
        <div><label>Contraseña temporal</label><input id="newPassword" class="input" type="password" value="123456"></div>
        <div><label>Rol</label><select id="newRole" class="select">
          <option value="mesero">Mesero</option>
          <option value="cajero">Cajero</option>
          <option value="cocina">Cocina / producción</option>
          <option value="domicilio">Domiciliario</option>
          <option value="gerente">Gerente</option>
          <option value="super_admin">Super admin</option>
        </select></div>
        <div class="full"><button class="btn yellow block" onclick="window.__createInternalUser()">Crear usuario</button></div>
      </div>
      <p class="small">Correo técnico automático: usuario@luza.local. La creación real en Firebase Auth se hace con Cloud Functions.</p>
    </div>
    <div class="card">
      <div class="title"><div><h2>Usuarios registrados</h2><p>Perfiles activos en Firestore.</p></div></div>
      <div class="list">${profileRows.map(u => `<div class="line"><div><strong>${esc(u.name || u.username || 'Usuario')}</strong><span class="small">${esc(u.username || '')} · ${esc(u.email || '')} · ${esc(ROLES[u.role] || u.role)}</span></div><span class="status ${u.isActive === false ? 's-bad':'s-ok'}">${u.isActive === false ? 'Inactivo':'Activo'}</span></div>`).join('') || '<div class="empty">Aquí aparecerán los usuarios creados en Firebase.</div>'}</div>
    </div>
  </div>`;
}

function settings() {
  const tabs = [['products','Productos'],['tables','Mesas'],['people','Usuarios/empleados'],['clients','Clientes'],['providers','Proveedores']];
  return `<div class="tabs">${tabs.map(t=>`<button class="tab ${state.tab===t[0]?'active':''}" onclick="window.__setTab('${t[0]}')">${t[1]}</button>`).join('')}</div>${state.tab==='products'?settingsProducts():state.tab==='tables'?settingsTables():state.tab==='people'?settingsPeople():state.tab==='clients'?settingsClients():settingsProviders()}`;
}
window.__setTab = (t) => { state.tab=t; render(); };
function settingsProducts(){ return `<div class="card"><div class="title"><div><h2>Productos, precios, costos y stock</h2><p>Bebidas quedan junto con cocina/producción.</p></div><button class="btn yellow" onclick="window.__addProduct()">Nuevo producto</button></div><div class="editor">${state.products.map(p=>`<div class="edit-row prod-row"><input class="input" value="${esc(p.name)}" onchange="window.__updProduct('${p.id}','name',this.value)"><input class="input" value="${esc(p.category)}" onchange="window.__updProduct('${p.id}','category',this.value)"><select class="select" onchange="window.__updProduct('${p.id}','area',this.value)"><option value="cocina" ${p.area==='cocina'?'selected':''}>Cocina/producción</option></select><input class="input" type="number" value="${p.price}" onchange="window.__updProduct('${p.id}','price',+this.value)"><input class="input" type="number" value="${p.cost}" onchange="window.__updProduct('${p.id}','cost',+this.value)"><input class="input" type="number" value="${p.stock}" onchange="window.__updProduct('${p.id}','stock',+this.value)"><div class="line-actions"><button class="btn small ${p.active?'white':'yellow'}" onclick="window.__toggleProduct('${p.id}')">${p.active?'Ocultar':'Activar'}</button><button class="btn small red" onclick="window.__soldOut('${p.id}')">Agotado</button></div></div>`).join('')}</div></div>`; }
function settingsTables(){ return `<div class="grid two"><div class="card"><div class="title"><div><h2>Crear mesas</h2><p>También disponible para el mesero.</p></div></div><div class="form"><div><label>Salón</label><select id="btRoom" class="select">${state.rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div><div><label>Cantidad</label><input id="btQty" class="input" type="number" value="4"></div><div><label>Prefijo</label><input id="btPrefix" class="input" value="Mesa"></div><div><label>Número inicial</label><input id="btStart" class="input" type="number" value="${state.tables.length+1}"></div><div><label>Capacidad</label><input id="btCap" class="input" type="number" value="4"></div><div><label>Nuevo salón</label><input id="newRoomName" class="input" value="VIP"></div><div class="full toolbar"><button class="btn yellow" onclick="window.__batchTables()">Crear mesas</button><button class="btn white" onclick="window.__addRoom()">Crear salón</button></div></div></div><div class="card"><div class="title"><div><h2>Mesas actuales</h2></div></div><div class="editor">${state.tables.map(t=>`<div class="edit-row table-row"><input class="input" value="${esc(t.name)}" onchange="window.__updTable('${t.id}','name',this.value)"><select class="select" onchange="window.__updTable('${t.id}','room_id',this.value)">${state.rooms.map(r=>`<option value="${r.id}" ${r.id===t.room_id?'selected':''}>${esc(r.name)}</option>`).join('')}</select><input class="input" type="number" value="${t.capacity}" onchange="window.__updTable('${t.id}','capacity',+this.value)"><button class="btn small ${t.active?'white':'yellow'}" onclick="window.__toggleTable('${t.id}')">${t.active?'Desactivar':'Activar'}</button><button class="btn small red" onclick="window.__deleteTable('${t.id}')">Eliminar</button></div>`).join('')}</div></div></div>`; }
function settingsPeople(){ return `<div class="grid two"><div class="card"><div class="title"><div><h2>Empleados</h2></div><button class="btn yellow" onclick="window.__addEmployee()">Nuevo empleado</button></div><div class="editor">${state.employees.map(e=>`<div class="edit-row people-row"><input class="input" value="${esc(e.name)}" onchange="window.__updEmployee('${e.id}','name',this.value)"><select class="select" onchange="window.__updEmployee('${e.id}','role',this.value)">${Object.entries(ROLES).filter(([r])=>!SUPER_ROLES.includes(r)).map(([r,l])=>`<option value="${r}" ${e.role===r?'selected':''}>${l}</option>`).join('')}</select><input class="input" type="number" value="${e.base_pay}" onchange="window.__updEmployee('${e.id}','base_pay',+this.value)"><span class="status ${e.active?'s-ok':'s-bad'}">${e.active?'Activo':'Inactivo'}</span><button class="btn small white" onclick="window.__toggleEmployee('${e.id}')">${e.active?'Desactivar':'Activar'}</button></div>`).join('')}</div></div><div class="card black"><h2>Usuarios del sistema</h2><p>Los usuarios reales se crean desde el módulo Usuarios, visible para super admin. Aquí se manejan empleados y pagos.</p></div></div>`; }
function settingsClients(){ return `<div class="card"><div class="title"><div><h2>Clientes crédito</h2></div><button class="btn yellow" onclick="window.__newCustomerModal()">Nuevo cliente</button></div><div class="editor">${state.customers.filter(c=>c.id!=='c0').map(c=>`<div class="edit-row people-row"><input class="input" value="${esc(c.name)}" onchange="window.__updCustomer('${c.id}','name',this.value)"><input class="input" value="${esc(c.phone)}" onchange="window.__updCustomer('${c.id}','phone',this.value)"><input class="input" type="number" value="${c.credit_limit}" onchange="window.__updCustomer('${c.id}','credit_limit',+this.value)"><span class="status ${c.balance>0?'s-warn':'s-ok'}">${money.format(c.balance)}</span><button class="btn small green" onclick="window.__payCreditModal('${c.id}')">Abono</button></div>`).join('')}</div></div>`; }
function settingsProviders(){ return `<div class="card"><div class="title"><div><h2>Proveedores y gastos</h2></div><button class="btn yellow" onclick="window.__expenseModal()">Nuevo gasto</button></div><div class="list">${state.expenses.map(e=>`<div class="line"><div><strong>${esc(e.detail)}</strong><span class="small">${e.type} · ${money.format(e.amount)} · ${e.method}</span></div></div>`).join('')}</div></div>`; }
window.__quickTableModal = () => { state.tab='tables'; openModal(`<div class="title"><div><h2>Crear mesas rápido</h2><p>Disponible en la interfaz del mesero.</p></div><button class="btn white" onclick="window.__closeModal()">Cerrar</button></div><div class="form"><div><label>Salón</label><select id="btRoom" class="select">${state.rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div><div><label>Cantidad</label><input id="btQty" class="input" type="number" value="2"></div><div><label>Prefijo</label><input id="btPrefix" class="input" value="Mesa"></div><div><label>Número inicial</label><input id="btStart" class="input" type="number" value="${state.tables.length+1}"></div><div><label>Capacidad</label><input id="btCap" class="input" type="number" value="4"></div><div class="full"><button class="btn yellow block" onclick="window.__batchTables();window.__closeModal()">Crear mesas</button></div></div>`); };
window.__batchTables = async () => { const roomId=$('btRoom').value, rm=room(roomId); const qty=+$('btQty').value||0, start=+$('btStart').value||1, cap=+$('btCap').value||4, prefix=$('btPrefix').value||'Mesa'; for(let i=0;i<qty;i++){ const t={id:uid('tbl'),name:`${prefix} ${start+i}`,room_id:roomId,room:rm?.name,capacity:cap,active:true,created_at:Date.now()}; state.tables.push(t); await dbUpsert(TABLES.tables,t); } notify(`${qty} mesas creadas.`, 'ready'); render(); };
window.__addRoom = async () => { const r={id:uid('room'),name:$('newRoomName').value||'Nuevo salón',created_at:Date.now()}; state.rooms.push(r); await dbUpsert(TABLES.rooms,r); render(); };
window.__updProduct = async (id,field,value) => { const p=product(id); p[field]=value; await dbUpsert(TABLES.products,p); render(); };
window.__toggleProduct = async (id) => { const p=product(id); p.active=!p.active; await dbUpsert(TABLES.products,p); render(); };
window.__soldOut = async (id) => { const p=product(id); p.stock=0; await dbUpsert(TABLES.products,p); notify(`${p.name} marcado como agotado.`, 'urgent'); render(); };
window.__addProduct = async () => { const p={id:uid('prd'),name:'Nuevo producto',category:'Platos',area:'cocina',price:15000,cost:8000,stock:10,min_stock:3,active:true,created_at:Date.now()}; state.products.push(p); await dbUpsert(TABLES.products,p); render(); };
window.__updTable = async (id,field,value) => { const t=table(id); t[field]=value; if(field==='room_id') t.room=room(value)?.name; await dbUpsert(TABLES.tables,t); render(); };
window.__toggleTable = async (id) => { if(activeOrder(id)) return notify('La mesa tiene pedido activo.', 'urgent'); const t=table(id); t.active=!t.active; await dbUpsert(TABLES.tables,t); render(); };
window.__deleteTable = async (id) => { if(activeOrder(id)) return notify('La mesa tiene pedido activo.', 'urgent'); state.tables=state.tables.filter(t=>t.id!==id); await dbDelete(TABLES.tables,id); render(); };
window.__addEmployee = async () => { const e={id:uid('emp'),name:'Nuevo empleado',role:'mesero',base_pay:60000,active:true,created_at:Date.now()}; state.employees.push(e); await dbUpsert(TABLES.employees,e); render(); };
window.__updEmployee = async (id,field,value) => { const e=employee(id); e[field]=value; await dbUpsert(TABLES.employees,e); render(); };
window.__toggleEmployee = async (id) => { const e=employee(id); e.active=!e.active; await dbUpsert(TABLES.employees,e); render(); };
window.__updCustomer = async (id,field,value) => { const c=customer(id); c[field]=value; await dbUpsert(TABLES.customers,c); render(); };
window.__exportExcel = () => { const html=`<html><head><meta charset="utf-8"></head><body><h1>Reporte gerencial Piqueteadero Luza</h1><h2>Resumen</h2><table border="1"><tr><th>Ventas</th><th>Costo producto</th><th>Gastos</th><th>Empleados</th><th>Utilidad neta</th></tr><tr><td>${state.sales.reduce((a,s)=>a+s.total,0)}</td><td>${state.sales.reduce((a,s)=>a+s.cost,0)}</td><td>${state.expenses.reduce((a,e)=>a+e.amount,0)}</td><td>${state.employeePayments.reduce((a,e)=>a+e.amount,0)}</td><td>${state.sales.reduce((a,s)=>a+s.total-s.cost,0)-state.expenses.reduce((a,e)=>a+e.amount,0)-state.employeePayments.reduce((a,e)=>a+e.amount,0)}</td></tr></table><h2>Ventas</h2><table border="1"><tr><th>Fecha</th><th>Tipo</th><th>Método</th><th>Total</th><th>Costo</th></tr>${state.sales.map(s=>`<tr><td>${new Date(s.created_at).toLocaleString('es-CO')}</td><td>${s.type}</td><td>${s.method}</td><td>${s.total}</td><td>${s.cost}</td></tr>`).join('')}</table><h2>Pagos empleados</h2><table border="1"><tr><th>Fecha</th><th>Empleado</th><th>Concepto</th><th>Valor</th><th>Método</th></tr>${state.employeePayments.map(p=>`<tr><td>${new Date(p.created_at).toLocaleString('es-CO')}</td><td>${employee(p.employee_id)?.name||''}</td><td>${p.concept}</td><td>${p.amount}</td><td>${p.method}</td></tr>`).join('')}</table><h2>Productos</h2><table border="1"><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th></tr>${state.products.map(p=>`<tr><td>${p.name}</td><td>${p.category}</td><td>${p.price}</td><td>${p.cost}</td><td>${p.stock}</td></tr>`).join('')}</table></body></html>`; const blob=new Blob([html],{type:'application/vnd.ms-excel'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='reporte-gerencial-luza.xls'; a.click(); URL.revokeObjectURL(a.href); };

window.__createInternalUser = async () => {
  const name = $('newUserName')?.value?.trim();
  const username = $('newUsername')?.value?.trim().toLowerCase().replace(/\s+/g,'');
  const password = $('newPassword')?.value;
  const role = $('newRole')?.value;

  if (!configured) return notify('Firebase no está configurado. No se pueden crear usuarios reales.', 'urgent');
  if (state.user.role !== 'super_admin') return notify('Solo el super admin puede crear usuarios.', 'urgent');
  if (!name || !username || !password || !role) return notify('Completa nombre, usuario, PIN y rol.', 'urgent');
  if (password.length < 6) return notify('El PIN/contraseña debe tener mínimo 6 caracteres.', 'urgent');

  try {
    const result = await createInternalUserFn({ name, username, password, role });
    notify(`Usuario creado: ${result.data.username}`, 'soft');
    await loadFromFirebase();
    render();
  } catch (error) {
    notify(`No se pudo crear el usuario: ${error.message}`, 'urgent');
  }
};
boot();
