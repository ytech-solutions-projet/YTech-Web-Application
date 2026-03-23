export const PHONE_COUNTRIES = [
  { code: 'MA', label: 'Maroc', dialCode: '+212', minLength: 9, maxLength: 9, nationalPrefix: '0', example: '6 00 00 00 00' },
  { code: 'FR', label: 'France', dialCode: '+33', minLength: 9, maxLength: 9, nationalPrefix: '0', example: '6 12 34 56 78' },
  { code: 'BE', label: 'Belgique', dialCode: '+32', minLength: 8, maxLength: 9, nationalPrefix: '0', example: '470 12 34 56' },
  { code: 'DZ', label: 'Algerie', dialCode: '+213', minLength: 9, maxLength: 9, nationalPrefix: '0', example: '5 55 55 55 55' },
  { code: 'TN', label: 'Tunisie', dialCode: '+216', minLength: 8, maxLength: 8, nationalPrefix: '0', example: '20 123 456' },
  { code: 'CA', label: 'Canada', dialCode: '+1', minLength: 10, maxLength: 10, nationalPrefix: '', example: '514 555 1234' },
  { code: 'AE', label: 'Emirats arabes unis', dialCode: '+971', minLength: 9, maxLength: 9, nationalPrefix: '0', example: '50 123 4567' }
];

export const DEFAULT_PHONE_COUNTRY = 'MA';

export const getPhoneCountry = (countryCode = DEFAULT_PHONE_COUNTRY) =>
  PHONE_COUNTRIES.find((country) => country.code === countryCode) || PHONE_COUNTRIES[0];

const getPhoneCountryByDialCode = (value = '') =>
  [...PHONE_COUNTRIES]
    .sort((first, second) => second.dialCode.length - first.dialCode.length)
    .find((country) => `${value}`.startsWith(country.dialCode)) || null;

const sanitizePhoneInput = (value = '') => {
  const rawValue = `${value}`.trim();

  if (!rawValue) {
    return '';
  }

  const normalizedValue = rawValue.startsWith('00') ? `+${rawValue.slice(2)}` : rawValue;
  const compactValue = normalizedValue.replace(/[^\d+]/g, '');

  if (compactValue.startsWith('+')) {
    return `+${compactValue.slice(1).replace(/\+/g, '')}`;
  }

  return compactValue;
};

const normalizeLocalDigits = (digits, country) => {
  if (!digits) {
    return '';
  }

  const dialDigits = country.dialCode.replace('+', '');
  let normalizedDigits = digits.replace(/\D/g, '');

  if (normalizedDigits.startsWith(dialDigits)) {
    normalizedDigits = normalizedDigits.slice(dialDigits.length);
  }

  if (
    country.nationalPrefix &&
    normalizedDigits.startsWith(country.nationalPrefix) &&
    normalizedDigits.length > country.maxLength
  ) {
    normalizedDigits = normalizedDigits.slice(country.nationalPrefix.length);
  }

  return normalizedDigits.slice(0, country.maxLength);
};

export const buildPhoneValue = (countryCode, localNumber) => {
  const country = getPhoneCountry(countryCode);
  const normalizedDigits = normalizeLocalDigits(localNumber, country);

  if (!normalizedDigits) {
    return '';
  }

  return `${country.dialCode}${normalizedDigits}`;
};

export const parsePhoneValue = (value, fallbackCountryCode = DEFAULT_PHONE_COUNTRY) => {
  const sanitizedPhone = sanitizePhoneInput(value);
  const detectedCountry = sanitizedPhone.startsWith('+')
    ? getPhoneCountryByDialCode(sanitizedPhone)
    : null;
  const country = detectedCountry || getPhoneCountry(fallbackCountryCode);

  if (!sanitizedPhone) {
    return {
      countryCode: country.code,
      localNumber: '',
      normalizedValue: ''
    };
  }

  const digits = sanitizedPhone.startsWith('+') ? sanitizedPhone.slice(1) : sanitizedPhone;
  const localNumber = normalizeLocalDigits(digits, country);

  return {
    countryCode: country.code,
    localNumber,
    normalizedValue: localNumber ? `${country.dialCode}${localNumber}` : ''
  };
};

export const isPhoneValueValid = (value) => {
  const parsedPhone = parsePhoneValue(value);
  const country = getPhoneCountry(parsedPhone.countryCode);

  return (
    parsedPhone.localNumber.length >= country.minLength &&
    parsedPhone.localNumber.length <= country.maxLength
  );
};

export const getPhonePlaceholder = (countryCode) => {
  const country = getPhoneCountry(countryCode);
  return `Avec ou sans 0, ex: ${country.example}`;
};
