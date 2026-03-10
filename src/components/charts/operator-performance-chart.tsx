
'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface OperatorPerformanceChartProps {
  productionData: any[];
  lossData: any[];
  plannedData: any[];
  loading: boolean;
  selectedOperator: string | null;
  onOperatorSelect: (operator: string | null) => void;
}

const OPERATOR_COLORS: { [key: string]: string } = {
  'Daniel Solivo': 'hsl(var(--chart-1))',
  'Rodrigo Cantano': 'hsl(var(--chart-2))',
  'Gustavo Gozzi': 'hsl(var(--chart-3))',
  'William Martinucci': 'hsl(var(--chart-4))',
  'Nathan Xavier': 'hsl(var(--chart-5))',
  'Outro': 'hsl(var(--chart-6))',
};

export function OperatorPerformanceChart({
  productionData,
  lossData,
  plannedData,
  loading,
  selectedOperator,
  onOperatorSelect,
}: OperatorPerformanceChartProps) {
  
  const normalizeOperatorName = (name: any) => {
    if (!name) return '';
    const trimmed = String(name).trim();
    if (trimmed === 'Gustavo') return 'Gustavo Gozzi';
    if (trimmed === 'Daniel') return 'Daniel Solivo';
    if (trimmed === 'Rodrigo') return 'Rodrigo Cantano';
    if (trimmed === 'William') return 'William Martinucci';
    if (trimmed === 'Nathan') return 'Nathan Xavier';
    return trimmed;
  };

  const chartData = useMemo(() => {
    const operatorStats: { [key: string]: { plan: number; real: number } } = {};

    // Coletar dados reais (Firestore)
    productionData.forEach(record => {
      const name = normalizeOperatorName(record.operatorId || record['Técnicos']);
      if (name) {
        if (!operatorStats[name]) operatorStats[name] = { plan: 0, real: 0 };
        operatorStats[name].real += Number(record.machiningTime || 0) / 60;
      }
    });

    lossData.forEach(record => {
      const name = normalizeOperatorName(record.operatorId || record['Técnicos']);
      if (name) {
        if (!operatorStats[name]) operatorStats[name] = { plan: 0, real: 0 };
        operatorStats[name].real += Number(record.timeLost || 0) / 60;
      }
    });

    // Coletar dados planejados (Realtime DB)
    plannedData.forEach(record => {
      const name = normalizeOperatorName(record['Técnicos'] || record['Técnico'] || record.operatorId);
      if (name) {
        if (!operatorStats[name]) operatorStats[name] = { plan: 0, real: 0 };
        const machineHours = typeof record['Horas Máquina'] === 'string' 
            ? parseFloat(record['Horas Máquina'].replace(',', '.')) 
            : (Number(record['Horas Máquina']) || 0);
        operatorStats[name].plan += machineHours;
      }
    });

    return Object.keys(operatorStats)
      .map(operator => ({
        name: operator,
        plan: operatorStats[operator].plan,
        real: operatorStats[operator].real,
        fill: OPERATOR_COLORS[operator] || OPERATOR_COLORS['Outro'],
      }))
      .sort((a, b) => (b.real + b.plan) - (a.real + a.plan));
  }, [productionData, lossData, plannedData]);

  const chartConfig = {
    plan: {
      label: 'Planejado (Plan)',
      color: '#444444',
    },
    real: {
      label: 'Realizado (Real)',
    }
  };
  
  const maxVal = Math.max(...chartData.map(d => Math.max(d.plan, d.real)), 0);
  const xAxisDomainMax = Math.max(8, Math.ceil(maxVal) + 1);

  return (
        loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart 
                    data={chartData} 
                    layout="vertical" 
                    barGap={4}
                    margin={{ top: 20, right: 40, left: 40, bottom: 20 }}
                    onClick={(e) => onOperatorSelect(e?.activeLabel || null)}
                >
                  <CartesianGrid horizontal={false} />
                   <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={120}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                  <XAxis
                    type="number"
                    domain={[0, xAxisDomainMax]}
                    unit="h"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                    content={<ChartTooltipContent 
                        indicator="dot"
                    />}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <ReferenceLine 
                    x={7} 
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                  >
                     <Label 
                        value="Meta: 7h" 
                        position="top"
                        fill="#ef4444"
                        fontSize={12}
                      />
                  </ReferenceLine>
                  
                  {/* Barra Planejado */}
                  <Bar dataKey="plan" name="Planejado (Plan)" fill="#444444" radius={[0, 4, 4, 0]} barSize={15}>
                     <LabelList
                        dataKey="plan"
                        position="right"
                        offset={8}
                        className="fill-muted-foreground text-[10px]"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                      />
                  </Bar>

                  {/* Barra Realizado */}
                  <Bar dataKey="real" name="Realizado (Real)" barSize={15} radius={[0, 4, 4, 0]}>
                       {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            cursor="pointer"
                            fill={entry.fill}
                            opacity={
                                selectedOperator && selectedOperator !== 'all'
                                ? selectedOperator === entry.name
                                    ? 1
                                    : 0.3
                                : 1
                            }
                        />
                        ))}
                        <LabelList
                        dataKey="real"
                        position="right"
                        offset={8}
                        className="fill-foreground text-[10px] font-bold"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''}
                      />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[350px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado para exibir o desempenho dos técnicos.
            </p>
          </div>
        )
  );
}
