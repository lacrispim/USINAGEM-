'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
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
import { CalendarIcon, Monitor, Smartphone, TrendingUp, Trash2, Edit, Save, XCircle, FileSpreadsheet } from 'lucide-react';
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
import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, orderBy, query, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const productionFormSchema = z.object({
  operatorId: z.string().min(1, 'ID do Operador é obrigatório.'),
  date: z.string().min(1, 'A data da produção é obrigatória.'),
  factory: z.string().optional(),
  formsNumber: z.string().optional(),
  activityType: z.string().optional(),
  machine: z.string().optional(),
  quantityProduced: z.coerce.number().optional(),
  operationsNumber: z.string().optional(),
  machiningTime: z.coerce.number().optional(),
  status: z.string().optional(),
  observations: z.string().optional(),
  material: z.string().optional(),
  rawMaterialDimensions: z.string().optional(),
  geometryComplexity: z.string().optional(),
  toolCount: z.coerce.number().optional(),
  fixtureType: z.string().optional(),
});

const lossFormSchema = z.object({
  operatorId: z.string().min(1, 'ID do Operador é obrigatório.'),
  date: z.string().min(1, 'A data da perda é obrigatória.'),
  machine: z.string().optional(),
  lossReason: z.string().optional(),
  deadPartsQuantity: z.coerce.number().optional(),
  factory: z.string().optional(),
  timeLost: z.coerce.number().optional(),
  observations: z.string().optional(),
  formsNumber: z.string().optional(),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;
type LossFormValues = z.infer<typeof lossFormSchema>;

const ProductionFormContent = () => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isClient, setIsClient] = useState(false);

    const productionForm = useForm<ProductionFormValues>({
        resolver: zodResolver(productionFormSchema),
        defaultValues: {
            operatorId: '',
            date: '',
            factory: '',
            formsNumber: '',
            activityType: '',
            machine: '',
            quantityProduced: 0,
            operationsNumber: '',
            machiningTime: 0,
            status: 'Em produção',
            observations: '',
            material: '',
            rawMaterialDimensions: '',
            geometryComplexity: '',
            toolCount: 0,
            fixtureType: '',
        },
    });

     useEffect(() => {
        setIsClient(true);
        if (isClient) {
            productionForm.reset({
                ...productionForm.getValues(),
                date: format(new Date(), 'dd/MM/yyyy'),
            });
        }
    }, [isClient, productionForm]);

    const machiningTime = useWatch({
        control: productionForm.control,
        name: 'machiningTime',
    });
    
    const selectedMachine = useWatch({
        control: productionForm.control,
        name: 'machine',
    });


    async function onProductionSubmit(values: ProductionFormValues) {
        if (!firestore) return;
        try {
        const date = parse(values.date, 'dd/MM/yyyy', new Date());
        await addDoc(collection(firestore, 'productionRecords'), {
            ...values,
            date,
            createdAt: serverTimestamp(),
        });
        toast({
            title: 'Produção Registrada',
            description: 'Os dados de produção foram salvos com sucesso.',
        });
        productionForm.reset({
             operatorId: '',
            date: format(new Date(), 'dd/MM/yyyy'),
            factory: '',
            formsNumber: '',
            activityType: '',
            machine: '',
            quantityProduced: 0,
            operationsNumber: '',
            machiningTime: 0,
            status: 'Em produção',
            observations: '',
            material: '',
            rawMaterialDimensions: '',
            geometryComplexity: '',
            toolCount: 0,
            fixtureType: '',
        });
        } catch (error) {
        console.error('Error adding production record: ', error);
        toast({
            title: 'Erro',
            description: 'Não foi possível salvar o registro de produção.',
            variant: 'destructive',
        });
        }
    }
    
    if (!isClient) {
        return null; 
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registro de Produção</CardTitle>
                <CardDescription>
                Insira os dados de produção da sua atividade.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...productionForm}>
                <form
                    onSubmit={productionForm.handleSubmit(onProductionSubmit)}
                    className="space-y-4"
                >
                    <FormField
                      control={productionForm.control}
                      name="operatorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do Operador</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o operador" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Daniel Solivo">Daniel Solivo</SelectItem>
                              <SelectItem value="Rodrigo Cantano">Rodrigo Cantano</SelectItem>
                              <SelectItem value="Gustavo Gozzi">Gustavo Gozzi</SelectItem>
                              <SelectItem value="William Martinucci">William Martinucci</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productionForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Produção</FormLabel>
                          <FormControl>
                            <Input placeholder="dd/MM/yyyy" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                    control={productionForm.control}
                    name="factory"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Fábrica</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a fábrica" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="VALINHOS DOVE">VALINHOS DOVE</SelectItem>
                                <SelectItem value="VALINHOS SABONETE">VALINHOS SABONETE</SelectItem>
                                <SelectItem value="VINHEDO">VINHEDO</SelectItem>
                                <SelectItem value="POUSO ALEGRE">POUSO ALEGRE</SelectItem>
                                <SelectItem value="INDAIATUBA">INDAIATUBA</SelectItem>
                                <SelectItem value="AGUAÍ">AGUAÍ</SelectItem>
                                <SelectItem value="SUAPE">SUAPE</SelectItem>
                                <SelectItem value="IGARASSU">IGARASSU</SelectItem>
                                <SelectItem value="GARANHUS">GARANHUS</SelectItem>
                                <SelectItem value="TORRE">TORRE</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                        control={productionForm.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Fila de produção">
                                    Fila de produção
                                </SelectItem>
                                <SelectItem value="Em produção">
                                    Em produção
                                </SelectItem>
                                <SelectItem value="Encerrado">
                                    Encerrado
                                </SelectItem>
                                 <SelectItem value="Rejeitado">
                                    Rejeitado
                                </SelectItem>
                                 <SelectItem value="Enviado">
                                    Enviado
                                </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                    control={productionForm.control}
                    name="formsNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número do forms</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: F-1024" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={productionForm.control}
                    name="activityType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo de Atividade</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="usinagem">USINAGEM</SelectItem>
                            <SelectItem value="programacao">
                                PROGRAMAÇÃO
                            </SelectItem>
                            <SelectItem value="primeira-peca">
                                PRIMEIRA PEÇA
                            </SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={productionForm.control}
                    name="machine"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Máquina</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a máquina" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="TORNO CNC CENTUR 30">
                                TORNO CNC CENTUR 30
                              </SelectItem>
                              <SelectItem value="CENTRO DE USINAGEM D600">
                                CENTRO DE USINAGEM D600
                              </SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={productionForm.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material da Peça</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Aço 1045, Alumínio 6061" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productionForm.control}
                      name="rawMaterialDimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensões do Bruto</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: D:100mm L:200mm ou 100x50x30mm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={productionForm.control}
                      name="geometryComplexity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complexidade da Geometria</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a complexidade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Baixa">Baixa</SelectItem>
                              <SelectItem value="Média">Média</SelectItem>
                              <SelectItem value="Alta">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedMachine === 'CENTRO DE USINAGEM D600' && (
                        <>
                            <FormField
                            control={productionForm.control}
                            name="toolCount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Número de Ferramentas Distintas</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={productionForm.control}
                            name="fixtureType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tipo de Fixação</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Morsa, Dispositivo" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </>
                    )}
                    <FormField
                    control={productionForm.control}
                    name="quantityProduced"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantidade Produzida</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={productionForm.control}
                    name="operationsNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número de Operações</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: 5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={productionForm.control}
                    name="machiningTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tempo de Usinagem (minutos)</FormLabel>
                        <FormControl>
                            <Input type="number" value={field.value || ''} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                      control={productionForm.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Adicione qualquer observação relevante"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <ProductionTimer
                        title="Cronômetro de Produção"
                        initialTimeInMinutes={machiningTime || 0}
                        onTimeChange={(time) => {
                            requestAnimationFrame(() => {
                                productionForm.setValue('machiningTime', time)
                            });
                        }}
                    />
                    <Button type="submit" className="w-full">
                    Registrar Produção
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
    );
};

const LossFormContent = () => {
    const { toast } = useToast();
    const firestore = useFirestore();
     const [isClient, setIsClient] = useState(false);

    const lossForm = useForm<LossFormValues>({
        resolver: zodResolver(lossFormSchema),
        defaultValues: {
            operatorId: '',
            date: '',
            machine: '',
            lossReason: '',
            deadPartsQuantity: 0,
            factory: '',
            timeLost: 0,
            observations: '',
            formsNumber: '',
        },
    });

     useEffect(() => {
        setIsClient(true);
        if (isClient) {
            lossForm.reset({
                ...lossForm.getValues(),
                date: format(new Date(), 'dd/MM/yyyy'),
            });
        }
    }, [isClient, lossForm]);

    const timeLost = useWatch({
        control: lossForm.control,
        name: 'timeLost',
    });

    async function onLossSubmit(values: LossFormValues) {
        if (!firestore) return;
        try {
        const date = parse(values.date, 'dd/MM/yyyy', new Date());
        await addDoc(collection(firestore, 'lossRecords'), {
            ...values,
            date,
            createdAt: serverTimestamp(),
        });
        toast({
            title: 'Perda Registrada',
            description: 'O registro de perda foi salvo com sucesso.',
        });
        lossForm.reset({
             operatorId: '',
            date: format(new Date(), 'dd/MM/yyyy'),
            machine: '',
            lossReason: '',
            deadPartsQuantity: 0,
            factory: '',
            timeLost: 0,
            observations: '',
            formsNumber: '',
        });
        } catch (error) {
        console.error('Error adding loss record: ', error);
        toast({
            title: 'Erro',
            description: 'Não foi possível salvar o registro de perda.',
            variant: 'destructive',
        });
        }
    }
    
    if (!isClient) {
        return null;
    }


    return (
        <Card>
              <CardHeader>
                <CardTitle>Registro de Perda</CardTitle>
                <CardDescription>
                  Registre peças perdidas e o tempo de inatividade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...lossForm}>
                  <form
                    onSubmit={lossForm.handleSubmit(onLossSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={lossForm.control}
                      name="operatorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do Operador</FormLabel>
                           <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o operador" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Daniel Solivo">Daniel Solivo</SelectItem>
                              <SelectItem value="Rodrigo Cantano">Rodrigo Cantano</SelectItem>
                              <SelectItem value="Gustavo Gozzi">Gustavo Gozzi</SelectItem>
                              <SelectItem value="William Martinucci">William Martinucci</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={lossForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Perda</FormLabel>
                          <FormControl>
                            <Input placeholder="dd/MM/yyyy" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={lossForm.control}
                      name="factory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fábrica</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a fábrica" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="VALINHOS DOVE">VALINHOS DOVE</SelectItem>
                                <SelectItem value="VALINHOS SABONETE">VALINHOS SABONETE</SelectItem>
                                <SelectItem value="VINHEDO">VINHEDO</SelectItem>
                                <SelectItem value="POUSO ALEGRE">POUSO ALEGRE</SelectItem>
                                <SelectItem value="INDAIATUBA">INDAIATUBA</SelectItem>
                                <SelectItem value="AGUAÍ">AGUAÍ</SelectItem>
                                <SelectItem value="SUAPE">SUAPE</SelectItem>
                                <SelectItem value="IGARASSU">IGARASSU</SelectItem>
                                <SelectItem value="GARANHUS">GARANHUS</SelectItem>
                                <SelectItem value="TORRE">TORRE</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                        control={lossForm.control}
                        name="formsNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Número do forms</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: F-1024" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                      control={lossForm.control}
                      name="machine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máquina</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a máquina" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                               <SelectItem value="TORNO CNC CENTUR 30">
                                TORNO CNC CENTUR 30
                              </SelectItem>
                              <SelectItem value="CENTRO DE USINAGEM D600">
                                CENTRO DE USINAGEM D600
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={lossForm.control}
                      name="lossReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo da Perda</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva o motivo da perda"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={lossForm.control}
                      name="deadPartsQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Peças Mortas</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={lossForm.control}
                      name="timeLost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo Perdido (minutos)</FormLabel>
                          <FormControl>
                             <Input type="number" value={field.value || ''} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={lossForm.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Adicione qualquer observação relevante"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <ProductionTimer 
                        title="Cronômetro de Perda"
                        initialTimeInMinutes={timeLost || 0}
                        onTimeChange={(time) => {
                            requestAnimationFrame(() => {
                                lossForm.setValue('timeLost', time)
                            });
                        }}
                     />
                    <Button
                      type="submit"
                      variant="destructive"
                      className="w-full"
                    >
                      Registrar Perda
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
    );
}

const statusColorMap: { [key: string]: string } = {
    'Fila de produção': 'bg-gray-500',
    'Em produção': 'bg-yellow-500 text-black',
    'Encerrado': 'bg-green-500',
    'Rejeitado': 'bg-red-500',
    'Enviado': 'bg-blue-500',
};


export default function ProductionRegistryPage() {
  const firestore = useFirestore();

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editedRecord, setEditedRecord] = useState<any | null>(null);


  const productionRecordsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'productionRecords'), orderBy('createdAt', 'desc'), limit(10)) : null
  , [firestore]);
  const { data: productionRecords, loading: loadingProduction } = useCollection(productionRecordsQuery);
  
  const lossRecordsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'lossRecords'), orderBy('createdAt', 'desc'), limit(10)) : null
  , [firestore]);
  const { data: lossRecords, loading: loadingLoss } = useCollection(lossRecordsQuery);

  const handleDelete = async (collectionName: string, id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, collectionName, id));
      toast({
        title: 'Registro Excluído',
        description: 'O registro foi excluído com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting record: ', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!firestore) return;
    const recordRef = doc(firestore, 'productionRecords', id);
    try {
      await updateDoc(recordRef, { status: newStatus });
      toast({
        title: 'Status Atualizado',
        description: `O status do registro foi alterado para ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating status: ', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (record: any) => {
    setEditingRecordId(record.id);
    setEditedRecord({ ...record, date: record.date?.toDate ? format(record.date.toDate(), 'dd/MM/yyyy') : record.date });
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditedRecord(null);
  };

  const handleSaveEdit = async () => {
    if (!firestore || !editedRecord) return;
    const { id, createdAt, ...dataToSave } = editedRecord;
    // The 'date' is a string 'dd/MM/yyyy', it needs to be converted to a Date object for Firestore
    if (typeof dataToSave.date === 'string') {
        try {
            dataToSave.date = parse(dataToSave.date, 'dd/MM/yyyy', new Date());
        } catch (error) {
            console.error("Error parsing date:", error);
            toast({
                title: 'Erro de Data',
                description: 'O formato da data é inválido. Use dd/MM/yyyy.',
                variant: 'destructive',
            });
            return;
        }
    }
    const recordRef = doc(firestore, 'productionRecords', id);
    try {
      await updateDoc(recordRef, dataToSave);
      toast({
        title: 'Registro Atualizado',
        description: 'O registro de produção foi atualizado com sucesso.',
      });
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating record: ', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o registro.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedRecord({ ...editedRecord, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditedRecord({ ...editedRecord, [name]: value });
  };

  const { toast } = useToast();

  const exportToExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'A tabela está vazia.',
        variant: 'destructive'
      });
      return;
    }
    const formattedData = data.map(record => ({
      ...record,
      date: record.date?.toDate ? format(record.date.toDate(), 'dd/MM/yyyy') : record.date,
      createdAt: record.createdAt?.toDate ? format(record.createdAt.toDate(), 'dd/MM/yyyy HH:mm:ss') : record.createdAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Registro de Produção
        </h1>
        <p className="text-muted-foreground">
          Monitore a produção, registre novas atividades e perdas.
        </p>
      </div>

      <div>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProductionFormContent />
            <LossFormContent />
          </div>
          <div className="mt-8 space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Registros de Produção Recentes</CardTitle>
                        <CardDescription>
                        Últimas 10 entradas de produção bem-sucedida.
                        </CardDescription>
                    </div>
                    <Button onClick={() => exportToExcel(productionRecords, 'Registros_Producao')}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Exportar para Excel
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operador</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Fábrica</TableHead>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Nº Forms</TableHead>
                      <TableHead>Nº Operações</TableHead>
                      <TableHead>Produzido</TableHead>
                      <TableHead>Tempo de Usinagem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead>Registrado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProduction ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center h-24">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : productionRecords && productionRecords.length > 0 ? (
                      productionRecords.map((record: any) => (
                        <TableRow key={record.id}>
                          {editingRecordId === record.id ? (
                            <>
                              <TableCell>
                                <Select value={editedRecord.operatorId} onValueChange={(value) => handleSelectChange('operatorId', value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Daniel Solivo">Daniel Solivo</SelectItem>
                                    <SelectItem value="Rodrigo Cantano">Rodrigo Cantano</SelectItem>
                                    <SelectItem value="Gustavo Gozzi">Gustavo Gozzi</SelectItem>
                                    <SelectItem value="William Martinucci">William Martinucci</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                               <TableCell>
                                <Input name="date" value={editedRecord.date} onChange={handleInputChange} />
                              </TableCell>
                              <TableCell>
                                <Select value={editedRecord.factory} onValueChange={(value) => handleSelectChange('factory', value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="VALINHOS DOVE">VALINHOS DOVE</SelectItem>
                                    <SelectItem value="VALINHOS SABONETE">VALINHOS SABONETE</SelectItem>
                                    <SelectItem value="VINHEDO">VINHEDO</SelectItem>
                                    <SelectItem value="POUSO ALEGRE">POUSO ALEGRE</SelectItem>
                                    <SelectItem value="INDAIATUBA">INDAIATUBA</SelectItem>
                                    <SelectItem value="AGUAÍ">AGUAÍ</SelectItem>
                                    <SelectItem value="SUAPE">SUAPE</SelectItem>
                                    <SelectItem value="IGARASSU">IGARASSU</SelectItem>
                                    <SelectItem value="GARANHUS">GARANHUS</SelectItem>
                                    <SelectItem value="TORRE">TORRE</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select value={editedRecord.activityType} onValueChange={(value) => handleSelectChange('activityType', value)}>
                                   <SelectTrigger><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="usinagem">USINAGEM</SelectItem>
                                      <SelectItem value="programacao">PROGRAMAÇÃO</SelectItem>
                                      <SelectItem value="primeira-peca">PRIMEIRA PEÇA</SelectItem>
                                   </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select value={editedRecord.machine} onValueChange={(value) => handleSelectChange('machine', value)}>
                                     <SelectTrigger><SelectValue /></SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="TORNO CNC CENTUR 30">TORNO CNC CENTUR 30</SelectItem>
                                        <SelectItem value="CENTRO DE USINAGEM D600">CENTRO DE USINAGEM D600</SelectItem>
                                     </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell><Input name="formsNumber" value={editedRecord.formsNumber} onChange={handleInputChange} /></TableCell>
                              <TableCell><Input name="operationsNumber" value={editedRecord.operationsNumber} onChange={handleInputChange} /></TableCell>
                              <TableCell><Input type="number" name="quantityProduced" value={editedRecord.quantityProduced} onChange={handleInputChange} /></TableCell>
                              <TableCell><Input type="number" name="machiningTime" value={editedRecord.machiningTime} onChange={handleInputChange} /></TableCell>
                              <TableCell>
                                 <Select value={editedRecord.status} onValueChange={(value) => handleSelectChange('status', value)}>
                                    <SelectTrigger className={cn("w-[180px] text-white", statusColorMap[editedRecord.status])}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Fila de produção">Fila de produção</SelectItem>
                                        <SelectItem value="Em produção">Em produção</SelectItem>
                                        <SelectItem value="Encerrado">Encerrado</SelectItem>
                                        <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                                        <SelectItem value="Enviado">Enviado</SelectItem>
                                    </SelectContent>
                                  </Select>
                              </TableCell>
                              <TableCell><Textarea name="observations" value={editedRecord.observations} onChange={handleInputChange} /></TableCell>
                              <TableCell>{record.createdAt ? format(record.createdAt.toDate(), 'dd/MM/yyyy, HH:mm:ss') : ''}</TableCell>
                              <TableCell className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={handleSaveEdit}>
                                  <Save className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{record.operatorId}</TableCell>
                              <TableCell>{record.date?.toDate ? format(record.date.toDate(), 'dd/MM/yyyy') : record.date}</TableCell>
                              <TableCell>{record.factory}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{record.activityType}</Badge>
                              </TableCell>
                              <TableCell>{record.machine}</TableCell>
                              <TableCell>{record.formsNumber}</TableCell>
                              <TableCell>{record.operationsNumber}</TableCell>
                              <TableCell>{record.quantityProduced}</TableCell>
                              <TableCell>{record.machiningTime} min</TableCell>
                               <TableCell>
                                    <Select
                                    value={record.status}
                                    onValueChange={(newStatus) =>
                                        handleStatusChange(record.id, newStatus)
                                    }
                                    >
                                    <SelectTrigger className={cn("w-[180px] text-white", statusColorMap[record.status])}>
                                        <SelectValue placeholder="Selecione um status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Fila de produção">
                                        Fila de produção
                                        </SelectItem>
                                        <SelectItem value="Em produção">
                                        Em produção
                                        </SelectItem>
                                        <SelectItem value="Encerrado">Encerrado</SelectItem>
                                        <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                                        <SelectItem value="Enviado">Enviado</SelectItem>
                                    </SelectContent>
                                    </Select>
                              </TableCell>
                              <TableCell>{record.observations}</TableCell>
                              <TableCell>
                                {record.createdAt ? format(record.createdAt.toDate(), 'dd/MM/yyyy, HH:mm:ss') : ''}
                              </TableCell>
                              <TableCell className='flex gap-2'>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o registro de produção.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete('productionRecords', record.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center h-24">
                          Nenhum registro recente.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
               <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Registros de Perdas Recentes</CardTitle>
                        <CardDescription>
                        Últimas 10 entradas de perdas de produção.
                        </CardDescription>
                    </div>
                    <Button onClick={() => exportToExcel(lossRecords, 'Registros_Perdas')}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Exportar para Excel
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operador</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Fábrica</TableHead>
                      <TableHead>Nº Forms</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Qtd. Peças Mortas</TableHead>
                      <TableHead>Tempo Perdido</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead>Registrado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLoss ? (
                       <TableRow>
                        <TableCell colSpan={11} className="text-center h-24">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : lossRecords && lossRecords.length > 0 ? (
                      lossRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.operatorId}</TableCell>
                        <TableCell>{record.date?.toDate ? format(record.date.toDate(), 'dd/MM/yyyy') : record.date}</TableCell>
                        <TableCell>{record.factory}</TableCell>
                        <TableCell>{record.formsNumber}</TableCell>
                        <TableCell>{record.machine}</TableCell>
                        <TableCell>
                          <Badge
                            className="bg-yellow-400 text-black hover:bg-yellow-500"
                          >
                            {record.lossReason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-red-500">
                          {record.deadPartsQuantity}
                        </TableCell>
                        <TableCell>{record.timeLost}</TableCell>
                        <TableCell>{record.observations}</TableCell>
                        <TableCell>
                           {record.createdAt ? format(record.createdAt.toDate(), 'dd/MM/yyyy, HH:mm:ss') : ''}
                        </TableCell>
                        <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o registro de perda.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete('lossRecords', record.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center h-24">
                           Nenhum registro de perda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
}
