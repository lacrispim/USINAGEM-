'use client';

import { useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell, Legend } from 'recharts';
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
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';

interface PdlMplLossChartProps {
  lossData: any[];
  loading: boolean;
}

const PDL_REASONS = [
  "MANUTENÇÃO PLANEJADA",
  "TEMPO DE CAFÉ",
  "LIMPEZA PLANEJADA",
  "SETUP",
  "DDS, APONTAMENTO HORAS, ATIVIDADE ADM",
  "INSPEÇÃO & VALIDAÇÃO DAS PEÇAS"
];

const MPL_REASONS = [
  "QUEBRA",
  "FALHA DE PROCESSO",
  "ABSENTEÍSMO",
  "FALTA DE MATERIAL & FERRAMENTA",
  "MOVIMENTAÇÃO DE PEÇAS E EQUIPAMENTOS",
  "PEQUENAS PARADAS",
  "AJUSTES CORRETIVOS DE PROCESSOS",
  "VELOCIDADE REDUZIDA (PROBLEMA DE MÁQUINA)",
  "RETRABALHO"
];

const chartConfig = {
  PDL: {
    label: 'PDL (Perda por Parada Planejada)',
    color: 'hsl(var(--chart-2))',
  },
  MPL: {
    label: 'MPL (Perda do Processo de Manufatura)',
    color: 'hsl(var(--chart-4))',
  },
};

export function PdlMplLossChart({
  lossData,
  loading,
}: PdlMplLossChartProps) {
  const chartData = useMemo(() => {
    if (!lossData) {
      return [];
    }

    const lossTotals = {
      PDL: 0,
      MPL: 0,
    };

    lossData.forEach(record => {
      const time = Number(record.timeLost) || 0;
      if (PDL_REASONS.includes(record.lossReason)) {
        lossTotals.PDL += time;
      } else if (MPL_REASONS.includes(record.lossReason)) {
        lossTotals.MPL += time;
      }
    });

    return [
      { name: 'PDL', value: lossTotals.PDL / 60, label: chartConfig.PDL.label },
      { name: 'MPL', value: lossTotals.MPL / 60, label: chartConfig.MPL.label },
    ].filter(item => item.value > 0);

  }, [lossData]);
  
  const totalHours = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificação de Perdas (PDL vs MPL)</CardTitle>
        <CardDescription>
          Distribuição do tempo total de perda entre paradas planejadas (PDL) e perdas do processo (MPL).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {loading ? (
          <div className="flex h-[250px] w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="mx-auto flex aspect-square h-[250px] items-center justify-center">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name, item) => (
                        <>
                          <div className="flex items-center gap-2">
                             <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                                style={{ backgroundColor: item.payload.fill }}
                             />
                             <div className="flex flex-1 justify-between">
                               <span className="text-muted-foreground">{item.payload.label}</span>
                               <span className="font-bold">{`${(value as number).toFixed(1)}h`}</span>
                             </div>
                          </div>
                        </>
                      )}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={chartConfig[entry.name as keyof typeof chartConfig]?.color}
                    />
                  ))}
                </Pie>
                <Legend
                  content={({ payload }) => {
                    return (
                      <ul className="flex flex-col gap-2">
                        {payload?.map((item) => {
                          const { name, value, color } = item.payload.payload;
                          const percentage = totalHours > 0 ? (value / totalHours) * 100 : 0;
                          return (
                            <li
                              key={name}
                              className="flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {chartConfig[name as keyof typeof chartConfig].label}
                                </span>
                              </div>
                              <span className="text-xs font-semibold">
                                {percentage.toFixed(0)}%
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }}
                />
              </PieChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[250px] w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado de perda para classificar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
