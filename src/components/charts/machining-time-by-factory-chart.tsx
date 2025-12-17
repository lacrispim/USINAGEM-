'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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

interface MachiningTimeByFactoryChartProps {
  data: { factory?: string; machiningTime?: number }[];
  loading: boolean;
}

export function MachiningTimeByFactoryChart({
  data,
  loading,
}: MachiningTimeByFactoryChartProps) {
  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }

    const factoryData = data.reduce(
      (acc, record) => {
        if (record.factory) {
          const factory = record.factory;
          const timeInMinutes = record.machiningTime || 0;
          if (!acc[factory]) {
            acc[factory] = 0;
          }
          acc[factory] += timeInMinutes;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(factoryData).map(([name, timeInMinutes]) => ({
      name,
      hours: timeInMinutes / 60,
    }));
  }, [data]);

  const chartConfig = {
    hours: {
      label: 'Horas de Usinagem',
      color: 'hsl(var(--chart-1))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas de Usinagem por Fábrica</CardTitle>
        <CardDescription>
          Total de horas de usinagem para cada fábrica.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ChartContainer config={chartConfig}>
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  dataKey="hours"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  unit="h"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent 
                    formatter={(value) => `${(value as number).toFixed(2)}h`}
                    indicator="dot"
                  />}
                />
                <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[300px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de produção para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
