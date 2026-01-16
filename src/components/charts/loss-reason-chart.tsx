'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
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
  data: { lossReason?: string; timeLost?: number }[];
  loading: boolean;
  selectedReason: string | null;
  onReasonSelect: (reason: string | null) => void;
}

export function LossReasonChart({
  data,
  loading,
  selectedReason,
  onReasonSelect
}: LossReasonChartProps) {
  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }

    const reasonData = data.reduce(
      (acc, record) => {
        if (record.lossReason) {
          let reason = record.lossReason;
          if (reason.toUpperCase().includes('SETUP')) {
            reason = 'SETUP';
          }
          const timeInMinutes = Number(record.timeLost) || 0;
          if (!acc[reason]) {
            acc[reason] = 0;
          }
          acc[reason] += timeInMinutes;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(reasonData).map(([name, timeInMinutes]) => ({
      name,
      hours: timeInMinutes / 60,
    })).sort((a, b) => b.hours - a.hours);
  }, [data]);

  const chartConfig = {
    hours: {
      label: 'Horas Perdidas',
      color: 'hsl(var(--chart-2))',
    },
  };
  
  const maxHours = Math.max(...chartData.map(d => d.hours), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas Perdidas por Motivo</CardTitle>
        <CardDescription>
          Total de horas perdidas para cada motivo de parada. Clique em uma barra para filtrar.
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
                <BarChart 
                    data={chartData} 
                    barSize={40} 
                    margin={{ top: 20, right: 20, bottom: 40 }}
                    onClick={(e) => onReasonSelect(e?.activeLabel || null)}
                >
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
                    <Bar dataKey="hours" radius={4}>
                      <LabelList
                        dataKey="hours"
                        position="top"
                        offset={8}
                        className="fill-foreground text-sm"
                        formatter={(value: number) => `${value.toFixed(1)}h`}
                      />
                      {chartData.map((entry, index) => (
                          <Cell 
                              key={`cell-${index}`} 
                              cursor="pointer" 
                              fill={'var(--color-hours)'} 
                              opacity={selectedReason ? (selectedReason === entry.name ? 1 : 0.3) : 1}
                          />
                      ))}
                    </Bar>
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
