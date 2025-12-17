'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Rectangle,
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
  'AGUAÍ': 'hsl(var(--chart-6))',
  'SUAPE': 'hsl(var(--chart-7))',
  'IGARASSU': 'hsl(var(--chart-8))',
  'GARANHUS': 'hsl(var(--chart-9))',
  'TORRE': 'hsl(var(--chart-10))',
};


export function MachiningTimeTrendChart({
  data,
  loading,
  isWeekView,
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
        const timeInHours = (record.machiningTime || 0) / 60; // Convert to hours

        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {};
        }
        if (!dailyData[dateStr][factory]) {
          dailyData[dateStr][factory] = 0;
        }
        dailyData[dateStr][factory] += timeInHours;
        factorySet.add(factory);
      }
    });

    const sortedFactories = Array.from(factorySet).sort();

    const chartData = Object.entries(dailyData)
      .map(([date, factoryTimes]) => ({
        date,
        ...factoryTimes,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { chartData, factories: sortedFactories };
  }, [data]);
  
  const chartConfig = factories.reduce((acc, factory) => {
    acc[factory] = {
      label: factory,
      color: FACTORY_COLORS[factory] || 'hsl(var(--chart-1))',
    };
    return acc;
  }, {} as any);

  const xAxisFormatter = (value: string) => {
    const date = new Date(value);
    // add a day to the date to show correct day of week
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
      <div className="flex justify-center gap-4 pt-4">
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
    
        loading ? (
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
                  tickFormatter={(value) => `${value.toFixed(0)}`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
                />
                 <Legend content={<CustomLegend />} />
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
