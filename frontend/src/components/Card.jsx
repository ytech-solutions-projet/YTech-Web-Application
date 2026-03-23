import React from 'react';
import './Card.css';

const Card = ({
  children,
  variant = 'default',
  elevation = 'medium',
  padding = 'medium',
  rounded = 'medium',
  hover = false,
  clickable = false,
  fullWidth = false,
  className = '',
  onClick,
  ...props
}) => {
  const cardClasses = [
    'card',
    `card-${variant}`,
    `card-elevation-${elevation}`,
    `card-padding-${padding}`,
    `card-rounded-${rounded}`,
    hover && 'card-hover',
    clickable && 'card-clickable',
    fullWidth && 'card-full-width',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`card-header ${className}`} {...props}>
    {children}
  </div>
);

const CardBody = ({ children, className = '', ...props }) => (
  <div className={`card-body ${className}`} {...props}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`card-footer ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`card-title ${className}`} {...props}>
    {children}
  </h3>
);

const CardSubtitle = ({ children, className = '', ...props }) => (
  <p className={`card-subtitle ${className}`} {...props}>
    {children}
  </p>
);

const CardText = ({ children, className = '', ...props }) => (
  <p className={`card-text ${className}`} {...props}>
    {children}
  </p>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Title = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Text = CardText;

export default Card;
