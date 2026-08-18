
'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader, 
  Eraser,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  FileUp,
  Check,
  Plus,
  Trash2,
  UserRoundPen,
  Filter,
  Cpu,
  Search,
  Anchor,
  Clock,
  CheckCircle2,
  Power,
  PowerOff,
  AlertCircle
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

const normalizeTechName = (name: any): string => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
                    "absolute top-[3px] bottom-[3px] rounded-[2px] overflow-hidden border border-black/40 flex shadow-sm transition-all z-[5] cursor-pointer group", 
                    isLoss ? "bg-red-600/60 border-red-500 bg-stripes-red" : (isProg ? "bg-slate-700" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]")),
                    item.isConcluded && !isLoss && "opacity-40 grayscale-[0.5] border-green-500 border-2",
                    !isLoss && "hover:scale-[1.01] hover:brightness-110 hover:shadow-md"
                  )} 
                  style={{ left: `${leftPc}%`, width: `${widthPc}%` }} 
                >
                  {isLoss ? (
                    <div className="flex items-center gap-2 px-2 text-white overflow-hidden w-full whitespace-nowrap">
                         <AlertCircle className="h-4 w-4 shrink-0 text-red-200" />
                         <span className="font-black text-[12px] uppercase tracking-tight">Perdas: {Math.round(totalMin)} min</span>
                    </div>
                  ) : (
                    <>
                      {item.setupMinutos > 0 && (
                        <div 
                          className="h-full shrink-0 border-r border-black/20 flex items-center justify-center relative z-10" 
                          style={{ width: `${setupPc}%`, background: 'repeating-linear-gradient(45deg, #F0BC00 0 5px, #101820 5px 10px)' }}
                        >
                           <span className="text-[10px] font-black text-white bg-black/70 px-1 rounded-sm shadow-sm">S</span>
                        </div>
                      )}
                      <div className="flex-1 flex items-center gap-2 px-2 min-w-0 text-white overflow-hidden relative">
                        <span className="font-mono text-[14px] font-black shrink-0">#{item.requisicao}</span>
                        {widthPc > 15 && <span className="text-[11px] opacity-90 truncate uppercase font-black">{item.nomeDaPeca}</span>}
                        {item.isConcluded && <div className="absolute right-1 top-1/2 -translate-y-1/2"><Check className="h-4 w-4 text-green-400 stroke-[4px]" /></div>}
                      </div>
                    </>
                  )}
                </div>
            </TooltipTrigger>
            <TooltipContent className={cn("z-[100] p-4 shadow-2xl min-w-[280px]", isLoss ? "bg-destructive text-destructive-foreground border-none" : "bg-card border")}>
                {isLoss ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-1">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-black uppercase text-[10px]">Detalhes das Perdas</span>
                        </div>
                        <div className="whitespace-pre-line text-xs font-bold">{item.nomeDaPeca}</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                         <div className="flex items-center justify-between gap-4 border-b border-border pb-1">
                            <span className="font-mono font-black text-primary text-sm">#{item.requisicao}</span>
                            <Badge variant="secondary" className="h-5 text-[9px] font-black">{item.techKey}</Badge>
                        </div>
                        <p className="text-xs font-black uppercase leading-tight">{item.nomeDaPeca}</p>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="flex flex-col"><span className="text-[9px] text-muted-foreground uppercase font-black">Tempo Total</span><span className="text-xs font-black">{Math.round(totalMin)} min</span></div>
                            <div className="flex flex-col"><span className="text-[9px] text-muted-foreground uppercase font-black">Qtd. Bloco</span><span className="text-xs font-black">{item.quantidadeNoBloco} pç</span></div>
                        </div>
                        <div className="pt-2 mt-1 border-t border-border flex items-center justify-between text-[8px] text-muted-foreground uppercase font-bold italic">
                            <span>{item.tecnico}</span><span>{item.dataExecucao} · {item.turno}T</span>
                        </div>
                    </div>
                )}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
});
TimelineBar.displayName = 'TimelineBar';

const ActualRow = React.memo(({ item }: { item: ComparacaoItem }) => {
  const colors = { dentro: 'text-emerald-500', estourou: 'text-rose-500', adiantado: 'text-sky-500', semPlano: 'text-amber-500', semApontamento: 'text-muted-foreground/30' };
  const bgColors = { dentro: 'bg-emerald-500/5', estourou: 'bg-rose-500/5', adiantado: 'bg-sky-500/5', semPlano: 'bg-amber-500/5', semApontamento: 'bg-transparent' };
  const hasPlan = item.tempoPlanejado > 0;
  const isPending = item.status === 'semApontamento';
  const deviation = hasPlan ? (item.tempoRealizado - item.tempoPlanejado) : 0;
  const devText = (!hasPlan || isPending) ? '-' : (deviation === 0 ? 'OK' : (deviation > 0 ? `+${deviation}m` : `${deviation}m`));

  return (
    <div className={cn("grid grid-cols-[80px_100px_100px_100px_1fr_80px] items-center px-3 py-1.5 text-[12px] font-bold border-l-4", bgColors[item.status], item.status === 'dentro' ? "border-emerald-500" : item.status === 'estourou' ? "border-rose-500" : item.status === 'adiantado' ? "border-sky-500" : item.status === 'semPlano' ? "border-amber-500" : "border-transparent")}>
      <div className="font-mono">#{item.requisicao}</div>
      <div className="flex flex-col"><span className="text-muted-foreground/50 font-medium">{item.tempoPlanejado} min</span></div>
      <div className="flex flex-col"><span className={cn("font-black", colors[item.status])}>{isPending ? '---' : `${item.tempoRealizado} min`}</span></div>
      <div className={cn("font-black tabular-nums", colors[item.status])}>{devText}</div>
      <div className="flex items-center gap-2">{item.status === 'semPlano' && <Badge variant="outline" className="h-4 text-[8px] border-amber-500/30 text-amber-500 py-0 uppercase font-black">Extra</Badge>}</div>
      <div className="text-right tabular-nums font-black opacity-80">{isPending ? '-' : `${item.pecasRealizadas} pç`}</div>
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
  const concludedIdsRef = useRef<Set<string>>(new Set());

  const [fila, setFila] = useState<JobBase[]>([]);
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [disabledShifts, setDisabledShifts] = useState<Record<string, boolean>>({});
  const [techOverrides, setTechOverrides] = useState<Record<string, string>>({});
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [requisitionFilter, setRequisitionFilter] = useState<string>('');
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>('all');
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [activeSwap, setActiveSwap] = useState<{ day: string, shiftId: string, category: string, currentTech: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data: filaDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', 'fila') : null, [firestore]));
  const { data: planoDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', 'plano') : null, [firestore]));
  const { data: configDoc } = useDoc(useMemoFirebase(() => firestore ? doc(firestore, 'programacaoState', 'config') : null, [firestore]));
  const { data: lossRecords } = useCollection(useMemoFirebase(() => firestore ? query(collection(firestore, 'lossRecords'), limit(2000)) : null, [firestore]));
  const { data: productionRecords } = useCollection(useMemoFirebase(() => firestore ? query(collection(firestore, 'productionRecords'), limit(1000)) : null, [firestore]));

  // Sync from Firestore
  useEffect(() => {
    if (filaDoc?.data) {
        const ts = (filaDoc.updatedAt as Timestamp)?.toMillis() || 0;
        if (ts > lastUpdateRef.current && JSON.stringify(filaDoc.data) !== JSON.stringify(fila)) setFila(filaDoc.data);
    }
    if (planoDoc?.data) {
        const ts = (planoDoc.updatedAt as Timestamp)?.toMillis() || 0;
        if (ts > lastUpdateRef.current) {
            setPlanejamentoData(planoDoc.data);
            const set = new Set<string>();
            planoDoc.data.forEach((i: any) => { if(i.isConcluded) set.add(`${i.jobId}|${i.techKey}|${i.dataExecucao}|${i.turno}`); });
            concludedIdsRef.current = set;
        }
    }
    if (configDoc) {
        setDisabledShifts(configDoc.disabledShifts || {});
        setTechOverrides(configDoc.techOverrides || {});
        if (configDoc.planStartDate) setPlanStartDate(startOfDay(parse(configDoc.planStartDate, 'yyyy-MM-dd', new Date())));
        setConfigLoaded(true);
    }
  }, [filaDoc, planoDoc, configDoc]);

  const recalculatePlan = useCallback(async (novaFila: JobBase[], currentDisabled = disabledShifts, currentOverrides = techOverrides, anchor = planStartDate || new Date(), currentLosses = lossRecords || []) => {
    if (!firestore) return;
    const baseDate = startOfDay(anchor);
    const novosPlanItems: PlanejamentoItem[] = [];
    const laneBusy: Record<string, { start: number; end: number }[]> = { 'TORNO_0': [], 'CENTRO_0': [], 'ADM_0': [] };
    const techLossSummary = new Map<string, { total: number, descriptions: string }>();

    const techScheduleMap = new Map<string, string>();
    for (let dIdx = 0; dIdx < 365; dIdx++) {
      const d = addDays(baseDate, dIdx); if (isDomingo(d)) continue;
      const dStr = format(d, 'yyyy-MM-dd');
      ['1', '2', '3'].forEach(sId => ['TORNO', 'CENTRO', 'ADM'].forEach(tk => {
        let tech = currentOverrides[`${dStr}_${tk}_${sId}`] || DEFAULT_MACHINE_LANES[tk][sId]?.[0];
        if (dStr >= '2026-08-16' && tech === 'William Martinucci') tech = undefined;
        if (tech) techScheduleMap.set(`${dStr}|${normalizeTechName(tech)}`, sId);
      }));
    }

    currentLosses.forEach(loss => {
        if (!loss.operatorId || !loss.timeLost) return;
        const d = loss.date?.toDate ? loss.date.toDate() : new Date(loss.date);
        const dStr = format(d, 'yyyy-MM-dd');
        const shiftId = techScheduleMap.get(`${dStr}|${normalizeTechName(loss.operatorId)}`) || '1';
        const key = `${dStr}_${shiftId}_${normalizeTechName(loss.operatorId)}`;
        const ex = techLossSummary.get(key) || { total: 0, descriptions: '' };
        techLossSummary.set(key, { total: ex.total + Number(loss.timeLost), descriptions: ex.descriptions ? `${ex.descriptions}\n• ${loss.lossReason}: ${loss.timeLost}m` : `• ${loss.lossReason}: ${loss.timeLost}m` });
    });

    const nextFree = (laneId: string, from: number) => {
      let t = from; const ivs = laneBusy[laneId] || [];
      for (const iv of ivs) { if (iv.end <= t + 0.1) continue; if (iv.start > t + 0.1) return { start: t, limit: iv.start }; t = iv.end; }
      return { start: t, limit: Infinity };
    };

    const occupy = (laneId: string, start: number, end: number) => {
      if (!laneBusy[laneId]) laneBusy[laneId] = [];
      laneBusy[laneId].push({ start, end }); laneBusy[laneId].sort((a, b) => a.start - b.start);
    };

    for (let dIdx = 0; dIdx < 365; dIdx++) {
        const d = addDays(baseDate, dIdx); if (isDomingo(d)) continue;
        const dStr = format(d, 'yyyy-MM-dd'); const dDisplay = format(d, 'dd/MM/yyyy');
        ['1', '2', '3'].forEach((sId, sIdx) => {
            const shiftAbs = dIdx * 3 * SHIFT_MIN + sIdx * SHIFT_MIN;
            ['TORNO', 'CENTRO', 'ADM'].forEach(tk => {
                let tech = currentOverrides[`${dStr}_${tk}_${sId}`] || DEFAULT_MACHINE_LANES[tk][sId]?.[0];
                if (dStr >= '2026-08-16' && tech === 'William Martinucci') tech = undefined;
                if (!tech) return;
                const loss = techLossSummary.get(`${dStr}_${sId}_${normalizeTechName(tech)}`);
                if (loss && loss.total > 0) {
                    occupy(`${tk}_0`, shiftAbs, shiftAbs + loss.total);
                    novosPlanItems.push({ id: `loss-${tech}-${dStr}-${sId}`, dataExecucao: dDisplay, tecnico: tech, equipamento: 'PERDA', requisicao: 'PERDA', nomeDaPeca: loss.descriptions, quantidadeTotal: 0, quantidadeNoBloco: 0, tempoMinutos: loss.total, setupMinutos: 0, turno: sId, startOffsetMin: 0, tipoAtividade: 'PERDA', techKey: tk as any, jobId: 'loss', laneIndex: 0, isConcluded: true, site: 'SISTEMA' });
                }
            });
        });
    }

    const allocate = (job: JobBase, techKey: 'TORNO' | 'CENTRO' | 'ADM', minStart: number, type: 'torno' | 'centro' | 'prog') => {
        let pTime = Number(job[type]) || 0; let sTime = (type !== 'prog') ? (Number(job.setup) || 20) : 0;
        if (pTime <= 0 && sTime <= 0 && type !== 'prog') return minStart;
        let cursor = minStart; const laneId = `${techKey}_0`; let pendingS = sTime; let pendingP = pTime;
        if (job.dataDesejada) { const fd = startOfDay(parse(job.dataDesejada, 'yyyy-MM-dd', new Date())); if (isValid(fd)) cursor = Math.max(cursor, differenceInCalendarDays(fd, baseDate) * 3 * SHIFT_MIN); }
        let iters = 0;
        while ((pendingS > 0.01 || pendingP > 0.01) && iters < 2000) {
            iters++; const free = nextFree(laneId, cursor); cursor = free.start;
            const dIdx = Math.floor(cursor / (SHIFT_MIN * 3)); const dDate = addDays(baseDate, dIdx);
            if (isDomingo(dDate)) { cursor = (dIdx + 1) * 3 * SHIFT_MIN; continue; }
            const sIdx = Math.floor((cursor % (SHIFT_MIN * 3)) / SHIFT_MIN); const sId = String(sIdx + 1);
            const dStr = format(dDate, 'yyyy-MM-dd'); const dDisplay = format(dDate, 'dd/MM/yyyy');
            let tech = currentOverrides[`${dStr}_${techKey}_${sId}`] || DEFAULT_MACHINE_LANES[techKey][sId]?.[0];
            if (dStr >= '2026-08-16' && tech === 'William Martinucci') tech = undefined;
            if (currentDisabled[`${dStr}_${sId}`] || !tech || (job.turnoDesejado && sId !== job.turnoDesejado)) { cursor = (dIdx * 3 * SHIFT_MIN) + (sIdx + 1) * SHIFT_MIN; continue; }
            let offset = cursor % SHIFT_MIN; for (const p of PAUSAS) { if (offset < p.start + p.duration && offset + 0.1 >= p.start) offset = p.start + p.duration; }
            const abs = (dIdx * 3 * SHIFT_MIN) + (sIdx * SHIFT_MIN) + offset;
            const avail = Math.min(SHIFT_MIN - offset, free.limit - abs);
            if (avail < 1) { cursor = Number.isFinite(free.limit) ? Math.max(free.limit, abs) : (dIdx * 3 * SHIFT_MIN) + (sIdx + 1) * SHIFT_MIN; continue; }
            let sIn = Math.min(pendingS, avail); pendingS -= sIn;
            let pIn = Math.min(avail - sIn, pendingP); pendingP -= pIn;
            if (sIn > 0 || pIn > 0) {
                occupy(laneId, abs, abs + sIn + pIn);
                const key = `${job.id}|${techKey}|${dDisplay}|${sId}`;
                novosPlanItems.push({ id: `pl-${job.id}-${techKey}-${dStr}-${sId}-${Math.round(offset)}`, dataExecucao: dDisplay, tecnico: tech, equipamento: type.toUpperCase(), requisicao: job.requisicao, nomeDaPeca: job.nomeDaPeca, quantidadeTotal: job.quantidade, quantidadeNoBloco: job.quantidade, tempoMinutos: pIn, setupMinutos: sIn, turno: sId, startOffsetMin: offset, tipoAtividade: type === 'prog' ? 'PROGRAMACAO' : 'USINAGEM', techKey, jobId: job.id, laneIndex: 0, isConcluded: concludedIdsRef.current.has(key), site: normalizeSiteName(job.site) });
                cursor = abs + sIn + pIn;
            } else cursor = (dIdx * 3 * SHIFT_MIN) + (sIdx + 1) * SHIFT_MIN;
        }
        return cursor;
    };

    novaFila.forEach(j => allocate(j, 'ADM', 0, 'prog'));
    const fT = [...novaFila].filter(j => j.etapa1 === 'TORNO' || j.etapa2 === 'TORNO').sort((a,b) => (a.ordemTorno || 999)-(b.ordemTorno || 999));
    fT.forEach(j => allocate(j, 'TORNO', 0, 'torno'));
    const fC = [...novaFila].filter(j => j.etapa1 === 'CENTRO' || j.etapa2 === 'CENTRO').sort((a,b) => (a.ordemCentro || 999)-(b.ordemCentro || 999));
    fC.forEach(j => allocate(j, 'CENTRO', 0, 'centro'));

    setPlanejamentoData(novosPlanItems);
    lastUpdateRef.current = Date.now();
    const sanitize = (arr: any[]) => arr.map(i => Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v === undefined ? null : v])));
    try {
        await setDoc(doc(firestore, 'programacaoState', 'fila'), { data: sanitize(novaFila), updatedAt: serverTimestamp() });
        await setDoc(doc(firestore, 'programacaoState', 'plano'), { data: sanitize(novosPlanItems), updatedAt: serverTimestamp() });
    } catch (e) {}
  }, [firestore, planStartDate, disabledShifts, techOverrides, lossRecords]);

  // Recalcular quando mudar âncora ou fila
  useEffect(() => {
    if (configLoaded && fila.length > 0) recalculatePlan(fila);
  }, [configLoaded, planStartDate, disabledShifts, techOverrides, lossRecords]);

  const filteredFila = useMemo(() => {
    let data = fila;
    if (selectedSiteFilter !== 'all') data = data.filter(item => normalizeSiteName(item.site) === selectedSiteFilter);
    if (requisitionFilter) { 
      const s = requisitionFilter.toLowerCase(); 
      data = data.filter(item => item.requisicao.toLowerCase().includes(s) || item.nomeDaPeca.toLowerCase().includes(s)); 
    }
    return data;
  }, [fila, selectedSiteFilter, requisitionFilter]);

  const updateJobField = useCallback(async (id: string, field: keyof JobBase, value: any) => {
    setFila(prev => {
        const item = prev.find(j => j.id === id); if (!item || item[field] === value) return prev;
        const nF = prev.map(j => j.id === id ? { ...j, [field]: value } : j);
        recalculatePlan(nF); return nF;
    });
  }, [recalculatePlan]);

  const move = useCallback(async (curr: number, nPos: number, type: 'GERAL' | 'TORNO' | 'CENTRO' = 'GERAL') => {
    setFila(prev => {
      const nF = [...prev]; const item = nF[curr]; if (!item) return prev;
      if (type === 'GERAL') { const t = Math.max(0, Math.min(nF.length - 1, nPos - 1)); const [m] = nF.splice(curr, 1); nF.splice(t, 0, m); }
      else if (type === 'TORNO') {
          const list = nF.filter(j => j.etapa1 === 'TORNO' || j.etapa2 === 'TORNO').sort((a,b) => (a.ordemTorno || 999)-(b.ordemTorno || 999));
          const t = Math.max(0, Math.min(list.length - 1, nPos - 1)); const fIdx = list.findIndex(j => j.id === item.id);
          const [m] = list.splice(fIdx, 1); list.splice(t, 0, m);
          list.forEach((j, i) => { const o = nF.find(nf => nf.id === j.id); if (o) o.ordemTorno = i + 1; });
      } else if (type === 'CENTRO') {
          const list = nF.filter(j => j.etapa1 === 'CENTRO' || j.etapa2 === 'CENTRO').sort((a,b) => (a.ordemCentro || 999)-(b.ordemCentro || 999));
          const t = Math.max(0, Math.min(list.length - 1, nPos - 1)); const fIdx = list.findIndex(j => j.id === item.id);
          const [m] = list.splice(fIdx, 1); list.splice(t, 0, m);
          list.forEach((j, i) => { const o = nF.find(nf => nf.id === j.id); if (o) o.ordemCentro = i + 1; });
      }
      recalculatePlan(nF); return nF;
    });
  }, [recalculatePlan]);

  const planIndex = useMemo(() => {
    const map = new Map<string, PlanejamentoItem[]>();
    planejamentoData.forEach(i => {
        if (selectedSiteFilter !== 'all' && normalizeSiteName(i.site) !== selectedSiteFilter) return;
        const k = `${i.dataExecucao}|${i.turno}|${i.techKey}`;
        let arr = map.get(k); if (!arr) { arr = []; map.set(k, arr); } arr.push(i);
    });
    return map;
  }, [planejamentoData, selectedSiteFilter]);

  const realIndex = useMemo(() => {
    if (!planejamentoData || !productionRecords || !lossRecords) return new Map<string, ComparacaoItem[]>();
    const matched = cruzarComPlano(planejamentoData, productionRecords, lossRecords, TOLERANCIA_ADERENCIA);
    const map = new Map<string, ComparacaoItem[]>();
    matched.forEach(i => {
        const k = `${i.dataStr}|${i.turno}|${i.techKey}`;
        let arr = map.get(k); if (!arr) { arr = []; map.set(k, arr); } arr.push(i);
    });
    return map;
  }, [planejamentoData, productionRecords, lossRecords]);

  const renderTable = (jobs: JobBase[], type: 'GERAL' | 'TORNO' | 'CENTRO' = 'GERAL') => (
    <Table>
      <TableHeader><TableRow><TableHead className="w-20 text-center text-xs">POS</TableHead><TableHead className="w-16 text-center text-xs">MOVE</TableHead><TableHead className="text-xs">STATUS</TableHead><TableHead className="w-32 text-xs">DATA</TableHead><TableHead className="w-24 text-xs">TURNO</TableHead><TableHead className="w-40 text-xs">MÁQUINA</TableHead><TableHead className="text-xs">REQ.</TableHead><TableHead className="text-xs">PEÇA</TableHead><TableHead className="text-right text-xs">QTD</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
      <TableBody>
        {jobs.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-10 opacity-50">Nenhuma requisição</TableCell></TableRow> : jobs.map((job, localIdx) => {
          const globalIdx = fila.findIndex(f => f.id === job.id);
          const pos = type === 'TORNO' ? (job.ordemTorno || localIdx + 1) : (type === 'CENTRO' ? (job.ordemCentro || localIdx + 1) : localIdx + 1);
          const done = planejamentoData.filter(p => p.jobId === job.id && p.isConcluded).length;
          const tot = planejamentoData.filter(p => p.jobId === job.id && p.jobId !== 'loss').length;
          return (
            <TableRow key={job.id} className={cn(done === tot && tot > 0 && "bg-green-500/5 opacity-80")}>
              <TableCell className="text-center"><Input type="number" defaultValue={pos} className="h-9 w-14 text-center text-xs font-black" onBlur={(e) => move(globalIdx, parseInt(e.target.value), type)}/></TableCell>
              <TableCell><div className="flex flex-col items-center gap-1"><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => move(globalIdx, pos - 1, type)} disabled={localIdx === 0}><ArrowUp className="h-3/3" /></Button><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => move(globalIdx, pos + 1, type)} disabled={localIdx === jobs.length - 1}><ArrowDown className="h-3/3" /></Button></div></TableCell>
              <TableCell>{done === tot && tot > 0 ? <Badge className="bg-green-500">FEITO</Badge> : <span className="text-[10px] font-black opacity-40">PEND</span>}</TableCell>
              <TableCell><JobExecutionCell job={job} onUpdate={(d) => updateJobField(job.id, 'dataDesejada', d)}/></TableCell>
              <TableCell><Select value={job.turnoDesejado || "AUTO"} onValueChange={(v) => updateJobField(job.id, 'turnoDesejado', v === "AUTO" ? "" : v)}><SelectTrigger className="h-9 text-[11px] font-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">AUTO</SelectItem><SelectItem value="1">1T</SelectItem><SelectItem value="2">2T</SelectItem><SelectItem value="3">3T</SelectItem></SelectContent></Select></TableCell>
              <TableCell><div className="flex gap-1"><Button variant={job.etapa1 === 'TORNO' || job.etapa2 === 'TORNO' ? "default" : "outline"} size="sm" className="h-7 w-8 font-black" onClick={() => updateJobField(job.id, job.etapa1 === 'TORNO' ? 'etapa1' : 'etapa2', job.etapa1 === 'TORNO' || job.etapa2 === 'TORNO' ? '' : 'TORNO')}>T</Button><Button variant={job.etapa1 === 'CENTRO' || job.etapa2 === 'CENTRO' ? "default" : "outline"} size="sm" className="h-7 w-8 font-black" onClick={() => updateJobField(job.id, job.etapa1 === 'CENTRO' ? 'etapa1' : 'etapa2', job.etapa1 === 'CENTRO' || job.etapa2 === 'CENTRO' ? '' : 'CENTRO')}>C</Button></div></TableCell>
              <TableCell><Input className="h-8 font-mono text-xs" defaultValue={job.requisicao} onBlur={(e) => updateJobField(job.id, 'requisicao', e.target.value)}/></TableCell>
              <TableCell><Input className="h-8 text-xs uppercase" defaultValue={job.nomeDaPeca} onBlur={(e) => updateJobField(job.id, 'nomeDaPeca', e.target.value.toUpperCase())}/></TableCell>
              <TableCell><Input type="number" className="h-8 w-14 text-right text-xs" defaultValue={job.quantidade} onBlur={(e) => updateJobField(job.id, 'quantidade', parseInt(e.target.value))}/></TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setFila(f => f.filter(x => x.id !== job.id))}><Trash2 className="h-4/4" /></Button></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Planejamento CNC</h1>
        <div className="flex items-center gap-2">
          <Popover><PopoverTrigger asChild><Button variant="outline" className="h-10 text-xs font-black uppercase"><Anchor className="h-4 w-4 mr-2" /> {planStartDate ? format(planStartDate, 'dd/MM') : "Âncora"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={planStartDate || undefined} onSelect={(d) => d && setPlanStartDate(d)} disabled={isDomingo}/></PopoverContent></Popover>
          <Button variant="ghost" onClick={() => setFila([])} className="text-destructive"><Eraser className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-card/50 p-3 rounded-lg border">
        <div className="flex items-center gap-3">
          <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}><SelectTrigger className="h-9 w-40 text-xs font-black uppercase"><SelectValue placeholder="Fábrica" /></SelectTrigger><SelectContent><SelectItem value="all">TODAS</SelectItem>{FACTORIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
          <div className="relative w-60"><Search className="absolute left-2 top-2.5 h-4 w-4 opacity-50" /><Input placeholder="Pesquisar..." value={requisitionFilter} onChange={(e) => setRequisitionFilter(e.target.value)} className="pl-8 h-9 text-xs uppercase"/></div>
        </div>
        <div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, -1))}><ChevronLeft /></Button><Popover><PopoverTrigger asChild><Button variant="ghost" className="font-black">{format(currentDate, 'dd/MM/yyyy')}</Button></PopoverTrigger><PopoverContent className="p-0"><Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(d)}/></PopoverContent></Popover><Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, 1))}><ChevronRight /></Button></div>
      </div>

      <div className="space-y-6">
        <div className="bg-card border rounded-lg overflow-hidden">
          {TURNOS.map(t => {
            const shiftKey = `${format(currentDate, 'yyyy-MM-dd')}_${t.id}`;
            const isDisabled = disabledShifts[shiftKey];
            return (
              <div key={t.id} className={cn("grid grid-cols-[100px_1fr] border-b last:border-0", isDisabled && "bg-stripes")}>
                <div className="p-4 flex flex-col items-center justify-center gap-2 border-r bg-muted/5">
                  <span className="text-2xl font-black">{t.label}</span>
                  <Button variant="ghost" size="icon" onClick={() => setDisabledShifts(prev => ({ ...prev, [shiftKey]: !prev[shiftKey] }))}>{isDisabled ? <PowerOff className="text-destructive" /> : <Power className="text-green-500" />}</Button>
                </div>
                <div className="p-4 overflow-x-auto"><div className="min-w-[800px] relative">{!isDisabled && <><Ruler />{['TORNO', 'CENTRO', 'ADM'].map(tk => {
                  const items = planIndex.get(`${format(currentDate, 'dd/MM/yyyy')}|${t.id}|${tk}`) || [];
                  const reals = realIndex.get(`${format(currentDate, 'dd/MM/yyyy')}|${t.id}|${tk}`) || [];
                  let tech = techOverrides[`${format(currentDate, 'yyyy-MM-dd')}_${tk}_${t.id}`] || DEFAULT_MACHINE_LANES[tk][t.id]?.[0];
                  if (format(currentDate, 'yyyy-MM-dd') >= '2026-08-16' && tech === 'William Martinucci') tech = undefined;
                  if (!tech) return null;
                  return (
                    <div key={tk} className="grid grid-cols-[160px_1fr] mb-8 items-start">
                      <div className="pr-4 pt-1 cursor-pointer group" onClick={() => { setActiveSwap({ day: format(currentDate, 'yyyy-MM-dd'), shiftId: t.id, category: tk, currentTech: tech! }); setIsSwapDialogOpen(true); }}>
                        <div className={cn("text-[9px] font-black", tk === 'TORNO' ? "text-cyan-400" : (tk === 'CENTRO' ? "text-purple-400" : "text-slate-400"))}>{tk}</div>
                        <div className="text-xs font-black truncate">{tech} <UserRoundPen className="h-3 w-3 inline opacity-0 group-hover:opacity-100" /></div>
                      </div>
                      <div className="space-y-3">
                        <div className="relative h-12 border rounded bg-black/10">{PAUSAS.map(p => <div key={p.label} className="absolute top-0 bottom-0 bg-yellow-500/10 border-x border-yellow-500/20" style={{ left: `${(p.start/SHIFT_MIN)*100}%`, width: `${(p.duration/SHIFT_MIN)*100}%` }} />)}{items.map(i => <TimelineBar key={i.id} item={i} onToggle={(id) => setPlanejamentoData(prev => prev.map(x => x.id === id ? { ...x, isConcluded: !x.isConcluded } : x))} />)}</div>
                        <div className="bg-muted/5 border rounded shadow-inner max-h-40 overflow-y-auto">{reals.length === 0 ? <div className="p-3 text-[10px] opacity-30 italic font-black uppercase">Aguardando apontamentos...</div> : reals.map(r => <ActualRow key={r.id} item={r} />)}</div>
                      </div>
                    </div>
                  );
                })}</>}</div></div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle className="uppercase tracking-widest">Fila de Produção & Sequenciamento</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="px-6 py-2 bg-muted/5 border-b"><TabsList className="grid grid-cols-3 w-60"><TabsTrigger value="all" className="text-[10px] font-black">GERAL</TabsTrigger><TabsTrigger value="torno" className="text-[10px] font-black">TORNO</TabsTrigger><TabsTrigger value="centro" className="text-[10px] font-black">CENTRO</TabsTrigger></TabsList></div>
            <TabsContent value="all" className="m-0">{renderTable(filteredFila, 'GERAL')}</TabsContent>
            <TabsContent value="torno" className="m-0">{renderTable(filteredFila.filter(j => j.etapa1 === 'TORNO' || j.etapa2 === 'TORNO').sort((a,b) => (a.ordemTorno || 999)-(b.ordemTorno || 999)), 'TORNO')}</TabsContent>
            <TabsContent value="centro" className="m-0">{renderTable(filteredFila.filter(j => j.etapa1 === 'CENTRO' || j.etapa2 === 'CENTRO').sort((a,b) => (a.ordemCentro || 999)-(b.ordemCentro || 999)), 'CENTRO')}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}><DialogContent className="sm:max-w-[300px]"><DialogHeader><DialogTitle>Substituir Técnico</DialogTitle></DialogHeader><div className="grid gap-2 py-4">{ALL_TECHNICIANS.filter(t => !(activeSwap?.day && activeSwap.day >= '2026-08-16' && t === 'William Martinucci')).map(tech => (<Button key={tech} variant={activeSwap?.currentTech === tech ? "default" : "outline"} className="justify-start h-11" onClick={() => { if(activeSwap) { setTechOverrides(p => ({ ...prev, [`${activeSwap.day}_${activeSwap.category}_${activeSwap.shiftId}`]: tech })); setIsSwapDialogOpen(false); } }}><UserRoundPen className="h-4 w-4 mr-3 opacity-50" />{tech}</Button>))}</div></DialogContent></Dialog>

      <style jsx global>{`
        .bg-stripes { background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 10px, transparent 10px, transparent 20px); }
        .bg-stripes-red { background-image: repeating-linear-gradient(45deg, rgba(255, 0, 0, 0.2) 0px, rgba(255, 0, 0, 0.2) 10px, transparent 10px, transparent 20px); }
      `}</style>
    </div>
  );
}
