export type AgentSource =
  | { type: 'external'; repo: 'agency-agents'; filePath: string; division: string }
  | { type: 'builtin'; filePath: string }
  | { type: 'generated'; prompt: string; timestamp: string };

export interface AgentIdentity {
  personality: string;
  communication: string;
  thinking: string;
}

export interface AgentCriticalRules {
  must: string[];
  must_not: string[];
}

export interface AgentDefinition {
  name: string;
  role: string;
  description: string;
  identity: AgentIdentity;
  critical_rules: AgentCriticalRules;
  deliverables: string[];
  output_format?: Record<string, string>;
  example?: { bad?: string; good?: string };
  success_metrics: string[];
  source: AgentSource;
  tags: string[];
  division?: string;
  confidence?: number;
}

export interface CatalogEntry {
  name: string;
  role: string;
  description: string;
  tags: string[];
  division: string;
  source: AgentSource;
  filePath: string;
}

export interface Task {
  id: string;
  role: string;
  action: string;
  depends_on: string[];
  file_scope?: string[];
}
