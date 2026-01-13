// IMPORTANT: This file is used for local development of Genkit flows.
// It is not intended for production use.
// The `config` call from `dotenv` has been moved to `src/ai/genkit.ts`
// to ensure environment variables are loaded consistently in all environments,
// including the Vercel deployment environment.

import '@/ai/flows/predict-machining-time-flow.ts';
