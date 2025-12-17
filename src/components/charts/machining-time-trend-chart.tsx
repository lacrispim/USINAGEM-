'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
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
import { format } from 'date-fns';

interface MachiningTimeTrendChartProps {
  data: {
    factory?: string;
    machiningTime?: number;
    date?: { toDate: () => Date };
  }[];
  loading: boolean;
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
}: MachiningTimeTrendChartProps) {
  const { chartData, factories } = useMemo(() => {
    if (!data) {
      return { chartData: [], factories: [] };
    }

    const dailyData: { [date: string]: { [factory: string]: number } } = {};
    const factorySet = new Set<string>();

    data.forEach((record) => {
      if (record.factory && record.date && record.date.toDate) {
        const dateStr = format(record.date.toDate(), 'yyyy-MM-dd');
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


  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência do Tempo de Usinagem por Fábrica</CardTitle>
        <CardDescription>
          Tempo de usinagem (em minutos) por dia para cada fábrica.
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
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
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
                    <defs key={factory}>
                        <linearGradient id={`color-${factory.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={FACTORY_COLORS[factory]} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={FACTORY_COLORS[factory]} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                ))}
                {factories.map((factory) => (
                  <Area
                    key={factory}
                    dataKey={factory}
                    type="monotone"
                    fill={`url(#color-${factory.replace(/\s/g, '-')})`}
                    stroke={FACTORY_COLORS[factory]}
                    stackId="a"
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[350px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de produção para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
