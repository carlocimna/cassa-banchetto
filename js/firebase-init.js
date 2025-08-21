// js/firebase-init.js  (caricato come modulo ES)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, runTransaction, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1) Configura Firebase (INCOLLA QUI IL TUO CONFIG) ---
const firebaseConfig = {
  apiKey: "AIzaSyCy2TN8CfA6C-k-xoBfl6lR6_cCRkE3B7o",
  authDomain: "simple-order-30786.firebaseapp.com",
  projectId: "simple-order-30786",
  storageBucket: "simple-order-30786.firebasestorage.app",
  messagingSenderId: "1086090855120",
  appId: "1:1086090855120:web:cd597aabd804e7109514d5"
};
// --- 2) Init ---
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// Accedi in anonimo (serve per rispettare le regole)
signInAnonymously(auth).catch(console.error);

// --- 3) Espone una funzione globale da usare nel tuo script non-modulare ---
window.saveOrder = async function saveOrder(order) {
  // order: oggetto con i dati dell’ordine
  const docRef = await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// (opzionale) utile per debug
onAuthStateChanged(auth, (user) => {
  if (user) console.log("Firebase anon auth OK, uid:", user.uid);
});

// Ottieni il prossimo numero progressivo per 'bar' o 'cucina' in transazione
async function nextSequential(name) {
  const ref = doc(db, 'counters', name);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().value || 0) : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}

/**
 * Salva l'ordine spezzato in due collezioni con numerazioni indipendenti.
 * @param {Object} order - struttura d'ordine "completa" (come nel messaggio precedente)
 *    order.items[] deve avere {id, name, qty, price, category: 'bar'|'cucina'}
 *    order.total/paid/change opzionali
 * @returns {Object} { parentId, bar: {id, number}|null, cucina: {id, number}|null }
 */
window.saveSplitOrder = async function saveSplitOrder(order) {
  // 1) Salva l'ordine completo per storico (facoltativo ma comodo)
  const parentRef = await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: serverTimestamp()
  });

  // 2) Seleziona gli items per categoria
  const barItems    = order.items.filter(i => i.category === 'bar' && i.qty > 0);
  const cucinaItems = order.items.filter(i => i.category === 'cucina' && i.qty > 0);

  let barTicket = null;
  let cucinaTicket = null;

  // 3) Crea i sotto-ordini con numero progressivo (solo se hanno righe)
  if (barItems.length) {
    const number = await nextSequential('bar');
    const docRef = await addDoc(collection(db, "orders_bar"), {
      number,
      parentOrderId: parentRef.id,
      items: barItems,
      createdAt: serverTimestamp()
    });
    barTicket = { id: docRef.id, number };
  }

  if (cucinaItems.length) {
    const number = await nextSequential('cucina');
    const docRef = await addDoc(collection(db, "orders_cucina"), {
      number,
      parentOrderId: parentRef.id,
      items: cucinaItems,
      createdAt: serverTimestamp()
    });
    cucinaTicket = { id: docRef.id, number };
  }

  return { parentId: parentRef.id, bar: barTicket, cucina: cucinaTicket };
};