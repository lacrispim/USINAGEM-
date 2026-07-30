
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useFirestore, useDoc } from '@/firebase';
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
  Info,
  FileUp
} from 'lucide-react';
import { 
  format, 
  addDays,
  isSameDay,
  parse
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// --- Interfaces ---
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
  tipoAtividade: 'USINAGEM' | 'PROGRAMACAO';
  techKey: 'TORNO' | 'CENTRO' | 'ADM';
  jobId: string;
  etapaIndex: number;
}

// --- Escala Técnica Oficial ---
const TURNOS = [
  { id: '1', label: '1T', range: '06:00-14:00' },
  { id: '2', label: '2T', range: '14:00-22:00' },
  { id: '3', label: '22:00-06:00' },
];

const EQUIPE: Record<string, Record<string, { name: string; role: string }[]>> = {
  'TORNO': {
    '1': [{ name: 'Marcos Barbosa', role: 'Téc. Prog./Op.' }, { name: 'Alisson França', role: 'Téc. Prog./Op.' }],
    '2': [{ name: 'Jair Melo', role: 'Téc. Prog./Op.' }],
    '3': [{ name: 'Gustavo Gozzi', role: 'Téc. Prog./Op.' }]
  },
  'CENTRO': {
    '1': [{ name: 'Daniel Solivo', role: 'Téc. Operador' }],
    '2': [{ name: 'Nathan Xavier', role: 'Téc. Prog./Op.' }],
    '3': [{ name: 'Rodrigo Cantano', role: 'Téc. Prog./Op.' }]
  },
  'ADM': {
    '1': [{ name: 'William Martinucci', role: 'Programador Centro' }, { name: 'Alisson França', role: 'Téc. ADM' }]
  }
};

const SHIFT_MIN = 480;

// --- Componentes de UI ---

const Ruler = () => {
  const marks = [];
  for (let m = 0; m <= SHIFT_MIN; m += 60) {
    const pc = (m / SHIFT_MIN) * 100;
    const isMajor = m % 120 === 0;
    marks.push(
      <div key={m} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${pc}%` }}>
        <div className={cn("w-px bg-border", isMajor ? "h-[9px] bg-muted-foreground" : "h-[5px]")} />
        {isMajor && <span className="text-[9px] font-mono text-muted-foreground leading-none mt-1">{m / 60}h</span>}
      </div>
    );
  }
  return <div className="relative h-[18px] ml-[155px] border-b border-border/50 mb-1">{marks}</div>;
};

const TimelineBar = ({ item }: { item: PlanejamentoItem }) => {
  const totalMin = (item.tempoMinutos || 0) + (item.setupMinutos || 0);
  const widthPc = Math.max((totalMin / SHIFT_MIN) * 100, 1.5);
  const leftPc = (item.startOffsetMin / SHIFT_MIN) * 100;
  const setupPc = totalMin > 0 ? (item.setupMinutos / totalMin) * 100 : 0;

  const isTorno = item.techKey === 'TORNO';
  const isProg = item.techKey === 'ADM';

  return (
    <div 
      className={cn(
        "absolute top-[3px] bottom-[3px] rounded-[2px] overflow-hidden border border-black/30 flex shadow-sm hover:scale-[1.01] transition-all z-10",
        isProg ? "bg-slate-700" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]")
      )}
      style={{ left: `${leftPc}%`, width: `${widthPc}%` }}
      title={`${item.requisicao} - ${item.nomeDaPeca}`}
    >
      {item.setupMinutos > 0 && (
        <div 
          className="h-full shrink-0" 
          style={{ 
            width: `${setupPc}%`,
            background: 'repeating-linear-gradient(45deg, #F0BC00 0 5px, #101820 5px 10px)' 
          }} 
          title={`Setup: ${item.setupMinutos}min`}
        />
      )}
      <div className="flex-1 flex items-center gap-2 px-2 min-w-0 text-white overflow-hidden">
        <span className="font-mono text-[10px] font-bold shrink-0">{item.requisicao}</span>
        <span className="font-mono text-[9px] opacity-90 shrink-0 font-bold">
            {item.quantidadeNoBloco > 0 ? `${item.quantidadeNoBloco}pç` : (item.setupMinutos > 0 && item.tempoMinutos === 0 ? 'S' : '...')}
        </span>
        <span className="text-[9px] opacity-80 truncate uppercase font-medium">{item.nomeDaPeca}</span>
      </div>
    </div>
  );
};

export default function ProgrammingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fila, setFila] = useState<JobBase[]>([]);
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const filaMemo = useMemo(() => firestore ? doc(firestore, 'programacaoState', 'fila') : null, [firestore]);
  const planoMemo = useMemo(() => firestore ? doc(firestore, 'programacaoState', 'plano') : null, [firestore]);
  
  const { data: filaDoc } = useDoc(filaMemo);
  const { data: planoDoc } = useDoc(planoMemo);

  useEffect(() => {
    if (filaDoc) setFila(filaDoc.data || []);
    if (planoDoc) {
      setPlanejamentoData(planoDoc.data || []);
      setLoading(false);
    } else if (planoDoc === null) {
      setLoading(false);
    }
  }, [filaDoc, planoDoc]);

  const timelineDays = useMemo(() => [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)], [currentDate]);

  const recalculatePlan = async (novaFila: JobBase[]) => {
    if (!firestore) return;
    
    const novosPlanItems: PlanejamentoItem[] = [];
    const techPointers: Record<string, number> = {}; 

    // Função auxiliar para alocar tarefas seguindo o tempo acumulado
    const allocateTask = (
        job: JobBase, 
        techKey: 'TORNO' | 'CENTRO' | 'ADM', 
        minStartTime: number,
        type: 'torno' | 'centro' | 'prog',
        etapaIdx: number
    ) => {
        let totalDuration = 0;
        if (type === 'torno') totalDuration = job.torno;
        if (type === 'centro') totalDuration = job.centro;
        if (type === 'prog') totalDuration = job.prog;

        if (totalDuration <= 0 && job.setup <= 0 && type !== 'prog') return minStartTime;

        let pendingSetup = type === 'prog' ? 0 : job.setup;
        let pendingProd = totalDuration;
        let doneProdTime = 0;
        const cycleTime = job.quantidade > 0 ? totalDuration / job.quantidade : totalDuration;
        
        let lastEndOffset = minStartTime;

        while (pendingSetup > 0.1 || pendingProd > 0.1) {
            let bestTech = null;
            let minTimeAvailable = Infinity;
            let bestShift = '1';

            const searchKey = type === 'prog' ? 'ADM' : techKey;
            
            // Procura o técnico mais disponível respeitando o minStartTime da etapa anterior
            ['1', '2', '3'].forEach(sId => {
                (EQUIPE[searchKey][sId] || []).forEach(t => {
                    const tTime = techPointers[t.name] || 0;
                    // Priorizamos quem está livre mais cedo, mas deve ser >= minStartTime (término da Etapa 1)
                    if (tTime < minTimeAvailable) {
                        minTimeAvailable = tTime;
                        bestTech = t;
                        bestShift = sId;
                    }
                });
            });

            if (!bestTech) break;

            const techName = (bestTech as any).name;
            // O início real deve ser o maior entre: quando o técnico está livre OU quando a etapa anterior terminou
            let actualStart = Math.max(techPointers[techName] || 0, lastEndOffset);
            
            const startOffset = actualStart % SHIFT_MIN;
            const availInShift = SHIFT_MIN - startOffset;

            let sInShift = 0;
            let pInShift = 0;
            let qInShift = 0;

            if (pendingSetup > 0.1) {
                sInShift = Math.min(pendingSetup, availInShift);
                pendingSetup -= sInShift;
            }

            const remShift = availInShift - sInShift;
            if (remShift > 0.1 && pendingProd > 0.1) {
                pInShift = Math.min(remShift, pendingProd);
                const before = Math.floor(doneProdTime / cycleTime + 1e-9);
                doneProdTime += pInShift;
                const after = Math.min(job.quantidade, Math.floor(doneProdTime / cycleTime + 1e-9));
                qInShift = after - before;
                pendingProd -= pInShift;
            }

            const dayIdx = Math.floor(actualStart / SHIFT_MIN);
            novosPlanItems.push({
                id: `plan-${Math.random().toString(36).substr(2, 9)}`,
                dataExecucao: format(addDays(currentDate, dayIdx), 'dd/MM/yyyy'),
                tecnico: techName, 
                equipamento: type === 'prog' ? 'PROGRAMAÇÃO' : (techKey === 'TORNO' ? 'TORNO CNC' : 'CENTRO USINAGEM'),
                requisicao: job.requisicao, 
                nomeDaPeca: job.nomeDaPeca,
                quantidadeTotal: job.quantidade, 
                quantidadeNoBloco: qInShift,
                tempoMinutos: pInShift, 
                setupMinutos: sInShift, 
                turno: bestShift,
                startOffsetMin: startOffset, 
                tipoAtividade: type === 'prog' ? 'PROGRAMACAO' : 'USINAGEM',
                techKey: searchKey as any,
                jobId: job.id,
                etapaIndex: etapaIdx
            });

            const blockDuration = sInShift + pInShift;
            techPointers[techName] = actualStart + blockDuration;
            lastEndOffset = actualStart + blockDuration;

            if (dayIdx > 20) break; // Limite de segurança
        }
        return lastEndOffset;
    };

    // Processamento da Fila seguindo a ordem de Etapas
    novaFila.forEach(job => {
        let jobPointer = 0;

        // 1. Programação (Sempre primeiro se houver)
        if (job.prog > 0) {
            jobPointer = allocateTask(job, 'ADM', jobPointer, 'prog', 0);
        }

        // 2. Etapa 1 (Sempre inicia respeitando o fim da Programação)
        if (job.etapa1) {
            const tech = job.etapa1.toUpperCase().includes('TORNO') ? 'TORNO' : 'CENTRO';
            jobPointer = allocateTask(job, tech as any, jobPointer, tech.toLowerCase() as any, 1);
        }

        // 3. Etapa 2 (SÓ INICIA QUANDO A ETAPA 1 FOR TOTALMENTE CONCLUÍDA)
        if (job.etapa2) {
            const tech = job.etapa2.toUpperCase().includes('TORNO') ? 'TORNO' : 'CENTRO';
            jobPointer = allocateTask(job, tech as any, jobPointer, tech.toLowerCase() as any, 2);
        }
        
        // Compatibilidade com formato antigo sem etapas definidas
        if (!job.etapa1 && !job.etapa2) {
            if (job.torno > 0) jobPointer = allocateTask(job, 'TORNO', jobPointer, 'torno', 1);
            if (job.centro > 0) jobPointer = allocateTask(job, 'CENTRO', jobPointer, 'centro', 2);
        }
    });

    try {
      await setDoc(doc(firestore, 'programacaoState', 'fila'), { data: novaFila, updatedAt: serverTimestamp() });
      await setDoc(doc(firestore, 'programacaoState', 'plano'), { data: novosPlanItems, updatedAt: serverTimestamp() });
      toast({ title: "Plano Atualizado", description: "O cronograma foi recalculado respeitando a sequência de etapas." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: "Verifique a conexão.", variant: "destructive" });
    }
  };

  const moveItem = (index: number, direction: number) => {
    const newFila = [...fila];
    const target = index + direction;
    if (target < 0 || target >= newFila.length) return;
    [newFila[index], newFila[target]] = [newFila[target], newFila[index]];
    recalculatePlan(newFila);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(firstSheet);

        const findVal = (row: any, keys: string[]) => {
          const k = Object.keys(row).find(k => keys.some(s => k.toLowerCase().trim() === s.toLowerCase().trim() || k.toLowerCase().includes(s.toLowerCase())));
          return k ? row[k] : undefined;
        };

        const novaFila: JobBase[] = json.map((row, i) => {
          const req = String(findVal(row, ['req', 'requisicao', 'forms']) || 'S/N');
          const peca = String(findVal(row, ['peca', 'peça', 'nome']) || 'SEM NOME');
          const qtd = Number(findVal(row, ['qtd', 'quantidade']) || 1);
          
          return {
            id: `job-${i}-${Date.now()}`,
            requisicao: req,
            nomeDaPeca: peca,
            quantidade: isNaN(qtd) || qtd <= 0 ? 1 : qtd,
            setup: Number(findVal(row, ['setup', 'tempo setup em minutos', 'tempo setup']) || 20),
            torno: Number(findVal(row, ['torno', 'tempo de planejamento torno minutos todas as peças solicitadas', 'tempo torno']) || 0),
            centro: Number(findVal(row, ['centro', 'tempo de planejamento centro minutos todas as peças solicitadas', 'tempo centro']) || 0),
            prog: Number(findVal(row, ['prog', 'tempo programação minutos', 'programação']) || 0),
            site: String(findVal(row, ['site', 'fabrica']) || 'VALINHOS'),
            etapa1: String(findVal(row, ['etapa 1', 'etapa1']) || ''),
            etapa2: String(findVal(row, ['etapa 2', 'etapa2']) || ''),
          };
        });

        await recalculatePlan(novaFila);
      } catch (err: any) {
        console.error(err);
        toast({ title: "Erro na Importação", description: "Verifique o formato da planilha.", variant: "destructive" });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col gap-8 bg-background min-h-screen -m-4 p-4 lg:-m-6 lg:p-6 font-['IBM_Plex_Sans'] dark">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-['Barlow_Condensed'] uppercase leading-none">PLANO DE CARGA CNC</h1>
          <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase font-bold mt-1">Time Técnico de Usinagem · Torno & Centro · 3 Turnos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border shadow-sm h-11">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(p => addDays(p, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3 font-bold text-sm min-w-[130px] justify-center text-foreground">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{format(currentDate, 'dd/MM/yyyy')}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(p => addDays(p, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="bg-card border-border text-foreground font-bold text-[10px] uppercase h-11 shadow-sm hover:bg-muted" onClick={() => recalculatePlan([])}>
            <Eraser className="h-4 w-4 mr-2" /> Limpar Plano
          </Button>

          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls,.csv" />
          <Button variant="outline" size="sm" className="bg-secondary text-[#F0BC00] border-secondary font-bold text-[10px] uppercase h-11 shadow-lg hover:brightness-110" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />} Importar & Planejar Automático
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 bg-card rounded-lg border shadow-sm">
            <Loader className="h-10 w-10 animate-spin text-primary" />
            <span className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Sincronizando com Firestore...</span>
          </div>
        ) : (
          timelineDays.map((day) => {
            const dayItems = planejamentoData.filter(item => {
              let d; try { d = parse(item.dataExecucao, 'dd/MM/yyyy', new Date()); } catch { return false; }
              return isSameDay(d, day);
            });

            const dPcs = dayItems.reduce((acc, s) => acc + (s.quantidadeNoBloco || 0), 0);
            const dOcc = dayItems.reduce((acc, s) => acc + (s.tempoMinutos || 0) + (s.setupMinutos || 0), 0);

            return (
              <div key={day.toString()} className="bg-card border border-border shadow-md overflow-hidden rounded-sm">
                <div className="bg-muted/50 text-foreground px-4 py-3 flex items-center justify-between border-b-2 border-[#F0BC00]">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold uppercase tracking-widest font-['Barlow_Condensed']">Dia {format(day, 'dd · MM/yy')}</span>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{format(day, 'EEEE', { locale: ptBR })}</span>
                  </div>
                  <div className="flex gap-6 font-mono text-[11px] text-muted-foreground">
                    <span>PEÇAS: <b className="text-foreground text-sm">{dPcs}</b></span>
                    <span>OCUPAÇÃO: <b className="text-foreground text-sm">{(dOcc / 60).toFixed(1)}h</b></span>
                    <span>EFICIÊNCIA: <b className="text-[#F0BC00] text-sm">{(100 * dOcc / (SHIFT_MIN * 3 * 2)).toFixed(0)}%</b></span>
                  </div>
                </div>

                <div className="divide-y divide-border/30">
                  {TURNOS.map(turno => (
                    <div key={turno.id} className="grid grid-cols-[118px_1fr] border-b border-border/10 last:border-0">
                      <div className="bg-muted/10 border-r border-border/30 p-4 flex flex-col justify-center items-center">
                        <span className="text-3xl font-bold font-['Barlow_Condensed'] leading-none text-foreground">{turno.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground mt-2 font-bold">{turno.range}</span>
                      </div>
                      <div className="p-4 bg-card/40">
                        <Ruler />
                        <div className="space-y-3">
                          {['TORNO', 'CENTRO', 'ADM'].map((cat) => {
                            const shiftTechs = EQUIPE[cat][turno.id] || [];
                            return shiftTechs.map(techInfo => {
                              const techItems = dayItems.filter(i => i.tecnico === techInfo.name && (i.techKey === cat || (cat === 'ADM' && i.tipoAtividade === 'PROGRAMACAO')));
                              if (cat === 'ADM' && techItems.length === 0) return null;
                              
                              return (
                                <div key={`${techInfo.name}-${cat}`} className="grid grid-cols-[155px_1fr] items-center group">
                                  <div className="pr-3 min-w-0">
                                    <div className={cn("text-[9px] font-mono font-black uppercase tracking-tight", cat === 'TORNO' ? "text-cyan-400" : (cat === 'CENTRO' ? "text-purple-400" : "text-slate-400"))}>
                                      {cat === 'TORNO' ? '▬ Torno' : (cat === 'CENTRO' ? '▣ Centro' : '▣ Prog.')}
                                    </div>
                                    <div className="text-[12px] font-bold text-foreground truncate leading-tight">{techInfo.name}</div>
                                  </div>
                                  <div className="relative h-[42px] border border-border/50 rounded-[3px] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.02)_0_1px,transparent_1px_100%)] bg-[size:12.5%_100%] overflow-hidden shadow-inner bg-black/20">
                                    {techItems.length === 0 && (
                                      <div className="absolute inset-0 flex items-center justify-center text-[8px] uppercase tracking-[0.3em] text-muted-foreground/20 font-mono font-bold italic">Livre</div>
                                    )}
                                    {techItems.map(item => (
                                      <TimelineBar key={item.id} item={item} />
                                    ))}
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

      <Card className="border-border shadow-lg bg-card text-card-foreground">
        <CardHeader className="bg-muted/10 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">Fila de Produção & Prioridades</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sequenciamento por etapas: {fila.length} requisições ativas</CardDescription>
            </div>
            <Info className="h-5 w-5 text-muted-foreground opacity-50" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow className="border-border">
                <TableHead className="w-20 text-center font-bold">PRIOR.</TableHead>
                <TableHead className="font-bold">FLUXO</TableHead>
                <TableHead className="font-bold">REQ.</TableHead>
                <TableHead className="font-bold">PEÇA</TableHead>
                <TableHead className="text-right font-bold">QTD</TableHead>
                <TableHead className="text-right font-bold">TOTAL (MIN)</TableHead>
                <TableHead className="text-right font-bold">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fila.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground font-mono text-xs uppercase tracking-widest italic opacity-50">Nenhuma requisição carregada</TableCell>
                </TableRow>
              ) : (
                fila.map((job, index) => (
                  <TableRow key={job.id} className="hover:bg-muted/10 transition-colors border-border/50">
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6 border-border" onClick={() => moveItem(index, -1)} disabled={index === 0}><ArrowUp className="h-3 w-3" /></Button>
                        <Button variant="outline" size="icon" className="h-6 w-6 border-border" onClick={() => moveItem(index, 1)} disabled={index === fila.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.etapa1 && <Badge variant="outline" className="bg-cyan-900/20 text-cyan-400 border-cyan-800 text-[8px] uppercase">{job.etapa1}</Badge>}
                        {job.etapa2 && <span className="text-muted-foreground text-xs">→</span>}
                        {job.etapa2 && <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-800 text-[8px] uppercase">{job.etapa2}</Badge>}
                        {!job.etapa1 && !job.etapa2 && <span className="text-[10px] text-muted-foreground italic">Direto</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm">#{job.requisicao}</TableCell>
                    <TableCell className="uppercase text-[10px] font-medium text-foreground max-w-[200px] truncate">{job.nomeDaPeca}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">{job.quantidade} pç</TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground">{job.setup + job.torno + job.centro} min</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase font-bold text-red-400 hover:text-red-300" onClick={() => {
                          const newFila = fila.filter(j => j.id !== job.id);
                          recalculatePlan(newFila);
                       }}>Remover</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="bg-muted/5 border border-border p-4 rounded-lg text-[11px] leading-relaxed text-muted-foreground">
        <p><b>Como o sequenciamento funciona:</b></p>
        <p>1. O tempo de <b>Programação</b> (Software) é agendado no 1º turno com William ou Alisson.</p>
        <p>2. A <b>Etapa 1</b> (ex: Torno) inicia respeitando o tempo de Setup definido (ex: 20 min).</p>
        <p>3. A <b>Etapa 2</b> (ex: Centro) é agendada automaticamente <b>somente após</b> a conclusão de todo o lote da Etapa 1.</p>
        <p>4. O cálculo de peças por turno usa a fórmula: <code>(Tempo Disponível ÷ Ciclo Médio)</code>, descontando o Setup.</p>
      </div>
    </div>
  );
}
