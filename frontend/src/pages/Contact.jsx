import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { submitContactRequest } from '../utils/businessApi';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  service: '',
  projectDescription: '',
  budget: '',
  timeline: ''
};

const supportServiceOptions = [
  'J ai besoin d etre oriente',
  'Question generale',
  'Support technique',
  'Site vitrine',
  'Site e-commerce',
  'Application web',
  'Application mobile',
  'SEO et marketing',
  'Maintenance et support'
];

const quoteHelpServiceOptions = [
  'Site vitrine',
  'Site e-commerce',
  'Application web',
  'Application mobile',
  'SEO et marketing',
  'Maintenance et support',
  'Je ne sais pas encore quel format choisir'
];

const budgetOptions = [
  'Moins de 5 000 DH',
  '5 000 - 15 000 DH',
  '15 000 - 50 000 DH',
  '50 000 DH et plus'
];

const timelineOptions = [
  'Urgent',
  '2 a 4 semaines',
  '1 a 2 mois',
  '2 mois et plus'
];

const contactModes = {
  support: {
    queryValue: 'support',
    tabLabel: "Besoin d'aide",
    heroEyebrow: "Besoin d'aide",
    heroTitle: 'Parlons de votre besoin avant de parler de devis.',
    heroDescription:
      'Expliquez ce que vous cherchez a clarifier, lancer ou debloquer. Nous vous repondrons avec une premiere orientation concrete.',
    heroActions: [
      { to: '/devis', label: 'Plutot demander un devis', variant: 'primary' },
      { to: '/services', label: 'Voir les formats', variant: 'secondary' }
    ],
    asideEyebrow: 'Aide generale',
    asideTitle: 'Quelques lignes suffisent pour nous situer votre besoin.',
    asideText:
      'Donnez le contexte, le blocage ou la question principale. Nous vous orienterons ensuite vers le bon format d echange.',
    asideList: [
      'Premiere reponse sous 24h sur les demandes qualifiees.',
      'Orientation vers le bon format : aide generale, devis ou cadrage.',
      'Passage possible vers un echange plus detaille ensuite.'
    ],
    sideCardTitle: 'Ce qui nous aide a mieux vous repondre.',
    sideCardText: 'Plus votre description est simple et concrete, plus notre retour sera utile.',
    sideCardList: [
      'Quel est votre objectif principal ?',
      'Quel format imaginez-vous aujourd hui ?',
      'Y a-t-il une contrainte de delai ou de budget ?'
    ],
    formTitle: "Envoyer une demande d'aide",
    formText:
      'Remplissez le formulaire et nous vous repondrons avec une suite simple et rapide.',
    serviceLabel: 'Sujet principal *',
    servicePlaceholder: 'Choisissez le sujet principal',
    descriptionLabel: 'Expliquez votre besoin *',
    descriptionPlaceholder: 'Parlez-nous de votre besoin ou de votre question.',
    descriptionHint: 'Quelques lignes simples suffisent pour lancer l echange.',
    submitLabel: "Envoyer la demande d'aide",
    successTitle: "Votre demande d'aide est bien partie.",
    successText:
      'Merci pour votre message. Nous revenons vers vous rapidement avec une reponse claire sur la meilleure suite a donner.'
  },
  quoteHelp: {
    queryValue: 'quote-help',
    tabLabel: 'Aide devis',
    heroEyebrow: 'Aide devis',
    heroTitle: 'Besoin d aide avant ou pendant votre demande de devis ?',
    heroDescription:
      'Expliquez ce qui doit etre clarifie pour bien cadrer votre chiffrage. Nous vous aiderons a distinguer les priorites, le perimetre et le bon niveau de detail.',
    heroActions: [
      { to: '/devis', label: 'Retour au formulaire de devis', variant: 'primary' },
      { to: '/services', label: 'Voir les offres', variant: 'secondary' }
    ],
    asideEyebrow: 'Cadrage devis',
    asideTitle: 'Cette demande sert a debloquer ou preciser votre devis.',
    asideText:
      'Si vous hesitez entre plusieurs options, si le budget est flou ou si le perimetre n est pas encore fixe, utilisez ce format.',
    asideList: [
      'Clarification du bon service ou du bon format.',
      'Aide pour prioriser les fonctions vraiment necessaires.',
      'Difference claire entre simple question et vraie demande de devis.'
    ],
    sideCardTitle: 'Ce qui nous aide a mieux cadrer votre devis.',
    sideCardText:
      'Plus vous expliquez ce qui reste flou, plus nous pouvons vous orienter proprement avant le chiffrage.',
    sideCardList: [
      'Quel projet voulez-vous estimer ?',
      'Qu est-ce qui vous bloque aujourd hui dans le devis ?',
      'Quel delai ou quel budget doit etre clarifie ?'
    ],
    formTitle: "Demander de l'aide sur le devis",
    formText:
      'Remplissez le formulaire pour nous dire ce qui doit etre precise avant ou autour du devis.',
    serviceLabel: 'Service concerne *',
    servicePlaceholder: 'Choisissez le service concerne',
    descriptionLabel: 'Ce qui doit etre clarifie *',
    descriptionPlaceholder: 'Expliquez ce qui vous bloque ou ce qui doit etre preciser pour le devis.',
    descriptionHint:
      'Indiquez ce qui manque pour bien cadrer le devis : service, perimetre, delai, budget ou options.',
    submitLabel: "Envoyer la demande d'aide devis",
    successTitle: "Votre demande d'aide sur le devis est bien partie.",
    successText:
      'Merci pour les precisions. Nous revenons vers vous rapidement pour clarifier le cadre du devis avant le chiffrage final.'
  }
};

const resolveContactModeKey = (rawIntent) => (rawIntent === 'quote-help' ? 'quoteHelp' : 'support');

const readJsonStorage = (key, fallback) => {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    console.warn(`Impossible de lire ${key} depuis le stockage local.`, error);
    return fallback;
  }
};

const readPrefilledForm = () => {
  const user = readJsonStorage('user', null);

  if (!user) {
    return initialFormData;
  }

  return {
    ...initialFormData,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    company: user.company || ''
  };
};

const Contact = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contactModeKey, setContactModeKey] = useState(() =>
    resolveContactModeKey(searchParams.get('intent'))
  );
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const contactMode = contactModes[contactModeKey];
  const selectedServiceOptions =
    contactModeKey === 'quoteHelp' ? quoteHelpServiceOptions : supportServiceOptions;

  useEffect(() => {
    setFormData(readPrefilledForm());
  }, []);

  useEffect(() => {
    setContactModeKey(resolveContactModeKey(searchParams.get('intent')));
  }, [searchParams]);

  useEffect(() => {
    if (contactModeKey !== 'quoteHelp') {
      setFormData((prev) => ({
        ...prev,
        budget: '',
        timeline: ''
      }));
    }
  }, [contactModeKey]);

  const handleModeChange = (nextModeKey) => {
    setContactModeKey(nextModeKey);
    if (nextModeKey !== 'quoteHelp') {
      setFormData((prev) => ({
        ...prev,
        budget: '',
        timeline: ''
      }));
    }
    setSearchParams(
      nextModeKey === 'support' ? { intent: 'support' } : { intent: contactModes.quoteHelp.queryValue }
    );
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le telephone est requis';
    }

    if (!formData.service) {
      newErrors.service = 'Le service est requis';
    }

    if (!formData.projectDescription.trim()) {
      newErrors.projectDescription =
        contactModeKey === 'quoteHelp'
          ? 'Le point a clarifier pour le devis est requis'
          : 'La description du besoin est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const contactRequest = {
      ...formData,
      requestCategory: contactModeKey === 'quoteHelp' ? 'quote_help' : 'support',
      requestLabel: contactMode.tabLabel
    };

    try {
      await submitContactRequest(contactRequest);
      setIsSubmitted(true);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitError(error.message || "Une erreur est survenue lors de l'envoi. Veuillez reessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="marketing-page">
        <section className="success-state">
          <div className="container">
            <div className="success-card">
              <div className="success-card__icon">OK</div>
              <h1 className="success-card__title">{contactMode.successTitle}</h1>
              <p className="success-card__text">
                {contactMode.successText}
              </p>
              <div className="success-card__actions">
                <Link to="/" className="marketing-button marketing-button--dark">
                  Retour a l accueil
                </Link>
                <button
                  type="button"
                  className="marketing-button marketing-button--accent"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData(readPrefilledForm());
                  }}
                >
                  Envoyer un autre message
                </button>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter note="Une page contact plus claire pour lancer rapidement une discussion utile autour de votre projet." />
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow={contactMode.heroEyebrow}
        title={contactMode.heroTitle}
        description={contactMode.heroDescription}
        actions={contactMode.heroActions}
        highlights={['Reponse rapide', 'Cadrage initial', 'Discussion sans friction']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Contact direct</span>
            <h2 className="hero-panel__title">Un formulaire plus simple et plus utile.</h2>
            <p className="hero-panel__text">
              Choisissez juste le bon type de demande puis laissez-nous le contexte essentiel.
            </p>
            <div className="hero-panel__meta">
              <div className="hero-panel__metric">
                <strong>24h</strong>
                <span>Retour moyen</span>
              </div>
              <div className="hero-panel__metric">
                <strong>2 modes</strong>
                <span>Aide generale ou aide devis</span>
              </div>
            </div>
            <ul className="hero-panel__list">
              <li>contact@ytech.ma</li>
              <li>+212 6 00 00 00 00</li>
            </ul>
          </>
        }
      />

      <section className="marketing-section marketing-section--compact">
        <div className="container">
          <div className="marketing-shell-narrow">
            <div className="filter-bar" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
              {Object.entries(contactModes).map(([modeKey, mode]) => (
                <button
                  key={modeKey}
                  type="button"
                  className={`filter-chip ${contactModeKey === modeKey ? 'is-active' : ''}`}
                  onClick={() => handleModeChange(modeKey)}
                  aria-pressed={contactModeKey === modeKey}
                >
                  {mode.tabLabel}
                </button>
              ))}
            </div>

            <div className="marketing-form-card">
              <span className="marketing-pill">{contactMode.tabLabel}</span>
              <h2 className="marketing-form-card__title">{contactMode.formTitle}</h2>
              <p className="marketing-form-card__text">{contactMode.formText}</p>
              <p className="marketing-note" style={{ marginTop: '-0.6rem', marginBottom: '1.5rem' }}>
                {contactModeKey === 'quoteHelp'
                  ? 'Le budget et le delai restent visibles ici pour mieux cadrer le devis.'
                  : "Pour une demande d'aide generale, on va a l essentiel sans champs inutiles."}
              </p>

              {submitError ? <div className="marketing-alert">{submitError}</div> : null}

              <form className="marketing-form" onSubmit={handleSubmit}>
                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="name">Nom complet *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className={`marketing-input ${errors.name ? 'is-error' : ''}`}
                      placeholder="Votre nom"
                    />
                    {errors.name ? <div className="marketing-field__error">{errors.name}</div> : null}
                  </div>

                  <div className="marketing-field">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`marketing-input ${errors.email ? 'is-error' : ''}`}
                      placeholder="votre@email.com"
                    />
                    {errors.email ? <div className="marketing-field__error">{errors.email}</div> : null}
                  </div>
                </div>

                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="phone">Telephone *</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`marketing-input ${errors.phone ? 'is-error' : ''}`}
                      placeholder="+212 6 00 00 00 00"
                    />
                    {errors.phone ? <div className="marketing-field__error">{errors.phone}</div> : null}
                  </div>

                  <div className="marketing-field">
                    <label htmlFor="company">Entreprise</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleChange}
                      className="marketing-input"
                      placeholder="Nom de votre entreprise"
                    />
                  </div>
                </div>

                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="service">{contactMode.serviceLabel}</label>
                    <select
                      id="service"
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      className={`marketing-select ${errors.service ? 'is-error' : ''}`}
                    >
                      <option value="">{contactMode.servicePlaceholder}</option>
                      {selectedServiceOptions.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                    {errors.service ? <div className="marketing-field__error">{errors.service}</div> : null}
                  </div>
                </div>

                {contactModeKey === 'quoteHelp' ? (
                  <div className="marketing-form__grid">
                    <div className="marketing-field">
                      <label htmlFor="budget">Budget estime</label>
                      <select
                        id="budget"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        className="marketing-select"
                      >
                        <option value="">Selectionnez un budget</option>
                        {budgetOptions.map((budget) => (
                          <option key={budget} value={budget}>
                            {budget}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="marketing-field">
                      <label htmlFor="timeline">Delai souhaite</label>
                      <select
                        id="timeline"
                        name="timeline"
                        value={formData.timeline}
                        onChange={handleChange}
                        className="marketing-select"
                      >
                        <option value="">Selectionnez un delai</option>
                        {timelineOptions.map((timeline) => (
                          <option key={timeline} value={timeline}>
                            {timeline}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}

                <div className="marketing-field">
                  <label htmlFor="projectDescription">{contactMode.descriptionLabel}</label>
                  <textarea
                    id="projectDescription"
                    name="projectDescription"
                    value={formData.projectDescription}
                    onChange={handleChange}
                    className={`marketing-textarea ${errors.projectDescription ? 'is-error' : ''}`}
                    placeholder={contactMode.descriptionPlaceholder}
                  />
                  {errors.projectDescription ? (
                    <div className="marketing-field__error">{errors.projectDescription}</div>
                  ) : null}
                  <div className="marketing-field__hint">
                    {contactMode.descriptionHint}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="marketing-button marketing-button--dark"
                >
                  {isSubmitting ? 'Envoi en cours...' : contactMode.submitLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter note="Une page contact repensee pour rendre le premier echange plus clair, plus direct et plus professionnel." />
    </div>
  );
};

export default Contact;
