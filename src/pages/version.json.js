import pkg from '../../package.json';

// Se sirve como /version.json. No entra en el precache (globPatterns no incluye
// .json), así que siempre se resuelve por red: es lo que permite saber qué
// versión trae la actualización que está esperando.
export const GET = () => new Response(
    JSON.stringify({ version: pkg.version }),
    { headers: { 'content-type': 'application/json' } }
);
