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
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface LossReasonChartProps {
  data: { lossReason?: string; timeLost?: number; factory?: string }[];
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
          const upperCaseReason = reason.toUpperCase();
          if (upperCaseReason.includes('SETUP')) {
            reason = 'SETUP';
          } else if (upperCaseReason === 'DDS' || upperCaseReason === 'DDSHE') {
            reason = 'DDS/DDSHE';
          }
          const timeInMinutes = Number(record.timeLost) || 0;
          if (!acc[reason]) {
            acc[reason] = { totalTime: 0, factories: {} };
          }
          acc[reason].totalTime += timeInMinutes;

          if (reason === 'SETUP' && record.factory && timeInMinutes > 0) {
            if (!acc[reason].factories[record.factory]) {
              acc[reason].factories[record.factory] = 0;
            }
            acc[reason].factories[record.factory] += timeInMinutes;
          }
        }
        return acc;
      },
      {} as Record<string, { totalTime: number; factories: Record<string, number> }>
    );

    return Object.entries(reasonData).map(([name, { totalTime, factories }]) => ({
      name,
      hours: totalTime / 60,
      factories,
    })).sort((a, b) => b.hours - a.hours);
  }, [data]);

  const chartConfig = {
    hours: {
      label: 'Horas Perdidas',
      color: 'hsl(var(--chart-2))',
    },
  };
  
  const maxHours = Math.max(...chartData.map(d => d.hours), 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalHours = payload[0].value as number;

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[12rem]">
          <div className="grid gap-1.5">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{label}</p>
              <p className="font-semibold text-muted-foreground">
                {`${totalHours.toFixed(2)}h`}
              </p>
            </div>
            
            {label === 'SETUP' && data.factories && Object.keys(data.factories).length > 0 ? (
              <>
                <div className="h-px w-full my-1 bg-border" />
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-foreground">Horas por Fábrica:</p>
                  {Object.entries(data.factories)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([factory, time]) => (
                      <div key={factory} className="flex justify-between items-center gap-4">
                        <span className="text-xs text-muted-foreground">{factory}</span>
                        <span className="text-xs font-bold">{((time as number) / 60).toFixed(1)}h</span>
                      </div>
                    ))}
                </div>
              </>
            ) : (
               <div className="flex items-center gap-2 mt-1">
                  <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--color-hours)' }} />
                  <div className="flex justify-between flex-1">
                      <span className="text-muted-foreground text-xs">Horas Perdidas</span>
                      <span className="font-bold text-xs">
                          {totalHours.toFixed(2)}h
                      </span>
                  </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };


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
                        content={<CustomTooltip />}
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
