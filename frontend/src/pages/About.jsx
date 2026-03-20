import React from 'react';
import { Link } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';

const values = [
  {
    eyebrow: 'Exigence',
    title: 'Le niveau de finition compte autant que la vitesse.',
    text: 'Nous visons un rendu propre, lisible et durable, sans empiler du superflu.'
  },
  {
    eyebrow: 'Ecoute',
    title: 'Le design sert votre contexte avant de servir une tendance.',
    text: 'On cadre vos objectifs, vos contenus et vos priorites avant de choisir une direction visuelle.'
  },
  {
    eyebrow: 'Clarte',
    title: 'Une bonne interface reduit la friction au lieu de la maquiller.',
    text: 'Structure, hierarchie et parcours restent au centre de chaque decision de production.'
  }
];

const team = [
  {
    name: 'Youssef Alami',
    role: 'Direction et pilotage',
    description: 'Cadre le produit, la relation client et la vision de livraison.'
  },
  {
    name: 'Fatima Zahra',
    role: 'Direction artistique',
    description: 'Travaille la lisibilite, la narration visuelle et la coherence des interfaces.'
  },
  {
    name: 'Mohammed Benali',
    role: 'Architecture technique',
    description: 'Pose les fondations front et back pour que le produit reste maintenable.'
  },
  {
    name: 'Amina Rachid',
    role: 'Coordination projet',
    description: 'Garde le rythme, les arbitrages et les retours dans une trajectoire claire.'
  }
];

const pillars = [
  { value: '2021', label: 'point de depart a Casablanca' },
  { value: '150+', label: 'missions accompagnees' },
  { value: 'PME', label: 'focus principal sur les structures en croissance' }
];

const About = () => {
  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="A propos"
        title="Un studio qui pense autant a la lecture du produit qu a sa fabrication."
        description="YTECH est ne d une idee simple : beaucoup d entreprises ont besoin d un rendu ambitieux, mais surtout d une experience claire, solide et plus facile a faire vivre dans le temps."
        actions={[
          { to: '/contact?intent=support', label: "Besoin d'aide sur votre projet", variant: 'primary' },
          { to: '/portfolio', label: 'Voir les realisations', variant: 'secondary' }
        ]}
        highlights={['Casablanca', 'Design + produit', 'Execution React / Node.js']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Notre role</span>
            <h2 className="hero-panel__title">Donner une forme plus juste a votre presence digitale.</h2>
            <p className="hero-panel__text">
              Nous travaillons au croisement du design, du contenu et du produit pour que vos
              pages racontent mieux votre valeur et que vos outils soient plus faciles a utiliser.
            </p>
            <div className="hero-panel__meta">
              {pillars.map((pillar) => (
                <div key={pillar.value} className="hero-panel__metric">
                  <strong>{pillar.value}</strong>
                  <span>{pillar.label}</span>
                </div>
              ))}
            </div>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="card-grid card-grid--two">
            <article className="panel-card">
              <span className="panel-card__eyebrow">Notre histoire</span>
              <h2 className="panel-card__title">Partir du local, viser un niveau de rendu international.</h2>
              <p className="panel-card__text">
                YTECH s est construit en repondant a un besoin tres concret : aider les entreprises
                marocaines a mieux se presenter, mieux vendre et mieux organiser leur relation
                digitale sans recourir a des solutions generiques.
              </p>
              <p className="panel-card__text">
                Nous avons garde cette logique de proximite et de clarte tout en musclant la
                direction visuelle, la structure technique et le suivi de production.
              </p>
            </article>

            <article className="panel-card panel-card--dark">
              <span className="panel-card__eyebrow">Notre promesse</span>
              <h2 className="panel-card__title">Faire des choix de design qui servent vraiment la confiance.</h2>
              <p className="panel-card__text">
                Le plus beau rendu reste inutile s il ne clarifie pas votre offre, s il ne rassure
                pas vos visiteurs ou s il complique la mise a jour du produit.
              </p>
              <ul className="stack-list">
                <li>Plus de lisibilite sur les pages importantes.</li>
                <li>Moins de friction dans les formulaires et les parcours.</li>
                <li>Une base plus propre pour evoluer ensuite.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="section-heading__eyebrow">Valeurs de travail</span>
            <h2 className="section-heading__title">Trois lignes directrices pour garder les projets utiles et lisibles.</h2>
          </div>

          <div className="card-grid card-grid--three">
            {values.map((value) => (
              <article key={value.title} className="panel-card">
                <span className="panel-card__eyebrow">{value.eyebrow}</span>
                <h3 className="panel-card__title">{value.title}</h3>
                <p className="panel-card__text">{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="section-heading__eyebrow">Equipe</span>
            <h2 className="section-heading__title">Une equipe compacte pour garder des decisions rapides et un suivi net.</h2>
            <p className="section-heading__text">
              Nous preferons une coordination courte et des retours concrets a une machine plus
              lourde ou plus floue.
            </p>
          </div>

          <div className="card-grid card-grid--four">
            {team.map((member) => (
              <article key={member.name} className="panel-card">
                <span className="panel-card__eyebrow">{member.role}</span>
                <h3 className="panel-card__title">{member.name}</h3>
                <p className="panel-card__text">{member.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <article className="panel-card panel-card--dark">
            <span className="panel-card__eyebrow">Collaborer</span>
            <h2 className="panel-card__title">Vous avez besoin d une refonte, d une nouvelle plateforme ou d un simple recadrage visuel ?</h2>
            <p className="panel-card__text">
              Nous pouvons intervenir sur un scope serre comme sur une transformation plus large,
              a condition de garder un objectif clair et utile pour votre entreprise.
            </p>
            <div className="marketing-actions">
              <Link to="/devis" className="marketing-button marketing-button--primary">
                Demander un devis
              </Link>
              <Link to="/contact?intent=support" className="marketing-button marketing-button--secondary">
                Demarrer une discussion
              </Link>
            </div>
          </article>
        </div>
      </section>

      <SiteFooter note="Un studio marocain qui fait le lien entre direction visuelle, lisibilite produit et execution technique." />
    </div>
  );
};

export default About;
