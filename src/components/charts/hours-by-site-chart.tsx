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
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface HoursBySiteChartProps {
  data: any[];
  loading: boolean;
}

// Color palette for technicians
const TECHNICIAN_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
];


export function HoursBySiteChart({
  data,
  loading,
}: HoursBySiteChartProps) {
    const { chartData, technicians } = useMemo(() => {
    if (!data) {
      return { chartData: [], technicians: [] };
    }

    const siteData: { [site: string]: { [technician: string]: number } } = {};
    const technicianSet = new Set<string>();

    data.forEach(record => {
      const site = record['Site'];
      const hours = Number(record['Horas Máquina']) || 0;
      const techsString = record['Técnicos'];

      if (site && hours > 0 && techsString) {
        // Split by comma and trim whitespace
        const techList = techsString.split(',').map((t: string) => t.trim()).filter(Boolean);
        
        if (techList.length > 0) {
            // Divide hours equally among technicians for a given record
            const hoursPerTech = hours / techList.length;
            techList.forEach((tech: string) => {
                if (!siteData[site]) {
                    siteData[site] = {};
                }
                if (!siteData[site][tech]) {
                    siteData[site][tech] = 0;
                }
                siteData[site][tech] += hoursPerTech;
                technicianSet.add(tech);
            });
        }
      }
    });
    
    const sortedTechnicians = Array.from(technicianSet).sort();

    const result = Object.keys(siteData).map(siteName => {
        const siteRecord: { [key: string]: any } = { name: siteName };
        let totalHours = 0;
        sortedTechnicians.forEach(tech => {
            const techHours = siteData[siteName][tech] || 0;
            siteRecord[tech] = techHours;
            totalHours += techHours;
        });
        siteRecord.total = totalHours; // Add total for sorting
        return siteRecord;
    }).sort((a, b) => b.total - a.total); // Sort sites by total hours descending for horizontal chart

    return { chartData: result, technicians: sortedTechnicians };
  }, [data]);

  const chartConfig = technicians.reduce((acc, tech, index) => {
    acc[tech] = {
      label: tech,
      color: TECHNICIAN_COLORS[index % TECHNICIAN_COLORS.length],
    };
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
      <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 pt-4">
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
        <CardTitle>Horas Planejadas de Máquina por Fábrica</CardTitle>
        <CardDescription>
          Total de horas de máquina planejadas para cada fábrica, com divisão por técnico.
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
                      width={100}
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
                    {technicians.map((tech, index) => (
                        <Bar 
                            key={tech} 
                            dataKey={tech} 
                            stackId="a" 
                            fill={chartConfig[tech].color}
                            radius={index === 0 ? [0, 4, 4, 0] : [0, 0, 0, 0]} 
                        />
                    ))}
                    <LabelList
                        dataKey="total"
                        position="right"
                        offset={8}
                        className="fill-foreground text-sm"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                      />
                </BarChart>
                </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[450px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de planejamento para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
