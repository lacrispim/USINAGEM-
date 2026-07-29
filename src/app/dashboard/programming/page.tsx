
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
  PlusCircle,
  Cpu,
  CalendarDays,
  Wand2,
  Eraser,
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

// --- Interfaces ---
interface AtividadePlanejada {
  tipo: string;
  tempo: number;
  site?: string;
}

interface PlanejamentoItem {
  id: string;
  dataExecucao: string;
  site: string;
  requisicao: string;
  nomeDaPeca: string;
  quantidadeTotal: number;
  quantidadeNoBloco: number;
  tecnico: string;
  horasPlanejadas: number;
  turno: string;
  perdaPlanejada?: string;
  atividades?: AtividadePlanejada[];
  observacao?: string;
  equipamento: string;
}

// --- Configuração da Equipe Oficial ---
const TURNOS = [
  { id: '1', label: '1T', range: '06:00-14:00' },
  { id: '2', label: '2T', range: '14:00-22:00' },
  { id: '3', label: '3T', range: '22:00-06:00' },
];

const ESCALA: Record<string, Record<string, string>> = {
  'TORNO': { '1': 'Marcos Barbosa', '2': 'Jair Melo', '3': 'Gustavo Gozzi' },
  'CENTRO': { '1': 'Daniel Solivo', '2': 'Nathan Xavier', '3': 'Rodrigo Cantano' },
  'ADM': { '1': 'William Martinucci' } // Programador oficial
};

const technicosList = [
    "Marcos Barbosa", "Jair Melo", "Gustavo Gozzi",
    "Daniel Solivo", "Nathan Xavier", "Rodrigo Cantano",
    "William Martinucci", "Alisson França"
];

const factoryList = [
    "VALINHOS DOVE", "VALINHOS SABONETE", "VINHEDO", "POUSO ALEGRE", 
    "INDAIATUBA", "AGUAÍ", "SUAPE", "IGARASSU", "GARANHUNS", "TORRE"
];

const lossOptions = [
  { value: 'PRODUCAO', label: 'Produção Normal', color: '#00707F' },
  { value: 'PROGRAMACAO', label: 'Programação (Software)', color: '#5B36A8' },
  { value: 'SETUP', label: 'Setup de Máquina', color: '#F0BC00' },
  { value: 'DDS', label: 'Atividades ADM / DDS', color: '#f97316' },
  { value: 'CAFE', label: 'Parada para Café', color: '#eab308' },
];

// --- Schemas ---
const planningFormSchema = z.object({
  dataExecucao: z.string().min(1, 'Data é obrigatória.'),
  equipamento: z.string().min(1, 'Equipamento é obrigatório.'),
  requisicao: z.string().min(1, 'Nº da Requisição é obrigatório.'),
  nomeDaPeca: z.string().min(1, 'Nome da peça é obrigatória.'),
  quantidadeTotal: z.coerce.number().min(0),
  quantidadeNoBloco: z.coerce.number().min(0),
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

// --- Componentes Visuais ---

const Ruler = ({ shiftMin }: { shiftMin: number }) => {
  const marks = [];
  for (let m = 0; m <= shiftMin; m += 60) {
    const pc = (m / shiftMin) * 100;
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

const TimelineBar = ({ item, realData, onClick, shiftMin }: { item: PlanejamentoItem, realData: any[], onClick: () => void, shiftMin: number }) => {
  const hours = Number(item.horasPlanejadas) || 0;
  const realHours = realData
    .filter(r => String(r.formsNumber) === String(item.requisicao))
    .reduce((acc, curr) => acc + (Number(curr.machiningTime) || 0) / 60, 0);
  
  const progress = hours > 0 ? Math.min((realHours / hours) * 100, 100) : 0;
  const isSetup = (item.perdaPlanejada || '').toUpperCase().includes('SETUP');
  const isProg = (item.perdaPlanejada || '').toUpperCase().includes('PROGRAMACAO');
  const isTorno = (item.equipamento || '').includes('TORNO');

  const widthPc = (hours / 8) * 100;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "absolute top-[3px] bottom-[3px] rounded-[2px] overflow-hidden cursor-pointer border border-black/20 flex items-center shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all z-10",
        isProg ? "bg-[#5B36A8]" : (isTorno ? "bg-[#00707F]" : "bg-[#5B36A8]")
      )}
      style={{ width: `${widthPc}%`, minWidth: '4px' }}
    >
      {isSetup && (
        <div 
          className="absolute inset-y-0 left-0 w-[12px] shrink-0 opacity-40" 
          style={{ background: 'repeating-linear-gradient(45deg, #F0BC00 0 5px, #3A2E00 5px 10px)' }} 
        />
      )}

      <div className="relative flex-1 flex items-center gap-2 px-2 min-w-0 text-white">
        <span className="font-mono text-[11px] font-bold shrink-0">{item.requisicao}</span>
        <span className="font-mono text-[10px] opacity-80 shrink-0">{item.quantidadeNoBloco > 0 ? `${Math.floor(item.quantidadeNoBloco)} pç` : 'set/prog'}</span>
        <span className="text-[10px] opacity-90 truncate uppercase font-medium">{item.nomeDaPeca}</span>
      </div>

      <div className="absolute bottom-0 left-0 h-[3px] bg-black/30 w-full overflow-hidden">
        <div className="h-full bg-white opacity-70" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

// --- Página Principal ---

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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<string>('1');

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
      quantidadeTotal: 0, quantidadeNoBloco: 0, tecnico: '', horasPlanejadas: 0, turno: '1',
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
    form.reset({
      dataExecucao: format(day, 'dd/MM/yyyy'),
      turno: turnoId, equipamento: '', requisicao: '', nomeDaPeca: '',
      quantidadeTotal: 0, quantidadeNoBloco: 0, tecnico: tecnico || '', horasPlanejadas: 0,
      site: 'VALINHOS DOVE', observacao: '', atividades: [{ tipo: 'PRODUCAO', tempo: 0, site: 'VALINHOS DOVE' }],
    });
    setIsDialogOpen(true);
  };

  const handleItemClick = (item: PlanejamentoItem) => {
    setEditingId(item.id);
    setSelectedTurno(item.turno);
    let itemDate = new Date();
    try { itemDate = parse(item.dataExecucao, 'dd/MM/yyyy', new Date()); } catch { itemDate = new Date(item.dataExecucao); }
    setSelectedDay(itemDate);
    
    form.reset({
      ...item,
      atividades: item.atividades || [{ tipo: item.perdaPlanejada || 'PRODUCAO', tempo: item.horasPlanejadas, site: item.site }]
    });
    setIsDialogOpen(true);
  };

  const clearAllPlanning = async () => {
    if (!database) return;
    if (confirm("Isso apagará TODO o planejamento atual. Deseja continuar?")) {
        await set(ref(database, '/Planejamento S'), null);
        toast({ title: "Planejamento Limpo" });
    }
  };

  async function onSubmit(values: PlanningFormValues) {
    if (!database) return;
    try {
      const mainLoss = values.atividades[0].tipo;
      const payload = {
        ...values,
        perdaPlanejada: mainLoss !== 'PRODUCAO' ? mainLoss : '',
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

  // --- MOTOR DE PLANEJAMENTO INDUSTRIAL AUTOMÁTICO ---
  const handleImportAndPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !database) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (json.length === 0) { toast({ title: "Arquivo Vazio", variant: "destructive" }); return; }

        const S = 480; // 8 horas em minutos
        let pointers = { 'TORNO': 0, 'CENTRO': 0, 'PROG': 0 };
        const updates: any = {};

        const findVal = (row: any, keys: string[]) => {
            const foundKey = Object.keys(row).find(k => keys.some(s => k.toLowerCase().includes(s.toLowerCase())));
            return foundKey ? row[foundKey] : undefined;
        };

        json.forEach((row) => {
          const req = String(findVal(row, ['req', 'requisicao', 'forms']) || '');
          const peca = String(findVal(row, ['peca', 'nome', 'desc']) || 'SEM NOME');
          const qtdTotal = Number(findVal(row, ['qtd', 'quantidade']) || 1);
          const setupTime = Number(findVal(row, ['setup']) || 0);
          const tornoTime = Number(findVal(row, ['torno']) || 0);
          const centroTime = Number(findVal(row, ['centro']) || 0);
          const progTime = Number(findVal(row, ['prog', 'programacao']) || 0);
          const site = String(findVal(row, ['site', 'fabrica']) || 'VALINHOS DOVE');

          // 1. Alocação de Programação (William ADM)
          if (progTime > 0) {
            const currentMin = pointers['PROG'];
            const dayOffset = Math.floor(currentMin / S);
            const targetDate = addDays(currentDate, dayOffset);
            const newRef = push(ref(database, '/Planejamento S'));
            if (newRef.key) {
              updates[newRef.key] = {
                dataExecucao: format(targetDate, 'dd/MM/yyyy'),
                turno: '1', tecnico: ESCALA['ADM']['1'],
                equipamento: centroTime > 0 ? 'CENTRO DE USINAGEM D600' : 'TORNO CNC CENTUR 30',
                requisicao: req, nomeDaPeca: peca, quantidadeTotal: qtdTotal, quantidadeNoBloco: 0,
                horasPlanejadas: progTime / 60, site: site, perdaPlanejada: 'PROGRAMACAO'
              };
            }
            pointers['PROG'] += progTime;
          }

          // 2. Alocação de Usinagem (Motor de Ciclo e Cascata)
          const technologies = [];
          if (tornoTime > 0) technologies.push({ type: 'TORNO', total: tornoTime, equip: 'TORNO CNC CENTUR 30' });
          if (centroTime > 0) technologies.push({ type: 'CENTRO', total: centroTime, equip: 'CENTRO DE USINAGEM D600' });

          technologies.forEach(tech => {
            let pendingSetup = setupTime;
            let doneTime = 0;
            const cycle = tech.total / qtdTotal;

            while (pendingSetup > 0.001 || doneTime < tech.total - 0.001) {
              const currentMinTotal = pointers[tech.type as 'TORNO' | 'CENTRO'];
              const shiftIdx = Math.floor(currentMinTotal / S);
              const dayOffset = Math.floor(shiftIdx / 3);
              const turnoNum = (shiftIdx % 3) + 1;
              const availInShift = S - (currentMinTotal % S);
              const tecnico = ESCALA[tech.type][String(turnoNum)];

              let timeUsed = 0;
              let setupInThisShift = 0;
              let prodInThisShift = 0;
              let piecesInThisShift = 0;

              // Setup primeiro
              if (pendingSetup > 0.001) {
                setupInThisShift = Math.min(pendingSetup, availInShift);
                pendingSetup -= setupInThisShift;
                timeUsed += setupInThisShift;
              }

              // Produção depois
              const remainingAvail = availInShift - timeUsed;
              if (remainingAvail > 0.001 && doneTime < tech.total - 0.001) {
                prodInThisShift = Math.min(remainingAvail, tech.total - doneTime);
                const beforePcs = Math.floor(doneTime / cycle + 0.0001);
                doneTime += prodInThisShift;
                const afterPcs = Math.min(qtdTotal, Math.floor(doneTime / cycle + 0.0001));
                piecesInThisShift = afterPcs - beforePcs;
                timeUsed += prodInThisShift;
              }

              const newRef = push(ref(database, '/Planejamento S'));
              if (newRef.key && (setupInThisShift > 0 || prodInThisShift > 0)) {
                updates[newRef.key] = {
                  dataExecucao: format(addDays(currentDate, dayOffset), 'dd/MM/yyyy'),
                  turno: String(turnoNum), tecnico: tecnico,
                  equipamento: tech.equip,
                  requisicao: req, nomeDaPeca: peca,
                  quantidadeTotal: qtdTotal, quantidadeNoBloco: piecesInThisShift,
                  horasPlanejadas: (setupInThisShift + prodInThisShift) / 60, site: site,
                  perdaPlanejada: setupInThisShift > 0 ? 'SETUP' : 'PRODUCAO'
                };
              }

              pointers[tech.type as 'TORNO' | 'CENTRO'] += timeUsed;
              if (pendingSetup <= 0.001 && doneTime >= tech.total - 0.001) break;
            }
          });
        });

        await update(ref(database, '/Planejamento S'), updates);
        toast({ title: "Planejamento Concluído", description: `${Object.keys(updates).length} blocos distribuídos.` });
      } catch (err) {
        console.error(err);
        toast({ title: "Erro na importação", variant: "destructive" });
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
          <h1 className="text-4xl font-bold tracking-tight text-[#101820] font-['Barlow_Condensed'] uppercase">PLANO DE CARGA CNC</h1>
          <p className="text-[11px] tracking-[0.22em] text-[#8FA3B2] uppercase font-bold">Time Técnico de Usinagem · Torno & Centro · 3 Turnos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="bg-destructive/10 border-destructive/20 text-destructive font-bold text-[10px] uppercase tracking-widest h-9" onClick={clearAllPlanning}>
            <Eraser className="h-4 w-4 mr-2" /> Limpar Plano
          </Button>

          <input type="file" ref={fileInputRef} onChange={handleImportAndPlan} accept=".xlsx, .xls, .csv" className="hidden" />
          <Button variant="outline" size="sm" className="bg-[#101820] border-none text-[#F0BC00] font-bold text-[10px] uppercase tracking-widest h-9 shadow-md" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
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

                const totalPecas = dayItems.reduce((acc, curr) => acc + (Number(curr.quantidadeNoBloco || 0)), 0);
                const totalHoras = dayItems.reduce((acc, curr) => acc + (Number(curr.horasPlanejadas || 0)), 0);

                return (
                    <div key={day.toString()} className="bg-white border border-[#CBD5DD] shadow-sm overflow-hidden rounded-sm">
                        <div className="bg-[#101820] text-white px-4 py-2.5 flex items-center justify-between border-b-4 border-[#F0BC00]">
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-bold uppercase tracking-widest font-['Barlow_Condensed']">Dia {format(day, 'dd · MM/yy')}</span>
                                <span className="text-[10px] font-bold text-[#8FA3B2] uppercase tracking-[0.18em]">{format(day, 'EEEE', { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-6 font-mono text-[11px] text-[#B7C6D2]">
                                <span>peças entregues <b className="text-white ml-1">{Math.floor(totalPecas)}</b></span>
                                <span>ocupação <b className="text-white ml-1">{totalHoras.toFixed(1)}h</b></span>
                                <span>utilização <b className="text-white ml-1">{(totalHoras > 0 ? Math.min((totalHoras / 48) * 100, 100).toFixed(0) : '0')}%</b></span>
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
                                        <Ruler shiftMin={480} />
                                        <div className="space-y-1.5">
                                          {['TORNO', 'CENTRO', 'ADM'].map((cat) => {
                                            const tecnico = ESCALA[cat][turno.id];
                                            if (!tecnico && cat === 'ADM') return null;
                                            if (!tecnico) return null;

                                            const techItems = dayItems.filter(i => i.tecnico === tecnico && i.turno === turno.id);
                                            const role = cat === 'ADM' ? 'Programador ADM' : 'Operador/Programador';
                                            const techLabel = cat === 'TORNO' ? '▬ Torno' : (cat === 'CENTRO' ? '▣ Centro' : '▣ ADM/Software');

                                            return (
                                              <div key={tecnico} className="grid grid-cols-[150px_1fr] items-center group">
                                                <div className="pr-2 min-w-0">
                                                  <div className={cn("text-[9px] font-mono font-bold uppercase tracking-widest", cat === 'TORNO' ? "text-[#00707F]" : "text-[#5B36A8]")}>
                                                    {techLabel}
                                                  </div>
                                                  <div className="text-[12px] font-bold text-[#0F151B] truncate">{tecnico}</div>
                                                  <div className="text-[9px] text-[#6C7C8B] leading-none">{role}</div>
                                                </div>
                                                <div className="relative h-[36px] border border-[#E2E9EE] rounded-[3px] bg-[repeating-linear-gradient(90deg,#F4F7F9_0_1px,transparent_1px_100%)] bg-[size:12.5%_100%] overflow-hidden">
                                                  {techItems.length === 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-widest text-[#A9B7C2] font-mono opacity-50">sem carga</div>
                                                  )}
                                                  {techItems.map(item => (
                                                    <TimelineBar key={item.id} item={item} realData={productionRecords || []} onClick={() => handleItemClick(item)} shiftMin={480} />
                                                  ))}
                                                  <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-8 opacity-0 group-hover:opacity-100 transition-opacity text-[#6C7C8B] hover:bg-[#F4F7F9]" onClick={() => handleShiftClick(day, turno.id, tecnico)}>
                                                    <Plus className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                            );
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

      <div className="flex gap-4 flex-wrap text-[11px] font-bold text-[#3D4C5A] items-center bg-white p-3 border border-[#CBD5DD] rounded-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-3 rounded-[2px] border border-black/10" style={{ background: 'repeating-linear-gradient(45deg, #F0BC00 0 4px, #3A2E00 4px 8px)' }} /> Setup</div>
        <div className="flex items-center gap-2"><div className="w-4 h-3 rounded-[2px] border border-black/10 bg-[#00707F]" /> Produção Torno</div>
        <div className="flex items-center gap-2"><div className="w-4 h-3 rounded-[2px] border border-black/10 bg-[#5B36A8]" /> Produção Centro / Programação</div>
        <div className="ml-auto text-[#6C7C8B] font-medium italic">A barra branca inferior indica o progresso real vindo dos registros de produção.</div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-['IBM_Plex_Sans']">
          <DialogHeader><DialogTitle className="font-['Barlow_Condensed'] text-2xl uppercase">{editingId ? 'Editar Planejamento' : `Novo Planejamento - ${selectedTurno}º Turno`}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="equipamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-[10px] tracking-widest text-[#6C7C8B]">Equipamento / Tecnologia</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <Button type="button" variant={field.value === 'TORNO CNC CENTUR 30' ? 'default' : 'outline'} className={cn("h-16 flex flex-col gap-1 border-2", field.value === 'TORNO CNC CENTUR 30' ? "border-[#00707F] bg-[#00707F]/10 text-[#00707F]" : "border-[#E2E9EE]")} onClick={() => field.onChange('TORNO CNC CENTUR 30')}><Settings2 className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-widest">TORNO CNC</span></Button>
                      <Button type="button" variant={field.value === 'CENTRO DE USINAGEM D600' ? 'default' : 'outline'} className={cn("h-16 flex flex-col gap-1 border-2", field.value === 'CENTRO DE USINAGEM D600' ? "border-[#5B36A8] bg-[#5B36A8]/10 text-[#5B36A8]" : "border-[#E2E9EE]")} onClick={() => field.onChange('CENTRO DE USINAGEM D600')}><Cpu className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-widest">CENTRO CNC</span></Button>
                    </div>
                  </FormItem>
                )} />

              <div className="space-y-4 rounded-lg border border-[#E2E9EE] p-4 bg-[#F4F7F9]">
                <div className="flex items-center justify-between">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-[#0F151B]">Distribuição de Atividades</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ tipo: 'PRODUCAO', tempo: 0, site: form.getValues('site') || 'VALINHOS DOVE' })} className="h-7 text-[10px] font-bold border-[#CBD5DD]"><PlusCircle className="h-3 w-3 mr-1" /> ADICIONAR</Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end border-b border-[#E2E9EE] pb-3 last:border-0 last:pb-0">
                    <div className="flex-[1.5]">
                      <FormField control={form.control} name={`atividades.${index}.tipo`} render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-8 text-[10px] font-mono"><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {lossOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-[10px] font-mono"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />{opt.label}</div></SelectItem>
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
                            <FormControl><SelectTrigger className="h-8 text-[10px] font-mono"><SelectValue placeholder="Fábrica" /></SelectTrigger></FormControl>
                            <SelectContent>{factoryList.map(f => <SelectItem key={f} value={f} className="text-[10px] font-mono">{f}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="w-20">
                      <FormField control={form.control} name={`atividades.${index}.tempo`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" step="0.1" placeholder="H" className="h-8 text-[10px] font-mono" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    {fields.length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => removeAtividade(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tecnico" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold tracking-widest text-[#6C7C8B]">Técnico</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{technicosList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name="site" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] uppercase font-bold tracking-widest text-[#6C7C8B]">Fábrica</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="requisicao" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold tracking-widest text-[#6C7C8B]">Requisição</FormLabel><FormControl><Input className="font-mono" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="nomeDaPeca" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold tracking-widest text-[#6C7C8B]">Peça</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <div className="grid grid-cols-2 gap-2">
                   <FormField control={form.control} name="quantidadeTotal" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold tracking-widest text-[#6C7C8B]">Qtd Total</FormLabel><FormControl><Input type="number" className="font-mono" {...field} /></FormControl></FormItem>)} />
                   <FormField control={form.control} name="quantidadeNoBloco" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold tracking-widest text-[#6C7C8B]">Qtd Bloco</FormLabel><FormControl><Input type="number" className="font-mono" {...field} /></FormControl></FormItem>)} />
                </div>
              </div>
              <FormField control={form.control} name="observacao" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold tracking-widest text-[#6C7C8B]">Notas</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
              <DialogFooter>
                {editingId && (<Button type="button" variant="destructive" onClick={async () => { if (!database || !editingId) return; await remove(ref(database, `/Planejamento S/${editingId}`)); toast({ title: "Planejamento Excluído" }); setIsDialogOpen(false); }}>Excluir</Button>)}
                <Button type="submit" className="bg-[#101820] hover:bg-[#101820]/90 uppercase font-bold text-xs tracking-widest">Salvar Programação</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
