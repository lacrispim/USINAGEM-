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
  prompt: `Você é um especialista em usinagem e manutenção preditiva para máquinas CNC como um Centro de Usinagem D600.

  Com base nos dados de usinagem fornecidos, gere recomendações específicas para manutenção preditiva em português.
  Inclua um nível de confiança (0-1) para suas recomendações e a justificativa por trás delas.

  - Desgaste da Ferramenta: {{{toolWear}}} mm
  - Tempo de Usinagem: {{{machiningTime}}} horas
  - Tipo de Material: {{{materialType}}}
  - Velocidade de Corte: {{{cuttingSpeed}}} m/min
  - Taxa de Avanço: {{{feedRate}}} mm/rev
  - Profundidade de Corte: {{{depthOfCut}}} mm
  - Dados Históricos: {{{historicalData}}}

  Considere fatores como taxa de desgaste da ferramenta, propriedades do material, parâmetros de corte e desempenho histórico para fornecer insights acionáveis.
  Por exemplo, altas velocidades de corte em materiais duros podem acelerar o desgaste da ferramenta.
  Certifique-se de que a recomendação seja clara e acionável.
  Garanta que o nível de confiança reflita a certeza de sua avaliação com base nos dados disponíveis.
  Dê uma justificativa curta.
  Lembre-se que a saída deve corresponder ao esquema de saída, e todos os campos devem ser preenchidos.
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
