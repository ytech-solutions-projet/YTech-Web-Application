const { isValidEmail, normalizeEmail, normalizeText } = require('./security');

const sanitizeDigits = (value, maxLength = 19) =>
  `${value ?? ''}`.replace(/\D/g, '').slice(0, maxLength);

const detectCardBrand = (value) => {
  const digits = sanitizeDigits(value);

  if (/^4\d{0,18}$/.test(digits)) {
    return 'Visa';
  }

  if (
    /^(5[1-5]\d{0,14}|2(?:2[2-9]|[3-6]\d|7[01])\d{0,12}|2720\d{0,12})$/.test(digits)
  ) {
    return 'Mastercard';
  }

  if (/^3[47]\d{0,13}$/.test(digits)) {
    return 'American Express';
  }

  if (
    /^(6011\d{0,12}|65\d{0,14}|64[4-9]\d{0,13}|622(?:12[6-9]|1[3-9]\d|[2-8]\d{2}|9[01]\d|92[0-5])\d{0,10})$/.test(
      digits
    )
  ) {
    return 'Discover';
  }

  return digits ? 'Carte bancaire' : '';
};

const isValidCardNumber = (value) => {
  const digits = sanitizeDigits(value);

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  let checksum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    checksum += digit;
    shouldDouble = !shouldDouble;
  }

  return checksum % 10 === 0;
};

const parseExpiry = (value) => {
  const digits = sanitizeDigits(value, 4);
  return {
    month: digits.slice(0, 2),
    year: digits.slice(2, 4)
  };
};

const isValidExpiry = (value) => {
  const { month, year } = parseExpiry(value);

  if (month.length !== 2 || year.length !== 2) {
    return false;
  }

  const numericMonth = Number(month);
  const numericYear = Number(`20${year}`);

  if (numericMonth < 1 || numericMonth > 12) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return numericYear > currentYear || (numericYear === currentYear && numericMonth >= currentMonth);
};

const isValidCvc = (value, brand = '') => {
  const digits = sanitizeDigits(value, 4);
  const expectedLength = brand === 'American Express' ? 4 : 3;
  return digits.length === expectedLength;
};

const normalizePaymentPayload = (payload = {}, fallbackEmail = '') => {
  const normalizedMethod = normalizeText(payload.method || payload.paymentMethod, { maxLength: 20 }).toLowerCase();
  const method = normalizedMethod === 'paypal' ? 'paypal' : 'card';
  const payerEmail = normalizeEmail(payload.payerEmail || payload.paypalEmail || fallbackEmail);

  if (method === 'paypal') {
    return {
      method,
      payerEmail,
      payerName: normalizeText(payload.payerName || payload.cardholderName, { maxLength: 120 }),
      agreementAccepted: Boolean(payload.agreementAccepted)
    };
  }

  const cardNumber = sanitizeDigits(payload.cardNumber, 19);

  return {
    method,
    payerEmail,
    agreementAccepted: Boolean(payload.agreementAccepted),
    cardholderName: normalizeText(payload.cardholderName || payload.name, { maxLength: 120 }),
    cardNumber,
    expiry: sanitizeDigits(payload.expiry, 4),
    cvc: sanitizeDigits(payload.cvc, 4),
    brand: detectCardBrand(cardNumber)
  };
};

const validatePaymentPayload = (payment) => {
  if (!payment?.agreementAccepted) {
    return 'Veuillez confirmer les conditions de paiement avant de continuer';
  }

  if (payment.method === 'paypal') {
    if (!payment.payerEmail || !isValidEmail(payment.payerEmail)) {
      return 'Renseignez une adresse PayPal valide';
    }

    return null;
  }

  if (!payment.cardholderName || payment.cardholderName.length < 3) {
    return 'Le nom du titulaire de la carte est requis';
  }

  if (!payment.cardNumber || !isValidCardNumber(payment.cardNumber)) {
    return 'Le numero de carte bancaire est invalide';
  }

  if (!isValidExpiry(payment.expiry)) {
    return 'La date d expiration de la carte est invalide';
  }

  if (!isValidCvc(payment.cvc, payment.brand)) {
    return payment.brand === 'American Express'
      ? 'Le code de securite doit contenir 4 chiffres pour American Express'
      : 'Le code de securite doit contenir 3 chiffres';
  }

  if (!payment.payerEmail || !isValidEmail(payment.payerEmail)) {
    return 'Une adresse email valide est requise pour le recu de paiement';
  }

  return null;
};

const buildStoredPaymentMetadata = (payment, fallbackEmail = '') => {
  if (payment.method === 'paypal') {
    const payerEmail = payment.payerEmail || normalizeEmail(fallbackEmail);

    return {
      paymentMethod: 'paypal',
      paymentProvider: 'paypal',
      paymentCardBrand: '',
      paymentLast4: '',
      paymentPayerEmail: payerEmail,
      paymentLabel: payerEmail ? `PayPal (${payerEmail})` : 'PayPal'
    };
  }

  const brand = payment.brand || detectCardBrand(payment.cardNumber);
  const lastFourDigits = payment.cardNumber.slice(-4);

  return {
    paymentMethod: 'card',
    paymentProvider: 'card',
    paymentCardBrand: brand,
    paymentLast4: lastFourDigits,
    paymentPayerEmail: payment.payerEmail || normalizeEmail(fallbackEmail),
    paymentLabel: `${brand || 'Carte bancaire'} se terminant par ${lastFourDigits}`
  };
};

module.exports = {
  buildStoredPaymentMetadata,
  detectCardBrand,
  normalizePaymentPayload,
  validatePaymentPayload
};
