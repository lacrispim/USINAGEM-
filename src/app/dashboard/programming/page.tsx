'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Edit, Trash2, Save, XCircle, CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';


interface PlanoSemanal {
  id: string;
  dataExecucao: any; // Firestore timestamp
  site: string;
  requisicao: string;
  nomeDaPeca: string;
  quantidade: number;
  tecnico: string;
  observacao: string;
  equipamento: string;
  createdAt?: any;
}

const operatorList = [
    "Daniel Solivo",
    "Rodrigo Cantano",
    "Gustavo Gozzi",
    "William Martinucci"
];

const planoSemanalSchema = z.object({
  dataExecucao: z.date({ required_error: "A data de execução é obrigatória." }),
  site: z.string().min(1, "O site é obrigatório."),
  requisicao: z.string().min(1, "O número da requisição é obrigatório."),
  nomeDaPeca: z.string().min(1, "O nome da peça é obrigatório."),
  quantidade: z.coerce.number().optional(),
  tecnico: z.string().optional(),
  observacao: z.string().optional(),
  equipamento: z.string().optional(),
});

type PlanoSemanalFormValues = z.infer<typeof planoSemanalSchema>;

const AddPlanoForm = ({ onFinished }: { onFinished: () => void }) => {
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<PlanoSemanalFormValues>({
        resolver: zodResolver(planoSemanalSchema),
        defaultValues: {
            dataExecucao: new Date(),
            site: '',
            requisicao: '',
            nomeDaPeca: '',
            quantidade: 0,
            tecnico: '',
            observacao: '',
            equipamento: ''
        },
    });

    async function onSubmit(values: PlanoSemanalFormValues) {
        if (!firestore) return;
        try {
            await addDoc(collection(firestore, 'planoSemanal'), {
                ...values,
                createdAt: serverTimestamp(),
            });
            toast({
                title: 'Planejamento Adicionado',
                description: 'O novo item foi adicionado ao plano semanal.',
            });
            form.reset();
            onFinished();
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({
                title: 'Erro',
                description: 'Não foi possível salvar o item do plano.',
                variant: 'destructive',
            });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="dataExecucao"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Data de Execução</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP", { locale: ptBR })
                                            ) : (
                                                <span>Escolha uma data</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => date < new Date("1900-01-01")}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="site"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Site</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o site" />
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
                <FormField control={form.control} name="requisicao" render={({ field }) => (
                    <FormItem>
                        <FormLabel># Requisição</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="nomeDaPeca" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome da Peça</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="quantidade" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <FormField
                    control={form.control}
                    name="tecnico"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Técnicos</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o técnico" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="equipamento"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Equipamento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o equipamento" />
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
                <FormField control={form.control} name="observacao" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Observação</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Salvar</Button>
                </DialogFooter>
            </form>
        </Form>
    )
}


export default function ProgrammingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPlanoId, setEditingPlanoId] = useState<string | null>(null);
  const [editedPlano, setEditedPlano] = useState<any | null>(null);

  const planosQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'planoSemanal'), orderBy('dataExecucao', 'asc'))
        : null,
    [firestore]
  );

  const { data: planos, isLoading } = useCollection<PlanoSemanal>(planosQuery);

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'planoSemanal', id));
        toast({
            title: 'Item Excluído',
            description: 'O item do plano foi excluído com sucesso.',
        });
    } catch (error) {
        console.error("Error deleting document: ", error);
        toast({
            title: 'Erro',
            description: 'Não foi possível excluir o item do plano.',
            variant: 'destructive',
        });
    }
  };
  
  const handleEdit = (plano: PlanoSemanal) => {
    setEditingPlanoId(plano.id);
    const date = plano.dataExecucao?.toDate ? format(plano.dataExecucao.toDate(), 'yyyy-MM-dd') : '';
    setEditedPlano({ ...plano, dataExecucao: date });
  };
  
  const handleCancelEdit = () => {
    setEditingPlanoId(null);
    setEditedPlano(null);
  };
  
  const handleSaveEdit = async () => {
    if (!firestore || !editedPlano) return;
    const { id, createdAt, ...dataToSave } = editedPlano;
    
    if (typeof dataToSave.dataExecucao === 'string') {
        dataToSave.dataExecucao = new Date(dataToSave.dataExecucao + 'T00:00:00');
    }

    const planoRef = doc(firestore, 'planoSemanal', id);
    try {
      await updateDoc(planoRef, dataToSave);
      toast({
        title: 'Item Atualizado',
        description: 'O item do plano foi atualizado com sucesso.',
      });
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating document: ', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o item do plano.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedPlano({ ...editedPlano, [name]: value });
  };
  
  const handleSelectChange = (name: string, value: string) => {
      setEditedPlano({ ...editedPlano, [name]: value });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Plano Semanal</h1>
            <p className="text-muted-foreground">
            Visualize e gerencie o planejamento de produção.
            </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Item
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Item ao Plano</DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes da nova tarefa de produção.
                    </DialogDescription>
                </DialogHeader>
                <AddPlanoForm onFinished={() => setIsAddDialogOpen(false)} />
            </DialogContent>
        </Dialog>

      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planejamento de Produção</CardTitle>
          <CardDescription>
            Lista de todas as tarefas de produção agendadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Execução</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead># Requisição</TableHead>
                  <TableHead>Nome da Peça</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Técnicos</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Carregando planejamento...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !planos || planos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Nenhum item de planejamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  planos.map((plano) => (
                    <TableRow key={plano.id}>
                      {editingPlanoId === plano.id ? (
                        <>
                           <TableCell><Input type="date" name="dataExecucao" value={editedPlano.dataExecucao} onChange={handleInputChange} /></TableCell>
                           <TableCell>
                                <Select value={editedPlano.site} onValueChange={(value) => handleSelectChange('site', value)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
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
                           <TableCell><Input name="requisicao" value={editedPlano.requisicao} onChange={handleInputChange} /></TableCell>
                           <TableCell><Input name="nomeDaPeca" value={editedPlano.nomeDaPeca} onChange={handleInputChange} /></TableCell>
                           <TableCell><Input type="number" name="quantidade" value={editedPlano.quantidade} onChange={handleInputChange} /></TableCell>
                           <TableCell>
                                <Select value={editedPlano.tecnico} onValueChange={(value) => handleSelectChange('tecnico', value)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                           </TableCell>
                           <TableCell><Textarea name="observacao" value={editedPlano.observacao} onChange={handleInputChange} /></TableCell>
                            <TableCell>
                                <Select value={editedPlano.equipamento} onValueChange={(value) => handleSelectChange('equipamento', value)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TORNO CNC CENTUR 30">TORNO CNC CENTUR 30</SelectItem>
                                        <SelectItem value="CENTRO DE USINAGEM D600">CENTRO DE USINAGEM D600</SelectItem>
                                    </SelectContent>
                                </Select>
                           </TableCell>
                           <TableCell className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={handleSaveEdit}><Save className="h-4 w-4 text-green-500" /></Button>
                                <Button variant="ghost" size="icon" onClick={handleCancelEdit}><XCircle className="h-4 w-4 text-red-500" /></Button>
                           </TableCell>
                        </>
                      ) : (
                        <>
                            <TableCell>
                                {plano.dataExecucao?.toDate ? format(plano.dataExecucao.toDate(), 'dd/MM/yyyy') : ''}
                            </TableCell>
                            <TableCell>{plano.site}</TableCell>
                            <TableCell>{plano.requisicao}</TableCell>
                            <TableCell className="font-medium">{plano.nomeDaPeca}</TableCell>
                            <TableCell>{plano.quantidade}</TableCell>
                            <TableCell>{plano.tecnico}</TableCell>
                            <TableCell>{plano.observacao}</TableCell>
                            <TableCell>{plano.equipamento}</TableCell>
                            <TableCell className='flex gap-2'>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(plano)}><Edit className="h-4 w-4 text-blue-500" /></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o item do plano.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(plano.id)}>Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
