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
  'Tempo de Operação': 'hsl(var(--chart-5))',
  'Perdas de Processo': 'hsl(var(--chart-2))',
  'Perdas de Disponibilidade': 'hsl(var(--chart-3))',
  'Outras Atividades': 'hsl(var(--chart-4))',
};

const categoryOrder = [
  'Tempo de Operação',
  'Perdas de Processo',
  'Perdas de Disponibilidade',
  'Outras Atividades',
];

export function LossClassificationChart({
  productionData,
  lossData,
  loading,
}: LossClassificationChartProps) {
  const { chartData, totalTime } = useMemo(() => {
    if (!productionData || !lossData) {
      return { chartData: [], totalTime: 0 };
    }

    const totalProductiveMinutes = productionData.reduce(
      (sum, record) => sum + (Number(record.machiningTime) || 0),
      0
    );

    const categorizedLosses: Record<string, { total: number, reasons: Record<string, number> }> = {};

    lossData.forEach(record => {
      const reason = record.lossReason || 'Desconhecido';
      const category = lossCategories[reason] || 'Outras Atividades';
      const time = Number(record.timeLost) || 0;

      if (!categorizedLosses[category]) {
        categorizedLosses[category] = { total: 0, reasons: {} };
      }
      categorizedLosses[category].total += time;

      if (!categorizedLosses[category].reasons[reason]) {
        categorizedLosses[category].reasons[reason] = 0;
      }
      categorizedLosses[category].reasons[reason] += time;
    });

    const data: any[] = [];
    let remainingTime = totalProductiveMinutes + (Object.values(categorizedLosses).reduce((sum, cat) => sum + cat.total, 0));
    const totalTime = remainingTime;

    data.push({
      name: 'Tempo Total',
      value: [0, remainingTime],
      total: remainingTime,
      fill: 'hsl(var(--chart-1))',
      reasons: {}
    });

    categoryOrder.forEach(categoryName => {
      let time = 0;
      let reasons = {};
      if (categoryName === 'Tempo de Operação') {
        time = totalProductiveMinutes;
        reasons = {'Tempo Produtivo': totalProductiveMinutes};
      } else if (categorizedLosses[categoryName]) {
        time = categorizedLosses[categoryName].total;
        reasons = categorizedLosses[categoryName].reasons;
      }
      
      if (time > 0) {
        data.push({
          name: categoryName,
          value: [remainingTime - time, remainingTime],
          total: time,
          fill: categoryColors[categoryName],
          reasons: reasons
        });
        remainingTime -= time;
      }
    });

    return { chartData: data, totalTime };
  }, [productionData, lossData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const category = data.name;
      const totalMinutes = data.total;
      const reasons = data.reasons;

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[200px]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] font-semibold">{category}</span>
              <span className="text-[0.75rem] text-muted-foreground font-semibold">
                {(totalMinutes / 60).toFixed(1)}h
              </span>
            </div>
            <div className='flex flex-col gap-1 mt-1 border-t pt-1'>
              {Object.entries(reasons).map(([reason, time]) => (
                 <div key={reason} className="flex items-center justify-between gap-4">
                   <span className="text-[0.8rem] text-muted-foreground">{reason}</span>
                   <span className="font-bold text-right text-[0.8rem]">
                     {(Number(time) / 60).toFixed(1)}h
                   </span>
                 </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  const yAxisFormatter = (value: number) => `${(value/60).toFixed(0)}h`;

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
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide domain={[0, totalTime]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <ChartTooltip
                    cursor={{fill: 'hsl(var(--accent))', fillOpacity: 0.2}}
                    content={<CustomTooltip />}
                  />
                  <Bar dataKey="value" stackId="a">
                    {chartData.map((entry, index) => (
                      <LabelList
                        key={index}
                        dataKey="total"
                        position="right"
                        offset={8}
                        formatter={yAxisFormatter}
                        className="fill-foreground text-sm"
                      />
                    ))}
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