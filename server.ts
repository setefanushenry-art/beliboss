import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser, savePharmacyState, getLatestPharmacyState } from "./src/db/users.ts";

dotenv.config();

let currentFilename = "";
let currentDirname = "";

try {
  if (typeof __filename !== "undefined") {
    currentFilename = __filename;
    currentDirname = __dirname;
  } else {
    currentFilename = fileURLToPath((import.meta as any).url || "");
    currentDirname = path.dirname(currentFilename);
  }
} catch {
  currentFilename = path.join(process.cwd(), "dist", "server.cjs");
  currentDirname = path.join(process.cwd(), "dist");
}

const DEFAULT_PORT = 3000;

// Determine production mode:
// 1. Explicit NODE_ENV === 'production'
// 2. npm lifecycle event === 'start'
// 3. Running from dist/ directory or compiled .cjs file
// 4. Presence of built dist/index.html when not explicitly in dev lifecycle
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.npm_lifecycle_event === "start" ||
  currentFilename.includes("dist") ||
  currentFilename.endsWith(".cjs") ||
  (process.env.npm_lifecycle_event !== "dev" && fs.existsSync(path.join(process.cwd(), "dist", "index.html")));

if (isProduction && !process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();

  // Allow larger payload for captured camera photos / invoice images
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check endpoints for Cloud Run, Kubernetes, and AI Studio
  app.get(["/health", "/api/health", "/healthz", "/_ah/health"], (_req, res) => {
    res.status(200).json({
      status: "ok",
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // AI Camera / File Scanner Endpoint
  app.post("/api/scan-medicine", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", targetHint } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          error: "Foto atau gambar belum diunggah.",
        });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(503).json({
          error: "Layanan Gemini API belum terkonfigurasi. Pastikan GEMINI_API_KEY terdaftar di Secrets.",
          fallback: true,
        });
      }

      // Remove data:image/...;base64, prefix if present
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const validMimeType = mimeType.includes('pdf') ? 'application/pdf' : (mimeType || 'image/jpeg');

      const systemPrompt = `Anda adalah asisten apoteker farmasi profesional dan sistem ekstraksi dokumen farmasi Indonesia (Optical Recognition & Document Intelligence).
Tugas Anda adalah membaca gambar yang diberikan (foto kemasan kotak obat, strip blister, botol obat, faktur/invoice pembelian PBF, brosur pricelist, struk, atau etiket obat).

Instruksi ekstraksi:
1. "nama": Nama obat lengkap, merk/generik, dosis kekuatan zat aktif, dan bentuk sediaan (misal: "Amoxicillin 500 mg Kapsul", "Paracetamol Drop 100mg/ml", "Cefixime 100mg").
2. "sku": Kode barcode (EAN-13, dsb) atau kode barang distributor jika terlihat. Jika tidak ada kode eksplisit, kosongkan string.
3. "kategori": Klasifikasi obat apotek Indonesia: 'reguler' (obat bebas/keras umum), 'prekursor' (mengandung pseudoefedrin, efedrin, ergometrin), atau 'oot' (obat-obat tertentu seperti tramadol, triheksifenidil, dekstrometorfan, amitriptilin, haloperidol, klorpromazin).
4. "pabrik": Nama industri farmasi manufaktur (misal: Kimia Farma, Kalbe Farma, Sanbe, Dexa Medica, Pharos, Bernofarm, Hexpharm).
5. "kemasan": Deskripsi kemasan fisik (misal: "Box 10 Strip @ 10 Tab", "Botol 60 ml", "Tube 10 gram").
6. "satuan": Satuan unit dasar (misal: "Box", "Botol", "Strip", "Tube", "Vial", "Ampul").
7. "pbf": Nama distributor / Pedagang Besar Farmasi jika tertera di kop faktur atau penawaran (misal: "PT. Kimia Farma TD", "PT. Tempo", "PT. Anugrah Argon Medica (AAM)", "PT. Antarmitra Sembada", "PT. Parit Padang Global").
8. "hna": Harga Netto Apotek (harga satuan sebelum diskon & PPN). Jika tertera total dan kuantiti, hitung harga satuan per box/botol. Berupa angka numerik murni.
9. "diskon": Persentase diskon numerik (misal 5.0 untuk 5%). Default 0 jika tidak tertera.
10. "stok": Jumlah kuantiti barang yang tertera (misal: 10).
11. "kontakPbf": Nomor telepon, whatsapp, atau nama sales PBF jika ada.
12. "catatan": No. Batch, tanggal kadaluarsa (ED / Expired Date), atau nomor faktur jika terdeteksi.
13. "items": Jika gambar adalah faktur atau daftar harga dengan beberapa baris obat, masukkan daftar semua obat yang terbaca di sini agar pengguna bisa memilih atau mengimpor sekaligus.

Fokuskan ekstraksi sesuai konteks hint: "${targetHint || 'general'}".`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: validMimeType,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nama: { type: Type.STRING, description: "Nama obat lengkap beserta dosis" },
              sku: { type: Type.STRING, description: "Kode SKU atau barcode" },
              kategori: { type: Type.STRING, description: "'reguler', 'prekursor', atau 'oot'" },
              pabrik: { type: Type.STRING, description: "Produsen / Pabrik" },
              kemasan: { type: Type.STRING, description: "Deskripsi kemasan" },
              satuan: { type: Type.STRING, description: "Satuan kemasan" },
              pbf: { type: Type.STRING, description: "Nama distributor / PBF" },
              hna: { type: Type.NUMBER, description: "HNA satuan" },
              diskon: { type: Type.NUMBER, description: "Diskon persen" },
              stok: { type: Type.NUMBER, description: "Jumlah stok/kuantiti" },
              kontakPbf: { type: Type.STRING, description: "Kontak distributor" },
              catatan: { type: Type.STRING, description: "Batch, Expire date, catatan lain" },
              items: {
                type: Type.ARRAY,
                description: "Daftar semua obat jika gambar berisi banyak item",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nama: { type: Type.STRING },
                    sku: { type: Type.STRING },
                    kategori: { type: Type.STRING },
                    pabrik: { type: Type.STRING },
                    kemasan: { type: Type.STRING },
                    satuan: { type: Type.STRING },
                    pbf: { type: Type.STRING },
                    hna: { type: Type.NUMBER },
                    diskon: { type: Type.NUMBER },
                    stok: { type: Type.NUMBER },
                    catatan: { type: Type.STRING },
                  },
                },
              },
            },
            required: ["nama"],
          },
        },
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error("Error in /api/scan-medicine:", err);
      return res.status(500).json({
        error: err.message || "Gagal memproses gambar pemindaian obat.",
      });
    }
  });

  // Synchronize authenticated user to PostgreSQL Cloud SQL
  app.post("/api/user/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || `${uid}@cloudsql.local`;
      const displayName = req.user?.name || (req.body && req.body.displayName) || null;
      const photoUrl = req.user?.picture || (req.body && req.body.photoUrl) || null;

      if (!uid) {
        return res.status(400).json({ error: "Missing user UID in token" });
      }

      const user = await getOrCreateUser(uid, email, displayName, photoUrl);
      return res.json({ success: true, user });
    } catch (error: any) {
      console.error("Error in /api/user/sync:", error);
      return res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  });

  // Save pharmacy state snapshot to Cloud SQL
  app.post("/api/cloudsql/save", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { namaApotek, stateData } = req.body;
      if (!stateData) {
        return res.status(400).json({ error: "Missing stateData payload" });
      }

      const email = req.user?.email || `${uid}@cloudsql.local`;
      await getOrCreateUser(uid, email, req.user?.name, req.user?.picture);

      const saved = await savePharmacyState(uid, namaApotek || "Apotek FarmasiPro", stateData);
      return res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error("Error in /api/cloudsql/save:", error);
      return res.status(500).json({ error: error.message || "Failed to save state to Cloud SQL" });
    }
  });

  // Load latest pharmacy state from Cloud SQL
  app.get("/api/cloudsql/load", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const record = await getLatestPharmacyState(uid);
      if (!record) {
        return res.json({ success: true, data: null });
      }

      return res.json({ success: true, data: record.stateJson, updatedAt: record.updatedAt });
    } catch (error: any) {
      console.error("Error in /api/cloudsql/load:", error);
      return res.status(500).json({ error: error.message || "Failed to load state from Cloud SQL" });
    }
  });

  // Vite middleware for development vs static serve for production
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), "dist", "index.html"))
      ? path.join(process.cwd(), "dist")
      : fs.existsSync(path.join(currentDirname, "index.html"))
      ? currentDirname
      : path.resolve(currentDirname, "..");

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("<!DOCTYPE html><html><body><h1>FarmasiPro</h1><p>Aplikasi sedang dimuat...</p></body></html>");
      }
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error("Fatal startup error in server:", err);
  process.exit(1);
});
