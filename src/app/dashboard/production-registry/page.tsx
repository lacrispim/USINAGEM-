'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Monitor, Smartphone, TrendingUp, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

const productionFormSchema = z.object({
  operatorId: z.string().min(1, 'ID do Operador é obrigatório.'),
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
  machine: z.string().optional(),
  lossReason: z.string().optional(),
  deadPartsQuantity: z.coerce.number().optional(),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;
type LossFormValues = z.infer<typeof lossFormSchema>;

export default function ProductionRegistryPage() {
  const { toast } = useToast();
  const formId = React.useId();

  const productionForm = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      operatorId: '',
      factory: '',
      formsNumber: '',
      activityType: '',
      machine: '',
      quantityProduced: 0,
      operationsNumber: '',
      machiningTime: 0,
    },
  });

  const lossForm = useForm<LossFormValues>({
    resolver: zodResolver(lossFormSchema),
    defaultValues: {
      operatorId: '',
      machine: '',
      lossReason: '',
      deadPartsQuantity: 0,
    },
  });

  function onProductionSubmit(values: ProductionFormValues) {
    console.log('Production Data:', values);
    toast({
      title: 'Produção Registrada',
      description: 'Os dados de produção foram salvos com sucesso.',
    });
    productionForm.reset();
  }

  function onLossSubmit(values: LossFormValues) {
    console.log('Loss Data:', values);
    toast({
      title: 'Perda Registrada',
      description: 'O registro de perda foi salvo com sucesso.',
      variant: 'destructive',
    });
    lossForm.reset();
  }

  const lossRecords = [
    {
      operator: 'Rodrigo Cantano',
      factory: 'Garanhuns',
      machine: 'Centro de Usinagem D600',
      reason: 'Baixa pressão, ar comprimido',
      deadParts: 0,
      timeLost: '00h 11m',
      dateTime: '12/12/2025, 14:35:53',
    },
    {
      operator: 'RODRIGO CANTANO',
      factory: 'Valinhos',
      machine: 'Torno CNC - Centur 30',
      reason: 'Troca de turno',
      deadParts: 0,
      timeLost: '00h 15m',
      dateTime: '12/12/2025, 14:11:25',
    },
  ];

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
                    id={`production-form-${formId}`}
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
                    <ProductionTimer title="Cronômetro de Produção" />
                    <Button type="submit" className="w-full">
                      Registrar Produção
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
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
                    id={`loss-form-${formId}`}
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
                    <ProductionTimer title="Cronômetro de Perda" />
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
                      <TableHead>Fábrica</TableHead>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Nº Forms</TableHead>
                      <TableHead>Nº Operações</TableHead>
                      <TableHead>Produzido</TableHead>
                      <TableHead>Tempo de Usinagem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data e Horário</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={11} className="text-center h-24">
                        Nenhum registro recente.
                      </TableCell>
                    </TableRow>
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
                      <TableHead>Fábrica</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Qtd. Peças Mortas</TableHead>
                      <TableHead>Tempo Perdido</TableHead>
                      <TableHead>Data e Horário</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lossRecords.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{record.operator}</TableCell>
                        <TableCell>{record.factory}</TableCell>
                        <TableCell>{record.machine}</TableCell>
                        <TableCell>
                          <Badge
                            className="bg-yellow-400 text-black hover:bg-yellow-500"
                          >
                            {record.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-red-500">
                          {record.deadParts}
                        </TableCell>
                        <TableCell>{record.timeLost}</TableCell>
                        <TableCell>{record.dateTime}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
