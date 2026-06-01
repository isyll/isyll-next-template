import { nextJsConfig } from '@workspace/eslint-config/next-js'
import { defineConfig, globalIgnores } from 'eslint/config'

// e2e specs are type-checked and run by Playwright's own toolchain.
export default defineConfig(globalIgnores(['e2e/**']), ...nextJsConfig)
