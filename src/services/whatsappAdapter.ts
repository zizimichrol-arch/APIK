import { ChatMessage } from '../types';
import { storageService } from './storageService';

export interface SendMessageOptions {
  quickReplies?: string[];
  moduleReference?: string;
  isDraftNotice?: boolean;
}

export const whatsappAdapter = {
  /**
   * Mengirim pesan template WhatsApp Business (misal untuk inisiasi onboarding pertama atau check-in terjadwal).
   */
  sendTemplate(
    alumniId: string,
    templateName: string,
    renderedText: string,
    quickReplies?: string[]
  ): ChatMessage | null {
    const db = storageService.getDatabase();
    const alumni = db.alumni.find((a) => a.id === alumniId);
    if (!alumni) return null;

    // Mode Jeda: Jangan kirim pesan
    if (db.settings.agentMode === 'Jeda') {
      storageService.addAgentLog({
        alumniId,
        alumniName: alumni.name,
        category: 'scheduler',
        title: `Pesan Template Ditahan (Mode Jeda): ${templateName}`,
        details: `Pesan tidak dikirim karena Mode Agen sedang "Jeda".`,
        status: 'warning',
      });
      return null;
    }

    // Mode Dry run: Susun dan catat di Agent Log tetapi tidak dikirim ke chat
    if (db.settings.agentMode === 'Dry run') {
      storageService.addAgentLog({
        alumniId,
        alumniName: alumni.name,
        category: 'dry_run',
        title: `[DRY RUN] sendTemplate (${templateName})`,
        details: `Pesan disusun namun tidak dikirim ke WhatsApp: "${renderedText}"`,
        status: 'success',
      });
      return null;
    }

    // Cek batas pesan harian
    if (alumni.messagesSentToday >= db.settings.maxMessagesPerAlumniPerDay) {
      storageService.addAgentLog({
        alumniId,
        alumniName: alumni.name,
        category: 'error',
        title: 'Batas Pesan Harian Tercapai',
        details: `Batas ${db.settings.maxMessagesPerAlumniPerDay} pesan/hari untuk ${alumni.name} telah tercapai.`,
        status: 'warning',
      });
      return null;
    }

    const msg = storageService.addMessage({
      alumniId,
      sender: 'agent',
      text: renderedText,
      quickReplies,
      isTemplate: true,
    });

    storageService.updateAlumni(alumniId, (a) => ({
      ...a,
      messagesSentToday: a.messagesSentToday + 1,
      lastMessageDate: db.simulatedDate,
    }));

    storageService.addAgentLog({
      alumniId,
      alumniName: alumni.name,
      category: 'message',
      title: `WhatsApp Template Terkirim (${templateName})`,
      details: renderedText,
      status: 'success',
    });

    return msg;
  },

  /**
   * Mengirim pesan percakapan biasa dari Agen ke Alumni melalui simulasi WhatsApp.
   */
  sendMessage(
    alumniId: string,
    text: string,
    options?: SendMessageOptions
  ): ChatMessage | null {
    const db = storageService.getDatabase();
    const alumni = db.alumni.find((a) => a.id === alumniId);
    if (!alumni) return null;

    if (db.settings.agentMode === 'Jeda') {
      storageService.addAgentLog({
        alumniId,
        alumniName: alumni.name,
        category: 'message',
        title: 'Pesan Agen Ditahan (Mode Jeda)',
        details: text,
        status: 'warning',
      });
      return null;
    }

    if (db.settings.agentMode === 'Dry run') {
      storageService.addAgentLog({
        alumniId,
        alumniName: alumni.name,
        category: 'dry_run',
        title: '[DRY RUN] sendMessage Disusun (Tidak Dikirim)',
        details: text,
        status: 'success',
      });
      return null;
    }

    if (alumni.messagesSentToday >= db.settings.maxMessagesPerAlumniPerDay) {
      storageService.addAgentLog({
        alumniId,
        alumniName: alumni.name,
        category: 'error',
        title: 'Batas Pesan Harian Tercapai',
        details: `Tidak dapat mengirim pesan ke ${alumni.name}: melebihi batas ${db.settings.maxMessagesPerAlumniPerDay} pesan/hari.`,
        status: 'warning',
      });
      return null;
    }

    const msg = storageService.addMessage({
      alumniId,
      sender: 'agent',
      text,
      quickReplies: options?.quickReplies,
      moduleReference: options?.moduleReference,
      isDraftNotice: options?.isDraftNotice,
    });

    storageService.updateAlumni(alumniId, (a) => ({
      ...a,
      messagesSentToday: a.messagesSentToday + 1,
      lastMessageDate: db.simulatedDate,
    }));

    storageService.addAgentLog({
      alumniId,
      alumniName: alumni.name,
      category: 'message',
      title: 'Pesan WhatsApp Terkirim ke Alumni',
      details: text,
      status: 'success',
    });

    return msg;
  },
};
