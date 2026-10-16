import React, { useState, useRef } from 'react';
import {
  Users,
  Upload,
  Play,
  Eye,
  BookOpen,
  Plus,
  Edit3,
  Power,
  Settings,
  Terminal,
  ShieldAlert,
  CheckCircle2,
  X,
  FileText,
  Search,
} from 'lucide-react';
import {
  AgentSettings,
  Alumni,
  EmploymentStatus,
  KnowledgeSection,
  StorageDatabase,
} from '../types';
import {
  storageService,
  maskWhatsAppNumber,
} from '../services/storageService';
import { startOnboardingForAlumni } from '../services/agentOrchestrator';

interface AdminAlumniProps {
  db: StorageDatabase;
  onOpenSimulatorForAlumni: (alumniId: string) => void;
}

export const AdminAlumniView: React.FC<AdminAlumniProps> = ({
  db,
  onOpenSimulatorForAlumni,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTraining, setFilterTraining] = useState('all');
  const [selectedDetailAlumni, setSelectedDetailAlumni] = useState<Alumni | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState(
    `Nama,Sapaan,WhatsApp,Status,Instansi,Jabatan,KabKota,Provinsi,IDPelatihan\nBudi Santoso S.Kom.,Bapak,081223456789,PNS,Diskominfo Kota Bandung,Pranata Komputer,Kota Bandung,Jawa Barat,trn-01\nRina Marlina S.I.Kom.,Ibu,081377889900,PPPK,Diskominfo Kab. Tangerang,Pranata Humas,Kab. Tangerang,Banten,trn-02\nTono Wijaya A.Md.,Bapak,085644556677,Non-ASN,Bappeda Kota Bogor,Staf Pengolah Data,Kota Bogor,Jawa Barat,trn-01`
  );
  const [importFeedback, setImportFeedback] = useState<{
    added: number;
    duplicates: string[];
  } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const filteredAlumni = db.alumni.filter((a) => {
    const matchesTraining =
      filterTraining === 'all' || a.trainingId === filterTraining;
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.cityOrRegency.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTraining && matchesSearch;
  });

  const handleImportCsv = () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) return;

    const newBatch: Alumni[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < 7) continue;
      const [
        name,
        salutationRaw,
        whatsapp,
        empRaw,
        institution,
        position,
        cityOrRegency,
        provinceRaw,
        trainingIdRaw,
      ] = cols;

      const salutation: 'Bapak' | 'Ibu' =
        salutationRaw === 'Ibu' ? 'Ibu' : 'Bapak';
      const employmentStatus: EmploymentStatus =
        empRaw === 'PPPK' ? 'PPPK' : empRaw === 'Non-ASN' ? 'Non-ASN' : 'PNS';
      const province: 'Jawa Barat' | 'Banten' =
        provinceRaw === 'Banten' ? 'Banten' : 'Jawa Barat';
      const trainingId = trainingIdRaw === 'trn-02' ? 'trn-02' : 'trn-01';

      newBatch.push({
        id: `alm-${Date.now()}-${i}`,
        name,
        salutation,
        whatsapp,
        employmentStatus,
        institution,
        position,
        cityOrRegency,
        province,
        trainingId,
        consentStatus: 'not_asked',
        onboardingStep: 'none',
        nextCheckinDate: db.simulatedDate,
        awaitingCheckinReply: false,
        reminderStage: 0,
        unansweredTechQuestionsCount: 0,
        conversationSummary: 'Diimpor melalui CSV. Belum memulai pendampingan.',
        messagesSentToday: 0,
        lastMessageDate: db.simulatedDate,
        actionPlan: {
          title: 'Belum dirumuskan',
          specificGoal: '',
          measurableIndicator: '',
          achievableSteps: '',
          relevantImpact: '',
          targetCompletionDate: '2026-12-01',
          status: 'Belum mulai',
          milestones: [],
          updatedAt: db.simulatedDate,
        },
      });
    }

    const res = storageService.addAlumniBatch(newBatch);
    setImportFeedback(res);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const detailAlumniFresh = selectedDetailAlumni
    ? db.alumni.find((a) => a.id === selectedDetailAlumni.id) || null
    : null;

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            Data Alumni & Status Pendampingan
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Kelola peserta pasca-pelatihan, inisiasi persetujuan WhatsApp, dan impor data CSV dengan deteksi duplikat otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setImportFeedback(null);
              setCsvModalOpen(true);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1B3A6B] border border-[#C8D6E5] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-[#0D6E8A]" />
            <span>Impor CSV Alumni</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama alumni, instansi, atau kabupaten/kota..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#C8D6E5] rounded-lg focus:outline-none focus:border-[#0D6E8A]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterTraining}
            onChange={(e) => setFilterTraining(e.target.value)}
            className="px-3 py-2 text-xs border border-[#C8D6E5] rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#0D6E8A]"
          >
            <option value="all">Semua Pelatihan (2 Angkatan)</option>
            {db.trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Data Alumni */}
      <div className="bg-white border border-[#C8D6E5] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F6F9] border-b border-[#C8D6E5] text-[11px] font-bold text-[#1B3A6B]">
                <th className="py-3 px-4">Nama & Status</th>
                <th className="py-3 px-4">Instansi & Wilayah</th>
                <th className="py-3 px-4">WhatsApp (Tersamar)</th>
                <th className="py-3 px-4">Pelatihan</th>
                <th className="py-3 px-4">Persetujuan</th>
                <th className="py-3 px-4">Status Rencana Aksi</th>
                <th className="py-3 px-4">Check-in Berikutnya</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8D6E5]/60 text-xs">
              {filteredAlumni.map((alum) => {
                const trn = db.trainings.find((t) => t.id === alum.trainingId);
                return (
                  <tr
                    key={alum.id}
                    className="hover:bg-[#F4F6F9]/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {alum.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {alum.employmentStatus} · {alum.position}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">
                        {alum.institution}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {alum.cityOrRegency} · {alum.province}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {maskWhatsAppNumber(alum.whatsapp)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                      {trn?.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          alum.consentStatus === 'agreed'
                            ? 'bg-emerald-50 text-[#2E7D32] border border-emerald-200'
                            : alum.consentStatus === 'pending'
                            ? 'bg-amber-50 text-[#E67E22] border border-amber-200'
                            : alum.consentStatus === 'stopped' ||
                              alum.consentStatus === 'declined' ||
                              alum.consentStatus === 'deleted'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {alum.consentStatus === 'agreed'
                          ? 'Setuju (Aktif)'
                          : alum.consentStatus === 'pending'
                          ? 'Menunggu Balasan'
                          : alum.consentStatus === 'not_asked'
                          ? 'Belum Diminta'
                          : alum.consentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          alum.actionPlan.status === 'Selesai'
                            ? 'bg-emerald-50 text-[#2E7D32] border border-emerald-200'
                            : alum.actionPlan.status === 'Berjalan'
                            ? 'bg-sky-50 text-[#0D6E8A] border border-sky-200'
                            : alum.actionPlan.status === 'Perlu Perhatian'
                            ? 'bg-amber-50 text-[#E67E22] border border-amber-200'
                            : alum.actionPlan.status === 'Terhenti'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {alum.actionPlan.status}
                      </span>
                      {alum.actionPlan.proposedCompleted &&
                        alum.actionPlan.status !== 'Selesai' && (
                          <div className="text-[10px] text-[#E67E22] font-medium mt-0.5">
                            Usulan Selesai (Verifikasi)
                          </div>
                        )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {alum.consentStatus === 'agreed'
                        ? alum.nextCheckinDate
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {alum.consentStatus === 'not_asked' && (
                        <button
                          onClick={() => {
                            startOnboardingForAlumni(alum.id);
                            onOpenSimulatorForAlumni(alum.id);
                          }}
                          className="px-2.5 py-1.5 bg-[#1B3A6B] hover:bg-[#0D6E8A] text-white rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          <span>Mulai Pendampingan</span>
                        </button>
                      )}
                      <button
                        onClick={() => onOpenSimulatorForAlumni(alum.id)}
                        className="px-2.5 py-1.5 bg-[#0D6E8A]/10 hover:bg-[#0D6E8A] hover:text-white text-[#0D6E8A] rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Buka Chat
                      </button>
                      <button
                        onClick={() => setSelectedDetailAlumni(alum)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Impor CSV & Deteksi Duplikat WhatsApp */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#C8D6E5] rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#C8D6E5] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1B3A6B]">
                  Impor CSV Data Alumni & Deteksi Duplikat Nomor WhatsApp
                </h3>
                <p className="text-xs text-slate-500">
                  Baris pertama dalam contoh di bawah sengaja menggunakan nomor WhatsApp milik Raka Pratama (081223456789) untuk mendemonstrasikan deteksi duplikat otomatis.
                </p>
              </div>
              <button
                onClick={() => setCsvModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Data CSV (Format: Nama,Sapaan,WhatsApp,Status,Instansi,Jabatan,KabKota,Provinsi,IDPelatihan)
              </span>
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
              <button
                onClick={() => csvFileInputRef.current?.click()}
                className="text-xs text-[#0D6E8A] hover:underline font-semibold"
              >
                Pilih File .CSV dari Komputer
              </button>
            </div>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 text-xs font-mono border border-[#C8D6E5] rounded-lg focus:outline-none focus:border-[#0D6E8A]"
            />

            {importFeedback && (
              <div className="p-3.5 rounded-lg border bg-[#F4F6F9] border-[#C8D6E5] text-xs space-y-1.5">
                <div className="font-bold text-[#2E7D32] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Berhasil menambahkan {importFeedback.added} alumni baru.
                  </span>
                </div>
                {importFeedback.duplicates.length > 0 && (
                  <div className="text-amber-800">
                    <strong>
                      Deteksi Duplikat Nomor WhatsApp ({importFeedback.duplicates.length} ditolak):
                    </strong>{' '}
                    {importFeedback.duplicates.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCsvModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Tutup
              </button>
              <button
                onClick={handleImportCsv}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B3A6B] hover:bg-[#0D6E8A] rounded-lg transition-colors"
              >
                Proses Impor & Cek Duplikat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Alumni Lengkap */}
      {detailAlumniFresh && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#C8D6E5] rounded-xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#C8D6E5] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1B3A6B]">
                  Detail Lengkap Alumni: {detailAlumniFresh.salutation}{' '}
                  {detailAlumniFresh.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailAlumniFresh.position} · {detailAlumniFresh.institution} ({detailAlumniFresh.cityOrRegency}, {detailAlumniFresh.province}) · WA: {maskWhatsAppNumber(detailAlumniFresh.whatsapp)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDetailAlumni(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Rencana Aksi & Tonggak */}
              <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#C8D6E5] space-y-2.5">
                <div className="font-bold text-[#1B3A6B] text-sm">
                  Rencana Aksi SMART & Tonggak
                </div>
                <div>
                  <span className="text-slate-500">Judul:</span>{' '}
                  <strong className="text-slate-900">
                    {detailAlumniFresh.actionPlan.title}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Target Spesifik:</span>{' '}
                  <span>{detailAlumniFresh.actionPlan.specificGoal || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Indikator Terukur:</span>{' '}
                  <span>{detailAlumniFresh.actionPlan.measurableIndicator || '-'}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 block mb-1 font-semibold">
                    Daftar Tonggak:
                  </span>
                  {detailAlumniFresh.actionPlan.milestones.length === 0 ? (
                    <p className="text-slate-400 italic">Belum ada tonggak</p>
                  ) : (
                    <ul className="space-y-1">
                      {detailAlumniFresh.actionPlan.milestones.map((m, idx) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-slate-200">
                          <span>
                            {idx + 1}. {m.title}
                          </span>
                          <span className="font-mono text-[11px] shrink-0">
                            {m.targetDate} ({m.completed ? '✓' : 'Proses'})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Riwayat Check-in & Bukti */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#C8D6E5] space-y-2">
                  <div className="font-bold text-[#1B3A6B] text-sm">
                    Riwayat Check-in Berkala
                  </div>
                  {db.checkins.filter((c) => c.alumniId === detailAlumniFresh.id)
                    .length === 0 ? (
                    <p className="text-slate-400 italic">
                      Belum ada catatan check-in.
                    </p>
                  ) : (
                    db.checkins
                      .filter((c) => c.alumniId === detailAlumniFresh.id)
                      .map((chk) => (
                        <div
                          key={chk.id}
                          className="bg-white p-2.5 rounded border border-slate-200"
                        >
                          <div className="flex justify-between font-mono text-[11px] text-slate-500">
                            <span>Tanggal: {chk.date}</span>
                            <span>Status: {chk.progressStatus}</span>
                          </div>
                          <p className="text-slate-800 mt-1">{chk.summary}</p>
                        </div>
                      ))
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#C8D6E5] space-y-2">
                  <div className="font-bold text-[#1B3A6B] text-sm">
                    Bukti Penerapan
                  </div>
                  {db.evidences.filter((e) => e.alumniId === detailAlumniFresh.id)
                    .length === 0 ? (
                    <p className="text-slate-400 italic">
                      Belum ada bukti yang dikirimkan.
                    </p>
                  ) : (
                    db.evidences
                      .filter((e) => e.alumniId === detailAlumniFresh.id)
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-white p-2.5 rounded border border-slate-200 space-y-1"
                        >
                          <div className="font-semibold text-slate-900">
                            {ev.description}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Tipe: {ev.type} · Status Verifikasi: {ev.verificationStatus}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Transkrip Chat */}
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#C8D6E5] space-y-2">
              <div className="font-bold text-[#1B3A6B] text-sm">
                Transkrip Percakapan WhatsApp
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {db.messages
                  .filter((m) => m.alumniId === detailAlumniFresh.id)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="bg-white p-2.5 rounded border border-slate-200 text-xs"
                    >
                      <span className="font-bold text-[#1B3A6B] uppercase text-[10px]">
                        [{m.sender} · {m.timestamp}]
                      </span>{' '}
                      <span className="text-slate-800">{m.text}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Halaman Basis Pengetahuan (Admin - FR-03)
 */
export const KnowledgeBaseView: React.FC<{ db: StorageDatabase }> = ({ db }) => {
  const [editingItem, setEditingItem] = useState<Partial<KnowledgeSection> | null>(
    null
  );
  const [filterTraining, setFilterTraining] = useState('all');
  const txtFileInputRef = useRef<HTMLInputElement>(null);

  const sections = db.knowledgeBase.filter(
    (k) => filterTraining === 'all' || k.trainingId === filterTraining
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.chapterTitle || !editingItem.content) return;

    const trn = db.trainings.find(
      (t) => t.id === (editingItem.trainingId || 'trn-01')
    );
    storageService.saveKnowledgeSection({
      id: editingItem.id,
      trainingId: editingItem.trainingId || 'trn-01',
      moduleTitle:
        editingItem.moduleTitle || `Modul ${trn?.name.split('–')[0].trim()}`,
      chapterNumber: Number(editingItem.chapterNumber) || sections.length + 1,
      chapterTitle: editingItem.chapterTitle,
      content: editingItem.content,
      keywords:
        typeof editingItem.keywords === 'string'
          ? (editingItem.keywords as string)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : editingItem.keywords || ['modul', 'pelatihan'],
      isActive: editingItem.isActive ?? true,
    });
    setEditingItem(null);
  };

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const textContent = reader.result;
        setEditingItem({
          trainingId: 'trn-01',
          moduleTitle: 'Modul Analisis Data untuk Pelayanan Publik',
          chapterNumber: 6,
          chapterTitle: `Bab Tambahan: ${file.name.replace(/\.txt$/i, '')}`,
          content: textContent,
          keywords: ['tambahan', 'modul', 'dokumen', 'panduan'],
          isActive: true,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            Basis Pengetahuan Modul Pelatihan (FR-03)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Sumber rujukan resmi bagi tool <code>search_knowledge_base</code> saat menjawab pertanyaan teknis alumni.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={txtFileInputRef}
            type="file"
            accept=".txt"
            onChange={handleTxtUpload}
            className="hidden"
          />
          <button
            onClick={() => txtFileInputRef.current?.click()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1B3A6B] border border-[#C8D6E5] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4 text-[#0D6E8A]" />
            <span>Unggah Modul .TXT</span>
          </button>
          <button
            onClick={() =>
              setEditingItem({
                trainingId: 'trn-01',
                moduleTitle: 'Modul Analisis Data untuk Pelayanan Publik',
                chapterNumber: 6,
                chapterTitle: '',
                content: '',
                keywords: ['data', 'layanan'],
                isActive: true,
              })
            }
            className="px-3.5 py-2 bg-[#1B3A6B] hover:bg-[#0D6E8A] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bab Modul</span>
          </button>
        </div>
      </div>

      {/* Filter Pelatihan */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'Semua Modul Pelatihan' },
          ...db.trainings.map((t) => ({ id: t.id, label: t.name })),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTraining(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filterTraining === tab.id
                ? 'bg-[#1B3A6B] text-white'
                : 'bg-white text-slate-700 border border-[#C8D6E5] hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Tambah / Edit Modul */}
      {editingItem && (
        <form
          onSubmit={handleSave}
          className="bg-white border-2 border-[#0D6E8A] rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#C8D6E5] pb-2">
            <h3 className="text-sm font-bold text-[#1B3A6B]">
              {editingItem.id ? 'Edit Bagian Modul' : 'Tambah Bagian Modul Baru'}
            </h3>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Program Pelatihan
              </label>
              <select
                value={editingItem.trainingId || 'trn-01'}
                onChange={(e) => {
                  const trn = db.trainings.find((t) => t.id === e.target.value);
                  setEditingItem({
                    ...editingItem,
                    trainingId: e.target.value,
                    moduleTitle: `Modul ${trn?.name.split('–')[0].trim()}`,
                  });
                }}
                className="w-full p-2 border border-[#C8D6E5] rounded-lg"
              >
                {db.trainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Judul Bab / Bagian
              </label>
              <input
                type="text"
                required
                value={editingItem.chapterTitle || ''}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, chapterTitle: e.target.value })
                }
                placeholder="Contoh: Bab 6: Audit Kualitas Data Terpadu"
                className="w-full p-2 border border-[#C8D6E5] rounded-lg"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              Isi Materi Modul (Akan dikutip oleh Agen)
            </label>
            <textarea
              rows={4}
              required
              value={editingItem.content || ''}
              onChange={(e) =>
                setEditingItem({ ...editingItem, content: e.target.value })
              }
              className="w-full p-2.5 border border-[#C8D6E5] rounded-lg"
            />
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              Kata Kunci Pencarian (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={
                Array.isArray(editingItem.keywords)
                  ? editingItem.keywords.join(', ')
                  : editingItem.keywords || ''
              }
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  keywords: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              className="w-full p-2 border border-[#C8D6E5] rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1B3A6B] hover:bg-[#0D6E8A] rounded-lg"
            >
              Simpan Modul
            </button>
          </div>
        </form>
      )}

      {/* Daftar Bagian Modul */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec) => (
          <div
            key={sec.id}
            className={`bg-white border rounded-xl p-4 flex flex-col justify-between gap-3 ${
              sec.isActive
                ? 'border-[#C8D6E5]'
                : 'border-slate-200 opacity-60 bg-slate-50'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-[#0D6E8A]">
                    {sec.moduleTitle}
                  </span>
                  <h3 className="text-sm font-bold text-[#1B3A6B]">
                    {sec.chapterTitle}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    sec.isActive
                      ? 'bg-emerald-50 text-[#2E7D32] border border-emerald-200'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {sec.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {sec.content}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div className="text-[11px] text-slate-500 truncate">
                Kata kunci: {sec.keywords.join(' · ')}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setEditingItem(sec)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => storageService.toggleKnowledgeSectionActive(sec.id)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                >
                  <Power className="w-3 h-3" />
                  <span>{sec.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Halaman Pengaturan Agen (Admin - FR-02)
 */
export const AgentSettingsView: React.FC<{ db: StorageDatabase }> = ({ db }) => {
  const [form, setForm] = useState<AgentSettings>(db.settings);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.updateSettings(form);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5">
        <h2 className="text-lg font-bold text-[#1B3A6B]">
          Pengaturan Agen & Penjadwal Check-in Proaktif (FR-02)
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
          Atur parameter interval check-in berkala, jam operasional pengiriman, batas pengingat tanpa balasan, dan Mode Operasional Agen.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-[#C8D6E5] rounded-xl p-6 space-y-5 text-xs"
      >
        {/* Mode Agen */}
        <div>
          <label className="block font-bold text-[#1B3A6B] text-sm mb-2">
            Mode Operasional Agen (Aktif / Jeda / Dry run)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['Aktif', 'Jeda', 'Dry run'] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setForm({ ...form, agentMode: mode })}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  form.agentMode === mode
                    ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                    : 'bg-[#F4F6F9] text-slate-800 border-[#C8D6E5] hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-sm">{mode}</div>
                <div
                  className={`text-[11px] mt-1 ${
                    form.agentMode === mode ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {mode === 'Aktif'
                    ? 'Pesan dikirim langsung ke simulasi WhatsApp alumni.'
                    : mode === 'Jeda'
                    ? 'Menahan seluruh pengiriman check-in dan balasan otomatis.'
                    : 'Pesan disusun dan dicatat di Agent Log tetapi tidak dikirim ke alumni.'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#C8D6E5]">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Interval Check-in Berkala (7–30 Hari)
            </label>
            <input
              type="number"
              min={7}
              max={30}
              value={form.checkinIntervalDays}
              onChange={(e) =>
                setForm({
                  ...form,
                  checkinIntervalDays: Math.min(
                    30,
                    Math.max(7, Number(e.target.value) || 14)
                  ),
                })
              }
              className="w-full p-2.5 border border-[#C8D6E5] rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Durasi Pendampingan Pasca-Pelatihan (Minggu)
            </label>
            <input
              type="number"
              min={4}
              max={24}
              value={form.mentoringDurationWeeks}
              onChange={(e) =>
                setForm({
                  ...form,
                  mentoringDurationWeeks: Number(e.target.value) || 12,
                })
              }
              className="w-full p-2.5 border border-[#C8D6E5] rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Jam Mulai Pengiriman (Hari Kerja)
            </label>
            <input
              type="time"
              value={form.sendWindowStart}
              onChange={(e) =>
                setForm({ ...form, sendWindowStart: e.target.value })
              }
              className="w-full p-2.5 border border-[#C8D6E5] rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Jam Batas Akhir Pengiriman
            </label>
            <input
              type="time"
              value={form.sendWindowEnd}
              onChange={(e) =>
                setForm({ ...form, sendWindowEnd: e.target.value })
              }
              className="w-full p-2.5 border border-[#C8D6E5] rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Jumlah Maksimal Pengingat Tanpa Balasan (H+3 & H+7)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={form.maxReminders}
              onChange={(e) =>
                setForm({ ...form, maxReminders: Number(e.target.value) || 2 })
              }
              className="w-full p-2.5 border border-[#C8D6E5] rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Batas Maksimal Pesan per Alumni per Hari
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.maxMessagesPerAlumniPerDay}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxMessagesPerAlumniPerDay: Number(e.target.value) || 10,
                })
              }
              className="w-full p-2.5 border border-[#C8D6E5] rounded-lg font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#C8D6E5]">
          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.workingDaysOnly}
              onChange={(e) =>
                setForm({ ...form, workingDaysOnly: e.target.checked })
              }
              className="rounded border-slate-300 text-[#1B3A6B]"
            />
            <span>Hanya kirim check-in pada Hari Kerja (Senin–Jumat)</span>
          </label>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="text-[#2E7D32] font-semibold">
                ✓ Pengaturan berhasil disimpan
              </span>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1B3A6B] hover:bg-[#0D6E8A] text-white font-semibold rounded-lg transition-colors"
            >
              Simpan Pengaturan Agen
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

/**
 * Halaman Agent Log & Consent Audit Log
 */
export const AgentLogView: React.FC<{ db: StorageDatabase }> = ({ db }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [alumniFilter, setAlumniFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'agent_log' | 'consent_log'>(
    'agent_log'
  );

  const filteredLogs = db.agentLogs.filter((l) => {
    const matchCat = categoryFilter === 'all' || l.category === categoryFilter;
    const matchAlum = alumniFilter === 'all' || l.alumniId === alumniFilter;
    return matchCat && matchAlum;
  });

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            Agent Log & Audit Persetujuan Subjek Data
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Catatan transparan setiap pemanggilan tool Gemini (nama, argumen, hasil), validasi orchestrator, scheduler check-in, dan perubahan persetujuan.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F4F6F9] p-1 rounded-lg border border-[#C8D6E5]">
          <button
            onClick={() => setActiveSubTab('agent_log')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeSubTab === 'agent_log'
                ? 'bg-[#1B3A6B] text-white'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            Agent & Tool Call Log ({db.agentLogs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('consent_log')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeSubTab === 'consent_log'
                ? 'bg-[#1B3A6B] text-white'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            Consent & Hak Subjek Data Log ({db.consentLogs.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'agent_log' ? (
        <>
          <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Semua Kategori' },
                { id: 'tool_call', label: 'Tool Calls' },
                { id: 'message', label: 'Pesan WA' },
                { id: 'scheduler', label: 'Scheduler' },
                { id: 'consent', label: 'Persetujuan' },
                { id: 'dry_run', label: 'Dry Run' },
                { id: 'error', label: 'Error / Peringatan' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    categoryFilter === c.id
                      ? 'bg-[#0D6E8A] text-white'
                      : 'bg-[#F4F6F9] text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <select
              value={alumniFilter}
              onChange={(e) => setAlumniFilter(e.target.value)}
              className="px-3 py-1.5 border border-[#C8D6E5] rounded-lg bg-white"
            >
              <option value="all">Semua Alumni</option>
              {db.alumni.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-[#C8D6E5] rounded-xl p-4 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        log.category === 'tool_call'
                          ? 'bg-[#1B3A6B] text-white'
                          : log.category === 'error'
                          ? 'bg-red-100 text-red-700'
                          : log.category === 'dry_run'
                          ? 'bg-purple-100 text-purple-800'
                          : log.category === 'consent'
                          ? 'bg-emerald-100 text-[#2E7D32]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.category}
                    </span>
                    <span className="font-bold text-[#1B3A6B] text-sm">
                      {log.title}
                    </span>
                    <span className="text-slate-500">· {log.alumniName}</span>
                  </div>
                  <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                    {log.timestamp}
                  </span>
                </div>

                <p className="text-slate-700">{log.details}</p>

                {log.toolName && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#F4F6F9] p-3 rounded-lg border border-[#C8D6E5]">
                      <div className="font-mono text-[11px] font-bold text-[#1B3A6B] mb-1">
                        Argumen Tool ({log.toolName}):
                      </div>
                      <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.toolArgs, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-[#F4F6F9] p-3 rounded-lg border border-[#C8D6E5]">
                      <div className="font-mono text-[11px] font-bold text-[#0D6E8A] mb-1">
                        Hasil Eksekusi Tool:
                      </div>
                      <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.toolResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white border border-[#C8D6E5] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F6F9] border-b border-[#C8D6E5] text-[#1B3A6B] font-bold">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Nama Alumni</th>
                <th className="py-3 px-4">Perubahan Status</th>
                <th className="py-3 px-4">Keterangan Audit Hak Subjek Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8D6E5]/60">
              {db.consentLogs.map((cl) => (
                <tr key={cl.id}>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                    {cl.timestamp}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {cl.alumniName}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {cl.previousStatus} →{' '}
                    <strong className="text-[#1B3A6B]">{cl.newStatus}</strong>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{cl.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
