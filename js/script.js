// Definizione prodotti
const products = {
  cucina: [
    { id: 1, name: "Panino con salamella", price: 4.00, staffPrice: 2.00, img: "salamella.jpg" },
    { id: 2, name: "Panino salame della duja", price: 4.00, staffPrice: 2.00, img: "salame.jpg" },
    { id: 3, name: "Panino wurstel pollo/tacchino", price: 3.00, staffPrice: 1.50, img: "wurstel.jpg" },
    { id: 4, name: "Panino gorgonzola", price: 3.50, staffPrice: 1.75, img: "gorgonzola.jpg" },
    { id: 5, name: "Panino petto di pollo", price: 3.50, staffPrice: 1.75, img: "tacchino.jpg" },
    { id: 6, name: "Bistecca di coppa", price: 3.50, staffPrice: 1.75, img: "bistecca.jpg" },
    { id: 7, name: "Patatine", price: 3.00, staffPrice: 1.50, img: "patatine.jpg" }
  ],
  bar: [
    { id: 8, name: "Caffè", price: 1.00, staffPrice: 0.50, img: "caffe.jpg" },
    { id: 9, name: "Acqua 0.5l", price: 1.00, staffPrice: 0.50, img: "acqua.jpg" },
    { id: 10, name: "Bibita in lattina", price: 2.50, staffPrice: 1.25, img: "bibite.png" },
    { id: 11, name: "Birra alla spina", price: 4.00, staffPrice: 2.00, img: "birra.jpg" },
    { id: 12, name: "Prosecco", price: 2.50, staffPrice: 1.25, img: "prosecco.png" },
    { id: 13, name: "Gelati", price: 2.00, staffPrice: 1.00, img: "gelati.jpg" },
    { id: 14, name: "Ghiaccioli", price: 1.00, staffPrice: 0.50, img: "ghiaccioli.jpg" },
    
  ]
};

let currentTab = 'cucina';
let customerType = 'cliente';           // 'cliente' o 'staff'
const container = document.getElementById('products-container');
const customerToggleBtn = document.getElementById('customer-toggle');
// Stato selezione persistente
const selection = {};

// Eventi tab
customerToggleBtn?.addEventListener('click', () => {
  // flip tipo utente
  customerType = customerType === 'cliente' ? 'staff' : 'cliente';
  customerToggleBtn.textContent = customerType === 'staff' ? 'Staff' : 'Cliente';
  customerToggleBtn.classList.toggle('active', customerType === 'staff');
  // aggiorna prezzi nella selezione esistente
  Object.keys(selection).forEach(id => {
    const prod = [...products.cucina, ...products.bar].find(p => p.id == id);
    if (prod) {
      selection[id].price = customerType === 'staff' ? prod.staffPrice : prod.price;
    }
  });
  renderProducts();
});

// inizializzazione aspetto toggle
if (customerToggleBtn) {
  customerToggleBtn.classList.toggle('active', customerType === 'staff');
}
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
    const price = customerType === 'staff' ? p.staffPrice : p.price;
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = p.id;
    card.dataset.price = price;
    card.innerHTML = `
      <div class="check-icon">✓</div>
      <img src="images/${p.img}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p class="price">€ ${price.toFixed(2).replace('.', ',')}</p>
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
  // se il tipo utente cambia, aggiorniamo i prezzi degli elementi già selezionati
  card.addEventListener('priceRefresh', () => {
    const price = customerType === 'staff' ? product.staffPrice : product.price;
    card.dataset.price = price;
    card.querySelector('.price').textContent = `€ ${price.toFixed(2).replace('.', ',')}`;
    if (selection[product.id]) selection[product.id].price = price;
  });
  const qtySpan = card.querySelector('.qty');
  const minusBtn = card.querySelector('.minus');
  const plusBtn  = card.querySelector('.plus');

  card.addEventListener('click', e => {
    if (e.target.closest('.qty-btn')) return;
    const id = product.id;
    const price = customerType === 'staff' ? product.staffPrice : product.price;
    if (card.classList.toggle('selected')) {
      // selezionato: salvo con qty corrente e prezzo attuale
      selection[id] = { ...product, price, qty: parseInt(qtySpan.textContent, 10), category: currentTab };
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
    if (selection[product.id]) {
      selection[product.id].qty = q;
    } else {
      const price = customerType === 'staff' ? product.staffPrice : product.price;
      selection[product.id] = { ...product, price, qty: q, category: currentTab };
    }
    updateTotal(); renderSidebar();
  });

  minusBtn.addEventListener('click', e => {
    e.stopPropagation();
    let q = parseInt(qtySpan.textContent, 10) - 1;
    if (q < 1) {
      card.classList.remove('selected');
      delete selection[product.id];
      q = 1;
    } else if (selection[product.id]) {
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
const btnExact   = document.getElementById('btn-exact');

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
const summaryPrint   = document.getElementById('summary-print');

const loaderOverlay = document.getElementById('loader-overlay');
const summaryTitleCucina = document.getElementById('header-cucina-title');
const summaryTitleBar    = document.getElementById('header-bar-title');
const summarySectionCucina = document.getElementById('summary-cucina-table');
const summarySectionBar    = document.getElementById('summary-bar-table');

// (no global summary object needed when using standard print)

// -----------------------------------------------------------------------------
// utilities for RawBT printing (copiate da test.html)

function padRight(str, width) {
  str = String(str ?? "");
  return str.length >= width ? str.slice(0, width) : str + " ".repeat(width - str.length);
}

function padLeft(str, width) {
  str = String(str ?? "");
  return str.length >= width ? str.slice(0, width) : " ".repeat(width - str.length) + str;
}

function centerText(str, width) {
  str = String(str ?? "");
  if (str.length >= width) return str.slice(0, width);
  const total = width - str.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return " ".repeat(left) + str + " ".repeat(right);
}

function wrapText(text, width) {
  const words = String(text ?? "").trim().split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      line = word;
    } else if ((line + " " + word).length <= width) {
      line += " " + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function textToCp1252Bytes(text) {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes.push(code <= 255 ? code : 63);
  }
  return new Uint8Array(bytes);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function htmlToReceiptText(html, paperWidth = 32) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const title = doc.querySelector("title")?.textContent?.trim() || "Ordine";
  const headerCells = [...doc.querySelectorAll("thead th")];
  const reparto = headerCells[0]?.textContent?.trim() || "Reparto";
  const orderNo = headerCells[1]?.textContent?.trim() || "";
  const rows = [...doc.querySelectorAll("tbody tr")];

  const lineWidth = paperWidth;
  const qtyWidth = 4;
  const separator = " ";
  const itemWidth = lineWidth - qtyWidth - separator.length;

  const out = [];

  out.push(centerText(title.toUpperCase(), lineWidth));
  out.push("-".repeat(lineWidth));
  out.push(padRight(reparto, itemWidth) + separator + padLeft(orderNo, qtyWidth));
  out.push("-".repeat(lineWidth));

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;

    // rimuovi slash perché RawBT si confonde con "/" nella stampa
    let item = cells[0].textContent.trim().replace(/\s+/g, " ");
    item = item.replace(/\//g, "-");
    const qty = cells[cells.length - 1].textContent.trim().replace(/\s+/g, " ");

    const wrapped = wrapText(item, itemWidth);

    wrapped.forEach((line, index) => {
      if (index === 0) {
        out.push(padRight(line, itemWidth) + separator + padLeft(qty, qtyWidth));
      } else {
        out.push(line);
      }
    });
  }

  out.push("-".repeat(lineWidth));
  out.push("");
  out.push("");

  return out.join("\n");
}

function buildEscPosPayload(receiptText) {
  const escpos = [];
  escpos.push(0x1B, 0x40);
  const textBytes = textToCp1252Bytes(receiptText);
  escpos.push(...textBytes);
  escpos.push(0x0A, 0x0A, 0x0A);
  escpos.push(0x1D, 0x56, 0x00);
  return new Uint8Array(escpos);
}

// -----------------------------------------------------------------------------


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
    // garantiamo l'ordine per id e filtriamo solo voci con qty > 0
    const sorted = [...list].sort((a, b) => a.id - b.id).filter(p => (qtyById[p.id] || 0) > 0);
    return sorted.map(p => {
      const q = qtyById[p.id] || 0;
      const display = String(q); // sempre qty > 0, quindi no '-'
      return `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #f0f0f0;" colspan="2">${p.name}</td>
          <td style="padding:10px; text-align:center; border-bottom:1px solid #f0f0f0; font-weight:bold">${display}</td>
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
  modal.classList.add('hidden');       // chiudi modale pagamento
  loaderOverlay.classList.remove('hidden');  // mostra loader

  try {
    const { res, qtyById } = await processAndSaveOrder(selection);
    console.log("Ordini creati:", res);

    // aggiorna le tabelle riepilogo
    if (typeof showOrderSummary === 'function') {
      showOrderSummary({ qtyById });
    }

    // aggiorna header con numeri ordine
    if (res.cucina) {
      summaryTitleCucina.textContent = `N°${res.cucina.number}`;
      summarySectionCucina.style.display = '';
    } else {
      summarySectionCucina.style.display = 'none';
    }

    if (res.bar) {
      summaryTitleBar.textContent = `N°${res.bar.number}`;
      summarySectionBar.style.display = '';
    } else {
      summarySectionBar.style.display = 'none';
    }

    // mostra riepilogo
    summaryModal.classList.remove('hidden');
    // appena aperto, lancia la stampa automaticamente
    if (typeof summaryPrint !== 'undefined') {
      summaryPrint.click();
    }

  } catch (err) {
    console.error("Errore salvataggio ordine:", err);
    alert("Non sono riuscito a salvare l'ordine.");
  } finally {
    loaderOverlay.classList.add('hidden');  // sempre nascondi loader
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
// Tasto "SOLDI GIUSTI"
btnExact.addEventListener('click', () => {
  // prendi totale dall'elemento modale
  const total = parseFloat(modalTotal.textContent.replace(',', '.')) || 0;

  // converti in centesimi e metti in buffer
  paidBuffer = String(Math.round(total * 100));

  // aggiorna display e controlli
  renderPaidDisplay();
  recomputeChange();
});
summaryClose.addEventListener('click', closeSummary);
summaryX.addEventListener('click', closeSummary);
// stampa standard del riepilogo, usa la modale generata
// helper per inviare un blocco HTML alla stampante RawBT
function printRawbtHtml(html) {
  const receiptText = htmlToReceiptText(html, 32);
  const payload = buildEscPosPayload(receiptText);
  const b64 = bytesToBase64(payload);
  window.location.href = "rawbt:base64," + encodeURIComponent(b64);
}

// helper per stampare due blocchi in un unico comando, mantenendo il taglio in mezzo
function printRawbtTwo(html1, html2) {
  const r1 = buildEscPosPayload(htmlToReceiptText(html1, 32));
  const r2 = buildEscPosPayload(htmlToReceiptText(html2, 32));
  // concateno i due array (entrambi già contengono un cut finale)
  const combined = new Uint8Array(r1.length + r2.length);
  combined.set(r1);
  combined.set(r2, r1.length);
  const b64 = bytesToBase64(combined);
  window.location.href = "rawbt:base64," + encodeURIComponent(b64);
}

summaryPrint.addEventListener('click', () => {
  // ottieni i pezzi di HTML dalle tabelle (se visibili)
  const cucinaHTML = summarySectionCucina.style.display !== 'none'
    ? summarySectionCucina.innerHTML
    : '';
  const barHTML = summarySectionBar.style.display !== 'none'
    ? summarySectionBar.innerHTML
    : '';

  if (cucinaHTML && barHTML) {
    printRawbtTwo(`<div>${cucinaHTML}</div>`, `<div>${barHTML}</div>`);
  } else if (cucinaHTML) {
    printRawbtHtml(`<div>${cucinaHTML}</div>`);
  } else if (barHTML) {
    printRawbtHtml(`<div>${barHTML}</div>`);
  }
});
