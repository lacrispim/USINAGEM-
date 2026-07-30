
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDatabase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader, 
  Wand2,
  Eraser,
  CalendarDays,
  Clock,
  Settings2,
  ArrowUp,
  ArrowDown,
  Info
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
}

// --- Escala Técnica Oficial ---
const TURNOS = [
  { id: '1', label: '1T', range: '06:00-14:00' },
  { id: '2', label: '2T', range: '14:00-22:00' },
  { id: '3', label: '3T', range: '22:00-06:00' },
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
    '1': [{ name: 'William Martinucci', role: 'Programador Centro' }]
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
        <div className={cn("w-px bg-[#CBD5DD]", isMajor ? "h-[9px] bg-[#6C7C8B]" : "h-[5px]")} />
        {isMajor && <span className="text-[9px] font-mono text-[#6C7C8B] leading-none mt-1">{m / 60}h</span>}
      </div>
    );
  }
  return <div className="relative h-[18px] ml-[155px] border-b border-[#CBD5DD] mb-1">{marks}</div>;
};

const TimelineBar = ({ item }: { item: PlanejamentoItem }) => {
  const totalMin = (item.tempoMinutos || 0) + (item.setupMinutos || 0);
  const widthPc = Math.max((totalMin / SHIFT_MIN) * 100, 1.5);
  const leftPc = (item.startOffsetMin / SHIFT_MIN) * 100;
  const setupPc = totalMin > 0 ? (item.setupMinutos / totalMin) * 100 : 0;

  const isTorno = item.equipamento.includes('TORNO');
  const isProg = item.tipoAtividade === 'PROGRAMACAO';

  return (
    <div 
      className={cn(
        "absolute top-[3px] bottom-[3px] rounded-[2px] overflow-hidden border border-black/20 flex shadow-sm hover:scale-[1.01] transition-all z-10",
        isProg ? "bg-[#333333]" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]")
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
        <span className="font-mono text-[11px] font-bold shrink-0">{item.requisicao}</span>
        <span className="font-mono text-[10px] opacity-90 shrink-0 font-bold">
            {item.quantidadeNoBloco > 0 ? `${item.quantidadeNoBloco}pç` : (item.setupMinutos > 0 && item.tempoMinutos === 0 ? 'SETUP' : 'EM CURSO')}
        </span>
        <span className="text-[10px] opacity-80 truncate uppercase font-medium">{item.nomeDaPeca}</span>
      </div>
    </div>
  );
};

export default function ProgrammingPage() {
  const database = useDatabase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fila, setFila] = useState<JobBase[]>([]);
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const timelineDays = useMemo(() => [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)], [currentDate]);

  // Carregar Fila e Planejamento
  useEffect(() => {
    if (!database) return;
    
    const filaRef = ref(database, '/Fila_Producao');
    const planRef = ref(database, '/Planejamento_V2');

    const unsubFila = onValue(filaRef, (snap) => {
      if (snap.exists()) setFila(Object.values(snap.val()));
      else setFila([]);
    });

    const unsubPlan = onValue(planRef, (snap) => {
      if (snap.exists()) setPlanejamentoData(Object.values(snap.val()));
      else setPlanejamentoData([]);
      setLoading(false);
    });

    return () => { unsubFila(); unsubPlan(); };
  }, [database]);

  // Motor de Planejamento (schedule)
  const recalculatePlan = async (novaFila: JobBase[]) => {
    if (!database) return;
    
    const updates: any = {};
    let techPointers: Record<string, number> = {}; // Minutos acumulados por técnico

    // 1. Planejamento de Programação (William ADM)
    novaFila.forEach(job => {
      if (job.prog > 0) {
        const techName = EQUIPE['ADM']['1'][0].name;
        const currentTotal = techPointers[techName] || 0;
        const startOffset = currentTotal % SHIFT_MIN;
        const dayIdx = Math.floor(currentTotal / SHIFT_MIN);

        const id = push(ref(database, 'temp')).key!;
        updates[`/Planejamento_V2/${id}`] = {
          id,
          dataExecucao: format(addDays(currentDate, dayIdx), 'dd/MM/yyyy'),
          tecnico: techName, equipamento: 'PROGRAMAÇÃO',
          requisicao: job.requisicao, nomeDaPeca: job.nomeDaPeca,
          quantidadeTotal: job.quantidade, quantidadeNoBloco: 0,
          tempoMinutos: job.prog, setupMinutos: 0, turno: '1',
          startOffsetMin: startOffset, tipoAtividade: 'PROGRAMACAO'
        };
        techPointers[techName] = currentTotal + job.prog;
      }
    });

    // 2. Planejamento de Usinagem (Torno e Centro)
    const distribute = (type: 'torno' | 'centro') => {
      const techKey = type === 'torno' ? 'TORNO' : 'CENTRO';
      const equipName = type === 'torno' ? 'TORNO CNC' : 'CENTRO USINAGEM';

      novaFila.forEach(job => {
        const totalUsinagem = job[type];
        if (totalUsinagem <= 0) return;

        let pendingSetup = job.setup;
        let pendingProd = totalUsinagem;
        let doneProdTime = 0;
        const cycleTime = totalUsinagem / job.quantidade;

        while (pendingSetup > 0.1 || pendingProd > 0.1) {
          // Achar técnico disponível (menor ponteiro de tempo)
          let bestTech = null;
          let minTime = Infinity;
          let bestShift = '1';

          ['1', '2', '3'].forEach(sId => {
            (EQUIPE[techKey][sId] || []).forEach(t => {
              const tTime = techPointers[t.name] || 0;
              if (tTime < minTime) { minTime = tTime; bestTech = t; bestShift = sId; }
            });
          });

          if (!bestTech) break;

          const techName = (bestTech as any).name;
          const globalTime = techPointers[techName] || 0;
          const startOffset = globalTime % SHIFT_MIN;
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

          const dayIdx = Math.floor(globalTime / (SHIFT_MIN * 3));
          const id = push(ref(database, 'temp')).key!;
          updates[`/Planejamento_V2/${id}`] = {
            id,
            dataExecucao: format(addDays(currentDate, dayIdx), 'dd/MM/yyyy'),
            tecnico: techName, equipamento: equipName,
            requisicao: job.requisicao, nomeDaPeca: job.nomeDaPeca,
            quantidadeTotal: job.quantidade, quantidadeNoBloco: qInShift,
            tempoMinutos: pInShift, setupMinutos: sInShift, turno: bestShift,
            startOffsetMin: startOffset, tipoAtividade: 'USINAGEM'
          };

          techPointers[techName] = globalTime + sInShift + pInShift;
          if (dayIdx > 10) break; // Trava de segurança
        }
      });
    };

    distribute('torno');
    distribute('centro');

    await set(ref(database, '/Planejamento_V2'), null);
    await set(ref(database, '/'), { ...updates, Fila_Producao: novaFila });
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
    if (!file || !database) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'binary' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const findVal = (row: any, keys: string[]) => {
          const k = Object.keys(row).find(k => keys.some(s => k.toLowerCase().includes(s.toLowerCase())));
          return k ? row[k] : undefined;
        };

        const novaFila: JobBase[] = json.map((row, i) => ({
          id: `job-${i}-${Date.now()}`,
          requisicao: String(findVal(row, ['req', 'requisicao']) || 'S/N'),
          nomeDaPeca: String(findVal(row, ['peca', 'nome', 'desc']) || 'SEM NOME'),
          quantidade: Number(findVal(row, ['qtd', 'quantidade']) || 1),
          setup: Number(findVal(row, ['setup']) || 0),
          torno: Number(findVal(row, ['torno']) || 0),
          centro: Number(findVal(row, ['centro']) || 0),
          prog: Number(findVal(row, ['prog', 'programacao']) || 0),
          site: String(findVal(row, ['site', 'fabrica']) || 'VALINHOS'),
        }));

        await recalculatePlan(novaFila);
        toast({ title: "Importação Concluída", description: "O motor de sequenciamento gerou o plano." });
      } catch (err) {
        toast({ title: "Erro", description: "Verifique a planilha.", variant: "destructive" });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col gap-8 bg-[#E4E9EE] min-h-screen -m-4 p-4 lg:-m-6 lg:p-6 font-['IBM_Plex_Sans']">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#101820] font-['Barlow_Condensed'] uppercase leading-none">PLANO DE CARGA CNC</h1>
          <p className="text-[11px] tracking-[0.22em] text-[#8FA3B2] uppercase font-bold mt-1">Time Técnico de Usinagem · Torno & Centro · 3 Turnos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm h-11">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(p => addDays(p, -1))}>
              <ChevronLeft className="h-4 w-4 text-[#6C7C8B]" />
            </Button>
            <div className="flex items-center gap-3 font-bold text-sm min-w-[130px] justify-center text-[#101820]">
              <CalendarDays className="h-4 w-4 text-[#6C7C8B]" />
              <span>{format(currentDate, 'dd/MM/yyyy')}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(p => addDays(p, 1))}>
              <ChevronRight className="h-4 w-4 text-[#6C7C8B]" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="bg-white border-[#CBD5DD] text-[#3D4C5A] font-bold text-[10px] uppercase h-11 shadow-sm" onClick={() => recalculatePlan([])}>
            <Eraser className="h-4 w-4 mr-2" /> Limpar Plano
          </Button>

          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <Button variant="outline" size="sm" className="bg-[#101820] text-[#F0BC00] border-[#101820] font-bold text-[10px] uppercase h-11 shadow-lg" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />} Importar & Planejar Automático
          </Button>
        </div>
      </div>

      {/* Timeline (Gantt) */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 bg-white rounded-lg border shadow-sm">
            <Loader className="h-10 w-10 animate-spin text-[#5B36A8]" />
            <span className="font-bold uppercase text-[10px] tracking-widest text-[#6C7C8B]">Processando Sequência Industrial...</span>
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
              <div key={day.toString()} className="bg-white border border-[#CBD5DD] shadow-md overflow-hidden rounded-sm">
                <div className="bg-[#101820] text-white px-4 py-3 flex items-center justify-between border-b-4 border-[#F0BC00]">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold uppercase tracking-widest font-['Barlow_Condensed']">Dia {format(day, 'dd · MM/yy')}</span>
                    <span className="text-[11px] font-bold text-[#8FA3B2] uppercase tracking-[0.2em]">{format(day, 'EEEE', { locale: ptBR })}</span>
                  </div>
                  <div className="flex gap-6 font-mono text-[11px] text-[#8FA3B2]">
                    <span>PEÇAS: <b className="text-white text-sm">{dPcs}</b></span>
                    <span>OCUPAÇÃO: <b className="text-white text-sm">{(dOcc / 60).toFixed(1)}h</b></span>
                    <span>MÁQUINAS: <b className="text-[#F0BC00] text-sm">{(100 * dOcc / (SHIFT_MIN * 3 * 2)).toFixed(0)}%</b></span>
                  </div>
                </div>

                <div className="divide-y divide-[#E2E9EE]">
                  {TURNOS.map(turno => (
                    <div key={turno.id} className="grid grid-cols-[118px_1fr]">
                      <div className="bg-[#F4F7F9] border-r border-[#E2E9EE] p-4 flex flex-col justify-center items-center shadow-[inset_-2px_0_5px_rgba(0,0,0,0.02)]">
                        <span className="text-3xl font-bold font-['Barlow_Condensed'] leading-none text-[#101820]">{turno.label}</span>
                        <span className="text-[10px] font-mono text-[#6C7C8B] mt-2 font-bold">{turno.range}</span>
                      </div>
                      <div className="p-4 bg-white">
                        <Ruler />
                        <div className="space-y-3">
                          {['TORNO', 'CENTRO', 'ADM'].map((cat) => {
                            const shiftTechs = EQUIPE[cat][turno.id] || [];
                            return shiftTechs.map(techInfo => {
                              const techItems = dayItems.filter(i => i.tecnico === techInfo.name && i.turno === turno.id);
                              if (cat === 'ADM' && techItems.length === 0) return null;
                              
                              return (
                                <div key={techInfo.name} className="grid grid-cols-[155px_1fr] items-center group">
                                  <div className="pr-3 min-w-0">
                                    <div className={cn("text-[9.5px] font-mono font-black uppercase tracking-tight", cat === 'TORNO' ? "text-[#00707F]" : (cat === 'CENTRO' ? "text-[#5B36A8]" : "text-[#333333]"))}>
                                      {cat === 'TORNO' ? '▬ Torno' : (cat === 'CENTRO' ? '▣ Centro' : '▣ Programador')}
                                    </div>
                                    <div className="text-[13px] font-bold text-[#101820] truncate leading-tight">{techInfo.name}</div>
                                  </div>
                                  <div className="relative h-[40px] border border-[#E2E9EE] rounded-[3px] bg-[repeating-linear-gradient(90deg,#F4F7F9_0_1px,transparent_1px_100%)] bg-[size:12.5%_100%] overflow-hidden shadow-inner">
                                    {techItems.length === 0 && (
                                      <div className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-[0.25em] text-[#A9B7C2] font-mono opacity-40 font-bold italic">Sem Carga Planejada</div>
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

      {/* Fila de Produção (Controle de Sequência) */}
      <Card className="border-[#CBD5DD] shadow-lg">
        <CardHeader className="bg-[#F4F7F9] border-b border-[#E2E9EE]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">Fila de Produção</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-[#8FA3B2]">Ordem de entrada nas máquinas · Priorize aqui</CardDescription>
            </div>
            <Info className="h-5 w-5 text-[#6C7C8B] opacity-50" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#F4F7F9]">
              <TableRow>
                <TableHead className="w-20 text-center font-bold">ORD.</TableHead>
                <TableHead className="font-bold">TEC.</TableHead>
                <TableHead className="font-bold">REQ.</TableHead>
                <TableHead className="font-bold">PEÇA</TableHead>
                <TableHead className="text-right font-bold">QTD</TableHead>
                <TableHead className="text-right font-bold">SETUP</TableHead>
                <TableHead className="text-right font-bold">TORNO</TableHead>
                <TableHead className="text-right font-bold">CENTRO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fila.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground font-mono text-xs uppercase tracking-widest italic opacity-50">Nenhuma requisição na fila ativa</TableCell>
                </TableRow>
              ) : (
                fila.map((job, index) => (
                  <TableRow key={job.id} className="hover:bg-[#F7FAFB] transition-colors">
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Button 
                          variant="outline" size="icon" className="h-6 w-6 border-[#CBD5DD]" 
                          onClick={() => moveItem(index, -1)} disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" size="icon" className="h-6 w-6 border-[#CBD5DD]" 
                          onClick={() => moveItem(index, 1)} disabled={index === fila.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {job.torno > 0 && <Badge variant="outline" className="bg-[#D6EDEF] text-[#00707F] border-none font-mono text-[9px] w-fit">TORNO</Badge>}
                        {job.centro > 0 && <Badge variant="outline" className="bg-[#E6DEF6] text-[#5B36A8] border-none font-mono text-[9px] w-fit">CENTRO</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm">#{job.requisicao}</TableCell>
                    <TableCell className="uppercase text-xs font-medium text-[#3D4C5A]">{job.nomeDaPeca}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{job.quantidade} pç</TableCell>
                    <TableCell className="text-right font-mono text-xs text-[#6C7C8B]">{job.setup} min</TableCell>
                    <TableCell className="text-right font-mono text-xs text-[#00707F]">{job.torno > 0 ? `${job.torno} min` : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-[#5B36A8]">{job.centro > 0 ? `${job.centro} min` : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="bg-white p-6 rounded border border-[#CBD5DD] shadow-lg">
          <h3 className="text-[#101820] font-['Barlow_Condensed'] text-xl uppercase font-bold mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Regras do Motor de Sequenciamento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] text-[#8FA3B2] leading-relaxed">
            <ul className="space-y-2">
              <li>• <b className="text-[#3D4C5A]">Prioridade Dinâmica:</b> Use as setas na tabela acima para reordenar. O plano recalcula instantaneamente.</li>
              <li>• <b className="text-[#3D4C5A]">Cálculo de Peças:</b> Dividimos o tempo total pela quantidade. O sistema "entrega" as peças no turno em que o ciclo se fecha.</li>
              <li>• <b className="text-[#3D4C5A]">Fluxo Industrial:</b> Cada produção inicia com o Setup. Se o técnico mudar no meio do trabalho, o motor mantém a continuidade da contagem de peças.</li>
            </ul>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2"><div className="h-3 w-6 bg-[#00707F] rounded-sm" /><span className="uppercase font-bold text-[9px]">Torno</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-6 bg-[#5B36A8] rounded-sm" /><span className="uppercase font-bold text-[9px]">Centro</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-6 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, #F0BC00 0 3px, #101820 3px 6px)' }} /><span className="uppercase font-bold text-[9px]">Setup</span></div>
            </div>
          </div>
      </div>
    </div>
  );
}
