const form = document.getElementById('loginForm');
const userId = document.getElementById('userId');
const password = document.getElementById('password');
const formError = document.getElementById('formError');
const pwdError = document.getElementById('passwordError');
const togglePwd = document.getElementById('togglePwd');

const recoverBtn = document.getElementById('recoverBtn');
const recoverModal = document.getElementById('recoverModal');
const cancelRecover = document.getElementById('cancelRecover');
const sendRecover = document.getElementById('sendRecover');
const recoverInput = document.getElementById('recoverInput');
const recoverError = document.getElementById('recoverError');

// Mostrar/ocultar contraseña
togglePwd.addEventListener('click', () => {
  const isPwd = password.type === 'password';
  password.type = isPwd ? 'text' : 'password';
  togglePwd.textContent = isPwd ? '🙈' : '👁️';
});

// Validación del formulario
form.addEventListener('submit', (e) => {
  e.preventDefault();
  formError.textContent = '';
  pwdError.textContent = '';

  const uid = userId.value.trim();
  const pwd = password.value;

  if(!uid){
    formError.textContent = 'Por favor ingresa tu ID de usuario.';
    return;
  }
  if(!pwd || pwd.length < 6){
    pwdError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  // Simulación de éxito
  formError.style.color = '#22c55e';
  formError.textContent = 'Autenticación exitosa (demo). Redirigiendo…';
  setTimeout(()=> window.location.href = '/dashboard.html', 800);
});

// Modal recuperación
const openModal = () => { recoverModal.style.display = 'flex'; recoverInput.value=''; };
const closeModal = () => { recoverModal.style.display = 'none'; };

recoverBtn.addEventListener('click', openModal);
cancelRecover.addEventListener('click', closeModal);
recoverModal.addEventListener('click', (e)=>{ if(e.target === recoverModal) closeModal(); });

sendRecover.addEventListener('click', () => {
  const value = recoverInput.value.trim();
  recoverError.textContent = '';
  if(!value){
    recoverError.textContent = 'Ingresa un ID o correo válido.';
    return;
  }
  closeModal();
  alert('Si el ID/correo existe, te enviaremos un enlace para restablecer tu contraseña.');
});
