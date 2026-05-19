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
} from '@/components/ui/chart';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  'Jair Melo': 'hsl(var(--chart-7))',
  'Marcos Barbosa': 'hsl(var(--chart-8))',
  'Outro': 'hsl(var(--chart-6))',
};

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
    'PRODUCAO': { label: 'Usinagem', color: '#ffffff' },
    'PROGRAMACAO': { label: 'Programação', color: '#a855f7' },
    'SETUP': { label: 'Setup', color: '#ef4444' },
    'TEMPO DE CAFÉ': { label: 'Café', color: '#eab308' },
    'LIMPEZA PLANEJADA': { label: 'Limpeza', color: '#22c55e' },
    'DDS, APONTAMENTO HORAS, ATIVIDADE ADM': { label: 'Ativ. ADM', color: '#f97316' },
    'INSPEÇÃO & VALIDAÇÃO DAS PEÇAS': { label: 'Qualidade', color: '#3b82f6' },
    'MANUTENÇÃO PLANEJADA': { label: 'Manutenção', color: '#7c3aed' },
    'QUEBRA': { label: 'Quebra', color: '#b91c1c' },
    'FALHA DE PROCESSO': { label: 'Falha Proc.', color: '#451a03' },
    'ABSENTEÍSMO': { label: 'Absenteísmo', color: '#4b5563' },
    'FALTA DE MATERIAL & FERRAMENTA': { label: 'Falta Mat/Ferr', color: '#1e3a8a' },
    'MOVIMENTAÇÃO DE PEÇAS E EQUIPAMENTOS': { label: 'Movimentação', color: '#064e3b' },
    'PEQUENAS PARADAS': { label: 'Peq. Paradas', color: '#78350f' },
    'AJUSTES CORRETIVOS DE PROCESSOS': { label: 'Ajustes', color: '#be185d' },
    'VELOCIDADE REDUZIDA (PROBLEMA DE MÁQUINA)': { label: 'Vel. Reduzida', color: '#4c1d95' },
    'RETRABALHO': { label: 'Retrabalho', color: '#111827' },
    'SERVIÇOS DE BANCADA/SERRA': { label: 'Bancada/Serra', color: '#fbbf24' },
};

const DEFAULT_COLOR = '#6b7280';

const normalizeOperatorName = (name: any) => {
  if (!name) return '';
  const n = String(name).toLowerCase().trim();
  if (n.includes('gustavo')) return 'Gustavo Gozzi';
  if (n.includes('daniel')) return 'Daniel Solivo';
  if (n.includes('rodrigo')) return 'Rodrigo Cantano';
  if (n.includes('william')) return 'William Martinucci';
  if (n.includes('nathan')) return 'Nathan Xavier';
  if (n.includes('jair')) return 'Jair Melo';
  if (n.includes('marcos')) return 'Marcos Barbosa';
  return n.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getCategoryKey = (reason: string): string => {
  const r = String(reason || '').toUpperCase().trim();
  if (r === '' || r === 'USINAGEM' || r === 'PRODUCAO' || r === 'PRODUÇÃO') return 'PRODUCAO';
  if (r.includes('PROGRAMACAO') || r.includes('PROGRAMAÇÃO')) return 'PROGRAMACAO';
  if (r.includes('SETUP')) return 'SETUP';
  if (r.includes('CAFÉ') || r.includes('CAFE')) return 'TEMPO DE CAFÉ';
  if (r.includes('LIMPEZA')) return 'LIMPEZA PLANEJADA';
  if (r.includes('DDS') || r.includes('ADM') || r.includes('APONTAMENTO')) return 'DDS, APONTAMENTO HORAS, ATIVIDADE ADM';
  if (r.includes('INSPEÇÃO') || r.includes('INSPECAO') || r.includes('QUALIDADE') || r.includes('VALIDAÇÃO')) return 'INSPEÇÃO & VALIDAÇÃO DAS PEÇAS';
  if (r.includes('MANUTENÇÃO') || r.includes('MANUTENCAO')) return 'MANUTENÇÃO PLANEJADA';
  return r;
};

export function OperatorPerformanceChart({
  productionData,
  lossData,
  plannedData,
  loading,
  selectedOperator,
  onOperatorSelect,
}: OperatorPerformanceChartProps) {
  
  const { chartData, activeCategories } = useMemo(() => {
    const operatorStats: { [key: string]: any } = {};
    const categoriesFound = new Set<string>();

    const getOrCreate = (name: string) => {
        if (!operatorStats[name]) {
            operatorStats[name] = { name, planTotal: 0, realTotal: 0 };
        }
        return operatorStats[name];
    };

    // Processar Realizado de Produção (Diferenciando por activityType)
    productionData.forEach(record => {
      const name = normalizeOperatorName(record.operatorId || record.tecnico || record['Técnicos'] || record['Técnico']);
      if (name) {
        const stats = getOrCreate(name);
        const hours = Number(record.machiningTime || 0) / 60;
        
        // Identifica se é Programação, Usinagem, etc.
        const rawActivity = String(record.activityType || 'PRODUCAO').toUpperCase().trim();
        const catKey = getCategoryKey(rawActivity);
        
        stats[`real_${catKey}`] = (stats[`real_${catKey}`] || 0) + hours;
        stats.realTotal += hours;
        categoriesFound.add(catKey);
      }
    });

    // Processar Realizado de Perdas
    lossData.forEach(record => {
      const name = normalizeOperatorName(record.operatorId || record.tecnico || record['Técnicos'] || record['Técnico']);
      if (name) {
        const stats = getOrCreate(name);
        const hours = Number(record.timeLost || 0) / 60;
        const catKey = getCategoryKey(record.lossReason || '');
        stats[`real_${catKey}`] = (stats[`real_${catKey}`] || 0) + hours;
        stats.realTotal += hours;
        categoriesFound.add(catKey);
      }
    });

    // Processar Planejado
    plannedData.forEach(record => {
      const name = normalizeOperatorName(record.tecnico || record['Técnicos'] || record['Técnico'] || record.operatorId);
      if (name) {
        const stats = getOrCreate(name);
        
        if (record.atividades && Array.isArray(record.atividades)) {
          record.atividades.forEach((ativ: any) => {
             const catKey = getCategoryKey(ativ.tipo);
             const time = Number(ativ.tempo) || 0;
             const field = `plan_${catKey}`;
             stats[field] = (stats[field] || 0) + time;
             stats.planTotal += time;
             categoriesFound.add(catKey);
          });
        } else {
          const rawHours = record.horasPlanejadas || record['Horas Máquina'];
          const machineHours = typeof rawHours === 'string' 
              ? parseFloat(rawHours.replace(',', '.')) 
              : (Number(rawHours) || 0);
          const rawReason = String(record['Perdas planejadas'] || record.perdaPlanejada || '').toUpperCase().trim();
          const catKey = getCategoryKey(rawReason);
          const field = `plan_${catKey}`;
          stats[field] = (stats[field] || 0) + machineHours;
          stats.planTotal += machineHours;
          categoriesFound.add(catKey);
        }
      }
    });

    const sortedData = Object.values(operatorStats)
      .map(item => ({
        ...item,
        fillColor: OPERATOR_COLORS[item.name] || OPERATOR_COLORS['Outro'],
      }))
      .sort((a, b) => (b.realTotal + b.planTotal) - (a.realTotal + a.planTotal));

    // Filtrar apenas o operador selecionado, se houver um
    const filteredData = selectedOperator && selectedOperator !== 'all'
        ? sortedData.filter(item => item.name === selectedOperator)
        : sortedData;

    const sortedCategories = Array.from(categoriesFound).sort((a, b) => {
        if (a === 'PRODUCAO') return -1;
        if (b === 'PRODUCAO') return 1;
        if (a === 'PROGRAMACAO') return -1;
        if (b === 'PROGRAMACAO') return 1;
        return a.localeCompare(b);
    });

    return { 
        chartData: filteredData, 
        activeCategories: sortedCategories
    };
  }, [productionData, lossData, plannedData, selectedOperator]);

  const chartConfig = useMemo(() => {
    const config: any = {};
    activeCategories.forEach(cat => {
        config[`plan_${cat}`] = { label: `${CATEGORY_STYLES[cat]?.label || cat} (Plan)`, color: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR };
        config[`real_${cat}`] = { label: `${CATEGORY_STYLES[cat]?.label || cat} (Real)`, color: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR };
    });
    return config;
  }, [activeCategories]);
  
  const maxVal = Math.max(...chartData.map(d => Math.max(d.planTotal, d.realTotal)), 0);
  const xAxisDomainMax = Math.max(10, Math.ceil(maxVal) + 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[14rem]">
          <div className="grid gap-1.5">
            <p className="font-semibold text-lg">{label}</p>
            
            <div className="flex flex-col gap-1 border-b pb-2 mb-1">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Planejado (Total)</span>
                    <span className="font-bold">{p.planTotal.toFixed(1)}h</span>
                </div>
                <div className="pl-3 flex flex-col gap-0.5">
                    {activeCategories.map(cat => {
                        const val = p[`plan_${cat}`] || 0;
                        if (val <= 0) return null;
                        return (
                            <div key={`plan-tip-${cat}`} className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR }} />
                                <div className="flex justify-between flex-1">
                                    <span className="text-muted-foreground text-[10px]">{CATEGORY_STYLES[cat]?.label || cat}</span>
                                    <span className="font-bold text-[10px]">{val.toFixed(1)}h</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Realizado (Total)</span>
                    <span className="font-bold" style={{ color: p.fillColor }}>{p.realTotal.toFixed(1)}h</span>
                </div>
                <div className="pl-3 flex flex-col gap-0.5">
                    {activeCategories.map(cat => {
                        const val = p[`real_${cat}`] || 0;
                        if (val <= 0) return null;
                        return (
                            <div key={`real-tip-${cat}`} className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR }} />
                                <div className="flex justify-between flex-1">
                                    <span className="text-muted-foreground text-[10px]">{CATEGORY_STYLES[cat]?.label || cat}</span>
                                    <span className="font-bold text-[10px]">{val.toFixed(1)}h</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex items-center justify-center gap-x-4 gap-y-2 mt-4 flex-wrap border-t pt-4">
        <div className="flex items-center gap-1.5 mr-4">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground" />
            <span className="text-[9px] font-black uppercase text-foreground">Barra Sup: Plan | Barra Inf: Real (Ambas Segmentadas)</span>
        </div>
        {activeCategories.map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-sm")} style={{ backgroundColor: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR }} />
                <span className={cn("text-[9px] font-bold uppercase text-muted-foreground")}>{CATEGORY_STYLES[cat]?.label || cat}</span>
            </div>
        ))}
    </div>
  );

  return (
    loading ? (
      <div className="flex h-[350px] w-full items-center justify-center"><Loader className="h-8 w-8 animate-spin" /></div>
    ) : chartData.length > 0 ? (
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart 
                data={chartData} 
                layout="vertical" 
                barGap={4} 
                margin={{ top: 30, right: 60, left: 40, bottom: 20 }}
                onClick={(e) => {
                    if (e && e.activeLabel) {
                        onOperatorSelect(e.activeLabel);
                    }
                }}
            >
              <CartesianGrid horizontal={false} strokeOpacity={0.1} />
               <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
                    width={120} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, cursor: 'pointer' }} 
                />
              <XAxis type="number" domain={[0, xAxisDomainMax]} unit="h" tickLine={false} axisLine={false} className="text-[10px]" />
              <ChartTooltip cursor={{ fill: 'hsl(var(--accent))', opacity: 0.05 }} content={<CustomTooltip />} />
              
              <ReferenceLine x={7} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2}>
                  <Label value="Meta 7h" position="top" fill="#ef4444" fontSize={10} fontWeight="bold" />
              </ReferenceLine>

              <ReferenceLine x={8} stroke="#f97316" strokeDasharray="3 3" strokeWidth={2}>
                  <Label value="Meta 8h" position="top" fill="#f97316" fontSize={10} fontWeight="bold" />
              </ReferenceLine>
              
              {/* STACK PLANEJADO (SUPERIOR) */}
              {activeCategories.map((cat, idx) => (
                <Bar 
                    key={`plan-${cat}`} 
                    dataKey={`plan_${cat}`} 
                    stackId="planejado" 
                    fill={CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR}
                    barSize={15}
                    radius={idx === activeCategories.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                    className="cursor-pointer"
                >
                    {idx === activeCategories.length - 1 && (
                        <LabelList 
                            dataKey="planTotal" 
                            position="right" 
                            offset={8} 
                            className="fill-muted-foreground text-[10px] font-bold" 
                            formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''} 
                        />
                    )}
                </Bar>
              ))}

              {/* STACK REALIZADO (INFERIOR) */}
              {activeCategories.map((cat, idx) => (
                <Bar 
                    key={`real-${cat}`} 
                    dataKey={`real_${cat}`} 
                    stackId="realizado" 
                    fill={CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR}
                    opacity={0.8}
                    barSize={15}
                    radius={idx === activeCategories.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                    className="cursor-pointer"
                >
                    {idx === activeCategories.length - 1 && (
                        <LabelList 
                            dataKey="realTotal" 
                            position="right" 
                            offset={8} 
                            className="fill-foreground text-[10px] font-bold" 
                            formatter={(value: number) => value > 0 ? `${value.toFixed(1)}h` : ''} 
                        />
                    )}
                </Bar>
              ))}

              <Legend content={<CustomLegend />} />
            </BarChart>
          </ChartContainer>
        </ResponsiveContainer>
      </div>
    ) : (
      <div className="flex h-[350px] w-full flex-col items-center justify-center"><p className="text-sm text-muted-foreground">Sem dados disponíveis.</p></div>
    )
  );
}
