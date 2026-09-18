import { AppStateData, DefektaItem, DrugCalculationRow, DrugCategory, MasterDrugItem, PriceOfferItem, PurchaseHistoryItem, LocalVaultFile, PharmacyProfile, SupplierItem, UsulanObatItem } from '../types';

export const DEFAULT_OUTLETS_LIST: string[] = [
  'Apotek Sehat Sejahtera (Pusat)',
  'Apotek Farma Medika 24',
  'Klinik Pratama Sentosa',
  'Apotek Cabang Sudirman',
  'Depo Rawat Jalan',
  'Instalasi Farmasi IGD',
];

export const DEFAULT_USULAN_OBAT_ITEMS: UsulanObatItem[] = [
  {
    id: 'usul_1',
    namaObat: 'Paracetamol 500mg Tablet',
    apotekPeminta: 'Apotek Farma Medika 24',
    jumlah: 10,
    satuan: 'Box',
    kategori: 'reguler',
    prioritas: 'urgent',
    status: 'menunggu',
    pemohon: 'apt. Rina Kartika',
    catatan: 'Permintaan resep flu/demam tinggi minggu ini, sisa 1 box di etalase',
    pabrik: 'Kimia Farma',
    pbf: 'SMA',
    perkiraanHna: 15000,
    tanggal: '2026-03-02',
  },
  {
    id: 'usul_2',
    namaObat: 'Cefixime 100mg Kapsul',
    apotekPeminta: 'Apotek Sehat Sejahtera (Pusat)',
    jumlah: 5,
    satuan: 'Box',
    kategori: 'reguler',
    prioritas: 'rutin',
    status: 'disetujui',
    pemohon: 'apt. Setefanus Henry',
    catatan: 'Buffer stock untuk resep spesialis penyakit dalam',
    pabrik: 'Dexa Medica',
    pbf: 'TSJ',
    perkiraanHna: 125000,
    tanggal: '2026-03-01',
  },
  {
    id: 'usul_3',
    namaObat: 'Tremenza Tablet',
    apotekPeminta: 'Klinik Pratama Sentosa',
    jumlah: 4,
    satuan: 'Box',
    kategori: 'prekursor',
    prioritas: 'cito',
    status: 'menunggu',
    pemohon: 'apt. Hendra Wijaya',
    catatan: 'Stok habis total, permintaan dokter poli THT cito',
    pabrik: 'Sanbe Farma',
    pbf: 'TSJ',
    perkiraanHna: 89000,
    tanggal: '2026-03-02',
  },
  {
    id: 'usul_4',
    namaObat: 'Omeprazole 20mg Kapsul',
    apotekPeminta: 'Apotek Cabang Sudirman',
    jumlah: 15,
    satuan: 'Box',
    kategori: 'reguler',
    prioritas: 'rutin',
    status: 'disetujui',
    pemohon: 'Kasir Shift Pagi',
    catatan: 'Fast moving obat lambung, stok harian menipis',
    pabrik: 'Novell Pharma',
    pbf: 'APL',
    perkiraanHna: 35000,
    tanggal: '2026-03-01',
  },
  {
    id: 'usul_5',
    namaObat: 'Tramadol 50mg Kapsul',
    apotekPeminta: 'Instalasi Farmasi IGD',
    jumlah: 5,
    satuan: 'Box',
    kategori: 'oot',
    prioritas: 'cito',
    status: 'menunggu',
    pemohon: 'apt. Maya Lestari',
    catatan: 'Kebutuhan analgesik kuat IGD, segera proses SP OOT',
    pabrik: 'Phapros',
    pbf: 'APL',
    perkiraanHna: 55000,
    tanggal: '2026-03-02',
  },
  {
    id: 'usul_6',
    namaObat: 'Amoxicillin 500mg Kapsul',
    apotekPeminta: 'Depo Rawat Jalan',
    jumlah: 8,
    satuan: 'Box',
    kategori: 'reguler',
    prioritas: 'rutin',
    status: 'menunggu',
    pemohon: 'Staf Depo 1',
    catatan: 'Sisa stok 2 box di lemari depo',
    pabrik: 'Dexa Medica',
    pbf: 'TSJ',
    perkiraanHna: 42000,
    tanggal: '2026-03-02',
  },
];

export const DEFAULT_PHARMACY_PROFILES: PharmacyProfile[] = [
  {
    id: 'apt_1',
    namaApotek: 'Apotek Sehat Sejahtera',
    alamatApotek: 'Jl. Merdeka No. 45, Jakarta Pusat',
    sipaNo: '19880412/SIPA_31.71/2024/2.1',
    namaApoteker: 'apt. Setefanus Henry, S.Farm.',
    telepon: '021-3456789 / 0812-9988-7766',
    siaNo: '503/0012/SIA/DPMPTSP/2023',
    kota: 'Jakarta Pusat',
    isDefault: true,
  },
  {
    id: 'apt_2',
    namaApotek: 'Apotek Farma Medika 24',
    alamatApotek: 'Jl. Raya Sudirman No. 108, Jakarta Selatan',
    sipaNo: '19920515/SIPA_31.74/2023/1.4',
    namaApoteker: 'apt. Rina Kartika, S.Farm.',
    telepon: '021-7890123 / 0813-1122-3344',
    siaNo: '503/0088/SIA/DPMPTSP/2022',
    kota: 'Jakarta Selatan',
    isDefault: false,
  },
  {
    id: 'apt_3',
    namaApotek: 'Klinik Pratama & Farmasi Sentosa',
    alamatApotek: 'Jl. Gatot Subroto No. 22, Jakarta Barat',
    sipaNo: '19850920/SIPA_31.73/2024/3.0',
    namaApoteker: 'apt. Hendra Wijaya, M.Farm.',
    telepon: '021-5678901 / 0811-5566-7788',
    siaNo: '503/0145/SIA/DPMPTSP/2024',
    kota: 'Jakarta Barat',
    isDefault: false,
  },
];

export const DEFAULT_SUPPLIERS: SupplierItem[] = [
  {
    id: 'sup_1',
    kode: 'SMA',
    nama: 'PT. Sari Mutu Farma (SMA)',
    alamat: 'Kawasan Industri Pulogadung Blok B No. 12, Jakarta Timur',
    salesNama: 'Bpk. Doni Pratama',
    salesKontak: '0812-3456-7890',
    tempoHari: 30,
    minOrder: 500000,
    diskonCODDefault: 2,
    catatan: 'Diskon COD 2% untuk order > 10 box. Pengiriman H+1 order sebelum jam 14.00.',
  },
  {
    id: 'sup_2',
    kode: 'TSJ',
    nama: 'PT. Tri Sapta Jaya (TSJ)',
    alamat: 'Jl. Daan Mogot KM 14 No. 8, Cengkareng, Jakarta Barat',
    salesNama: 'Ibu Siska Amelia',
    salesKontak: '0813-9876-5432',
    tempoHari: 21,
    minOrder: 300000,
    diskonCODDefault: 1.5,
    catatan: 'Free ongkir jabodetabek. Spesialis produk Sanbe & Dexa.',
  },
  {
    id: 'sup_3',
    kode: 'APL',
    nama: 'PT. Anugerah Pharmindo Lestari (APL)',
    alamat: 'Jl. Rawa Gelam V Kav. 8, Pulogadung, Jakarta Timur',
    salesNama: 'Bpk. Hendra Gunawan',
    salesKontak: '0811-2233-4455',
    tempoHari: 30,
    minOrder: 1000000,
    diskonCODDefault: 0,
    catatan: 'Distributor resmi principal internasional & ethical premium.',
  },
  {
    id: 'sup_4',
    kode: 'EPM',
    nama: 'PT. Enseval Putera Megatrading (EPM)',
    alamat: 'Jl. Pulo Lentut No. 10, Kawasan Industri Pulogadung',
    salesNama: 'Ibu Maya Lestari',
    salesKontak: '0815-5566-7788',
    tempoHari: 30,
    minOrder: 750000,
    diskonCODDefault: 2.5,
    catatan: 'Wajib SP Prekursor / OOT Asli 3 Rangkap & SIPA aktif.',
  },
  {
    id: 'sup_5',
    kode: 'KFTD',
    nama: 'PT. Kimia Farma Trading & Distribution (KFTD)',
    alamat: 'Jl. Budi Utomo No. 1, Pasar Baru, Jakarta Pusat',
    salesNama: 'Bpk. Arif Wibowo',
    salesKontak: '0812-7788-9900',
    tempoHari: 30,
    minOrder: 500000,
    diskonCODDefault: 1,
    catatan: 'Distributor utama seluruh lini obat generik Kimia Farma.',
  },
  {
    id: 'sup_6',
    kode: 'MBS',
    nama: 'PT. Mensa Bina Sukses (MBS)',
    alamat: 'Jl. P. Jayakarta No. 129, Mangga Dua Selatan, Jakarta',
    salesNama: 'Bpk. Kevin Tan',
    salesKontak: '0818-0987-6543',
    tempoHari: 28,
    minOrder: 500000,
    diskonCODDefault: 2,
    catatan: 'Diskon program reguler bulanan.',
  },
];

export const DEFAULT_DEFEKTA_ITEMS: DefektaItem[] = [
  {
    id: 'def_1',
    sku: 'SKU-PRE-9X1Y2',
    nama: 'Tremenza Tablet',
    kategori: 'prekursor',
    stok: 2,
    minStok: 5,
    satuan: 'Box',
    pabrik: 'Sanbe Farma',
    pbf: 'TSJ',
    hna: 89000,
    diskon: 3,
    hpp: 95828,
    jumlahUsul: 5,
    prioritas: 'urgent',
    status: 'menipis',
    catatan: 'Permintaan resep flu batuk tinggi minggu ini',
    tglDicatat: '2026-02-28',
  },
  {
    id: 'def_2',
    sku: 'SKU-OOT-9K2L1',
    nama: 'Tramadol Cap 50mg',
    kategori: 'oot',
    stok: 0,
    minStok: 5,
    satuan: 'Box',
    pabrik: 'Phapros',
    pbf: 'APL',
    hna: 55000,
    diskon: 0,
    hpp: 61050,
    jumlahUsul: 5,
    prioritas: 'cito',
    status: 'habis',
    catatan: 'Stok kosong per kemarin sore, segera pesan',
    tglDicatat: '2026-02-28',
  },
  {
    id: 'def_3',
    sku: 'SKU-REG-1B90X',
    nama: 'Amoxicillin Cap 500mg',
    kategori: 'reguler',
    stok: 4,
    minStok: 10,
    satuan: 'Box',
    pabrik: 'Dexa Medica',
    pbf: 'TSJ',
    hna: 42000,
    diskon: 2,
    hpp: 45688,
    jumlahUsul: 10,
    prioritas: 'rutin',
    status: 'menipis',
    catatan: 'Sisa 4 box, safety stock 10 box',
    tglDicatat: '2026-02-27',
  },
];

export const DEFAULT_UNITS_LIST: string[] = [
  'Box',
  'Botol',
  'Strip',
  'Tablet',
  'Kapsul',
  'Tube',
  'Vial',
  'Ampul',
  'Pcs',
  'Sachet',
  'Roll',
  'Pot',
  'Supp',
  'Blister',
  'Flash',
  'Pen',
  'Pack',
  'Jerigen',
  'Plester',
  'Kaplet',
  'Flacon',
  'Doos',
];

export const DEFAULT_INITIAL_STATE: AppStateData = {
  rows: {
    reguler: [
      {
        id: 'r_reg_1',
        sku: 'SKU-REG-8F3A2',
        nama: 'Paracetamol Tab 500mg',
        hnaPlusPpn: 16650,
        hna: 15000,
        diskonPct: 5,
        minta: 10,
        beli: 10,
        pabrik: 'Kimia Farma',
        kemasan: 'Box 100 tab',
        pbf: 'SMA',
        historyHarga: 14500,
        tanggal: '2026-02-15',
        stok: 45,
      },
      {
        id: 'r_reg_2',
        sku: 'SKU-REG-1B90X',
        nama: 'Amoxicillin Cap 500mg',
        hnaPlusPpn: 46620,
        hna: 42000,
        diskonPct: 2,
        minta: 5,
        beli: 5,
        pabrik: 'Dexa Medica',
        kemasan: 'Box 100 cap',
        pbf: 'TSJ',
        historyHarga: 40000,
        tanggal: '2026-02-10',
        stok: 12,
      },
      {
        id: 'r_reg_3',
        sku: 'SKU-REG-3P7Q8',
        nama: 'Ibuprofen Tab 400mg',
        hnaPlusPpn: 31080,
        hna: 28000,
        diskonPct: 0,
        minta: 8,
        beli: 8,
        pabrik: 'Sanbe Farma',
        kemasan: 'Box 100 tab',
        pbf: 'SMA',
        historyHarga: 27500,
        tanggal: '2026-02-18',
        stok: 30,
      },
    ],
    prekursor: [
      {
        id: 'r_pre_1',
        sku: 'SKU-PRE-5C4D3',
        nama: 'Pseudoephedrine HCL 30mg Tab',
        hnaPlusPpn: 75480,
        hna: 68000,
        diskonPct: 0,
        minta: 4,
        beli: 4,
        pabrik: 'Kalbe Farma',
        kemasan: 'Box 50 tab',
        pbf: 'EPM',
        historyHarga: 65000,
        tanggal: '2026-01-28',
        stok: 8,
      },
      {
        id: 'r_pre_2',
        sku: 'SKU-PRE-9X1Y2',
        nama: 'Tremenza Tablet',
        hnaPlusPpn: 98790,
        hna: 89000,
        diskonPct: 3,
        minta: 3,
        beli: 3,
        pabrik: 'Sanbe Farma',
        kemasan: 'Box 100 tab',
        pbf: 'TSJ',
        historyHarga: 86000,
        tanggal: '2026-02-05',
        stok: 5,
      },
    ],
    oot: [
      {
        id: 'r_oot_1',
        sku: 'SKU-OOT-9K2L1',
        nama: 'Tramadol Cap 50mg',
        hnaPlusPpn: 61050,
        hna: 55000,
        diskonPct: 0,
        minta: 5,
        beli: 5,
        pabrik: 'Phapros',
        kemasan: 'Box 50 cap',
        pbf: 'APL',
        historyHarga: 54000,
        tanggal: '2026-02-01',
        stok: 5,
      },
      {
        id: 'r_oot_2',
        sku: 'SKU-OOT-4M6N8',
        nama: 'Amitriptyline Tab 25mg',
        hnaPlusPpn: 38850,
        hna: 35000,
        diskonPct: 4,
        minta: 6,
        beli: 6,
        pabrik: 'Indofarma',
        kemasan: 'Box 100 tab',
        pbf: 'SMA',
        historyHarga: 34000,
        tanggal: '2026-01-20',
        stok: 10,
      },
    ],
  },
  diskonCOD: {
    reguler: 1.5,
    prekursor: 0,
    oot: 0,
  },
  targetPbfOrder: {
    reguler: '',
    prekursor: '',
    oot: '',
  },
  masterList: [
    {
      id: 'm1',
      sku: 'SKU-REG-8F3A2',
      nama: 'Paracetamol Tab 500mg',
      kategori: 'reguler',
      pabrik: 'Kimia Farma',
      kemasan: 'Box 100 tab',
      pbf: 'SMA',
      hna: 15000,
      historyHarga: 14500,
      tanggal: '2026-02-15',
      stok: 45,
      minStok: 15,
      satuan: 'Box',
    },
    {
      id: 'm2',
      sku: 'SKU-REG-1B90X',
      nama: 'Amoxicillin Cap 500mg',
      kategori: 'reguler',
      pabrik: 'Dexa Medica',
      kemasan: 'Box 100 cap',
      pbf: 'TSJ',
      hna: 42000,
      historyHarga: 40000,
      tanggal: '2026-02-10',
      stok: 12,
      minStok: 10,
      satuan: 'Box',
    },
    {
      id: 'm3',
      sku: 'SKU-PRE-5C4D3',
      nama: 'Pseudoephedrine HCL 30mg Tab',
      kategori: 'prekursor',
      pabrik: 'Kalbe Farma',
      kemasan: 'Box 50 tab',
      pbf: 'EPM',
      hna: 68000,
      historyHarga: 65000,
      tanggal: '2026-01-28',
      stok: 8,
      minStok: 5,
      satuan: 'Box',
    },
    {
      id: 'm4',
      sku: 'SKU-OOT-9K2L1',
      nama: 'Tramadol Cap 500mg',
      kategori: 'oot',
      pabrik: 'Phapros',
      kemasan: 'Box 50 cap',
      pbf: 'APL',
      hna: 55000,
      historyHarga: 54000,
      tanggal: '2026-02-01',
      stok: 5,
      minStok: 5,
      satuan: 'Box',
    },
    {
      id: 'm5',
      sku: 'SKU-REG-3P7Q8',
      nama: 'Ibuprofen Tab 400mg',
      kategori: 'reguler',
      pabrik: 'Sanbe Farma',
      kemasan: 'Box 100 tab',
      pbf: 'SMA',
      hna: 28000,
      historyHarga: 27500,
      tanggal: '2026-02-18',
      stok: 30,
      minStok: 10,
      satuan: 'Box',
    },
    {
      id: 'm6',
      sku: 'SKU-PRE-9X1Y2',
      nama: 'Tremenza Tablet',
      kategori: 'prekursor',
      pabrik: 'Sanbe Farma',
      kemasan: 'Box 100 tab',
      pbf: 'TSJ',
      hna: 89000,
      historyHarga: 86000,
      tanggal: '2026-02-05',
      stok: 5,
      minStok: 5,
      satuan: 'Box',
    },
    {
      id: 'm7',
      sku: 'SKU-OOT-4M6N8',
      nama: 'Amitriptyline Tab 25mg',
      kategori: 'oot',
      pabrik: 'Indofarma',
      kemasan: 'Box 100 tab',
      pbf: 'SMA',
      hna: 35000,
      historyHarga: 34000,
      tanggal: '2026-01-20',
      stok: 10,
      minStok: 6,
      satuan: 'Box',
    },
    {
      id: 'm8',
      sku: 'SKU-REG-7W2V9',
      nama: 'Cetirizine 10mg Tab',
      kategori: 'reguler',
      pabrik: 'Novell Pharma',
      kemasan: 'Box 100 tab',
      pbf: 'APL',
      hna: 22000,
      historyHarga: 21500,
      tanggal: '2026-02-14',
      stok: 25,
      minStok: 10,
      satuan: 'Box',
    },
  ],
  defektaList: DEFAULT_DEFEKTA_ITEMS,
  priceList: [
    {
      id: 'pl1',
      sku: 'SKU-REG-8F3A2',
      nama: 'Paracetamol Tab 500mg',
      pbf: 'SMA',
      hna: 15000,
      diskon: 5,
      hpp: 15817.5,
      stok: 120,
      tglUpdate: '2026-02-20',
      kontakPbf: '0812-3456-7890 (Bpk. Doni)',
      catatan: 'Diskon COD 2% untuk order > 10 box',
    },
    {
      id: 'pl2',
      sku: 'SKU-REG-8F3A2',
      nama: 'Paracetamol Tab 500mg',
      pbf: 'TSJ',
      hna: 15500,
      diskon: 7,
      hpp: 15999.5,
      stok: 85,
      tglUpdate: '2026-02-22',
      kontakPbf: '0813-9876-5432 (Ibu Siska)',
      catatan: 'Free ongkir',
    },
    {
      id: 'pl3',
      sku: 'SKU-REG-1B90X',
      nama: 'Amoxicillin Cap 500mg',
      pbf: 'TSJ',
      hna: 42000,
      diskon: 2,
      hpp: 45688,
      stok: 40,
      tglUpdate: '2026-02-10',
      kontakPbf: '0813-9876-5432',
      catatan: 'Stok tersedia banyak',
    },
    {
      id: 'pl4',
      sku: 'SKU-REG-1B90X',
      nama: 'Amoxicillin Cap 500mg',
      pbf: 'APL',
      hna: 41000,
      diskon: 0,
      hpp: 45510,
      stok: 25,
      tglUpdate: '2026-02-18',
      kontakPbf: '0811-2233-4455',
      catatan: 'Harga promo awal bulan',
    },
    {
      id: 'pl5',
      sku: 'SKU-PRE-5C4D3',
      nama: 'Pseudoephedrine HCL 30mg Tab',
      pbf: 'EPM',
      hna: 68000,
      diskon: 0,
      hpp: 75480,
      stok: 15,
      tglUpdate: '2026-02-15',
      kontakPbf: '0815-5566-7788',
      catatan: 'Wajib SP Prekursor Resmi 3 Rangkap',
    },
  ],
  history: [
    {
      id: 'h1',
      sku: 'SKU-REG-8F3A2',
      tgl: '2026-02-15',
      kategori: 'reguler',
      nama: 'Paracetamol Tab 500mg',
      pbf: 'SMA',
      hna: 15000,
      diskon: 5,
      hpp: 15817.5,
      qty: 10,
      total: 158175,
      noSp: 'SP-REG-2026/02/001',
    },
    {
      id: 'h2',
      sku: 'SKU-REG-1B90X',
      tgl: '2026-02-10',
      kategori: 'reguler',
      nama: 'Amoxicillin Cap 500mg',
      pbf: 'TSJ',
      hna: 42000,
      diskon: 2,
      hpp: 45688,
      qty: 5,
      total: 228440,
      noSp: 'SP-REG-2026/02/002',
    },
    {
      id: 'h3',
      sku: 'SKU-PRE-5C4D3',
      tgl: '2026-01-28',
      kategori: 'prekursor',
      nama: 'Pseudoephedrine HCL 30mg Tab',
      pbf: 'EPM',
      hna: 68000,
      diskon: 0,
      hpp: 75480,
      qty: 4,
      total: 301920,
      noSp: 'SP-PRE-2026/01/014',
    },
  ],
  vaultFiles: [
    {
      id: 'vf_1',
      name: 'Backup_Database_Apotek_Master.json',
      size: 14280,
      type: 'json',
      timestamp: '2026-02-28 14:30',
      category: 'Master Data & Riwayat',
      itemCount: 8,
    },
    {
      id: 'vf_2',
      name: 'Rekapitulasi_Pengadaan_Februari_2026.xlsx',
      size: 28650,
      type: 'xlsx',
      timestamp: '2026-02-27 10:15',
      category: 'Laporan Excel',
      itemCount: 17,
    },
  ],
  usulanObatList: DEFAULT_USULAN_OBAT_ITEMS,
  outletsList: DEFAULT_OUTLETS_LIST,
  pharmacyProfiles: DEFAULT_PHARMACY_PROFILES,
  activePharmacyId: 'apt_1',
  suppliers: DEFAULT_SUPPLIERS,
  unitsList: DEFAULT_UNITS_LIST,
  settings: {
    namaApotek: 'Apotek Sehat Sejahtera',
    alamatApotek: 'Jl. Merdeka No. 45, Jakarta Pusat',
    sipaNo: '19880412/SIPA_31.71/2024/2.1',
    namaApoteker: 'apt. Setefanus Henry, S.Farm.',
    autoSaveInterval: 30,
    ppnRate: 11,
  },
};

const STORAGE_KEY = 'apotek_pembelian_obat_v4';

export function loadAppState(): AppStateData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const profiles: PharmacyProfile[] = parsed.pharmacyProfiles && parsed.pharmacyProfiles.length > 0
        ? parsed.pharmacyProfiles
        : DEFAULT_PHARMACY_PROFILES;
      
      const activeId = parsed.activePharmacyId || profiles[0]?.id || 'apt_1';
      const activeProfile = profiles.find((p) => p.id === activeId) || profiles[0];

      return {
        ...DEFAULT_INITIAL_STATE,
        ...parsed,
        pharmacyProfiles: profiles,
        activePharmacyId: activeId,
        history: Array.isArray(parsed.history) ? parsed.history : DEFAULT_INITIAL_STATE.history,
        suppliers: parsed.suppliers && parsed.suppliers.length > 0 ? parsed.suppliers : DEFAULT_SUPPLIERS,
        unitsList: parsed.unitsList && Array.isArray(parsed.unitsList) && parsed.unitsList.length > 0 ? parsed.unitsList : DEFAULT_UNITS_LIST,
        defektaList: parsed.defektaList && parsed.defektaList.length > 0 ? parsed.defektaList : DEFAULT_DEFEKTA_ITEMS,
        usulanObatList: parsed.usulanObatList && Array.isArray(parsed.usulanObatList) ? parsed.usulanObatList : DEFAULT_USULAN_OBAT_ITEMS,
        outletsList: parsed.outletsList && Array.isArray(parsed.outletsList) && parsed.outletsList.length > 0 ? parsed.outletsList : DEFAULT_OUTLETS_LIST,
        rows: {
          ...DEFAULT_INITIAL_STATE.rows,
          ...(parsed.rows || {}),
        },
        diskonCOD: {
          ...DEFAULT_INITIAL_STATE.diskonCOD,
          ...(parsed.diskonCOD || {}),
        },
        targetPbfOrder: {
          ...DEFAULT_INITIAL_STATE.targetPbfOrder,
          ...(parsed.targetPbfOrder || {}),
        },
        settings: {
          ...DEFAULT_INITIAL_STATE.settings,
          ...(parsed.settings || {}),
          namaApotek: activeProfile?.namaApotek || parsed.settings?.namaApotek || DEFAULT_INITIAL_STATE.settings.namaApotek,
          alamatApotek: activeProfile?.alamatApotek || parsed.settings?.alamatApotek || DEFAULT_INITIAL_STATE.settings.alamatApotek,
          sipaNo: activeProfile?.sipaNo || parsed.settings?.sipaNo || DEFAULT_INITIAL_STATE.settings.sipaNo,
          namaApoteker: activeProfile?.namaApoteker || parsed.settings?.namaApoteker || DEFAULT_INITIAL_STATE.settings.namaApoteker,
        },
      };
    }
  } catch (err) {
    console.error('Error loading app state from localStorage:', err);
  }
  return DEFAULT_INITIAL_STATE;
}

export function saveAppState(state: AppStateData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving app state to localStorage:', err);
  }
}

export function normalizeUnit(rawUnit: string): string {
  if (!rawUnit) return '';
  const trimmed = rawUnit.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function getAllDistinctUnits(appState: AppStateData): string[] {
  const set = new Set<string>();

  // 1. Saved unitsList
  if (appState.unitsList && Array.isArray(appState.unitsList)) {
    appState.unitsList.forEach((u) => {
      const norm = normalizeUnit(u);
      if (norm) set.add(norm);
    });
  }

  // 2. Default units
  DEFAULT_UNITS_LIST.forEach((u) => {
    const norm = normalizeUnit(u);
    if (norm) set.add(norm);
  });

  // 3. From Master list
  if (appState.masterList) {
    appState.masterList.forEach((m) => {
      if (m.satuan) set.add(normalizeUnit(m.satuan));
      if (m.kemasan) {
        const words = m.kemasan.split(/[\s/@,.-]+/);
        words.forEach((w) => {
          const nw = normalizeUnit(w);
          if (DEFAULT_UNITS_LIST.some((def) => def.toLowerCase() === nw.toLowerCase())) {
            set.add(nw);
          }
        });
      }
    });
  }

  // 4. From Usulan Obat list
  if (appState.usulanObatList) {
    appState.usulanObatList.forEach((u) => {
      if (u.satuan) set.add(normalizeUnit(u.satuan));
    });
  }

  // 5. From Defekta list
  if (appState.defektaList) {
    appState.defektaList.forEach((d) => {
      if (d.satuan) set.add(normalizeUnit(d.satuan));
    });
  }

  // 6. From calculation rows
  if (appState.rows) {
    Object.values(appState.rows).forEach((rowArr) => {
      if (Array.isArray(rowArr)) {
        rowArr.forEach((r) => {
          if (r.satuan) set.add(normalizeUnit(r.satuan));
          if (r.kemasan && !r.kemasan.includes(' ')) {
            set.add(normalizeUnit(r.kemasan));
          }
        });
      }
    });
  }

  return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'id'));
}

export function generateSupplierCode(nama: string, existingSuppliers: SupplierItem[]): string {
  const clean = nama.replace(/^(pt\.|pt|cv\.|cv|ud\.|ud|pbf\.|pbf)\s*/i, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  let baseCode = '';
  if (words.length >= 2) {
    baseCode = (words[0].substring(0, 3) + words[1].substring(0, 3)).toUpperCase();
  } else if (words.length === 1) {
    baseCode = words[0].substring(0, 6).toUpperCase();
  } else {
    baseCode = 'PBF';
  }
  baseCode = baseCode.replace(/[^A-Z0-9]/g, '');
  if (!baseCode) baseCode = 'PBF';

  let candidate = `PBF-${baseCode}`;
  let counter = 1;
  const codes = new Set((existingSuppliers || []).map((s) => s.kode.toUpperCase()));
  while (codes.has(candidate.toUpperCase())) {
    candidate = `PBF-${baseCode}-${counter}`;
    counter++;
  }
  return candidate;
}

export function autoRegisterSupplierHelper(
  pbfName: string,
  currentSuppliers: SupplierItem[],
  meta?: Partial<SupplierItem>
): { updatedSuppliers: SupplierItem[]; newSupplier: SupplierItem | null } {
  if (!pbfName) return { updatedSuppliers: currentSuppliers, newSupplier: null };
  const trimmed = pbfName.trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'distributor' ||
    trimmed.toLowerCase() === 'distributor terpilih'
  ) {
    return { updatedSuppliers: currentSuppliers, newSupplier: null };
  }

  const existing = (currentSuppliers || []).find(
    (s) =>
      s.nama.toLowerCase() === trimmed.toLowerCase() ||
      s.kode.toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    return { updatedSuppliers: currentSuppliers, newSupplier: null };
  }

  const newSupplier: SupplierItem = {
    id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    kode: generateSupplierCode(trimmed, currentSuppliers || []),
    nama: trimmed,
    alamat: meta?.alamat || 'Terdaftar Otomatis via Input Transaksi/Obat',
    salesNama: meta?.salesNama || '-',
    salesKontak: meta?.salesKontak || '-',
    tempoHari: meta?.tempoHari ?? 30,
    minOrder: meta?.minOrder ?? 0,
    diskonCODDefault: meta?.diskonCODDefault ?? 0,
    catatan: meta?.catatan || 'Otomatis tersinkronisasi saat pengetikan manual.',
    isAutoRegistered: true,
  };

  return {
    updatedSuppliers: [newSupplier, ...(currentSuppliers || [])],
    newSupplier,
  };
}

export function syncAllDetectedPbfs(appState: AppStateData): {
  updatedSuppliers: SupplierItem[];
  newlyAddedCount: number;
  newPbfNames: string[];
} {
  const pbfSet = new Set<string>();

  // 1. From Master list
  appState.masterList?.forEach((m) => {
    if (m.pbf && m.pbf.trim() && m.pbf !== '-') pbfSet.add(m.pbf.trim());
  });

  // 2. From Price list
  appState.priceList?.forEach((p) => {
    if (p.pbf && p.pbf.trim() && p.pbf !== '-') pbfSet.add(p.pbf.trim());
  });

  // 3. From History
  appState.history?.forEach((h) => {
    if (h.pbf && h.pbf.trim() && h.pbf !== '-') pbfSet.add(h.pbf.trim());
  });

  // 4. From Rows
  if (appState.rows) {
    Object.values(appState.rows).forEach((rowArr) => {
      rowArr?.forEach((r) => {
        if (r.pbf && r.pbf.trim() && r.pbf !== '-') pbfSet.add(r.pbf.trim());
      });
    });
  }

  // 5. From Usulan Obat
  appState.usulanObatList?.forEach((u) => {
    if (u.pbf && u.pbf.trim() && u.pbf !== '-') pbfSet.add(u.pbf.trim());
  });

  let workingSuppliers = [...(appState.suppliers || [])];
  const newNames: string[] = [];

  pbfSet.forEach((name) => {
    const res = autoRegisterSupplierHelper(name, workingSuppliers);
    if (res.newSupplier) {
      workingSuppliers = res.updatedSuppliers;
      newNames.push(name);
    }
  });

  return {
    updatedSuppliers: workingSuppliers,
    newlyAddedCount: newNames.length,
    newPbfNames: newNames,
  };
}

export function generateSKU(kategori: DrugCategory = 'reguler', _nama?: string): string {
  const prefix = kategori === 'prekursor' ? 'PRE' : kategori === 'oot' ? 'OOT' : 'REG';
  const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SKU-${prefix}-${randomCode}`;
}

export function createEmptyCalculationRow(kategori: DrugCategory = 'reguler', preset: Partial<DrugCalculationRow> = {}): DrugCalculationRow {
  const isPpn = preset.includePpn !== false;
  const hna = preset.hna || (preset.hnaPlusPpn ? (isPpn ? Math.round(preset.hnaPlusPpn / 1.11) : preset.hnaPlusPpn) : 0);
  const diskonPct = preset.diskonPct || 0;
  const discFactor = (100 - diskonPct) / 100;
  const nettoHna = hna * discFactor;
  const hargaJadi = preset.hargaJadi || Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

  return {
    id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sku: preset.sku || generateSKU(kategori),
    nama: preset.nama || '',
    includePpn: isPpn,
    hnaPlusPpn: preset.hnaPlusPpn || (preset.hna ? (isPpn ? Math.round(preset.hna * 1.11) : preset.hna) : 0),
    hna,
    diskonPct,
    hargaJadi,
    minta: preset.minta || 1,
    beli: preset.beli || preset.minta || 1,
    pabrik: preset.pabrik || '',
    kemasan: preset.kemasan || '',
    pbf: preset.pbf || '',
    historyHarga: preset.historyHarga || preset.hna || 0,
    tanggal: preset.tanggal || '',
    stok: preset.stok || 0,
    catatan: preset.catatan || '',
  };
}

export function createEmptyDefektaItem(preset: Partial<DefektaItem> = {}): DefektaItem {
  const kat: DrugCategory = preset.kategori || 'reguler';
  return {
    id: 'def_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sku: preset.sku || generateSKU(kat),
    nama: preset.nama || '',
    kategori: kat,
    stok: preset.stok ?? 0,
    minStok: preset.minStok ?? 5,
    satuan: preset.satuan || 'Box',
    pabrik: preset.pabrik || '',
    pbf: preset.pbf || '',
    hna: preset.hna || 0,
    diskon: preset.diskon || 0,
    hpp: preset.hpp || (preset.hna ? Math.round(preset.hna * 1.11) : 0),
    jumlahUsul: preset.jumlahUsul || 5,
    prioritas: preset.prioritas || (preset.stok === 0 ? 'cito' : 'urgent'),
    status: preset.status || (preset.stok === 0 ? 'habis' : 'menipis'),
    catatan: preset.catatan || '',
    tglDicatat: preset.tglDicatat || new Date().toISOString().split('T')[0],
  };
}

export function createEmptyPharmacyProfile(): PharmacyProfile {
  return {
    id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
    namaApotek: '',
    alamatApotek: '',
    sipaNo: '',
    namaApoteker: '',
    telepon: '',
    siaNo: '',
    kota: '',
    isDefault: false,
  };
}

export function createEmptySupplier(): SupplierItem {
  return {
    id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
    kode: '',
    nama: '',
    alamat: '',
    salesNama: '',
    salesKontak: '',
    tempoHari: 30,
    minOrder: 0,
    diskonCODDefault: 0,
    catatan: '',
  };
}

