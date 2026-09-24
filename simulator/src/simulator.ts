import { v4 as uuid } from 'uuid';
import { citypulseConfig } from '../config/citypulse.config.js';
import {
  deleteAlertsBySimulation,
  deleteAnomaliesBySimulation,
  deleteCorrelationsBySimulation,
  deleteEventsBySimulation,
  isoNow,
  resetZonesToNormal,
} from '../store/firestore.js';
import { ingestEvent } from './eventPipeline.js';
import { replayReset } from './replayController.js';

export type SimStage =
  | 'idle'
  | 'rain'
  | 'traffic'
  | 'transit'
  | 'pipeline'
  | 'done';

interface SimState {
  running: boolean;
  simulationId: string | null;
  stage: SimStage;
  stageIndex: number;
  timers: ReturnType<typeof setTimeout>[];
}

const state: SimState = {
  running: false,
  simulationId: null,
  stage: 'idle',
  stageIndex: 0,
  timers: [],
};

function clearTimers(): void {
  for (const t of state.timers) clearTimeout(t);
  state.timers = [];
}

export function getSimulatorStatus() {
  return {
    running: state.running,
    simulationId: state.simulationId,
    stage: state.stage,
    stageIndex: state.stageIndex,
    totalStages: 3,
  };
}

export async function startZone4Simulation(): Promise<{ ok: boolean; message?: string; simulationId?: string }> {
  if (state.running) {
    return { ok: false, message: 'Simulation already running' };
  }

  clearTimers();
  await replayReset();

  const simulationId = uuid();
  state.running = true;
  state.simulationId = simulationId;
  state.stage = 'rain';
  state.stageIndex = 1;

  const { zoneId, coordinates, stageDelaysMs, trafficIncidentCount, templates } =
    citypulseConfig.simulator;
  const base = isoNow();

  const schedule = (fn: () => Promise<void>, delay: number) => {
    const t = setTimeout(() => void fn(), delay);
    state.timers.push(t);
  };

  let offset = 0;

  schedule(async () => {
    state.stage = 'rain';
    state.stageIndex = 1;
    await ingestEvent({
      id: `evt_${uuid().slice(0, 8)}`,
      source: templates.rain.source,
      type: templates.rain.type,
      severity: templates.rain.severity,
      location: { ...coordinates, zone: zoneId },
      timestamp: base,
      metadata: { ...templates.rain.metadata, simulation_id: simulationId, synthetic: true },
      confidence: templates.rain.confidence,
    });
  }, offset);
  offset += stageDelaysMs[0];

  schedule(async () => {
    state.stage = 'traffic';
    state.stageIndex = 2;
    for (let i = 0; i < trafficIncidentCount; i++) {
      await ingestEvent({
        id: `evt_${uuid().slice(0, 8)}`,
        source: templates.traffic.source,
        type: templates.traffic.type,
        severity: templates.traffic.baseSeverity + i * templates.traffic.severityStep,
        location: {
          lat: coordinates.lat + i * 0.002,
          lng: coordinates.lng + i * 0.001,
          zone: zoneId,
        },
        timestamp: isoNow(),
        metadata: { simulation_id: simulationId, synthetic: true, index: i },
        confidence: templates.traffic.confidence,
      });
    }
  }, offset);
  offset += stageDelaysMs[1];

  schedule(async () => {
    state.stage = 'transit';
    state.stageIndex = 3;
    await ingestEvent({
      id: `evt_${uuid().slice(0, 8)}`,
      source: templates.transit.source,
      type: templates.transit.type,
      severity: templates.transit.severity,
      location: { ...coordinates, zone: zoneId },
      timestamp: isoNow(),
      metadata: { ...templates.transit.metadata, simulation_id: simulationId, synthetic: true },
      confidence: templates.transit.confidence,
    });
    state.stage = 'pipeline';
  }, offset);

  schedule(async () => {
    state.stage = 'done';
    state.running = false;
  }, offset + stageDelaysMs[2]);

  return { ok: true, simulationId };
}

export async function resetSimulation(): Promise<{ ok: boolean; deleted: Record<string, number> }> {
  clearTimers();
  await replayReset();

  const simId = state.simulationId;
  state.running = false;
  state.stage = 'idle';
  state.stageIndex = 0;

  if (!simId) {
    await resetZonesToNormal();
    state.simulationId = null;
    return { ok: true, deleted: { events: 0, anomalies: 0, correlations: 0, alerts: 0 } };
  }

  const deleted = {
    events: await deleteEventsBySimulation(simId),
    anomalies: await deleteAnomaliesBySimulation(simId),
    correlations: await deleteCorrelationsBySimulation(simId),
    alerts: await deleteAlertsBySimulation(simId),
  };

  await resetZonesToNormal();
  state.simulationId = null;
  return { ok: true, deleted };
}
