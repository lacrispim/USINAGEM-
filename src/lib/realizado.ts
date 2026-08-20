
'use client';

import { format, parse } from 'date-fns';

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
  tempoSetupPlanejado: number;
  startOffsetMin: number;
  
  // Dados Realizados
  tempoRealizado: number;
  pecasRealizadas: number;
  tempoPrimeiraPeca: number;
  tempoUsinagem: number;
  tempoSetupRealizado: number;
  
  // Flags de Status
  status: 'dentro' | 'estourou' | 'adiantado' | 'semPlano' | 'semApontamento' | 'perda';
  suspeitaDuplicidade: boolean;
  motivoPerda?: string;
}

// Mapeamento mestre de tecnologia por técnico
const TECH_BY_OPERATOR: Record<string, 'TORNO' | 'CENTRO' | 'ADM'> = {
  "Alisson França": "TORNO",
  "Gustavo Gozzi": "TORNO",
  "Jair Melo": "TORNO",
  "Daniel Solivo": "CENTRO",
  "Nathan Xavier": "CENTRO",
  "Rodrigo Cantano": "CENTRO",
  "William Martinucci": "ADM",
  "Marcos Barbosa": "TORNO"
};

// Mapeamento de turno padrão por técnico para casos de "Extra" e atribuição correta
const OPERATOR_DEFAULT_SHIFT: Record<string, string> = {
  "gustavo gozzi": "1",
  "jair melo": "2",
  "alisson franca": "3",
  "daniel solivo": "1",
  "nathan xavier": "2",
  "rodrigo cantano": "3",
  "william martinucci": "1",
  "marcos barbosa": "1"
};

function normalizeName(name: any): string {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export function cruzarComPlano(
  plano: any[],
  producao: any[],
  perdas: any[],
  tolerancia: number
): ComparacaoItem[] {
  const result: ComparacaoItem[] = [];
  const williamOffDate = new Date(2026, 7, 16);

  // 1. Agrupar produção por (Data, Técnico, Forms)
  const prodGroup: Record<string, any[]> = {};
  producao.forEach(p => {
    if (!p.operatorId || !p.date) return;
    const d = p.date.toDate ? p.date.toDate() : new Date(p.date);
    if (d >= williamOffDate && normalizeName(p.operatorId) === 'william martinucci') return;

    const dStr = format(d, 'dd/MM/yyyy');
    const techNorm = normalizeName(p.operatorId);
    const formsNorm = String(p.formsNumber || 'S/N').replace('#', '').trim();
    
    const key = `${dStr}|${techNorm}|${formsNorm}`;
    if (!prodGroup[key]) prodGroup[key] = [];
    prodGroup[key].push(p);
  });

  // 2. Agrupar perdas por (Data, Técnico) - SOMA TOTAL DE TEMPO IMPRODUTIVO
  const lossSummary: Record<string, { total: number, reasons: string[] }> = {};
  perdas.forEach(l => {
    if (!l.operatorId || !l.date) return;
    const d = l.date.toDate ? l.date.toDate() : new Date(l.date);
    if (d >= williamOffDate && normalizeName(l.operatorId) === 'william martinucci') return;

    const dStr = format(d, 'dd/MM/yyyy');
    const techNorm = normalizeName(l.operatorId);
    const key = `${dStr}|${techNorm}`;
    
    if (!lossSummary[key]) lossSummary[key] = { total: 0, reasons: [] };
    const time = Number(l.timeLost) || 0;
    lossSummary[key].total += time;
    if (l.lossReason) lossSummary[key].reasons.push(`${l.lossReason} (${time}m)`);
  });

  // 3. Mapear Turnos Planejados por Técnico/Data
  const techShiftMap: Record<string, string> = {};
  plano.forEach(p => {
    const key = `${p.dataExecucao}|${normalizeName(p.tecnico)}`;
    if (!techShiftMap[key]) techShiftMap[key] = p.turno;
  });

  const matchedKeys = new Set<string>();

  // 4. Processar itens do Plano
  plano.forEach(pItem => {
    if (pItem.jobId === 'loss') return; 

    const techNorm = normalizeName(pItem.tecnico);
    const formsNorm = String(pItem.requisicao).replace('#', '').trim();
    const key = `${pItem.dataExecucao}|${techNorm}|${formsNorm}`;

    try {
        const planDate = parse(pItem.dataExecucao, 'dd/MM/yyyy', new Date());
        if (planDate >= williamOffDate && techNorm === 'william martinucci') return;
    } catch (e) {}
    
    const records = prodGroup[key] || [];
    const tempoTotalPlanejado = (Number(pItem.tempoMinutos) || 0) + (Number(pItem.setupMinutos) || 0);
    
    let tempoUsinagemRealizado = 0;
    let tempoPrimeiraPeca = 0;
    let pecasRealizadas = 0;
    
    records.forEach(r => {
      const t = Number(r.machiningTime) || 0;
      if (String(r.activityType || '').toUpperCase().includes('PRIMEIRA')) tempoPrimeiraPeca += t;
      else tempoUsinagemRealizado += t;
      pecasRealizadas += Number(r.quantityProduced) || 0;
    });

    const tempoTotalRealizado = tempoUsinagemRealizado + tempoPrimeiraPeca;
    if (records.length > 0) matchedKeys.add(key);

    let status: ComparacaoItem['status'] = 'dentro';
    if (records.length === 0) {
      status = 'semApontamento';
    } else {
      const desvio = tempoTotalPlanejado > 0 ? (tempoTotalRealizado - tempoTotalPlanejado) / tempoTotalPlanejado : 0;
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
      tempoPlanejado: tempoTotalPlanejado,
      tempoSetupPlanejado: pItem.setupMinutos || 0,
      pecasPlanejadas: pItem.quantidadeNoBloco || 0,
      startOffsetMin: pItem.startOffsetMin,
      tempoRealizado: status === 'semApontamento' ? tempoTotalPlanejado : tempoTotalRealizado,
      tempoSetupRealizado: 0,
      pecasRealizadas,
      tempoPrimeiraPeca,
      tempoUsinagem: tempoUsinagemRealizado,
      status,
      suspeitaDuplicidade: records.length > 1
    });
  });

  // 5. Adicionar Linha de Perdas (Resumo Improdutivo)
  Object.keys(lossSummary).forEach(key => {
    const [dStr, techNorm] = key.split('|');
    const data = lossSummary[key];
    const techName = plano.find(p => normalizeName(p.tecnico) === techNorm)?.tecnico || techNorm;
    
    // Identificar o turno correto para a perda
    const assignedShift = techShiftMap[`${dStr}|${techNorm}`] || OPERATOR_DEFAULT_SHIFT[techNorm] || '1';
    
    result.push({
      id: `loss-${key}`,
      requisicao: 'PERDAS',
      tecnico: techName,
      dataStr: dStr,
      turno: assignedShift,
      techKey: TECH_BY_OPERATOR[techName] || 'ADM',
      tempoPlanejado: 0,
      pecasPlanejadas: 0,
      tempoSetupPlanejado: 0,
      startOffsetMin: 0,
      tempoRealizado: data.total,
      pecasRealizadas: 0,
      tempoPrimeiraPeca: 0,
      tempoUsinagem: 0,
      tempoSetupRealizado: data.total,
      status: 'perda',
      suspeitaDuplicidade: false,
      motivoPerda: data.reasons.join(' | ')
    });
  });

  // 6. Identificar Apontamentos "Extras" (Sem Plano)
  Object.keys(prodGroup).forEach(key => {
    if (matchedKeys.has(key)) return;
    const [dStr, techNorm, formsNorm] = key.split('|');
    const records = prodGroup[key];
    
    let tempoTotal = 0;
    let pecasTotal = 0;
    records.forEach(r => {
        tempoTotal += Number(r.machiningTime) || 0;
        pecasTotal += Number(r.quantityProduced) || 0;
    });

    const techName = plano.find(p => normalizeName(p.tecnico) === techNorm)?.tecnico || techNorm;
    const assignedShift = techShiftMap[`${dStr}|${techNorm}`] || OPERATOR_DEFAULT_SHIFT[techNorm] || '1';

    result.push({
        id: `extra-${key}`,
        requisicao: formsNorm,
        tecnico: techName,
        dataStr: dStr,
        turno: assignedShift,
        techKey: TECH_BY_OPERATOR[techName] || 'ADM',
        tempoPlanejado: 0,
        pecasPlanejadas: 0,
        tempoSetupPlanejado: 0,
        startOffsetMin: 0,
        tempoRealizado: tempoTotal,
        pecasRealizadas: pecasTotal,
        tempoPrimeiraPeca: 0,
        tempoUsinagem: tempoTotal,
        tempoSetupRealizado: 0,
        status: 'semPlano',
        suspeitaDuplicidade: false
    });
  });

  return result;
}
