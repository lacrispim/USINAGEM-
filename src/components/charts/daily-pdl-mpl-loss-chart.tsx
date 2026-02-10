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
  Legend,
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
  pdl: {
    label: 'PDL (Planejada)',
    color: 'hsl(142 71% 45%)', // green
  },
  mpl: {
    label: 'MPL (Não Planejada)',
    color: 'hsl(48 96% 51%)', // yellow
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

    const chartDataResult = Object.entries(dailyData)
      .map(([date, values]) => ({
        date,
        total: values.pdl + values.mpl,
        pdl: values.pdl,
        mpl: values.mpl,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const maxDailyTotal = Math.max(...chartDataResult.map(d => d.total), 0);
    const calculatedMaxHours = maxDailyTotal > 0 ? Math.ceil(maxDailyTotal / 2) * 2 + 2 : 10;
    
    return { chartData: chartDataResult, maxHours: calculatedMaxHours };

  }, [lossData]);

  const xAxisFormatter = (value: string) => {
    const date = new Date(value);
    date.setDate(date.getDate() + 1); // Adjust for timezone issues
    if (isDayView) return format(date, 'dd/MM');
    return isWeekView ? format(date, 'EEE', { locale: ptBR }) : format(date, 'dd/MM');
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.total || 0;
      
      const date = new Date(label);
      date.setDate(date.getDate() + 1);
      const formattedLabel = format(date, 'dd/MM/yyyy');

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[10rem]">
          <div className="grid gap-1.5">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{formattedLabel}</p>
              <p className="font-bold">{total.toFixed(1)}h</p>
            </div>
            <div className="h-px w-full my-1 bg-border" />
            {payload.slice().reverse().map((pld: any) => (
                pld.value > 0 &&
                <div key={pld.dataKey} className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: pld.fill}}/>
                        <span>{pld.name}</span>
                    </div>
                    <span className="font-medium">{(pld.value || 0).toFixed(1)}h</span>
                </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center flex-wrap gap-4">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.value === 'pdl' ? 'PDL (Planejada)' : 'MPL (Não Planejada)'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Perdas Diárias (PDL vs MPL)</CardTitle>
        <CardDescription>
          Visualização das horas de perda diárias, com detalhamento de PDL (Planejada) e MPL (Não Planejada).
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
                    dataKey="date"
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
                  <Legend verticalAlign="top" content={<CustomLegend />}/>
                  <Bar dataKey="pdl" name="PDL (Planejada)" stackId="a" fill={chartConfig.pdl.color} />
                  <Bar dataKey="mpl" name="MPL (Não Planejada)" stackId="a" fill={chartConfig.mpl.color} radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={(value: number) => value > 0.1 ? `${value.toFixed(1)}h` : ''}
                      className="text-xs fill-muted-foreground"
                    />
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
