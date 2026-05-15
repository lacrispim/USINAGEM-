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

const STATUS_COLORS: { [key: string]: string } = {
    'Fila de produção': 'hsl(240 5% 65%)', // gray
    'Em produção': 'hsl(48 96% 51%)', // yellow
    'Encerrado': 'hsl(142 71% 45%)', // green
    'Inspeção/Qualidade': 'hsl(262 84% 57%)', // purple
    'Rejeitado': 'hsl(0 72% 51%)', // red
    'Serviços Externos': 'hsl(221 83% 53%)', // blue
    'Programa concluído': 'hsl(35 84% 35%)', // amber/brown
};

const ALL_STATUSES = [
  'Fila de produção',
  'Em produção',
  'Encerrado',
  'Inspeção/Qualidade',
  'Rejeitado',
  'Serviços Externos',
  'Programa concluído',
];

interface StatusByFormChartProps {
  data: any[];
  loading: boolean;
}

export function StatusByFormChart({
  data,
  loading,
}: StatusByFormChartProps) {
  const { chartData, statuses } = useMemo(() => {
    if (!data) {
      return { chartData: [], statuses: [] };
    }

    const formsData: { 
        [form: string]: { 
            [status: string]: { 
                count: number; 
                technicians: Set<string>;
            } 
        } 
    } = {};

    data.forEach(record => {
      if (record.formsNumber && record.status && record.operatorId) {
        const form = record.formsNumber;
        const status = record.status;
        const technician = record.operatorId;

        if (!formsData[form]) {
            formsData[form] = {};
        }
        if (!formsData[form][status]) {
            formsData[form][status] = { count: 0, technicians: new Set() };
        }
        formsData[form][status].count++;
        formsData[form][status].technicians.add(technician);
      }
    });

    const chartDataResult = Object.entries(formsData)
      .map(([formsNumber, statusData]) => {
          const row: { [key: string]: any } = { formsNumber };
          
          ALL_STATUSES.forEach(status => {
            if (statusData[status]) {
              row[status] = statusData[status].count;
              row[`technicians_${status}`] = Array.from(statusData[status].technicians);
            } else {
              row[status] = 0;
              row[`technicians_${status}`] = [];
            }
          });

          return row;
      })
      .sort((a, b) => a.formsNumber.localeCompare(b.formsNumber));

    return { chartData: chartDataResult, statuses: ALL_STATUSES };
  }, [data]);

  const chartConfig = statuses.reduce((acc, status) => {
    acc[status] = {
      label: status,
      color: STATUS_COLORS[status] || 'hsl(var(--chart-5))',
    };
    return acc;
  }, {} as any);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((acc: number, item: any) => acc + item.value, 0);

      const allTechniciansForForm = new Set<string>();
      ALL_STATUSES.forEach(status => {
          const techniciansKey = `technicians_${status}`;
          if(payload[0].payload[techniciansKey]) {
              payload[0].payload[techniciansKey].forEach((tech: string) => allTechniciansForForm.add(tech));
          }
      });
      const technicianList = Array.from(allTechniciansForForm);

      return (
        <div className="min-w-[12rem] rounded-lg border bg-background p-2.5 shadow-sm">
          <div className="flex flex-col gap-1.5">
             <div className="flex items-center justify-between">
                <span className="text-[0.8rem] font-semibold">{label}</span>
                <span className="text-[0.75rem] text-muted-foreground font-semibold">{total} {total > 1 ? 'registros' : 'registro'}</span>
             </div>
            <div className='my-1 h-px w-full bg-border' />
            <div className='flex flex-col gap-1'>
            {payload.slice().reverse().map((p: any, index: number) => (
              p.value > 0 && <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: p.fill }} />
                  <span className="text-[0.8rem] text-muted-foreground">{p.name}</span>
                </div>
                <span className="font-bold text-right text-[0.8rem]">{p.value}</span>
              </div>
            ))}
            </div>
            {technicianList.length > 0 && (
                <>
                    <div className='my-1 h-px w-full bg-border' />
                    <div>
                        <p className="text-xs font-semibold mb-1">Técnicos:</p>
                        <p className="text-xs text-muted-foreground">{technicianList.join(', ')}</p>
                    </div>
                </>
            )}
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
        {payload?.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };
  
  const yAxisFormatter = (value: number) => {
    if (value % 1 !== 0) {
      return '';
    }
    return String(value);
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Status por Formulário</CardTitle>
            <CardDescription>
                Contagem de status para cada número de formulário.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
              <div className="flex h-[350px] w-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin" />
              </div>
            ) : chartData && chartData.length > 0 ? (
              <div className="h-[350px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={chartData} barGap={4} margin={{ bottom: 40 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="formsNumber"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={yAxisFormatter}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<CustomTooltip />}
                    />
                    <Legend content={<CustomLegend />} verticalAlign="top" />
                    {statuses.map((status) => (
                      <Bar
                        key={status}
                        dataKey={status}
                        fill={STATUS_COLORS[status]}
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex h-[350px] w-full flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum dado para exibir. Verifique se os registros de produção possuem "Número do forms" e "Status".
                </p>
              </div>
            )}
        </CardContent>
    </Card>
  );
}