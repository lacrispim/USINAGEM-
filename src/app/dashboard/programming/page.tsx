
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader, 
  Eraser,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  FileUp,
  Coffee,
  Mic,
  AlertCircle,
} from 'lucide-react';
import { format, addDays, isSameDay, parse, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
}

const TURNOS = [
  { id: '1', label: '1T', range: '06:00-13:00' },
  { id: '2', label: '2T', range: '13:00-20:00' },
  { id: '3', label: '3T', range: '20:00-03:00' },
];

const MACHINE_LANES: Record<string, Record<string, string[]>> = {
  'TORNO': {
    '1': ['Marcos Barbosa'],
    '2': ['Jair Melo'], 
    '3': ['Gustavo Gozzi']
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

const SHIFT_MIN = 420; // 7 horas úteis
const PAUSAS = [
  { start: 0, duration: 10, label: 'DDS', icon: Mic },
  { start: 180, duration: 15, label: 'CAFÉ', icon: Coffee }
];

const Ruler = () => {
  const marks = [];
  for (let m = 0; m <= SHIFT_MIN; m += 60) {
    const pc = (m / SHIFT_MIN) * 100;
    marks.push(<div key={m} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${pc}%` }}><div className={cn("w-px bg-border", m % 120 === 0 ? "h-[9px] bg-muted-foreground" : "h-[5px]")} />{m % 60 === 0 && <span className="text-[9px] font-mono text-muted-foreground leading-none mt-1">{m / 60}h</span>}</div>);
  }
  return <div className="relative h-[18px] ml-[155px] border-b border-border/50 mb-1">{marks}</div>;
};

const TimelineBar = React.memo(({ item }: { item: PlanejamentoItem }) => {
  const totalMin = (item.tempoMinutos || 0) + (item.setupMinutos || 0);
  const widthPc = Math.max((totalMin / SHIFT_MIN) * 100, 0.5);
  const leftPc = (item.startOffsetMin / SHIFT_MIN) * 100;
  const setupPc = totalMin > 0 ? (item.setupMinutos / totalMin) * 100 : 0;

  const isTorno = item.techKey === 'TORNO';
  const isProg = item.techKey === 'ADM';

  return (
    <div 
      className={cn(
        "absolute top-[3px] bottom-[3px] rounded-[2px] overflow-hidden border border-black/40 flex shadow-sm hover:scale-[1.01] transition-all z-10", 
        isProg ? "bg-slate-700" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]")
      )} 
      style={{ left: `${leftPc}%`, width: `${widthPc}%` }} 
      title={`#${item.requisicao} - ${item.nomeDaPeca}`}
    >
      {item.setupMinutos > 0 && (
        <div 
          className="h-full shrink-0 border-r border-black/20 flex items-center justify-center" 
          style={{ width: `${setupPc}%`, background: 'repeating-linear-gradient(45deg, #F0BC00 0 5px, #101820 5px 10px)' }}
        >
           <span className="text-[7px] font-black text-white bg-black/50 px-0.5 rounded-sm">S</span>
        </div>
      )}
      <div className="flex-1 flex items-center gap-1.5 px-1.5 min-w-0 text-white overflow-hidden">
        <span className="font-mono text-[9px] font-black shrink-0">#{item.requisicao}</span>
        {item.quantidadeNoBloco > 0 && <span className="bg-white/20 px-1 rounded-[1px] text-[8px] font-bold shrink-0">{item.quantidadeNoBloco}pç</span>}
        <span className="text-[8px] opacity-80 truncate uppercase font-bold leading-none">{item.nomeDaPeca}</span>
      </div>
    </div>
  );
});

export default function ProgrammingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fila, setFila] = useState<JobBase[]>([]);
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: filaDoc } = useDoc(useMemo(() => firestore ? doc(firestore, 'programacaoState', 'fila') : null, [firestore]));
  const { data: planoDoc } = useDoc(useMemo(() => firestore ? doc(firestore, 'programacaoState', 'plano') : null, [firestore]));

  useEffect(() => {
    if (filaDoc) setFila(filaDoc.data || []);
    if (planoDoc) { setPlanejamentoData(planoDoc.data || []); setLoading(false); }
    else if (planoDoc === null) setLoading(false);
  }, [filaDoc, planoDoc]);

  const recalculatePlan = async (novaFila: JobBase[]) => {
    if (!firestore) return;
    const novosPlanItems: PlanejamentoItem[] = [];
    
    // Pointers independentes por raia para maximizar ocupação
    const lanePointers: Record<string, number> = { 
        'TORNO_0': 0, 'CENTRO_0': 0, 'ADM_0': 0 
    }; 

    // Mapeamento de quando cada JOB termina sua primeira etapa para liberar a segunda
    const jobCompletionTimes: Record<string, number> = {};

    const allocateTask = (job: JobBase, techKey: 'TORNO' | 'CENTRO' | 'ADM', minStartTime: number, type: 'torno' | 'centro' | 'prog') => {
        let prodTime = Number(job[type]) || 0;
        let setupTime = (type === 'torno' || type === 'centro') ? (Number(job.setup) || 20) : 0;
        
        if (prodTime <= 0 && setupTime <= 0 && type !== 'prog') return minStartTime;
        if (type === 'prog' && prodTime <= 0) return minStartTime;
        
        const chosenLane = 0;
        const laneId = `${techKey}_${chosenLane}`;
        
        // O trabalho começa no máximo entre a disponibilidade da máquina e o término da etapa anterior
        let actualPointer = Math.max(lanePointers[laneId] || 0, minStartTime);
        
        let pendingSetup = setupTime;
        let pendingProd = prodTime;
        let doneProdTime = 0;
        const cycleTime = job.quantidade > 0 ? prodTime / job.quantidade : prodTime;

        let iterations = 0;
        while ((pendingSetup > 0.01 || pendingProd > 0.01) && iterations < 500) {
            iterations++;
            const dayIdx = Math.floor(actualPointer / (SHIFT_MIN * 3));
            const startInDay = actualPointer % (SHIFT_MIN * 3);
            const shiftIdx = Math.floor(startInDay / SHIFT_MIN);
            const startOffset = startInDay % SHIFT_MIN;
            
            const techName = MACHINE_LANES[techKey][String(shiftIdx + 1)]?.[chosenLane];

            // Se o turno atual não tem técnico (ex: Alisson no 2T/3T), pula para o próximo turno
            if (!techName) {
                actualPointer = (dayIdx * 3 * SHIFT_MIN) + ((shiftIdx + 1) * SHIFT_MIN);
                continue;
            }

            // Respeita as Pausas (DDS e Café)
            let winStart = startOffset;
            for (const p of PAUSAS) { 
                if (winStart < p.start + p.duration && winStart + 0.1 >= p.start) {
                    winStart = p.start + p.duration;
                }
            }
            
            // Se as pausas ou o horário já consumiram o turno, pula para o próximo
            if (winStart >= SHIFT_MIN - 1) { 
                actualPointer = (dayIdx * 3 * SHIFT_MIN) + ((shiftIdx + 1) * SHIFT_MIN);
                continue; 
            }

            const effectiveAvail = SHIFT_MIN - winStart;
            let sInShift = pendingSetup > 0 ? Math.min(pendingSetup, effectiveAvail) : 0;
            pendingSetup -= sInShift;
            
            let pInShift = Math.min(effectiveAvail - sInShift, pendingProd);
            let qInShift = 0;
            
            if (pInShift > 0 && cycleTime > 0) {
                const before = Math.floor(doneProdTime / cycleTime + 1e-7);
                doneProdTime += pInShift;
                qInShift = Math.min(job.quantidade, Math.floor(doneProdTime / cycleTime + 1e-7)) - before;
                pendingProd -= pInShift;
            } else if (pInShift > 0 && pendingProd > 0 && cycleTime <= 0) {
                pInShift = Math.min(effectiveAvail - sInShift, pendingProd);
                pendingProd -= pInShift;
            }

            if (sInShift > 0 || pInShift > 0) {
                novosPlanItems.push({ 
                    id: `pl-${Math.random().toString(36).substr(2, 9)}`, 
                    dataExecucao: format(addDays(currentDate, dayIdx), 'dd/MM/yyyy'), 
                    tecnico: techName, 
                    equipamento: type.toUpperCase(), 
                    requisicao: job.requisicao, 
                    nomeDaPeca: job.nomeDaPeca, 
                    quantidadeTotal: job.quantidade, 
                    quantidadeNoBloco: qInShift, 
                    tempoMinutos: pInShift, 
                    setupMinutos: sInShift, 
                    turno: String(shiftIdx + 1), 
                    startOffsetMin: winStart, 
                    tipoAtividade: type === 'prog' ? 'PROGRAMACAO' : 'USINAGEM', 
                    techKey, 
                    jobId: job.id, 
                    laneIndex: chosenLane 
                });
            }
            
            actualPointer = (dayIdx * 3 * SHIFT_MIN) + (shiftIdx * SHIFT_MIN) + winStart + sInShift + pInShift;
            
            // Se preencheu o turno exatamente, garante que o próximo inicie no turno seguinte
            if (winStart + sInShift + pInShift >= SHIFT_MIN - 0.1) {
                actualPointer = (dayIdx * 3 * SHIFT_MIN) + ((shiftIdx + 1) * SHIFT_MIN);
            }
        }
        lanePointers[laneId] = actualPointer;
        return actualPointer;
    };

    // Primeiro aloca todas as etapas 1 para maximizar a ocupação das máquinas logo no início
    novaFila.forEach(job => {
        allocateTask(job, 'ADM', 0, 'prog');
        
        const e1 = String(job.etapa1 || '').toUpperCase();
        if (e1.includes('TORNO')) {
            jobCompletionTimes[job.id] = allocateTask(job, 'TORNO', 0, 'torno');
        } else if (e1.includes('CENTRO')) {
            jobCompletionTimes[job.id] = allocateTask(job, 'CENTRO', 0, 'centro');
        } else {
            jobCompletionTimes[job.id] = 0;
        }
    });

    // Depois aloca as etapas 2, respeitando o término das respectivas etapas 1
    novaFila.forEach(job => {
        const e2 = String(job.etapa2 || '').toUpperCase();
        const minStart = jobCompletionTimes[job.id] || 0;
        
        if (e2.includes('TORNO')) {
            allocateTask(job, 'TORNO', minStart, 'torno');
        } else if (e2.includes('CENTRO')) {
            allocateTask(job, 'CENTRO', minStart, 'centro');
        }
    });

    const sanitize = (data: any[]) => data.map(i => Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v === undefined ? null : v])));

    await setDoc(doc(firestore, 'programacaoState', 'fila'), { data: sanitize(novaFila), updatedAt: serverTimestamp() });
    await setDoc(doc(firestore, 'programacaoState', 'plano'), { data: sanitize(novosPlanItems), updatedAt: serverTimestamp() });
    
    toast({ title: "Plano Otimizado", description: `A carga horária foi distribuída para preencher lacunas nos turnos 2T e 3T.` });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !firestore) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const workbook = XLSX.read(new Uint8Array(event.target?.result as ArrayBuffer), { type: 'array' });
      const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      
      const findVal = (row: any, keys: string[]) => {
          for (const key of keys) {
              const rowKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
              if (rowKey !== undefined) return row[rowKey];
          }
          for (const key of keys) {
              const rowKey = Object.keys(row).find(k => k.toLowerCase().trim().includes(key.toLowerCase().trim()));
              if (rowKey !== undefined) return row[rowKey];
          }
          return undefined;
      };

      const novaFila: JobBase[] = json.map((row, i) => ({
          id: `job-${i}-${Date.now()}`,
          requisicao: String(findVal(row, ['requisição', 'requisicao', 'req', 'forms', 'Nº forms']) || 'S/N'),
          nomeDaPeca: String(findVal(row, ['peca', 'peça', 'nome', 'Nome da peça']) || 'SEM NOME'),
          quantidade: Number(findVal(row, ['qtd', 'quantidade', 'Quantidade solicitada']) || 1),
          setup: Number(findVal(row, ['Tempo setup TORNO', 'Tempo setup CENTRO', 'setup', 'Setup Minutos']) || 20),
          torno: Number(findVal(row, ['Tempo de Planejamento Torno Minutos todas as peças solicitadas', 'torno', 'torno minutos', 'torno min']) || 0),
          centro: Number(findVal(row, ['Tempo de Planejamento Centro Minutos todas as peças solicitadas', 'centro', 'centro minutos', 'centro min']) || 0),
          prog: Number(findVal(row, ['Tempo de Planejamento Programação Minutos todas as peças solicitadas', 'Tempo Programação Minutos', 'prog', 'programação', 'Programação Minutos']) || 0),
          site: String(findVal(row, ['site', 'fabrica', 'Fábrica']) || 'VALINHOS'),
          etapa1: String(findVal(row, ['Etapa 1', 'etapa1', 'Etapa1', 'Etapa']) || ''),
          etapa2: String(findVal(row, ['Etapa 2', 'etapa2', 'Etapa2']) || ''),
      }));
      
      await recalculatePlan(novaFila);
      setIsImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col gap-6 bg-background dark p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold uppercase font-['Barlow_Condensed']">Plano de Carga CNC</h1>
            <p className="text-[11px] tracking-widest text-muted-foreground uppercase font-bold">Time Técnico · Jornada 7h Disponíveis</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10" onClick={() => setCurrentDate(p => addDays(p, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex items-center gap-2 font-bold min-w-[120px] justify-center"><CalendarDays className="h-4 w-4 text-primary" />{format(currentDate, 'dd/MM/yyyy')}</div>
          <Button variant="outline" className="h-10" onClick={() => setCurrentDate(p => addDays(p, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-10 text-[10px] font-black uppercase" onClick={() => recalculatePlan([])}><Eraser className="h-4 w-4 mr-2" /> Limpar</Button>
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
          <Button className="h-10 bg-primary text-primary-foreground font-black text-[10px] uppercase shadow-lg" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>{isImporting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />} Importar Planilha</Button>
        </div>
      </div>

      <div className="space-y-6">
        {[0, 1, 2].map(d => {
            const day = addDays(currentDate, d);
            const dayItems = planejamentoData.filter(i => isSameDay(parse(i.dataExecucao, 'dd/MM/yyyy', new Date()), day));
            return (
                <div key={d} className="bg-card border border-border shadow-md rounded-lg overflow-hidden">
                    <div className="bg-muted/40 p-4 border-b-2 border-primary flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold font-['Barlow_Condensed'] uppercase tracking-widest">{format(day, 'dd · MM/yy')}</span>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{format(day, 'EEEE', { locale: ptBR })}</span>
                        </div>
                        <div className="flex gap-4 font-mono text-[11px] text-muted-foreground">
                            <span>PEÇAS: <b className="text-foreground text-sm">{dayItems.reduce((a, b) => a + b.quantidadeNoBloco, 0)}</b></span>
                            <span>OCUPAÇÃO: <b className="text-foreground text-sm">{(dayItems.reduce((a, b) => a + b.tempoMinutos + b.setupMinutos, 0) / 60).toFixed(1)}h / 21h</b></span>
                        </div>
                    </div>
                    {TURNOS.map(t => (
                        <div key={t.id} className="grid grid-cols-[100px_1fr] border-b border-border/20 last:border-0">
                            <div className="bg-muted/10 border-r border-border/20 p-4 flex flex-col justify-center items-center">
                                <span className="text-2xl font-bold font-['Barlow_Condensed'] text-foreground">{t.label}</span>
                                <span className="text-[9px] font-mono text-muted-foreground font-bold">{t.range}</span>
                            </div>
                            <div className="p-4 bg-card/40">
                                <Ruler />
                                {['TORNO', 'CENTRO', 'ADM'].map(cat => (MACHINE_LANES[cat][t.id] || []).map((tech, lIdx) => tech && (
                                    <div key={`${tech}-${lIdx}`} className="grid grid-cols-[155px_1fr] items-center mb-3">
                                        <div className="pr-3 truncate">
                                            <div className={cn("text-[9px] font-mono font-black uppercase", cat === 'TORNO' ? "text-cyan-400" : (cat === 'CENTRO' ? "text-purple-400" : "text-slate-400"))}>
                                                {cat === 'TORNO' ? `Torno R${lIdx+1}` : cat}
                                            </div>
                                            <div className="text-[11px] font-bold truncate">{tech}</div>
                                        </div>
                                        <div className="relative h-[38px] border border-border/50 rounded bg-black/20 overflow-hidden">
                                            {PAUSAS.map(p => (
                                                <div 
                                                    key={p.label} 
                                                    className="absolute top-0 bottom-0 bg-yellow-500/10 border-x border-yellow-500/20 flex items-center justify-center" 
                                                    style={{ left: `${(p.start / SHIFT_MIN) * 100}%`, width: `${(p.duration / SHIFT_MIN) * 100}%` }}
                                                >
                                                    <p.icon className="h-2 w-2 text-yellow-500/30" />
                                                </div>
                                            ))}
                                            {dayItems.filter(i => i.techKey === cat && i.laneIndex === lIdx && i.turno === t.id).map(item => (
                                                <TimelineBar key={item.id} item={item} />
                                            ))}
                                        </div>
                                    </div>
                                )))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        })}
      </div>
      
      <Card className="shadow-lg border-border">
        <CardHeader className="bg-muted/5 border-b">
            <CardTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">Fila de Produção & Sequenciamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-20 text-center">AÇÕES</TableHead>
                    <TableHead>FLUXO / STATUS</TableHead>
                    <TableHead>REQ.</TableHead>
                    <TableHead>PEÇA</TableHead>
                    <TableHead className="text-right">QTD</TableHead>
                    <TableHead className="text-right">TOTAL</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {fila.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-mono text-xs uppercase tracking-widest italic opacity-50">Nenhuma requisição</TableCell>
                </TableRow>
              ) : fila.map((job, idx) => (
                <TableRow key={job.id} className="hover:bg-muted/5">
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => { const nf = [...fila]; [nf[idx], nf[idx-1]] = [nf[idx-1], nf[idx]]; recalculatePlan(nf); }} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => { const nf = [...fila]; [nf[idx], nf[idx+1]] = [nf[idx+1], nf[idx]]; recalculatePlan(nf); }} disabled={idx === fila.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {(!job.etapa1 && !job.etapa2) ? (
                            <Badge variant="destructive" className="text-[8px] animate-pulse flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> AGUARDANDO DEFINIÇÃO
                            </Badge>
                        ) : (
                            <>
                                {job.etapa1 && <Badge variant="outline" className="text-[9px] bg-primary/10">{job.etapa1}</Badge>}
                                {job.etapa2 && <span className="text-muted-foreground text-xs">→</span>}
                                {job.etapa2 && <Badge variant="outline" className="text-[9px] bg-primary/20">{job.etapa2}</Badge>}
                            </>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-bold">#{job.requisicao}</TableCell>
                  <TableCell className="uppercase text-[10px] font-medium max-w-[200px] truncate">{job.nomeDaPeca}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{job.quantidade} pç</TableCell>
                  <TableCell className="text-right text-[10px] text-muted-foreground">{Number(job.torno) + Number(job.centro) + Number(job.setup)} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
