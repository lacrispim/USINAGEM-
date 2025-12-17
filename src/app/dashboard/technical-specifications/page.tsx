'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const specifications = {
  'Centur 30': {
    Capacidade: [
      { spec: 'Altura de pontas', value: '240 mm' },
      { spec: 'Distância entre pontas', value: '1.000 m' },
      { spec: 'Diâmetro adm. sobre o barramento', value: '470 mm' },
      { spec: 'Diâmetro adm. sobre o carro transversal', value: '200 mm' },
      { spec: 'Diâmetro adm. sobre as asas da mesa', value: '430 mm' },
      { spec: 'Curso transversal do carro (eixo X)', value: '220 mm' },
      { spec: 'Curso longitudinal do carro (eixo Z)', value: '1.065 mm' },
    ],
    Barramento: [
      { spec: 'Largura', value: '305 mm' },
      { spec: 'Altura', value: '290 mm' },
    ],
    Cabeçote: [
      { spec: 'Nariz do eixo-árvore', value: 'ASA A2-5"' },
      { spec: 'Diâmetro do furo do eixo-árvore', value: '53 mm' },
      { spec: 'Sistema de transmissão', value: 'Direct drive' },
      { spec: 'Faixa de velocidades', value: '4 a 4.000 rpm' },
    ],
    Avanços: [
      { spec: 'Avanço rápido longitudinal (eixo Z)', value: '10 m/min' },
      { spec: 'Avanço rápido transversal (eixo X)', value: '10 m/min' },
    ],
    'Cabeçote móvel manual': [
      { spec: 'Posicionamento do corpo', value: 'Manual (std)' },
      { spec: 'Acionamento da manga', value: 'Manual (standard) ou Hidráulico (opcional)' },
      { spec: 'Curso máximo da manga', value: '120 mm' },
      { spec: 'Diâmetro da manga', value: '60 mm' },
      { spec: 'Sede interna da manga', value: 'CM 4' },
    ],
    'Potência instalada': [
      { spec: 'Motor principal ca (regime S6 - 40%)', value: '12,5 / 9 cv/kW' },
      { spec: 'Potência total instalada', value: '20 kVA' },
    ],
    'Dimensões e Peso (*)': [
      { spec: 'Área ocupada', value: '2,91 x 1,24 m' },
      { spec: 'Peso líquido aproximado', value: '2.600 kg' },
    ],
  },
  'Centur 35': {
    Capacidade: [
      { spec: 'Altura de pontas', value: '290 mm' },
      { spec: 'Distância entre pontas', value: '1.500 m' },
      { spec: 'Diâmetro adm. sobre o barramento', value: '570 mm' },
      { spec: 'Diâmetro adm. sobre o carro transversal', value: '255 mm' },
      { spec: 'Diâmetro adm. sobre as asas da mesa', value: '510 mm' },
      { spec: 'Curso transversal do carro (eixo X)', value: '280 mm' },
      { spec: 'Curso longitudinal do carro (eixo Z)', value: '1.555 mm' },
    ],
    Barramento: [
      { spec: 'Largura', value: '380 mm' },
      { spec: 'Altura', value: '290 mm' },
    ],
    Cabeçote: [
      { spec: 'Nariz do eixo-árvore', value: 'A2-6” / A2-8”' },
      { spec: 'Diâmetro do furo do eixo-árvore', value: '65 / 80 mm' },
      { spec: 'Sistema de transmissão', value: 'Direct drive' },
      { spec: 'Faixa de velocidades', value: '3 a 3.000 / 2 a 2.200 rpm' },
    ],
    Avanços: [
      { spec: 'Avanço rápido longitudinal (eixo Z)', value: '10 m/min' },
      { spec: 'Avanço rápido transversal (eixo X)', value: '10 m/min' },
    ],
    'Cabeçote móvel manual': [
        { spec: 'Posicionamento do corpo', value: 'Arraste pela mesa (opc)' },
      { spec: 'Acionamento da manga', value: 'Manual (standard) ou Hidráulico (opcional)' },
      { spec: 'Curso máximo da manga', value: '130 mm' },
      { spec: 'Diâmetro da manga', value: '80 mm' },
      { spec: 'Sede interna da manga', value: 'CM 4' },
    ],
    'Potência instalada': [
      { spec: 'Motor principal ca (regime S6 - 40%)', value: '15 / 11 cv/kW' },
      { spec: 'Potência total instalada', value: '20 kVA' },
    ],
    'Dimensões e Peso (*)': [
      { spec: 'Área ocupada', value: '3,65 x 1,49 m' },
      { spec: 'Peso líquido aproximado', value: '3.550 kg' },
    ],
  },
  'Centur 40': {
    Capacidade: [
      { spec: 'Altura de pontas', value: '340 mm' },
      { spec: 'Distância entre pontas', value: '2.000 m' },
      { spec: 'Diâmetro adm. sobre o barramento', value: '670 mm' },
      { spec: 'Diâmetro adm. sobre o carro transversal', value: '345 mm' },
      { spec: 'Diâmetro adm. sobre as asas da mesa', value: '600 mm' },
      { spec: 'Curso transversal do carro (eixo X)', value: '360 mm' },
      { spec: 'Curso longitudinal do carro (eixo Z)', value: '2.025 mm' },
    ],
    Barramento: [
      { spec: 'Largura', value: '380 mm' },
      { spec: 'Altura', value: '290 mm' },
    ],
    Cabeçote: [
      { spec: 'Nariz do eixo-árvore', value: 'A2-6” / A2-8”' },
      { spec: 'Diâmetro do furo do eixo-árvore', value: '65 / 104 mm' },
      { spec: 'Sistema de transmissão', value: 'Direct drive' },
      { spec: 'Faixa de velocidades', value: '3 a 3.000 / 1 a 1.800 rpm' },
    ],
    Avanços: [
      { spec: 'Avanço rápido longitudinal (eixo Z)', value: '8 m/min' },
      { spec: 'Avanço rápido transversal (eixo X)', value: '8 m/min' },
    ],
    'Cabeçote móvel manual': [
        { spec: 'Posicionamento do corpo', value: 'Arraste pela Mesa (Std)' },
        { spec: 'Acionamento da manga', value: 'Manual (standard) ou Hidráulico (opcional)' },
        { spec: 'Curso máximo da manga', value: '180 mm' },
        { spec: 'Diâmetro da manga', value: '100 mm' },
        { spec: 'Sede interna da manga', value: 'CM 5' },
    ],
    'Potência instalada': [
      { spec: 'Motor principal ca (regime S6 - 40%)', value: '24,7 / 18,2 cv/kW' },
      { spec: 'Potência total instalada', value: '25 kVA' },
    ],
    'Dimensões e Peso (*)': [
      { spec: 'Área ocupada', value: '4,84 x 1,57 m' },
      { spec: 'Peso líquido aproximado', value: '4.300 kg' },
    ],
  },
};

const SpecTable = ({ title, data }: { title: string; data: { spec: string; value: string }[] }) => (
  <div className="mb-6">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60%]">Especificação</TableHead>
          <TableHead>Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.spec}</TableCell>
            <TableCell>{item.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default function TechnicalSpecificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Especificações Técnicas
        </h1>
        <p className="text-muted-foreground">
          Consulte os detalhes técnicos dos equipamentos de usinagem.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tornos CNC - Linha Centur</CardTitle>
          <CardDescription>
            Especificações detalhadas para os modelos Centur 30, Centur 35 e Centur 40.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="Centur 30">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="Centur 30">Centur 30</TabsTrigger>
              <TabsTrigger value="Centur 35">Centur 35</TabsTrigger>
              <TabsTrigger value="Centur 40">Centur 40</TabsTrigger>
            </TabsList>
            {Object.entries(specifications).map(([model, categories]) => (
              <TabsContent key={model} value={model} className="pt-4">
                {Object.entries(categories).map(([category, data]) => (
                    <SpecTable key={category} title={category} data={data} />
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
