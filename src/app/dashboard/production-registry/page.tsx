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
  Play,
  RotateCcw,
} from 'lucide-react';

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
              <Label htmlFor="factory-prod">Fábrica</Label>
              <Select>
                <SelectTrigger id="factory-prod">
                  <SelectValue placeholder="Selecione a fábrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="factory-a">Fábrica A</SelectItem>
                  <SelectItem value="factory-b">Fábrica B</SelectItem>
                  <SelectItem value="factory-c">Fábrica C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-number">Número do forms</Label>
              <Input id="form-number" placeholder="Ex: F-1024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-type">Tipo de Atividade</Label>
              <Select>
                <SelectTrigger id="activity-type">
                  <SelectValue placeholder="Selecione o tipo de atividade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usinagem">USINAGEM</SelectItem>
                  <SelectItem value="montagem">Montagem</SelectItem>
                  <SelectItem value="inspecao">Inspeção</SelectItem>
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
              <Label htmlFor="machining-time">
                Tempo de Usinagem (minutos)
              </Label>
              <Input id="machining-time" type="number" defaultValue="0" />
            </div>
            <Card className="bg-card-foreground/5">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Cronômetro de Produção
                </p>
                <p className="text-4xl font-bold tracking-tighter">00:00:00</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button>
                    <Play className="mr-2" /> Iniciar
                  </Button>
                  <Button variant="secondary">
                    <RotateCcw className="mr-2" /> Zerar
                  </Button>
                </div>
              </CardContent>
            </Card>
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
              <Label htmlFor="factory-loss">Fábrica</Label>
              <Select>
                <SelectTrigger id="factory-loss">
                  <SelectValue placeholder="Selecione a fábrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="factory-a">Fábrica A</SelectItem>
                  <SelectItem value="factory-b">Fábrica B</SelectItem>
                  <SelectItem value="factory-c">Fábrica C</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label htmlFor="time-lost">Tempo Perdido (minutos)</Label>
              <Input id="time-lost" type="number" defaultValue="0" />
            </div>
            <Card className="bg-card-foreground/5">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Cronômetro de Perda
                </p>
                <p className="text-4xl font-bold tracking-tighter">00:00:00</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button>
                    <Play className="mr-2" /> Iniciar
                  </Button>
                  <Button variant="secondary">
                    <RotateCcw className="mr-2" /> Zerar
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Button variant="destructive" className="w-full">
              Registrar Perda
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
