import { RecommendationForm } from '@/components/ai/recommendation-form';

export default function AiRecommendationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Previsão de Tempo de Usinagem
        </h1>
        <p className="text-muted-foreground">
          Utilize IA para estimar o tempo de fabricação de uma peça com base em suas características.
        </p>
      </div>
      <RecommendationForm />
    </div>
  );
}
