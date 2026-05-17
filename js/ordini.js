// js/ordini.js
import { db, whenAuthed, getOrdersForDay } from './firebase-init.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ordersContainer = document.getElementById('orders-accordion');
const currentDateSpan = document.getElementById('current-date');
const prevBtn = document.getElementById('prev-day');
const nextBtn = document.getElementById('next-day');
const summaryDiv = document.getElementById('summary-day');

let currentDate = new Date();

const euro = n => "€ " + (n || 0).toFixed(2).replace('.', ',');
const hhmm = ts => (ts?.toDate?.() || new Date())
  .toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});

// -------------------------
// RENDER ORDINI (accordion bootstrap)
// -------------------------
function renderRows(rows) {
  if (!rows.length) {
    ordersContainer.innerHTML = `<div class="alert alert-info">Nessun ordine per questo giorno</div>`;
    return;
  }
  ordersContainer.innerHTML = "";

  rows.forEach((r, idx) => {
    const itemId = `order-${idx}`;

    let itemsHtml = "<ul class='list-group list-group-flush'>";
    (r.items || []).forEach(it => {
      itemsHtml += `<li class="list-group-item">${it.qty} × ${it.name}</li>`;
    });
    itemsHtml += "</ul>";

    const card = document.createElement('div');
    card.className = "accordion-item";
    card.innerHTML = `
      <h2 class="accordion-header" id="heading-${itemId}">
        <button class="accordion-button collapsed" type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapse-${itemId}"
                aria-expanded="false"
                aria-controls="collapse-${itemId}">
          <div class="d-flex justify-content-between w-100">
            <span>
              <strong>${r.type} #${r.number}</strong>
              <span style="margin-left: 10px; font-size: 0.9rem; opacity: 0.7; text-transform: capitalize;">
                (${r.customerType || 'cliente'})
              </span>
            </span>
            <span>
              ${euro(r.total)} – ${hhmm(r.ts)}
            </span>
          </div>
        </button>
      </h2>
      <div id="collapse-${itemId}" class="accordion-collapse collapse"
           aria-labelledby="heading-${itemId}"
           data-bs-parent="#orders-accordion">
        <div class="accordion-body">
          ${itemsHtml}
          <div class="d-flex justify-content-end mt-3">
            <button style="color: white !important;" class="btn btn-sm btn-danger btn-delete"
                    data-id="${r.id}" data-type="${r.type}" data-number="${r.number}">
              Elimina
            </button>
          </div>
        </div>
      </div>
    `;
    ordersContainer.appendChild(card);
  });
}

// -------------------------
// RENDER RIEPILOGO
// -------------------------
function renderSummary(rows) {
  if (!rows.length) {
    summaryDiv.innerHTML = `<div class="alert alert-info">Nessun ordine.</div>`;
    return;
  }

  let ordiniBar = 0, ordiniCucina = 0;
  let incassoBar = 0, incassoCucina = 0;
  const articoliCucina = {};
  const articoliBar = {};

  rows.forEach(r => {
    if (r.type === 'BAR') {
      ordiniBar++;
      incassoBar += r.total;
    } else {
      ordiniCucina++;
      incassoCucina += r.total;
    }
    (r.items || []).forEach(it => {
      if (it.category === 'cucina') {
        articoliCucina[it.name] = (articoliCucina[it.name] || 0) + it.qty;
      } else if (it.category === 'bar') {
        articoliBar[it.name] = (articoliBar[it.name] || 0) + it.qty;
      }
    });
  });

  // riepilogo ordini/incassi
  let html = `
    <div class="card mb-4">
      <div class="card-header bg-dark text-white">TOTALI GIORNALIERI</div>
      <div class="card-body p-0">
        <table class="table mb-0">
          <tbody>
            <tr><th>Totale ordini Bar</th><td>${ordiniBar}</td></tr>
            <tr><th>Totale incassato Bar</th><td>${euro(incassoBar)}</td></tr>
            <tr><th>Totale ordini Cucina</th><td>${ordiniCucina}</td></tr>
            <tr><th>Totale incassato Cucina</th><td>${euro(incassoCucina)}</td></tr>
            <tr style="border-top: 2px solid #ddd; font-weight: bold;"><th>TOTALE ORDINI</th><td>${ordiniBar + ordiniCucina}</td></tr>
            <tr style="font-weight: bold; background-color: #f0f0f0;"><th>TOTALE INCASSATO</th><td>${euro(incassoBar + incassoCucina)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // helper per tabella articoli
  const renderTable = (title, obj) => {
    let t = `
      <div class="card mb-4">
        <div class="card-header bg-dark text-white">${title}</div>
        <div class="card-body p-0">
          <table class="table mb-0">
            <thead class="table-light">
              <tr><th>Articolo</th><th class="text-center">Q.tà</th></tr>
            </thead>
            <tbody>
    `;
    const keys = Object.keys(obj).sort();
    if (!keys.length) {
      t += `<tr><td colspan="2" class="text-center">-</td></tr>`;
    } else {
      keys.forEach(nome => {
        t += `<tr>
          <td>${nome}</td>
          <td class="text-center">${obj[nome]}</td>
        </tr>`;
      });
    }
    t += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    return t;
  };

  html += renderTable("CUCINA", articoliCucina);
  html += renderTable("BAR", articoliBar);

  summaryDiv.innerHTML = html;
}

// -------------------------
// CARICA ORDINI DEL GIORNO
// -------------------------
async function loadDay() {
  ordersContainer.innerHTML = `<div class="alert alert-secondary">Caricamento...</div>`;
  currentDateSpan.textContent = currentDate.toLocaleDateString('it-IT');
  try {
    await whenAuthed;
    let rows = await getOrdersForDay(currentDate);
     // ✅ escludi quelli con deleted === true
    rows = rows.filter(r => !r.deleted);
    renderRows(rows);
    renderSummary(rows);
  } catch (e) {
    console.error(e);
    ordersContainer.innerHTML = `<div class="alert alert-danger">Errore nel caricamento</div>`;
    summaryDiv.innerHTML = "";
  }
}

// -------------------------
// NAVIGAZIONE GIORNI
// -------------------------
prevBtn.addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadDay();
});
nextBtn.addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadDay();
});
ordersContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id   = btn.dataset.id;
  const type = btn.dataset.type; // "BAR" | "CUCINA"
  const number = btn.dataset.number; 
  const coll = type === 'BAR' ? 'orders_bar' : 'orders_cucina';

  if (!confirm(`Vuoi davvero eliminare l'ordine ${type} #${number}?`)) return;

  try {
    await whenAuthed;
    await setDoc(doc(db, coll, id), { deleted: true }, { merge: true });

    // Ricarica la giornata per aggiornare elenco e riepilogo
    await loadDay();
  } catch (err) {
    console.error(err);
    alert('Errore durante l’eliminazione.');
  }
});
// avvio
loadDay();
