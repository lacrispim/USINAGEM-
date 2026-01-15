'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
  ReferenceLine,
} from 'recharts';
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

interface LossClassificationChartProps {
  productionData: any[];
  lossData: any[];
  loading: boolean;
}

const lossCategories: Record<string, string> = {
  // Perdas de Processo (Planejadas)
  'SETUP': 'Perdas de Processo',
  
  // Perdas de Disponibilidade (Não Planejadas)
  'Manutenção Corretiva': 'Perdas de Disponibilidade',
  'Falta de Ferramenta': 'Perdas de Disponibilidade',
  'Falta de Material': 'Perdas de Disponibilidade',
  
  // Outras Atividades
  'Limpeza': 'Outras Atividades',
  'Treinamento': 'Outras Atividades',
  'Reunião': 'Outras Atividades',
  
  'Outro': 'Outras Atividades',
};

const categoryColors: Record<string, string> = {
  'Tempo Total': 'hsl(var(--chart-1))',
  'Tempo de Operação': 'hsl(var(--chart-5))',
  'Perdas de Processo': 'hsl(var(--chart-2))',
  'Perdas de Disponibilidade': 'hsl(var(--chart-3))',
  'Outras Atividades': 'hsl(var(--chart-4))',
};

const categoryOrder = [
  'Tempo Total',
  'Perdas de Processo',
  'Perdas de Disponibilidade',
  'Outras Atividades',
  'Tempo de Operação',
];

export function LossClassificationChart({
  productionData,
  lossData,
  loading,
}: LossClassificationChartProps) {
  const chartData = useMemo(() => {
    if (!productionData || !lossData) {
      return [];
    }
  
    const totalProductiveMinutes = productionData.reduce(
      (sum, record) => sum + (Number(record.machiningTime) || 0),
      0
    );
  
    const categorizedLosses: Record<string, { total: number, reasons: Record<string, number> }> = {
      'Perdas de Processo': { total: 0, reasons: {} },
      'Perdas de Disponibilidade': { total: 0, reasons: {} },
      'Outras Atividades': { total: 0, reasons: {} },
    };
  
    lossData.forEach(record => {
      const reason = record.lossReason || 'Desconhecido';
      const category = lossCategories[reason] || 'Outras Atividades';
      const time = Number(record.timeLost) || 0;
  
      if (categorizedLosses[category]) {
        categorizedLosses[category].total += time;
        if (!categorizedLosses[category].reasons[reason]) {
          categorizedLosses[category].reasons[reason] = 0;
        }
        categorizedLosses[category].reasons[reason] += time;
      }
    });
  
    const totalLossMinutes = Object.values(categorizedLosses).reduce((sum, cat) => sum + cat.total, 0);
    const totalTime = totalProductiveMinutes + totalLossMinutes;
  
    const dataMap: Record<string, any> = {
      'Tempo Total': { name: 'Tempo Total', total: totalTime, range: [0, totalTime], fill: categoryColors['Tempo Total'], reasons: {} },
      'Tempo de Operação': { name: 'Tempo de Operação', total: totalProductiveMinutes, range: [0, totalProductiveMinutes], fill: categoryColors['Tempo de Operação'], reasons: {'Tempo Produtivo': totalProductiveMinutes}},
    };

    let remainingTime = totalTime;

    categoryOrder.forEach(catName => {
        if(catName === 'Tempo Total' || catName === 'Tempo de Operação') return;

        const loss = categorizedLosses[catName];
        if (loss) {
            remainingTime -= loss.total;
            dataMap[catName] = {
                name: catName,
                total: loss.total,
                range: [remainingTime, totalTime], // Invisible part
                offset: loss.total, // The visible gray bar
                fill: 'hsl(var(--muted))',
                reasons: loss.reasons,
            };

            const nextCategoryName = categoryOrder[categoryOrder.indexOf(catName) + 1] || 'Tempo de Operação';
            let nextTime = remainingTime;
            if (nextCategoryName === 'Tempo de Operação') {
                nextTime = totalProductiveMinutes
            }

             dataMap[`Tempo após ${catName}`] = {
                name: ` `,
                total: remainingTime,
                range: [0, remainingTime],
                fill: categoryColors[nextCategoryName] || categoryColors['Tempo de Operação'],
                reasons: {},
             }
        }
    });

    const finalChartData = [
        dataMap['Tempo Total'],
        dataMap['Perdas de Processo'],
        dataMap[`Tempo após Perdas de Processo`],
        dataMap['Perdas de Disponibilidade'],
        dataMap[`Tempo após Perdas de Disponibilidade`],
        dataMap['Outras Atividades'],
        dataMap['Tempo de Operação'],
    ].filter(Boolean);

    return finalChartData;
  }, [productionData, lossData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const category = data.name.trim();

      if (!category) return null;

      const totalMinutes = data.total;
      const reasons = data.reasons;
      const hasReasons = Object.keys(reasons).length > 0;

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[200px]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] font-semibold">{category}</span>
              <span className="text-[0.75rem] text-muted-foreground font-semibold">
                {(totalMinutes / 60).toFixed(1)}h
              </span>
            </div>
            {hasReasons && <div className='flex flex-col gap-1 mt-1 border-t pt-1'>
              {Object.entries(reasons).map(([reason, time]) => (
                 <div key={reason} className="flex items-center justify-between gap-4">
                   <span className="text-[0.8rem] text-muted-foreground">{reason}</span>
                   <span className="font-bold text-right text-[0.8rem]">
                     {(Number(time) / 60).toFixed(1)}h
                   </span>
                 </div>
              ))}
            </div>}
          </div>
        </div>
      );
    }
    return null;
  };
  
  const yAxisFormatter = (value: number) => `${(value/60).toFixed(0)}h`;
  const maxTime = chartData.length > 0 ? chartData[0].total : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificação de Perdas (OEE)</CardTitle>
        <CardDescription>
          Análise de perdas no estilo cascata, do tempo total ao tempo de operação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 1 ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{}} className="h-full w-full">
                <BarChart 
                    data={chartData}
                    margin={{ top: 30, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={yAxisFormatter}
                    domain={[0, maxTime * 1.1]}
                    width={50}
                  />
                  <ChartTooltip
                    cursor={{fill: 'hsl(var(--accent))', fillOpacity: 0.2}}
                    content={<CustomTooltip />}
                  />
                  <Bar dataKey="range" stackId="a" strokeWidth={0}>
                     <LabelList 
                        dataKey="total"
                        position="top"
                        formatter={(value: number) => (value / 60).toFixed(1) + 'h'}
                        className="fill-foreground text-sm font-medium"
                     />
                  </Bar>
                   <Bar dataKey="offset" stackId="a" fill="hsl(var(--background))" strokeWidth={0}>
                        <LabelList 
                            dataKey="offset"
                            position="top"
                            formatter={(value: number) => (value > 0 ? (value / 60).toFixed(1) + 'h' : '')}
                            className="fill-muted-foreground text-sm"
                            dy={-10}
                        />
                   </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[350px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Dados insuficientes para exibir a classificação de perdas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
