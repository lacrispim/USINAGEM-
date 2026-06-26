'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, LabelList } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AvailableVsActualChartProps {
  data: any[];
  loading: boolean;
}

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
    'PRODUCAO': { label: 'Usinagem', color: '#ffffff' },
    'PROGRAMACAO': { label: 'Programação', color: '#a855f7' },
    'SETUP': { label: 'Setup', color: '#ef4444' },
    'TEMPO DE CAFÉ': { label: 'Café', color: '#eab308' },
    'LIMPEZA PLANEJADA': { label: 'Limpeza', color: '#22c55e' },
    'DDS, APONTAMENTO HORAS, ATIVIDADE ADM': { label: 'Ativ. ADM', color: '#f97316' },
    'INSPEÇÃO & VALIDAÇÃO DAS PEÇAS': { label: 'Qualidade', color: '#3b82f6' },
    'MANUTENÇÃO PLANEJADA': { label: 'Manutenção', color: '#7c3aed' },
    'AUXÍLIO AS FÁBRICAS': { label: 'Aux. Fábricas', color: '#0ea5e9' },
};

const DEFAULT_COLOR = '#6b7280';
const AVAILABLE_COLOR = '#3b82f6'; // Azul para Disponível

export function AvailableVsActualChart({
  data,
  loading,
}: AvailableVsActualChartProps) {

  const totals = useMemo(() => {
    const totalDisponivel = data.reduce((acc, curr) => acc + (curr.totalDisponivel || 0), 0);
    const totalRealizado = data.reduce((acc, curr) => acc + (curr.totalRealizado || 0), 0);
    return { totalDisponivel, totalRealizado };
  }, [data]);

  const dynamicCategories = useMemo(() => {
    const keysSet = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k.startsWith('real_')) {
          const reason = k.replace('real_', '');
          keysSet.add(reason);
        }
      });
    });

    return Array.from(keysSet).sort((a, b) => {
        if (a === 'PRODUCAO') return -1;
        if (b === 'PRODUCAO') return 1;
        return a.localeCompare(b);
    }).map(reason => ({
        key: reason,
        label: CATEGORY_STYLES[reason]?.label || reason,
        color: CATEGORY_STYLES[reason]?.color || DEFAULT_COLOR
    }));
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: any = {
        totalDisponivel: { label: 'Disponível', color: AVAILABLE_COLOR }
    };
    dynamicCategories.forEach(cat => {
        config[`real_${cat.key}`] = { label: cat.label, color: cat.color };
    });
    return config;
  }, [dynamicCategories]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const available = p.totalDisponivel || 0;
      const realized = p.totalRealizado || 0;
      const utilization = available > 0 ? (realized / available) * 100 : 0;

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[18rem]">
          <p className="font-semibold text-lg mb-2">{label}</p>
          
          <div className="flex justify-between items-center border-b pb-1 mb-2">
            <span className="text-sm font-medium text-blue-400">Capacidade Disponível</span>
            <span className="font-bold">{available.toFixed(1)}h</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Realizado (Total)</span>
              <span className="font-bold">{realized.toFixed(1)}h</span>
            </div>
            <div className="pl-3 flex flex-col gap-0.5">
              {dynamicCategories.map(cat => {
                const val = p[`real_${cat.key}`] || 0;
                if (val <= 0) return null;
                return (
                  <div key={cat.key} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <div className="flex justify-between flex-1">
                      <span className="text-muted-foreground text-[10px]">{cat.label}</span>
                      <span className="font-bold text-[10px]">{val.toFixed(1)}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Utilização da Capacidade</span>
            <span className={cn("text-xs font-black", utilization > 90 ? "text-red-400" : "text-green-400")}>
                {utilization.toFixed(1)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Disponível vs Realizado</CardTitle>
          </div>
          <div className="text-right">
             <p className="text-2xl font-bold text-blue-500">{totals.totalDisponivel.toFixed(1)}h</p>
             <p className="text-xs text-muted-foreground uppercase font-bold">Capacidade Total</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[400px] w-full items-center justify-center"><Loader className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig}>
                <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 40 }} barGap={4}>
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={35} 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0} 
                    height={120} 
                    className="text-[10px] font-bold uppercase" 
                  />
                  <YAxis unit="h" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={48} />
                  
                  <Bar name="Disponível" dataKey="totalDisponivel" fill={AVAILABLE_COLOR} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="totalDisponivel" position="top" className="fill-blue-400 text-[10px] font-bold" formatter={(v: number) => v > 0 ? `${v}h` : ''} />
                  </Bar>

                  {dynamicCategories.map((cat, idx) => (
                    <Bar 
                      key={cat.key} 
                      name={cat.label}
                      dataKey={`real_${cat.key}`} 
                      stackId="realizado" 
                      fill={cat.color}
                      radius={idx === dynamicCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
