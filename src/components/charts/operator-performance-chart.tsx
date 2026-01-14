'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  ReferenceLine,
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
      .sort((a, b) => a.hours - b.hours); // Sort ascending for horizontal layout
  }, [productionData, lossData]);

  const chartConfig = {
    hours: {
      label: 'Horas',
    },
    ...chartData.reduce((acc, { name, fill }) => {
        acc[name] = {
            label: name,
            color: fill,
        }
        return acc;
    }, {} as any)
  };
  
  const maxHours = Math.max(...chartData.map(d => d.hours), 0);
  const xAxisDomainMax = Math.max(8, Math.ceil(maxHours) + 1);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas Trabalhadas por Técnico</CardTitle>
        <CardDescription>
          Progresso da jornada de trabalho de cada operador até a meta de 7 horas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart 
                    data={chartData} 
                    layout="vertical" 
                    barSize={30}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} />
                   <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={5}
                      width={120}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      interval={0}
                    />
                  <XAxis
                    type="number"
                    dataKey="hours"
                    domain={[0, xAxisDomainMax]}
                    unit="h"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent 
                        formatter={(value, name) => [`${(value as number).toFixed(1)}h`, 'Total']}
                        indicator="dot"
                    />}
                  />
                  <ReferenceLine 
                    x={7} 
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                  >
                     <Label 
                        value="Meta: 7h" 
                        position="insideTop"
                        fill="#ef4444"
                        fontSize={12}
                        dy={-10}
                      />
                  </ReferenceLine>
                  <Bar dataKey="hours" layout="vertical">
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
        )}
      </CardContent>
    </Card>
  );
}
