export default {
  site: 'http://127.0.0.1:5173',
  urls: [
    '/',
    '/resultados',
    '/auth/callback',
    '/recuperar-contrasena',
  ],
  outputPath: './reports/unlighthouse',
  scanner: {
    crawler: false,
    sitemap: false,
    robotsTxt: false,
    samples: 1,
    throttle: true,
    device: 'mobile',
  },
}
