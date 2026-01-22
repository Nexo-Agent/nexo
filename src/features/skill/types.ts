export interface SkillMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string[];
}

export interface Skill {
  metadata: SkillMetadata;
  instructions: string;
  path: string;
}

export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  metadataJson?: string;
  path: string;
  createdAt: number;
  updatedAt: number;
}
