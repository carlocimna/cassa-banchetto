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
    li.textContent = `${item.qty} ${item.name}`;
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
const cashInput   = document.getElementById('cash-input');
const changeMsg   = document.getElementById('change-message');
const btnConfirm  = document.getElementById('modal-confirm');
const btnEdit     = document.getElementById('modal-edit');
const btnClose    = document.querySelector('.modal-close');

checkoutBtn.addEventListener('click', () => {
  // Popola lista articoli
  modalList.innerHTML = '';
  Object.values(selection).forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} × ${item.qty}`;
    modalList.appendChild(li);
  });
  // Totale
  const total = Object.values(selection)
    .reduce((sum, i) => sum + i.price * i.qty, 0);
  modalTotal.textContent = total.toFixed(2).replace('.', ',');

  // Reset input e pulsanti
  cashInput.value = '';
  changeMsg.textContent = '';
  btnConfirm.disabled = true;

  modal.classList.remove('hidden');
});

// Calcolo resto alla digitazione
cashInput.addEventListener('input', () => {
  const paid = parseFloat(cashInput.value) || 0;
  const total = parseFloat(modalTotal.textContent.replace(',', '.'));
  if (paid >= total) {
    const change = paid - total;
    changeMsg.textContent = `Resto da dare: € ${change.toFixed(2).replace('.', ',')}`;
    btnConfirm.disabled = false;
  } else {
    changeMsg.textContent = 'Contante insufficiente';
    btnConfirm.disabled = true;
  }
});

// Torna a modifica
btnEdit.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// Chiudi ordine e resetta
btnConfirm.addEventListener('click', () => {
  // qui potresti inviare dati al server
  // reset selezione
  Object.keys(selection).forEach(id => delete selection[id]);
  renderProducts();
  modal.classList.add('hidden');
});

// Chiudi con X
btnClose.addEventListener('click', () => modal.classList.add('hidden'));