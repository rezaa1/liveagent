import Database from 'better-sqlite3';

const db = new Database('agents.db');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    room_name TEXT NOT NULL,
    configuration JSON NOT NULL,
    metrics JSON,
    error TEXT
  )
`);

export const saveAgent = (agent) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO agents (id, name, status, room_name, configuration, metrics, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    agent.id,
    agent.name,
    agent.status,
    agent.roomName,
    JSON.stringify(agent.configuration),
    agent.metrics ? JSON.stringify(agent.metrics) : null,
    agent.error || null
  );
};

export const getAgents = () => {
  const stmt = db.prepare('SELECT * FROM agents');
  return stmt.all().map(row => ({
    id: row.id,
    name: row.name,
    status: row.status,
    roomName: row.room_name,
    configuration: JSON.parse(row.configuration),
    metrics: row.metrics ? JSON.parse(row.metrics) : undefined,
    error: row.error || undefined
  }));
};

export const deleteAgent = (id) => {
  const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
  stmt.run(id);
};

export const updateAgentStatus = (id, status, error = null) => {
  const stmt = db.prepare(`
    UPDATE agents 
    SET status = ?, error = ?
    WHERE id = ?
  `);
  stmt.run(status, error, id);
};

export const updateAgentMetrics = (id, metrics) => {
  const stmt = db.prepare(`
    UPDATE agents 
    SET metrics = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(metrics), id);
};