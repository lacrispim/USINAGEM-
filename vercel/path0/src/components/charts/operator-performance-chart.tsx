'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
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

interface OperatorPerformanceChartProps {
  productionData: any[];
  lossData: any[];
  loading: boolean;
}

const OPERATOR_COLORS: { [key: string]: string } = {
  'Daniel Solivo': 'hsl(var(--chart-1))',
  'Rodrigo Cantano': 'hsl(var(--chart-2))',
  'Gustavo Gozzi': 'hsl(var(--chart-3))',
  'William Martinucci': 'hsl(var(--chart-4))',
  'Outro': 'hsl(var(--chart-5))',
};

export function OperatorPerformanceChart({
  productionData,
  lossData,
  loading,
}: OperatorPerformanceChartProps) {
  const chartData = useMemo(() => {
    const operatorHours: { [key: string]: number } = {};

    productionData.forEach(record => {
      if (record.operatorId && record.machiningTime) {
        if (!operatorHours[record.operatorId]) {
          operatorHours[record.operatorId] = 0;
        }
        operatorHours[record.operatorId] += Number(record.machiningTime) / 60;
      }
    });

    lossData.forEach(record => {
      if (record.operatorId && record.timeLost) {
        if (!operatorHours[record.operatorId]) {
          operatorHours[record.operatorId] = 0;
        }
        operatorHours[record.operatorId] += Number(record.timeLost) / 60;
      }
    });

    return Object.keys(operatorHours)
      .map(operator => ({
        name: operator,
        hours: operatorHours[operator],
        fill: OPERATOR_COLORS[operator] || OPERATOR_COLORS['Outro'],
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [productionData, lossData]);

  const chartConfig = {
    hours: {
      label: 'Horas',
      color: 'hsl(var(--chart-1))',
    },
  };

  const maxHours = Math.max(...chartData.map(d => d.hours), 0);

  return loading ? (
    <div className="flex h-[350px] w-full items-center justify-center">
      <Loader className="h-8 w-8 animate-spin" />
    </div>
  ) : chartData.length > 0 ? (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart data={chartData} layout="vertical" barSize={30} margin={{ left: 10 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={5}
              width={120}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <XAxis
              type="number"
              domain={[0, Math.max(8, Math.ceil(maxHours) + 1)]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              unit="h"
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--accent))' }}
              content={<ChartTooltipContent 
                 formatter={(value) => [`${(value as number).toFixed(1)}h`, 'Total Horas']}
              />}
            />
            <ReferenceLine 
              y={0} 
              stroke="transparent"
              label={{ 
                value: "Meta", 
                position: 'insideTopLeft',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 12,
                dy: -20,
                dx: 7 * (350 / (Math.max(8, Math.ceil(maxHours) + 1))) + 130, // Position based on goal
              }}
            />
             <ReferenceLine 
              x={7} 
              stroke="hsl(var(--primary))" 
              strokeDasharray="3 3" 
              strokeWidth={2}
            />
            <Bar dataKey="hours">
                <LabelList
                    dataKey="hours"
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
    <div className="flex h-[350px] w-full flex-col items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Nenhum dado para exibir o desempenho dos técnicos.
      </p>
    </div>
  );
}

    