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

// Estilos para categorias conhecidas. 
// Motivos dinâmicos que não estiverem aqui usarão uma cor padrão.
const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
    'PRODUCAO': { label: 'Usinagem', color: '#ffffff' },
    'PROGRAMACAO': { label: 'Programação', color: '#a855f7' },
    'SETUP': { label: 'Setup', color: '#ef4444' },
    'TEMPO DE CAFÉ': { label: 'Café', color: '#eab308' },
    'LIMPEZA PLANEJADA': { label: 'Limpeza', color: '#22c55e' },
    'DDS, APONTAMENTO HORAS, ATIVIDADE ADM': { label: 'Ativ. ADM', color: '#f97316' },
    'INSPEÇÃO & VALIDAÇÃO DAS PEÇAS': { label: 'Qualidade', color: '#3b82f6' },
    'MANUTENÇÃO PLANEJADA': { label: 'Manutenção', color: '#7c3aed' },
    'QUEBRA': { label: 'Quebra', color: '#b91c1c' },
    'FALHA DE PROCESSO': { label: 'Falha Proc.', color: '#451a03' },
    'ABSENTEÍSMO': { label: 'Absenteísmo', color: '#4b5563' },
    'FALTA DE MATERIAL & FERRAMENTA': { label: 'Falta Mat/Ferr', color: '#1e3a8a' },
    'MOVIMENTAÇÃO DE PEÇAS E EQUIPAMENTOS': { label: 'Movimentação', color: '#064e3b' },
    'PEQUENAS PARADAS': { label: 'Peq. Paradas', color: '#78350f' },
    'AJUSTES CORRETIVOS DE PROCESSOS': { label: 'Ajustes', color: '#be185d' },
    'VELOCIDADE REDUZIDA (PROBLEMA DE MÁQUINA)': { label: 'Vel. Reduzida', color: '#4c1d95' },
    'RETRABALHO': { label: 'Retrabalho', color: '#111827' },
    'SERVIÇOS DE BANCADA/SERRA': { label: 'Bancada/Serra', color: '#fbbf24' },
};

const DEFAULT_COLOR = '#6b7280'; // Cinza para motivos específicos não mapeados

export function PlannedVsMachinedChart({
  data,
  loading,
}: PlannedVsMachinedChartProps) {

  const totals = useMemo(() => {
    const totalPlanejado = data.reduce((acc, curr) => acc + (curr.totalPlanejado || 0), 0);
    const totalRealizado = data.reduce((acc, curr) => acc + (curr.totalRealizado || 0), 0);
    return { totalPlanejado, totalRealizado };
  }, [data]);

  // Identifica dinamicamente todas as chaves de motivos presentes nos dados
  const dynamicCategories = useMemo(() => {
    const keysSet = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k.startsWith('plan_') || k.startsWith('real_')) {
          const reason = k.replace(/^(plan_|real_)/, '');
          keysSet.add(reason);
        }
      });
    });

    const reasons = Array.from(keysSet);
    
    // Ordenação: Produção primeiro, Programação segundo, depois alfabética
    return reasons.sort((a, b) => {
        if (a === 'PRODUCAO') return -1;
        if (b === 'PRODUCAO') return 1;
        if (a === 'PROGRAMACAO') return -1;
        if (b === 'PROGRAMACAO') return 1;
        return a.localeCompare(b);
    }).map(reason => ({
        key: reason,
        label: CATEGORY_STYLES[reason]?.label || reason,
        color: CATEGORY_STYLES[reason]?.color || DEFAULT_COLOR
    }));
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: any = {};
    dynamicCategories.forEach(cat => {
        config[`plan_${cat.key}`] = { label: `${cat.label} (Plan)`, color: cat.color };
        config[`real_${cat.key}`] = { label: `${cat.label} (Real)`, color: cat.color };
    });
    return config;
  }, [dynamicCategories]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      
      const plannedTotal = p.totalPlanejado || 0;
      const machinedTotal = p.totalRealizado || 0;
      const difference = machinedTotal - plannedTotal;

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[20rem] max-w-[28rem]">
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
                    {dynamicCategories.map(cat => {
                        const val = p[`plan_${cat.key}`] || 0;
                        if (val <= 0) return null;
                        return (
                            <div key={`plan-${cat.key}`} className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <div className="flex justify-between flex-1">
                                    <span className="text-muted-foreground text-[10px] truncate max-w-[180px]">{cat.label}</span>
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
                    {dynamicCategories.map(cat => {
                        const val = p[`real_${cat.key}`] || 0;
                        if (val <= 0) return null;
                        return (
                            <div key={`real-${cat.key}`} className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <div className="flex justify-between flex-1">
                                    <span className="text-muted-foreground text-[10px] truncate max-w-[180px]">{cat.label}</span>
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
        {dynamicCategories.length <= 16 ? (
            dynamicCategories.map(cat => (
                <div key={cat.key} className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: cat.color}} />
                 <span className="text-[10px] font-bold uppercase text-muted-foreground">{cat.label}</span>
               </div>
             ))
        ) : (
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Diversos motivos de parada detalhados no Tooltip</span>
        )}
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
                Comparativo visual detalhado. Cada motivo de parada mantém a mesma cor em ambas as colunas.
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
                  {dynamicCategories.map((cat, idx) => (
                    <Bar 
                        key={`plan-${cat.key}`} 
                        dataKey={`plan_${cat.key}`} 
                        stackId="planejado" 
                        fill={cat.color}
                        radius={idx === dynamicCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    >
                        {idx === 0 && (
                            <LabelList 
                                dataKey={() => "Plan"} 
                                position="bottom" 
                                offset={10} 
                                className="fill-muted-foreground text-[8px] uppercase font-bold" 
                            />
                        )}
                        {idx === dynamicCategories.length - 1 && (
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
                   {dynamicCategories.map((cat, idx) => (
                    <Bar 
                        key={`real-${cat.key}`} 
                        dataKey={`real_${cat.key}`} 
                        stackId="usinado" 
                        fill={cat.color}
                        opacity={0.8}
                        radius={idx === dynamicCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    >
                        {idx === 0 && (
                            <LabelList 
                                dataKey={() => "Real"} 
                                position="bottom" 
                                offset={10} 
                                className="fill-muted-foreground text-[8px] uppercase font-bold" 
                            />
                        )}
                         {idx === dynamicCategories.length - 1 && (
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
          <div className="flex h-[350px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado para exibir o comparativo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
