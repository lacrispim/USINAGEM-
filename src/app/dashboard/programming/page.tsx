
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDatabase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { collection, query, where } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader, 
  Plus,
  Trash2,
  Settings2,
  Cpu,
  CalendarDays,
  Wand2,
  Eraser,
} from 'lucide-react';
import { 
  format, 
  startOfDay,
  endOfDay,
  addDays,
  isSameDay,
  parse
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// --- Interfaces Baseadas no Código do Usuário ---
interface PlanejamentoItem {
  id: string;
  dataExecucao: string;
  tecnico: string;
  equipamento: string;
  requisicao: string;
  nomeDaPeca: string;
  quantidadeTotal: number;
  quantidadeNoBloco: number;
  horasPlanejadas: number; // Em horas (para compatibilidade)
  tempoMinutos: number;    // Em minutos (para o motor)
  setupMinutos: number;
  turno: string;
  perdaPlanejada?: string;
  site: string;
  observacao?: string;
  startOffsetMin: number; // Offset dentro do turno (0-480)
}

// --- Configuração Oficial do Time ---
const TURNOS = [
  { id: '1', label: '1T', range: '06:00-14:00' },
  { id: '2', label: '2T', range: '14:00-22:00' },
  { id: '3', label: '3T', range: '22:00-06:00' },
];

const EQUIPE: Record<string, Record<string, { name: string; role: string }>> = {
  'TORNO': {
    '1': { name: 'Marcos Barbosa', role: 'Téc. Prog./Op.' },
    '2': { name: 'Jair Melo', role: 'Téc. Prog./Op.' },
    '3': { name: 'Gustavo Gozzi', role: 'Téc. Prog./Op.' }
  },
  'CENTRO': {
    '1': { name: 'Daniel Solivo', role: 'Téc. Operador' },
    '2': { name: 'Nathan Xavier', role: 'Téc. Prog./Op.' },
    '3': { name: 'Rodrigo Cantano', role: 'Téc. Prog./Op.' }
  },
  'ADM': {
    '1': { name: 'William Martinucci', role: 'Programador ADM' },
    '2': { name: 'Alisson França', role: 'Programador ADM' }
  }
};

const factoryList = ["VALINHOS DOVE", "VALINHOS SABONETE", "VINHEDO", "POUSO ALEGRE", "INDAIATUBA", "AGUAÍ", "SUAPE", "IGARASSU", "GARANHUNS", "TORRE"];

// --- Form Schema ---
const planningFormSchema = z.object({
  dataExecucao: z.string(),
  equipamento: z.string(),
  requisicao: z.string(),
  nomeDaPeca: z.string(),
  quantidadeTotal: z.coerce.number(),
  quantidadeNoBloco: z.coerce.number(),
  tecnico: z.string(),
  tempoMinutos: z.coerce.number(),
  setupMinutos: z.coerce.number(),
  turno: z.string(),
  site: z.string(),
  perdaPlanejada: z.string().optional(),
  observacao: z.string().optional(),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

// --- Componentes Visuais (Estilo Industrial) ---

const Ruler = () => {
  const marks = [];
  for (let m = 0; m <= 480; m += 60) {
    const pc = (m / 480) * 100;
    const isMajor = m % 120 === 0;
    marks.push(
      <div key={m} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${pc}%` }}>
        <div className={cn("w-px bg-[#CBD5DD]", isMajor ? "h-[9px] bg-[#6C7C8B]" : "h-[5px]")} />
        {isMajor && <span className="text-[9px] font-mono text-[#6C7C8B] leading-none mt-1">{m / 60}h</span>}
      </div>
    );
  }
  return <div className="relative h-[18px] ml-[150px] border-b border-[#CBD5DD] mb-1">{marks}</div>;
};

const TimelineBar = ({ item, realData, onClick }: { item: PlanejamentoItem, realData: any[], onClick: () => void }) => {
  const totalMin = (item.tempoMinutos || 0) + (item.setupMinutos || 0);
  const widthPc = (totalMin / 480) * 100;
  const leftPc = (item.startOffsetMin / 480) * 100;
  const setupPc = totalMin > 0 ? (item.setupMinutos / totalMin) * 100 : 0;

  // Cálculo de progresso real do Firestore
  const realMinutes = realData
    .filter(r => String(r.formsNumber) === String(item.requisicao))
    .reduce((acc, curr) => acc + (Number(curr.machiningTime) || 0), 0);
  
  const progress = item.tempoMinutos > 0 ? Math.min((realMinutes / item.tempoMinutos) * 100, 100) : 0;

  const isTorno = item.equipamento.includes('TORNO');
  const isProg = item.perdaPlanejada === 'PROGRAMACAO';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "absolute top-[3px] bottom-[3px] rounded-[2px] overflow-hidden cursor-pointer border border-black/20 flex shadow-sm hover:-translate-y-0.5 transition-all z-10",
        isProg ? "bg-[#5B36A8]" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]")
      )}
      style={{ left: `${leftPc}%`, width: `${widthPc}%`, minWidth: '4px' }}
    >
      {item.setupMinutos > 0 && (
        <div 
          className="h-full shrink-0" 
          style={{ 
            width: `${setupPc}%`,
            background: 'repeating-linear-gradient(45deg, #F0BC00 0 5px, #3A2E00 5px 10px)' 
          }} 
          title={`Setup: ${item.setupMinutos}min`}
        />
      )}

      <div className="flex-1 flex items-center gap-2 px-2 min-w-0 text-white overflow-hidden">
        <span className="font-mono text-[11px] font-bold shrink-0">{item.requisicao}</span>
        <span className="font-mono text-[10px] opacity-80 shrink-0">{item.quantidadeNoBloco > 0 ? `${Math.floor(item.quantidadeNoBloco)} pç` : (item.setupMinutos > 0 ? 'setup' : 'curso')}</span>
        <span className="text-[10px] opacity-90 truncate uppercase font-medium">{item.nomeDaPeca}</span>
      </div>

      {/* Linha de progresso real na base */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-black/20 w-full">
        <div className="h-full bg-white opacity-60" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default function ProgrammingPage() {
  const database = useDatabase();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const timelineDays = useMemo(() => [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)], [currentDate]);

  const productionQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'productionRecords'), where('date', '>=', startOfDay(currentDate)), where('date', '<=', endOfDay(addDays(currentDate, 3))));
  }, [firestore, currentDate]);

  const { data: productionRecords } = useCollection(productionQuery);

  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: {
      dataExecucao: '', equipamento: '', requisicao: '', nomeDaPeca: '',
      quantidadeTotal: 0, quantidadeNoBloco: 0, tecnico: '', tempoMinutos: 0, setupMinutos: 0,
      turno: '1', site: 'VALINHOS DOVE', observacao: '',
    },
  });

  useEffect(() => {
    if (!database) { setLoading(false); return; }
    const dbRef = ref(database, '/Planejamento_V2');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPlanejamentoData(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      } else { setPlanejamentoData([]); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [database]);

  const handleShiftClick = (day: Date, turnoId: string, tech: string, techInfo: any) => {
    setEditingId(null);
    form.reset({
      dataExecucao: format(day, 'dd/MM/yyyy'),
      turno: turnoId, equipamento: tech === 'TORNO' ? 'TORNO CNC CENTUR 30' : 'CENTRO DE USINAGEM D600',
      requisicao: '', nomeDaPeca: '', quantidadeTotal: 0, quantidadeNoBloco: 0,
      tecnico: techInfo.name, tempoMinutos: 0, setupMinutos: 0, site: 'VALINHOS DOVE'
    });
    setIsDialogOpen(true);
  };

  const handleItemClick = (item: PlanejamentoItem) => {
    setEditingId(item.id);
    form.reset(item);
    setIsDialogOpen(true);
  };

  const clearAllPlanning = async () => {
    if (!database || !confirm("Apagar TODO o planejamento atual?")) return;
    await set(ref(database, '/Planejamento_V2'), null);
    toast({ title: "Planejamento Limpo" });
  };

  async function onSubmit(values: PlanningFormValues) {
    if (!database) return;
    try {
      const payload = { ...values, horasPlanejadas: (values.tempoMinutos + values.setupMinutos) / 60 };
      if (editingId) {
        await update(ref(database, `/Planejamento_V2/${editingId}`), payload);
      } else {
        await set(push(ref(database, '/Planejamento_V2')), { ...payload, startOffsetMin: 0 });
      }
      setIsDialogOpen(false);
      toast({ title: "Salvo com sucesso" });
    } catch (e) { console.error(e); }
  }

  // --- MOTOR DE PLANEJAMENTO INDUSTRIAL (LOGICA DO USUARIO) ---
  const handleImportAndPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !database) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'binary' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const S = 480; // 8 horas
        let pointers: Record<string, number> = { 'TORNO': 0, 'CENTRO': 0, 'ADM': 0 };
        const updates: any = {};

        const findVal = (row: any, keys: string[]) => {
            const k = Object.keys(row).find(k => keys.some(s => k.toLowerCase().includes(s.toLowerCase())));
            return k ? row[k] : undefined;
        };

        json.forEach((row) => {
          const req = String(findVal(row, ['req', 'requisicao']) || 'S/N');
          const peca = String(findVal(row, ['peca', 'nome', 'desc']) || 'SEM NOME');
          const qtdTotal = Number(findVal(row, ['qtd', 'quantidade']) || 1);
          const setupTotal = Number(findVal(row, ['setup']) || 0);
          const tornoTotal = Number(findVal(row, ['torno']) || 0);
          const centroTotal = Number(findVal(row, ['centro']) || 0);
          const progTotal = Number(findVal(row, ['prog', 'programacao']) || 0);
          const site = String(findVal(row, ['site', 'fabrica']) || 'VALINHOS DOVE');

          // 1. Programação ADM
          if (progTotal > 0) {
             const tech = pointers['ADM'] >= S ? '2' : '1';
             const start = pointers['ADM'] % S;
             const time = Math.min(progTotal, S - start);
             const newRef = push(ref(database, '/Planejamento_V2'));
             updates[newRef.key!] = {
                dataExecucao: format(currentDate, 'dd/MM/yyyy'), turno: '1', 
                tecnico: EQUIPE['ADM'][tech].name, equipamento: 'PROGRAMACAO',
                requisicao: req, nomeDaPeca: peca, quantidadeTotal: qtdTotal, quantidadeNoBloco: 0,
                tempoMinutos: time, setupMinutos: 0, site, startOffsetMin: start, perdaPlanejada: 'PROGRAMACAO'
             };
             pointers['ADM'] += time;
          }

          // 2. Usinagem (Motor de Ciclo)
          const technologies = [];
          if (tornoTotal > 0) technologies.push({ type: 'TORNO', total: tornoTotal, equip: 'TORNO CNC CENTUR 30' });
          if (centroTotal > 0) technologies.push({ type: 'CENTRO', total: centroTotal, equip: 'CENTRO DE USINAGEM D600' });

          technologies.forEach(tech => {
            let pendingSetup = setupTotal;
            let doneTime = 0;
            const cycle = tech.total / qtdTotal;

            while (pendingSetup > 0.1 || doneTime < tech.total - 0.1) {
              const currentTotal = pointers[tech.type];
              const shiftIdx = Math.floor(currentTotal / S);
              const dayOffset = Math.floor(shiftIdx / 3);
              const turnoNum = (shiftIdx % 3) + 1;
              const startOffset = currentTotal % S;
              const avail = S - startOffset;
              const tecnico = EQUIPE[tech.type][String(turnoNum)].name;

              let timeUsed = 0;
              let setupInShift = 0;
              let prodInShift = 0;
              let piecesInShift = 0;

              if (pendingSetup > 0.1) {
                setupInShift = Math.min(pendingSetup, avail);
                pendingSetup -= setupInShift;
                timeUsed += setupInShift;
              }

              const remaining = avail - timeUsed;
              if (remaining > 0.1 && doneTime < tech.total - 0.1) {
                prodInShift = Math.min(remaining, tech.total - doneTime);
                const before = Math.floor(doneTime / cycle + 0.001);
                doneTime += prodInShift;
                const after = Math.min(qtdTotal, Math.floor(doneTime / cycle + 0.001));
                piecesInShift = after - before;
                timeUsed += prodInShift;
              }

              const newRef = push(ref(database, '/Planejamento_V2'));
              updates[newRef.key!] = {
                dataExecucao: format(addDays(currentDate, dayOffset), 'dd/MM/yyyy'),
                turno: String(turnoNum), tecnico, equipamento: tech.equip,
                requisicao: req, nomeDaPeca: peca, quantidadeTotal: qtdTotal, quantidadeNoBloco: piecesInShift,
                tempoMinutos: prodInShift, setupMinutos: setupInShift, site, startOffsetMin: startOffset
              };

              pointers[tech.type] += timeUsed;
              if (dayOffset > 5) break; // Segurança contra loops
            }
          });
        });

        await set(ref(database, '/Planejamento_V2'), updates);
        toast({ title: "Planejamento Concluído", description: "Carga distribuída nas raias." });
      } catch (err) { console.error(err); toast({ title: "Erro", variant: "destructive" }); }
      finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col gap-8 bg-[#E4E9EE] min-h-screen -m-4 p-4 lg:-m-6 lg:p-6 font-['IBM_Plex_Sans']">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#101820] font-['Barlow_Condensed'] uppercase">PLANO DE CARGA CNC</h1>
          <p className="text-[11px] tracking-[0.22em] text-[#8FA3B2] uppercase font-bold">Time Técnico de Usinagem · Torno & Centro · 3 Turnos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="bg-destructive/10 border-destructive/20 text-destructive font-bold text-[10px] uppercase h-9" onClick={clearAllPlanning}>
            <Eraser className="h-4 w-4 mr-2" /> Limpar Plano
          </Button>

          <input type="file" ref={fileInputRef} onChange={handleImportAndPlan} accept=".xlsx, .xls, .csv" className="hidden" />
          <Button variant="outline" size="sm" className="bg-[#101820] text-[#F0BC00] font-bold text-[10px] uppercase h-9" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />} Importar & Planejar Automático
          </Button>

          <div className="flex items-center gap-2 bg-white p-1 rounded border border-[#CBD5DD] shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(p => addDays(p, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-[160px] text-center font-bold flex items-center justify-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#6C7C8B]" />
              <span className="capitalize text-[#0F151B]">{format(currentDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(p => addDays(p, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
            <div className="flex h-[400px] items-center justify-center gap-2 bg-white rounded-lg border shadow-sm">
                <Loader className="h-8 w-8 animate-spin text-[#5B36A8]" />
                <span className="font-bold uppercase text-[10px] tracking-widest text-[#6C7C8B]">Sincronizando Cronograma...</span>
            </div>
        ) : (
            timelineDays.map((day) => {
                const dayItems = planejamentoData.filter(item => {
                    let d; try { d = parse(item.dataExecucao, 'dd/MM/yyyy', new Date()); } catch { d = new Date(item.dataExecucao); }
                    return isSameDay(d, day);
                });

                return (
                    <div key={day.toString()} className="bg-white border border-[#CBD5DD] shadow-sm overflow-hidden rounded-sm">
                        <div className="bg-[#101820] text-white px-4 py-2.5 flex items-center justify-between border-b-4 border-[#F0BC00]">
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-bold uppercase tracking-widest font-['Barlow_Condensed']">Dia {format(day, 'dd · MM/yy')}</span>
                                <span className="text-[10px] font-bold text-[#8FA3B2] uppercase tracking-[0.18em]">{format(day, 'EEEE', { locale: ptBR })}</span>
                            </div>
                        </div>

                        <div className="divide-y divide-[#E2E9EE]">
                            {TURNOS.map(turno => (
                                <div key={turno.id} className="grid grid-cols-[118px_1fr]">
                                    <div className="bg-[#F4F7F9] border-r border-[#E2E9EE] p-3 flex flex-col justify-center items-center">
                                        <span className="text-2xl font-bold font-['Barlow_Condensed'] leading-none text-[#0F151B]">{turno.label}</span>
                                        <span className="text-[10px] font-mono text-[#6C7C8B] mt-1">{turno.range}</span>
                                    </div>
                                    <div className="p-3 bg-white">
                                        <Ruler />
                                        <div className="space-y-1.5">
                                          {['TORNO', 'CENTRO', 'ADM'].map((cat) => {
                                            const techGroup = EQUIPE[cat];
                                            return Object.keys(techGroup).map(subIdx => {
                                                const techInfo = techGroup[subIdx];
                                                if (cat === 'ADM' && turno.id !== '1') return null; // ADM só no 1T
                                                
                                                const techItems = dayItems.filter(i => i.tecnico === techInfo.name && i.turno === turno.id);
                                                const label = cat === 'TORNO' ? '▬ Torno' : (cat === 'CENTRO' ? '▣ Centro' : '▣ ADM');

                                                return (
                                                    <div key={techInfo.name} className="grid grid-cols-[150px_1fr] items-center group">
                                                        <div className="pr-2 min-w-0">
                                                            <div className={cn("text-[9px] font-mono font-bold uppercase", cat === 'TORNO' ? "text-[#00707F]" : "text-[#5B36A8]")}>{label}</div>
                                                            <div className="text-[12px] font-bold text-[#0F151B] truncate">{techInfo.name}</div>
                                                            <div className="text-[9px] text-[#6C7C8B] leading-none">{techInfo.role}</div>
                                                        </div>
                                                        <div className="relative h-[36px] border border-[#E2E9EE] rounded-[3px] bg-[repeating-linear-gradient(90deg,#F4F7F9_0_1px,transparent_1px_100%)] bg-[size:12.5%_100%] overflow-hidden">
                                                            {techItems.length === 0 && (
                                                                <div className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-widest text-[#A9B7C2] font-mono opacity-50">sem carga</div>
                                                            )}
                                                            {techItems.map(item => (
                                                                <TimelineBar key={item.id} item={item} realData={productionRecords || []} onClick={() => handleItemClick(item)} />
                                                            ))}
                                                            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-8 opacity-0 group-hover:opacity-100 transition-opacity text-[#6C7C8B]" onClick={() => handleShiftClick(day, turno.id, cat, techInfo)}>
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                          })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl font-['IBM_Plex_Sans']">
          <DialogHeader><DialogTitle className="font-['Barlow_Condensed'] text-2xl uppercase">{editingId ? 'Editar Bloco' : 'Novo Bloco de Planejamento'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="requisicao" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold">Requisição</FormLabel><FormControl><Input className="font-mono" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="nomeDaPeca" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold">Nome da Peça</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="quantidadeNoBloco" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold">Qtd no Turno</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="setupMinutos" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold">Setup (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="tempoMinutos" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold">Usinagem (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tecnico" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold">Técnico Responsável</FormLabel><Input disabled {...field} /></FormItem>)} />
                <FormField control={form.control} name="site" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] uppercase font-bold">Fábrica / Site</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
              </div>
              <DialogFooter>
                {editingId && (<Button type="button" variant="destructive" onClick={async () => { if (!database || !editingId) return; await remove(ref(database, `/Planejamento_V2/${editingId}`)); setIsDialogOpen(false); }}>Excluir</Button>)}
                <Button type="submit" className="bg-[#101820] text-[#F0BC00] uppercase font-bold text-xs">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
