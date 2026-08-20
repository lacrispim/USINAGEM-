
'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eraser,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  FileUp,
  Plus,
  Trash2,
  Filter,
  Cpu,
  Search,
  Anchor,
  Power,
  PowerOff,
  AlertCircle,
  Check,
  Clock,
  Loader2,
  ChevronsLeft
} from 'lucide-react';
import { format, addDays, startOfDay, parse, isValid, getDay, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { cruzarComPlano, ComparacaoItem } from '@/lib/realizado';

const TOLERANCIA_ADERENCIA = 0.10;
const MONTHS = [
    { value: '0', label: 'JANEIRO' }, { value: '1', label: 'FEVEREIRO' }, { value: '2', label: 'MARÇO' },
    { value: '3', label: 'ABRIL' }, { value: '4', label: 'MAIO' }, { value: '5', label: 'JUNHO' },
    { value: '6', label: 'JULHO' }, { value: '7', label: 'AGOSTO' }, { value: '8', label: 'SETEMBRO' },
    { value: '9', label: 'OUTUBRO' }, { value: '10', label: 'NOVEMBRO' }, { value: '11', label: 'DEZEMBRO' }
];

interface JobBase {
  id: string;
  requisicao: string;
  nomeDaPeca: string;
  quantidade: number;
  setup: number;
  torno: number;
  centro: number;
  prog: number;
  site: string;
  etapa1: string;
  etapa2: string;
  dataDesejada?: string; 
  turnoDesejado?: string; 
  ordemTorno?: number;
  ordemCentro?: number;
  updatedAt?: any;
}

interface PlanejamentoItem {
  id: string;
  dataExecucao: string;
  tecnico: string;
  equipamento: string;
  requisicao: string;
  nomeDaPeca: string;
  quantidadeTotal: number;
  quantidadeNoBloco: number;
  tempoMinutos: number;    
  setupMinutos: number;
  turno: string;
  startOffsetMin: number; 
  tipoAtividade: 'USINAGEM' | 'PROGRAMACAO' | 'PAUSA' | 'PERDA';
  techKey: 'TORNO' | 'CENTRO' | 'ADM';
  jobId: string;
  laneIndex: number;
  isConcluded?: boolean;
  site: string;
}

const TURNOS = [
  { id: '1', label: '1T', range: '06:00-13:00' },
  { id: '2', label: '2T', range: '13:00-20:00' },
  { id: '3', label: '3T', range: '20:00-03:00' },
];

const FACTORIES = ["VALINHOS", "VINHEDO", "POUSO ALEGRE", "INDAIATUBA", "AGUAÍ", "SUAPE", "IGARASSU", "GARANHUNS", "TORRE"];

const DEFAULT_MACHINE_LANES: Record<string, Record<string, string[]>> = {
  'TORNO': { '1': ['Gustavo Gozzi'], '2': ['Jair Melo'], '3': ['Alisson França'] },
  'CENTRO': { '1': ['Daniel Solivo'], '2': ['Nathan Xavier'], '3': ['Rodrigo Cantano'] },
  'ADM': { '1': ['William Martinucci'] }
};

const SHIFT_MIN = 420; 
const PAUSAS = [
  { start: 0, duration: 10, label: 'DDS', icon: Clock },
  { start: 180, duration: 15, label: 'CAFÉ', icon: Clock }
];

const isDomingo = (d: Date) => getDay(d) === 0;

const normalizeSiteName = (site: string | undefined): string => {
  if (!site) return 'VALINHOS';
  const s = String(site).toUpperCase().trim();
  if (s.includes('VALINHOS')) return 'VALINHOS';
  return s;
};

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

const Ruler = React.memo(() => {
  const marks = [];
  for (const m of Array.from({ length: 8 }, (_, i) => i * 60)) {
    const pc = (m / SHIFT_MIN) * 100;
    marks.push(<div key={m} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${pc}%` }}><div className={cn("w-px bg-border", m % 120 === 0 ? "h-[12px] bg-muted-foreground" : "h-[8px]")} />{m % 60 === 0 && <span className="text-[12px] font-mono font-black text-muted-foreground leading-none mt-1">{m / 60}h</span>}</div>);
  }
  return <div className="relative h-[24px] border-b border-border/50 mb-1">{marks}</div>;
});
Ruler.displayName = 'Ruler';

const TimelineBar = React.memo(({ item, onToggle }: { item: PlanejamentoItem, onToggle: (id: string) => void }) => {
  const totalMin = (item.tempoMinutos || 0) + (item.setupMinutos || 0);
  const widthPc = Math.max((totalMin / SHIFT_MIN) * 100, 0.5);
  const leftPc = (item.startOffsetMin / SHIFT_MIN) * 100;
  const setupPc = totalMin > 0 ? (item.setupMinutos / totalMin) * 100 : 0;

  const isTorno = item.techKey === 'TORNO';
  const isProg = item.techKey === 'ADM';
  const isLoss = item.tipoAtividade === 'PERDA';

  return (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div 
                  onClick={() => !isLoss && onToggle(item.id)}
                  className={cn(
                    "absolute top-[2px] bottom-[2px] rounded-[3px] overflow-hidden border border-black/40 flex shadow-sm transition-all z-[5] cursor-pointer group", 
                    isLoss ? "bg-red-900 border-red-700" : (isProg ? "bg-slate-700" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]")),
                    item.isConcluded && !isLoss && "opacity-40 grayscale-[0.5] border-green-500 border-2",
                    !isLoss && "hover:scale-[1.01] hover:brightness-110 hover:shadow-md"
                  )} 
                  style={{ left: `${leftPc}%`, width: `${widthPc}%` }} 
                >
                  {isLoss ? (
                    <div className="flex items-center gap-2 px-2 text-white overflow-hidden w-full whitespace-nowrap bg-red-950/40">
                         <AlertCircle className="h-4 w-4 shrink-0 text-white animate-pulse" />
                         <span className="font-black text-[11px] uppercase tracking-tighter">PERDAS: {Math.round(totalMin)} MIN</span>
                    </div>
                  ) : (
                    <>
                      {item.setupMinutos > 0 && (
                        <div 
                          className="h-full shrink-0 border-r border-black/20 flex items-center justify-center relative z-10 bg-stripes-hazard" 
                          style={{ width: `${setupPc}%` }}
                        >
                           <span className="text-[10px] font-black text-white bg-black/70 px-1 rounded-sm shadow-sm">S</span>
                        </div>
                      )}
                      <div className="flex-1 flex items-center gap-2 px-2 min-w-0 text-white overflow-hidden relative">
                        <span className="font-mono text-[14px] font-black shrink-0 drop-shadow-sm">#{item.requisicao}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.quantidadeNoBloco > 0 && <span className="bg-white/20 px-1 rounded-[1px] text-[12px] font-bold">{item.quantidadeNoBloco}pç</span>}
                          {widthPc > 5 && <span className="bg-black/40 px-1 rounded-[1px] text-[12px] font-black text-yellow-400 border border-yellow-400/20">{Math.round(totalMin)}m</span>}
                        </div>
                        {widthPc > 15 && (
                            <span className="text-[11px] opacity-90 truncate uppercase font-black leading-none drop-shadow-sm">{item.nomeDaPeca}</span>
                        )}
                        {item.isConcluded && <div className="absolute right-1 top-1/2 -translate-y-1/2"><Check className="h-4 w-4 text-green-400 stroke-[4px] drop-shadow-md" /></div>}
                      </div>
                    </>
                  )}
                </div>
            </TooltipTrigger>
            <TooltipContent className={cn("z-[100] p-4 shadow-2xl min-w-[280px]", isLoss ? "bg-red-800 text-white border-none" : "bg-card border")}>
                {isLoss ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-1"><AlertCircle className="h-4 w-4" /><span className="font-black uppercase text-[10px] tracking-widest">Capacidade Bloqueada</span></div>
                        <div className="whitespace-pre-line text-xs font-bold">{item.nomeDaPeca}</div>
                        <div className="pt-1 text-[10px] font-black">TOTAL CONSUMIDO: {Math.round(totalMin)} min</div>
                        <p className="text-[9px] opacity-70 italic">As perdas reais registradas bloqueiam o início do turno e empurram o planejamento restante.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                         <div className="flex items-center justify-between gap-4 border-b border-border pb-1">
                            <div className="flex items-center gap-2"><span className="font-mono font-black text-primary text-sm">#{item.requisicao}</span><Badge variant="secondary" className="h-5 text-[9px] font-black">{item.techKey}</Badge></div>
                            <span className={cn("text-[10px] font-black", item.isConcluded ? "text-green-500" : "text-amber-500")}>{item.isConcluded ? "CONCLUÍDO" : "PLANEJADO"}</span>
                        </div>
                        <p className="text-xs font-black uppercase leading-tight">{item.nomeDaPeca}</p>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="flex flex-col"><span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Tempo Total</span><span className="text-xs font-black">{Math.round(totalMin)} min</span></div>
                            {item.quantidadeNoBloco > 0 && (<div className="flex flex-col"><span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Qtd. Bloco</span><span className="text-xs font-black">{item.quantidadeNoBloco} pç</span></div>)}
                            <div className="flex flex-col"><span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Site</span><span className="text-xs font-black">{item.site}</span></div>
                        </div>
                        <div className="pt-2 mt-1 border-t border-border flex items-center justify-between text-[8px] text-muted-foreground uppercase font-bold italic"><span>{item.tecnico}</span><span>{item.dataExecucao} · {item.turno}T</span></div>
                    </div>
                )}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
});
TimelineBar.displayName = 'TimelineBar';

const ActualRow = React.memo(({ item }: { item: ComparacaoItem }) => {
  const isPerda = item.status === 'perda';
  const colors = { dentro: 'text-emerald-500', estourou: 'text-rose-500', adiantado: 'text-sky-500', semPlano: 'text-amber-500', semApontamento: 'text-muted-foreground/30', perda: 'text-red-500' };
  const bgColors = { dentro: 'bg-emerald-500/5', estourou: 'bg-rose-500/5', adiantado: 'bg-sky-500/5', semPlano: 'bg-amber-500/5', semApontamento: 'bg-transparent', perda: 'bg-red-500/10' };
  
  const hasPlan = item.tempoPlanejado > 0;
  const isPending = item.status === 'semApontamento';
  const deviation = hasPlan ? (item.tempoRealizado - item.tempoPlanejado) : 0;
  const devText = (!hasPlan || isPending || isPerda) ? '-' : (deviation === 0 ? 'OK' : (deviation > 0 ? `+${deviation}m` : `${deviation}m`));

  return (
    <div className={cn("grid grid-cols-[80px_100px_100px_100px_1fr_80px] items-center px-3 py-1.5 text-[12px] font-bold border-l-4 transition-colors", bgColors[item.status], item.status === 'dentro' ? "border-emerald-500" : item.status === 'estourou' ? "border-rose-500" : item.status === 'adiantado' ? "border-sky-500" : item.status === 'semPlano' ? "border-amber-500" : item.status === 'perda' ? "border-red-500" : "border-transparent")}>
      <div className={cn("font-mono", isPerda ? "text-red-500" : "text-foreground")}>{isPerda ? "#PERDAS" : `#${item.requisicao}`}</div>
      <div className="flex flex-col"><span className="text-muted-foreground/50 font-medium">{item.tempoPlanejado} min</span></div>
      <div className="flex flex-col"><span className={cn("font-black", colors[item.status])}>{isPending ? '---' : `${item.tempoRealizado} min`}</span></div>
      <div className={cn("font-black tabular-nums", colors[item.status])}>{devText}</div>
      <div className="flex items-center gap-2 overflow-hidden">
        {item.status === 'semPlano' && <Badge variant="outline" className="h-4 text-[8px] border-amber-500/30 text-amber-500 py-0 uppercase font-black shrink-0">Extra</Badge>}
        {isPerda && <span className="text-[10px] uppercase font-black text-red-500/70 truncate">{item.motivoPerda}</span>}
        {isPending && <span className="text-[10px] uppercase opacity-30 italic font-black">Pendente</span>}
      </div>
      <div className="text-right tabular-nums font-black opacity-80">{isPending ? '-' : (isPerda ? '' : `${item.pecasRealizadas} pç`)}</div>
    </div>
  );
});
ActualRow.displayName = 'ActualRow';

const JobExecutionCell = ({ job, calculatedDate, onUpdate }: { job: JobBase, calculatedDate?: string, onUpdate: (date: string | null) => void }) => {
  const forcedDate = job.dataDesejada ? parse(job.dataDesejada, 'yyyy-MM-dd', new Date()) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("h-9 w-full justify-start text-[12px] font-black uppercase border border-dashed", job.dataDesejada ? "border-primary text-primary" : "border-border text-muted-foreground/60")}>
          <CalendarDays className="h-4 w-4 mr-1.5 opacity-50" />
          {job.dataDesejada ? format(forcedDate!, 'dd/MM/yy') : (calculatedDate ? calculatedDate.substring(0, 5) : 'PEND')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" locale={ptBR} selected={forcedDate || undefined} onSelect={(d) => d && onUpdate(format(d, 'yyyy-MM-dd'))} disabled={isDomingo} initialFocus/>
      </PopoverContent>
    </Popover>
  );
};

export default function ProgrammingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUpdateRef = useRef<number>(0);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  
  const [fila, setFila] = useState<JobBase[]>([]);
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [disabledShifts, setDisabledShifts] = useState<Record<string, boolean>>({});
  const [techOverrides, setTechOverrides] = useState<Record<string, string>>({});
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>('all');
  const [tableRequisitionFilter, setTableRequisitionFilter] = useState<string>('');
  const deferredTableFilter = useDeferredValue(tableRequisitionFilter);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newItem, setNewItem] = useState<Partial<JobBase>>({ requisicao: '', nomeDaPeca: '', quantidade: 1, setup: 20, torno: 0, centro: 0, prog: 0, site: 'VALINHOS', etapa1: 'TORNO', etapa2: '' });

  const partitionKey = `${selectedYear}_${selectedMonth}`;
  const { data: filaDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', `fila_${partitionKey}`) : null, [firestore, partitionKey]));
  const { data: planoDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', `plano_${partitionKey}`) : null, [firestore, partitionKey]));
  const { data: configDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', `config_${partitionKey}`) : null, [firestore, partitionKey]));
  
  const { data: productionRecords } = useCollection(useMemoFirebase(() => firestore ? query(collection(firestore, 'productionRecords'), orderBy('date', 'desc'), limit(1500)) : null, [firestore]));
  const { data: lossRecords } = useCollection(useMemoFirebase(() => firestore ? query(collection(firestore, 'lossRecords'), orderBy('date', 'desc'), limit(2000)) : null, [firestore]));

  // Lógica de legado e inicialização de âncora
  useEffect(() => {
    async function checkLegacyData() {
        if (!firestore || fila.length > 0) return;
        if (selectedMonth === '7' && selectedYear === '2026') {
            const legacyFila = await getDoc(doc(firestore, 'programacaoState', 'fila'));
            if (legacyFila.exists() && Array.isArray(legacyFila.data().data)) {
                setFila(legacyFila.data().data);
                const legacyPlano = await getDoc(doc(firestore, 'programacaoState', 'plano'));
                if (legacyPlano.exists() && Array.isArray(legacyPlano.data().data)) {
                    setPlanejamentoData(legacyPlano.data().data);
                }
            }
        }
    }
    checkLegacyData();
  }, [firestore, selectedMonth, selectedYear, fila.length]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 3000) return;
    
    if (filaDoc && Array.isArray(filaDoc.data)) setFila(filaDoc.data);
    if (planoDoc && Array.isArray(planoDoc.data)) setPlanejamentoData(planoDoc.data);
    
    if (configDoc) {
      setDisabledShifts(configDoc.disabledShifts || {});
      setTechOverrides(configDoc.techOverrides || {});
      if (configDoc.planStartDate) {
        const parsed = parse(configDoc.planStartDate, 'yyyy-MM-dd', new Date());
        if (isValid(parsed)) setPlanStartDate(startOfDay(parsed));
      } else if (selectedMonth === '7' && selectedYear === '2026') {
          const augustAnchor = new Date(2026, 7, 3);
          setPlanStartDate(augustAnchor);
          setCurrentDate(augustAnchor);
      } else {
          const firstOfMonth = new Date(Number(selectedYear), Number(selectedMonth), 1);
          setPlanStartDate(firstOfMonth);
          setCurrentDate(firstOfMonth);
      }
    }
  }, [filaDoc, planoDoc, configDoc, selectedMonth, selectedYear]);

  const jobCompletionStats = useMemo(() => {
    const map = new Map<string, { total: number, concluded: number }>();
    for (const item of planejamentoData) {
      if (item.jobId === 'loss') continue;
      const stats = map.get(item.jobId) || { total: 0, concluded: 0 };
      stats.total++;
      if (item.isConcluded) stats.concluded++;
      map.set(item.jobId, stats);
    }
    return map;
  }, [planejamentoData]);

  const jobStartDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of planejamentoData) { if (item.jobId === 'loss') continue; if (!map.has(item.jobId)) map.set(item.jobId, item.dataExecucao); }
    return map;
  }, [planejamentoData]);

  const filteredFila = useMemo(() => {
    let data = fila;
    if (selectedSiteFilter !== 'all') data = data.filter(item => normalizeSiteName(item.site) === selectedSiteFilter);
    if (deferredTableFilter) { 
      const search = deferredTableFilter.toLowerCase(); 
      data = data.filter(item => item.requisicao.toLowerCase().includes(search) || item.nomeDaPeca.toLowerCase().includes(search)); 
    }
    return data;
  }, [fila, selectedSiteFilter, deferredTableFilter]);

  const planIndex = useMemo(() => {
    const map = new Map<string, PlanejamentoItem[]>();
    for (const i of planejamentoData) {
      const k = `${i.dataExecucao}|${i.turno}|${i.techKey}`;
      let arr = map.get(k);
      if (!arr) { arr = []; map.set(k, arr); }
      arr.push(i);
    }
    return map;
  }, [planejamentoData]);

  const realItems = useMemo(() => {
    if (!planejamentoData || !productionRecords || !lossRecords) return [];
    return cruzarComPlano(planejamentoData, productionRecords, lossRecords, TOLERANCIA_ADERENCIA);
  }, [planejamentoData, productionRecords, lossRecords]);

  const realIndex = useMemo(() => {
    const map = new Map<string, ComparacaoItem[]>();
    for (const i of realItems) {
      const k = `${i.dataStr}|${i.turno}|${i.techKey}`;
      let arr = map.get(k);
      if (!arr) { arr = []; map.set(k, arr); }
      arr.push(i);
    }
    return map;
  }, [realItems]);

  const toggleConcluded = useCallback(async (itemId: string) => {
    if (!firestore || !planejamentoData) return;
    const updatedPlano = planejamentoData.map(item => item.id === itemId ? { ...item, isConcluded: !item.isConcluded } : item);
    setPlanejamentoData(updatedPlano);
    try { await setDoc(doc(firestore, 'programacaoState', `plano_${partitionKey}`), { data: updatedPlano, updatedAt: serverTimestamp() }); } catch (e) {}
  }, [firestore, planejamentoData, partitionKey]);

  const nextWorkday = (d: Date) => { let res = new Date(d); while (isDomingo(res)) res = addDays(res, 1); return res; };

  const recalculatePlan = async (novaFila: JobBase[], currentDisabled = disabledShifts, currentOverrides = techOverrides, anchor?: Date) => {
    if (!firestore) return;
    setIsSaving(true);
    lastUpdateRef.current = Date.now();
    const baseDate = startOfDay(anchor ?? planStartDate ?? new Date());
    const novosPlanItems: PlanejamentoItem[] = [];
    const laneBusy: Record<string, { start: number; end: number }[]> = { 'TORNO_0': [], 'CENTRO_0': [], 'ADM_0': [] };
    
    const occupy = (laneId: string, start: number, end: number) => { 
        if (!laneBusy[laneId]) laneBusy[laneId] = []; 
        laneBusy[laneId].push({ start, end }); 
        laneBusy[laneId].sort((a, b) => a.start - b.start); 
    };

    const nextFree = (laneId: string, from: number) => {
      let t = from; 
      const intervals = laneBusy[laneId] || [];
      for (const iv of intervals) { 
        if (iv.end <= t + 0.1) continue; 
        if (iv.start > t + 0.1) return { start: t, limit: iv.start }; 
        t = iv.end; 
      }
      return { start: t, limit: Infinity };
    };

    // 1. PROCESSAR PERDAS REAIS PRIMEIRO: Elas ocupam o início do turno conforme solicitado
    const lossByShift: Record<string, number> = {};
    realItems.filter(r => r.status === 'perda').forEach(p => {
        const k = `${p.dataStr}|${p.turno}|${p.techKey}`;
        lossByShift[k] = (lossByShift[k] || 0) + p.tempoRealizado;
    });

    Object.entries(lossByShift).forEach(([key, totalTime]) => {
        const [dStr, shiftId, techKey] = key.split('|');
        try {
            const pDate = parse(dStr, 'dd/MM/yyyy', new Date());
            const dayIdx = differenceInCalendarDays(pDate, baseDate);
            if (dayIdx < 0) return;
            const shiftIdx = parseInt(shiftId) - 1;
            const shiftAbs = dayIdx * 3 * SHIFT_MIN + shiftIdx * SHIFT_MIN;
            
            // Ocupar o tempo de perda no motor de cálculo para empurrar o planejamento
            occupy(`${techKey}_0`, shiftAbs, shiftAbs + totalTime);
            
            // Adicionar barra visual de perda no lane planejado
            novosPlanItems.push({ 
                id: `loss-vis-${key}`, 
                dataExecucao: dStr, 
                tecnico: 'BLOQUEIO', 
                equipamento: 'PERDA', 
                requisicao: 'PERDA', 
                nomeDaPeca: 'CAPACIDADE BLOQUEADA POR PERDAS', 
                quantidadeTotal: 0, 
                quantidadeNoBloco: 0, 
                tempoMinutos: totalTime, 
                setupMinutos: 0, 
                turno: shiftId, 
                startOffsetMin: 0, 
                tipoAtividade: 'PERDA', 
                techKey: techKey as any, 
                jobId: 'loss', 
                laneIndex: 0, 
                site: 'LOCAL' 
            });
        } catch (e) {}
    });
    
    const concluidos = new Set(planejamentoData.filter(i => i.isConcluded).map(i => `${i.jobId}|${i.techKey}|${i.dataExecucao}|${i.turno}`));
    
    const allocateTask = (job: JobBase, techKey: 'TORNO' | 'CENTRO' | 'ADM', minStartTime: number, type: 'torno' | 'centro' | 'prog') => {
        let prodTime = Number(job[type]) || 0;
        let setupTime = (type === 'torno' || type === 'centro') ? (Number(job.setup) || 20) : 0;
        if (prodTime <= 0 && setupTime <= 0) return minStartTime;
        const laneId = `${techKey}_0`;
        let pendingSetup = setupTime; let pendingProd = prodTime; let doneProdTime = 0;
        const cycleTime = job.quantidade > 0 ? prodTime / job.quantidade : 0;
        
        let cursor = minStartTime;
        if (job.dataDesejada) { 
            const forcedDate = startOfDay(parse(job.dataDesejada, 'yyyy-MM-dd', new Date())); 
            if (isValid(forcedDate)) cursor = differenceInCalendarDays(forcedDate, baseDate) * 3 * SHIFT_MIN; 
        }

        let iter = 0;
        while ((pendingSetup > 0.01 || pendingProd > 0.01) && iter < 2000) {
            iter++; 
            const free = nextFree(laneId, cursor); 
            cursor = free.start;
            const dayIdx = Math.floor(cursor / (SHIFT_MIN * 3)); 
            const dayDate = addDays(baseDate, dayIdx);
            if (isDomingo(dayDate)) { cursor = (dayIdx + 1) * 3 * SHIFT_MIN; continue; }
            
            const shiftIdx = Math.floor((cursor % (SHIFT_MIN * 3)) / SHIFT_MIN); 
            const shiftAbs = dayIdx * 3 * SHIFT_MIN + shiftIdx * SHIFT_MIN; 
            const shiftId = String(shiftIdx + 1);
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const overrideKey = `${dateStr}_${techKey}_${shiftId}`;
            const techName = currentOverrides[overrideKey] || DEFAULT_MACHINE_LANES[techKey][shiftId]?.[0];
            const isShiftDisabled = currentDisabled[`${dateStr}_${shiftId}`];
            const isWrongShift = job.turnoDesejado && job.turnoDesejado !== '' && shiftId !== job.turnoDesejado;
            
            if (isShiftDisabled || !techName || (dateStr >= '2026-08-16' && techName === 'William Martinucci') || isWrongShift) { 
                cursor = shiftAbs + SHIFT_MIN; 
                continue; 
            }

            let winStart = cursor % SHIFT_MIN;
            for (const p of PAUSAS) { if (winStart < p.start + p.duration && winStart + 0.1 >= p.start) winStart = p.start + p.duration; }
            const abs = shiftAbs + winStart; 
            const avail = Math.min(SHIFT_MIN - winStart, free.limit - abs);
            if (avail < 1) { cursor = Number.isFinite(free.limit) ? Math.max(free.limit, abs) : shiftAbs + SHIFT_MIN; continue; }
            
            const sInShift = pendingSetup > 0 ? Math.min(pendingSetup, avail) : 0; 
            pendingSetup -= sInShift;
            const pInShift = Math.min(avail - sInShift, pendingProd);
            let qInShift = 0;
            if (pInShift > 0 && cycleTime > 0) { const before = Math.floor(doneProdTime / cycleTime + 1e-7); doneProdTime += pInShift; qInShift = Math.min(job.quantidade, Math.floor(doneProdTime / cycleTime + 1e-7)) - before; pendingProd -= pInShift; } else if (pInShift > 0) { pendingProd -= pInShift; }
            
            if (sInShift > 0 || pInShift > 0) {
                const duration = sInShift + pInShift; 
                occupy(laneId, abs, abs + duration);
                const displayDateStr = format(dayDate, 'dd/MM/yyyy');
                novosPlanItems.push({ id: `pl-${job.id}-${techKey}-${dateStr}-${shiftId}-${Math.round(winStart)}`, dataExecucao: displayDateStr, tecnico: techName, equipamento: type.toUpperCase(), requisicao: job.requisicao, nomeDaPeca: job.nomeDaPeca, quantidadeTotal: job.quantidade, quantidadeNoBloco: qInShift, tempoMinutos: pInShift, setupMinutos: sInShift, turno: shiftId, startOffsetMin: winStart, tipoAtividade: type === 'prog' ? 'PROGRAMACAO' : 'USINAGEM', techKey, jobId: job.id, laneIndex: 0, isConcluded: concluidos.has(`${job.id}|${techKey}|${displayDateStr}|${shiftId}`), site: normalizeSiteName(job.site) });
                cursor = abs + duration;
            } else cursor = shiftAbs + SHIFT_MIN;
        }
        return cursor;
    };

    const finishTimes: Record<string, number> = {};
    novaFila.forEach(j => allocateTask(j, 'ADM', 0, 'prog'));
    [...novaFila].filter(j => j.etapa1 === 'TORNO' || j.etapa2 === 'TORNO').sort((a, b) => (a.ordemTorno || 999) - (b.ordemTorno || 999)).forEach(j => finishTimes[j.id] = allocateTask(j, 'TORNO', j.etapa1 === 'TORNO' ? 0 : (finishTimes[j.id] || 0), 'torno'));
    [...novaFila].filter(j => j.etapa1 === 'CENTRO' || j.etapa2 === 'CENTRO').sort((a, b) => (a.ordemCentro || 999) - (b.ordemCentro || 999)).forEach(j => finishTimes[j.id] = allocateTask(j, 'CENTRO', j.etapa1 === 'CENTRO' ? 0 : (finishTimes[j.id] || 0), 'centro'));
    
    try {
        await setDoc(doc(firestore, 'programacaoState', `fila_${partitionKey}`), { data: novaFila, updatedAt: serverTimestamp() });
        await setDoc(doc(firestore, 'programacaoState', `plano_${partitionKey}`), { data: novosPlanItems, updatedAt: serverTimestamp() });
    } catch (e) {} finally { setIsSaving(false); }
  };

  const handleSetAnchorDate = async (date: Date | undefined) => {
    if (!firestore || !date) return;
    const selectedDate = nextWorkday(startOfDay(date)); setPlanStartDate(selectedDate);
    try { await setDoc(doc(firestore, 'programacaoState', `config_${partitionKey}`), { planStartDate: format(selectedDate, 'yyyy-MM-dd') }, { merge: true }); await recalculatePlan(fila, disabledShifts, techOverrides, selectedDate); } catch (e) {}
  };

  const updateJobField = async (id: string, field: keyof JobBase, value: any) => {
    const newFila = fila.map(j => j.id === id ? { ...j, [field]: value, updatedAt: Date.now() } : j); 
    setFila(newFila);
    await recalculatePlan(newFila);
  };

  const moveJob = async (currentIdx: number, newPos: number, type: 'GERAL' | 'TORNO' | 'CENTRO') => {
    const newFila = [...fila]; const item = newFila[currentIdx]; const target = Math.max(0, Math.min(newFila.length - 1, newPos - 1));
    if (type === 'GERAL') { const [removed] = newFila.splice(currentIdx, 1); newFila.splice(target, 0, removed); } 
    else {
      const field = type === 'TORNO' ? 'ordemTorno' : 'ordemCentro';
      const list = newFila.filter(j => j.etapa1 === type || j.etapa2 === type).sort((a, b) => (a[field] || 999) - (b[field] || 999));
      const filteredIdx = list.findIndex(j => j.id === item.id); const [removed] = list.splice(filteredIdx, 1);
      list.splice(Math.max(0, Math.min(list.length, newPos - 1)), 0, removed);
      list.forEach((j, i) => { const obj = newFila.find(nf => nf.id === j.id); if (obj) obj[field] = i + 1; });
    }
    setFila(newFila); await recalculatePlan(newFila);
  };

  const handleAddManual = async () => {
    if (!newItem.requisicao || !newItem.nomeDaPeca) { toast({ title: "Erro", description: "Preencha Requisição e Peça.", variant: "destructive" }); return; }
    const job: JobBase = { id: `job-${Date.now()}`, requisicao: newItem.requisicao!, nomeDaPeca: newItem.nomeDaPeca!.toUpperCase(), quantidade: Number(newItem.quantidade) || 1, setup: Number(newItem.setup) || 20, torno: Number(newItem.torno) || 0, centro: Number(newItem.centro) || 0, prog: Number(newItem.prog) || 0, site: newItem.site || 'VALINHOS', etapa1: newItem.etapa1 || 'TORNO', etapa2: '', turnoDesejado: '', ordemTorno: fila.length + 1, ordemCentro: fila.length + 1 };
    const nf = [...fila, job]; setFila(nf); await recalculatePlan(nf); setIsAddDialogOpen(false);
    setNewItem({ requisicao: '', nomeDaPeca: '', quantidade: 1, setup: 20, torno: 0, centro: 0, prog: 0, site: 'VALINHOS', etapa1: 'TORNO', etapa2: '' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !firestore) return;
    setIsImporting(true); const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target?.result as ArrayBuffer), { type: 'array' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const findVal = (row: any, keys: string[]) => { for (const k of keys) { const rk = Object.keys(row).find(x => x.toLowerCase().trim() === k.toLowerCase().trim()); if (rk) return row[rk]; } return undefined; };
        const novaFila: JobBase[] = json.map((row, i) => ({ id: `job-imp-${i}-${Date.now()}`, requisicao: String(findVal(row, ['requisição', 'requisicao', 'req', 'forms']) || 'S/N'), nomeDaPeca: String(findVal(row, ['peça', 'peca', 'nome']) || 'SEM NOME').toUpperCase(), quantidade: Number(findVal(row, ['qtd', 'quantidade']) || 1), setup: Number(findVal(row, ['setup']) || 20), torno: Number(findVal(row, ['torno']) || 0), centro: Number(findVal(row, ['centro']) || 0), prog: Number(findVal(row, ['prog', 'programação']) || 0), site: normalizeSiteName(String(findVal(row, ['site', 'fabrica']) || 'VALINHOS')), etapa1: String(findVal(row, ['etapa 1', 'etapa1']) || 'TORNO'), etapa2: String(findVal(row, ['etapa 2', 'etapa2']) || ''), ordemTorno: i + 1, ordemCentro: i + 1 }));
        setFila(novaFila); await recalculatePlan(novaFila);
      } catch (err) {} finally { setIsImporting(false); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderFilaTable = (jobs: JobBase[], type: 'GERAL' | 'TORNO' | 'CENTRO') => (
    <Table>
      <TableHeader><TableRow><TableHead className="w-20 text-center text-xs">POS</TableHead><TableHead className="w-16 text-center text-xs">MOVE</TableHead><TableHead className="text-xs">STATUS</TableHead><TableHead className="w-32 text-xs">DATA</TableHead><TableHead className="w-24 text-xs">TURNO</TableHead><TableHead className="w-40 text-xs">MÁQUINA</TableHead><TableHead className="text-xs">REQ.</TableHead><TableHead className="text-xs">PEÇA</TableHead><TableHead className="w-20 text-right text-xs">QTD</TableHead><TableHead className="w-24 text-right text-xs">SETUP</TableHead><TableHead className="w-24 text-right text-xs">TORNO</TableHead><TableHead className="w-24 text-right text-xs">CENTRO</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
      <TableBody>
        {jobs.length === 0 ? (<TableRow><TableCell colSpan={13} className="text-center py-10 opacity-30 italic">Nenhuma requisição encontrada</TableCell></TableRow>) : jobs.map((job, idx) => {
          const stats = jobCompletionStats.get(job.id); const isDone = stats && stats.total > 0 && stats.total === stats.concluded;
          const pos = type === 'GERAL' ? (idx + 1) : (type === 'TORNO' ? (job.ordemTorno || idx + 1) : (job.ordemCentro || idx + 1));
          return (
            <TableRow key={job.id} className={cn(isDone && "bg-green-500/5 opacity-60")}>
              <TableCell className="text-center"><Input type="number" defaultValue={pos} className="h-8 w-14 text-center font-black" onBlur={(e) => moveJob(idx, Number(e.target.value), type)}/></TableCell>
              <TableCell><div className="flex flex-col gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveJob(idx, pos - 1, type)} disabled={idx === 0}><ArrowUp className="h-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveJob(idx, pos + 1, type)} disabled={idx === jobs.length - 1}><ArrowDown className="h-3" /></Button></div></TableCell>
              <TableCell>{isDone ? <div className="text-green-500 font-black text-[10px]">CONCLUÍDO</div> : <div className="text-muted-foreground/40 font-black text-[10px]">PENDENTE</div>}</TableCell>
              <TableCell><JobExecutionCell job={job} calculatedDate={jobStartDates.get(job.id)} onUpdate={(d) => updateJobField(job.id, 'dataDesejada', d)}/></TableCell>
              <TableCell><Select value={job.turnoDesejado || "AUTO"} onValueChange={(v) => updateJobField(job.id, 'turnoDesejado', v === "AUTO" ? "" : v)}><SelectTrigger className="h-8 text-[11px] font-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">AUTO</SelectItem><SelectItem value="1">1T</SelectItem><SelectItem value="2">2T</SelectItem><SelectItem value="3">3T</SelectItem></SelectContent></Select></TableCell>
              <TableCell><div className="flex items-center gap-1"><Button variant={job.etapa1 === 'TORNO' || job.etapa2 === 'TORNO' ? "default" : "outline"} size="sm" className="h-7 w-8 font-black text-[10px]" onClick={() => updateJobField(job.id, 'etapa1', job.etapa1 === 'TORNO' ? '' : 'TORNO')}>T</Button><Button variant={job.etapa1 === 'CENTRO' || job.etapa2 === 'CENTRO' ? "default" : "outline"} size="sm" className="h-7 w-8 font-black text-[10px]" onClick={() => updateJobField(job.id, 'etapa1', job.etapa1 === 'CENTRO' ? '' : 'CENTRO')}>C</Button></div></TableCell>
              <TableCell><Input className="h-8 w-20 font-mono text-[11px]" defaultValue={job.requisicao} onBlur={(e) => updateJobField(job.id, 'requisicao', e.target.value)}/></TableCell>
              <TableCell><Input className="h-8 w-full min-w-[150px] text-[11px] uppercase" defaultValue={job.nomeDaPeca} onBlur={(e) => updateJobField(job.id, 'nomeDaPeca', e.target.value.toUpperCase())}/></TableCell>
              <TableCell className="text-right"><Input type="number" className="h-8 w-12 text-right" defaultValue={job.quantidade} onBlur={(e) => updateJobField(job.id, 'quantidade', Number(e.target.value))}/></TableCell>
              <TableCell className="text-right"><Input type="number" className="h-8 w-20 text-right font-bold text-amber-500 border-amber-500/30" defaultValue={job.setup} onBlur={(e) => updateJobField(job.id, 'setup', Number(e.target.value))}/></TableCell>
              <TableCell className="text-right"><Input type="number" className="h-8 w-20 text-right font-bold text-cyan-500 border-cyan-500/30" defaultValue={job.torno} onBlur={(e) => updateJobField(job.id, 'torno', Number(e.target.value))}/></TableCell>
              <TableCell className="text-right"><Input type="number" className="h-8 w-20 text-right font-bold text-purple-500 border-purple-500/30" defaultValue={job.centro} onBlur={(e) => updateJobField(job.id, 'centro', Number(e.target.value))}/></TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { const nf = fila.filter(f => f.id !== job.id); setFila(nf); recalculatePlan(nf); }}><Trash2 className="h-4" /></Button></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Planejamento CNC</h1>
          <div className="flex items-center gap-2 mt-1">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-[140px] text-[11px] font-black"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-[90px] text-[11px] font-black"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
            </Select>
            {isSaving ? <Badge variant="outline" className="animate-pulse bg-amber-500/10 text-amber-500 border-amber-500/20">Salvando...</Badge> : <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Sincronizado</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Eraser className="h-5 w-5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Limpar Tudo?</AlertDialogTitle><AlertDialogDescription>Isso apagará toda a fila e o cronograma.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setFila([]); setPlanejamentoData([]); setDoc(doc(firestore!, 'programacaoState', `fila_${partitionKey}`), { data: [] }); }} className="bg-destructive">Limpar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => handleSetAnchorDate(planStartDate || new Date())} className="h-10 font-black uppercase text-[11px]"><Anchor className="h-4 w-4 mr-2" /> {planStartDate ? `Início: ${format(planStartDate, 'dd/MM')}` : "Definir Âncora"}</Button>
              </TooltipTrigger>
              <TooltipContent><p>Recalcular plano desde a âncora</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-primary"><CalendarDays className="h-5 w-5" /></Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" locale={ptBR} selected={planStartDate || undefined} onSelect={handleSetAnchorDate} disabled={isDomingo} initialFocus/></PopoverContent>
          </Popover>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button variant="secondary" className="h-10 font-black uppercase text-[11px]"><Plus className="h-4 w-4 mr-2" /> Nova Requisição</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader><DialogTitle>Adicionar Peça</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>REQ</Label><Input value={newItem.requisicao} onChange={e => setNewItem({...newItem, requisicao: e.target.value})}/></div>
                  <div className="space-y-1"><Label>Peça</Label><Input value={newItem.nomeDaPeca} onChange={e => setNewItem({...newItem, nomeDaPeca: e.target.value.toUpperCase()})}/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Máquina</Label><Select value={newItem.etapa1} onValueChange={v => setNewItem({...newItem, etapa1: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TORNO">TORNO</SelectItem><SelectItem value="CENTRO">CENTRO</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label>Fábrica</Label><Select value={newItem.site} onValueChange={v => setNewItem({...newItem, site: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FACTORIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label>Qtd</Label><Input type="number" value={newItem.quantidade} onChange={e => setNewItem({...newItem, quantidade: Number(e.target.value)})}/></div>
                  <div className="space-y-1"><Label>T (min)</Label><Input type="number" value={newItem.torno} onChange={e => setNewItem({...newItem, torno: Number(e.target.value)})}/></div>
                  <div className="space-y-1"><Label>C (min)</Label><Input type="number" value={newItem.centro} onChange={e => setNewItem({...newItem, centro: Number(e.target.value)})}/></div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleAddManual} className="w-full">Adicionar</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
          <Button className="h-10 font-black uppercase text-[11px]" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>{isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />} Importar Excel</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-card/50 border rounded-lg p-1.5 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground ml-2" />
          <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}><SelectTrigger className="h-9 w-[180px] text-[11px] font-black border-0 bg-transparent shadow-none focus:ring-0"><SelectValue placeholder="Fábrica" /></SelectTrigger><SelectContent><SelectItem value="all">TODAS FÁBRICAS</SelectItem>{FACTORIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
          <div className="h-5 w-px bg-border/50" /><Cpu className="h-4 w-4 text-muted-foreground ml-2" />
          <Select value={selectedEquipmentFilter} onValueChange={setSelectedEquipmentFilter}><SelectTrigger className="h-9 w-[150px] text-[11px] font-black border-0 bg-transparent shadow-none focus:ring-0"><SelectValue placeholder="Equipamento" /></SelectTrigger><SelectContent><SelectItem value="all">TODOS</SelectItem><SelectItem value="TORNO">TORNO</SelectItem><SelectItem value="CENTRO">CENTRO</SelectItem></SelectContent></Select>
        </div>
        <div className="flex items-center bg-card/50 border rounded-lg p-1.5 w-full md:w-auto justify-center">
          <Button variant="ghost" size="icon" onClick={() => planStartDate && setCurrentDate(planStartDate)}><ChevronsLeft className="h-5 w-5" /></Button><Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addDays(prev, -1))}><ChevronLeft className="h-5 w-5" /></Button>
          <Popover><PopoverTrigger asChild><Button variant="ghost" className="font-black px-4 text-[12px] min-w-[140px] text-primary"><CalendarDays className="h-4 w-4 mr-2" />{format(currentDate, 'dd/MM/yyyy')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" locale={ptBR} selected={currentDate} onSelect={d => d && setCurrentDate(startOfDay(d))} disabled={isDomingo} initialFocus/></PopoverContent></Popover>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addDays(prev, 1))}><ChevronRight className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="space-y-8">
        {[currentDate].map(day => {
          const dStr = format(day, 'yyyy-MM-dd'); const dDisplay = format(day, 'dd/MM/yyyy');
          return (
            <div key={dStr} className="bg-card border rounded-lg overflow-hidden shadow-sm">
              <div className="bg-muted/10 p-4 border-b flex items-center justify-between"><div className="flex items-center gap-4"><span className="text-2xl font-bold">{format(day, 'dd · MM/yy')}</span><span className="text-[10px] font-black uppercase opacity-40">{format(day, 'EEEE', { locale: ptBR })}</span></div></div>
              {TURNOS.map(t => {
                const shiftKey = `${dStr}_${t.id}`; const isDisabled = disabledShifts[shiftKey];
                return (
                  <div key={t.id} className={cn("grid grid-cols-[100px_1fr] border-b last:border-0", isDisabled && "bg-stripes")}>
                    <div className="p-4 flex flex-col items-center justify-center border-r bg-muted/5"><span className={cn("text-xl font-black", isDisabled && "opacity-20")}>{t.label}</span><Button variant="ghost" size="icon" className="h-7 w-7 mt-2" onClick={() => { const nd = { ...disabledShifts, [shiftKey]: !isDisabled }; setDisabledShifts(nd); setDoc(doc(firestore!, 'programacaoState', `config_${partitionKey}`), { disabledShifts: nd }, { merge: true }); recalculatePlan(fila, nd); }}>{isDisabled ? <PowerOff className="h-4 text-destructive" /> : <Power className="h-4 text-green-500" />}</Button></div>
                    <div className="p-4 overflow-x-auto">{!isDisabled && (<div className="min-w-[800px]"><Ruler />{['TORNO', 'CENTRO', 'ADM'].filter(cat => selectedEquipmentFilter === 'all' || selectedEquipmentFilter === cat).map(cat => {
                            const tech = techOverrides[`${dStr}_${cat}_${t.id}`] || DEFAULT_MACHINE_LANES[cat][t.id]?.[0];
                            if (!tech || (dStr >= '2026-08-16' && tech === 'William Martinucci')) return null;
                            const items = planIndex.get(`${dDisplay}|${t.id}|${cat}`) || []; const reals = realIndex.get(`${dDisplay}|${t.id}|${cat}`) || [];
                            return (
                              <div key={`${cat}-${t.id}`} className="grid grid-cols-[160px_1fr] gap-4 mb-6 last:mb-0">
                                <div className="pt-2">
                                    <div className={cn("text-[10px] font-black uppercase", cat === 'TORNO' ? "text-cyan-500" : (cat === 'CENTRO' ? "text-purple-500" : "text-slate-500"))}>{cat}</div>
                                    <div className="text-xs font-black truncate">{tech}</div>
                                </div>
                                <div className="space-y-2">
                                  <div className="relative h-10 border rounded bg-black/5 overflow-hidden">
                                    {PAUSAS.map(p => <div key={p.label} className="absolute top-0 bottom-0 bg-yellow-500/10 border-x flex items-center justify-center" style={{ left: `${(p.start / SHIFT_MIN) * 100}%`, width: `${(p.duration / SHIFT_MIN) * 100}%` }}><p.icon className="h-3 w-3 opacity-20" /></div>)}
                                    {items.map(it => <TimelineBar key={it.id} item={it} onToggle={toggleConcluded} />)}
                                  </div>
                                  <div className="space-y-1">
                                    {reals.map(it => <ActualRow key={it.id} item={it} />)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}</div>)}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Card className="mt-8 border-t-4 border-t-primary">
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl uppercase font-black">Fila de Produção & Sequenciamento</CardTitle>
          <div className="flex items-center gap-2 bg-background border rounded-md px-3 h-10 w-full md:w-[300px]">
            <Search className="h-4 w-4 opacity-40" />
            <Input placeholder="FILTRAR REQUISIÇÃO OU PEÇA..." value={tableRequisitionFilter} onChange={e => setTableRequisitionFilter(e.target.value)} className="border-0 shadow-none focus-visible:ring-0 text-[11px] font-black uppercase p-0 h-full" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="px-6 border-b"><TabsList className="h-10 bg-transparent gap-6"><TabsTrigger value="all" className="text-[11px] font-black border-b-2 border-transparent data-[state=active]:border-primary rounded-none">GERAL</TabsTrigger><TabsTrigger value="TORNO" className="text-[11px] font-black border-b-2 border-transparent data-[state=active]:border-primary rounded-none">TORNO CNC</TabsTrigger><TabsTrigger value="CENTRO" className="text-[11px] font-black border-b-2 border-transparent data-[state=active]:border-primary rounded-none">CENTRO CNC</TabsTrigger></TabsList></div>
            <TabsContent value="all">{renderFilaTable(filteredFila, 'GERAL')}</TabsContent>
            <TabsContent value="TORNO">{renderFilaTable(filteredFila.filter(j => j.etapa1 === 'TORNO' || j.etapa2 === 'TORNO'), 'TORNO')}</TabsContent>
            <TabsContent value="CENTRO">{renderFilaTable(filteredFila.filter(j => j.etapa1 === 'CENTRO' || j.etapa2 === 'CENTRO'), 'CENTRO')}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <style jsx global>{`
        .bg-stripes { background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 10px, transparent 10px, transparent 20px); }
        .bg-stripes-hazard { background-image: repeating-linear-gradient(45deg, #F0BC00 0, #F0BC00 5px, #101820 5px, #101820 10px); }
        .bg-stripes-hazard-red { background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0, rgba(255, 255, 255, 0.1) 5px, transparent 5px, transparent 10px); }
      `}</style>
    </div>
  );
}
