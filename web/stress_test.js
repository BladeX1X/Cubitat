import http from 'k6/http';
import { sleep, check } from 'k6';

// Configuración del escenario de estrés
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Rampa de subida: 0 a 20 usuarios en 30 segundos
    { duration: '1m', target: 50 },   // Mantener 50 usuarios concurrentes durante 1 minuto
    { duration: '30s', target: 100 }, // Subir a 100 usuarios en un pico de estrés de 30 segundos
    { duration: '30s', target: 0 },   // Rampa de bajada: Recuperación a 0 usuarios
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // El porcentaje de fallos (que no sean rate limits) debe ser menor al 1%
    http_req_duration: ['p(95)<500'], // El 95% de las peticiones debe completarse en menos de 500ms
  },
};

export default function () {
  // Petición a la página de inicio
  const homeRes = http.get('https://cubitathome.com/');
  check(homeRes, {
    'home status is 200': (r) => r.status === 200,
    'home content is correct': (r) => r.body.includes('Cubitat'),
  });

  sleep(1); // Espera de 1 segundo entre acciones del usuario simulado

  // Petición simulada al proxy de la base de datos
  const apiRes = http.get('https://cubitathome.com/api/supabase/rest/v1/properties?select=id,title,price_usd&limit=5');
  check(apiRes, {
    'api status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  sleep(2);
}
