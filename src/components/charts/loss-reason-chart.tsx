'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
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

interface LossReasonChartProps {
  data: { name: string; value: number }[];
  loading: boolean;
}

export function LossReasonChart({ data, loading }: LossReasonChartProps) {

  const chartData = data.map(item => ({
    name: item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase(),
    Horas: item.value / 60
  })).sort((a, b) => a.Horas - b.Horas); // Sort ascending for horizontal layout

  const chartConfig = {
    Horas: {
      label: 'Horas',
      color: 'hsl(var(--chart-2))',
    },
  };

  const maxHours = Math.max(...chartData.map(d => d.Horas), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo Perdido por Motivo</CardTitle>
        <CardDescription>
          Principais motivos de perda, ordenados do menor para o maior tempo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={chartConfig}>
                <BarChart data={chartData} layout="vertical" barSize={30} margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={5}
                      width={120}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <XAxis
                      type='number'
                      domain={[0, Math.ceil(maxHours) + 1]}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      unit="h"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <ChartTooltip
                        cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                        content={<ChartTooltipContent 
                            formatter={(value, name) => [`${(value as number).toFixed(2)}h`, name]}
                            indicator="dot"
                        />}
                    />
                    <Bar dataKey="Horas" fill="var(--color-Horas)" radius={4} />
                </BarChart>
                </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de perda para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
