// App.jsx

import React, { useState, useEffect } from "react";
import {
  getUniqueRefs,
  getColorsFor,
  getSizesFor,
  getStock
} from "./stockCsvApi.js";
import { getReappro } from "./reapproCsvApi.js";
import "./index.css";

export default function App() {
  const [refs, setRefs]                   = useState([]);
  const [colors, setColors]               = useState([]);
  const [sizes, setSizes]                 = useState([]);
  const [selectedRef, setSelectedRef]     = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [stockBySize, setStockBySize]     = useState({});
  const [reapproBySize, setReapproBySize] = useState({});

  // 1️⃣ Charger les références
  useEffect(() => {
    getUniqueRefs().then(setRefs);
  }, []);

  // 2️⃣ Charger les couleurs quand on choisit une référence
  useEffect(() => {
    if (!selectedRef) {
      setColors([]);
      setSelectedColor("");
      setSizes([]);
      setStockBySize({});
      setReapproBySize({});
      return;
    }
    getColorsFor(selectedRef).then(cols => {
      setColors(cols);
      setSelectedColor("");
      setSizes([]);
      setStockBySize({});
      setReapproBySize({});
    });
  }, [selectedRef]);

  // 3️⃣ Charger tailles + stocks + réappro quand on choisit une couleur
  useEffect(() => {
    if (!selectedColor) {
      setSizes([]);
      setStockBySize({});
      setReapproBySize({});
      return;
    }

    getSizesFor(selectedRef, selectedColor).then(rawSizes => {
      // Tri personnalisé
      const order = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
      const sorted = [
        ...order.filter(sz => rawSizes.includes(sz)),
        ...rawSizes.filter(sz => !order.includes(sz))
      ];

      setSizes(sorted);

      // Charger stock et réappro pour chaque taille
      Promise.all(
        sorted.map(size =>
          Promise.all([
            getStock(selectedRef, selectedColor, size),
            getReappro(selectedRef, selectedColor, size)
          ]).then(([stock, reappro]) => ({ size, stock, reappro }))
        )
      ).then(results => {
        const newStock  = {};
        const newReappro = {};
        results.forEach(({ size, stock, reappro }) => {
          newStock[size]   = stock;
          newReappro[size] = reappro;
        });
        setStockBySize(newStock);
        setReapproBySize(newReappro);
      });
    });
  }, [selectedRef, selectedColor]);

  return (
    <div className="app-container">
      {/* En-tête */}
     <header className="app-header" aria-label="iDeal Basic – Stock Checker">
  <img
    src="/IDEAL%20BASIC%20BRAND%20LOGOTYPE%20PRINCIPAL%20OFF%20WHITE%20RVB%20900PX%20W%2072PPI.png"
    alt="iDeal Basic Brand"
    className="app-logo"
    width="240"
    height="70"
    loading="eager"
    decoding="async"
    fetchPriority="high"
    onError={(e) => { e.currentTarget.style.display = "none"; }}
  />
  <h1 className="app-title">Stock Checker</h1>
</header>

      {/* Filtres ... (inchangé) */}

      {/* Filtres */}
<div className="filters">
  <div className="filter">
    <label>Reference</label>
    <select
      value={selectedRef}
      onChange={e => setSelectedRef(e.target.value)}
    >
      <option value="">-- Select reference --</option>
      {refs.map(r => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  </div>

  <div className="filter">
    <label>Color</label>
    <select
      value={selectedColor}
      onChange={e => setSelectedColor(e.target.value)}
      disabled={!colors.length}
    >
      <option value="">-- Select color --</option>
      {colors.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  </div>
</div>

{/* Tableau */}
{sizes.length > 0 ? (
  <table className="results-table">
    <thead>
      <tr>
        <th>Size</th>
        <th>Stock</th>
        <th>Replenishment (Date)</th>
        <th>Qty Incoming</th>
      </tr>
    </thead>
    <tbody>
      {sizes.map(size => (
        <tr key={size}>
          <td>{size}</td>
          <td className="right">
            {stockBySize[size] > 0 ? stockBySize[size] : "Out of stock"}
          </td>
          <td className="center">
            {reapproBySize[size]?.dateToRec ?? "-"}
          </td>
          <td className="right">
            {reapproBySize[size]?.quantity ?? "-"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
) : (
  <div className="spacer" />
)}
    </div>
  );
}
