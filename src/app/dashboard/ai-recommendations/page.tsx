import { RecommendationForm } from '@/components/ai/recommendation-form';

export default function AiRecommendationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Predictive Maintenance AI
        </h1>
        <p className="text-muted-foreground">
          Get smart recommendations to optimize tool performance and prevent failures.
        </p>
      </div>
      <RecommendationForm />
    </div>
  );
}
