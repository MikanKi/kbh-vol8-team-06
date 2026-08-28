function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} を .env.server に設定してください。`)
  }
  return value
}

export const config = {
  appOrigin: requiredEnvironmentValue('APP_ORIGIN'),
  databaseUrl: requiredEnvironmentValue('DATABASE_URL'),
  port: Number(process.env.PORT ?? '8787'),
  vapidPrivateKey: requiredEnvironmentValue('VAPID_PRIVATE_KEY'),
  vapidPublicKey: requiredEnvironmentValue('VAPID_PUBLIC_KEY'),
  vapidSubject: requiredEnvironmentValue('VAPID_SUBJECT'),
}
