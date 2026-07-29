
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDatabase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ref, onValue, set, push } from 'firebase/database';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
  Settings2
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

// --- Interfaces ---
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
  site: string;
  startOffsetMin: number; 
  tipoAtividade: 'USINAGEM' | 'PROGRAMACAO' | 'SETUP';
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

const factoryList = ["VALINHOS DOVE", "VALINHOS SABONETE", "VINHEDO", "POUSO ALEGRE", "INDAIATUBA", "AGUAÍ", "SUAPE", "IGARASSU", "GARANHUNS", "TORRE"];

// --- Componentes de UI ---

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
  return <div className="relative h-[18px] ml-[155px] border-b border-[#CBD5DD] mb-1">{marks}</div>;
};

const TimelineBar = ({ item, realData }: { item: PlanejamentoItem, realData: any[] }) => {
  const totalMin = (item.tempoMinutos || 0) + (item.setupMinutos || 0);
  const widthPc = Math.max((totalMin / 480) * 100, 1.5);
  const leftPc = (item.startOffsetMin / 480) * 100;
  const setupPc = totalMin > 0 ? (item.setupMinutos / totalMin) * 100 : 0;

  // Cálculo de progresso real baseado em registros de produção
  const realMinutes = realData
    .filter(r => String(r.formsNumber) === String(item.requisicao))
    .reduce((acc, curr) => acc + (Number(curr.machiningTime) || 0), 0);
  
  const progress = item.tempoMinutos > 0 ? Math.min((realMinutes / (item.tempoMinutos * (item.quantidadeTotal / item.quantidadeNoBloco || 1))) * 100, 100) : 0;

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
            {item.quantidadeNoBloco > 0 ? `${Math.floor(item.quantidadeNoBloco)}pç` : (item.setupMinutos > 0 && item.tempoMinutos === 0 ? 'SETUP' : 'CURSO')}
        </span>
        <span className="text-[10px] opacity-80 truncate uppercase font-medium">{item.nomeDaPeca}</span>
      </div>
      {/* Barra de Progresso Real na base */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-black/30 w-full">
        <div className="h-full bg-white opacity-80" style={{ width: `${progress}%` }} />
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

  const timelineDays = useMemo(() => [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)], [currentDate]);

  // Busca dados reais de produção para mostrar o progresso nas barras
  const productionQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'productionRecords'), where('date', '>=', startOfDay(currentDate)), where('date', '<=', endOfDays(addDays(currentDate, 5))));
  }, [firestore, currentDate]);

  const { data: productionRecords } = useCollection(productionQuery);

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

  const clearAllPlanning = async () => {
    if (!database || !confirm("Deseja apagar todo o planejamento atual?")) return;
    await set(ref(database, '/Planejamento_V2'), null);
    toast({ title: "Planejamento Limpo", description: "Inicie um novo ciclo de carga." });
  };

  const handleImportAndPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !database) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'binary' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const SHIFT_MIN = 480; 
        const updates: any = {};
        
        // Ponteiros de tempo por TÉCNICO para evitar amontoamento
        let techTimePointers: Record<string, number> = {};

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

          // 1. Planejamento de Programação (William)
          if (progTotal > 0) {
             const techName = EQUIPE['ADM']['1'][0].name;
             const start = techTimePointers[techName] || 0;
             const newRef = push(ref(database, '/Planejamento_V2'));
             updates[newRef.key!] = {
                dataExecucao: format(currentDate, 'dd/MM/yyyy'),
                turno: '1', tecnico: techName, equipamento: 'PROGRAMACAO',
                requisicao: req, nomeDaPeca: peca, quantidadeTotal: qtdTotal, quantidadeNoBloco: 0,
                tempoMinutos: progTotal, setupMinutos: 0, site, startOffsetMin: start % SHIFT_MIN,
                tipoAtividade: 'PROGRAMACAO'
             };
             techTimePointers[techName] = start + progTotal;
          }

          // 2. Planejamento de Usinagem (Torno e Centro)
          const tasks = [];
          if (tornoTotal > 0) tasks.push({ type: 'TORNO', total: tornoTotal, equip: 'TORNO CNC CENTUR 30' });
          if (centroTotal > 0) tasks.push({ type: 'CENTRO', total: centroTotal, equip: 'CENTRO DE USINAGEM D600' });

          tasks.forEach(task => {
            let pendingSetup = setupTotal;
            let pendingProd = task.total;
            let doneProdTime = 0;
            const cycleTime = task.total / qtdTotal;

            while (pendingSetup > 0.1 || pendingProd > 0.1) {
              // Encontra o técnico disponível com menor carga no momento
              const shiftOrder = ['1', '2', '3'];
              let chosenTech = null;
              let chosenShift = '1';
              let currentMinTime = Infinity;

              for (const sId of shiftOrder) {
                const techs = EQUIPE[task.type][sId] || [];
                for (const t of techs) {
                    const tTime = techTimePointers[t.name] || 0;
                    if (tTime < currentMinTime) {
                        currentMinTime = tTime;
                        chosenTech = t;
                        chosenShift = sId;
                    }
                }
              }

              if (!chosenTech) break;

              const techName = chosenTech.name;
              const globalTime = techTimePointers[techName] || 0;
              const startOffset = globalTime % SHIFT_MIN;
              const availInShift = SHIFT_MIN - startOffset;

              let timeToUse = 0;
              let sInShift = 0;
              let pInShift = 0;
              let qInShift = 0;

              if (pendingSetup > 0.1) {
                sInShift = Math.min(pendingSetup, availInShift);
                pendingSetup -= sInShift;
                timeToUse += sInShift;
              }

              const remShift = availInShift - timeToUse;
              if (remShift > 0.1 && pendingProd > 0.1) {
                pInShift = Math.min(remShift, pendingProd);
                
                // Cálculo matemático de peças concluídas no bloco
                const pcsBefore = Math.floor(doneProdTime / cycleTime + 0.001);
                doneProdTime += pInShift;
                const pcsAfter = Math.min(qtdTotal, Math.floor(doneProdTime / cycleTime + 0.001));
                qInShift = pcsAfter - pcsBefore;
                
                pendingProd -= pInShift;
                timeToUse += pInShift;
              }

              const dayOffset = Math.floor(globalTime / (SHIFT_MIN * 3));
              const newRef = push(ref(database, '/Planejamento_V2'));
              updates[newRef.key!] = {
                dataExecucao: format(addDays(currentDate, dayOffset), 'dd/MM/yyyy'),
                turno: chosenShift, tecnico: techName, equipamento: task.equip,
                requisicao: req, nomeDaPeca: peca, quantidadeTotal: qtdTotal, quantidadeNoBloco: qInShift,
                tempoMinutos: pInShift, setupMinutos: sInShift, site, startOffsetMin: startOffset,
                tipoAtividade: 'USINAGEM'
              };

              techTimePointers[techName] = globalTime + timeToUse;
              if (dayOffset > 7) break; // Trava de segurança
            }
          });
        });

        await set(ref(database, '/Planejamento_V2'), updates);
        toast({ title: "Planejamento Concluído", description: "As requisições foram distribuídas matematicamente nos turnos." });
      } catch (err) { 
        console.error(err); 
        toast({ title: "Erro na Importação", description: "Verifique o formato da sua planilha.", variant: "destructive" });
      } finally { 
        setIsImporting(false); 
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col gap-8 bg-[#E4E9EE] min-h-screen -m-4 p-4 lg:-m-6 lg:p-6 font-['IBM_Plex_Sans']">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#101820] font-['Barlow_Condensed'] uppercase leading-none">PLANO DE CARGA CNC</h1>
          <p className="text-[11px] tracking-[0.22em] text-[#8FA3B2] uppercase font-bold mt-1">Time Técnico de Usinagem · Torno & Centro · 3 Turnos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="bg-white border-[#CBD5DD] text-[#3D4C5A] font-bold text-[10px] uppercase h-9 shadow-sm" onClick={clearAllPlanning}>
            <Eraser className="h-4 w-4 mr-2" /> Limpar Plano
          </Button>

          <input type="file" ref={fileInputRef} onChange={handleImportAndPlan} accept=".xlsx, .xls, .csv" className="hidden" />
          <Button variant="outline" size="sm" className="bg-[#101820] text-[#F0BC00] border-[#101820] font-bold text-[10px] uppercase h-9 shadow-lg hover:bg-black" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />} Importar & Planejar Automático
          </Button>

          <div className="flex items-center gap-2 bg-white p-1 rounded border border-[#CBD5DD] shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(p => addDays(p, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-[140px] text-center font-bold flex items-center justify-center gap-2 text-xs">
              <CalendarDays className="h-4 w-4 text-[#6C7C8B]" />
              <span className="capitalize">{format(currentDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(p => addDays(p, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
            <div className="flex h-[400px] flex-col items-center justify-center gap-4 bg-white rounded-lg border shadow-sm">
                <Loader className="h-10 w-10 animate-spin text-[#5B36A8]" />
                <span className="font-bold uppercase text-[10px] tracking-widest text-[#6C7C8B]">Sincronizando Cronograma Industrial...</span>
            </div>
        ) : (
            timelineDays.map((day) => {
                const dayItems = planejamentoData.filter(item => {
                    let d; try { d = parse(item.dataExecucao, 'dd/MM/yyyy', new Date()); } catch { d = new Date(item.dataExecucao); }
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
                                <span>MÁQUINAS: <b className="text-[#F0BC00] text-sm">{(100 * dOcc / (480 * 3 * 2)).toFixed(0)}%</b></span>
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
                                                return (
                                                    <div key={techInfo.name} className="grid grid-cols-[155px_1fr] items-center group">
                                                        <div className="pr-3 min-w-0">
                                                            <div className={cn("text-[9.5px] font-mono font-black uppercase tracking-tight", cat === 'TORNO' ? "text-[#00707F]" : (cat === 'CENTRO' ? "text-[#5B36A8]" : "text-[#333333]"))}>
                                                                {cat === 'TORNO' ? '▬ Torno' : (cat === 'CENTRO' ? '▣ Centro' : '▣ Software')}
                                                            </div>
                                                            <div className="text-[13px] font-bold text-[#101820] truncate leading-tight">{techInfo.name}</div>
                                                            <div className="text-[9px] text-[#6C7C8B] leading-none uppercase font-bold tracking-tighter mt-0.5">{techInfo.role}</div>
                                                        </div>
                                                        <div className="relative h-[40px] border border-[#E2E9EE] rounded-[3px] bg-[repeating-linear-gradient(90deg,#F4F7F9_0_1px,transparent_1px_100%)] bg-[size:12.5%_100%] overflow-hidden shadow-inner">
                                                            {techItems.length === 0 && (
                                                                <div className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-[0.25em] text-[#A9B7C2] font-mono opacity-40 font-bold italic">Sem Carga Planejada</div>
                                                            )}
                                                            {techItems.map(item => (
                                                                <TimelineBar key={item.id} item={item} realData={productionRecords || []} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-[#101820] p-6 rounded border border-white/10 shadow-2xl">
            <h3 className="text-[#F0BC00] font-['Barlow_Condensed'] text-xl uppercase font-bold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" /> Regras de Cálculo do Plano
            </h3>
            <ul className="space-y-3 text-[11px] text-[#8FA3B2] leading-relaxed">
                <li>• <b className="text-white">Ciclo de Produção:</b> O sistema calcula `tempo ÷ quantidade` para determinar o ritmo real.</li>
                <li>• <b className="text-white">Corte de Turno:</b> Peças que não terminam no turno são automaticamente carregadas para o próximo técnico da escala.</li>
                <li>• <b className="text-white">Prioridade de Setup:</b> O tempo de preparação é alocado sempre no início da primeira raia da requisição.</li>
                <li>• <b className="text-white">Escala Real:</b> O 1T do Torno conta com <b className="text-white">Marcos e Alisson</b> simultaneamente para carga pesada.</li>
            </ul>
        </div>
        <div className="bg-white p-6 rounded border border-[#CBD5DD] shadow-lg">
            <h3 className="text-[#101820] font-['Barlow_Condensed'] text-xl uppercase font-bold mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> Legenda Técnica
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-4 w-8 bg-[#00707F] rounded-sm" />
                    <span className="text-[10px] font-bold uppercase text-[#3D4C5A]">Produção Torno</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-4 w-8 bg-[#5B36A8] rounded-sm" />
                    <span className="text-[10px] font-bold uppercase text-[#3D4C5A]">Produção Centro</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-4 w-8 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, #F0BC00 0 4px, #101820 4px 8px)' }} />
                    <span className="text-[10px] font-bold uppercase text-[#3D4C5A]">Tempo de Setup</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-4 w-8 bg-white border border-[#CBD5DD] relative">
                        <div className="absolute bottom-0 left-0 w-[70%] h-[2px] bg-blue-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#3D4C5A]">Execução Realizada</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function endOfDays(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

