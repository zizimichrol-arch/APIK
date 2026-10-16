import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  UserCheck,
  Sparkles,
  CheckCheck,
  FileWarning,
  X,
} from 'lucide-react';
import { Alumni, StorageDatabase } from '../types';
import { storageService, maskWhatsAppNumber } from '../services/storageService';
import {
  handleIncomingAlumniMessage,
  startOnboardingForAlumni,
} from '../services/agentOrchestrator';

interface WhatsAppSimulatorProps {
  db: StorageDatabase;
  selectedAlumniId: string;
  onSelectAlumni: (id: string) => void;
}

const SAMPLE_SCREENSHOT_SVG_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#F8FAFC"/>
  <rect x="20" y="20" width="600" height="44" rx="6" fill="#1B3A6B"/>
  <text x="36" y="47" fill="#FFFFFF" font-family="sans-serif" font-size="15" font-weight="bold">Dashboard Capaian SLA &amp; Rekapitulasi Layanan Publik - Triwulan IV</text>
  <rect x="20" y="80" width="185" height="90" rx="6" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="36" y="108" fill="#64748B" font-family="sans-serif" font-size="12">Total Tiket Masuk</text>
  <text x="36" y="145" fill="#0F172A" font-family="monospace" font-size="26" font-weight="bold">1.420</text>
  <rect x="225" y="80" width="185" height="90" rx="6" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="241" y="108" fill="#64748B" font-family="sans-serif" font-size="12">Median Waktu Layanan</text>
  <text x="241" y="145" fill="#0D6E8A" font-family="monospace" font-size="26" font-weight="bold">2,1 Hari</text>
  <rect x="430" y="80" width="190" height="90" rx="6" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="446" y="108" fill="#64748B" font-family="sans-serif" font-size="12">Kepatuhan SLA (&lt;=3 Hari)</text>
  <text x="446" y="145" fill="#2E7D32" font-family="monospace" font-size="26" font-weight="bold">91,4%</text>
  <rect x="20" y="188" width="600" height="150" rx="6" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="36" y="216" fill="#1E293B" font-family="sans-serif" font-size="13" font-weight="bold">Grafik Perbandingan Waktu Penyelesaian Antar Kecamatan (Data Anonim / Tanpa NIK)</text>
  <rect x="36" y="235" width="480" height="18" rx="3" fill="#1B3A6B"/>
  <rect x="36" y="265" width="390" height="18" rx="3" fill="#0D6E8A"/>
  <rect x="36" y="295" width="520" height="18" rx="3" fill="#2E7D32"/>
</svg>`);

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  db,
  selectedAlumniId,
  onSelectAlumni,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAlumni: Alumni =
    db.alumni.find((a) => a.id === selectedAlumniId) || db.alumni[0];
  const training = db.trainings.find((t) => t.id === activeAlumni.trainingId);
  const messages = db.messages.filter((m) => m.alumniId === activeAlumni.id);
  const openEscalation = db.escalations.find(
    (e) => e.alumniId === activeAlumni.id && e.status === 'open'
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeAlumni.id]);

  const handleSend = async (customText?: string, customImage?: string) => {
    const textToSend = customText !== undefined ? customText : inputText;
    const imgToSend = customImage !== undefined ? customImage : attachedImage;

    if (!textToSend.trim() && !imgToSend) return;

    if (customText === undefined) setInputText('');
    if (customImage === undefined) setAttachedImage(undefined);

    setIsSending(true);
    try {
      await handleIncomingAlumniMessage(activeAlumni.id, textToSend, imgToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAttachSampleEvidence = () => {
    setAttachedImage(SAMPLE_SCREENSHOT_SVG_DATA_URI);
    if (!inputText.trim()) {
      setInputText(
        'Berikut tangkapan layar bukti penerapan rencana aksi saya yang sudah selesai diterapkan di unit kerja. Saya izinkan tampil di Galeri Praktik Baik.'
      );
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Selesai':
        return 'bg-[#2E7D32]/15 text-[#2E7D32] border-[#2E7D32]/30';
      case 'Berjalan':
        return 'bg-[#0D6E8A]/15 text-[#0D6E8A] border-[#0D6E8A]/30';
      case 'Perlu Perhatian':
        return 'bg-[#E67E22]/15 text-[#E67E22] border-[#E67E22]/30';
      case 'Terhenti':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left Column: Daftar Alumni & Konteks Rencana Aksi (4 cols on lg) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-white border border-[#C8D6E5] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#1B3A6B]">
              Pilih Profil Alumni (Simulasi)
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {db.alumni.length} Alumni
            </span>
          </div>

          <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
            {db.alumni.map((alum) => {
              const isSelected = alum.id === activeAlumni.id;
              const alumEsc = db.escalations.some(
                (e) => e.alumniId === alum.id && e.status === 'open'
              );
              return (
                <button
                  key={alum.id}
                  onClick={() => onSelectAlumni(alum.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                      : 'bg-white hover:bg-[#F4F6F9] text-slate-800 border-[#C8D6E5]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate">
                      {alum.name}
                    </div>
                    <div
                      className={`text-[11px] truncate ${
                        isSelected ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {alum.cityOrRegency} · {alum.employmentStatus} · Persetujuan:{' '}
                      {alum.consentStatus}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${
                        isSelected
                          ? 'bg-white/15 text-white border-white/30'
                          : getStatusBadgeClass(alum.actionPlan.status)
                      }`}
                    >
                      {alum.actionPlan.status}
                    </span>
                    {alumEsc && (
                      <span className="text-[10px] font-semibold text-amber-300 bg-amber-900/60 px-1.5 py-0.5 rounded">
                        Eskalasi Aktif
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ringkasan Rencana Aksi & Tonggak Alumni Aktif */}
        <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#C8D6E5]">
              <div>
                <h3 className="text-sm font-bold text-[#1B3A6B]">
                  Status Rencana Aksi SMART
                </h3>
                <p className="text-xs text-slate-500">
                  {training?.name}
                </p>
              </div>
              {activeAlumni.consentStatus === 'not_asked' && (
                <button
                  onClick={() => startOnboardingForAlumni(activeAlumni.id)}
                  className="px-3 py-1.5 bg-[#0D6E8A] hover:bg-[#1B3A6B] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Mulai Pendampingan
                </button>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500 block">Judul Rencana Aksi:</span>
                <span className="font-semibold text-slate-900">
                  {activeAlumni.actionPlan.title}
                </span>
                {activeAlumni.actionPlan.proposedCompleted &&
                  activeAlumni.actionPlan.status !== 'Selesai' && (
                    <span className="mt-1 inline-block text-[11px] text-[#E67E22] font-medium">
                      · Diusulkan Selesai (Menunggu Verifikasi Instruktur)
                    </span>
                  )}
              </div>

              {activeAlumni.actionPlan.specificGoal && (
                <div>
                  <span className="text-slate-500 block">Target & Indikator:</span>
                  <p className="text-slate-700 leading-relaxed">
                    {activeAlumni.actionPlan.specificGoal} ({activeAlumni.actionPlan.measurableIndicator})
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span>Tonggak Pencapaian (Milestones):</span>
                  <span className="tabular-nums font-mono">
                    Check-in: {activeAlumni.nextCheckinDate}
                  </span>
                </div>
                {activeAlumni.actionPlan.milestones.length === 0 ? (
                  <p className="text-slate-400 italic py-2">
                    Belum ada tonggak. Selesaikan persetujuan & rumuskan rencana aksi di chat.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {activeAlumni.actionPlan.milestones.map((ms, i) => (
                      <li
                        key={ms.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-[#F4F6F9] border border-[#C8D6E5]/60"
                      >
                        <input
                          type="checkbox"
                          checked={ms.completed}
                          onChange={() => {
                            storageService.updateAlumni(activeAlumni.id, (a) => ({
                              ...a,
                              actionPlan: {
                                ...a.actionPlan,
                                milestones: a.actionPlan.milestones.map((m) =>
                                  m.id === ms.id ? { ...m, completed: !m.completed } : m
                                ),
                              },
                            }));
                          }}
                          className="mt-0.5 rounded border-slate-300 text-[#0D6E8A] focus:ring-[#0D6E8A]"
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className={`block leading-snug ${
                              ms.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                            }`}
                          >
                            {i + 1}. {ms.title}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                            Target: {ms.targetDate}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Panduan Skenario Demo Cepat */}
          <div className="mt-4 pt-3 border-t border-[#C8D6E5] text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-[#1B3A6B]">
              Pintasan Uji Coba Fitur Wajib:
            </div>
            <p>
              • Pilih <strong>Siti Nurhaliza</strong> lalu klik <strong>Mulai Pendampingan</strong> untuk uji Onboarding (FR-01).
            </p>
            <p>
              • Pilih <strong>Raka Pratama</strong> untuk uji <strong>Check-in Proaktif</strong>, tanya modul, <code>MENTOR</code>, atau kirim bukti.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Panel Simulator WhatsApp (8 cols on lg) */}
      <div className="lg:col-span-8 flex flex-col bg-white border border-[#C8D6E5] rounded-xl overflow-hidden min-h-[640px]">
        {/* WhatsApp Top Header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center font-bold text-sm shrink-0 border border-white/20">
              APIK
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm truncate">
                  APIK — Pendamping Alumni Komdigi Bandung
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              </div>
              <div className="text-xs text-emerald-100 truncate">
                Simulasi WhatsApp: {activeAlumni.salutation} {activeAlumni.name} ({maskWhatsAppNumber(activeAlumni.whatsapp)}) · Mode Agen: {db.settings.agentMode}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeAlumni.consentStatus === 'not_asked' && (
              <button
                onClick={() => startOnboardingForAlumni(activeAlumni.id)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                + Mulai Pendampingan (Admin)
              </button>
            )}
          </div>
        </div>

        {/* Banner Status Eskalasi atau Mode Agen */}
        {openEscalation && (
          <div className="bg-[#E67E22]/15 border-b border-[#E67E22]/30 px-4 py-2 flex items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E67E22] shrink-0" />
              <span>
                <strong>Eskalasi Terbuka (#{openEscalation.id}):</strong> Kasus ini sedang ditangani oleh Instruktur{' '}
                <strong>{openEscalation.instructorName}</strong>. Selama eskalasi terbuka, Agen AI menahan balasan otomatis.
              </span>
            </div>
          </div>
        )}

        {db.settings.agentMode !== 'Aktif' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800 flex items-center justify-between">
            <span>
              ⚠️ <strong>Mode Agen saat ini: {db.settings.agentMode}</strong>.{' '}
              {db.settings.agentMode === 'Dry run'
                ? 'Pesan balasan AI disusun dan dicatat di Agent Log tanpa dikirim ke ruang chat ini.'
                : 'Pengiriman pesan agen dijeda sementara.'}
            </span>
          </div>
        )}

        {/* Baris Perintah Cepat & Simulasi Uji Fitur */}
        <div className="bg-[#F4F6F9] border-b border-[#C8D6E5] px-3 py-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 mr-1">
            Perintah Cepat:
          </span>
          {['UBAH RENCANA', 'MENTOR', 'DATA SAYA', 'HAPUS DATA', 'BERHENTI'].map(
            (cmd) => (
              <button
                key={cmd}
                onClick={() => handleSend(cmd)}
                disabled={isSending}
                className="px-2 py-1 text-[11px] font-mono font-semibold bg-white hover:bg-[#1B3A6B] hover:text-white text-[#1B3A6B] border border-[#C8D6E5] rounded transition-colors whitespace-nowrap"
              >
                {cmd}
              </button>
            )
          )}
          <button
            onClick={() =>
              handleSend(
                activeAlumni.trainingId === 'trn-01'
                  ? 'Bagaimana cara menghitung waktu tunggu layanan dengan median vs rata-rata serta pembersihan duplikat di modul?'
                  : 'Bagaimana aturan rasio kontras warna aksesibilitas WCAG dan struktur copywriting piramida terbalik di modul?'
              )
            }
            disabled={isSending}
            className="px-2 py-1 text-[11px] font-medium bg-[#0D6E8A]/10 hover:bg-[#0D6E8A] hover:text-white text-[#0D6E8A] border border-[#0D6E8A]/30 rounded transition-colors whitespace-nowrap"
          >
            Tanya Materi Modul
          </button>
          <button
            onClick={handleAttachSampleEvidence}
            disabled={isSending}
            className="px-2 py-1 text-[11px] font-medium bg-[#2E7D32]/10 hover:bg-[#2E7D32] hover:text-white text-[#2E7D32] border border-[#2E7D32]/30 rounded transition-colors whitespace-nowrap"
          >
            Lampirkan Contoh Bukti
          </button>
          <button
            onClick={() =>
              setInputText(
                'Pak/Bu, ini contoh data warga NIK 3273011508900004 dan nomor HP pelapor 081299887766 yang menanyakan status berkas.'
              )
            }
            disabled={isSending}
            className="px-2 py-1 text-[11px] font-medium bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 border border-amber-300 rounded transition-colors whitespace-nowrap"
          >
            Uji Masking NIK & No.HP
          </button>
        </div>

        {/* Area Pesan Chat */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#EFEAE2]">
          {messages.length === 0 ? (
            <div className="my-12 mx-auto max-w-md bg-white/90 border border-[#C8D6E5] rounded-xl p-5 text-center space-y-3">
              <p className="text-xs text-slate-600">
                Belum ada riwayat percakapan WhatsApp dengan{' '}
                <strong>
                  {activeAlumni.salutation} {activeAlumni.name}
                </strong>
                .
              </p>
              <button
                onClick={() => startOnboardingForAlumni(activeAlumni.id)}
                className="px-4 py-2 bg-[#1B3A6B] hover:bg-[#0D6E8A] text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Kirim Sapaan Awal Onboarding (Admin)
              </button>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-[#FFF8E7] border border-amber-200 text-amber-900 text-xs px-3 py-1.5 rounded-lg max-w-lg text-center">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              const isAlumni = msg.sender === 'alumni';
              const isInstruktur = msg.sender === 'instruktur';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isAlumni ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[84%] sm:max-w-[76%] rounded-xl px-3.5 py-2.5 shadow-xs border ${
                      isAlumni
                        ? 'bg-[#DCF8C6] border-[#c3e6a8] text-slate-900'
                        : isInstruktur
                        ? 'bg-[#E6F4F8] border-[#0D6E8A]/40 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    {/* Label Pengirim */}
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={`text-[11px] font-bold flex items-center gap-1 ${
                          isAlumni
                            ? 'text-emerald-800'
                            : isInstruktur
                            ? 'text-[#0D6E8A]'
                            : 'text-[#1B3A6B]'
                        }`}
                      >
                        {isAlumni ? (
                          `${activeAlumni.salutation} ${activeAlumni.name}`
                        ) : isInstruktur ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Instruktur ({training?.instructorName || 'Mentor'})
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#0D6E8A]" />
                            Agen APIK
                          </>
                        )}
                      </span>
                      {msg.isTemplate && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Template WA
                        </span>
                      )}
                    </div>

                    {/* Lampiran Gambar jika ada */}
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img
                          src={msg.imageUrl}
                          alt="Lampiran percakapan alumni"
                          referrerPolicy="no-referrer"
                          className="max-h-52 w-auto object-contain mx-auto"
                        />
                      </div>
                    )}

                    {/* Peringatan Draf Dokumen Kerja (FR-03) */}
                    {msg.isDraftNotice && (
                      <div className="mb-2 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                        <FileWarning className="w-3.5 h-3.5 text-[#E67E22] shrink-0" />
                        Draf — Wajib Ditinjau Pejabat Berwenang Sebelum Digunakan
                      </div>
                    )}

                    {/* Isi Teks Pesan */}
                    <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>

                    {/* Notifikasi Masking PII (Keamanan & Privasi) */}
                    {msg.maskedNotice && (
                      <div className="mt-2 px-2.5 py-1 bg-amber-100/80 border border-amber-300 rounded text-[11px] text-amber-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{msg.maskedNotice}</span>
                      </div>
                    )}

                    {/* Rujukan Modul Pelatihan (FR-03) */}
                    {msg.moduleReference && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-[#0D6E8A] font-medium">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>Rujukan: {msg.moduleReference}</span>
                      </div>
                    )}

                    {/* Footer Pesan: Waktu & Tombol 👍/👎 untuk pesan Agen */}
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums flex items-center gap-1">
                        {msg.timestamp}
                        {isAlumni && (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                        )}
                      </span>

                      {msg.sender === 'agent' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              storageService.setMessageFeedback(msg.id, 'up')
                            }
                            title="Jawaban membantu"
                            className={`p-1 rounded transition-colors ${
                              msg.feedback === 'up'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              storageService.setMessageFeedback(msg.id, 'down')
                            }
                            title="Jawaban kurang tepat"
                            className={`p-1 rounded transition-colors ${
                              msg.feedback === 'down'
                                ? 'bg-red-100 text-red-700'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Replies (Tombol Balasan Cepat) */}
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[84%]">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr}
                          onClick={() => handleSend(qr)}
                          disabled={isSending}
                          className="px-3 py-1 bg-white hover:bg-[#0D6E8A] hover:text-white text-[#0D6E8A] border border-[#0D6E8A]/40 rounded-lg text-xs font-medium shadow-2xs transition-colors"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex items-start">
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 italic">
                APIK sedang menganalisis dan memeriksa basis pengetahuan...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preview Lampiran Gambar Sebelum Dikirim */}
        {attachedImage && (
          <div className="bg-slate-100 border-t border-[#C8D6E5] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={attachedImage}
                alt="Preview lampiran"
                referrerPolicy="no-referrer"
                className="h-12 w-16 object-cover rounded border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-700 font-medium">
                Gambar siap dikirim untuk dianalisis oleh Gemini / disimpan sebagai bukti
              </span>
            </div>
            <button
              onClick={() => setAttachedImage(undefined)}
              className="p-1 text-slate-500 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Chat WhatsApp */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="bg-[#F0F2F5] p-3 flex items-center gap-2 border-t border-[#C8D6E5]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Unggah tangkapan layar / bukti gambar"
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-[#C8D6E5] transition-colors shrink-0"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ketik pesan sebagai ${activeAlumni.salutation} ${activeAlumni.name}...`}
            disabled={isSending}
            className="flex-1 bg-white border border-[#C8D6E5] rounded-lg px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#0D6E8A]"
          />

          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !attachedImage)}
            className="px-4 py-2 bg-[#075E54] hover:bg-[#128C7E] disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Kirim</span>
          </button>
        </form>
      </div>
    </div>
  );
};
