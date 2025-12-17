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
import { format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MachiningTimeTrendChartProps {
  data: {
    factory?: string;
    machiningTime?: number;
    date?: { toDate: () => Date };
  }[];
  loading: boolean;
  isWeekView?: boolean;
}

const FACTORY_COLORS: { [key: string]: string } = {
  'VALINHOS DOVE': 'hsl(var(--chart-1))',
  'VALINHOS SABONETE': 'hsl(var(--chart-2))',
  'VINHEDO': 'hsl(var(--chart-3))',
  'POUSO ALEGRE': 'hsl(var(--chart-4))',
  'INDAIATUBA': 'hsl(var(--chart-5))',
  'AGUAÍ': 'hsl(var(--chart-1))',
  'SUAPE': 'hsl(var(--chart-2))',
  'IGARASSU': 'hsl(var(--chart-3))',
  'GARANHUS': 'hsl(var(--chart-4))',
  'TORRE': 'hsl(var(--chart-5))',
};


export function MachiningTimeTrendChart({
  data,
  loading,
  isWeekView = false
}: MachiningTimeTrendChartProps) {
  const { chartData, factories } = useMemo(() => {
    if (!data) {
      return { chartData: [], factories: [] };
    }

    const dailyData: { [date: string]: { [factory: string]: number } } = {};
    const factorySet = new Set<string>();

    data.forEach((record) => {
      if (record.factory && record.date && record.date.toDate) {
        const dateObj = record.date.toDate();
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        const factory = record.factory;
        const timeInMinutes = record.machiningTime || 0;

        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {};
        }
        if (!dailyData[dateStr][factory]) {
          dailyData[dateStr][factory] = 0;
        }
        dailyData[dateStr][factory] += timeInMinutes;
        factorySet.add(factory);
      }
    });

    const sortedFactories = Array.from(factorySet).sort();

    let chartData = Object.entries(dailyData)
      .map(([date, factoryTimes]) => ({
        date,
        ...factoryTimes,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (isWeekView) {
      const dayOrder = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      chartData = chartData.sort((a, b) => {
        const dayA = getDay(new Date(a.date));
        const dayB = getDay(new Date(b.date));
        return dayA - dayB;
      });
    }

    return { chartData, factories: sortedFactories };
  }, [data, isWeekView]);
  
  const chartConfig = factories.reduce((acc, factory) => {
    acc[factory] = {
      label: factory,
      color: FACTORY_COLORS[factory] || 'hsl(var(--chart-1))',
    };
    return acc;
  }, {} as any);

  const xAxisFormatter = (value: string) => {
    if (isWeekView) {
      return format(new Date(value), 'EEE', { locale: ptBR });
    }
    return format(new Date(value), 'dd/MM');
  }


  return (
    
        loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div className="h-[350px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={xAxisFormatter}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(value) => `${value} min`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent
                     formatter={(value, name) => [`${(value as number).toFixed(0)} min`, name]}
                     indicator="dot"
                  />}
                />
                 <Legend />
                {factories.map((factory) => (
                  <Bar
                    key={factory}
                    dataKey={factory}
                    fill={FACTORY_COLORS[factory]}
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
              Nenhum dado de produção para exibir.
            </p>
          </div>
        )
      
  );
}
