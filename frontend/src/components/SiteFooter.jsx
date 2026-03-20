import React from 'react';
import { Link } from 'react-router-dom';

const footerColumns = [
  {
    title: 'Navigation',
    links: [
      { to: '/', label: 'Accueil' },
      { to: '/services', label: 'Services' },
      { to: '/portfolio', label: 'Portfolio' },
      { to: '/about', label: 'A propos' }
    ]
  },
  {
    title: 'Parcours',
    links: [
      { to: '/devis', label: 'Demander un devis' },
      { to: '/contact?intent=support', label: "Besoin d'aide" },
      { to: '/login', label: 'Connexion' },
      { to: '/register', label: 'Inscription' }
    ]
  }
];

const SiteFooter = ({
  note = 'Agence produit, design et croissance pour les entreprises qui veulent avancer vite.'
}) => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <span className="site-footer__logo">YTECH</span>
            <p className="site-footer__copy">{note}</p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title} className="site-footer__column">
              <h3>{column.title}</h3>
              <div className="site-footer__links">
                {column.links.map((link) => (
                  <Link key={link.to} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="site-footer__column">
            <h3>Contact</h3>
            <div className="site-footer__links">
              <a href="mailto:contact@ytech.ma">contact@ytech.ma</a>
              <a href="tel:+212600000000">+212 6 00 00 00 00</a>
              <span>Casablanca, Maroc</span>
              <Link to="/legal">Mentions legales</Link>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>{new Date().getFullYear()} YTECH. Tous droits reserves.</span>
          <span>Design, developpement et accompagnement digital.</span>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
