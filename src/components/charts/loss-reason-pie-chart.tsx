'use client';

import { Pie, PieChart, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface LossReasonPieChartProps {
  data: { name: string; value: number }[];
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function LossReasonPieChart({ data, loading }: LossReasonPieChartProps) {
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return acc;
  }, {} as any);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo Perdido por Motivo</CardTitle>
        <CardDescription>
          Distribuição do tempo total perdido (em minutos) por cada motivo de perda.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {loading ? (
          <div className="flex h-[250px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : data && data.length > 0 ? (
          <div className="h-[250px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent 
                    formatter={(value) => `${value} min`}
                    hideLabel 
                   />}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </div>
        ) : (
           <div className="flex h-[250px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum registro de perda para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
