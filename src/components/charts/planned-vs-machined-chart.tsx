'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, LabelList } from 'recharts';
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

interface PlannedVsMachinedChartProps {
  data: { 
    name: string; 
    planejado: number; 
    usinado: number;
    usinagem: number;
    setup: number;
    dds: number;
  }[];
  loading: boolean;
}

const chartConfig = {
  planejado: {
    label: 'Planejado',
    color: 'hsl(var(--chart-2))',
  },
  usinado: {
    label: 'Usinado',
    color: 'hsl(var(--chart-1))',
  },
  usinagem: {
    label: 'Usinagem',
    color: 'hsl(var(--chart-1))',
  },
  setup: {
    label: 'Setup',
    color: 'hsl(36 94% 57%)',
  },
  dds: {
    label: 'DDS/DDSHE',
    color: 'hsl(48 96% 51%)',
  },
};

export function PlannedVsMachinedChart({
  data,
  loading,
}: PlannedVsMachinedChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const planned = payload.find((p: any) => p.dataKey === 'planejado')?.value || 0;
      const usinagem = payload.find((p: any) => p.dataKey === 'usinagem')?.value || 0;
      const setup = payload.find((p: any) => p.dataKey === 'setup')?.value || 0;
      const dds = payload.find((p: any) => p.dataKey === 'dds')?.value || 0;

      const machinedTotal = usinagem + setup + dds;
      const difference = machinedTotal - planned;
      const performance = planned > 0 ? (machinedTotal / planned) * 100 : 0;

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[15rem]">
          <div className="grid gap-1.5">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-lg">{label}</p>
              <p className={`font-semibold text-lg ${performance >= 100 ? 'text-green-500' : 'text-red-500'}`}>
                {performance.toFixed(0)}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: chartConfig.planejado.color }} />
              <div className="flex justify-between flex-1">
                <span className="text-muted-foreground">Planejado</span>
                <span className="font-bold">{planned.toFixed(1)}h</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-[2px] bg-transparent" />
                <div className="flex justify-between flex-1">
                    <span className="text-muted-foreground">Usinado (Total)</span>
                    <span className="font-bold">{machinedTotal.toFixed(1)}h</span>
                </div>
            </div>

            <div className="pl-5 flex flex-col gap-1">
                 {usinagem > 0 && <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: chartConfig.usinagem.color }} />
                    <div className="flex justify-between flex-1">
                        <span className="text-muted-foreground text-xs">Usinagem</span>
                        <span className="font-bold text-xs">{usinagem.toFixed(1)}h</span>
                    </div>
                </div>}
                {setup > 0 && <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: chartConfig.setup.color }} />
                    <div className="flex justify-between flex-1">
                        <span className="text-muted-foreground text-xs">Setup</span>
                        <span className="font-bold text-xs">{setup.toFixed(1)}h</span>
                    </div>
                </div>}
                {dds > 0 && <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: chartConfig.dds.color }} />
                    <div className="flex justify-between flex-1">
                        <span className="text-muted-foreground text-xs">DDS/DDSHE</span>
                        <span className="font-bold text-xs">{dds.toFixed(1)}h</span>
                    </div>
                </div>}
            </div>
            
            <div className="h-px w-full my-1 bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-[2px]" />
              <div className="flex justify-between flex-1">
                <span className="text-muted-foreground">Diferença</span>
                <span className={`font-bold ${difference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {difference.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas Planejadas vs. Usinadas por Fábrica</CardTitle>
        <CardDescription>
          Comparativo entre horas planejadas e as horas efetivamente utilizadas (usinagem + perdas programadas).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[450px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : data && data.length > 0 ? (
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig}>
                <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }} barGap={4}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={80}
                  />
                  <YAxis
                    unit="h"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
                    content={<CustomTooltip />}
                  />
                  <Legend />
                  <Bar dataKey="planejado" fill={chartConfig.planejado.color} radius={[4, 4, 0, 0]}>
                     <LabelList
                        dataKey="planejado"
                        position="top"
                        offset={4}
                        className="fill-foreground text-xs"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                      />
                  </Bar>
                  <Bar dataKey="usinagem" stackId="usinado" fill={chartConfig.usinagem.color} />
                  <Bar dataKey="setup" stackId="usinado" fill={chartConfig.setup.color} />
                  <Bar dataKey="dds" stackId="usinado" fill={chartConfig.dds.color} radius={[4, 4, 0, 0]}>
                    <LabelList
                        dataKey="usinado"
                        position="top"
                        offset={4}
                        className="fill-foreground text-xs"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                      />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[450px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado para exibir o comparativo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
