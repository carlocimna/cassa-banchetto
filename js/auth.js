/**
 * auth.js - Autenticazione locale con hash SHA-512
 * 
 * Per cambiare la password:
 * 1. Apri la console del browser su una qualsiasi pagina dell'app
 * 2. Esegui: generateHash('la-tua-nuova-password')
 * 3. Copia l'hash risultante e sostituiscilo nella variabile PASSWORD_HASH qui sotto
 */

// Hash SHA-512 della password "cassa2026"
// Per generare un nuovo hash: apri la console del browser e digita generateHash('nuova-password')
const PASSWORD_HASH = '550b33fd5304afe04049464becb02da7638c2caeaa673defaf4577684b9b92b8d3f65e281119db830e39df4aefdeea61423fe78ce331d61c4ff3a65cc27e4ff0';

/**
 * Calcola l'hash SHA-512 di una stringa
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Utility globale per generare hash da console del browser
 * Uso: generateHash('mia-password')
 */
window.generateHash = async function(password) {
  const hash = await hashPassword(password);
  console.log('Hash SHA-512 per "' + password + '":');
  console.log(hash);
  console.log('Copia questo hash nella variabile PASSWORD_HASH in js/auth.js');
  return hash;
};

/**
 * Verifica se l'utente è autenticato (sessione corrente)
 */
function isAuthenticated() {
  return true; // Per scopi di test, considera sempre autenticato
 // return sessionStorage.getItem('cassa_auth') === 'true';
}

/**
 * Esegue il login verificando la password
 */
async function doLogin() {
  const input = document.getElementById('auth-password');
  const errorEl = document.getElementById('auth-error');
  const password = input.value.trim();

  if (!password) {
    errorEl.textContent = 'Inserisci la password';
    errorEl.style.display = 'block';
    return;
  }

  const hash = await hashPassword(password);

  if (hash === PASSWORD_HASH) {
    sessionStorage.setItem('cassa_auth', 'true');
    document.getElementById('auth-overlay').remove();
    document.body.style.overflow = '';
  } else {
    errorEl.textContent = 'Password non valida';
    errorEl.style.display = 'block';
    input.value = '';
    input.focus();
  }
}

/**
 * Esegue il logout e ricarica la pagina
 */
function doLogout() {
  sessionStorage.removeItem('cassa_auth');
  window.location.reload();
}

/**
 * Mostra l'overlay di login bloccante
 */
function showLoginOverlay() {
  // Nascondi il contenuto della pagina
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-box">
      <div class="auth-icon">🔐</div>
      <h2 class="auth-title">Accesso Cassa</h2>
      <p class="auth-subtitle">Inserisci la password per accedere</p>
      <input type="password" id="auth-password" class="auth-input" placeholder="Password" autocomplete="off">
      <button id="auth-submit" class="auth-btn">Accedi</button>
      <p id="auth-error" class="auth-error"></p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event listeners
  document.getElementById('auth-submit').addEventListener('click', doLogin);
  document.getElementById('auth-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  // Focus sull'input
  setTimeout(() => document.getElementById('auth-password').focus(), 100);
}

/**
 * Controlla autenticazione all'avvio della pagina
 */
function checkAuth() {
  if (!isAuthenticated()) {
    showLoginOverlay();
  }
}

// Esegui il check all'avvio
document.addEventListener('DOMContentLoaded', checkAuth);
