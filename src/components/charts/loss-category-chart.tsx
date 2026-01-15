'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
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

interface LossCategoryChartProps {
  lossData: any[];
  loading: boolean;
}

const lossCategories = {
  'Perdas de Processo': ['SETUP'],
  'Perdas de Disponibilidade': ['Manutenção Corretiva', 'Falta de Ferramenta', 'Falta de Material'],
  'Outras Atividades': ['Limpeza', 'Treinamento', 'Reunião'],
};

const categoryColors: { [key: string]: string } = {
    'Perdas de Processo': 'hsl(var(--chart-1))',
    'Perdas de Disponibilidade': 'hsl(var(--chart-2))',
    'Outras Atividades': 'hsl(var(--chart-3))',
    'Outros': 'hsl(var(--chart-4))',
};


export function LossCategoryChart({ lossData, loading }: LossCategoryChartProps) {
  const { chartData, categoryDetails } = useMemo(() => {
    if (!lossData) {
      return { chartData: [], categoryDetails: {} };
    }

    const categoryTotals: { [key: string]: number } = {
      'Perdas de Processo': 0,
      'Perdas de Disponibilidade': 0,
      'Outras Atividades': 0,
      'Outros': 0,
    };
    
    const details: { [key: string]: { [reason: string]: number } } = {
      'Perdas de Processo': {},
      'Perdas de Disponibilidade': {},
      'Outras Atividades': {},
      'Outros': {},
    };

    lossData.forEach(record => {
      const reason = record.lossReason || 'N/A';
      const timeLost = Number(record.timeLost) || 0;
      let categoryAssigned = false;

      for (const category in lossCategories) {
        if ((lossCategories as any)[category].includes(reason)) {
          categoryTotals[category] += timeLost;
          if (!details[category][reason]) details[category][reason] = 0;
          details[category][reason] += timeLost;
          categoryAssigned = true;
          break;
        }
      }

      if (!categoryAssigned) {
        categoryTotals['Outros'] += timeLost;
        if (!details['Outros'][reason]) details['Outros'][reason] = 0;
        details['Outros'][reason] += timeLost;
      }
    });

    const finalChartData = Object.keys(categoryTotals).map(category => ({
      name: category,
      totalHours: categoryTotals[category] / 60,
      fill: categoryColors[category],
    })).filter(d => d.totalHours > 0).sort((a, b) => b.totalHours - a.totalHours);

    return { chartData: finalChartData, categoryDetails: details };
  }, [lossData]);
  
  const chartConfig = {
    totalHours: {
      label: 'Horas Perdidas',
    },
     ...Object.keys(categoryColors).reduce((acc, cat) => {
        acc[cat] = { color: categoryColors[cat] };
        return acc;
    }, {} as any)
  };
  
  const maxHours = Math.max(...chartData.map(d => d.totalHours), 0);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const categoryName = label;
      const categoryTotalHours = payload[0].value;
      const reasons = categoryDetails[categoryName];

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm">
          <div className="flex flex-col gap-1.5">
             <div className="flex items-center justify-between">
                <span className="text-[0.8rem] font-semibold">{categoryName}</span>
                <span className="text-[0.75rem] text-muted-foreground font-semibold">{categoryTotalHours.toFixed(1)}h</span>
             </div>
            <div className='flex flex-col gap-1 border-t pt-1.5 mt-1.5'>
            {reasons && Object.entries(reasons).map(([reason, time]) => (
              <div key={reason} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[0.8rem] text-muted-foreground">{reason}</span>
                </div>
                <span className="font-bold text-right text-[0.8rem]">{(time / 60).toFixed(1)}h</span>
              </div>
            ))}
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
        <CardTitle>Classificação de Perdas</CardTitle>
        <CardDescription>Total de horas perdidas por categoria (OEE).</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={chartData} layout="vertical" barSize={35} margin={{ right: 40 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={5}
                      width={150}
                    />
                    <XAxis 
                        type="number" 
                        hide 
                        domain={[0, maxHours * 1.1]}
                    />
                    <ChartTooltip
                        cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                        content={<CustomTooltip />}
                    />
                    <Bar dataKey="totalHours">
                        <LabelList
                            dataKey="totalHours"
                            position="right"
                            offset={8}
                            className="fill-foreground text-sm"
                            formatter={(value: number) => `${value.toFixed(1)}h`}
                        />
                    </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhum dado de perda para exibir.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
