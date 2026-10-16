import {
  ActionPlan,
  ActionPlanStatus,
  AgentLogEntry,
  AgentSettings,
  Alumni,
  ChatMessage,
  CheckinRecord,
  ConsentLogEntry,
  ConsentStatus,
  EscalationItem,
  EvidenceItem,
  KnowledgeSection,
  StorageDatabase,
} from '../types';
import { INITIAL_SEED_DATA } from '../data/seedData';

const STORAGE_KEY = 'apik_komdigi_bandung_db_v1';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export const storageService = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getDatabase(): StorageDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = structuredClone(INITIAL_SEED_DATA);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw) as StorageDatabase;
    } catch (e) {
      console.error('Failed to read localStorage, falling back to seed:', e);
      return structuredClone(INITIAL_SEED_DATA);
    }
  },

  saveDatabase(db: StorageDatabase): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    notifyListeners();
  },

  resetToSeed(): StorageDatabase {
    const seed = structuredClone(INITIAL_SEED_DATA);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    notifyListeners();
    return seed;
  },

  // Clock & Simulation Helpers
  getSimulatedDateTime(): { date: string; time: string } {
    const db = this.getDatabase();
    return { date: db.simulatedDate, time: db.simulatedTime };
  },

  advanceDays(days: number): string {
    const db = this.getDatabase();
    const current = new Date(`${db.simulatedDate}T12:00:00`);
    current.setDate(current.getDate() + days);
    // Ensure working day if workingDaysOnly is enabled (skip Saturday/Sunday)
    if (db.settings.workingDaysOnly) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 6) current.setDate(current.getDate() + 2); // Sat -> Mon
      if (dayOfWeek === 0) current.setDate(current.getDate() + 1); // Sun -> Mon
    }
    const nextDateStr = current.toISOString().slice(0, 10);
    db.simulatedDate = nextDateStr;
    // Reset daily message counters
    db.alumni.forEach((a) => {
      a.messagesSentToday = 0;
      a.lastMessageDate = nextDateStr;
    });
    this.saveDatabase(db);
    return nextDateStr;
  },

  setSimulatedTime(time: string): void {
    const db = this.getDatabase();
    db.simulatedTime = time;
    this.saveDatabase(db);
  },

  // Alumni CRUD
  getAlumniList(): Alumni[] {
    return this.getDatabase().alumni;
  },

  getAlumniById(id: string): Alumni | undefined {
    return this.getDatabase().alumni.find((a) => a.id === id);
  },

  updateAlumni(id: string, updater: (alumni: Alumni) => Alumni): Alumni | undefined {
    const db = this.getDatabase();
    const idx = db.alumni.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    db.alumni[idx] = updater(db.alumni[idx]);
    this.saveDatabase(db);
    return db.alumni[idx];
  },

  addAlumniBatch(newAlumniList: Alumni[]): { added: number; duplicates: string[] } {
    const db = this.getDatabase();
    const existingPhones = new Set(db.alumni.map((a) => normalizePhone(a.whatsapp)));
    const duplicates: string[] = [];
    let added = 0;

    for (const item of newAlumniList) {
      const norm = normalizePhone(item.whatsapp);
      if (existingPhones.has(norm)) {
        duplicates.push(`${item.name} (${item.whatsapp})`);
      } else {
        existingPhones.add(norm);
        db.alumni.push(item);
        added++;
      }
    }

    if (added > 0) {
      this.saveDatabase(db);
    }
    return { added, duplicates };
  },

  updateConsentStatus(alumniId: string, newStatus: ConsentStatus, reason: string): void {
    const db = this.getDatabase();
    const idx = db.alumni.findIndex((a) => a.id === alumniId);
    if (idx === -1) return;
    const prev = db.alumni[idx].consentStatus;
    db.alumni[idx].consentStatus = newStatus;
    if (newStatus === 'agreed') {
      db.alumni[idx].consentTimestamp = `${db.simulatedDate}T${db.simulatedTime}:00Z`;
    }
    const logEntry: ConsentLogEntry = {
      id: `clog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      alumniId,
      alumniName: db.alumni[idx].name,
      previousStatus: prev,
      newStatus,
      reason,
      timestamp: `${db.simulatedDate} ${db.simulatedTime}`,
    };
    db.consentLogs.unshift(logEntry);
    db.agentLogs.unshift({
      id: `alog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: `${db.simulatedDate} ${db.simulatedTime}:00`,
      alumniId,
      alumniName: db.alumni[idx].name,
      category: 'consent',
      title: `Perubahan Persetujuan: ${prev} → ${newStatus}`,
      details: reason,
      status: newStatus === 'agreed' ? 'success' : 'warning',
    });
    this.saveDatabase(db);
  },

  deleteAlumniPersonalData(alumniId: string): void {
    const db = this.getDatabase();
    const idx = db.alumni.findIndex((a) => a.id === alumniId);
    if (idx === -1) return;
    const alumni = db.alumni[idx];
    const prevStatus = alumni.consentStatus;

    // Record in consent log before anonymizing/removing personal data
    db.consentLogs.unshift({
      id: `clog-${Date.now()}`,
      alumniId,
      alumniName: alumni.name,
      previousStatus: prevStatus,
      newStatus: 'deleted',
      reason: 'Subjek data mengeksekusi hak HAPUS DATA (Right to Erasure) melalui WhatsApp.',
      timestamp: `${db.simulatedDate} ${db.simulatedTime}`,
    });

    db.agentLogs.unshift({
      id: `alog-${Date.now()}`,
      timestamp: `${db.simulatedDate} ${db.simulatedTime}:00`,
      alumniId,
      alumniName: alumni.name,
      category: 'consent',
      title: 'Penghapusan Data Pribadi (HAPUS DATA)',
      details: 'Seluruh rencana aksi, bukti, dan riwayat percakapan alumni telah dihapus atas permintaan subjek data.',
      status: 'warning',
    });

    // Clear action plan, evidences, checkins, escalations, and chat messages except confirmation
    db.evidences = db.evidences.filter((e) => e.alumniId !== alumniId);
    db.checkins = db.checkins.filter((c) => c.alumniId !== alumniId);
    db.escalations = db.escalations.filter((e) => e.alumniId !== alumniId);
    db.messages = db.messages.filter((m) => m.alumniId !== alumniId);

    db.alumni[idx] = {
      ...alumni,
      consentStatus: 'deleted',
      onboardingStep: 'none',
      awaitingCheckinReply: false,
      conversationSummary: 'Data pribadi & rencana aksi telah dihapus atas permintaan subjek data (HAPUS DATA).',
      actionPlan: {
        title: '[Data Dihapus atas Permintaan Alumni]',
        specificGoal: '',
        measurableIndicator: '',
        achievableSteps: '',
        relevantImpact: '',
        targetCompletionDate: db.simulatedDate,
        status: 'Terhenti',
        milestones: [],
        updatedAt: db.simulatedDate,
      },
    };

    this.saveDatabase(db);
  },

  // Messages
  getMessagesForAlumni(alumniId: string): ChatMessage[] {
    return this.getDatabase().messages.filter((m) => m.alumniId === alumniId);
  },

  addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp?: string }): ChatMessage {
    const db = this.getDatabase();
    const fullMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: msg.timestamp || `${db.simulatedDate} ${db.simulatedTime}`,
    };
    db.messages.push(fullMsg);
    this.saveDatabase(db);
    return fullMsg;
  },

  setMessageFeedback(messageId: string, feedback: 'up' | 'down'): void {
    const db = this.getDatabase();
    const msg = db.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.feedback = feedback;
      this.saveDatabase(db);
    }
  },

  // Knowledge Base
  getKnowledgeBase(): KnowledgeSection[] {
    return this.getDatabase().knowledgeBase;
  },

  searchKnowledgeBase(query: string, trainingId?: string): KnowledgeSection[] {
    const db = this.getDatabase();
    const active = db.knowledgeBase.filter((k) => k.isActive);
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    if (terms.length === 0) return [];

    const scored = active
      .map((sec) => {
        let score = 0;
        const hay = `${sec.moduleTitle} ${sec.chapterTitle} ${sec.content} ${sec.keywords.join(' ')}`.toLowerCase();
        for (const term of terms) {
          if (sec.keywords.some((kw) => kw.toLowerCase().includes(term))) score += 4;
          if (sec.chapterTitle.toLowerCase().includes(term)) score += 3;
          if (hay.includes(term)) score += 2;
        }
        if (trainingId && sec.trainingId === trainingId) {
          score = score > 0 ? score + 1 : 0;
        }
        return { sec, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map((s) => s.sec);
  },

  saveKnowledgeSection(section: Omit<KnowledgeSection, 'id' | 'updatedAt'> & { id?: string }): KnowledgeSection {
    const db = this.getDatabase();
    if (section.id) {
      const idx = db.knowledgeBase.findIndex((k) => k.id === section.id);
      if (idx !== -1) {
        db.knowledgeBase[idx] = {
          ...db.knowledgeBase[idx],
          ...section,
          id: section.id,
          updatedAt: db.simulatedDate,
        };
        this.saveDatabase(db);
        return db.knowledgeBase[idx];
      }
    }
    const created: KnowledgeSection = {
      ...section,
      id: `kb-${Date.now()}`,
      updatedAt: db.simulatedDate,
    };
    db.knowledgeBase.push(created);
    this.saveDatabase(db);
    return created;
  },

  toggleKnowledgeSectionActive(id: string): void {
    const db = this.getDatabase();
    const sec = db.knowledgeBase.find((k) => k.id === id);
    if (sec) {
      sec.isActive = !sec.isActive;
      sec.updatedAt = db.simulatedDate;
      this.saveDatabase(db);
    }
  },

  // Action Plan & Evidence & Escalation
  updateActionPlan(
    alumniId: string,
    fields?: Partial<ActionPlan>,
    milestones?: { title: string; targetDate: string; completed?: boolean }[],
    status?: ActionPlanStatus | string
  ): { appliedStatus: ActionPlanStatus; proposedCompleted: boolean } {
    const db = this.getDatabase();
    const idx = db.alumni.findIndex((a) => a.id === alumniId);
    if (idx === -1) throw new Error('Alumni tidak ditemukan');

    const currentPlan = db.alumni[idx].actionPlan;
    let appliedStatus: ActionPlanStatus = currentPlan.status;
    let proposedCompleted = Boolean(currentPlan.proposedCompleted);

    if (status) {
      const normalized = status.toLowerCase();
      if (normalized === 'selesai' || normalized === 'completed') {
        // Governance rule FR-05: "Selesai" only stored as proposal until verified by Instructor
        proposedCompleted = true;
        appliedStatus = currentPlan.verifiedByInstructor ? 'Selesai' : 'Berjalan';
      } else if (normalized.includes('berjalan') || normalized === 'in_progress') {
        appliedStatus = 'Berjalan';
      } else if (normalized.includes('terhenti') || normalized === 'stalled') {
        appliedStatus = 'Terhenti';
      } else if (normalized.includes('perhatian') || normalized === 'needs_attention') {
        appliedStatus = 'Perlu Perhatian';
      } else if (normalized.includes('belum')) {
        appliedStatus = 'Belum mulai';
      }
    }

    const updatedMilestones = milestones
      ? milestones.map((m, i) => ({
          id: `ms-${Date.now()}-${i}`,
          title: m.title,
          targetDate: m.targetDate,
          completed: Boolean(m.completed),
        }))
      : currentPlan.milestones;

    db.alumni[idx].actionPlan = {
      ...currentPlan,
      ...(fields || {}),
      status: appliedStatus,
      proposedCompleted,
      milestones: updatedMilestones,
      updatedAt: db.simulatedDate,
    };

    if (db.alumni[idx].onboardingStep !== 'active' && updatedMilestones.length > 0) {
      db.alumni[idx].onboardingStep = 'active';
    }

    this.saveDatabase(db);
    return { appliedStatus, proposedCompleted };
  },

  saveEvidence(item: Omit<EvidenceItem, 'id' | 'submittedAt' | 'verificationStatus'>): EvidenceItem {
    const db = this.getDatabase();
    const created: EvidenceItem = {
      ...item,
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      verificationStatus: 'pending',
      submittedAt: `${db.simulatedDate}T${db.simulatedTime}:00Z`,
    };
    db.evidences.unshift(created);
    this.saveDatabase(db);
    return created;
  },

  verifyEvidenceAndPlan(
    evidenceId: string,
    approve: boolean,
    instructorFeedback: string
  ): void {
    const db = this.getDatabase();
    const ev = db.evidences.find((e) => e.id === evidenceId);
    if (!ev) return;

    ev.verificationStatus = approve ? 'verified' : 'rejected';
    ev.instructorFeedback = instructorFeedback;
    ev.verifiedAt = `${db.simulatedDate}T${db.simulatedTime}:00Z`;

    const alumni = db.alumni.find((a) => a.id === ev.alumniId);
    if (alumni) {
      if (approve) {
        alumni.actionPlan.status = 'Selesai';
        alumni.actionPlan.proposedCompleted = true;
        alumni.actionPlan.verifiedByInstructor = true;
        alumni.actionPlan.verifiedAt = db.simulatedDate;
        alumni.actionPlan.verifierNotes = instructorFeedback;
        alumni.actionPlan.milestones = alumni.actionPlan.milestones.map((m) => ({
          ...m,
          completed: true,
        }));
      } else {
        alumni.actionPlan.proposedCompleted = false;
        alumni.actionPlan.verifiedByInstructor = false;
        alumni.actionPlan.verifierNotes = instructorFeedback;
      }

      db.messages.push({
        id: `msg-${Date.now()}`,
        alumniId: alumni.id,
        sender: 'instruktur',
        text: approve
          ? `Selamat ${alumni.salutation} ${alumni.name}! Saya telah memverifikasi bukti penerapan Anda ("${ev.description}"). Status Rencana Aksi Anda kini resmi dinyatakan **SELESAI**. Catatan Instruktur: "${instructorFeedback}"`
          : `Halo ${alumni.salutation} ${alumni.name}, terkait bukti penerapan yang Anda kirimkan ("${ev.description}"), mohon dapat dilengkapi terlebih dahulu. Catatan Instruktur: "${instructorFeedback}"`,
        timestamp: `${db.simulatedDate} ${db.simulatedTime}`,
      });
    }

    this.saveDatabase(db);
  },

  createEscalation(
    item: Omit<EscalationItem, 'id' | 'createdAt' | 'status'>
  ): EscalationItem {
    const db = this.getDatabase();
    // Avoid creating duplicate open escalation if one already exists for same alumni
    const existingOpen = db.escalations.find(
      (e) => e.alumniId === item.alumniId && e.status === 'open'
    );
    if (existingOpen) {
      existingOpen.summary = item.summary;
      existingOpen.recommendation = item.recommendation;
      existingOpen.priority = item.priority;
      existingOpen.trigger = item.trigger;
      existingOpen.lastMessageQuote = item.lastMessageQuote;
      this.saveDatabase(db);
      return existingOpen;
    }

    const created: EscalationItem = {
      ...item,
      id: `esc-${Date.now().toString().slice(-4)}`,
      status: 'open',
      createdAt: `${db.simulatedDate}T${db.simulatedTime}:00Z`,
    };
    db.escalations.unshift(created);
    this.saveDatabase(db);
    return created;
  },

  closeEscalation(escalationId: string, resolutionNotes: string): void {
    const db = this.getDatabase();
    const esc = db.escalations.find((e) => e.id === escalationId);
    if (!esc) return;
    esc.status = 'closed';
    esc.closedAt = `${db.simulatedDate}T${db.simulatedTime}:00Z`;
    esc.resolutionNotes = resolutionNotes;

    const alumni = db.alumni.find((a) => a.id === esc.alumniId);
    if (alumni) {
      alumni.unansweredTechQuestionsCount = 0;
      if (alumni.actionPlan.status === 'Terhenti') {
        alumni.actionPlan.status = 'Berjalan';
      }
    }
    this.saveDatabase(db);
  },

  logCheckin(
    alumniId: string,
    summary: string,
    progressStatus: ActionPlanStatus,
    nextCheckinDays: number
  ): CheckinRecord {
    const db = this.getDatabase();
    const nextDate = addDaysToDateString(db.simulatedDate, nextCheckinDays || db.settings.checkinIntervalDays);
    const rec: CheckinRecord = {
      id: `chk-${Date.now()}`,
      alumniId,
      date: db.simulatedDate,
      summary,
      progressStatus,
      nextCheckinDate: nextDate,
      reminderCount: 0,
      responded: true,
    };
    db.checkins.unshift(rec);

    const alumni = db.alumni.find((a) => a.id === alumniId);
    if (alumni) {
      alumni.nextCheckinDate = nextDate;
      alumni.awaitingCheckinReply = false;
      alumni.reminderStage = 0;
      if (progressStatus === 'Selesai') {
        alumni.actionPlan.proposedCompleted = true;
      } else {
        alumni.actionPlan.status = progressStatus;
      }
      alumni.conversationSummary = summary;
    }

    this.saveDatabase(db);
    return rec;
  },

  addAgentLog(entry: Omit<AgentLogEntry, 'id' | 'timestamp'>): AgentLogEntry {
    const db = this.getDatabase();
    const created: AgentLogEntry = {
      ...entry,
      id: `alog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: `${db.simulatedDate} ${db.simulatedTime}:${String(new Date().getSeconds()).padStart(2, '0')}`,
    };
    db.agentLogs.unshift(created);
    this.saveDatabase(db);
    return created;
  },

  updateSettings(newSettings: AgentSettings): void {
    const db = this.getDatabase();
    db.settings = newSettings;
    this.saveDatabase(db);
  },
};

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) return '0' + digits.slice(2);
  if (digits.startsWith('8')) return '0' + digits;
  return digits;
}

export function maskWhatsAppNumber(phone: string): string {
  const clean = normalizePhone(phone);
  if (clean.length <= 7) return clean;
  return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
}

export function sanitizePIIFromMessage(rawText: string): {
  sanitizedText: string;
  hadNIK: boolean;
  hadPhone: boolean;
} {
  let hadNIK = false;
  let hadPhone = false;

  // Mask 16-digit NIK patterns
  const nikRegex = /\b\d{16}\b/g;
  let sanitizedText = rawText.replace(nikRegex, (match) => {
    hadNIK = true;
    return `${match.slice(0, 4)}********${match.slice(-4)} [NIK-DISAMARKAN]`;
  });

  // Mask phone numbers (10-14 digits starting with 08 or +628 or 628)
  const phoneRegex = /(\+62|62|0)8\d{8,11}\b/g;
  sanitizedText = sanitizedText.replace(phoneRegex, (match) => {
    hadPhone = true;
    return `${match.slice(0, 4)}****${match.slice(-3)} [NO-TELP-DISAMARKAN]`;
  });

  return { sanitizedText, hadNIK, hadPhone };
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2);
  if (dow === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function daysBetweenDates(startStr: string, endStr: string): number {
  const d1 = new Date(`${startStr}T00:00:00`).getTime();
  const d2 = new Date(`${endStr}T00:00:00`).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}
