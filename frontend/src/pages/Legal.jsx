import React from 'react';
import { Link } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';

const legalSections = [
  {
    title: '1. Objet',
    paragraphs: [
      "Ces conditions encadrent l'utilisation de la plateforme YTECH et des services proposes autour du design, du developpement et de l'accompagnement digital."
    ]
  },
  {
    title: '2. Acceptation',
    paragraphs: [
      "La navigation sur le site et l'utilisation des formulaires impliquent l'acceptation des presentes conditions d'utilisation."
    ]
  },
  {
    title: '3. Services proposes',
    paragraphs: ['YTECH peut intervenir notamment sur les missions suivantes :'],
    list: [
      'creation de sites vitrines et e-commerce',
      'conception d applications web ou mobiles',
      'travail UX, UI et systemes de contenu',
      'SEO, optimisation et support technique'
    ]
  },
  {
    title: '4. Donnees et responsabilites',
    paragraphs: [
      "L'utilisateur s'engage a fournir des informations exactes. YTECH s'engage de son cote a traiter les demandes avec serieux, dans la limite des informations fournies."
    ]
  },
  {
    title: '5. Propriete intellectuelle',
    paragraphs: [
      "Les contenus, interfaces, textes, assets et structures presents sur ce site restent la propriete de YTECH sauf mention contraire ou contrat specifique."
    ]
  },
  {
    title: '6. Litiges',
    paragraphs: [
      "En cas de litige, une resolution amiable est privilegiee. A defaut, le droit marocain et les juridictions competentes de Casablanca s'appliquent."
    ]
  }
];

const quickFacts = [
  { value: 'YTECH', label: 'marque et studio digital' },
  { value: 'Casablanca', label: 'base d activite principale' },
  { value: 'Contact', label: 'contact@ytech.ma' }
];

const Legal = () => {
  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Mentions legales"
        title="Les informations utiles pour comprendre le cadre d utilisation du site."
        description="Cette page rassemble les points essentiels lies aux conditions d usage, a la responsabilite et a la relation entre YTECH et les visiteurs de la plateforme."
        actions={[
          { to: '/contact?intent=support', label: 'Poser une question', variant: 'primary' },
          { to: '/devis', label: 'Demander un devis', variant: 'secondary' }
        ]}
        highlights={['Conditions d usage', 'Cadre d echange', 'Contact direct']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Repere</span>
            <h2 className="hero-panel__title">Une version volontairement lisible.</h2>
            <p className="hero-panel__text">
              Nous avons simplifie la presentation pour que les informations importantes restent
              faciles a parcourir sans devoir traverser des blocs juridiques trop opaques.
            </p>
            <div className="hero-panel__meta">
              {quickFacts.map((fact) => (
                <div key={fact.value} className="hero-panel__metric">
                  <strong>{fact.value}</strong>
                  <span>{fact.label}</span>
                </div>
              ))}
            </div>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Cadre</span>
            <h2 className="section-heading__title">Les points essentiels a connaitre avant d utiliser le site ou d envoyer une demande.</h2>
            <p className="section-heading__text">
              Le contenu ci-dessous ne remplace pas un contrat de mission, mais il pose les bases
              du fonctionnement general de la plateforme.
            </p>
          </div>

          <div className="legal-sheet">
            {legalSections.map((section) => (
              <section key={section.title} className="legal-section">
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.list ? (
                  <ul className="legal-list">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <article className="panel-card">
            <span className="panel-card__eyebrow">Besoin d une precision ?</span>
            <h2 className="panel-card__title">Nous pouvons clarifier les conditions avant de lancer une collaboration.</h2>
            <p className="panel-card__text">
              Si vous avez un doute sur les donnees, les modalites de travail ou la responsabilite
              autour d un projet, ecrivez-nous et nous vous repondrons rapidement.
            </p>
            <div className="marketing-actions">
              <Link to="/contact?intent=support" className="marketing-button marketing-button--dark">
                Contacter YTECH
              </Link>
            </div>
          </article>
        </div>
      </section>

      <SiteFooter note="Un cadre de lecture plus simple pour les informations legales et les conditions generales d usage du site." />
    </div>
  );
};

export default Legal;
