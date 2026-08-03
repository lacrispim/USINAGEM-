
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
  'Alisson França': 'hsl(215 80% 60%)',
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
};

const DEFAULT_COLOR = '#6b7280';

const normalizeOperatorName = (name: any) => {
  if (!name) return '';
  const n = String(name).toLowerCase().trim();
  if (n.includes('alisson')) return 'Alisson França';
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

    // Processar Realizado
    productionData.forEach(record => {
      const name = normalizeOperatorName(record.operatorId);
      if (name) {
        const stats = getOrCreate(name);
        const hours = Number(record.machiningTime || 0) / 60;
        const catKey = getCategoryKey(record.activityType || 'PRODUCAO');
        stats[`real_${catKey}`] = (stats[`real_${catKey}`] || 0) + hours;
        stats.realTotal += hours;
        categoriesFound.add(catKey);
      }
    });

    lossData.forEach(record => {
      const name = normalizeOperatorName(record.operatorId);
      if (name) {
        const stats = getOrCreate(name);
        const hours = Number(record.timeLost || 0) / 60;
        const catKey = getCategoryKey(record.lossReason || '');
        stats[`real_${catKey}`] = (stats[`real_${catKey}`] || 0) + hours;
        stats.realTotal += hours;
        categoriesFound.add(catKey);
      }
    });

    // Processar Planejado baseado no 'plano' (cronograma distribuído)
    plannedData.forEach(record => {
      const name = normalizeOperatorName(record.tecnico);
      if (name) {
        const stats = getOrCreate(name);
        const hours = (Number(record.tempoMinutos || 0) + Number(record.setupMinutos || 0)) / 60;
        
        // Categorizar o planejado baseado no tipo de atividade do plano
        const rawType = String(record.tipoAtividade || 'USINAGEM').toUpperCase();
        let catKey = 'PRODUCAO';
        if (rawType.includes('PROGRAMACAO')) catKey = 'PROGRAMACAO';
        
        // Se tem tempo de setup mas não de produção, conta como Setup
        if (Number(record.setupMinutos) > 0 && Number(record.tempoMinutos) === 0) {
            catKey = 'SETUP';
        }

        const field = `plan_${catKey}`;
        stats[field] = (stats[field] || 0) + hours;
        stats.planTotal += hours;
        categoriesFound.add(catKey);
      }
    });

    const sortedData = Object.values(operatorStats)
      .map(item => ({
        ...item,
        fillColor: OPERATOR_COLORS[item.name] || OPERATOR_COLORS['Outro'],
      }))
      .sort((a, b) => (b.realTotal + b.planTotal) - (a.realTotal + a.planTotal));

    const sortedCategories = Array.from(categoriesFound).sort((a, b) => {
        if (a === 'PRODUCAO') return -1;
        if (b === 'PRODUCAO') return 1;
        return a.localeCompare(b);
    });

    return { 
        chartData: sortedData, 
        activeCategories: sortedCategories
    };
  }, [productionData, lossData, plannedData]);

  const chartConfig = useMemo(() => {
    const config: any = {};
    activeCategories.forEach(cat => {
        config[`plan_${cat}`] = { label: `${CATEGORY_STYLES[cat]?.label || cat} (Plan)`, color: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR };
        config[`real_${cat}`] = { label: `${CATEGORY_STYLES[cat]?.label || cat} (Real)`, color: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR };
    });
    return config;
  }, [activeCategories]);
  
  const CustomPerformanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      
      const renderSection = (title: string, prefix: string, total: number, colorClass: string) => {
        const relevantEntries = activeCategories
          .map(cat => ({
            label: CATEGORY_STYLES[cat]?.label || cat,
            value: p[`${prefix}_${cat}`] || 0,
            color: CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR
          }))
          .filter(item => item.value > 0);

        if (relevantEntries.length === 0) return null;

        return (
          <div className="space-y-1">
            <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
              <span className={cn("text-[10px] font-black uppercase", colorClass)}>{title}</span>
              <span className={cn("text-xs font-black", colorClass)}>{total.toFixed(1)}h</span>
            </div>
            {relevantEntries.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
                <span className="text-[10px] font-bold tabular-nums">{item.value.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        );
      };

      return (
        <div className="rounded-lg border bg-card p-3 shadow-xl min-w-[16rem] space-y-4">
          <p className="font-black text-sm uppercase tracking-wider border-b border-primary/20 pb-1">{label}</p>
          
          {renderSection("Planejado", "plan", p.planTotal, "text-muted-foreground")}
          {renderSection("Realizado", "real", p.realTotal, "text-white")}

          <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
            <span className="text-[9px] font-black uppercase text-muted-foreground">Aderência ao Plano</span>
            <span className={cn(
              "text-xs font-black", 
              p.planTotal > 0 && (p.realTotal / p.planTotal) >= 0.9 ? "text-green-400" : "text-yellow-400"
            )}>
              {p.planTotal > 0 ? ((p.realTotal / p.planTotal) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxVal = Math.max(...chartData.map(d => Math.max(d.planTotal, d.realTotal)), 0);
  const xAxisDomainMax = Math.max(10, Math.ceil(maxVal) + 2);

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
            >
              <CartesianGrid horizontal={false} strokeOpacity={0.1} />
               <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
                    width={120} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
              <XAxis type="number" domain={[0, xAxisDomainMax]} unit="h" tickLine={false} axisLine={false} className="text-[10px]" />
              <ChartTooltip content={<CustomPerformanceTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.05 }} />
              
              <ReferenceLine x={7} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2}>
                  <Label value="Meta 7h" position="top" fill="#ef4444" fontSize={10} fontWeight="bold" />
              </ReferenceLine>

              {/* STACK PLANEJADO */}
              {activeCategories.map((cat, idx) => (
                <Bar 
                    key={`plan-${cat}`} 
                    dataKey={`plan_${cat}`} 
                    stackId="planejado" 
                    fill={CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR}
                    barSize={15}
                    radius={idx === activeCategories.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
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

              {/* STACK REALIZADO */}
              {activeCategories.map((cat, idx) => (
                <Bar 
                    key={`real-${cat}`} 
                    dataKey={`real_${cat}`} 
                    stackId="realizado" 
                    fill={CATEGORY_STYLES[cat]?.color || DEFAULT_COLOR}
                    opacity={0.8}
                    barSize={15}
                    radius={idx === activeCategories.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
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
            </BarChart>
          </ChartContainer>
        </ResponsiveContainer>
      </div>
    ) : (
      <div className="flex h-[350px] w-full flex-col items-center justify-center"><p className="text-sm text-muted-foreground">Sem dados disponíveis para o período.</p></div>
    )
  );
}
