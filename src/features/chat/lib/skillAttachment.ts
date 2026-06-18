import type { SkillRecord } from '@/features/skill/types';

export interface SkillAttachmentMeta {
  skillId: string;
  skillName: string;
  description: string;
}

export type InsertedSkill = SkillAttachmentMeta;

export function parseSkillAttachment(
  metadata: Record<string, unknown> | null
): SkillAttachmentMeta | null {
  if (!metadata) return null;

  const skillId =
    (typeof metadata.skillId === 'string' && metadata.skillId) ||
    (typeof metadata.skill === 'object' &&
      metadata.skill !== null &&
      typeof (metadata.skill as { id?: string }).id === 'string' &&
      (metadata.skill as { id: string }).id) ||
    null;

  if (!skillId) return null;

  const skillName =
    (typeof metadata.skillName === 'string' && metadata.skillName) ||
    (typeof metadata.skill === 'object' &&
      metadata.skill !== null &&
      typeof (metadata.skill as { name?: string }).name === 'string' &&
      (metadata.skill as { name: string }).name) ||
    skillId;

  const description =
    (typeof metadata.description === 'string' && metadata.description) ||
    (typeof metadata.skill === 'object' &&
      metadata.skill !== null &&
      typeof (metadata.skill as { description?: string }).description ===
        'string' &&
      (metadata.skill as { description: string }).description) ||
    '';

  return { skillId, skillName, description };
}

export function skillRecordToInserted(skill: SkillRecord): InsertedSkill {
  return {
    skillId: skill.id,
    skillName: skill.name,
    description: skill.description,
  };
}

export function buildSkillAttachmentMetadata(
  skill: InsertedSkill | null,
  existingMetadata?: string
): string | undefined {
  if (!skill) return existingMetadata;

  let base: Record<string, unknown> = {};
  if (existingMetadata) {
    try {
      base = JSON.parse(existingMetadata) as Record<string, unknown>;
    } catch {
      base = {};
    }
  }

  return JSON.stringify({
    ...base,
    type: base.type ?? 'skill_attachment',
    skillId: skill.skillId,
    skillName: skill.skillName,
    description: skill.description,
  });
}
