export interface HealthLive {
  status: 'ok';
}

export interface HealthReady {
  status: 'ok' | 'error';
  checks: { database: 'up' | 'down'; auth: 'up' | 'down' };
}
