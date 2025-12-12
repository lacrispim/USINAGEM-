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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Monitor, Smartphone, TrendingUp, Trash2 } from 'lucide-react';
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
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection } from '@/firebase';
import { addDoc, collection, serverTimestamp, orderBy, query, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const productionFormSchema = z.object({
  operatorId: z.string().min(1, 'ID do Operador é obrigatório.'),
  date: z.date({
    required_error: 'A data da produção é obrigatória.',
  }),
  factory: z.string().optional(),
  formsNumber: z.string().optional(),
  activityType: z.string().optional(),
  machine: z.string().optional(),
  quantityProduced: z.coerce.number().optional(),
  operationsNumber: z.string().optional(),
  machiningTime: z.coerce.number().optional(),
});

const lossFormSchema = z.object({
  operatorId: z.string().min(1, 'ID do Operador é obrigatório.'),
  date: z.date({
    required_error: 'A data da perda é obrigatória.',
  }),
  machine: z.string().optional(),
  lossReason: z.string().optional(),
  deadPartsQuantity: z.coerce.number().optional(),
  factory: z.string().optional(),
  timeLost: z.coerce.number().optional(),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;
type LossFormValues = z.infer<typeof lossFormSchema>;

const ProductionFormContent = () => {
    const { toast } = useToast();
    const firestore = useFirestore();

    const productionForm = useForm<ProductionFormValues>({
        resolver: zodResolver(productionFormSchema),
        defaultValues: {
            operatorId: '',
            date: new Date(),
            factory: '',
            formsNumber: '',
            activityType: '',
            machine: '',
            quantityProduced: 0,
            operationsNumber: '',
            machiningTime: 0,
        },
    });

    const machiningTime = useWatch({
        control: productionForm.control,
        name: 'machiningTime',
    });

    async function onProductionSubmit(values: ProductionFormValues) {
        if (!firestore) return;
        try {
        await addDoc(collection(firestore, 'productionRecords'), {
            ...values,
            createdAt: serverTimestamp(),
        });
        toast({
            title: 'Produção Registrada',
            description: 'Os dados de produção foram salvos com sucesso.',
        });
        productionForm.reset();
        } catch (error) {
        console.error('Error adding production record: ', error);
        toast({
            title: 'Erro',
            description: 'Não foi possível salvar o registro de produção.',
            variant: 'destructive',
        });
        }
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
                        <FormControl>
                            <Input placeholder="Ex: OP-001" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={productionForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data da Produção</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
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
                                disabled={(date) =>
                                  date > new Date() || date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                            <SelectItem value="factory-1">
                                Fábrica 1
                            </SelectItem>
                            <SelectItem value="factory-2">
                                Fábrica 2
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
                            <SelectItem value="machine-1">
                                Máquina 1
                            </SelectItem>
                            <SelectItem value="machine-2">
                                Máquina 2
                            </SelectItem>
                            <SelectItem value="machine-3">
                                Máquina 3
                            </SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
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
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <ProductionTimer
                        title="Cronômetro de Produção"
                        initialTimeInMinutes={machiningTime || 0}
                        onTimeChange={(time) => productionForm.setValue('machiningTime', time)}
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

    const lossForm = useForm<LossFormValues>({
        resolver: zodResolver(lossFormSchema),
        defaultValues: {
            operatorId: '',
            date: new Date(),
            machine: '',
            lossReason: '',
            deadPartsQuantity: 0,
            factory: '',
            timeLost: 0,
        },
    });

    const timeLost = useWatch({
        control: lossForm.control,
        name: 'timeLost',
    });

    async function onLossSubmit(values: LossFormValues) {
        if (!firestore) return;
        try {
        await addDoc(collection(firestore, 'lossRecords'), {
            ...values,
            createdAt: serverTimestamp(),
        });
        toast({
            title: 'Perda Registrada',
            description: 'O registro de perda foi salvo com sucesso.',
        });
        lossForm.reset();
        } catch (error) {
        console.error('Error adding loss record: ', error);
        toast({
            title: 'Erro',
            description: 'Não foi possível salvar o registro de perda.',
            variant: 'destructive',
        });
        }
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
                          <FormControl>
                            <Input placeholder="Ex: OP-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={lossForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data da Perda</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
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
                                disabled={(date) =>
                                  date > new Date() || date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                              <SelectItem value="Garanhuns">
                                Garanhuns
                              </SelectItem>
                              <SelectItem value="Valinhos">
                                Valinhos
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
                               <SelectItem value="Centro de Usinagem D600">
                                Centro de Usinagem D600
                              </SelectItem>
                              <SelectItem value="Torno CNC - Centur 30">
                                Torno CNC - Centur 30
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
                             <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <ProductionTimer 
                        title="Cronômetro de Perda"
                        initialTimeInMinutes={timeLost || 0}
                        onTimeChange={(time) => lossForm.setValue('timeLost', time)}
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

export default function ProductionRegistryPage() {
  const firestore = useFirestore();

  const productionRecordsQuery = firestore ? query(collection(firestore, 'productionRecords'), orderBy('createdAt', 'desc'), limit(10)) : null;
  const { data: productionRecords, loading: loadingProduction } = useCollection(productionRecordsQuery);
  
  const lossRecordsQuery = firestore ? query(collection(firestore, 'lossRecords'), orderBy('createdAt', 'desc'), limit(10)) : null;
  const { data: lossRecords, loading: loadingLoss } = useCollection(lossRecordsQuery);

  const formId = React.useId(); // Keep for potential unique IDs if needed elsewhere

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

      <Tabs defaultValue="operator-mode" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="supervisor-view">
            <Monitor className="mr-2 h-4 w-4" />
            Visão Supervisor
          </TabsTrigger>
          <TabsTrigger value="operator-mode">
            <Smartphone className="mr-2 h-4 w-4" />
            Modo Operador
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <TrendingUp className="mr-2 h-4 w-4" />
            Otimização
          </TabsTrigger>
        </TabsList>
        <TabsContent value="operator-mode">
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProductionFormContent />
            <LossFormContent />
          </div>
          <div className="mt-8 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Registros de Produção Recentes</CardTitle>
                <CardDescription>
                  Últimas 10 entradas de produção bem-sucedida.
                </CardDescription>
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
                      <TableHead>Registrado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProduction ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center h-24">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : productionRecords && productionRecords.length > 0 ? (
                      productionRecords.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.operatorId}</TableCell>
                          <TableCell>{record.date ? format(record.date.toDate(), 'dd/MM/yyyy') : ''}</TableCell>
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
                            <Badge>Concluído</Badge>
                          </TableCell>
                          <TableCell>
                            {record.createdAt ? format(record.createdAt.toDate(), 'dd/MM/yyyy, HH:mm:ss') : ''}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center h-24">
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
                <CardTitle>Registros de Perdas Recentes</CardTitle>
                <CardDescription>
                  Últimas 10 entradas de perdas de produção.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operador</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Fábrica</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Qtd. Peças Mortas</TableHead>
                      <TableHead>Tempo Perdido</TableHead>
                      <TableHead>Registrado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLoss ? (
                       <TableRow>
                        <TableCell colSpan={9} className="text-center h-24">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : lossRecords && lossRecords.length > 0 ? (
                      lossRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.operatorId}</TableCell>
                        <TableCell>{record.date ? format(record.date.toDate(), 'dd/MM/yyyy') : ''}</TableCell>
                        <TableCell>{record.factory}</TableCell>
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
                        <TableCell>
                           {record.createdAt ? format(record.createdAt.toDate(), 'dd/MM/yyyy, HH:mm:ss') : ''}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center h-24">
                           Nenhum registro de perda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
