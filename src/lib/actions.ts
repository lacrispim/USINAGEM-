'use server';

import { getPredictiveMaintenanceRecommendations } from '@/ai/flows/predictive-maintenance-recommendations';
import type { PredictiveMaintenanceRecommendationsOutput } from '@/ai/flows/predictive-maintenance-recommendations';
import { z } from 'zod';

const formSchema = z.object({
  toolWear: z.coerce.number().positive('O desgaste da ferramenta deve ser um número positivo.'),
  machiningTime: z.coerce.number().positive('O tempo de usinagem deve ser um número positivo.'),
  materialType: z.string().min(1, 'O tipo de material é obrigatório.'),
  historicalData: z.string().min(1, 'Os dados históricos são obrigatórios.'),
  cuttingSpeed: z.coerce.number().positive('A velocidade de corte deve ser um número positivo.'),
  feedRate: z.coerce.number().positive('A taxa de avanço deve ser um número positivo.'),
  depthOfCut: z.coerce.number().positive('A profundidade de corte deve ser um número positivo.'),
});

export type RecommendationState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  data?: PredictiveMaintenanceRecommendationsOutput;
  errors?: {
    toolWear?: string[];
    machiningTime?: string[];
    materialType?: string[];
    historicalData?: string[];
    cuttingSpeed?: string[];
    feedRate?: string[];
    depthOfCut?: string[];
  };
};

export async function getRecommendationsAction(
  prevState: RecommendationState,
  formData: FormData
): Promise<RecommendationState> {
  const validatedFields = formSchema.safeParse({
    toolWear: formData.get('toolWear'),
    machiningTime: formData.get('machiningTime'),
    materialType: formData.get('materialType'),
    historicalData: formData.get('historicalData'),
    cuttingSpeed: formData.get('cuttingSpeed'),
    feedRate: formData.get('feedRate'),
    depthOfCut: formData.get('depthOfCut'),
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      message: 'Dados do formulário inválidos. Corrija os erros e tente novamente.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await getPredictiveMaintenanceRecommendations(validatedFields.data);
    return {
      status: 'success',
      message: 'Recomendações geradas com sucesso.',
      data: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 'error',
      message: 'Ocorreu um erro inesperado ao gerar as recomendações. Tente novamente mais tarde.',
    };
  }
}
