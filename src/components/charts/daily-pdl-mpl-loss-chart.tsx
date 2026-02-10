'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
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
    color: 'hsl(var(--chart-2))',
  },
  mpl: {
    label: 'MPL (Não Planejada)',
    color: 'hsl(var(--chart-5))',
  },
};

export function DailyPdlMplLossChart({
  lossData,
  loading,
  isWeekView,
  isDayView,
}: DailyPdlMplLossChartProps) {
  const chartData = useMemo(() => {
    if (!lossData) {
      return [];
    }

    const dailyData: { [date: string]: { pdl: number; mpl: number } } = {};

    lossData.forEach(record => {
      if (record.lossReason && record.date && record.date.toDate) {
        const dateObj = record.date.toDate();
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        const reason = record.lossReason.toUpperCase().trim();
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

    return Object.entries(dailyData)
      .map(([date, values]) => ({
        date,
        ...values,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [lossData]);

  const xAxisFormatter = (value: string) => {
    const date = new Date(value);
    date.setDate(date.getDate() + 1);
    if (isDayView) return format(date, 'dd/MM');
    return isWeekView ? format(date, 'EEE', { locale: ptBR }) : format(date, 'dd/MM');
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      date.setDate(date.getDate() + 1);
      const formattedLabel = format(date, 'dd/MM/yyyy');
      
      const total = payload.reduce((acc: number, item: any) => acc + item.value, 0);

      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm">
          <div className="flex flex-col gap-1.5">
             <div className="flex items-center justify-between">
                <span className="text-[0.8rem] font-semibold">{formattedLabel}</span>
                <span className="text-[0.75rem] text-muted-foreground font-semibold">{total.toFixed(1)}h</span>
             </div>
            <div className='flex flex-col gap-1'>
            {payload.slice().reverse().map((p: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: p.fill }} />
                  <span className="text-[0.8rem] text-muted-foreground">{p.name}</span>
                </div>
                <span className="font-bold text-right text-[0.8rem]">{p.value.toFixed(1)}h</span>
              </div>
            ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center flex-wrap gap-4 pt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificação de Perdas Diárias (PDL vs MPL)</CardTitle>
        <CardDescription>
          Soma diária de horas perdidas, classificadas como Planejadas (PDL) e Não Planejadas (MPL).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[350px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={xAxisFormatter}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(value) => `${value.toFixed(0)}h`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={[0, 'dataMax + 2']}
                />
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
                />
                <Legend content={<CustomLegend />} />
                <Bar
                  dataKey="pdl"
                  name={chartConfig.pdl.label}
                  fill={chartConfig.pdl.color}
                  stackId="a"
                />
                <Bar
                  dataKey="mpl"
                  name={chartConfig.mpl.label}
                  fill={chartConfig.mpl.color}
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
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
