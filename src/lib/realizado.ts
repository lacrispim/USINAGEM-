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
  tempoSetupPlanejado: number;
  startOffsetMin: number;
  
  // Dados Realizados
  tempoRealizado: number;
  pecasRealizadas: number;
  tempoPrimeiraPeca: number;
  tempoUsinagem: number;
  tempoSetupRealizado: number;
  
  // Flags de Status
  status: 'dentro' | 'estourou' | 'adiantado' | 'semPlano' | 'semApontamento';
  suspeitaDuplicidade: boolean;
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
  if (totalMinutes >= 360 && totalMinutes < 810) return '1'; 
  if (totalMinutes >= 810 && totalMinutes < 1230) return '2';
  return '3';
}

export function cruzarComPlano(
  plano: any[],
  producao: any[],
  perdas: any[],
  tolerancia: number
): ComparacaoItem[] {
  const result: ComparacaoItem[] = [];

  // 1. Agrupar produção por (Data, Técnico, Forms)
  const prodGroup: Record<string, any[]> = {};
  producao.forEach(p => {
    if (!p.formsNumber || !p.operatorId || !p.date) return;
    const d = p.date.toDate ? p.date.toDate() : new Date(p.date);
    const dStr = format(d, 'dd/MM/yyyy');
    const techNorm = normalizeName(p.operatorId);
    const formsNorm = String(p.formsNumber).replace('#', '').trim();
    
    const key = `${dStr}|${techNorm}|${formsNorm}`;
    if (!prodGroup[key]) prodGroup[key] = [];
    prodGroup[key].push(p);
  });

  // 2. Agrupar perdas de SETUP por (Data, Técnico, Forms)
  const setupLossGroup: Record<string, number> = {};
  perdas.forEach(l => {
    if (!l.formsNumber || !l.operatorId || !l.date) return;
    const reason = String(l.lossReason || '').toUpperCase();
    if (!reason.includes('SETUP')) return;

    const d = l.date.toDate ? l.date.toDate() : new Date(l.date);
    const dStr = format(d, 'dd/MM/yyyy');
    const techNorm = normalizeName(l.operatorId);
    const formsNorm = String(l.formsNumber).replace('#', '').trim();
    
    const key = `${dStr}|${techNorm}|${formsNorm}`;
    setupLossGroup[key] = (setupLossGroup[key] || 0) + (Number(l.timeLost) || 0);
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
    if (pItem.jobId === 'loss') return; // Pula as barras de perdas gerais do Gantt

    const techNorm = normalizeName(pItem.tecnico);
    const formsNorm = String(pItem.requisicao).replace('#', '').trim();
    const key = `${pItem.dataExecucao}|${techNorm}|${formsNorm}`;
    
    const records = prodGroup[key] || [];
    const setupRealizado = setupLossGroup[key] || 0;
    
    const tempoUsinagemPlanejado = pItem.tempoMinutos || 0;
    const tempoSetupPlanejado = pItem.setupMinutos || 0;
    const tempoTotalPlanejado = tempoUsinagemPlanejado + tempoSetupPlanejado;
    const pecasPlanejadas = pItem.quantidadeNoBloco || 0;
    
    let tempoUsinagemRealizado = 0;
    let tempoPrimeiraPeca = 0;
    let pecasRealizadas = 0;
    
    records.forEach(r => {
      const t = Number(r.machiningTime) || 0;
      if (String(r.activityType || '').toUpperCase().includes('PRIMEIRA')) tempoPrimeiraPeca += t;
      else tempoUsinagemRealizado += t;
      pecasRealizadas += Number(r.quantityProduced) || 0;
    });

    const tempoTotalRealizado = tempoUsinagemRealizado + tempoPrimeiraPeca + setupRealizado;

    if (records.length > 0 || setupRealizado > 0) matchedKeys.add(key);

    let status: ComparacaoItem['status'] = 'dentro';
    if (records.length === 0 && setupRealizado === 0) {
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
      tempoSetupPlanejado,
      pecasPlanejadas,
      startOffsetMin: pItem.startOffsetMin,
      tempoRealizado: status === 'semApontamento' ? tempoTotalPlanejado : tempoTotalRealizado,
      tempoSetupRealizado: setupRealizado,
      pecasRealizadas,
      tempoPrimeiraPeca,
      tempoUsinagem: tempoUsinagemRealizado,
      status,
      suspeitaDuplicidade: records.length > 1
    });
  });

  // 5. Processar registros sem plano
  Object.keys(prodGroup).forEach(key => {
    if (matchedKeys.has(key)) return;
    const records = prodGroup[key];
    const [dStr, techNorm, forms] = key.split('|');
    const setupRealizado = setupLossGroup[key] || 0;
    
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

    tempoRealizado += setupRealizado;

    let techKey: 'TORNO' | 'CENTRO' | 'ADM' = 'ADM';
    const firstMachine = String(records[0].machine || '').toUpperCase();
    if (firstMachine.includes('TORNO')) techKey = 'TORNO';
    else if (firstMachine.includes('CENTRO')) techKey = 'CENTRO';
    else techKey = TECH_BY_OPERATOR[records[0].operatorId] || 'ADM';

    const assignedShift = techShiftMap[`${dStr}|${techNorm}`];
    let turno = assignedShift || getShiftFromDate(records[0].createdAt?.toDate ? records[0].createdAt.toDate() : new Date());

    result.push({
      id: `extra-${key}`,
      requisicao: forms,
      tecnico: records[0].operatorId,
      dataStr: dStr,
      turno,
      techKey,
      tempoPlanejado: 0,
      tempoSetupPlanejado: 0,
      pecasPlanejadas: 0,
      startOffsetMin: 0,
      tempoRealizado,
      tempoSetupRealizado: setupRealizado,
      pecasRealizadas,
      tempoPrimeiraPeca,
      tempoUsinagem,
      status: 'semPlano',
      suspeitaDuplicidade: records.length > 1
    });
  });

  return result;
}
