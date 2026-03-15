'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
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
    label: 'Constrained Capacity Utilization',
    color: '#d35400',
  },
  oee: {
    label: 'OEE',
    color: '#009e73',
  },
};

const mockData = [
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
];

export function MonthlyOeeEvolutionChart({ loading }: MonthlyOeeEvolutionChartProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">Evolução Mensal - MMPCODE</CardTitle>
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
                  data={mockData}
                  margin={{
                    top: 40,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                  barGap={0}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={true}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 14 }}
                  />
                  <YAxis 
                    unit="%" 
                    domain={[0, 110]}
                    axisLine={true}
                    tickLine={false}
                    tickFormatter={(value) => `${value}%`}
                    label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft', offset: -10 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    formatter={(value: number) => [`${value}%`]}
                  />
                  <Legend verticalAlign="top" align="center" iconType="rect" wrapperStyle={{ paddingBottom: 20 }} />
                  
                  <Bar dataKey="asset" name="Asset Utilization" fill={chartConfig.asset.color} barSize={120}>
                    <LabelList 
                      dataKey="asset" 
                      position="top" 
                      formatter={(val: number) => `${val}%`}
                      className="fill-foreground text-xs font-semibold"
                    />
                  </Bar>
                  <Bar dataKey="capacity" name="Constrained Capacity Utilization" fill={chartConfig.capacity.color} barSize={120}>
                    <LabelList 
                      dataKey="capacity" 
                      position="top" 
                      formatter={(val: number) => `${val}%`}
                      className="fill-foreground text-xs font-semibold"
                    />
                  </Bar>
                  <Bar dataKey="oee" name="OEE" fill={chartConfig.oee.color} barSize={120}>
                    <LabelList 
                      dataKey="oee" 
                      position="top" 
                      formatter={(val: number) => `${val}%`}
                      className="fill-foreground text-xs font-semibold"
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
