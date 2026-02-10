'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
  Cell,
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
import { Loader } from 'lucide-react';

interface DailyPdlMplLossChartProps {
  lossData: any[];
  loading: boolean;
  isWeekView?: boolean;
  isDayView?: boolean;
}

const pdlReasons = [
  "MANUTENÇÃO PLANEJADA",
  "TEMPO DE CAFÉ",
  "LIMPEZA PLANEJADA",
  "SETUP",
  "DDS, APONTAMENTO HORAS, ATIVIDADE ADM",
  "INSPEÇÃO & VALIDAÇÃO DAS PEÇAS"
].map(r => r.toUpperCase().trim());

const mplReasons = [
  "QUEBRA",
  "FALHA DE PROCESSO",
  "ABSENTEÍSMO",
  "FALTA DE MATERIAL & FERRAMENTA",
  "MOVIMENTAÇÃO DE PEÇAS E EQUIPAMENTOS",
  "PEQUENAS PARADAS",
  "AJUSTES CORRETIVOS DE PROCESSOS",
  "VELOCIDADE REDUZIDA (PROBLEMA DE MÁQUINA)",
  "RETRABALHO"
].map(r => r.toUpperCase().trim());

const chartConfig = {
  pdl: {
    label: 'PDL (Planejada)',
    color: 'hsl(142 71% 45%)', // green
  },
  mpl: {
    label: 'MPL (Não Planejada)',
    color: 'hsl(48 96% 51%)', // yellow
  },
  total: {
      label: 'Total',
      color: 'hsl(221 83% 53%)', // blue
  }
};

export function DailyPdlMplLossChart({
  lossData,
  loading,
}: DailyPdlMplLossChartProps) {
  const { chartData, totalPdlHours, totalMplHours } = useMemo(() => {
    if (!lossData) {
      return { chartData: [], totalPdlHours: 0, totalMplHours: 0 };
    }

    let pdlTotal = 0;
    let mplTotal = 0;

    lossData.forEach(record => {
      if (record.lossReason && record.timeLost) {
        const reason = String(record.lossReason).toUpperCase().trim();
        const timeInHours = (Number(record.timeLost) || 0) / 60;

        if (pdlReasons.includes(reason)) {
          pdlTotal += timeInHours;
        } else if (mplReasons.includes(reason)) {
          mplTotal += timeInHours;
        }
      }
    });

    const waterfallData: {name: string, start: number, value: number, color: string}[] = [];
    
    waterfallData.push({
      name: 'PDL',
      start: 0,
      value: pdlTotal,
      color: chartConfig.pdl.color,
    });
    
    waterfallData.push({
      name: 'MPL',
      start: pdlTotal,
      value: mplTotal,
      color: chartConfig.mpl.color,
    });

    waterfallData.push({
      name: 'Total',
      start: 0,
      value: pdlTotal + mplTotal,
      color: chartConfig.total.color,
    });

    return { chartData: waterfallData, totalPdlHours: pdlTotal, totalMplHours: mplTotal };

  }, [lossData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload.find((p: any) => p.dataKey === 'value')?.value || 0;
      let description = '';
      if(label === 'PDL') description = 'Perda por Parada Planejada';
      if(label === 'MPL') description = 'Perda do Processo de Manufatura';
      if(label === 'Total') description = 'Perda Total';

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[12rem]">
          <div className="grid gap-1.5">
            <p className="font-semibold">{label}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            <div className="flex items-center gap-2 mt-1">
                <div className="flex justify-between flex-1">
                    <span className="text-muted-foreground">Horas</span>
                    <span className="font-bold">{value.toFixed(1)}h</span>
                </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  const totalLoss = totalPdlHours + totalMplHours;
  const maxHours = totalLoss > 0 ? Math.ceil(totalLoss / 5) * 5 + 5 : 10;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Análise de Perdas em Cascata (PDL vs MPL)</CardTitle>
                <CardDescription>Análise em cascata das perdas planejadas e não planejadas.</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold" style={{color: chartConfig.pdl.color}}>{totalPdlHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Perda Planejada (PDL)</p>
                <p className="text-sm font-bold mt-1" style={{color: chartConfig.mpl.color}}>{totalMplHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Perda Não Planejada (MPL)</p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 1 ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="name"
                    interval={0}
                    height={40}
                    tick={{fontSize: 12}}
                  />
                  <YAxis 
                    unit="h" 
                    domain={[0, maxHours]}
                    allowDecimals={false}
                  />
                  <ChartTooltip 
                    cursor={{fill: 'hsl(var(--accent))', radius: 4}}
                    content={<CustomTooltip />}
                  />
                  
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
                    <LabelList 
                        dataKey="value" 
                        position="top"
                        formatter={(value: number) => value > 0.05 ? `${value.toFixed(1)}h` : ''}
                        className="text-xs fill-muted-foreground"
                    />
                     {chartData.map((entry, index) => {
                        return <Cell key={`cell-${index}`} fill={entry.color} />;
                    })}
                  </Bar>
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
