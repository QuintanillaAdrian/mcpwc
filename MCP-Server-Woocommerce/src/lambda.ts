import serverlessHttp from 'serverless-http';
import app from './app';

// Entry point para producción (Lambda) — mismo patrón que chatbot-backend/src/lambda.ts.
// serverless-http traduce el evento de API Gateway a un request/response que
// Express entiende, y traduce la respuesta de vuelta — no reescribe nada de
// la app en sí, es la misma de src/app.ts.
//
// `handler` es el nombre que Lambda invoca — se lo decimos a AWS en
// infra-stack.ts con `handler: 'lambda.handler'`.
export const handler = serverlessHttp(app);
