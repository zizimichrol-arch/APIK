import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  BookOpen,
  Settings,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Clock,
  FastForward,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';
import { RoleType, StorageDatabase } from './types';
import { storageService } from './services/storageService';
import { runProactiveCheckins } from './services/agentOrchestrator';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import {
  AdminAlumniView,
  KnowledgeBaseView,
  AgentSettingsView,
  AgentLogView,
} from './components/AdminViews';
import {
  EscalationInboxView,
  EvidenceVerificationView,
} from './components/InstructorViews';
import { PimpinanDashboard } from './components/PimpinanDashboard';

export default function App() {
  const [db, setDb] = useState<StorageDatabase>(() =>
    storageService.getDatabase()
  );
  const [activeRole, setActiveRole] = useState<RoleType>('alumni');
  const [adminTab, setAdminTab] = useState<
    'alumni' | 'knowledge' | 'settings' | 'logs'
  >('alumni');
  const [instructorTab, setInstructorTab] = useState<
    'escalations' | 'verification'
  >('escalations');
  const [selectedAlumniId, setSelectedAlumniId] = useState<string>('alm-01');
  const [schedulerBanner, setSchedulerBanner] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    return storageService.subscribe(() => {
      setDb(storageService.getDatabase());
    });
  }, []);

  const showSchedulerToast = (msg: string) => {
    setSchedulerBanner(msg);
    setTimeout(() => setSchedulerBanner(null), 5000);
  };

  const handleAdvanceDays = (days: number) => {
    const newDate = storageService.advanceDays(days);
    const outcome = runProactiveCheckins(true);
    if (outcome.processedCount > 0) {
      showSchedulerToast(
        `Jam Simulasi maju +${days} hari ke ${newDate}. Agen mengirim ${outcome.processedCount} pesan proaktif: ${outcome.details.join('; ')}`
      );
    } else {
      showSchedulerToast(
        `Jam Simulasi maju +${days} hari ke ${newDate}. Tidak ada alumni baru yang jatuh tempo hari ini.`
      );
    }
  };

  const handleRunCheckinNow = () => {
    const outcome = runProactiveCheckins(true);
    if (outcome.processedCount > 0) {
      showSchedulerToast(
        `Check-in Proaktif dijalankan (${db.simulatedDate}): ${outcome.processedCount} pesan dikirim (${outcome.details.join(', ')}).`
      );
    } else {
      showSchedulerToast(
        `Check-in dijalankan (${db.simulatedDate}): Belum ada alumni berstatus "Setuju" yang jatuh tempo. Klik "+7 Hari" untuk memajukan tanggal simulasi.`
      );
    }
  };

  const handleResetDemo = () => {
    const fresh = storageService.resetToSeed();
    setDb(fresh);
    setSelectedAlumniId('alm-01');
    setConfirmResetOpen(false);
    showSchedulerToast(
      'Data Demo berhasil dikembalikan ke kondisi awal (Seed Data).'
    );
  };

  const openEscalationsCount = db.escalations.filter(
    (e) => e.status === 'open'
  ).length;
  const pendingEvidencesCount = db.evidences.filter(
    (e) => e.verificationStatus === 'pending'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-slate-900">
      {/* Top Bar Header */}
      <header className="bg-[#1B3A6B] text-white border-b border-[#0D6E8A]/40 px-4 lg:px-6 py-3 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0D6E8A] flex items-center justify-center font-bold text-sm tracking-tight border border-white/20 shrink-0">
                APIK
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight whitespace-nowrap">
                  APIK — Agen Pendamping Implementasi Kompetensi
                </h1>
                <p className="text-[11px] text-slate-300">
                  UPT Balai Pelatihan SDM Komdigi Bandung · Wilayah Jawa Barat & Banten
                </p>
              </div>
            </div>
          </div>

          {/* Role Switcher & Jam Simulasi Controls */}
          <div className="flex flex-wrap items-center justify-between xl:justify-end gap-3">
            {/* Pemilih Peran (Tanpa Login Sungguhan) */}
            <div className="flex items-center bg-[#12284C] p-1 rounded-lg border border-white/15">
              {(
                [
                  { id: 'alumni', label: 'Alumni (Simulator WA)' },
                  { id: 'admin', label: 'Admin' },
                  {
                    id: 'instruktur',
                    label: `Instruktur/Mentor (${openEscalationsCount + pendingEvidencesCount})`,
                  },
                  { id: 'pimpinan', label: 'Pimpinan' },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeRole === r.id
                      ? 'bg-[#0D6E8A] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Jam Simulasi & Tombol Check-in */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#12284C] px-2.5 py-1.5 rounded-lg border border-white/15 text-xs">
              <div className="flex items-center gap-1.5 pr-2 border-r border-white/15">
                <Clock className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span className="font-mono tabular-nums font-semibold text-sky-200 whitespace-nowrap">
                  {db.simulatedDate} · {db.simulatedTime} WIB
                </span>
              </div>

              <button
                onClick={() => handleAdvanceDays(1)}
                title="Majukan Jam Simulasi 1 Hari"
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <FastForward className="w-3 h-3" />
                <span>Maju 1 Hari</span>
              </button>

              <button
                onClick={() => handleAdvanceDays(7)}
                title="Majukan Jam Simulasi 7 Hari"
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <FastForward className="w-3 h-3" />
                <span>Maju 7 Hari</span>
              </button>

              <button
                onClick={handleRunCheckinNow}
                className="px-2.5 py-1 bg-[#2E7D32] hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Jalankan Check-in Sekarang</span>
              </button>

              <button
                onClick={() => setConfirmResetOpen(true)}
                title="Kembalikan ke data awal (Seed Data)"
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Data Demo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notifikasi Scheduler / Toast */}
      {schedulerBanner && (
        <div className="bg-[#0D6E8A] text-white px-4 py-2 text-xs font-medium no-print">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2">
            <span>🔔 {schedulerBanner}</span>
            <button
              onClick={() => setSchedulerBanner(null)}
              className="text-white/80 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Data Demo */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white border border-[#C8D6E5] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#1B3A6B]">
              Reset Data Demo ke Kondisi Awal (Seed)?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seluruh perubahan rencana aksi, percakapan chat simulasi, tiket eskalasi, dan log agen akan dikembalikan ke data awal (2 pelatihan & 8 alumni).
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleResetDemo}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Ya, Reset Data Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Role-Based Sidebar */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex flex-col md:flex-row gap-5 p-4 lg:p-6">
        {/* Sidebar Navigasi untuk Peran Admin, Instruktur, dan Pimpinan */}
        {activeRole !== 'alumni' && (
          <aside className="w-full md:w-60 shrink-0 no-print">
            <div className="bg-white border border-[#C8D6E5] rounded-xl p-3 space-y-1">
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Menu {activeRole.toUpperCase()}
              </div>

              {activeRole === 'admin' && (
                <>
                  <button
                    onClick={() => setAdminTab('alumni')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      adminTab === 'alumni'
                        ? 'bg-[#1B3A6B] text-white'
                        : 'text-slate-700 hover:bg-[#F4F6F9]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Data Alumni</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      {db.alumni.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminTab('knowledge')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      adminTab === 'knowledge'
                        ? 'bg-[#1B3A6B] text-white'
                        : 'text-slate-700 hover:bg-[#F4F6F9]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Basis Pengetahuan</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      {db.knowledgeBase.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminTab('settings')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      adminTab === 'settings'
                        ? 'bg-[#1B3A6B] text-white'
                        : 'text-slate-700 hover:bg-[#F4F6F9]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>Pengaturan Agen</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D6E8A]/20 text-[#0D6E8A]">
                      {db.settings.agentMode}
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminTab('logs')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      adminTab === 'logs'
                        ? 'bg-[#1B3A6B] text-white'
                        : 'text-slate-700 hover:bg-[#F4F6F9]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      <span>Agent & Consent Log</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      {db.agentLogs.length}
                    </span>
                  </button>
                </>
              )}

              {activeRole === 'instruktur' && (
                <>
                  <button
                    onClick={() => setInstructorTab('escalations')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      instructorTab === 'escalations'
                        ? 'bg-[#1B3A6B] text-white'
                        : 'text-slate-700 hover:bg-[#F4F6F9]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Kotak Eskalasi</span>
                    </span>
                    {openEscalationsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#E67E22] text-white font-mono text-[10px]">
                        {openEscalationsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setInstructorTab('verification')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      instructorTab === 'verification'
                        ? 'bg-[#1B3A6B] text-white'
                        : 'text-slate-700 hover:bg-[#F4F6F9]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verifikasi Bukti</span>
                    </span>
                    {pendingEvidencesCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#0D6E8A] text-white font-mono text-[10px]">
                        {pendingEvidencesCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {activeRole === 'pimpinan' && (
                <>
                  <button
                    onClick={() => {}}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-[#1B3A6B] text-white"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard Eksekutif</span>
                  </button>
                </>
              )}

              <div className="pt-3 mt-3 border-t border-[#C8D6E5]">
                <button
                  onClick={() => setActiveRole('alumni')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#0D6E8A] hover:bg-[#F4F6F9] flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Buka Simulator WhatsApp</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Viewport Utama */}
        <main className="flex-1 min-w-0">
          {activeRole === 'alumni' && (
            <WhatsAppSimulator
              db={db}
              selectedAlumniId={selectedAlumniId}
              onSelectAlumni={setSelectedAlumniId}
            />
          )}

          {activeRole === 'admin' && adminTab === 'alumni' && (
            <AdminAlumniView
              db={db}
              onOpenSimulatorForAlumni={(id) => {
                setSelectedAlumniId(id);
                setActiveRole('alumni');
              }}
            />
          )}

          {activeRole === 'admin' && adminTab === 'knowledge' && (
            <KnowledgeBaseView db={db} />
          )}

          {activeRole === 'admin' && adminTab === 'settings' && (
            <AgentSettingsView db={db} />
          )}

          {activeRole === 'admin' && adminTab === 'logs' && (
            <AgentLogView db={db} />
          )}

          {activeRole === 'instruktur' && instructorTab === 'escalations' && (
            <EscalationInboxView
              db={db}
              onOpenChatForAlumni={(id) => {
                setSelectedAlumniId(id);
                setActiveRole('alumni');
              }}
            />
          )}

          {activeRole === 'instruktur' && instructorTab === 'verification' && (
            <EvidenceVerificationView
              db={db}
              onOpenChatForAlumni={(id) => {
                setSelectedAlumniId(id);
                setActiveRole('alumni');
              }}
            />
          )}

          {activeRole === 'pimpinan' && (
            <PimpinanDashboard
              db={db}
              onSelectAlumniInSimulator={(id) => {
                setSelectedAlumniId(id);
                setActiveRole('alumni');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
