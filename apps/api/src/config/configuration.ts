export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    // Corto a propósito: la sesión larga la da el refresh token (ver
    // AuthProvider en el frontend, que renueva el access token en
    // silencio ante cualquier 401, sin pedirle al usuario loguearse de
    // nuevo mientras siga activo).
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '30m',
    platformSecret: process.env.JWT_PLATFORM_SECRET,
    // La plataforma (panel de super-admin) no tiene refresh token propio
    // todavía — uso interno, poco frecuente — así que su token dura más.
    platformExpiresIn: process.env.JWT_PLATFORM_EXPIRES_IN ?? '8h',
    refreshExpiresInDays: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? '30',
      10,
    ),
  },
});
