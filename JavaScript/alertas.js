// --- Sidebar responsive ---
const sidebar = document.getElementById('sidebar');
document.getElementById('openSidebar')?.addEventListener('click', ()=> sidebar.classList.add('open'));
document.getElementById('closeSidebar')?.addEventListener('click', ()=> sidebar.classList.remove('open'));

// --- Elementos UI ---
const q = document.getElementById('q');
const fTipo = document.getElementById('fTipo');
const fSeveridad = document.getElementById('fSeveridad');
const fEstado = document.getElementById('fEstado');
const fZona = document.getElementById('fZona');
const fDesde = document.getElementById('fDesde');
const fHasta = document.getElementById('fHasta');

const tblBody = document.querySelector('#tblAlertas tbody');
const ths = document.querySelectorAll('#tblAlertas thead th[data-sort]');
const chkAll = document.getElementById('chkAll');

const btnExportCSV = document.getElementById('btnExportCSV');
const btnResolveSelected = document.getElementById('btnResolveSelected');
const btnSnoozeSelected = document.getElementById('btnSnoozeSelected');
const btnSilenceSelected = document.getElementById('btnSilenceSelected');

const kpiAlta = document.getElementById('kpiAlta');
const kpiMedia = document.getElementById('kpiMedia');
const kpiBaja = document.getElementById('kpiBaja');
const kpiAbiertas = document.getElementById('kpiAbiertas');

const pageInfo = document.getElementById('pageInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageSizeSel = document.getElementById('pageSize');

const detailPanel = document.getElementById('panelDetalle');
const detailBody = detailPanel.querySelector('.detail-body');

// --- Datos simulados ---
const tipos = ['plaga','enfermedad','clima','logistica'];
const zonas = ['norte','centro','sur'];
const severidades = ['alta','media','baja'];
const estados = ['abierta','pospuesta','silenciada','resuelta'];

function rand(seed=1){ let x=Math.sin(seed)*10000; return x-Math.floor(x); }
function pick(arr, seed){ return arr[Math.floor(rand(seed)*arr.length)%arr.length]; }
function sentence(seed){
  const msgs = [
    'Actividad inusual detectada en trampas.',
    'Humedad elevada favorece esporulación.',
    'Rachas de viento previstas &gt; 60 km/h.',
    'Riesgo de retraso por disponibilidad de transporte.',
    'Temperaturas nocturnas por debajo del umbral.',
    'NDVI con descenso sostenido 3 días.'
  ];
  return msgs[Math.floor(rand(seed*7)*msgs.length)%msgs.length];
}
function makeAlert(i){
  const now = new Date();
  const dt = new Date(now.getTime() - (i * 7 + (i%5)*3) * 60 * 60 * 1000); // horas atrás
  const tipo = pick(tipos, i+2);
  const zona = pick(zonas, i+3);
  const severidad = pick(severidades, i+4);
  const estado = pick(estados, i+5);
  const lote = `Lote ${String.fromCharCode(65 + (i%6))}-${(i%12)+1}`;
  return {
    id: 'A'+(1000+i),
    fecha: dt,
    tipo, zona, severidad, estado,
    mensaje: sentence(i+11),
    lote,
    recomendaciones: [
      'Monitorear campo y confirmar presencia.',
      'Aplicar tratamiento preventivo si se confirma umbral.',
      'Reprogramar riego para disminuir humedad foliar.',
      'Verificar disponibilidad de cuadrilla para la ventana óptima.'
    ].slice(0, 1 + (i%3))
  };
}
const DATA = Array.from({length: 120}, (_,i)=> makeAlert(i+1));

// --- Estado de UI / orden / paginación ---
let sort = { key: 'fecha', dir: 'desc' };
let currentPage = 1;
let pageSize = parseInt(pageSizeSel.value, 10);

// --- Utilidades ---
function fmtDate(d){
  return d.toLocaleString('es-MX', {
    year:'2-digit', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit'
  });
}
function sevBadge(sev){
  return sev === 'alta' ? 'sev-alta' : sev === 'media' ? 'sev-media' : 'sev-baja';
}
function stateClass(s){ return 'state '+s; }
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// --- Filtro maestro ---
function getFilters(){
  return {
    q: (q.value || '').trim().toLowerCase(),
    tipo: fTipo.value,
    severidad: fSeveridad.value,
    estado: fEstado.value,
    zona: fZona.value,
    desde: fDesde.value ? new Date(fDesde.value) : null,
    hasta: fHasta.value ? new Date(fHasta.value) : null
  };
}
function applyFilters(data, f){
  return data.filter(a=>{
    if (f.q){
      const text = (a.mensaje+' '+a.lote+' '+a.zona).toLowerCase();
      if (!text.includes(f.q)) return false;
    }
    if (f.tipo && a.tipo !== f.tipo) return false;
    if (f.severidad && a.severidad !== f.severidad) return false;
    if (f.estado && a.estado !== f.estado) return false;
    if (f.zona && a.zona !== f.zona) return false;
    if (f.desde && a.fecha < f.desde) return false;
    if (f.hasta){
      const h = new Date(f.hasta); h.setDate(h.getDate()+1); // incluir día completo
      if (a.fecha > h) return false;
    }
    return true;
  });
}
function applySort(data, s){
  return data.slice().sort((a,b)=>{
    let av=a[s.key], bv=b[s.key];
    if (s.key === 'fecha'){ av = a.fecha.getTime(); bv = b.fecha.getTime(); }
    if (av < bv) return s.dir === 'asc' ? -1 : 1;
    if (av > bv) return s.dir === 'asc' ? 1 : -1;
    return 0;
  });
}
function paginate(data, page, size){
  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1,page), pages);
  const start = (p-1)*size;
  return { page: p, pages, total, items: data.slice(start, start+size) };
}

// --- Render KPIs ---
function renderKPIs(list){
  kpiAlta.textContent = list.filter(a=>a.severidad==='alta').length;
  kpiMedia.textContent = list.filter(a=>a.severidad==='media').length;
  kpiBaja.textContent = list.filter(a=>a.severidad==='baja').length;
  kpiAbiertas.textContent = list.filter(a=>a.estado==='abierta').length;
}

// --- Render tabla ---
function renderTable(){
  const f = getFilters();
  const filtered = applyFilters(DATA, f);
  const sorted = applySort(filtered, sort);
  const page = paginate(sorted, currentPage, pageSize);

  // header info
  pageInfo.textContent = `${page.page} / ${page.pages} — ${page.total} alertas`;
  prevPage.disabled = page.page === 1;
  nextPage.disabled = page.page === page.pages;

  // rows
  tblBody.innerHTML = page.items.map(a=>`
    <tr data-id="${a.id}">
      <td><input type="checkbox" class="rowChk" data-id="${a.id}" /></td>
      <td>${fmtDate(a.fecha)}</td>
      <td><span class="badge">${a.tipo}</span></td>
      <td><span class="badge ${sevBadge(a.severidad)}">${a.severidad}</span></td>
      <td>${a.zona}</td>
      <td>${escapeHtml(a.mensaje)} <span class="tag">${a.lote}</span></td>
      <td><span class="${stateClass(a.estado)}">${a.estado}</span></td>
      <td class="row-actions">
        <button class="btn btn-ghost act-resolver" data-id="${a.id}">Resolver</button>
        <button class="btn btn-ghost act-posponer" data-id="${a.id}">+24h</button>
        <button class="btn btn-ghost act-silenciar" data-id="${a.id}">Silenciar</button>
      </td>
    </tr>
  `).join('');

  // click para detalle
  tblBody.querySelectorAll('tr').forEach(tr=>{
    tr.addEventListener('click', (e)=>{
      if (e.target.closest('input,button')) return; // no abrir detalle si fue acción directa
      const id = tr.getAttribute('data-id');
      openDetail(id);
    });
  });

  renderKPIs(filtered);
}

// --- Detalle ---
function openDetail(id){
  const al = DATA.find(x=>x.id===id);
  if (!al){
    detailBody.innerHTML = `<div class="muted">No se encontró la alerta.</div>`;
    return;
  }
  detailBody.innerHTML = `
    <div style="display:grid; gap:10px">
      <div><strong>${al.tipo}</strong> • <span class="badge ${sevBadge(al.severidad)}">${al.severidad}</span> • <span class="${stateClass(al.estado)}">${al.estado}</span></div>
      <div class="muted small">${fmtDate(al.fecha)} • Zona ${al.zona} • ${al.lote}</div>
      <div>${al.mensaje}</div>
      <ul class="detail-list">
        ${al.recomendaciones.map(r=>`<li>${r}</li>`).join('')}
      </ul>
      <div class="row-actions">
        <button class="btn btn-primary" data-id="${al.id}" onclick="resolveOne('${al.id}')">Marcar resuelta</button>
        <button class="btn btn-ghost" data-id="${al.id}" onclick="snoozeOne('${al.id}')">Posponer 24h</button>
        <button class="btn btn-ghost" data-id="${al.id}" onclick="silenceOne('${al.id}')">Silenciar</button>
      </div>
    </div>
  `;
}

// --- Acciones por fila ---
function changeState(ids, newState){
  ids.forEach(id=>{
    const a = DATA.find(x=>x.id===id);
    if (!a) return;
    a.estado = newState;
    if (newState === 'pospuesta'){
      a.fecha = new Date(a.fecha.getTime() + 24*60*60*1000);
    }
  });
  renderTable();
}
function resolveOne(id){ changeState([id], 'resuelta'); }
function snoozeOne(id){ changeState([id], 'pospuesta'); }
function silenceOne(id){ changeState([id], 'silenciada'); }
window.resolveOne = resolveOne; // para onclick en HTML generado
window.snoozeOne = snoozeOne;
window.silenceOne = silenceOne;

// --- Acciones masivas ---
function getSelectedIds(){
  return Array.from(document.querySelectorAll('.rowChk:checked')).map(c=>c.getAttribute('data-id'));
}
btnResolveSelected.addEventListener('click', ()=>{
  const ids = getSelectedIds(); if (!ids.length) return;
  changeState(ids, 'resuelta'); chkAll.checked = false;
});
btnSnoozeSelected.addEventListener('click', ()=>{
  const ids = getSelectedIds(); if (!ids.length) return;
  changeState(ids, 'pospuesta'); chkAll.checked = false;
});
btnSilenceSelected.addEventListener('click', ()=>{
  const ids = getSelectedIds(); if (!ids.length) return;
  changeState(ids, 'silenciada'); chkAll.checked = false;
});
chkAll.addEventListener('change', ()=>{
  document.querySelectorAll('.rowChk').forEach(c=> c.checked = chkAll.checked);
});

// --- Exportar CSV ---
function toCSV(list){
  const header = ['id','fecha','tipo','severidad','zona','mensaje','lote','estado'].join(',');
  const rows = list.map(a=>[
    a.id, a.fecha.toISOString(), a.tipo, a.severidad, a.zona,
    a.mensaje.replace(/,/g,';'), a.lote, a.estado
  ].join(','));
  return [header, ...rows].join('\n');
}
btnExportCSV.addEventListener('click', ()=>{
  const filtered = applyFilters(DATA, getFilters());
  const csv = toCSV(filtered);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `alertas_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// --- Ordenar columnas ---
ths.forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.getAttribute('data-sort');
    if (sort.key === key){ sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'; }
    else { sort.key = key; sort.dir = 'asc'; }
    renderTable();
  });
});

// --- Paginación ---
prevPage.addEventListener('click', ()=>{ currentPage = Math.max(1, currentPage-1); renderTable(); });
nextPage.addEventListener('click', ()=>{ currentPage = currentPage+1; renderTable(); });
pageSizeSel.addEventListener('change', ()=>{
  pageSize = parseInt(pageSizeSel.value, 10); currentPage = 1; renderTable();
});

// --- Búsqueda y filtros ---
[q,fTipo,fSeveridad,fEstado,fZona,fDesde,fHasta].forEach(el=>{
  el.addEventListener('input', ()=>{
    currentPage = 1; renderTable();
  });
});

// --- Init ---
document.addEventListener('DOMContentLoaded', ()=>{
  // rango por defecto: últimos 30 días
  const h = new Date(); const d = new Date(); d.setDate(d.getDate()-30);
  fDesde.valueAsDate = d; fHasta.valueAsDate = h;
  renderTable();
});
