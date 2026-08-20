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

// Mapeamento de turno padrão por técnico para casos de "Extra"
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

function getShiftFromDate(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const totalMinutes = h * 60 + m;
  // 1T: 06:00 - 13:30 (810 min)
  if (totalMinutes >= 360 && totalMinutes < 810) return '1'; 
  // 2T: 13:30 - 20:30 (1230 min)
  if (totalMinutes >= 810 && totalMinutes < 1230) return '2';
  // 3T: 20:30 - 03:00
  return '3';
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
    if (!p.formsNumber || !p.operatorId || !p.date) return;
    const d = p.date.toDate ? p.date.toDate() : new Date(p.date);
    
    if (d >= williamOffDate && normalizeName(p.operatorId) === 'william martinucci') return;

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
    if (d >= williamOffDate && normalizeName(l.operatorId) === 'william martinucci') return;

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
    if (pItem.jobId === 'loss') return; 

    const techNorm = normalizeName(pItem.tecnico);
    const formsNorm = String(pItem.requisicao).replace('#', '').trim();
    const key = `${pItem.dataExecucao}|${techNorm}|${formsNorm}`;

    try {
        const planDate = parse(pItem.dataExecucao, 'dd/MM/yyyy', new Date());
        if (planDate >= williamOffDate && techNorm === 'william martinucci') return;
    } catch (e) {}
    
    const records = prodGroup[key] || [];
    const setupRealizado = setupLossGroup[key] || 0;
    
    const tempoTotalPlanejado = (Number(pItem.tempoMinutos) || 0) + (Number(pItem.setupMinutos) || 0);
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
      tempoSetupPlanejado: pItem.setupMinutos || 0,
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

  // 5. Processar registros sem plano (Extras)
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

    const opName = records[0].operatorId;
    const opNorm = normalizeName(opName);
    
    let techKey: 'TORNO' | 'CENTRO' | 'ADM' = 'ADM';
    const firstMachine = String(records[0].machine || '').toUpperCase();
    if (firstMachine.includes('TORNO')) techKey = 'TORNO';
    else if (firstMachine.includes('CENTRO')) techKey = 'CENTRO';
    else techKey = TECH_BY_OPERATOR[opName] || 'ADM';

    // Lógica refinada de Turno para Extras: 
    // 1. Ver se o técnico tem algum planejamento nesse dia (mesmo que em outra peça)
    // 2. Usar o turno padrão do técnico
    // 3. Usar o horário do registro como última opção
    const assignedShift = techShiftMap[`${dStr}|${opNorm}`];
    const defaultShift = OPERATOR_DEFAULT_SHIFT[opNorm];
    const timeShift = getShiftFromDate(records[0].createdAt?.toDate ? records[0].createdAt.toDate() : new Date());

    let turno = assignedShift || defaultShift || timeShift;

    result.push({
      id: `extra-${key}`,
      requisicao: forms,
      tecnico: opName,
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
