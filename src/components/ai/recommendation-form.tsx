'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { getMachiningTimePredictionAction, type PredictionState } from '@/lib/actions';
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
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Lightbulb, Timer, UploadCloud, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Image from 'next/image';

const initialState: PredictionState = {
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
          Prevendo...
        </>
      ) : (
        <>
          <BrainCircuit className="mr-2 h-4 w-4" />
          Prever Tempo de Usinagem
        </>
      )}
    </Button>
  );
}


export function RecommendationForm() {
  const [state, formAction] = useActionState(getMachiningTimePredictionAction, initialState);
  const { toast } = useToast();
  const [selectedMachine, setSelectedMachine] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

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
          <CardTitle>Inserir Dados da Peça</CardTitle>
          <CardDescription>
            Forneça os dados a seguir para que a IA possa estimar o tempo de usinagem.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
             <div>
                <Label htmlFor="machine">Máquina</Label>
                <Select name="machine" onValueChange={setSelectedMachine}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a máquina" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TORNO CNC CENTUR 30">TORNO CNC CENTUR 30</SelectItem>
                        <SelectItem value="CENTRO DE USINAGEM D600">CENTRO DE USINAGEM D600</SelectItem>
                    </SelectContent>
                </Select>
                {state.errors?.machine && <p className="text-sm font-medium text-destructive">{state.errors.machine[0]}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="material">Material da Peça</Label>
                    <Input id="material" name="material" placeholder="Ex: Aço 1045" defaultValue="Aço 1045" />
                    {state.errors?.material && <p className="text-sm font-medium text-destructive">{state.errors.material[0]}</p>}
                </div>
                <div>
                    <Label htmlFor="rawMaterialDimensions">Dimensões do Bruto</Label>
                    <Input id="rawMaterialDimensions" name="rawMaterialDimensions" placeholder="Ex: D:100mm L:200mm" defaultValue="D:100mm L:200mm"/>
                    {state.errors?.rawMaterialDimensions && <p className="text-sm font-medium text-destructive">{state.errors.rawMaterialDimensions[0]}</p>}
                </div>
            </div>
            
            <div>
                <Label htmlFor="geometryComplexity">Complexidade da Geometria</Label>
                <Select name="geometryComplexity" defaultValue="Média">
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a complexidade" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                </Select>
                {state.errors?.geometryComplexity && <p className="text-sm font-medium text-destructive">{state.errors.geometryComplexity[0]}</p>}
            </div>

            {selectedMachine === 'CENTRO DE USINAGEM D600' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="toolCount">Número de Ferramentas</Label>
                        <Input id="toolCount" name="toolCount" type="number" defaultValue="5" />
                        {state.errors?.toolCount && <p className="text-sm font-medium text-destructive">{state.errors.toolCount[0]}</p>}
                    </div>
                    <div>
                        <Label htmlFor="fixtureType">Tipo de Fixação</Label>
                        <Input id="fixtureType" name="fixtureType" placeholder="Ex: Morsa" defaultValue="Morsa" />
                         {state.errors?.fixtureType && <p className="text-sm font-medium text-destructive">{state.errors.fixtureType[0]}</p>}
                    </div>
                </div>
            )}
            
            <div>
                <Label htmlFor="partDrawing">Desenho da Peça</Label>
                <div className="mt-1 flex justify-center rounded-lg border border-dashed border-input px-6 py-10">
                    <div className="text-center">
                    {previewUrl ? (
                        <div className='relative'>
                            <Image src={previewUrl} alt="Preview do desenho" width={200} height={200} className="mx-auto h-24 w-auto rounded-md object-contain" />
                            <Button type="button" variant="ghost" size="icon" className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground" onClick={handleRemoveImage}>
                                <X className='h-4 w-4'/>
                            </Button>
                        </div>
                    ) : (
                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                    )}
                    <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                        <Label
                        htmlFor="partDrawing"
                        className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/90"
                        >
                        <span>Carregar um arquivo</span>
                        <Input id="partDrawing" name="partDrawing" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} ref={fileInputRef}/>
                        </Label>
                        <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">PNG, JPG, GIF até 5MB</p>
                    </div>
                </div>
                {state.errors?.partDrawing && <p className="text-sm font-medium text-destructive">{state.errors.partDrawing[0]}</p>}
            </div>

            <div>
              <Label htmlFor="historicalData">Dados Históricos de Peças Similares</Label>
              <Textarea
                id="historicalData"
                name="historicalData"
                placeholder="Ex: Peças de alumínio com geometria similar levaram em média 45 minutos..."
                defaultValue="Nenhuma peça similar usinada anteriormente."
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
                <Timer className="text-primary" />
                Previsão de Tempo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tempo de Usinagem Estimado</Label>
                <p className="font-semibold text-3xl">{state.data.predictedTime} minutos</p>
              </div>
               <div>
                <Label>Justificativa da IA</Label>
                <p className="text-sm text-muted-foreground">{state.data.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-muted-foreground">
             <Lightbulb className="mx-auto h-12 w-12" />
             <p className="mt-4">A previsão do tempo de usinagem aparecerá aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
