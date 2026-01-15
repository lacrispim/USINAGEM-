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
  'Perdas de Processo',
  'Perdas de Disponibilidade',
  'Outras Atividades',
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

    const waterfallData: any[] = [];
    let remainingTime = totalTime;

    // 1. Tempo Total
    waterfallData.push({
      name: 'Tempo Total',
      value: [0, totalTime],
      total: totalTime,
      fill: categoryColors['Tempo Total'],
      reasons: { 'Tempo Calendário': totalTime }
    });

    // 2. Categorias de Perda e Tempo Restante
    categoryOrder.forEach((catName, index) => {
      const loss = categorizedLosses[catName];
      if (loss && loss.total > 0) {
        remainingTime -= loss.total;

        // Barra de Perda (cinza)
        waterfallData.push({
          name: catName,
          value: [remainingTime, remainingTime + loss.total],
          total: loss.total,
          fill: 'hsl(var(--muted-foreground))',
          reasons: loss.reasons,
        });

        // Barra de Tempo Restante (azul)
        waterfallData.push({
          name: ` `, // Nome vazio para o eixo X
          value: [0, remainingTime],
          total: remainingTime,
          fill: categoryColors[categoryOrder[index+1]] || categoryColors['Tempo de Operação'],
          reasons: {},
        });
      }
    });
    
    // Assegurar que a última barra represente o tempo de operação
    const lastBar = waterfallData[waterfallData.length -1];
    if (lastBar) {
      lastBar.name = 'Tempo de Operação'
      lastBar.value = [0, totalProductiveMinutes];
      lastBar.total = totalProductiveMinutes;
      lastBar.fill = categoryColors['Tempo de Operação'];
      lastBar.reasons = {'Tempo Produtivo': totalProductiveMinutes};
    }


    return waterfallData;

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
  
  const renderLabel = (props: any) => {
    const { x, y, width, value } = props;
    const total = value[1] - value[0];
    
    // Não renderiza label para a base invisível da barra de perda
    if (value[0] !== 0 && total > 0) return null; 
    
    const formattedValue = (total / 60).toFixed(1) + 'h';
    
    return (
      <text x={x + width / 2} y={y - 5} fill="hsl(var(--foreground))" textAnchor="middle" dominantBaseline="bottom" className="text-sm font-medium">
        {formattedValue}
      </text>
    );
  };
  
    const renderLossLabel = (props: any) => {
    const { x, y, width, value } = props;
    const total = value[1] - value[0];
    
    if (total <= 0) return null;

    const formattedValue = (total / 60).toFixed(1) + 'h';

    return (
      <text x={x + width / 2} y={y - 5} fill="hsl(var(--muted-foreground))" textAnchor="middle" dominantBaseline="bottom" className="text-sm">
        {formattedValue}
      </text>
    );
  };


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
                    margin={{ top: 30, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    interval={0}
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
                  <Bar dataKey="value" stackId="a" strokeWidth={0}>
                     <LabelList 
                        content={(props) => {
                            const { payload } = props;
                            if (payload.value[0] === 0) { // Render label for blue bars
                                return renderLabel(props);
                            }
                            // Render label for grey loss bars
                            return renderLossLabel(props);
                        }}
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
