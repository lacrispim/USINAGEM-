import { RecommendationForm } from '@/components/ai/recommendation-form';

export default function AiRecommendationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          IA de Manutenção Preditiva
        </h1>
        <p className="text-muted-foreground">
          Receba recomendações inteligentes para otimizar o desempenho da ferramenta e prevenir falhas.
        </p>
      </div>
      <RecommendationForm />
    </div>
  );
}
