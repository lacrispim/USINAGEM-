'use server';

import { getMachiningTimePrediction, MachiningTimePredictionOutput } from '@/ai/flows/predict-machining-time-flow';
import { z } from 'zod';

const formSchema = z.object({
  machine: z.string().min(1, 'A seleção da máquina é obrigatória.'),
  material: z.string().min(1, 'O tipo de material é obrigatório.'),
  rawMaterialDimensions: z.string().min(1, 'As dimensões do bruto são obrigatórias.'),
  geometryComplexity: z.enum(['Baixa', 'Média', 'Alta']),
  toolCount: z.coerce.number().optional(),
  fixtureType: z.string().optional(),
  historicalData: z.string().min(1, 'Os dados históricos são obrigatórios.'),
});


export type PredictionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  data?: MachiningTimePredictionOutput;
  errors?: {
    machine?: string[];
    material?: string[];
    rawMaterialDimensions?: string[];
    geometryComplexity?: string[];
    toolCount?: string[];
    fixtureType?: string[];
    historicalData?: string[];
  };
};

export async function getMachiningTimePredictionAction(
  prevState: PredictionState,
  formData: FormData
): Promise<PredictionState> {
  const validatedFields = formSchema.safeParse({
    machine: formData.get('machine'),
    material: formData.get('material'),
    rawMaterialDimensions: formData.get('rawMaterialDimensions'),
    geometryComplexity: formData.get('geometryComplexity'),
    toolCount: formData.get('toolCount'),
    fixtureType: formData.get('fixtureType'),
    historicalData: formData.get('historicalData'),
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      message: 'Dados do formulário inválidos. Corrija os erros e tente novamente.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await getMachiningTimePrediction(validatedFields.data);
    return {
      status: 'success',
      message: 'Previsão gerada com sucesso.',
      data: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 'error',
      message: 'Ocorreu um erro inesperado ao gerar a previsão. Tente novamente mais tarde.',
    };
  }
}
