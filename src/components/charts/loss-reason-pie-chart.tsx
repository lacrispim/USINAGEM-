'use client';

import { Pie, PieChart, Cell, LabelList, Label } from 'recharts';
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
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface LossReasonPieChartProps {
  data: { name: string; value: number }[];
  loading: boolean;
  totalMinutes: number;
}

const CHART_COLORS = [
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))',
];

const formatMinutesToHHMM = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export function LossReasonPieChart({ data, loading, totalMinutes }: LossReasonPieChartProps) {
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
                    formatter={(value, name) => [`${value} min`, name]}
                   />}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={80}
                  outerRadius={110}
                  strokeWidth={5}
                >
                   <Label
                    content={({ viewBox }) => {
                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                                <g>
                                    <text
                                        x={viewBox.cx}
                                        y={viewBox.cy ? viewBox.cy - 10 : 0}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="fill-foreground text-3xl font-bold"
                                    >
                                        {formatMinutesToHHMM(totalMinutes)}
                                    </text>
                                     <text
                                        x={viewBox.cx}
                                        y={viewBox.cy ? viewBox.cy + 15 : 0}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="fill-muted-foreground text-sm"
                                    >
                                        Total Horas
                                    </text>
                                </g>
                            );
                        }
                        return null;
                    }}
                   />
                  <LabelList
                    dataKey="value"
                    position="outside"
                    offset={12}
                    className="fill-black text-sm"
                    formatter={(value: number) => `${value} min`}
                  />
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
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
