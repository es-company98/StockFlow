// receipt.js pro thermique avec code QR   
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

import { getAppConfig } from "./appConfig.js";

/* ================================
   CONFIGURATION
================================ */
let SHOP_NAME = "";
let SHOP_ADDRESS = "";
let SHOP_PHONE = "";
let CURRENCY_SYMBOL = "$";
let logoUrl = "shopLogo.png";

let configLoaded = null;

async function ensureConfig() {
  if (!configLoaded) {
    configLoaded =
      await getAppConfig(true);
    SHOP_NAME =
      configLoaded.shopName || "shop";

    SHOP_ADDRESS =
      configLoaded.shopAddress || "-";
    SHOP_PHONE =
      configLoaded.shopPhone || "-";
    logoUrl =
      configLoaded.logoUrl || "shopLogo.png";
    CURRENCY_SYMBOL =
      configLoaded.currencySymbol || "$";
  }
  return configLoaded;
}

/*
58mm ≈ 164pt
80mm ≈ 226pt
*/
const TICKET_WIDTH = 226;
const FONT_FAMILY = "courier";
const FONT_SIZE_NORMAL = 8;
const FONT_SIZE_SMALL = 7;
const FONT_SIZE_TITLE = 11;
const FONT_SIZE_TOTAL = 12;

const LEFT = 8;
const RIGHT = 218;

/* ================================
   CHARGEMENT IMAGE
================================ */

async function loadImage(url) {

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas =
        document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx =
        canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(
        canvas.toDataURL("image/png")
      );

    };

    img.onerror = () => resolve(null);
    img.src = url;

  });

}

/* ================================
   FORMAT DATE
================================ */

function formatDate(date) {

  const d = new Date(date);

  return (
    d.toLocaleDateString("fr-FR") +
    " " +
    d.toLocaleTimeString(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )
  );

}

/* ================================
   NORMALISATION
================================ */

function normalizeItems(items = []) {

  return items.map((item) => ({
    name:
      item.name || "Produit",

    qty:
      Number(
        item.qty ??
        item.quantity ??
        0
      ),
    price:
      Number(
        item.price ?? 0
      )
  }));
}

/* ================================
   TEXTE COURT
================================ */

function shortText(text, max = 16) {
  const value =
    String(text || "");

  if (value.length <= max) {
    return value;
  }
  return (
    value.slice(0, max - 1) + "…"
  );
}

/* ================================
   QR STYLE SIMPLE
================================ */

function drawQr(doc, x, y) {

  const cell = 3;
  const pattern = [
    "11111100",
    "10000100",
    "10110100",
    "10110100",
    "10000100",
    "11111100",
    "00000000",
    "00111000"
  ];

  pattern.forEach((row, rowIndex) => {

    row.split("").forEach((col, colIndex) => {
      if (col === "1") {
        doc.rect(
          x + (colIndex * cell),
          y + (rowIndex * cell),
          cell,
          cell,
          "F"
        );
      }
    });
  });
}

/* ================================
   SÉPARATEUR
================================ */

function drawSeparator(doc, y) {

  doc.setLineWidth(0.3);

  doc.line(
    LEFT,
    y,
    RIGHT,
    y
  );

}

/* ================================
   CALCUL HAUTEUR
================================ */

function calculateHeight(itemsCount) {

  return (
    250 +
    (itemsCount * 16)
  );

}

/* ================================
   DESSIN TICKET
================================ */
function drawReceipt(doc, data, logo) {

  let y = 10;

  const CENTER =
    TICKET_WIDTH / 2;
  /* ================================
     LOGO 1:1
  ================================= */

  if (logo) {

  const logoSize = 38;

  const logoX = LEFT;
  const logoY = y;

  // LOGO (GAUCHE)
  doc.addImage(
    logo,
    "PNG",
    logoX,
    logoY,
    logoSize,
    logoSize,
    undefined,
    "FAST"
  );

  // TEXTE À DROITE DU LOGO
  const textX = logoX + logoSize + 8;

  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(FONT_SIZE_TITLE);

  doc.text(
    SHOP_NAME,
    textX,
    logoY + 10
  );

  doc.setFont(FONT_FAMILY, "normal");
  doc.setFontSize(FONT_SIZE_SMALL);

  doc.text(
    SHOP_ADDRESS,
    textX,
    logoY + 20
  );

  doc.text(
    `Tel : ${SHOP_PHONE}`,
    textX,
    logoY + 30
  );

  // avance propre après header
  y += logoSize + 8;
}

  /* ================================
     INFOS REÇU
  ================================= */

  doc.setFontSize(
    FONT_SIZE_NORMAL
  );

  doc.setFont(
    FONT_FAMILY,
    "bold"
  );

  doc.text(
    "REÇU",
    LEFT,
    y
  );

  doc.setFont(
    FONT_FAMILY,
    "normal"
  );

  doc.text(
    `${data.saleId}`,
    RIGHT,
    y,
    {
      align: "right"
    }
  );

  y += 11;

  doc.text(
    "Date",
    LEFT,
    y
  );

  doc.text(
    formatDate(data.date),
    RIGHT,
    y,
    {
      align: "right"
    }
  );

  y += 11;

  doc.text(
    "Client",
    LEFT,
    y
  );

  doc.text(
    shortText(
      data.name ||
      "Client direct",
      18
    ),
    RIGHT,
    y,
    {
      align: "right"
    }
  );

  y += 12;

  if (data.offline) {

    doc.setFont(
      FONT_FAMILY,
      "bold"
    );

    doc.text(
      "0",
      CENTER,
      y,
      {
        align: "center"
      }
    );

    doc.setFont(
      FONT_FAMILY,
      "normal"
    );

    y += 12;

  }

  drawSeparator(doc, y);

  y += 12;

  /* ================================
     TABLE HEADER
  ================================= */

  doc.setFont(
    FONT_FAMILY,
    "bold"
  );

  doc.text(
    "Produit",
    LEFT,
    y
  );

  doc.text(
    "Qté",
    122,
    y,
    {
      align: "right"
    }
  );

  doc.text(
    "PU",
    168,
    y,
    {
      align: "right"
    }
  );

  doc.text(
    "Total",
    RIGHT,
    y,
    {
      align: "right"
    }
  );

  y += 8;

  drawSeparator(doc, y);

  y += 11;

  /* ================================
     PRODUITS
  ================================= */

  doc.setFont(
    FONT_FAMILY,
    "normal"
  );

  data.items.forEach((item) => {

    const total =
      item.qty * item.price;

    doc.text(
      shortText(
        item.name,
        14
      ),
      LEFT,
      y
    );

    doc.text(
      String(item.qty),
      122,
      y,
      {
        align: "right"
      }
    );

    doc.text(
      item.price.toFixed(0),
      168,
      y,
      {
        align: "right"
      }
    );

    doc.text(
      total.toFixed(0),
      RIGHT,
      y,
      {
        align: "right"
      }
    );

    y += 14;

  });

  drawSeparator(doc, y);

  y += 14;

  /* ================================
     TOTAL
  ================================= */

  doc.setFont(
    FONT_FAMILY,
    "bold"
  );

  doc.setFontSize(
    FONT_SIZE_TOTAL
  );

  doc.text(
    `TOTAL : ${data.total.toFixed(0)} ${CURRENCY_SYMBOL}`,
    RIGHT,
    y,
    {
      align: "right"
    }
  );

  y += 14;

  drawSeparator(doc, y);

  y += 14;

  /* ================================
     PAIEMENT
  ================================= */

  doc.setFontSize(
    FONT_SIZE_NORMAL
  );

  const paid =
    Number(
      data.amountPaid ||
      data.total
    );

  const remaining =
    Number(
      data.remaining || 0
    );

  const status =
    data.paymentMode === "partial"
      ? "PARTIEL"
      : "PAYÉ";

  doc.setFont(
    FONT_FAMILY,
    "normal"
  );

  doc.text(
    `Payé : ${paid.toFixed(0)} ${CURRENCY_SYMBOL}`,
    LEFT,
    y
  );

  y += 10;

  doc.text(
    `Reste : ${remaining.toFixed(0)} ${CURRENCY_SYMBOL}`,
    LEFT,
    y
  );

  y += 10;

  doc.text(
    `Statut : ${status}`,
    LEFT,
    y
  );

  y += 14;

  drawSeparator(doc, y);

  y += 14;

  /* ================================
     FOOTER + QR
  ================================= */

  const qrSize = 34;

  const qrX =
    RIGHT - qrSize;

  const qrY =
    y - 2;

  /*
    QR STYLE PRO
  */
  
  doc.setFillColor(0, 0, 0);
doc.setDrawColor(0, 0, 0);

const pixel = 2;

const qr = [
  "1111111000111111",
  "1000001000100001",
  "1011101000101111",
  "1011101000101111",
  "1011101000101111",
  "1000001000100001",
  "1111111000111111",
  "0000000000000000",
  "1110001110101011",
  "0011010011110010",
  "1110111010011101",
  "1001000110101001",
  "1111111000001111",
  "1000001000111001",
  "1011101000101111",
  "1111111000111111"
];

qr.forEach((row, r) => {
  row.split("").forEach((c, x) => {
    if (c === "1") {
      doc.rect(
        qrX + x * pixel,
        qrY + r * pixel,
        pixel,
        pixel,
        "F"
      );
    }
  });
});

  /*
    FOOTER TEXTE
  */

  doc.setFont(
    FONT_FAMILY,
    "normal"
  );

  doc.setFontSize(
    FONT_SIZE_SMALL
  );

  doc.text(
    "Merci pour votre achat",
    LEFT,
    y + 8
  );

  doc.text(
    "ES-SHOP",
    LEFT,
    y + 18
  );

  /*
    LIGNE BAS FOOTER
    même longueur que header
  */

  const footerLineY = qrY + (16 * pixel) + 10;

  drawSeparator(
    doc,
    footerLineY
  );

}

/* ================================
   EXPORT PRINCIPAL
================================ */

export async function generateReceipt(rawData) {
    await ensureConfig(); // 🔥 IMPORTANT
  if (
    !rawData ||
    !rawData.items
  ) {

    console.error(
      "Données invalides"
    );

    return;

  }

  const items =
    normalizeItems(
      rawData.items
    );

  const total =
    Number(
      rawData.total ??
      items.reduce(
        (sum, item) => {

          return (
            sum +
            (
              item.qty *
              item.price
            )
          );

        },
        0
      )
    );

  const data = {

    ...rawData,

    items,

    total

  };

  const ticketHeight =
    calculateHeight(
      data.items.length
    );

  const doc =
    new jsPDF({

      unit: "pt",

      format: [
        TICKET_WIDTH,
        ticketHeight
      ]
    });

  const logo =
    await loadImage(
      logoUrl
    );

  drawReceipt(
    doc,
    data,
    logo
  );
  
  doc.setProperties({
  title: `Reçu ${data.saleId}`,
  creator: "ES-SHOP POS",
  subject: "Ticket de vente"
});

  doc.save(
    `recu_${data.saleId}.pdf`
  );
}
