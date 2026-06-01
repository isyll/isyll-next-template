import { RuleConfigSeverity, type UserConfig } from '@commitlint/types'

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      RuleConfigSeverity.Error,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    'type-case': [RuleConfigSeverity.Error, 'always', 'lower-case'],
    'type-empty': [RuleConfigSeverity.Error, 'never'],
    'scope-enum': [
      RuleConfigSeverity.Error,
      'always',
      [
        'web',
        'ui',
        'core',
        'db',
        'auth',
        'i18n',
        'eslint-config',
        'typescript-config',
        'tooling',
        'config',
        'deps',
        'ci',
        'docs',
        'release',
        'repo',
      ],
    ],
    'scope-case': [RuleConfigSeverity.Error, 'always', 'kebab-case'],
    'scope-empty': [RuleConfigSeverity.Error, 'never'],
    'subject-case': [
      RuleConfigSeverity.Error,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-empty': [RuleConfigSeverity.Error, 'never'],
    'subject-full-stop': [RuleConfigSeverity.Error, 'never', '.'],
    'header-max-length': [RuleConfigSeverity.Error, 'always', 72],
    'body-leading-blank': [RuleConfigSeverity.Error, 'always'],
    'body-max-line-length': [RuleConfigSeverity.Error, 'always', 100],
    'footer-leading-blank': [RuleConfigSeverity.Error, 'always'],
    'footer-max-line-length': [RuleConfigSeverity.Error, 'always', 100],
  },
}

export default config
