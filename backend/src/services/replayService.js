export class ReplayService {
  constructor() {
    this.activeRun = null;
  }

  start({ scenario = 'rain_zone4_chain', zone = 'Z04', speed = 1, clear_previous = true, seed_baseline = true } = {}) {
    if (this.activeRun) {
      throw new Error('REPLAY_ALREADY_RUNNING');
    }

    this.activeRun = { run_id: `run_${Date.now()}`, scenario, zone, speed, clear_previous, seed_baseline, started_at: new Date().toISOString(), ends_at: new Date(Date.now() + 150000).toISOString() };
    return this.activeRun;
  }

  stop() {
    const run = this.activeRun;
    this.activeRun = null;
    return run;
  }
}
