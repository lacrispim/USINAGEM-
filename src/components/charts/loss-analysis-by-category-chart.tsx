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
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface LossAnalysisByCategoryChartProps {
  lossData: any[];
  loading: boolean;
}

const CATEGORY_CONFIG: { [key: string]: { color: string; reasons: string[] } } = {
  'Perdas de Processo': {
    color: 'hsl(var(--chart-1))',
    reasons: ['SETUP', 'DDSHE', 'Limpeza'],
  },
  'Perdas de Disponibilidade': {
    color: 'hsl(var(--chart-2))',
    reasons: ['Manutenção Corretiva', 'Falta de Ferramenta', 'Falta de Material'],
  },
  'Outras Atividades': {
    color: 'hsl(var(--chart-3))',
    reasons: ['Treinamento', 'Reunião'],
  },
   'Não Categorizado': {
    color: 'hsl(var(--chart-5))',
    reasons: [], // 'Outro' e outros não mapeados
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalHours = payload[0].value;
      
      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm">
          <div className="flex flex-col gap-1.5">
             <div className="flex items-center justify-between">
                <span className="text-[0.8rem] font-semibold">{label}</span>
                <span className="text-[0.75rem] text-muted-foreground font-semibold">{totalHours.toFixed(1)}h</span>
             </div>
            <div className='flex flex-col gap-1 mt-1 border-t pt-1'>
            {Object.entries(data.details)
              .filter(([, hours]) => (hours as number) > 0)
              .map(([reason, hours]) => (
                <div key={reason} className="flex items-center justify-between gap-4">
                  <span className="text-[0.8rem] text-muted-foreground">{reason}</span>
                  <span className="font-bold text-right text-[0.8rem]">{(hours as number).toFixed(1)}h</span>
                </div>
            ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };


export function LossAnalysisByCategoryChart({
  lossData,
  loading,
}: LossAnalysisByCategoryChartProps) {
  const chartData = useMemo(() => {
    if (!lossData) {
      return [];
    }

    const categoryTotals: { [key: string]: { totalHours: number; details: { [reason: string]: number } } } = {};

    // Initialize categories
    Object.keys(CATEGORY_CONFIG).forEach(cat => {
        categoryTotals[cat] = { totalHours: 0, details: {} };
    });

    lossData.forEach(record => {
      const reason = record.lossReason || 'Não especificado';
      const timeInHours = (Number(record.timeLost) || 0) / 60;
      let assignedCategory = 'Não Categorizado';

      for (const category in CATEGORY_CONFIG) {
        if (CATEGORY_CONFIG[category].reasons.includes(reason)) {
          assignedCategory = category;
          break;
        }
      }
      
      // if reason is not in any category, but it is not 'Outro', it goes to 'Não Categorizado'
       if (assignedCategory === 'Não Categorizado' && reason !== 'Não especificado') {
            const isOther = !Object.values(CATEGORY_CONFIG).some(c => c.reasons.includes(reason));
            if(isOther) assignedCategory = 'Não Categorizado';
       }


      if (!categoryTotals[assignedCategory]) {
        categoryTotals[assignedCategory] = { totalHours: 0, details: {} };
      }
      if (!categoryTotals[assignedCategory].details[reason]) {
        categoryTotals[assignedCategory].details[reason] = 0;
      }

      categoryTotals[assignedCategory].totalHours += timeInHours;
      categoryTotals[assignedCategory].details[reason] += timeInHours;
    });

    return Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        hours: data.totalHours,
        details: data.details,
        fill: CATEGORY_CONFIG[name]?.color || CATEGORY_CONFIG['Não Categorizado'].color,
      }))
      .filter(item => item.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [lossData]);

  const chartConfig = chartData.reduce((acc, { name, fill }) => {
    acc[name] = {
      label: name,
      color: fill,
    };
    return acc;
  }, {} as any);

  const maxHours = Math.max(...chartData.map(d => d.hours), 0);
  const xAxisDomainMax = Math.ceil(maxHours) + 1;


  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Perdas por Categoria (OEE)</CardTitle>
        <CardDescription>
          Tempo total de perda agrupado por categorias de OEE.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart 
                    data={chartData} 
                    layout="vertical" 
                    barSize={40}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} />
                   <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={5}
                      width={150}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      interval={0}
                    />
                  <XAxis
                    type="number"
                    dataKey="hours"
                    domain={[0, xAxisDomainMax]}
                    unit="h"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                    content={<CustomTooltip />}
                  />
                  <Bar dataKey="hours" layout="vertical" radius={4} />
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[350px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de perda para exibir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
