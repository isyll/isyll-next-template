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

const dictionaries: Record<EmailLocale, EmailMessages> = { fr }

/** Return the email copy for `locale`, falling back to the default. */
export function emailMessages(
  locale: EmailLocale = DEFAULT_LOCALE
): EmailMessages {
  return dictionaries[locale]
}
