// js/migrate-prices.js
// Utility per sanare i prezzi degli ordini su Firebase
// Determina se ogni ordine era staff o cliente confrontando i prezzi salvati

import { db, whenAuthed } from './firebase-init.js';
import { doc, getDocs, collection, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Copia esatta dei prezzi da script.js
const products = {
  cucina: [
    { id: 1, name: "Panino con salamella", price: 4.00, staffPrice: 2.00 },
    { id: 2, name: "Panino salame della duja", price: 4.00, staffPrice: 2.00 },
    { id: 3, name: "Panino wurstel pollo/tacchino", price: 3.00, staffPrice: 1.50 },
    { id: 4, name: "Panino gorgonzola", price: 3.50, staffPrice: 2 },
    { id: 5, name: "Panino petto di pollo", price: 3.50, staffPrice: 2 },
    { id: 6, name: "Bistecca di coppa", price: 3.50, staffPrice: 2 },
    { id: 7, name: "Patatine", price: 3.00, staffPrice: 1.50 }
  ],
  bar: [
    { id: 8, name: "Caffè", price: 1.00, staffPrice: 1 },
    { id: 9, name: "Acqua 0.5l", price: 1.00, staffPrice: 1 },
    { id: 10, name: "Bibita in lattina", price: 2.50, staffPrice: 2 },
    { id: 11, name: "Birra alla spina", price: 5.00, staffPrice: 2.50 },
    { id: 12, name: "Prosecco", price: 2.50, staffPrice: 2 },
    { id: 13, name: "Gelati", price: 2.00, staffPrice: 2.00 },
    { id: 14, name: "Ghiaccioli", price: 1.00, staffPrice: 1.00 },
    { id: 15, name: "Bottiglia di prosecco", price: 8, staffPrice: 5 },
    { id: 16, name: "EstaTHE", price: 1.5, staffPrice: 1.5 }
  ]
};

// Costruisce una mappa id -> prodotto
function buildProductMap() {
  const map = {};
  [...products.cucina, ...products.bar].forEach(p => {
    map[p.id] = p;
  });
  return map;
}

// Determina il customerType analizzando i prezzi
function guessCustomerType(items) {
  const productMap = buildProductMap();
  let staffMatches = 0;
  let clientMatches = 0;
  let unknownItems = 0;

  items.forEach(it => {
    const prod = productMap[it.id];
    if (!prod) {
      unknownItems++;
      return;
    }

    const savedPrice = parseFloat(it.price || 0);
    const clientPrice = parseFloat(prod.price);
    const staffPrice = parseFloat(prod.staffPrice);

    // Confronta con tolleranza di arrotondamento (0.01)
    if (Math.abs(savedPrice - staffPrice) < 0.01) {
      staffMatches++;
    } else if (Math.abs(savedPrice - clientPrice) < 0.01) {
      clientMatches++;
    }
  });

  // Se tutti i prezzi coincidono con staff, è staff
  if (staffMatches > 0 && clientMatches === 0) {
    return 'staff';
  }
  // Se almeno uno è prezzo cliente, è cliente
  if (clientMatches > 0) {
    return 'cliente';
  }
  // Default
  return 'cliente';
}

// Esegue la migrazione su una collezione
export async function migrateCollection(collectionName) {
  console.log(`🔄 Inizio migrazione ${collectionName}...`);
  
  const coll = collection(db, collectionName);
  // Leggi TUTTI i documenti (la query con "== null" non funziona per campi mancanti)
  const snapshot = await getDocs(coll);

  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const d = docSnap.data();
    
    // Se ha già customerType e non è vuoto, salta
    if (d.customerType && d.customerType.trim()) {
      skipped++;
      continue;
    }

    const guessedType = guessCustomerType(d.items || []);
    await updateDoc(doc(db, collectionName, docSnap.id), {
      customerType: guessedType
    });
    updated++;
    console.log(`  ✓ ${collectionName} #${d.number} → ${guessedType}`);
  }

  console.log(`✅ ${collectionName}: ${updated} aggiornati, ${skipped} già completati`);
  return { updated, skipped };
}

// Main: esegui migrazione su entrambe le collezioni
export async function migrateAllOrders() {
  await whenAuthed;

  console.log("🚀 Inizio migrazione prezzi globale...\n");

  const resultBar = await migrateCollection('orders_bar');
  const resultCucina = await migrateCollection('orders_cucina');

  const totalUpdated = resultBar.updated + resultCucina.updated;
  console.log(`\n✨ Migrazione completata! ${totalUpdated} ordini aggiornati`);
  
  return { resultBar, resultCucina, totalUpdated };
}

// Esponi sul window per uso da console
window.migrateAllOrders = migrateAllOrders;
window.migrateCollection = migrateCollection;
