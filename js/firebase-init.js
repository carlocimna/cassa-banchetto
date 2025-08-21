// js/firebase-init.js  (ESM)
// IMPORT SDK (CDN ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  doc, runTransaction, setDoc,
  query, where, orderBy, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCy2TN8CfA6C-k-xoBfl6lR6_cCRkE3B7o",
  authDomain: "simple-order-30786.firebaseapp.com",
  projectId: "simple-order-30786",
  storageBucket: "simple-order-30786.firebasestorage.app",
  messagingSenderId: "1086090855120",
  appId: "1:1086090855120:web:cd597aabd804e7109514d5"
};

// INIT
export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// login anonimo
signInAnonymously(auth).catch(console.error);

// Promise risolta quando l'utente è autenticato (utile per le letture protette)
export const whenAuthed = new Promise((resolve) => {
  onAuthStateChanged(auth, (u) => { if (u) resolve(u); });
});

// Helpers comuni
function calcTotal(items) {
  return items.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
}

// --- API: salvataggio "completo" (facoltativo) ---
export async function saveOrder(order) {
  const ref = await addDoc(collection(db, "orders"), {
    ...order, createdAt: serverTimestamp()
  });
  return ref.id;
}

// --- contatore atomico per BAR/CUCINA ---
async function nextSequential(name) {
  const ref = doc(db, "counters", name);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().value || 0) : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}

// --- API: salvataggio split + numerazione ---
export async function saveSplitOrder(order) {
  // parent (storico)
  const parentRef = await addDoc(collection(db, "orders"), {
    ...order, createdAt: serverTimestamp()
  });

  const barItems    = (order.items || []).filter(i => i.category === "bar"    && i.qty > 0);
  const cucinaItems = (order.items || []).filter(i => i.category === "cucina" && i.qty > 0);

  let barTicket = null, cucinaTicket = null;

  if (barItems.length) {
    const number = await nextSequential("bar");
    const ref = await addDoc(collection(db, "orders_bar"), {
      number,
      parentOrderId: parentRef.id,
      items: barItems,
      total: calcTotal(barItems),
      createdAt: serverTimestamp()
    });
    barTicket = { id: ref.id, number };
  }

  if (cucinaItems.length) {
    const number = await nextSequential("cucina");
    const ref = await addDoc(collection(db, "orders_cucina"), {
      number,
      parentOrderId: parentRef.id,
      items: cucinaItems,
      total: calcTotal(cucinaItems),
      createdAt: serverTimestamp()
    });
    cucinaTicket = { id: ref.id, number };
  }

  return { parentId: parentRef.id, bar: barTicket, cucina: cucinaTicket };
}

// --- API: leggi ordini per giorno (unisce BAR+CUCINA, desc per data) ---
export async function getOrdersForDay(dateObj) {
  const start = new Date(dateObj); start.setHours(0,0,0,0);
  const end   = new Date(dateObj); end.setHours(23,59,59,999);

  const startTs = Timestamp.fromDate(start);
  const endTs   = Timestamp.fromDate(end);

  const qBar = query(
    collection(db, "orders_bar"),
    where("createdAt", ">=", startTs),
    where("createdAt", "<=", endTs),
    orderBy("createdAt", "desc")
  );
  const qCucina = query(
    collection(db, "orders_cucina"),
    where("createdAt", ">=", startTs),
    where("createdAt", "<=", endTs),
    orderBy("createdAt", "desc")
  );

  const [snapBar, snapCucina] = await Promise.all([getDocs(qBar), getDocs(qCucina)]);

  const rows = [];
  snapBar.forEach(docSnap => {
    const d = docSnap.data();
    rows.push({
      id: docSnap.id,
      type: "BAR",
      number: d.number,
      total: typeof d.total === "number" ? d.total : calcTotal(d.items || []),
      ts: d.createdAt,
      items: d.items || [],
      deleted: d.deleted === true
    });
  });
  snapCucina.forEach(docSnap => {
    const d = docSnap.data();
    rows.push({
      id: docSnap.id,
      type: "CUCINA",
      number: d.number,
      total: typeof d.total === "number" ? d.total : calcTotal(d.items || []),
      ts: d.createdAt,
      items: d.items || [],
      deleted: d.deleted === true
    });
  });

  // ordina decrescente per timestamp
  rows.sort((a,b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
  return rows;
}

// --- Retro-compatibilità: espone sul window (index.html usa queste) ---
window.saveOrder = saveOrder;
window.saveSplitOrder = saveSplitOrder;
