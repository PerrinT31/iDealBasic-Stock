// reapproCsvApi.js
// Compatible avec les entêtes : "DATE TO RECEIVE", "QUANTITY", etc.
const REAPPRO_CSV_URL = "/IDEAL_BASIC_BRANDS_REAPPROWEB_IBB.csv";

let _cache = null;

// ---------- Normalisations ----------
const norm = (s) => (s ?? "").trim();

// IB220A/AX -> IB220
const toBaseRef = (ref) => {
  const m = String(ref).trim().match(/^([A-Za-z]+[0-9]+)/);
  return m ? m[1] : String(ref).trim();
};

// couleur -> clé normalisée (sans accents/espaces)
const toColorKey = (s) =>
  norm(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const SIZE_ALIASES = new Map([
  ["2XS", "XXS"], ["XXS", "XXS"],
  ["XS", "XS"], ["S", "S"], ["M", "M"], ["L", "L"], ["XL", "XL"],
  ["2XL", "XXL"], ["XXL", "XXL"], ["3XL", "3XL"], ["4XL", "4XL"],
  ["5XL", "5XL"], ["6XL", "6XL"],
]);

const normSize = (s) => {
  const up = norm(s).toUpperCase().replace(/\s+/g, "");
  return SIZE_ALIASES.get(up) || up;
};

// ---------- Helpers d’entêtes ----------
function findCol(header, testers) {
  // Cherche une colonne en testant une série de prédicats (regex/contains)
  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    if (testers.some((t) => t(h))) return i;
  }
  return -1;
}
const contains = (needle) => (h) => h.includes(needle);
const equals = (needle) => (h) => h === needle;
const regex = (re) => (h) => re.test(h);

// ---------- Chargement CSV ----------
async function loadReappro() {
  if (_cache) return _cache;

  const res = await fetch(REAPPRO_CSV_URL);
  if (!res.ok) throw new Error(`❌ Reappro CSV not found: ${REAPPRO_CSV_URL}`);
  const text = await res.text();

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // Header en minuscules sans espaces multiples
  const header = lines[0]
    .split(";")
    .map(h => h.trim().toLowerCase().replace(/\s+/g, " "));

  // Détection des colonnes avec tolérance
  const idx = {
    ref:  findCol(header, [
            equals("ref"), equals("reference"), equals("référence"),
            contains("ref")
          ]),
    color:findCol(header, [
            equals("color"), equals("colour"), equals("couleur"),
            contains("color")
          ]),
    size: findCol(header, [
            equals("size"), equals("taille"), contains("size")
          ]),
    date: findCol(header, [
            equals("date to receive"),
            equals("date_to_receive"),
            equals("datetorec"),
            contains("date to receive"),
            contains("date_to_receive"),
            contains("datetorec"),
            // fallback générique : un header qui contient "date" + ("receive" ou "rec")
            (h) => h.includes("date") && (h.includes("receive") || h.includes("rec")),
          ]),
    qty:  findCol(header, [
            equals("quantity"), equals("qty"), equals("quantité"),
            contains("quantity"), contains("qty"), contains("quantit")
          ]),
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
    // console.warn("[reappro] no match for", { baseRef, color, colorKey, size, sizeKey });
    return null;
  }

  // Agrège les quantités (plusieurs lignes possibles) et prend une date non vide
  const totalQty = matches.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const date = matches.find(r => r.dateToRec && r.dateToRec !== "-")?.dateToRec || "-";

  return { dateToRec: date, quantity: totalQty };
}
