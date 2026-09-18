export type DrugCategory = 'reguler' | 'prekursor' | 'oot';

export type MainNavTab = 'transaksi' | 'usulan_obat' | 'pbf' | 'pricelist' | 'master' | 'history' | 'storage';
export type SubNavTab = 'perhitungan' | 'usulan';

export type DocumentOrientation = 'portrait' | 'landscape';

export interface DrugCalculationRow {
  id: string;
  sku: string;
  nama: string;
  hnaPlusPpn: number;
  hna: number;
  diskonPct: number;
  minta: number;
  beli: number;
  pabrik: string;
  kemasan: string;
  pbf: string;
  historyHarga: number;
  tanggal: string;
  stok: number | string; // Kotak stok bisa dituliskan angka maupun huruf (misal: "5 box", "kosong", "2 strip")
  catatan?: string;
  satuan?: string; // Satuan obat (Box, Botol, Strip, Tube, dll.)
  bentukSediaan?: string; // Bentuk sediaan obat (Tablet, Sirup, Drop, Kapsul, Salep, Injeksi, Suspensi, dll.)
  pbfTerakhir?: string; // PBF riwayat terakhir beli (opsional/manual override)
  isBarangBaru?: boolean; // True jika obat ditandai sebagai barang baru tanpa riwayat (PBF, harga history, tanggal kosong)
  historyHargaOverride?: number | null; // Nilai override harga history (0 atau null jika sengaja dikosongkan)
  includePpn?: boolean; // PPN 11% aktif (true, default) atau Harga Jadi / Non PPN (false)
  hargaJadi?: number; // Nilai harga jadi per satuan yang tersimpan
}

export interface MasterDrugItem {
  id: string;
  sku: string;
  nama: string;
  kategori: DrugCategory;
  pabrik: string;
  kemasan: string;
  pbf: string;
  hna: number;
  historyHarga: number;
  tanggal: string;
  stok: number;
  minStok?: number;
  satuan?: string;
  bentukSediaan?: string; // Bentuk sediaan obat
  nomorIzinEdar?: string;
  includePpn?: boolean; // PPN 11% aktif (true, default) atau Harga Jadi / Non PPN (false)
  hargaJadi?: number;
}

export interface DefektaItem {
  id: string;
  sku: string;
  nama: string;
  kategori: DrugCategory;
  stok: number; // Stok Saat Ini
  minStok: number; // Batas Minimum Stok
  satuan: string; // Satuan (Box, Strip, Botol, Tube, Vial, Ampul, Tablet, Kapsul, Pcs)
  pabrik?: string;
  pbf?: string;
  hna?: number;
  diskon?: number;
  hpp?: number;
  jumlahUsul: number; // Jumlah usulan pesanan
  prioritas: 'cito' | 'urgent' | 'rutin';
  status: 'habis' | 'menipis' | 'aman' | 'dipesan' | 'selesai';
  catatan?: string;
  tglDicatat: string;
}

export interface PriceOfferItem {
  id: string;
  sku: string;
  nama: string;
  pbf: string;
  hna: number;
  diskon: number;
  hpp: number;
  stok?: number;
  tglUpdate: string;
  kontakPbf?: string;
  catatan?: string;
  includePpn?: boolean; // PPN 11% aktif (true, default) atau Harga Jadi / Non PPN (false)
  hargaJadi?: number;
}

export interface PurchaseHistoryItem {
  id: string;
  sku: string;
  tgl: string;
  kategori: DrugCategory;
  nama: string;
  pbf: string;
  hna: number;
  diskon: number;
  hpp: number;
  qty: number;
  total: number;
  noSp?: string;
  catatan?: string;
}

export interface ScannedMedicineData {
  nama: string;
  sku?: string;
  kategori?: DrugCategory;
  pabrik?: string;
  kemasan?: string;
  satuan?: string;
  pbf?: string;
  hna?: number;
  diskon?: number;
  stok?: number;
  kontakPbf?: string;
  catatan?: string;
  includePpn?: boolean;
  items?: Array<{
    nama: string;
    sku?: string;
    kategori?: DrugCategory;
    pabrik?: string;
    kemasan?: string;
    satuan?: string;
    pbf?: string;
    hna?: number;
    diskon?: number;
    stok?: number;
    catatan?: string;
  }>;
}

export interface LocalVaultFile {
  id: string;
  name: string;
  size: number;
  type: 'json' | 'xlsx' | 'pdf' | 'csv' | 'backup';
  timestamp: string;
  category?: string;
  itemCount?: number;
  dataBase64?: string;
  jsonData?: any;
}

export interface ConnectedFolderInfo {
  isConnected: boolean;
  folderName: string;
  lastSync?: string;
  autoSync: boolean;
  fileCount: number;
  pathHint?: string;
}

export interface PharmacyProfile {
  id: string;
  namaApotek: string;
  alamatApotek: string;
  sipaNo: string;
  namaApoteker: string;
  telepon?: string;
  siaNo?: string;
  kota?: string;
  isDefault?: boolean;
}

export interface SupplierItem {
  id: string;
  kode: string;
  nama: string;
  alamat?: string;
  salesNama?: string;
  salesKontak?: string;
  tempoHari?: number;
  minOrder?: number;
  diskonCODDefault?: number;
  catatan?: string;
  isAutoRegistered?: boolean; // PBF yang didaftarkan secara otomatis saat pengetikan manual
}

export interface UsulanObatItem {
  id: string;
  namaObat: string;
  apotekPeminta: string; // Outlet atau Apotek yang meminta
  jumlah: number; // Jumlah yang diusulkan / diminta
  satuan: string; // Satuan (Box, Strip, Botol, Tube, Vial, Ampul, Tablet, Kapsul, Pcs)
  kategori: DrugCategory;
  prioritas: 'cito' | 'urgent' | 'rutin';
  status: 'menunggu' | 'disetujui' | 'dipesan' | 'selesai';
  pemohon?: string; // Nama staf / apoteker / kasir peminta
  catatan?: string; // Catatan / alasan kebutuhan
  pabrik?: string;
  pbf?: string;
  perkiraanHna?: number;
  tanggal: string; // YYYY-MM-DD
}

export interface AppStateData {
  rows: Record<DrugCategory, DrugCalculationRow[]>;
  diskonCOD: Record<DrugCategory, number>;
  targetPbfOrder?: Record<DrugCategory, string>; // PBF tujuan pemesanan kolektif per kategori
  masterList: MasterDrugItem[];
  defektaList: DefektaItem[];
  usulanObatList?: UsulanObatItem[];
  outletsList?: string[];
  priceList: PriceOfferItem[];
  history: PurchaseHistoryItem[];
  vaultFiles: LocalVaultFile[];
  pharmacyProfiles: PharmacyProfile[];
  activePharmacyId: string;
  suppliers: SupplierItem[];
  unitsList?: string[]; // Daftar master satuan obat (Box, Strip, Botol, Tablet, dll.)
  settings: {
    namaApotek: string;
    alamatApotek: string;
    sipaNo: string;
    namaApoteker: string;
    autoSaveInterval: number;
    ppnRate: number;
    teleponApotek?: string;
    siaNo?: string;
  };
}

