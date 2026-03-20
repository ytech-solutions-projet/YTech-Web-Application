import React, { useEffect, useState } from 'react';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  buildPhoneValue,
  getPhonePlaceholder,
  parsePhoneValue
} from '../utils/phone';

const PhoneField = ({
  id = 'phone',
  name = 'phone',
  label = 'Telephone *',
  value = '',
  error = '',
  onChange = () => {},
  fallbackCountryCode = DEFAULT_PHONE_COUNTRY
}) => {
  const parsedPhone = parsePhoneValue(value, fallbackCountryCode);
  const [countryCode, setCountryCode] = useState(parsedPhone.countryCode);
  const [localNumber, setLocalNumber] = useState(parsedPhone.localNumber);

  useEffect(() => {
    const normalizedFromState = buildPhoneValue(countryCode, localNumber);

    if ((value || '') === normalizedFromState) {
      return;
    }

    const nextPhone = parsePhoneValue(value, fallbackCountryCode);
    setCountryCode(nextPhone.countryCode);
    setLocalNumber(nextPhone.localNumber);
  }, [countryCode, fallbackCountryCode, localNumber, value]);

  const emitChange = (nextCountryCode, nextLocalNumber) => {
    onChange({
      target: {
        name,
        value: buildPhoneValue(nextCountryCode, nextLocalNumber)
      }
    });
  };

  const handleCountryChange = (event) => {
    const nextCountryCode = event.target.value;
    setCountryCode(nextCountryCode);
    emitChange(nextCountryCode, localNumber);
  };

  const handleNumberChange = (event) => {
    const nextLocalNumber = event.target.value.replace(/[^\d\s()-]/g, '');
    setLocalNumber(nextLocalNumber);
    emitChange(countryCode, nextLocalNumber);
  };

  return (
    <div className="marketing-field">
      <label htmlFor={id}>{label}</label>
      <div className={`marketing-phone-group ${error ? 'has-error' : ''}`}>
        <select
          id={`${id}-country`}
          className={`marketing-select marketing-phone-group__country ${error ? 'is-error' : ''}`}
          value={countryCode}
          onChange={handleCountryChange}
          aria-label="Selectionner un pays"
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label} ({country.dialCode})
            </option>
          ))}
        </select>

        <input
          id={id}
          className={`marketing-input marketing-phone-group__input ${error ? 'is-error' : ''}`}
          type="tel"
          name={name}
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={getPhonePlaceholder(countryCode)}
          autoComplete="tel"
        />
      </div>
      <div className="marketing-field__hint">
        Vous pouvez saisir le numero avec ou sans le 0 initial.
      </div>
      {error ? <div className="marketing-field__error">{error}</div> : null}
    </div>
  );
};

export default PhoneField;
