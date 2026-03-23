import React from 'react';
import './Input.css';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder = '',
  required = false,
  disabled = false,
  readOnly = false,
  error = null,
  helperText = '',
  autoComplete = 'off',
  icon = null,
  iconPosition = 'left',
  size = 'medium',
  variant = 'outlined',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const inputClasses = [
    'input',
    `input-${size}`,
    `input-${variant}`,
    fullWidth && 'input-full-width',
    error && 'input-error',
    disabled && 'input-disabled',
    readOnly && 'input-readonly',
    icon && 'input-with-icon',
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'input-container',
    `input-container-${size}`,
    fullWidth && 'input-container-full-width',
    className
  ].filter(Boolean).join(' ');

  const renderIcon = () => {
    if (!icon) return null;
    return <span className={`input-icon input-icon-${iconPosition}`}>{icon}</span>;
  };

  return (
    <div className={containerClasses}>
      {label && (
        <label className="input-label" htmlFor={name}>
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      
      <div className="input-wrapper">
        {iconPosition === 'left' && renderIcon()}
        
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          className={inputClasses}
          {...props}
        />
        
        {iconPosition === 'right' && renderIcon()}
      </div>
      
      {(error || helperText) && (
        <div className="input-helper">
          {error ? (
            <span className="input-error-text">{error}</span>
          ) : (
            <span className="input-helper-text">{helperText}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Input;
