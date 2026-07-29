
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useDatabase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { collection, query, where } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader, 
  Plus,
  Trash2,
  Settings2,
  PlusCircle,
  Cpu,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  parse, 
  startOfDay,
  endOfDay,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

// --- Interfaces ---
interface AtividadePlanejada {
  tipo: string;
  tempo: number;
  site?: string;
}

interface PlanejamentoItem {
  id: string;
  dataExecucao?: string;
  'Data Execução'?: string;
  site?: string;
  Site?: string;
  requisicao?: string;
  'Requisição'?: string;
  nomeDaPeca?: string;
  'Nome da Peça'?: string;
  quantidade?: number;
  Quantidade?: number;
  tecnico?: string;
  Técnicos?: string;
  horasPlanejadas?: number | string;
  'Horas Máquina'?: number | string;
  observacao?: string;
  Observação?: string;
  equipamento?: string;
  EQUIPAMENTO?: string;
  Turno?: string | number;
  turno?: string | number;
  perdaPlanejada?: string;
  'Perdas planejadas'?: string;
  atividades?: AtividadePlanejada[];
}

const turnos = [
  { id: '1', label: '1T', range: '06:00-14:00', technicians: ["Marcos Barbosa", "Daniel Solivo", "William Martinucci", "Alisson Franca"] },
  { id: '2', label: '2T', range: '14:00-22:00', technicians: ["Nathan Xavier", "Jair Melo"] },
  { id: '3', label: '3T', range: '22:00-06:00', technicians: ["Gustavo Gozzi", "Rodrigo Cantano"] },
];

const operatorList = [
    "Alisson Franca",
    "Daniel Solivo",
    "Rodrigo Cantano",
    "Gustavo Gozzi",
    "William Martinucci",
    "Nathan Xavier",
    "Jair Melo",
    "Marcos Barbosa"
];

const factoryList = [
    "VALINHOS DOVE", "VALINHOS SABONETE", "VINHEDO", "POUSO ALEGRE", 
    "INDAIATUBA", "AGUAÍ", "SUAPE", "IGARASSU", "GARANHUNS", "TORRE"
];

const lossOptions = [
  { value: 'PRODUCAO', label: 'Produção Normal', color: '#007b8a' },
  { value: 'PROGRAMACAO', label: 'Programação', color: '#a855f7' },
  { value: 'SETUP', label: 'Setup', color: '#ef4444' },
  { value: 'DDS', label: 'Atividades ADM', color: '#f97316' },
  { value: 'CAFE', label: 'Parada para Café', color: '#eab308' },
  { value: 'LIMPEZA', label: 'Limpeza Planejada', color: '#22c55e' },
  { value: 'QUALIDADE', label: 'Inspeção / Qualidade', color: '#3b82f6' },
];

const planningFormSchema = z.object({
  dataExecucao: z.string().min(1, 'Data é obrigatória.'),
  equipamento: z.string().min(1, 'Equipamento é obrigatório.'),
  requisicao: z.string().min(1, 'Nº da Requisição é obrigatório.'),
  nomeDaPeca: z.string().min(1, 'Nome da peça é obrigatória.'),
  quantidade: z.coerce.number().min(0, 'Quantidade deve ser zero ou maior.'),
  tecnico: z.string().min(1, 'Técnico é obrigatório.'),
  horasPlanejadas: z.coerce.number().default(0),
  turno: z.string(),
  site: z.string().min(1, 'Site é obrigatório.'),
  observacao: z.string().optional(),
  atividades: z.array(z.object({
    tipo: z.string().min(1, 'Tipo é obrigatório'),
    tempo: z.coerce.number().min(0, 'Tempo deve ser zero ou maior'),
    site: z.string().min(1, 'Fábrica da atividade é obrigatória')
  })).min(1, 'Adicione pelo menos uma atividade'),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

// --- Componentes Internos da Timeline ---

const ShiftTimelineRow = ({ 
  label, 
  range, 
  items, 
  techs, 
  realData,
  onItemClick,
  onAddClick,
  day 
}: { 
  label: string; 
  range: string; 
  items: PlanejamentoItem[]; 
  techs: string[]; 
  realData: any[];
  onItemClick: (item: PlanejamentoItem) => void;
  onAddClick: (day: Date, turnoId: string, tech: string) => void;
  day: Date;
}) => {
  return (
    <div className="flex border-b border-border/40 hover:bg-muted/5 transition-colors">
      {/* Coluna do Turno */}
      <div className="w-[80px] shrink-0 p-4 flex flex-col justify-center items-center border-r bg-muted/10">
        <span className="text-xl font-black text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground font-medium">{range}</span>
        <span className="text-[10px] font-bold text-muted-foreground/60 mt-1">480 min</span>
      </div>

      {/* Coluna de Recursos e Linhas do Tempo */}
      <div className="flex-1">
        {techs.map((tech, idx) => {
          const techItems = items.filter(item => (item.tecnico === tech || item.Técnicos === tech));
          
          // Pegar o equipamento do primeiro item ou deduzir (estético)
          const machineType = techItems[0]?.equipamento || techItems[0]?.EQUIPAMENTO || (idx % 2 === 0 ? 'TORNO' : 'CENTRO');
          const isTorno = machineType.includes('TORNO');

          return (
            <div key={tech} className="flex border-b last:border-0 h-[70px]">
              {/* Nome do Técnico e Máquina */}
              <div className="w-[180px] shrink-0 p-3 border-r flex flex-col justify-center gap-0.5">
                <div className="flex items-center gap-1.5">
                   <div className={cn("w-1.5 h-1.5 rounded-full", isTorno ? "bg-[#007b8a]" : "bg-[#6d28d9]")} />
                   <span className={cn("text-[9px] font-black uppercase tracking-widest", isTorno ? "text-[#007b8a]" : "text-[#a855f7]")}>
                      {isTorno ? 'TORNO' : 'CENTRO'}
                   </span>
                </div>
                <span className="text-sm font-bold truncate">{tech}</span>
                <span className="text-[10px] text-muted-foreground font-medium">Téc. Prog./Op.</span>
              </div>

              {/* Grid de Tempo (0-8h) */}
              <div className="flex-1 relative bg-[linear-gradient(to_right,#8881_1px,transparent_1px)] bg-[size:12.5%_100%] overflow-hidden group/row">
                 {/* Botão de adição rápida flutuante */}
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity z-20"
                    onClick={() => onAddClick(day, label.charAt(0), tech)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                 {/* Atividades Timeline */}
                 <div className="flex h-full items-center px-0.5 gap-1">
                   {techItems.map(item => {
                      const rawHours = item.horasPlanejadas || item['Horas Máquina'];
                      const hours = typeof rawHours === 'string' ? parseFloat(rawHours.replace(',', '.')) : (Number(rawHours) || 0);
                      
                      // Cálculo de Realizado para este Forms
                      const req = item.requisicao || item['Requisição'];
                      const realHours = realData
                        .filter(r => r.formsNumber === req)
                        .reduce((acc, curr) => acc + (Number(curr.machiningTime) || 0) / 60, 0);
                      
                      const progress = hours > 0 ? Math.min((realHours / hours) * 100, 100) : 0;
                      const isSetup = (item.perdaPlanejada || item['Perdas planejadas'] || '').toUpperCase().includes('SETUP');

                      return (
                        <div 
                          key={item.id}
                          onClick={() => onItemClick(item)}
                          className={cn(
                            "relative h-[48px] rounded-sm overflow-hidden flex flex-col justify-between cursor-pointer border-r last:border-r-0 shadow-sm hover:ring-2 ring-primary transition-all",
                            isTorno ? "bg-[#007b8a]" : "bg-[#6d28d9]"
                          )}
                          style={{ width: `${(hours / 8) * 100}%`, minWidth: '80px' }}
                        >
                          {/* Faixas de Setup (Zebrinha) */}
                          {isSetup && (
                            <div className="absolute inset-0 opacity-40 pointer-events-none" 
                                 style={{ background: 'repeating-linear-gradient(45deg, #facc15, #facc15 10px, #000 10px, #000 20px)' }} />
                          )}

                          <div className="relative p-1.5 flex flex-col h-full justify-between">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[12px] font-black text-white">{req}</span>
                                <span className="text-[10px] font-bold text-white/80">{item.quantidade || item.Quantidade || 0} pç</span>
                              </div>
                              <span className="text-[9px] font-black bg-black/20 text-white px-1 rounded">{hours.toFixed(1)}h</span>
                            </div>
                            <span className="text-[10px] font-bold text-white/90 truncate leading-tight uppercase">
                              {item.nomeDaPeca || item['Nome da Peça'] || 'SEM NOME'}
                            </span>
                          </div>

                          {/* Barra de Progresso Realizado */}
                          <div className="h-1.5 w-full bg-black/30 mt-auto overflow-hidden">
                             <div className="h-full bg-white/40" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                   })}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Página Principal ---

export default function ProgrammingPage() {
  const database = useDatabase();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<string>('1');

  // Visão de 3 dias
  const timelineDays = useMemo(() => [
    currentDate,
    addDays(currentDate, 1),
    addDays(currentDate, 2)
  ], [currentDate]);

  const productionQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'productionRecords'),
      where('date', '>=', startOfDay(currentDate)),
      where('date', '<=', endOfDay(addDays(currentDate, 3)))
    );
  }, [firestore, currentDate]);

  const { data: productionRecords } = useCollection(productionQuery);

  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: {
      dataExecucao: '', equipamento: '', requisicao: '', nomeDaPeca: '',
      quantidade: 0, tecnico: '', horasPlanejadas: 0, turno: '1',
      site: 'VALINHOS DOVE', observacao: '',
      atividades: [{ tipo: 'PRODUCAO', tempo: 0, site: 'VALINHOS DOVE' }],
    },
  });

  const { fields, append, remove: removeAtividade } = useFieldArray({
    control: form.control,
    name: "atividades"
  });

  const watchAtividades = useWatch({ control: form.control, name: "atividades" });

  useEffect(() => {
    const total = (watchAtividades || []).reduce((acc, curr) => acc + (Number(curr.tempo) || 0), 0);
    form.setValue('horasPlanejadas', total);
  }, [watchAtividades, form]);

  useEffect(() => {
    if (!database) { setLoading(false); return; }
    const dbRef = ref(database, '/Planejamento S');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const dataArray: PlanejamentoItem[] = Object.keys(data).map(key => ({
          id: key, ...data[key],
        }));
        setPlanejamentoData(dataArray);
      } else { setPlanejamentoData([]); }
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });
    return () => unsubscribe();
  }, [database]);

  const handleShiftClick = (day: Date, turnoId: string, tecnico?: string) => {
    setEditingId(null); setSelectedDay(day); setSelectedTurno(turnoId);
    const isSunday = day.getDay() === 0;
    const defaultAtividades = [{ tipo: 'PRODUCAO', tempo: 0, site: 'VALINHOS DOVE' }];
    if (!isSunday) {
        defaultAtividades.push({ tipo: 'DDS', tempo: 0.25, site: 'TORRE' });
        defaultAtividades.push({ tipo: 'CAFE', tempo: 0.25, site: 'TORRE' });
    }
    form.reset({
      dataExecucao: format(day, 'dd/MM/yyyy'),
      turno: turnoId, equipamento: '', requisicao: '', nomeDaPeca: '',
      quantidade: 0, tecnico: tecnico || '', horasPlanejadas: isSunday ? 0 : 0.5,
      site: 'VALINHOS DOVE', observacao: '', atividades: defaultAtividades,
    });
    setIsDialogOpen(true);
  };

  const handleItemClick = (item: PlanejamentoItem) => {
    setEditingId(item.id);
    const shiftVal = String(item.Turno || item.turno || '1');
    setSelectedTurno(shiftVal);
    let itemDate = new Date();
    const dateStr = item.dataExecucao || item['Data Execução'];
    if (dateStr) { try { itemDate = parse(dateStr, 'dd/MM/yyyy', new Date()); } catch { itemDate = new Date(dateStr); } }
    setSelectedDay(itemDate);
    const initialAtividades = item.atividades || [{
      tipo: (item.perdaPlanejada || item['Perdas planejadas'] || 'PRODUCAO').toUpperCase(),
      tempo: typeof (item.horasPlanejadas || item['Horas Máquina']) === 'string' ? parseFloat(String(item.horasPlanejadas || item['Horas Máquina']).replace(',', '.')) : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0),
      site: item.site || item.Site || 'VALINHOS DOVE'
    }];
    form.reset({
      dataExecucao: dateStr || '', turno: shiftVal,
      equipamento: item.equipamento || item.EQUIPAMENTO || '',
      requisicao: item.requisicao || item['Requisição'] || '',
      nomeDaPeca: item.nomeDaPeca || item['Nome da Peça'] || '',
      quantidade: Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0,
      tecnico: item.tecnico || item.Técnicos || '',
      horasPlanejadas: Number(form.getValues('horasPlanejadas')),
      site: item.site || item.Site || 'VALINHOS DOVE',
      observacao: item.observacao || item.Observação || '',
      atividades: initialAtividades,
    });
    setIsDialogOpen(true);
  };

  async function onSubmit(values: PlanningFormValues) {
    if (!database) return;
    try {
      const mainLoss = values.atividades.length === 1 ? values.atividades[0].tipo : 'MÚLTIPLAS';
      const lossLabel = lossOptions.find(o => o.value === mainLoss)?.label || mainLoss;
      const payload = {
        ...values, Turno: values.turno,
        'Perdas planejadas': values.atividades.find(a => a.tipo !== 'PRODUCAO') ? lossLabel.toUpperCase() : '',
      };
      if (editingId) {
        await update(ref(database, `/Planejamento S/${editingId}`), payload);
        toast({ title: "Planejamento Atualizado" });
      } else {
        await set(push(ref(database, '/Planejamento S')), payload);
        toast({ title: "Planejamento Salvo" });
      }
      setIsDialogOpen(false);
    } catch (error) { console.error(error); }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planejamento de Produção</h1>
          <p className="text-muted-foreground">Visão Gantt integrada com acompanhamento real de 3 dias.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(p => addDays(p, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[160px] text-center font-bold flex items-center justify-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{format(currentDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(p => addDays(p, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
        </div>
      </div>

      <div className="space-y-12">
        {loading ? (
            <div className="flex h-[400px] items-center justify-center gap-2 bg-card rounded-lg border shadow-sm">
                <Loader className="h-8 w-8 animate-spin" />
                <span className="font-bold uppercase text-[10px] tracking-widest">Sincronizando Planejamento...</span>
            </div>
        ) : (
            timelineDays.map((day) => {
                const dayItems = planejamentoData.filter(item => {
                    const dStr = item.dataExecucao || item['Data Execução'];
                    if (!dStr) return false;
                    try { return isSameDay(parse(dStr, 'dd/MM/yyyy', new Date()), day); } catch { return isSameDay(new Date(dStr), day); }
                });

                const totalPecas = dayItems.reduce((acc, curr) => acc + (Number(curr.quantidade || curr.Quantidade) || 0), 0);
                const totalHoras = dayItems.reduce((acc, curr) => {
                    const raw = curr.horasPlanejadas || curr['Horas Máquina'];
                    return acc + (typeof raw === 'string' ? parseFloat(raw.replace(',', '.')) : (Number(raw) || 0));
                }, 0);

                return (
                    <div key={day.toString()} className="rounded-xl border shadow-xl bg-card overflow-hidden">
                        {/* Header do Dia Industrial */}
                        <div className="bg-[#1e293b] text-white px-6 py-4 flex items-center justify-between">
                            <div className="flex items-baseline gap-4">
                                <span className="text-2xl font-black uppercase tracking-tighter">DIA {format(day, 'dd · MM/yy')}</span>
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{format(day, 'EEEE', { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-[10px] font-black uppercase">peças</span>
                                    <span className="text-xl font-black">{totalPecas}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-[10px] font-black uppercase">ocupação</span>
                                    <span className="text-xl font-black">{totalHoras.toFixed(1)}h</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-[10px] font-black uppercase">utilização</span>
                                    <span className="text-xl font-black">{totalHoras > 0 ? Math.min((totalHoras / 24) * 100, 100).toFixed(0) : '0'}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Eixo de Tempo 0h - 8h */}
                        <div className="flex bg-muted/20 border-b border-border/60">
                           <div className="w-[260px] shrink-0" />
                           <div className="flex-1 flex text-[9px] font-black text-muted-foreground/60 py-1 relative">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                                <div key={h} className="absolute h-4 border-l border-border" style={{ left: `${(h/8)*100}%` }}>
                                    <span className="ml-1 leading-none">{h}h</span>
                                </div>
                              ))}
                              <div className="h-4 w-full" />
                           </div>
                        </div>

                        {/* Linhas de Turnos */}
                        <div className="divide-y divide-border/30">
                            {turnos.map(turno => (
                                <ShiftTimelineRow 
                                    key={turno.id}
                                    label={turno.label}
                                    range={turno.range}
                                    items={dayItems.filter(item => String(item.Turno || item.turno || '1') === turno.id)}
                                    techs={turno.technicians}
                                    realData={productionRecords || []}
                                    onItemClick={handleItemClick}
                                    onAddClick={handleShiftClick}
                                    day={day}
                                />
                            ))}
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Diálogo de Edição / Novo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Planejamento' : `Novo Planejamento - ${selectedTurno}º Turno`}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="equipamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Equipamento</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <Button type="button" variant={field.value === 'TORNO CNC CENTUR 30' ? 'default' : 'outline'} className="h-16 flex flex-col" onClick={() => field.onChange('TORNO CNC CENTUR 30')}><Settings2 className="h-4 w-4" /><span className="text-xs font-bold">TORNO CENTUR 30</span></Button>
                      <Button type="button" variant={field.value === 'CENTRO DE USINAGEM D600' ? 'default' : 'outline'} className="h-16 flex flex-col" onClick={() => field.onChange('CENTRO DE USINAGEM D600')}><Cpu className="h-4 w-4" /><span className="text-xs font-bold">CENTRO D600</span></Button>
                    </div>
                  </FormItem>
                )} />

              <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-primary">Atividades / Perdas Planejadas</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ tipo: 'PRODUCAO', tempo: 0, site: form.getValues('site') || 'VALINHOS DOVE' })} className="h-7 text-[10px] font-bold"><PlusCircle className="h-3 w-3 mr-1" /> ADICIONAR</Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex-[1.5]">
                      <FormField control={form.control} name={`atividades.${index}.tipo`} render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {lossOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />{opt.label}</div></SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="flex-[1.5]">
                      <FormField control={form.control} name={`atividades.${index}.site`} render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Fábrica" /></SelectTrigger></FormControl>
                            <SelectContent>{factoryList.map(f => <SelectItem key={f} value={f} className="text-[10px]">{f}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="w-20">
                      <FormField control={form.control} name={`atividades.${index}.tempo`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" step="0.1" placeholder="H" className="h-8 text-[10px]" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    {fields.length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => removeAtividade(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tecnico" render={({ field }) => (<FormItem><FormLabel>Técnico</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name="site" render={({ field }) => (
                    <FormItem><FormLabel>Fábrica Principal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="requisicao" render={({ field }) => (<FormItem><FormLabel>Nº Forms</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="nomeDaPeca" render={({ field }) => (<FormItem><FormLabel>Peça</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="quantidade" render={({ field }) => (<FormItem><FormLabel>Meta (Pç)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="observacao" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
              <DialogFooter>
                {editingId && (<Button type="button" variant="destructive" onClick={async () => { if (!database || !editingId) return; await remove(ref(database, `/Planejamento S/${editingId}`)); toast({ title: "Planejamento Excluído" }); setIsDialogOpen(false); }}>Excluir</Button>)}
                <Button type="submit">Salvar Planejamento</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
