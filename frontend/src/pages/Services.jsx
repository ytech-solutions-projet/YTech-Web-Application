import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';

const services = [
  {
    id: 1,
    title: 'Site vitrine',
    category: 'vitrine',
    eyebrow: 'Presentation',
    description: 'Un site professionnel pour presenter votre activite, vos services et vos coordonnees de maniere claire.',
    technologies: ['React', 'SEO', 'CMS leger'],
    client: 'PME et cabinets',
    duration: '2 a 4 semaines',
    price: 'A partir de 5 000 DH'
  },
  {
    id: 2,
    title: 'Site e-commerce',
    category: 'e-commerce',
    eyebrow: 'Vente',
    description: 'Une boutique en ligne avec catalogue, panier et paiement pour vendre vos produits simplement.',
    technologies: ['React', 'Express', 'Paiement'],
    client: 'Commerces et marques',
    duration: '4 a 8 semaines',
    price: 'A partir de 15 000 DH'
  },
  {
    id: 3,
    title: 'Application mobile',
    category: 'mobile',
    eyebrow: 'Mobile',
    description: 'Une application mobile developpee selon votre service, avec une experience simple et pratique.',
    technologies: ['React Native', 'API', 'Notifications'],
    client: 'Startups et plateformes',
    duration: '8 a 12 semaines',
    price: 'A partir de 25 000 DH'
  },
  {
    id: 4,
    title: 'Application web',
    category: 'web-app',
    eyebrow: 'Productivite',
    description: 'Des outils web pour vos suivis internes, tableaux de bord ou espaces clients.',
    technologies: ['React', 'Node.js', 'PostgreSQL'],
    client: 'Equipes operationnelles',
    duration: '6 a 10 semaines',
    price: 'A partir de 20 000 DH'
  },
  {
    id: 5,
    title: 'SEO et marketing',
    category: 'marketing',
    eyebrow: 'Acquisition',
    description: 'Optimisation du contenu et de la visibilite pour mieux positionner votre entreprise en ligne.',
    technologies: ['Audit', 'Tracking', 'Contenu'],
    client: 'Structures en croissance',
    duration: 'Continu',
    price: 'A partir de 3 000 DH / mois'
  },
  {
    id: 6,
    title: 'Maintenance et support',
    category: 'support',
    eyebrow: 'Stabilite',
    description: 'Corrections, mises a jour et accompagnement pour garder votre plateforme fiable apres lancement.',
    technologies: ['Monitoring', 'Correctifs', 'Support'],
    client: 'Clients actifs',
    duration: 'Continu',
    price: 'A partir de 1 000 DH / mois'
  }
];

const categories = [
  { id: 'all', name: 'Tous les services' },
  { id: 'vitrine', name: 'Sites vitrines' },
  { id: 'e-commerce', name: 'E-commerce' },
  { id: 'mobile', name: 'Applications mobiles' },
  { id: 'web-app', name: 'Applications web' },
  { id: 'marketing', name: 'SEO et marketing' },
  { id: 'support', name: 'Maintenance' }
];

const commitments = [
  {
    index: '01',
    title: 'Ecoute du besoin',
    text: 'Chaque prestation est ajustee selon vos objectifs, votre budget et votre delai.'
  },
  {
    index: '02',
    title: 'Qualite de realisation',
    text: 'Le projet est developpe avec une base propre, responsive et facile a faire evoluer.'
  },
  {
    index: '03',
    title: 'Suivi du projet',
    text: 'Vous gardez une vision claire sur l avancement et les prochaines etapes.'
  }
];

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState(null);

  const filteredServices = useMemo(() => {
    if (selectedCategory === 'all') {
      return services;
    }

    return services.filter((service) => service.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Catalogue YTECH"
        title="Des services adaptes a votre projet"
        description="Choisissez le type de prestation qui correspond a votre besoin. Chaque service peut ensuite etre ajuste selon vos priorites."
        actions={[
          { to: '/devis', label: 'Demander un devis', variant: 'primary' },
          { to: '/contact?intent=support', label: "Besoin d'aide", variant: 'secondary' }
        ]}
        highlights={['Site vitrine', 'Application web', 'Support']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Nos offres</span>
            <h2 className="hero-panel__title">Des prestations simples a comprendre.</h2>
            <p className="hero-panel__text">
              Les budgets et durees affiches donnent un repere. Le projet final depend ensuite
              du perimetre, des contenus et des fonctionnalites souhaites.
            </p>
            <ul className="hero-panel__list">
              <li>Etude du besoin avant le lancement du projet.</li>
              <li>Developpement adapte a votre activite.</li>
              <li>Possibilite de support apres mise en ligne.</li>
            </ul>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Nos services</span>
            <h2 className="section-heading__title">Parcourez nos prestations par categorie.</h2>
            <p className="section-heading__text">
              Filtrez selon votre besoin pour voir les formats disponibles, les delais et les
              fourchettes de budget.
            </p>
          </div>

          <div className="filter-bar">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`filter-chip ${selectedCategory === category.id ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
                aria-pressed={selectedCategory === category.id}
              >
                {category.name}
              </button>
            ))}
          </div>

          <p className="filter-count">
            {filteredServices.length} service{filteredServices.length > 1 ? 's' : ''} affiche
            {filteredServices.length > 1 ? 's' : ''}
          </p>

          <div className="card-grid card-grid--three marketing-mt-sm">
            {filteredServices.map((service) => (
              <article key={service.id} className="panel-card">
                <span className="panel-card__eyebrow">{service.eyebrow}</span>
                <h3 className="panel-card__title">{service.title}</h3>
                <p className="panel-card__text">{service.description}</p>
                <div className="panel-tags">
                  {service.technologies.map((technology) => (
                    <span key={technology} className="panel-tag">
                      {technology}
                    </span>
                  ))}
                </div>
                <div className="panel-card__value">{service.price}</div>
                <div className="panel-card__meta">
                  <span>{service.duration}</span>
                  <button
                    type="button"
                    className="panel-card__link"
                    onClick={() => setSelectedService(service)}
                  >
                    Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="section-heading__eyebrow">Notre facon de travailler</span>
            <h2 className="section-heading__title">Un cadre simple pour garder un projet clair du debut a la fin.</h2>
            <p className="section-heading__text">
              Nous privilegions un fonctionnement simple, des echanges reguliers et une bonne
              visibilite sur les etapes du projet.
            </p>
          </div>

          <div className="step-grid">
            {commitments.map((commitment) => (
              <article key={commitment.index} className="step-card">
                <span className="step-card__index">{commitment.index}</span>
                <h3 className="step-card__title">{commitment.title}</h3>
                <p className="step-card__text">{commitment.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <article className="panel-card panel-card--dark">
            <span className="panel-card__eyebrow">Besoin d aide</span>
            <h2 className="panel-card__title">Vous avez deja un besoin precis ou vous hesitez encore entre plusieurs options ?</h2>
            <p className="panel-card__text">
              Dites-nous ce que vous souhaitez mettre en place et nous vous orienterons vers la
              solution la plus adaptee.
            </p>
            <div className="marketing-actions">
              <Link to="/devis" className="marketing-button marketing-button--primary">
                Demander un devis
              </Link>
              <Link to="/portfolio" className="marketing-button marketing-button--secondary">
                Voir nos realisations
              </Link>
            </div>
          </article>
        </div>
      </section>

      {selectedService ? (
        <div
          className="marketing-modal__overlay"
          role="presentation"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="marketing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="marketing-modal__header">
              <span className="marketing-modal__eyebrow">{selectedService.eyebrow}</span>
              <h2 id="service-modal-title" className="marketing-modal__title">
                {selectedService.title}
              </h2>
              <p className="marketing-modal__text">{selectedService.description}</p>
              <button
                type="button"
                className="marketing-modal__close"
                onClick={() => setSelectedService(null)}
                aria-label="Fermer les details du service"
              >
                x
              </button>
            </div>

            <div className="marketing-modal__body">
              <div className="marketing-modal__grid">
                <div className="marketing-modal__item">
                  <span>Client</span>
                  <strong>{selectedService.client}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Duree</span>
                  <strong>{selectedService.duration}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Budget</span>
                  <strong>{selectedService.price}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Technologies</span>
                  <strong>{selectedService.technologies.join(' / ')}</strong>
                </div>
              </div>

              <ul className="stack-list">
                <li>Analyse de votre besoin et cadrage du perimetre.</li>
                <li>Conception responsive pour mobile, tablette et desktop.</li>
                <li>Possibilite de maintenance et d evolutions apres livraison.</li>
              </ul>

              <div className="marketing-modal__actions marketing-mt-md">
                <Link to="/devis" className="marketing-button marketing-button--dark">
                  Demander un devis
                </Link>
                <Link to="/contact?intent=quote-help" className="marketing-button marketing-button--accent">
                  Aide pour ce devis
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SiteFooter note="Des services web clairs et adaptes aux besoins des entreprises, du site vitrine a l application sur mesure." />
    </div>
  );
};

export default Services;
