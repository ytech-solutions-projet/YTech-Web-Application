import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { fetchJson } from '../utils/http';
import { resolveSafeNextPath } from '../utils/navigation';
import { writeAuthSession } from '../utils/storage';
import '../styles/auth.css';

const initialFormData = {
  email: '',
  password: ''
};

const loginBenefits = [
  'Acces rapide a votre dashboard client',
  'Suivi des messages et des demandes en un seul endroit',
  'Connexion reservee aux emails verifies'
];

const loginCards = [
  {
    eyebrow: 'Dashboard',
    title: 'Retrouvez votre espace client.',
    text: 'Suivez vos demandes, vos messages et les informations utiles depuis une seule interface.'
  },
  {
    eyebrow: 'Suivi',
    title: 'Une lecture plus simple.',
    text: 'Les echanges et les demandes restent regroupes pour eviter les allers-retours inutiles.'
  },
  {
    eyebrow: 'Acces',
    title: 'Connexion adaptee au bon role.',
    text: 'Chaque utilisateur est renvoye automatiquement vers le bon espace apres validation.'
  }
];

const Login = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const isEmailJustVerified = searchParams.get('verified') === '1';
  const nextPath = resolveSafeNextPath(searchParams.get('next'), '/dashboard');
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    email: initialEmail
  }));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitInfo, setSubmitInfo] = useState(
    isEmailJustVerified ? 'Email verifie. Vous pouvez maintenant vous connecter.' : ''
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const navigate = useNavigate();

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

    if (submitError) {
      setSubmitError('');
    }

    if (submitInfo) {
      setSubmitInfo('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
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
    setSubmitInfo('');
    setUnverifiedEmail('');

    try {
      const { payload } = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        })
      });

      if (!writeAuthSession(payload)) {
        throw new Error('Impossible de sauvegarder votre session localement');
      }

      navigate(payload.user?.role === 'admin' ? '/dashboard' : nextPath);
    } catch (error) {
      if (error.payload?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(error.payload?.email || formData.email.trim().toLowerCase());
      }

      setSubmitError(error.message || 'Impossible de vous connecter pour le moment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketing-page auth-page login-page">
      <PublicHero
        eyebrow="Connexion"
        title="Accedez a votre espace client"
        description="Connectez-vous pour retrouver vos demandes, vos messages et le suivi de votre projet dans un espace plus clair et coherent avec le reste du site."
        actions={[
          { to: `/register?next=${encodeURIComponent(nextPath)}`, label: 'Creer un compte', variant: 'primary' },
          { to: '/contact?intent=support', label: "Besoin d'aide", variant: 'secondary' }
        ]}
        highlights={['Dashboard client', 'Suivi projet', 'Email verifie']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Acces rapide</span>
            <h2 className="hero-panel__title">Retrouvez l essentiel sans changer d univers visuel.</h2>
            <p className="hero-panel__text">
              Cette page reprend la meme base que le site public, avec verification email avant ouverture de session.
            </p>
            <ul className="hero-panel__list">
              {loginBenefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </>
        }
      />

      <section className="marketing-section marketing-section--compact">
        <div className="container">
          <div className="card-grid card-grid--three">
            {loginCards.map((card) => (
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
              <span className="hero-panel__eyebrow">Avant de continuer</span>
              <h2 className="hero-panel__title">Utilisez votre compte YTECH pour continuer.</h2>
              <p className="hero-panel__text">
                La connexion passe maintenant par l API YTECH avec verification email prealable.
                Si vous etes admin, la redirection se fait automatiquement vers l espace de gestion.
              </p>
              <ul className="stack-list">
                <li>Entrez l email utilise lors de votre inscription.</li>
                <li>Verifiez votre email si c est votre premiere connexion.</li>
                <li>Utilisez le mot de passe associe a votre espace client.</li>
                <li>Besoin d aide ? Nous pouvons vous orienter rapidement.</li>
              </ul>
              <div className="auth-quick-links">
                <Link className="text-link" to={`/register?next=${encodeURIComponent(nextPath)}`}>
                  Creer un compte
                </Link>
                <Link className="text-link" to={`/verify-email?next=${encodeURIComponent(nextPath)}`}>
                  Verifier mon email
                </Link>
                <Link className="text-link" to="/forgot-password">
                  Mot de passe oublie
                </Link>
                <Link className="text-link" to="/contact?intent=support">
                  Contacter YTECH
                </Link>
              </div>
            </aside>

            <div className="marketing-form-card auth-form-card">
              <h2 className="marketing-form-card__title">Connexion</h2>
              <p className="marketing-form-card__text">
                Entrez vos identifiants pour retrouver votre espace YTECH.
              </p>

              {submitInfo ? <div className="marketing-alert">{submitInfo}</div> : null}
              {submitError ? <div className="marketing-alert">{submitError}</div> : null}
              {unverifiedEmail ? (
                <div className="auth-note">
                  Votre compte existe mais l email n est pas encore confirme.{' '}
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}&next=${encodeURIComponent(nextPath)}`}
                  >
                    Verifier ou renvoyer le lien
                  </Link>
                </div>
              ) : null}

              <form className="marketing-form auth-form" onSubmit={handleSubmit}>
                <div className="marketing-field">
                  <label htmlFor="email">Email professionnel</label>
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

                <div className="marketing-field">
                  <label htmlFor="password">Mot de passe</label>
                  <input
                    id="password"
                    className={`marketing-input ${errors.password ? 'is-error' : ''}`}
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Entrez votre mot de passe"
                  />
                  <div className="marketing-field__hint">
                    Votre compte doit etre actif et votre email deja verifie cote YTECH.
                  </div>
                  <div className="marketing-field__hint">
                    Mot de passe oublie ? <Link to="/forgot-password">Recevoir un lien de reinitialisation</Link>
                  </div>
                  {errors.password ? (
                    <div className="marketing-field__error">{errors.password}</div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="marketing-button marketing-button--dark auth-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
                </button>
              </form>

              <div className="auth-form-footer">
                <p>
                  Pas encore de compte ? <Link to={`/register?next=${encodeURIComponent(nextPath)}`}>S inscrire</Link>
                </p>
                <p>
                  Mot de passe oublie ? <Link to="/forgot-password">Reinitialiser mon acces</Link>
                </p>
                <p>
                  Email non verifie ?{' '}
                  <Link to={`/verify-email?next=${encodeURIComponent(nextPath)}`}>Verifier ou renvoyer le lien</Link>
                </p>
                <p>
                  Besoin d aide ? <Link to="/contact?intent=support">Nous contacter</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter note="Connexion client activee seulement apres verification email." />
    </div>
  );
};

export default Login;
