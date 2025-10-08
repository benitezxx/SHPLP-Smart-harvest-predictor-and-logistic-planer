// --- Utilidades de UI (sidebar responsive) ---
const sidebar = document.getElementById('sidebar');
const openSidebar = document.getElementById('openSidebar');
const closeSidebar = document.getElementById('closeSidebar');
openSidebar?.addEventListener('click', () => sidebar.classList.add('open'));
closeSidebar?.addEventListener('click', () => sidebar.classList.remove('open'));

// --- Elementos ---
const selCultivo = document.getElementById('selCultivo');
const selZona = document.getElementById('selZona');
const inpHorizonte = document.getElementById('inpHorizonte');
const selModelo = document.getElementById('selModelo');
const selVista = document.getElementById('selVista');
const btnExportCSV = document.getElementById('btnExportCSV');
const btnRecalcular = document.getElementById('btnRecalcular');

const kpiRend = document.getElementById('kpiRend');
const kpiDeltaRend = document.getElementById('kpiDeltaRend');
const kpiPlaga = document.getElementById('kpiPlaga');
const kpiEnf = document.getElementById('kpiEnf');
const kpiPrecio = document.getElementById('kpiPrecio');
const kpiDeltaPrecio = document.getElementById('kpiDeltaPrecio');

const tblPredBody = document.querySelector('#tblPred tbody');
const predCanvas = document.getElementById('predChart');

// --- Datos simulados / generador ---
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateData({ weeks = 12, base = 7.2, noise = 0.4, trend = 0.03, seed = 42 }) {
  const labels = [];
  const pred = [];
  const low = [];
  const high = [];
  const historic = [];
  const today = new Date();

  for (let i = 0; i < weeks; i++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + i * 7);
    labels.push(dt);

    const rnd = (seededRandom(seed + i) - 0.5) * noise * 2;
    const value = base + trend * i + rnd;
    pred.push(Number(value.toFixed(2)));

    const ci = 0.35 + (seededRandom(seed * (i + 1)) * 0.25);
    low.push(Number((value - ci).toFixed(2)));
    high.push(Number((value + ci).toFixed(2)));

    // histórico (4 semanas previas)
    const h = base - 0.8 + (i - 4) * 0.02 + (seededRandom(seed / (i + 1) + 1) - 0.5) * 0.35;
    historic.push(Number(h.toFixed(2)));
  }

  // riesgos y precio (simples)
  const plagueProb = Math.min(95, Math.max(5, Math.round(20 + seededRandom(seed + 99) * 60)));
  const diseaseRisk = Math.min(95, Math.max(5, Math.round(15 + seededRandom(seed + 77) * 70)));
  const priceBase = 220 + seededRandom(seed + 5) * 80;
  const priceTrend = (seededRandom(seed + 6) - 0.5) * 8;
  const priceNow = priceBase + priceTrend;

  return { labels, pred, low, high, historic, plagueProb, diseaseRisk, priceNow };
}

// --- Chart (Chart.js) ---
let chart;
function renderChart(data) {
  if (chart) chart.destroy();

  const ctx = predCanvas.getContext('2d');

  // HiDPI
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  predCanvas.width = predCanvas.clientWidth * ratio;
  predCanvas.height = predCanvas.clientHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels.map(d => d.toISOString().slice(0,10)),
      datasets: [
        {
          label: 'Predicción',
          data: data.pred,
          borderWidth: 2,
          tension: 0.32,
          pointRadius: 0,
        },
        {
          label: 'Histórico',
          data: data.historic,
          borderDash: [4,4],
          borderWidth: 1.5,
          tension: 0.28,
          pointRadius: 0,
        },
        {
          label: 'IC Bajo',
          data: data.low,
          hidden: true
        },
        {
          label: 'IC Alto',
          data: data.high,
          hidden: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(38,50,68,.35)' },
          ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }
        },
        y: {
          grid: { color: 'rgba(38,50,68,.35)' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} t/ha`
          }
        }
      },
      elements: {
        line: {
          borderColor: '#22c55e'
        },
        point: { hoverRadius: 4 }
      }
    }
  });

  // Render banda de confianza (entre low y high)
  // Lo hacemos como área custom usando plugin simple
  const plugin = {
    id: 'ciBand',
    afterDatasetsDraw: (c, args, opts) => {
      const {ctx, chartArea, scales} = c;
      const x = scales.x;
      const y = scales.y;
      ctx.save();
      ctx.beginPath();
      data.labels.forEach((_, i) => {
        const px = x.getPixelForValue(i);
        const py = y.getPixelForValue(data.high[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      for (let i = data.labels.length - 1; i >= 0; i--) {
        const px = x.getPixelForValue(i);
        const py = y.getPixelForValue(data.low[i]);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(34,197,94,.18)';
      ctx.fill();
      ctx.restore();
    }
  };
  chart.config.plugins.push(plugin);
  chart.update();
}

// Redibujar en resize
const ro = new ResizeObserver(() => {
  if (!chart) return;
  renderChart(currentData);
});
ro.observe(predCanvas);

// --- Tabla ---
function renderTable(data, vista = 'rendimiento') {
  const rows = [];
  for (let i = 0; i < data.labels.length; i++) {
    const date = data.labels[i].toLocaleDateString('es-MX', { year:'2-digit', month:'2-digit', day:'2-digit' });
    const value = (vista === 'rendimiento') ? data.pred[i]
                : (vista === 'precio') ? (data.pred[i] * 30).toFixed(2) // proxy para demo
                : (vista === 'plaga') ? Math.min(99, Math.max(1, Math.round(data.pred[i]*9)))
                : Math.min(99, Math.max(1, Math.round(data.pred[i]*8)));
    rows.push(`
      <tr>
        <td>S${i+1}</td>
        <td>${date}</td>
        <td>${value}</td>
        <td>${data.low[i]}</td>
        <td>${data.high[i]}</td>
      </tr>
    `);
  }
  tblPredBody.innerHTML = rows.join('');
}

// --- KPIs ---
function renderKPIs(data, base) {
  const avg = (arr) => arr.reduce((a,b)=>a+b,0)/arr.length;
  kpiRend.textContent = `${avg(data.pred).toFixed(2)} t/ha`;
  const delta = ((data.pred[data.pred.length-1] - data.pred[0]) / Math.max(0.001, data.pred[0])) * 100;
  kpiDeltaRend.textContent = `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% vs. semana 1`;
  kpiDeltaRend.className = 'delta ' + (delta >= 0 ? 'up' : 'down');

  kpiPlaga.textContent = `${data.plagueProb}%`;
  kpiEnf.textContent = `${data.diseaseRisk}%`;

  kpiPrecio.textContent = `$ ${data.priceNow.toFixed(0)} /t`;
  const dpx = (seededRandom(base+11)-0.5) * 6;
  kpiDeltaPrecio.textContent = `${dpx >= 0 ? '▲' : '▼'} ${Math.abs(dpx).toFixed(1)}% semanal`;
  kpiDeltaPrecio.className = 'delta ' + (dpx >= 0 ? 'up' : 'down');
}

// --- Export CSV ---
function toCSV(data) {
  const header = ['semana','fecha','pred','ic_low','ic_high'].join(',');
  const rows = data.labels.map((d, i) =>
    [i+1, d.toISOString().slice(0,10), data.pred[i], data.low[i], data.high[i]].join(',')
  );
  return [header, ...rows].join('\n');
}

// --- Recalcular / actualizar ---
let currentData = null;
function recalc() {
  const weeks = Math.min(52, Math.max(4, parseInt(inpHorizonte.value || '12', 10)));
  const cultivo = selCultivo.value;
  const zona = selZona.value;
  const modelo = selModelo.value;

  // Ajustes básicos por cultivo/zona/modelo (solo para demo)
  const baseByCultivo = { maiz: 7.5, trigo: 5.2, soya: 3.1, aguacate: 9.0 };
  const base = (baseByCultivo[cultivo] || 6.5) + (zona === 'norte' ? -0.2 : zona === 'sur' ? 0.25 : 0);
  const trend = (modelo === 'lstm' ? 0.05 : modelo === 'xgboost' ? 0.04 : modelo === 'arima' ? 0.02 : 0.06);
  const noise = (modelo === 'arima' ? 0.3 : 0.4);

  currentData = generateData({ weeks, base, trend, noise, seed: base * 97 });
  renderChart(currentData);
  renderTable(currentData, selVista.value);
  renderKPIs(currentData, base);
}

// Eventos
[selCultivo, selZona, inpHorizonte, selModelo].forEach(el => el.addEventListener('change', recalc));
selVista.addEventListener('change', () => renderTable(currentData, selVista.value));
btnRecalcular.addEventListener('click', recalc);
btnExportCSV.addEventListener('click', () => {
  if (!currentData) return;
  const csv = toCSV(currentData);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `predicciones_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Inicializar
document.addEventListener('DOMContentLoaded', recalc);
