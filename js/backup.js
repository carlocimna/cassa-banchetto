// js/backup.js
// Utility per backup completo del database Firebase

import { db, whenAuthed } from './firebase-init.js';
import { getDocs, collection, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Converte Timestamp Firestore in formato leggibile
function formatTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') {
    return ts.toDate().toISOString();
  }
  return ts;
}

// Legge una collezione completa
async function readCollection(collectionName) {
  console.log(`📖 Lettura collezione: ${collectionName}...`);
  const coll = collection(db, collectionName);
  const snapshot = await getDocs(coll);
  
  const docs = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    // Converte timestamp
    if (data.createdAt) {
      data.createdAt = formatTimestamp(data.createdAt);
    }
    if (data.ts) {
      data.ts = formatTimestamp(data.ts);
    }
    docs.push({
      id: docSnap.id,
      ...data
    });
  });
  
  console.log(`  ✓ ${docs.length} documenti`);
  return docs;
}

// Esegue backup completo
export async function backupDatabase() {
  await whenAuthed;
  
  console.log("🚀 Inizio backup database...\n");
  
  const backup = {
    timestamp: new Date().toISOString(),
    version: "1.0",
    collections: {}
  };

  // Leggi le collezioni principali
  const collections = ['orders', 'orders_bar', 'orders_cucina', 'counters'];
  
  for (const collName of collections) {
    try {
      backup.collections[collName] = await readCollection(collName);
    } catch (err) {
      console.log(`  ⚠️ Errore lettura ${collName}: ${err.message}`);
      backup.collections[collName] = [];
    }
  }

  // Calcola statistiche
  const stats = {
    totalOrders: backup.collections.orders.length,
    totalOrdersBar: backup.collections.orders_bar.length,
    totalOrdersCucina: backup.collections.orders_cucina.length,
    totalDocuments: Object.values(backup.collections).reduce((sum, arr) => sum + arr.length, 0)
  };

  backup.stats = stats;

  console.log(`\n📊 Statistiche:`);
  console.log(`  • Ordini totali: ${stats.totalOrders}`);
  console.log(`  • Ordini Bar: ${stats.totalOrdersBar}`);
  console.log(`  • Ordini Cucina: ${stats.totalOrdersCucina}`);
  console.log(`  • Totale documenti: ${stats.totalDocuments}`);
  console.log(`\n✅ Backup completato!\n`);

  return backup;
}

// Esporta backup in JSON
export function exportJSON(backup) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${backup.timestamp.split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log("💾 File JSON scaricato");
}

// Esporta backup in CSV (per ordini bar + cucina)
export function exportCSV(backup) {
  const allOrders = [
    ...backup.collections.orders_bar.map(o => ({ ...o, type: 'BAR' })),
    ...backup.collections.orders_cucina.map(o => ({ ...o, type: 'CUCINA' }))
  ];

  // Header CSV
  const headers = ['type', 'number', 'total', 'customerType', 'createdAt', 'itemCount'];
  
  let csv = headers.join(',') + '\n';

  allOrders.forEach(order => {
    const row = [
      order.type,
      order.number,
      order.total,
      order.customerType || 'cliente',
      order.createdAt || '',
      (order.items || []).length
    ];
    csv += row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-ordini-${backup.timestamp.split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  console.log("💾 File CSV scaricato");
}

// Esponi sul window
window.backupDatabase = backupDatabase;
window.exportJSON = exportJSON;
window.exportCSV = exportCSV;
