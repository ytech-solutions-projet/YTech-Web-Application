import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/app-shell.css';
import {
  changeCurrentPassword,
  requestPasswordChangeEmailLink
} from '../utils/businessApi';
import { readAuthUser, writeAuthSession } from '../utils/storage';

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

const passwordSecurityChecks = [
  '12 caracteres minimum',
  'Une majuscule, une minuscule, un chiffre et un caractere special',
  'Le nouveau mot de passe doit etre different de l ancien',
  'Les autres sessions sont fermees apres la mise a jour'
];

const Settings = () => {
  const [user, setUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSubmitError, setPasswordSubmitError] = useState('');
  const [passwordSubmitSuccess, setPasswordSubmitSuccess] = useState('');
  const [passwordEmailError, setPasswordEmailError] = useState('');
  const [passwordEmailSuccess, setPasswordEmailSuccess] = useState('');
  const [passwordEmailDevUrl, setPasswordEmailDevUrl] = useState('');
  const [passwordEmailDevToken, setPasswordEmailDevToken] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isPasswordEmailSubmitting, setIsPasswordEmailSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authUser = readAuthUser();

    if (!authUser) {
      navigate('/login');
      return;
    }

    setUser(authUser);
  }, [navigate]);

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
    }));

    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validatePasswordForm = () => {
    const nextErrors = {};

    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = 'Le mot de passe actuel est requis';
    }

    if (!passwordForm.newPassword) {
      nextErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else {
      const meetsLength = passwordForm.newPassword.length >= 12;
      const hasLower = /[a-z]/.test(passwordForm.newPassword);
      const hasUpper = /[A-Z]/.test(passwordForm.newPassword);
      const hasDigit = /\d/.test(passwordForm.newPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(passwordForm.newPassword);

      if (!(meetsLength && hasLower && hasUpper && hasDigit && hasSpecial)) {
        nextErrors.newPassword = 'Le mot de passe ne respecte pas les exigences de securite';
      } else if (passwordForm.newPassword === passwordForm.currentPassword) {
        nextErrors.newPassword = 'Le nouveau mot de passe doit etre different de l ancien';
      }
    }

    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = 'Confirmez le nouveau mot de passe';
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePasswordEmailRequest = async () => {
    setIsPasswordEmailSubmitting(true);
    setPasswordEmailError('');
    setPasswordEmailSuccess('');
    setPasswordEmailDevUrl('');
    setPasswordEmailDevToken('');

    try {
      const payload = await requestPasswordChangeEmailLink();
      setPasswordEmailSuccess(
        payload.message || `Un lien securise a ete envoye a ${user?.email || 'votre email'}.`
      );
      setPasswordEmailDevUrl(payload.resetUrl || '');
      setPasswordEmailDevToken(payload.resetToken || '');
    } catch (error) {
      setPasswordEmailError(error.message || 'Impossible d envoyer le lien pour le moment');
    } finally {
      setIsPasswordEmailSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordSubmitError('');
    setPasswordSubmitSuccess('');

    try {
      const payload = await changeCurrentPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (payload.user) {
        writeAuthSession({ user: payload.user });
        setUser(payload.user);
      }

      setPasswordForm(initialPasswordForm);
      setPasswordSubmitSuccess(
        payload.message || 'Mot de passe mis a jour avec succes.'
      );
    } catch (error) {
      setPasswordSubmitError(error.message || 'Impossible de modifier le mot de passe');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-shell">
          <div className="workspace-empty">
            <div className="workspace-empty__icon">...</div>
            <div className="workspace-empty__title">Chargement des parametres</div>
            <div className="workspace-empty__text">Preparation de votre espace securise.</div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="workspace-page">
      <div className="workspace-shell">
        <section className="workspace-hero">
          <div className="workspace-hero__content">
            <div className="workspace-hero__copy">
              <span className="workspace-hero__eyebrow">Parametres</span>
              <h1 className="workspace-hero__title">Securite et acces du compte</h1>
              <p className="workspace-hero__text">
                Depuis cette page, {isAdmin ? 'l administrateur' : 'le client'} peut modifier son mot
                de passe de facon securisee, soit immediatement, soit via un lien envoye par email.
              </p>
            </div>
            <div className="workspace-hero__meta">
              <span className="workspace-hero__badge">{isAdmin ? 'ADM' : 'SEC'}</span>
              <span className="workspace-hero__label">{user.email}</span>
            </div>
          </div>
        </section>

        <div className="workspace-grid workspace-grid--sidebar">
          <aside className="workspace-stack">
            <div className="workspace-card workspace-card--padded workspace-card--accent">
              <h2 className="workspace-section-title">Compte actif</h2>
              <p className="workspace-section-copy">
                {isAdmin
                  ? 'Votre compte admin donne acces aux espaces de gestion et doit rester fortement protege.'
                  : 'Votre compte client centralise vos devis, messages et acces projet.'}
              </p>
              <p className="workspace-note" style={{ marginTop: '0.85rem' }}>
                Email: {user.email}
              </p>
            </div>

            <div className="workspace-card workspace-card--padded">
              <h2 className="workspace-section-title">Informations du profil</h2>
              <div className="workspace-list" style={{ marginTop: '1rem' }}>
                <div className="workspace-list-item">
                  <div>
                    <div className="workspace-list-item__title">Nom</div>
                    <div className="workspace-list-item__meta">{user.name || 'Non renseigne'}</div>
                  </div>
                </div>
                <div className="workspace-list-item">
                  <div>
                    <div className="workspace-list-item__title">Role</div>
                    <div className="workspace-list-item__meta">{isAdmin ? 'Administrateur' : 'Client'}</div>
                  </div>
                </div>
                <div className="workspace-list-item">
                  <div>
                    <div className="workspace-list-item__title">Telephone</div>
                    <div className="workspace-list-item__meta">{user.phone || 'Non renseigne'}</div>
                  </div>
                </div>
                <div className="workspace-list-item">
                  <div>
                    <div className="workspace-list-item__title">Entreprise</div>
                    <div className="workspace-list-item__meta">{user.company || 'Non renseignee'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="workspace-card workspace-card--padded">
              <h2 className="workspace-section-title">Acces rapides</h2>
              <div className="workspace-inline-actions" style={{ marginTop: '1rem' }}>
                <Link to="/dashboard" className="workspace-inline-btn">
                  Retour dashboard
                </Link>
                <Link to={isAdmin ? '/admin-messages' : '/messages'} className="workspace-inline-btn is-info">
                  {isAdmin ? 'Messagerie admin' : 'Messages'}
                </Link>
              </div>
            </div>
          </aside>

          <main className="workspace-stack">
            <div className="workspace-card workspace-card--padded">
              <div className="workspace-section-head">
                <div>
                  <h2 className="workspace-section-title">Changer le mot de passe</h2>
                  <p className="workspace-section-copy">
                    Le changement est disponible ici dans les parametres, avec controle de l ancien mot de passe
                    et fermeture des autres sessions.
                  </p>
                </div>
                <span className={`workspace-pill ${isAdmin ? 'is-danger' : 'is-info'}`}>
                  {isAdmin ? 'Parametre admin' : 'Parametre client'}
                </span>
              </div>

              <div className="workspace-security-grid">
                <aside className="workspace-security-panel">
                  <div>
                    <h3 className="workspace-section-title">Recevoir un lien par email</h3>
                    <p className="workspace-note" style={{ marginTop: '0.55rem' }}>
                      Un lien securise sera envoye a <strong>{user.email}</strong>. C est utile si vous preferez
                      valider le changement depuis votre boite mail.
                    </p>
                  </div>

                  <div className="workspace-inline-actions">
                    <button
                      type="button"
                      className="workspace-inline-btn is-info"
                      onClick={handlePasswordEmailRequest}
                      disabled={isPasswordEmailSubmitting}
                    >
                      {isPasswordEmailSubmitting ? 'Envoi en cours...' : 'Recevoir un lien'}
                    </button>
                    <Link to="/forgot-password" className="workspace-inline-btn">
                      Page publique
                    </Link>
                  </div>

                  {passwordEmailError ? (
                    <div className="workspace-alert is-danger">{passwordEmailError}</div>
                  ) : null}
                  {passwordEmailSuccess ? (
                    <div className="workspace-alert is-success">{passwordEmailSuccess}</div>
                  ) : null}
                  {passwordEmailDevUrl ? (
                    <div className="workspace-alert is-info">
                      <div>
                        Mode local: ouvrez directement <a href={passwordEmailDevUrl}>le lien de reinitialisation</a>.
                      </div>
                      {passwordEmailDevToken ? <code className="workspace-code">{passwordEmailDevToken}</code> : null}
                    </div>
                  ) : null}

                  <div>
                    <h3 className="workspace-section-title">Rappels de securite</h3>
                    <ul className="workspace-checklist">
                      {passwordSecurityChecks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </aside>

                <form className="workspace-form-stack" onSubmit={handlePasswordSubmit}>
                  <div className="workspace-field">
                    <label htmlFor="currentPassword">Mot de passe actuel</label>
                    <input
                      id="currentPassword"
                      className="workspace-input"
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordFieldChange}
                      placeholder="Entrez votre mot de passe actuel"
                      autoComplete="current-password"
                    />
                    {passwordErrors.currentPassword ? (
                      <div className="workspace-field__error">{passwordErrors.currentPassword}</div>
                    ) : null}
                  </div>

                  <div className="workspace-field">
                    <label htmlFor="newPassword">Nouveau mot de passe</label>
                    <input
                      id="newPassword"
                      className="workspace-input"
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordFieldChange}
                      placeholder="Choisissez un nouveau mot de passe"
                      autoComplete="new-password"
                    />
                    <div className="workspace-field__hint">
                      12 caracteres minimum avec majuscule, minuscule, chiffre et caractere special.
                    </div>
                    {passwordErrors.newPassword ? (
                      <div className="workspace-field__error">{passwordErrors.newPassword}</div>
                    ) : null}
                  </div>

                  <div className="workspace-field">
                    <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
                    <input
                      id="confirmPassword"
                      className="workspace-input"
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordFieldChange}
                      placeholder="Confirmez le nouveau mot de passe"
                      autoComplete="new-password"
                    />
                    {passwordErrors.confirmPassword ? (
                      <div className="workspace-field__error">{passwordErrors.confirmPassword}</div>
                    ) : null}
                  </div>

                  {passwordSubmitError ? (
                    <div className="workspace-alert is-danger">{passwordSubmitError}</div>
                  ) : null}
                  {passwordSubmitSuccess ? (
                    <div className="workspace-alert is-success">{passwordSubmitSuccess}</div>
                  ) : null}

                  <button type="submit" className="workspace-submit-btn" disabled={isPasswordSubmitting}>
                    {isPasswordSubmitting ? 'Mise a jour en cours...' : 'Enregistrer le nouveau mot de passe'}
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
