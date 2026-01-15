'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
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
import { useMemo } from 'react';

interface LossReasonChartProps {
  data: { name: string; value: number }[];
  loading: boolean;
}

const OEE_CATEGORIES = {
  PERDA_PROCESSO: 'Perdas de Processo (Programadas)',
  PERDA_DISPONIBILIDADE: 'Perdas de Disponibilidade (Não Programadas)',
  PERDA_PERFORMANCE: 'Perdas de Performance',
  PERDA_QUALIDADE: 'Perdas de Qualidade',
  OUTRAS_ATIVIDADES: 'Outras Atividades',
};

const OEE_COLORS = {
  [OEE_CATEGORIES.PERDA_PROCESSO]: 'hsl(var(--chart-1))',
  [OEE_CATEGORIES.PERDA_DISPONIBILIDADE]: 'hsl(var(--chart-2))',
  [OEE_CATEGORIES.PERDA_PERFORMANCE]: 'hsl(var(--chart-3))',
  [OEE_CATEGORIES.PERDA_QUALIDADE]: 'hsl(var(--chart-4))',
  [OEE_CATEGORIES.OUTRAS_ATIVIDADES]: 'hsl(var(--chart-5))',
};

// Mapeia palavras-chave dos motivos de perda para as categorias OEE
const mapReasonToOeeCategory = (reason: string): string => {
  const lowerCaseReason = reason.toLowerCase();

  // 1. Perdas de Processo (Programadas)
  if (['setup'].some(keyword => lowerCaseReason.includes(keyword))) {
    return OEE_CATEGORIES.PERDA_PROCESSO;
  }

  // 2. Perdas de Disponibilidade (Não Programadas)
  if (['manutenção', 'falta de material', 'ferramenta', 'quebra'].some(keyword => lowerCaseReason.includes(keyword))) {
    return OEE_CATEGORIES.PERDA_DISPONIBILIDADE;
  }
  
  // 3. Perdas de Performance
  if (['ajuste', 'velocidade reduzida', 'microparada'].some(keyword => lowerCaseReason.includes(keyword))) {
    return OEE_CATEGORIES.PERDA_PERFORMANCE;
  }
  
  // 4. Perdas de Qualidade
  if (['refugo', 'retrabalho', 'peça morta'].some(keyword => lowerCaseReason.includes(keyword))) {
    return OEE_CATEGORIES.PERDA_QUALIDADE;
  }

  // 5. Outras Atividades (Reuniões, Treinamentos, Limpeza, etc.)
  return OEE_CATEGORIES.OUTRAS_ATIVIDADES;
};


export function LossReasonChart({ data, loading }: LossReasonChartProps) {

  const { chartData, categories } = useMemo(() => {
    if (!data) {
      return { chartData: [], categories: [] };
    }

    const categorizedData = data.reduce((acc, item) => {
      const category = mapReasonToOeeCategory(item.name);
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += item.value / 60; // Convert to hours
      return acc;
    }, {} as Record<string, number>);

    const finalChartData = [{
      name: 'Perdas por Categoria',
      ...categorizedData
    }];
    
    const activeCategories = Object.keys(categorizedData).sort((a,b) => categorizedData[b] - categorizedData[a]);

    return { chartData: finalChartData, categories: activeCategories };

  }, [data]);

  const chartConfig = categories.reduce((acc, category) => {
    acc[category] = {
      label: category,
      color: OEE_COLORS[category],
    };
    return acc;
  }, {} as any);
  
  const totalHours = categories.reduce((sum, cat) => sum + (chartData[0][cat] || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Perdas por Categoria (OEE)</CardTitle>
        <CardDescription>
          Tempo total perdido agrupado por categorias de eficiência.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData && chartData[0] && totalHours > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={chartConfig}>
                <BarChart data={chartData} layout="vertical" stackOffset="expand" barSize={60}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <XAxis
                      type='number'
                      tickFormatter={(value) => `${Math.round(value * 100)}%`}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <ChartTooltip
                        cursor={{fill: 'hsl(var(--accent))'}}
                        content={<ChartTooltipContent 
                            formatter={(value, name, props) => {
                                const percentage = (value as number) * 100;
                                const hours = (value as number) * totalHours;
                                return [`${hours.toFixed(1)}h (${percentage.toFixed(1)}%)`, name];
                            }}
                            indicator="dot"
                        />}
                    />
                    <Legend
                      content={({ payload }) => (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                          {payload?.map((entry, index) => (
                            <div key={`item-${index}`} className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                              <span className="text-xs text-muted-foreground">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    {categories.map((category) => (
                         <Bar 
                            key={category} 
                            dataKey={category} 
                            fill={OEE_COLORS[category]} 
                            stackId="a" 
                         />
                    ))}
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
