'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
  Legend,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from 'lucide-react';

interface MonthlyOeeEvolutionChartProps {
  loading: boolean;
}

const chartConfig = {
  asset: {
    label: 'Asset Utilization',
    color: '#0072af',
  },
  capacity: {
    label: 'Capacity Utilization',
    color: '#d35400',
  },
  oee: {
    label: 'OEE',
    color: '#009e73',
  },
};

// Estrutura de dados para ambas as máquinas
const oeeDataByMachine: Record<string, any[]> = {
  'CENTRO DE USINAGEM D600': [
    {
      month: 'Janeiro',
      asset: 39,
      capacity: 100,
      oee: 88,
    },
    {
      month: 'Fevereiro',
      asset: 44,
      capacity: 100,
      oee: 79,
    },
  ],
  'TORNO CNC CENTUR 30': [
    {
      month: 'Janeiro',
      asset: 40,
      capacity: 100,
      oee: 89,
    },
    {
      month: 'Fevereiro',
      asset: 43,
      capacity: 100,
      oee: 77,
    },
  ],
};

export function MonthlyOeeEvolutionChart({ loading }: MonthlyOeeEvolutionChartProps) {
  const [selectedMachine, setSelectedMachine] = useState('CENTRO DE USINAGEM D600');

  const activeData = useMemo(() => {
    return oeeDataByMachine[selectedMachine] || [];
  }, [selectedMachine]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[12rem]">
          <div className="grid gap-1.5">
            <p className="font-semibold text-lg mb-2">{label}</p>
            {payload.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                <div className="flex justify-between flex-1">
                  <span className="text-muted-foreground text-xs">{item.name}</span>
                  <span className="font-bold text-xs">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chartConfig.asset.color }} />
        <span className="text-[10px] text-muted-foreground uppercase font-bold">Asset Utilization</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chartConfig.capacity.color }} />
        <span className="text-[10px] text-muted-foreground uppercase font-bold">Capacity Utilization</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chartConfig.oee.color }} />
        <span className="text-[10px] text-muted-foreground uppercase font-bold">OEE</span>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle>Evolução Mensal - MMPCODE</CardTitle>
                <CardDescription>
                  Indicadores de utilização e eficiência global (OEE) por mês.
                </CardDescription>
            </div>
            <Tabs 
              value={selectedMachine} 
              onValueChange={setSelectedMachine}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-2 w-full sm:w-[400px]">
                <TabsTrigger value="CENTRO DE USINAGEM D600" className="text-[10px] uppercase font-bold">D600</TabsTrigger>
                <TabsTrigger value="TORNO CNC CENTUR 30" className="text-[10px] uppercase font-bold">Centur 30</TabsTrigger>
              </TabsList>
            </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[450px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig}>
                <BarChart
                  data={activeData}
                  margin={{
                    top: 40,
                    right: 20,
                    left: 0,
                    bottom: 20,
                  }}
                  barGap={8}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    className="text-[10px] font-bold uppercase"
                  />
                  <YAxis 
                    unit="%" 
                    domain={[0, 110]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip 
                    cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
                    content={<CustomTooltip />}
                  />
                  <Legend content={<CustomLegend />} />
                  
                  <Bar 
                    dataKey="asset" 
                    name="Asset Utilization" 
                    fill={chartConfig.asset.color} 
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList 
                      dataKey="asset" 
                      position="top" 
                      offset={10}
                      formatter={(val: number) => val > 0 ? `${val}%` : ''}
                      className="fill-foreground text-xs font-bold"
                    />
                  </Bar>
                  <Bar 
                    dataKey="capacity" 
                    name="Capacity Utilization" 
                    fill={chartConfig.capacity.color} 
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList 
                      dataKey="capacity" 
                      position="top" 
                      offset={10}
                      formatter={(val: number) => val > 0 ? `${val}%` : ''}
                      className="fill-foreground text-xs font-bold"
                    />
                  </Bar>
                  <Bar 
                    dataKey="oee" 
                    name="OEE" 
                    fill={chartConfig.oee.color} 
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList 
                      dataKey="oee" 
                      position="top" 
                      offset={10}
                      formatter={(val: number) => val > 0 ? `${val}%` : ''}
                      className="fill-foreground text-xs font-bold"
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
