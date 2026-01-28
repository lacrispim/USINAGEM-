'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList, Legend } from 'recharts';
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

interface MachiningTimeByFactoryChartProps {
  productionData: any[];
  setupData: any[];
  ddsData: any[];
  loading: boolean;
}

const OPERATOR_COLORS: { [key: string]: string } = {
  'Daniel Solivo': 'hsl(var(--chart-1))',
  'Rodrigo Cantano': 'hsl(var(--chart-2))',
  'Gustavo Gozzi': 'hsl(var(--chart-3))',
  'William Martinucci': 'hsl(var(--chart-4))',
  'Outro': 'hsl(var(--chart-5))',
};

const PROGRAMMED_LOSS_COLOR = 'hsl(36 94% 57%)'; // Orange


export function MachiningTimeByFactoryChart({
  productionData,
  setupData,
  ddsData,
  loading,
}: MachiningTimeByFactoryChartProps) {
  const { chartData, series } = useMemo(() => {
    const factoryData: { [factory: string]: { [series: string]: number } } = {};
    const seriesSet = new Set<string>();

    (productionData || []).forEach(record => {
      const factory = record.factory;
      const hours = (Number(record.machiningTime) || 0) / 60;
      const operator = record.operatorId;

      if (factory && hours > 0 && operator) {
        if (!factoryData[factory]) {
            factoryData[factory] = {};
        }
        if (!factoryData[factory][operator]) {
            factoryData[factory][operator] = 0;
        }
        factoryData[factory][operator] += hours;
        seriesSet.add(operator);
      }
    });

    (setupData || []).forEach(record => {
      const factory = record.factory;
      const hours = (Number(record.timeLost) || 0) / 60;
      const seriesName = 'SETUP';

      if (factory && hours > 0) {
        if (!factoryData[factory]) {
          factoryData[factory] = {};
        }
        if (!factoryData[factory][seriesName]) {
          factoryData[factory][seriesName] = 0;
        }
        factoryData[factory][seriesName] += hours;
        seriesSet.add(seriesName);
      }
    });

    (ddsData || []).forEach(record => {
        const factory = record.factory;
        const hours = (Number(record.timeLost) || 0) / 60;
        const seriesName = 'DDS/DDSHE';
  
        if (factory && hours > 0) {
          if (!factoryData[factory]) {
            factoryData[factory] = {};
          }
          if (!factoryData[factory][seriesName]) {
            factoryData[factory][seriesName] = 0;
          }
          factoryData[factory][seriesName] += hours;
          seriesSet.add(seriesName);
        }
      });
    
    const sortedSeries = Array.from(seriesSet).sort((a, b) => {
        const isAProgrammed = a === 'SETUP' || a === 'DDS/DDSHE';
        const isBProgrammed = b === 'SETUP' || b === 'DDS/DDSHE';
        if (isAProgrammed && !isBProgrammed) return 1;
        if (!isAProgrammed && isBProgrammed) return -1;
        if (isAProgrammed && isBProgrammed) return a.localeCompare(b);
        return a.localeCompare(b);
    });

    const result = Object.keys(factoryData).map(factoryName => {
        const factoryRecord: { [key: string]: any } = { name: factoryName };
        let totalHours = 0;
        sortedSeries.forEach(s => {
            const s_hours = factoryData[factoryName][s] || 0;
            factoryRecord[s] = s_hours;
            totalHours += s_hours;
        });
        factoryRecord.total = totalHours;
        return factoryRecord;
    }).sort((a, b) => b.total - a.total);

    return { chartData: result, series: sortedSeries };
  }, [productionData, setupData, ddsData]);

  const chartConfig = series.reduce((acc, s) => {
    if (s === 'SETUP') {
        acc[s] = { label: 'SETUP', color: PROGRAMMED_LOSS_COLOR };
    } else if (s === 'DDS/DDSHE') {
        acc[s] = { label: 'DDS/DDSHE', color: PROGRAMMED_LOSS_COLOR };
    } else {
        acc[s] = {
            label: s,
            color: OPERATOR_COLORS[s] || OPERATOR_COLORS['Outro'],
        };
    }
    return acc;
  }, {} as any);
  
  const maxHours = Math.max(...chartData.map(d => d.total), 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((acc: number, item: any) => acc + item.value, 0);

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm">
          <div className="flex flex-col gap-1.5">
             <div className="flex items-center justify-between">
                <span className="text-[0.8rem] font-semibold">{label}</span>
                <span className="text-[0.75rem] text-muted-foreground font-semibold">{total.toFixed(1)}h</span>
             </div>
            <div className='flex flex-col gap-1'>
            {payload.slice().reverse().map((p: any, index: number) => (
              p.value > 0 && <div key={index} className="flex items-center justify-between gap-4">
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
      <div className="flex justify-center flex-wrap gap-4 pt-4">
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
        <CardTitle>Horas de Usinagem por Fábrica</CardTitle>
        <CardDescription>
          Total de horas de processo (usinagem e setup) para cada fábrica, com divisão por operador/tipo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[450px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={chartConfig}>
                <BarChart 
                    data={chartData} 
                    layout="vertical"
                    barSize={35} 
                    margin={{ top: 20, right: 50, left: 20, bottom: 40 }}
                >
                    <CartesianGrid horizontal={false} />
                     <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={5}
                      width={120}
                      interval={0}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <XAxis
                      type="number"
                      domain={[0, Math.ceil(maxHours / 10) * 10 + 10]}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      unit="h"
                    />
                    <ChartTooltip
                        cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                        content={<CustomTooltip />}
                    />
                    <Legend content={<CustomLegend />} />
                    {series.map((item, index) => (
                        <Bar 
                            key={item} 
                            dataKey={item} 
                            stackId="a" 
                            fill={chartConfig[item].color}
                            radius={index === series.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                        >
                           {index === series.length - 1 && (
                            <LabelList
                                dataKey="total"
                                position="right"
                                offset={8}
                                className="fill-foreground text-sm"
                                formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                            />
                        )}
                        </Bar>
                    ))}
                </BarChart>
                </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[450px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de produção ou setup para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
