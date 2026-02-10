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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  value: {
    label: 'Horas',
  },
};

export function DailyPdlMplLossChart({
  lossData,
  loading,
  isWeekView,
  isDayView,
}: DailyPdlMplLossChartProps) {
  const { chartData, maxHours } = useMemo(() => {
    if (!lossData) {
      return { chartData: [], maxHours: 10 };
    }

    const dailyData: { [date: string]: { pdl: number; mpl: number } } = {};

    lossData.forEach(record => {
      if (record.lossReason && record.date && record.date.toDate) {
        const dateObj = record.date.toDate();
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        const reason = String(record.lossReason).toUpperCase().trim();
        const timeInHours = (Number(record.timeLost) || 0) / 60;

        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { pdl: 0, mpl: 0 };
        }

        if (pdlReasons.includes(reason)) {
          dailyData[dateStr].pdl += timeInHours;
        } else if (mplReasons.includes(reason)) {
          dailyData[dateStr].mpl += timeInHours;
        }
      }
    });

    const sortedDailyLosses = Object.entries(dailyData)
      .map(([date, values]) => ({
        date,
        total: values.pdl + values.mpl,
        pdl: values.pdl,
        mpl: values.mpl,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const waterfallData: {name: string, start: number, value: number, pdl?: number, mpl?: number}[] = [];
    let cumulative = 0;

    sortedDailyLosses.forEach(loss => {
      if (loss.total > 0) {
        waterfallData.push({
          name: loss.date,
          start: cumulative,
          value: loss.total,
          pdl: loss.pdl,
          mpl: loss.mpl
        });
        cumulative += loss.total;
      }
    });

    if (cumulative > 0) {
      waterfallData.push({
        name: 'Total',
        start: 0,
        value: cumulative,
      });
    }

    const calculatedMaxHours = cumulative > 0 ? Math.ceil(cumulative / 5) * 5 + 5 : 10;
    
    return { chartData: waterfallData, maxHours: calculatedMaxHours };

  }, [lossData]);

  const xAxisFormatter = (value: string) => {
    if (value === 'Total') return 'Total';
    const date = new Date(value);
    date.setDate(date.getDate() + 1); // Adjust for timezone issues
    if (isDayView) return format(date, 'dd/MM');
    return isWeekView ? format(date, 'EEE', { locale: ptBR }) : format(date, 'dd/MM');
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.value || 0;
      
      const isTotal = label === 'Total';
      let formattedLabel = label;
      if (!isTotal) {
        const date = new Date(label);
        date.setDate(date.getDate() + 1);
        formattedLabel = format(date, 'dd/MM/yyyy');
      }

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[10rem]">
          <div className="grid gap-1.5">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{formattedLabel}</p>
              <p className="font-bold">{value.toFixed(1)}h</p>
            </div>
            {!isTotal && (
              <>
                <div className="h-px w-full my-1 bg-border" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">PDL (Planejada)</span>
                  <span className="font-medium">{(data.pdl || 0).toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">MPL (Não Planejada)</span>
                  <span className="font-medium">{(data.mpl || 0).toFixed(1)}h</span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Perdas Diárias em Cascata</CardTitle>
        <CardDescription>
          Visualização cumulativa das horas de perda diárias, com detalhamento de PDL e MPL.
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
              <ChartContainer config={chartConfig}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: (isWeekView || chartData.length > 7) ? 60 : 20,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="name"
                    tickFormatter={xAxisFormatter}
                    angle={(isWeekView || chartData.length > 7) ? -45 : 0}
                    textAnchor={(isWeekView || chartData.length > 7) ? "end" : "middle"}
                    interval={0}
                    height={(isWeekView || chartData.length > 7) ? 70 : 30}
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
                  <Bar dataKey="value" stackId="a">
                    <LabelList 
                        dataKey="value" 
                        position="top"
                        formatter={(value: number) => value > 0.05 ? `${value.toFixed(1)}h` : ''}
                        className="text-xs fill-muted-foreground"
                    />
                     {chartData.map((entry, index) => {
                        const isTotal = entry.name === 'Total';
                        const color = isTotal ? 'hsl(221 83% 53%)' : 'hsl(48 96% 51%)';
                        return <Cell key={`cell-${index}`} fill={color} />;
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
