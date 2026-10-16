import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  Award,
  Filter,
} from 'lucide-react';
import { StorageDatabase } from '../types';
import { maskWhatsAppNumber } from '../services/storageService';

interface PimpinanDashboardProps {
  db: StorageDatabase;
  onSelectAlumniInSimulator: (alumniId: string) => void;
}

export const PimpinanDashboard: React.FC<PimpinanDashboardProps> = ({
  db,
  onSelectAlumniInSimulator,
}) => {
  const [trainingFilter, setTrainingFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const filteredAlumni = db.alumni.filter((a) => {
    const matchTraining =
      trainingFilter === 'all' || a.trainingId === trainingFilter;
    const matchRegion =
      regionFilter === 'all' ||
      a.province === regionFilter ||
      a.cityOrRegency === regionFilter;
    const matchPeriod =
      periodFilter === 'all' ||
      (periodFilter === '2026-09' && a.trainingId === 'trn-01') ||
      (periodFilter === '2026-10' && a.trainingId === 'trn-02');
    return matchTraining && matchRegion && matchPeriod;
  });

  // Perhitungan KPI
  const totalAlumni = filteredAlumni.length || 1;
  const agreedCount = filteredAlumni.filter(
    (a) => a.consentStatus === 'agreed'
  ).length;
  const consentRate = Math.round((agreedCount / totalAlumni) * 100);

  const relevantCheckins = db.checkins.filter((c) =>
    filteredAlumni.some((a) => a.id === c.alumniId)
  );
  const respondedCheckins = relevantCheckins.filter((c) => c.responded).length;
  const checkinResponseRate =
    relevantCheckins.length > 0
      ? Math.round((respondedCheckins / relevantCheckins.length) * 100)
      : 85;

  const verifiedCompletedCount = filteredAlumni.filter(
    (a) => a.actionPlan.status === 'Selesai' && a.actionPlan.verifiedByInstructor
  ).length;
  const verifiedCompletionRate = Math.round(
    (verifiedCompletedCount / totalAlumni) * 100
  );

  const openEscalationsCount = db.escalations.filter(
    (e) =>
      e.status === 'open' && filteredAlumni.some((a) => a.id === e.alumniId)
  ).length;

  // Data Grafik 1: Status Rencana Aksi per Pelatihan
  const statusByTrainingData = db.trainings
    .filter((t) => trainingFilter === 'all' || t.id === trainingFilter)
    .map((t) => {
      const group = filteredAlumni.filter((a) => a.trainingId === t.id);
      return {
        name:
          t.id === 'trn-01'
            ? 'Analisis Data Pelayanan Publik'
            : 'Desain Konten Informasi Publik',
        'Selesai (Terverifikasi)': group.filter(
          (a) => a.actionPlan.status === 'Selesai'
        ).length,
        Berjalan: group.filter((a) => a.actionPlan.status === 'Berjalan').length,
        'Perlu Perhatian': group.filter(
          (a) => a.actionPlan.status === 'Perlu Perhatian'
        ).length,
        Terhenti: group.filter((a) => a.actionPlan.status === 'Terhenti').length,
        'Belum Mulai': group.filter(
          (a) => a.actionPlan.status === 'Belum mulai'
        ).length,
      };
    });

  // Data Grafik 2: Sebaran per Kabupaten/Kota
  const cities = Array.from(new Set(filteredAlumni.map((a) => a.cityOrRegency)));
  const statusByCityData = cities.map((city) => {
    const group = filteredAlumni.filter((a) => a.cityOrRegency === city);
    return {
      city,
      Selesai: group.filter((a) => a.actionPlan.status === 'Selesai').length,
      Berjalan: group.filter((a) => a.actionPlan.status === 'Berjalan').length,
      'Perlu Perhatian / Terhenti': group.filter(
        (a) =>
          a.actionPlan.status === 'Perlu Perhatian' ||
          a.actionPlan.status === 'Terhenti'
      ).length,
      'Belum Mulai': group.filter((a) => a.actionPlan.status === 'Belum mulai')
        .length,
    };
  });

  // Daftar Perlu Perhatian & Terhenti
  const attentionList = filteredAlumni.filter(
    (a) =>
      a.actionPlan.status === 'Perlu Perhatian' ||
      a.actionPlan.status === 'Terhenti' ||
      a.actionPlan.proposedCompleted
  );

  // Galeri Praktik Baik (Bukti yang shareConsent === true)
  const galleryItems = db.evidences.filter(
    (e) =>
      e.shareConsent && filteredAlumni.some((a) => a.id === e.alumniId)
  );

  // Ekspor CSV Laporan Evaluasi Pasca-Pelatihan
  const handleExportCSV = () => {
    const headers = [
      'ID Alumni',
      'Nama Alumni',
      'Status Kepegawaian',
      'Instansi',
      'Jabatan',
      'Kabupaten/Kota',
      'Provinsi',
      'WhatsApp (Tersamar)',
      'Program Pelatihan',
      'Status Persetujuan',
      'Judul Rencana Aksi',
      'Status Rencana Aksi',
      'Terverifikasi Instruktur',
      'Tonggak Selesai',
      'Total Tonggak',
      'Jadwal Check-in Berikutnya',
    ];

    const rows = filteredAlumni.map((a) => {
      const trn = db.trainings.find((t) => t.id === a.trainingId);
      const doneMs = a.actionPlan.milestones.filter((m) => m.completed).length;
      const totalMs = a.actionPlan.milestones.length;
      return [
        a.id,
        `"${a.name}"`,
        a.employmentStatus,
        `"${a.institution}"`,
        `"${a.position}"`,
        `"${a.cityOrRegency}"`,
        a.province,
        maskWhatsAppNumber(a.whatsapp),
        `"${trn?.name || ''}"`,
        a.consentStatus,
        `"${a.actionPlan.title.replace(/"/g, '""')}"`,
        a.actionPlan.status,
        a.actionPlan.verifiedByInstructor ? 'Ya' : 'Belum',
        doneMs,
        totalMs,
        a.nextCheckinDate,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Laporan_Evaluasi_APIK_Komdigi_Bandung_${db.simulatedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Kop Surat Khusus Mode Cetak (PDF via Print) */}
      <div className="hidden print-only border-b-2 border-[#1B3A6B] pb-4 mb-6">
        <h1 className="text-xl font-bold text-[#1B3A6B]">
          UPT BALAI PELATIHAN SDM KOMDIGI BANDUNG
        </h1>
        <p className="text-xs text-slate-600">
          Laporan Eksekutif Evaluasi Implementasi Kompetensi Pasca-Pelatihan (Sistem APIK) · Tanggal Laporan: {db.simulatedDate}
        </p>
      </div>

      {/* Header & Tombol Ekspor CSV / Cetak */}
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            Dashboard Eksekutif Pimpinan — Pemantauan Dampak Pasca-Pelatihan
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            UPT Balai Pelatihan SDM Komdigi Bandung · Wilayah Kerja Jawa Barat & Banten · Data Real-time dari Pendampingan AI Agent APIK.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#0D6E8A] hover:bg-[#1B3A6B] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Laporan CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-[#1B3A6B] border border-[#C8D6E5] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-[#0D6E8A]" />
            <span>Tampilan Siap Cetak (PDF)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Pelatihan, Wilayah, Periode) */}
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center gap-2 font-semibold text-[#1B3A6B]">
          <Filter className="w-4 h-4 text-[#0D6E8A]" />
          <span>Filter Laporan:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={trainingFilter}
            onChange={(e) => setTrainingFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#C8D6E5] rounded-lg bg-white text-slate-800"
          >
            <option value="all">Semua Pelatihan</option>
            {db.trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#C8D6E5] rounded-lg bg-white text-slate-800"
          >
            <option value="all">Semua Wilayah (Jawa Barat & Banten)</option>
            <option value="Jawa Barat">Provinsi Jawa Barat</option>
            <option value="Banten">Provinsi Banten</option>
          </select>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#C8D6E5] rounded-lg bg-white text-slate-800"
          >
            <option value="all">Semua Periode Angkatan (Sep–Nov 2026)</option>
            <option value="2026-09">Angkatan September 2026</option>
            <option value="2026-10">Angkatan Oktober 2026</option>
          </select>
        </div>
      </div>

      {/* 4 Kartu KPI Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tingkat Persetujuan Alumni</span>
            <ShieldCheck className="w-4 h-4 text-[#0D6E8A]" />
          </div>
          <div className="text-2xl font-bold text-[#1B3A6B] font-mono tabular-nums">
            {consentRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            {agreedCount} dari {filteredAlumni.length} alumni telah menyetujui pendampingan
          </div>
        </div>

        <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Response Rate Check-in</span>
            <MessageSquare className="w-4 h-4 text-[#0D6E8A]" />
          </div>
          <div className="text-2xl font-bold text-[#0D6E8A] font-mono tabular-nums">
            {checkinResponseRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            Tingkat balasan aktif terhadap sapaan berkala 14 harian
          </div>
        </div>

        <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Rencana Selesai (Terverifikasi)</span>
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div className="text-2xl font-bold text-[#2E7D32] font-mono tabular-nums">
            {verifiedCompletionRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            {verifiedCompletedCount} alumni lulus verifikasi bukti oleh Instruktur
          </div>
        </div>

        <div className="bg-white border border-[#C8D6E5] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Eskalasi Terbuka</span>
            <AlertTriangle className="w-4 h-4 text-[#E67E22]" />
          </div>
          <div className="text-2xl font-bold text-[#E67E22] font-mono tabular-nums">
            {openEscalationsCount}
          </div>
          <div className="text-[11px] text-slate-500">
            Kasus aktif yang sedang ditangani Instruktur / Mentor
          </div>
        </div>
      </div>

      {/* Grafik Recharts: Status per Pelatihan & Sebaran per Kabupaten/Kota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[#1B3A6B]">
              Capaian Status Rencana Aksi per Program Pelatihan
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan progres implementasi antar pelatihan
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusByTrainingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Selesai (Terverifikasi)" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Berjalan" fill="#0D6E8A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Perlu Perhatian" fill="#E67E22" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Terhenti" fill="#DC2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Belum Mulai" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[#1B3A6B]">
              Sebaran Implementasi per Kabupaten/Kota (Jabar & Banten)
            </h3>
            <p className="text-xs text-slate-500">
              Distribusi wilayah instansi alumni peserta pelatihan
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusByCityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="city"
                  type="category"
                  width={135}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Selesai" stackId="a" fill="#2E7D32" />
                <Bar dataKey="Berjalan" stackId="a" fill="#0D6E8A" />
                <Bar dataKey="Perlu Perhatian / Terhenti" stackId="a" fill="#E67E22" />
                <Bar dataKey="Belum Mulai" stackId="a" fill="#94A3B8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daftar "Perlu Perhatian" & "Usulan Verifikasi" */}
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1B3A6B]">
              Daftar Alumni "Perlu Perhatian", "Terhenti", & Menunggu Verifikasi
            </h3>
            <p className="text-xs text-slate-500">
              Alumni yang tidak merespons 2x pengingat check-in (H+7), mengalami hambatan organisasi, atau menunggu pengesahan Instruktur.
            </p>
          </div>
        </div>

        {attentionList.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            Seluruh alumni berjalan sesuai jadwal.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#C8D6E5] text-[#1B3A6B] font-bold">
                  <th className="py-2.5 px-3">Alumni & Instansi</th>
                  <th className="py-2.5 px-3">Wilayah</th>
                  <th className="py-2.5 px-3">Rencana Aksi</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Keterangan Terkini</th>
                  <th className="py-2.5 px-3 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8D6E5]/60">
                {attentionList.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{a.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {a.institution} · {maskWhatsAppNumber(a.whatsapp)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {a.cityOrRegency} ({a.province})
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {a.actionPlan.title}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          a.actionPlan.status === 'Perlu Perhatian'
                            ? 'bg-amber-50 text-[#E67E22] border border-amber-300'
                            : a.actionPlan.status === 'Terhenti'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-sky-50 text-[#0D6E8A] border border-sky-200'
                        }`}
                      >
                        {a.actionPlan.status}
                        {a.actionPlan.proposedCompleted &&
                          a.actionPlan.status !== 'Selesai' &&
                          ' (Usulan Selesai)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                      {a.conversationSummary}
                    </td>
                    <td className="py-2.5 px-3 text-right no-print">
                      <button
                        onClick={() => onSelectAlumniInSimulator(a.id)}
                        className="px-2.5 py-1 bg-[#1B3A6B] hover:bg-[#0D6E8A] text-white rounded text-[11px] font-semibold"
                      >
                        Tinjau Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Galeri Praktik Baik (Karya Alumni yang Memberi Izin Publikasi) */}
      <div className="bg-white border border-[#C8D6E5] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1B3A6B] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#2E7D32]" />
              <span>Galeri Praktik Baik Alumni (Berdasarkan Persetujuan Subjek Data)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan bukti nyata implementasi rencana aksi alumni di instansi pemerintah Jawa Barat dan Banten.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {galleryItems.map((item) => {
            const alumni = db.alumni.find((a) => a.id === item.alumniId);
            const trn = db.trainings.find((t) => t.id === item.trainingId);
            return (
              <div
                key={item.id}
                className="bg-[#F4F6F9] border border-[#C8D6E5] rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#0D6E8A]">
                      {alumni?.cityOrRegency} · {alumni?.province}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.verificationStatus === 'verified'
                          ? 'bg-emerald-100 text-[#2E7D32]'
                          : 'bg-amber-100 text-[#E67E22]'
                      }`}
                    >
                      {item.verificationStatus === 'verified'
                        ? 'Terverifikasi Instruktur'
                        : 'Menunggu Verifikasi'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#1B3A6B]">
                    {item.description}
                  </h4>

                  {item.type === 'image' && item.content.startsWith('data:') ? (
                    <img
                      src={item.content}
                      alt={item.description}
                      referrerPolicy="no-referrer"
                      className="h-32 w-full object-contain rounded border border-slate-200 bg-white"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.content}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#C8D6E5] text-[11px] text-slate-600">
                  <div className="font-semibold text-slate-900">
                    {alumni?.salutation} {alumni?.name} ({alumni?.employmentStatus})
                  </div>
                  <div>{alumni?.institution}</div>
                  <div className="text-slate-400 mt-0.5">{trn?.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
