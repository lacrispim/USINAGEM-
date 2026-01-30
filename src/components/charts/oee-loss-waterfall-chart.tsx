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
  Cell,
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

interface OeeLossWaterfallChartProps {
  productionData: any[];
  lossData: any[];
  loading: boolean;
}

const chartConfig = {
  value: {
    label: 'Horas',
  },
};

export function OeeLossWaterfallChart({
  productionData,
  lossData,
  loading,
}: OeeLossWaterfallChartProps) {

  const { chartData, totalMachiningHours, totalLostHours } = useMemo(() => {
    if (!productionData || !lossData) {
      return { chartData: [], totalMachiningHours: 0, totalLostHours: 0 };
    }

    const totalMachiningTime = productionData.reduce(
      (sum, record) => sum + (Number(record.machiningTime) || 0),
      0
    );

    const lossByReason = lossData.reduce((acc, record) => {
      if (record.lossReason && record.timeLost) {
        let reason = record.lossReason.toUpperCase();
        if (reason.includes('SETUP')) {
          reason = 'SETUP';
        }
        if (!acc[reason]) {
          acc[reason] = 0;
        }
        acc[reason] += Number(record.timeLost);
      }
      return acc;
    }, {} as Record<string, number>);

    const sortedLosses = Object.entries(lossByReason)
      .map(([name, time]) => ({
        name,
        value: time / 60,
      }))
      .sort((a, b) => b.value - a.value);

    const totalMachiningHours = totalMachiningTime / 60;
    const totalLostHours = sortedLosses.reduce((sum, loss) => sum + loss.value, 0);

    const waterfallData: {name: string, start: number, value: number}[] = [];
    
    let cumulative = 0;

    // Loss bars
    sortedLosses.forEach(loss => {
      waterfallData.push({
        name: loss.name,
        start: cumulative,
        value: loss.value,
      });
      cumulative += loss.value;
    });

    // Total loss bar
    waterfallData.push({
      name: 'Total',
      start: 0,
      value: cumulative,
    });

    return { chartData: waterfallData, totalMachiningHours, totalLostHours };

  }, [productionData, lossData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload.find((p: any) => p.dataKey === 'value')?.value || 0;
      
      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm">
          <div className="grid gap-1.5">
            <p className="font-semibold">{label}</p>
            <div className="flex items-center gap-2">
                <div className="flex justify-between flex-1">
                    <span className="text-muted-foreground">Horas</span>
                    <span className="font-bold">{value.toFixed(1)}h</span>
                </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxHours = totalLostHours > 0 ? Math.ceil(totalLostHours / 5) * 5 + 5 : 10;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Análise de Eficiência e Perdas (OEE)</CardTitle>
                <CardDescription>Análise em cascata das horas de perda.</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-green-500">{totalMachiningHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Usinagem Efetiva</p>
                <p className="text-sm font-bold text-blue-500 mt-1">{totalLostHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Perda Total</p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 1 ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={100}
                    tick={{fontSize: 12}}
                  />
                  <YAxis 
                    unit="h" 
                    domain={[0, maxHours]}
                    allowDecimals={false}
                  />
                  <ChartTooltip 
                    cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                    content={<CustomTooltip />}
                  />
                  
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a">
                    <LabelList 
                        dataKey="value" 
                        position="top"
                        formatter={(value: number) => value > 0.05 ? `${value.toFixed(1)}h` : ''}
                        className="text-xs fill-muted-foreground"
                    />
                     {chartData.map((entry, index) => {
                        const isTotal = entry.name === 'Total';
                        const color = isTotal ? 'hsl(221 83% 53%)' : 'hsl(48 96% 51%)';
                        return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[350px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de perda para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
