'use client';

import { useActionState, useEffect } from 'react';
import { getRecommendationsAction, type RecommendationState } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BrainCircuit, Lightbulb, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState: RecommendationState = {
  status: 'idle',
  message: '',
};

function SubmitButton() {
    // This hook is not available in the current react-dom version
    // const { pending } = useFormStatus();
    const pending = false;

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Gerando...
        </>
      ) : (
        <>
          <BrainCircuit className="mr-2 h-4 w-4" />
          Obter Recomendações
        </>
      )}
    </Button>
  );
}


export function RecommendationForm() {
  const [state, formAction] = useActionState(getRecommendationsAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inserir Dados de Usinagem</CardTitle>
          <CardDescription>
            Forneça os dados a seguir para receber conselhos de manutenção preditiva.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="toolWear">Desgaste da Ferramenta (mm)</Label>
                    <Input id="toolWear" name="toolWear" type="number" step="0.01" defaultValue="0.08" />
                    {state.errors?.toolWear && <p className="text-sm font-medium text-destructive">{state.errors.toolWear[0]}</p>}
                </div>
                <div>
                    <Label htmlFor="machiningTime">Tempo de Usinagem (horas)</Label>
                    <Input id="machiningTime" name="machiningTime" type="number" defaultValue="50" />
                    {state.errors?.machiningTime && <p className="text-sm font-medium text-destructive">{state.errors.machiningTime[0]}</p>}
                </div>
            </div>
             <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="cuttingSpeed">Velocidade de Corte (m/min)</Label>
                    <Input id="cuttingSpeed" name="cuttingSpeed" type="number" step="1" defaultValue="200" />
                    {state.errors?.cuttingSpeed && <p className="text-sm font-medium text-destructive">{state.errors.cuttingSpeed[0]}</p>}
                </div>
                <div>
                    <Label htmlFor="feedRate">Taxa de Avanço (mm/rev)</Label>
                    <Input id="feedRate" name="feedRate" type="number" step="0.01" defaultValue="0.15" />
                    {state.errors?.feedRate && <p className="text-sm font-medium text-destructive">{state.errors.feedRate[0]}</p>}
                </div>
                 <div>
                    <Label htmlFor="depthOfCut">Profundidade de Corte (mm)</Label>
                    <Input id="depthOfCut" name="depthOfCut" type="number" step="0.1" defaultValue="2" />
                    {state.errors?.depthOfCut && <p className="text-sm font-medium text-destructive">{state.errors.depthOfCut[0]}</p>}
                </div>
            </div>
            <div>
              <Label htmlFor="materialType">Tipo de Material</Label>
              <Input id="materialType" name="materialType" defaultValue="Aço" />
              {state.errors?.materialType && <p className="text-sm font-medium text-destructive">{state.errors.materialType[0]}</p>}
            </div>
            <div>
              <Label htmlFor="historicalData">Dados Históricos</Label>
              <Textarea
                id="historicalData"
                name="historicalData"
                placeholder="Ex: Falhas anteriores da ferramenta ocorreram com 0.15mm de desgaste..."
                defaultValue="A taxa de desgaste normal para esta ferramenta é de 0,001 mm/hora. Nenhuma falha nas últimas 100 horas. As vibrações estão estáveis."
              />
              {state.errors?.historicalData && <p className="text-sm font-medium text-destructive">{state.errors.historicalData[0]}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
      
      <div className="flex items-center justify-center">
        {state.status === 'success' && state.data ? (
          <Card className="w-full animate-in fade-in-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsUp className="text-primary" />
                Recomendação de Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Recomendação</Label>
                <p className="font-semibold text-lg">{state.data.recommendations}</p>
              </div>
               <div>
                <Label>Nível de Confiança</Label>
                <div className="flex items-center gap-2">
                    <Progress value={state.data.confidenceLevel * 100} className="w-[60%]" />
                    <span className="text-sm font-medium text-muted-foreground">
                        {(state.data.confidenceLevel * 100).toFixed(0)}%
                    </span>
                </div>
              </div>
               <div>
                <Label>Justificativa</Label>
                <p className="text-sm text-muted-foreground">{state.data.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-muted-foreground">
             <Lightbulb className="mx-auto h-12 w-12" />
             <p className="mt-4">Suas recomendações de IA aparecerão aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
