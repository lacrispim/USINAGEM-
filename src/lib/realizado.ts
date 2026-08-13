'use client';

import { format, parse, isAfter, isBefore, addMinutes, subMinutes } from 'date-fns';

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

// Mapeamento para ajudar a encontrar a tecnologia do técnico se a máquina não for informada
const TECH_BY_OPERATOR: Record<string, 'TORNO' | 'CENTRO' | 'ADM'> = {
  "Alisson França": "TORNO",
  "Gustavo Gozzi": "TORNO",
  "Jair Melo": "TORNO",
  "Daniel Solivo": "CENTRO",
  "Nathan Xavier": "CENTRO",
  "Rodrigo Cantano": "CENTRO",
  "William Martinucci": "ADM",
  "Marcos Barbosa": "TORNO" // Folgista costuma atuar mais no Torno, mas é flexível
};

function normalizeName(name: any): string {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getShiftFromDate(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const totalMinutes = h * 60 + m;

  // 1T: 06:00 (360m) - 13:00 (780m)
  // 2T: 13:00 (780m) - 20:00 (1200m)
  // 3T: 20:00 (1200m) - 03:00 (180m do dia seguinte)

  if (totalMinutes >= 360 && totalMinutes < 785) return '1'; // Tolerância de 5min após as 13h
  if (totalMinutes >= 785 && totalMinutes < 1205) return '2'; // Tolerância de 5min após as 20h
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
    
    // Normalizamos o nome do técnico para a chave
    const techNorm = normalizeName(p.operatorId);
    const formsNorm = String(p.formsNumber).replace('#', '').trim();
    
    const key = `${dStr}|${techNorm}|${formsNorm}`;
    if (!prodGroup[key]) prodGroup[key] = [];
    prodGroup[key].push(p);
  });

  const matchedKeys = new Set<string>();

  // 1. Processar itens do Plano
  plano.forEach(pItem => {
    const techNorm = normalizeName(pItem.tecnico);
    const formsNorm = String(pItem.requisicao).replace('#', '').trim();
    const key = `${pItem.dataExecucao}|${techNorm}|${formsNorm}`;
    
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
    const [dStr, techNorm, forms] = key.split('|');
    
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

    // Identifica a tecnologia (TechKey)
    let techKey: 'TORNO' | 'CENTRO' | 'ADM' = 'ADM';
    const firstMachine = String(records[0].machine || '').toUpperCase();
    if (firstMachine.includes('TORNO')) techKey = 'TORNO';
    else if (firstMachine.includes('CENTRO')) techKey = 'CENTRO';
    else {
      // Se não informou máquina, tenta descobrir pelo nome do técnico original (não o normalizado)
      const originalTechName = records[0].operatorId;
      techKey = TECH_BY_OPERATOR[originalTechName] || 'ADM';
    }

    // Identifica o turno
    const createdAt = records[0].createdAt?.toDate ? records[0].createdAt.toDate() : new Date();
    const turno = getShiftFromDate(createdAt);

    result.push({
      id: `extra-${key}`,
      requisicao: forms,
      tecnico: records[0].operatorId, // Mantemos o nome original para exibição
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
