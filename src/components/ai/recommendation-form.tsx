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
          Generating...
        </>
      ) : (
        <>
          <BrainCircuit className="mr-2 h-4 w-4" />
          Get Recommendations
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
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Input Machining Data</CardTitle>
          <CardDescription>
            Provide the following data to receive predictive maintenance advice.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="toolWear">Tool Wear (mm)</Label>
                    <Input id="toolWear" name="toolWear" type="number" step="0.01" defaultValue="0.08" />
                    {state.errors?.toolWear && <p className="text-sm font-medium text-destructive">{state.errors.toolWear[0]}</p>}
                </div>
                <div>
                    <Label htmlFor="machiningTime">Machining Time (hours)</Label>
                    <Input id="machiningTime" name="machiningTime" type="number" defaultValue="50" />
                    {state.errors?.machiningTime && <p className="text-sm font-medium text-destructive">{state.errors.machiningTime[0]}</p>}
                </div>
            </div>
            <div>
              <Label htmlFor="materialType">Material Type</Label>
              <Input id="materialType" name="materialType" defaultValue="Steel" />
              {state.errors?.materialType && <p className="text-sm font-medium text-destructive">{state.errors.materialType[0]}</p>}
            </div>
            <div>
              <Label htmlFor="historicalData">Historical Data</Label>
              <Textarea
                id="historicalData"
                name="historicalData"
                placeholder="e.g., Previous tool failures occurred at 0.15mm wear..."
                defaultValue="Normal wear rate for this tool is 0.001mm/hour. No failures in the last 100 hours. Vibrations are stable."
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
                Maintenance Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Recommendation</Label>
                <p className="font-semibold text-lg">{state.data.recommendations}</p>
              </div>
               <div>
                <Label>Confidence Level</Label>
                <div className="flex items-center gap-2">
                    <Progress value={state.data.confidenceLevel * 100} className="w-[60%]" />
                    <span className="text-sm font-medium text-muted-foreground">
                        {(state.data.confidenceLevel * 100).toFixed(0)}%
                    </span>
                </div>
              </div>
               <div>
                <Label>Reasoning</Label>
                <p className="text-sm text-muted-foreground">{state.data.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-muted-foreground">
             <Lightbulb className="mx-auto h-12 w-12" />
             <p className="mt-4">Your AI recommendations will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
