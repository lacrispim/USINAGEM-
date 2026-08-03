
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
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[14rem]">
          <div className="grid gap-1.5">
            <p className="font-semibold text-lg">{label}</p>
            <div className="flex items-center gap-2">
                <div className="flex justify-between flex-1">
                    <span className="text-sm text-muted-foreground">Perda Acumulada</span>
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
                <CardDescription>Análise em cascata (Waterfall) detalhando as causas de perda de eficiência.</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold text-green-500">{totalMachiningHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Usinagem Efetiva</p>
                <p className="text-2xl font-bold text-blue-500 mt-2">{totalLostHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Perda Total</p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[450px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 1 ? (
          <div className="h-[650px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 80,
                  }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={120}
                    className="text-[11px] font-bold uppercase"
                  />
                  <YAxis 
                    unit="h" 
                    domain={[0, maxHours]}
                    allowDecimals={false}
                    className="text-[10px]"
                  />
                  <ChartTooltip 
                    cursor={{fill: 'hsl(var(--accent))', radius: 4, opacity: 0.1}}
                    content={<CustomTooltip />}
                  />
                  
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
                    <LabelList 
                        dataKey="value" 
                        position="top"
                        offset={10}
                        formatter={(value: number) => value > 0.05 ? `${value.toFixed(1)}h` : ''}
                        className="text-xs fill-foreground font-bold"
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
              Nenhum dado de perda para exibir no período selecionado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
