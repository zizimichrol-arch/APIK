export type RoleType = 'alumni' | 'admin' | 'instruktur' | 'pimpinan';

export type EmploymentStatus = 'PNS' | 'PPPK' | 'Non-ASN';

export type ConsentStatus = 'not_asked' | 'pending' | 'agreed' | 'declined' | 'stopped' | 'deleted';

export type ActionPlanStatus =
  | 'Belum mulai'
  | 'Berjalan'
  | 'Selesai'
  | 'Terhenti'
  | 'Perlu Perhatian';

export interface Milestone {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
}

export interface ActionPlan {
  title: string;
  specificGoal: string;
  measurableIndicator: string;
  achievableSteps: string;
  relevantImpact: string;
  targetCompletionDate: string; // YYYY-MM-DD
  status: ActionPlanStatus;
  proposedCompleted?: boolean; // True when AI proposes 'Selesai', awaiting Instructor verification
  verifiedByInstructor?: boolean;
  verifiedAt?: string;
  verifierNotes?: string;
  milestones: Milestone[];
  updatedAt: string;
}

export interface TrainingProgram {
  id: string;
  name: string;
  batch: string;
  instructorName: string;
  instructorNip: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface KnowledgeSection {
  id: string;
  trainingId: string;
  moduleTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  keywords: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  alumniId: string;
  trainingId: string;
  type: 'image' | 'link' | 'story';
  content: string; // base64/url or text story
  description: string;
  shareConsent: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  instructorFeedback?: string;
  submittedAt: string;
  verifiedAt?: string;
}

export interface CheckinRecord {
  id: string;
  alumniId: string;
  date: string;
  summary: string;
  progressStatus: ActionPlanStatus;
  nextCheckinDate: string;
  reminderCount: number;
  responded: boolean;
}

export interface ChatMessage {
  id: string;
  alumniId: string;
  sender: 'alumni' | 'agent' | 'instruktur' | 'system';
  text: string;
  timestamp: string;
  imageUrl?: string;
  quickReplies?: string[];
  moduleReference?: string;
  feedback?: 'up' | 'down';
  isDraftNotice?: boolean;
  isTemplate?: boolean;
  maskedNotice?: string;
}

export interface EscalationItem {
  id: string;
  alumniId: string;
  trainingId: string;
  instructorName: string;
  trigger: 'MENTOR_COMMAND' | 'UNANSWERED_2X' | 'NON_TECHNICAL_BLOCKER' | 'STALLED_PLAN' | 'SENSITIVE_ISSUE';
  priority: 'Normal' | 'Tinggi';
  status: 'open' | 'closed';
  summary: string;
  recommendation: string;
  attemptedSteps: string;
  lastMessageQuote: string;
  createdAt: string;
  closedAt?: string;
  resolutionNotes?: string;
}

export interface ConsentLogEntry {
  id: string;
  alumniId: string;
  alumniName: string;
  previousStatus: ConsentStatus;
  newStatus: ConsentStatus;
  reason: string;
  timestamp: string;
}

export interface AgentLogEntry {
  id: string;
  timestamp: string;
  alumniId: string;
  alumniName: string;
  category: 'message' | 'tool_call' | 'error' | 'consent' | 'scheduler' | 'dry_run';
  title: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  details: string;
  status: 'success' | 'warning' | 'error';
}

export interface AgentSettings {
  checkinIntervalDays: number; // 7 - 30, default 14
  sendWindowStart: string; // "07:00"
  sendWindowEnd: string; // "19:00"
  workingDaysOnly: boolean;
  mentoringDurationWeeks: number; // default 12
  maxReminders: number; // default 2 (H+3, H+7)
  maxMessagesPerAlumniPerDay: number; // default 10
  agentMode: 'Aktif' | 'Jeda' | 'Dry run';
}

export interface Alumni {
  id: string;
  name: string;
  salutation: 'Bapak' | 'Ibu';
  whatsapp: string;
  employmentStatus: EmploymentStatus;
  institution: string;
  position: string;
  cityOrRegency: string;
  province: 'Jawa Barat' | 'Banten';
  trainingId: string;
  consentStatus: ConsentStatus;
  consentTimestamp?: string;
  onboardingStep: 'none' | 'awaiting_consent' | 'confirming_profile' | 'drafting_plan' | 'active';
  actionPlan: ActionPlan;
  nextCheckinDate: string; // YYYY-MM-DD
  lastCheckinSentDate?: string; // YYYY-MM-DD
  awaitingCheckinReply: boolean;
  reminderStage: 0 | 1 | 2; // 0: none, 1: 3-day sent, 2: 7-day sent
  unansweredTechQuestionsCount: number;
  conversationSummary: string;
  messagesSentToday: number;
  lastMessageDate: string;
}

export interface StorageDatabase {
  simulatedDate: string; // YYYY-MM-DD
  simulatedTime: string; // HH:mm
  trainings: TrainingProgram[];
  alumni: Alumni[];
  knowledgeBase: KnowledgeSection[];
  evidences: EvidenceItem[];
  checkins: CheckinRecord[];
  messages: ChatMessage[];
  escalations: EscalationItem[];
  consentLogs: ConsentLogEntry[];
  agentLogs: AgentLogEntry[];
  settings: AgentSettings;
}
