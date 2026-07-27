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
  LabelList,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface TimePerRequisitionChartProps {
  data: any[];
  loading: boolean;
}

export function TimePerRequisitionChart({ data, loading }: TimePerRequisitionChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    const grouped = data.reduce((acc: any, record) => {
      const form = record.formsNumber || 'S/N';
      if (!acc[form]) {
        acc[form] = { formsNumber: form, totalHours: 0, technicians: new Set() };
      }
      acc[form].totalHours += (Number(record.machiningTime) || 0) / 60;
      if (record.operatorId) acc[form].technicians.add(record.operatorId);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((item: any) => ({
        ...item,
        technicianList: Array.from(item.technicians).join(', '),
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 20); // Mostrar top 20 requisições por tempo
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[12rem]">
          <p className="font-bold text-sm mb-1">Requisição: {label}</p>
          <div className="flex justify-between items-center border-b pb-1 mb-1">
            <span className="text-xs text-muted-foreground">Tempo Total:</span>
            <span className="text-xs font-black">{p.totalHours.toFixed(1)}h</span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Técnicos: {p.technicianList}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo Real por Requisição</CardTitle>
        <CardDescription>
          Horas de usinagem acumuladas por número de formulário (Top 20).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[400px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ hours: { label: 'Horas Reais', color: '#ffffff' } }}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 50, left: 40, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="formsNumber"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    className="text-[10px] font-bold"
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
                  <Bar dataKey="totalHours" fill="#ffffff" radius={[0, 4, 4, 0]} barSize={20}>
                    <LabelList
                      dataKey="totalHours"
                      position="right"
                      formatter={(v: number) => `${v.toFixed(1)}h`}
                      className="fill-foreground text-[10px] font-bold"
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
            Nenhum registro de produção com "Número do forms" encontrado.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
