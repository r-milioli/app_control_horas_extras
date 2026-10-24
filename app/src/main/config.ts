import { APP_VERSION } from '../shared/types'

/** URL padrão do Web App (pode sobrescrever com API_URL no ambiente). */
const DEFAULT_API_URL =
  'https://script.google.com/macros/s/AKfycbxeuhsahyc7oUgOydujDv4k9-kEfgpy4tq-jJQ9Oc9SkH9B7GVR4BCZtpYTKzXHK5ZbUA/exec'

export function getApiUrl(): string {
  return (process.env.API_URL || DEFAULT_API_URL).trim().replace(/\/$/, '')
}

export function getAppVersion(): string {
  return APP_VERSION
}

export const SYNC_LOTE_MAX = 50
