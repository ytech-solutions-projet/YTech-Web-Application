const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const RECEIPT_CANVAS_WIDTH = 1240;
const RECEIPT_CANVAS_HEIGHT = 1754;

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
  let height = 90;

  context.font = '600 27px "Segoe UI", Arial, sans-serif';

  section.rows.forEach((row) => {
    const valueLines = wrapText(context, row.value, contentWidth - 24);
    height += 18 + valueLines.length * 32 + 20;
  });

  return height;
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

const drawReceiptCanvas = async (receipt) => {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch (error) {
      // Rien a faire: on garde les fontes de repli.
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = RECEIPT_CANVAS_WIDTH;
  canvas.height = RECEIPT_CANVAS_HEIGHT;

  const context = canvas.getContext('2d');

  context.fillStyle = '#efe4d4';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#e4d1bb';
  context.beginPath();
  context.arc(1080, 160, 220, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#d9baa1';
  context.beginPath();
  context.arc(1120, 220, 120, 0, Math.PI * 2);
  context.fill();

  drawRoundedRect(context, 70, 60, 1100, 1634, 42);
  context.fillStyle = '#fffaf4';
  context.fill();
  context.strokeStyle = '#d8c6b1';
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = '#a14d2b';
  context.font = '700 22px "Segoe UI", Arial, sans-serif';
  context.fillText('YTECH RECEIPT', 118, 138);

  context.fillStyle = '#12243d';
  context.font = '800 54px "Segoe UI", Arial, sans-serif';
  context.fillText('Recu de paiement', 118, 198);

  context.fillStyle = '#586678';
  context.font = '400 26px "Segoe UI", Arial, sans-serif';
  wrapText(context, receipt.summaryNote, 590).forEach((line, index) => {
    context.fillText(line, 118, 246 + index * 32);
  });

  drawRoundedRect(context, 910, 118, 170, 48, 24);
  context.fillStyle = '#12243d';
  context.fill();
  context.fillStyle = '#fffaf4';
  context.font = '700 16px "Segoe UI", Arial, sans-serif';
  context.fillText('CONFIRME', 954, 149);

  drawRoundedRect(context, 118, 320, 590, 202, 32);
  context.fillStyle = '#f8efe2';
  context.fill();
  context.strokeStyle = '#e7d8c6';
  context.stroke();

  context.fillStyle = '#6a778b';
  context.font = '600 18px "Segoe UI", Arial, sans-serif';
  context.fillText('TRANSACTION', 156, 374);
  context.fillStyle = '#12243d';
  context.font = '700 34px "Segoe UI", Arial, sans-serif';
  context.fillText(`#${receipt.transactionId}`, 156, 424);
  context.fillStyle = '#586678';
  context.font = '400 24px "Segoe UI", Arial, sans-serif';
  context.fillText(`Projet: ${receipt.projectLabel}`, 156, 470);
  context.fillText(`Reference: ${receipt.quoteReference}`, 156, 506);

  drawRoundedRect(context, 734, 320, 336, 202, 32);
  context.fillStyle = '#12243d';
  context.fill();
  context.fillStyle = '#d9e4f2';
  context.font = '600 18px "Segoe UI", Arial, sans-serif';
  context.fillText('MONTANT REGLE', 772, 374);
  context.fillStyle = '#fffaf4';
  context.font = '800 48px "Segoe UI", Arial, sans-serif';
  const amountLines = wrapText(context, receipt.amountLabel, 260);
  amountLines.forEach((line, index) => {
    context.fillText(line, 772, 440 + index * 52);
  });
  context.fillStyle = '#d9e4f2';
  context.font = '400 20px "Segoe UI", Arial, sans-serif';
  context.fillText(receipt.issuedAtLabel, 772, 492);

  let cursorY = 568;

  receipt.sections.forEach((section) => {
    cursorY = drawSection(context, section, 118, cursorY, 952);
  });

  context.strokeStyle = '#e7d8c6';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(118, 1560);
  context.lineTo(1070, 1560);
  context.stroke();

  context.fillStyle = '#586678';
  context.font = '400 22px "Segoe UI", Arial, sans-serif';
  context.fillText('Document genere depuis votre espace client YTECH.', 118, 1616);
  context.fillText('Ce recu est pret pour partage, impression et archivage PDF.', 118, 1650);

  return canvas;
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

const buildPdfBlobFromJpeg = (imageBytes, imageWidth, imageHeight) => {
  const encoder = new TextEncoder();
  const contentStream = `q\n${PDF_PAGE_WIDTH.toFixed(2)} 0 0 ${PDF_PAGE_HEIGHT.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  const offsets = [0];
  const parts = [];
  let totalLength = 0;

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
  pushText('2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n');

  offsets[3] = totalLength;
  pushText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH.toFixed(2)} ${PDF_PAGE_HEIGHT.toFixed(
      2
    )}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  offsets[4] = totalLength;
  pushText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  pushPart(imageBytes);
  pushText('\nendstream\nendobj\n');

  offsets[5] = totalLength;
  pushText(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  pushPart(contentBytes);
  pushText('endstream\nendobj\n');

  const xrefOffset = totalLength;
  pushText('xref\n0 6\n0000000000 65535 f \n');

  for (let index = 1; index <= 5; index += 1) {
    pushText(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }

  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(parts, { type: 'application/pdf' });
};

export const downloadReceiptPdf = async (receipt) => {
  const canvas = await drawReceiptCanvas(receipt);
  const jpegBlob = await canvasToJpegBlob(canvas);
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdfBlob = buildPdfBlobFromJpeg(jpegBytes, canvas.width, canvas.height);
  createDownload(pdfBlob, receipt.fileName);
};
