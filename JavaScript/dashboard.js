// --- Sidebar responsive ---
const sidebar = document.querySelector('.sidebar');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
openSidebarBtn?.addEventListener('click', ()=> sidebar.classList.add('open'));
closeSidebarBtn?.addEventListener('click', ()=> sidebar.classList.remove('open'));

// --- Botones de acciones ---
document.getElementById('refreshBtn')?.addEventListener('click', simulateRefresh);
document.getElementById('exportBtn')?.addEventListener('click', simulateExport);

// --- Selectores de filtros ---
const lotSelect = document.getElementById('lotSelect');
const metricSelect = document.getElementById('metricSelect');
lotSelect.addEventListener('change', updateChart);
metricSelect.addEventListener('change', updateChart);

// --- Datos mock (reemplaza con tu API si quieres) ---
const mockSeries = {
  'Lote A': [42, 46, 44, 49, 55, 58],
  'Lote B': [30, 28, 32, 34, 35, 40],
  'Lote C': [20, 22, 26, 25, 28, 30],
};
const labels = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'];

// --- Chart en Canvas ---
const canvas = document.getElementById('harvestChart');
const ctx = canvas.getContext('2d');
let deviceRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

/** Mide el tamaño CSS disponible del canvas. Si aún es 0, intenta con el contenedor. */
function measureCanvasSize(){
  // Preferimos el ancho del contenedor para evitar lecturas a 0 en el primer layout
  const host = canvas.parentElement || canvas;
  const rect = host.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width || host.clientWidth || canvas.clientWidth || 900);
  // La altura depende del CSS (.chart-card canvas { height: 360px; })
  const cssHeight = Math.max(1, canvas.clientHeight || 360);
  return { cssWidth, cssHeight };
}

/** Ajusta el buffer interno del canvas al tamaño CSS (con soporte HiDPI). */
function setupCanvas(){
  const { cssWidth, cssHeight } = measureCanvasSize();
  canvas.width = Math.floor(cssWidth * deviceRatio);
  canvas.height = Math.floor(cssHeight * deviceRatio);
  // Importante: NO fijamos style.width/height aquí para no interferir con el CSS (width:100%; height:360px)
  ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
}

/** Dibuja la gráfica si hay tamaño disponible; si no, reintenta en el próximo frame. */
function safeRender(){
  const { cssWidth, cssHeight } = measureCanvasSize();
  if (cssWidth < 2 || cssHeight < 2){
    // Aún sin layout final; reintenta en el siguiente frame
    requestAnimationFrame(safeRender);
    return;
  }
  setupCanvas();
  drawChart();
}

// Observa cambios de tamaño del contenedor para redibujar automáticamente
const ro = new ResizeObserver(() => {
  // Evita mucho trabajo: agrupa en el siguiente frame
  requestAnimationFrame(() => {
    setupCanvas();
    drawChart();
  });
});
ro.observe(canvas.parentElement || canvas);

// Re-render al cambiar el zoom/ratio del dispositivo
window.addEventListener('resize', () => {
  deviceRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  setupCanvas();
  drawChart();
});

// Asegura render tras carga total (CSS, fuentes)
window.addEventListener('load', () => {
  safeRender();
});

// Render inicial (si ya hubiera layout suficiente)
safeRender();

function getMetricFactor(){
  // Toneladas (1x) o Cajas (~40 cajas por tonelada como ejemplo)
  return metricSelect.value === 'cajas' ? 40 : 1;
}

function drawChart(){
  const w = canvas.width / deviceRatio;
  const h = canvas.height / deviceRatio;
  const padding = {top:24, right:20, bottom:40, left:48};

  ctx.clearRect(0,0,w,h);

  const base = mockSeries[lotSelect.value];
  const factor = getMetricFactor();
  const data = base.map(v => v * factor);

  const minV = 0;
  const maxV = Math.max(...data) * 1.25 || 1;

  // Ejes
  ctx.strokeStyle = 'rgba(148,163,184,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, h - padding.bottom);
  ctx.lineTo(w - padding.right, h - padding.bottom);
  ctx.stroke();

  // Grid Y
  const gridLines = 5;
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillStyle = 'rgba(148,163,184,.9)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for(let i=0;i<=gridLines;i++){
    const t = i / gridLines;
    const y = lerp(h - padding.bottom, padding.top, t);
    ctx.strokeStyle = 'rgba(148,163,184,.15)';
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
    const value = lerp(minV, maxV, t);
    ctx.fillText(formatNumber(value), padding.left - 8, y);
  }

  // Etiquetas X
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  labels.forEach((lab, i) => {
    const x = xFor(i, labels.length, padding.left, w - padding.right);
    const y = h - padding.bottom + 18;
    ctx.fillText(lab, x, y);
  });

  // Línea
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#22c55e';
  ctx.fillStyle = 'rgba(34,197,94,.12)';
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = xFor(i, data.length, padding.left, w - padding.right);
    const y = yFor(v, minV, maxV, h - padding.bottom, padding.top);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // Relleno bajo la línea
  ctx.lineTo(w - padding.right, h - padding.bottom);
  ctx.lineTo(padding.left, h - padding.bottom);
  ctx.closePath();
  ctx.fill();

  // Puntos
  ctx.fillStyle = '#86efac';
  data.forEach((v,i)=>{
    const x = xFor(i, data.length, padding.left, w - padding.right);
    const y = yFor(v, minV, maxV, h - padding.bottom, padding.top);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  });

  // Leyenda
  const legend = document.getElementById('chartLegend');
  const unit = metricSelect.value === 'cajas' ? 'cajas' : 't';
  legend.innerHTML = `
    <span><span class="dot" style="background:#22c55e"></span>${lotSelect.value}</span>
    <span class="muted">Unidad: ${unit}</span>
  `;
}

function xFor(i, n, left, right){
  if(n<=1) return left;
  const innerW = right - left;
  const step = innerW / (n - 1);
  return left + i * step;
}
function yFor(v, minV, maxV, bottom, top){
  const t = (v - minV) / Math.max(1e-6, (maxV - minV));
  return lerp(bottom, top, t);
}
function lerp(a,b,t){ return a + (b - a) * t; }

function formatNumber(x){
  const num = Math.round(x * 10) / 10;
  return Intl.NumberFormat('es-MX', {maximumFractionDigits:1}).format(num);
}

// Simulaciones de acciones
function simulateRefresh(){
  Object.keys(mockSeries).forEach(k=>{
    mockSeries[k] = mockSeries[k].map(v => Math.max(0, Math.round((v + (Math.random()*4-2))*10)/10));
  });
  document.getElementById('kpiYield').textContent = (240 + Math.random()*30).toFixed(1);
  document.getElementById('kpiOrders').textContent = Math.floor(12 + Math.random()*12);
  document.getElementById('kpiSensors').textContent = `${Math.floor(94 + Math.random()*8)}/102`;
  document.getElementById('kpiAlerts').textContent = Math.floor(3 + Math.random()*5);
  safeRender();
}

function simulateExport(){
  const a = document.createElement('a');
  const csv = buildCSV();
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  a.href = URL.createObjectURL(blob);
  a.download = `prediccion_${lotSelect.value.replace(/\s+/g,'_')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildCSV(){
  const factor = getMetricFactor();
  const unit = metricSelect.value === 'cajas' ? 'cajas' : 'toneladas';
  const data = mockSeries[lotSelect.value].map(v => v * factor);
  const rows = ['Semana,Valor ('+unit+')'];
  labels.forEach((lab,i)=> rows.push(`${lab},${data[i]}`));
  return rows.join('\n');
}

function updateChart(){
  safeRender();
}
