const normalizeLocalizedDigits = (value) =>
  `${value ?? ''}`
    .normalize('NFKC')
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (character) => {
      const codePoint = character.codePointAt(0);

      if (codePoint >= 0x0660 && codePoint <= 0x0669) {
        return String(codePoint - 0x0660);
      }

      return String(codePoint - 0x06f0);
    });

const sanitizeDigits = (value, maxLength = 19) =>
  normalizeLocalizedDigits(value).replace(/\D/g, '').slice(0, maxLength);

export const detectCardBrand = (value) => {
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

export const formatCardNumber = (value) => {
  const digits = sanitizeDigits(value);
  const brand = detectCardBrand(digits);

  if (brand === 'American Express') {
    const parts = [
      digits.slice(0, 4),
      digits.slice(4, 10),
      digits.slice(10, 15)
    ].filter(Boolean);

    return parts.join(' ');
  }

  return digits.match(/.{1,4}/g)?.join(' ') || '';
};

export const formatExpiry = (value) => {
  const digits = sanitizeDigits(value, 4);
  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
};

export const getCardDigits = (value) => sanitizeDigits(value);

export const getLastFourDigits = (value) => sanitizeDigits(value, 19).slice(-4);

export const isValidCardNumber = (value) => {
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

export const isValidExpiry = (value) => {
  const digits = sanitizeDigits(value, 4);

  if (digits.length !== 4) {
    return false;
  }

  const month = Number(digits.slice(0, 2));
  const year = Number(`20${digits.slice(2, 4)}`);

  if (month < 1 || month > 12) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return year > currentYear || (year === currentYear && month >= currentMonth);
};

export const isValidCvc = (value, brand = '') => {
  const digits = sanitizeDigits(value, 4);
  const expectedLength = brand === 'American Express' ? 4 : 3;

  return digits.length === expectedLength;
};

export const isValidCardholderName = (value) => {
  const trimmedValue = `${value ?? ''}`.trim();
  return trimmedValue.length >= 3 && /^[A-Za-zÀ-ÿ' -]+$/.test(trimmedValue);
};

export const getPaymentMethodLabel = (method, details = {}) => {
  if (method === 'paypal') {
    return details.paypalEmail ? `PayPal (${details.paypalEmail})` : 'PayPal';
  }

  const brand = details.brand || detectCardBrand(details.cardNumber);
  const lastFourDigits = details.last4 || getLastFourDigits(details.cardNumber);

  if (!lastFourDigits) {
    return brand || 'Carte bancaire';
  }

  return `${brand || 'Carte bancaire'} se terminant par ${lastFourDigits}`;
};
