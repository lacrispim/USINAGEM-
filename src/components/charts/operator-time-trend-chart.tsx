'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

interface Record {
  operatorId?: string;
  machiningTime?: number;
  timeLost?: number;
  date?: { toDate: () => Date };
}

interface OperatorTimeTrendChartProps {
  productionData: Record[];
  lossData: Record[];
  loading: boolean;
  isWeekView?: boolean;
}

const OPERATOR_COLORS: { [key: string]: string } = {
  'Daniel Solivo': 'hsl(var(--chart-1))',
  'Rodrigo Cantano': 'hsl(var(--chart-2))',
  'Gustavo Gozzi': 'hsl(var(--chart-3))',
  'William Martinucci': 'hsl(var(--chart-4))',
  'default': 'hsl(var(--chart-5))',
};

export function OperatorTimeTrendChart({
  productionData,
  lossData,
  loading,
  isWeekView,
}: OperatorTimeTrendChartProps) {
  const { chartData, operators } = useMemo(() => {
    if (!productionData || !lossData) {
      return { chartData: [], operators: [] };
    }

    const dailyData: { [date: string]: { [operator: string]: number } } = {};
    const operatorSet = new Set<string>();
    
    const allRecords = [...productionData, ...lossData];

    allRecords.forEach((record) => {
      if (record.operatorId && record.date && record.date.toDate) {
        const dateObj = record.date.toDate();
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        const operator = record.operatorId;
        const timeInMinutes = (record.machiningTime || 0) + (record.timeLost || 0);

        if (timeInMinutes > 0) {
            const timeInHours = timeInMinutes / 60;
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {};
            }
            if (!dailyData[dateStr][operator]) {
                dailyData[dateStr][operator] = 0;
            }
            dailyData[dateStr][operator] += timeInHours;
            operatorSet.add(operator);
        }
      }
    });

    const sortedOperators = Array.from(operatorSet).sort();

    const chartData = Object.entries(dailyData)
      .map(([date, operatorTimes]) => ({
        date,
        ...operatorTimes,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { chartData, operators: sortedOperators };
  }, [productionData, lossData]);
  
  const chartConfig = operators.reduce((acc, operator) => {
    acc[operator] = {
      label: operator,
      color: OPERATOR_COLORS[operator] || OPERATOR_COLORS.default,
    };
    return acc;
  }, {} as any);

  const xAxisFormatter = (value: string) => {
    const date = new Date(value);
    date.setDate(date.getDate() + 1);
    return isWeekView ? format(date, 'EEE', { locale: ptBR }) : format(date, 'dd/MM');
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      date.setDate(date.getDate() + 1);
      const formattedLabel = isWeekView ? format(date, 'EEE', { locale: ptBR }) : format(date, 'dd/MM/yyyy');
      
      const total = payload.reduce((acc: number, item: any) => acc + item.value, 0);

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm">
          <div className="flex flex-col gap-1.5">
             <div className="flex items-center justify-between">
                <span className="text-[0.8rem] font-semibold">{formattedLabel}</span>
                <span className="text-[0.75rem] text-muted-foreground font-semibold">{total.toFixed(1)}h</span>
             </div>
            <div className='flex flex-col gap-1'>
            {payload.slice().reverse().map((p: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: p.fill }} />
                  <span className="text-[0.8rem] text-muted-foreground">{p.name}</span>
                </div>
                <span className="font-bold text-right text-[0.8rem]">{p.value.toFixed(1)}h</span>
              </div>
            ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-4 pt-4 flex-wrap">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };


  return (
    <Card>
        <CardHeader>
            <CardTitle>Análise diária por Operador</CardTitle>
            <CardDescription>
                Tempo total de atividades (produção e perda) por operador a cada dia.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
            <div className="flex h-[350px] w-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
            ) : chartData && chartData.length > 0 ? (
            <div className="h-[350px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={chartData} barGap={4}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                    dataKey="date"
                    tickFormatter={xAxisFormatter}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    />
                    <YAxis
                    tickFormatter={(value) => `${value.toFixed(0)}h`}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    />
                    <ChartTooltip
                    cursor={false}
                    content={<CustomTooltip />}
                    />
                    <Legend content={<CustomLegend />} />
                    {operators.map((operator) => (
                    <Bar
                        key={operator}
                        dataKey={operator}
                        fill={OPERATOR_COLORS[operator] || OPERATOR_COLORS.default}
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                    />
                    ))}
                </BarChart>
                </ChartContainer>
            </div>
            ) : (
            <div className="flex h-[350px] w-full flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">
                Nenhum dado de operador para exibir no período.
                </p>
            </div>
            )}
      </CardContent>
    </Card>
  );
}
