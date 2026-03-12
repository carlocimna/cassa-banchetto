import { whenAuthed, getOrdersForDay, db } from './firebase-init.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btnCucina = document.getElementById('btn-cucina');
const btnBar    = document.getElementById('btn-bar');
const ordersPanel = document.getElementById('orders-panel');
const itemsSummary = document.getElementById('items-summary');

// determine type from query string
let currentType = 'CUCINA';
{
  const params = new URLSearchParams(window.location.search);
  const t = params.get('type');
  if (t === 'BAR' || t === 'CUCINA') currentType = t;
}

const hhmm = ts => (ts?.toDate?.() || new Date())
  .toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});

function renderOrders(rows) {
  ordersPanel.innerHTML = '';
  if (!rows.length) {
    ordersPanel.innerHTML = '<div class="alert alert-info">Nessun ordine da servire</div>';
    return;
  }
  rows.forEach(r => {
    const div = document.createElement('div');
    div.className = 'order-card';
    let itemsHtml = '<ul>';
    (r.items||[]).forEach(it => {
      itemsHtml += `<li>${it.qty}× ${it.name}</li>`;
    });
    itemsHtml += '</ul>';
    div.innerHTML = `
      <h3>
        ${r.type} #${r.number} &ndash; ${hhmm(r.ts)}
        <button data-id="${r.id}" class="btn btn-sm btn-success btn-serve" style="float:right;">V</button>
      </h3>
      ${itemsHtml}
    `;
    ordersPanel.appendChild(div);
  });
}

function renderSummary(rows) {
  // aggrega per nome prodotto
  const counts = {};
  rows.forEach(r => {
    (r.items||[]).forEach(it => {
      counts[it.name] = (counts[it.name] || 0) + it.qty;
    });
  });
  let html = '<h4>Articoli in preparazione</h4>';
  if (!Object.keys(counts).length) {
    html += '<div class="alert alert-info">Nessun prodotto</div>';
  } else {
    html += '<ul class="list-group">';
    Object.keys(counts).sort().forEach(name => {
      html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                 ${name}
                 <span class="badge bg-primary rounded-pill">${counts[name]}</span>
               </li>`;
    });
    html += '</ul>';
  }
  itemsSummary.innerHTML = html;
}

async function loadData() {
  ordersPanel.innerHTML = '<div class="alert alert-secondary">Caricamento...</div>';
  try {
    await whenAuthed;
    let rows = await getOrdersForDay(new Date());
    rows = rows
      .filter(r => !r.deleted && !r.served && r.type === currentType)
      .sort((a,b) => (a.ts?.seconds||0) - (b.ts?.seconds||0)); // ascendente
    renderOrders(rows);
    renderSummary(rows);
  } catch (e) {
    console.error(e);
    ordersPanel.innerHTML = '<div class="alert alert-danger">Errore nel caricamento</div>';
    itemsSummary.innerHTML = '';
  }
}

function selectType(type) {
  currentType = type;
  if (type === 'CUCINA') {
    btnCucina.classList.add('btn-primary'); btnCucina.classList.remove('btn-secondary');
    btnBar.classList.add('btn-secondary'); btnBar.classList.remove('btn-primary');
  } else {
    btnBar.classList.add('btn-primary'); btnBar.classList.remove('btn-secondary');
    btnCucina.classList.add('btn-secondary'); btnCucina.classList.remove('btn-primary');
  }
  loadData();
}

btnCucina.addEventListener('click', () => selectType('CUCINA'));

btnBar.addEventListener('click', () => selectType('BAR'));

// delegazione per servire ordini
ordersPanel.addEventListener('click', async e => {
  const btn = e.target.closest('.btn-serve');
  if (!btn) return;
  const id = btn.dataset.id;
  const coll = currentType === 'CUCINA' ? 'orders_cucina' : 'orders_bar';
  try {
    await whenAuthed;
    await setDoc(doc(db, coll, id), { served: true }, { merge: true });
    // ricarica per aggiornare elenco e riepilogo
    await loadData();
  } catch (err) {
    console.error(err);
    alert('Impossibile segnare come servito');
  }
});

// auto refresh ogni 5 secondi
setInterval(loadData, 5000);

// iniziale
selectType(currentType);
