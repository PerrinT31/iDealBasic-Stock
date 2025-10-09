// reapproCsvApi.js
// Regroupe aussi les variantes (IB220A, IB220AX, …) sous IB220 pour la recherche.
const REAPPRO_CSV_URL = "/IDEAL_BASIC_BRANDS_REAPPROWEB_IBB.csv";

let _cache = null;

const norm = (s) => (s ?? "").trim();
const normColor = (s) => norm(s).replace(/\s+/g, " ");
const normSize = (s) => norm(s).toUpperCase();
const toBaseRef = (ref) => {
  const m = String(ref).trim().match(/^([A-Za-z]+[0-9]+)/);
  return m ? m[1] : String(ref).trim();
};

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
    const color     = normColor(p[noHeader ? 1 : idx.color]);
    const size      = normSize(p[noHeader ? 2 : idx.size]);
    const dateToRec = norm(p[noHeader ? 3 : idx.date]) || "-";
    const quantity  = parseInt((p[noHeader ? 4 : idx.qty]) ?? "", 10) || 0;
    return { baseRef, color, size, dateToRec, quantity };
  }).filter(r => r.baseRef && r.color && r.size);

  return _cache;
}

/** Renvoie { dateToRec, quantity } ou null pour la baseRef + color + size */
export async function getReappro(ref, color, size) {
  const baseRef = toBaseRef(ref);
  const data = await loadReappro();

  // Plusieurs lignes possibles pour la même baseRef/color/size → on agrège qty et prend la date la plus proche (ou la dernière non vide)
  const lines = data.filter(r => r.baseRef === baseRef && r.color === color && r.size === size);
  if (!lines.length) return null;

  const totalQty = lines.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const date = lines.find(r => r.dateToRec && r.dateToRec !== "-")?.dateToRec || "-";

  return { dateToRec: date, quantity: totalQty };
}
