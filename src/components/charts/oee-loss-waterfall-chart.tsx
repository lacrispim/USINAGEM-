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
    label: 'Loss %',
  },
  total: {
    label: 'Total Loss %',
  }
};

export function OeeLossWaterfallChart({
  productionData,
  lossData,
  loading,
}: OeeLossWaterfallChartProps) {

  const { chartData, oee, totalLoss } = useMemo(() => {
    if (!productionData || !lossData) {
      return { chartData: [], oee: 0, totalLoss: 0 };
    }

    const totalMachiningTime = productionData.reduce(
      (sum, record) => sum + (Number(record.machiningTime) || 0),
      0
    );

    const lossByReason = lossData.reduce((acc, record) => {
      if (record.lossReason && record.timeLost) {
        const reason = record.lossReason;
        if (!acc[reason]) {
          acc[reason] = 0;
        }
        acc[reason] += Number(record.timeLost);
      }
      return acc;
    }, {} as Record<string, number>);

    const totalLostTime = Object.values(lossByReason).reduce(
      (sum, time) => sum + time,
      0
    );

    const totalTime = totalMachiningTime + totalLostTime;

    if (totalTime === 0) {
      return { chartData: [], oee: 100, totalLoss: 0 };
    }
    
    const oeePercentage = (totalMachiningTime / totalTime) * 100;
    const totalLossPercentage = 100 - oeePercentage;

    const sortedLosses = Object.entries(lossByReason)
      .map(([name, time]) => ({
        name,
        lossPercentage: (time / totalTime) * 100,
      }))
      .sort((a, b) => b.lossPercentage - a.lossPercentage);

    let cumulative = 0;
    const waterfallData = sortedLosses.map(loss => {
      const item = {
        name: loss.name,
        start: cumulative,
        value: loss.lossPercentage,
      };
      cumulative += loss.lossPercentage;
      return item;
    });

    waterfallData.push({
      name: 'Total',
      start: 0,
      value: totalLossPercentage,
    });
    
    return { chartData: waterfallData, oee: oeePercentage, totalLoss: totalLossPercentage };

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
                    <span className="text-muted-foreground">Perda</span>
                    <span className="font-bold">{value.toFixed(1)}%</span>
                </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxLoss = Math.ceil(totalLoss / 5) * 5 + 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>TESTE</CardTitle>
                <CardDescription>OEE Loss Waterfall</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-green-500">{oee.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">OEE YTD %</p>
                <p className="text-sm font-bold text-red-500 mt-1">{totalLoss.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">OEE Loss YTD %</p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 1 ? ( // more than just Total
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
                    unit="%" 
                    domain={[0, maxLoss]}
                  />
                  <ChartTooltip 
                    cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                    content={<CustomTooltip />}
                  />
                  
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" >
                    <LabelList 
                        dataKey="value" 
                        position="top"
                        formatter={(value: number) => value > 0.1 ? `${value.toFixed(1)}%` : ''}
                        className="text-xs fill-muted-foreground"
                    />
                     {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Total' ? 'hsl(var(--destructive))' : 'hsl(48 96% 51%)'} />
                    ))}
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
