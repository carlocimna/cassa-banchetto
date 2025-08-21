// Definizione prodotti
const products = {
  cucina: [
    { id: 1, name: "Panino con salamella", price: 4.00, img: "salamella.jpg" },
    { id: 2, name: "Panino salame della duja", price: 4.00, img: "salame.jpg" },
    { id: 3, name: "Panino würstel pollo/tacchino", price: 3.00, img: "wurstel.jpg" },
    { id: 4, name: "Panino gorgonzola", price: 3.50, img: "gorgonzola.jpg" },
    { id: 5, name: "Panino petto di pollo", price: 3.50, img: "tacchino.jpg" },
    { id: 6, name: "Bistecca di coppa", price: 3.50, img: "bistecca.jpg" },
    { id: 7, name: "Patatine", price: 3.00, img: "patatine.jpg" }
  ],
  bar: [
    { id: 8, name: "Caffè", price: 1.00, img: "caffe.jpg" },
    { id: 9, name: "Acqua 0.5l", price: 1.00, img: "acqua.jpg" },
    { id: 10, name: "Bibita in lattina", price: 2.50, img: "bibite.png" },
    { id: 11, name: "Birra alla spina", price: 4.00, img: "birra.jpg" },
    { id: 12, name: "Prosecco", price: 2.50, img: "prosecco.png" },
    { id: 13, name: "Gelati", price: 2.00, img: "gelati.jpg" },
    { id: 14, name: "Ghiaccioli", price: 1.00, img: "ghiaccioli.jpg" },
    
  ]
};

let currentTab = 'cucina';
const container = document.getElementById('products-container');
// Stato selezione persistente
const selection = {};

// Eventi tab
document.getElementById('tab-cucina').addEventListener('click', () => switchTab('cucina'));
document.getElementById('tab-bar').addEventListener('click', () => switchTab('bar'));

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tab === 'cucina' ? 'tab-cucina' : 'tab-bar').classList.add('active');
  renderProducts();
}

// Render prodotti e stato selezione
function renderProducts() {
  container.innerHTML = '';
  products[currentTab].forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = p.id;
    card.dataset.price = p.price;
    card.innerHTML = `
      <div class="check-icon">✓</div>
      <img src="images/${p.img}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p class="price">€ ${p.price.toFixed(2).replace('.', ',')}</p>
      <div class="quantity-controls">
        <button class="qty-btn minus">−</button>
        <span class="qty">1</span>
        <button class="qty-btn plus">+</button>
      </div>
    `;
    // Ripristino stato se già selezionato
    if (selection[p.id]) {
      card.classList.add('selected');
      card.querySelector('.qty').textContent = selection[p.id].qty;
    }
    attachCardEvents(card, p);
    container.appendChild(card);
  });
  updateTotal();
  renderSidebar();
}

// Eventi su ogni card
function attachCardEvents(card, product) {
  const qtySpan = card.querySelector('.qty');
  const minusBtn = card.querySelector('.minus');
  const plusBtn  = card.querySelector('.plus');

  card.addEventListener('click', e => {
    if (e.target.closest('.qty-btn')) return;
    const id = product.id;
    if (card.classList.toggle('selected')) {
      // selezionato: salvo con qty corrente
      selection[id] = { ...product, qty: parseInt(qtySpan.textContent, 10), category: currentTab };
    } else {
      delete selection[id];
      qtySpan.textContent = 1;
    }
    updateTotal(); renderSidebar();
  });

  plusBtn.addEventListener('click', e => {
    e.stopPropagation();
    let q = parseInt(qtySpan.textContent, 10) + 1;
    qtySpan.textContent = q;
    selection[product.id] = { ...product, qty: q, category: currentTab };
    updateTotal(); renderSidebar();
  });

  minusBtn.addEventListener('click', e => {
    e.stopPropagation();
    let q = parseInt(qtySpan.textContent, 10) - 1;
    if (q < 1) {
      card.classList.remove('selected');
      delete selection[product.id];
      q = 1;
    } else {
      selection[product.id].qty = q;
    }
    qtySpan.textContent = q;
    updateTotal(); renderSidebar();
  });
}

// Calcola totale
function updateTotal() {
  let total = Object.values(selection)
    .reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById('total-amount').textContent =
    total.toFixed(2).replace('.', ',');
}

// Render sidebar con riepilogo per categoria
function renderSidebar() {
  const secCucina = document.querySelector('#summary-cucina');
  const secBar    = document.querySelector('#summary-bar');
  secCucina.innerHTML = '';
  secBar.innerHTML    = '';
  Object.values(selection).forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="sideItemNum">${item.qty}</span> ${item.name}`;
    if (item.category === 'cucina') secCucina.appendChild(li);
    else secBar.appendChild(li);
  });
}

// Avvia
renderProducts();
// Gestione click su Cassa per aprire modal
const checkoutBtn = document.getElementById('checkout');
const modal       = document.getElementById('payment-modal');
const modalList   = document.getElementById('modal-items');
const modalTotal  = document.getElementById('modal-total');
const changeMsg   = document.getElementById('change-message');
const btnConfirm  = document.getElementById('modal-confirm');
const btnEdit     = document.getElementById('modal-edit');
const btnClose    = document.querySelector('.modal-close');

// NUOVO: elementi tastierino / display
const cashDisplay = document.getElementById('cash-display');
const keypad      = document.getElementById('keypad');

// Buffer importo in centesimi come stringa di cifre (es. "1234" => €12,34)
let paidBuffer = "";

// --- NUOVA MODALE RIEPILOGO ---
const summaryModal   = document.getElementById('summary-modal');
const sumCucinaBody  = document.getElementById('summary-cucina-body');
const sumBarBody     = document.getElementById('summary-bar-body');
const summaryClose   = document.getElementById('summary-close');
const summaryX       = document.querySelector('.summary-x');

function bufferToAmount() {
  // stringa -> numero in euro; vuoto => 0
  if (!paidBuffer) return 0;
  // Interpretazione “in centesimi”: "1" => 0.01, "10" => 0.10, "1234" => 12.34
  const cents = parseInt(paidBuffer, 10);
  return isNaN(cents) ? 0 : cents / 100;
}

function formatEuro(n) {
  return n.toFixed(2).replace('.', ',');
}

function renderPaidDisplay() {
  cashDisplay.textContent = `€ ${formatEuro(bufferToAmount())}`;
}

// Ricalcola resto e abilita/disabilita "Conferma"
function recomputeChange() {
  const paid = bufferToAmount();
  const total = parseFloat(modalTotal.textContent.replace(',', '.')) || 0;
  if (paid >= total) {
    const change = paid - total;
    changeMsg.textContent = `Resto da dare: € ${formatEuro(change)}`;
    btnConfirm.disabled = false;
  } else {
    changeMsg.textContent = 'Contante insufficiente';
    btnConfirm.disabled = true;
  }
}
function showOrderSummary(orderSnapshot) {
  // orderSnapshot: { qtyById: { [id]: n } }
  const { qtyById } = orderSnapshot;

  // utility per generare righe
  function buildRows(list) {
    // garantiamo l'ordine per id
    const sorted = [...list].sort((a, b) => a.id - b.id);
    return sorted.map(p => {
      const q = qtyById[p.id] || 0;
      const display = q > 0 ? String(q) : '-';
      return `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #f0f0f0;">${p.name}</td>
          <td style="padding:10px; text-align:center; border-bottom:1px solid #f0f0f0;">${display}</td>
        </tr>
      `;
    }).join('');
  }

  sumCucinaBody.innerHTML = buildRows(products.cucina);
  sumBarBody.innerHTML    = buildRows(products.bar);

  summaryModal.classList.remove('hidden');
}

// Tastierino numerico touch
if (keypad) {
  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;

    const key = btn.dataset.key;
    const action = btn.dataset.action;

    if (key) {
      // Aggiunge cifre al buffer; evita zeri iniziali inutili
      if (key === '00') {
        // "00" solo se c'è già qualcosa
        if (paidBuffer) paidBuffer += '00';
      } else {
        // singola cifra 0-9
        if (key === '0') {
          paidBuffer = paidBuffer ? paidBuffer + '0' : ""; // niente '0' iniziale
        } else {
          paidBuffer += key;
        }
      }
    } else if (action === 'back') {
      paidBuffer = paidBuffer.slice(0, -1);
    } else if (action === 'clear') {
      paidBuffer = "";
    }

    renderPaidDisplay();
    recomputeChange();
  });
}
checkoutBtn.addEventListener('click', () => {
  // Popola lista articoli
  modalList.innerHTML = '';
  Object.values(selection).forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.qty} ${item.name}`;
    modalList.appendChild(li);
  });

  // Totale
  const total = Object.values(selection)
    .reduce((sum, i) => sum + i.price * i.qty, 0);
  modalTotal.textContent = total.toFixed(2).replace('.', ',');

  // Reset display / messaggi / conferma
  paidBuffer = "";
  renderPaidDisplay();
  changeMsg.textContent = '';
  btnConfirm.disabled = true;

  modal.classList.remove('hidden');
});



// Torna a modifica
btnEdit.addEventListener('click', () => {
  modal.classList.add('hidden');
});

/**
 * Prepara i dati dell'ordine e li salva su Firestore
 * usando window.saveSplitOrder (definita in firebase-init.js).
 * 
 * @param {Object} selection - l'oggetto globale con gli articoli selezionati
 * @returns {Promise<Object>} esito con numeri assegnati { parentId, bar, cucina }
 */
async function processAndSaveOrder(selection) {
  // snapshot quantità/dettagli
  const qtyById = {};
  const items = [];
  Object.values(selection).forEach(item => {
    qtyById[item.id] = (qtyById[item.id] || 0) + item.qty;
    items.push({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
      category: item.category // 'cucina' | 'bar'
    });
  });

  const total  = Object.values(selection).reduce((s, i) => s + i.price * i.qty, 0);
  const paid   = typeof bufferToAmount === 'function' ? bufferToAmount() : total;
  const change = Math.max(0, paid - total);

  // Struttura ordine
  const order = {
    items,
    qtyById,
    total, paid, change,
    status: "paid",
    deviceTimeISO: new Date().toISOString()
  };

  // Salvataggio su Firestore con split e numerazioni
  const res = await window.saveSplitOrder(order);
  return { res, qtyById };
}
// Chiudi ordine, SALVA su Firestore, mostra riepilogo, poi resetta
btnConfirm.addEventListener('click', async () => {
  modal.classList.add('hidden'); // chiude modale pagamento

  try {
    const { res, qtyById } = await processAndSaveOrder(selection);
    console.log("Ordini creati:", res);

    // mostra riepilogo tabelle
    if (typeof showOrderSummary === 'function') {
      showOrderSummary({ qtyById });
      // se vuoi, aggiungi i numeri in intestazione:
      // const h2 = summaryModal.querySelector('h2');
      // h2.textContent = `Riepilogo Ordine — Cucina #${res.cucina?.number ?? '-'} | Bar #${res.bar?.number ?? '-'}`;
    }
  } catch (err) {
    console.error("Errore salvataggio ordine:", err);
    alert("Non sono riuscito a salvare l'ordine.");
  }

  // reset interfaccia principale
  Object.keys(selection).forEach(id => delete selection[id]);
  renderProducts();
});


// Chiudi con X
btnClose.addEventListener('click', () => modal.classList.add('hidden'));
function closeSummary() {
  summaryModal.classList.add('hidden');
}

summaryClose.addEventListener('click', closeSummary);
summaryX.addEventListener('click', closeSummary);