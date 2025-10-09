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

 // ...imports inchangés

export default function App() {
  // ...state & effects inchangés

  return (
    <div className="app-container">
      {/* En-tête */}
      <header className="app-header">
        <img
          src="/IDEAL_BASIC_BRAND_LOGO_PRINCIPAL.jpg"
          alt="iDeal Basic Logo"
          className="app-logo"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <h1 className="app-title">STOCK CHECKER</h1>
      </header>

      {/* Filtres ... (inchangé) */}

      {/* Espace avant le visuel */}
      <div className="spacer" />

      {/* Visuel sous le tableau */}
      <div className="hero-image">
        <img
          src="/IB310-IB311_2026.jpg"
          alt="iDeal Basic Collection"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>
    </div>
  );
}
