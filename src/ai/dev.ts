import { config } from 'dotenv';
config({ path: '.env.local' });

import '@/ai/flows/predict-machining-time-flow.ts';