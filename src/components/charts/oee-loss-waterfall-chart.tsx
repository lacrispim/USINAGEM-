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

interface OeeLossWaterfallChartProps {
  productionData: any[];
  lossData: any[];
  loading: boolean;
}

const chartConfig = {
  value: {
    label: 'Horas Perdidas',
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

    const totalMachiningTime = productionData.reduce( // in minutes
      (sum, record) => sum + (Number(record.machiningTime) || 0),
      0
    );

    const lossByReason = lossData.reduce((acc, record) => { // in minutes
      if (record.lossReason && record.timeLost) {
        let reason = record.lossReason;
        if (reason.toUpperCase().includes('SETUP')) {
          reason = 'SETUP';
        }
        if (!acc[reason]) {
          acc[reason] = 0;
        }
        acc[reason] += Number(record.timeLost);
      }
      return acc;
    }, {} as Record<string, number>);

    const totalLostTime = Object.values(lossByReason).reduce( // in minutes
      (sum, time) => sum + time,
      0
    );
    
    const sortedLosses = Object.entries(lossByReason)
      .map(([name, time]) => ({
        name,
        lossHours: time / 60,
      }))
      .sort((a, b) => b.lossHours - a.lossHours);

    let cumulative = 0;
    const waterfallData = sortedLosses.map(loss => {
      const item = {
        name: loss.name,
        start: cumulative,
        value: loss.lossHours,
      };
      cumulative += loss.lossHours;
      return item;
    });
    
    const currentTotalMachiningHours = totalMachiningTime / 60;
    const currentTotalLostHours = totalLostTime / 60;

    return { chartData: waterfallData, totalMachiningHours: currentTotalMachiningHours, totalLostHours: currentTotalLostHours };

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
                <CardDescription>Análise em cascata do tempo produtivo versus os diversos motivos de perda.</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-green-500">{totalMachiningHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Usinagem Efetiva</p>
                <p className="text-sm font-bold text-red-500 mt-1">{totalLostHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Perda Total</p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
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
                  />
                  <ChartTooltip 
                    cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                    content={<CustomTooltip />}
                  />
                  
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" fill="hsl(48 96% 51%)">
                    <LabelList 
                        dataKey="value" 
                        position="top"
                        formatter={(value: number) => value > 0.1 ? `${value.toFixed(1)}h` : ''}
                        className="text-xs fill-muted-foreground"
                    />
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
