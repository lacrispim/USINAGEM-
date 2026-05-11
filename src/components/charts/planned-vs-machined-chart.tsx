
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
  data: any[];
  loading: boolean;
}

const CATEGORIES = [
    { key: 'PRODUCAO', label: 'Usinagem', color: '#ffffff' },
    { key: 'SETUP', label: 'Setup', color: '#ef4444' },
    { key: 'DDS', label: 'DDS/ADM', color: '#f97316' },
    { key: 'CAFE', label: 'Parada para Café', color: '#eab308' },
    { key: 'LIMPEZA', label: 'Limpeza Planejada', color: '#22c55e' },
    { key: 'QUALIDADE', label: 'Qualidade/Inspeção', color: '#3b82f6' },
    { key: 'MANUTENCAO', label: 'Manutenção', color: '#7c3aed' },
    { key: 'OUTROS', label: 'Outras Perdas', color: '#6b7280' },
];

const chartConfig = CATEGORIES.reduce((acc, cat) => {
    acc[`plan_${cat.key}`] = { label: `${cat.label} (Plan)`, color: cat.color };
    acc[`real_${cat.key}`] = { label: `${cat.label} (Real)`, color: cat.color };
    return acc;
}, {} as any);

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
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[16rem]">
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
                    {CATEGORIES.map(cat => {
                        const val = p[`plan_${cat.key}`] || 0;
                        if (val <= 0) return null;
                        return (
                            <div key={`plan-${cat.key}`} className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <div className="flex justify-between flex-1">
                                    <span className="text-muted-foreground text-[10px]">{cat.label}</span>
                                    <span className="font-bold text-[10px]">{val.toFixed(1)}h</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Realizado (Total)</span>
                    <span className="font-bold">{machinedTotal.toFixed(1)}h</span>
                </div>
                <div className="pl-3 flex flex-col gap-0.5">
                    {CATEGORIES.map(cat => {
                        const val = p[`real_${cat.key}`] || 0;
                        if (val <= 0) return null;
                        return (
                            <div key={`real-${cat.key}`} className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <div className="flex justify-between flex-1">
                                    <span className="text-muted-foreground text-[10px]">{cat.label}</span>
                                    <span className="font-bold text-[10px]">{val.toFixed(1)}h</span>
                                </div>
                            </div>
                        );
                    })}
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
      <div className="flex items-center justify-center gap-x-4 gap-y-2 mt-4 flex-wrap max-w-5xl mx-auto border-t pt-4">
        {CATEGORIES.map(cat => (
           <div key={cat.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: cat.color}} />
            <span className="text-[10px] font-bold uppercase text-muted-foreground">{cat.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-4 border-l pl-4 ml-2">
            <span className="text-[9px] font-black uppercase text-foreground">Barra Esq: Plan | Barra Dir: Real</span>
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
                Comparativo visual detalhado com detalhamento completo de categorias e perdas.
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
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Realizado</p>
                    <p className="text-2xl font-bold mt-2 text-muted-foreground">{totals.totalPlanejado.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Planejado</p>
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
          <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig}>
                <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 120 }} barGap={4}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={35}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={120}
                    className="text-[10px] font-bold uppercase"
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
                  
                  {/* BARRA PLANEJADO (ESQUERDA) */}
                  {CATEGORIES.map((cat, idx) => (
                    <Bar 
                        key={`plan-${cat.key}`} 
                        dataKey={`plan_${cat.key}`} 
                        stackId="planejado" 
                        fill={cat.color}
                        radius={idx === CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    >
                        {idx === 0 && (
                            <LabelList 
                                dataKey={() => "Plan"} 
                                position="bottom" 
                                offset={10} 
                                className="fill-muted-foreground text-[8px] uppercase font-bold" 
                            />
                        )}
                        {idx === CATEGORIES.length - 1 && (
                            <LabelList
                                dataKey="totalPlanejado"
                                position="top"
                                offset={4}
                                className="fill-foreground text-xs font-bold"
                                formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                            />
                        )}
                    </Bar>
                  ))}

                  {/* BARRA REALIZADO (DIREITA) */}
                   {CATEGORIES.map((cat, idx) => (
                    <Bar 
                        key={`real-${cat.key}`} 
                        dataKey={`real_${cat.key}`} 
                        stackId="usinado" 
                        fill={cat.color}
                        opacity={0.8}
                        radius={idx === CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    >
                        {idx === 0 && (
                            <LabelList 
                                dataKey={() => "Real"} 
                                position="bottom" 
                                offset={10} 
                                className="fill-muted-foreground text-[8px] uppercase font-bold" 
                            />
                        )}
                         {idx === CATEGORIES.length - 1 && (
                            <LabelList
                                dataKey="totalRealizado"
                                position="top"
                                offset={4}
                                className="fill-foreground text-xs font-bold"
                                formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                            />
                        )}
                    </Bar>
                  ))}
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
