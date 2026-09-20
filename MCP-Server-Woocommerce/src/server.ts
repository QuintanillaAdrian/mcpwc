import app from './app';

// Entry point para desarrollo local (`npm run dev` / `npm start`) — separado
// de lambda.ts (entry point de producción). Los dos usan exactamente la
// misma app de Express de src/app.ts, nada de las rutas/middleware cambia
// según dónde corra.
//
// PORT es la variable que la mayoría de plataformas (Heroku, Render, etc.)
// inyectan solas para decirle a la app en qué puerto tiene que escuchar. Si
// no está definida (ej. corriendo local), cae a API_PORT y por último al
// 3001 de siempre.
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`HTTP API server listening on http://localhost:${PORT}`);
});
