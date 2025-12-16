'use server';

import { getPredictiveMaintenanceRecommendations } from '@/ai/flows/predictive-maintenance-recommendations';
import type { PredictiveMaintenanceRecommendationsOutput } from '@/ai/flows/predictive-maintenance-recommendations';
import { z } from 'zod';

const formSchema = z.object({
  toolWear: z.coerce.number().positive('Tool wear must be a positive number.'),
  machiningTime: z.coerce.number().positive('Machining time must be a positive number.'),
  materialType: z.string().min(1, 'Material type is required.'),
  historicalData: z.string().min(1, 'Historical data is required.'),
  cuttingSpeed: z.coerce.number().positive('Cutting speed must be a positive number.'),
  feedRate: z.coerce.number().positive('Feed rate must be a positive number.'),
  depthOfCut: z.coerce.number().positive('Depth of cut must be a positive number.'),
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
      message: 'Invalid form data. Please correct the errors and try again.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await getPredictiveMaintenanceRecommendations(validatedFields.data);
    return {
      status: 'success',
      message: 'Recommendations generated successfully.',
      data: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 'error',
      message: 'An unexpected error occurred while generating recommendations. Please try again later.',
    };
  }
}
