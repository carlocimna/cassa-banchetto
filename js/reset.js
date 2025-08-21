// js/reset.js (ESM)
import { whenAuthed, db } from './firebase-init.js';
import {
  collection, query, limit, getDocs, writeBatch, doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_PASSWORD = "cancella123"; // 🔑 CAMBIA QUI LA PASSWORD

const btnReset = document.getElementById('btn-reset');
const btnCheck = document.getElementById('btn-check');
const statusBox = document.getElementById('status');
const logBox = document.getElementById('log');
const passInput = document.getElementById('admin-pass');

function setStatus(html, type = 'secondary') {
  statusBox.className = `alert alert-${type}`;
  statusBox.innerHTML = html;
}
function log(msg) {
  const ts = new Date().toLocaleTimeString('it-IT');
  logBox.textContent += `[${ts}] ${msg}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

// Elimina TUTTI i documenti di una collezione in batch (200 alla volta)
async function deleteAllFromCollection(collName) {
  let total = 0, round = 0;
  while (true) {
    const q = query(collection(db, collName), limit(200));
    const snap = await getDocs(q);
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();

    total += snap.size;
    round++;
    log(`• ${collName}: eliminati ${snap.size} documenti (batch #${round})`);
  }
  return total;
}

// Azzera i contatori
async function resetCounters() {
  await setDoc(doc(db, 'counters', 'bar'),    { value: 0 }, { merge: true });
  await setDoc(doc(db, 'counters', 'cucina'), { value: 0 }, { merge: true });
  log('• Counters bar/cucina impostati a 0');
}

async function resetDatabase() {
  await whenAuthed;

  // Controllo password
  if (passInput.value !== ADMIN_PASSWORD) {
    setStatus('Password errata ❌', 'danger');
    log('Tentativo di reset con password sbagliata.');
    return;
  }

  if (!confirm('Sei sicuro di voler ELIMINARE tutti gli ordini e azzerare i contatori?')) return;

  btnReset.disabled = true;
  btnCheck.disabled = true;
  setStatus('Operazione in corso…', 'warning');
  log('=== START RESET ===');

  try {
    const delOrders        = await deleteAllFromCollection('orders');
    const delOrdersBar     = await deleteAllFromCollection('orders_bar');
    const delOrdersCucina  = await deleteAllFromCollection('orders_cucina');

    await resetCounters();

    setStatus('Reset completato con successo ✅', 'success');
    log(`Totale eliminati:
- orders: ${delOrders}
- orders_bar: ${delOrdersBar}
- orders_cucina: ${delOrdersCucina}`);
    log('=== END RESET ===');
  } catch (e) {
    console.error(e);
    setStatus('Errore durante il reset ❌', 'danger');
    log(`ERRORE: ${e?.message || e}`);
  } finally {
    btnReset.disabled = false;
    btnCheck.disabled = false;
  }
}

// Conteggio rapido documenti (max 1000 per collezione)
async function countCollection(collName) {
  const snap = await getDocs(query(collection(db, collName), limit(1000)));
  return snap.size;
}

async function showCounts() {
  await whenAuthed;
  setStatus('Lettura conteggi…', 'secondary');
  btnReset.disabled = true;
  btnCheck.disabled = true;
  try {
    const [c1, c2, c3] = await Promise.all([
      countCollection('orders'),
      countCollection('orders_bar'),
      countCollection('orders_cucina'),
    ]);
    setStatus('Conteggi aggiornati ✅', 'info');
    log(`Conteggi attuali:
- orders: ${c1}
- orders_bar: ${c2}
- orders_cucina: ${c3}`);
  } catch (e) {
    console.error(e);
    setStatus('Errore nel conteggio ❌', 'danger');
    log(`ERRORE conteggio: ${e?.message || e}`);
  } finally {
    btnReset.disabled = false;
    btnCheck.disabled = false;
  }
}

// Bind pulsanti
btnReset.addEventListener('click', resetDatabase);
btnCheck.addEventListener('click', showCounts);

// Status iniziale
setStatus('Pronto. Inserisci password e puoi eseguire reset o conteggio.', 'secondary');
