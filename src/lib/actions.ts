'use server';

import { getMachiningTimePrediction, MachiningTimePredictionOutput } from '@/ai/flows/predict-machining-time-flow';
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];


const formSchema = z.object({
  machine: z.string().min(1, 'A seleção da máquina é obrigatória.'),
  material: z.string().min(1, 'O tipo de material é obrigatório.'),
  rawMaterialDimensions: z.string().min(1, 'As dimensões do bruto são obrigatórias.'),
  geometryComplexity: z.enum(['Baixa', 'Média', 'Alta']),
  toolCount: z.coerce.number().optional(),
  fixtureType: z.string().optional(),
  historicalData: z.string().min(1, 'Os dados históricos são obrigatórios.'),
  partDrawing: z
    .any()
    .refine((file) => file?.size, 'O desenho da peça é obrigatório.')
    .refine((file) => file?.size <= MAX_FILE_SIZE, `O tamanho máximo da imagem é 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
      ".jpg, .jpeg, .png e .webp são os únicos formatos suportados."
    )
    .optional(),
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
    partDrawing?: string[];
  };
};

// Function to convert file to data URI
async function fileToDataUri(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:${file.type};base64,${base64}`;
}


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
    partDrawing: formData.get('partDrawing'),
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      message: 'Dados do formulário inválidos. Corrija os erros e tente novamente.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const { partDrawing, ...otherData } = validatedFields.data;
    
    let partDrawingDataUri;
    if (partDrawing && partDrawing.size > 0) {
        partDrawingDataUri = await fileToDataUri(partDrawing);
    }

    const result = await getMachiningTimePrediction({
        ...otherData,
        partDrawing: partDrawingDataUri,
    });
    
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
