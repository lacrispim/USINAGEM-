'use client';

import { format } from 'date-fns';

export interface ComparacaoItem {
  id: string;
  requisicao: string;
  tecnico: string;
  dataStr: string;
  turno: string;
  techKey: string;
  
  // Dados Planejados
  tempoPlanejado: number;
  pecasPlanejadas: number;
  startOffsetMin: number;
  
  // Dados Realizados
  tempoRealizado: number;
  pecasRealizadas: number;
  tempoPrimeiraPeca: number;
  tempoUsinagem: number;
  
  // Flags de Status
  status: 'dentro' | 'estourou' | 'adiantado' | 'semPlano' | 'semApontamento';
  suspeitaDuplicidade: boolean;
}

function getShiftFromDate(d: Date): string {
  const h = d.getHours();
  if (h >= 6 && h < 13) return '1';
  if (h >= 13 && h < 20) return '2';
  return '3';
}

export function cruzarComPlano(
  plano: any[],
  producao: any[],
  tolerancia: number
): ComparacaoItem[] {
  const result: ComparacaoItem[] = [];

  // Agrupar produção por (Data, Técnico, Forms)
  const prodGroup: Record<string, any[]> = {};
  producao.forEach(p => {
    if (!p.formsNumber || !p.operatorId || !p.date) return;
    const d = p.date.toDate ? p.date.toDate() : new Date(p.date);
    const dStr = format(d, 'dd/MM/yyyy');
    const key = `${dStr}|${p.operatorId}|${p.formsNumber}`;
    if (!prodGroup[key]) prodGroup[key] = [];
    prodGroup[key].push(p);
  });

  const matchedKeys = new Set<string>();

  // 1. Processar itens do Plano (Gera barras alinhadas ou "semApontamento")
  plano.forEach(pItem => {
    const key = `${pItem.dataExecucao}|${pItem.tecnico}|${pItem.requisicao}`;
    const records = prodGroup[key] || [];
    
    const tempoPlanejado = (pItem.tempoMinutos || 0) + (pItem.setupMinutos || 0);
    const pecasPlanejadas = pItem.quantidadeNoBloco || 0;
    
    let tempoRealizado = 0;
    let tempoUsinagem = 0;
    let tempoPrimeiraPeca = 0;
    let pecasRealizadas = 0;
    
    records.forEach(r => {
      const t = Number(r.machiningTime) || 0;
      tempoRealizado += t;
      if (String(r.activityType || '').toUpperCase().includes('PRIMEIRA')) tempoPrimeiraPeca += t;
      else tempoUsinagem += t;
      pecasRealizadas += Number(r.quantityProduced) || 0;
    });

    if (records.length > 0) matchedKeys.add(key);

    let status: ComparacaoItem['status'] = 'dentro';
    if (records.length === 0) {
      status = 'semApontamento';
    } else {
      const desvio = tempoPlanejado > 0 ? (tempoRealizado - tempoPlanejado) / tempoPlanejado : 0;
      if (desvio > tolerancia) status = 'estourou';
      else if (desvio < -tolerancia) status = 'adiantado';
    }

    result.push({
      id: `res-${pItem.id}`,
      requisicao: pItem.requisicao,
      tecnico: pItem.tecnico,
      dataStr: pItem.dataExecucao,
      turno: pItem.turno,
      techKey: pItem.techKey,
      tempoPlanejado,
      pecasPlanejadas,
      startOffsetMin: pItem.startOffsetMin,
      tempoRealizado: status === 'semApontamento' ? tempoPlanejado : tempoRealizado,
      pecasRealizadas,
      tempoPrimeiraPeca,
      tempoUsinagem,
      status,
      suspeitaDuplicidade: records.length > 1
    });
  });

  // 2. Processar registros de produção sem plano ("semPlano")
  Object.keys(prodGroup).forEach(key => {
    if (matchedKeys.has(key)) return;
    const records = prodGroup[key];
    const [dStr, opId, forms] = key.split('|');
    
    let tempoRealizado = 0;
    let tempoUsinagem = 0;
    let tempoPrimeiraPeca = 0;
    let pecasRealizadas = 0;

    records.forEach(r => {
      const t = Number(r.machiningTime) || 0;
      tempoRealizado += t;
      if (String(r.activityType || '').toUpperCase().includes('PRIMEIRA')) tempoPrimeiraPeca += t;
      else tempoUsinagem += t;
      pecasRealizadas += Number(r.quantityProduced) || 0;
    });

    let techKey = 'ADM';
    if (records[0].machine?.includes('TORNO')) techKey = 'TORNO';
    if (records[0].machine?.includes('CENTRO')) techKey = 'CENTRO';

    const createdAt = records[0].createdAt?.toDate ? records[0].createdAt.toDate() : new Date();
    const turno = getShiftFromDate(createdAt);

    result.push({
      id: `extra-${key}`,
      requisicao: forms,
      tecnico: opId,
      dataStr: dStr,
      turno,
      techKey,
      tempoPlanejado: 0,
      pecasPlanejadas: 0,
      startOffsetMin: 420 - Math.min(tempoRealizado, 180), // Posiciona ao final do turno
      tempoRealizado,
      pecasRealizadas,
      tempoPrimeiraPeca,
      tempoUsinagem,
      status: 'semPlano',
      suspeitaDuplicidade: records.length > 1
    });
  });

  return result;
}