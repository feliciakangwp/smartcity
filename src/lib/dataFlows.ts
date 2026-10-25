// Input / output data tally. If system A lists input data from system B, then B must
// list output data to A (and the other way round). A pair where only one side lists the
// flow is a broken link.
import type { System } from '@/types/domain';

export type FlowStatus = 'ok' | 'missing-output' | 'missing-input';

export interface DataFlowPair {
  /** Sender (system B). */
  fromId: string;
  /** Receiver (system A). */
  toId: string;
  status: FlowStatus;
  /** Data items as the receiver lists them (its inputs). */
  inputs: string[];
  /** Data items as the sender lists them (its outputs). */
  outputs: string[];
}

const key = (from: string, to: string) => `${from}>${to}`;

/** One entry per sender → receiver pair among the given (active) systems. */
export function dataFlowPairs(systems: System[]): DataFlowPair[] {
  const ids = new Set(systems.map((s) => s.id));
  const pairs = new Map<string, DataFlowPair>();
  const get = (fromId: string, toId: string) => {
    const k = key(fromId, toId);
    if (!pairs.has(k)) pairs.set(k, { fromId, toId, status: 'ok', inputs: [], outputs: [] });
    return pairs.get(k)!;
  };
  for (const s of systems) {
    for (const i of s.inputs ?? []) if (ids.has(i.fromSystemId) && i.fromSystemId !== s.id) get(i.fromSystemId, s.id).inputs.push(i.data);
    for (const o of s.outputs ?? []) if (ids.has(o.toSystemId) && o.toSystemId !== s.id) get(s.id, o.toSystemId).outputs.push(o.data);
  }
  for (const p of pairs.values()) p.status = !p.outputs.length ? 'missing-output' : !p.inputs.length ? 'missing-input' : 'ok';
  return [...pairs.values()];
}

export const brokenLinks = (pairs: DataFlowPair[]) => pairs.filter((p) => p.status !== 'ok');

/** Pairs in which a system takes part, split by direction. */
export function flowsFor(systemId: string, pairs: DataFlowPair[]) {
  return {
    incoming: pairs.filter((p) => p.toId === systemId),
    outgoing: pairs.filter((p) => p.fromId === systemId),
  };
}

/** Plain-language explanation of a broken link, naming the system that needs updating. */
export function brokenReason(p: DataFlowPair, name: (id: string) => string) {
  return p.status === 'missing-output'
    ? `${name(p.toId)} lists input from ${name(p.fromId)}, but ${name(p.fromId)} does not list output to ${name(p.toId)}.`
    : `${name(p.fromId)} lists output to ${name(p.toId)}, but ${name(p.toId)} does not list input from ${name(p.fromId)}.`;
}
