import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  X,
  Save,
  Building2,
  ShieldCheck,
  User,
  Percent,
  HardDrive,
  Plus,
  CheckCircle2,
  Trash2,
  Edit3,
  Phone,
  MapPin,
  FileBadge,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Loader2,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppStateData, PharmacyProfile } from '../../types';
import { createEmptyPharmacyProfile } from '../../utils/db';
import { FileSystemManager } from '../../utils/fileSystem';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppStateData['settings'];
  pharmacyProfiles: PharmacyProfile[];
  activePharmacyId: string;
  onSaveSettings: (newSettings: AppStateData['settings']) => void;
  onSelectPharmacy: (pharmacyId: string) => void;
  onSavePharmacyProfiles: (profiles: PharmacyProfile[], activeId: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning', subtitle?: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  pharmacyProfiles,
  activePharmacyId,
  onSaveSettings,
  onSelectPharmacy,
  onSavePharmacyProfiles,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'pharmacy' | 'system'>('pharmacy');
  const [systemForm, setSystemForm] = useState(settings);
  const [profiles, setProfiles] = useState<PharmacyProfile[]>(pharmacyProfiles);
  const [selectedId, setSelectedId] = useState<string>(activePharmacyId);
  const [editingProfile, setEditingProfile] = useState<PharmacyProfile | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [profileForm, setProfileForm] = useState<PharmacyProfile>(createEmptyPharmacyProfile());

  // Export & Import states
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportingCardId, setExportingCardId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setProfiles(pharmacyProfiles);
  }, [pharmacyProfiles]);

  useEffect(() => {
    setSelectedId(activePharmacyId);
  }, [activePharmacyId]);

  useEffect(() => {
    setSystemForm(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setIsAddingNew(true);
    setEditingProfile(null);
    setProfileForm(createEmptyPharmacyProfile());
  };

  const handleOpenEdit = (profile: PharmacyProfile) => {
    setIsAddingNew(false);
    setEditingProfile(profile);
    setProfileForm({ ...profile });
  };

  const handleSaveProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.namaApotek.trim()) return;

    let updatedProfiles: PharmacyProfile[];
    if (isAddingNew) {
      updatedProfiles = [...profiles, profileForm];
    } else if (editingProfile) {
      updatedProfiles = profiles.map((p) => (p.id === editingProfile.id ? profileForm : p));
    } else {
      return;
    }

    setProfiles(updatedProfiles);
    setIsAddingNew(false);
    setEditingProfile(null);

    // Save directly to parent
    onSavePharmacyProfiles(updatedProfiles, selectedId);
    showToast?.('Profil apotek berhasil disimpan!', 'success');
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      alert('Minimal harus ada 1 profil apotek aktif.');
      return;
    }
    const updated = profiles.filter((p) => p.id !== id);
    const newActiveId = selectedId === id ? updated[0].id : selectedId;
    setProfiles(updated);
    setSelectedId(newActiveId);
    onSavePharmacyProfiles(updated, newActiveId);
    showToast?.('Profil apotek berhasil dihapus.', 'info');
  };

  const handleActivatePharmacy = (profile: PharmacyProfile) => {
    setSelectedId(profile.id);
    onSelectPharmacy(profile.id);
    showToast?.(`Apotek aktif beralih ke "${profile.namaApotek}"`, 'success');
  };

  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(systemForm);
    showToast?.('Parameter sistem berhasil diperbarui!', 'success');
    onClose();
  };

  // Export all pharmacies to Excel
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const res = await FileSystemManager.exportPharmacyProfilesToExcel(profiles, selectedId);
      if (res.success) {
        showToast?.('Data profil apotek berhasil diekspor ke Excel (.xlsx)!', 'success', res.path);
      } else {
        showToast?.('Gagal mengekspor data apotek ke Excel.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast?.('Terjadi kesalahan ekspor Excel: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Download Sample Template for Excel import
  const handleDownloadTemplate = async () => {
    try {
      const res = await FileSystemManager.downloadPharmacyTemplateExcel();
      if (res.success) {
        showToast?.('Template format Excel berhasil diunduh!', 'success', res.path);
      } else {
        showToast?.('Gagal mengunduh template.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast?.('Gagal mengunduh template: ' + (err.message || 'Error'), 'error');
    }
  };

  // Export all pharmacies to PDF
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      const res = await FileSystemManager.exportPharmacyProfilesToPDF(profiles, selectedId);
      if (res.success) {
        showToast?.('Daftar profil & legalitas apotek berhasil diekspor ke PDF!', 'success', res.path);
      } else {
        showToast?.('Gagal mengekspor berkas PDF.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast?.('Terjadi kesalahan saat membuat PDF: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export single pharmacy identity card to PDF
  const handleExportSingleCardPDF = async (profile: PharmacyProfile) => {
    try {
      setExportingCardId(profile.id);
      const res = await FileSystemManager.exportSinglePharmacyToPDF(profile, profile.id === selectedId);
      if (res.success) {
        showToast?.(`Dokumen legalitas "${profile.namaApotek}" siap diunduh!`, 'success', res.path);
      } else {
        showToast?.('Gagal mengekspor kartu profil.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast?.('Gagal mengekspor kartu profil: ' + (err.message || 'Error'), 'error');
    } finally {
      setExportingCardId(null);
    }
  };

  // Import pharmacies from Excel / CSV file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        showToast?.('Berkas Excel kosong atau tidak terbaca.', 'error');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!jsonRows || jsonRows.length === 0) {
        showToast?.('Tidak ada baris data pada sheet pertama Excel.', 'warning');
        return;
      }

      // Helper to find key value case-insensitively
      const getColVal = (row: any, candidates: string[]): string => {
        const rowKeys = Object.keys(row);
        for (const candidate of candidates) {
          const matchedKey = rowKeys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase());
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            return String(row[matchedKey]).trim();
          }
        }
        return '';
      };

      let updatedExistingCount = 0;
      let newAddedCount = 0;
      const currentProfiles = [...profiles];

      jsonRows.forEach((row, idx) => {
        const namaApotek = getColVal(row, [
          'nama sarana apotek',
          'nama apotek',
          'nama sarana',
          'nama',
          'apotek',
          'nama_apotek',
        ]);
        if (!namaApotek) return;

        const alamatApotek = getColVal(row, [
          'alamat lengkap',
          'alamat apotek',
          'alamat',
          'lokasi',
          'alamat_apotek',
        ]);
        const namaApoteker = getColVal(row, [
          'apoteker pengelola (apa)',
          'apoteker pengelola apotek (apa)',
          'nama apoteker',
          'apoteker',
          'apa',
          'nama apa',
          'penanggung jawab',
        ]);
        const sipaNo = getColVal(row, ['nomor sipa', 'no sipa', 'no. sipa', 'sipa', 'sipa_no']);
        const siaNo = getColVal(row, [
          'nomor sia (izin)',
          'nomor sia',
          'no sia',
          'no. sia',
          'sia',
          'sia_no',
          'izin apotek',
        ]);
        const telepon = getColVal(row, [
          'telepon / whatsapp',
          'telepon/wa',
          'no telepon',
          'no. telepon',
          'telepon',
          'telp',
          'no hp',
          'wa',
          'whatsapp',
        ]);
        const kota = getColVal(row, ['kota / wilayah', 'kota', 'wilayah', 'kabupaten', 'kota/kabupaten']);

        const existingIndex = currentProfiles.findIndex(
          (p) => p.namaApotek.trim().toLowerCase() === namaApotek.toLowerCase()
        );

        if (existingIndex >= 0) {
          // Update existing profile details
          currentProfiles[existingIndex] = {
            ...currentProfiles[existingIndex],
            alamatApotek: alamatApotek || currentProfiles[existingIndex].alamatApotek,
            namaApoteker: namaApoteker || currentProfiles[existingIndex].namaApoteker,
            sipaNo: sipaNo || currentProfiles[existingIndex].sipaNo,
            siaNo: siaNo || currentProfiles[existingIndex].siaNo,
            telepon: telepon || currentProfiles[existingIndex].telepon,
            kota: kota || currentProfiles[existingIndex].kota,
          };
          updatedExistingCount++;
        } else {
          // Add as new pharmacy profile
          const newProfile: PharmacyProfile = {
            id: `pharm_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            namaApotek,
            alamatApotek: alamatApotek || 'Alamat belum diatur',
            namaApoteker: namaApoteker || '-',
            sipaNo: sipaNo || '-',
            siaNo: siaNo || undefined,
            telepon: telepon || undefined,
            kota: kota || undefined,
          };
          currentProfiles.push(newProfile);
          newAddedCount++;
        }
      });

      const totalImported = newAddedCount + updatedExistingCount;
      if (totalImported === 0) {
        showToast?.('Tidak ada baris profil yang valid (Kolom Nama Apotek wajib terisi).', 'warning');
        return;
      }

      setProfiles(currentProfiles);
      onSavePharmacyProfiles(currentProfiles, selectedId);

      showToast?.(
        `Impor berhasil: ${newAddedCount} apotek baru ditambahkan, ${updatedExistingCount} profil diperbarui!`,
        'success',
        `Total profil apotek sekarang: ${currentProfiles.length}`
      );
    } catch (err: any) {
      console.error(err);
      showToast?.('Gagal mengimpor Excel: ' + (err.message || 'Format tidak sesuai'), 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl max-w-3xl w-full p-6 text-white shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pengaturan Sistem &amp; Data Apotek Pilihan</h3>
              <p className="text-[11px] text-slate-300">Kelola identitas apotek aktif, nomor SIPA/SIA, dan ekspor/impor data profil.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('pharmacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pharmacy'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Data Apotek Pilihan ({profiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'system'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Parameter PPN &amp; Sistem</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {activeTab === 'pharmacy' && (
            <div className="space-y-4">
              {/* List of profiles & Selection */}
              {!isAddingNew && !editingProfile && (
                <>
                  {/* Action Toolbar for Pharmacy Profiles */}
                  <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div>
                        <span className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          Profil Apotek Terdaftar ({profiles.length})
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Pilih profil aktif untuk digunakan pada kop Surat Pesanan (SP) &amp; kalkulasi.
                        </p>
                      </div>

                      <button
                        onClick={handleOpenAdd}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/30 shrink-0 self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Apotek Baru</span>
                      </button>
                    </div>

                    {/* Export, Import, and PDF Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Export to Excel */}
                        <button
                          onClick={handleExportExcel}
                          disabled={isExportingExcel}
                          className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          title="Ekspor seluruh profil apotek ke file Excel (.xlsx)"
                        >
                          {isExportingExcel ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>Ekspor Excel</span>
                        </button>

                        {/* Import from Excel */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isImporting}
                          className="px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          title="Impor profil apotek dari Excel (.xlsx / .xls / .csv)"
                        >
                          {isImporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-sky-400" />
                          )}
                          <span>Impor Excel</span>
                        </button>

                        {/* Export to PDF */}
                        <button
                          onClick={handleExportPDF}
                          disabled={isExportingPdf}
                          className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          title="Ekspor seluruh rekapitulasi data profil apotek ke PDF resmi"
                        >
                          {isExportingPdf ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>Ekspor PDF</span>
                        </button>
                      </div>

                      {/* Download Excel Template */}
                      <button
                        onClick={handleDownloadTemplate}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
                        title="Unduh contoh template format Excel untuk impor profil apotek"
                      >
                        <Download className="w-3 h-3 text-slate-400" />
                        <span>Unduh Format Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Hidden file input for excel import */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {profiles.map((p) => {
                      const isActive = p.id === selectedId;
                      const isCardExporting = exportingCardId === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-4 rounded-2xl border transition relative flex flex-col justify-between gap-3 ${
                            isActive
                              ? 'bg-indigo-950/60 border-indigo-400/60 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/40'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                  {p.namaApotek}
                                </h4>
                                {isActive && (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Sedang Aktif
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {p.alamatApotek || 'Alamat belum diatur'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Export/Print Single Pharmacy Identity PDF */}
                              <button
                                onClick={() => handleExportSingleCardPDF(p)}
                                disabled={isCardExporting}
                                className="p-1.5 bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/20 rounded-lg transition cursor-pointer"
                                title="Cetak / Ekspor Kartu Legalitas & SIPA Apotek ini ke PDF"
                              >
                                {isCardExporting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Printer className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Edit profil apotek ini"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {profiles.length > 1 && (
                                <button
                                  onClick={() => handleDeleteProfile(p.id)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 rounded-lg transition cursor-pointer"
                                  title="Hapus profil apotek"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300">
                            <div>
                              <span className="text-slate-400 font-medium">Apoteker (APA): </span>
                              <span className="text-white font-semibold">{p.namaApoteker || '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">SIPA: </span>
                              <span className="text-amber-300 font-mono font-semibold">{p.sipaNo || '-'}</span>
                            </div>
                            {p.telepon && (
                              <div>
                                <span className="text-slate-400 font-medium">Telepon: </span>
                                <span className="text-slate-200">{p.telepon}</span>
                              </div>
                            )}
                            {p.siaNo && (
                              <div>
                                <span className="text-slate-400 font-medium">No. SIA: </span>
                                <span className="text-slate-200 font-mono">{p.siaNo}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-white/5">
                            <button
                              onClick={() => handleExportSingleCardPDF(p)}
                              disabled={isCardExporting}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <FileText className="w-3 h-3 text-indigo-400" />
                              <span>Cetak Lembar Legalitas (PDF)</span>
                            </button>

                            {!isActive ? (
                              <button
                                onClick={() => handleActivatePharmacy(p)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pilih Sebagai Apotek Aktif</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aktif pada SP &amp; Kop
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Form Tambah / Edit Apotek */}
              {(isAddingNew || editingProfile) && (
                <form onSubmit={handleSaveProfileForm} className="space-y-3 bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      {isAddingNew ? 'Tambah Sarana Apotek Baru' : `Edit Profil: ${editingProfile?.namaApotek}`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingProfile(null);
                      }}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Batal
                    </button>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Nama Sarana Apotek / Klinik *</label>
                    <input
                      type="text"
                      required
                      placeholder="misal: Apotek Sehat Sentosa"
                      value={profileForm.namaApotek}
                      onChange={(e) => setProfileForm({ ...profileForm, namaApotek: e.target.value })}
                      className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-semibold focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">Alamat Lengkap Apotek *</label>
                    <input
                      type="text"
                      required
                      placeholder="misal: Jl. Boulevard Raya No. 12, Kelapa Gading, Jakarta Utara"
                      value={profileForm.alamatApotek}
                      onChange={(e) => setProfileForm({ ...profileForm, alamatApotek: e.target.value })}
                      className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-200 mb-1">Nama Apoteker Pengelola (APA) *</label>
                      <input
                        type="text"
                        required
                        placeholder="misal: apt. Fulan, S.Farm."
                        value={profileForm.namaApoteker}
                        onChange={(e) => setProfileForm({ ...profileForm, namaApoteker: e.target.value })}
                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-200 mb-1">Nomor SIPA *</label>
                      <input
                        type="text"
                        required
                        placeholder="misal: 19900101/SIPA_31.71/2024/1.2"
                        value={profileForm.sipaNo}
                        onChange={(e) => setProfileForm({ ...profileForm, sipaNo: e.target.value })}
                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-200 mb-1">No. Telepon / WhatsApp</label>
                      <input
                        type="text"
                        placeholder="misal: 021-1234567 / 0812-3344-5566"
                        value={profileForm.telepon || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, telepon: e.target.value })}
                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-200 mb-1">Nomor Izin Apotek (SIA)</label>
                      <input
                        type="text"
                        placeholder="misal: 503/0045/SIA/2023"
                        value={profileForm.siaNo || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, siaNo: e.target.value })}
                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingProfile(null);
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isAddingNew ? 'Simpan Apotek' : 'Perbarui Profil'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <form onSubmit={handleSaveSystem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-indigo-400" />
                    Tarif PPN Farmasi Standar (%)
                  </label>
                  <input
                    type="number"
                    value={systemForm.ppnRate || 11}
                    onChange={(e) => setSystemForm({ ...systemForm, ppnRate: parseFloat(e.target.value) || 11 })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-indigo-300 font-mono font-bold focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk konversi otomatis HNA ke HNA+PPN.</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    Interval Auto-Save (Detik)
                  </label>
                  <input
                    type="number"
                    value={systemForm.autoSaveInterval || 30}
                    onChange={(e) => setSystemForm({ ...systemForm, autoSaveInterval: parseInt(e.target.value) || 30 })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-emerald-300 font-mono font-bold focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Frekuensi sinkronisasi otomatis ke LocalVault / cache.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

