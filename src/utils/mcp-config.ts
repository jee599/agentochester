import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

export function installMcpServer(global: boolean = false): void {
  const settingsDir = global ? path.join(os.homedir(), '.claude') : path.join(process.cwd(), '.claude');
  const settingsFile = path.join(settingsDir, global ? 'settings.json' : 'settings.local.json');

  fs.mkdirSync(settingsDir, { recursive: true });

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  if (!settings.mcpServers) settings.mcpServers = {};
  const mcpServers = settings.mcpServers as Record<string, unknown>;

  // Find the agentcrow binary path
  let binPath = 'agentcrow';
  try {
    const which = execSync('which agentcrow', { stdio: 'pipe' }).toString().trim();
    if (which) binPath = which;
  } catch {
    // fallback to just 'agentcrow'
  }

  mcpServers.agentcrow = {
    command: binPath,
    args: ['serve'],
  };

  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
}

export function removeMcpServer(global: boolean = false): void {
  const settingsDir = global ? path.join(os.homedir(), '.claude') : path.join(process.cwd(), '.claude');
  const settingsFile = path.join(settingsDir, global ? 'settings.json' : 'settings.local.json');

  if (!fs.existsSync(settingsFile)) return;

  try {
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    if (settings.mcpServers?.agentcrow) {
      delete settings.mcpServers.agentcrow;
      if (Object.keys(settings.mcpServers).length === 0) delete settings.mcpServers;
    }
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // malformed settings
  }
}
