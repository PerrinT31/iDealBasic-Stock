// stockCsvApi.js
// 👉 Chargement du fichier CSV de stock (placé dans /public)
const STOCK_CSV_URL = "/IDEAL_BASIC_BRANDS_STOCKWEB_IBB.csv";

let _cacheRows = null;
let _index = {
  byRef: new Map(),          // ref -> Set(colors)
  byRefColor: new Map(),     // `${ref}::${color}` -> Set(sizes)
  stockByKey: new Map(),     // `${ref}::${color}::${size}` -> number
};

const SIZE_ORDER = ["XS","S","M","L","XL","XXL","3XL","4XL","5XL","6XL"];

// -- Helpers -------------------------------------------------------------
const norm = (s) => (s ?? "").trim();
const normColor = (s) => norm(s).replace(/\s+/g, " ");
const normSize = (s) => norm(s).toUpperCase();
const toInt = (v) => {
  const n = parseInt(String(v).replace(/\s/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const sortSizes = (arr) => {
  const order = new Map(SIZE_ORDER.map((v, i) => [v, i]));
  return [...new Set(arr)]
    .sort((a, b) => {
      const aa = order.has(a) ? order.get(a) : 999;
      const bb = order.has(b) ? order.get(b) : 999;
      return aa === bb ? a.localeCompare(b) : aa - bb;
    });
};

// -- Chargement et indexation du CSV -------------------------------------
async function loadStock() {
  if (_cacheRows) return _cacheRows;

  const res = await fetch(STOCK_CSV_URL);
  if (!res.ok) throw new Error(`❌ Impossible de charger le CSV de stock : ${STOCK_CSV_URL}`);
  const text = await res.text();

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const header = lines[0].split(";").map(h => h.trim().toLowerCase());
  const idx = {
    ref: header.findIndex(h => ["ref","reference","référence"].includes(h)),
    color: header.findIndex(h => ["color","colour","couleur"].includes(h)),
    size: header.findIndex(h => ["size","taille"].includes(h)),
    stock: header.findIndex(h => ["stock","qty","quantity","quantité"].includes(h)),
  };
  const noHeader = Object.values(idx).some(i => i === -1);
  const body = noHeader ? lines : lines.slice(1);

  const rows = body.map(line => {
    const p = line.split(";");
    const ref   = norm(p[noHeader ? 0 : idx.ref]);
    const color = normColor(p[noHeader ? 1 : idx.color]);
    const size  = normSize(p[noHeader ? 2 : idx.size]);
    const stock = toInt(p[noHeader ? 3 : idx.stock]);
    return { ref, color, size, stock };
  }).filter(r => r.ref && r.color && r.size);

  _index = { byRef: new Map(), byRefColor: new Map(), stockByKey: new Map() };

  for (const r of rows) {
    if (!_index.byRef.has(r.ref)) _index.byRef.set(r.ref, new Set());
    _index.byRef.get(r.ref).add(r.color);

    const rcKey = `${r.ref}::${r.color}`;
    if (!_index.byRefColor.has(rcKey)) _index.byRefColor.set(rcKey, new Set());
    _index.byRefColor.get(rcKey).add(r.size);

    _index.stockByKey.set(`${rcKey}::${r.size}`, r.stock);
  }

  _cacheRows = rows;
  return rows;
}

// -- Fonctions exportées -------------------------------------------------
export async function getUniqueRefs() {
  await loadStock();
  return [..._index.byRef.keys()].sort();
}

export async function getColorsFor(ref) {
  await loadStock();
  const set = _index.byRef.get(ref) ?? new Set();
  return [...set].sort((a,b) => a.localeCompare(b));
}

export async function getSizesFor(ref, color) {
  await loadStock();
  const set = _index.byRefColor.get(`${ref}::${color}`) ?? new Set();
  return sortSizes([...set]);
}

export async function getStock(ref, color, size) {
  await loadStock();
  return _index.stockByKey.get(`${ref}::${color}::${size}`) ?? 0;
}

