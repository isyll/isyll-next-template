import { type AppLocale, DEFAULT_LOCALE } from '@workspace/core/i18n'

/**
 * Localized copy for transactional emails. Keyed by the shared app locales
 * (`@workspace/core/i18n`). Only French exists today; add a locale by defining
 * another `EmailMessages` object and registering it in `dictionaries`.
 *
 * Templates receive a `locale` prop and read their strings through
 * `emailMessages(locale)`, so the same template renders in any language.
 */
export type EmailLocale = AppLocale

export interface EmailMessages {
  common: {
    footerAccount: (appName: string) => string
    footerRights: (appName: string, year: number) => string
    linkFallback: string
  }
  registration: {
    subject: (appName: string) => string
    preview: (appName: string) => string
    heading: (name: string) => string
    body: (appName: string) => string
    cta: string
    expiry: string
  }
  newConnection: {
    subject: (appName: string) => string
    preview: (appName: string) => string
    heading: string
    greeting: (name: string) => string
    body: (appName: string) => string
    dateLabel: string
    ipLabel: string
    deviceLabel: string
    cta: string
    warning: string
  }
  passwordReset: {
    subject: (appName: string) => string
    preview: (appName: string) => string
    heading: string
    body: (appName: string) => string
    cta: string
    expiry: string
    ignore: string
  }
}

const fr: EmailMessages = {
  common: {
    footerAccount: (appName) =>
      `Vous recevez cet e-mail parce que vous avez un compte sur ${appName}.`,
    footerRights: (appName, year) =>
      `© ${year} ${appName}. Tous droits réservés.`,
    linkFallback:
      'Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :',
  },
  registration: {
    subject: (appName) => `Confirmez votre adresse e-mail — ${appName}`,
    preview: (appName) =>
      `Bienvenue sur ${appName} — confirmez votre adresse e-mail`,
    heading: (name) => `Bienvenue, ${name} 👋`,
    body: (appName) =>
      `Merci de vous être inscrit sur ${appName}. Pour activer votre compte, confirmez votre adresse e-mail en cliquant sur le bouton ci-dessous.`,
    cta: 'Confirmer mon adresse e-mail',
    expiry:
      "Ce lien expire dans 1 heure. Si vous n'avez pas créé de compte, ignorez cet e-mail en toute sécurité.",
  },
  newConnection: {
    subject: (appName) =>
      `Nouvelle connexion détectée sur votre compte — ${appName}`,
    preview: (appName) =>
      `Nouvelle connexion détectée sur votre compte ${appName}`,
    heading: 'Nouvelle connexion détectée',
    greeting: (name) => `Bonjour ${name},`,
    body: (appName) =>
      `Une nouvelle connexion a été détectée sur votre compte ${appName}. Si c'était vous, vous n'avez rien à faire. Sinon, sécurisez votre compte immédiatement.`,
    dateLabel: 'Date et heure',
    ipLabel: 'Adresse IP',
    deviceLabel: 'Appareil',
    cta: 'Vérifier mes sessions actives',
    warning:
      "Si vous ne reconnaissez pas cette connexion, changez votre mot de passe et contactez le support. En cas d'urgence, déconnectez toutes les sessions depuis la page de sécurité de votre compte.",
  },
  passwordReset: {
    subject: (appName) => `Réinitialisez votre mot de passe — ${appName}`,
    preview: (appName) =>
      `Réinitialisez le mot de passe de votre compte ${appName}`,
    heading: 'Réinitialisation du mot de passe',
    body: (appName) =>
      `Nous avons reçu une demande de réinitialisation du mot de passe de votre compte ${appName}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.`,
    cta: 'Réinitialiser mon mot de passe',
    expiry: 'Ce lien expire dans 1 heure.',
    ignore:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.",
  },
}

const en: EmailMessages = {
  common: {
    footerAccount: (appName) =>
      `You're receiving this email because you have an account on ${appName}.`,
    footerRights: (appName, year) =>
      `© ${year} ${appName}. All rights reserved.`,
    linkFallback:
      "If the button doesn't work, copy and paste this link into your browser:",
  },
  registration: {
    subject: (appName) => `Confirm your email address — ${appName}`,
    preview: (appName) => `Welcome to ${appName} — confirm your email address`,
    heading: (name) => `Welcome, ${name} 👋`,
    body: (appName) =>
      `Thanks for signing up to ${appName}. To activate your account, confirm your email address by clicking the button below.`,
    cta: 'Confirm my email address',
    expiry:
      "This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.",
  },
  newConnection: {
    subject: (appName) => `New sign-in detected on your account — ${appName}`,
    preview: (appName) => `New sign-in detected on your ${appName} account`,
    heading: 'New sign-in detected',
    greeting: (name) => `Hi ${name},`,
    body: (appName) =>
      `A new sign-in was detected on your ${appName} account. If this was you, there's nothing to do. Otherwise, secure your account right away.`,
    dateLabel: 'Date and time',
    ipLabel: 'IP address',
    deviceLabel: 'Device',
    cta: 'Review my active sessions',
    warning:
      "If you don't recognize this sign-in, change your password and contact support. In an emergency, sign out of all sessions from your account's security page.",
  },
  passwordReset: {
    subject: (appName) => `Reset your password — ${appName}`,
    preview: (appName) => `Reset the password for your ${appName} account`,
    heading: 'Password reset',
    body: (appName) =>
      `We received a request to reset the password for your ${appName} account. Click the button below to choose a new one.`,
    cta: 'Reset my password',
    expiry: 'This link expires in 1 hour.',
    ignore:
      "If you didn't make this request, ignore this email: your password stays unchanged.",
  },
}

const dictionaries: Record<EmailLocale, EmailMessages> = { fr, en }

/** Return the email copy for `locale`, falling back to the default. */
export function emailMessages(
  locale: EmailLocale = DEFAULT_LOCALE
): EmailMessages {
  return dictionaries[locale]
}
