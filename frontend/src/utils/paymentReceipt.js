const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const RECEIPT_CANVAS_WIDTH = 1240;
const RECEIPT_PAGE_CANVAS_HEIGHT = 1754;
const RECEIPT_SHEET_X = 70;
const RECEIPT_SHEET_Y = 60;
const RECEIPT_SHEET_WIDTH = 1100;
const RECEIPT_SHEET_HEIGHT = 1634;
const RECEIPT_SECTION_X = 118;
const RECEIPT_SECTION_WIDTH = 952;
const RECEIPT_FIRST_PAGE_MIN_HERO_TOP = 320;
const RECEIPT_FIRST_PAGE_SECTION_GAP = 46;
const RECEIPT_FIRST_PAGE_CONTENT_START = 568;
const RECEIPT_CONTINUATION_PAGE_CONTENT_START = 278;
const RECEIPT_PAGE_CONTENT_END = 1496;
const RECEIPT_FOOTER_BASELINE_Y = 1560;
const RECEIPT_FOOTER_TEXT_HEIGHT = 116;
const RECEIPT_FOOTER_MAX_BASELINE_Y =
  RECEIPT_SHEET_Y + RECEIPT_SHEET_HEIGHT - RECEIPT_FOOTER_TEXT_HEIGHT;

const normalizeText = (value, fallback = 'N/A') => {
  const text = `${value ?? ''}`.trim();
  return text || fallback;
};

const escapeHtml = (value) =>
  normalizeText(value, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatNumber = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0';
  }

  return numericValue.toLocaleString('fr-MA');
};

const buildStatusLabel = (status) => {
  const normalizedStatus = `${status ?? ''}`.trim().toLowerCase();

  if (normalizedStatus === 'paid' || normalizedStatus === 'completed') {
    return 'Paiement confirme';
  }

  if (normalizedStatus === 'pending') {
    return 'En attente';
  }

  if (normalizedStatus === 'failed') {
    return 'Echec de paiement';
  }

  return 'Confirme';
};

const buildPaymentDetail = (transaction) => {
  if (transaction?.cardBrand && transaction?.cardLast4) {
    return `${normalizeText(transaction.cardBrand, 'Carte bancaire')} se terminant par ${transaction.cardLast4}`;
  }

  if (transaction?.paymentLabel) {
    return normalizeText(transaction.paymentLabel, 'Paiement securise');
  }

  if (`${transaction?.paymentMethod ?? ''}`.toLowerCase() === 'paypal') {
    return 'PayPal';
  }

  return 'Paiement securise';
};

export const formatReceiptDate = (timestamp) => {
  const date = new Date(timestamp || new Date().toISOString());

  if (Number.isNaN(date.getTime())) {
    return 'Date indisponible';
  }

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatReceiptMoney = (amount, currency = 'MAD') => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return `0 ${currency || 'MAD'}`;
  }

  return `${numericAmount.toLocaleString('fr-MA')} ${currency || 'MAD'}`;
};

export const buildReceiptDocument = ({ transaction, user } = {}) => {
  const transactionId = normalizeText(transaction?.id, `pay_${Date.now()}`);
  const projectLabel = normalizeText(transaction?.service || transaction?.planName, 'Projet YTECH');
  const quoteReference = normalizeText(transaction?.quoteId, 'Paiement direct');
  const amountLabel = formatReceiptMoney(transaction?.amount, transaction?.currency || 'MAD');
  const issuedAtLabel = formatReceiptDate(transaction?.timestamp || new Date().toISOString());
  const paymentEmail = normalizeText(transaction?.paymentEmail || user?.email, 'N/A');
  const customerName = normalizeText(user?.name, 'Client YTECH');
  const customerEmail = normalizeText(user?.email, 'N/A');
  const customerCompany = normalizeText(user?.company, 'Non renseignee');
  const paymentDetail = buildPaymentDetail(transaction);
  const paymentStatus = buildStatusLabel(transaction?.status);

  return {
    title: 'Recu de paiement',
    fileName: `recu_ytech_${transactionId}.pdf`,
    transactionId,
    projectLabel,
    quoteReference,
    amountLabel,
    paymentDetail,
    paymentStatus,
    paymentEmail,
    issuedAtLabel,
    customerName,
    customerEmail,
    customerCompany,
    supportEmail: 'contact@ytech.ma',
    supportPhone: '+212 6 00 00 00 00',
    supportLocation: 'Casablanca, Maroc',
    summaryNote: transaction?.quoteId
      ? 'Ce recu confirme le lancement du projet rattache a votre devis.'
      : 'Ce recu confirme votre paiement et reste pret a etre partage en PDF.',
    sections: [
      {
        title: 'Transaction',
        rows: [
          { label: 'Numero', value: transactionId },
          { label: 'Date', value: issuedAtLabel },
          { label: 'Statut', value: paymentStatus }
        ]
      },
      {
        title: 'Paiement',
        rows: [
          { label: 'Montant', value: amountLabel },
          { label: 'Moyen', value: paymentDetail },
          { label: 'Email de recu', value: paymentEmail }
        ]
      },
      {
        title: 'Client et projet',
        rows: [
          { label: 'Client', value: customerName },
          { label: 'Email', value: customerEmail },
          { label: 'Societe', value: customerCompany },
          { label: 'Projet', value: projectLabel },
          { label: 'Reference', value: quoteReference }
        ]
      },
      {
        title: 'Support YTECH',
        rows: [
          { label: 'Email', value: 'contact@ytech.ma' },
          { label: 'Telephone', value: '+212 6 00 00 00 00' },
          { label: 'Ville', value: 'Casablanca, Maroc' }
        ]
      }
    ]
  };
};

const buildSectionHtml = (section) => `
  <section class="receipt-print__section">
    <h3>${escapeHtml(section.title)}</h3>
    <div class="receipt-print__rows">
      ${section.rows
        .map(
          (row) => `
            <div class="receipt-print__row">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.value)}</strong>
            </div>
          `
        )
        .join('')}
    </div>
  </section>
`;

const buildPrintHtml = (receipt) => `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(receipt.fileName)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #efe4d4;
        color: #12243d;
      }

      .receipt-print__shell {
        min-height: 100vh;
        padding: 24px;
      }

      .receipt-print__sheet {
        width: min(100%, 820px);
        margin: 0 auto;
        background: #fffaf4;
        border: 1px solid #d8c6b1;
        border-radius: 28px;
        box-shadow: 0 24px 60px rgba(18, 36, 61, 0.14);
        overflow: hidden;
      }

      .receipt-print__topbar {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        padding: 24px 28px 0;
      }

      .receipt-print__brand {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .receipt-print__eyebrow {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #a14d2b;
      }

      .receipt-print__brand strong {
        font-size: 28px;
        letter-spacing: 0.08em;
      }

      .receipt-print__status {
        padding: 10px 16px;
        border-radius: 999px;
        background: #12243d;
        color: #fffaf4;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .receipt-print__hero {
        display: grid;
        grid-template-columns: 1.3fr 0.9fr;
        gap: 18px;
        padding: 28px;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .receipt-print__hero-card,
      .receipt-print__amount {
        border-radius: 24px;
        padding: 24px;
      }

      .receipt-print__hero-card {
        background: linear-gradient(145deg, #f8efe2 0%, #fffdf9 100%);
        border: 1px solid #e7d8c6;
      }

      .receipt-print__hero-card h1 {
        margin: 0 0 12px;
        font-size: 32px;
        line-height: 1.08;
      }

      .receipt-print__hero-card p {
        margin: 0;
        color: #536273;
        line-height: 1.7;
      }

      .receipt-print__meta {
        margin-top: 18px;
        display: inline-flex;
        padding: 10px 14px;
        border-radius: 16px;
        background: #fffaf4;
        border: 1px solid #e7d8c6;
        font-weight: 700;
      }

      .receipt-print__amount {
        background: #12243d;
        color: #fffaf4;
        display: grid;
        gap: 10px;
        align-content: start;
      }

      .receipt-print__amount span {
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(255, 250, 244, 0.72);
      }

      .receipt-print__amount strong {
        font-size: 34px;
        line-height: 1.04;
      }

      .receipt-print__amount small {
        font-size: 14px;
        color: rgba(255, 250, 244, 0.78);
      }

      .receipt-print__grid {
        display: grid;
        gap: 16px;
        padding: 0 28px 28px;
      }

      .receipt-print__section {
        border: 1px solid #e7d8c6;
        border-radius: 22px;
        background: #ffffff;
        padding: 20px;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .receipt-print__section h3 {
        margin: 0 0 16px;
        font-size: 16px;
      }

      .receipt-print__rows {
        display: grid;
        gap: 12px;
      }

      .receipt-print__row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
        padding: 14px 16px;
        border-radius: 16px;
        background: #faf4eb;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .receipt-print__row span {
        color: #667487;
      }

      .receipt-print__row strong {
        max-width: 58%;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .receipt-print__footer {
        padding: 0 28px 28px;
        color: #667487;
        line-height: 1.7;
      }

      @media (max-width: 720px) {
        .receipt-print__hero {
          grid-template-columns: 1fr;
        }

        .receipt-print__row {
          flex-direction: column;
        }

        .receipt-print__row strong {
          max-width: none;
          text-align: left;
        }
      }

      @media print {
        body {
          background: #ffffff;
        }

        .receipt-print__shell {
          padding: 0;
        }

        .receipt-print__sheet {
          width: 100%;
          border: none;
          border-radius: 0;
          box-shadow: none;
        }

        .receipt-print__grid {
          display: block;
        }

        .receipt-print__section {
          margin-bottom: 16px;
        }
      }
    </style>
  </head>
  <body>
    <main class="receipt-print__shell">
      <article class="receipt-print__sheet">
        <div class="receipt-print__topbar">
          <div class="receipt-print__brand">
            <span class="receipt-print__eyebrow">YTECH Receipt</span>
            <strong>YTECH</strong>
          </div>
          <div class="receipt-print__status">${escapeHtml(receipt.paymentStatus)}</div>
        </div>

        <section class="receipt-print__hero">
          <div class="receipt-print__hero-card">
            <h1>${escapeHtml(receipt.title)}</h1>
            <p>${escapeHtml(receipt.summaryNote)}</p>
            <div class="receipt-print__meta">Transaction #${escapeHtml(receipt.transactionId)}</div>
          </div>
          <div class="receipt-print__amount">
            <span>Montant regle</span>
            <strong>${escapeHtml(receipt.amountLabel)}</strong>
            <small>${escapeHtml(receipt.issuedAtLabel)}</small>
          </div>
        </section>

        <section class="receipt-print__grid">
          ${receipt.sections.map((section) => buildSectionHtml(section)).join('')}
        </section>

        <footer class="receipt-print__footer">
          Document genere depuis votre espace client YTECH. Ce recu peut etre imprime ou enregistre au format PDF.
        </footer>
      </article>
    </main>

    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 180);
      });
    </script>
  </body>
</html>
`;

export const openReceiptPrintWindow = (receipt) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const printWindow = window.open('', '_blank', 'width=980,height=900');

  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintHtml(receipt));
  printWindow.document.close();
  return true;
};

const createDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

const drawRoundedRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const splitLongWord = (context, value, maxWidth) => {
  const fragments = [];
  let currentFragment = '';

  `${value ?? ''}`.split('').forEach((character) => {
    const nextFragment = `${currentFragment}${character}`;

    if (context.measureText(nextFragment).width <= maxWidth || !currentFragment) {
      currentFragment = nextFragment;
      return;
    }

    fragments.push(currentFragment);
    currentFragment = character;
  });

  if (currentFragment) {
    fragments.push(currentFragment);
  }

  return fragments;
};

const wrapText = (context, text, maxWidth) => {
  const normalizedText = normalizeText(text, '');

  if (!normalizedText) {
    return [''];
  }

  const words = normalizedText.split(/\s+/);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const fragments =
      context.measureText(word).width > maxWidth ? splitLongWord(context, word, maxWidth) : [word];

    fragments.forEach((fragment) => {
      const nextLine = currentLine ? `${currentLine} ${fragment}` : fragment;

      if (context.measureText(nextLine).width <= maxWidth || !currentLine) {
        currentLine = nextLine;
        return;
      }

      lines.push(currentLine);
      currentLine = fragment;
    });
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const measureSection = (context, width, section) => {
  const contentWidth = width - 64;
  let height = 82;

  context.font = '600 27px "Segoe UI", Arial, sans-serif';

  section.rows.forEach((row) => {
    const valueLines = wrapText(context, row.value, contentWidth - 24);
    height += 62 + valueLines.length * 32;
  });

  return height;
};

const measureTopCards = (context, receipt) => {
  context.font = '700 34px "Segoe UI", Arial, sans-serif';
  const transactionIdLines = wrapText(context, `#${receipt.transactionId}`, 500);

  context.font = '400 24px "Segoe UI", Arial, sans-serif';
  const projectLines = wrapText(context, `Projet: ${receipt.projectLabel}`, 500);
  const referenceLines = wrapText(context, `Reference: ${receipt.quoteReference}`, 500);

  context.font = '800 48px "Segoe UI", Arial, sans-serif';
  const amountLines = wrapText(context, receipt.amountLabel, 260);

  context.font = '400 20px "Segoe UI", Arial, sans-serif';
  const issuedAtLines = wrapText(context, receipt.issuedAtLabel, 260);

  const leftHeight = Math.max(
    202,
    38 +
      26 +
      28 +
      transactionIdLines.length * 40 +
      8 +
      projectLines.length * 30 +
      8 +
      referenceLines.length * 30 +
      34
  );

  const rightHeight = Math.max(
    202,
    38 + 26 + 30 + amountLines.length * 52 + 12 + issuedAtLines.length * 26 + 34
  );

  return {
    transactionIdLines,
    projectLines,
    referenceLines,
    amountLines,
    issuedAtLines,
    heroHeight: Math.max(leftHeight, rightHeight)
  };
};

const buildReceiptLayout = (context, receipt) => {
  context.font = '400 26px "Segoe UI", Arial, sans-serif';
  const introLines = wrapText(context, receipt.summaryNote, 590);
  const heroTop = Math.max(
    RECEIPT_FIRST_PAGE_MIN_HERO_TOP,
    246 + introLines.length * 32 + 42
  );
  const topCards = measureTopCards(context, receipt);
  const firstPageContentStart = Math.max(
    RECEIPT_FIRST_PAGE_CONTENT_START,
    heroTop + topCards.heroHeight + RECEIPT_FIRST_PAGE_SECTION_GAP
  );
  const sectionLayouts = [];
  let pageIndex = 0;
  let cursorY = firstPageContentStart;

  receipt.sections.forEach((section) => {
    const sectionHeight = measureSection(context, RECEIPT_SECTION_WIDTH, section);

    if (cursorY + sectionHeight > RECEIPT_PAGE_CONTENT_END) {
      pageIndex += 1;
      cursorY = RECEIPT_CONTINUATION_PAGE_CONTENT_START;
    }

    sectionLayouts.push({
      section,
      height: sectionHeight,
      pageIndex,
      y: cursorY
    });

    cursorY += sectionHeight + 24;
  });

  let footerPageIndex = pageIndex;
  let footerY = Math.max(cursorY + 28, RECEIPT_FOOTER_BASELINE_Y);

  if (footerY > RECEIPT_FOOTER_MAX_BASELINE_Y) {
    footerPageIndex += 1;
    footerY = RECEIPT_FOOTER_BASELINE_Y;
  }

  return {
    footerPageIndex,
    footerY,
    introLines,
    sections: sectionLayouts,
    topCards,
    totalPages: footerPageIndex + 1,
    firstPageContentStart,
    heroTop
  };
};

const getPageOffset = (pageIndex) => pageIndex * RECEIPT_PAGE_CANVAS_HEIGHT;

const drawStatusPill = (context, label, x, y, width = 170) => {
  drawRoundedRect(context, x, y, width, 48, 24);
  context.fillStyle = '#12243d';
  context.fill();
  context.fillStyle = '#fffaf4';
  context.font = '700 16px "Segoe UI", Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(label.toUpperCase(), x + width / 2, y + 31);
  context.textAlign = 'left';
};

const drawReceiptPageBackground = (context, pageIndex) => {
  const offsetY = getPageOffset(pageIndex);

  context.fillStyle = '#efe4d4';
  context.fillRect(0, offsetY, RECEIPT_CANVAS_WIDTH, RECEIPT_PAGE_CANVAS_HEIGHT);

  context.fillStyle = '#e4d1bb';
  context.beginPath();
  context.arc(1080, offsetY + 160, 220, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#d9baa1';
  context.beginPath();
  context.arc(1120, offsetY + 220, 120, 0, Math.PI * 2);
  context.fill();

  drawRoundedRect(
    context,
    RECEIPT_SHEET_X,
    offsetY + RECEIPT_SHEET_Y,
    RECEIPT_SHEET_WIDTH,
    RECEIPT_SHEET_HEIGHT,
    42
  );
  context.fillStyle = '#fffaf4';
  context.fill();
  context.strokeStyle = '#d8c6b1';
  context.lineWidth = 3;
  context.stroke();
};

const drawSection = (context, section, x, y, width) => {
  const sectionHeight = measureSection(context, width, section);
  const contentWidth = width - 64;
  let cursorY = y + 46;

  drawRoundedRect(context, x, y, width, sectionHeight, 28);
  context.fillStyle = '#ffffff';
  context.fill();
  context.strokeStyle = '#e7d8c6';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#12243d';
  context.font = '700 28px "Segoe UI", Arial, sans-serif';
  context.fillText(section.title, x + 32, cursorY);

  cursorY += 26;

  section.rows.forEach((row, index) => {
    const rowY = cursorY + 14;
    const valueLines = wrapText(context, row.value, contentWidth - 24);

    drawRoundedRect(context, x + 24, rowY, width - 48, 34 + valueLines.length * 32, 18);
    context.fillStyle = '#faf4eb';
    context.fill();

    context.fillStyle = '#6a778b';
    context.font = '600 18px "Segoe UI", Arial, sans-serif';
    context.fillText(row.label.toUpperCase(), x + 46, rowY + 26);

    context.fillStyle = '#12243d';
    context.font = '600 27px "Segoe UI", Arial, sans-serif';
    valueLines.forEach((line, lineIndex) => {
      context.fillText(line, x + 46, rowY + 60 + lineIndex * 32);
    });

    cursorY = rowY + 34 + valueLines.length * 32 + 14;

    if (index === section.rows.length - 1) {
      cursorY += 10;
    }
  });

  return y + sectionHeight + 24;
};

const drawFirstPageHeader = (context, receipt, layout) => {
  context.fillStyle = '#a14d2b';
  context.font = '700 22px "Segoe UI", Arial, sans-serif';
  context.fillText('YTECH RECEIPT', 118, 138);

  context.fillStyle = '#12243d';
  context.font = '800 54px "Segoe UI", Arial, sans-serif';
  context.fillText('Recu de paiement', 118, 198);

  context.fillStyle = '#586678';
  context.font = '400 26px "Segoe UI", Arial, sans-serif';
  layout.introLines.forEach((line, index) => {
    context.fillText(line, 118, 246 + index * 32);
  });

  drawStatusPill(context, receipt.paymentStatus, 910, 118);

  if (layout.totalPages > 1) {
    context.fillStyle = '#586678';
    context.font = '600 18px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'right';
    context.fillText(`Page 1/${layout.totalPages}`, 1070, 192);
    context.textAlign = 'left';
  }
};

const drawFirstPageHero = (context, receipt, layout) => {
  const heroTop = layout.heroTop;
  const heroHeight = layout.topCards.heroHeight;
  const leftX = RECEIPT_SECTION_X;
  const rightX = 734;

  drawRoundedRect(context, leftX, heroTop, 590, heroHeight, 32);
  context.fillStyle = '#f8efe2';
  context.fill();
  context.strokeStyle = '#e7d8c6';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#6a778b';
  context.font = '600 18px "Segoe UI", Arial, sans-serif';
  context.fillText('TRANSACTION', leftX + 38, heroTop + 54);

  let cursorY = heroTop + 104;

  context.fillStyle = '#12243d';
  context.font = '700 34px "Segoe UI", Arial, sans-serif';
  layout.topCards.transactionIdLines.forEach((line) => {
    context.fillText(line, leftX + 38, cursorY);
    cursorY += 40;
  });

  cursorY += 8;
  context.fillStyle = '#586678';
  context.font = '400 24px "Segoe UI", Arial, sans-serif';
  layout.topCards.projectLines.forEach((line) => {
    context.fillText(line, leftX + 38, cursorY);
    cursorY += 30;
  });

  cursorY += 8;
  layout.topCards.referenceLines.forEach((line) => {
    context.fillText(line, leftX + 38, cursorY);
    cursorY += 30;
  });

  drawRoundedRect(context, rightX, heroTop, 336, heroHeight, 32);
  context.fillStyle = '#12243d';
  context.fill();

  context.fillStyle = '#d9e4f2';
  context.font = '600 18px "Segoe UI", Arial, sans-serif';
  context.fillText('MONTANT REGLE', rightX + 38, heroTop + 54);

  cursorY = heroTop + 106;
  context.fillStyle = '#fffaf4';
  context.font = '800 48px "Segoe UI", Arial, sans-serif';
  layout.topCards.amountLines.forEach((line) => {
    context.fillText(line, rightX + 38, cursorY);
    cursorY += 52;
  });

  cursorY += 4;
  context.fillStyle = '#d9e4f2';
  context.font = '400 20px "Segoe UI", Arial, sans-serif';
  layout.topCards.issuedAtLines.forEach((line) => {
    context.fillText(line, rightX + 38, cursorY);
    cursorY += 26;
  });
};

const drawContinuationHeader = (context, receipt, pageIndex, totalPages) => {
  const offsetY = getPageOffset(pageIndex);

  context.fillStyle = '#a14d2b';
  context.font = '700 22px "Segoe UI", Arial, sans-serif';
  context.fillText('YTECH RECEIPT', 118, offsetY + 138);

  context.fillStyle = '#12243d';
  context.font = '800 46px "Segoe UI", Arial, sans-serif';
  context.fillText('Suite du recu', 118, offsetY + 194);

  context.fillStyle = '#586678';
  context.font = '400 22px "Segoe UI", Arial, sans-serif';
  wrapText(
    context,
    `Transaction #${receipt.transactionId} - ${receipt.projectLabel}`,
    720
  ).forEach((line, index) => {
    context.fillText(line, 118, offsetY + 234 + index * 28);
  });

  drawStatusPill(context, receipt.paymentStatus, 910, offsetY + 118);

  context.fillStyle = '#586678';
  context.font = '600 18px "Segoe UI", Arial, sans-serif';
  context.textAlign = 'right';
  context.fillText(`Page ${pageIndex + 1}/${totalPages}`, 1070, offsetY + 194);
  context.textAlign = 'left';
};

const drawFooter = (context, pageIndex, footerY, totalPages) => {
  const offsetY = getPageOffset(pageIndex);
  const baselineY = offsetY + footerY;

  context.strokeStyle = '#e7d8c6';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(118, baselineY);
  context.lineTo(1070, baselineY);
  context.stroke();

  context.fillStyle = '#586678';
  context.font = '400 22px "Segoe UI", Arial, sans-serif';
  context.fillText('Document genere depuis votre espace client YTECH.', 118, baselineY + 56);
  context.fillText('Ce recu est pret pour partage, impression et archivage PDF.', 118, baselineY + 90);

  if (totalPages > 1) {
    context.font = '600 18px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'right';
    context.fillText(`Page ${pageIndex + 1}/${totalPages}`, 1070, baselineY + 90);
    context.textAlign = 'left';
  }
};

const sliceCanvasIntoPages = (canvas, totalPages) =>
  Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = RECEIPT_PAGE_CANVAS_HEIGHT;

    const pageContext = pageCanvas.getContext('2d');
    pageContext.drawImage(canvas, 0, -pageIndex * RECEIPT_PAGE_CANVAS_HEIGHT);

    return pageCanvas;
  });

const drawReceiptCanvasPages = async (receipt) => {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch (error) {
      // Rien a faire: on garde les fontes de repli.
    }
  }

  const measurementCanvas = document.createElement('canvas');
  measurementCanvas.width = RECEIPT_CANVAS_WIDTH;
  measurementCanvas.height = RECEIPT_PAGE_CANVAS_HEIGHT;

  const measurementContext = measurementCanvas.getContext('2d');
  const layout = buildReceiptLayout(measurementContext, receipt);
  const canvas = document.createElement('canvas');
  canvas.width = RECEIPT_CANVAS_WIDTH;
  canvas.height = RECEIPT_PAGE_CANVAS_HEIGHT * layout.totalPages;

  const context = canvas.getContext('2d');

  Array.from({ length: layout.totalPages }, (_, pageIndex) => {
    drawReceiptPageBackground(context, pageIndex);

    if (pageIndex === 0) {
      drawFirstPageHeader(context, receipt, layout);
      drawFirstPageHero(context, receipt, layout);
      return;
    }

    drawContinuationHeader(context, receipt, pageIndex, layout.totalPages);
  });

  layout.sections.forEach(({ pageIndex, section, y }) => {
    drawSection(
      context,
      section,
      RECEIPT_SECTION_X,
      getPageOffset(pageIndex) + y,
      RECEIPT_SECTION_WIDTH
    );
  });

  drawFooter(context, layout.footerPageIndex, layout.footerY, layout.totalPages);

  return sliceCanvasIntoPages(canvas, layout.totalPages);
};

const canvasToJpegBlob = (canvas) =>
  new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Impossible de generer le visuel du recu.'));
        },
        'image/jpeg',
        0.95
      );
      return;
    }

    reject(new Error('La generation PDF n est pas supportee sur ce navigateur.'));
  });

const buildPdfBlobFromJpegs = (pages) => {
  const encoder = new TextEncoder();
  const offsets = [0];
  const parts = [];
  let totalLength = 0;
  const pageCount = pages.length;
  const objectCount = 2 + pageCount * 3;

  const pushPart = (part) => {
    parts.push(part);
    totalLength += part.length;
  };

  const pushText = (text) => {
    pushPart(encoder.encode(text));
  };

  pushText('%PDF-1.4\n%YTECHReceipt\n');

  offsets[1] = totalLength;
  pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = totalLength;
  pushText(
    `2 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [${pages
      .map((_, pageIndex) => `${3 + pageIndex * 3} 0 R`)
      .join(' ')}] >>\nendobj\n`
  );

  pages.forEach((page, pageIndex) => {
    const pageObjectIndex = 3 + pageIndex * 3;
    const imageObjectIndex = pageObjectIndex + 1;
    const contentObjectIndex = pageObjectIndex + 2;
    const imageName = `Im${pageIndex}`;
    const contentBytes = encoder.encode(
      `q\n${PDF_PAGE_WIDTH.toFixed(2)} 0 0 ${PDF_PAGE_HEIGHT.toFixed(2)} 0 0 cm\n/${imageName} Do\nQ\n`
    );

    offsets[pageObjectIndex] = totalLength;
    pushText(
      `${pageObjectIndex} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH.toFixed(
        2
      )} ${PDF_PAGE_HEIGHT.toFixed(
        2
      )}] /Resources << /XObject << /${imageName} ${imageObjectIndex} 0 R >> >> /Contents ${contentObjectIndex} 0 R >>\nendobj\n`
    );

    offsets[imageObjectIndex] = totalLength;
    pushText(
      `${imageObjectIndex} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`
    );
    pushPart(page.bytes);
    pushText('\nendstream\nendobj\n');

    offsets[contentObjectIndex] = totalLength;
    pushText(`${contentObjectIndex} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    pushPart(contentBytes);
    pushText('endstream\nendobj\n');
  });

  const xrefOffset = totalLength;
  pushText(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);

  for (let index = 1; index <= objectCount; index += 1) {
    pushText(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }

  pushText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(parts, { type: 'application/pdf' });
};

export const downloadReceiptPdf = async (receipt) => {
  const pageCanvases = await drawReceiptCanvasPages(receipt);
  const pages = await Promise.all(
    pageCanvases.map(async (pageCanvas) => {
      const jpegBlob = await canvasToJpegBlob(pageCanvas);

      return {
        bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
        width: pageCanvas.width,
        height: pageCanvas.height
      };
    })
  );
  const pdfBlob = buildPdfBlobFromJpegs(pages);
  createDownload(pdfBlob, receipt.fileName);
};

export const __paymentReceiptTestUtils = {
  buildReceiptLayout,
  measureSection,
  RECEIPT_FOOTER_BASELINE_Y,
  RECEIPT_FOOTER_MAX_BASELINE_Y
};
