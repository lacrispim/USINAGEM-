
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, Control } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, FileSpreadsheet, Trash2, Search, Filter, Pencil, Clock, Zap } from 'lucide-react';
import { ProductionTimer } from '@/components/dashboard/production-timer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useMemo, memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, serverTimestamp, orderBy, query, deleteDoc, doc, updateDoc, limit } from 'firebase/firestore';
import { format, parse, startOfDay, endOfDay, isValid, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Label } from '@/components/ui/label';

const months = [
    { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' },
];

const lossReasonDetails = [
    { value: "MANUTENÇÃO PLANEJADA", description: "LUBRIFICAÇÃO DA MÁQUINA" },
    { value: "TEMPO DE CAFÉ", description: "PARADA PARA CAFÉ" },
    { value: "LIMPEZA PLANEJADA", description: "LIMPEZA DA MÁQUINA, ÁREA, E CAÇAMBA" },
    { value: "SETUP", description: "SETUP PLANEJADO DE MÁQUINA E SETUP EMERGENCIAL" },
    { value: "DDS, APONTAMENTO HORAS, ATIVIDADE ADM", description: "DDS, APONTAMENTO HORAS, REUNIÕES, ETC" },
    { value: "INSPEÇÃO & VALIDAÇÃO DAS PEÇAS", description: "INSPEÇÃO DE QUALIDADE" },
    { value: "QUEBRA", description: "QUEBRA DO FERRAMENTAL, COLIZÃO, ETC" },
    { value: "FALHA DE PROCESSO", description: "FALTA DE AR COMPRIMIDO E ENERGIA" },
    { value: "ABSENTEÍSMO", description: "FALTA DE MÃO DE OBRA" },
    { value: "FALTA DE MATERIAL & FERRAMENTA", description: "FALTA DE AÇO, FERRAMENTA, ÓLEO" },
    { value: "MOVIMENTAÇÃO DE PEÇAS E EQUIPAMENTOS", description: "RECEBIMENTO E MOVIMENTAÇÃO" },
    { value: "PEQUENAS PARADAS", description: "PARADAS NÃO PROGRAMADAS < 10 MIN" },
    { value: "AJUSTES CORRETIVOS DE PROCESSOS", description: "AJUSTES NÃO PLANEJADOS" },
    { value: "VELOCIDADE REDUZIDA", description: "MÁQUINA OPERANDO ABAIXO DO NOMINAL" },
    { value: "RETRABALHO", description: "RETRABALHO DE OPERAÇÕES" },
    { value: "SERVIÇOS DE BANCADA/SERRA", description: "ATIVIDADES DE APOIO" },
    { value: "AUXÍLIO EM MAQUINA", description: "AJUDA EM OUTRA MÁQUINA" },
    { value: "AUXÍLIO AS FÁBRICAS", description: "AUXÍLIO DIRETO ÀS FÁBRICAS" }
];

const operatorList = ["Alisson França", "Daniel Solivo", "Rodrigo Cantano", "Gustavo Gozzi", "William Martinucci", "Nathan Xavier", "Jair Melo", "Marcos Barbosa"];
const factoryList = ["VALINHOS", "VINHEDO", "POUSO ALEGRE", "INDAIATUBA", "AGUAÍ", "SUAPE", "IGARASSU", "GARANHUNS", "TORRE"];

const productionFormSchema = z.object({
  operatorId: z.string().min(1, 'ID do Operador é obrigatório.'),
  date: z.string().min(1, 'Data é obrigatória.'),
  factory: z.string().min(1, 'Fábrica é obrigatória.'),
  formsNumber: z.string().optional(),
  activityType: z.string().optional(),
  machine: z.string().optional(),
  quantityProduced: z.coerce.number().optional(),
  operationsNumber: z.string().optional(),
  machiningTime: z.coerce.number().optional(),
  status: z.string().optional(),
  observations: z.string().optional(),
});

const lossFormSchema = z.object({
  operatorId: z.string().min(1, 'ID do Operador é obrigatório.'),
  date: z.string().min(1, 'Data é obrigatória.'),
  machine: z.string().optional(),
  lossReason: z.string().optional(),
  deadPartsQuantity: z.coerce.number().optional(),
  factory: z.string().min(1, 'Fábrica é obrigatória.'),
  timeLost: z.coerce.number().optional(),
  observations: z.string().optional(),
  formsNumber: z.string().optional(),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;
type LossFormValues = z.infer<typeof lossFormSchema>;

const getRecordDate = (field: any) => {
    if (!field) return null;
    if (field.toDate) return field.toDate();
    if (field instanceof Date) return field;
    return null;
};

// --- COMPONENTES MEMOIZADOS PARA PERFORMANCE ---

const ProductionHistoryTable = memo(({ records, isRestricted, onEdit, onDelete, onExport }: any) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        Histórico de Produção
                        {isRestricted && <Badge variant="secondary" className="text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1"><Zap className="h-2 w-2" /> Auto (15 dias)</Badge>}
                    </CardTitle>
                    <CardDescription>Registros filtrados.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => onExport(records, 'Producao')}><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Técnico</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-primary font-bold"><div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Apontamento</div></TableHead>
                            <TableHead>Fábrica</TableHead>
                            <TableHead>Nº Forms</TableHead>
                            <TableHead>Atividade</TableHead>
                            <TableHead>Produzido</TableHead>
                            <TableHead>Tempo</TableHead>
                            <TableHead>Observações</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground italic">Nenhum registro encontrado para este período.</TableCell></TableRow>
                        ) : records.map((r: any) => {
                            const rDate = getRecordDate(r.date);
                            const rCreatedAt = getRecordDate(r.createdAt);
                            return (
                            <TableRow key={r.id}>
                                <TableCell>{r.operatorId}</TableCell>
                                <TableCell>{rDate ? format(rDate, 'dd/MM/yyyy') : r.date}</TableCell>
                                <TableCell className="text-primary font-mono text-[11px] font-bold">
                                    {rCreatedAt ? format(rCreatedAt, 'dd/MM HH:mm') : '-'}
                                </TableCell>
                                <TableCell>{r.factory}</TableCell>
                                <TableCell className="font-mono font-bold">#{r.formsNumber}</TableCell>
                                <TableCell><Badge variant="outline">{r.activityType}</Badge></TableCell>
                                <TableCell>{r.quantityProduced} pç</TableCell>
                                <TableCell>{r.machiningTime} min</TableCell>
                                <TableCell className="max-w-[150px] truncate text-[10px] text-muted-foreground italic">
                                    {r.observations || '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit('production', r)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => onDelete('productionRecords', r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                  </div>
                                </TableCell>
                            </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
});
ProductionHistoryTable.displayName = 'ProductionHistoryTable';

const LossHistoryTable = memo(({ records, isRestricted, onEdit, onDelete, onExport }: any) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        Histórico de Perdas
                        {isRestricted && <Badge variant="secondary" className="text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1"><Zap className="h-2 w-2" /> Auto (15 dias)</Badge>}
                    </CardTitle>
                    <CardDescription>Paradas e inatividades registradas.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => onExport(records, 'Perdas')}><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Técnico</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-primary font-bold"><div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Apontamento</div></TableHead>
                            <TableHead>Fábrica</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Tempo Perdido</TableHead>
                            <TableHead>Observações</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic">Nenhum registro de perda encontrado.</TableCell></TableRow>
                        ) : records.map((r: any) => {
                            const rDate = getRecordDate(r.date);
                            const rCreatedAt = getRecordDate(r.createdAt);
                            return (
                            <TableRow key={r.id}>
                                <TableCell>{r.operatorId}</TableCell>
                                <TableCell>{rDate ? format(rDate, 'dd/MM/yyyy') : r.date}</TableCell>
                                <TableCell className="text-primary font-mono text-[11px] font-bold">
                                    {rCreatedAt ? format(rCreatedAt, 'dd/MM HH:mm') : '-'}
                                </TableCell>
                                <TableCell>{r.factory}</TableCell>
                                <TableCell><Badge className="bg-yellow-500 text-black">{r.lossReason}</Badge></TableCell>
                                <TableCell className="text-red-500 font-bold">{r.timeLost} min</TableCell>
                                <TableCell className="max-w-[150px] truncate text-[10px] text-muted-foreground italic">
                                    {r.observations || '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit('loss', r)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => onDelete('lossRecords', r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                  </div>
                                </TableCell>
                            </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
});
LossHistoryTable.displayName = 'LossHistoryTable';

const IsolatedProductionTimer = ({ control, setValue }: { control: Control<ProductionFormValues>, setValue: any }) => {
  const time = useWatch({ control, name: 'machiningTime' }) || 0;
  return (
    <ProductionTimer 
      title="Contador de Produção" 
      initialTimeInMinutes={time} 
      onTimeChange={(t) => setValue('machiningTime', t)} 
    />
  );
};

const IsolatedLossTimer = ({ control, setValue }: { control: Control<LossFormValues>, setValue: any }) => {
  const time = useWatch({ control, name: 'timeLost' }) || 0;
  return (
    <ProductionTimer 
      title="Contador de Perda" 
      initialTimeInMinutes={time} 
      onTimeChange={(t) => setValue('timeLost', t)} 
    />
  );
};

export default function ProductionRegistryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [editingRecord, setEditingRecord] = useState<{ id: string, type: 'production' | 'loss', data: any } | null>(null);
  
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedFactory, setSelectedFactory] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [formsFilter, setFormsFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const productionForm = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: { 
      date: format(new Date(), 'dd/MM/yyyy'), 
      status: 'Em produção', 
      observations: '',
      quantityProduced: 0,
      machiningTime: 0,
      activityType: '',
      machine: '',
      operatorId: '',
      factory: ''
    }
  });

  const editProductionForm = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
  });

  const lossForm = useForm<LossFormValues>({
    resolver: zodResolver(lossFormSchema),
    defaultValues: { 
      date: format(new Date(), 'dd/MM/yyyy'), 
      observations: '',
      timeLost: 0,
      deadPartsQuantity: 0,
      machine: '',
      operatorId: '',
      factory: '',
      lossReason: ''
    }
  });

  const editLossForm = useForm<LossFormValues>({
    resolver: zodResolver(lossFormSchema),
  });

  const productionRecordsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'productionRecords'), orderBy('date', 'desc'), limit(1000)) : null, [firestore]);
  const lossRecordsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'lossRecords'), orderBy('date', 'desc'), limit(1000)) : null, [firestore]);
  
  const { data: productionRecords } = useCollection(productionRecordsQuery);
  const { data: lossRecords } = useCollection(lossRecordsQuery);

  const isRestrictedByPerformance = useMemo(() => {
    return selectedMonth === 'all' && !selectedDate && selectedOperator === 'all' && selectedFactory === 'all' && !formsFilter;
  }, [selectedMonth, selectedDate, selectedOperator, selectedFactory, formsFilter]);

  const filteredProductionRecords = useMemo(() => {
    if (!productionRecords) return [];
    if (selectedCategory !== 'all' && selectedCategory !== 'PRODUCAO') return [];

    const fifteenDaysAgo = startOfDay(subDays(new Date(), 15));

    return productionRecords.filter(record => {
      const recordDate = getRecordDate(record.date);
      if (!recordDate) return false;

      if (isRestrictedByPerformance && recordDate < fifteenDaysAgo) return false;

      if (selectedDate && (recordDate < startOfDay(selectedDate) || recordDate > endOfDay(selectedDate))) return false;
      if (selectedMonth !== 'all' && recordDate.getMonth() !== parseInt(selectedMonth)) return false;
      if (selectedOperator !== 'all' && record.operatorId !== selectedOperator) return false;
      if (selectedFactory !== 'all' && record.factory !== selectedFactory) return false;
      if (formsFilter && !record.formsNumber?.toLowerCase().includes(formsFilter.toLowerCase())) return false;
      return true;
    });
  }, [productionRecords, selectedOperator, selectedFactory, selectedDate, selectedMonth, formsFilter, selectedCategory, isRestrictedByPerformance]);

  const filteredLossRecords = useMemo(() => {
    if (!lossRecords) return [];
    if (selectedCategory === 'PRODUCAO') return [];

    const fifteenDaysAgo = startOfDay(subDays(new Date(), 15));

    return lossRecords.filter(record => {
      const recordDate = getRecordDate(record.date);
      if (!recordDate) return false;

      if (isRestrictedByPerformance && recordDate < fifteenDaysAgo) return false;

      if (selectedDate && (recordDate < startOfDay(selectedDate) || recordDate > endOfDay(selectedDate))) return false;
      if (selectedMonth !== 'all' && recordDate.getMonth() !== parseInt(selectedMonth)) return false;
      if (selectedOperator !== 'all' && record.operatorId !== selectedOperator) return false;
      if (selectedFactory !== 'all' && record.factory !== selectedFactory) return false;
      if (formsFilter && !record.formsNumber?.toLowerCase().includes(formsFilter.toLowerCase())) return false;
      if (selectedCategory !== 'all' && record.lossReason !== selectedCategory) return false;
      return true;
    });
  }, [lossRecords, selectedOperator, selectedFactory, selectedDate, selectedMonth, formsFilter, selectedCategory, isRestrictedByPerformance]);

  async function onProductionSubmit(values: ProductionFormValues) {
    if (!firestore) return;
    const parsedDate = parse(values.date, 'dd/MM/yyyy', new Date());
    if (!isValid(parsedDate)) {
        toast({ title: 'Erro', description: 'Data inválida. Use o formato dd/MM/yyyy.', variant: 'destructive' });
        return;
    }

    const docData = { 
        ...values, 
        date: parsedDate, 
        createdAt: serverTimestamp() 
    };

    const colRef = collection(firestore, 'productionRecords');
    addDoc(colRef, docData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: docData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    toast({ title: 'Sucesso', description: 'Produção enviada com sucesso.' });
    
    const savedDate = values.date;
    productionForm.reset({ 
        date: savedDate,
        operatorId: '',
        factory: '',
        formsNumber: '', 
        quantityProduced: 0, 
        machiningTime: 0, 
        observations: '',
        machine: '',
        activityType: '',
        status: 'Em produção'
    });
  }

  async function onLossSubmit(values: LossFormValues) {
    if (!firestore) return;
    const parsedDate = parse(values.date, 'dd/MM/yyyy', new Date());
    if (!isValid(parsedDate)) {
        toast({ title: 'Erro', description: 'Data inválida. Use o formato dd/MM/yyyy.', variant: 'destructive' });
        return;
    }

    const docData = { 
        ...values, 
        date: parsedDate, 
        createdAt: serverTimestamp() 
    };

    const colRef = collection(firestore, 'lossRecords');
    addDoc(colRef, docData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: docData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    toast({ title: 'Sucesso', description: 'Perda enviada com sucesso.' });
    
    const savedDate = values.date;
    lossForm.reset({ 
        date: savedDate,
        operatorId: '',
        factory: '',
        machine: '',
        lossReason: '',
        timeLost: 0, 
        deadPartsQuantity: 0, 
        observations: '',
        formsNumber: ''
    });
  }

  const handleEdit = (type: 'production' | 'loss', record: any) => {
    const recordDate = getRecordDate(record.date);
    const formattedDate = recordDate ? format(recordDate, 'dd/MM/yyyy') : record.date;
    
    if (type === 'production') {
      editProductionForm.reset({
        operatorId: record.operatorId,
        date: formattedDate,
        factory: record.factory,
        formsNumber: record.formsNumber || '',
        activityType: record.activityType || '',
        machine: record.machine || '',
        quantityProduced: record.quantityProduced || 0,
        machiningTime: record.machiningTime || 0,
        status: record.status || '',
        observations: record.observations || '',
      });
    } else {
      editLossForm.reset({
        operatorId: record.operatorId,
        date: formattedDate,
        machine: record.machine || '',
        lossReason: record.lossReason || '',
        deadPartsQuantity: record.deadPartsQuantity || 0,
        factory: record.factory || '',
        timeLost: record.timeLost || 0,
        observations: record.observations || '',
        formsNumber: record.formsNumber || '',
      });
    }
    setEditingRecord({ id: record.id, type, data: record });
  };

  const onUpdateProduction = async (values: ProductionFormValues) => {
    if (!firestore || !editingRecord) return;
    const parsedDate = parse(values.date, 'dd/MM/yyyy', new Date());
    const docRef = doc(firestore, 'productionRecords', editingRecord.id);
    const updateData = {
        ...values,
        date: parsedDate,
        updatedAt: serverTimestamp()
    };

    updateDoc(docRef, updateData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    toast({ title: 'Sucesso', description: 'Registro atualizado.' });
    setEditingRecord(null);
  };

  const onUpdateLoss = async (values: LossFormValues) => {
    if (!firestore || !editingRecord) return;
    const parsedDate = parse(values.date, 'dd/MM/yyyy', new Date());
    const docRef = doc(firestore, 'lossRecords', editingRecord.id);
    const updateData = {
        ...values,
        date: parsedDate,
        updatedAt: serverTimestamp()
    };

    updateDoc(docRef, updateData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    toast({ title: 'Sucesso', description: 'Perda atualizada.' });
    setEditingRecord(null);
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, coll, id);
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    toast({ title: 'Excluído', description: 'Registro removido.' });
  };

  const exportToExcel = (data: any[], name: string) => {
    const ws = XLSX.utils.json_to_sheet(data.map(r => {
        const rDate = getRecordDate(r.date);
        const rCreatedAt = getRecordDate(r.createdAt);
        return { 
            ...r, 
            date: rDate ? format(rDate, 'dd/MM/yyyy') : r.date,
            apontamento: rCreatedAt ? format(rCreatedAt, 'dd/MM HH:mm:ss') : '-'
        }
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${name}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registros de Produção</h1>
          <p className="text-muted-foreground">Controle diário de atividades e perdas de usinagem.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Nova Produção</CardTitle></CardHeader>
          <CardContent>
            <Form {...productionForm}>
              <form onSubmit={productionForm.handleSubmit(onProductionSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={productionForm.control} name="operatorId" render={({field}) => (
                    <FormItem><FormLabel>Operador</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
                  <FormField control={productionForm.control} name="date" render={({field}) => (
                    <FormItem><FormLabel>Data</FormLabel><FormControl><Input placeholder="dd/MM/yyyy" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={productionForm.control} name="factory" render={({field}) => (
                    <FormItem><FormLabel>Fábrica</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Fábrica" /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
                  <FormField control={productionForm.control} name="formsNumber" render={({field}) => (
                    <FormItem><FormLabel>Nº Forms</FormLabel><FormControl><Input placeholder="Ex: 815" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={productionForm.control} name="machine" render={({field}) => (
                        <FormItem><FormLabel>Máquina</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Escolha a Máquina" /></SelectTrigger></FormControl><SelectContent><SelectItem value="TORNO CNC CENTUR 30">TORNO CNC</SelectItem><SelectItem value="CENTRO DE USINAGEM D600">CENTRO</SelectItem></SelectContent></Select></FormItem>
                    )} />
                    <FormField control={productionForm.control} name="activityType" render={({field}) => (
                        <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Escolha o Tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="USINAGEM">USINAGEM</SelectItem><SelectItem value="PROGRAMACAO">PROGRAMAÇÃO</SelectItem><SelectItem value="PRIMEIRA PEÇA">PRIMEIRA PEÇA</SelectItem></SelectContent></Select></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={productionForm.control} name="quantityProduced" render={({field}) => (
                        <FormItem><FormLabel>Qtd Produzida</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={productionForm.control} name="machiningTime" render={({field}) => (
                        <FormItem><FormLabel>Tempo (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                </div>
                <FormField control={productionForm.control} name="observations" render={({field}) => (
                    <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Detalhes adicionais..." className="min-h-[80px]" {...field} /></FormControl></FormItem>
                )} />
                <IsolatedProductionTimer control={productionForm.control} setValue={productionForm.setValue} />
                <Button type="submit" className="w-full">Registrar Produção</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Registrar Perda</CardTitle></CardHeader>
          <CardContent>
            <Form {...lossForm}>
              <form onSubmit={lossForm.handleSubmit(onLossSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={lossForm.control} name="operatorId" render={({field}) => (
                    <FormItem><FormLabel>Operador</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
                  <FormField control={lossForm.control} name="date" render={({field}) => (
                    <FormItem><FormLabel>Data</FormLabel><FormControl><Input placeholder="dd/MM/yyyy" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={lossForm.control} name="lossReason" render={({field}) => (
                    <FormItem><FormLabel>Motivo da Parada</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o Motivo" /></SelectTrigger></FormControl><SelectContent>{lossReasonDetails.map(r => <SelectItem key={r.value} value={r.value}>{r.value}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={lossForm.control} name="timeLost" render={({field}) => (
                        <FormItem><FormLabel>Tempo Perdido (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={lossForm.control} name="factory" render={({field}) => (
                        <FormItem><FormLabel>Fábrica</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Fábrica" /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>
                    )} />
                </div>
                <FormField control={lossForm.control} name="machine" render={({field}) => (
                    <FormItem><FormLabel>Máquina</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Escolha a Máquina" /></SelectTrigger></FormControl><SelectContent><SelectItem value="TORNO CNC CENTUR 30">TORNO CNC</SelectItem><SelectItem value="CENTRO DE USINAGEM D600">CENTRO</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={lossForm.control} name="observations" render={({field}) => (
                    <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Descreva o motivo da parada..." className="min-h-[80px]" {...field} /></FormControl></FormItem>
                )} />
                <IsolatedLossTimer control={lossForm.control} setValue={lossForm.setValue} />
                <Button type="submit" variant="destructive" className="w-full">Registrar Perda</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editingRecord !== null} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>Altere as informações abaixo e salve para atualizar o banco de dados.</DialogDescription>
          </DialogHeader>
          {editingRecord?.type === 'production' && (
            <Form {...editProductionForm}>
              <form onSubmit={editProductionForm.handleSubmit(onUpdateProduction)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editProductionForm.control} name="operatorId" render={({field}) => (
                    <FormItem><FormLabel>Operador</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
                  <FormField control={editProductionForm.control} name="date" render={({field}) => (
                    <FormItem><FormLabel>Data</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editProductionForm.control} name="factory" render={({field}) => (
                    <FormItem><FormLabel>Fábrica</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
                  <FormField control={editProductionForm.control} name="formsNumber" render={({field}) => (
                    <FormItem><FormLabel>Nº Forms</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={editProductionForm.control} name="quantityProduced" render={({field}) => (
                        <FormItem><FormLabel>Qtd Produzida</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={editProductionForm.control} name="machiningTime" render={({field}) => (
                        <FormItem><FormLabel>Tempo (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                </div>
                <FormField control={editProductionForm.control} name="observations" render={({field}) => (
                    <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit">Salvar Alterações</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
          {editingRecord?.type === 'loss' && (
            <Form {...editLossForm}>
              <form onSubmit={editLossForm.handleSubmit(onUpdateLoss)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editLossForm.control} name="operatorId" render={({field}) => (
                    <FormItem><FormLabel>Operador</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
                  <FormField control={editLossForm.control} name="date" render={({field}) => (
                    <FormItem><FormLabel>Data</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={editLossForm.control} name="lossReason" render={({field}) => (
                    <FormItem><FormLabel>Motivo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{lossReasonDetails.map(r => <SelectItem key={r.value} value={r.value}>{r.value}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={editLossForm.control} name="timeLost" render={({field}) => (
                        <FormItem><FormLabel>Tempo (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={editLossForm.control} name="factory" render={({field}) => (
                        <FormItem><FormLabel>Fábrica</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>
                    )} />
                </div>
                <FormField control={editLossForm.control} name="observations" render={({field}) => (
                    <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit">Salvar Alterações</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-8 flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border shadow-sm">
        <div className="grid w-full sm:max-w-[180px] gap-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Categorias / Perdas</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-xs font-bold"><div className='flex items-center gap-2'><Filter className="h-3.5 w-3.5" /><SelectValue placeholder="Todas" /></div></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="PRODUCAO">Usinagem</SelectItem>{lossReasonDetails.map(r => <SelectItem key={r.value} value={r.value}>{r.value}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <div className="grid w-full sm:max-w-[150px] gap-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Nº Forms</Label>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9 h-9 text-xs" value={formsFilter} onChange={e => setFormsFilter(e.target.value)} placeholder="815..." /></div>
        </div>
        <div className="grid w-full sm:max-w-[120px] gap-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Mês</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="h-9 text-xs font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Mês Atual</SelectItem>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="grid w-full sm:max-w-[160px] gap-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Dia</Label>
            <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("h-9 text-xs font-bold justify-start", !selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-3.5 w-3.5" />{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Dia"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></PopoverContent></Popover>
        </div>
        <div className="grid w-full sm:max-w-[180px] gap-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Fábrica</Label>
            <Select value={selectedFactory} onValueChange={setSelectedFactory}><SelectTrigger className="h-9 text-xs font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as Fábricas</SelectItem>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="grid w-full sm:max-w-[180px] gap-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Técnico</Label>
            <Select value={selectedOperator} onValueChange={setSelectedOperator}><SelectTrigger className="h-9 text-xs font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os Técnicos</SelectItem>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select>
        </div>
        <Button variant="ghost" onClick={() => { setSelectedDate(undefined); setSelectedOperator('all'); setSelectedFactory('all'); setFormsFilter(''); setSelectedCategory('all'); setSelectedMonth('all'); }} className="h-9 text-xs text-destructive">Limpar</Button>
      </div>

      <div className="space-y-6">
          <ProductionHistoryTable 
            records={filteredProductionRecords}
            isRestricted={isRestrictedByPerformance}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExport={exportToExcel}
          />

          <LossHistoryTable 
            records={filteredLossRecords}
            isRestricted={isRestrictedByPerformance}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExport={exportToExcel}
          />
      </div>
    </div>
  );
}
