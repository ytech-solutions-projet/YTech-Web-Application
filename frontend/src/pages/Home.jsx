import React from 'react';
import { Link } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';

const featuredServices = [
  {
    eyebrow: 'Site vitrine',
    title: 'Un site clair pour presenter votre activite.',
    text: 'Presentation de vos services, de votre entreprise et de vos contacts dans une interface moderne et professionnelle.',
    meta: 'Mise en ligne en 2 a 4 semaines',
    link: '/services'
  },
  {
    eyebrow: 'Application web',
    title: 'Des outils digitaux adaptes a votre fonctionnement.',
    text: 'Tableaux de bord, espaces clients et interfaces internes developpes selon vos besoins metier.',
    meta: 'Developpement sur mesure',
    link: '/services'
  },
  {
    eyebrow: 'Suivi',
    title: 'Un accompagnement apres la mise en ligne.',
    text: 'Maintenance, optimisation et evolutions pour garder un site utile, stable et a jour.',
    meta: 'Support apres lancement',
    link: '/contact?intent=support'
  }
];

const metrics = [
  { value: '150+', label: 'projets livres pour des entreprises et structures locales' },
  { value: '24h', label: 'pour recevoir une premiere reponse' },
  { value: '98%', label: 'de clients satisfaits' },
  { value: '1', label: 'interlocuteur principal sur votre projet' }
];

const steps = [
  {
    index: '01',
    title: 'Analyse du besoin',
    text: 'Nous clarifions votre objectif, votre cible et le perimetre du projet.'
  },
  {
    index: '02',
    title: 'Design',
    text: 'Nous concevons une interface claire, moderne et coherente avec votre image.'
  },
  {
    index: '03',
    title: 'Developpement',
    text: 'Le site ou l application est developpe de facon propre, responsive et evolutive.'
  },
  {
    index: '04',
    title: 'Mise en ligne et suivi',
    text: 'Nous accompagnons le lancement et restons disponibles pour les ajustements utiles.'
  }
];

const proofCards = [
  {
    eyebrow: 'Pour les entreprises',
    title: 'Un site professionnel pour mieux presenter vos services.',
    text: 'Une structure claire pour rassurer vos visiteurs et faciliter la prise de contact.'
  },
  {
    eyebrow: 'Pour vos equipes',
    title: 'Des interfaces utiles pour gagner du temps au quotidien.',
    text: 'Centralisation des informations, suivi simplifie et outils plus faciles a utiliser.'
  }
];

const Home = () => {
  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Agence web"
        title="Creation de sites web et applications sur mesure"
        description="YTECH accompagne les entreprises dans la conception de sites vitrines, plateformes web et outils digitaux clairs, modernes et faciles a utiliser."
        actions={[
          { to: '/devis', label: 'Demander un devis', variant: 'primary' },
          { to: '/portfolio', label: 'Voir nos realisations', variant: 'secondary' }
        ]}
        highlights={['Site vitrine', 'Application web', 'Support apres lancement']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Notre approche</span>
            <h2 className="hero-panel__title">Une equipe pour cadrer, concevoir et livrer votre projet.</h2>
            <p className="hero-panel__text">
              Nous travaillons avec un cadre simple, des echanges clairs et une execution serieuse
              pour livrer un resultat propre et utile.
            </p>

            <ul className="hero-panel__list">
              <li>Analyse du besoin avant le design et le developpement.</li>
              <li>Interface responsive pour mobile, tablette et desktop.</li>
              <li>Accompagnement du lancement jusqu a la mise en ligne.</li>
            </ul>

            <div className="hero-panel__meta">
              <div className="hero-panel__metric">
                <strong>2-10</strong>
                <span>semaines selon le type de projet</span>
              </div>
              <div className="hero-panel__metric">
                <strong>1:1</strong>
                <span>suivi avec un interlocuteur dedie</span>
              </div>
            </div>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="section-heading__eyebrow">Nos prestations</span>
            <h2 className="section-heading__title">Des solutions digitales adaptees a votre activite.</h2>
            <p className="section-heading__text">
              Nous concevons des sites et outils web avec un objectif simple :
              presenter clairement votre offre et vous aider a mieux travailler.
            </p>
          </div>

          <div className="card-grid card-grid--three">
            {featuredServices.map((service) => (
              <article key={service.title} className="panel-card">
                <span className="panel-card__eyebrow">{service.eyebrow}</span>
                <h3 className="panel-card__title">{service.title}</h3>
                <p className="panel-card__text">{service.text}</p>
                <div className="panel-card__meta">
                  <span>{service.meta}</span>
                  <Link to={service.link} className="panel-card__link">
                    Voir plus
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Pourquoi YTECH</span>
            <h2 className="section-heading__title">Un bon site doit etre clair, rapide et facile a utiliser.</h2>
            <p className="section-heading__text">
              Nous travaillons la structure, le contenu et l interface pour offrir une experience
              simple et professionnelle a vos visiteurs.
            </p>
          </div>

          <div className="metric-grid">
            {metrics.map((metric) => (
              <article key={metric.value} className="metric-card">
                <span className="metric-card__value">{metric.value}</span>
                <span className="metric-card__label">{metric.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="section-heading__eyebrow">Notre methode</span>
            <h2 className="section-heading__title">Un processus simple pour avancer proprement.</h2>
            <p className="section-heading__text">
              Chaque projet passe par les memes etapes pour garder une bonne qualite de travail
              et une lecture claire du debut a la fin.
            </p>
          </div>

          <div className="step-grid">
            {steps.map((step) => (
              <article key={step.index} className="step-card">
                <span className="step-card__index">{step.index}</span>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__text">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <div className="card-grid card-grid--two">
            {proofCards.map((card) => (
              <article key={card.title} className="panel-card">
                <span className="panel-card__eyebrow">{card.eyebrow}</span>
                <h3 className="panel-card__title">{card.title}</h3>
                <p className="panel-card__text">{card.text}</p>
              </article>
            ))}

            <article className="panel-card panel-card--dark">
              <span className="panel-card__eyebrow">Demarrer</span>
              <h3 className="panel-card__title">Vous avez un projet, une refonte ou un besoin a clarifier ?</h3>
              <p className="panel-card__text">
                Nous pouvons partir d un site existant ou d une nouvelle idee et vous proposer
                une solution adaptee a votre budget et a vos priorites.
              </p>
              <div className="marketing-actions">
                <Link to="/contact?intent=support" className="marketing-button marketing-button--primary">
                  Besoin d'aide
                </Link>
                <Link to="/services" className="marketing-button marketing-button--secondary">
                  Voir nos services
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <SiteFooter note="Creation de sites web et applications sur mesure pour les entreprises qui veulent une presence digitale claire et professionnelle." />
    </div>
  );
};

export default Home;
