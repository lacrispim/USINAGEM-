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
  "RETRABALHO",
  "SERVIÇOS DE BANCADA/SERRA",
  "AUXÍLIO EM MAQUINA",
  "AUXÍLIO AS FÁBRICAS"
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
    const pdlBreakdown: Record<string, number> = {};
    const mplBreakdown: Record<string, number> = {};

    lossData.forEach(record => {
      if (record.lossReason && record.timeLost) {
        const reason = String(record.lossReason).toUpperCase().trim();
        const timeInHours = (Number(record.timeLost) || 0) / 60;

        if (pdlReasons.includes(reason)) {
          pdlTotal += timeInHours;
          pdlBreakdown[reason] = (pdlBreakdown[reason] || 0) + timeInHours;
        } else if (mplReasons.includes(reason)) {
          mplTotal += timeInHours;
          mplBreakdown[reason] = (mplBreakdown[reason] || 0) + timeInHours;
        }
      }
    });

    const waterfallData: {name: string, start: number, value: number, color: string, breakdown: any}[] = [];
    
    waterfallData.push({
      name: 'PDL',
      start: 0,
      value: pdlTotal,
      color: chartConfig.pdl.color,
      breakdown: pdlBreakdown
    });
    
    waterfallData.push({
      name: 'MPL',
      start: pdlTotal,
      value: mplTotal,
      color: chartConfig.mpl.color,
      breakdown: mplBreakdown
    });

    waterfallData.push({
      name: 'Total',
      start: 0,
      value: pdlTotal + mplTotal,
      color: chartConfig.total.color,
      breakdown: { ...pdlBreakdown, ...mplBreakdown }
    });

    return { chartData: waterfallData, totalPdlHours: pdlTotal, totalMplHours: mplTotal };

  }, [lossData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload.find((item: any) => item.dataKey === 'value')?.payload;
      if (!p) return null;

      const value = p.value || 0;
      const breakdown = p.breakdown || {};
      const sortedBreakdown = Object.entries(breakdown)
        .sort(([, a]: any, [, b]: any) => b - a)
        .filter(([, v]: any) => v > 0);

      let description = '';
      if(label === 'PDL') description = 'Perda por Parada Planejada';
      if(label === 'MPL') description = 'Perda do Processo de Manufatura';
      if(label === 'Total') description = 'Perda Total acumulada';

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[14rem]">
          <div className="grid gap-1.5">
            <p className="font-semibold">{label}</p>
            {description && <p className="text-[10px] text-muted-foreground uppercase font-bold">{description}</p>}
            
            <div className="flex justify-between items-center border-b pb-1 mb-1 mt-1">
              <span className="text-xs text-muted-foreground">Horas Totais</span>
              <span className="text-xs font-bold">{value.toFixed(1)}h</span>
            </div>

            {sortedBreakdown.length > 0 && (
              <div className="grid gap-1">
                {sortedBreakdown.map(([reason, hours]: any) => (
                  <div key={reason} className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5 max-w-[150px]">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-muted-foreground truncate" title={reason}>
                        {reason}
                        </span>
                    </div>
                    <span className="font-medium tabular-nums">{hours.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            )}
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
                <CardDescription>Análise detalhada das perdas planejadas e não planejadas.</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold" style={{color: chartConfig.pdl.color}}>{totalPdlHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">PDL</p>
                <p className="text-sm font-bold mt-1" style={{color: chartConfig.mpl.color}}>{totalMplHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">MPL</p>
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
                    className="text-[10px] font-bold uppercase"
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
                        className="text-xs fill-foreground font-bold"
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
