// reapproCsvApi.js

// URL du CSV de réappro placé dans public/
const REAPPRO_CSV_URL = "/IDEAL_BASIC_BRANDS_REAPPROWEB_IBB.csv"; 

let cache = null;

/** Charge et parse le CSV une seule fois */
async function loadReappro() {
  if (cache) return cache;
  const res  = await fetch(REAPPRO_CSV_URL);
  const text = await res.text();

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter((l, i) => l && i > 0); // saute l’en-tête

  cache = lines.map(line => {
    const [ref, , color, size, , , dateToRec, qty] = line.split(";");
    return {
      ref,
      color,
      size,
      dateToRec,
      quantity: parseInt(qty, 10) || 0
    };
  });

  return cache;
}

/** Renvoie { dateToRec, quantity } ou null */
export async function getReappro(ref, color, size) {
  const data = await loadReappro();
  const found = data.find(
    r => r.ref === ref && r.color === color && r.size === size
  );
  return found || null;
}

