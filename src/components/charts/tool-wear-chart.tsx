'use client';

import type { MachiningRecord } from '@/lib/types';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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
import { format } from 'date-fns';

interface ToolWearChartProps {
  data: MachiningRecord[];
}

export function ToolWearChart({ data }: ToolWearChartProps) {
  const chartData = data
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(record => ({
      date: new Date(record.timestamp),
      toolWear: record.toolWear,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Wear Over Time</CardTitle>
        <CardDescription>
          Trend line showing the progression of tool wear across machining operations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ChartContainer config={{
            toolWear: {
              label: 'Tool Wear',
              color: 'hsl(var(--primary))',
            },
          }}>
            <AreaChart
              data={chartData}
              margin={{
                top: 5,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(tick) => format(tick, 'MMM d')}
                tickLine={false}
                axisLine={false}
              />
              <YAxis unit="mm" tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 2, strokeDasharray: '3 3' }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <defs>
                  <linearGradient id="colorToolWear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-toolWear)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-toolWear)" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              <Area
                type="monotone"
                dataKey="toolWear"
                stroke="var(--color-toolWear)"
                fillOpacity={1} 
                fill="url(#colorToolWear)"
                strokeWidth={2}
                name="Tool Wear (mm)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
