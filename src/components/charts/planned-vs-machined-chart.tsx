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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PlannedVsMachinedChartProps {
  data: { 
    name: string; 
    usinagemPlanejada: number;
    perdaPlanejada: number;
    usinado: number;
    usinagem: number;
    setup: number;
    dds: number;
    outrasPerdas: number;
  }[];
  loading: boolean;
}

const chartConfig = {
  usinagemPlanejada: {
    label: 'Usinagem Planejada',
    color: 'hsl(0 0% 35%)',
  },
  perdaPlanejada: {
    label: 'Setup Planejado',
    color: '#633919',
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
    color: 'hsl(90 80% 45%)',
  },
  outrasPerdas: {
    label: 'Outras Perdas',
    color: 'hsl(221 83% 53%)',
  },
};

export function PlannedVsMachinedChart({
  data,
  loading,
}: PlannedVsMachinedChartProps) {

  const totals = useMemo(() => {
    const totalPlanejado = data.reduce((acc, curr) => acc + (curr.usinagemPlanejada || 0) + (curr.perdaPlanejada || 0), 0);
    const totalRealizado = data.reduce((acc, curr) => acc + (curr.usinado || 0), 0);
    return { totalPlanejado, totalRealizado };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const usinagemPlanejada = payload.find((p: any) => p.dataKey === 'usinagemPlanejada')?.value || 0;
      const perdaPlanejada = payload.find((p: any) => p.dataKey === 'perdaPlanejada')?.value || 0;
      const usinagem = payload.find((p: any) => p.dataKey === 'usinagem')?.value || 0;
      const setup = payload.find((p: any) => p.dataKey === 'setup')?.value || 0;
      const dds = payload.find((p: any) => p.dataKey === 'dds')?.value || 0;
      const outrasPerdas = payload.find((p: any) => p.dataKey === 'outrasPerdas')?.value || 0;

      const plannedTotal = usinagemPlanejada + perdaPlanejada;
      const machinedTotal = usinagem + setup + dds + outrasPerdas;
      const difference = machinedTotal - plannedTotal;

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[15rem]">
          <div className="grid gap-1.5">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-lg">{label}</p>
            </div>
            
            <div className="flex flex-col gap-1 border-b pb-2 mb-1">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Planejado (Total)</span>
                    <span className="font-bold">{plannedTotal.toFixed(1)}h</span>
                </div>
                <div className="pl-3 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.usinagemPlanejada.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Usinagem Planejada</span>
                            <span className="font-bold text-xs">{usinagemPlanejada.toFixed(1)}h</span>
                        </div>
                    </div>
                    {perdaPlanejada > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.perdaPlanejada.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Setup Planejado</span>
                            <span className="font-bold text-xs">{perdaPlanejada.toFixed(1)}h</span>
                        </div>
                    </div>}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Realizado (Total)</span>
                    <span className="font-bold">{machinedTotal.toFixed(1)}h</span>
                </div>
                <div className="pl-3 flex flex-col gap-0.5">
                    {usinagem > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.usinagem.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Usinagem Realizada</span>
                            <span className="font-bold text-xs">{usinagem.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {setup > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.setup.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Setup Realizado</span>
                            <span className="font-bold text-xs">{setup.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {dds > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.dds.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">DDS/DDSHE</span>
                            <span className="font-bold text-xs">{dds.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {outrasPerdas > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.outrasPerdas.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Outras Perdas</span>
                            <span className="font-bold text-xs">{outrasPerdas.toFixed(1)}h</span>
                        </div>
                    </div>}
                </div>
            </div>
            
            <div className="h-px w-full my-1 bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex justify-between flex-1">
                <span className="text-muted-foreground font-medium">Diferença</span>
                <span className={cn("font-bold", difference >= 0 ? "text-sky-400" : "text-red-400")}>
                  {difference > 0 ? '+' : ''}{difference.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  const CustomLegend = () => {
    return (
      <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{backgroundColor: chartConfig.usinagemPlanejada.color}} />
          <span className="text-sm text-muted-foreground">Usinagem Planejada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{backgroundColor: chartConfig.perdaPlanejada.color}} />
          <span className="text-sm text-muted-foreground">Setup Planejado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{backgroundColor: chartConfig.usinagem.color}} />
          <span className="text-sm text-muted-foreground">Realizado</span>
        </div>
      </div>
    );
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Planejado vs Realizado</CardTitle>
                <CardDescription>
                Comparativo entre horas planejadas (empilhadas) e as horas efetivamente realizadas.
                </CardDescription>
            </div>
             {loading ? (
                <div className="text-right">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-20 mt-1" />
                </div>
            ) : (
                <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">{totals.totalRealizado.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Total Realizado</p>
                    <p className="text-2xl font-bold mt-2 text-muted-foreground">{totals.totalPlanejado.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Total Planejado</p>
                </div>
            )}
        </div>
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
                  <Legend content={<CustomLegend />} />
                  
                  {/* Barra da Esquerda: Planejado */}
                  <Bar dataKey="usinagemPlanejada" stackId="planejado" fill={chartConfig.usinagemPlanejada.color} />
                  <Bar dataKey="perdaPlanejada" stackId="planejado" fill={chartConfig.perdaPlanejada.color} radius={[4, 4, 0, 0]}>
                     <LabelList
                        dataKey={(entry: any) => (entry.usinagemPlanejada + entry.perdaPlanejada)}
                        position="top"
                        offset={4}
                        className="fill-foreground text-xs"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                      />
                  </Bar>

                  {/* Barra da Direita: Realizado */}
                  <Bar dataKey="usinagem" stackId="usinado" fill={chartConfig.usinagem.color} />
                  <Bar dataKey="setup" stackId="usinado" fill={chartConfig.setup.color} />
                  <Bar dataKey="dds" stackId="usinado" fill={chartConfig.dds.color} />
                  <Bar dataKey="outrasPerdas" stackId="usinado" fill={chartConfig.outrasPerdas.color} radius={[4, 4, 0, 0]}>
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
