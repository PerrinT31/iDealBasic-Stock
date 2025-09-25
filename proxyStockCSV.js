// api/proxyStockCsv.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const external = await fetch(
      "https://files.karibanbrands.com/documents/IDEALBASIC_STOCK.csv" 
      // 👉 à remplacer par le vrai nom dès que tu me le transmets
    );
    const text = await external.text();

    // Autoriser le front à lire le CSV sans CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/csv");
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: "Impossible de récupérer le CSV" });
  }
}

