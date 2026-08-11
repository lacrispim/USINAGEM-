
'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  Loader, 
  Eraser,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  FileUp,
  Coffee,
  Mic,
  Check,
  Power,
  PowerOff,
  Plus,
  Trash2,
  MapPin,
  UserRoundPen,
  Filter,
  Cpu,
  Search,
  Anchor,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format, addDays, startOfDay, parse, isValid, getDay } from 'date-fns';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  tipoAtividade: 'USINAGEM' | 'PROGRAMACAO' | 'PAUSA';
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

const ALL_TECHNICIANS = [
  "Alisson França", 
  "Daniel Solivo", 
  "Rodrigo Cantano", 
  "Gustavo Gozzi", 
  "William Martinucci", 
  "Nathan Xavier", 
  "Jair Melo", 
  "Marcos Barbosa"
];

// Configuração atualizada: ADM apenas no 1T com William Martinucci
const DEFAULT_MACHINE_LANES: Record<string, Record<string, string[]>> = {
  'TORNO': {
    '1': ['Gustavo Gozzi'],
    '2': ['Jair Melo'], 
    '3': ['Alisson França']
  },
  'CENTRO': {
    '1': ['Daniel Solivo'],
    '2': ['Nathan Xavier'],
    '3': ['Rodrigo Cantano']
  },
  'ADM': {
    '1': ['William Martinucci']
  }
};

const SHIFT_MIN = 420; 
const PAUSAS = [
  { start: 0, duration: 10, label: 'DDS', icon: Mic },
  { start: 180, duration: 15, label: 'CAFÉ', icon: Coffee }
];

// Auxiliares para Escala 6x1 (Domingo de folga)
const isDomingo = (d: Date) => getDay(d) === 0;
const nextWorkday = (d: Date) => (isDomingo(d) ? addDays(d, 1) : d);

const normalizeSiteName = (site: string | undefined): string => {
  if (!site) return 'VALINHOS';
  const s = String(site).toUpperCase().trim();
  if (s.includes('VALINHOS')) return 'VALINHOS';
  return s;
};

const Ruler = React.memo(() => {
  const marks = [];
  for (let m = 0; m <= SHIFT_MIN; m += 60) {
    const pc = (m / SHIFT_MIN) * 100;
    marks.push(<div key={m} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${pc}%` }}><div className={cn("w-px bg-border", m % 120 === 0 ? "h-[9px] bg-muted-foreground" : "h-[5px]")} />{m % 60 === 0 && <span className="text-[9px] font-mono text-muted-foreground leading-none mt-1">{m / 60}h</span>}</div>);
  }
  return <div className="relative h-[18px] ml-[155px] border-b border-border/50 mb-1">{marks}</div>;
});
Ruler.displayName = 'Ruler';

const TimelineBar = React.memo(({ item, onToggle }: { item: PlanejamentoItem, onToggle: (id: string) => void }) => {
  const totalMin = (item.tempoMinutos || 0) + (item.setupMinutos || 0);
  const widthPc = Math.max((totalMin / SHIFT_MIN) * 100, 0.5);
  const leftPc = (item.startOffsetMin / SHIFT_MIN) * 100;
  const setupPc = totalMin > 0 ? (item.setupMinutos / totalMin) * 100 : 0;

  const isTorno = item.techKey === 'TORNO';
  const isProg = item.techKey === 'ADM';

  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={cn(
        "absolute top-[3px] bottom-[3px] rounded-[2px] overflow-hidden border border-black/40 flex shadow-sm hover:scale-[1.01] transition-all z-[5] cursor-pointer group", 
        isProg ? "bg-slate-700" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]"),
        item.isConcluded && "opacity-40 grayscale-[0.5] border-green-500 border-2"
      )} 
      style={{ left: `${leftPc}%`, width: `${widthPc}%` }} 
      title={`#${item.requisicao} - ${item.nomeDaPeca} [${normalizeSiteName(item.site)}] - Tempo: ${Math.round(totalMin)}min ${item.isConcluded ? '(Concluído)' : ''}`}
    >
      {item.setupMinutos > 0 && (
        <div 
          className="h-full shrink-0 border-r border-black/20 flex items-center justify-center" 
          style={{ width: `${setupPc}%`, background: 'repeating-linear-gradient(45deg, #F0BC00 0 5px, #101820 5px 10px)' }}
        >
           <span className="text-[7px] font-black text-white bg-black/50 px-0.5 rounded-sm">S</span>
        </div>
      )}
      <div className="flex-1 flex items-center gap-1.5 px-1.5 min-w-0 text-white overflow-hidden relative">
        <span className="font-mono text-[9px] font-black shrink-0">#{item.requisicao}</span>
        
        <div className="flex items-center gap-0.5 shrink-0">
          {item.quantidadeNoBloco > 0 && (
            <span className="bg-white/20 px-1 rounded-[1px] text-[8px] font-bold">
              {item.quantidadeNoBloco}pç
            </span>
          )}
          <span className="bg-black/40 px-1 rounded-[1px] text-[8px] font-black text-yellow-400 border border-yellow-400/20">
            {Math.round(totalMin)}m
          </span>
        </div>

        <span className="text-[8px] opacity-80 truncate uppercase font-bold leading-none">{item.nomeDaPeca}</span>
        <span className="text-[6px] ml-auto opacity-60 font-black border border-white/20 px-0.5 rounded shrink-0">{normalizeSiteName(item.site)?.substring(0,3)}</span>
        
        {item.isConcluded && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Check className="h-3 w-3 text-green-400 stroke-[4px]" />
          </div>
        )}
      </div>
    </div>
  );
});
TimelineBar.displayName = 'TimelineBar';

export default function ProgrammingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewInitializedRef = useRef(false);
  
  const [fila, setFila] = useState<JobBase[]>([]);
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [disabledShifts, setDisabledShifts] = useState<Record<string, boolean>>({});
  const [techOverrides, setTechOverrides] = useState<Record<string, string>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
  
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>('all');
  const [requisitionFilter, setRequisitionFilter] = useState<string>('');
  const deferredRequisitionFilter = useDeferredValue(requisitionFilter);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [isAnchorPopoverOpen, setIsAnchorPopoverOpen] = useState(false);
  const [activeSwap, setActiveSwap] = useState<{ day: string, shiftId: string, category: string, currentTech: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [newItem, setNewItem] = useState<Partial<JobBase>>({
    requisicao: '',
    nomeDaPeca: '',
    quantidade: 1,
    setup: 20,
    torno: 0,
    centro: 0,
    prog: 0,
    site: 'VALINHOS',
    etapa1: '',
    etapa2: ''
  });

  const { data: filaDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', 'fila') : null, [firestore]));
  const { data: planoDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', 'plano') : null, [firestore]));
  const { data: configDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', 'config') : null, [firestore]));

  useEffect(() => {
    if (filaDoc) setFila(filaDoc.data || []);
    if (configDoc) {
      setDisabledShifts(configDoc.disabledShifts || {});
      setTechOverrides(configDoc.techOverrides || {});
      if (configDoc.planStartDate) {
        const parsed = parse(configDoc.planStartDate, 'yyyy-MM-dd', new Date());
        if (isValid(parsed)) {
          const base = startOfDay(parsed);
          setPlanStartDate(base);
          if (!viewInitializedRef.current) {
            setCurrentDate(base);
            viewInitializedRef.current = true;
          }
        }
      }
    }
    if (planoDoc) { 
      setPlanejamentoData(planoDoc.data || []); 
    }
  }, [filaDoc, planoDoc, configDoc]);

  const indexById = useMemo(() => new Map(fila.map((j, i) => [j.id, i])), [fila]);

  const jobCompletionStats = useMemo(() => {
    const map = new Map<string, { total: number, concluded: number }>();
    for (const item of planejamentoData) {
      const stats = map.get(item.jobId) || { total: 0, concluded: 0 };
      stats.total++;
      if (item.isConcluded) stats.concluded++;
      map.set(item.jobId, stats);
    }
    return map;
  }, [planejamentoData]);

  const filteredFila = useMemo(() => {
    let data = fila;
    if (selectedSiteFilter !== 'all') {
      data = data.filter(item => normalizeSiteName(item.site) === selectedSiteFilter);
    }
    if (deferredRequisitionFilter) {
      const search = deferredRequisitionFilter.toLowerCase();
      data = data.filter(item => 
        item.requisicao.toLowerCase().includes(search) || 
        item.nomeDaPeca.toLowerCase().includes(search)
      );
    }
    return data;
  }, [fila, selectedSiteFilter, deferredRequisitionFilter]);

  const filteredPlanejamento = useMemo(() => {
    let data = planejamentoData;
    if (selectedSiteFilter !== 'all') {
      data = data.filter(item => normalizeSiteName(item.site) === selectedSiteFilter);
    }
    if (deferredRequisitionFilter) {
      const search = deferredRequisitionFilter.toLowerCase();
      data = data.filter(item => item.requisicao.toLowerCase().includes(search));
    }
    return data;
  }, [planejamentoData, selectedSiteFilter, deferredRequisitionFilter]);

  const planIndex = useMemo(() => {
    const map = new Map<string, PlanejamentoItem[]>();
    for (const i of filteredPlanejamento) {
      const k = `${i.dataExecucao}|${i.turno}|${i.techKey}`;
      let arr = map.get(k);
      if (!arr) { arr = []; map.set(k, arr); }
      arr.push(i);
    }
    return map;
  }, [filteredPlanejamento]);

  const toggleConcluded = useCallback(async (itemId: string) => {
    if (!firestore || !planejamentoData) return;
    
    let updatedPlano: PlanejamentoItem[] = [];
    setPlanejamentoData(prev => {
        updatedPlano = prev.map(item => item.id === itemId ? { ...item, isConcluded: !item.isConcluded } : item);
        return updatedPlano;
    });

    const sanitize = (data: any[]) => data.map(i => Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v === undefined ? null : v])));
    try {
      await setDoc(doc(firestore, 'programacaoState', 'plano'), { data: sanitize(updatedPlano), updatedAt: serverTimestamp() });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao salvar status.", variant: "destructive" });
    }
  }, [firestore, toast, planejamentoData]);

  const recalculatePlan = async (
    novaFila: JobBase[], 
    currentDisabled = disabledShifts, 
    currentOverrides = techOverrides,
    anchor?: Date
  ) => {
    if (!firestore) return;
    
    const baseDate = startOfDay(anchor ?? planStartDate ?? new Date());
    const novosPlanItems: PlanejamentoItem[] = [];
    
    const laneBusy: Record<string, { start: number; end: number }[]> = {
      'TORNO_0': [], 'CENTRO_0': [], 'ADM_0': []
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

    const occupy = (laneId: string, start: number, end: number) => {
      if (!laneBusy[laneId]) laneBusy[laneId] = [];
      laneBusy[laneId].push({ start, end });
      laneBusy[laneId].sort((a, b) => a.start - b.start);
    };

    const concluidos = new Set(
        planejamentoData.filter(i => i.isConcluded)
            .map(i => `${i.jobId}|${i.techKey}|${i.dataExecucao}|${i.turno}`)
    );

    const allocateTask = (job: JobBase, techKey: 'TORNO' | 'CENTRO' | 'ADM', minStartTime: number, type: 'torno' | 'centro' | 'prog') => {
        let prodTime = Number(job[type]) || 0;
        let setupTime = (type === 'torno' || type === 'centro') ? (Number(job.setup) || 20) : 0;
        if (prodTime <= 0 && setupTime <= 0 && type !== 'prog') return minStartTime;
        if (type === 'prog' && prodTime <= 0) return minStartTime;
        
        const laneId = `${techKey}_0`;
        let pendingSetup = setupTime;
        let pendingProd = prodTime;
        let doneProdTime = 0;
        const cycleTime = job.quantidade > 0 ? prodTime / job.quantidade : prodTime;

        let cursor = minStartTime;
        let iterations = 0;
        while ((pendingSetup > 0.01 || pendingProd > 0.01) && iterations < 2000) {
            iterations++;
            const free = nextFree(laneId, cursor);
            cursor = free.start;

            const dayIdx = Math.floor(cursor / (SHIFT_MIN * 3));
            const dayDate = addDays(baseDate, dayIdx);
            
            if (isDomingo(dayDate)) {
              cursor = (dayIdx + 1) * 3 * SHIFT_MIN; 
              continue;
            }

            const startInDay = cursor % (SHIFT_MIN * 3);
            const shiftIdx = Math.floor(startInDay / SHIFT_MIN);
            const startOffset = startInDay % SHIFT_MIN;
            const shiftAbs = dayIdx * 3 * SHIFT_MIN + shiftIdx * SHIFT_MIN;
            
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const displayDateStr = format(dayDate, 'dd/MM/yyyy');
            const shiftId = String(shiftIdx + 1);
            
            const shiftKey = `${dateStr}_${shiftId}`;
            const overrideKey = `${dateStr}_${techKey}_${shiftId}`;
            
            const isShiftDisabled = currentDisabled[shiftKey];
            const techName = currentOverrides[overrideKey] || DEFAULT_MACHINE_LANES[techKey][shiftId]?.[0];

            if (isShiftDisabled || !techName) {
                cursor = shiftAbs + SHIFT_MIN;
                continue;
            }

            let winStart = startOffset;
            for (const p of PAUSAS) { 
                if (winStart < p.start + p.duration && winStart + 0.1 >= p.start) {
                    winStart = p.start + p.duration;
                }
            }

            const abs = shiftAbs + winStart;
            const availInShift = SHIFT_MIN - winStart;
            const availGlobal = Math.min(availInShift, free.limit - abs);

            if (availGlobal < 1) {
                cursor = Number.isFinite(free.limit) ? Math.max(free.limit, abs) : shiftAbs + SHIFT_MIN;
                continue;
            }

            let sInShift = pendingSetup > 0 ? Math.min(pendingSetup, availGlobal) : 0;
            pendingSetup -= sInShift;
            
            let pInShift = Math.min(availGlobal - sInShift, pendingProd);
            let qInShift = 0;
            
            if (pInShift > 0 && cycleTime > 0) {
                const before = Math.floor(doneProdTime / cycleTime + 1e-7);
                doneProdTime += pInShift;
                qInShift = Math.min(job.quantidade, Math.floor(doneProdTime / cycleTime + 1e-7)) - before;
                pendingProd -= pInShift;
            } else if (pInShift > 0 && pendingProd > 0 && cycleTime <= 0) {
                pInShift = Math.min(availGlobal - sInShift, pendingProd);
                pendingProd -= pInShift;
            }

            if (sInShift > 0 || pInShift > 0) {
                const duration = sInShift + pInShift;
                occupy(laneId, abs, abs + duration);
                
                const deterministicId = `pl-${job.id}-${techKey}-${dateStr}-${shiftId}-${Math.round(winStart)}`;
                const concludedKey = `${job.id}|${techKey}|${displayDateStr}|${shiftId}`;

                novosPlanItems.push({ 
                    id: deterministicId, 
                    dataExecucao: displayDateStr, 
                    tecnico: techName, 
                    equipamento: type.toUpperCase(), 
                    requisicao: job.requisicao, 
                    nomeDaPeca: job.nomeDaPeca, 
                    quantidadeTotal: job.quantidade, 
                    quantidadeNoBloco: qInShift, 
                    tempoMinutos: pInShift, 
                    setupMinutos: sInShift, 
                    turno: shiftId, 
                    startOffsetMin: winStart, 
                    tipoAtividade: type === 'prog' ? 'PROGRAMACAO' : 'USINAGEM', 
                    techKey, 
                    jobId: job.id, 
                    laneIndex: 0,
                    isConcluded: concluidos.has(concludedKey),
                    site: normalizeSiteName(job.site)
                });
                
                cursor = abs + duration;
            } else {
                cursor = shiftAbs + SHIFT_MIN;
            }
        }
        return cursor;
    };

    type OpDef = { job: JobBase; techKey: 'TORNO' | 'CENTRO'; type: 'torno' | 'centro'; order: number; };
    const parseEtapa = (v?: string) => {
        const s = String(v || '').toUpperCase();
        if (s.includes('TORNO')) return { techKey: 'TORNO' as const, type: 'torno' as const };
        if (s.includes('CENTRO')) return { techKey: 'CENTRO' as const, type: 'centro' as const };
        return null;
    };

    const opsLivres: OpDef[] = [];
    const opsPresas: OpDef[] = [];
    const completion: Record<string, number> = {};

    novaFila.forEach(job => allocateTask(job, 'ADM', 0, 'prog'));

    novaFila.forEach((job, order) => {
        const e1 = parseEtapa(job.etapa1);
        const e2 = parseEtapa(job.etapa2);
        const primeira = e1 ?? e2;
        const segunda = e1 && e2 ? e2 : null;
        if (primeira) opsLivres.push({ job, ...primeira, order });
        if (segunda) opsPresas.push({ job, ...segunda, order });
    });

    opsLivres.sort((a, b) => a.order - b.order).forEach(op => {
        completion[op.job.id] = allocateTask(op.job, op.techKey, 0, op.type);
    });

    opsPresas.sort((a, b) => a.order - b.order).forEach(op => {
        allocateTask(op.job, op.techKey, completion[op.job.id] ?? 0, op.type);
    });

    const sanitize = (data: any[]) => data.map(i => Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v === undefined ? null : v])));
    
    try {
        await setDoc(doc(firestore, 'programacaoState', 'fila'), { data: sanitize(novaFila), updatedAt: serverTimestamp() });
        await setDoc(doc(firestore, 'programacaoState', 'plano'), { data: sanitize(novosPlanItems), updatedAt: serverTimestamp() });
    } catch (error) {
        toast({ title: "Erro de Salvamento", description: "Falha ao gravar cronograma.", variant: "destructive" });
    }
  };

  const diasVisiveis = useMemo(() => {
    const dias: Date[] = [];
    let cursor = startOfDay(currentDate);
    while (dias.length < 5) {
      if (!isDomingo(cursor)) dias.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return dias;
  }, [currentDate]);

  const stepDay = (dir: 1 | -1) =>
    setCurrentDate(p => {
      const n = addDays(p, dir);
      return isDomingo(n) ? addDays(n, dir) : n; 
    });

  const handleSetAnchorDate = async (date: Date | undefined) => {
    if (!firestore || !date) return;
    const selectedDate = nextWorkday(startOfDay(date));
    setPlanStartDate(selectedDate);
    setCurrentDate(selectedDate);
    setIsAnchorPopoverOpen(false);
    
    try {
      await setDoc(doc(firestore, 'programacaoState', 'config'), {
        planStartDate: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: serverTimestamp()
      }, { merge: true });
      await recalculatePlan(fila, disabledShifts, techOverrides, selectedDate);
      toast({ title: "Âncora Atualizada", description: `O cronograma agora começa em ${format(selectedDate, 'dd/MM/yyyy')}.` });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao atualizar âncora.", variant: "destructive" });
    }
  };

  const handleClearAll = async () => {
    if (!firestore) return;
    setFila([]);
    setPlanejamentoData([]);
    try {
      await setDoc(doc(firestore, 'programacaoState', 'fila'), { data: [], updatedAt: serverTimestamp() });
      await setDoc(doc(firestore, 'programacaoState', 'plano'), { data: [], updatedAt: serverTimestamp() });
      await setDoc(doc(firestore, 'programacaoState', 'config'), { 
        planStartDate: null,
        disabledShifts: {},
        techOverrides: {},
        updatedAt: serverTimestamp() 
      }, { merge: true });
      setPlanStartDate(null);
      toast({ title: "Fila Limpa", description: "Todo o planejamento foi removido." });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao limpar dados.", variant: "destructive" });
    }
  };

  const toggleShift = async (day: Date, shiftId: string) => {
    if (!firestore) return;
    const key = `${format(day, 'yyyy-MM-dd')}_${shiftId}`;
    const newDisabled = { ...disabledShifts, [key]: !disabledShifts[key] };
    setDisabledShifts(newDisabled);
    try {
      await setDoc(doc(firestore, 'programacaoState', 'config'), { 
        disabledShifts: newDisabled, 
        techOverrides,
        updatedAt: serverTimestamp() 
      }, { merge: true });
      recalculatePlan(fila, newDisabled, techOverrides);
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao salvar configuração.", variant: "destructive" });
    }
  };

  const handleTechSwap = async (newTech: string) => {
    if (!firestore || !activeSwap) return;
    const { day, shiftId, category } = activeSwap;
    const key = `${day}_${category}_${shiftId}`;
    const newOverrides = { ...techOverrides, [key]: newTech };
    
    setTechOverrides(newOverrides);
    setIsSwapDialogOpen(false);
    
    try {
      await setDoc(doc(firestore, 'programacaoState', 'config'), { 
        techOverrides: newOverrides,
        disabledShifts,
        updatedAt: serverTimestamp() 
      }, { merge: true });
      recalculatePlan(fila, disabledShifts, newOverrides);
      toast({ title: "Técnico Alterado", description: `Turno assumido por ${newTech}.` });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao salvar troca.", variant: "destructive" });
    }
  };

  const updateJobField = useCallback(async (id: string, field: keyof JobBase, value: any) => {
    const currentJob = fila.find(j => j.id === id);
    if (!currentJob || currentJob[field] === value) return;

    const newFila = fila.map(j => j.id === id ? { ...j, [field]: value } : j);
    setFila(newFila);
    await recalculatePlan(newFila);
  }, [fila, disabledShifts, techOverrides, planStartDate, planejamentoData]);

  const moveJobToPosition = useCallback(async (currentIdx: number, newPos: number) => {
    const targetIdx = Math.max(0, Math.min(fila.length - 1, newPos - 1));
    if (currentIdx === targetIdx) return;
    
    const newFila = [...fila];
    const [movedItem] = newFila.splice(currentIdx, 1);
    newFila.splice(targetIdx, 0, movedItem);
    
    setFila(newFila);
    await recalculatePlan(newFila);
    toast({ title: "Sequência Alterada", description: `Item movido para a posição ${targetIdx + 1}.` });
  }, [fila, disabledShifts, techOverrides, planStartDate, planejamentoData]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !firestore) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target?.result as ArrayBuffer), { type: 'array' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const findVal = (row: any, keys: string[]) => {
            for (const key of keys) {
                const rowKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                if (rowKey !== undefined) return row[rowKey];
            }
            return undefined;
        };
        const novaFila: JobBase[] = json.map((row, i) => {
            const rawSite = String(findVal(row, ['site', 'fabrica', 'Fábrica', 'unidade', 'unidade de negócio']) || 'VALINHOS');
            const site = normalizeSiteName(rawSite);
            return {
              id: `job-${i}-${Date.now()}`,
              requisicao: String(findVal(row, ['requisição', 'requisicao', 'req', 'forms', 'Nº forms', 'Requisição2']) || 'S/N'),
              nomeDaPeca: String(findVal(row, ['peca', 'peça', 'nome', 'Nome da peça']) || 'SEM NOME'),
              quantidade: Number(findVal(row, ['qtd', 'quantidade', 'Quantidade solicitada']) || 1),
              setup: Number(findVal(row, ['Tempo setup TORNO', 'Tempo setup CENTRO', 'setup', 'Setup Minutos']) || 20),
              torno: Number(findVal(row, ['Tempo de Planejamento Torno Minutos todas as peças solicitadas', 'torno', 'torno minutos', 'torno min']) || 0),
              centro: Number(findVal(row, ['Tempo de Planejamento Centro Minutos todas as peças solicitadas', 'centro', 'centro minutos', 'centro min']) || 0),
              prog: Number(findVal(row, ['Tempo Programação Minutos', 'Tempo de Planejamento Programação Minutos todas as peças solicitadas', 'prog', 'programação', 'Programação Minutos']) || 0),
              site: site,
              etapa1: String(findVal(row, ['Etapa 1', 'etapa1', 'Etapa1', 'Etapa']) || ''),
              etapa2: String(findVal(row, ['Etapa 2', 'etapa2', 'Etapa2', 'Etapa']) || ''),
            };
        });
        
        const start = nextWorkday(planStartDate ?? startOfDay(new Date()));
        setPlanStartDate(start);
        setCurrentDate(start);
        
        await setDoc(doc(firestore, 'programacaoState', 'config'), {
            planStartDate: format(start, 'yyyy-MM-dd'),
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        await recalculatePlan(novaFila, disabledShifts, techOverrides, start);
        toast({ title: "Sucesso", description: `${novaFila.length} itens importados.` });
      } catch (err) {
          toast({ title: "Erro na Importação", description: "Falha ao processar planilha.", variant: "destructive" });
      } finally {
          setIsImporting(false);
          e.target.value = ''; 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddManual = async () => {
    if (!newItem.requisicao || !newItem.nomeDaPeca) {
      toast({ title: "Erro", description: "Preencha Requisição e Peça.", variant: "destructive" }); return;
    }
    const job: JobBase = {
      id: `job-m-${Date.now()}`,
      requisicao: newItem.requisicao || 'S/N',
      nomeDaPeca: newItem.nomeDaPeca || 'SEM NOME',
      quantidade: Number(newItem.quantidade) || 1,
      setup: Number(newItem.setup) || 20,
      torno: Number(newItem.torno) || 0,
      centro: Number(newItem.centro) || 0,
      prog: Number(newItem.prog) || 0,
      site: normalizeSiteName(newItem.site),
      etapa1: newItem.etapa1 || '',
      etapa2: newItem.etapa2 || ''
    };
    const nf = [...fila, job]; setFila(nf); await recalculatePlan(nf); setIsAddDialogOpen(false);
    setNewItem({ requisicao: '', nomeDaPeca: '', quantidade: 1, setup: 20, torno: 0, centro: 0, prog: 0, site: 'VALINHOS', etapa1: '', etapa2: '' });
  };

  const handleDeleteManual = async (id: string) => {
    const nf = fila.filter(j => j.id !== id); setFila(nf); await recalculatePlan(nf);
  };

  const renderFilaTable = (jobs: JobBase[], isGlobal: boolean = false) => (
    <Table>
      <TableHeader>
          <TableRow>
              <TableHead className="w-20 text-center">POS</TableHead>
              <TableHead className="w-20 text-center">AÇÕES</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>FÁBRICA / SITE</TableHead>
              <TableHead>FLUXO (E1 → E2)</TableHead>
              <TableHead>REQ.</TableHead>
              <TableHead>PEÇA</TableHead>
              <TableHead className="text-right">QTD</TableHead>
              <TableHead className="text-right">TEMPO (T|C|S)</TableHead>
              <TableHead className="w-10"></TableHead>
          </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.length === 0 ? (
          <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground font-mono text-xs uppercase tracking-widest italic opacity-50">Nenhuma requisição encontrada nesta categoria</TableCell></TableRow>
        ) : jobs.map((job, localIdx) => {
          const globalIdx = indexById.get(job.id) ?? 0;
          const displayIdx = isGlobal ? globalIdx + 1 : localIdx + 1;
          const normalizedSite = normalizeSiteName(job.site);
          const stats = jobCompletionStats.get(job.id);
          const isFullyConcluded = stats && stats.total > 0 && stats.total === stats.concluded;
          const isPartiallyConcluded = stats && stats.concluded > 0 && stats.concluded < stats.total;

          return (
            <TableRow key={job.id} className={cn("hover:bg-muted/5 transition-colors", isFullyConcluded && "bg-green-500/5 opacity-80")}>
              <TableCell className="text-center px-4">
                  <Input 
                      type="number" 
                      defaultValue={displayIdx}
                      key={`${job.id}-${displayIdx}`}
                      className="h-10 w-12 text-center text-sm font-black bg-background border-2 border-border focus:border-primary focus:ring-0 rounded-md transition-all"
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                          const newPos = parseInt(e.target.value);
                          if (isNaN(newPos) || newPos < 1) { e.target.value = String(displayIdx); return; }
                          if (isGlobal) {
                              if (newPos !== globalIdx + 1) moveJobToPosition(globalIdx, newPos);
                          } else {
                              if (newPos !== localIdx + 1) {
                                  const targetItem = jobs[Math.min(newPos - 1, jobs.length - 1)];
                                  const targetGlobalIdx = indexById.get(targetItem.id) ?? 0;
                                  moveJobToPosition(globalIdx, targetGlobalIdx + 1);
                              }
                          }
                      }}
                  />
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => {
                        if (isGlobal) moveJobToPosition(globalIdx, globalIdx);
                        else if (localIdx > 0) {
                          const targetGlobal = indexById.get(jobs[localIdx - 1].id) ?? 0;
                          moveJobToPosition(globalIdx, targetGlobal + 1);
                        }
                      }} 
                      disabled={isGlobal ? globalIdx === 0 : localIdx === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => {
                        if (isGlobal) moveJobToPosition(globalIdx, globalIdx + 2);
                        else if (localIdx < jobs.length - 1) {
                          const targetGlobal = indexById.get(jobs[localIdx + 1].id) ?? 0;
                          moveJobToPosition(globalIdx, targetGlobal + 1);
                        }
                      }} 
                      disabled={isGlobal ? globalIdx === fila.length - 1 : localIdx === jobs.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                </div>
              </TableCell>
              <TableCell>
                  {isFullyConcluded ? (
                      <div className="flex items-center gap-1.5 text-green-500 font-black text-[9px] uppercase">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          CONCLUÍDO
                      </div>
                  ) : isPartiallyConcluded ? (
                      <div className="flex items-center gap-1.5 text-yellow-500 font-black text-[9px] uppercase">
                          <Clock className="h-3.5 w-3.5" />
                          {Math.round((stats.concluded / stats.total) * 100)}%
                      </div>
                  ) : (
                      <div className="text-muted-foreground/40 font-black text-[9px] uppercase">PENDENTE</div>
                  )}
              </TableCell>
              <TableCell>
                  <Select 
                      value={normalizedSite} 
                      onValueChange={(v) => updateJobField(job.id, 'site', v)}
                  >
                      <SelectTrigger className="h-7 text-[10px] font-black uppercase border-primary/20 bg-background/50">
                          <MapPin className="h-3 w-3 text-primary mr-1" />
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          {FACTORIES.map(f => <SelectItem key={f} value={f} className="text-[10px] font-bold">{f}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                    <Input 
                      className="h-7 w-16 text-[9px] font-black uppercase p-1 bg-background/50 border-primary/20" 
                      defaultValue={job.etapa1}
                      onBlur={(e) => updateJobField(job.id, 'etapa1', e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                    <span className="text-[10px] opacity-30">→</span>
                    <Input 
                      className="h-7 w-16 text-[9px] font-black uppercase p-1 bg-background/50 border-primary/20" 
                      defaultValue={job.etapa2}
                      onBlur={(e) => updateJobField(job.id, 'etapa2', e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                </div>
              </TableCell>
              <TableCell>
                 <Input 
                    className="h-7 w-20 font-mono font-bold text-[10px] p-1 bg-background/50 border-primary/20" 
                    defaultValue={job.requisicao}
                    onBlur={(e) => updateJobField(job.id, 'requisicao', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              </TableCell>
              <TableCell>
                 <Input 
                    className="h-7 w-full min-w-[150px] uppercase text-[10px] font-medium p-1 bg-background/50 border-primary/20" 
                    defaultValue={job.nomeDaPeca}
                    onBlur={(e) => updateJobField(job.id, 'nomeDaPeca', e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              </TableCell>
              <TableCell className="text-right">
                  <Input 
                    type="number"
                    className="h-7 w-14 text-right text-[10px] font-black p-1 bg-background/50 border-primary/20" 
                    defaultValue={job.quantidade}
                    onBlur={(e) => updateJobField(job.id, 'quantidade', Number(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-muted-foreground">T:</span>
                    <Input type="number" className="h-6 w-12 text-right text-[9px] p-1 bg-background/50 border-primary/10" defaultValue={job.torno} onBlur={(e) => updateJobField(job.id, 'torno', Number(e.target.value))} />
                    <span className="text-[8px] font-bold text-muted-foreground">C:</span>
                    <Input type="number" className="h-6 w-12 text-right text-[9px] p-1 bg-background/50 border-primary/10" defaultValue={job.centro} onBlur={(e) => updateJobField(job.id, 'centro', Number(e.target.value))} />
                    <span className="text-[8px] font-bold text-muted-foreground">S:</span>
                    <Input type="number" className="h-6 w-10 text-right text-[9px] p-1 bg-background/50 border-primary/10" defaultValue={job.setup} onBlur={(e) => updateJobField(job.id, 'setup', Number(e.target.value))} />
                  </div>
                </div>
              </TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteManual(job.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-6 border-b border-border/50 pb-6 mb-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Plano de Carga CNC</h1>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-black mt-1 opacity-70">Escala 6x1 · Domingos de Folga</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" title="Limpar Todo Planejamento">
                  <Eraser className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deseja limpar todo o planejamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá permanentemente todas as requisições da fila, o cronograma visual e todas as configurações de turnos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Limpar Tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Popover open={isAnchorPopoverOpen} onOpenChange={setIsAnchorPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 text-[10px] font-black uppercase flex-1 sm:flex-none">
                  <Anchor className="h-4 w-4 mr-2" /> 
                  {planStartDate ? `Início: ${format(planStartDate, 'dd/MM/yy')}` : "Definir Âncora"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="px-3 pt-3 pb-1 border-b border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest">Início do plano</p>
                  <p className="text-[9px] text-muted-foreground">Define onde a programação começa a preencher os turnos.</p>
                </div>
                <Calendar
                  mode="single"
                  locale={ptBR}
                  selected={planStartDate || undefined}
                  onSelect={handleSetAnchorDate}
                  disabled={isDomingo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild><Button variant="secondary" className="h-10 text-[10px] font-black uppercase flex-1 sm:flex-none"><Plus className="h-4 w-4 mr-2" /> Nova Requisição</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Adicionar Requisição Manual</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Requisição</Label><Input value={newItem.requisicao} onChange={e => setNewItem({...newItem, requisicao: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Nome da Peça</Label><Input value={newItem.nomeDaPeca} onChange={e => setNewItem({...newItem, nomeDaPeca: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Etapa 1</Label><Input placeholder="TORNO ou CENTRO" value={newItem.etapa1} onChange={e => setNewItem({...newItem, etapa1: e.target.value.toUpperCase()})} /></div>
                    <div className="space-y-2"><Label>Etapa 2</Label><Input placeholder="TORNO ou CENTRO" value={newItem.etapa2} onChange={e => setNewItem({...newItem, etapa2: e.target.value.toUpperCase()})} /></div>
                  </div>
                  <div className="space-y-2"><Label>Fábrica (Site)</Label><Select value={newItem.site} onValueChange={v => setNewItem({...newItem, site: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FACTORIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantidade</Label><Input type="number" value={newItem.quantidade} onChange={e => setNewItem({...newItem, quantidade: Number(e.target.value)})} /></div>
                    <div className="space-y-2"><Label>Setup (min)</Label><Input type="number" value={newItem.setup} onChange={e => setNewItem({...newItem, setup: Number(e.target.value)})} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Torno (min)</Label><Input type="number" value={newItem.torno} onChange={e => setNewItem({...newItem, torno: Number(e.target.value)})} /></div>
                    <div className="space-y-2"><Label>Centro (min)</Label><Input type="number" value={newItem.centro} onChange={e => setNewItem({...newItem, centro: Number(e.target.value)})} /></div>
                    <div className="space-y-2"><Label>Prog (min)</Label><Input type="number" value={newItem.prog} onChange={e => setNewItem({...newItem, prog: Number(e.target.value)})} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleAddManual} className="w-full">Adicionar na Fila</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
            <Button className="h-10 bg-primary text-primary-foreground font-black text-[10px] uppercase flex-1 sm:flex-none" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                {isImporting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />} Importar Planilha
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-card/50 border rounded-lg p-1 w-full md:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}>
                <SelectTrigger className="h-9 w-[160px] text-[10px] font-black uppercase border-0 bg-transparent shadow-none focus:ring-0"><SelectValue placeholder="Fábrica" /></SelectTrigger>
                <SelectContent><SelectItem value="all">TODAS AS FÁBRICAS</SelectItem>{FACTORIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <div className="h-4 w-px bg-border/50" />
            <Cpu className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            <Select value={selectedEquipmentFilter} onValueChange={setSelectedEquipmentFilter}>
                <SelectTrigger className="h-9 w-[140px] text-[10px] font-black uppercase border-0 bg-transparent shadow-none focus:ring-0"><SelectValue placeholder="Equipamento" /></SelectTrigger>
                <SelectContent><SelectItem value="all">TODOS</SelectItem><SelectItem value="TORNO">TORNO CNC</SelectItem><SelectItem value="CENTRO">CENTRO CNC</SelectItem><SelectItem value="ADM">PROGRAMAÇÃO</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="flex items-center bg-card/50 border rounded-lg p-1 w-full md:w-auto justify-center">
            {planStartDate && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary" 
                onClick={() => setCurrentDate(planStartDate)} 
                title="Ir para o início do plano"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => stepDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="font-black px-4 text-[11px] min-w-[130px] justify-center text-primary">
                  <CalendarDays className="h-3.5 w-3.5 opacity-60 mr-2" />
                  {format(currentDate, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  locale={ptBR}
                  selected={currentDate}
                  onSelect={(d) => d && setCurrentDate(startOfDay(d))}
                  disabled={isDomingo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => stepDay(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader><DialogTitle>Substituir Técnico</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-4">
            {ALL_TECHNICIANS.map(tech => (
              <Button key={tech} variant={activeSwap?.currentTech === tech ? "default" : "outline"} className="justify-start h-11" onClick={() => handleTechSwap(tech)}>
                <UserRoundPen className="h-4 w-4 mr-3 opacity-50" />{tech}
                {tech === "Marcos Barbosa" && <span className="ml-auto text-[8px] font-black uppercase bg-blue-500/20 px-1.5 rounded">Folgista</span>}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {diasVisiveis.map((day, d) => {
            const displayDate = format(day, 'dd/MM/yyyy');
            const dateStr = format(day, 'yyyy-MM-dd');
            return (
                <div key={dateStr} className="bg-card border border-border shadow-md rounded-lg overflow-hidden">
                    <div className="bg-muted/10 p-4 border-b border-border flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold uppercase tracking-widest">{format(day, 'dd · MM/yy')}</span>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{format(day, 'EEEE', { locale: ptBR })}</span>
                        </div>
                    </div>
                    {TURNOS.map(t => {
                        const shiftKey = `${dateStr}_${t.id}`;
                        const isDisabled = disabledShifts[shiftKey];
                        return (
                            <div key={t.id} className={cn("grid grid-cols-[100px_1fr] border-b border-border/20 last:border-0 relative overflow-hidden", isDisabled && "bg-stripes")}>
                                <div className="bg-muted/5 border-r border-border/20 p-4 flex flex-col justify-center items-center gap-2 z-20">
                                    <span className={cn("text-2xl font-bold", isDisabled ? "text-muted-foreground" : "text-foreground")}>{t.label}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleShift(day, t.id)}>{isDisabled ? <PowerOff className="h-3.5 w-3.5 text-destructive" /> : <Power className="h-3.5 w-3.5 text-green-500" />}</Button>
                                </div>
                                <div className="p-4 bg-background/20 overflow-x-auto min-w-0 custom-scrollbar">
                                    <div className="min-w-[800px] relative">
                                        {!isDisabled && (
                                            <>
                                                <Ruler />
                                                {['TORNO', 'CENTRO', 'ADM'].filter(cat => selectedEquipmentFilter === 'all' || selectedEquipmentFilter === cat).map(cat => {
                                                    const overrideKey = `${dateStr}_${cat}_${t.id}`;
                                                    const tech = techOverrides[overrideKey] || DEFAULT_MACHINE_LANES[cat][t.id]?.[0];
                                                    if (!tech) return null;
                                                    const itemsForLane = planIndex.get(`${displayDate}|${t.id}|${cat}`) || [];
                                                    return (
                                                      <div key={`${cat}-${t.id}`} className="grid grid-cols-[155px_1fr] items-center mb-3">
                                                          <div className="pr-3 truncate cursor-pointer group/tech" onClick={() => { setActiveSwap({ day: dateStr, shiftId: t.id, category: cat, currentTech: tech }); setIsSwapDialogOpen(true); }}>
                                                            <div className={cn("text-[9px] font-mono font-black uppercase flex items-center gap-1.5", cat === 'TORNO' ? "text-cyan-400" : (cat === 'CENTRO' ? "text-purple-400" : "text-slate-400"))}>{cat}<UserRoundPen className="h-2 w-2 opacity-0 group-hover/tech:opacity-100 transition-opacity" /></div>
                                                            <div className="text-[11px] font-bold truncate flex items-center gap-1.5">{tech}{tech === "Marcos Barbosa" && <Badge variant="outline" className="h-3.5 text-[7px] border-blue-500 text-blue-400 px-1 font-black">FOLGISTA</Badge>}</div>
                                                          </div>
                                                          <div className="relative h-[38px] border border-border/50 rounded bg-black/20 overflow-hidden">
                                                              {PAUSAS.map(p => (<div key={p.label} className="absolute top-0 bottom-0 bg-yellow-500/10 border-x border-yellow-500/20 flex items-center justify-center" style={{ left: `${(p.start / SHIFT_MIN) * 100}%`, width: `${(p.duration / SHIFT_MIN) * 100}%` }}><p.icon className="h-2 w-2 text-yellow-500/30" /></div>))}
                                                              {itemsForLane.map(item => <TimelineBar key={item.id} item={item} onToggle={toggleConcluded} />)}
                                                          </div>
                                                      </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        })}
      </div>
      
      <Card className="shadow-lg border-border">
        <CardHeader className="bg-muted/5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="text-xl uppercase tracking-wider">Fila de Produção & Sequenciamento</CardTitle>
                <div className="flex items-center gap-2">
                    {selectedSiteFilter !== 'all' && (<Badge className="bg-primary text-primary-foreground font-black text-[9px]">{selectedSiteFilter}</Badge>)}
                    {(selectedSiteFilter !== 'all' || requisitionFilter) && (<Button variant="ghost" size="sm" onClick={() => { setSelectedSiteFilter('all'); setRequisitionFilter(''); }} className="h-6 px-2 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10">Limpar Filtros</Button>)}
                </div>
            </div>

            <div className="flex items-center gap-2 bg-background border rounded-md px-3 h-10 w-full sm:w-[280px] shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input 
                  placeholder="PESQUISAR REQ. OU PEÇA..." 
                  value={requisitionFilter}
                  onChange={(e) => setRequisitionFilter(e.target.value)}
                  className="h-full w-full text-[10px] font-black uppercase border-0 bg-transparent shadow-none focus-visible:ring-0 p-0"
                />
                {requisitionFilter && (<Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-transparent" onClick={() => setRequisitionFilter('')}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>)}
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="px-6 py-2 bg-muted/5 border-b">
              <TabsList className="grid grid-cols-3 w-full max-md h-9">
                <TabsTrigger value="all" className="text-[10px] font-black uppercase">GERAL</TabsTrigger>
                <TabsTrigger value="etapa1" className="text-[10px] font-black uppercase">ETAPA 1</TabsTrigger>
                <TabsTrigger value="etapa2" className="text-[10px] font-black uppercase">ETAPA 2</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="m-0">{renderFilaTable(filteredFila, true)}</TabsContent>
            <TabsContent value="etapa1" className="m-0">{renderFilaTable(filteredFila.filter(j => j.etapa1 && j.etapa1 !== ''), false)}</TabsContent>
            <TabsContent value="etapa2" className="m-0">{renderFilaTable(filteredFila.filter(j => j.etapa2 && j.etapa2 !== ''), false)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <style jsx global>{`
        .bg-stripes { background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 10px, transparent 10px, transparent 20px); }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}
