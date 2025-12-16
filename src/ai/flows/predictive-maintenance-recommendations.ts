'use server';

/**
 * @fileOverview Provides smart recommendations for predictive maintenance based on machining data.
 *
 * - getPredictiveMaintenanceRecommendations - A function that generates maintenance recommendations.
 * - PredictiveMaintenanceRecommendationsInput - The input type for the getPredictiveMaintenanceRecommendations function.
 * - PredictiveMaintenanceRecommendationsOutput - The return type for the getPredictiveMaintenanceRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictiveMaintenanceRecommendationsInputSchema = z.object({
  toolWear: z.number().describe('The current wear level of the tool (e.g., in mm).'),
  machiningTime: z.number().describe('The total machining time for the tool (e.g., in hours).'),
  materialType: z.string().describe('The type of material being machined.'),
  historicalData: z
    .string()
    .describe(
      'Historical data of tool performance, including wear rates, failure points, and machining parameters.'
    ),
  cuttingSpeed: z.number().describe('The cutting speed (e.g., in m/min).'),
  feedRate: z.number().describe('The feed rate (e.g., in mm/rev).'),
  depthOfCut: z.number().describe('The depth of cut (e.g., in mm).'),
});
export type PredictiveMaintenanceRecommendationsInput = z.infer<
  typeof PredictiveMaintenanceRecommendationsInputSchema
>;

const PredictiveMaintenanceRecommendationsOutputSchema = z.object({
  recommendations: z.string().describe('Specific recommendations for predictive maintenance.'),
  confidenceLevel: z
    .number()
    .describe('The confidence level (0-1) associated with the recommendations.'),
  reasoning: z.string().describe('The reasoning behind the generated recommendations.'),
});
export type PredictiveMaintenanceRecommendationsOutput = z.infer<
  typeof PredictiveMaintenanceRecommendationsOutputSchema
>;

export async function getPredictiveMaintenanceRecommendations(
  input: PredictiveMaintenanceRecommendationsInput
): Promise<PredictiveMaintenanceRecommendationsOutput> {
  return predictiveMaintenanceRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictiveMaintenanceRecommendationsPrompt',
  input: {schema: PredictiveMaintenanceRecommendationsInputSchema},
  output: {schema: PredictiveMaintenanceRecommendationsOutputSchema},
  prompt: `You are an expert in machining and predictive maintenance for CNC machines like a D600 Machining Center.

  Based on the provided machining data, generate specific recommendations for predictive maintenance.
  Include a confidence level (0-1) for your recommendations and the reasoning behind them.

  - Tool Wear: {{{toolWear}}} mm
  - Machining Time: {{{machiningTime}}} hours
  - Material Type: {{{materialType}}}
  - Cutting Speed: {{{cuttingSpeed}}} m/min
  - Feed Rate: {{{feedRate}}} mm/rev
  - Depth of Cut: {{{depthOfCut}}} mm
  - Historical Data: {{{historicalData}}}

  Consider factors like tool wear rate, material properties, cutting parameters, and historical performance to provide actionable insights.
  For example, high cutting speeds on hard materials might accelerate tool wear.
  Make sure that the recommendation is clear and actionable.
  Ensure that the confidence level reflects the certainty of your assessment based on the available data.
  Give a short reasoning.
  Remember the output must match the output schema, and all fields must be filled.
  `,
});

const predictiveMaintenanceRecommendationsFlow = ai.defineFlow(
  {
    name: 'predictiveMaintenanceRecommendationsFlow',
    inputSchema: PredictiveMaintenanceRecommendationsInputSchema,
    outputSchema: PredictiveMaintenanceRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
