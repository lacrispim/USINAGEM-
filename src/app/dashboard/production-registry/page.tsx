'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import { ProductionTimer } from '@/components/dashboard/production-timer';

export default function ProductionRegistryPage() {
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

      <Tabs defaultValue="operator-mode">
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
      </Tabs>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registro de Produção</CardTitle>
            <CardDescription>
              Insira os dados de produção da sua atividade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="operator-id-prod">ID do Operador</Label>
                <Input id="operator-id-prod" placeholder="Ex: OP-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="factory">Fábrica</Label>
                <Select>
                  <SelectTrigger id="factory">
                    <SelectValue placeholder="Selecione a fábrica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factory-1">Fábrica 1</SelectItem>
                    <SelectItem value="factory-2">Fábrica 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forms-number">Número do forms</Label>
                <Input id="forms-number" placeholder="Ex: F-1024" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-type">Tipo de Atividade</Label>
                <Select>
                  <SelectTrigger id="activity-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usinagem">USINAGEM</SelectItem>
                    <SelectItem value="montagem">MONTAGEM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label htmlFor="machine-prod">Máquina</Label>
              <Select>
                <SelectTrigger id="machine-prod">
                  <SelectValue placeholder="Selecione a máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine-1">Máquina 1</SelectItem>
                  <SelectItem value="machine-2">Máquina 2</SelectItem>
                  <SelectItem value="machine-3">Máquina 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity-produced">Quantidade Produzida</Label>
              <Input id="quantity-produced" type="number" defaultValue="0" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="operations-number">Número de Operações</Label>
                <Input id="operations-number" placeholder="Ex: 5" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="machining-time">Tempo de Usinagem (minutos)</Label>
                <Input id="machining-time" type="number" defaultValue="0" />
              </div>
            <ProductionTimer title="Cronômetro de Produção" />
            <Button className="w-full">Registrar Produção</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registro de Perda</CardTitle>
            <CardDescription>
              Registre peças perdidas e o tempo de inatividade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operator-id-loss">ID do Operador</Label>
              <Input id="operator-id-loss" placeholder="Ex: OP-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-loss">Máquina</Label>
              <Select>
                <SelectTrigger id="machine-loss">
                  <SelectValue placeholder="Selecione a máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine-1">Máquina 1</SelectItem>
                  <SelectItem value="machine-2">Máquina 2</SelectItem>
                  <SelectItem value="machine-3">Máquina 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loss-reason">Motivo da Perda</Label>
              <Textarea
                id="loss-reason"
                placeholder="Descreva o motivo da perda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dead-parts-quantity">
                Quantidade de Peças Mortas
              </Label>
              <Input id="dead-parts-quantity" type="number" defaultValue="0" />
            </div>
            <ProductionTimer title="Cronômetro de Perda" />
            <Button variant="destructive" className="w-full">
              Registrar Perda
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
