'use server';

/**
 * @fileOverview Provides a smart prediction for machining time based on part and process data.
 *
 * - getMachiningTimePrediction - A function that generates machining time predictions.
 * - MachiningTimePredictionInput - The input type for the getMachiningTimePrediction function.
 * - MachiningTimePredictionOutput - The return type for the getMachiningTimePrediction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MachiningTimePredictionInputSchema = z.object({
  machine: z.string().describe('The machine to be used (e.g., TORNO CNC CENTUR 30, CENTRO DE USINAGEM D600).'),
  material: z.string().describe('The type of material being machined (e.g., Aço 1045, Alumínio 6061).'),
  rawMaterialDimensions: z.string().describe("The dimensions of the raw material (e.g., 'D:100mm L:200mm' or '100x50x30mm')."),
  geometryComplexity: z.enum(['Baixa', 'Média', 'Alta']).describe("The complexity of the part's geometry."),
  toolCount: z.number().optional().describe('The number of distinct tools used (especially for machining centers).'),
  fixtureType: z.string().optional().describe('The type of fixture used to hold the part (especially for machining centers).'),
  historicalData: z.string().describe('Historical data of similar parts, including machining times, setup times, and any issues encountered.'),
});
export type MachiningTimePredictionInput = z.infer<
  typeof MachiningTimePredictionInputSchema
>;

const MachiningTimePredictionOutputSchema = z.object({
  predictedTime: z.number().describe('The predicted machining time in minutes.'),
  reasoning: z.string().describe('The reasoning behind the generated prediction, explaining the factors considered.'),
});
export type MachiningTimePredictionOutput = z.infer<
  typeof MachiningTimePredictionOutputSchema
>;

export async function getMachiningTimePrediction(
  input: MachiningTimePredictionInput
): Promise<MachiningTimePredictionOutput> {
  return machiningTimePredictionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'machiningTimePredictionPrompt',
  input: {schema: MachiningTimePredictionInputSchema},
  output: {schema: MachiningTimePredictionOutputSchema},
  prompt: `Você é um engenheiro de processos especialista em usinagem CNC e um operador experiente do TORNO CNC Centur 30 e do Centro de Usinagem D600.

  Sua tarefa é estimar o tempo de usinagem (em minutos) para uma nova peça com base nas informações fornecidas. Considere todos os aspectos do processo: tempo de corte, trocas de ferramenta, tempo de setup (se aplicável com base no tipo de fixação), e a complexidade geral.

  **Dados da Peça e Processo:**
  - **Máquina:** {{{machine}}}
  - **Material:** {{{material}}}
  - **Dimensões do Bruto:** {{{rawMaterialDimensions}}}
  - **Complexidade da Geometria:** {{{geometryComplexity}}}
  {{#if toolCount}}- **Número de Ferramentas Distintas:** {{{toolCount}}}{{/if}}
  {{#if fixtureType}}- **Tipo de Fixação:** {{{fixtureType}}}{{/if}}
  - **Dados Históricos de Peças Similares:** {{{historicalData}}}

  **Seu Raciocínio Deve Considerar:**
  1.  **Tipo de Máquina:** O Centur 30 (torno) e o D600 (centro de usinagem) têm tempos de operação diferentes. Tornos são geralmente para peças de revolução, enquanto centros de usinagem lidam com geometrias mais complexas e prismáticas.
  2.  **Material:** Materiais mais duros (como Aço 1045) exigem velocidades de corte menores e, portanto, mais tempo, em comparação com materiais mais macios (como Alumínio).
  3.  **Remoção de Material:** Calcule o volume de material a ser removido com base nas dimensões do bruto. Quanto mais material a remover, maior o tempo.
  4.  **Complexidade:** Geometrias 'Alta' complexidade implicam mais passes de ferramenta, possivelmente reposicionamento da peça, e um tempo de programação e setup mais longo. Geometria 'Baixa' implica menos operações.
  5.  **Operações no Centro de Usinagem:** Para o D600, um número maior de ferramentas ({{{toolCount}}}) significa mais tempo gasto em trocas de ferramenta. O tipo de fixação ({{{fixtureType}}}) pode influenciar o tempo de setup. Uma morsa é rápida, um dispositivo dedicado pode ser mais demorado para alinhar.

  **Instruções de Saída:**
  - Forneça uma estimativa de tempo realista em **minutos**.
  - No campo 'reasoning', explique claramente como você chegou a essa estimativa, citando os fatores mais impactantes (ex: "O alto número de ferramentas e a complexidade da geometria são os principais fatores que aumentam o tempo total...").
  - Lembre-se que a saída deve corresponder ao esquema de saída, e todos os campos devem ser preenchidos.
  `,
});

const machiningTimePredictionFlow = ai.defineFlow(
  {
    name: 'machiningTimePredictionFlow',
    inputSchema: MachiningTimePredictionInputSchema,
    outputSchema: MachiningTimePredictionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
