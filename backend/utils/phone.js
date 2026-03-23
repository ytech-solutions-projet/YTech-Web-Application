const PHONE_COUNTRIES = [
  { code: 'MA', label: 'Maroc', dialCode: '+212', minLength: 9, maxLength: 9, nationalPrefix: '0' },
  { code: 'FR', label: 'France', dialCode: '+33', minLength: 9, maxLength: 9, nationalPrefix: '0' },
  { code: 'BE', label: 'Belgique', dialCode: '+32', minLength: 8, maxLength: 9, nationalPrefix: '0' },
  { code: 'DZ', label: 'Algerie', dialCode: '+213', minLength: 9, maxLength: 9, nationalPrefix: '0' },
  { code: 'TN', label: 'Tunisie', dialCode: '+216', minLength: 8, maxLength: 8, nationalPrefix: '0' },
  { code: 'CA', label: 'Canada', dialCode: '+1', minLength: 10, maxLength: 10, nationalPrefix: '' },
  { code: 'AE', label: 'Emirats arabes unis', dialCode: '+971', minLength: 9, maxLength: 9, nationalPrefix: '0' }
];

const DEFAULT_PHONE_COUNTRY = 'MA';

const getCountryByCode = (countryCode = DEFAULT_PHONE_COUNTRY) =>
  PHONE_COUNTRIES.find((country) => country.code === countryCode) || PHONE_COUNTRIES[0];

const getCountryByDialCode = (phone = '') => {
  const compactPhone = `${phone}`.trim();

  return [...PHONE_COUNTRIES]
    .sort((first, second) => second.dialCode.length - first.dialCode.length)
    .find((country) => compactPhone.startsWith(country.dialCode)) || null;
};

const sanitizePhoneInput = (value = '') => {
  const rawValue = `${value}`.trim();

  if (!rawValue) {
    return '';
  }

  const normalizedValue = rawValue.startsWith('00') ? `+${rawValue.slice(2)}` : rawValue;
  const strippedValue = normalizedValue.replace(/[^\d+]/g, '');

  if (strippedValue.startsWith('+')) {
    return `+${strippedValue.slice(1).replace(/\+/g, '')}`;
  }

  return strippedValue;
};

const normalizeLocalDigits = (digits, country) => {
  if (!digits) {
    return '';
  }

  const dialDigits = country.dialCode.replace('+', '');
  let normalizedDigits = digits;

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

  return normalizedDigits.replace(/\D/g, '').slice(0, country.maxLength);
};

const normalizePhone = (phone, countryCode = DEFAULT_PHONE_COUNTRY) => {
  const sanitizedPhone = sanitizePhoneInput(phone);

  if (!sanitizedPhone) {
    return null;
  }

  const detectedCountry = sanitizedPhone.startsWith('+')
    ? getCountryByDialCode(sanitizedPhone)
    : null;
  const country = detectedCountry || getCountryByCode(countryCode);
  const rawDigits = sanitizedPhone.startsWith('+') ? sanitizedPhone.slice(1) : sanitizedPhone;
  const normalizedDigits = normalizeLocalDigits(rawDigits, country);

  if (!normalizedDigits) {
    return null;
  }

  return `${country.dialCode}${normalizedDigits}`;
};

const isValidPhone = (phone) => {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return false;
  }

  const country = getCountryByDialCode(normalizedPhone);

  if (!country) {
    return false;
  }

  const localDigits = normalizedPhone.slice(country.dialCode.length);
  return (
    localDigits.length >= country.minLength &&
    localDigits.length <= country.maxLength
  );
};

module.exports = {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  getCountryByCode,
  isValidPhone,
  normalizePhone
};
