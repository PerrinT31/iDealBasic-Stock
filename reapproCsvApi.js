// reapproCsvApi.js
// Robuste aux variations : IB220A/AX → IB220 ; 2XL ↔︎ XXL ; couleurs normalisées (sans accents/espaces)
const REAPPRO_CSV_URL = "/IDEAL_BASIC_BRANDS_REAPPROWEB_IBB.csv";

let _cache = null;

// ---------- Normalisations ----------
const norm = (s) => (s ?? "").trim();
const toBaseRef = (ref) => {
  const m = String(ref).trim().match(/^([A-Za-z]+[0-9]+)/);
  return m ? m[1] : String(ref).trim();
};

// remplace accents, passe lower, enlève tout ce qui n’est pas alphanumérique
const toColorKey = (s) =>
  norm(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const SIZE_ALIASES = new Map([
  ["2XS", "XXS"],
  ["XXS", "XXS"],
  ["XS", "XS"],
  ["S", "S"],
  ["M", "M"],
  ["L", "L"],
  ["XL", "XL"],
  ["2XL", "XXL"],
  ["XXL", "XXL"],
  ["3XL", "3XL"],
  ["4XL", "4XL"],
  ["5XL", "5XL"],
  ["6XL", "6XL"],
]);

const normSize = (s) => {
  const up = norm(s).toUpperCase().replace(/\s+/g, "");
  return SIZE_ALIASES.get(up) || up; // si inconnu, on garde la valeur normalisée
};

// ---------- Chargement CSV ----------
async function loadReappro() {
  if (_cache) return _cache;

  const res = await fetch(REAPPRO_CSV_URL);
  if (!res.ok) throw new Error(`❌ Reappro CSV not found: ${REAPPRO_CSV_URL}`);
  const text = await res.text();

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const header = lines[0].split(";").map(h => h.trim().toLowerCase());
  const idx = {
    ref: header.findIndex(h => ["ref","reference","référence"].includes(h)),
    color: header.findIndex(h => ["color","colour","couleur"].includes(h)),
    size: header.findIndex(h => ["size","taille"].includes(h)),
    date: header.findIndex(h => ["date","datetorec","date_to_rec","replenishment","réassort"].includes(h)),
    qty:  header.findIndex(h => ["quantity","qty","quantité"].includes(h)),
  };
  const noHeader = Object.values(idx).some(i => i === -1);
  const body = noHeader ? lines : lines.slice(1);

  _cache = body.map(line => {
    const p = line.split(";");
    const baseRef   = toBaseRef(norm(p[noHeader ? 0 : idx.ref]));
    const color     = norm(p[noHeader ? 1 : idx.color]);
    const colorKey  = toColorKey(color);
    const size      = normSize(p[noHeader ? 2 : idx.size]);
    const dateToRec = norm(p[noHeader ? 3 : idx.date]) || "-";
    const quantity  = parseInt((p[noHeader ? 4 : idx.qty]) ?? "", 10) || 0;
    return { baseRef, color, colorKey, size, dateToRec, quantity };
  }).filter(r => r.baseRef && r.colorKey && r.size);

  return _cache;
}

/** Renvoie { dateToRec, quantity } ou null pour baseRef+color+size (tolérant aux variantes) */
export async function getReappro(ref, color, size) {
  const baseRef = toBaseRef(ref);
  const colorKey = toColorKey(color);
  const sizeKey = normSize(size);

  const data = await loadReappro();

  // Filtre tolérant : même baseRef, même couleur normalisée, même taille normalisée
  const matches = data.filter(
    r => r.baseRef === baseRef && r.colorKey === colorKey && r.size === sizeKey
  );

  if (!matches.length) {
    // Décommenter en dev si tu veux tracer les manqués :
    // console.warn("[reappro] no match for", { baseRef, color, colorKey, size, sizeKey });
    return null;
  }

  // Agrège les quantités (plusieurs lignes possibles) et prend une date non vide
  const totalQty = matches.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const date = matches.find(r => r.dateToRec && r.dateToRec !== "-")?.dateToRec || "-";

  return { dateToRec: date, quantity: totalQty };
}
