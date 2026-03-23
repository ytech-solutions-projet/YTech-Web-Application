import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';

const projects = [
  {
    id: 1,
    title: 'Fashion Store Maroc',
    category: 'e-commerce',
    eyebrow: 'E-commerce',
    description: 'Refonte d une boutique en ligne pour mieux presenter les produits et simplifier le parcours d achat.',
    technologies: ['React', 'Node.js', 'Paiement'],
    client: 'Retail mode',
    duration: '3 mois',
    outcome: '+32% de demandes'
  },
  {
    id: 2,
    title: 'QuickEat Casablanca',
    category: 'mobile',
    eyebrow: 'Application mobile',
    description: 'Application mobile de livraison avec suivi de commande et navigation plus simple.',
    technologies: ['React Native', 'API', 'Tracking'],
    client: 'Livraison',
    duration: '4 mois',
    outcome: 'Parcours plus rapide'
  },
  {
    id: 3,
    title: 'Cabinet Legal Marrakech',
    category: 'vitrine',
    eyebrow: 'Site vitrine',
    description: 'Site vitrine pour presenter le cabinet, ses services et faciliter la prise de contact.',
    technologies: ['Design system', 'SEO', 'CMS'],
    client: 'Cabinet juridique',
    duration: '2 mois',
    outcome: '+41% de contacts'
  },
  {
    id: 4,
    title: 'Data Analytics Maroc',
    category: 'web-app',
    eyebrow: 'Dashboard',
    description: 'Tableau de bord avec visualisations et exports pour suivre les donnees plus facilement.',
    technologies: ['React', 'Charts', 'PostgreSQL'],
    client: 'Equipe data',
    duration: '5 mois',
    outcome: 'Lecture simplifiee'
  },
  {
    id: 5,
    title: 'Studio Photo Rabat',
    category: 'portfolio',
    eyebrow: 'Portfolio',
    description: 'Portfolio photo pour valoriser les realisations et faciliter les demandes de contact.',
    technologies: ['React', 'Galerie', 'Media'],
    client: 'Studio creatif',
    duration: '6 semaines',
    outcome: 'Image de marque rehaussee'
  },
  {
    id: 6,
    title: 'EduMaroc',
    category: 'web-app',
    eyebrow: 'Plateforme',
    description: 'Plateforme de formation avec parcours, espace utilisateur et acces aux contenus.',
    technologies: ['Next.js', 'API', 'Video'],
    client: 'Formation',
    duration: '6 mois',
    outcome: 'Navigation plus fluide'
  }
];

const categories = [
  { id: 'all', name: 'Tous les projets' },
  { id: 'e-commerce', name: 'E-commerce' },
  { id: 'mobile', name: 'Applications mobiles' },
  { id: 'vitrine', name: 'Sites vitrines' },
  { id: 'web-app', name: 'Applications web' },
  { id: 'portfolio', name: 'Portfolios' }
];

const results = [
  { value: '150+', label: 'projets livres ou accompagnes' },
  { value: '06', label: 'secteurs representes' },
  { value: '1', label: 'objectif : des interfaces claires et utiles' }
];

const Portfolio = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'all') {
      return projects;
    }

    return projects.filter((project) => project.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Realisations"
        title="Quelques projets et formats realises"
        description="Cette page presente un apercu de projets et de types de realisations que nous pouvons concevoir pour des entreprises et des structures locales."
        actions={[
          { to: '/contact?intent=support', label: "Besoin d'aide sur votre projet", variant: 'primary' },
          { to: '/services', label: 'Voir nos services', variant: 'secondary' }
        ]}
        highlights={['Sites vitrines', 'E-commerce', 'Applications web', 'Mobiles']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Apercu</span>
            <h2 className="hero-panel__title">Des exemples pour vous projeter plus facilement.</h2>
            <p className="hero-panel__text">
              Chaque projet illustre un type de besoin : presentation d activite, vente en ligne,
              espace client ou outil interne.
            </p>
            <div className="hero-panel__meta">
              {results.map((result) => (
                <div key={result.value} className="hero-panel__metric">
                  <strong>{result.value}</strong>
                  <span>{result.label}</span>
                </div>
              ))}
            </div>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Selection</span>
            <h2 className="section-heading__title">Parcourez nos realisations par categorie.</h2>
            <p className="section-heading__text">
              Filtrez les projets pour voir rapidement les formats les plus proches de votre
              besoin.
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
            {filteredProjects.length} projet{filteredProjects.length > 1 ? 's' : ''} affiche
            {filteredProjects.length > 1 ? 's' : ''}
          </p>

          <div className="card-grid card-grid--three marketing-mt-sm">
            {filteredProjects.map((project) => (
              <article key={project.id} className="panel-card">
                <span className="panel-card__eyebrow">{project.eyebrow}</span>
                <h3 className="panel-card__title">{project.title}</h3>
                <p className="panel-card__text">{project.description}</p>
                <div className="panel-tags">
                  {project.technologies.map((technology) => (
                    <span key={technology} className="panel-tag">
                      {technology}
                    </span>
                  ))}
                </div>
                <div className="panel-card__meta">
                  <span>{project.outcome}</span>
                  <button
                    type="button"
                    className="panel-card__link"
                    onClick={() => setSelectedProject(project)}
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
          <div className="card-grid card-grid--two">
            <article className="panel-card">
              <span className="panel-card__eyebrow">Notre objectif</span>
              <h3 className="panel-card__title">Concevoir des interfaces utiles et faciles a parcourir.</h3>
              <p className="panel-card__text">
                Nous cherchons toujours a rendre le contenu plus clair, la navigation plus simple
                et les actions plus accessibles.
              </p>
            </article>

            <article className="panel-card panel-card--dark">
              <span className="panel-card__eyebrow">Votre projet</span>
              <h3 className="panel-card__title">Vous souhaitez un projet similaire ou une refonte de votre site actuel ?</h3>
              <p className="panel-card__text">
                Nous pouvons partir d une base existante ou d une nouvelle idee pour vous proposer
                une solution plus adaptee a votre activite.
              </p>
              <div className="marketing-actions">
                <Link to="/devis" className="marketing-button marketing-button--primary">
                  Demander un devis
                </Link>
                <Link to="/contact?intent=support" className="marketing-button marketing-button--secondary">
                  Besoin d'aide
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {selectedProject ? (
        <div
          className="marketing-modal__overlay"
          role="presentation"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="marketing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="marketing-modal__header">
              <span className="marketing-modal__eyebrow">{selectedProject.eyebrow}</span>
              <h2 id="project-modal-title" className="marketing-modal__title">
                {selectedProject.title}
              </h2>
              <p className="marketing-modal__text">{selectedProject.description}</p>
              <button
                type="button"
                className="marketing-modal__close"
                onClick={() => setSelectedProject(null)}
                aria-label="Fermer les details du projet"
              >
                x
              </button>
            </div>

            <div className="marketing-modal__body">
              <div className="marketing-modal__grid">
                <div className="marketing-modal__item">
                  <span>Client</span>
                  <strong>{selectedProject.client}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Duree</span>
                  <strong>{selectedProject.duration}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Resultat</span>
                  <strong>{selectedProject.outcome}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Technologies</span>
                  <strong>{selectedProject.technologies.join(' / ')}</strong>
                </div>
              </div>

              <ul className="stack-list">
                <li>Travail sur la structure des pages et la clarte du contenu.</li>
                <li>Interface responsive adaptee a plusieurs ecrans.</li>
                <li>Solution pensee pour etre simple a utiliser et a faire evoluer.</li>
              </ul>

              <div className="marketing-modal__actions marketing-mt-md">
                <Link to="/devis" className="marketing-button marketing-button--dark">
                  Demander un devis
                </Link>
                <Link to="/services" className="marketing-button marketing-button--accent">
                  Voir les services
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SiteFooter note="Quelques exemples de projets web et applicatifs realises pour differents types de besoins et d activites." />
    </div>
  );
};

export default Portfolio;
