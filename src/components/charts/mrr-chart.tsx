'use client';

import type { MachiningRecord } from '@/lib/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface MrrChartProps {
  data: MachiningRecord[];
}

export function MrrChart({ data }: MrrChartProps) {
  const toolData = data.reduce((acc, record) => {
    if (!acc[record.tool]) {
      acc[record.tool] = { totalMrr: 0, count: 0 };
    }
    acc[record.tool].totalMrr += record.materialRemovalRate;
    acc[record.tool].count += 1;
    return acc;
  }, {} as Record<string, { totalMrr: number; count: number }>);

  const chartData = Object.entries(toolData).map(([tool, { totalMrr, count }]) => ({
    name: tool,
    mrr: totalMrr / count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Removal Rate</CardTitle>
        <CardDescription>Average MRR (cm³/min) for each cutting tool.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ChartContainer config={{
            mrr: {
              label: 'Avg. MRR',
              color: 'hsl(var(--accent))',
            }
          }}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
              />
              <YAxis unit=" cm³" tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--accent))', fillOpacity: 0.2 }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="mrr" fill="var(--color-mrr)" radius={[4, 4, 0, 0]} name="Avg. MRR"/>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
