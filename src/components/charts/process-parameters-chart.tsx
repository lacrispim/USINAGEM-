'use client';

import type { MachiningRecord } from '@/lib/types';
import {
  Scatter,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartTooltipContent } from '@/components/ui/chart';

interface ProcessParametersChartProps {
  data: MachiningRecord[];
}

export function ProcessParametersChart({ data }: ProcessParametersChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Parameters Analysis</CardTitle>
        <CardDescription>
          Cutting speed vs. surface finish for all materials.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{
                top: 5,
                right: 20,
                bottom: 20,
                left: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="cuttingSpeed"
                name="Cutting Speed"
                unit=" m/min"
                label={{ value: 'Cutting Speed (m/min)', position: 'insideBottom', offset: -15 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="surfaceFinish"
                name="Surface Finish"
                unit=" Ra"
                label={{ value: 'Surface Finish (Ra)', angle: -90, position: 'insideLeft', offset: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis type="category" dataKey="material" name="Material" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={<ChartTooltipContent />}
              />
              <Scatter data={data} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
