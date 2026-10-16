import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const apikFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'search_knowledge_base',
    description:
      'Mencari materi dari modul pelatihan resmi berdasarkan kata kunci pertanyaan teknis alumni. Wajib dipanggil sebelum menjawab pertanyaan teknis dan sebutkan rujukan modul/bab.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Kata kunci pencarian materi modul pelatihan (misal: pembersihan data, infografis, pivot table, kontras warna, dsb).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_action_plan',
    description:
      'Menyimpan atau memperbarui rencana aksi SMART alumni beserta daftar 3-5 tonggak (milestones) bertanggal dan status rencana aksi. Catatan: jika status="Selesai" atau "completed", sistem akan menyimpannya sebagai usulan untuk diverifikasi Instruktur.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fields: {
          type: Type.OBJECT,
          description: 'Detail komponen rencana aksi SMART.',
          properties: {
            title: { type: Type.STRING, description: 'Judul rencana aksi konkret' },
            specificGoal: { type: Type.STRING, description: 'Target spesifik (Specific)' },
            measurableIndicator: { type: Type.STRING, description: 'Indikator terukur (Measurable)' },
            achievableSteps: { type: Type.STRING, description: 'Langkah pencapaian (Achievable)' },
            relevantImpact: { type: Type.STRING, description: 'Dampak relevan bagi unit kerja (Relevant)' },
            targetCompletionDate: { type: Type.STRING, description: 'Target tanggal selesai YYYY-MM-DD (Time-bound)' },
          },
        },
        milestones: {
          type: Type.ARRAY,
          description: 'Daftar 3 hingga 5 tonggak pencapaian bertanggal (YYYY-MM-DD).',
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Nama tonggak pencapaian' },
              targetDate: { type: Type.STRING, description: 'Target tanggal YYYY-MM-DD' },
              completed: { type: Type.BOOLEAN, description: 'Apakah tonggak ini sudah selesai' },
            },
            required: ['title', 'targetDate'],
          },
        },
        status: {
          type: Type.STRING,
          description: 'Status rencana aksi: "Belum mulai", "Berjalan", "Selesai", "Terhenti", atau "Perlu Perhatian".',
        },
      },
      required: ['status'],
    },
  },
  {
    name: 'save_evidence',
    description:
      'Menyimpan bukti penerapan rencana aksi yang dikirimkan oleh alumni (berupa gambar/screenshot, tautan/link, atau cerita keberhasilan) beserta status izin tampil di galeri praktik baik.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'Jenis bukti: "image", "link", atau "story"',
        },
        content: {
          type: Type.STRING,
          description: 'Isi bukti (URL tautan, ringkasan cerita, atau penanda lampiran gambar)',
        },
        description: {
          type: Type.STRING,
          description: 'Deskripsi singkat tentang bukti penerapan yang dikirim alumni',
        },
        share_consent: {
          type: Type.BOOLEAN,
          description: 'Apakah alumni mengizinkan bukti ini ditampilkan di Galeri Praktik Baik',
        },
      },
      required: ['type', 'content', 'description', 'share_consent'],
    },
  },
  {
    name: 'create_escalation',
    description:
      'Membuat tiket eskalasi ke Instruktur apabila alumni meminta MENTOR, jawaban tidak ditemukan 2x, ada kendala non-teknis/birokrasi, rencana aksi terhenti, atau ada indikasi sensitif (prioritas Tinggi).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        trigger: {
          type: Type.STRING,
          description: 'Pemicu eskalasi: "MENTOR_COMMAND", "UNANSWERED_2X", "NON_TECHNICAL_BLOCKER", "STALLED_PLAN", atau "SENSITIVE_ISSUE"',
        },
        priority: {
          type: Type.STRING,
          description: 'Prioritas eskalasi: "Normal" atau "Tinggi"',
        },
        summary: {
          type: Type.STRING,
          description: 'Ringkasan masalah, profil singkat, rencana aksi, dan langkah yang sudah dicoba',
        },
        recommendation: {
          type: Type.STRING,
          description: 'Rekomendasi tindak lanjut bagi Instruktur',
        },
      },
      required: ['trigger', 'priority', 'summary', 'recommendation'],
    },
  },
  {
    name: 'log_checkin',
    description:
      'Mencatat hasil check-in berkala dengan alumni, termasuk ringkasan kemajuan/kendala, status kemajuan, dan jadwal check-in berikutnya dalam hari.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: 'Ringkasan hasil check-in dan progres/kendala yang disampaikan alumni',
        },
        progress_status: {
          type: Type.STRING,
          description: 'Klasifikasi status: "Belum mulai", "Berjalan", "Selesai", "Terhenti", atau "Perlu Perhatian"',
        },
        next_checkin_days: {
          type: Type.NUMBER,
          description: 'Jumlah hari menuju jadwal check-in berikutnya (default 14)',
        },
      },
      required: ['summary', 'progress_status', 'next_checkin_days'],
    },
  },
  {
    name: 'send_message',
    description:
      'Mengirimkan pesan balasan ke alumni melalui kanal WhatsApp beserta opsi tombol balasan cepat (quick_replies) jika diperlukan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: 'Isi pesan WhatsApp untuk alumni dalam Bahasa Indonesia yang hangat dan ringkas (maksimal 3 paragraf pendek).',
        },
        quick_replies: {
          type: Type.ARRAY,
          description: 'Daftar teks tombol balasan cepat opsional (maksimal 3 tombol).',
          items: { type: Type.STRING },
        },
      },
      required: ['text'],
    },
  },
];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.post('/api/gemini/agent-turn', async (req, res) => {
    try {
      const { systemInstruction, contents } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY tidak tersedia di server.',
          fallbackRequired: true,
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.4,
          tools: [{ functionDeclarations: apikFunctionDeclarations }],
        },
      });

      const candidateContent = response.candidates?.[0]?.content;
      const functionCalls = response.functionCalls || [];
      let text = '';
      try {
        text = response.text || '';
      } catch {
        text = '';
      }

      return res.json({
        text,
        functionCalls,
        candidateContent,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Gemini API Error:', errMsg);
      return res.status(500).json({
        error: errMsg,
        fallbackRequired: true,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`APIK Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
