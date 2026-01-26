'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
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

interface HoursBySiteChartProps {
  data: any[];
  loading: boolean;
}

export function HoursBySiteChart({
  data,
  loading,
}: HoursBySiteChartProps) {
  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }

    const siteData = data.reduce(
      (acc, record) => {
        const site = record['Site'];
        const hours = Number(record['Horas Máquina']) || 0;
        if (site && hours > 0) {
          if (!acc[site]) {
            acc[site] = 0;
          }
          acc[site] += hours;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(siteData).map(([name, hours]) => ({
      name,
      hours,
    })).sort((a, b) => b.hours - a.hours);
  }, [data]);

  const chartConfig = {
    hours: {
      label: 'Horas Máquina',
      color: 'hsl(var(--chart-1))',
    },
  };
  
  const maxHours = Math.max(...chartData.map(d => d.hours), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas Planejadas de Máquina por Fábrica</CardTitle>
        <CardDescription>
          Total de horas de máquina planejadas para cada fábrica.
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
                <BarChart data={chartData} barSize={40} margin={{ top: 20, bottom: 40 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={5}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      domain={[0, Math.ceil(maxHours / 10) * 10 + 10]}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      unit="h"
                    />
                    <ChartTooltip
                        cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                        content={<ChartTooltipContent 
                            formatter={(value) => `${(value as number).toFixed(2)}h`}
                            indicator="dot"
                        />}
                    />
                    <Bar dataKey="hours" fill="var(--color-hours)" radius={4}>
                      <LabelList
                        dataKey="hours"
                        position="top"
                        offset={8}
                        className="fill-foreground text-sm"
                        formatter={(value: number) => `${value.toFixed(1)}h`}
                      />
                    </Bar>
                </BarChart>
                </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de planejamento para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
