function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} を .env.server に設定してください。`)
  }
  return value
}

export const config = {
  // Vercelでは各DeploymentのURLを自動利用し、ローカルでは開発用URLへフォールバックします。
  appOrigin: process.env.APP_ORIGIN
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
  databaseUrl: requiredEnvironmentValue('DATABASE_URL'),
  port: Number(process.env.PORT ?? '8787'),
  vapidPrivateKey: requiredEnvironmentValue('VAPID_PRIVATE_KEY'),
  vapidPublicKey: requiredEnvironmentValue('VAPID_PUBLIC_KEY'),
  vapidSubject: requiredEnvironmentValue('VAPID_SUBJECT'),
}

export function gtfsConfig() {
  return {
    kyotoBusGtfsUrl: requiredEnvironmentValue('KYOTO_BUS_GTFS_URL'),
    odptConsumerKey: requiredEnvironmentValue('ODPT_CONSUMER_KEY'),
  }
}
