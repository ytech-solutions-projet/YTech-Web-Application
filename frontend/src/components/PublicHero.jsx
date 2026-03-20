import React from 'react';
import { Link } from 'react-router-dom';

const PublicHero = ({
  eyebrow,
  title,
  description,
  actions = [],
  highlights = [],
  aside = null,
  tone = 'default'
}) => {
  return (
    <section className={`marketing-hero marketing-hero--${tone}`}>
      <div className="container">
        <div className="marketing-hero__grid">
          <div className="marketing-hero__copy">
            {eyebrow ? <span className="marketing-eyebrow">{eyebrow}</span> : null}
            <div className="marketing-brand">YTECH</div>
            <h1 className="marketing-title">{title}</h1>
            <p className="marketing-lead">{description}</p>

            {actions.length > 0 ? (
              <div className="marketing-actions">
                {actions.map((action) => (
                  <Link
                    key={`${action.to}-${action.label}`}
                    to={action.to}
                    className={`marketing-button marketing-button--${action.variant || 'primary'}`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}

            {highlights.length > 0 ? (
              <div className="marketing-highlights">
                {highlights.map((highlight) => (
                  <span key={highlight} className="marketing-highlight">
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {aside ? <aside className="marketing-hero__panel">{aside}</aside> : null}
        </div>
      </div>
    </section>
  );
};

export default PublicHero;
