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
    paradaCafePlanejada: number;
    limpezaPlanejada: number;
    apontamentoPlanejado: number;
    inspecaoPlanejada: number;
    setupPlanejado: number;
    totalPlanejado: number;
    usinado: number;
    usinagem: number;
    setup: number;
    dds: number;
    outrasPerdas: number;
    totalRealizado: number;
  }[];
  loading: boolean;
}

const chartConfig = {
  usinagemPlanejada: {
    label: 'Usinagem Planejada',
    color: 'hsl(0 0% 35%)',
  },
  paradaCafePlanejada: {
    label: 'Café Planejado',
    color: '#eab308',
  },
  limpezaPlanejada: {
    label: 'Limpeza Planejada',
    color: '#22c55e',
  },
  apontamentoPlanejado: {
    label: 'DDS/ADM Planejado',
    color: '#f97316',
  },
  inspecaoPlanejada: {
    label: 'Qualidade Planejada',
    color: '#3b82f6',
  },
  setupPlanejado: {
    label: 'Setup Planejado',
    color: '#ef4444',
  },
  usinagem: {
    label: 'Usinagem Realizada',
    color: 'hsl(var(--chart-1))',
  },
  setup: {
    label: 'Setup Realizado',
    color: 'hsl(36 94% 57%)',
  },
  dds: {
    label: 'DDS/DDSHE Realizado',
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
    const totalPlanejado = data.reduce((acc, curr) => acc + (curr.totalPlanejado || 0), 0);
    const totalRealizado = data.reduce((acc, curr) => acc + (curr.totalRealizado || 0), 0);
    return { totalPlanejado, totalRealizado };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      
      const plannedTotal = p.totalPlanejado || 0;
      const machinedTotal = p.totalRealizado || 0;
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
                    {p.usinagemPlanejada > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.usinagemPlanejada.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Usinagem</span>
                            <span className="font-bold text-xs">{p.usinagemPlanejada.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.paradaCafePlanejada > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.paradaCafePlanejada.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Parada para Café</span>
                            <span className="font-bold text-xs">{p.paradaCafePlanejada.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.limpezaPlanejada > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.limpezaPlanejada.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Limpeza</span>
                            <span className="font-bold text-xs">{p.limpezaPlanejada.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.apontamentoPlanejado > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.apontamentoPlanejado.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">DDS/ADM</span>
                            <span className="font-bold text-xs">{p.apontamentoPlanejado.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.inspecaoPlanejada > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.inspecaoPlanejada.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Inspecao/Qualidade</span>
                            <span className="font-bold text-xs">{p.inspecaoPlanejada.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.setupPlanejado > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.setupPlanejado.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Setup</span>
                            <span className="font-bold text-xs">{p.setupPlanejado.toFixed(1)}h</span>
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
                    {p.usinagem > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.usinagem.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Usinagem</span>
                            <span className="font-bold text-xs">{p.usinagem.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.setup > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.setup.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Setup</span>
                            <span className="font-bold text-xs">{p.setup.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.dds > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.dds.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">DDS/DDSHE</span>
                            <span className="font-bold text-xs">{p.dds.toFixed(1)}h</span>
                        </div>
                    </div>}
                    {p.outrasPerdas > 0 && <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig.outrasPerdas.color }} />
                        <div className="flex justify-between flex-1">
                            <span className="text-muted-foreground text-xs">Outras Perdas</span>
                            <span className="font-bold text-xs">{p.outrasPerdas.toFixed(1)}h</span>
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
      <div className="flex items-center justify-center gap-4 mt-4 flex-wrap max-w-5xl mx-auto">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: chartConfig.usinagemPlanejada.color}} />
          <span className="text-[10px] text-muted-foreground">Usinagem</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: chartConfig.paradaCafePlanejada.color}} />
          <span className="text-[10px] text-muted-foreground">Café</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: chartConfig.limpezaPlanejada.color}} />
          <span className="text-[10px] text-muted-foreground">Limpeza</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: chartConfig.apontamentoPlanejado.color}} />
          <span className="text-[10px] text-muted-foreground">DDS/ADM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: chartConfig.inspecaoPlanejada.color}} />
          <span className="text-[10px] text-muted-foreground">Inspecao/Qualidade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: chartConfig.setupPlanejado.color}} />
          <span className="text-[10px] text-muted-foreground">Setup</span>
        </div>
        <div className="flex items-center gap-1.5 border-l pl-3">
          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: chartConfig.usinagem.color}} />
          <span className="text-[10px] text-muted-foreground">Realizado</span>
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
                Comparativo visual detalhado entre o plano de produção e a execução real.
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
                  
                  <Bar dataKey="usinagemPlanejada" stackId="planejado" fill={chartConfig.usinagemPlanejada.color}>
                    <LabelList
                      dataKey="usinagemPlanejada"
                      position="center"
                      content={(props: any) => {
                        const { x, y, width, height } = props;
                        if (height < 60) return null;
                        return (
                          <text
                            x={x + width / 2}
                            y={y + height / 2}
                            fill="#fff"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(-90, ${x + width / 2}, ${y + height / 2})`}
                            className="text-[10px] font-bold uppercase pointer-events-none"
                          >
                            planejado
                          </text>
                        );
                      }}
                    />
                  </Bar>
                  <Bar dataKey="paradaCafePlanejada" stackId="planejado" fill={chartConfig.paradaCafePlanejada.color} />
                  <Bar dataKey="limpezaPlanejada" stackId="planejado" fill={chartConfig.limpezaPlanejada.color} />
                  <Bar dataKey="apontamentoPlanejado" stackId="planejado" fill={chartConfig.apontamentoPlanejado.color} />
                  <Bar dataKey="inspecaoPlanejada" stackId="planejado" fill={chartConfig.inspecaoPlanejada.color} />
                  <Bar dataKey="setupPlanejado" stackId="planejado" fill={chartConfig.setupPlanejado.color} radius={[4, 4, 0, 0]}>
                     <LabelList
                        dataKey="totalPlanejado"
                        position="top"
                        offset={4}
                        className="fill-foreground text-xs"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                      />
                  </Bar>

                  <Bar dataKey="usinagem" stackId="usinado" fill={chartConfig.usinagem.color}>
                    <LabelList
                        dataKey="usinagem"
                        position="center"
                        content={(props: any) => {
                          const { x, y, width, height } = props;
                          if (height < 60) return null;
                          return (
                            <text
                              x={x + width / 2}
                              y={y + height / 2}
                              fill="#fff"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(-90, ${x + width / 2}, ${y + height / 2})`}
                              className="text-[10px] font-bold uppercase pointer-events-none"
                            >
                              realizado
                            </text>
                          );
                        }}
                      />
                  </Bar>
                  <Bar dataKey="setup" stackId="usinado" fill={chartConfig.setup.color} />
                  <Bar dataKey="dds" stackId="usinado" fill={chartConfig.dds.color} />
                  <Bar dataKey="outrasPerdas" stackId="usinado" fill={chartConfig.outrasPerdas.color} radius={[4, 4, 0, 0]}>
                    <LabelList
                        dataKey="totalRealizado"
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
