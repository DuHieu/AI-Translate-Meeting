export interface RecapSectionDefinition {
  key: string;
  title: string;
  instruction: string;
  format?: 'list' | 'text';
}

export interface MeetingRecapSkill {
  id: string;
  name: string;
  description: string;
  targetDepartment?: string;
  customKeywords?: string[];
  sections: RecapSectionDefinition[];
  isBuiltin?: boolean; // When true: NEVER displayed in the user-facing custom skills list
  createdAt?: string;
}

const STORAGE_KEY = 'ai-meeting-custom-recap-skills';

/**
 * Standard System Default Skill (Built-in Core).
 * Implements the latest, smartest 6-pillar Executive Minutes of Meeting (MoM) standard.
 * isBuiltin = true ensures this standard skill is NOT listed in the company custom skills UI.
 */
export const SYSTEM_DEFAULT_RECAP_SKILL: MeetingRecapSkill = {
  id: 'system-executive-mom-v1',
  name: 'Tiêu Chuẩn Điều Hành Toàn Diện (Executive MoM)',
  description: 'Trích xuất biên bản họp đa ngữ chuẩn quốc tế: Tóm tắt điều hành, Quyết định, Phân công nhiệm vụ, Trọng tâm thảo luận & Điểm nghẽn rủi ro.',
  isBuiltin: true,
  sections: [
    {
      key: 'executiveSummary',
      title: 'Tóm Tắt Điều Hành (Executive Summary)',
      instruction: 'Khái quát ngắn gọn 2-3 câu về bối cảnh, trọng tâm và kết quả đạt được của phiên họp.',
      format: 'text',
    },
    {
      key: 'decisions',
      title: 'Quyết Định Quan Trọng (Key Decisions)',
      instruction: 'Các thỏa thuận, giải pháp được các bên chốt chính thức trong cuộc họp.',
      format: 'list',
    },
    {
      key: 'actionItems',
      title: 'Nhiệm Vụ & Phân Công (Action Items)',
      instruction: 'Liệt kê công việc cụ thể kèm người nhận việc (Assignee), thời hạn (Deadline) và độ ưu tiên.',
      format: 'list',
    },
    {
      key: 'discussionPillars',
      title: 'Trọng Tâm Thảo Luận (Discussion Pillars)',
      instruction: 'Gom cụm các chủ đề chuyên môn (Kỹ thuật, Tiến độ, Hợp đồng, Quy trình).',
      format: 'list',
    },
    {
      key: 'blockersAndRisks',
      title: 'Điểm Nghẽn & Rủi Ro Tồn Đọng (Blockers & Risks)',
      instruction: 'Các câu hỏi bỏ ngỏ, rào cản kỹ thuật hoặc vấn đề cần bàn tiếp ở buổi họp sau.',
      format: 'list',
    },
  ],
};

/**
 * Returns the built-in system default skill.
 */
export function getBuiltinSkill(): MeetingRecapSkill {
  return SYSTEM_DEFAULT_RECAP_SKILL;
}

/**
 * Returns ONLY custom skills created by the user / company.
 * Strictly filters out any built-in system skills so the standard skill is never displayed in the custom list.
 */
export function getCustomSkills(): MeetingRecapSkill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Strict filter: exclude built-in standard skills
    return parsed.filter((item) => item && typeof item === 'object' && !item.isBuiltin);
  } catch (err) {
    console.warn('Failed to parse custom recap skills from localStorage:', err);
    return [];
  }
}

/**
 * Saves a company custom skill into localStorage.
 * Guarantees isBuiltin is always false.
 */
export function saveCustomSkill(
  skill: Omit<MeetingRecapSkill, 'isBuiltin' | 'id'> & { id?: string }
): MeetingRecapSkill {
  const customSkills = getCustomSkills();
  const id = skill.id || `custom-skill-${Date.now()}`;
  const now = new Date().toISOString();

  const newSkill: MeetingRecapSkill = {
    ...skill,
    id,
    isBuiltin: false, // Always non-builtin for company custom skills
    createdAt: skill.id ? (customSkills.find((s) => s.id === skill.id)?.createdAt || now) : now,
  };

  const existingIndex = customSkills.findIndex((s) => s.id === id);
  if (existingIndex >= 0) {
    customSkills[existingIndex] = newSkill;
  } else {
    customSkills.push(newSkill);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customSkills));
  }

  return newSkill;
}

/**
 * Deletes a company custom skill by ID.
 */
export function deleteCustomSkill(id: string): boolean {
  const customSkills = getCustomSkills();
  const filtered = customSkills.filter((s) => s.id !== id);
  if (filtered.length === customSkills.length) return false;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  return true;
}

/**
 * Resolves the active skill.
 * If skillId matches a company custom skill, return it.
 * Otherwise, falls back to the smart built-in standard skill.
 */
export function getActiveSkill(skillId?: string): MeetingRecapSkill {
  if (skillId && skillId !== 'default' && skillId !== SYSTEM_DEFAULT_RECAP_SKILL.id) {
    const custom = getCustomSkills().find((s) => s.id === skillId);
    if (custom) return custom;
  }
  return SYSTEM_DEFAULT_RECAP_SKILL;
}

/**
 * Imports custom skills from JSON string.
 */
export function importCustomSkillsFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    const list: unknown[] = Array.isArray(data) ? data : [data];
    const current = getCustomSkills();
    let importedCount = 0;

    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Partial<MeetingRecapSkill>;
      if (!candidate.name || typeof candidate.name !== 'string') continue;

      const validSkill: MeetingRecapSkill = {
        id: candidate.id || `custom-skill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: candidate.name.trim(),
        description: candidate.description?.trim() || 'Kỹ năng tóm tắt tùy biến cho công ty',
        targetDepartment: candidate.targetDepartment?.trim() || 'Nội bộ',
        customKeywords: Array.isArray(candidate.customKeywords) ? candidate.customKeywords.map(String) : [],
        sections: Array.isArray(candidate.sections) ? candidate.sections : [],
        isBuiltin: false, // Enforce false
        createdAt: new Date().toISOString(),
      };

      const existingIndex = current.findIndex((s) => s.id === validSkill.id);
      if (existingIndex >= 0) {
        current[existingIndex] = validSkill;
      } else {
        current.push(validSkill);
      }
      importedCount++;
    }

    if (importedCount > 0 && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }

    return { success: true, count: importedCount };
  } catch (e) {
    return { success: false, count: 0, error: (e as Error).message };
  }
}

/**
 * Exports all company custom skills as a formatted JSON string.
 */
export function exportCustomSkillsToJson(): string {
  const list = getCustomSkills();
  return JSON.stringify(list, null, 2);
}
