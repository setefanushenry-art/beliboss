import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  FileText,
  Boxes,
  Tag,
  Building,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
  Maximize2,
  SwitchCamera,
  CheckCircle2,
} from 'lucide-react';
import { DrugCategory, MasterDrugItem, PriceOfferItem, ScannedMedicineData } from '../../types';

interface MedicineVisionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetContext: 'master' | 'pricelist' | 'general';
  existingMasterList?: MasterDrugItem[];
  existingPriceList?: PriceOfferItem[];
  onApplyScannedData: (data: ScannedMedicineData) => void;
  onDirectSaveAndSync?: (data: ScannedMedicineData) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info', detail?: string) => void;
}

export const MedicineVisionScannerModal: React.FC<MedicineVisionScannerModalProps> = ({
  isOpen,
  onClose,
  targetContext,
  onApplyScannedData,
  onDirectSaveAndSync,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<ScannedMedicineData | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat atau peramban tidak mendukung akses kamera langsung.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'Kamera tidak dapat diakses.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Silakan berikan izin kamera pada browser atau gunakan mode Unggah Berkas.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Tidak ditemukan kamera pada perangkat ini. Silakan gunakan tab Unggah Berkas/Foto.';
      } else {
        msg = err.message || 'Gagal memulai kamera perangkat.';
      }
      setCameraError(msg);
    }
  }, [facingMode, stopCamera]);

  // Handle modal visibility and camera state
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !previewImage && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, previewImage, scannedResult, startCamera, stopCamera]);

  // Toggle front/back camera
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Convert and compress an image file to Base64
  const processImageFileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error('Gagal membaca berkas gambar.'));
          return;
        }

        // If it's a PDF, pass as is
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          resolve({ base64: result, mimeType: 'application/pdf' });
          return;
        }

        // For images, resize down to max 1600px via canvas to optimize token/network speed
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            resolve({ base64: compressed, mimeType: 'image/jpeg' });
          } else {
            resolve({ base64: result, mimeType: file.type || 'image/jpeg' });
          }
        };
        img.onerror = () => resolve({ base64: result, mimeType: file.type || 'image/jpeg' });
        img.src = result;
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
      reader.readAsDataURL(file);
    });
  };

  // Capture frame from live video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewImage(dataUrl);
        stopCamera();
        handleAnalyzeImage(dataUrl, 'image/jpeg');
      }
    } catch (err: any) {
      onShowToast('Gagal mengambil tangkapan layar kamera.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { base64, mimeType } = await processImageFileToBase64(file);
      setPreviewImage(base64);
      stopCamera();
      handleAnalyzeImage(base64, mimeType);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal membaca berkas yang dipilih.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Call Server-Side Gemini API for vision extraction
  const handleAnalyzeImage = async (base64Image: string, mimeType: string) => {
    setIsScanning(true);
    setScanStep('Mengunggah gambar ke sistem AI Vision...');

    const stepTimer1 = setTimeout(() => {
      setScanStep('Menganalisis kemasan / faktur obat dengan Gemini AI...');
    }, 900);

    const stepTimer2 = setTimeout(() => {
      setScanStep('Mengekstrak nama obat, HNA, kemasan, PBF, dan barcode...');
    }, 1800);

    try {
      const response = await fetch('/api/scan-medicine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType,
          targetHint: targetContext,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server merespon error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Hasil pemindaian tidak valid.');
      }

      const extracted: ScannedMedicineData = result.data;
      setScannedResult(extracted);
      setSelectedItemIndex(0);

      onShowToast(
        `Berhasil memindai obat "${extracted.nama || 'Terdeteksi'}"!`,
        'success',
        extracted.pbf ? `Distributor: ${extracted.pbf}` : undefined
      );
    } catch (err: any) {
      console.error('OCR Extraction error:', err);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      // Fallback: If server failed or no key, build a smart template from file
      onShowToast(
        err.message || 'Gagal memindai gambar dengan AI. Silakan periksa koneksi atau input manual.',
        'warning'
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Retake photo or clear
  const handleResetScan = () => {
    setPreviewImage(null);
    setScannedResult(null);
    setSelectedItemIndex(0);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Get active item (either top-level or from multi-item array)
  const getActiveItem = (): ScannedMedicineData | null => {
    if (!scannedResult) return null;
    if (scannedResult.items && scannedResult.items.length > 0 && scannedResult.items[selectedItemIndex]) {
      const item = scannedResult.items[selectedItemIndex];
      return {
        nama: item.nama || scannedResult.nama,
        sku: item.sku || scannedResult.sku,
        kategori: item.kategori || scannedResult.kategori || 'reguler',
        pabrik: item.pabrik || scannedResult.pabrik || '-',
        kemasan: item.kemasan || scannedResult.kemasan || 'Box',
        satuan: item.satuan || scannedResult.satuan || 'Box',
        pbf: item.pbf || scannedResult.pbf || '-',
        hna: item.hna ?? scannedResult.hna ?? 0,
        diskon: item.diskon ?? scannedResult.diskon ?? 0,
        stok: item.stok ?? scannedResult.stok ?? 0,
        kontakPbf: scannedResult.kontakPbf,
        catatan: item.catatan || scannedResult.catatan,
      };
    }
    return scannedResult;
  };

  // Apply to form
  const handleApplyToForm = () => {
    const active = getActiveItem();
    if (!active) return;
    onApplyScannedData(active);
    stopCamera();
    onClose();
  };

  // Direct save and sync without manual input
  const handleDirectSave = () => {
    const active = getActiveItem();
    if (!active) return;

    if (onDirectSaveAndSync) {
      onDirectSaveAndSync(active);
      stopCamera();
      onClose();
    } else {
      handleApplyToForm();
    }
  };

  if (!isOpen) return null;

  const activeItem = getActiveItem();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-xl w-full p-5 sm:p-6 text-white shadow-2xl shadow-indigo-950/50 space-y-4 my-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Pemindai Kamera &amp; Berkas AI
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider font-semibold">
                  Multimodal
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pindai kotak kemasan, strip, atau faktur PBF untuk mengisi otomatis formulir obat
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (only if not viewing results) */}
        {!scannedResult && !previewImage && (
          <div className="flex items-center p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => {
                setActiveTab('camera');
                setCameraError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Kamera Langsung</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Unggah Berkas / Foto</span>
            </button>
          </div>
        )}

        {/* 1. CAMERA TAB VIEW */}
        {activeTab === 'camera' && !previewImage && !scannedResult && (
          <div className="space-y-3">
            <div className="relative aspect-4/3 sm:aspect-16/10 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              {cameraError ? (
                <div className="text-center p-6 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Coba Lagi
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('upload');
                        stopCamera();
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Beralih ke Unggah Foto
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Camera Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="w-full max-w-xs aspect-4/3 border-2 border-indigo-400/60 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]">
                      {/* Scanning animated line */}
                      <div className="absolute inset-x-2 top-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                    </div>
                  </div>

                  {/* Switch Camera Button */}
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 transition cursor-pointer"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-[11px] text-slate-300 font-medium border border-white/10">
                      Arahkan kamera ke kotak kemasan atau faktur obat
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Shutter Capture Button */}
            {!cameraError && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={handleCapturePhoto}
                  className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 border-4 border-slate-900 transition cursor-pointer"
                >
                  <Camera className="w-7 h-7" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. UPLOAD FILE TAB VIEW */}
        {activeTab === 'upload' && !previewImage && !scannedResult && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-indigo-400/60 rounded-3xl p-8 text-center cursor-pointer transition bg-white/5 hover:bg-white/10 space-y-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 group-hover:scale-110 transition">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white mb-1">
                  Pilih atau Tarik Berkas Foto / Faktur
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Mendukung foto kemasan obat (JPG, PNG, WEBP) atau faktur distributor / PDF penawaran
                </p>
              </div>
              <span className="inline-block px-3 py-1 bg-white/10 text-indigo-300 text-[11px] font-semibold rounded-xl">
                Buka Galeri / File Perangkat
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*, application/pdf, .pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* 3. SCANNING IN PROGRESS STATE */}
        {isScanning && (
          <div className="py-12 text-center space-y-4 bg-slate-950/60 rounded-2xl border border-white/10 p-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center animate-spin">
                <RefreshCw className="w-8 h-8 text-indigo-400" />
              </div>
              <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-white">Sedang Memindai dengan Gemini AI</h4>
              <p className="text-xs text-indigo-300 font-mono animate-pulse">{scanStep}</p>
            </div>
          </div>
        )}

        {/* 4. SCANNED RESULT PREVIEW & CONFIRMATION */}
        {!isScanning && scannedResult && (
          <div className="space-y-4">
            {/* Multi-item picker if faktur has several drugs */}
            {scannedResult.items && scannedResult.items.length > 1 && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-400" />
                    Terdeteksi {scannedResult.items.length} Baris Obat dari Faktur / Gambar:
                  </span>
                  <span className="text-[11px] text-slate-400">Pilih salah satu item</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 max-h-32">
                  {scannedResult.items.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedItemIndex(idx)}
                      className={`p-2.5 rounded-xl border text-left shrink-0 max-w-[200px] transition cursor-pointer ${
                        selectedItemIndex === idx
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{item.nama}</p>
                      <p className="text-[10px] opacity-80 truncate">
                        {item.pbf || 'PBF'} • Rp {Math.round(item.hna || 0).toLocaleString('id-ID')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Details Card */}
            {activeItem && (
              <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
                      Nama Obat Terdeteksi
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-amber-300">
                      {activeItem.nama}
                    </h4>
                    {activeItem.sku && (
                      <span className="inline-block mt-1 font-mono text-[11px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
                        SKU/Barcode: {activeItem.sku}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      activeItem.kategori === 'prekursor'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : activeItem.kategori === 'oot'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {activeItem.kategori || 'reguler'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-slate-400 block">Distributor / PBF</span>
                    <span className="font-bold text-white text-xs truncate block">
                      {activeItem.pbf || '-'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-slate-400 block">HNA Satuan</span>
                    <span className="font-mono font-bold text-emerald-300 text-xs block">
                      Rp {Math.round(activeItem.hna || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-slate-400 block">Kemasan &amp; Satuan</span>
                    <span className="font-medium text-white text-xs truncate block">
                      {activeItem.kemasan || '-'} ({activeItem.satuan || 'Box'})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-slate-400 block">Pabrik / Produsen</span>
                    <span className="font-medium text-white text-xs truncate block">
                      {activeItem.pabrik || '-'}
                    </span>
                  </div>
                </div>

                {(activeItem.diskon || activeItem.stok || activeItem.catatan) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
                    {activeItem.diskon ? (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md font-mono">
                        Diskon: {activeItem.diskon}%
                      </span>
                    ) : null}
                    {activeItem.stok ? (
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md font-mono">
                        Stok: {activeItem.stok}
                      </span>
                    ) : null}
                    {activeItem.catatan ? (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
                        {activeItem.catatan}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleResetScan}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Pindai Ulang
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyToForm}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Isi ke Kotak Form</span>
                </button>

                {onDirectSaveAndSync && (
                  <button
                    type="button"
                    onClick={handleDirectSave}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
                    title="Simpan langsung ke Master dan Price List tanpa edit manual"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Simpan &amp; Sinkronkan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
