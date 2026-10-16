import React, { useState } from 'react';
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
  Award,
  Sparkles,
  Clock,
} from 'lucide-react';
import { EscalationItem, EvidenceItem, StorageDatabase } from '../types';
import { storageService, maskWhatsAppNumber } from '../services/storageService';

interface InstructorProps {
  db: StorageDatabase;
  onOpenChatForAlumni: (alumniId: string) => void;
}

/**
 * Halaman Kotak Eskalasi (Instruktur - FR-04)
 */
export const EscalationInboxView: React.FC<InstructorProps> = ({
  db,
  onOpenChatForAlumni,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const escalations = db.escalations.filter(
    (e) => statusFilter === 'all' || e.status === statusFilter
  );

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleSendInstructorReply = (esc: EscalationItem) => {
    const text = (replyTexts[esc.id] || '').trim();
    if (!text) return;

    const alumni = db.alumni.find((a) => a.id === esc.alumniId);
    if (!alumni) return;

    storageService.addMessage({
      alumniId: esc.alumniId,
      sender: 'instruktur',
      text,
    });

    storageService.addAgentLog({
      alumniId: esc.alumniId,
      alumniName: alumni.name,
      category: 'message',
      title: `Balasan Instruktur (${esc.instructorName}) ke Chat Alumni`,
      details: text,
      status: 'success',
    });

    setReplyTexts({ ...replyTexts, [esc.id]: '' });
    showToast(`Pesan Instruktur berhasil dikirim ke WhatsApp ${alumni.name}.`);
  };

  const handleCloseEscalation = (esc: EscalationItem) => {
    const alumni = db.alumni.find((a) => a.id === esc.alumniId);
    const note =
      (resolutionNotes[esc.id] || '').trim() ||
      'Kendala telah diberikan solusi dan arahan oleh Instruktur. Pendampingan dikembalikan ke Agen APIK.';

    // Jika ada teks balasan yang sedang diketik namun belum dikirim, kirimkan sekalian
    const pendingReply = (replyTexts[esc.id] || '').trim();
    if (pendingReply) {
      storageService.addMessage({
        alumniId: esc.alumniId,
        sender: 'instruktur',
        text: pendingReply,
      });
    }

    storageService.closeEscalation(esc.id, note);

    storageService.addMessage({
      alumniId: esc.alumniId,
      sender: 'system',
      text: `✅ Tiket Eskalasi #${esc.id} telah ditutup oleh Instruktur ${esc.instructorName}. Catatan Penyelesaian: "${note}". Agen APIK kini aktif kembali mendampingi Anda.`,
    });

    storageService.addAgentLog({
      alumniId: esc.alumniId,
      alumniName: alumni?.name || esc.alumniId,
      category: 'message',
      title: `Tiket Eskalasi #${esc.id} Ditutup oleh Instruktur`,
      details: note,
      status: 'success',
    });

    showToast(`Tiket eskalasi #${esc.id} ditutup. Agen kembali aktif untuk ${alumni?.name}.`);
  };

  const getTriggerLabel = (trigger: EscalationItem['trigger']) => {
    switch (trigger) {
      case 'MENTOR_COMMAND':
        return 'Permintaan Langsung Alumni (MENTOR)';
      case 'UNANSWERED_2X':
        return 'Jawaban Modul Tidak Ditemukan 2x';
      case 'NON_TECHNICAL_BLOCKER':
        return 'Kendala Non-Teknis / Birokrasi';
      case 'STALLED_PLAN':
        return 'Rencana Aksi Terhenti';
      case 'SENSITIVE_ISSUE':
        return 'Indikasi Sensitif / Tekanan Kerja';
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            Kotak Eskalasi Instruktur / Mentor (FR-04)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Tinjau ringkasan masalah yang dieskalasi oleh APIK, balas langsung ke ruang WhatsApp alumni (tampil sebagai "Instruktur"), dan tutup tiket setelah selesai.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F4F6F9] p-1 rounded-lg border border-[#C8D6E5]">
          {[
            {
              id: 'open',
              label: `Terbuka (${db.escalations.filter((e) => e.status === 'open').length})`,
            },
            {
              id: 'closed',
              label: `Selesai (${db.escalations.filter((e) => e.status === 'closed').length})`,
            },
            { id: 'all', label: `Semua (${db.escalations.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as 'all' | 'open' | 'closed')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#1B3A6B] text-white'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {feedbackToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-[#2E7D32] px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>✓ {feedbackToast}</span>
        </div>
      )}

      {escalations.length === 0 ? (
        <div className="bg-white border border-[#C8D6E5] rounded-xl p-10 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#2E7D32] mx-auto" />
          <div className="text-sm font-bold text-[#1B3A6B]">
            Tidak Ada Tiket Eskalasi pada Kategori Ini
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Saat alumni mengetik <code>MENTOR</code> atau menghadapi kendala non-teknis di Simulator WhatsApp, tiket eskalasi baru akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((esc) => {
            const alumni = db.alumni.find((a) => a.id === esc.alumniId);
            const training = db.trainings.find((t) => t.id === esc.trainingId);
            const alumniMessages = db.messages
              .filter((m) => m.alumniId === esc.alumniId)
              .slice(-4);

            return (
              <div
                key={esc.id}
                className="bg-white border border-[#C8D6E5] rounded-xl p-5 space-y-4"
              >
                {/* Header Eskalasi */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#C8D6E5] pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#1B3A6B]">
                        #{esc.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          esc.priority === 'Tinggi'
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-amber-50 text-[#E67E22] border border-amber-300'
                        }`}
                      >
                        Prioritas {esc.priority}
                      </span>
                      <span className="text-xs font-semibold text-[#0D6E8A]">
                        · {getTriggerLabel(esc.trigger)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          esc.status === 'open'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-50 text-[#2E7D32]'
                        }`}
                      >
                        {esc.status === 'open' ? 'Eskalasi Terbuka' : 'Sudah Ditutup'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {alumni?.salutation} {alumni?.name} — {alumni?.institution} ({alumni?.cityOrRegency})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pelatihan: {training?.name} · Instruktur Penanggung Jawab:{' '}
                      <strong>{esc.instructorName}</strong> · WA:{' '}
                      {alumni ? maskWhatsAppNumber(alumni.whatsapp) : '-'}
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenChatForAlumni(esc.alumniId)}
                    className="px-3 py-1.5 bg-[#F4F6F9] hover:bg-slate-200 text-[#1B3A6B] rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#C8D6E5]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Lihat di Simulator WA</span>
                  </button>
                </div>

                {/* Ringkasan Agen AI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#F4F6F9] p-3.5 rounded-lg border border-[#C8D6E5] space-y-2">
                    <div>
                      <span className="font-bold text-[#1B3A6B] block">
                        Rencana Aksi Alumni:
                      </span>
                      <span className="text-slate-800 font-medium">
                        {alumni?.actionPlan.title}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-[#1B3A6B] block">
                        Ringkasan Masalah (Disusun APIK):
                      </span>
                      <p className="text-slate-700 leading-relaxed">{esc.summary}</p>
                    </div>
                    <div>
                      <span className="font-bold text-[#1B3A6B] block">
                        Langkah yang Sudah Dicoba:
                      </span>
                      <p className="text-slate-600">{esc.attemptedSteps}</p>
                    </div>
                  </div>

                  <div className="bg-[#F4F6F9] p-3.5 rounded-lg border border-[#C8D6E5] space-y-2">
                    <div>
                      <span className="font-bold text-[#1B3A6B] block">
                        Kutipan Pesan Terakhir Alumni:
                      </span>
                      <blockquote className="italic text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-1">
                        "{esc.lastMessageQuote}"
                      </blockquote>
                    </div>
                    <div>
                      <span className="font-bold text-[#0D6E8A] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Rekomendasi Tindak Lanjut Agen:
                      </span>
                      <p className="text-slate-700 leading-relaxed mt-0.5">
                        {esc.recommendation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cuplikan Chat Terakhir */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-600 text-[11px]">
                    Riwayat Pesan Terkini:
                  </div>
                  {alumniMessages.map((m) => (
                    <div key={m.id} className="text-slate-700">
                      <span className="font-bold text-[#1B3A6B]">
                        [{m.sender.toUpperCase()}]:
                      </span>{' '}
                      {m.text}
                    </div>
                  ))}
                </div>

                {/* Form Balas Langsung & Tutup Eskalasi */}
                {esc.status === 'open' ? (
                  <div className="pt-2 border-t border-[#C8D6E5] space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={replyTexts[esc.id] || ''}
                        onChange={(e) =>
                          setReplyTexts({ ...replyTexts, [esc.id]: e.target.value })
                        }
                        placeholder={`Ketik balasan bimbingan sebagai Instruktur (${esc.instructorName})...`}
                        className="flex-1 px-3.5 py-2 text-xs border border-[#C8D6E5] rounded-lg focus:outline-none focus:border-[#0D6E8A]"
                      />
                      <button
                        onClick={() =>
                          setReplyTexts({
                            ...replyTexts,
                            [esc.id]: `Halo ${alumni?.salutation} ${alumni?.name}, saya ${esc.instructorName}. Untuk mengatasi kendala tersebut, silakan fokus merampungkan draf purwarupa di tingkat internal unit kerja terlebih dahulu sebagai bukti capaian kompetensi. Saya mendukung penyesuaian target indikator Anda.`,
                          })
                        }
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium whitespace-nowrap"
                      >
                        Isi Contoh Arahan Instruktur
                      </button>
                      <button
                        onClick={() => handleSendInstructorReply(esc)}
                        className="px-4 py-2 bg-[#0D6E8A] hover:bg-[#1B3A6B] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Balasan ke Chat Alumni</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#F4F6F9] p-3 rounded-lg border border-[#C8D6E5]">
                      <input
                        type="text"
                        value={resolutionNotes[esc.id] || ''}
                        onChange={(e) =>
                          setResolutionNotes({
                            ...resolutionNotes,
                            [esc.id]: e.target.value,
                          })
                        }
                        placeholder="Catatan penutupan eskalasi (opsional)..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#C8D6E5] rounded-lg"
                      />
                      <button
                        onClick={() => handleCloseEscalation(esc)}
                        className="px-4 py-2 bg-[#2E7D32] hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tutup Eskalasi & Aktifkan Kembali Agen</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#2E7D32] bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <strong>Catatan Penyelesaian ({esc.closedAt?.slice(0, 10)}):</strong>{' '}
                    {esc.resolutionNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Halaman Verifikasi Bukti Penerapan (Instruktur - FR-05)
 */
export const EvidenceVerificationView: React.FC<InstructorProps> = ({
  db,
  onOpenChatForAlumni,
}) => {
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified'>(
    'all'
  );
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const evidences = db.evidences.filter(
    (e) => statusFilter === 'all' || e.verificationStatus === statusFilter
  );

  const handleVerify = (ev: EvidenceItem, approve: boolean) => {
    const defaultNote = approve
      ? 'Bukti penerapan telah diperiksa dan memenuhi kriteria rencana aksi SMART serta kaidah modul pelatihan. Status rencana aksi disahkan menjadi Selesai.'
      : 'Mohon lengkapi dokumentasi hasil sebelum rencana aksi dapat disahkan selesai.';
    const note = (feedbackNotes[ev.id] || '').trim() || defaultNote;

    storageService.verifyEvidenceAndPlan(ev.id, approve, note);
    const alumni = db.alumni.find((a) => a.id === ev.alumniId);

    storageService.addAgentLog({
      alumniId: ev.alumniId,
      alumniName: alumni?.name || ev.alumniId,
      category: 'tool_call',
      title: approve
        ? `Verifikasi Instruktur: Rencana Aksi Disahkan SELESAI`
        : `Verifikasi Instruktur: Bukti Perlu Perbaikan`,
      details: note,
      status: approve ? 'success' : 'warning',
    });

    setVerifyNotice(
      approve
        ? `Bukti ${alumni?.name} berhasil diverifikasi! Status rencana aksi resmi berubah menjadi "Selesai" dan memperbarui KPI Dashboard Pimpinan.`
        : `Catatan revisi telah dikirim ke ${alumni?.name}.`
    );
    setTimeout(() => setVerifyNotice(null), 4000);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            Verifikasi Bukti Penerapan & Pengesahan Status "Selesai" (FR-05)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Sesuai tata kelola FR-05, status "Selesai" hanya diusulkan oleh Agen dan wajib diverifikasi oleh Instruktur sebelum dihitung sebagai capaian akhir.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F4F6F9] p-1 rounded-lg border border-[#C8D6E5]">
          {[
            {
              id: 'all',
              label: `Semua Bukti (${db.evidences.length})`,
            },
            {
              id: 'pending',
              label: `Menunggu Verifikasi (${
                db.evidences.filter((e) => e.verificationStatus === 'pending').length
              })`,
            },
            {
              id: 'verified',
              label: `Terverifikasi (${
                db.evidences.filter((e) => e.verificationStatus === 'verified').length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setStatusFilter(tab.id as 'all' | 'pending' | 'verified')
              }
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#1B3A6B] text-white'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {verifyNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-[#2E7D32] px-4 py-3 rounded-xl text-xs font-semibold">
          ✓ {verifyNotice}
        </div>
      )}

      <div className="space-y-4">
        {evidences.map((ev) => {
          const alumni = db.alumni.find((a) => a.id === ev.alumniId);
          const training = db.trainings.find((t) => t.id === ev.trainingId);

          return (
            <div
              key={ev.id}
              className="bg-white border border-[#C8D6E5] rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#C8D6E5] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        ev.verificationStatus === 'verified'
                          ? 'bg-emerald-50 text-[#2E7D32] border border-emerald-200'
                          : ev.verificationStatus === 'pending'
                          ? 'bg-amber-50 text-[#E67E22] border border-amber-300'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {ev.verificationStatus === 'verified'
                        ? 'Terverifikasi Selesai'
                        : ev.verificationStatus === 'pending'
                        ? 'Menunggu Verifikasi Instruktur'
                        : 'Perlu Revisi'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      · Jenis: {ev.type.toUpperCase()} · Izin Galeri Praktik Baik:{' '}
                      {ev.shareConsent ? 'Diizinkan' : 'Internal'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1B3A6B] mt-1">
                    {alumni?.salutation} {alumni?.name} — {alumni?.institution} ({alumni?.cityOrRegency})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pelatihan: {training?.name} · Rencana Aksi:{' '}
                    <strong>{alumni?.actionPlan.title}</strong>
                  </p>
                </div>

                <button
                  onClick={() => onOpenChatForAlumni(ev.alumniId)}
                  className="px-3 py-1.5 bg-[#F4F6F9] hover:bg-slate-200 text-[#1B3A6B] rounded-lg text-xs font-semibold border border-[#C8D6E5]"
                >
                  Buka Chat Alumni
                </button>
              </div>

              <div className="bg-[#F4F6F9] p-4 rounded-xl border border-[#C8D6E5] space-y-2 text-xs">
                <div className="font-bold text-slate-900">{ev.description}</div>
                {ev.type === 'image' && ev.content.startsWith('data:') ? (
                  <div className="pt-2">
                    <img
                      src={ev.content}
                      alt={ev.description}
                      referrerPolicy="no-referrer"
                      className="max-h-60 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                ) : ev.type === 'link' ? (
                  <div className="flex items-center gap-1.5 text-[#0D6E8A] font-mono break-all">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{ev.content}</span>
                  </div>
                ) : (
                  <p className="text-slate-700 leading-relaxed">{ev.content}</p>
                )}
              </div>

              {ev.verificationStatus === 'pending' ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={feedbackNotes[ev.id] || ''}
                    onChange={(e) =>
                      setFeedbackNotes({
                        ...feedbackNotes,
                        [ev.id]: e.target.value,
                      })
                    }
                    placeholder="Tulis catatan apresiasi atau umpan balik verifikasi Instruktur..."
                    className="flex-1 px-3.5 py-2 text-xs border border-[#C8D6E5] rounded-lg focus:outline-none focus:border-[#0D6E8A]"
                  />
                  <button
                    onClick={() => handleVerify(ev, true)}
                    className="px-4 py-2 bg-[#2E7D32] hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi & Sahkan Status "Selesai"</span>
                  </button>
                  <button
                    onClick={() => handleVerify(ev, false)}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Minta Revisi</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-[#2E7D32] bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <strong>Catatan Instruktur ({training?.instructorName}):</strong>{' '}
                    "{ev.instructorFeedback}"
                  </div>
                  <Award className="w-4 h-4 shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
