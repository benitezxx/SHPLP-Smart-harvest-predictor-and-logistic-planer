// --- Sidebar responsive ---
const sidebar = document.getElementById('sidebar');
document.getElementById('openSidebar')?.addEventListener('click', ()=> sidebar.classList.add('open'));
document.getElementById('closeSidebar')?.addEventListener('click', ()=> sidebar.classList.remove('open'));

// --- Tabs ---
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tabpanel');
tabs.forEach(t => t.addEventListener('click', ()=>{
  tabs.forEach(x=>x.classList.remove('active'));
  panels.forEach(p=>p.classList.add('hide'));
  t.classList.add('active');
  document.querySelector(`.tabpanel[data-panel="${t.dataset.tab}"]`)?.classList.remove('hide');
}));

// --- Campos ---
const inpNombre = document.getElementById('inpNombre');
const inpEmail = document.getElementById('inpEmail');
const selRol = document.getElementById('selRol');
const inpOrg = document.getElementById('inpOrg');
const imgAvatar = document.getElementById('imgAvatar');
const inpAvatar = document.getElementById('inpAvatar');

const pwdActual = document.getElementById('pwdActual');
const pwdNueva = document.getElementById('pwdNueva');
const pwdConfirm = document.getElementById('pwdConfirm');
const pwdMsg = document.getElementById('pwdMsg');
const btnCambiarPwd = document.getElementById('btnCambiarPwd');

const sel2FA = document.getElementById('sel2FA');

const selLang = document.getElementById('selLang');
const selUnits = document.getElementById('selUnits');
const selDateFmt = document.getElementById('selDateFmt');
const selTheme = document.getElementById('selTheme');
const inpTimezone = document.getElementById('inpTimezone');

const chkEmail = document.getElementById('chkEmail');
const chkSMS = document.getElementById('chkSMS');
const chkInApp = document.getElementById('chkInApp');
const quietFrom = document.getElementById('quietFrom');
const quietTo = document.getElementById('quietTo');
const dailyAt = document.getElementById('dailyAt');

const inpApiKey = document.getElementById('inpApiKey');
const btnVerApi = document.getElementById('btnVerApi');
const btnRegenApi = document.getElementById('btnRegenApi');
const inpWebhook = document.getElementById('inpWebhook');

const btnQuitarAvatar = document.getElementById('btnQuitarAvatar');
const btnSaveAll = document.getElementById('btnSaveAll');
const btnLogout = document.getElementById('btnLogout');
const btnDeactivate = document.getElementById('btnDeactivate');
const toast = document.getElementById('toast');

// --- Util ---
const STORAGE_KEY = 'smart_harvest_profile';
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), 2000);
}
function generateApiKey(){
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function save(){
  const data = {
    nombre: inpNombre.value.trim(),
    email: inpEmail.value.trim(),
    rol: selRol.value,
    org: inpOrg.value.trim(),
    avatar: imgAvatar.src || '',
    pref: {
      lang: selLang.value, units: selUnits.value, dateFmt: selDateFmt.value, theme: selTheme.value, tz: inpTimezone.value.trim()
    },
    notif: {
      email: chkEmail.checked, sms: chkSMS.checked, inapp: chkInApp.checked,
      quietFrom: quietFrom.value, quietTo: quietTo.value, dailyAt: dailyAt.value
    },
    api: {
      key: inpApiKey.value, webhook: inpWebhook.value.trim()
    },
    security: { mfa: sel2FA.value }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  showToast('Cambios guardados');
}
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw){
    // valores por defecto
    inpNombre.value = 'Usuario Smart';
    inpEmail.value = 'usuario@smart-harvest.local';
    selRol.value = 'operador';
    inpOrg.value = 'Agro MX';
    imgAvatar.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="100%" height="100%" fill="#0f1b2e"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="64" fill="#94a3b8">SH</text></svg>
    `);
    inpApiKey.value = generateApiKey();
    inpTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City';
    return;
  }
  try{
    const d = JSON.parse(raw);
    inpNombre.value = d.nombre || '';
    inpEmail.value = d.email || '';
    selRol.value = d.rol || 'operador';
    inpOrg.value = d.org || '';
    imgAvatar.src = d.avatar || '';
    selLang.value = d.pref?.lang || 'es';
    selUnits.value = d.pref?.units || 'metric';
    selDateFmt.value = d.pref?.dateFmt || 'DMY';
    selTheme.value = d.pref?.theme || 'auto';
    inpTimezone.value = d.pref?.tz || 'America/Mexico_City';
    chkEmail.checked = d.notif?.email ?? true;
    chkSMS.checked = d.notif?.sms ?? false;
    chkInApp.checked = d.notif?.inapp ?? true;
    quietFrom.value = d.notif?.quietFrom || '22:00';
    quietTo.value = d.notif?.quietTo || '06:00';
    dailyAt.value = d.notif?.dailyAt || '08:00';
    inpApiKey.value = d.api?.key || generateApiKey();
    inpWebhook.value = d.api?.webhook || '';
    sel2FA.value = d.security?.mfa || 'off';
  }catch(e){
    console.warn('Perfil corrupto, reiniciando', e);
    localStorage.removeItem(STORAGE_KEY);
    load();
  }
}

// --- Avatar upload ---
inpAvatar.addEventListener('change', (e)=>{
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Archivo no válido'); return; }
  const reader = new FileReader();
  reader.onload = (ev)=>{ imgAvatar.src = ev.target.result; showToast('Avatar actualizado'); };
  reader.readAsDataURL(file);
});
btnQuitarAvatar.addEventListener('click', ()=>{
  imgAvatar.src = '';
  showToast('Avatar quitado');
});

// --- Cambiar contraseña (demo) ---
btnCambiarPwd.addEventListener('click', ()=>{
  const a = pwdActual.value, n = pwdNueva.value, c = pwdConfirm.value;
  if (!a || !n || !c){ pwdMsg.textContent = 'Completa todos los campos.'; return; }
  if (n.length < 8){ pwdMsg.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.'; return; }
  if (!/[A-Z]/.test(n) || !/[0-9]/.test(n)){ pwdMsg.textContent = 'Requiere una mayúscula y un número.'; return; }
  if (n !== c){ pwdMsg.textContent = 'La confirmación no coincide.'; return; }
  // Simulado: limpiar campos
  pwdActual.value = pwdNueva.value = pwdConfirm.value = '';
  pwdMsg.textContent = 'Contraseña actualizada (demo).';
  showToast('Contraseña cambiada');
});

// --- API Key ---
let apiVisible = false;
btnVerApi.addEventListener('click', ()=>{
  apiVisible = !apiVisible;
  if (apiVisible){
    inpApiKey.type = 'text'; btnVerApi.textContent = 'Ocultar';
  } else {
    inpApiKey.type = 'password'; btnVerApi.textContent = 'Ver';
  }
});
btnRegenApi.addEventListener('click', ()=>{
  inpApiKey.type = 'text';
  inpApiKey.value = generateApiKey();
  showToast('Nueva API Key generada');
  setTimeout(()=>{ inpApiKey.type = apiVisible ? 'text' : 'password'; }, 1200);
});

// --- Guardar todo ---
btnSaveAll.addEventListener('click', save);

// --- Logout / Deactivate (demo) ---
btnLogout.addEventListener('click', ()=>{
  showToast('Sesión cerrada (demo).');
});
btnDeactivate.addEventListener('click', ()=>{
  if (confirm('¿Seguro que deseas desactivar tu cuenta? Esta acción es irreversible (demo).')){
    localStorage.removeItem(STORAGE_KEY);
    showToast('Cuenta desactivada (demo).');
  }
});

// --- Inicializar ---
document.addEventListener('DOMContentLoaded', ()=>{
  load();
  // ocultar API key por defecto
  inpApiKey.type = 'password';
});
