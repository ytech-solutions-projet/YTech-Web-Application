import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { writeAuthSession } from '../utils/storage';
import '../styles/auth.css';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  password: '',
  confirmPassword: ''
};

const termsSections = [
  {
    title: '1. Objet',
    paragraphs: [
      "Ces conditions encadrent l'utilisation de la plateforme YTECH et de ses services de developpement web."
    ]
  },
  {
    title: '2. Acceptation',
    paragraphs: [
      "La creation d'un compte implique l'acceptation pleine et entiere des presentes conditions d'utilisation."
    ]
  },
  {
    title: '3. Services proposes',
    paragraphs: ['YTECH propose notamment les services suivants :'],
    list: [
      'Developpement de sites web et applications',
      'Conception UX/UI et design',
      'SEO, marketing digital et accompagnement',
      'Maintenance et support technique'
    ]
  },
  {
    title: '4. Engagements utilisateur',
    paragraphs: ['En utilisant la plateforme, vous vous engagez a :'],
    list: [
      'fournir des informations exactes et a jour',
      'respecter les lois en vigueur',
      "ne pas utiliser la plateforme a des fins illicites",
      "respecter la propriete intellectuelle de YTECH"
    ]
  },
  {
    title: '5. Donnees personnelles',
    paragraphs: [
      "YTECH s'engage a proteger vos donnees personnelles conformement a la reglementation applicable."
    ]
  },
  {
    title: '6. Litiges',
    paragraphs: [
      'Tout litige relatif a la plateforme est soumis au droit marocain et aux tribunaux competents de Casablanca.'
    ]
  }
];

const registerBenefits = [
  'Creation rapide de votre espace client',
  'Suivi centralise de vos demandes et messages',
  "Acceptation claire des conditions avant validation"
];

const registerCards = [
  {
    eyebrow: 'Compte',
    title: 'Creation en quelques champs.',
    text: 'Le formulaire reste simple pour vous permettre d ouvrir rapidement votre espace client.'
  },
  {
    eyebrow: 'Validation',
    title: 'Conditions lues avant activation.',
    text: 'La lecture des conditions est integree directement dans le parcours d inscription.'
  },
  {
    eyebrow: 'Acces',
    title: 'Connexion immediate apres inscription.',
    text: 'Une fois le compte cree, vous etes redirige vers votre espace sans etape supplementaire.'
  }
];

const passwordRequirements = [
  '12 caracteres minimum',
  'Une majuscule et une minuscule',
  'Au moins un chiffre et un caractere special'
];

const Register = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasScrolledTermsToBottom, setHasScrolledTermsToBottom] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTermsModalOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isTermsModalOpen]);

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

  const handleOpenTermsModal = () => {
    setHasScrolledTermsToBottom(hasAcceptedTerms);
    setIsTermsModalOpen(true);
  };

  const handleCloseTermsModal = () => {
    setIsTermsModalOpen(false);
  };

  const handleTermsScroll = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;

    if (scrollTop + clientHeight >= scrollHeight - 8) {
      setHasScrolledTermsToBottom(true);
    }
  };

  const handleAcceptTerms = () => {
    if (!hasScrolledTermsToBottom) {
      return;
    }

    setHasAcceptedTerms(true);
    setIsTermsModalOpen(false);
    setErrors((prev) => ({
      ...prev,
      terms: ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedPhone = formData.phone.replace(/\s/g, '');

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le telephone est requis';
    } else if (!/^\+212[0-9]{9}$/.test(trimmedPhone)) {
      newErrors.phone = 'Le telephone doit commencer par +212 suivi de 9 chiffres';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 12) {
      newErrors.password = 'Le mot de passe doit contenir au moins 12 caracteres';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une minuscule';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une majuscule';
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins un chiffre';
    } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins un caractere special';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!hasAcceptedTerms) {
      newErrors.terms = "Vous devez lire et accepter les conditions d'utilisation";
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

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          company: formData.company.trim(),
          password: formData.password,
          acceptedTermsAt: new Date().toISOString()
        })
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Une erreur est survenue lors de l'inscription");
      }

      if (!writeAuthSession(payload)) {
        throw new Error('Impossible de sauvegarder votre session localement');
      }

      navigate('/dashboard');
    } catch (error) {
      setSubmitError(error.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketing-page auth-page register-page">
      <PublicHero
        eyebrow="Inscription"
        title="Creer votre espace client"
        description="Inscrivez-vous pour centraliser vos demandes, vos messages et le suivi de vos projets dans un espace plus clair et assorti au reste du site."
        actions={[
          { to: '/login', label: 'J ai deja un compte', variant: 'primary' },
          { to: '/legal', label: 'Voir les mentions legales', variant: 'secondary' }
        ]}
        highlights={['Creation rapide', 'Lecture des conditions', 'Acces immediat']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Inscription YTECH</span>
            <h2 className="hero-panel__title">Un compte simple a creer et facile a reutiliser.</h2>
            <p className="hero-panel__text">
              Le parcours reste direct, avec les informations essentielles et une validation
              claire des conditions avant creation.
            </p>
            <ul className="hero-panel__list">
              {registerBenefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </>
        }
      />

      <section className="marketing-section marketing-section--compact">
        <div className="container">
          <div className="card-grid card-grid--three">
            {registerCards.map((card) => (
              <article key={card.title} className="panel-card">
                <span className="panel-card__eyebrow">{card.eyebrow}</span>
                <h2 className="panel-card__title">{card.title}</h2>
                <p className="panel-card__text">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-form-shell auth-form-shell">
            <aside className="marketing-side-card auth-side-card">
              <span className="hero-panel__eyebrow">Avant validation</span>
              <h2 className="hero-panel__title">Quelques informations suffisent pour ouvrir votre espace.</h2>
              <p className="hero-panel__text">
                Le compte est maintenant cree dans la base de donnees apres validation du
                formulaire et acceptation des conditions.
              </p>
              <ul className="stack-list">
                <li>Nom, email, telephone et entreprise si besoin.</li>
                <li>Lecture complete des conditions avant activation.</li>
                <li>Connexion immediate apres creation du compte.</li>
              </ul>
              <div className="auth-note">
                Gardez votre email et votre mot de passe pour vous reconnecter ensuite depuis la
                page de connexion, meme sur un autre navigateur.
              </div>
              <div className="auth-quick-links">
                <Link className="text-link" to="/login">
                  J ai deja un compte
                </Link>
                <Link className="text-link" to="/legal">
                  Page legale complete
                </Link>
              </div>
            </aside>

            <div className="marketing-form-card auth-form-card">
              <h2 className="marketing-form-card__title">Creer un compte</h2>
              <p className="marketing-form-card__text">
                Remplissez le formulaire puis validez les conditions pour continuer.
              </p>

              {submitError ? <div className="marketing-alert">{submitError}</div> : null}

              <form className="marketing-form auth-form" onSubmit={handleSubmit}>
                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="name">Nom complet *</label>
                    <input
                      id="name"
                      className={`marketing-input ${errors.name ? 'is-error' : ''}`}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Jean Dupont"
                    />
                    {errors.name ? <div className="marketing-field__error">{errors.name}</div> : null}
                  </div>

                  <div className="marketing-field">
                    <label htmlFor="email">Email professionnel *</label>
                    <input
                      id="email"
                      className={`marketing-input ${errors.email ? 'is-error' : ''}`}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                    />
                    {errors.email ? (
                      <div className="marketing-field__error">{errors.email}</div>
                    ) : null}
                  </div>
                </div>

                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="phone">Telephone *</label>
                    <input
                      id="phone"
                      className={`marketing-input ${errors.phone ? 'is-error' : ''}`}
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+212 6XX XXX XXX"
                    />
                    {errors.phone ? (
                      <div className="marketing-field__error">{errors.phone}</div>
                    ) : null}
                  </div>

                  <div className="marketing-field">
                    <label htmlFor="company">Entreprise</label>
                    <input
                      id="company"
                      className="marketing-input"
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Nom de votre entreprise"
                    />
                  </div>
                </div>

                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="password">Mot de passe *</label>
                    <input
                      id="password"
                      className={`marketing-input ${errors.password ? 'is-error' : ''}`}
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Exemple: MonProjet#2026"
                    />
                    <div className="marketing-field__hint">
                      {passwordRequirements.join(' . ')}
                    </div>
                    {errors.password ? (
                      <div className="marketing-field__error">{errors.password}</div>
                    ) : null}
                  </div>

                  <div className="marketing-field">
                    <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
                    <input
                      id="confirmPassword"
                      className={`marketing-input ${errors.confirmPassword ? 'is-error' : ''}`}
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Retapez votre mot de passe"
                    />
                    {errors.confirmPassword ? (
                      <div className="marketing-field__error">{errors.confirmPassword}</div>
                    ) : null}
                  </div>
                </div>

                <div
                  className={[
                    'panel-card',
                    'auth-terms-card',
                    hasAcceptedTerms ? 'is-accepted' : '',
                    errors.terms ? 'has-error' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="auth-terms-card__header">
                    <div>
                      <span className="panel-card__eyebrow">Conditions</span>
                      <h3 className="panel-card__title">Conditions d utilisation</h3>
                      <p className="panel-card__text">
                        Lecture obligatoire avant l activation de votre compte.
                      </p>
                    </div>
                    <span
                      className={[
                        'auth-status-pill',
                        hasAcceptedTerms
                          ? 'is-accepted'
                          : hasScrolledTermsToBottom
                            ? 'is-ready'
                            : 'is-pending'
                      ].join(' ')}
                    >
                      {hasAcceptedTerms
                        ? 'Conditions acceptees'
                        : hasScrolledTermsToBottom
                          ? 'Lecture terminee'
                          : 'Lecture requise'}
                    </span>
                  </div>

                  <p className="panel-card__text">
                    Ouvrez la fenetre, descendez jusqu en bas puis acceptez pour debloquer
                    l inscription.
                  </p>

                  <div className="auth-button-row">
                    <button
                      type="button"
                      className="auth-button-secondary"
                      onClick={handleOpenTermsModal}
                    >
                      Lire les conditions
                    </button>
                    <Link className="text-link" to="/legal">
                      Voir la page legale complete
                    </Link>
                  </div>

                  {errors.terms ? <div className="marketing-field__error">{errors.terms}</div> : null}
                </div>

                <button
                  type="submit"
                  className="marketing-button marketing-button--dark auth-submit"
                  disabled={isSubmitting || !hasAcceptedTerms}
                >
                  {isSubmitting ? 'Creation en cours...' : 'Creer mon compte'}
                </button>
              </form>

              <div className="auth-form-footer">
                <p>
                  Deja un compte ? <Link to="/login">Se connecter</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter note="Creation de compte client dans un parcours plus coherent avec les autres pages du site." />

      {isTermsModalOpen ? (
        <div className="marketing-modal__overlay" role="presentation" onClick={handleCloseTermsModal}>
          <div
            className="marketing-modal auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-terms-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="marketing-modal__header">
              <span className="marketing-modal__eyebrow">Validation obligatoire</span>
              <h3 id="register-terms-title" className="marketing-modal__title">
                Conditions d utilisation YTECH
              </h3>
              <p className="marketing-modal__text">
                Lisez le contenu jusqu en bas pour activer le bouton d acceptation.
              </p>

              <button
                type="button"
                className="marketing-modal__close"
                onClick={handleCloseTermsModal}
                aria-label="Fermer les conditions d'utilisation"
              >
                x
              </button>
            </div>

            <div className="marketing-modal__body auth-modal__body" onScroll={handleTermsScroll}>
              {termsSections.map((section) => (
                <section key={section.title} className="auth-terms-section">
                  <h4>{section.title}</h4>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list ? (
                    <ul>
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="auth-modal__footer">
              <div className="auth-modal__status">
                {hasScrolledTermsToBottom
                  ? 'Lecture complete. Vous pouvez accepter les conditions.'
                  : 'Faites defiler jusqu en bas pour continuer.'}
              </div>

              <div className="marketing-modal__actions">
                <button
                  type="button"
                  className="auth-button-secondary auth-button-secondary--muted"
                  onClick={handleCloseTermsModal}
                >
                  Fermer
                </button>
                <button
                  type="button"
                  className="marketing-button marketing-button--dark"
                  disabled={!hasScrolledTermsToBottom}
                  onClick={handleAcceptTerms}
                >
                  J ai lu et j accepte
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Register;
