'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LabelList,
  Legend,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

const REQ_COLORS = [
  '#3b82f6', '#f97316', '#a855f7', '#22c55e', '#ef4444', 
  '#eab308', '#0ea5e9', '#ec4899', '#14b8a6', '#6366f1',
  '#8b5cf6', '#d946ef', '#f43f5e', '#10b981', '#f59e0b'
];

interface ProgrammingComparisonChartProps {
  data: any[];
  uniqueRequisitions: string[];
}

export default function ProgrammingComparisonChart({ data, uniqueRequisitions }: ProgrammingComparisonChartProps) {
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      const planEntries = payload.filter((p: any) => p.dataKey.startsWith('P_'));
      const realEntries = payload.filter((p: any) => p.dataKey.startsWith('R_'));

      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[16rem]">
          <p className="font-bold text-sm mb-2 border-b pb-1">{label} - {pData.fullDate}</p>
          <div className="space-y-4">
            <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Planejado (Total: {pData.totalPlan.toFixed(1)}h)</p>
                <div className="space-y-1">
                    {planEntries.map((entry: any) => (
                        <div key={entry.dataKey} className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[10px] text-foreground">Forms {entry.dataKey.replace('P_', '')}:</span>
                            </div>
                            <span className="text-[10px] font-black">{Number(entry.value).toFixed(1)}h</span>
                        </div>
                    ))}
                </div>
            </div>
            {pData.totalReal > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Realizado (Total: {pData.totalReal.toFixed(1)}h)</p>
                    <div className="space-y-1">
                        {realEntries.map((entry: any) => (
                            <div key={entry.dataKey} className="flex justify-between items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[10px] text-foreground">Forms {entry.dataKey.replace('R_', '')}:</span>
                                </div>
                                <span className="text-[10px] font-black text-blue-400">{Number(entry.value).toFixed(1)}h</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex items-center justify-center gap-6 mt-4 mb-2">
        <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-muted-foreground opacity-30 rounded-sm" />
            <span className="text-[10px] font-black uppercase text-muted-foreground">Planejado</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 opacity-60 rounded-sm" />
            <span className="text-[10px] font-black uppercase text-blue-400">Realizado</span>
        </div>
    </div>
  );

  return (
    <div className="h-[600px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={{}}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 60, left: 40, bottom: 20 }}
            barGap={8}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              type="number"
              unit="h"
              tickLine={false}
              axisLine={false}
              className="text-[10px]"
            />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={60}
              className="text-[10px] font-black uppercase"
            />
            <RechartsTooltip 
              cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
              content={<CustomChartTooltip />}
            />
            <Legend content={<CustomLegend />} verticalAlign="top" />
            
            {uniqueRequisitions.map((req, idx) => {
              const color = REQ_COLORS[idx % REQ_COLORS.length];
              return (
                <React.Fragment key={req}>
                  <Bar 
                      dataKey={`P_${req}`} 
                      stackId="plan" 
                      fill={color} 
                      radius={[0, 4, 4, 0]}
                      barSize={25}
                  >
                      <LabelList 
                          dataKey={`P_${req}`} 
                          position="inside" 
                          formatter={(v: any) => v > 0.4 ? req : ''} 
                          className="fill-white text-[9px] font-black"
                      />
                      {idx === uniqueRequisitions.length - 1 && (
                          <LabelList
                            dataKey="totalPlan"
                            position="right"
                            offset={8}
                            formatter={(v: number) => v > 0 ? `${v.toFixed(1)}h` : ''}
                            className="fill-muted-foreground text-[8px] font-bold"
                          />
                      )}
                  </Bar>
                  <Bar 
                      dataKey={`R_${req}`} 
                      stackId="real" 
                      fill={color} 
                      opacity={0.6}
                      radius={[0, 4, 4, 0]}
                      barSize={25}
                  >
                      <LabelList 
                          dataKey={`R_${req}`} 
                          position="inside" 
                          formatter={(v: any) => v > 0.4 ? req : ''} 
                          className="fill-white text-[9px] font-black"
                      />
                      {idx === uniqueRequisitions.length - 1 && (
                          <LabelList
                            dataKey="totalReal"
                            position="right"
                            offset={8}
                            formatter={(v: number) => v > 0 ? `${v.toFixed(1)}h` : ''}
                            className="fill-blue-400 text-[8px] font-bold"
                          />
                      )}
                  </Bar>
                </React.Fragment>
              );
            })}
          </BarChart>
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
