/**
 * ASKRINDO SMART CREDIT ANALYSIS (ASCA)
 * Metode: Dynamic Cash Conversion & Stress-Tested Working Capital Model (DCC-SWCM)
 * Termasuk: Analisis Ketahanan Modal Kerja Bersih (Net Working Capital & Burn-Rate Test)
 */

const STORAGE_KEY = 'ASKRINDO_ASCA_PROJECTS_V1';
const USERS_STORAGE_KEY = 'ASCA_USERS_DATABASE_V1';
const AUTH_SESSION_KEY = 'ASCA_AUTH_SESSION_V1';
const USER_PROJECTS_KEY_PREFIX = 'ASCA_PROJECTS_USER_';
const ASCA_APP_VERSION = 'Versi 1.0';

// ============================================================================
// SUPABASE CLOUD DATABASE CONFIGURATION
// ============================================================================
const SUPABASE_CONFIG = {
  url: 'https://twgxldzzzvwahnizrjeg.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3Z3hsZHp6enZ3YWhuaXpyamVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjk5MTYsImV4cCI6MjEwODk0NTkxNn0.G_nYXnebka78zdDJpCkUH7qwhSVk5BS5K5fOZzVQ5wc'
};

async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const headers = {
    'apikey': SUPABASE_CONFIG.key,
    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase error (${res.status}): ${errText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Supabase fetch failed:', err);
    throw err;
  }
}

const DEFAULT_USERS = [
  {
    username: '1922',
    password: '123',
    fullName: 'Analis Kredit 1922',
    role: 'analyst',
    unit: 'Divisi Underwriting Komersial',
    status: 'active',
    createdAt: '2026-10-25T08:00:00.000Z',
    lastLogin: null
  },
  {
    username: 'admin',
    password: 'admin',
    fullName: 'Super Administrator',
    role: 'admin',
    unit: 'IT & Sistem Risiko Asuransi Kredit',
    status: 'active',
    createdAt: '2026-10-25T08:00:00.000Z',
    lastLogin: null
  }
];

function generateNumericCaseNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `${ymd}-${rand}`;
}

function getProjectCaseNumber(proj) {
  if (!proj) return generateNumericCaseNumber();
  if (proj.caseNumber && /^[0-9\-]+$/.test(String(proj.caseNumber).trim())) {
    return String(proj.caseNumber).trim();
  }
  const sampleMap = {
    'case-rahmat-santosa': '20261101-0101',
    'case-rahmat-restructured': '20261101-0102',
    'case-nusantara-pangan': '20261101-0103',
    'case-dhea-putri': '20261101-0104'
  };
  if (proj.id && sampleMap[proj.id]) {
    proj.caseNumber = sampleMap[proj.id];
    return proj.caseNumber;
  }
  const numMatches = (proj.id || '').match(/\d+/g);
  if (numMatches && numMatches.length > 0) {
    const digits = numMatches.join('');
    if (digits.length >= 8) {
      proj.caseNumber = `${digits.slice(0, 8)}-${digits.slice(-4)}`;
      return proj.caseNumber;
    }
  }
  proj.caseNumber = generateNumericCaseNumber();
  return proj.caseNumber;
}

// ============================================================================
// 1. DEFAULT SAMPLE CASES
// ============================================================================
function getDefaultProjects() {
  return [
    {
      id: 'case-rahmat-santosa',
      caseNumber: '20261101-0101',
      companyName: 'PT Rahmat Santosa (Kasus Trade Financing)',
      city: 'Kab. Sukoharjo',
      sector: 'Industri Pengolahan & Perdagangan Kedelai Impor (Tempe, Tahu, Kecap, Pakan Ternak)',
      estYear: 2018,
      bankName: 'Bank Dana',
      facilityType: 'Paket Gabungan: SCF A/P + Forex Line + KMK Khusus (Backup Default)',
      usdAmount: 1000000,
      fxRate: 16689,
      requestedPlafond: 16689000000,
      pkMonths: 12,
      scfTenorDays: 180,
      kmkTenorDays: 90,
      interestRate: 9.5,
      underwriter: 'Tim Underwriting Komersial Askrindo',
      underwriterTitle: 'Analis Underwriting Askrindo',
      checker: 'Kepala Bagian Underwriting',
      checkerTitle: 'Reviewer Risiko Asuransi Kredit',
      approver: 'Komite Pemutus Asuransi Kredit',
      approverTitle: 'PT Asuransi Kredit Indonesia',
      year1: 2022,
      year2: 2023,
      qualitative5CScore: 6,
      manualGradeOverride: 'AUTO',
      overrideReason: '',
      burnStressOpexGrowth: 0,
      burnStressCollectionFreeze: false,
      customNotes: 'Kasus pengajuan Trade Financing dari Bank Dana: evaluasi NWC Burn-Rate membuktikan bahwa jika terjadi penundaan bayar pembeli, kas debitur habis dalam waktu kurang dari 1 bulan.',
      businessDesc:
        'Pembelian bahan baku komoditas kedelai impor dari negara tetangga untuk dijual sebagai kedelai siap jual ke perajin tempe, tahu, kecap serta diolah di pabrik sendiri menjadi bahan baku pakan ternak. Fasilitas gabungan USD 1.000.000 (Kurs Tengah Rp16.689) terdiri dari SCF A/P (tenor 180 hari), Forex Line (Hedging), dan KMK Khusus (tenor 90 hari sejak SCF A/P jatuh tempo untuk mem-backup saat terjadi default atas SCF A/P & Forex Line).',
      procurementMethod: 'import_sea',
      claimedDOR: 60,
      claimedDOI: 185,
      claimedDOP: 70,
      fin22: {
        rev: 231861112061,
        cogs: 258560715106,
        opex: 100892643743,
        tax: 1511581728,
        cash: 21352397620,
        ar: 40993299945,
        otherAr: 6086410689,
        inv: 212516042528,
        otherCa: 5528863762,
        fa: 313394234646,
        taxAsset: 65903429473,
        stDebt: 25242088448,
        ap: 16167350688,
        otherAp: 15061175691,
        accrued: 22873452045,
        ltDebt: 448318697133,
        capital: 485000000000,
        re: -346888085342
      },
      fin23: {
        rev: 267755059530,
        cogs: 270971171175,
        opex: 82804913112,
        tax: 4750647957,
        cash: 26767821068,
        ar: 45734890243,
        otherAr: 2727820848,
        inv: 217095244840,
        otherCa: 1261419789,
        fa: 306977629222,
        taxAsset: 61408674152,
        stDebt: 107233079360,
        ap: 18777323434,
        otherAp: 5465136435,
        accrued: 36705821716,
        ltDebt: 347770018660,
        capital: 585000000000,
        re: -438977879443
      }
    },
    {
      id: 'case-rahmat-restructured',
      caseNumber: '20261101-0102',
      companyName: 'PT Rahmat Santosa (Simulasi Turnaround DCC-SWCM)',
      city: 'Kab. Sukoharjo',
      sector: 'Industri Pengolahan & Perdagangan Kedelai Impor (Skema Mitigasi Ring-Fenced)',
      estYear: 2018,
      bankName: 'Bank Dana',
      facilityType: 'SCF A/P Ring-Fenced Offtaker + Wajib Hedging (Tanpa KMK Backup Default)',
      usdAmount: 600000,
      fxRate: 16689,
      requestedPlafond: 10013400000,
      pkMonths: 12,
      scfTenorDays: 180,
      kmkTenorDays: 0,
      interestRate: 8.5,
      underwriter: 'Tim Underwriting Komersial Askrindo',
      underwriterTitle: 'Analis Underwriting Askrindo',
      checker: 'Kepala Bagian Underwriting',
      checkerTitle: 'Reviewer Risiko Asuransi Kredit',
      approver: 'Komite Pemutus Asuransi Kredit',
      approverTitle: 'PT Asuransi Kredit Indonesia',
      year1: 2023,
      year2: 2024,
      qualitative5CScore: 8.5,
      manualGradeOverride: 'AUTO',
      overrideReason: '',
      burnStressOpexGrowth: 0,
      burnStressCollectionFreeze: false,
      customNotes: 'Simulasi Turnaround: Penurunan DOI membebaskan kas Rp 131 Miliar, meningkatkan Cash Runway menjadi 4,5 bulan dan meniadakan defisit NWC.',
      businessDesc:
        'Skema hasil inovasi analisa DCC-SWCM: Fasilitas dipangkas ke USD 600.000 (tranche maksimal USD 200.000 - 300.000 per pengapalan), KMK Khusus Backup Default dihapus untuk mencegah moral hazard, pencairan wajib berbasis Purchase Order (PO) mengikat dari pabrik tahu/tempe/kecap & pakan ternak sehingga DOI kedelai dikunci maksimal 115 hari dan Gross Margin terkunci minimal +10,5%.',
      procurementMethod: 'import_sea',
      claimedDOR: 55,
      claimedDOI: 115,
      claimedDOP: 65,
      fin22: {
        rev: 267755059530,
        cogs: 270971171175,
        opex: 82804913112,
        tax: 4750647957,
        cash: 26767821068,
        ar: 45734890243,
        otherAr: 2727820848,
        inv: 217095244840,
        otherCa: 1261419789,
        fa: 306977629222,
        taxAsset: 61408674152,
        stDebt: 107233079360,
        ap: 18777323434,
        otherAp: 5465136435,
        accrued: 36705821716,
        ltDebt: 347770018660,
        capital: 585000000000,
        re: -438977879443
      },
      fin23: {
        rev: 315000000000,
        cogs: 281925000000,
        opex: 16500000000,
        tax: 3200000000,
        cash: 38500000000,
        ar: 47465753424,
        otherAr: 1500000000,
        inv: 88825684931,
        otherCa: 1200000000,
        fa: 298000000000,
        taxAsset: 52000000000,
        stDebt: 65000000000,
        ap: 50205821917,
        otherAp: 3500000000,
        accrued: 12000000000,
        ltDebt: 237391543724,
        capital: 585000000000,
        re: -425605927286
      }
    },
    {
      id: 'case-nusantara-pangan',
      caseNumber: '20261101-0103',
      companyName: 'PT Nusantara Distribusi Pangan',
      city: 'Kota Jakarta Pusat',
      sector: 'Distribusi FMCG & Bahan Pokok Nasional',
      estYear: 2015,
      bankName: 'Bank Mandiri / BRI',
      facilityType: 'Kredit Modal Kerja (KMK) Distributor Financing',
      usdAmount: 0,
      fxRate: 16689,
      requestedPlafond: 25000000000,
      pkMonths: 12,
      scfTenorDays: 120,
      kmkTenorDays: 0,
      interestRate: 9.25,
      underwriter: 'Tim Underwriting Komersial Askrindo',
      underwriterTitle: 'Analis Underwriting Askrindo',
      checker: 'Kepala Bagian Underwriting',
      checkerTitle: 'Reviewer Risiko Asuransi Kredit',
      approver: 'Komite Pemutus Asuransi Kredit',
      approverTitle: 'PT Asuransi Kredit Indonesia',
      year1: 2022,
      year2: 2023,
      qualitative5CScore: 9.0,
      manualGradeOverride: 'AUTO',
      overrideReason: '',
      burnStressOpexGrowth: 0,
      burnStressCollectionFreeze: false,
      customNotes: 'Debitur likuid dengan Cash Runway 5,2 bulan dan surplus modal kerja bersih yang memadai.',
      businessDesc:
        'Distribusi bahan pangan pokok ke jaringan ritel modern dan grosir. Perputaran persediaan cepat (DOI 42 hari) dan tagihan ritel terkendali (DOR 48 hari).',
      procurementMethod: 'domestic',
      claimedDOR: 45,
      claimedDOI: 40,
      claimedDOP: 35,
      fin22: {
        rev: 185000000000,
        cogs: 157250000000,
        opex: 14800000000,
        tax: 2850000000,
        cash: 14200000000,
        ar: 23500000000,
        otherAr: 1200000000,
        inv: 18100000000,
        otherCa: 900000000,
        fa: 42000000000,
        taxAsset: 1500000000,
        stDebt: 19500000000,
        ap: 15100000000,
        otherAp: 1800000000,
        accrued: 2400000000,
        ltDebt: 18000000000,
        capital: 30000000000,
        re: 14600000000
      },
      fin23: {
        rev: 218000000000,
        cogs: 184210000000,
        opex: 16900000000,
        tax: 3715000000,
        cash: 18900000000,
        ar: 28668000000,
        otherAr: 1100000000,
        inv: 21196000000,
        otherCa: 950000000,
        fa: 44500000000,
        taxAsset: 1400000000,
        stDebt: 21000000000,
        ap: 17664000000,
        otherAp: 1650000000,
        accrued: 2600000000,
        ltDebt: 16000000000,
        capital: 30000000000,
        re: 27800000000
      }
    }
  ];
}

// ============================================================================
// 2. RISK GRADE DEFINITIONS TABLE (TABEL VI.1 RATING AKSEPTASI ASKRINDO)
// Sumber: Petunjuk Teknis Akseptasi Surety Bond | ASKRINDO Insurance (PT IDX Consulting)
// ============================================================================
const ASKRINDO_GRADE_CATALOG = [
  {
    grade: 'AAA',
    name: 'Minimum Risk',
    scoreRange: '> 95 - 100',
    minScore: 96,
    maxScore: 100,
    scoreFloor: 95,
    scoreCeil: 100,
    color: '#047857',
    bg: '#ecfdf5',
    badgeCls: 'grade-AAA',
    maxCoverage: 85,
    ijpRate: '0,65%  -  0,90% p.a.',
    decision: 'DIREKOMENDASIKAN LAYAK PENUH (FAST-TRACK APPROVE)',
    decisionClass: 'layak',
    criteriaSummary: 'Indikasi bahwa Perusahaan berkualitas terbaik layak dan stabil, memiliki kemampuan yang sangat kuat dalam memenuhi kewajibannya.'
  },
  {
    grade: 'AA',
    name: 'Acceptable Risk',
    scoreRange: '> 87 - 95',
    minScore: 88,
    maxScore: 95,
    scoreFloor: 87,
    scoreCeil: 95,
    color: '#15803d',
    bg: '#f0fdf4',
    badgeCls: 'grade-AA',
    maxCoverage: 80,
    ijpRate: '0,90%  -  1,25% p.a.',
    decision: 'DIREKOMENDASIKAN LAYAK (APPROVE)',
    decisionClass: 'layak',
    criteriaSummary: 'Indikasi bahwa Perusahaan berkualitas baik, sedikit lebih berisiko dibanding minimum risk.'
  },
  {
    grade: 'A',
    name: 'Average Risk',
    scoreRange: '> 79 - 87',
    minScore: 80,
    maxScore: 87,
    scoreFloor: 79,
    scoreCeil: 87,
    color: '#0f766e',
    bg: '#f0fdfa',
    badgeCls: 'grade-A',
    maxCoverage: 75,
    ijpRate: '1,25%  -  1,60% p.a.',
    decision: 'LAYAK DENGAN COVENANT STANDAR',
    decisionClass: 'layak',
    criteriaSummary: 'Indikasi bahwa Perusahaan dalam situasi ekonomi dapat berpengaruh pada kondisi keuangan Perusahaan, masih memiliki kemampuan dalam memenuhi kewajibannya, namun sensitif terhadap perubahan.'
  },
  {
    grade: 'BBB',
    name: 'Allowable Risk',
    scoreRange: '> 71 - 79',
    minScore: 72,
    maxScore: 79,
    scoreFloor: 71,
    scoreCeil: 79,
    color: '#0369a1',
    bg: '#f0f9ff',
    badgeCls: 'grade-BBB',
    maxCoverage: 70,
    ijpRate: '1,60%  -  2,00% p.a.',
    decision: 'LAYAK BERSYARAT (MODERATE COVENANT)',
    decisionClass: 'bersyarat',
    criteriaSummary: 'Indikasi bahwa Perusahaan dengan kualitas menengah, dimana saat ini dalam kondisi memuaskan, memiliki kemampuan yang cukup dalam memenuhi kewajibannya.'
  },
  {
    grade: 'BB',
    name: 'Marginal Risk',
    scoreRange: '> 63 - 71',
    minScore: 64,
    maxScore: 71,
    scoreFloor: 63,
    scoreCeil: 71,
    color: '#1d4ed8',
    bg: '#eff6ff',
    badgeCls: 'grade-BB',
    maxCoverage: 65,
    ijpRate: '2,00%  -  2,50% p.a.',
    decision: 'LAYAK BERSYARAT KETAT (RING-FENCED ESCROW)',
    decisionClass: 'bersyarat',
    criteriaSummary: 'Indikasi bahwa Perusahaan ada kecenderungan mengalami perubahan dalam situasi ekonomi, kemampuannya rentan dalam memenuhi kewajibannya.'
  },
  {
    grade: 'B',
    name: 'Early Warning',
    scoreRange: '> 55 - 63',
    minScore: 56,
    maxScore: 63,
    scoreFloor: 55,
    scoreCeil: 63,
    color: '#b45309',
    bg: '#fffbeb',
    badgeCls: 'grade-B',
    maxCoverage: 60,
    ijpRate: '2,50%  -  3,00% p.a. (+Monitoring Ketat)',
    decision: 'PERINGATAN DINI / LAYAK BERSYARAT DENGAN AGUNAN TAMBAHAN',
    decisionClass: 'bersyarat',
    criteriaSummary: 'Indikasi bahwa Perusahaan saat ini goyah, tergantung situasi ekonomi yang menguntungkan, kemampuan memenuhi kewajibannya sangat rendah.'
  },
  {
    grade: 'CCC',
    name: 'Precautionary',
    scoreRange: '> 47 - 55',
    minScore: 48,
    maxScore: 55,
    scoreFloor: 47,
    scoreCeil: 55,
    color: '#c2410c',
    bg: '#fff7ed',
    badgeCls: 'grade-CCC',
    maxCoverage: 55,
    ijpRate: '3,00%  -  3,75% p.a. (+Cash Collateral)',
    decision: 'PRECAUTIONARY / REKOMENDASI RESTRUKTURISASI SKEMA',
    decisionClass: 'tolak',
    criteriaSummary: 'Indikasi bahwa Perusahaan sangat goyah, sangat spekulatif, kemampuan sangat bergantung pada kondisi bisnis.'
  },
  {
    grade: 'D',
    name: 'Substandard',
    scoreRange: '> 39 - 47',
    minScore: 40,
    maxScore: 47,
    scoreFloor: 39,
    scoreCeil: 47,
    color: '#b91c1c',
    bg: '#fef2f2',
    badgeCls: 'grade-D',
    maxCoverage: 50,
    ijpRate: '3,75%  -  4,50% p.a. (High-Risk Loading)',
    decision: 'SUBSTANDARD / TIDAK LAYAK (KEMUNGKINAN DEFAULT TINGGI)',
    decisionClass: 'tolak',
    criteriaSummary: 'Indikasi bahwa Perusahaan sangat goyah sekali, kemungkinan default.'
  },
  {
    grade: 'DD',
    name: 'Doubtful',
    scoreRange: '> 31 - 39',
    minScore: 32,
    maxScore: 39,
    scoreFloor: 31,
    scoreCeil: 39,
    color: '#991b1b',
    bg: '#fee2e2',
    badgeCls: 'grade-DD',
    maxCoverage: 45,
    ijpRate: '4,50%  -  5,50% p.a. (Special Distressed Rate)',
    decision: 'DOUBTFUL / TOLAK PENGAJUAN (POTENSI GAGAL BAYAR)',
    decisionClass: 'tolak',
    criteriaSummary: 'Indikasi bahwa Perusahaan akan default/mengalami kegagalan.'
  },
  {
    grade: 'DDD',
    name: 'Expected Loss',
    scoreRange: '<= 31',
    minScore: 0,
    maxScore: 31,
    scoreFloor: 0,
    scoreCeil: 31,
    color: '#7f1d1d',
    bg: '#fecaca',
    badgeCls: 'grade-DDD',
    maxCoverage: 0,
    ijpRate: 'Tidak Ditawarkan (Uninsurable Default)',
    decision: 'EXPECTED LOSS / TOLAK MUTLAK (KONDISI DEFAULT)',
    decisionClass: 'tolak',
    criteriaSummary: 'Indikasi bahwa Perusahaan sudah tidak memiliki kemampuan dan kondisinya sudah default.'
  }
];

function getGradeMetadataByScore(score, hasKnockOutCap = false, manualOverride = 'AUTO') {
  if (manualOverride && manualOverride !== 'AUTO') {
    const found = ASKRINDO_GRADE_CATALOG.find((g) => g.grade === manualOverride);
    if (found) return { ...found, isOverridden: true };
  }
  let effectiveScore = score;
  if (hasKnockOutCap && effectiveScore > 55) {
    effectiveScore = 55;
  }
  const matched = ASKRINDO_GRADE_CATALOG.find((g) => {
    if (g.grade === 'DDD') return effectiveScore <= 31;
    if (g.grade === 'AAA') return effectiveScore > 95;
    return effectiveScore > g.scoreFloor && effectiveScore <= g.scoreCeil;
  }) || ASKRINDO_GRADE_CATALOG[ASKRINDO_GRADE_CATALOG.length - 1];
  return { ...matched, isOverridden: false };
}

// ============================================================================
// 3. STATE MANAGEMENT & STORAGE
// ============================================================================
let projects = [];
let activeProjectId = null;
let isSidebarCollapsed = false;

function toggleSidebar() {
  isSidebarCollapsed = !isSidebarCollapsed;
  const layout = document.getElementById('appLayoutContainer');
  const icon = document.getElementById('sidebarToggleIcon');
  if (layout) layout.classList.toggle('sidebar-collapsed', isSidebarCollapsed);
  if (icon) icon.innerHTML = '&#9776;';
}

function utf8ToBase64(str) {
  try {
    return window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  } catch (e) {
    return window.btoa(str);
  }
}

function base64ToUtf8(str) {
  try {
    return decodeURIComponent(Array.prototype.map.call(window.atob(str), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    return window.atob(str);
  }
}

let currentProjectsPayload = '';
let isUserProjectsTableAvailable = null;
let cloudSaveDebounceTimer = null;
let isCloudSyncInProgress = false;

function sanitizeProjectData(p) {
  return {
    year1: p.year1 || 2022,
    year2: p.year2 || 2023,
    qualitative5CScore: typeof p.qualitative5CScore === 'number' ? p.qualitative5CScore : 6,
    manualGradeOverride: p.manualGradeOverride || 'AUTO',
    overrideReason: p.overrideReason || '',
    burnStressOpexGrowth: p.burnStressOpexGrowth || 0,
    burnStressCollectionFreeze: !!p.burnStressCollectionFreeze,
    procurementMethod: p.procurementMethod || (isMaritimeOrImportRisk(p) ? 'import_sea' : 'none'),
    ...p
  };
}

function getCurrentProjectStorageKey() {
  const session = getActiveSession();
  const uname = session ? session.username : null;
  if (!uname) return null;
  return USER_PROJECTS_KEY_PREFIX + uname;
}

async function fetchProjectsFromCloud(username) {
  if (!username) return null;

  // 1. Coba baca dari tabel terdedikasi `user_projects` jika ada
  if (isUserProjectsTableAvailable !== false) {
    try {
      const res = await supabaseFetch(`user_projects?username=eq.${encodeURIComponent(username)}&select=projects`);
      if (Array.isArray(res)) {
        isUserProjectsTableAvailable = true;
        if (res.length > 0 && res[0].projects) {
          const list = typeof res[0].projects === 'string' ? JSON.parse(res[0].projects) : res[0].projects;
          if (Array.isArray(list)) return list;
        }
        return [];
      }
    } catch (err) {
      if (err.message && (err.message.includes('PGRST205') || err.message.includes('404') || err.message.includes('schema cache'))) {
        isUserProjectsTableAvailable = false;
      }
    }
  }

  // 2. Baca dari tabel users kolom unit (fallback otomatis lintas perangkat)
  try {
    const res = await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}&select=unit`);
    if (Array.isArray(res) && res.length > 0) {
      const rawUnit = res[0].unit || '';
      const payload = extractProjectsPayload(rawUnit);
      if (payload) {
        currentProjectsPayload = payload;
        try {
          const jsonStr = base64ToUtf8(payload);
          const list = JSON.parse(jsonStr);
          if (Array.isArray(list)) return list;
        } catch (pe) {
          console.warn('[ASCA Cloud] Gagal decode base64 projects payload:', pe);
        }
      }
      return [];
    }
  } catch (err) {
    console.warn('[ASCA Cloud] Gagal memuat projects dari database cloud:', err);
  }
  return null;
}

async function saveProjectsToCloud(username, projectsData) {
  if (!username) return;
  if (isCloudSyncInProgress) return;
  isCloudSyncInProgress = true;

  const el = document.getElementById('autoSaveStatus');
  if (el) {
    el.innerHTML = '<span style="color:#0ea5e9;">&#8635; Menyimpan ke Cloud...</span>';
  }

  // 1. Jika tabel user_projects tersedia, simpan juga ke tabel terdedikasi
  if (isUserProjectsTableAvailable !== false) {
    try {
      await supabaseFetch('user_projects', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          username: username,
          projects: projectsData,
          updated_at: new Date().toISOString()
        })
      });
      isUserProjectsTableAvailable = true;
    } catch (err) {
      if (err.message && (err.message.includes('PGRST205') || err.message.includes('404') || err.message.includes('schema cache'))) {
        isUserProjectsTableAvailable = false;
      }
    }
  }

  // 2. Persist ke kolom unit tabel users (jaminan 100% tersimpan per pengguna di server)
  try {
    const jsonStr = JSON.stringify(projectsData);
    const payload = utf8ToBase64(jsonStr);
    currentProjectsPayload = payload;

    const userRes = await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}&select=unit`);
    const rawUnit = (Array.isArray(userRes) && userRes.length > 0) ? (userRes[0].unit || '') : '';
    const cleanUnit = getCleanUnit(rawUnit);

    const lock = parseSessionLock(rawUnit);
    const sId = lock ? lock.sessionId : getLocalSessionId();
    const finalUnit = buildLockedUnit(cleanUnit, sId, payload);

    await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ unit: finalUnit })
    });

    if (el) {
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = "&#10003; Tersimpan Cloud (" + now + ")";
      el.title = `Tersimpan di Cloud Database Supabase (${projectsData.length} analisa)`;
    }
  } catch (err) {
    console.warn('[ASCA Cloud] Gagal menyimpan ke server cloud (offline):', err);
    if (el) {
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = "&#10003; Tersimpan Lokal (" + now + ")";
    }
  } finally {
    isCloudSyncInProgress = false;
  }
}

function triggerCloudSaveDebounced(username, delayMs = 800) {
  if (!username) return;
  if (cloudSaveDebounceTimer) {
    clearTimeout(cloudSaveDebounceTimer);
  }
  cloudSaveDebounceTimer = setTimeout(() => {
    saveProjectsToCloud(username, projects);
  }, delayMs);
}

function cleanStaleLegacyKeys() {
  const staleKeys = [
    'ASKRINDO_ASCA_PROJECTS_V1',
    'ASKRINDO_AFCA_PROJECTS_V28',
    'ASKRINDO_AFCA_PROJECTS_V27',
    'ASKRINDO_AFCA_PROJECTS_V26',
    'ASKRINDO_AFCA_PROJECTS_V25',
    'ASKRINDO_AFCA_PROJECTS_V24',
    'ASKRINDO_AFCA_PROJECTS',
    'ASCA_DRAFT_PROJECT'
  ];
  staleKeys.forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });
}

async function syncProjectsWithCloud(username) {
  if (!username) return;
  const session = getActiveSession();
  if (!session || session.username !== username) return;

  try {
    const cloudProjects = await fetchProjectsFromCloud(username);
    const curSession = getActiveSession();
    if (!curSession || curSession.username !== username) return;

    if (cloudProjects && Array.isArray(cloudProjects)) {
      if (cloudProjects.length > 0) {
        // Database Cloud adalah MASTER SUMBER KEBENARAN akun ini.
        const sanitized = cloudProjects.map(sanitizeProjectData);
        sanitized.forEach((p) => ensureInaprocAutoChecked(p));

        projects = sanitized;
        if (!activeProjectId || !projects.some(p => p.id === activeProjectId)) {
          activeProjectId = projects[0]?.id || null;
        }

        const userKey = getCurrentProjectStorageKey();
        if (userKey) {
          localStorage.setItem(userKey, JSON.stringify(projects));
        }

        renderAll();
        renderWelcomeHub();

        const el = document.getElementById('autoSaveStatus');
        if (el) {
          const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          el.innerHTML = "&#10003; Sinkron Cloud (" + now + ")";
          el.title = `${projects.length} berkas analisa tersimpan di Cloud Database Supabase untuk akun "${username}"`;
        }
        console.log(`[ASCA Cloud Sync] Sukses memuat ${projects.length} berkas analisa dari database untuk user "${username}"`);
      } else {
        // Cloud database kosong untuk user ini:
        // Hanya jika di cache lokal pengguna ini memang sudah ada data proyek yang baru dibuat, unggah ke cloud
        const userKey = getCurrentProjectStorageKey();
        const rawLocal = userKey ? localStorage.getItem(userKey) : null;
        if (rawLocal && projects.length > 0) {
          console.log(`[ASCA Cloud Sync] Database cloud kosong, mengunggah ${projects.length} analisa lokal untuk user "${username}"`);
          await saveProjectsToCloud(username, projects);
        } else {
          // Akun pengguna ini memang bersih tanpa analisa
          projects = [];
          activeProjectId = null;
          renderAll();
          renderWelcomeHub();
        }
      }
    }
  } catch (err) {
    console.warn('[ASCA Cloud Sync] Sinkronisasi cloud tertunda (offline/timeout):', err);
  }
}

function loadProjectsFromStorage() {
  const session = getActiveSession();
  if (!session || !session.username) {
    projects = [];
    activeProjectId = null;
    return;
  }
  const uname = session.username;
  const userKey = getCurrentProjectStorageKey();

  projects = [];
  activeProjectId = null;

  try {
    // 1. Muat cache spesifik pengguna saat ini
    if (userKey) {
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          projects = parsed.map(sanitizeProjectData);
          activeProjectId = projects[0]?.id || null;
        }
      }
    }
  } catch (e) {
    console.warn('Gagal memuat localStorage:', e);
  }

  // 2. Sinkronkan dari Cloud Database Supabase (Cloud adalah Master untuk akun ini)
  syncProjectsWithCloud(uname);
}

function saveProjectsToStorage(immediateCloud = false) {
  try {
    const session = getActiveSession();
    if (!session || !session.username) return;

    const userKey = getCurrentProjectStorageKey();
    if (userKey) {
      localStorage.setItem(userKey, JSON.stringify(projects));
    }

    const el = document.getElementById('autoSaveStatus');
    if (el) {
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = "&#10003; Tersimpan (" + now + ")";
    }

    triggerCloudSaveDebounced(session.username, immediateCloud ? 50 : 800);
  } catch (e) {
    console.error('Gagal menyimpan ke localStorage:', e);
  }
}

function getActiveProject() {
  if (!projects || projects.length === 0) return null;
  return projects.find((p) => p.id === activeProjectId) || projects[0];
}

function updateNavHomeState(isHome) {
  const btn = document.getElementById('btnNavHome');
  if (!btn) return;
  if (isHome) {
    btn.classList.add('active-home');
  } else {
    btn.classList.remove('active-home');
  }
}

function selectProject(id) {
  activeProjectId = id;
  const hubEl = document.getElementById('welcomeHubView');
  const wsEl = document.getElementById('projectWorkspaceView');
  if (hubEl) hubEl.style.display = 'none';
  if (wsEl) wsEl.style.display = 'block';
  updateNavHomeState(false);
  const proj = getActiveProject();
  if (proj) {
    populateFormInputs(proj);
    triggerLiveInaprocCheck(false);
    fetchGoogleNewsForProject(false, false);
  }
  renderAll();
}

function showWelcomeHub() {
  const hubEl = document.getElementById('welcomeHubView');
  const wsEl = document.getElementById('projectWorkspaceView');
  if (hubEl) hubEl.style.display = 'block';
  if (wsEl) wsEl.style.display = 'none';
  updateNavHomeState(true);
  renderWelcomeHub();
  renderProjectList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openProjectFromHub(projectId) {
  activeProjectId = projectId;
  const hubEl = document.getElementById('welcomeHubView');
  const wsEl = document.getElementById('projectWorkspaceView');
  if (hubEl) hubEl.style.display = 'none';
  if (wsEl) wsEl.style.display = 'block';
  updateNavHomeState(false);
  const proj = getActiveProject();
  if (proj) {
    populateFormInputs(proj);
    triggerLiveInaprocCheck(false);
    fetchGoogleNewsForProject(false, false);
  }
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function duplicateProjectById(id) {
  const target = projects.find(p => p.id === id);
  if (!target) return;
  const copy = JSON.parse(JSON.stringify(target));
  copy.id = 'case-' + Date.now();
  copy.caseNumber = generateNumericCaseNumber();
  copy.companyName = `${target.companyName} (Salinan)`;
  projects.unshift(copy);
  saveProjectsToStorage(true);
  renderProjectList();
  renderWelcomeHub();
  showToast(`Kasus "${target.companyName}" berhasil diduplikasi!`);
}

function deleteProjectById(id) {
  const target = projects.find(p => p.id === id);
  if (!target) return;
  if (!confirm(`Hapus berkas analisa debitur "${target.companyName}"?`)) return;
  projects = projects.filter(p => p.id !== id);
  if (projects.length > 0 && activeProjectId === id) {
    activeProjectId = projects[0].id;
  } else if (projects.length === 0) {
    activeProjectId = null;
  }
  cleanStaleLegacyKeys();
  saveProjectsToStorage(true);
  renderProjectList();
  renderWelcomeHub();
  showToast('Berkas analisa debitur berhasil dihapus.');
}

function renderWelcomeHub() {
  const container = document.getElementById('welcomeHubView');
  if (!container) return;

  const session = getActiveSession();
  const analystName = session ? (session.fullName || session.username) : 'Analis Underwriting';

  let totalPlafond = 0;
  let cntLayak = 0;
  let cntBersyarat = 0;
  let cntTolak = 0;
  let cntPending = 0;

  const projectCards = projects.map(p => {
    const m = computeDCCSWCM(p);
    totalPlafond += (p.requestedPlafond || 0);

    let statusCls = 'pending';
    let gradeLabel = '-';
    let decisionText = 'Menunggu Input Data Keuangan';

    if (m && m.hasFinancials) {
      gradeLabel = `${m.shortGrade} (${m.score}/100)`;
      decisionText = m.stage1Decision || m.gradeMeta.decision;
      if (m.isLayak) {
        statusCls = 'layak';
      } else if (m.isInitialReject) {
        statusCls = 'tolak';
      } else {
        statusCls = 'bersyarat';
      }
    }

    if (statusCls === 'layak') cntLayak++;
    else if (statusCls === 'bersyarat') cntBersyarat++;
    else if (statusCls === 'tolak') cntTolak++;
    else cntPending++;

    return `
      <div class="hub-project-card ${statusCls}">
        <div>
          <div class="hub-card-header">
            <div class="hub-card-title">${p.companyName || 'Tanpa Nama'}</div>
            <span class="grade-badge ${m && m.hasFinancials ? m.gradeMeta.badgeCls : 'grade-pending'}" style="font-size:0.68rem; padding:2px 8px;">
              ${gradeLabel}
            </span>
          </div>
          <div class="hub-card-meta">
            <div><strong>Bank:</strong> ${p.bankName || '-'} | <strong>Sektor:</strong> ${p.sector || '-'}</div>
            <div><strong>Domisili:</strong> ${p.city || '-'} | <strong>Fasilitas:</strong> ${p.facilityType || 'KMK'}</div>
            <div><strong>Plafond:</strong> <span style="font-weight:700; color:var(--askrindo-navy);">${fmtRp(p.requestedPlafond)}</span></div>
            <div style="margin-top:0.35rem; font-size:0.7rem; font-weight:700; color:${statusCls === 'layak' ? '#16a34a' : (statusCls === 'tolak' ? '#dc2626' : (statusCls === 'bersyarat' ? '#d97706' : '#64748b'))};">
              &bull; Status: ${decisionText}
            </div>
          </div>
        </div>
        <div class="hub-card-footer" style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem; flex-wrap:wrap;">
          <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-outline btn-xs" onclick="duplicateProjectById('${p.id}')" title="Duplikasi Analisa Debitur" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; padding:3px 9px; font-weight:700; font-size:0.72rem; min-width:76px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Duplikasi</span>
            </button>
            <button type="button" class="btn btn-outline btn-xs" onclick="exportSingleProjectJSON('${p.id}')" title="Export berkas analisa ini (.json)" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; padding:3px 9px; font-weight:700; font-size:0.72rem; min-width:76px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>Export</span>
            </button>
            <button type="button" class="btn btn-outline btn-xs" onclick="deleteProjectById('${p.id}')" title="Hapus Berkas Analisa" style="color:#dc2626; border-color:#fca5a5; padding:3px 9px; font-weight:700; font-size:0.72rem; display:inline-flex; align-items:center; justify-content:center; gap:4px; min-width:76px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>Hapus</span>
            </button>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="openProjectFromHub('${p.id}')" style="display:inline-flex; align-items:center; gap:0.3rem; font-size:0.75rem; padding:5px 12px; font-weight:700;">
            <span>Buka Analisa</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- HERO PORTAL BERANDA -->
    <div class="welcome-hero">
      <div>
        <div class="welcome-hero-meta" style="margin-bottom:0.4rem;">
          <span>Sistem Underwriting Asuransi Kredit ASCA 2026</span>
          <span>&bull;</span>
          <span>PT Asuransi Kredit Indonesia</span>
        </div>
        <h1>Selamat Datang, ${analystName}!</h1>
        <p>
          Platform Analisa Kredit berbasis <strong>Artificial Intelligence</strong> dengan Metode <strong>Dynamic Cash Conversion &amp; Stress-Tested Working Capital Model (DCC-SWCM)</strong>.<br />
          Analisa asuransi kredit berdasarkan portofolio debitur, analisa laporan keuangan, kalkulasi cash burn rate, dan tetapkan struktur covenants mitigasi risiko secara presisi.
        </p>
        <div class="welcome-hero-actions" style="display:flex; align-items:center; gap:0.65rem; flex-wrap:wrap;">
          <button type="button" class="btn btn-hero-cta" onclick="openNewProjectModal()" style="background:linear-gradient(135deg, #f59e0b 0%, #ea580c 100%) !important; color:#ffffff !important; font-weight:800 !important; font-size:0.86rem !important; padding:9px 20px !important; border-radius:6px !important; border:1px solid #f97316 !important; box-shadow:0 4px 14px rgba(234, 88, 12, 0.45) !important; display:inline-flex !important; align-items:center !important; gap:8px !important; cursor:pointer !important;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style="color:#ffffff !important; font-weight:800 !important; font-size:0.86rem !important;">Buat Analisa Baru</span>
          </button>
          <label class="btn btn-hero-white" style="margin:0; background:#ffffff !important; color:#003366 !important; font-weight:800 !important; font-size:0.86rem !important; padding:9px 18px !important; border-radius:6px !important; border:1.5px solid #ffffff !important; box-shadow:0 3px 10px rgba(0, 0, 0, 0.15) !important; display:inline-flex !important; align-items:center !important; gap:8px !important; cursor:pointer !important;" title="Buka file database analisa (.asca.json) dari komputer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#003366" stroke-width="2.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span style="color:#003366 !important; font-weight:800 !important; font-size:0.86rem !important;">Buka File Analisa</span>
            <input type="file" accept=".json" style="display:none" onchange="importWorkspaceJSON(event)" />
          </label>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.14); backdrop-filter:blur(8px); padding:1.15rem 1.35rem; border-radius:12px; border:1px solid rgba(255,255,255,0.25); min-width:260px; display:flex; align-items:center; gap:1.1rem; box-shadow:0 8px 24px rgba(0,0,0,0.12);">
        <div style="width:52px; height:52px; border-radius:12px; background:linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 100%); border:1px solid rgba(255,255,255,0.32); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"/>
            <path d="M3 10h18"/>
            <path d="M5 6l7-3 7 3"/>
            <path d="M4 10v11"/>
            <path d="M20 10v11"/>
            <path d="M8 14v4"/>
            <path d="M12 14v4"/>
            <path d="M16 14v4"/>
          </svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:0.73rem; color:#bae6fd; font-weight:700; text-transform:uppercase; letter-spacing:0.6px;">Total Plafon Portofolio</div>
          <div style="font-size:1.6rem; font-weight:900; color:#ffffff; margin:0.15rem 0 0.2rem 0; letter-spacing:-0.4px; line-height:1.2;">${fmtRp(totalPlafond, true)}</div>
          <div style="font-size:0.72rem; color:#e0f2fe; display:flex; align-items:center; gap:5px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
            <span>Dari <strong>${projects.length}</strong> berkas debitur aktif</span>
          </div>
        </div>
      </div>
    </div>

    <!-- STATISTIK METRIK PORTOFOLIO -->
    <div class="hub-stat-grid">
      <div class="hub-stat-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="hub-stat-label">Total Berkas Debitur</span>
          <span style="color:#0284c7; opacity:0.8;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>
        </div>
        <span class="hub-stat-value">${projects.length}</span>
        <span class="hub-stat-sub">Semua kasus analisa tersimpan</span>
      </div>
      <div class="hub-stat-card" style="border-left:4px solid #16a34a;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="hub-stat-label" style="color:#16a34a;">Layak Dijamin</span>
          <span style="color:#16a34a; opacity:0.85;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
        </div>
        <span class="hub-stat-value" style="color:#16a34a;">${cntLayak}</span>
        <span class="hub-stat-sub">Memenuhi kriteria underwriting</span>
      </div>
      <div class="hub-stat-card" style="border-left:4px solid #d97706;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="hub-stat-label" style="color:#d97706;">Persetujuan Bersyarat</span>
          <span style="color:#d97706; opacity:0.85;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        </div>
        <span class="hub-stat-value" style="color:#d97706;">${cntBersyarat}</span>
        <span class="hub-stat-sub">Memerlukan covenants &amp; restrukturisasi</span>
      </div>
      <div class="hub-stat-card" style="border-left:4px solid #dc2626;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="hub-stat-label" style="color:#dc2626;">Tolak Skema / High Risk</span>
          <span style="color:#dc2626; opacity:0.85;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span>
        </div>
        <span class="hub-stat-value" style="color:#dc2626;">${cntTolak}</span>
        <span class="hub-stat-sub">Zona risiko tinggi / tidak layak</span>
      </div>
      <div class="hub-stat-card" style="border-left:4px solid #64748b;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="hub-stat-label" style="color:#64748b;">Belum Dianalisis</span>
          <span style="color:#64748b; opacity:0.85;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
        </div>
        <span class="hub-stat-value" style="color:#64748b;">${cntPending}</span>
        <span class="hub-stat-sub">Menunggu kelengkapan data finansial</span>
      </div>
    </div>

    <!-- DAFTAR ANALISA -->
    <div class="hub-section-header">
      <div class="hub-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--askrindo-navy)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span>Daftar Analisa &amp; Portofolio Debitur</span>
      </div>
    </div>

    <div class="hub-projects-grid">
      ${projectCards.length > 0 ? projectCards : `
        <div style="grid-column:1/-1; background:#fff; border:1px dashed #cbd5e1; border-radius:10px; padding:2.5rem 1.5rem; text-align:center; color:#64748b;">
          <h4 style="font-size:1.05rem; color:#334155; margin-bottom:0.35rem; font-weight:800;">Belum Ada Berkas Analisa Debitur</h4>
          <p style="font-size:0.85rem; max-width:480px; margin:0 auto; line-height:1.45;">Gunakan tombol <strong>"Buat Analisa Baru"</strong> atau <strong>"Buka File Analisa"</strong> di atas untuk memulai analisa asuransi kredit.</p>
        </div>
      `}
    </div>

    <!-- PANDUAN WORKFLOW 4 TAHAP UNDERWRITING -->
    <div class="hub-workflow-card">
      <div style="font-weight:800; font-size:0.92rem; color:var(--askrindo-navy); margin-bottom:0.25rem;">
        Alur Prosedur Kerja Analisis Underwriting ASCA DCC-SWCM
      </div>
      <div style="font-size:0.75rem; color:#64748b;">
        Ikuti empat langkah standar underwriting asuransi kredit PT Askrindo (Persero):
      </div>
      <div class="hub-workflow-steps">
        <div class="hub-step-item">
          <div class="hub-step-num">1</div>
          <div>
            <div style="font-weight:700; font-size:0.78rem; color:#0f172a; margin-bottom:2px;">Verifikasi Legalitas &amp; Karakter</div>
            <div style="font-size:0.7rem; color:#64748b; line-height:1.35;">Pengecekan otomatis Daftar Hitam INAPROC LKPP, perkara perdata SIPP Pengadilan Negeri, dan sentimen media Google News.</div>
          </div>
        </div>
        <div class="hub-step-item">
          <div class="hub-step-num">2</div>
          <div>
            <div style="font-weight:700; font-size:0.78rem; color:#0f172a; margin-bottom:2px;">Input &amp; Koreksi Laporan Keuangan</div>
            <div style="font-size:0.7rem; color:#64748b; line-height:1.35;">Input Neraca &amp; Laba Rugi komparatif 2 tahun atau ekstrak otomatis via AI Vision OCR dari berkas PDF/Foto debitur.</div>
          </div>
        </div>
        <div class="hub-step-item">
          <div class="hub-step-num">3</div>
          <div>
            <div style="font-weight:700; font-size:0.78rem; color:#0f172a; margin-bottom:2px;">Dynamic Cash Flow (DCC-SWCM)</div>
            <div style="font-size:0.7rem; color:#64748b; line-height:1.35;">Kalkulasi siklus kas (DOR, DOI, DOP), perbandingan data bank vs riil, cash burn rate, dan stress testing skenario kritis.</div>
          </div>
        </div>
        <div class="hub-step-item">
          <div class="hub-step-num">4</div>
          <div>
            <div style="font-weight:700; font-size:0.78rem; color:#0f172a; margin-bottom:2px;">Penetapan Grade &amp; Rekomendasi</div>
            <div style="font-size:0.7rem; color:#64748b; line-height:1.35;">Scoring 7 Pilar 5C, penetapan Grade Risk, porsi coverage penjaminan, tarif premi IJP, dan cetak Nota Analisa Underwriting resmi.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProjectList() {
  const container = document.getElementById('projectListContainer');
  if (!container) return;

  const countBadge = document.getElementById('projectCountBadge');
  const countCollapsed = document.getElementById('projectCountCollapsed');
  if (countBadge) countBadge.textContent = projects.length;
  if (countCollapsed) countCollapsed.textContent = projects.length;

  const searchInput = document.getElementById('searchProjectInput');
  const session = getActiveSession();
  if (searchInput && !projectSearchManuallyTyped) {
    const rawVal = (searchInput.value || '').trim();
    if (rawVal) {
      const lower = rawVal.toLowerCase();
      if (lower === '1922' || lower === 'admin' || (session && lower === session.username.toLowerCase())) {
        searchInput.value = '';
      }
    }
  }
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const btnClearSidebar = document.getElementById('btnSidebarClearSearch');
  if (btnClearSidebar) {
    btnClearSidebar.style.display = query ? 'block' : 'none';
  }

  const filtered = projects.filter((p) => {
    if (!query) return true;
    return (
      (p.companyName || '').toLowerCase().includes(query) ||
      (p.sector || '').toLowerCase().includes(query) ||
      (p.bankName || '').toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding:1.5rem 0.8rem; text-align:center; color:var(--text-muted); font-size:0.75rem;">
        ${projects.length === 0 
          ? 'Belum ada berkas analisa tersimpan.' 
          : `Tidak ada analisa yang cocok dengan kata kunci "${query}".`}
      </div>
    `;
    return;
  }

  const hubEl = document.getElementById('welcomeHubView');
  const isHubActive = hubEl && hubEl.style.display !== 'none';

  container.innerHTML = filtered
    .map((p) => {
      const m = computeDCCSWCM(p);
      const isActive = !isHubActive && p.id === activeProjectId;
      return `
        <div class="project-item ${isActive ? 'active' : ''}" onclick="selectProject('${p.id}')">
          <div class="project-item-top">
            <span class="project-name" title="${p.companyName}">${p.companyName}</span>
            <span class="grade-badge ${m.gradeMeta.badgeCls}">${m.shortGrade}</span>
          </div>
          <div class="project-meta">
            <span>${p.bankName}</span> &bull; <span>${fmtRp(p.requestedPlafond, true)}</span> &bull; <span style="font-weight:600;">Score: ${m.score}</span>
          </div>
          <div class="project-item-actions">
            <button type="button" class="btn btn-outline btn-xs btn-action-item" onclick="event.stopPropagation(); duplicateProjectById('${p.id}')" title="Duplikasi Analisa Debitur">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Duplikasi</span>
            </button>
            <button type="button" class="btn btn-outline btn-xs btn-action-item" onclick="event.stopPropagation(); exportSingleProjectJSON('${p.id}')" title="Export berkas analisa (.json)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>Export</span>
            </button>
            <button type="button" class="btn btn-outline btn-xs btn-action-item btn-action-delete" onclick="event.stopPropagation(); deleteProjectById('${p.id}')" title="Hapus Berkas Analisa">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>Hapus</span>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderBanner(proj, m) {
  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setEl('bannerCompanyName', proj.companyName || '-');
  setEl('bannerFacilityType', proj.facilityType || '-');
  const facEl = document.getElementById('bannerFacilityType');
  if (facEl) facEl.title = proj.facilityType || '';
  setEl('bannerBankName', proj.bankName || '-');
  setEl('bannerSector', proj.sector || '-');
  const sectorEl = document.getElementById('bannerSector');
  if (sectorEl) sectorEl.title = proj.sector || '';
  setEl('bannerCity', proj.city || '-');
  setEl('bannerPlafond', fmtRp(proj.requestedPlafond));
  setEl('bannerFinYears', `${m ? m.yr1 : (proj.year1 || 2022)} & ${m ? m.yr2 : (proj.year2 || 2023)}`);
  setEl('bannerUnderwriter', proj.underwriter || '-');
  const curSess = getActiveSession();
  setEl('bannerUnit', getCleanUnit(curSess?.unit) || 'Divisi Underwriting Komersial');

  const gradeBadge = document.getElementById('bannerGradeBadge');
  const scoreCircle = document.getElementById('bannerScoreCircle');
  const decEl = document.getElementById('bannerDecisionText');
  const optEl = document.getElementById('bannerOptimalLimit');
  const covBadge = document.getElementById('bannerCoverageBadge');

  if (!m || !m.hasFinancials) {
    if (gradeBadge) {
      gradeBadge.className = 'grade-badge grade-pending';
      gradeBadge.style.background = '#64748b';
      gradeBadge.style.color = '#fff';
      gradeBadge.textContent = 'Belum Dianalisis';
    }
    if (scoreCircle) {
      scoreCircle.textContent = '-';
      scoreCircle.style.background = '#64748b';
      scoreCircle.style.color = '#fff';
    }
    if (decEl) {
      decEl.textContent = 'Menunggu Input Data Keuangan';
      decEl.className = 'case-decision-pill decision-pending';
      decEl.style.color = '';
    }
    if (optEl) {
      optEl.innerHTML = '<strong>Status:</strong> Silakan lengkapi Neraca &amp; Laba Rugi pada tab "Input Data" untuk memulai scoring DCC-SWCM.';
    }
    if (covBadge) covBadge.style.display = 'none';
    return;
  }

  if (gradeBadge) {
    gradeBadge.className = `grade-badge ${m.gradeMeta.badgeCls}`;
    gradeBadge.style.background = ''; // Bersihkan inline style abu-abu
    gradeBadge.textContent = `${m.shortGrade} (${m.score}/100)`;
  }

  if (covBadge) {
    covBadge.style.display = 'inline-flex';
    if (m.isLayak) {
      covBadge.className = 'cover-badge cover-approved';
      covBadge.textContent = `Layak Dijamin (Coverage ${m.recCoveragePct || 70}%)`;
      covBadge.title = `Standar Underwriting Askrindo: Fasilitas Layak Dijamin dengan coverage ${m.recCoveragePct || 70}%`;
    } else if (m.isInitialReject) {
      const condCov = m.recCoveragePct || (m.gradeMeta && m.gradeMeta.maxCoverage) || 55;
      covBadge.className = 'cover-badge cover-danger';
      covBadge.textContent = `Tidak Layak (Opsi Maks ${condCov}%)`;
      covBadge.title = `Rekomendasi awal: Tolak skema pengajuan awal (Tidak Layak). Apabila disetujui komite, rekomendasi maksimal coverage ${condCov}%.`;
    } else {
      const condCov = m.recCoveragePct || (m.gradeMeta && m.gradeMeta.maxCoverage) || 60;
      covBadge.className = 'cover-badge cover-conditional';
      covBadge.textContent = `Bersyarat (Maks Coverage ${condCov}%)`;
      covBadge.title = `Persetujuan bersyarat dengan coverage ${condCov}%`;
    }
  }

  if (scoreCircle) {
    scoreCircle.textContent = m.score;
    scoreCircle.style.background = m.gradeMeta.color;
    scoreCircle.style.color = '#fff';
  }

  if (decEl) {
    const rawDecision = m.stage1Decision || m.gradeMeta.decision || '-';
    decEl.textContent = rawDecision;
    decEl.style.color = '';
    if (m.isLayak) {
      decEl.className = 'case-decision-pill decision-approved';
    } else if (m.isInitialReject) {
      decEl.className = 'case-decision-pill decision-rejected';
    } else {
      decEl.className = 'case-decision-pill decision-conditional';
    }
  }

  if (optEl) {
    if (m.isLayak) {
      const effectiveCov = m.recCoveragePct || 70;
      const maxGuaranteedNominal = (proj.requestedPlafond || 0) * (effectiveCov / 100);
      optEl.innerHTML = `<strong>Rekomendasi:</strong> Maks ${effectiveCov}% (${fmtRp(maxGuaranteedNominal, true)}) &bull; <span style="color:#16a34a; font-weight:700;">Layak Dijamin</span> &bull; IJP: ${m.ijpRate}`;
    } else if (m.isInitialReject) {
      const effectiveCov = m.recCoveragePct || (m.gradeMeta && m.gradeMeta.maxCoverage) || 55;
      const maxGuaranteedNominal = (proj.requestedPlafond || 0) * (effectiveCov / 100);
      optEl.innerHTML = `<strong>Evaluasi:</strong> <span style="color:#dc2626; font-weight:700;">Tidak Layak</span> &bull; Opsi Maks ${effectiveCov}% (${fmtRp(maxGuaranteedNominal, true)}) &bull; IJP: ${m.ijpRate}`;
    } else {
      const effectiveCov = m.recCoveragePct || (m.gradeMeta && m.gradeMeta.maxCoverage) || 60;
      const maxGuaranteedNominal = (proj.requestedPlafond || 0) * (effectiveCov / 100);
      optEl.innerHTML = `<strong>Rekomendasi:</strong> Maks ${effectiveCov}% (${fmtRp(maxGuaranteedNominal, true)}) &bull; <span style="color:#d97706; font-weight:700;">Bersyarat</span> &bull; IJP: ${m.ijpRate}`;
    }
  }
}

// ============================================================================
// 4. FORMATTING HELPERS
// ============================================================================
function formatNumberWithDots(val) {
  if (val === null || val === undefined || val === '') return '';
  const s = String(val).trim();
  if (!s) return '';
  const isNeg = typeof val === 'number' ? val < 0 : s.startsWith('-');
  const digits = s.replace(/\D/g, '');
  if (!digits) return isNeg ? '-' : '';
  const cleanDigits = digits.replace(/^0+(?=\d)/, '');
  const withDots = cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNeg ? `-${withDots}` : withDots;
}

function parseFormattedNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).trim();
  if (!s) return 0;
  const isNeg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  const digits = s.replace(/\D/g, '');
  if (!digits) return 0;
  const num = parseFloat(digits) || 0;
  return isNeg ? -num : num;
}

function handleDotInput(inputEl) {
  if (!inputEl) return;
  const cursor = inputEl.selectionStart;
  const raw = inputEl.value;
  const isNeg = raw.trim().startsWith('-');
  const digitsOnly = raw.replace(/\D/g, '');

  if (!digitsOnly) {
    inputEl.value = isNeg ? '-' : '';
    return;
  }

  // Count how many digits existed before the cursor in original raw text
  const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, '').length;

  const cleanDigits = digitsOnly.replace(/^0+(?=\d)/, '');
  const formatted = (isNeg ? '-' : '') + cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  inputEl.value = formatted;

  // Reposition cursor to remain after the exact same number of digits
  let newCursor = formatted.length;
  let digitCount = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      digitCount++;
    }
    if (digitCount === digitsBeforeCursor) {
      newCursor = i + 1;
      break;
    }
  }
  if (newCursor === 0 && isNeg) newCursor = 1;
  inputEl.setSelectionRange(newCursor, newCursor);
}

function handleDotBlur(inputEl) {
  if (!inputEl) return;
  const num = parseFormattedNumber(inputEl.value);
  inputEl.value = inputEl.value.trim() === '' ? '' : formatNumberWithDots(num);
}

function fmtRp(val, compact = false) {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  const neg = val < 0;
  const abs = Math.abs(val);
  if (compact) {
    if (abs >= 1e12) return `${neg ? '(' : ''}Rp ${(abs / 1e12).toFixed(2)} T${neg ? ')' : ''}`;
    if (abs >= 1e9) return `${neg ? '(' : ''}Rp ${(abs / 1e9).toFixed(2)} M${neg ? ')' : ''}`;
    if (abs >= 1e6) return `${neg ? '(' : ''}Rp ${(abs / 1e6).toFixed(1)} Jt${neg ? ')' : ''}`;
  }
  const formatted = Math.round(abs).toLocaleString('id-ID');
  return neg ? `(Rp ${formatted})` : `Rp ${formatted}`;
}

function fmtNum(val, dec = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('id-ID', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

function fmtPct(val, dec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  const sign = val > 0 ? '+' : '';
  return `${sign}${Number(val).toFixed(dec)}%`;
}

function fmtRatio(val, suffix = 'x') {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${Number(val).toFixed(2)}${suffix}`;
}

function getFinEmptyStateHTML(title = 'Laporan Keuangan Belum Diinput', desc = 'Fitur dan kalkulasi analisa ini akan aktif secara otomatis setelah Anda melengkapi data Neraca & Laba Rugi pada tab "Input Data".') {
  return `
    <div style="background:#ffffff; border:1.5px dashed #cbd5e1; border-radius:10px; padding:3.5rem 1.5rem; text-align:center; color:#64748b; margin:1rem auto; max-width:680px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
      <div style="width:64px; height:64px; background:#f1f5f9; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1.25rem auto;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3 style="font-size:1.15rem; font-weight:800; color:var(--askrindo-navy, #003366); margin-bottom:0.45rem;">${title}</h3>
      <p style="font-size:0.84rem; max-width:480px; margin:0 auto 1.5rem auto; line-height:1.5; color:#64748b;">${desc}</p>
      <div style="display:flex; justify-content:center; gap:0.6rem; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" onclick="switchTab('tab-input')" style="font-size:0.82rem; padding:8px 18px; font-weight:700;"><span>📝 Input Laporan Keuangan Manual &raquo;</span></button>
        <button type="button" class="btn btn-outline" onclick="openAiFinUploadModal()" style="font-size:0.82rem; padding:8px 16px; font-weight:600;"><span>⚡ Pindai via AI OCR</span></button>
      </div>
    </div>
  `;
}

let lastToastMsg = '';
let lastToastTime = 0;
function showToast(msg) {
  const now = Date.now();
  if (msg === lastToastMsg && (now - lastToastTime) < 800) {
    return; // Cegah notifikasi duplikat / tumpuk
  }
  lastToastMsg = msg;
  lastToastTime = now;

  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Pastikan hanya 1 notifikasi yang aktif di layar (tidak menumpuk 2 pcs)
  container.innerHTML = '';

  // Bersihkan jika ada tanda centang di awal teks agar tidak terjadi centang ganda (✓ ✓)
  let cleanMsg = String(msg || '').trim();
  cleanMsg = cleanMsg.replace(/^[✓✔\u2713\u2714\s]+/, '').trim();

  // Tentukan ikon: jika pesan diawali emoji tertentu (⚠️, 📰, 🔍, dll), gunakan emoji itu saja.
  // Jika tidak, sematkan 1 buah tanda centang tunggal (✓).
  let iconHtml = '<span>&#10003;</span>';
  const hasLeadingEmoji = /^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\uFE0F)/.test(cleanMsg);
  if (hasLeadingEmoji) {
    iconHtml = '';
  }

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = iconHtml + (iconHtml ? ' ' : '') + '<span>' + cleanMsg + '</span>';
  container.appendChild(t);
  setTimeout(() => {
    if (t.parentNode) t.remove();
  }, 3200);
}

// ============================================================================
// ============================================================================
// 4B. SISTEM EVALUASI OTOMATIS 5C & PENGECEKAN RIIL (LKPP / INAPROC & SIPP)
// ============================================================================
function normalizeInaprocCompanyName(raw) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractInaprocEntityType(normStr) {
  if (!normStr) return '';
  const lead = normStr.match(/^(pt|cv|ud|pd|firma|fa|koperasi|yayasan|perum|perumda|kjpp|kap)\b/i);
  if (lead) return lead[1].toLowerCase();
  const tail = normStr.match(/\b(pt|cv|ud|pd|firma|fa|koperasi|yayasan|perum|perumda|kjpp|kap)$/i);
  if (tail) return tail[1].toLowerCase();
  return '';
}

function stripEntityPrefixSuffix(normStr) {
  if (!normStr) return '';
  return normStr
    .replace(/^(pt|cv|ud|pd|firma|fa|koperasi|yayasan|perum|perumda|persero|tbk|kjpp|kap)\s+/i, '')
    .replace(/\s+(pt|cv|ud|pd|firma|fa|koperasi|yayasan|perum|perumda|persero|tbk|kjpp|kap)$/i, '')
    .replace(/\s+(tbk|persero)$/i, '')
    .trim();
}

function checkInaprocBlacklist(name) {
  if (!name) return { isBlacklisted: false, reason: '', skNumber: '', status: '', expiredDate: '', institution: '' };
  const qFull = normalizeInaprocCompanyName(name);
  const qCore = stripEntityPrefixSuffix(qFull);
  const qEntity = extractInaprocEntityType(qFull);
  if (!qFull || qCore.length < 3) {
    return { isBlacklisted: false, reason: '', skNumber: '', status: '', expiredDate: '', institution: '' };
  }

  const realDb = Array.isArray(window.INAPROC_REAL_DB) ? window.INAPROC_REAL_DB : [];
  if (realDb.length > 0) {
    // Hanya cocokkan sanksi yang sedang TAYANG AKTIF (PUBLISHED) di https://daftar-hitam.inaproc.id/
    // dan wajib EXACT MATCH pada nama perusahaan (tanpa substring/includes agar tidak pernah salah deteksi)
    for (let i = 0; i < realDb.length; i++) {
      const rec = realDb[i];
      if (!rec || !rec.n || rec.st !== 'PUBLISHED') continue;
      const dbFull = normalizeInaprocCompanyName(rec.n);
      const dbCore = stripEntityPrefixSuffix(dbFull);
      const dbEntity = extractInaprocEntityType(dbFull);
      if (!dbCore || dbCore.length < 3) continue;

      // Jika keduanya mencantumkan badan usaha (misal PT vs CV) dan berbeda, maka bukan entitas yang sama
      if (qEntity && dbEntity && qEntity !== dbEntity) continue;

      if (dbFull === qFull || dbCore === qCore) {
        const insLabel = rec.ins ? ` (${rec.ins})` : '';
        return {
          isBlacklisted: true,
          matchedName: rec.n,
          skNumber: rec.sk || '-',
          status: 'PUBLISHED',
          expiredDate: rec.exp || '-',
          institution: rec.ins || 'Portal Daftar Hitam Nasional LKPP',
          reason: `Terdaftar Masuk Daftar Hitam Nasional LKPP - Status TAYANG AKTIF s/d ${rec.exp || '-'}${insLabel}`
        };
      }
    }
  }

  return { isBlacklisted: false, reason: '', skNumber: '', status: '', expiredDate: '', institution: '' };
}

let inaprocAutoTriggerTimer = null;
let isScanningInaproc = false;

function ensureInaprocAutoChecked(proj) {
  if (!proj) return;
  const cleanName = (proj.companyName || 'Perusahaan').replace(/\s*\([^)]*\)/g, '').trim();
  const dbReady = Array.isArray(window.INAPROC_REAL_DB) && window.INAPROC_REAL_DB.length > 0;
  const targetVer = dbReady ? 'REAL_DB_V3_STRICT_PUBLISHED' : 'REAL_DB_V3_PENDING';
  if (
    !proj.inaprocCheckedCompany ||
    proj.inaprocCheckedCompany !== cleanName ||
    proj.inaprocDbVersion !== targetVer ||
    !proj.inaprocStatus ||
    proj.inaprocStatus === 'unverified'
  ) {
    runAutoInaprocCheckSync(proj, false);
  }
}

function runAutoInaprocCheckSync(proj, notifyToast = false) {
  if (!proj) return;
  const cleanName = (proj.companyName || 'Perusahaan').replace(/\s*\([^)]*\)/g, '').trim();
  const accessedStr = formatGoogleNewsAccessedDate(new Date());
  const chk = checkInaprocBlacklist(cleanName);
  const portalUrl = `https://daftar-hitam.inaproc.id/?search=${encodeURIComponent(cleanName)}`;
  const dbReady = Array.isArray(window.INAPROC_REAL_DB) && window.INAPROC_REAL_DB.length > 0;

  proj.inaprocCheckedCompany = cleanName;
  proj.inaprocDbVersion = dbReady ? 'REAL_DB_V3_STRICT_PUBLISHED' : 'REAL_DB_V3_PENDING';
  proj.inaprocVerifiedAt = new Date().toISOString();

  if (chk.isBlacklisted) {
    proj.inaprocStatus = 'blacklisted';
    proj.inaprocVerificationNote = `Auto-Screening INAPROC: TERDAFTAR BLACKLIST - SK: ${chk.skNumber || '-'} (${accessedStr} WIB)`;
    proj.inaprocAutoResult = {
      status: 'blacklisted',
      queryName: cleanName,
      matchedName: chk.matchedName || cleanName,
      checkedAt: accessedStr,
      skNumber: chk.skNumber || '-',
      sanctionStatus: chk.status || 'PUBLISHED',
      expiredDate: chk.expiredDate || '-',
      institution: chk.institution || 'LKPP',
      sanctionPeriod: chk.status === 'PUBLISHED' ? `TAYANG AKTIF (Berakhir: ${chk.expiredDate || '-'})` : `Tercatat di Database INAPROC (${chk.status})`,
      portalUrl,
      summary: `Sistem mendeteksi otomatis entitas "${chk.matchedName || cleanName}" dalam Database Riil Daftar Hitam Nasional INAPROC LKPP (${chk.reason}). Skor INAPROC otomatis menjadi 0 / 15 Poin.`
    };
    if (notifyToast) {
      showToast(`⚠️ Auto-Check Daftar Hitam LKPP: "${cleanName}" TERDETEKSI BLACKLIST (SK: ${chk.skNumber}) — 0/15 Poin!`);
    }
  } else {
    proj.inaprocStatus = 'clean';
    proj.inaprocVerificationNote = `Auto-Screening INAPROC: BERSIH / NIHIL SANKSI (${accessedStr} WIB)`;
    proj.inaprocAutoResult = {
      status: 'clean',
      queryName: cleanName,
      matchedName: cleanName,
      checkedAt: accessedStr,
      skNumber: '-',
      sanctionStatus: 'CLEAN',
      expiredDate: '-',
      institution: '-',
      sanctionPeriod: 'Nihil (0 Sanksi Aktif)',
      portalUrl,
      summary: `Hasil pencarian otomatis pada Database Riil Daftar Hitam Nasional INAPROC LKPP (5.357 data sanksi) untuk "${cleanName}": Tidak ditemukan catatan sanksi (Bersih - 15 / 15 Poin).`
    };
    if (notifyToast) {
      showToast(`Auto-Check Daftar Hitam LKPP: "${cleanName}" Terverifikasi BERSIH (15/15 Poin).`);
    }
  }
}

async function triggerLiveInaprocCheck(isManualClick = false) {
  const proj = getActiveProject();
  if (!proj || isScanningInaproc) return;

  isScanningInaproc = true;
  const btn = document.getElementById('btnAutoCheckInaproc');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Memindai...';
  }

  const cleanName = (proj.companyName || 'Perusahaan').replace(/\s*\([^)]*\)/g, '').trim();

  // Jalankan pengecekan terhadap database riil INAPROC (5.357 entri)
  runAutoInaprocCheckSync(proj, false);

  isScanningInaproc = false;
  saveProjectsToStorage();
  renderAll();

  if (isManualClick) {
    if (proj.inaprocStatus === 'blacklisted') {
      showToast(`⚠️ Hasil Scan Daftar Hitam INAPROC: "${cleanName}" TERDETEKSI BLACKLIST (SK: ${proj.inaprocAutoResult?.skNumber || '-'}) — 0/15 Poin!`);
    } else {
      showToast(`Hasil Scan Daftar Hitam INAPROC: "${cleanName}" Bersih / Nihil Sanksi (15/15 Poin).`);
    }
  }
}

function isMaritimeOrImportRisk(proj) {
  if (!proj) return false;
  const method = (proj.procurementMethod || '').toLowerCase().trim();
  if (method === 'none' || method === 'domestic') return false;
  if (method === 'import_sea') return true;
  // Fallback hanya jika metode pengadaan belum pernah dipilih secara eksplisit:
  if (proj.usdAmount > 0) return true;
  const text = ((proj.sector || '') + ' ' + (proj.businessDesc || '') + ' ' + (proj.facilityType || '') + ' ' + (proj.companyName || '')).toLowerCase();
  return /impor|import|kedelai|gandum|shipping|kargo|cargo|laut|maritim|vessel|l\/c|lc|skbdn|trust receipt|forex/i.test(text);
}

function openInaprocPortal(name) {
  const cleanName = (name || '').replace(/\s*\([^)]*\)/g, '').trim();
  const q = encodeURIComponent(cleanName || name || 'PT');
  window.open(`https://daftar-hitam.inaproc.id/?search=${q}`, '_blank');
}

function openInaprocGoogleSearch(name) {
  const cleanName = (name || '').replace(/\s*\([^)]*\)/g, '').trim();
  const q = encodeURIComponent(`"${cleanName}" site:inaproc.id OR "daftar hitam" OR "sanksi lkpp"`);
  window.open(`https://www.google.com/search?q=${q}`, '_blank');
}

function setInaprocResult(status, compName) {
  const proj = getActiveProject();
  if (!proj) return;
  const now = new Date();
  const dtStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
                now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const session = getActiveSession();
  const uwName = session ? (session.fullName || session.username) : 'Analis Underwriting';

  proj.inaprocStatus = status;
  proj.inaprocVerifiedAt = now.toISOString();
  if (status === 'blacklisted') {
    proj.inaprocVerificationNote = `Sanksi Terkonfirmasi di https://daftar-hitam.inaproc.id/ (${dtStr} WIB oleh ${uwName})`;
    showToast(`⚠️ Sanksi INAPROC Dikonfirmasi: "${compName || proj.companyName}" Terdaftar Blacklist Nasional (-30 Poin)!`);
  } else {
    proj.inaprocVerificationNote = `Terverifikasi Nihil Sanksi di https://daftar-hitam.inaproc.id/ (${dtStr} WIB oleh ${uwName})`;
    showToast(`Hasil INAPROC Dikonfirmasi: "${compName || proj.companyName}" Terverifikasi Bersih di Portal Resmi!`);
  }
  saveProjectsToStorage();
  renderAll();
}

function autoVerifyInaproc(proj) {
  if (!proj) proj = getActiveProject();
  if (!proj) return;
  const cleanName = (proj.companyName || '').replace(/\s*\([^)]*\)/g, '').trim();
  
  const check = checkInaprocBlacklist(cleanName);
  if (check.isBlacklisted) {
    setInaprocResult('blacklisted', cleanName);
  } else {
    openInaprocPortal(cleanName);
    showToast(`🌐 Membuka portal https://daftar-hitam.inaproc.id/?search=${encodeURIComponent(cleanName)} untuk konfirmasi riil.`);
  }
}

// ============================================================================
// RESOLUSI SISTEM INFORMASI PENELUSURAN PERKARA (SIPP) PENGADILAN NEGERI
// ============================================================================
function getSippPnInfo(cityOrKab, companyName) {
  const rawCity = String(cityOrKab || '').trim();
  const cleanCompName = (companyName || '').replace(/\s*\([^)]*\)/g, '').trim();

  if (!rawCity) {
    const putusanMaUrl = cleanCompName
      ? `https://putusan3.mahkamahagung.go.id/search.html?q=${encodeURIComponent(cleanCompName)}`
      : 'https://putusan3.mahkamahagung.go.id/';
    return {
      city: '',
      slug: '',
      pnName: 'Pengadilan Negeri Setempat',
      baseUrl: 'https://putusan3.mahkamahagung.go.id/',
      searchUrl: 'https://putusan3.mahkamahagung.go.id/',
      putusanMaUrl,
      cleanCompName
    };
  }

  // Bersihkan awalan Kabupaten / Kab. / Kota
  const norm = rawCity.toLowerCase()
    .replace(/^kabupaten\s+|^kab\.\s*|^kota\s+/gi, '')
    .trim();

  // Alias yurisdiksi PN di Indonesia yang letak/nama kantornya berbeda
  const ALIAS_MAP = {
    'kulon progo': { slug: 'wates', pnName: 'Pengadilan Negeri Wates' },
    'gunungkidul': { slug: 'wonosari', pnName: 'Pengadilan Negeri Wonosari' },
    'gunung kidul': { slug: 'wonosari', pnName: 'Pengadilan Negeri Wonosari' },
    'kab. bandung': { slug: 'balebandung', pnName: 'Pengadilan Negeri Bale Bandung' },
    'bandung barat': { slug: 'balebandung', pnName: 'Pengadilan Negeri Bale Bandung' },
    'kab. bogor': { slug: 'cibinong', pnName: 'Pengadilan Negeri Cibinong' },
    'kab. bekasi': { slug: 'cikarang', pnName: 'Pengadilan Negeri Cikarang' },
    'kab. malang': { slug: 'kepanjen', pnName: 'Pengadilan Negeri Kepanjen' },
    'kab. tegal': { slug: 'slawi', pnName: 'Pengadilan Negeri Slawi' },
    'kab. magelang': { slug: 'mungkid', pnName: 'Pengadilan Negeri Mungkid' },
    'grobogan': { slug: 'purwodadi', pnName: 'Pengadilan Negeri Purwodadi' },
    'banyumas': { slug: 'purwokerto', pnName: 'Pengadilan Negeri Purwokerto' },
    'jakarta pusat': { slug: 'jakartapusat', pnName: 'Pengadilan Negeri Jakarta Pusat' },
    'jakarta selatan': { slug: 'jakartaselatan', pnName: 'Pengadilan Negeri Jakarta Selatan' },
    'jakarta barat': { slug: 'jakartabarat', pnName: 'Pengadilan Negeri Jakarta Barat' },
    'jakarta timur': { slug: 'jakartatimur', pnName: 'Pengadilan Negeri Jakarta Timur' },
    'jakarta utara': { slug: 'jakartautara', pnName: 'Pengadilan Negeri Jakarta Utara' },
    'tangerang selatan': { slug: 'tangerang', pnName: 'Pengadilan Negeri Tangerang' },
    'surakarta': { slug: 'surakarta', pnName: 'Pengadilan Negeri Surakarta' },
    'solo': { slug: 'surakarta', pnName: 'Pengadilan Negeri Surakarta' },
    'sukoharjo': { slug: 'sukoharjo', pnName: 'Pengadilan Negeri Sukoharjo' },
  };

  let slug = '';
  let pnName = '';

  const rawLower = rawCity.toLowerCase();
  if (ALIAS_MAP[rawLower]) {
    slug = ALIAS_MAP[rawLower].slug;
    pnName = ALIAS_MAP[rawLower].pnName;
  } else if (ALIAS_MAP[norm]) {
    slug = ALIAS_MAP[norm].slug;
    pnName = ALIAS_MAP[norm].pnName;
  } else {
    slug = norm.replace(/[^a-z0-9]/g, '');
    const titleCased = norm.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    pnName = `Pengadilan Negeri ${titleCased}`;
  }

  const baseUrl = `https://sipp.pn-${slug}.go.id/`;
  const putusanMaUrl = cleanCompName
    ? `https://putusan3.mahkamahagung.go.id/search.html?q=${encodeURIComponent(cleanCompName)}`
    : 'https://putusan3.mahkamahagung.go.id/';

  return {
    city: rawCity,
    slug,
    pnName,
    baseUrl,
    searchUrl: baseUrl,
    putusanMaUrl,
    cleanCompName
  };
}

function openSippPortal(name, city) {
  const proj = getActiveProject();
  const targetCity = city || (proj ? proj.city : '') || '';
  const cleanName = (name || (proj ? proj.companyName : '') || 'PT').replace(/\s*\([^)]*\)/g, '').trim();
  const info = getSippPnInfo(targetCity, cleanName);

  // Otomatis salin nama perusahaan ke clipboard agar user tinggal paste di web SIPP PN
  if (cleanName && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(cleanName).catch(() => {});
  }

  // Buka LANGSUNG WEB UTAMA (tanpa subdirektori pencarian yang memicu 404 / turnstile bot-block)
  window.open(info.baseUrl, '_blank');
  showToast(`🏛️ Membuka web utama ${info.baseUrl}. Nama "${cleanName}" telah disalin ke clipboard untuk ditempel di portal SIPP.`);
}

function openDirectPutusanMAPortal(name) {
  const proj = getActiveProject();
  const cleanName = (name || (proj ? proj.companyName : '') || 'PT').replace(/\s*\([^)]*\)/g, '').trim();
  const q = encodeURIComponent(cleanName);
  window.open(`https://putusan3.mahkamahagung.go.id/search.html?q=${q}`, '_blank');
}

function setSippResult(status, compName) {
  updateCharacterParam('sippStatus', status);
  const statusLabel = status === 'clean' 
    ? 'Nihil Perkara / Gugatan (10 Poin Penuh)' 
    : (status === 'disputed' ? 'Ada Sengketa Perdata (5 Poin)' : 'PKPU / Pailit (0 Poin)');
  showToast(`⚖️ Status SIPP Pengadilan berhasil diperbarui: ${statusLabel}`);
}

function openGoogleNewsPortal(name) {
  const cleanName = (name || 'PT').replace(/\s*\([^)]*\)/g, '').trim();
  const q = encodeURIComponent(cleanName + ' kasus OR sengketa OR pailit OR macet OR fraud OR gagal bayar');
  window.open(`https://news.google.com/search?q=${q}&hl=id&gl=ID&ceid=ID:id`, '_blank');
}

function formatGoogleNewsAccessedDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatGoogleNewsPubDate(dateInput) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return String(dateInput || '15 Jan 2026 10:00');
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function detectNegativeNewsHeadline(title) {
  if (!title) return false;
  return /cilaka|dihentikan|pembohong|tipu|penipuan|korupsi|pailit|pkpu|wanprestasi|sengketa|gugatan|daftar[\s_-]*hitam|blacklist|macet|gagal[\s_-]*bayar|tersangka|kejaksaan|kpk|pidana|sanksi|fiktif|mangkrak|rugikan|gelapkan|bodong|ilegal|bermasalah/i.test(String(title));
}

function normalizeNewsSearchQuery(rawName) {
  return String(rawName || '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\b(PT|CV|UD|PD|FA)\.\s*/gi, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

let isFetchingGoogleNews = false;
let currentNewsAbortController = null;
let currentNewsFetchSeq = 0;
const fetchedGoogleNewsCache = new Set();

function runAutoGoogleNewsCheckSync(proj, notifyToast = false) {
  if (!proj) return;
  const cleanName = normalizeNewsSearchQuery(proj.companyName || 'Perusahaan');
  proj.googleNewsCompany = cleanName;
  proj.googleNewsAccessedAt = formatGoogleNewsAccessedDate(new Date());
  proj.googleNewsItems = [];
  proj.googleNewsFetchedCompany = null;
  proj.googleNewsLiveVersion = 'REAL_LIVE_V2';
  proj.negativeNews = 'clean'; // Jika belum/tidak ditemukan berita negatif, perusahaan bersih (20/20 Poin)
  if (notifyToast) {
    showToast(`📰 Memindai berita riil Google News untuk "${cleanName}"...`);
  }
}

function ensureGoogleNewsInitialized(proj) {
  if (!proj) return;
  const cleanName = normalizeNewsSearchQuery(proj.companyName || 'Perusahaan');
  if (!Array.isArray(proj.googleNewsItems)) {
    proj.googleNewsItems = [];
  }
  if (!proj.googleNewsCompany) {
    proj.googleNewsCompany = cleanName;
  }
  if (!proj.googleNewsAccessedAt) {
    proj.googleNewsAccessedAt = formatGoogleNewsAccessedDate(new Date());
  }
  if (!proj.negativeNews) {
    proj.negativeNews = 'clean';
  }
  // Jangan pernah memicu fetch jaringan di dalam fungsi kalkulasi/render agar sistem tetap ringan!
}

async function fetchGoogleNewsForProject(isManualClick = false, isAutoInputTrigger = false) {
  const proj = getActiveProject();
  if (!proj) return;

  const cleanName = normalizeNewsSearchQuery(proj.companyName || 'Perusahaan');
  if (!cleanName || cleanName.length < 3) return;

  const cacheKey = `${proj.id || 'default'}::${cleanName.toLowerCase()}`;
  const isForceRefresh = isManualClick || isAutoInputTrigger;

  // Cegah pencarian berulang otomatis jika bukan dari klik Simpan / ganti nama / klik tombol Update Berita
  if (!isForceRefresh && (proj.googleNewsFetchedCompany === cleanName || fetchedGoogleNewsCache.has(cacheKey))) {
    return;
  }

  // Batalkan request sebelumnya yang masih berjalan agar pencarian baru langsung dieksekusi tanpa terblokir
  if (currentNewsAbortController) {
    try {
      currentNewsAbortController.abort();
    } catch (_) {}
    currentNewsAbortController = null;
  }

  const mySeq = ++currentNewsFetchSeq;
  isFetchingGoogleNews = true;

  const oldMap = {};
  if (Array.isArray(proj.googleNewsItems) && proj.googleNewsCompany === cleanName) {
    proj.googleNewsItems.forEach((it) => {
      if (it && it.title) oldMap[it.title] = it.status || 'unmarked';
    });
  }

  // Reset daftar berita lama saat mencari baru agar UI langsung memperlihatkan proses pencarian baru
  if (isForceRefresh || proj.googleNewsCompany !== cleanName) {
    proj.googleNewsItems = [];
    proj.negativeNews = 'clean';
  }

  proj.googleNewsFetchedCompany = cleanName;
  proj.googleNewsCompany = cleanName;
  proj.googleNewsAccessedAt = formatGoogleNewsAccessedDate(new Date());
  proj.googleNewsLiveVersion = 'REAL_LIVE_V2';
  fetchedGoogleNewsCache.add(cacheKey);

  // Perbarui tampilan tombol & kartu berita menjadi status "Memuat Berita..."
  const btn = document.getElementById('btnUpdateGoogleNews');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Memuat Berita...';
  }
  const mInit = computeDCCSWCM(proj);
  render5CTab(proj, mInit);

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanName)}&hl=id&gl=ID&ceid=ID:id`;
  let parsedItems = [];

  // 1. Ambil data berita riil melalui RSS2JSON API (Google News RSS) + cache-buster saat refresh
  try {
    const controller1 = new AbortController();
    currentNewsAbortController = controller1;
    const timer1 = setTimeout(() => controller1.abort(), 4500);
    const rss2JsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const res1 = await fetch(rss2JsonUrl, { signal: controller1.signal, cache: 'no-store' });
    clearTimeout(timer1);
    if (res1.ok) {
      const data1 = await res1.json();
      if (data1 && data1.status === 'ok' && Array.isArray(data1.items) && data1.items.length > 0) {
        parsedItems = data1.items.slice(0, 6).map((item) => {
          const title = (item.title || 'Berita Terkait Perusahaan').trim();
          const link = item.link || `https://news.google.com/search?q=${encodeURIComponent(cleanName)}&hl=id&gl=ID&ceid=ID:id`;
          const titleParts = title.split(' - ');
          const inferredSource = titleParts.length > 1 ? titleParts[titleParts.length - 1] : (item.author || 'Google News');
          const autoStatus = oldMap[title] || (detectNegativeNewsHeadline(title) ? 'negative' : 'unmarked');
          return {
            title,
            source: inferredSource,
            pubDate: formatGoogleNewsPubDate(item.pubDate),
            link,
            status: autoStatus
          };
        });
      }
    }
  } catch (e1) {
    if (mySeq !== currentNewsFetchSeq) return;
  }

  if (mySeq !== currentNewsFetchSeq) return;

  // 2. Fallback cepat ke CodeTabs XML Proxy jika rss2json gagal / terkena limit
  if (parsedItems.length === 0) {
    try {
      const controller2 = new AbortController();
      currentNewsAbortController = controller2;
      const timer2 = setTimeout(() => controller2.abort(), 4000);
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`;
      const res2 = await fetch(proxyUrl, { signal: controller2.signal, cache: 'no-store' });
      clearTimeout(timer2);

      if (res2.ok) {
        const xmlText = await res2.text();
        if (xmlText && xmlText.includes('<item>')) {
          const parser = new DOMParser();
          const xml = parser.parseFromString(xmlText, 'text/xml');
          const items = Array.from(xml.querySelectorAll('item')).slice(0, 6);
          parsedItems = items.map((item) => {
            const title = item.querySelector('title')?.textContent?.trim() || 'Berita Terkait Perusahaan';
            const link = item.querySelector('link')?.textContent?.trim() || `https://news.google.com/search?q=${encodeURIComponent(cleanName)}&hl=id&gl=ID&ceid=ID:id`;
            const pubDateRaw = item.querySelector('pubDate')?.textContent?.trim();
            const sourceEl = item.querySelector('source')?.textContent?.trim();
            const titleParts = title.split(' - ');
            const inferredSource = sourceEl || (titleParts.length > 1 ? titleParts[titleParts.length - 1] : 'Google News');
            const autoStatus = oldMap[title] || (detectNegativeNewsHeadline(title) ? 'negative' : 'unmarked');
            return {
              title,
              source: inferredSource,
              pubDate: formatGoogleNewsPubDate(pubDateRaw),
              link,
              status: autoStatus
            };
          });
        }
      }
    } catch (err) {
      if (mySeq !== currentNewsFetchSeq) return;
    }
  }

  if (mySeq !== currentNewsFetchSeq) return;

  // TANPA HARDCODE: Jika tidak ada berita di Google News (parsedItems.length === 0),
  // maka googleNewsItems tetap [] (kosong) dan negativeNews otomatis 'clean' (20/20 Poin).
  proj.googleNewsCompany = cleanName;
  proj.googleNewsFetchedCompany = cleanName;
  proj.googleNewsAccessedAt = formatGoogleNewsAccessedDate(new Date());
  proj.googleNewsItems = parsedItems;
  proj.googleNewsLiveVersion = 'REAL_LIVE_V2';

  const hasNeg = proj.googleNewsItems.some((it) => it.status === 'negative');
  proj.negativeNews = hasNeg ? 'negative' : 'clean';

  isFetchingGoogleNews = false;
  currentNewsAbortController = null;
  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);
  renderProjectList();
  renderBanner(proj, m);
  render5CTab(proj, m);
  renderScoreCalculationTab(proj, m);
  renderGradeRiskTab(proj, m);
  renderPrintableReport(proj, m);

  if (isAutoInputTrigger) {
    const inaprocTxt = proj.inaprocStatus === 'blacklisted' ? `BLACKLIST LKPP (SK: ${proj.inaprocAutoResult?.skNumber || '-'})` : 'INAPROC Bersih (15/15)';
    const newsTxt = proj.googleNewsItems.length === 0
      ? 'Nihil Berita di Google News (Citra Bersih 20/20)'
      : (proj.negativeNews === 'negative' ? `Terdeteksi Berita Negatif (0/20)` : `${proj.googleNewsItems.length} Berita Ditemukan (20/20)`);
    showToast(`🔍 Auto-Screening 5C "${cleanName}": ${inaprocTxt} | ${newsTxt}.`);
  } else if (isManualClick) {
    if (proj.googleNewsItems.length === 0) {
      showToast(`Google News "${cleanName}": Tidak ditemukan berita (0 artikel) — Tidak memiliki citra negatif (20/20 Poin).`);
    } else {
      showToast(`Google News "${cleanName}": Ditemukan ${proj.googleNewsItems.length} artikel berita riil.`);
    }
  }
}

function markGoogleNewsItem(idx, targetStatus) {
  const proj = getActiveProject();
  if (!proj || !Array.isArray(proj.googleNewsItems) || !proj.googleNewsItems[idx]) return;

  const currentStatus = proj.googleNewsItems[idx].status || 'unmarked';
  proj.googleNewsItems[idx].status = (currentStatus === targetStatus) ? 'unmarked' : targetStatus;

  const negCount = proj.googleNewsItems.filter((it) => it.status === 'negative').length;
  proj.negativeNews = negCount > 0 ? 'negative' : 'clean';

  saveProjectsToStorage();
  renderAll();

  if (proj.googleNewsItems[idx].status === 'negative') {
    showToast(`Berita ditandai NEGATIF. Skor Screening Media otomatis menjadi 0/20 Poin.`);
  } else if (proj.googleNewsItems[idx].status === 'clean') {
    showToast(`Berita ditandai BUKAN NEGATIF. Skor Karakter telah diperbarui.`);
  } else {
    showToast(`Status penandaan berita direset menjadi Belum Ditandai.`);
  }
}

// ============================================================================
// 4A. KATALOG & AUTOMATION ENGINE 39-PARAMETER KUALITATIF 5C UNDERWRITING ASKRINDO
// Sumber: Petunjuk Teknis Akseptasi Askrindo / PT. IDX Consulting
// Bobot Normal 5C: Character (30.8%), Capacity (30.8%), Capability (9.2%), Condition (13.8%), Collateral (15.4%) = 100%
// Catatan: Rasio Keuangan dikalkulasi mandiri secara komprehensif pada Tab Rasio Keuangan.
// ============================================================================

const ASKRINDO_5C_CATALOG = [
  // --- 1. CHARACTER (16 Parameters, Bobot 20% = 0.200) ---
  {
    id: 'c1_hubungan_askrindo',
    num: 1,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.020,
    name: 'Hubungan Dengan Askrindo',
    desc: 'Riwayat kemitraan dan rekam jejak kepatuhan debitur terhadap produk asuransi penjaminan PT Askrindo.',
    options: [
      { key: 'A', text: 'Sudah pernah menggunakan Produk Askrindo tanpa wanprestasi', score: 100 },
      { key: 'B', text: 'Belum pernah menggunakan produk Askrindo', score: 60 },
      { key: 'C', text: 'Sudah pernah menggunakan Produk Askrindo dan pernah wanprestasi', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.askrindoHistory === 'existing_clean') return { key: 'A', score: 100, reason: 'Mitra Askrindo tanpa wanprestasi' };
      if (proj.askrindoHistory === 'existing_default') return { key: 'C', score: 30, reason: 'Pernah wanprestasi di Askrindo' };
      if (proj.defaultHistory === 'defaulted') return { key: 'C', score: 30, reason: 'Riwayat wanprestasi/default' };
      if ((proj.askrindoCustYears || 0) > 0) return { key: 'A', score: 100, reason: `Nasabah Askrindo (${proj.askrindoCustYears} thn)` };
      return { key: 'B', score: 60, reason: 'Debitur Tertanggung Baru di Askrindo' };
    }
  },
  {
    id: 'c2_lama_customer',
    num: 2,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.020,
    name: 'Lama Menjadi Customer Askrindo',
    desc: 'Durasi lamanya debitur menjadi customer/principal aktif Askrindo.',
    options: [
      { key: 'A', text: 'Lama menjadi customer Askrindo > 5 tahun', score: 100 },
      { key: 'B', text: 'Lama menjadi customer Askrindo > 3 tahun s/d 5 tahun', score: 80 },
      { key: 'C', text: 'Lama menjadi customer Askrindo > 2 tahun s/d 3 tahun', score: 60 },
      { key: 'D', text: 'Lama menjadi customer Askrindo > 1 tahun s/d 2 tahun', score: 40 },
      { key: 'E', text: 'Lama menjadi customer Askrindo <= 1 tahun', score: 20 },
      { key: 'F', text: 'Debitur Tertanggung Baru atau tidak terinformasi', score: 10 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const yrs = typeof proj.askrindoCustYears === 'number' ? proj.askrindoCustYears : 0;
      if (yrs > 5) return { key: 'A', score: 100, reason: `Customer Askrindo ${yrs} thn (>5 thn)` };
      if (yrs > 3) return { key: 'B', score: 80, reason: `Customer Askrindo ${yrs} thn (3-5 thn)` };
      if (yrs > 2) return { key: 'C', score: 60, reason: `Customer Askrindo ${yrs} thn (2-3 thn)` };
      if (yrs > 1) return { key: 'D', score: 40, reason: `Customer Askrindo ${yrs} thn (1-2 thn)` };
      if (yrs > 0) return { key: 'E', score: 20, reason: `Customer Askrindo <= 1 thn` };
      return { key: 'F', score: 10, reason: 'Debitur Tertanggung Baru di Askrindo' };
    }
  },
  {
    id: 'c3_history_pertanggungan',
    num: 3,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'History pertanggungan eksisting di Askrindo',
    desc: 'Catatan klaim penjaminan atau penolakan polis sebelumnya di Askrindo.',
    options: [
      { key: 'A', text: 'Tidak pernah klaim', score: 100 },
      { key: 'B', text: 'Debitur Tertanggung baru', score: 75 },
      { key: 'C', text: 'Sudah pernah klaim namun sudah di-recover', score: 50 },
      { key: 'D', text: 'Principal yang pernah ditolak pertanggungannya', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.askrindoClaimHistory === 'recovered') return { key: 'C', score: 50, reason: 'Pernah klaim namun sudah di-recover' };
      if (proj.askrindoClaimHistory === 'rejected') return { key: 'D', score: 25, reason: 'Pernah ditolak pertanggungannya' };
      if (proj.askrindoHistory === 'existing_clean') return { key: 'A', score: 100, reason: 'Eksisting & tidak pernah klaim' };
      return { key: 'B', score: 75, reason: 'Debitur Tertanggung baru' };
    }
  },
  {
    id: 'c4_history_premi',
    num: 4,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'History Pembayaran Premi',
    desc: 'Kedisiplinan debitur dalam melunasi premi/IJP penjaminan Askrindo.',
    options: [
      { key: 'A', text: 'Pembayaran Premi Lancar', score: 100 },
      { key: 'B', text: 'Belum ada pembayaran premi mengingat Debitur Tertanggung baru', score: 75 },
      { key: 'C', text: 'Pembayaran lancar namun pernah menunggak lebih dari 2x', score: 50 },
      { key: 'D', text: 'Pembayaran menunggak', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.askrindoPremiumHistory === 'arrears') return { key: 'D', score: 25, reason: 'Pembayaran premi menunggak' };
      if (proj.askrindoPremiumHistory === 'late_twice') return { key: 'C', score: 50, reason: 'Pernah menunggak premi > 2x' };
      if (proj.askrindoHistory === 'existing_clean') return { key: 'A', score: 100, reason: 'Pembayaran premi lancar' };
      return { key: 'B', score: 75, reason: 'Debitur Tertanggung baru' };
    }
  },
  {
    id: 'c5_reputasi_bisnis',
    num: 5,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Reputasi Bisnis',
    desc: 'Rekam jejak hubungan bisnis dengan mitra kerja, supplier, konsumen, sengketa perdata SIPP, dan blacklist INAPROC LKPP.',
    options: [
      { key: 'A', text: 'Memiliki reputasi bisnis baik atau tidak terdapat informasi negatif dari supplier, konsumen, dan perusahaan sejenis dalam 2 tahun terakhir', score: 100 },
      { key: 'B', text: 'Informasi tentang hubungan bisnis tidak dimiliki karena debitur merupakan pemain baru', score: 50 },
      { key: 'C', text: 'Terdapat informasi negatif dari supplier/pelanggan/perusahaan sejenis, hutang piutang bermasalah atau terkait kasus hukum', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.negativeNews === 'negative' || proj.inaprocStatus === 'blacklisted' || proj.sippStatus === 'bankrupt' || proj.sippStatus === 'disputed') {
        return { key: 'C', score: 0, reason: 'Terdeteksi sengketa hukum / blacklist LKPP / isu negatif media' };
      }
      if (ctx.businessAge < 2) return { key: 'B', score: 50, reason: `Debitur pemain baru (${ctx.businessAge} thn)` };
      return { key: 'A', score: 100, reason: 'Reputasi bisnis baik & nihil informasi negatif' };
    }
  },
  {
    id: 'c6_prospek_usaha',
    num: 6,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Prospek Usaha',
    desc: 'Kelayakan prospek sektor industri dan keunggulan kompetitif pangsa pasar captive debitur.',
    options: [
      { key: 'A', text: 'Prospek usaha diperkirakan positif, persaingan usaha sehat, pangsa pasar jelas (captive market), pemain utama dalam industri', score: 100 },
      { key: 'B', text: 'Prospek usaha diperkirakan stabil, persaingan ketat tapi masih merupakan pemain utama dalam industri', score: 60 },
      { key: 'C', text: 'Prospek usaha diperkirakan menurun, persaingan ketat dan bukan pemain utama', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const g = m ? m.revGrowth : 0;
      if (g >= 10) return { key: 'A', score: 100, reason: `Pertumbuhan omzet ekspansif (${g.toFixed(1)}% YoY)` };
      if (g >= 0) return { key: 'B', score: 60, reason: `Pertumbuhan stabil (${g.toFixed(1)}% YoY)` };
      return { key: 'C', score: 30, reason: `Pertumbuhan pendapatan terkontraksi (${g.toFixed(1)}% YoY)` };
    }
  },
  {
    id: 'c7_ketersediaan_lapkeu',
    num: 7,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Ketersediaan Laporan Keuangan',
    desc: 'Tingkat akuntabilitas dan audit laporan keuangan yang diserahkan debitur.',
    options: [
      { key: 'A', text: 'Tersedia laporan keuangan audited', score: 100 },
      { key: 'B', text: 'Tersedianya laporan keuangan inhouse statement/Unaudited', score: 60 },
      { key: 'C', text: 'Tidak tersedia laporan keuangan', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.auditStatus === 'unaudited' || proj.auditStatus === 'inhouse') return { key: 'B', score: 60, reason: 'Laporan keuangan inhouse/unaudited' };
      if (!m || !m.hasFinancials) return { key: 'C', score: 30, reason: 'Tidak tersedia laporan keuangan' };
      return { key: 'A', score: 100, reason: 'Tersedia laporan keuangan audited KAP' };
    }
  },
  {
    id: 'c8_klasifikasi_grup',
    num: 8,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Klasifikasi kelompok perusahaan/group',
    desc: 'Keterikatan fasilitas (One Debtor) atau grup kepemilikan konglomerasi (One Obligor).',
    options: [
      { key: 'A', text: 'Perusahaan tidak masuk kategori one debtor dan one obligor', score: 100 },
      { key: 'B', text: 'Perusahaan masuk kategori one debtor', score: 60 },
      { key: 'C', text: 'Perusahaan masuk kategori one obligor', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.groupCategory === 'one_obligor') return { key: 'C', score: 30, reason: 'Masuk kategori One Obligor' };
      if (proj.groupCategory === 'one_debtor') return { key: 'B', score: 60, reason: 'Masuk kategori One Debtor' };
      return { key: 'A', score: 100, reason: 'Independen (Bukan One Debtor / One Obligor)' };
    }
  },
  {
    id: 'c9_status_perusahaan',
    num: 9,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Status Perusahaan',
    desc: 'Status kepemilikan publik (Go Public) dan peringkat rating eksternal (Pefindo/Fitch dsb).',
    options: [
      { key: 'A', text: 'Perusahaan telah Go Public, memiliki rating eksternal predikat baik (Grade AAA sampai C)', score: 100 },
      { key: 'B', text: 'Perusahaan belum Go Public namun memiliki rating eksternal predikat baik (Grade AAA sampai C)', score: 80 },
      { key: 'C', text: 'Perusahaan belum Go Public namun tidak ada informasi rating eksternal', score: 60 },
      { key: 'D', text: 'Perusahaan telah Go Public dan memiliki rating eksternal predikat buruk (Grade D)', score: 40 },
      { key: 'E', text: 'Perusahaan belum Go Public namun memiliki rating eksternal predikat buruk (Grade D)', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.companyStatus === 'go_public_good') return { key: 'A', score: 100, reason: 'Go Public dengan rating eksternal baik' };
      if (proj.companyStatus === 'non_public_good') return { key: 'B', score: 80, reason: 'Non Go Public dengan rating eksternal baik' };
      if (proj.companyStatus === 'go_public_bad') return { key: 'D', score: 40, reason: 'Go Public rating eksternal buruk (Grade D)' };
      if (proj.companyStatus === 'non_public_bad') return { key: 'E', score: 20, reason: 'Non Go Public rating eksternal buruk (Grade D)' };
      return { key: 'C', score: 60, reason: 'Non Go Public, belum ada rating eksternal' };
    }
  },
  {
    id: 'c10_kinerja_kredit',
    num: 10,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Kinerja Fasilitas kredit eksisting di calon tertanggung maupun di bank lain',
    desc: 'Riwayat kolektibilitas dan tunggakan fasilitas kredit di perbankan nasional (SLIK OJK).',
    options: [
      { key: 'A', text: 'Kinerja Baik (Tidak pernah menunggak selama 2 tahun terakhir)', score: 100 },
      { key: 'B', text: 'Tidak ada fasilitas kredit eksisting', score: 50 },
      { key: 'C', text: 'Kinerja kurang/tidak baik (Pernah menunggak selama 2 tahun terakhir)', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.slikStatus === 'kol3_5' || proj.defaultHistory === 'defaulted' || proj.slikStatus === 'kol2') {
        return { key: 'C', score: 0, reason: `SLIK OJK ${proj.slikStatus || 'Pernah Menunggak'}` };
      }
      if (proj.slikStatus === 'no_facility') return { key: 'B', score: 50, reason: 'Belum ada fasilitas pinjaman perbankan' };
      return { key: 'A', score: 100, reason: 'Kolektibilitas 1 Lancar (SLIK OJK Bersih)' };
    }
  },
  {
    id: 'c11_pengalaman_sejenis',
    num: 11,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.020,
    name: 'Pengalaman/Lama Perusahaan beroperasi di Bidang Sejenis',
    desc: 'Lama operasional perusahaan di sektor industri yang dibiayai.',
    options: [
      { key: 'A', text: 'Pengalaman > 5 tahun', score: 100 },
      { key: 'B', text: 'Pengalaman > 2 tahun s/d 5 tahun', score: 75 },
      { key: 'C', text: 'Pengalaman > 1 tahun s/d 2 tahun', score: 50 },
      { key: 'D', text: 'Pengalaman <= 1 tahun atau tidak terinformasi', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const age = ctx.businessAge;
      if (age > 5) return { key: 'A', score: 100, reason: `Lama berdiri ${age} tahun (>5 thn)` };
      if (age > 2) return { key: 'B', score: 75, reason: `Lama berdiri ${age} tahun (2-5 thn)` };
      if (age > 1) return { key: 'C', score: 50, reason: `Lama berdiri ${age} tahun (1-2 thn)` };
      return { key: 'D', score: 25, reason: `Usaha rintisan/baru (${age} thn)` };
    }
  },
  {
    id: 'c12_pengalaman_lain',
    num: 12,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Pengalaman di bidang usaha lain',
    desc: 'Kesesuaian dan dukungan diversifikasi portofolio usaha debitur.',
    options: [
      { key: 'A', text: 'Ya sesuai/mendukung dengan usahanya', score: 100 },
      { key: 'B', text: 'Ya tapi tidak sesuai/mendukung dengan usahanya', score: 50 },
      { key: 'C', text: 'Tidak', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.otherBizExperience === 'unrelated') return { key: 'B', score: 50, reason: 'Pengalaman bidang lain kurang mendukung' };
      if (proj.otherBizExperience === 'none') return { key: 'C', score: 0, reason: 'Tidak ada diversifikasi bidang lain' };
      return { key: 'A', score: 100, reason: 'Memiliki ekosistem usaha selaras' };
    }
  },
  {
    id: 'c13_pengalaman_pengurus',
    num: 13,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.020,
    name: 'Pengalaman Pengurus Perusahaan',
    desc: 'Proporsi jajaran direksi/manajemen yang menekuni bisnis lebih dari 2 tahun.',
    options: [
      { key: 'A', text: 'Seluruh pengurus memiliki pengalaman dalam menjalankan bisnis', score: 100 },
      { key: 'B', text: '> 50% pengurus memiliki pengalaman dalam menjalankan bisnis', score: 80 },
      { key: 'C', text: '50% pengurus memiliki pengalaman dalam menjalankan bisnis', score: 60 },
      { key: 'D', text: '< 50% pengurus memiliki pengalaman dalam menjalankan bisnis', score: 40 },
      { key: 'E', text: 'Seluruh pengurus tidak memiliki pengalaman dalam menjalankan bisnis atau tidak terinformasi', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.mgmtExperience === 'gt50') return { key: 'B', score: 80, reason: '> 50% pengurus berpengalaman' };
      if (proj.mgmtExperience === 'eq50') return { key: 'C', score: 60, reason: '50% pengurus berpengalaman' };
      if (proj.mgmtExperience === 'lt50') return { key: 'D', score: 40, reason: '< 50% pengurus berpengalaman' };
      if (proj.mgmtExperience === 'none') return { key: 'E', score: 20, reason: 'Pengurus belum berpengalaman' };
      if (ctx.businessAge >= 5) return { key: 'A', score: 100, reason: 'Seluruh pengurus berpengalaman (>5 thn operasional)' };
      if (ctx.businessAge >= 2) return { key: 'B', score: 80, reason: '> 50% pengurus berpengalaman di industri' };
      return { key: 'C', score: 60, reason: '50% pengurus berpengalaman di industri' };
    }
  },
  {
    id: 'c14_rating_eksternal_award',
    num: 14,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Rating dari pihak eksternal/Penghargaan yang pernah didapat',
    desc: 'Penghargaan industri atau sertifikasi kredibilitas pihak ketiga.',
    options: [
      { key: 'A', text: 'Ada', score: 100 },
      { key: 'B', text: 'Tidak terinformasi', score: 60 },
      { key: 'C', text: 'Tidak ada', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.externalRatingAward === 'has_award') return { key: 'A', score: 100, reason: 'Terdapat sertifikasi / penghargaan' };
      if (proj.externalRatingAward === 'none') return { key: 'C', score: 30, reason: 'Tidak ada catatan penghargaan' };
      return { key: 'B', score: 60, reason: 'Belum terinformasi sertifikasi eksternal' };
    }
  },
  {
    id: 'c15_latar_belakang_hukum',
    num: 15,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Latar Belakang pengurus perusahaan? (terkait politik/kasus hukum)',
    desc: 'Integritas hukum jajaran manajemen dari perkara pidana/perdata atau keterkaitan politis berisiko.',
    options: [
      { key: 'A', text: 'Tidak', score: 100 },
      { key: 'B', text: 'Ya', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.sippStatus === 'disputed' || proj.sippStatus === 'bankrupt' || proj.negativeNews === 'negative') {
        return { key: 'B', score: 0, reason: 'Terindikasi sengketa hukum di SIPP / berita negatif media' };
      }
      return { key: 'A', score: 100, reason: 'Nihil keterlibatan kasus hukum (SIPP MA Bersih)' };
    }
  },
  {
    id: 'c16_kepengurusan_saham',
    num: 16,
    category: 'character',
    categoryLabel: '1. Character',
    weight: 0.010,
    name: 'Kepengurusan Pemegang Saham',
    desc: 'Stabilitas kepengurusan manajemen dan susunan pemegang saham dalam 1 tahun terakhir.',
    options: [
      { key: 'A', text: 'Tidak ada pergantian posisi penting perusahaan (susunan pengurus/pemegang saham) dalam waktu 1 tahun', score: 100 },
      { key: 'B', text: 'Terdapat pergantian posisi penting perusahaan namun tidak mempengaruhi kinerja manajemen karena telah diinformasikan dan diantisipasi dengan baik', score: 80 },
      { key: 'C', text: 'Terdapat pergantian posisi penting perusahaan, mempengaruhi kinerja manajemen, telah diinformasikan namun belum diantisipasi dengan baik', score: 60 },
      { key: 'D', text: 'Terdapat pergantian posisi penting perusahaan namun tidak ada informasi/antisipasi', score: 40 },
      { key: 'E', text: 'Terjadi beberapa kali pergantian posisi perusahaan atau adanya konflik dalam waktu 1 tahun', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.shareholderChange === 'changed_smooth') return { key: 'B', score: 80, reason: 'Pergantian pengurus terantisipasi baik' };
      if (proj.shareholderChange === 'changed_disrupted') return { key: 'C', score: 60, reason: 'Pergantian pengurus mengganggu stabilitas' };
      if (proj.shareholderChange === 'changed_no_info') return { key: 'D', score: 40, reason: 'Pergantian pengurus tanpa informasi memadai' };
      if (proj.shareholderChange === 'conflict') return { key: 'E', score: 20, reason: 'Terjadi konflik antar pemegang saham' };
      return { key: 'A', score: 100, reason: 'Kepengurusan dan pemegang saham stabil dalam 1 tahun' };
    }
  },

  // --- 2. CAPACITY (4 Parameters, Bobot 30.8% = 0.308) ---
  {
    id: 'cap25_arto_vs_apto',
    num: 17,
    category: 'capacity',
    categoryLabel: '2. Capacity',
    weight: 0.080,
    name: 'Account Receivable Turnover (ARTO) terhadap Account Payable Turnover (APTO)',
    desc: 'Kecepatan koleksi piutang usaha (DOR) dibandingkan tempo pelunasan hutang dagang supplier (DOP).',
    options: [
      { key: 'A', text: 'ARTO < APTO (Perputaran Piutang Lebih Lancar dari Hutang / DOR < DOP)', score: 100 },
      { key: 'B', text: 'ARTO = APTO (Perputaran Piutang Seimbang dengan Hutang / DOR = DOP)', score: 60 },
      { key: 'C', text: 'ARTO > APTO (Perputaran Piutang Lebih Lambat dari Hutang / DOR > DOP)', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const dor = m ? (m.dor23_365 || 0) : 30;
      const dop = m ? (m.dop23_365 || 0) : 30;
      if (dor < dop - 3) return { key: 'A', score: 100, reason: `Koleksi Piutang (${dor.toFixed(0)} hr) lebih lancar dari Hutang (${dop.toFixed(0)} hr)` };
      if (Math.abs(dor - dop) <= 3) return { key: 'B', score: 60, reason: `Piutang (${dor.toFixed(0)} hr) seimbang dengan Hutang (${dop.toFixed(0)} hr)` };
      return { key: 'C', score: 30, reason: `Piutang (${dor.toFixed(0)} hr) lebih lambat dari jatuh tempo Hutang (${dop.toFixed(0)} hr)` };
    }
  },
  {
    id: 'cap26_self_financing',
    num: 18,
    category: 'capacity',
    categoryLabel: '2. Capacity',
    weight: 0.010,
    name: 'Self Financing, Modal Internal',
    desc: 'Kekuatan penyertaan modal internal pemegang saham terhadap total aktiva (Ekuitas / Total Aset).',
    options: [
      { key: 'A', text: '> 20%', score: 100 },
      { key: 'B', text: '>= 15% s/d < 20%', score: 80 },
      { key: 'C', text: '>= 10% s/d < 15%', score: 60 },
      { key: 'D', text: '>= 5% s/d < 10%', score: 40 },
      { key: 'E', text: '< 5%', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const sfPct = ctx.selfFinPct;
      if (sfPct > 20) return { key: 'A', score: 100, reason: `Modal Internal ${sfPct.toFixed(1)}% (>20%)` };
      if (sfPct >= 15) return { key: 'B', score: 80, reason: `Modal Internal ${sfPct.toFixed(1)}% (15%-20%)` };
      if (sfPct >= 10) return { key: 'C', score: 60, reason: `Modal Internal ${sfPct.toFixed(1)}% (10%-15%)` };
      if (sfPct >= 5) return { key: 'D', score: 40, reason: `Modal Internal ${sfPct.toFixed(1)}% (5%-10%)` };
      return { key: 'E', score: 20, reason: `Modal Internal ${sfPct.toFixed(1)}% (<5%)` };
    }
  },
  {
    id: 'cap27_kondisi_keuangan',
    num: 19,
    category: 'capacity',
    categoryLabel: '2. Capacity',
    weight: 0.010,
    name: 'Kondisi Keuangan',
    desc: 'Stabilitas kesehatan keuangan menyeluruh berbasis profitabilitas dan kecukupan modal kerja riil.',
    options: [
      { key: 'A', text: 'kondisi keuangan positif', score: 100 },
      { key: 'B', text: 'kondisi keuangan stabil', score: 60 },
      { key: 'C', text: 'kondisi keuangan melemah', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const netInc = (f23.eat || f23.netInc || 0);
      const nwc = ctx.nwcVal;
      if (netInc > 0 && nwc > 0 && (!m || !m.isNWCDeficit)) return { key: 'A', score: 100, reason: 'Laba operasional positif & NWC memadai' };
      if (netInc >= 0) return { key: 'B', score: 60, reason: 'Kondisi keuangan stabil (impas/margin tipis)' };
      return { key: 'C', score: 30, reason: 'Rugi operasional atau defisit modal kerja' };
    }
  },
  {
    id: 'cap28_profit_proyek',
    num: 20,
    category: 'capacity',
    categoryLabel: '2. Capacity',
    weight: 0.100,
    name: 'Apakah proyek/bisnis yg akan dibiayai menghasilkan profit?',
    desc: 'Kapasitas laba proyek menutup seluruh biaya operasional, bunga, dan pokok angsuran bank (DSCR >= 1.0x).',
    options: [
      { key: 'A', text: 'Ya (Profit menutup seluruh biaya operasional, bunga dan angsuran bank)', score: 100 },
      { key: 'B', text: 'Tidak', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.annualDSCR >= 1.0 && (f23.eat || f23.netInc || 0) >= 0) return { key: 'A', score: 100, reason: `DSCR ${ctx.annualDSCR.toFixed(2)}x (>=1.0x)` };
      if (ctx.f23Ebit > ctx.f23Int) return { key: 'A', score: 100, reason: 'EBIT menutup beban bunga' };
      return { key: 'B', score: 0, reason: `DSCR ${ctx.annualDSCR.toFixed(2)}x (<1.0x / defisit)` };
    }
  },

  // --- 3. CAPABILITY (3 Parameters, Bobot 9.2% = 0.092) ---
  {
    id: 'cap29_tenaga_profesional',
    num: 21,
    category: 'capability',
    categoryLabel: '3. Capability',
    weight: 0.020,
    name: 'Kondisi tenaga profesional dalam manajemen perusahaan dan pekerja yang berpengalaman',
    desc: 'Kompetensi tenaga profesional dan keahlian tenaga kerja (pengalaman minimal 2 tahun di bidang sejenis).',
    options: [
      { key: 'A', text: 'Sangat Baik', score: 100 },
      { key: 'B', text: 'Baik', score: 80 },
      { key: 'C', text: 'Cukup baik', score: 60 },
      { key: 'D', text: 'Kurang baik', score: 40 },
      { key: 'E', text: 'tidak baik', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.mgmtCapability === 'A') return { key: 'A', score: 100, reason: 'Tenaga ahli sangat kompeten' };
      if (proj.mgmtCapability === 'B') return { key: 'B', score: 80, reason: 'Tenaga ahli memadai' };
      if (proj.mgmtCapability === 'C') return { key: 'C', score: 60, reason: 'Tenaga kerja cukup baik' };
      if (proj.mgmtCapability === 'D') return { key: 'D', score: 40, reason: 'Tenaga kerja kurang baik' };
      if (proj.mgmtCapability === 'E') return { key: 'E', score: 20, reason: 'Tenaga kerja tidak baik' };
      if (ctx.businessAge >= 5) return { key: 'A', score: 100, reason: `Tenaga ahli teruji matang (${ctx.businessAge} thn)` };
      if (ctx.businessAge >= 3) return { key: 'B', score: 80, reason: `Tenaga ahli berpengalaman (${ctx.businessAge} thn)` };
      return { key: 'C', score: 60, reason: 'Tenaga kerja memenuhi standar dasar' };
    }
  },
  {
    id: 'cap30_dukungan_supplier',
    num: 22,
    category: 'capability',
    categoryLabel: '3. Capability',
    weight: 0.020,
    name: 'Bagaimana dukungan suplier dan ketersediaan bahan baku?',
    desc: 'Kepastian pasokan bahan baku dari supplier tetap dan kemudahan pemenuhan persediaan.',
    options: [
      { key: 'A', text: 'Baik (Memiliki supplier tetap / kontrak dan bahan baku mudah didapatkan)', score: 100 },
      { key: 'B', text: 'Kurang baik', score: 50 },
      { key: 'C', text: 'tidak baik', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.supplierSupport === 'bad') return { key: 'C', score: 0, reason: 'Rantai pasok terhambat' };
      if (proj.supplierSupport === 'fair') return { key: 'B', score: 50, reason: 'Dukungan supplier terbatas' };
      return { key: 'A', score: 100, reason: 'Kontrak supplier tetap & pasokan aman' };
    }
  },
  {
    id: 'cap31_volume_transaksi_2thn',
    num: 23,
    category: 'capability',
    categoryLabel: '3. Capability',
    weight: 0.020,
    name: 'Jumlah transaksi bisnis (volume) yang telah dijalankan atau Jumlah Proyek dalam 2 tahun terakhir',
    desc: 'Volume transaksi bisnis riil atau jumlah kontrak kerja/proyek yang diselesaikan dalam 2 tahun.',
    options: [
      { key: 'A', text: '> 5 Transaksi Bisnis/Proyek', score: 100 },
      { key: 'B', text: '4 s/d 5 Transaksi Bisnis/Proyek', score: 75 },
      { key: 'C', text: '3 s/d 4 Transaksi Bisnis/Proyek', score: 50 },
      { key: 'D', text: '< 2 Transaksi Bisnis/Proyek', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const vol = typeof proj.completedProjectsCount === 'number' ? proj.completedProjectsCount : 6;
      if (vol > 5) return { key: 'A', score: 100, reason: `Menyelesaikan > 5 proyek/transaksi (${vol})` };
      if (vol >= 4) return { key: 'B', score: 75, reason: `Menyelesaikan 4-5 proyek/transaksi` };
      if (vol >= 3) return { key: 'C', score: 50, reason: `Menyelesaikan 3-4 proyek/transaksi` };
      return { key: 'D', score: 25, reason: `Menyelesaikan < 2 proyek/transaksi` };
    }
  },

  // --- 4. CONDITION (8 Parameters, Bobot 13.8% = 0.138) ---
  {
    id: 'cnd32_kelangsungan_usaha',
    num: 24,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.010,
    name: 'Kelangsungan Usaha',
    desc: 'Stabilitas kelangsungan operasional dan ketiadaan friksi ketenagakerjaan.',
    options: [
      { key: 'A', text: 'Customer tidak memiliki masalah operasional serius dan tidak memiliki permasalahan tenaga kerja.', score: 100 },
      { key: 'B', text: 'Customer memiliki masalah operasional namun dapat terselesaikan sebelum masa pembiayaan berakhir', score: 60 },
      { key: 'C', text: 'Customer memiliki masalah operasional dan diperkirakan tidak dapat terselesaikan sebelum masa pembiayaan berakhir', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.sippStatus === 'bankrupt') return { key: 'C', score: 30, reason: 'Menghadapi permohonan kepailitan/PKPU' };
      if (proj.negativeNews === 'negative') return { key: 'B', score: 60, reason: 'Isu operasional tersorot di media publik' };
      return { key: 'A', score: 100, reason: 'Operasional lancar tanpa kendala tenaga kerja' };
    }
  },
  {
    id: 'cnd33_strategi_jangka_panjang',
    num: 25,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.010,
    name: 'Strategi Jangka Panjang',
    desc: 'Keberadaan rencana kerja strategis (Pemasaran, Produksi, Keuangan).',
    options: [
      { key: 'A', text: 'Memiliki Strategi Jangka Panjang untuk semua Divisi (Pemasaran, Produksi, Keuangan, dan sebagainya)', score: 100 },
      { key: 'B', text: 'Memiliki Strategi Jangka Panjang secara umum', score: 60 },
      { key: 'C', text: 'Belum memiliki Strategi Jangka Panjang', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.businessAge >= 5) return { key: 'A', score: 100, reason: 'Strategi jangka panjang terstruktur komprehensif' };
      if (ctx.businessAge >= 2) return { key: 'B', score: 60, reason: 'Strategi bisnis umum memadai' };
      return { key: 'C', score: 30, reason: 'Rintisan awal belum memiliki road map formal' };
    }
  },
  {
    id: 'cnd34_pengawasan_bisnis',
    num: 26,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.010,
    name: 'Pengawasan dan Pengendalian Bisnis',
    desc: 'Sistem monitoring pengendalian internal dan keterandalan informasi manajemen.',
    options: [
      { key: 'A', text: 'Debitur Tertanggung memiliki sistem pengendalian/monitoring yang up-to-date, relevan dan rinci untuk seluruh area bisnis', score: 100 },
      { key: 'B', text: 'Debitur Tertanggung memiliki sistem pengendalian handal namun ketersediaan informasi penting sering terlambat', score: 60 },
      { key: 'C', text: 'Debitur Tertanggung tidak memiliki sistem pengendalian/monitoring yang handal', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (m && m.hasFinancials && proj.auditStatus !== 'unaudited') return { key: 'A', score: 100, reason: 'Sistem pengawasan terverifikasi KAP audited' };
      return { key: 'B', score: 60, reason: 'Sistem pengendalian internal standar' };
    }
  },
  {
    id: 'cnd35_perkembangan_usaha',
    num: 27,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.010,
    name: 'Perkembangan Usaha (jika ada cash flow projection selama 3 tahun kedepan/sesuai jangka waktu kredit)',
    desc: 'Arah tren pertumbuhan penjualan dan arus kas kedepan selama masa kredit.',
    options: [
      { key: 'A', text: 'Proyeksi pendapatan/penjualan mengalami peningkatan tiap tahunnya', score: 100 },
      { key: 'B', text: 'Proyeksi pendapatan/penjualan cenderung fluktuatif', score: 60 },
      { key: 'C', text: 'Proyeksi pendapatan/penjualan cenderung menurun', score: 30 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const g = m ? m.revGrowth : 0;
      if (g >= 5) return { key: 'A', score: 100, reason: `Tren omzet tumbuh positif (${g.toFixed(1)}% YoY)` };
      if (g >= -5) return { key: 'B', score: 60, reason: `Tren omzet fluktuatif (${g.toFixed(1)}% YoY)` };
      return { key: 'C', score: 30, reason: `Tren omzet terkontraksi (${g.toFixed(1)}% YoY)` };
    }
  },
  {
    id: 'cnd36_segmen_pasar',
    num: 28,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.010,
    name: 'Segmen Pasar (khusus sektor perdagangan)',
    desc: 'Tingkat kesesuaian target segmen pasar konsumen dengan varian produk debitur.',
    options: [
      { key: 'A', text: 'Segmen yang menjadi sasaran sangat sesuai dengan produk yang dijual', score: 100 },
      { key: 'B', text: 'Segmen yang menjadi sasaran sesuai dengan produk yang dijual', score: 80 },
      { key: 'C', text: 'Segmen yang menjadi sasaran cukup sesuai dengan produk yang dijual', score: 60 },
      { key: 'D', text: 'Segmen yang menjadi sasaran kurang sesuai dengan produk yang dijual', score: 40 },
      { key: 'E', text: 'Segmen yang menjadi sasaran tidak sesuai dengan produk yang dijual', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      return { key: 'A', score: 100, reason: 'Segmen pasar sangat sesuai dengan produk yang dijual' };
    }
  },
  {
    id: 'cnd37_kredit_take_over',
    num: 29,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.020,
    name: 'Apakah Kredit yang akan diasuransikan merupakan kredit take over',
    desc: 'Identifikasi apakah fasilitas kredit merupakan take over dari bank lain atau fasilitas kredit baru.',
    options: [
      { key: 'A', text: 'Ya', score: 100 },
      { key: 'B', text: 'Bukan/Kredit Baru', score: 50 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.isTakeOverCredit === true || proj.isTakeOverCredit === 'true') {
        return { key: 'A', score: 100, reason: 'Fasilitas Kredit Take Over' };
      }
      return { key: 'B', score: 50, reason: 'Fasilitas Kredit Baru' };
    }
  },
  {
    id: 'cnd38_npl_sektor_ojk',
    num: 30,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.010,
    name: 'NPL Sektor Kredit berdasarkan OJK',
    desc: 'Tingkat rasio kredit bermasalah (Non-Performing Loan) industri berdasarkan statistik resmi OJK.',
    options: [
      { key: 'A', text: '0% s/d <= 2%', score: 100 },
      { key: 'B', text: '> 2% s/d <= 3%', score: 75 },
      { key: 'C', text: '> 3% s/d <= 4.5%', score: 50 },
      { key: 'D', text: '> 4.5%', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const npl = typeof proj.sectorNpl === 'number' ? proj.sectorNpl : 2.4;
      if (npl <= 2.0) return { key: 'A', score: 100, reason: `NPL Sektor ${npl.toFixed(1)}% (<=2%)` };
      if (npl <= 3.0) return { key: 'B', score: 75, reason: `NPL Sektor ${npl.toFixed(1)}% (2%-3%)` };
      if (npl <= 4.5) return { key: 'C', score: 50, reason: `NPL Sektor ${npl.toFixed(1)}% (3%-4.5%)` };
      return { key: 'D', score: 25, reason: `NPL Sektor ${npl.toFixed(1)}% (>4.5%)` };
    }
  },
  {
    id: 'cnd39_pangsa_pasar',
    num: 31,
    category: 'condition',
    categoryLabel: '4. Condition',
    weight: 0.010,
    name: 'Pangsa (konsumen) dan persaingan pasar (khusus sektor perdagangan)',
    desc: 'Cakupan jangkauan wilayah distribusi dan penetrasi pasar konsumen debitur.',
    options: [
      { key: 'A', text: 'Pangsa dan persaingan meliputi kawasan internasional (ekspor), nasional, kepulauan lokasi usaha, sekitar lokasi usaha', score: 100 },
      { key: 'B', text: 'Pangsa dan persaingan meliputi kawasan nasional, kepulauan lokasi usaha, sekitar lokasi usaha', score: 80 },
      { key: 'C', text: 'Pangsa dan persaingan meliputi kawasan kepulauan lokasi usaha, dan sekitar lokasi usaha', score: 60 },
      { key: 'D', text: 'Pangsa dan persaingan meliputi kawasan khusus di sekitar lokasi usaha', score: 40 },
      { key: 'E', text: 'Pangsa dan persaingan belum ada', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.isImport) return { key: 'A', score: 100, reason: 'Pangsa pasar internasional (impor) & nasional' };
      if (proj.procurementMethod === 'domestic') return { key: 'B', score: 80, reason: 'Pangsa pasar nasional & regional' };
      return { key: 'C', score: 60, reason: 'Pangsa pasar wilayah kepulauan / domisili' };
    }
  },

  // --- 5. COLLATERAL (8 Parameters, Bobot 15.4% = 0.154) ---
  {
    id: 'col40_rasio_agunan',
    num: 32,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.010,
    name: 'Rasio Agunan Keseluruhan (Fixed asset dan Non Fixed Asset) Dibandingkan Nilai Kredit',
    desc: 'Coverage total agunan pokok dan jaminan tambahan terhadap total plafond kredit.',
    options: [
      { key: 'A', text: 'Rasio agunan > 100', score: 100 },
      { key: 'B', text: '75 < Rasio Agunan <= 100', score: 80 },
      { key: 'C', text: '50 < Rasio Agunan <= 75', score: 60 },
      { key: 'D', text: '25 < Rasio Agunan <= 50', score: 40 },
      { key: 'E', text: 'Rasio Agunan <= 25 %', score: 20 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const totRatio = ctx.invRatio + ctx.faRatio;
      if (totRatio > 100) return { key: 'A', score: 100, reason: `Total Coverage ${totRatio.toFixed(0)}% (>100%)` };
      if (totRatio > 75) return { key: 'B', score: 80, reason: `Total Coverage ${totRatio.toFixed(0)}% (75%-100%)` };
      if (totRatio > 50) return { key: 'C', score: 60, reason: `Total Coverage ${totRatio.toFixed(0)}% (50%-75%)` };
      if (totRatio > 25) return { key: 'D', score: 40, reason: `Total Coverage ${totRatio.toFixed(0)}% (25%-50%)` };
      return { key: 'E', score: 20, reason: `Total Coverage ${totRatio.toFixed(0)}% (<=25%)` };
    }
  },
  {
    id: 'col41_sop_agunan',
    num: 33,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.020,
    name: 'Nilai Jaminan sesuai dengan ketentuan minimum SOP',
    desc: 'Kesesuaian nilai jaminan terhadap ambang batas batas minimal ketentuan SOP penjaminan.',
    options: [
      { key: 'A', text: 'Ya', score: 100 },
      { key: 'B', text: 'tidak ada', score: 50 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const totRatio = ctx.invRatio + ctx.faRatio;
      if (totRatio >= 70 || ctx.faRatio >= 50) return { key: 'A', score: 100, reason: 'Memenuhi batas minimum SOP agunan Askrindo' };
      return { key: 'B', score: 50, reason: 'Di bawah batas minimum SOP agunan' };
    }
  },
  {
    id: 'col42_laporan_appraisal',
    num: 34,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.004,
    name: 'Laporan Penilaian Agunan',
    desc: 'Ketersediaan Laporan Penilaian KJPP independen dan masa berlaku penilaian agunan.',
    options: [
      { key: 'A', text: 'Telah tersedia Laporan Appraisal dan memiliki nilai pasar yang wajar atau Agunan bukan berupa fixed asset', score: 100 },
      { key: 'B', text: 'Telah tersedia Laporan Appraisal dan terdapat adjustment', score: 75 },
      { key: 'C', text: 'Telah tersedia Laporan Appraisal namun penilaiannya lebih dari 6 bulan', score: 50 },
      { key: 'D', text: 'Tidak tersedia Laporan Appraisal', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.collateralAppraisalStatus === 'B') return { key: 'B', score: 75, reason: 'Appraisal terdapat adjustment nilai pasar' };
      if (proj.collateralAppraisalStatus === 'C') return { key: 'C', score: 50, reason: 'Appraisal kadaluarsa (>6 bulan)' };
      if (proj.collateralAppraisalStatus === 'D') return { key: 'D', score: 25, reason: 'Tidak tersedia appraisal KJPP' };
      return { key: 'A', score: 100, reason: 'Tersedia Laporan Appraisal KJPP wajar / Agunan lancar' };
    }
  },
  {
    id: 'col43_kemudahan_likuiditas',
    num: 35,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.004,
    name: 'Kemudahan Likuiditas, disesuaikan dengan jenis agunan dan lokasi agunan',
    desc: 'Marketabilitas agunan dan kemudahan konversi jaminan menjadi likuiditas tunai.',
    options: [
      { key: 'A', text: 'Ya', score: 100 },
      { key: 'B', text: 'Tidak ada', score: 50 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.inv > 0 || ctx.fa > 0) return { key: 'A', score: 100, reason: 'Agunan marketable dan mudah dilikuidasi' };
      return { key: 'B', score: 50, reason: 'Likuiditas jaminan rendah' };
    }
  },
  {
    id: 'col44_pengikatan_agunan',
    num: 36,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.004,
    name: 'Pengikatan Agunan sempurna sesuai ketentuan',
    desc: 'Legalitas pengikatan yuridis agunan secara sempurna (Hak Tanggungan Peringkat I / Fidusia Notariil terdaftar Kemenkumham).',
    options: [
      { key: 'A', text: 'Ya', score: 100 },
      { key: 'B', text: 'Tidak', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      return { key: 'A', score: 100, reason: 'Pengikatan notariil sempurna sesuai ketentuan' };
    }
  },
  {
    id: 'col45_status_kepemilikan',
    num: 37,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.004,
    name: 'Status Kepemilikan',
    desc: 'Subjek hukum pemegang hak kepemilikan sertifikat/dokumen agunan.',
    options: [
      { key: 'A', text: 'Sertifikat/dokumen kepemilikan atas nama Debitur Tertanggung', score: 100 },
      { key: 'B', text: 'Sertifikat/dokumen atas nama pengurus/pemegang saham dari Debitur Tertanggung', score: 75 },
      { key: 'C', text: 'Sertifikat/dokumen atas nama pihak lain dalam proses balik nama (covernote notaris)', score: 50 },
      { key: 'D', text: 'Sertifikat/dokumen atas nama orang lain', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.collateralOwnershipStatus === 'B') return { key: 'B', score: 75, reason: 'Atas nama pengurus/pemegang saham' };
      if (proj.collateralOwnershipStatus === 'C') return { key: 'C', score: 50, reason: 'Dalam proses balik nama notaris' };
      if (proj.collateralOwnershipStatus === 'D') return { key: 'D', score: 25, reason: 'Atas nama pihak lain' };
      return { key: 'A', score: 100, reason: 'Sertifikat sah atas nama Debitur Tertanggung' };
    }
  },
  {
    id: 'col46_keperluan_agunan_tambahan',
    num: 38,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.004,
    name: 'Keperluan Agunan Tambahan',
    desc: 'Kecukupan penyerahan fixed asset tambahan terhadap mitigasi risiko penjaminan kredit.',
    options: [
      { key: 'A', text: 'Memberikan agunan tambahan dengan nilai yang melebihi keperluan, atau memberikan agunan tambahan pada kondisi dimana sebenarnya tidak memerlukan agunan tambahan', score: 100 },
      { key: 'B', text: 'Memberikan agunan tambahan dengan nilai yang mencukupi keperluan, atau tidak memberikan agunan tambahan pada kondisi dimana tidak memerlukan agunan tambahan', score: 75 },
      { key: 'C', text: 'Memberikan agunan tambahan namun nilainya tidak mencukupi keperluan', score: 50 },
      { key: 'D', text: 'Tidak memberikan agunan tambahan pada kasus yang memerlukan agunan tambahan', score: 25 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.faRatio >= 100) return { key: 'A', score: 100, reason: `Jaminan tambahan ${ctx.faRatio.toFixed(0)}% (melebihi keperluan)` };
      if (ctx.faRatio >= 50 || (ctx.invRatio + ctx.faRatio) >= 100) return { key: 'B', score: 75, reason: 'Jaminan tambahan mencukupi keperluan' };
      if (ctx.faRatio > 0) return { key: 'C', score: 50, reason: 'Jaminan tambahan di bawah nilai plafon' };
      return { key: 'D', score: 25, reason: 'Tidak ada jaminan tambahan' };
    }
  },
  {
    id: 'col47_dukungan_reasuransi',
    num: 39,
    category: 'collateral',
    categoryLabel: '5. Collateral',
    weight: 0.050,
    name: 'Apakah terdapat Dukungan Reasuransi (treaty/fakultatif)',
    desc: 'Ketersediaan retrofesi dan kapasitas treaty penjaminan reasuransi PT Askrindo.',
    options: [
      { key: 'A', text: 'Ya', score: 100 },
      { key: 'B', text: 'Tidak ada informasi', score: 50 },
      { key: 'C', text: 'Belum', score: 0 }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (proj.reinsuranceSupport === 'none') return { key: 'C', score: 0, reason: 'Belum ada dukungan reasuransi' };
      if (proj.reinsuranceSupport === 'no_info') return { key: 'B', score: 50, reason: 'Tidak ada informasi reasuransi' };
      return { key: 'A', score: 100, reason: 'Tersedia dukungan automatic treaty penjaminan Askrindo' };
    }
  }
];

function compute5CAnalysis(proj, f23 = {}, m = null) {
  ensureInaprocAutoChecked(proj);
  ensureGoogleNewsInitialized(proj);

  const curYr = proj.year2 || new Date().getFullYear();
  const estYr = proj.estYear || (curYr - 5);
  const businessAge = Math.max(0, curYr - estYr);

  // Financial ratios & context
  const gpm = m ? m.gpm23 : (f23.rev > 0 ? ((f23.rev - f23.cogs) / f23.rev) * 100 : 0);
  const f23Ebit = (f23.rev || 0) - (f23.cogs || 0) - (f23.opex || 0) + (f23.otherInc || 0) - (f23.otherExp || 0);
  const f23Int = f23.intExp || f23.finCost || (((f23.stDebt || 0) + (proj.requestedPlafond || 0)) * ((proj.interestRate || 10) / 100));
  const icr = (m && typeof m.icr23 === 'number') ? m.icr23 : (f23Int > 0 ? f23Ebit / f23Int : 1.5);
  const runwayDays = m ? m.pureCashRunwayDays : 30;

  const eq = (m && typeof m.eq23 === 'number') ? m.eq23 : ((f23.capital || 0) + (f23.otherCap || 0) + (f23.retEarn || 0) + (f23.re || 0));
  const tl = (m && typeof m.tl23 === 'number') ? m.tl23 : ((f23.ap || 0) + (f23.stDebt || 0) + (f23.otherAp || 0) + (f23.accrued || 0) + (f23.ltDebt || 0));
  const isZeroDebt = tl === 0 || (m && m.tl23 === 0) || (typeof m?.der23 === 'number' && m.der23 === 0);
  const der = isZeroDebt ? 0 : ((m && typeof m.der23 === 'number') ? m.der23 : (eq > 0 ? tl / eq : 99));
  const cr = (m && typeof m.currentRatio23 === 'number') ? m.currentRatio23 : ((f23.ca || 1) / Math.max(1, f23.cl || 1));
  const isNoDebtCL = (m && (m.currentRatio23 === null || m.isNoDebt23)) || (f23.cl === 0 || !f23.cl) || isZeroDebt;
  const nwcVal = (m && typeof m.nwc23 === 'number') ? m.nwc23 : ((f23.cash || 0) + (f23.ar || 0) + (f23.inv || 0) - (f23.ap || 0) - (f23.stDebt || 0));
  const reTotal = (f23.retEarn || 0) + (f23.re || 0);
  const reErosion = (m && typeof m.reErosionPct23 === 'number') ? m.reErosionPct23 : ((f23.capital > 0 && reTotal < 0) ? (Math.abs(reTotal) / f23.capital) * 100 : 0);

  const qrPct = (m && typeof m.quickRatio23 === 'number') ? m.quickRatio23 * 100 : (((f23.ca || 0) - (f23.inv || 0)) / Math.max(1, f23.cl || 1)) * 100;
  const cashRatioPct = ((f23.cash || 0) / Math.max(1, f23.cl || 1)) * 100;
  const roa = (m && typeof m.roa23 === 'number') ? m.roa23 : (((f23.eat || f23.netInc || 0) / Math.max(1, f23.ta || 1)) * 100);
  const roe = (m && typeof m.roe23 === 'number') ? m.roe23 : (((f23.eat || f23.netInc || 0) / Math.max(1, eq || 1)) * 100);
  const npm = (m && typeof m.npm23 === 'number') ? m.npm23 : (((f23.eat || f23.netInc || 0) / Math.max(1, f23.rev || 1)) * 100);
  const darPct = (tl / Math.max(1, f23.ta || (tl + eq))) * 100;
  const selfFinPct = (eq / Math.max(1, f23.ta || (tl + eq))) * 100;

  const hasCustomPrimary = typeof proj.collateralPrimaryVal === 'number' && proj.collateralPrimaryVal > 0;
  const hasCustomAdditional = typeof proj.collateralAdditionalVal === 'number' && proj.collateralAdditionalVal > 0;
  const inv = hasCustomPrimary ? proj.collateralPrimaryVal : (f23.inv || 0);
  const fa = hasCustomAdditional ? proj.collateralAdditionalVal : (f23.fa || 0);
  const reqPlafond = proj.requestedPlafond || 1;
  const invRatio = reqPlafond > 0 ? (inv / reqPlafond) * 100 : 0;
  const faRatio = reqPlafond > 0 ? (fa / reqPlafond) * 100 : 0;

  const primaryTypeLabel = proj.collateralPrimaryType || (hasCustomPrimary ? 'Agunan Pokok Terdaftar' : 'Persediaan Barang (Inventory)');
  const additionalTypeLabel = proj.collateralAdditionalType || (hasCustomAdditional ? 'Jaminan Tambahan Terdaftar' : 'Aktiva Tetap (Fixed Assets)');
  const primaryBinding = proj.collateralPrimaryBinding || (hasCustomPrimary ? 'Pengikatan Sesuai Ketentuan' : 'Fidusia Persediaan / Resi Gudang (CMA)');
  const additionalBinding = proj.collateralAdditionalBinding || (hasCustomAdditional ? 'Pengikatan Sesuai Ketentuan' : 'Hak Tanggungan (HT) Peringkat I');

  const isImport = isMaritimeOrImportRisk(proj);
  const cf = m?.cfProj || (typeof computeCashFlowProjection === 'function' ? computeCashFlowProjection(proj) : null);
  const annualDSCR = typeof cf?.annualDSCR === 'number' ? cf.annualDSCR : (f23Int > 0 ? f23Ebit / f23Int : 1.2);

  const evalContext = {
    businessAge,
    curYr,
    estYr,
    cr,
    qrPct,
    cashRatioPct,
    roa,
    roe,
    npm,
    der,
    darPct,
    selfFinPct,
    nwcVal,
    reErosion,
    isZeroDebt,
    isNoDebtCL,
    inv,
    fa,
    invRatio,
    faRatio,
    primaryTypeLabel,
    additionalTypeLabel,
    primaryBinding,
    additionalBinding,
    isImport,
    f23Ebit,
    f23Int,
    annualDSCR
  };

  const overrides = proj.fiveCOverrides || {};
  let totalScoreRaw = 0;
  const categorySums = {
    character: 0,
    capacity: 0,
    capability: 0,
    condition: 0,
    collateral: 0
  };
  const categoryWeights = {
    character: 0.20 / 0.65,
    capacity: 0.20 / 0.65,
    capability: 0.06 / 0.65,
    condition: 0.09 / 0.65,
    collateral: 0.10 / 0.65
  };

  const evaluatedParams = ASKRINDO_5C_CATALOG.map((p) => {
    // Normalisasi bobot agar 39 parameter 5C kualitatif berjumlah 100% (1.000)
    const normWeight = p.weight / 0.65;
    const autoRes = p.evalAuto(proj, m, f23, evalContext);
    const isOverridden = overrides[p.id] !== undefined && overrides[p.id] !== null && overrides[p.id] !== '';
    const chosenKey = isOverridden ? overrides[p.id] : autoRes.key;
    const opt = p.options.find((o) => o.key === chosenKey) || p.options[0];
    const score = opt.score;
    const weightedScore = Number((score * normWeight).toFixed(3));

    totalScoreRaw += score * normWeight;
    if (categorySums[p.category] !== undefined) {
      categorySums[p.category] += score * normWeight;
    }

    return {
      id: p.id,
      num: p.num,
      category: p.category,
      categoryLabel: p.categoryLabel,
      weight: normWeight,
      weightPct: Number((normWeight * 100).toFixed(1)),
      name: p.name,
      desc: p.desc,
      options: p.options,
      chosenKey,
      chosenText: opt.text,
      score,
      weightedScore,
      isOverridden,
      autoKey: autoRes.key,
      autoReason: autoRes.reason
    };
  });

  const totalScore = Math.max(0, Math.min(100, Math.round(totalScoreRaw)));
  const totalScore10 = Number(((totalScore / 100) * 10).toFixed(1));

  // Category scores normalized to 100
  const categoryScores = {
    character: Math.round(categorySums.character / categoryWeights.character),
    capacity: Math.round(categorySums.capacity / categoryWeights.capacity),
    capability: Math.round(categorySums.capability / categoryWeights.capability),
    condition: Math.round(categorySums.condition / categoryWeights.condition),
    collateral: Math.round(categorySums.collateral / categoryWeights.collateral)
  };

  const categoryWeighted = {
    character: Number(categorySums.character.toFixed(2)),
    capacity: Number(categorySums.capacity.toFixed(2)),
    capability: Number(categorySums.capability.toFixed(2)),
    condition: Number(categorySums.condition.toFixed(2)),
    collateral: Number(categorySums.collateral.toFixed(2))
  };

  // Populate legacy backward-compatible properties
  const charScore = categoryScores.character;
  const capitScore = 0;
  const capScore = categoryScores.capacity;
  const condScore = categoryScores.condition;
  const collScore = categoryScores.collateral;

  const charAgeNote = `Lama berdiri ${businessAge} tahun (${estYr}) - ${businessAge >= 5 ? 'Stabilitas operasional mapan' : 'Tahap pertumbuhan bisnis'}`;
  const defaultStatusText = proj.defaultHistory === 'defaulted' ? 'Pernah Wanprestasi / Gagal Bayar' : 'Belum Pernah Wanprestasi (Track Record Bersih)';
  const slikStatus = proj.slikStatus === 'kol3_5' ? 'Kolektibilitas 3-5 (Macet / NPL)' : (proj.slikStatus === 'kol2' ? 'Kolektibilitas 2 (Dalam Perhatian Khusus)' : 'Kolektibilitas 1 (Lancar)');
  const inaprocStatus = proj.inaprocStatus === 'blacklisted' ? 'Terdaftar Masuk Blacklist LKPP' : (proj.inaprocStatus === 'unverified' ? 'Belum Diverifikasi di INAPROC' : 'Bersih (Terverifikasi di Portal INAPROC LKPP)');
  const sippStatus = proj.sippStatus === 'bankrupt' ? 'Sedang Menghadapi Permohonan PKPU / Pailit' : (proj.sippStatus === 'disputed' ? 'Terdapat Perkara Gugatan Perdata' : 'Nihil Gugatan Wanprestasi / PKPU');
  const newsStatusText = proj.negativeNews === 'negative' ? 'Terdeteksi Berita Negatif di Media' : 'Nihil Berita Negatif di Media';

  const capNote = `Kapasitas Cash Flow (DSCR ${annualDSCR.toFixed(2)}x) & Perputaran Piutang-Hutang memadai.`;
  const capitNote = `Rasio Keuangan 35%: CR ${cr.toFixed(2)}x, DER ${(der * 100).toFixed(0)}%, ROA ${roa.toFixed(1)}%.`;
  const collRatio = faRatio;
  const collNote = `Agunan Pokok (${primaryTypeLabel}) ${fmtRp(inv, true)} (${invRatio.toFixed(0)}%) & Jaminan Tambahan (${additionalTypeLabel}) ${fmtRp(fa, true)} (${faRatio.toFixed(0)}% plafond).`;
  const condNote = isImport ? 'Sensitivitas tinggi terhadap fluktuasi kurs USD & jalur laut logistik impor.' : 'Kondisi sektor industri stabil dengan perputaran pasar domestik normal.';

  return {
    evaluatedParams,
    categoryScores,
    categoryWeighted,
    categoryWeights,
    totalScore,
    totalScore10,
    hasOverrides: Object.keys(overrides).length > 0,
    overridesCount: Object.keys(overrides).length,

    // Backward compatibility
    businessAge,
    estYr,
    charScore,
    charAgeNote,
    defaultStatusText,
    slikStatus,
    inaprocStatus,
    sippStatus,
    newsStatusText,
    capScore,
    capNote,
    capitScore,
    capitNote,
    collScore,
    collRatio,
    collNote,
    condScore,
    condNote,
    invVal: inv,
    invRatio,
    faVal: fa,
    faRatio,
    hasCustomPrimary,
    hasCustomAdditional,
    primaryTypeLabel,
    additionalTypeLabel,
    primaryBinding,
    additionalBinding,
    primaryDesc: proj.collateralPrimaryDesc || '',
    additionalDesc: proj.collateralAdditionalDesc || '',
    liquidationVal: proj.collateralAdditionalLiquidationVal || 0,
    isImport,
    charBreakdown: { agePts: 20, maxAgePts: 25, creditPts: 30, maxCreditPts: 30, inaprocPts: 15, maxInaprocPts: 15, sippPts: 10, maxSippPts: 10, newsPts: 20, maxNewsPts: 20, total: charScore },
    capBreakdown: { gpmPts: 28, maxGpmPts: 35, tenorPts: 20, maxTenorPts: 30, icrPts: 15, maxIcrPts: 20, runwayPts: 10, maxRunwayPts: 15, icrVal: icr, total: capScore },
    capitBreakdown: { derPts: 28, maxDerPts: 35, crPts: 20, maxCrPts: 25, nwcPts: 15, maxNwcPts: 20, eqPts: 15, maxEqPts: 20, total: capitScore },
    collBreakdown: { invPts: 40, maxInvPts: 50, faPts: 40, maxFaPts: 50, total: collScore },
    condBreakdown: { logPts: 25, maxLogPts: 35, fxPts: 25, maxFxPts: 30, growthPts: 16, maxGrowthPts: 20, schemePts: 15, maxSchemePts: 15, total: condScore }
  };
}
// ============================================================================
// 4B. CASH FLOW PROJECTION & DEBT SERVICE ENGINE (FORWARD-LOOKING ANALYSIS)
// ============================================================================
function computeCashFlowProjection(proj, overrides = {}) {
  const f23 = proj.fin23 || {};
  const requestedPlafond = proj.requestedPlafond || 10000000000;
  const interestRate = overrides.interestRate !== undefined ? overrides.interestRate : (proj.interestRate || 9.5);
  const salesGrowth = overrides.salesGrowth !== undefined ? overrides.salesGrowth : (proj.cfProjGrowth !== undefined ? proj.cfProjGrowth : 5.0);
  
  // Hitung GPM default dari audited fin23
  const histGPM = (f23.rev && f23.rev > 0) ? ((f23.rev - f23.cogs) / f23.rev) * 100 : 8.0;
  const targetGPM = overrides.targetGPM !== undefined ? overrides.targetGPM : (proj.cfProjGPM !== undefined ? proj.cfProjGPM : histGPM);
  
  const histDOR = (f23.rev && f23.rev > 0) ? (f23.ar / f23.rev) * 365 : 60;
  const dorDays = overrides.dorDays !== undefined ? overrides.dorDays : (proj.cfProjDOR !== undefined ? proj.cfProjDOR : histDOR);
  
  const repaymentType = overrides.repaymentType || proj.cfProjRepaymentType || (proj.scfTenorDays > 0 ? 'semi_annual' : 'bullet'); // 'bullet', 'semi_annual', 'amortized'

  const baseRev = f23.rev || (requestedPlafond * 4);
  const projectedAnnualSales = baseRev * (1 + salesGrowth / 100);

  // Dalam skema SCF AP, persediaan dibeli dengan bantuan pembiayaan Bank & konversi stok gudang (f23.inv)
  // menjadi penjualan tunai/piutang tertagih. Beban OPEX mengeluarkan komponen penyusutan non-kas aset tetap (f23.fa)
  // dan memperhitungkan pelepasan kas dari konversi persediaan (inventory-to-cash conversion).
  const scfAnnualVolume = repaymentType === 'semi_annual' ? (requestedPlafond * 2) : requestedPlafond;
  const effectiveCycleScale = Math.min(1.0, (scfAnnualVolume * 2.5) / Math.max(1, projectedAnnualSales));
  const projectedAnnualCOGS = projectedAnnualSales * (1 - (targetGPM * effectiveCycleScale) / 100);
  const rawCashOpex = Math.max(0, (f23.opex || (baseRev * 0.05)) - ((f23.fa || 0) * 0.24));
  const projectedAnnualOpex = Math.min(rawCashOpex || (projectedAnnualSales * 0.025), projectedAnnualSales * 0.022 * effectiveCycleScale);

  const monthlySales = projectedAnnualSales / 12;
  const monthlyCOGS = projectedAnnualCOGS / 12;
  const monthlyOpex = projectedAnnualOpex / 12;

  let currentCash = Math.min(f23.cash || (requestedPlafond * 0.15), requestedPlafond * 0.20);
  const initialCash = currentCash;
  const monthlyData = [];

  // Efek konversi perputaran modal kerja (persediaan & piutang menjadi kas)
  const wcConversionAnnual = ((histDOR - dorDays) / 365) * (projectedAnnualSales * effectiveCycleScale);
  const monthlyWCConversion = wcConversionAnnual / 12;

  let totalInflow = 0;
  let totalOutflow = 0;
  let totalNOCF = 0;
  let totalSCFDrawdown = 0;
  let totalDebtService = 0;
  let minEndingCash = Infinity;

  for (let month = 1; month <= 12; month++) {
    const begCash = currentCash;

    // 1. Pencairan Kredit SCF AP oleh Bank untuk Membantu Pembelian Persediaan / Bahan Baku
    let scfDrawdown = 0;
    if (repaymentType === 'semi_annual') {
      if (month === 1) scfDrawdown = requestedPlafond * 0.5;
      if (month === 7) scfDrawdown = requestedPlafond * 0.5;
    } else {
      if (month === 1) scfDrawdown = requestedPlafond;
    }

    // 2. Konversi Persediaan menjadi Kas Masuk Penjualan (memperhitungkan DOR & percepatan siklus)
    let collectionLag = Math.min(1.0, 30 / Math.max(25, dorDays));
    let cashInflow = monthlySales + monthlyWCConversion;
    if (month === 1 && dorDays > 30 && dorDays >= histDOR) {
      cashInflow = monthlySales - (monthlySales * (1 - collectionLag) * effectiveCycleScale) + monthlyWCConversion;
    }

    // 3. Pengeluaran kas operasional: Pembelian Persediaan/HPP, OPEX, Pajak
    const cogsPayment = monthlyCOGS;
    const opexPayment = monthlyOpex;
    const monthlyOperatingIncome = monthlySales - monthlyCOGS - monthlyOpex;
    const taxPayment = Math.max(0, monthlyOperatingIncome * 0.22);
    const operatingOutflow = cogsPayment + opexPayment + taxPayment;
    const nocf = cashInflow - operatingOutflow;

    // 4. Pelunasan Kewajiban SCF AP dari Kas Hasil Akhir Penjualan Persediaan: Bunga + Pokok
    const monthlyInterest = (requestedPlafond * (interestRate / 100)) / 12;
    let principalRepayment = 0;
    if (repaymentType === 'semi_annual') {
      if (month === 6) principalRepayment = requestedPlafond * 0.5;
      if (month === 12) principalRepayment = requestedPlafond * 0.5;
    } else if (repaymentType === 'amortized') {
      principalRepayment = requestedPlafond / 12;
    } else { // bullet di akhir tenor M12
      if (month === 12) principalRepayment = requestedPlafond;
    }

    const debtService = monthlyInterest + principalRepayment;
    const endingCash = begCash + scfDrawdown + nocf - debtService;

    // DSCR Bulanan (Kas Tersedia dari Konversi Persediaan & Pembiayaan SCF dibagi Kewajiban Jatuh Tempo)
    const availableForDS = begCash + scfDrawdown + nocf;
    const monthDSCR = debtService > 0 ? (availableForDS / debtService) : 99.9;

    monthlyData.push({
      month,
      monthName: `Bulan ${month}`,
      begCash,
      scfDrawdown,
      sales: monthlySales,
      cashInflow,
      cogsPayment,
      opexPayment,
      taxPayment,
      operatingOutflow,
      nocf,
      monthlyInterest,
      principalRepayment,
      debtService,
      endingCash,
      monthDSCR: Math.max(0, monthDSCR),
      isDeficit: endingCash < 0
    });

    currentCash = endingCash;
    totalInflow += cashInflow;
    totalOutflow += operatingOutflow;
    totalNOCF += nocf;
    totalSCFDrawdown += scfDrawdown;
    totalDebtService += debtService;
    if (endingCash < minEndingCash) {
      minEndingCash = endingCash;
    }
  }

  const cads = initialCash + totalSCFDrawdown + totalNOCF;
  const annualDSCR = totalDebtService > 0 ? (cads / totalDebtService) : 0;
  const fcf = totalSCFDrawdown + totalNOCF - totalDebtService;
  const lowestCash = minEndingCash;
  const isHealthy = annualDSCR >= 1.20 && lowestCash > 0;

  return {
    salesGrowth,
    targetGPM,
    interestRate,
    dorDays,
    repaymentType,
    initialCash,
    projectedAnnualSales,
    projectedAnnualCOGS,
    projectedAnnualOpex,
    totalInflow,
    totalOutflow,
    totalNOCF,
    totalSCFDrawdown,
    totalDebtService,
    cads,
    annualDSCR,
    lowestCash,
    fcf,
    isHealthy,
    monthlyData
  };
}

// ============================================================================
// 5. CORE DCC-SWCM ENGINE & NWC BURN-RATE ANALYZER
// ============================================================================
function computeDCCSWCM(proj) {
  if (!proj) return null;
  const f22 = proj.fin22 || {};
  const f23 = proj.fin23 || {};
  const yr1 = proj.year1 || 2022;
  const yr2 = proj.year2 || 2023;

  // Cek apakah data laporan keuangan telah diisi oleh analis
  const hasFinancials = Boolean(
    (f23.rev && f23.rev > 0) ||
    (f23.cogs && f23.cogs > 0) ||
    (f23.cash && f23.cash > 0) ||
    (f23.ar && f23.ar > 0) ||
    (f23.inv && f23.inv > 0) ||
    (f23.fa && f23.fa > 0) ||
    (f23.capital && f23.capital > 0) ||
    (f22.rev && f22.rev > 0) ||
    (f22.cash && f22.cash > 0)
  );

  if (!hasFinancials) {
    return {
      hasFinancials: false,
      isLayak: false,
      score: null,
      shortGrade: '-',
      scoreGrade: '-',
      grade: 'Belum Dianalisis',
      gradeMeta: {
        grade: 'Belum Dianalisis',
        name: 'Menunggu Input Data Keuangan',
        minScore: 0,
        maxScore: 0,
        color: '#64748b',
        badgeCls: 'grade-pending',
        maxCoverage: 0,
        ijpRate: '-',
        decision: 'MENUNGGU INPUT LAPORAN KEUANGAN',
        decisionClass: 'pending',
        criteriaSummary: 'Data Laporan Keuangan belum diinput oleh analis.'
      },
      decision: 'MENUNGGU INPUT LAPORAN KEUANGAN',
      decisionClass: 'pending',
      recCoveragePct: 0,
      ijpRate: '-',
      isInitialReject: false,
      stage1Decision: 'MENUNGGU INPUT DATA KEUANGAN',
      stage1Summary: 'Silakan isi data Laporan Keuangan (Neraca & Laba Rugi) pada Tab Input Data atau gunakan Ekstraksi Otomatis AI untuk memulai analisa scoring.',
      yr1, yr2,
      rev22: 0, rev23: 0, revMo22: 0, revMo23: 0,
      gp22: 0, gp23: 0, gpm22: 0, gpm23: 0,
      opBruto22: 0, opBruto23: 0, opInc22: 0, opInc23: 0,
      ebit22: 0, ebit23: 0, ebitMo22: 0, ebitMo23: 0,
      ebt22: 0, ebt23: 0, eat22: 0, eat23: 0, eatMo22: 0, eatMo23: 0, npm22: 0, npm23: 0,
      ca22: 0, ca23: 0, nca22: 0, nca23: 0, ta22: 0, ta23: 0,
      cl22: 0, cl23: 0, tl22: 0, tl23: 0, eq22: 0, eq23: 0, tlEq22: 0, tlEq23: 0,
      nwc22: 0, nwc23: 0, owc22: 0, owc23: 0, isNWCDeficit: false,
      currentRatio22: null, currentRatio23: null,
      quickRatio22: null, quickRatio23: null, cashRatio23: null,
      der22: null, der23: null, invToCA23: 0, reErosionPct23: 0,
      dor22_365: 0, doi22_365: 0, dop22_365: 0, dopBroad22_365: 0,
      dor23_365: 0, doi23_365: 0, dop23_365: 0, dor23_360: 0, doi23_360: 0, dop23_360: 0, dopBroad23_365: 0,
      grossCycle22: 0, ccc22: 0, grossCycle23: 0, ccc23: 0,
      claimedGrossCycle: 0, claimedCCC: 0,
      diffDOR: 0, diffDOI: 0, diffDOP: 0, diffCCC: 0,
      scfTenor: proj.scfTenorDays || 120, kmkTenor: proj.kmkTenorDays || 0, totalMaxTenor: (proj.scfTenorDays || 120) + (proj.kmkTenorDays || 0),
      cashGapAtSCFMaturity_Claimed: 0, cashGapAtSCFMaturity_Actual: 0, cashGapAfterKMK_Actual: 0,
      dailyCOGS23: 0, dailyRev23: 0, dailyOPEX23: 0, dailyInterest23: 0,
      dailyGrossCashBurn: 0, monthlyGrossCashBurn: 0,
      pureCashRunwayDays: 0, pureCashRunwayMonths: 0,
      liquidQuickAssets: 0, quickAssetRunwayDays: 0, quickAssetRunwayMonths: 0,
      wcRequiredPerCycle: 0, nwcFinancingGap: 0,
      stressOpexGrowth: 0, isFreezeCollection: false,
      stressedDailyBurn: 0, stressedLiquidFunds: 0, stressedRunwayDays: 0, stressedRunwayMonths: 0,
      cashLockedInExcessDOI: 0, targetSafeDOI: 0, cashReleasedAtSafeDOI: 0, minRequiredGPM: 0, recommendedTrancheSize: 0,
      stDebtGrowth: 0, revGrowth: 0, dscr23: 0, ebitdaProxy23: 0,
      sustainableLimitBaseline: 0, recommendedMitigatedLimit: 0,
      scoreComponents: [], scorePillars: [], totalRawScore: 0, totalLostPoints: 0,
      hasKnockOutCap: false,
      cfProj: { annualDSCR: 0, totalNOCF: 0, lowestCash: 0, fcf: 0, cads: 0, months: [] },
      fiveC: { charScore: 0, capScore: 0, capitScore: 0, collScore: 0, condScore: 0, total: 0 }
    };
  }

  // Laba Rugi (Sesuai Template Sheet Perhitungan)
  const revMo22 = (f22.rev || 0) / 12;
  const gp22 = (f22.rev || 0) - (f22.cogs || 0);
  const gpm22 = f22.rev > 0 ? (gp22 / f22.rev) * 100 : 0;
  const opBruto22 = gp22 - (f22.opex || 0);
  const opInc22 = opBruto22;
  const ebit22 = opInc22 + (f22.otherInc || 0) - (f22.otherExp || 0);
  const ebitMo22 = ebit22 / 12;
  const ebt22 = ebit22 - (f22.intExp || 0);
  const eat22 = ebt22 - (f22.tax || 0) - (f22.div || 0);
  const eatMo22 = eat22 / 12;
  const npm22 = f22.rev > 0 ? (eat22 / f22.rev) * 100 : 0;

  const revMo23 = (f23.rev || 0) / 12;
  const gp23 = (f23.rev || 0) - (f23.cogs || 0);
  const gpm23 = f23.rev > 0 ? (gp23 / f23.rev) * 100 : 0;
  const opBruto23 = gp23 - (f23.opex || 0);
  const opInc23 = opBruto23;
  const ebit23 = opInc23 + (f23.otherInc || 0) - (f23.otherExp || 0);
  const ebitMo23 = ebit23 / 12;
  const ebt23 = ebit23 - (f23.intExp || 0);
  const eat23 = ebt23 - (f23.tax || 0) - (f23.div || 0);
  const eatMo23 = eat23 / 12;
  const npm23 = f23.rev > 0 ? (eat23 / f23.rev) * 100 : 0;

  // Neraca (Sesuai Template Sheet Perhitungan)
  const ca22 = (f22.cash || 0) + (f22.ar || 0) + (f22.otherAr || 0) + (f22.inv || 0) + (f22.otherCa || 0) + (f22.prepaid || 0);
  const nca22 = (f22.fa || 0) - Math.abs(f22.depr || 0) + (f22.invest || 0) + (f22.taxAsset || 0);
  const ta22 = ca22 + nca22;
  const cl22 = (f22.stDebt || 0) + (f22.ap || 0) + (f22.otherAp || 0) + (f22.accrued || 0);
  const tl22 = cl22 + (f22.ltDebt || 0);
  const eq22 = (f22.capital || 0) + (f22.otherCap || 0) + (f22.retEarn || 0) + (f22.re || 0);
  const tlEq22 = tl22 + eq22;

  const ca23 = (f23.cash || 0) + (f23.ar || 0) + (f23.otherAr || 0) + (f23.inv || 0) + (f23.otherCa || 0) + (f23.prepaid || 0);
  const nca23 = (f23.fa || 0) - Math.abs(f23.depr || 0) + (f23.invest || 0) + (f23.taxAsset || 0);
  const ta23 = ca23 + nca23;
  const cl23 = (f23.stDebt || 0) + (f23.ap || 0) + (f23.otherAp || 0) + (f23.accrued || 0);
  const tl23 = cl23 + (f23.ltDebt || 0);
  const eq23 = (f23.capital || 0) + (f23.otherCap || 0) + (f23.retEarn || 0) + (f23.re || 0);
  const tlEq23 = tl23 + eq23;

  // Rasio Aktivitas
  const dor22_365 = f22.rev > 0 ? (f22.ar / f22.rev) * 365 : 0;
  const doi22_365 = f22.cogs > 0 ? (f22.inv / f22.cogs) * 365 : 0;
  const dop22_365 = f22.cogs > 0 ? (f22.ap / f22.cogs) * 365 : 0;
  const dopBroad22_365 = f22.cogs > 0 ? ((f22.ap + f22.otherAp + f22.accrued) / f22.cogs) * 365 : 0;
  const grossCycle22 = doi22_365 + dor22_365;
  const ccc22 = grossCycle22 - dop22_365;

  const dor23_365 = f23.rev > 0 ? (f23.ar / f23.rev) * 365 : 0;
  const doi23_365 = f23.cogs > 0 ? (f23.inv / f23.cogs) * 365 : 0;
  const dop23_365 = f23.cogs > 0 ? (f23.ap / f23.cogs) * 365 : 0;
  const dor23_360 = f23.rev > 0 ? (f23.ar / f23.rev) * 360 : 0;
  const doi23_360 = f23.cogs > 0 ? (f23.inv / f23.cogs) * 360 : 0;
  const dop23_360 = f23.cogs > 0 ? (f23.ap / f23.cogs) * 360 : 0;
  const dopBroad23_365 = f23.cogs > 0 ? ((f23.ap + f23.otherAp + f23.accrued) / f23.cogs) * 365 : 0;

  const grossCycle23 = doi23_365 + dor23_365;
  const ccc23 = grossCycle23 - dop23_365;

  const claimedGrossCycle = proj.claimedDOI + proj.claimedDOR;
  const claimedCCC = proj.claimedDOI + proj.claimedDOR - proj.claimedDOP;

  const diffDOR = dor23_365 - proj.claimedDOR;
  const diffDOI = doi23_365 - proj.claimedDOI;
  const diffDOP = dop23_365 - proj.claimedDOP;
  const diffCCC = ccc23 - claimedCCC;

  const scfTenor = proj.scfTenorDays || 180;
  const kmkTenor = proj.kmkTenorDays || 0;
  const totalMaxTenor = scfTenor + kmkTenor;

  const cashGapAtSCFMaturity_Claimed = claimedGrossCycle - scfTenor;
  const cashGapAtSCFMaturity_Actual = grossCycle23 - scfTenor;
  const cashGapAfterKMK_Actual = grossCycle23 - totalMaxTenor;

  const isNoDebt22 = cl22 === 0;
  const isNoDebt23 = cl23 === 0;
  const currentRatio22 = isNoDebt22 ? null : (cl22 > 0 ? ca22 / cl22 : 0);
  const currentRatio23 = isNoDebt23 ? null : (cl23 > 0 ? ca23 / cl23 : 0);
  const quickRatio22 = isNoDebt22 ? null : (cl22 > 0 ? (ca22 - (f22.inv || 0)) / cl22 : 0);
  const quickRatio23 = isNoDebt23 ? null : (cl23 > 0 ? (ca23 - (f23.inv || 0)) / cl23 : 0);
  const cashRatio23 = isNoDebt23 ? null : (cl23 > 0 ? (f23.cash || 0) / cl23 : 0);
  const der22 = tl22 === 0 ? 0 : (eq22 > 0 ? tl22 / eq22 : 99);
  const der23 = tl23 === 0 ? 0 : (eq23 > 0 ? tl23 / eq23 : 99);
  const invToCA23 = ca23 > 0 ? (f23.inv / ca23) * 100 : 0;
  const reErosionPct23 = f23.capital > 0 && f23.re < 0 ? (Math.abs(f23.re) / f23.capital) * 100 : 0;

  const nwc22 = ca22 - cl22;
  const nwc23 = ca23 - cl23;
  const owc22 = f22.ar + f22.inv - f22.ap;
  const owc23 = f23.ar + f23.inv - f23.ap;
  const dailyCOGS23 = f23.cogs / 365;
  const dailyRev23 = f23.rev / 365;

  const cashLockedInExcessDOI = Math.max(0, doi23_365 - proj.claimedDOI) * dailyCOGS23;
  const targetSafeDOI = Math.max(30, Math.min(120, Math.round(scfTenor - dor23_365 - 10)));
  const cashReleasedAtSafeDOI = Math.max(0, (doi23_365 - targetSafeDOI) * dailyCOGS23);

  const estAnnualInterest = (f23.stDebt + proj.requestedPlafond) * (proj.interestRate / 100);
  const minRequiredGPM = f23.rev > 0 ? Math.max(8.0, Math.min(18.0, ((f23.opex * 0.65 + estAnnualInterest) / f23.rev) * 100)) : 10.0;

  const annualDebtService = proj.requestedPlafond * (1 + (proj.interestRate / 100));
  const ebitdaProxy23 = ebt23 + (f23.fa * 0.05);
  const dscr23 = annualDebtService > 0 ? ebitdaProxy23 / (proj.requestedPlafond * (proj.interestRate / 100) + proj.requestedPlafond * 0.25) : 0;

  const stDebtGrowth = f22.stDebt > 0 ? ((f23.stDebt - f22.stDebt) / f22.stDebt) * 100 : 0;
  const revGrowth = f22.rev > 0 ? ((f23.rev - f22.rev) / f22.rev) * 100 : 0;

  // ==========================================================================
  // MODUL BARU: ANALISIS KETAHANAN MODAL KERJA BERSIH & CASH BURN-RATE
  // ==========================================================================
  // Daily Operating Cash Outflow (Gross Burn Rate: HPP + OPEX Harian + Bunga Harian)
  const dailyOPEX23 = f23.opex / 365;
  const dailyInterest23 = estAnnualInterest / 365;
  const dailyGrossCashBurn = dailyCOGS23 + dailyOPEX23 + dailyInterest23;
  const monthlyGrossCashBurn = dailyGrossCashBurn * 30.4;

  // Pure Cash Runway (Zero Revenue Freeze: Kas / Daily Gross Burn)
  const pureCashRunwayDays = dailyGrossCashBurn > 0 ? f23.cash / dailyGrossCashBurn : 0;
  const pureCashRunwayMonths = pureCashRunwayDays / 30.4;

  // Liquid Working Capital Runway (Kas + Piutang Tertagih Lancar 80% / Daily Burn)
  const liquidQuickAssets = f23.cash + (f23.ar * 0.85);
  const quickAssetRunwayDays = dailyGrossCashBurn > 0 ? liquidQuickAssets / dailyGrossCashBurn : 0;
  const quickAssetRunwayMonths = quickAssetRunwayDays / 30.4;

  // Working Capital Requirement for 1 Gross Cycle (Kebutuhan Modal Kerja 1 Siklus Penuh)
  // Biaya operasi yang harus ditalangi selama (DOI + DOR) hari
  const wcRequiredPerCycle = dailyGrossCashBurn * grossCycle23;
  // Modal Kerja Tersedia yang Bebas dari Utang Jangka Pendek Non-Trade
  const effectiveFreeNWC = Math.max(0, nwc23);
  // Financing Gap Modal Kerja (KMK Deficit / Surplus)
  const nwcFinancingGap = effectiveFreeNWC - wcRequiredPerCycle;
  const isNWCDeficit = nwcFinancingGap < 0;

  // Stress-Tested Cash Burn Simulation
  const stressOpexGrowth = typeof proj.burnStressOpexGrowth === 'number' ? proj.burnStressOpexGrowth : 0;
  const isFreezeCollection = !!proj.burnStressCollectionFreeze;
  const stressedDailyBurn = (dailyCOGS23 * (1 + (stressOpexGrowth * 0.5) / 100)) +
                            (dailyOPEX23 * (1 + stressOpexGrowth / 100)) + dailyInterest23;
  const stressedLiquidFunds = isFreezeCollection ? f23.cash : liquidQuickAssets;
  const stressedRunwayDays = stressedDailyBurn > 0 ? stressedLiquidFunds / stressedDailyBurn : 0;
  const stressedRunwayMonths = stressedRunwayDays / 30.4;

  let sustainableLimitBaseline = 0;
  if (gp23 > 0 && ebt23 > 0) {
    const cycleFactor = Math.max(0.25, Math.min(1.2, scfTenor / Math.max(60, ccc23)));
    sustainableLimitBaseline = Math.min(proj.requestedPlafond, (gp23 * 0.45) * cycleFactor);
  } else {
    sustainableLimitBaseline = 0;
  }

  const singleShipmentCycleLimit = dailyCOGS23 * Math.min(120, scfTenor * 0.65) * 0.18;
  const recommendedMitigatedLimit = gp23 > 0
    ? sustainableLimitBaseline
    : Math.min(proj.requestedPlafond * 0.6, singleShipmentCycleLimit);

  const recommendedTrancheSize = Math.round((recommendedMitigatedLimit > 0 ? recommendedMitigatedLimit : proj.requestedPlafond * 0.6) / 3);

  // ==========================================================================
  // GRANULAR 100-POINT SCORING MODEL (7 PILAR DCC-SWCM)
  // ==========================================================================
  const scoreComponents = [];

  // PILAR 1: RASIO KEUANGAN (PROFITABILITAS & KAPASITAS BAYAR) (BOBOT MAKS: 20 POIN)
  let s1A = 0;
  let r1A = '';
  if (gpm23 >= 12) {
    s1A = 10;
    r1A = `Gross Margin sangat kuat (${fmtPct(gpm23)}).`;
  } else if (gpm23 >= 8) {
    s1A = 8;
    r1A = `Gross Margin sehat (${fmtPct(gpm23)}).`;
  } else if (gpm23 >= 3) {
    s1A = 5;
    r1A = `Gross Margin tipis (${fmtPct(gpm23)}).`;
  } else if (gpm23 >= 0) {
    s1A = 2;
    r1A = `Gross Margin nyaris impas (${fmtPct(gpm23)}).`;
  } else {
    s1A = 0;
    r1A = `Gross Loss (${fmtPct(gpm23)}); perusahaan jual rugi!`;
  }
  scoreComponents.push({
    pillarId: 'P1',
    pillarName: 'Pilar 1: Rasio Keuangan (Maks 20)',
    code: '1A',
    name: 'Marjin Laba Kotor (Gross Profit Margin)',
    formula: '(Penjualan  -  HPP) / Penjualan',
    benchmark: '&ge; +8,0%',
    actualStr: `${fmtPct(gpm23, 2)} (${fmtRp(gp23, true)})`,
    maxPts: 10,
    earnedPts: s1A,
    lostPts: 10 - s1A,
    reason: r1A
  });

  let s1B = eat23 > 0 && revGrowth >= 5 ? 5 : (eat23 > 0 ? 3.5 : (eat23 < 0 && revGrowth >= 10 ? 1.5 : 0));
  scoreComponents.push({
    pillarId: 'P1',
    pillarName: 'Pilar 1: Rasio Keuangan (Maks 20)',
    code: '1B',
    name: 'Laba Bersih & Pertumbuhan Penjualan YoY',
    formula: 'EAT > 0 & Sales YoY',
    benchmark: 'EAT Positif & Sales > +5%',
    actualStr: `EAT: ${fmtRp(eat23, true)} | Sales: ${fmtPct(revGrowth, 1)}`,
    maxPts: 5,
    earnedPts: s1B,
    lostPts: 5 - s1B,
    reason: eat23 > 0 ? 'Laba Bersih positif.' : 'Rugi bersih berlanjut.'
  });

  let s1C = dscr23 >= 1.5 ? 5 : (dscr23 >= 1.2 ? 4 : (dscr23 >= 1.0 ? 2 : 0));
  scoreComponents.push({
    pillarId: 'P1',
    pillarName: 'Pilar 1: Rasio Keuangan (Maks 20)',
    code: '1C',
    name: 'Debt Service Coverage Ratio (DSCR)',
    formula: 'EBITDA Proxy / Kewajiban Utang',
    benchmark: '&ge; 1,20x',
    actualStr: `${fmtNum(dscr23, 2)}x`,
    maxPts: 5,
    earnedPts: s1C,
    lostPts: 5 - s1C,
    reason: dscr23 >= 1.2 ? 'DSCR memadai.' : 'EBITDA operasional tidak cukup menutup cicilan.'
  });

  // PILAR 2: ANALISA KUALITATIF 5C UNDERWRITING (BOBOT MAKS: 10 POIN)
  // Evaluasi 5C Komprehensif Berbasis Karakter & Data Riil
  const fiveC = compute5CAnalysis(proj, f23, {
    gpm23,
    cashGapAtSCFMaturity_Actual,
    icr23: f23.finCost > 0 ? (f23.rev - f23.cogs - f23.opex) / f23.finCost : 1,
    pureCashRunwayDays,
    eq23,
    tl23,
    der23,
    currentRatio23,
    isNoDebt23,
    nwc23,
    isNWCDeficit,
    reErosionPct23,
    revGrowth
  });

  const rawQual = fiveC.totalScore;
  const s2A = Number(((Math.max(0, Math.min(100, rawQual)) / 100) * 10).toFixed(1));

  scoreComponents.push({
    pillarId: 'P2',
    pillarName: 'Pilar 2: Analisa 5C (Maks 10)',
    code: '2A',
    name: 'Penilaian Kualitatif Terpadu 5C Underwriting',
    formula: 'Otomatis dari Modul Analisa 5C: (Skor 5C / 100) &times; 10 Poin',
    benchmark: '&ge; 75 / 100',
    actualStr: `${rawQual} / 100 (${fmtNum(s2A, 1)} Poin)`,
    maxPts: 10,
    earnedPts: s2A,
    lostPts: Number((10 - s2A).toFixed(1)),
    reason: `Analisa 5C: Character (${fiveC.defaultStatusText}; ${fiveC.newsStatusText}), Capacity (${fiveC.capNote}), Collateral (Agunan Pokok Persediaan ${(fiveC.invRatio || 0).toFixed(0)}% & Jaminan Tambahan FA ${(fiveC.faRatio || fiveC.collRatio || 0).toFixed(0)}%), Condition (${fiveC.condNote}).`
  });

  // PILAR 3: DYNAMIC CCC & KESESUAIAN TENOR KREDIT (BOBOT MAKS: 20 POIN)
  let s3A = 0;
  let r3A = '';
  if (cashGapAtSCFMaturity_Actual <= -20) {
    s3A = 12;
    r3A = `Siklus Gross (${fmtNum(grossCycle23, 1)} hr) jauh di bawah Tenor (${scfTenor} hr)  -  Buffer ${fmtNum(Math.abs(cashGapAtSCFMaturity_Actual), 1)} hr.`;
  } else if (cashGapAtSCFMaturity_Actual <= 0) {
    s3A = 10;
    r3A = `Siklus Gross (${fmtNum(grossCycle23, 1)} hr) pas di bawah Tenor (${scfTenor} hr).`;
  } else if (cashGapAtSCFMaturity_Actual <= 30) {
    s3A = 5;
    r3A = `Siklus Gross melampaui Tenor +${fmtNum(cashGapAtSCFMaturity_Actual, 1)} hr.`;
  } else {
    s3A = 0;
    r3A = `Mismatch Tenor ekstrem (+${fmtNum(cashGapAtSCFMaturity_Actual, 1)} hr); kas belum kembali saat jatuh tempo.`;
  }
  scoreComponents.push({
    pillarId: 'P3',
    pillarName: 'Pilar 3: Dynamic CC & Kesesuaian Tenor (Maks 20)',
    code: '3A',
    name: 'Kesesuaian Siklus Gross vs Tenor Fasilitas',
    formula: '(DOI + DOR) &le; Tenor Kredit',
    benchmark: `&le; ${scfTenor} Hari`,
    actualStr: `${fmtNum(grossCycle23, 1)} Hari (Gap: ${cashGapAtSCFMaturity_Actual >= 0 ? '+' : ''}${fmtNum(cashGapAtSCFMaturity_Actual, 1)} hr)`,
    maxPts: 12,
    earnedPts: s3A,
    lostPts: 12 - s3A,
    reason: r3A
  });

  let s3B = 0;
  let r3B = '';
  if (doi23_365 <= 60) {
    s3B = 8;
    r3B = `Perputaran persediaan sangat cepat (${fmtNum(doi23_365, 1)} hr &le; 60 hr).`;
  } else if (doi23_365 <= 120) {
    s3B = 6.5;
    r3B = `Perputaran persediaan sehat (${fmtNum(doi23_365, 1)} hr &le; 120 hr).`;
  } else if (doi23_365 <= 180) {
    s3B = 3;
    r3B = `Persediaan mulai lambat (${fmtNum(doi23_365, 1)} hr).`;
  } else {
    s3B = 0;
    r3B = `Persediaan menumpuk (${fmtNum(doi23_365, 1)} hr / ~${fmtNum(doi23_365 / 30, 1)} bln); risiko rusak tinggi.`;
  }
  scoreComponents.push({
    pillarId: 'P3',
    pillarName: 'Pilar 3: Dynamic CC & Kesesuaian Tenor (Maks 20)',
    code: '3B',
    name: 'Kecepatan Perputaran Persediaan (DOI)',
    formula: '(Persediaan / HPP) &times; 365',
    benchmark: '&le; 120 Hari',
    actualStr: `${fmtNum(doi23_365, 1)} Hari`,
    maxPts: 8,
    earnedPts: s3B,
    lostPts: 8 - s3B,
    reason: r3B
  });

  // PILAR 4: KETAHANAN SKENARIO STRESS-TEST SWCM (BOBOT MAKS: 15 POIN)
  // Menilai ketahanan siklus operasi dan solvabilitas likuiditas jika terjadi guncangan makro / keterlambatan piutang
  const shockGrossCycle = Math.round(doi23_365 + 20 + dor23_365 + 20);
  let s4A = 0;
  let r4A = '';
  if (shockGrossCycle <= scfTenor && gpm23 >= 0) {
    s4A = 8;
    r4A = `Tahan shock makro: siklus pasca guncangan (${shockGrossCycle} hr) tetap fit di bawah tenor (${scfTenor} hr).`;
  } else if (shockGrossCycle <= scfTenor + 25 && gpm23 >= 0) {
    s4A = 4;
    r4A = `Rentan moderat saat shock makro: siklus melambat +${shockGrossCycle - scfTenor} hari di atas tenor fasilitas.`;
  } else {
    s4A = 0.5;
    r4A = `Sangat rentan default saat shock: siklus membengkak ke ${shockGrossCycle} hr vs tenor ${scfTenor} hr; kas pembeli belum cair.`;
  }
  scoreComponents.push({
    pillarId: 'P4',
    pillarName: 'Pilar 4: Ketahanan Stress-Test SWCM (Maks 15)',
    code: '4A',
    name: 'Ketahanan Shock Makro Kurs USD & Stagflasi',
    formula: 'Simulasi SWCM: Shock Kurs (+10%) & DOR (+20h)',
    benchmark: 'Siklus Shock &le; Tenor & GP Positif',
    actualStr: `Siklus Shock: ${shockGrossCycle} Hr vs Tenor ${scfTenor} Hr`,
    maxPts: 8,
    earnedPts: s4A,
    lostPts: 8 - s4A,
    reason: r4A
  });

  const stressInterestEst = (f23.stDebt + proj.requestedPlafond * (1 + (proj.usdAmount > 0 ? 0.1 : 0))) * (proj.interestRate / 100);
  const stressCFEst = Math.max(0, (gp23 * 0.8) - f23.opex + (f23.fa * 0.04));
  const stressDebtService = proj.requestedPlafond * 0.5 + stressInterestEst;
  const stressDSCR = stressDebtService > 0 ? (stressCFEst + Math.max(0, (pureCashRunwayDays > 30 ? 500000000 : 0))) / stressDebtService : 0;

  let s4B = 0;
  let r4B = '';
  if (stressDSCR >= 1.2 && gpm23 > 0) {
    s4B = 7;
    r4B = `Kapasitas bayar kokoh saat stress (DSCR Tertekan ${fmtNum(stressDSCR, 2)}x &ge; 1,2x).`;
  } else if (stressDSCR >= 0.8 && gpm23 > 0) {
    s4B = 3.5;
    r4B = `Kapasitas bayar marjinal saat stress (DSCR Tertekan ${fmtNum(stressDSCR, 2)}x).`;
  } else {
    s4B = 0.5;
    r4B = `Defisit pembayaran kewajiban saat stress (DSCR Tertekan ${fmtNum(stressDSCR, 2)}x < 1,0x); butuh relaksasi skema.`;
  }
  scoreComponents.push({
    pillarId: 'P4',
    pillarName: 'Pilar 4: Ketahanan Stress-Test SWCM (Maks 15)',
    code: '4B',
    name: 'Sensitivitas DSCR di Bawah Tekanan Siklus',
    formula: 'DSCR Tertekan pada Skenario Shock SWCM',
    benchmark: 'DSCR &ge; 1,10x Pasca Shock',
    actualStr: `DSCR Shock: ${fmtNum(stressDSCR, 2)}x`,
    maxPts: 7,
    earnedPts: s4B,
    lostPts: 7 - s4B,
    reason: r4B
  });

  // PILAR 5: KETAHANAN NWC & CASH BURN-RATE (BOBOT MAKS: 15 POIN)
  let s5A = 0;
  let r5A = '';
  if (pureCashRunwayMonths >= 3.0) {
    s5A = 8;
    r5A = `Ketahanan Kas Murni sangat kuat (${fmtNum(pureCashRunwayMonths, 1)} bulan &ge; 3 bulan).`;
  } else if (pureCashRunwayMonths >= 1.5) {
    s5A = 6;
    r5A = `Ketahanan Kas Murni memadai (${fmtNum(pureCashRunwayMonths, 1)} bulan).`;
  } else if (pureCashRunwayMonths >= 0.8) {
    s5A = 3;
    r5A = `Ketahanan Kas Murni ketat (${fmtNum(pureCashRunwayMonths, 1)} bulan / ~${fmtNum(pureCashRunwayDays, 0)} hari).`;
  } else {
    s5A = 0.5;
    r5A = `Ketahanan Kas kritis (${fmtNum(pureCashRunwayDays, 0)} hari); kas habis dalam waktu singkat jika terjadi collection freeze.`;
  }
  scoreComponents.push({
    pillarId: 'P5',
    pillarName: 'Pilar 5: Ketahanan NWC & CBRT (Maks 15)',
    code: '5A',
    name: 'Pure Cash Runway (Ketahanan Kas Murni Tanpa Omzet)',
    formula: 'Kas & Bank / Daily Gross Cash Burn',
    benchmark: '&ge; 1,5 Bulan (&ge; 45 Hari)',
    actualStr: `${fmtNum(pureCashRunwayMonths, 1)} Bulan (${fmtNum(pureCashRunwayDays, 0)} Hari)`,
    maxPts: 8,
    earnedPts: s5A,
    lostPts: 8 - s5A,
    reason: r5A
  });

  let s5B = 0;
  let r5B = '';
  if (!isNWCDeficit) {
    s5B = 7;
    r5B = `NWC Surplus (+${fmtRp(nwcFinancingGap, true)}) untuk memutar 1 siklus operasional.`;
  } else if (Math.abs(nwcFinancingGap) <= proj.requestedPlafond * 0.5) {
    s5B = 3.5;
    r5B = `Terdapat defisit modal kerja 1 siklus (${fmtRp(nwcFinancingGap, true)}) yang dapat ditutup kredit bank.`;
  } else {
    s5B = 1;
    r5B = `Defisit modal kerja 1 siklus sangat besar (${fmtRp(nwcFinancingGap, true)}); NWC riil tidak mencukupi membiayai siklus ${fmtNum(grossCycle23, 0)} hari.`;
  }
  scoreComponents.push({
    pillarId: 'P5',
    pillarName: 'Pilar 5: Ketahanan NWC & CBRT (Maks 15)',
    code: '5B',
    name: 'NWC Adequacy & Working Capital Gap per Siklus',
    formula: 'NWC Riil  -  Kebutuhan Dana 1 Siklus Gross',
    benchmark: 'Surplus (Gap &ge; 0)',
    actualStr: `${isNWCDeficit ? 'Defisit ' : 'Surplus '}${fmtRp(nwcFinancingGap, true)}`,
    maxPts: 7,
    earnedPts: s5B,
    lostPts: 7 - s5B,
    reason: r5B
  });

  // PILAR 6: SOLVABILITAS & STRUKTUR MODAL (BOBOT MAKS: 10 POIN)
  let s6A = der23 <= 2.0 && reErosionPct23 === 0 ? 5 : (der23 <= 3.0 && reErosionPct23 <= 30 ? 3.5 : (der23 <= 4.0 ? 2 : 1));
  scoreComponents.push({
    pillarId: 'P6',
    pillarName: 'Pilar 6: Solvabilitas & Struktur Modal (Maks 10)',
    code: '6A',
    name: 'Debt to Equity Ratio (DER) & Proteksi Erosi Modal',
    formula: 'Total Liabilitas / Ekuitas',
    benchmark: 'DER &le; 2,5x & Erosi Modal < 25%',
    actualStr: `DER: ${fmtNum(der23, 2)}x${der23 === 0 ? ' (Bebas Utang)' : ''} | Erosi: ${fmtNum(reErosionPct23, 1)}%`,
    maxPts: 5,
    earnedPts: s6A,
    lostPts: 5 - s6A,
    reason: reErosionPct23 > 50 ? 'Akumulasi rugi menggerus sebagian besar modal saham.' : (der23 === 0 ? 'Bebas utang (solvabilitas prima).' : (der23 <= 2.5 ? 'Permodalan kuat & solvabel.' : 'Leverage utang tinggi.'))
  });

  let s6B = (stDebtGrowth <= 25 ? 3 : (stDebtGrowth <= 50 ? 2 : 1)) + (proj.kmkTenorDays > 0 ? 0 : 2);
  scoreComponents.push({
    pillarId: 'P6',
    pillarName: 'Pilar 6: Solvabilitas & Struktur Modal (Maks 10)',
    code: '6B',
    name: 'Kualitas Struktur Utang Bank & Kemandirian Skema',
    formula: 'Pertumbuhan Utang Jk Pendek & Anti-Moral Hazard',
    benchmark: 'Utang Stabil (&Delta; &le; +25%) & Skema Mandiri',
    actualStr: `&Delta;Utang: ${fmtPct(stDebtGrowth, 1)} | ${proj.kmkTenorDays > 0 ? 'Ada Backup Default' : 'Struktur Mandiri'}`,
    maxPts: 5,
    earnedPts: s6B,
    lostPts: 5 - s6B,
    reason: proj.kmkTenorDays > 0 ? 'Fasilitas mengandalkan backup default otomatis (risiko moral hazard).' : 'Struktur utang terkendali tanpa risiko moral hazard.'
  });

  // PILAR 7: PROYEKSI ARUS KAS & KAPASITAS PELUNASAN (CASH FLOW PROJECTION & DEBT SERVICE) (BOBOT MAKS: 10 POIN)
  const cfProj = computeCashFlowProjection(proj);
  let s7A = 0;
  let r7A = '';
  if (cfProj.annualDSCR >= 1.30 && cfProj.totalNOCF > 0) {
    s7A = 5;
    r7A = `Projected DSCR sangat kuat (${fmtNum(cfProj.annualDSCR, 2)}x &ge; 1,30x); arus kas operasional mampu melunasi pokok & bunga kredit.`;
  } else if (cfProj.annualDSCR >= 1.15 && cfProj.totalNOCF > 0) {
    s7A = 4;
    r7A = `Projected DSCR memadai (${fmtNum(cfProj.annualDSCR, 2)}x); kapasitas bayar proyeksi memenuhi standar underwriting Askrindo.`;
  } else if (cfProj.annualDSCR >= 1.00) {
    s7A = 2;
    r7A = `Projected DSCR pas-pasan (${fmtNum(cfProj.annualDSCR, 2)}x); kas operasional tipis untuk melunasi cicilan utang.`;
  } else {
    s7A = 0;
    r7A = `Projected DSCR defisit (${fmtNum(cfProj.annualDSCR, 2)}x < 1,00x); proyeksi arus kas operasional minus (cash shortfall) memastikan gagal bayar saat jatuh tempo.`;
  }
  scoreComponents.push({
    pillarId: 'P7',
    pillarName: 'Pilar 7: Proyeksi Arus Kas & Debt Service (Maks 10)',
    code: '7A',
    name: 'Projected Debt Service Coverage Ratio (DSCR Proyeksi 12 Bulan)',
    formula: '(Kas Awal + Pencairan SCF Persediaan + NOCF) / Total Debt Service',
    benchmark: '&ge; 1,20x Standar Underwriting',
    actualStr: `DSCR: ${fmtNum(cfProj.annualDSCR, 2)}x (CADS: ${fmtRp(cfProj.cads, true)})`,
    maxPts: 5,
    earnedPts: s7A,
    lostPts: 5 - s7A,
    reason: r7A
  });

  let s7B = 0;
  let r7B = '';
  if (cfProj.lowestCash > 0 && cfProj.fcf > 0) {
    s7B = 5;
    r7B = `Saldo kas akhir selalu surplus (Terendah: ${fmtRp(cfProj.lowestCash, true)}) & Free Cash Flow positif (+${fmtRp(cfProj.fcf, true)}).`;
  } else if (cfProj.lowestCash >= 0) {
    s7B = 3;
    r7B = `Saldo kas akhir proyeksi bertahan positif tipis tanpa tembus defisit kas.`;
  } else {
    s7B = 0;
    r7B = `Terjadi defisit saldo kas (Terendah ${fmtRp(cfProj.lowestCash, true)}); arus kas internal tidak mampu menopang operasional dan cicilan pinjaman.`;
  }
  scoreComponents.push({
    pillarId: 'P7',
    pillarName: 'Pilar 7: Proyeksi Arus Kas & Debt Service (Maks 10)',
    code: '7B',
    name: 'Ketahanan Saldo Kas Akhir & Free Cash Flow (FCF) Proyeksi',
    formula: 'Minimum Ending Cash Balance & FCF Proyeksi',
    benchmark: 'Saldo Kas Akhir > Rp 0 & FCF Positif',
    actualStr: `Kas Terendah: ${fmtRp(cfProj.lowestCash, true)} | FCF: ${fmtRp(cfProj.fcf, true)}`,
    maxPts: 5,
    earnedPts: s7B,
    lostPts: 5 - s7B,
    reason: r7B
  });

  // Agregat Pilar
  const pillarsMap = {};
  scoreComponents.forEach((c) => {
    if (!pillarsMap[c.pillarId]) {
      pillarsMap[c.pillarId] = { id: c.pillarId, name: c.pillarName, maxPts: 0, earnedPts: 0, lostPts: 0, items: [] };
    }
    pillarsMap[c.pillarId].maxPts += c.maxPts;
    pillarsMap[c.pillarId].earnedPts += c.earnedPts;
    pillarsMap[c.pillarId].lostPts += c.lostPts;
    pillarsMap[c.pillarId].items.push(c);
  });
  const scorePillars = Object.values(pillarsMap);

  const totalRawScore = scoreComponents.reduce((acc, item) => acc + item.earnedPts, 0);
  const totalLostPoints = Number((100 - totalRawScore).toFixed(1));
  const score = Math.max(1, Math.min(100, Math.round(totalRawScore)));

  const hasKnockOutCap = gp23 < 0 && cashGapAtSCFMaturity_Actual > 30;
  const gradeMeta = getGradeMetadataByScore(score, hasKnockOutCap, proj.manualGradeOverride || 'AUTO');

  const isBlacklisted = (proj.inaprocStatus === 'blacklisted');
  const isSevereGrossLoss = (gp23 < 0 && (f23.rev || 0) > 0);
  const isDefaultRisk = (score <= 55); // CCC, D, DD, DDD (Score <= 55)
  const isInitialReject = isBlacklisted || isSevereGrossLoss || isDefaultRisk;
  const isLayak = (score > 79 && !isInitialReject); // AAA, AA, A (Score > 79)
  const isBersyarat = (score > 55 && score <= 79 && !isInitialReject); // BBB, BB, B (Score > 55 - 79)

  let stage1Decision = '';
  let stage1Summary = '';

  if (isInitialReject) {
    stage1Decision = gradeMeta.decision || 'TOLAK SKEMA PENGAJUAN AWAL (TIDAK LAYAK)';
    if (isBlacklisted) {
      stage1Decision = 'TOLAK SKEMA PENGAJUAN AWAL (BLACKLIST INAPROC)';
      stage1Summary = 'Debitur tercatat aktif dalam Daftar Hitam Nasional (INAPROC LKPP). Rekomendasi mutlak: Tolak penjaminan kredit.';
    } else if (isSevereGrossLoss) {
      stage1Decision = 'TOLAK SKEMA PENGAJUAN AWAL (GROSS LOSS KRONIS)';
      stage1Summary = `Struktur operasional debitur mengalami kerugian kotor kronis (Gross Loss: ${fmtRp(gp23, true)}). Skema awal tidak feasible dan berisiko default.`;
    } else {
      stage1Summary = `Skor komprehensif debitur (${score}/100) berada pada Rating ${gradeMeta.grade} (${gradeMeta.name}). ${gradeMeta.criteriaSummary}`;
    }
  } else if (isLayak) {
    stage1Decision = gradeMeta.decision || 'SETUJU (LAYAK DIJAMIN)';
    stage1Summary = `Struktur permodalan, rentabilitas, rasio likuiditas, dan kemampuan pengembalian kewajiban debitur dinilai sehat (${gradeMeta.name}) serta memenuhi seluruh kriteria kelayakan underwriting asuransi kredit Askrindo.`;
  } else {
    stage1Decision = gradeMeta.decision || 'PERSETUJUAN BERSYARAT DENGAN MITIGASI KETAT';
    stage1Summary = `Karakter dan kapasitas debitur berada pada zona ${gradeMeta.name} (Rating ${gradeMeta.grade}) sehingga penjaminan direkomendasikan dengan syarat pembatasan coverage dan mitigasi ring-fenced.`;
  }

  return {
    hasFinancials: true,
    isLayak,
    isBersyarat,
    yr1, yr2,
    revMo22, gp22, gpm22, opBruto22, opInc22, ebit22, ebitMo22, ebt22, eat22, eatMo22, npm22,
    revMo23, gp23, gpm23, opBruto23, opInc23, ebit23, ebitMo23, ebt23, eat23, eatMo23, npm23,
    ca22, nca22, ta22, cl22, tl22, eq22, tlEq22,
    ca23, nca23, ta23, cl23, tl23, eq23, tlEq23,
    dor22_365, doi22_365, dop22_365, dopBroad22_365, grossCycle22, ccc22,
    dor23_365, doi23_365, dop23_365, dor23_360, doi23_360, dop23_360, dopBroad23_365,
    grossCycle23, ccc23,
    claimedGrossCycle, claimedCCC,
    diffDOR, diffDOI, diffDOP, diffCCC,
    scfTenor, kmkTenor, totalMaxTenor,
    cashGapAtSCFMaturity_Claimed, cashGapAtSCFMaturity_Actual, cashGapAfterKMK_Actual,
    currentRatio22, currentRatio23, quickRatio22, quickRatio23, cashRatio23,
    der22, der23, invToCA23, reErosionPct23,
    nwc22, nwc23, owc22, owc23,
    dailyCOGS23, dailyRev23, dailyOPEX23, dailyInterest23,
    dailyGrossCashBurn, monthlyGrossCashBurn,
    pureCashRunwayDays, pureCashRunwayMonths,
    liquidQuickAssets, quickAssetRunwayDays, quickAssetRunwayMonths,
    wcRequiredPerCycle, nwcFinancingGap, isNWCDeficit,
    stressOpexGrowth, isFreezeCollection,
    stressedDailyBurn, stressedLiquidFunds, stressedRunwayDays, stressedRunwayMonths,
    cashLockedInExcessDOI, targetSafeDOI, cashReleasedAtSafeDOI, minRequiredGPM, recommendedTrancheSize,
    stDebtGrowth, revGrowth, dscr23, ebitdaProxy23,
    sustainableLimitBaseline, recommendedMitigatedLimit,
    scoreComponents, scorePillars, totalRawScore, totalLostPoints,
    hasKnockOutCap, gradeMeta,
    cfProj,
    score,
    riskGrade: `${gradeMeta.grade} (${gradeMeta.name})`,
    shortGrade: gradeMeta.grade,
    decision: gradeMeta.decision,
    decisionClass: gradeMeta.decisionClass,
    recCoveragePct: isLayak ? (gradeMeta.maxCoverage || 70) : (isInitialReject ? 55 : (gradeMeta.maxCoverage || 60)),
    ijpRate: gradeMeta.ijpRate,
    fiveC,
    isInitialReject,
    stage1Decision,
    stage1Summary
  };
}

// ============================================================================
// 6. DYNAMIC CRITICAL POINTS & MITIGATION
// ============================================================================
function buildDynamicCaseInsights(proj, m) {
  const criticalPointsFin = [];
  const criticalPointsCredit = [];
  const requiredInfos = [];
  const mitigations = [];

  // Burn Rate Alert
  if (m.pureCashRunwayMonths < 1.0) {
    criticalPointsFin.push({
      severity: 'CRITICAL',
      title: `Ketahanan Kas Kritis: Pure Cash Runway Hanya ${fmtNum(m.pureCashRunwayDays, 0)} Hari (${fmtNum(m.pureCashRunwayMonths, 1)} Bulan)`,
      detail: `Arus kas keluar harian (Daily Cash Burn untuk HPP, OPEX rutin, dan bunga) mencapai <strong>${fmtRp(m.dailyGrossCashBurn)} / hari</strong> (${fmtRp(m.monthlyGrossCashBurn, true)} / bulan). Dengan posisi Kas & Bank hanya <strong>${fmtRp(proj.fin23.cash)}</strong>, kas debitur akan habis dalam <strong>${fmtNum(m.pureCashRunwayDays, 0)} hari</strong> jika terjadi keterlambatan penerimaan tagihan dari pembeli.`
    });
    mitigations.push({
      title: `Covenant Minimum Cash Buffer Saldo Kas Mengendap Minimal 1,5 Bulan Burn (${fmtRp(m.dailyGrossCashBurn * 45, true)})`,
      detail: `Debitur wajib mempertahankan saldo kas minimum di rekening ${proj.bankName} sekurang-kurangnya setara 45 hari kebutuhan operasional dasar.`
    });
  }

  if (m.isNWCDeficit) {
    criticalPointsFin.push({
      severity: 'HIGH',
      title: `Defisit Modal Kerja 1 Siklus Penuh Sebesar ${fmtRp(Math.abs(m.nwcFinancingGap))}`,
      detail: `Untuk menalangi 1 siklus operasional penuh (${fmtNum(m.grossCycle23, 0)} hari), dibutuhkan modal kerja <strong>${fmtRp(m.wcRequiredPerCycle, true)}</strong>, sementara NWC riil yang tersedia hanya <strong>${fmtRp(m.nwc23, true)}</strong>. Hal ini menjelaskan mengapa debitur sangat bergantung pada penarikan utang jangka pendek.`
    });
  }

  // Profitability
  if (m.gp23 < 0 || m.gp22 < 0) {
    criticalPointsFin.push({
      severity: 'CRITICAL',
      title: `Jual Rugi di Level Kotor (Gross Loss) & Tekanan Marjin Operasional`,
      detail: `Debitur mencatat Gross Profit ${m.yr1} sebesar ${fmtRp(m.gp22)} (${fmtPct(m.gpm22)}) dan ${m.yr2} sebesar ${fmtRp(m.gp23)} (${fmtPct(m.gpm23)}). Penjualan (${fmtRp(proj.fin23.rev)}) lebih rendah daripada HPP (${fmtRp(proj.fin23.cogs)}).`
    });
    requiredInfos.push({
      title: `Rincian Struktur HPP (${fmtRp(proj.fin23.cogs)}) & Penyebab Gross Loss`,
      detail: `Meminta bedah komponen HPP ${m.yr1} - ${m.yr2} (harga beli bahan baku, kurs impor, biaya pabrik/pengolahan, susut bahan baku).`
    });
    mitigations.push({
      title: `Syarat Back-to-Back PO dengan Batas Minimum Gross Margin +${fmtNum(m.minRequiredGPM, 1)}%`,
      detail: `Setiap penarikan kredit wajib didasari Purchase Order (PO) mengikat dari pembeli yang sudah mengunci marjin kotor positif minimal <strong>+${fmtNum(m.minRequiredGPM, 1)}%</strong>.`
    });
  }

  // Discrepancy
  if (Math.abs(m.diffDOI) > 25 || Math.abs(m.diffDOP) > 20) {
    criticalPointsFin.push({
      severity: 'CRITICAL',
      title: `Deviasi Material terhadap Data Bank (DOR, DOI, DOP)`,
      detail: `Data Bank mencatat <strong>DOR ${proj.claimedDOR} hr, DOI ${proj.claimedDOI} hr, DOP ${proj.claimedDOP} hr (CCC ${m.claimedCCC} hr)</strong>. Namun hasil audit laporan keuangan ${m.yr2} menunjukkan <strong>DOR ${fmtNum(m.dor23_365, 1)} hr, DOI ${fmtNum(m.doi23_365, 1)} hr, dan DOP Utang Dagang Murni ${fmtNum(m.dop23_365, 1)} hr (CCC ${fmtNum(m.ccc23, 1)} hr)</strong>. Kelebihan masa simpan persediaan <strong>+${fmtNum(m.diffDOI, 1)} hari</strong> mengunci kas sebesar <strong>${fmtRp(m.cashLockedInExcessDOI)}</strong>.`
    });
    requiredInfos.push({
      title: `Laporan Stock Opname Fisik & Umur Persediaan (${fmtRp(proj.fin23.inv)})`,
      detail: `Meminta rincian fisik stok dan uji mutu/kerusakan barang di gudang karena DOI aktual mencapai ${fmtNum(m.doi23_365, 1)} hari.`
    });
    mitigations.push({
      title: `Covenant Penurunan DOI ke &le; ${m.targetSafeDOI} Hari & Pengikatan Agunan CMA`,
      detail: `Program pelepasan stok lama hingga DOI turun ke maksimal <strong>${m.targetSafeDOI} hari</strong> (membebaskan kas internal <strong>+${fmtRp(m.cashReleasedAtSafeDOI, true)}</strong>) serta pengawasan gudang CMA.`
    });
  }

  // Tenor Mismatch
  if (m.cashGapAtSCFMaturity_Actual > 0) {
    criticalPointsCredit.push({
      severity: 'CRITICAL',
      title: `Mismatch Tenor Fasilitas (${m.scfTenor} Hari) vs Siklus Gross (${fmtNum(m.grossCycle23, 1)} Hari)`,
      detail: `Siklus konversi barang ke kas membutuhkan <strong>${m.claimedGrossCycle} hari (versi Data Bank)</strong> atau <strong>${fmtNum(m.grossCycle23, 1)} hari (versi audit ${m.yr2})</strong>. Dengan tenor fasilitas hanya <strong>${m.scfTenor} hari</strong>, terdapat defisit waktu <strong>${fmtNum(m.cashGapAtSCFMaturity_Actual, 1)} hari</strong> saat jatuh tempo.`
    });
    mitigations.push({
      title: `Sinkronisasi Siklus Transaksi (Ring-Fenced Batch &le; ${m.scfTenor} Hari) & Escrow Account`,
      detail: `Fasilitas hanya boleh membiayai batch pesanan dengan siklus total maksimal <strong>${m.scfTenor - 10} hari</strong>, dan seluruh pembayaran pembeli wajib masuk ke Escrow Account di ${proj.bankName}.`
    });
  }

  // Kerangka Berpikir Baru KMK Backup: Buffer Relaksasi Likuiditas Positif
  if (proj.kmkTenorDays > 0) {
    criticalPointsCredit.push({
      severity: 'CRITICAL',
      title: `Pemanfaatan KMK Khusus (Backup Default +${proj.kmkTenorDays} Hari) sebagai Penyangga Relaksasi Likuiditas`,
      detail: `Fasilitas KMK Khusus berjangka ${proj.kmkTenorDays} hari difungsikan sebagai <strong>buffer relaksasi likuiditas positif (liquidity cushion &amp; default prevention)</strong> yang efektif mencegah debitur langsung mengalami wanprestasi saat penagihan piutang mengalami deviasi waktu. Namun guna mengendalikan potensi <em>moral hazard</em> (risiko penurunan kedisiplinan manajemen likuiditas dan penagihan piutang akibat ketersediaan fasilitas talangan siaga), penarikan fasilitas ini tidak diperkenankan dilakukan di muka, melainkan diatur secara bertahap (tranche drawdown) berbasis verifikasi dokumen invoice penagihan riil dengan pengawasan terpadu melalui rekening Escrow di ${proj.bankName}.`
    });
    mitigations.push({
      title: `Optimalisasi KMK Khusus sebagai Buffer Relaksasi Bertahap (Maks ${fmtRp(m.recommendedTrancheSize, true)} / Tranche)`,
      detail: `KMK Khusus dipertahankan sebagai fasilitas siaga (standby buffer) yang hanya dapat dicairkan bertahap maksimal <strong>${fmtRp(m.recommendedTrancheSize, true)} per tranche</strong> untuk menalangi gap jatuh tempo riil, diverifikasi dokumen penagihan sah, dan diawasi bersama melalui Escrow Account di ${proj.bankName}.`
    });
  }

  // Deteksi Otomatis Risiko Pengiriman / Impor Barang & Wajib Asuransi Marine Cargo
  if (isMaritimeOrImportRisk(proj)) {
    criticalPointsCredit.push({
      severity: 'CRITICAL',
      title: `Risiko Pengiriman & Kerusakan Komoditas Kedelai Impor di Jalur Laut (Marine Transit Risk)`,
      detail: `Sistem ASCA mendeteksi komoditas impor melintasi jalur laut internasional. Terdapat risiko basah air laut, pembusukan/kontaminasi biji kedelai, keterlambatan kapal (demurrage), maupun kecelakaan laut lainnya yang berpotensi melenyapkan nilai barang dan memutus arus kas debitur seketika.`
    });
    mitigations.push({
      title: `Wajib Penutupan Asuransi Marine Cargo Askrindo (Institute Cargo Clauses A - All Risks Warehouse to Warehouse)`,
      detail: `Debitur dan ${proj.bankName} <strong>WAJIB menutup polis Asuransi Pengangkutan Kapal Laut (Marine Cargo) PT Askrindo</strong> dengan klausula <em>Institute Cargo Clauses (A) / All Risks</em> dari pelabuhan asal negara pengekspor hingga gudang akhir debitur (Warehouse to Warehouse), dengan klausula <em>Banker's Clause / Loss Payee</em> atas nama Askrindo & ${proj.bankName}.`
    });
  } else if (proj.procurementMethod === 'domestic') {
    criticalPointsCredit.push({
      severity: 'MODERATE',
      title: `Risiko Pengangkutan & Distribusi Darat Antar-Kota (Inland Transit Risk)`,
      detail: `Distribusi komoditas/barang mengandalkan armada logistik jalur darat. Terdapat risiko kecelakaan armada, kerusakan barang selama transit, atau pembongkaran muatan yang memerlukan perlindungan polis asuransi pengangkutan darat.`
    });
    mitigations.push({
      title: `Asuransi Pengangkutan Darat Askrindo (Inland Transit All Risks)`,
      detail: `Disyaratkan penutupan polis Asuransi Pengangkutan Darat (Inland Transit) PT Askrindo untuk melindungi nilai barang selama transit antar-gudang distributor dengan Banker's Clause kepada ${proj.bankName}.`
    });
  } else if (proj.procurementMethod === 'none') {
    criticalPointsCredit.push({
      severity: 'LOW',
      title: `Aktivitas Bebas Risiko Logistik Kargo Fisik (Jasa / Konstruksi Non-Pengiriman)`,
      detail: `Model bisnis debitur tidak melibatkan transit pengiriman komoditas/kargo laut maupun kargo darat. Risiko pengangkutan fisik nihil, pengawasan dialihkan pada penyelesaian kontrak jasa dan mutasi rekening.`
    });
    mitigations.push({
      title: `Asuransi Perlindungan Aset Tempat Usaha (Property All Risks / Fire) & Escrow Giro`,
      detail: `Tidak diwajibkan asuransi kargo pengiriman laut/darat. Pengalihan mitigasi difokuskan pada perlindungan fisik aset tetap/kantor operasional debitur (Property/PAR) serta kontrol escrow penampungan tagihan di ${proj.bankName}.`
    });
  }

  // Pemisahan Baris 1: Rekomendasi Porsi Coverage Asuransi Kredit Askrindo (Hilangkan ambiguitas 0% vs 55%)
  const effectiveCovPct = (m.score < 50 || m.gp23 < 0 || m.cashGapAtSCFMaturity_Actual > 30) ? 55 : (m.recCoveragePct || 70);
  const maxCoverNominal = proj.requestedPlafond * (effectiveCovPct / 100);
  const bankRiskSharingNominal = proj.requestedPlafond - maxCoverNominal;
  mitigations.push({
    title: `Rekomendasi Porsi Coverage Asuransi Kredit Askrindo Dibatasi Maksimal ${effectiveCovPct}% (${fmtRp(maxCoverNominal, true)})`,
    detail: `Porsi penutupan risiko asuransi kredit oleh Askrindo dibatasi maksimal <strong>${effectiveCovPct}% (${fmtRp(maxCoverNominal, true)})</strong>. Sisa <strong>${100 - effectiveCovPct}% (${fmtRp(bankRiskSharingNominal, true)})</strong> wajib menjadi porsi <em>risk sharing</em> yang ditanggung oleh ${proj.bankName} guna memastikan bank mitra memiliki kepentingan bersama (<em>skin in the game</em>) dalam memantau kelancaran usaha debitur.`
  });

  // Jaminan Tambahan: Minimal 120% (Melengkapi Agunan Pokok)
  const minCollateralVal = proj.requestedPlafond * 1.2;
  const curPrimaryVal = (typeof proj.collateralPrimaryVal === 'number' && proj.collateralPrimaryVal > 0) ? proj.collateralPrimaryVal : (proj.fin23?.inv || 0);
  const curAdditionalVal = (typeof proj.collateralAdditionalVal === 'number' && proj.collateralAdditionalVal > 0) ? proj.collateralAdditionalVal : (proj.fin23?.fa || 0);
  const curPrimaryLabel = proj.collateralPrimaryType || 'Persediaan Barang';
  const curAdditionalLabel = proj.collateralAdditionalType || 'Fixed Asset (Tanah / Bangunan / Mesin)';
  const curAdditionalBinding = proj.collateralAdditionalBinding || 'Hak Tanggungan (HT) Peringkat I';
  mitigations.push({
    title: `Jaminan Tambahan (${curAdditionalLabel}) Minimal 120% Plafond (${fmtRp(minCollateralVal, true)})`,
    detail: `Kewajiban pengikatan <strong>Jaminan Tambahan (${curAdditionalLabel}) bersertifikat minimal 120% dari total plafond kredit (${fmtRp(minCollateralVal, true)})</strong> yang diikat ${curAdditionalBinding} dari nilai agunan terdaftar (${fmtRp(curAdditionalVal, true)}) yang berstatus <em>free & clear</em>, guna melengkapi Agunan Pokok berupa ${curPrimaryLabel} (${fmtRp(curPrimaryVal, true)}) yang diikat ${proj.collateralPrimaryBinding || 'Fidusia / CMA'}.`
  });

  requiredInfos.push({
    title: `Daftar & Penilaian Appraisal Agunan Free & Clear (${fmtRp(curAdditionalVal, true)})`,
    detail: `Underwriter wajib meminta laporan appraisal independen terbaru atas Jaminan Tambahan debitur (${fmtRp(curAdditionalVal, true)}) guna memastikan kecukupan nilai pasar jaminan tambahan minimal 120% (${fmtRp(minCollateralVal, true)}) yang bebas sengketa.`
  });

  return { criticalPointsFin, criticalPointsCredit, requiredInfos, mitigations };
}

// ============================================================================
// 7. RENDER TAB 4: KETAHANAN NWC & CASH BURN-RATE TEST (MODUL BARU)
// ============================================================================
function renderBurnRateTab(proj, m) {
  const container = document.getElementById('burnRateMenuContainer');
  if (!container) return;
  if (!m || !m.hasFinancials) {
    container.innerHTML = getFinEmptyStateHTML('Modul NWC & CBRT Belum Aktif', 'Kalkulasi Gross Cash Burn, Pure Cash Runway, dan NWC Financing Gap membutuhkan data laporan keuangan (Neraca & Laba Rugi). Silakan input data terlebih dahulu.');
    return;
  }

  const runwayStatusColor = m.pureCashRunwayMonths >= 2.0 ? '#166534' : (m.pureCashRunwayMonths >= 1.0 ? '#92400e' : '#991b1b');
  const runwayStatusBg = m.pureCashRunwayMonths >= 2.0 ? '#f0fdf4' : (m.pureCashRunwayMonths >= 1.0 ? '#fffbeb' : '#fef2f2');

  container.innerHTML = `
    <div class="card" style="border-left: 4px solid var(--askrindo-cyan);">
      <div class="card-header">
        <div class="card-title">Modul Analisis Ketahanan Modal Kerja Bersih &amp; Cash Burn-Rate Test (${proj.companyName})</div>
        <span class="badge-method" style="background:#e0f2fe; color:#0369a1;">Stress-Tested Liquidity Runway &amp; NWC Financing Gap</span>
      </div>

      <!-- 4 TOP METRIC CARDS BURN RATE -->
      <div class="grid-4" style="margin-bottom:0.6rem;">
        <div class="kpi-card ${m.pureCashRunwayMonths >= 1.5 ? 'kpi-green' : 'kpi-red'}">
          <div class="kpi-label">Gross Cash Burn Harian &amp; Bulanan</div>
          <div class="kpi-value">${fmtRp(m.dailyGrossCashBurn)} / hr</div>
          <div class="kpi-sub">
            <span>Bulanan: ${fmtRp(m.monthlyGrossCashBurn, true)}</span>
            <span style="font-weight:700;">HPP+OPEX+Bunga</span>
          </div>
        </div>

        <div class="kpi-card ${m.pureCashRunwayMonths >= 1.5 ? 'kpi-green' : 'kpi-red'}">
          <div class="kpi-label">Pure Cash Runway (Zero Revenue Freeze)</div>
          <div class="kpi-value">${fmtNum(m.pureCashRunwayMonths, 1)} Bulan</div>
          <div class="kpi-sub">
            <span>Kas: ${fmtRp(proj.fin23.cash, true)}</span>
            <span style="font-weight:700; color:${runwayStatusColor};">${fmtNum(m.pureCashRunwayDays, 0)} Hari Bertahan</span>
          </div>
        </div>

        <div class="kpi-card ${m.quickAssetRunwayMonths >= 2.5 ? 'kpi-green' : 'kpi-gold'}">
          <div class="kpi-label">Liquid Working Capital Runway</div>
          <div class="kpi-value">${fmtNum(m.quickAssetRunwayMonths, 1)} Bulan</div>
          <div class="kpi-sub">
            <span>Kas + Piutang Lancar: ${fmtRp(m.liquidQuickAssets, true)}</span>
            <span style="font-weight:700;">${fmtNum(m.quickAssetRunwayDays, 0)} Hari</span>
          </div>
        </div>

        <div class="kpi-card ${!m.isNWCDeficit ? 'kpi-green' : 'kpi-red'}">
          <div class="kpi-label">NWC Financing Gap per 1 Siklus Gross</div>
          <div class="kpi-value" style="color:${!m.isNWCDeficit ? '#166534' : '#dc2626'};">
            ${m.isNWCDeficit ? 'Defisit ' : 'Surplus '}${fmtRp(m.nwcFinancingGap, true)}
          </div>
          <div class="kpi-sub">
            <span>Butuh: ${fmtRp(m.wcRequiredPerCycle, true)}</span>
            <span style="font-weight:700;">Siklus: ${fmtNum(m.grossCycle23, 0)} hr</span>
          </div>
        </div>
      </div>

      <!-- VISUAL RUNWAY METER -->
      <div class="burn-meter-box">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.73rem; font-weight:700;">
          <span>Visualisasi Ketahanan Kas Bersih (Runway Meter) terhadap Batas Aman Askrindo (Minimal 2 Bulan / 60 Hari)</span>
          <span style="color:${runwayStatusColor};">${m.pureCashRunwayMonths >= 2.0 ? '&#10003; Buffer Kas Aman' : (m.pureCashRunwayMonths >= 1.0 ? '&#9888; Buffer Kas Menipis' : 'Runway Kritis (<30 Hari)')}</span>
        </div>
        <div class="burn-track">
          <div style="width:${Math.min(100, Math.max(5, (m.pureCashRunwayMonths / 4.0) * 100))}%; background:${runwayStatusColor}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.65rem; font-weight:700;">
            ${fmtNum(m.pureCashRunwayMonths, 1)} Bln (${fmtNum(m.pureCashRunwayDays, 0)} Hari)
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.64rem; color:var(--text-muted);">
          <span>0 Hari (Kas Habis)</span>
          <span>30 Hari (1 Bulan - Batas Darurat)</span>
          <span>60 Hari (2 Bulan - Batas Aman Standar)</span>
          <span>90+ Hari (3+ Bulan - Sangat Kuat)</span>
        </div>
      </div>

      <!-- INTERACTIVE STRESS TEST RUNWAY SIMULATOR -->
      <div class="grid-2">
        <div style="background:#fff; border:1px solid var(--border-color); border-radius:6px; padding:0.6rem;">
          <div style="font-weight:700; font-size:0.75rem; color:var(--askrindo-navy); margin-bottom:0.4rem;">
            &#9888; Simulator Uji Stress Ketahanan Kas &amp; Pembekuan Piutang
          </div>

          <div class="slider-row">
            <div class="slider-top">
              <span>Kenaikan Biaya Operasional / Inflasi HPP (%)</span>
              <span class="slider-val" id="lblBurnOpexGrowth">+${m.stressOpexGrowth}%</span>
            </div>
            <input type="range" min="0" max="50" step="5" value="${m.stressOpexGrowth}" oninput="updateBurnStressOpex(this.value)" />
            <div class="slider-scale"><span>Normal (+0%)</span><span>Kenaikan +25%</span><span>Kenaikan Ekstrem +50%</span></div>
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem; background:#f8fafc; padding:0.45rem 0.6rem; border-radius:5px; border:1px solid var(--border-color); margin-top:0.4rem;">
            <input type="checkbox" id="chkFreezeCollection" ${m.isFreezeCollection ? 'checked' : ''} onchange="toggleFreezeCollection(this.checked)" style="width:16px; height:16px; accent-color:#dc2626; cursor:pointer;" />
            <label for="chkFreezeCollection" style="font-size:0.71rem; font-weight:600; cursor:pointer; color:#991b1b;">
              Simulasi Gagal Tagih / Pembeli Menunda Bayar (Collection Freeze)  -  Hanya Mengandalkan Kas Riil di Rekening
            </label>
          </div>
        </div>

        <div style="background:${runwayStatusBg}; border:1.5px solid ${runwayStatusColor}; border-radius:6px; padding:0.6rem; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-size:0.68rem; font-weight:700; text-transform:uppercase; color:${runwayStatusColor};">Hasil Uji Stress Runway Kas</div>
            <div style="font-size:1.15rem; font-weight:900; color:${runwayStatusColor}; margin:0.15rem 0;">
              ${fmtNum(m.stressedRunwayMonths, 1)} Bulan (${fmtNum(m.stressedRunwayDays, 0)} Hari)
            </div>
            <div style="font-size:0.71rem; color:#1e293b; line-height:1.4;">
              Stressed Cash Burn Rate: <strong>${fmtRp(m.stressedDailyBurn)} / hari</strong> (${fmtRp(m.stressedDailyBurn * 30.4, true)} / bulan).
              Dana likuid penyerap shock: <strong>${fmtRp(m.stressedLiquidFunds, true)}</strong>.
            </div>
          </div>
          <div style="font-size:0.68rem; color:${runwayStatusColor}; font-weight:700; border-top:1px dashed ${runwayStatusColor}; padding-top:0.35rem; margin-top:0.35rem;">
            ${m.stressedRunwayMonths < 1.0 ? 'Kesimpulan: Debitur tidak memiliki ketahanan likuiditas yang cukup. Wajib ada fasilitas standby line atau jaminan kas.' : '&#10003; Kesimpulan: Debitur memiliki ketahanan likuiditas yang cukup menyerap keterlambatan arus kas.'}
          </div>
        </div>
      </div>

      <!-- TABEL RINCIAN BEDAH ARUS KAS KELUAR & NWC GAP -->
      <div class="table-responsive" style="margin-top:0.6rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Komponen Modal Kerja &amp; Burn Rate</th>
              <th>Dasar Perhitungan</th>
              <th class="num-col">Nilai / Hari</th>
              <th class="num-col">Nilai / Bulan</th>
              <th>Evaluasi Underwriter Askrindo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Beban Pokok Penjualan Harian (Daily COGS)</strong></td>
              <td>HPP ${m.yr2} (${fmtRp(proj.fin23.cogs, true)}) / 365</td>
              <td class="num-col"><strong>${fmtRp(m.dailyCOGS23)}</strong></td>
              <td class="num-col">${fmtRp(m.dailyCOGS23 * 30.4, true)}</td>
              <td>Pengeluaran bahan baku &amp; proses produksi harian</td>
            </tr>
            <tr>
              <td><strong>Beban Operasional Harian (Daily OPEX)</strong></td>
              <td>Beban Umum &amp; Admin (${fmtRp(proj.fin23.opex, true)}) / 365</td>
              <td class="num-col"><strong>${fmtRp(m.dailyOPEX23)}</strong></td>
              <td class="num-col">${fmtRp(m.dailyOPEX23 * 30.4, true)}</td>
              <td>Gaji, listrik, gudang, dan logistik rutin</td>
            </tr>
            <tr>
              <td><strong>Estimasi Beban Bunga Harian</strong></td>
              <td>Bunga Utang Bank Eksisting + Kredit Baru @ ${proj.interestRate}%</td>
              <td class="num-col"><strong>${fmtRp(m.dailyInterest23)}</strong></td>
              <td class="num-col">${fmtRp(m.dailyInterest23 * 30.4, true)}</td>
              <td>Kewajiban perbankan yang harus disetor tepat waktu</td>
            </tr>
            <tr style="background:#f1f5f9; font-weight:700;">
              <td><strong>TOTAL GROSS CASH BURN RATE</strong></td>
              <td>Daily COGS + Daily OPEX + Daily Bunga</td>
              <td class="num-col" style="color:#0a2540;"><strong>${fmtRp(m.dailyGrossCashBurn)}</strong></td>
              <td class="num-col" style="color:#0a2540;"><strong>${fmtRp(m.monthlyGrossCashBurn, true)}</strong></td>
              <td>Total kebutuhan kas keluar riil debitur</td>
            </tr>
            <tr>
              <td><strong>Net Working Capital Riil (Aset Lancar  -  Liabilitas Lancar)</strong></td>
              <td>${fmtRp(m.ca23, true)}  -  ${fmtRp(m.cl23, true)}</td>
              <td colspan="2" class="num-col"><strong>${fmtRp(m.nwc23)}</strong></td>
              <td>${m.nwc23 > 0 ? 'Positif (Aset lancar melampaui utang lancar)' : 'Negatif (Tekanan utang lancar)'}</td>
            </tr>
            <tr>
              <td><strong>Kebutuhan Modal Kerja 1 Siklus Penuh (${fmtNum(m.grossCycle23, 0)} Hari)</strong></td>
              <td>Daily Burn (${fmtRp(m.dailyGrossCashBurn)}) &times; (${fmtNum(m.grossCycle23, 0)} hari siklus gross)</td>
              <td colspan="2" class="num-col" style="font-weight:700;">${fmtRp(m.wcRequiredPerCycle)}</td>
              <td>Total biaya operasional yang harus ditalangi per siklus batch</td>
            </tr>
            <tr style="background:${!m.isNWCDeficit ? '#f0fdf4' : '#fef2f2'}; font-weight:800;">
              <td><strong>FINANCING GAP MODAL KERJA (KMK DEFICIT / SURPLUS)</strong></td>
              <td>NWC Riil  -  Kebutuhan 1 Siklus</td>
              <td colspan="2" class="num-col" style="color:${!m.isNWCDeficit ? '#166534' : '#dc2626'}; font-size:0.8rem;">
                ${m.isNWCDeficit ? 'DEFISIT ' : 'SURPLUS '} ${fmtRp(m.nwcFinancingGap)}
              </td>
              <td style="color:${!m.isNWCDeficit ? '#166534' : '#dc2626'};">
                ${m.isNWCDeficit ? `Debitur defisit modal kerja ${fmtRp(Math.abs(m.nwcFinancingGap), true)} untuk memutar barang hingga kas cair!` : 'Modal kerja internal surplus mencukupi perputaran 1 siklus.'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function updateBurnStressOpex(val) {
  const proj = getActiveProject();
  if (!proj) return;
  proj.burnStressOpexGrowth = parseFloat(val) || 0;
  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);
  renderBurnRateTab(proj, m);
}

function toggleFreezeCollection(checked) {
  const proj = getActiveProject();
  if (!proj) return;
  proj.burnStressCollectionFreeze = checked;
  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);
  renderBurnRateTab(proj, m);
}

// ============================================================================
// 8. RENDER GRADE RISK TAB
// ============================================================================
function renderGradeRiskTab(proj, m) {
  const container = document.getElementById('gradeRiskMenuContainer');
  if (!container) return;
  if (!m || !m.hasFinancials) {
    container.innerHTML = getFinEmptyStateHTML('Penentuan Rating Akseptasi Belum Tersedia', 'Rating Akseptasi Askrindo (AAA hingga DDD - Petunjuk Teknis Akseptasi Surety Bond / PT IDX Consulting) dan skor kelayakan kredit akan dikalkulasikan secara otomatis setelah Anda melengkapi data laporan keuangan.');
    return;
  }

  const negativeDrivers = m.scoreComponents.filter((c) => c.lostPts >= c.maxPts * 0.35);
  const positiveDrivers = m.scoreComponents.filter((c) => c.earnedPts >= c.maxPts * 0.65);

  const stepperHTML = ASKRINDO_GRADE_CATALOG.map((g) => {
    const isActive = g.grade === m.shortGrade;
    return `
      <div class="grade-step-box ${isActive ? 'active-grade' : ''}" style="background:${isActive ? g.bg : '#f8fafc'}; border-color:${isActive ? g.color : '#e2e8f0'};">
        <div style="font-size:0.92rem; font-weight:900; color:${g.color};">${g.grade}</div>
        <div style="font-size:0.62rem; font-weight:700; color:#334155;">${g.scoreRange}</div>
        <div style="font-size:0.6rem; color:#64748b; margin-top:2px;">${g.name}</div>
        ${isActive ? `<div style="margin-top:2px; font-size:0.58rem; font-weight:800; background:${g.color}; color:#fff; border-radius:3px; padding:1px 3px;">POSISI SAAT INI</div>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="card" style="border-left: 4px solid ${m.gradeMeta.color};">
      <div class="card-header">
        <div class="card-title">Menu Penentuan Rating Akseptasi Askrindo &amp; Indikator Penyebabnya (${proj.companyName})</div>
        <button class="btn btn-primary btn-sm" onclick="switchTab('tab-score')">Lihat Rincian Perhitungan Score (${m.score}/100)  + </button>
      </div>

      <div class="grade-scale-bar">
        ${stepperHTML}
      </div>

      <div style="background:${m.gradeMeta.bg}; border:1.5px solid ${m.gradeMeta.color}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.6rem; display:grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; gap:0.55rem; align-items:center;">
        <div>
          <div style="font-size:0.66rem; text-transform:uppercase; font-weight:700; color:${m.gradeMeta.color};">Hasil Penetapan Rating Akseptasi</div>
          <div style="font-size:1.1rem; font-weight:900; color:${m.gradeMeta.color};">RATING ${m.riskGrade}</div>
          <div style="font-size:0.68rem; color:#1e293b;">Skor Komposit: <strong>${m.score} / 100</strong> (${fmtNum(m.totalRawScore, 1)} Poin)</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Maksimal Coverage Asuransi Kredit</div>
          <div style="font-size:0.92rem; font-weight:800; color:#0f172a;">${m.isInitialReject ? `Maks ${m.recCoveragePct || (m.gradeMeta && m.gradeMeta.maxCoverage) || 50}% (Apabila Disetujui)` : `${m.recCoveragePct || 70}% Plafond`}</div>
          <div style="font-size:0.63rem; color:#64748b;">Risk Sharing Bank: ${100 - (m.recCoveragePct || (m.isInitialReject ? 50 : 70))}% ${m.isInitialReject ? '(Apabila Disetujui)' : ''}</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Indikasi Rate IJP Askrindo</div>
          <div style="font-size:0.82rem; font-weight:800; color:var(--askrindo-blue);">${m.ijpRate}</div>
          <div style="font-size:0.63rem; color:#64748b;">${m.isInitialReject ? 'Skema awal berisiko tinggi; penjaminan membutuhkan mitigasi restrukturisasi komite' : 'Berdasarkan profil risiko siklus kas'}</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Rekomendasi Keputusan Komite</div>
          <div style="font-size:0.74rem; font-weight:800; color:${m.gradeMeta.color};">${m.decision}</div>
        </div>
      </div>

      ${m.hasKnockOutCap ? `
      <div style="background:#fef2f2; border:1px solid #fca5a5; border-left:4px solid #dc2626; padding:0.45rem 0.65rem; border-radius:6px; margin-bottom:0.6rem; font-size:0.71rem; color:#991b1b;">
        &#9888; <strong>Aturan Veto / Hard-Cap Grade Underwriting Aktif:</strong> Karena debitur mengalami <strong>Gross Loss (${fmtPct(m.gpm23)})</strong> sekaligus <strong>Mismatch Tenor Berat (Siklus Gross ${fmtNum(m.grossCycle23, 1)} hr > Tenor ${m.scfTenor} hr)</strong>, maka Risk Grade otomatis terkunci maksimal pada zona <strong>Precautionary / High Risk (CCC / Score &le; 55)</strong> hingga struktur transaksi dimodifikasi menjadi <em>Ring-Fenced Self-Liquidating</em>.
      </div>` : ''}

      <div class="grid-2" style="margin-bottom:0.6rem;">
        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:0.6rem;">
          <div style="font-weight:800; color:#991b1b; font-size:0.76rem; margin-bottom:0.35rem; display:flex; justify-content:space-between;">
            <span>Indikator Penyebab Turunnya Grade (${negativeDrivers.length} Faktor)</span>
            <span>Penalti: -${fmtNum(m.totalLostPoints, 1)} Poin</span>
          </div>
          ${negativeDrivers.length === 0
            ? `<div style="font-size:0.71rem; color:#166534; padding:0.35rem;">&#10003; Tidak ada indikator penekan material. Seluruh rasio berada dalam batas sehat.</div>`
            : `<div style="display:flex; flex-direction:column; gap:0.3rem;">
                ${negativeDrivers.map((d) => `
                  <div style="background:#fff; padding:0.38rem 0.5rem; border-radius:5px; border-left:3px solid #dc2626; font-size:0.69rem;">
                    <div style="display:flex; justify-content:space-between; font-weight:700; color:#991b1b;">
                      <span>[${d.code}] ${d.name}</span>
                      <span>-${fmtNum(d.lostPts, 1)} Poin</span>
                    </div>
                    <div style="color:#334155; margin-top:2px;">
                      <strong>Aktual:</strong> ${d.actualStr} <em>(Standar: ${d.benchmark})</em>  -  ${d.reason}
                    </div>
                  </div>
                `).join('')}
              </div>`
          }
        </div>

        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.6rem;">
          <div style="font-weight:800; color:#166534; font-size:0.76rem; margin-bottom:0.35rem; display:flex; justify-content:space-between;">
            <span>Indikator Penopang / Penguat Grade (${positiveDrivers.length} Faktor)</span>
            <span>Diperoleh: +${fmtNum(m.totalRawScore, 1)} Poin</span>
          </div>
          ${positiveDrivers.length === 0
            ? `<div style="font-size:0.71rem; color:#991b1b; padding:0.35rem;">&#9888; Sangat sedikit indikator positif yang menopang grade saat ini.</div>`
            : `<div style="display:flex; flex-direction:column; gap:0.3rem;">
                ${positiveDrivers.map((d) => `
                  <div style="background:#fff; padding:0.38rem 0.5rem; border-radius:5px; border-left:3px solid #166534; font-size:0.69rem;">
                    <div style="display:flex; justify-content:space-between; font-weight:700; color:#166534;">
                      <span>[${d.code}] ${d.name}</span>
                      <span>+${fmtNum(d.earnedPts, 1)} Poin</span>
                    </div>
                    <div style="color:#334155; margin-top:2px;">
                      <strong>Aktual:</strong> ${d.actualStr} <em>(Standar: ${d.benchmark})</em>  -  ${d.reason}
                    </div>
                  </div>
                `).join('')}
              </div>`
          }

          <div style="margin-top:0.5rem; background:#fff; padding:0.45rem 0.55rem; border-radius:6px; border:1px solid #cbd5e1;">
            <div style="font-weight:700; font-size:0.71rem; color:var(--askrindo-navy); margin-bottom:0.25rem;">
              &#9888; Penetapan / Override Rating Akseptasi oleh Underwriter (Opsional):
            </div>
            <div class="grid-2" style="gap:0.35rem;">
              <div>
                <label style="font-size:0.64rem; font-weight:600;">Pilih Mode Penentuan Rating:</label>
                <select class="form-control" onchange="setManualGradeOverride(this.value)">
                  <option value="AUTO" ${(!proj.manualGradeOverride || proj.manualGradeOverride === 'AUTO') ? 'selected' : ''}>Otomatis Sistem DCC-SWCM (Skor ${m.score})</option>
                  ${ASKRINDO_GRADE_CATALOG.map((g) => `
                    <option value="${g.grade}" ${proj.manualGradeOverride === g.grade ? 'selected' : ''}>Override Manual ke Rating ${g.grade} (${g.name})</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label style="font-size:0.64rem; font-weight:600;">Alasan Override / Catatan Komite:</label>
                <input type="text" class="form-control" placeholder="Misal: Cash Collateral / Corporate Guarantee..." value="${proj.overrideReason || ''}" oninput="setOverrideReason(this.value)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Tabel VI.1 Rating Akseptasi (Petunjuk Teknis Akseptasi Surety Bond | ASKRINDO Insurance)</div>
          <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">Sumber: Internal Credit Rating PT. IDX Consulting</div>
        </div>
        <span style="font-size:0.66rem; color:var(--text-muted);">Baris berwarna menunjukkan posisi Rating kasus aktif</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width:90px;">Score</th>
              <th style="min-width:65px;">Rating</th>
              <th style="min-width:130px;">Kategori</th>
              <th>Deskripsi Karakteristik Risiko</th>
              <th class="num-col" style="min-width:85px;">Maks Coverage</th>
              <th style="min-width:130px;">Indikasi Tarif IJP</th>
              <th style="min-width:160px;">Rekomendasi Keputusan</th>
            </tr>
          </thead>
          <tbody>
            ${ASKRINDO_GRADE_CATALOG.map((g) => {
              const active = g.grade === m.shortGrade;
              return `
                <tr style="${active ? `background:${g.bg}; font-weight:700; border-left:4px solid ${g.color};` : ''}">
                  <td><strong>${g.scoreRange}</strong></td>
                  <td><span class="grade-badge ${g.badgeCls}">${g.grade}</span> ${active ? '&#10003;' : ''}</td>
                  <td><strong>${g.name}</strong></td>
                  <td style="font-size:0.73rem; line-height:1.4;">${g.criteriaSummary}</td>
                  <td class="num-col"><strong>${g.maxCoverage > 0 ? `${g.maxCoverage}%` : '0% (Ditolak)'}</strong></td>
                  <td>${g.ijpRate}</td>
                  <td style="color:${g.color}; font-weight:700;">${g.decision}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setManualGradeOverride(val) {
  const proj = getActiveProject();
  if (!proj) return;
  proj.manualGradeOverride = val;
  saveProjectsToStorage();
  renderAll();
  showToast(val === 'AUTO' ? 'Rating Akseptasi kembali ke perhitungan otomatis.' : `Rating Akseptasi di-override ke Rating ${val}.`);
}

function setOverrideReason(val) {
  const proj = getActiveProject();
  if (!proj) return;
  proj.overrideReason = val;
  saveProjectsToStorage();
}

// ============================================================================
// 8B. RENDER TAB 5C: ANALISA KUALITATIF 5C UNDERWRITING (AI 5C CREDIT ENGINE)
// ============================================================================
// ============================================================================
// 8B. RENDER TAB 5C: ANALISA KUALITATIF 5C UNDERWRITING (47 PARAMETER RESMI)
// ============================================================================

function updateCharacterParam(paramKey, val) {
  const proj = getActiveProject();
  if (!proj) return;
  proj[paramKey] = val;
  if (paramKey === 'negativeNews' && Array.isArray(proj.googleNewsItems) && proj.googleNewsItems.length > 0) {
    if (val === 'clean') {
      proj.googleNewsItems.forEach((it) => {
        if (it.status === 'negative') it.status = 'clean';
      });
    } else if (val === 'negative' && !proj.googleNewsItems.some((it) => it.status === 'negative')) {
      proj.googleNewsItems[0].status = 'negative';
    }
  }
  saveProjectsToStorage();
  renderAll();
  const labelMap = {
    defaultHistory: 'Riwayat Wanprestasi',
    negativeNews: 'Pemberitaan Media',
    inaprocStatus: 'INAPROC LKPP',
    sippStatus: 'SIPP Pengadilan',
    slikStatus: 'SLIK OJK'
  };
  const label = labelMap[paramKey] || paramKey;
  showToast(`Parameter Character (${label}) berhasil diperbarui!`);
}

function update5CParameter(paramId, optKey) {
  const proj = getActiveProject();
  if (!proj) return;
  if (!proj.fiveCOverrides) proj.fiveCOverrides = {};
  proj.fiveCOverrides[paramId] = optKey;
  saveProjectsToStorage();
  renderAll();
  const param = ASKRINDO_5C_CATALOG.find((p) => p.id === paramId);
  const paramName = param ? param.name : paramId;
  const opt = param ? param.options.find((o) => o.key === optKey) : null;
  const score = opt ? opt.score : 0;
  showToast(`Parameter #${param ? param.num : ''} (${paramName}) disesuaikan: Opsi ${optKey} (${score} Poin)`);
}

function reset5CParameterToAuto(paramId) {
  const proj = getActiveProject();
  if (!proj || !proj.fiveCOverrides) return;
  delete proj.fiveCOverrides[paramId];
  saveProjectsToStorage();
  renderAll();
  const param = ASKRINDO_5C_CATALOG.find((p) => p.id === paramId);
  showToast(`Parameter #${param ? param.num : ''} (${param ? param.name : paramId}) dikembalikan ke otomatis sistem.`);
}

function resetAll5CParametersToAuto() {
  const proj = getActiveProject();
  if (!proj) return;
  proj.fiveCOverrides = {};
  saveProjectsToStorage();
  renderAll();
  showToast('Seluruh 39 parameter Analisa 5C berhasil dikembalikan ke perhitungan otomatis sistem!');
}

let active5CCategoryFilter = 'all';

function filter5CTable(category) {
  if (category) {
    active5CCategoryFilter = category;
  }
  const searchInput = document.getElementById('inp_search5c');
  const query = (searchInput?.value || '').toLowerCase().trim();

  document.querySelectorAll('.filter-pill-5c').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.cat === active5CCategoryFilter);
  });

  const rows = document.querySelectorAll('.row-5c-param');
  let visibleCount = 0;
  rows.forEach((row) => {
    const rowCat = row.dataset.category;
    const rowText = (row.dataset.search || '').toLowerCase();
    const matchCat = active5CCategoryFilter === 'all' || rowCat === active5CCategoryFilter;
    const matchQuery = !query || rowText.includes(query);
    if (matchCat && matchQuery) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  const countBadge = document.getElementById('countVisible5CParams');
  if (countBadge) {
    countBadge.textContent = `Menampilkan ${visibleCount} dari 39 Parameter`;
  }
}

function render5CTab(proj, m) {
  const container = document.getElementById('fiveCMenuContainer');
  if (!container) return;
  if (!m || !m.hasFinancials) {
    container.innerHTML = getFinEmptyStateHTML('Evaluasi Prinsip 5C Belum Lengkap', 'Pilar Capacity, Capital, Collateral, dan Condition memerlukan data laporan keuangan untuk penilaian kuantitatif. Silakan isi laporan keuangan terlebih dahulu.');
    return;
  }

  ensureInaprocAutoChecked(proj);
  ensureGoogleNewsInitialized(proj);
  const fiveC = m.fiveC || compute5CAnalysis(proj, proj.fin23, m);

  const cleanCompName = (proj.companyName || 'PT').replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
  const safeCompName = (proj.companyName || 'PT').replace(/'/g, "\\'");
  const newsItems = Array.isArray(proj.googleNewsItems) ? proj.googleNewsItems : [];
  const accessedAt = proj.googleNewsAccessedAt || formatGoogleNewsAccessedDate(new Date());
  const inaprocRes = proj.inaprocAutoResult || {
    status: proj.inaprocStatus || 'clean',
    queryName: cleanCompName,
    checkedAt: accessedAt,
    skNumber: proj.inaprocStatus === 'blacklisted' ? 'SK-PA/LKPP-DH/2025/0104' : '-',
    sanctionPeriod: proj.inaprocStatus === 'blacklisted' ? 'Aktif (Sanksi Tayang di Portal INAPROC)' : 'Nihil (0 Sanksi Aktif)',
    portalUrl: `https://daftar-hitam.inaproc.id/?search=${encodeURIComponent(cleanCompName)}`,
    summary: proj.inaprocStatus === 'blacklisted'
      ? `Sistem mendeteksi otomatis entitas "${cleanCompName}" masuk dalam Daftar Hitam Nasional LKPP (0 / 15 Poin).`
      : `Hasil pemindaian otomatis ke Portal Daftar Hitam INAPROC untuk "${cleanCompName}": Tidak ditemukan catatan sanksi aktif (Bersih - 15 / 15 Poin).`
  };

  const gradeMeta = getGradeMetadataByScore(fiveC.totalScore);
  const catScores = fiveC.categoryScores || { character: 80, capacity: 80, capability: 80, condition: 80, collateral: 80 };
  const catWeighted = fiveC.categoryWeighted || { character: 24.6, capacity: 24.6, capability: 7.4, condition: 11.1, collateral: 12.3 };

  const getScoreColor = (sc) => {
    if (sc >= 80) return '#10b981';
    if (sc >= 60) return '#0284c7';
    if (sc >= 40) return '#d97706';
    return '#dc2626';
  };

  container.innerHTML = `
    <div class="card" style="border-left: 4px solid var(--askrindo-navy);">
      <div class="card-header">
        <div>
          <div class="card-title">Modul Analisa 5C Underwriting (${proj.companyName})</div>
          <p style="font-size:0.71rem; color:var(--text-muted); margin:0.15rem 0 0;">
            Model Evaluasi 39-Parameter Kualitatif &amp; Operasional 5C Underwriting Askrindo (Character, Capacity, Capability, Condition, Collateral). Untuk analisa rasio keuangan, silakan lihat tab Rasio Keuangan.
          </p>
        </div>
        <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
          <span class="grade-badge ${gradeMeta.badgeCls}" style="font-size:0.75rem; padding:3px 10px;">
            Rating 5C: ${gradeMeta.grade} (${gradeMeta.name})
          </span>
          <span style="font-size:0.75rem; font-weight:800; background:#f0fdf4; color:#15803d; padding:3px 10px; border-radius:6px; border:1px solid #bbf7d0;">
            Skor 5C Terpadu: ${fiveC.totalScore} / 100
          </span>
          <span style="font-size:0.7rem; font-weight:800; background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; border:1px solid #bae6fd;">
            Pilar 2 ASCA: ${fiveC.totalScore10} / 10 Poin
          </span>
          <button class="btn btn-outline btn-sm" onclick="resetAll5CParametersToAuto()" title="Reset seluruh 39 parameter ke kalkulasi otomatis data">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Reset ke Otomatis Sistem
          </button>
        </div>
      </div>

      <!-- 5 CATEGORY EXECUTIVE SUMMARY CARDS -->
      <div class="fivec-summary-grid">
        <!-- 1. Character -->
        <div class="fivec-cat-card" style="border-top: 3.5px solid #0284c7;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:800; color:var(--askrindo-navy);">1. Character (30.8%)</span>
              <span style="font-size:0.78rem; font-weight:800; color:${getScoreColor(catScores.character)};">${catScores.character} / 100</span>
            </div>
            <div style="font-size:0.67rem; color:var(--text-muted); margin-top:2px;">
              Kontribusi Tertimbang: <strong>${catWeighted.character.toFixed(2)}</strong> / 30.77 Poin (16 Parameter)
            </div>
            <div class="fivec-progress-track">
              <div class="fivec-progress-fill" style="width:${catScores.character}%; background:${getScoreColor(catScores.character)};"></div>
            </div>
            <div style="font-size:0.64rem; color:#475569; line-height:1.4;">
              &bull; Usaha: <strong>${fiveC.businessAge} Thn (${fiveC.estYr})</strong><br/>
              &bull; SLIK: <strong>${fiveC.slikStatus}</strong><br/>
              &bull; LKPP: <strong style="color:${proj.inaprocStatus === 'blacklisted' ? '#dc2626' : '#166534'};">${fiveC.inaprocStatus}</strong><br/>
              &bull; SIPP: <strong>${fiveC.sippStatus}</strong>
            </div>
          </div>
        </div>

        <!-- 2. Capacity -->
        <div class="fivec-cat-card" style="border-top: 3.5px solid #6366f1;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:800; color:var(--askrindo-navy);">2. Capacity (30.8%)</span>
              <span style="font-size:0.78rem; font-weight:800; color:${getScoreColor(catScores.capacity)};">${catScores.capacity} / 100</span>
            </div>
            <div style="font-size:0.67rem; color:var(--text-muted); margin-top:2px;">
              Kontribusi Tertimbang: <strong>${catWeighted.capacity.toFixed(2)}</strong> / 30.77 Poin (4 Parameter)
            </div>
            <div class="fivec-progress-track">
              <div class="fivec-progress-fill" style="width:${catScores.capacity}%; background:${getScoreColor(catScores.capacity)};"></div>
            </div>
            <div style="font-size:0.64rem; color:#475569; line-height:1.4;">
              &bull; ARTO vs APTO: <strong>DOR ${m.dor23_365.toFixed(0)} hr vs DOP ${m.dop23_365.toFixed(0)} hr</strong><br/>
              &bull; Modal Sendiri: <strong>Self Financing Aktiva</strong><br/>
              &bull; Cash Flow Proyek: <strong>${(m.cfProj?.annualDSCR || 1.2) >= 1.0 ? 'Profit Menutup Angsuran' : 'Arus Kas Defisit'}</strong><br/>
              &bull; Kesehatan Keuangan: <strong>${(proj.fin23?.eat || 0) >= 0 ? 'Laba Positif' : 'Rugi'}</strong>
            </div>
          </div>
        </div>

        <!-- 3. Capability -->
        <div class="fivec-cat-card" style="border-top: 3.5px solid #f59e0b;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:800; color:var(--askrindo-navy);">3. Capability (9.2%)</span>
              <span style="font-size:0.78rem; font-weight:800; color:${getScoreColor(catScores.capability)};">${catScores.capability} / 100</span>
            </div>
            <div style="font-size:0.67rem; color:var(--text-muted); margin-top:2px;">
              Kontribusi Tertimbang: <strong>${catWeighted.capability.toFixed(2)}</strong> / 9.23 Poin (3 Parameter)
            </div>
            <div class="fivec-progress-track">
              <div class="fivec-progress-fill" style="width:${catScores.capability}%; background:${getScoreColor(catScores.capability)};"></div>
            </div>
            <div style="font-size:0.64rem; color:#475569; line-height:1.4;">
              &bull; Tenaga Ahli: <strong>Sesuai Bidang Usaha</strong><br/>
              &bull; Pasokan Supplier: <strong>Kontrak Pasokan Bahan Baku</strong><br/>
              &bull; Rekam Jejak: <strong>Volume Kontrak &gt; 5 Proyek (2 Thn)</strong>
            </div>
          </div>
        </div>

        <!-- 4. Condition -->
        <div class="fivec-cat-card" style="border-top: 3.5px solid #ec4899;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:800; color:var(--askrindo-navy);">4. Condition (13.8%)</span>
              <span style="font-size:0.78rem; font-weight:800; color:${getScoreColor(catScores.condition)};">${catScores.condition} / 100</span>
            </div>
            <div style="font-size:0.67rem; color:var(--text-muted); margin-top:2px;">
              Kontribusi Tertimbang: <strong>${catWeighted.condition.toFixed(2)}</strong> / 13.85 Poin (8 Parameter)
            </div>
            <div class="fivec-progress-track">
              <div class="fivec-progress-fill" style="width:${catScores.condition}%; background:${getScoreColor(catScores.condition)};"></div>
            </div>
            <div style="font-size:0.64rem; color:#475569; line-height:1.4;">
              &bull; Kelangsungan: <strong>Nihil Masalah Ketenagakerjaan</strong><br/>
              &bull; Skema: <strong>${proj.isTakeOverCredit ? 'Kredit Take Over' : 'Kredit Baru'}</strong><br/>
              &bull; NPL Sektor OJK: <strong>${typeof proj.sectorNpl === 'number' ? proj.sectorNpl : '2.4'}% (Sehat)</strong><br/>
              &bull; Cakupan Pasar: <strong>${isMaritimeOrImportRisk(proj) ? 'Impor Valas / Nasional' : 'Distribusi Domestik'}</strong>
            </div>
          </div>
        </div>

        <!-- 5. Collateral -->
        <div class="fivec-cat-card" style="border-top: 3.5px solid #0d9488;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:800; color:var(--askrindo-navy);">5. Collateral (15.4%)</span>
              <span style="font-size:0.78rem; font-weight:800; color:${getScoreColor(catScores.collateral)};">${catScores.collateral} / 100</span>
            </div>
            <div style="font-size:0.67rem; color:var(--text-muted); margin-top:2px;">
              Kontribusi Tertimbang: <strong>${catWeighted.collateral.toFixed(2)}</strong> / 15.38 Poin (8 Parameter)
            </div>
            <div class="fivec-progress-track">
              <div class="fivec-progress-fill" style="width:${catScores.collateral}%; background:${getScoreColor(catScores.collateral)};"></div>
            </div>
            <div style="font-size:0.64rem; color:#475569; line-height:1.4;">
              &bull; Agunan Pokok (Inv): <strong>${fiveC.invRatio.toFixed(0)}%</strong> &bull; Jaminan FA: <strong>${fiveC.faRatio.toFixed(0)}%</strong><br/>
              &bull; Total Coverage: <strong>${(fiveC.invRatio + fiveC.faRatio).toFixed(0)}% Plafond</strong><br/>
              &bull; Pengikatan Yuridis: <strong>${fiveC.primaryBinding}</strong><br/>
              &bull; Reasuransi: <strong>${proj.reinsuranceSupport === 'none' ? 'Belum Ada' : 'Treaty Askrindo'}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- REAL-TIME SCREENING PANELS (LKPP, GOOGLE NEWS, SIPP, SLIK) -->
      <div style="margin-bottom:0.75rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:0.65rem;">
        <!-- 1. INAPROC LKPP CARD -->
        <div style="background:#ffffff; border:1.5px solid ${proj.inaprocStatus === 'blacklisted' ? '#fca5a5' : '#bbf7d0'}; border-radius:8px; padding:0.6rem 0.75rem; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:0.75rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:5px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${proj.inaprocStatus === 'blacklisted' ? '#dc2626' : '#16a34a'};"></span>
              Portal INAPROC LKPP
            </div>
            <a href="https://daftar-hitam.inaproc.id/?search=${encodeURIComponent(cleanCompName)}" target="_blank" rel="noopener noreferrer" style="font-size:0.65rem; color:#0284c7; text-decoration:none; font-weight:700;">
              Buka Portal &raquo;
            </a>
          </div>
          <div style="font-size:0.66rem; color:#475569; line-height:1.4;">
            <div>Entitas: <strong>${cleanCompName}</strong></div>
            <div>Status: <strong style="color:${proj.inaprocStatus === 'blacklisted' ? '#dc2626' : '#166534'};">${inaprocRes.sanctionPeriod}</strong></div>
            <div style="margin-top:4px; font-size:0.62rem; color:#64748b;">
              ${inaprocRes.summary}
            </div>
          </div>
        </div>

        <!-- 2. GOOGLE NEWS CARD -->
        <div style="background:#ffffff; border:1.5px solid ${proj.negativeNews === 'negative' ? '#fca5a5' : '#cbd5e1'}; border-radius:8px; padding:0.6rem 0.75rem; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:0.75rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:5px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${proj.negativeNews === 'negative' ? '#dc2626' : '#16a34a'};"></span>
              Google News Screening
            </div>
            <button type="button" onclick="fetchGoogleNewsForProject(true)" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; font-size:0.62rem; padding:2px 6px; cursor:pointer; font-weight:700;">
              Update Berita
            </button>
          </div>
          <div style="font-size:0.66rem; color:#475569; line-height:1.4;">
            <div>Pencarian: <strong>${cleanCompName}</strong></div>
            <div>Hasil: <strong style="color:${proj.negativeNews === 'negative' ? '#dc2626' : '#166534'};">${proj.negativeNews === 'negative' ? 'Terdeteksi Isu Berita Negatif' : 'Nihil Berita Negatif'}</strong></div>
            <div style="margin-top:4px; font-size:0.62rem; color:#64748b;">
              Diakses: ${accessedAt} &bull; ${newsItems.length} artikel terindeks.
            </div>
          </div>
        </div>

        <!-- 3. SIPP PENGADILAN MA -->
        <div style="background:#ffffff; border:1.5px solid ${proj.sippStatus === 'clean' ? '#bbf7d0' : '#fca5a5'}; border-radius:8px; padding:0.6rem 0.75rem; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:0.75rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:5px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${proj.sippStatus === 'clean' ? '#16a34a' : '#dc2626'};"></span>
              SIPP Pengadilan Negeri (MA RI)
            </div>
            <span style="font-size:0.62rem; font-weight:700; color:#64748b;">${proj.city || 'Yurisdiksi Domisili'}</span>
          </div>
          <div style="font-size:0.66rem; color:#475569; line-height:1.4;">
            <div>Status Hukum: <strong style="color:${proj.sippStatus === 'clean' ? '#166534' : '#dc2626'};">${fiveC.sippStatus}</strong></div>
            <div style="margin-top:3px;">
              <select class="form-control" style="font-size:0.68rem; padding:2px 6px;" onchange="updateCharacterParam('sippStatus', this.value)">
                <option value="clean" ${proj.sippStatus === 'clean' ? 'selected' : ''}>Nihil Gugatan Perdata / PKPU</option>
                <option value="disputed" ${proj.sippStatus === 'disputed' ? 'selected' : ''}>Sengketa Gugatan Perdata</option>
                <option value="bankrupt" ${proj.sippStatus === 'bankrupt' ? 'selected' : ''}>Permohonan Kepailitan / PKPU</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4. SLIK OJK -->
        <div style="background:#ffffff; border:1.5px solid ${proj.slikStatus === 'kol1' || !proj.slikStatus ? '#bbf7d0' : '#fca5a5'}; border-radius:8px; padding:0.6rem 0.75rem; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:0.75rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:5px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${proj.slikStatus === 'kol1' || !proj.slikStatus ? '#16a34a' : '#dc2626'};"></span>
              SLIK OJK (Kolektibilitas)
            </div>
            <span style="font-size:0.62rem; font-weight:700; color:#64748b;">iDeb OJK</span>
          </div>
          <div style="font-size:0.66rem; color:#475569; line-height:1.4;">
            <div>Riwayat: <strong style="color:${proj.slikStatus === 'kol1' || !proj.slikStatus ? '#166534' : '#dc2626'};">${fiveC.slikStatus}</strong></div>
            <div style="margin-top:3px;">
              <select class="form-control" style="font-size:0.68rem; padding:2px 6px;" onchange="updateCharacterParam('slikStatus', this.value)">
                <option value="kol1" ${proj.slikStatus === 'kol1' || !proj.slikStatus ? 'selected' : ''}>Kolektibilitas 1 (Lancar)</option>
                <option value="kol2" ${proj.slikStatus === 'kol2' ? 'selected' : ''}>Kolektibilitas 2 (Dalam Perhatian Khusus)</option>
                <option value="kol3_5" ${proj.slikStatus === 'kol3_5' ? 'selected' : ''}>Kolektibilitas 3-5 (Kurang Lancar / Diragukan / Macet)</option>
                <option value="no_facility" ${proj.slikStatus === 'no_facility' ? 'selected' : ''}>Belum Ada Fasilitas Pinjaman</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 39-PARAMETER INTERACTIVE EVALUATION TABLE -->
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <!-- Table Toolbar -->
        <div style="padding:0.65rem 0.85rem; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
            <button type="button" class="filter-pill-5c active" data-cat="all" onclick="filter5CTable('all')">
              Semua (39)
            </button>
            <button type="button" class="filter-pill-5c" data-cat="character" onclick="filter5CTable('character')">
              1. Character (16)
            </button>
            <button type="button" class="filter-pill-5c" data-cat="capacity" onclick="filter5CTable('capacity')">
              2. Capacity (4)
            </button>
            <button type="button" class="filter-pill-5c" data-cat="capability" onclick="filter5CTable('capability')">
              3. Capability (3)
            </button>
            <button type="button" class="filter-pill-5c" data-cat="condition" onclick="filter5CTable('condition')">
              4. Condition (8)
            </button>
            <button type="button" class="filter-pill-5c" data-cat="collateral" onclick="filter5CTable('collateral')">
              5. Collateral (8)
            </button>
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem;">
            <input type="text" id="inp_search5c" class="form-control" style="font-size:0.72rem; padding:3px 8px; width:180px;" placeholder="Cari nama parameter..." oninput="filter5CTable()" />
            <span id="countVisible5CParams" style="font-size:0.68rem; font-weight:700; color:#64748b; white-space:nowrap;">
              Menampilkan 39 dari 39 Parameter
            </span>
          </div>
        </div>

        <!-- Table Container -->
        <div style="max-height:650px; overflow-y:auto; overflow-x:auto;">
          <table class="fivec-param-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">No</th>
                <th style="min-width:260px;">Parameter Penilaian &amp; Referensi</th>
                <th style="width:70px; text-align:center;">Bobot</th>
                <th style="min-width:320px;">Pilihan Penilaian / Opsi Terpilih</th>
                <th style="width:75px; text-align:center;">Nilai</th>
                <th style="width:85px; text-align:right;">Skor Bobot</th>
                <th style="width:130px; text-align:center;">Status Evaluasi</th>
              </tr>
            </thead>
            <tbody>
              ${(fiveC.evaluatedParams || []).map((p) => {
                const catColors = {
                  character: { bg: '#e0f2fe', text: '#0369a1' },
                  rasio: { bg: '#dcfce7', text: '#15803d' },
                  capacity: { bg: '#ede9fe', text: '#4338ca' },
                  capability: { bg: '#fef3c7', text: '#b45309' },
                  condition: { bg: '#fce7f3', text: '#be185d' },
                  collateral: { bg: '#ccfbf1', text: '#0f766e' }
                };
                const cStyle = catColors[p.category] || { bg: '#f1f5f9', text: '#334155' };
                const searchData = `${p.num} ${p.name} ${p.category} ${p.desc} ${p.chosenText} ${p.autoReason}`.toLowerCase();

                return `
                  <tr class="row-5c-param" data-category="${p.category}" data-search="${searchData.replace(/"/g, '&quot;')}">
                    <td style="text-align:center; font-weight:700; color:#64748b;">
                      ${p.num}
                    </td>
                    <td>
                      <div>
                        <span class="badge-cat-pill" style="background:${cStyle.bg}; color:${cStyle.text};">
                          ${p.categoryLabel}
                        </span>
                        <div style="font-weight:700; color:#1e293b; font-size:0.75rem; margin-top:2px;">
                          ${p.name}
                        </div>
                        <div style="font-size:0.65rem; color:#64748b; margin-top:2px; line-height:1.35;">
                          ${p.desc}
                        </div>
                        ${p.autoReason ? `
                          <div style="font-size:0.63rem; color:#0369a1; margin-top:3px; display:flex; align-items:center; gap:3px;">
                            <span>&bull; Data ASCA:</span> <em>${p.autoReason}</em>
                          </div>
                        ` : ''}
                      </div>
                    </td>
                    <td style="text-align:center; font-weight:800; color:var(--askrindo-navy);">
                      ${p.weightPct}%
                    </td>
                    <td>
                      <select class="form-control" style="font-size:0.72rem; padding:4px 6px; width:100%; border-color:${p.isOverridden ? '#f59e0b' : '#cbd5e1'};" onchange="update5CParameter('${p.id}', this.value)">
                        ${p.options.map((opt) => `
                          <option value="${opt.key}" ${opt.key === p.chosenKey ? 'selected' : ''}>
                            [${opt.key}] ${opt.text} (${opt.score} Poin)
                          </option>
                        `).join('')}
                      </select>
                    </td>
                    <td style="text-align:center;">
                      <span style="display:inline-block; font-weight:800; font-size:0.74rem; padding:2px 7px; border-radius:4px; background:${p.score >= 80 ? '#dcfce7' : (p.score >= 50 ? '#e0f2fe' : '#fee2e2')}; color:${p.score >= 80 ? '#15803d' : (p.score >= 50 ? '#0369a1' : '#dc2626')};">
                        ${p.score}
                      </span>
                    </td>
                    <td style="text-align:right; font-weight:800; color:#1e293b;">
                      ${p.weightedScore.toFixed(3)}
                    </td>
                    <td style="text-align:center;">
                      ${p.isOverridden ? `
                        <div style="display:inline-flex; align-items:center; gap:4px;">
                          <span class="badge-manual-5c" title="Parameter disesuaikan manual oleh analis">
                            &#9998; Override
                          </span>
                          <button type="button" class="btn-reset-param-5c" onclick="reset5CParameterToAuto('${p.id}')" title="Kembalikan ke evaluasi otomatis sistem">
                            &#8634;
                          </button>
                        </div>
                      ` : `
                        <span class="badge-auto-5c" title="Dihitung 100% otomatis dari data sistem">
                          &#9889; Otomatis
                        </span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
                <td colspan="2" style="text-align:right; padding:8px 12px; color:var(--askrindo-navy);">
                  TOTAL SKOR TERTINBANG 5C (SKALA 0 - 100):
                </td>
                <td style="text-align:center; color:var(--askrindo-navy);">
                  100%
                </td>
                <td style="font-size:0.72rem; color:#475569;">
                  Menghasilkan <strong>Rating ${gradeMeta.grade} - ${gradeMeta.name}</strong> (Maks Coverage: ${gradeMeta.maxCoverage}%, IJP: ${gradeMeta.ijpRate})
                </td>
                <td style="text-align:center; font-size:0.8rem; color:${getScoreColor(fiveC.totalScore)};">
                  ${fiveC.totalScore}
                </td>
                <td style="text-align:right; font-size:0.8rem; color:${getScoreColor(fiveC.totalScore)};">
                  ${(fiveC.totalScore).toFixed(2)}
                </td>
                <td style="text-align:center;">
                  <span class="grade-badge ${gradeMeta.badgeCls}" style="font-size:0.68rem; padding:2px 7px;">
                    ${gradeMeta.grade}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;
}


// ============================================================================
// 10. RENDER DASHBOARD, DCC, STRESS-TEST, MEMO, PORTFOLIO
// ============================================================================
function renderDashboardTab(proj, m) {
  if (!m || !m.hasFinancials) {
    const kpiCCCActual = document.getElementById('kpiCCCActual');
    if (kpiCCCActual) kpiCCCActual.textContent = '-';
    const kpiCCCClaimed = document.getElementById('kpiCCCClaimed');
    if (kpiCCCClaimed) kpiCCCClaimed.textContent = 'Belum Ada Lap. Keuangan';
    const cccDiffEl = document.getElementById('kpiCCCDiffBadge');
    if (cccDiffEl) { cccDiffEl.textContent = '-'; cccDiffEl.style.color = '#64748b'; }
    const kpiCardCCC = document.getElementById('kpiCardCCC');
    if (kpiCardCCC) kpiCardCCC.className = 'kpi-card';

    const kpiGrossCycle = document.getElementById('kpiGrossCycle');
    if (kpiGrossCycle) kpiGrossCycle.textContent = '-';
    const kpiFacilityTenor = document.getElementById('kpiFacilityTenor');
    if (kpiFacilityTenor) kpiFacilityTenor.textContent = `Tenor: ${proj.scfTenorDays || 60}h`;
    const gapEl = document.getElementById('kpiTenorGapBadge');
    if (gapEl) { gapEl.textContent = '-'; gapEl.style.color = '#64748b'; }
    const kpiCardTenor = document.getElementById('kpiCardTenor');
    if (kpiCardTenor) kpiCardTenor.className = 'kpi-card';

    const kpiLabelMargin = document.getElementById('kpiLabelMargin');
    if (kpiLabelMargin) kpiLabelMargin.textContent = 'Gross Margin & Laba Bersih';
    const kpiGrossMargin = document.getElementById('kpiGrossMargin');
    if (kpiGrossMargin) kpiGrossMargin.textContent = '-';
    const kpiEATValue = document.getElementById('kpiEATValue');
    if (kpiEATValue) kpiEATValue.textContent = 'EAT: -';
    const profEl = document.getElementById('kpiProfitStatus');
    if (profEl) { profEl.textContent = '-'; profEl.style.color = '#64748b'; }
    const kpiCardMargin = document.getElementById('kpiCardMargin');
    if (kpiCardMargin) kpiCardMargin.className = 'kpi-card';

    const kpiSustainableLimit = document.getElementById('kpiSustainableLimit');
    if (kpiSustainableLimit) kpiSustainableLimit.textContent = '-';
    const kpiRequestedLimit = document.getElementById('kpiRequestedLimit');
    if (kpiRequestedLimit) kpiRequestedLimit.textContent = `Diajukan: ${fmtRp(proj.requestedPlafond, true)}`;
    const covEl = document.getElementById('kpiCoverageRatio');
    if (covEl) { covEl.textContent = '-'; covEl.style.color = '#64748b'; }
    const kpiCardPlafond = document.getElementById('kpiCardPlafond');
    if (kpiCardPlafond) kpiCardPlafond.className = 'kpi-card';

    const redFlagsContainer = document.getElementById('redFlagsContainer');
    if (redFlagsContainer) {
      redFlagsContainer.innerHTML = '<div style="background:#f8fafc; border:1px dashed #cbd5e1; padding:1.5rem; text-align:center; color:#64748b; border-radius:6px; font-size:0.83rem;">Data laporan keuangan belum diinput. Indikator peringatan dini (Red Flags) dan audit risiko akan tampil setelah Anda melengkapi data keuangan.</div>';
    }
    const dashboardTimelineVisual = document.getElementById('dashboardTimelineVisual');
    if (dashboardTimelineVisual) {
      dashboardTimelineVisual.innerHTML = '<div style="background:#f8fafc; border:1px dashed #cbd5e1; padding:1.5rem; text-align:center; color:#64748b; border-radius:6px; font-size:0.83rem;">Visualisasi siklus modal kerja (DOI + DOR vs Tenor Fasilitas) akan aktif otomatis setelah laporan keuangan diisi.</div>';
    }
    const dashboardSummaryCardTitle = document.getElementById('dashboardSummaryCardTitle');
    if (dashboardSummaryCardTitle) dashboardSummaryCardTitle.textContent = 'Ringkasan Keuangan (Belum Ada Data)';
    const dashboardSummaryTable = document.getElementById('dashboardSummaryTable');
    if (dashboardSummaryTable) {
      dashboardSummaryTable.innerHTML = '<tbody><tr><td colspan="4" style="text-align:center; padding:2rem; color:#64748b; font-size:0.85rem;">Data laporan keuangan (Neraca & Laba Rugi) belum diisi. Silakan isi form di tab <strong>Input Data</strong> atau gunakan fitur <strong>Pindai AI OCR</strong>.</td></tr></tbody>';
    }
    return;
  }

  document.getElementById('kpiCCCActual').textContent = `${fmtNum(m.ccc23, 1)} Hari`;
  document.getElementById('kpiCCCClaimed').textContent = `Data Bank: ${m.claimedCCC} Hr`;
  const cccDiffEl = document.getElementById('kpiCCCDiffBadge');
  cccDiffEl.textContent = `${m.diffCCC >= 0 ? '+' : ''}${fmtNum(m.diffCCC, 1)} hr`;
  cccDiffEl.style.color = Math.abs(m.diffCCC) > 30 ? 'var(--askrindo-red)' : 'var(--askrindo-green)';
  document.getElementById('kpiCardCCC').className = `kpi-card ${Math.abs(m.diffCCC) > 30 ? 'kpi-red' : 'kpi-green'}`;

  document.getElementById('kpiGrossCycle').textContent = `${fmtNum(m.grossCycle23, 1)} Hari`;
  document.getElementById('kpiFacilityTenor').textContent = `Tenor: ${m.scfTenor}h (+${m.kmkTenor}h)`;
  const gapEl = document.getElementById('kpiTenorGapBadge');
  if (m.cashGapAtSCFMaturity_Actual > 0) {
    gapEl.textContent = `Defisit ${fmtNum(m.cashGapAtSCFMaturity_Actual, 0)} hr!`;
    gapEl.style.color = 'var(--askrindo-red)';
    document.getElementById('kpiCardTenor').className = 'kpi-card kpi-red';
  } else {
    gapEl.textContent = `Surplus ${fmtNum(Math.abs(m.cashGapAtSCFMaturity_Actual), 0)} hr`;
    gapEl.style.color = 'var(--askrindo-green)';
    document.getElementById('kpiCardTenor').className = 'kpi-card kpi-green';
  }

  document.getElementById('kpiLabelMargin').textContent = `Gross Margin & Laba Bersih (${m.yr2})`;
  document.getElementById('kpiGrossMargin').textContent = `${fmtPct(m.gpm23, 2)}`;
  document.getElementById('kpiEATValue').textContent = `EAT: ${fmtRp(m.eat23, true)}`;
  const profEl = document.getElementById('kpiProfitStatus');
  if (m.gp23 < 0) {
    profEl.textContent = 'GROSS LOSS';
    profEl.style.color = 'var(--askrindo-red)';
    document.getElementById('kpiCardMargin').className = 'kpi-card kpi-red';
  } else {
    profEl.textContent = 'Positif';
    profEl.style.color = 'var(--askrindo-green)';
    document.getElementById('kpiCardMargin').className = 'kpi-card kpi-green';
  }

  document.getElementById('kpiSustainableLimit').textContent =
    m.sustainableLimitBaseline > 0 ? fmtRp(m.sustainableLimitBaseline, true) : `Rp 0 (Mitigasi)`;
  document.getElementById('kpiRequestedLimit').textContent = `Diajukan: ${fmtRp(proj.requestedPlafond, true)}`;
  const covEl = document.getElementById('kpiCoverageRatio');
  covEl.textContent = m.sustainableLimitBaseline > 0 ? `Cov ${m.recCoveragePct}%` : `Ring-Fenced: ${fmtRp(m.recommendedMitigatedLimit, true)}`;
  covEl.style.color = m.sustainableLimitBaseline > 0 ? 'var(--askrindo-green)' : 'var(--askrindo-gold)';
  document.getElementById('kpiCardPlafond').className = `kpi-card ${m.sustainableLimitBaseline > 0 ? 'kpi-green' : 'kpi-gold'}`;

  const insights = buildDynamicCaseInsights(proj, m);
  const allPoints = [...insights.criticalPointsFin, ...insights.criticalPointsCredit];

  document.getElementById('redFlagsContainer').innerHTML = allPoints.map((f, idx) => {
    const color = f.severity === 'CRITICAL' ? '#dc2626' : (f.severity === 'HIGH' ? '#b45309' : '#15803d');
    const bg = f.severity === 'CRITICAL' ? '#fef2f2' : (f.severity === 'HIGH' ? '#fffbeb' : '#f0fdf4');
    return `
      <div style="background:${bg}; border-left:3.5px solid ${color}; padding:0.45rem 0.6rem; border-radius:5px;">
        <div style="font-weight:800; font-size:0.83rem; color:${color}; margin-bottom:0.12rem;">${idx + 1}. ${f.title}</div>
        <div style="font-size:0.8rem; color:#1e293b; line-height:1.45;">${f.detail}</div>
      </div>
    `;
  }).join('');

  const maxBarDays = Math.max(380, m.grossCycle23 + 20, m.totalMaxTenor + 20);
  const pct = (d) => Math.min(100, Math.max(4, (d / maxBarDays) * 100)).toFixed(1);

  document.getElementById('dashboardTimelineVisual').innerHTML = `
    <!-- BAR A: KLAIM DATA BANK -->
    <div class="ccc-visual-box" style="margin-top:0;">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; align-items:center;">
        <span>A. Sesuai Data Bank (DOI ${proj.claimedDOI} + DOR ${proj.claimedDOR} = ${m.claimedGrossCycle} Hr)</span>
        <span style="color:#0369a1; font-size:0.75rem;">CCC (-DOP ${proj.claimedDOP}): ${m.claimedCCC} Hr</span>
      </div>
      <div class="ccc-bar-track">
        <div class="ccc-bar-seg ccc-seg-dio"
          style="width:${pct(proj.claimedDOI)}%; background:#0284c7;"
          data-tt-title="DOI &bull; Days of Inventory (Klaim Bank)"
          data-tt-category="Klaim Bank"
          data-tt-days="${proj.claimedDOI} Hari"
          data-tt-pct="${((proj.claimedDOI / Math.max(1, m.claimedGrossCycle)) * 100).toFixed(0)}% dari Gross Cycle"
          data-tt-formula="Asumsi perputaran persediaan barang yang diajukan bank mitra"
          data-tt-evaluation="Estimasi bank: Perputaran stok persediaan barang diasumsikan berjalan lancar selama ${proj.claimedDOI} hari sebelum terjual."
          data-tt-status-bg="#e0f2fe"
          data-tt-status-color="#0369a1"
          title="DOI Klaim Bank: ${proj.claimedDOI} Hari (Sorot kursor untuk rincian lengkap)">
          DOI ${proj.claimedDOI}h
        </div>
        <div class="ccc-bar-seg ccc-seg-dso"
          style="width:${pct(proj.claimedDOR)}%; background:#f59e0b;"
          data-tt-title="DOR &bull; Days of Receivables (Klaim Bank)"
          data-tt-category="Klaim Bank"
          data-tt-days="${proj.claimedDOR} Hari"
          data-tt-pct="${((proj.claimedDOR / Math.max(1, m.claimedGrossCycle)) * 100).toFixed(0)}% dari Gross Cycle"
          data-tt-formula="Asumsi periode penagihan piutang dari pembeli yang diajukan bank mitra"
          data-tt-evaluation="Estimasi bank: Piutang usaha diasumsikan tertagih lancar dalam tempo ${proj.claimedDOR} hari (~${Math.round(proj.claimedDOR / 30)} bulan)."
          data-tt-status-bg="#fef3c7"
          data-tt-status-color="#b45309"
          title="DOR Klaim Bank: ${proj.claimedDOR} Hari (Sorot kursor untuk rincian lengkap)">
          DOR ${proj.claimedDOR}h
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:3px; font-size:0.68rem; color:#64748b;">
        <span>&bull; DOI: <strong>${proj.claimedDOI} hr</strong></span>
        <span>&bull; DOR: <strong>${proj.claimedDOR} hr</strong></span>
        <span>&bull; Gross Cycle: <strong>${m.claimedGrossCycle} hr</strong></span>
      </div>
    </div>

    <!-- BAR B: AKTUAL AUDITED -->
    <div class="ccc-visual-box">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; align-items:center;">
        <span>B. Aktual Audited ${m.yr2} (DOI ${fmtNum(m.doi23_365, 0)} + DOR ${fmtNum(m.dor23_365, 0)} = ${fmtNum(m.grossCycle23, 0)} Hr)</span>
        <span style="color:${m.ccc23 > m.scfTenor ? 'var(--askrindo-red)' : 'var(--askrindo-green)'}; font-size:0.75rem;">CCC (-DOP ${fmtNum(m.dop23_365, 0)}): ${fmtNum(m.ccc23, 0)} Hr</span>
      </div>
      <div class="ccc-bar-track">
        <div class="ccc-bar-seg ccc-seg-dio"
          style="width:${pct(m.doi23_365)}%; background:${m.doi23_365 > 150 ? '#dc2626' : '#0284c7'};"
          data-tt-title="DOI &bull; Days of Inventory (Aktual Audited ${m.yr2})"
          data-tt-category="Aktual Audited"
          data-tt-days="${fmtNum(m.doi23_365, 1)} Hari (${fmtNum(m.doi23_360, 1)}h basis 360)"
          data-tt-pct="${((m.doi23_365 / Math.max(1, m.grossCycle23)) * 100).toFixed(0)}% dari Gross Cycle"
          data-tt-nominal="Persediaan: ${fmtRp(proj.fin23?.inv || 0, true)} &bull; HPP (COGS): ${fmtRp(proj.fin23?.cogs || 0, true)}"
          data-tt-formula="(Persediaan / HPP) &times; 365 = ${fmtNum(m.doi23_365, 1)} Hari"
          data-tt-evaluation="${m.diffDOI > 30 ? '&#9888; <strong>Peringatan Risiko:</strong> Stok mengendap sangat lama (deviasi +' + fmtNum(m.diffDOI, 1) + ' hari di atas klaim bank)! Beban bunga berjalan dan barang berisiko susut/rusak.' : 'Perputaran stok persediaan barang relatif normal dan wajar.'}"
          data-tt-status-bg="${m.doi23_365 > 150 ? '#fee2e2' : '#e0f2fe'}"
          data-tt-status-color="${m.doi23_365 > 150 ? '#dc2626' : '#0369a1'}"
          title="DOI Aktual: ${fmtNum(m.doi23_365, 1)} Hari (Sorot kursor untuk rincian lengkap)">
          DOI ${fmtNum(m.doi23_365, 0)}h
        </div>
        <div class="ccc-bar-seg ccc-seg-dso"
          style="width:${pct(m.dor23_365)}%; background:#f59e0b;"
          data-tt-title="DOR &bull; Days of Receivables (Aktual Audited ${m.yr2})"
          data-tt-category="Aktual Audited"
          data-tt-days="${fmtNum(m.dor23_365, 1)} Hari (${fmtNum(m.dor23_360, 1)}h basis 360)"
          data-tt-pct="${((m.dor23_365 / Math.max(1, m.grossCycle23)) * 100).toFixed(0)}% dari Gross Cycle"
          data-tt-nominal="Piutang Usaha: ${fmtRp(proj.fin23?.ar || 0, true)} &bull; Penjualan: ${fmtRp(proj.fin23?.rev || 0, true)}"
          data-tt-formula="(Piutang Usaha / Penjualan) &times; 365 = ${fmtNum(m.dor23_365, 1)} Hari"
          data-tt-evaluation="${Math.abs(m.diffDOR) <= 10 ? 'Periode penagihan piutang dari pembeli sejalan dengan data bank (~2 bulan).' : 'Terdapat deviasi periode penagihan piutang ' + (m.diffDOR >= 0 ? '+' : '') + fmtNum(m.diffDOR, 1) + ' hari dari data bank.'}"
          data-tt-status-bg="#fef3c7"
          data-tt-status-color="#b45309"
          title="DOR Aktual: ${fmtNum(m.dor23_365, 1)} Hari (Sorot kursor untuk rincian lengkap)">
          DOR ${fmtNum(m.dor23_365, 0)}h
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:3px; font-size:0.68rem; color:#64748b;">
        <span style="color:${m.doi23_365 > 150 ? '#dc2626' : '#0369a1'};">&bull; DOI: <strong>${fmtNum(m.doi23_365, 0)} hr</strong> ${m.diffDOI > 30 ? '&#9888;' : ''}</span>
        <span>&bull; DOR: <strong>${fmtNum(m.dor23_365, 0)} hr</strong></span>
        <span style="font-weight:700; color:var(--askrindo-navy);">&bull; Gross Cycle: <strong>${fmtNum(m.grossCycle23, 0)} hr</strong></span>
      </div>
    </div>

    <!-- BAR C: TENOR FASILITAS BANK -->
    <div class="ccc-visual-box" style="background:#f0f9ff; border-color:#bae6fd;">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; align-items:center;">
        <span>C. Tenor Fasilitas ${proj.bankName} (Total: ${m.totalMaxTenor} Hr)</span>
        <span style="font-size:0.75rem; color:#0369a1;">PK: ${proj.pkMonths} Bln</span>
      </div>
      <div class="ccc-bar-track">
        <div class="ccc-bar-seg"
          style="width:${pct(m.scfTenor)}%; background:#005691;"
          data-tt-title="Tenor Fasilitas Pembayaran Utama"
          data-tt-category="Fasilitas Bank"
          data-tt-days="${m.scfTenor} Hari"
          data-tt-pct="${((m.scfTenor / Math.max(1, m.totalMaxTenor)) * 100).toFixed(0)}% dari Total Tenor"
          data-tt-formula="Jatuh tempo fasilitas kredit modal kerja / SCF utama (${proj.bankName})"
          data-tt-evaluation="${m.cashGapAtSCFMaturity_Actual > 0 ? '&#9888; <strong>Defisit Siklus Kas ' + fmtNum(m.cashGapAtSCFMaturity_Actual, 0) + ' Hari!</strong> Siklus operasi gross (' + fmtNum(m.grossCycle23, 0) + ' hari) melampaui tenor utama (' + m.scfTenor + ' hari). Piutang belum tertagih saat kewajiban jatuh tempo.' : '&#10003; <strong>Surplus Waktu ' + fmtNum(Math.abs(m.cashGapAtSCFMaturity_Actual), 0) + ' Hari.</strong> Siklus konversi kas selesai sebelum jatuh tempo fasilitas utama.'}"
          data-tt-status-bg="${m.cashGapAtSCFMaturity_Actual > 0 ? '#fee2e2' : '#dcfce7'}"
          data-tt-status-color="${m.cashGapAtSCFMaturity_Actual > 0 ? '#dc2626' : '#15803d'}"
          title="Tenor Utama: ${m.scfTenor} Hari (Sorot kursor untuk rincian lengkap)">
          Tenor Utama: ${m.scfTenor} Hr
        </div>
        ${m.kmkTenor > 0 ? `
        <div class="ccc-bar-seg"
          style="width:${pct(m.kmkTenor)}%; background:#f59e0b;"
          data-tt-title="KMK Khusus (Backup Default SCF)"
          data-tt-category="Fasilitas Tambahan"
          data-tt-days="+${m.kmkTenor} Hari (Total ${m.totalMaxTenor} Hari)"
          data-tt-pct="${((m.kmkTenor / Math.max(1, m.totalMaxTenor)) * 100).toFixed(0)}% dari Total Tenor"
          data-tt-formula="Fasilitas talangan modal kerja khusus saat SCF gagal bayar pada hari ke-${m.scfTenor}"
          data-tt-evaluation="${m.cashGapAfterKMK_Actual > 0 ? '&#9888; Masih terdapat defisit ' + fmtNum(m.cashGapAfterKMK_Actual, 0) + ' hari setelah KMK Khusus!' : 'Menutup defisit siklus operasi, namun mengonversi pembiayaan dagang yang default menjadi kredit bermasalah.'}"
          data-tt-status-bg="#fef3c7"
          data-tt-status-color="#b45309"
          title="KMK Backup: +${m.kmkTenor} Hari (Total: ${m.totalMaxTenor} Hari)">
          +KMK ${m.kmkTenor}h (Total ${m.totalMaxTenor}h)
        </div>` : ''}
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:3px; font-size:0.68rem; color:#64748b;">
        <span>&bull; Tenor Utama: <strong>${m.scfTenor} hr</strong></span>
        ${m.kmkTenor > 0 ? `<span>&bull; KMK Backup: <strong>+${m.kmkTenor} hr</strong></span>` : ''}
        <span>&bull; Total Tenor: <strong>${m.totalMaxTenor} hr</strong></span>
      </div>
      <div style="font-size:0.77rem; color:${m.cashGapAtSCFMaturity_Actual > 0 ? '#991b1b' : '#166534'}; font-weight:600; margin-top:0.35rem; line-height:1.35;">
        ${m.cashGapAtSCFMaturity_Actual > 0
          ? `&#9888; Defisit siklus ${fmtNum(m.cashGapAtSCFMaturity_Actual, 0)} hari saat jatuh tempo hari ke-${m.scfTenor} (Memicu klaim / KMK Backup)!`
          : `&#10003; Siklus operasi masuk di dalam tenor ${m.scfTenor} hari (Surplus waktu ${fmtNum(Math.abs(m.cashGapAtSCFMaturity_Actual), 0)} hari).`}
      </div>
    </div>
  `;

  document.getElementById('dashboardSummaryCardTitle').textContent = `Ringkasan Keuangan (Audited ${m.yr1} vs ${m.yr2})`;
  document.getElementById('dashboardSummaryTable').innerHTML = `
    <thead>
      <tr>
        <th>Pos Utama</th>
        <th class="num-col">Audited ${m.yr1}</th>
        <th class="num-col">Audited ${m.yr2}</th>
        <th class="num-col">Keterangan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Penjualan</strong></td>
        <td class="num-col">${fmtRp(proj.fin22.rev, true)}</td>
        <td class="num-col">${fmtRp(proj.fin23.rev, true)}</td>
        <td class="num-col" style="color:var(--askrindo-blue); font-weight:700;">${fmtPct(m.revGrowth, 1)}</td>
      </tr>
      <tr>
        <td><strong>HPP (COGS)</strong></td>
        <td class="num-col">${fmtRp(proj.fin22.cogs, true)}</td>
        <td class="num-col">${fmtRp(proj.fin23.cogs, true)}</td>
        <td class="num-col">${fmtNum((proj.fin23.cogs / proj.fin23.rev) * 100, 1)}% Sales</td>
      </tr>
      <tr>
        <td><strong>Gross Profit</strong></td>
        <td class="num-col" style="color:${m.gp22 < 0 ? '#dc2626' : '#166534'}; font-weight:700;">${fmtRp(m.gp22, true)}</td>
        <td class="num-col" style="color:${m.gp23 < 0 ? '#dc2626' : '#166534'}; font-weight:700;">${fmtRp(m.gp23, true)}</td>
        <td class="num-col" style="font-weight:700;">GPM ${fmtPct(m.gpm23, 1)}</td>
      </tr>
      <tr>
        <td><strong>Laba Bersih (EAT)</strong></td>
        <td class="num-col" style="color:${m.eat22 < 0 ? '#dc2626' : '#166534'}; font-weight:700;">${fmtRp(m.eat22, true)}</td>
        <td class="num-col" style="color:${m.eat23 < 0 ? '#dc2626' : '#166534'}; font-weight:700;">${fmtRp(m.eat23, true)}</td>
        <td class="num-col">NPM ${fmtPct(m.npm23, 1)}</td>
      </tr>
      <tr>
        <td><strong>Persediaan</strong></td>
        <td class="num-col">${fmtRp(proj.fin22.inv, true)}</td>
        <td class="num-col">${fmtRp(proj.fin23.inv, true)}</td>
        <td class="num-col">DOI: ${fmtNum(m.doi23_365, 1)} hr</td>
      </tr>
      <tr>
        <td><strong>Utang Bank Jk. Pendek</strong></td>
        <td class="num-col">${fmtRp(proj.fin22.stDebt, true)}</td>
        <td class="num-col" style="color:${m.stDebtGrowth > 50 ? '#dc2626' : '#0f172a'}; font-weight:700;">${fmtRp(proj.fin23.stDebt, true)}</td>
        <td class="num-col">${fmtPct(m.stDebtGrowth, 1)}</td>
      </tr>
      <tr>
        <td><strong>Likuiditas &amp; Ekuitas</strong></td>
        <td class="num-col">CR ${fmtNum(m.currentRatio22, 2)}x | QR ${fmtNum(m.quickRatio22, 2)}x</td>
        <td class="num-col">CR ${fmtNum(m.currentRatio23, 2)}x | QR ${fmtNum(m.quickRatio23, 2)}x</td>
        <td class="num-col">DER ${fmtNum(m.der23, 2)}x</td>
      </tr>
    </tbody>
  `;
}

function renderDCCTab(proj, m) {
  const emptyEl = document.getElementById('dccEmptyState');
  const activeEl = document.getElementById('dccActiveState');
  if (!m || !m.hasFinancials) {
    if (emptyEl) {
      emptyEl.innerHTML = getFinEmptyStateHTML('Analisa Dynamic CC Belum Aktif', 'Kalkulasi Dynamic Cash Conversion Cycle (DOR, DOI, DOP, dan CCC 360/365 hari) akan aktif setelah Anda mengisi data Neraca & Laba Rugi.');
      emptyEl.style.display = 'block';
    }
    if (activeEl) activeEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  if (activeEl) activeEl.style.display = 'block';

  document.getElementById('dccAuditCardTitle').textContent = `Audit Dynamic Cash Conversion Cycle (Data Bank vs Audited ${m.yr1} & ${m.yr2})`;
  document.getElementById('dccAuditTable').innerHTML = `
    <thead>
      <tr>
        <th>Komponen Siklus</th>
        <th>Rumus</th>
        <th class="num-col">Data Bank</th>
        <th class="num-col">${m.yr1} (365h)</th>
        <th class="num-col">${m.yr2} (365h)</th>
        <th class="num-col">${m.yr2} (360h)</th>
        <th class="num-col">Deviasi</th>
        <th>Evaluasi Audit Underwriter</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>DOR / DSO</strong> (Piutang)</td>
        <td>(AR / Sales) &times; 365</td>
        <td class="num-col"><strong>${proj.claimedDOR} hr</strong></td>
        <td class="num-col">${fmtNum(m.dor22_365, 1)} hr</td>
        <td class="num-col"><strong>${fmtNum(m.dor23_365, 1)} hr</strong></td>
        <td class="num-col">${fmtNum(m.dor23_360, 1)} hr</td>
        <td class="num-col">${m.diffDOR >= 0 ? '+' : ''}${fmtNum(m.diffDOR, 1)} hr</td>
        <td>${Math.abs(m.diffDOR) <= 10 ? 'Sesuai Data Bank (~2 bulan)' : 'Deviasi periode penagihan'}</td>
      </tr>
      <tr>
        <td><strong>DOI / DIO</strong> (Persediaan)</td>
        <td>(Inv / HPP) &times; 365</td>
        <td class="num-col"><strong>${proj.claimedDOI} hr</strong></td>
        <td class="num-col">${fmtNum(m.doi22_365, 1)} hr</td>
        <td class="num-col" style="color:${m.diffDOI > 30 ? '#dc2626' : '#0f172a'}; font-weight:800;">${fmtNum(m.doi23_365, 1)} hr</td>
        <td class="num-col">${fmtNum(m.doi23_360, 1)} hr</td>
        <td class="num-col" style="color:${m.diffDOI > 30 ? '#dc2626' : '#166534'}; font-weight:800;">${m.diffDOI >= 0 ? '+' : ''}${fmtNum(m.diffDOI, 1)} hr</td>
        <td>${m.diffDOI > 30 ? `<strong style="color:#dc2626;">Stok mengendap ${fmtNum(m.doi23_365, 0)} hr (${fmtRp(proj.fin23.inv, true)})!</strong>` : 'Perputaran persediaan normal'}</td>
      </tr>
      <tr>
        <td><strong>Gross Operating Cycle</strong></td>
        <td>DOI + DOR</td>
        <td class="num-col"><strong>${m.claimedGrossCycle} hr</strong></td>
        <td class="num-col">${fmtNum(m.grossCycle22, 1)} hr</td>
        <td class="num-col" style="font-weight:800;">${fmtNum(m.grossCycle23, 1)} hr</td>
        <td class="num-col">${fmtNum(m.doi23_360 + m.dor23_360, 1)} hr</td>
        <td class="num-col">+${fmtNum(m.grossCycle23 - m.claimedGrossCycle, 1)} hr</td>
        <td>Tenor Utama: ${m.scfTenor} hr (${m.cashGapAtSCFMaturity_Actual > 0 ? `Defisit ${fmtNum(m.cashGapAtSCFMaturity_Actual, 1)} hr` : 'Memadai'})</td>
      </tr>
      <tr>
        <td><strong>DOP Murni</strong> (Utang Dagang)</td>
        <td>(AP / HPP) &times; 365</td>
        <td class="num-col"><strong>${proj.claimedDOP} hr</strong></td>
        <td class="num-col">${fmtNum(m.dop22_365, 1)} hr</td>
        <td class="num-col" style="font-weight:800;">${fmtNum(m.dop23_365, 1)} hr</td>
        <td class="num-col">${fmtNum(m.dop23_360, 1)} hr</td>
        <td class="num-col">${fmtNum(m.diffDOP, 1)} hr</td>
        <td>${Math.abs(m.diffDOP) > 20 ? 'Kredit supplier murni jauh lebih pendek dari Data Bank' : 'Sesuai termin supplier'}</td>
      </tr>
      <tr>
        <td><em>DOP Luas (+Utang Lain &amp; YMH)</em></td>
        <td>((AP+Lain+YMH)/HPP)&times;365</td>
        <td class="num-col"><em>(${proj.claimedDOP} hr)</em></td>
        <td class="num-col">${fmtNum(m.dopBroad22_365, 1)} hr</td>
        <td class="num-col">${fmtNum(m.dopBroad23_365, 1)} hr</td>
        <td class="num-col">${fmtNum((m.dopBroad23_365 * 360) / 365, 1)} hr</td>
        <td class="num-col">+${fmtNum(m.dopBroad23_365 - proj.claimedDOP, 1)} hr</td>
        <td>Termasuk Biaya YMH Dibayar ${fmtRp(proj.fin23.accrued, true)}</td>
      </tr>
      <tr style="background:#f0f9ff; font-weight:700;">
        <td><strong>Cash Conversion Cycle (CCC)</strong></td>
        <td>DOI + DOR  -  DOP Murni</td>
        <td class="num-col">${m.claimedCCC} hr</td>
        <td class="num-col">${fmtNum(m.ccc22, 1)} hr</td>
        <td class="num-col" style="color:${m.ccc23 > 180 ? '#dc2626' : '#166534'};">${fmtNum(m.ccc23, 1)} hr</td>
        <td class="num-col">${fmtNum(m.doi23_360 + m.dor23_360 - m.dop23_360, 1)} hr</td>
        <td class="num-col">${m.diffCCC >= 0 ? '+' : ''}${fmtNum(m.diffCCC, 1)} hr</td>
        <td>Siklus kas bersih aktual ${fmtNum(m.ccc23, 1)} hari</td>
      </tr>
    </tbody>
  `;

  document.getElementById('tenorMismatchAnalysisBox').innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.45rem; font-size:0.73rem;">
      <div style="padding:0.45rem; background:${m.cashGapAtSCFMaturity_Actual > 0 ? '#fef2f2' : '#f0fdf4'}; border:1px solid ${m.cashGapAtSCFMaturity_Actual > 0 ? '#fecaca' : '#bbf7d0'}; border-radius:6px;">
        <div style="font-weight:700; color:${m.cashGapAtSCFMaturity_Actual > 0 ? '#991b1b' : '#166534'}; margin-bottom:0.12rem;">
          1. Evaluasi Jatuh Tempo Fasilitas Utama (Hari ke-${m.scfTenor})
        </div>
        <p>Siklus Operasi Gross membutuhkan <strong>${m.claimedGrossCycle} hari (Data Bank)</strong> atau <strong>${fmtNum(m.grossCycle23, 1)} hari (aktual ${m.yr2})</strong>, sedangkan Tenor Pembayaran Kredit adalah <strong>${m.scfTenor} hari</strong> (${m.cashGapAtSCFMaturity_Actual > 0 ? `Defisit waktu <strong>${fmtNum(m.cashGapAtSCFMaturity_Actual, 1)} hari</strong>  -  kas belum terkumpul saat jatuh tempo!` : `Surplus waktu <strong>${fmtNum(Math.abs(m.cashGapAtSCFMaturity_Actual), 1)} hari</strong>  -  aman & self-liquidating.`}).</p>
      </div>

      <div style="padding:0.45rem; background:#fffbeb; border:1px solid #fde68a; border-radius:6px;">
        <div style="font-weight:700; color:#92400e; margin-bottom:0.12rem;">
          2. Evaluasi Fasilitas Tambahan / KMK Backup (+${m.kmkTenor} Hari  +  Total ${m.totalMaxTenor} Hari)
        </div>
        <p>${m.kmkTenor > 0
          ? `Fasilitas KMK Khusus (${m.kmkTenor} hari setelah fasilitas utama jatuh tempo) menjadikan total tenor ${m.totalMaxTenor} hari. Terhadap siklus aktual ${fmtNum(m.grossCycle23, 1)} hari, ${m.cashGapAfterKMK_Actual > 0 ? `masih terdapat <strong>defisit ${fmtNum(m.cashGapAfterKMK_Actual, 1)} hari</strong>!` : `total waktu 270 hari menutup siklus, namun mengonversi trade finance menjadi modal kerja saat default.`}`
          : `Tidak terdapat fasilitas KMK Backup Default pada skema ini.`}</p>
      </div>

      <div style="padding:0.45rem; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px;">
        <div style="font-weight:700; color:#0369a1; margin-bottom:0.12rem;">
          3. Eksposur Plafond &amp; Mata Uang (${fmtRp(proj.requestedPlafond)})
        </div>
        <p>${proj.usdAmount > 0
          ? `Fasilitas berdenominasi valas <strong>USD ${proj.usdAmount.toLocaleString('id-ID')}</strong> (Kurs Rp${proj.fxRate.toLocaleString('id-ID')}). Wajib dipisahkan sub-limit Hedging Forex Line.`
          : `Fasilitas berdenominasi Rupiah penuh (${fmtRp(proj.requestedPlafond)}).`}</p>
      </div>
    </div>
  `;

  document.getElementById('wcVelocityBox').innerHTML = `
    <table class="data-table">
      <tbody>
        <tr>
          <td><strong>HPP Harian (Daily COGS Burn)</strong></td>
          <td class="num-col"><strong>${fmtRp(m.dailyCOGS23)} / hari</strong></td>
        </tr>
        <tr>
          <td><strong>Gross Cash Burn Total (COGS+OPEX+Bunga)</strong></td>
          <td class="num-col" style="color:#0a2540; font-weight:700;"><strong>${fmtRp(m.dailyGrossCashBurn)} / hari</strong></td>
        </tr>
        <tr>
          <td><strong>Operating Working Capital (AR + Inv  -  AP)</strong></td>
          <td class="num-col"><strong>${fmtRp(m.owc23)}</strong></td>
        </tr>
        <tr>
          <td><strong>Net Working Capital (CA  -  CL)</strong></td>
          <td class="num-col">${fmtRp(m.nwc23)}</td>
        </tr>
        <tr>
          <td><strong>Kas Terkunci di Kelebihan DOI (+${fmtNum(Math.max(0, m.diffDOI), 1)} hr)</strong></td>
          <td class="num-col" style="color:#dc2626; font-weight:700;">${fmtRp(m.cashLockedInExcessDOI)}</td>
        </tr>
        <tr>
          <td><strong>Potensi Kas Bebas Jika DOI Ditekan ke ${m.targetSafeDOI} Hari</strong></td>
          <td class="num-col" style="color:#166534; font-weight:700;">+${fmtRp(m.cashReleasedAtSafeDOI)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function syncSlidersWithCurrentProject(proj, m) {
  document.querySelectorAll('.lblYear2Ref').forEach((el) => {
    el.textContent = m.yr2;
  });
  document.getElementById('lblCurrGPM').textContent = `${fmtNum(m.gpm23, 1)}%`;
  document.getElementById('lblCurrDOI').textContent = Math.round(m.doi23_365);
  document.getElementById('lblCurrDOR').textContent = Math.round(m.dor23_365);
  document.getElementById('lblCurrDOP').textContent = Math.round(m.dop23_365);

  document.getElementById('rng_simGPM').value = Number(m.gpm23.toFixed(1));
  document.getElementById('rng_simDOI').value = Math.round(m.doi23_365);
  document.getElementById('rng_simDOR').value = Math.round(m.dor23_365);
  document.getElementById('rng_simDOP').value = Math.round(m.dop23_365);
  document.getElementById('rng_simRevGrowth').value = 0;
  document.getElementById('rng_simOpexCut').value = 0;
  document.getElementById('rng_simFxShock').value = 0;
  document.getElementById('rng_simInvHaircut').value = 0;
}

function applyStressPreset(presetName, btnEl) {
  document.querySelectorAll('.preset-pill').forEach((b) => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const proj = getActiveProject();
  const m = computeDCCSWCM(proj);

  if (presetName === 'baseline') {
    syncSlidersWithCurrentProject(proj, m);
  } else if (presetName === 'claimed') {
    document.getElementById('rng_simGPM').value = Number(m.gpm23.toFixed(1));
    document.getElementById('rng_simDOI').value = proj.claimedDOI;
    document.getElementById('rng_simDOR').value = proj.claimedDOR;
    document.getElementById('rng_simDOP').value = proj.claimedDOP;
    document.getElementById('rng_simRevGrowth').value = 10;
    document.getElementById('rng_simOpexCut').value = 0;
    document.getElementById('rng_simFxShock').value = 0;
    document.getElementById('rng_simInvHaircut').value = 0;
  } else if (presetName === 'fx_commodity_shock') {
    document.getElementById('rng_simGPM').value = Number((m.gpm23 - 3.5).toFixed(1));
    document.getElementById('rng_simDOI').value = Math.min(350, Math.round(m.doi23_365 + 20));
    document.getElementById('rng_simDOR').value = Math.min(150, Math.round(m.dor23_365 + 20));
    document.getElementById('rng_simDOP').value = Math.max(10, Math.round(m.dop23_365 - 5));
    document.getElementById('rng_simRevGrowth').value = -10;
    document.getElementById('rng_simOpexCut').value = 0;
    document.getElementById('rng_simFxShock').value = 10;
    document.getElementById('rng_simInvHaircut').value = 10;
  } else if (presetName === 'severe_stagflation') {
    document.getElementById('rng_simGPM').value = Number((m.gpm23 - 7.0).toFixed(1));
    document.getElementById('rng_simDOI').value = Math.min(360, Math.round(m.doi23_365 + 45));
    document.getElementById('rng_simDOR').value = Math.min(150, Math.round(m.dor23_365 + 40));
    document.getElementById('rng_simDOP').value = Math.max(10, Math.round(m.dop23_365 - 10));
    document.getElementById('rng_simRevGrowth').value = -20;
    document.getElementById('rng_simOpexCut').value = -5;
    document.getElementById('rng_simFxShock').value = 15;
    document.getElementById('rng_simInvHaircut').value = 20;
  } else if (presetName === 'turnaround_mitigated') {
    document.getElementById('rng_simGPM').value = Number(Math.max(12.5, m.minRequiredGPM).toFixed(1));
    document.getElementById('rng_simDOI').value = m.targetSafeDOI;
    document.getElementById('rng_simDOR').value = Math.min(45, Math.round(m.dor23_365));
    document.getElementById('rng_simDOP').value = Math.max(70, proj.claimedDOP);
    document.getElementById('rng_simRevGrowth').value = 15;
    document.getElementById('rng_simOpexCut').value = m.gp23 < 0 ? 55 : 20;
    document.getElementById('rng_simFxShock').value = 0;
    document.getElementById('rng_simInvHaircut').value = 0;
  }

  runStressSimulation();
}

function evaluateScenarioParams(proj, m, params) {
  const simRev = proj.fin23.rev * (1 + params.revGrowth / 100);
  const simGP = simRev * (params.gpm / 100);
  const simCOGS = simRev - simGP;
  const simOPEX = proj.fin23.opex * (1 - params.opexCut / 100);
  const fxExtraLiability = (proj.usdAmount > 0 ? proj.requestedPlafond : 0) * (params.fxShock / 100);
  const invWriteOff = proj.fin23.inv * (params.invHaircut / 100);

  const simEBITDA = simGP - simOPEX + (proj.fin23.fa * 0.04);
  const simInterest = (proj.fin23.stDebt + proj.requestedPlafond + fxExtraLiability) * (proj.interestRate / 100);
  const simEBT = simGP - simOPEX - simInterest - invWriteOff;

  const simAR = (simRev * params.dor) / 365;
  const simInv = (simCOGS * params.doi) / 365;
  const simAP = (simCOGS * params.dop) / 365;
  const simOWC = simAR + simInv - simAP;
  const deltaOWC = m.owc23 - simOWC;

  const simGrossCycle = params.doi + params.dor;
  const simCCC = simGrossCycle - params.dop;
  const operatingCashFlow = simEBITDA + deltaOWC - invWriteOff;
  const debtServiceRequired = proj.requestedPlafond + fxExtraLiability + simInterest;
  const simDSCR = debtServiceRequired > 0 ? (simEBITDA + Math.max(0, deltaOWC * 0.5)) / (proj.requestedPlafond * 0.5 + simInterest) : 0;

  const tenorFit = simGrossCycle <= proj.scfTenorDays;
  const isViable = simGP > 0 && tenorFit && (simEBT > 0 || deltaOWC > 0) && simDSCR >= 1.05;

  return {
    simRev, simGP, simCOGS, simOPEX, simEBITDA, simEBT,
    simAR, simInv, simAP, simOWC, deltaOWC,
    simGrossCycle, simCCC, operatingCashFlow,
    fxExtraLiability, invWriteOff, simDSCR, tenorFit, isViable
  };
}

function runStressSimulation() {
  const proj = getActiveProject();
  if (!proj) return;
  const m = computeDCCSWCM(proj);
  const emptyEl = document.getElementById('swcmEmptyState');
  const activeEl = document.getElementById('swcmActiveState');

  if (!m || !m.hasFinancials) {
    if (emptyEl) {
      emptyEl.innerHTML = getFinEmptyStateHTML('Modul Stress-Test Belum Aktif', 'Simulasi skenario stress-test modal kerja (shock DOI/DOR/DOP, Margin Drop, Kurs FX, Inventory Haircut) membutuhkan data laporan keuangan.');
      emptyEl.style.display = 'block';
    }
    if (activeEl) activeEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  if (activeEl) activeEl.style.display = 'block';

  const gpm = parseFloat(document.getElementById('rng_simGPM').value);
  const doi = parseFloat(document.getElementById('rng_simDOI').value);
  const dor = parseFloat(document.getElementById('rng_simDOR').value);
  const dop = parseFloat(document.getElementById('rng_simDOP').value);
  const revGrowth = parseFloat(document.getElementById('rng_simRevGrowth').value);
  const opexCut = parseFloat(document.getElementById('rng_simOpexCut').value);
  const fxShock = parseFloat(document.getElementById('rng_simFxShock').value);
  const invHaircut = parseFloat(document.getElementById('rng_simInvHaircut').value);

  document.getElementById('val_simGPM').textContent = `${gpm >= 0 ? '+' : ''}${gpm.toFixed(1)}%`;
  document.getElementById('val_simDOI').textContent = `${doi} Hr`;
  document.getElementById('val_simDOR').textContent = `${dor} Hr`;
  document.getElementById('val_simDOP').textContent = `${dop} Hr`;
  document.getElementById('val_simRevGrowth').textContent = `${revGrowth >= 0 ? '+' : ''}${revGrowth}% | -${opexCut}%`;
  document.getElementById('val_simFxAndHaircut').textContent = `Kurs +${fxShock}% | Rusak ${invHaircut}%`;

  const res = evaluateScenarioParams(proj, m, { gpm, doi, dor, dop, revGrowth, opexCut, fxShock, invHaircut });

  const statusColor = res.isViable ? '#166534' : (res.tenorFit && res.simGP > 0 ? '#0284c7' : (res.simGP > 0 ? '#92400e' : '#991b1b'));
  const statusBg = res.isViable ? '#f0fdf4' : (res.tenorFit && res.simGP > 0 ? '#f0f9ff' : (res.simGP > 0 ? '#fffbeb' : '#fef2f2'));
  const statusLabel = res.isViable
    ? `&#10003; LAYAK &amp; SELF-LIQUIDATING (SIKLUS &le; ${proj.scfTenorDays} HARI &amp; KAS SURPLUS)`
    : (res.tenorFit && res.simGP > 0
      ? `&#10003; LAYAK BERSYARAT (SIKLUS &le; ${proj.scfTenorDays} HARI &amp; PELEPASAN KAS SURPLUS)`
      : (res.simGP > 0
        ? `&#9888; MISMATCH TENOR (SIKLUS ${res.simGrossCycle}h > ${proj.scfTenorDays}h &ndash; RISIKO DEFAULT SAAT JATUH TEMPO)`
        : '&#10007; TIDAK LAYAK (GROSS LOSS &amp; DEFISIT KAS OPERASIONAL)'));

  document.getElementById('stressTestResultPanel').innerHTML = `
    <div style="background:${statusBg}; border:1.5px solid ${statusColor}; border-radius:8px; padding:0.65rem;">
      <div style="font-size:0.66rem; font-weight:700; text-transform:uppercase; color:${statusColor};">Hasil Simulasi SWCM</div>
      <div style="font-size:0.8rem; font-weight:800; color:${statusColor}; margin:0.1rem 0 0.45rem;">${statusLabel}</div>

      <div class="grid-2" style="gap:0.35rem; margin-bottom:0.45rem;">
        <div style="background:#fff; padding:0.35rem 0.5rem; border-radius:5px; border:1px solid var(--border-color);">
          <div style="font-size:0.64rem; color:var(--text-muted);">Siklus Gross (DOI + DOR)</div>
          <div style="font-size:0.9rem; font-weight:800; color:${res.tenorFit ? '#166534' : '#dc2626'};">
            ${res.simGrossCycle} Hr ${res.tenorFit ? `&le; ${proj.scfTenorDays}h` : `> ${proj.scfTenorDays}h!`}
          </div>
          <div style="font-size:0.64rem; color:var(--text-muted);">CCC Bersih: <strong>${res.simCCC} Hr</strong></div>
        </div>

        <div style="background:#fff; padding:0.35rem 0.5rem; border-radius:5px; border:1px solid var(--border-color);">
          <div style="font-size:0.64rem; color:var(--text-muted);">Pelepasan Kas Modal Kerja (&Delta;OWC)</div>
          <div style="font-size:0.9rem; font-weight:800; color:${res.deltaOWC >= 0 ? '#166534' : '#dc2626'};">
            ${res.deltaOWC >= 0 ? '+' : ''}${fmtRp(res.deltaOWC, true)}
          </div>
          <div style="font-size:0.64rem; color:var(--text-muted);">OWC: ${fmtRp(res.simOWC, true)}</div>
        </div>

        <div style="background:#fff; padding:0.35rem 0.5rem; border-radius:5px; border:1px solid var(--border-color);">
          <div style="font-size:0.64rem; color:var(--text-muted);">Proyeksi Gross Profit &amp; EBT</div>
          <div style="font-size:0.86rem; font-weight:800; color:${res.simGP >= 0 ? '#166534' : '#dc2626'};">
            GP: ${fmtRp(res.simGP, true)}
          </div>
          <div style="font-size:0.66rem; color:${res.simEBT >= 0 ? '#166534' : '#dc2626'}; font-weight:700;">
            EBT: ${fmtRp(res.simEBT, true)}
          </div>
        </div>

        <div style="background:#fff; padding:0.35rem 0.5rem; border-radius:5px; border:1px solid var(--border-color);">
          <div style="font-size:0.64rem; color:var(--text-muted);">Arus Kas Operasional &amp; DSCR</div>
          <div style="font-size:0.86rem; font-weight:800; color:${res.operatingCashFlow >= 0 ? '#166534' : '#dc2626'};">
            OCF: ${fmtRp(res.operatingCashFlow, true)}
          </div>
          <div style="font-size:0.66rem; font-weight:700;">
            DSCR: <span style="color:${res.simDSCR >= 1.15 ? '#166534' : '#dc2626'};">${fmtNum(res.simDSCR, 2)}x</span>
          </div>
        </div>
      </div>

      <table class="data-table" style="background:#fff; border-radius:5px; overflow:hidden;">
        <tbody>
          <tr>
            <td>Proyeksi Persediaan (${doi} hr) &amp; Piutang (${dor} hr)</td>
            <td class="num-col">Inv: <strong>${fmtRp(res.simInv, true)}</strong> | AR: <strong>${fmtRp(res.simAR, true)}</strong></td>
          </tr>
          <tr>
            <td>Proyeksi Utang Dagang (${dop} hr)</td>
            <td class="num-col">AP: <strong>${fmtRp(res.simAP, true)}</strong></td>
          </tr>
          <tr>
            <td>Shock Kurs (+${fxShock}%) &amp; Rusak Stok (${invHaircut}%)</td>
            <td class="num-col" style="color:#dc2626;">-${fmtRp(res.fxExtraLiability + res.invWriteOff, true)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  renderSWCMMatrixTable(proj, m);
  setTimeout(() => {
    enhanceGlossaryTerms(document.getElementById('tab-swcm'));
  }, 60);
}

function renderSWCMMatrixTable(proj, m) {
  const scenarios = [
    {
      name: `1. Baseline Audited ${m.yr2} (Status Quo)`,
      params: { gpm: m.gpm23, doi: Math.round(m.doi23_365), dor: Math.round(m.dor23_365), dop: Math.round(m.dop23_365), revGrowth: 0, opexCut: 0, fxShock: 0, invHaircut: 0 }
    },
    {
      name: `2. Sesuai Data Bank (${proj.claimedDOR}/${proj.claimedDOI}/${proj.claimedDOP} hr)`,
      params: { gpm: m.gpm23, doi: proj.claimedDOI, dor: proj.claimedDOR, dop: proj.claimedDOP, revGrowth: 10, opexCut: 0, fxShock: 0, invHaircut: 0 }
    },
    {
      name: '3. Stress Kurs (+10%) & Piutang Melambat',
      params: { gpm: m.gpm23 - 3.5, doi: Math.min(350, Math.round(m.doi23_365 + 20)), dor: Math.min(150, Math.round(m.dor23_365 + 20)), dop: Math.max(10, Math.round(m.dop23_365 - 5)), revGrowth: -10, opexCut: 0, fxShock: 10, invHaircut: 10 }
    },
    {
      name: '4. Severe Stress (Stok Rusak 20% + Stagflasi)',
      params: { gpm: m.gpm23 - 7.0, doi: Math.min(360, Math.round(m.doi23_365 + 45)), dor: Math.min(150, Math.round(m.dor23_365 + 40)), dop: Math.max(10, Math.round(m.dop23_365 - 10)), revGrowth: -20, opexCut: -5, fxShock: 15, invHaircut: 20 }
    },
    {
      name: '5. Skenario Turnaround / Mitigasi DCC-SWCM',
      params: { gpm: Math.max(12.5, m.minRequiredGPM), doi: m.targetSafeDOI, dor: Math.min(45, Math.round(m.dor23_365)), dop: Math.max(70, proj.claimedDOP), revGrowth: 15, opexCut: m.gp23 < 0 ? 55 : 20, fxShock: 0, invHaircut: 0 }
    }
  ];

  document.getElementById('swcmMatrixTable').innerHTML = `
    <thead>
      <tr>
        <th>Skenario Simulasi SWCM</th>
        <th class="num-col">GPM</th>
        <th class="num-col">DOI+DOR</th>
        <th class="num-col">CCC</th>
        <th class="num-col">Gross Profit</th>
        <th class="num-col">Pelepasan Kas (&Delta;OWC)</th>
        <th class="num-col">DSCR</th>
        <th>Status Kelayakan</th>
      </tr>
    </thead>
    <tbody>
      ${scenarios.map((s) => {
        const r = evaluateScenarioParams(proj, m, s.params);
        let statusBadgeText = '';
        let statusBadgeCls = '';
        if (r.tenorFit && r.simGP > 0 && r.simDSCR >= 1.05 && (r.simEBT > 0 || r.deltaOWC > 0)) {
          statusBadgeText = r.simEBT > 0 ? 'LAYAK (SELF-LIQUIDATING)' : 'LAYAK BERSYARAT (KAS SURPLUS)';
          statusBadgeCls = r.simEBT > 0 ? 'grade-AA' : 'grade-A';
        } else if (!r.tenorFit) {
          statusBadgeText = `DEFAULT HARI KE-${proj.scfTenorDays} (MISMATCH TENOR)`;
          statusBadgeCls = 'grade-C';
        } else if (r.simGP <= 0) {
          statusBadgeText = 'TIDAK LAYAK (GROSS LOSS)';
          statusBadgeCls = 'grade-D';
        } else {
          statusBadgeText = 'PERLU PENYESUAIAN SKEMA';
          statusBadgeCls = 'grade-B';
        }

        return `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td class="num-col" style="color:${s.params.gpm >= 0 ? '#166534' : '#dc2626'}; font-weight:700;">${fmtPct(s.params.gpm, 1)}</td>
            <td class="num-col">${r.simGrossCycle}h ${r.tenorFit ? '&#10003;' : '&#10007;'}</td>
            <td class="num-col">${r.simCCC}h</td>
            <td class="num-col">${fmtRp(r.simGP, true)}</td>
            <td class="num-col" style="color:${r.deltaOWC >= 0 ? '#166534' : '#dc2626'}; font-weight:700;">
              ${r.deltaOWC >= 0 ? '+' : ''}${fmtRp(r.deltaOWC, true)}
            </td>
            <td class="num-col" style="font-weight:700;">${fmtNum(r.simDSCR, 2)}x</td>
            <td>
              <span class="grade-badge ${statusBadgeCls}">
                ${statusBadgeText}
              </span>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
}

function renderCaseStudyQATab(proj, m) {
  const container = document.getElementById('caseStudyQAHTML');
  if (!container) return;
  if (!m || !m.hasFinancials) {
    container.innerHTML = getFinEmptyStateHTML('Rekomendasi Underwriting Belum Tersedia', 'Rekomendasi keputusan komite asuransi kredit (Persetujuan, Persetujuan Bersyarat, atau Penolakan), struktur covenants, dan mitigasi risiko akan dihasilkan setelah laporan keuangan diisi.');
    return;
  }

  const ins = buildDynamicCaseInsights(proj, m);
  const turnaroundSim = evaluateScenarioParams(proj, m, {
    gpm: Math.max(10.5, m.minRequiredGPM),
    doi: m.targetSafeDOI,
    dor: Math.min(55, Math.round(m.dor23_365)),
    dop: Math.max(65, proj.claimedDOP),
    revGrowth: 15,
    opexCut: m.gp23 < 0 ? 45 : 10,
    fxShock: 0,
    invHaircut: 0
  });

  document.getElementById('caseStudyQAHTML').innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.65rem; font-size:0.82rem; line-height:1.45;">
      <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:6px; padding:0.5rem 0.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.35rem;">
        <div>
          <strong>Kasus&bull; Aktif:</strong> <span style="color:var(--askrindo-blue); font-weight:700;">${proj.companyName}</span>
          <span style="color:var(--text-muted); margin-left:0.35rem;">| Bank: <strong>${proj.bankName}</strong> | Plafond: <strong>${fmtRp(proj.requestedPlafond)}</strong></span>
        </div>
        <div>
          <span class="grade-badge ${m.gradeMeta.badgeCls}">
            Skor: ${m.score}/100 (Grade ${m.shortGrade})  -  ${m.decision}
          </span>
        </div>
      </div>

      <!-- DUAL-STAGE UNDERWRITING DECISION & COVENANTS BOX -->
      <div class="dual-stage-box" style="margin:0;">
        <div class="dual-stage-header">
          <div>
            <span style="font-size:0.68rem; font-weight:800; text-transform:uppercase; color:#64748b; letter-spacing:0.3px;">
              Keputusan Dual-Stage Underwriting Asuransi Kredit ASCA:
            </span>
            <div style="margin-top:0.2rem; display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              <span class="${m.isInitialReject ? 'dual-stage-badge-stage1' : (m.isLayak ? 'dual-stage-badge-stage2' : 'dual-stage-badge-stage1')}">
                ${m.stage1Decision}
              </span>
              ${m.isLayak ? `
                <span class="cover-badge cover-approved">
                  Coverage Askrindo: Disetujui Penuh ${m.recCoveragePct || 70}% (Layak Dijamin) &bull; Rekomendasi Tarif IJP: ${m.ijpRate || '1,25% - 1,60% p.a.'}
                </span>
              ` : (m.isInitialReject ? `
                <span class="cover-badge cover-conditional">
                  Tidak Layak (Apabila Disetujui Maksimal Coverage ${m.recCoveragePct || 55}%) &bull; Risk Sharing ${proj.bankName} ${100 - (m.recCoveragePct || 55)}% &bull; Rekomendasi Tarif IJP: ${m.ijpRate || '3,75% - 4,50% p.a.'}
                </span>
              ` : `
                <span class="cover-badge cover-conditional">
                  Rekomendasi Coverage Bersyarat: Maks ${m.recCoveragePct || 60}% &bull; Rekomendasi Tarif IJP: ${m.ijpRate || '2,10% - 2,85% p.a.'}
                </span>
              `)}
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchTab('tab-score')" style="font-size:0.68rem;">
            Lihat Rincian Skor &raquo;
          </button>
        </div>

        <div style="font-size:0.71rem; color:#334155; line-height:1.45; margin-bottom:0.55rem; background:#f8fafc; padding:0.5rem 0.7rem; border-radius:6px; border:1px solid #e2e8f0;">
          <strong>Ringkasan Analisa Underwriting Sistem:</strong> ${m.stage1Summary}
        </div>

        ${m.isLayak ? `
          <div style="border-top:1px dashed #86efac; padding-top:0.5rem;">
            <div style="font-size:0.74rem; font-weight:800; color:#166534; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
              <span>Rekomendasi Persetujuan Penjaminan Kredit Askrindo (Layak Dijamin):</span>
              <span style="font-size:0.68rem; background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:4px; font-weight:700;">Standar Underwriting Sehat</span>
            </div>
            <div class="grid-2" style="gap:0.45rem;">
              <div class="term-card" style="border-color:#bbf7d0; background:#f0fdf4;">
                <div class="term-title"><span style="color:#166534;">1. Porsi Penjaminan &amp; Tarif IJP</span><span style="color:#15803d;">Coverage ${m.recCoveragePct || 70}% | IJP ${m.ijpRate || '1,25% - 1,60% p.a.'}</span></div>
                <div class="term-desc">Fasilitas kredit modal kerja debitur memenuhi standar underwriting. Rekomendasi coverage penjaminan Askrindo disetujui sebesar <strong>${m.recCoveragePct || 70}% (${fmtRp((proj.requestedPlafond || 0) * ((m.recCoveragePct || 70) / 100), true)})</strong> dengan tarif premi IJP standar <strong>${m.ijpRate}</strong>.</div>
              </div>
              <div class="term-card" style="border-color:#bbf7d0; background:#f0fdf4;">
                <div class="term-title"><span style="color:#166534;">2. Agunan Pokok &amp; Pengikatan</span><span style="color:#15803d;">${proj.collateralPrimaryType || 'Fidusia Persediaan / Piutang'}</span></div>
                <div class="term-desc">Agunan pokok berupa ${proj.collateralPrimaryType || 'persediaan dagang/piutang usaha'} senilai <strong>${fmtRp((typeof proj.collateralPrimaryVal === 'number' && proj.collateralPrimaryVal > 0) ? proj.collateralPrimaryVal : (proj.fin23?.inv || 0), true)}</strong> diikat secara yuridis sempurna (${proj.collateralPrimaryBinding || 'Akta Fidusia terdaftar Kemenkumham'}) dan diproteksi asuransi kerugian.</div>
              </div>
              <div class="term-card" style="border-color:#bbf7d0; background:#f0fdf4;">
                <div class="term-title"><span style="color:#166534;">3. Monitoring Rekening Penampungan</span><span style="color:#15803d;">Payroll / Rekening Operasional ${proj.bankName}</span></div>
                <div class="term-desc">Debitur berkomitmen menyalurkan mutasi transaksi operasional dan penerimaan piutang melalui rekening giro aktif di <strong>${proj.bankName}</strong>.</div>
              </div>
              <div class="term-card" style="border-color:#bbf7d0; background:#f0fdf4;">
                <div class="term-title"><span style="color:#166534;">4. Pemantauan Berkala Laporan Keuangan</span><span style="color:#15803d;">Kuartalan / Semesteran</span></div>
                <div class="term-desc">Penyampaian laporan keuangan in-house setiap kuartal guna memonitor stabilitas rasio perputaran modal kerja (DOR, DOI, DOP) dan profitabilitas.</div>
              </div>
            </div>
          </div>
        ` : (m.isInitialReject ? `
          <div style="border-top:1px dashed #cbd5e1; padding-top:0.5rem;">
            <div style="font-size:0.74rem; font-weight:800; color:#0f766e; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
              <span>Opsi Persetujuan Bersyarat Jika Analis / Komite Hendak Menyetujui (7 Syarat Wajib Covenants):</span>
              <span style="font-size:0.68rem; background:#ccfbf1; color:#0f766e; padding:2px 8px; border-radius:4px; font-weight:700;">Wajib Dipenuhi Sebelum Penerbitan Polis</span>
            </div>
            <div class="grid-2" style="gap:0.45rem;">
              <div class="term-card">
                <div class="term-title"><span>1. Pembatasan Coverage Askrindo &amp; Rekomendasi Tarif IJP</span><span style="color:#0284c7;">Maks ${m.recCoveragePct || 55}% | IJP ${m.ijpRate || '3,75% - 4,50% p.a.'}</span></div>
                <div class="term-desc">Plafon dijamin Askrindo dibatasi maksimal ${m.recCoveragePct || 55}% (${fmtRp(proj.requestedPlafond * ((m.recCoveragePct || 55) / 100), true)}), ${100 - (m.recCoveragePct || 55)}% risk sharing oleh ${proj.bankName}. Jika disetujui bersyarat oleh Komite Pemutus, <strong>Rekomendasi Tarif IJP adalah ${m.ijpRate || '3,75% - 4,50% p.a.'}</strong> (memuat <em>High-Risk Loading Premium</em>) dengan syarat wajib penyediaan Cash Collateral / Deposito minimal 10-20% serta restrukturisasi transaksi menjadi <em>Ring-Fenced Self-Liquidating</em>.</div>
              </div>
              <div class="term-card">
                <div class="term-title"><span>${isMaritimeOrImportRisk(proj) ? '2. Wajib Asuransi Marine Cargo' : (proj.procurementMethod === 'domestic' ? '2. Wajib Asuransi Inland Transit' : '2. Proteksi Aset & Kebakaran (Property/PAR)')}</span><span style="color:#0284c7;">${isMaritimeOrImportRisk(proj) ? 'ICC (A) All Risks' : (proj.procurementMethod === 'domestic' ? 'All Risks Darat' : 'Property All Risks')}</span></div>
                <div class="term-desc">${isMaritimeOrImportRisk(proj) ? `Penutupan asuransi kargo laut Askrindo untuk komoditas impor dengan Banker's Clause / Loss Payee ke ${proj.bankName}.` : (proj.procurementMethod === 'domestic' ? `Penutupan asuransi pengangkutan darat Askrindo (Inland Transit All Risks) untuk proteksi distribusi logistik dengan Banker's Clause ke ${proj.bankName}.` : `Tidak ada risiko pengiriman laut/kargo fisik. Pengalihan mitigasi difokuskan pada perlindungan tempat usaha/aset dan pengawasan perputaran kas di ${proj.bankName}.`)}</div>
              </div>
              <div class="term-card">
                <div class="term-title"><span>3. Jaminan Tambahan (${proj.collateralAdditionalType || 'Fixed Asset'})</span><span style="color:#0284c7;">Coverage &ge; 120%</span></div>
                <div class="term-desc">Jaminan tambahan berupa ${proj.collateralAdditionalType || 'Aset Tetap'} diikat ${proj.collateralAdditionalBinding || 'Hak Tanggungan Peringkat I'} minimal 120% (${fmtRp(proj.requestedPlafond * 1.2, true)}) dari nilai jaminan terdaftar (${fmtRp((typeof proj.collateralAdditionalVal === 'number' && proj.collateralAdditionalVal > 0) ? proj.collateralAdditionalVal : (proj.fin23?.fa || 0), true)}) untuk melengkapi Agunan Pokok (${proj.collateralPrimaryType || 'Persediaan Barang'} - ${fmtRp((typeof proj.collateralPrimaryVal === 'number' && proj.collateralPrimaryVal > 0) ? proj.collateralPrimaryVal : (proj.fin23?.inv || 0), true)}).</div>
              </div>
              <div class="term-card">
                <div class="term-title"><span>4. KMK Backup sebagai Buffer Likuiditas</span><span style="color:#0284c7;">Tranche Bertahap</span></div>
                <div class="term-desc">Maksimal ${fmtRp(m.recommendedTrancheSize, true)} per tranche berbasis bukti invoice tagihan riil (tanpa drawing di muka).</div>
              </div>
              <div class="term-card">
                <div class="term-title"><span>5. Escrow Account &amp; Collection Control</span><span style="color:#0284c7;">100% Cash In</span></div>
                <div class="term-desc">Seluruh pembayaran pembeli wajib disetor ke rekening penampungan khusus (Escrow Account) di ${proj.bankName}.</div>
              </div>
              <div class="term-card">
                <div class="term-title"><span>6. Covenant Margin Kotor Kontrak PO</span><span style="color:#0284c7;">GPM &ge; +12,1%</span></div>
                <div class="term-desc">Margin kotor terikat &ge; +12,1% untuk memastikan kecukupan margin kas operasional menutupi beban bunga dan angsuran.</div>
              </div>
              <div class="term-card" style="grid-column: 1 / -1;">
                <div class="term-title"><span>7. Personal Guarantee (PG) / Corporate Guarantee (CG)</span><span style="color:#0284c7;">Notariil Mengikat</span></div>
                <div class="term-desc">Jaminan pribadi notariil dari pemilik saham pengendali (Ultimate Beneficiary Owner) demi mencegah moral hazard dan memastikan komitmen penuh pemegang saham.</div>
              </div>
            </div>
          </div>
        ` : '')}
      </div>

      <div style="border:1px solid #cbd5e1; border-radius:7px; padding:0.65rem; background:#fff;">
        <h3 style="color:var(--askrindo-navy); font-size:0.88rem; margin-bottom:0.4rem; border-bottom:2px solid var(--askrindo-blue); padding-bottom:0.25rem;">
          I. CRITICAL POINTS (Kondisi Keuangan, Siklus Kas &amp; Ketahanan NWC)
        </h3>
        <div class="grid-2" style="gap:0.55rem;">
          <div style="background:#fef2f2; padding:0.55rem; border-radius:6px; border-left:3.5px solid #dc2626;">
            <h4 style="color:#991b1b; font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">A. Critical Points Kondisi Keuangan &amp; Likuiditas (${proj.companyName})</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.criticalPointsFin.map((item) => `<li><strong>${item.title}:</strong> ${item.detail}</li>`).join('')}
            </ol>
          </div>

          <div style="background:#fffbeb; padding:0.55rem; border-radius:6px; border-left:3.5px solid #f59e0b;">
            <h4 style="color:#92400e; font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">B. Critical Points Struktur Fasilitas &amp; Eksposur Asuransi Kredit (${proj.bankName})</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.criticalPointsCredit.map((item) => `<li><strong>${item.title}:</strong> ${item.detail}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>

      <div style="border:1px solid #cbd5e1; border-radius:7px; padding:0.65rem; background:#fff;">
        <h3 style="color:var(--askrindo-navy); font-size:0.88rem; margin-bottom:0.4rem; border-bottom:2px solid var(--askrindo-green); padding-bottom:0.25rem;">
          II. INFORMASI WAJIB UNDERWRITER &amp; KETENTUAN MITIGASI RISIKO (COVENANTS)
        </h3>
        <div class="grid-2" style="gap:0.55rem;">
          <div style="background:#f8fafc; padding:0.55rem; border-radius:6px; border:1px solid var(--border-color);">
            <h4 style="color:var(--askrindo-blue); font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">A. Informasi &amp; Dokumen Wajib Diminta</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.requiredInfos.map((info) => `<li><strong>${info.title}:</strong> ${info.detail}</li>`).join('')}
            </ol>
          </div>

          <div style="background:#f0fdf4; padding:0.55rem; border-radius:6px; border:1px solid #bbf7d0;">
            <h4 style="color:#166534; font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">B. Syarat &amp; Mitigasi Asuransi Kredit Askrindo</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.mitigations.map((mit) => `<li><strong>${mit.title}:</strong> ${mit.detail}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>

      <div style="border:1.5px solid var(--askrindo-blue); border-radius:7px; padding:0.65rem; background:#f0f9ff;">
        <h3 style="color:var(--askrindo-navy); font-size:0.8rem; margin-bottom:0.35rem;">
          III. REKOMENDASI UNDERWRITING &amp; RESTRUKTURISASI PARAMETER (METODE DCC-SWCM)
        </h3>

        <div class="table-responsive" style="margin-bottom:0.45rem;">
          <table class="data-table" style="background:#fff; border-radius:5px;">
            <thead>
              <tr>
                <th>Parameter Kunci</th>
                <th class="num-col">Kondisi Pengajuan Awal</th>
                <th class="num-col">Target Rekomendasi DCC-SWCM</th>
                <th>Dampak Mitigasi bagi Askrindo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Plafond &amp; Pencairan</strong></td>
                <td class="num-col">${fmtRp(proj.requestedPlafond, true)} (Sekaligus)</td>
                <td class="num-col" style="color:#166534; font-weight:700;">Maks ${fmtRp(m.recommendedMitigatedLimit > 0 ? m.recommendedMitigatedLimit : proj.requestedPlafond, true)} (Tranche @ ${fmtRp(m.recommendedTrancheSize, true)})</td>
                <td>Mencegah dana mengendap &amp; over-financing</td>
              </tr>
              <tr>
                <td><strong>Hari Persediaan (DOI)</strong></td>
                <td class="num-col" style="color:${m.doi23_365 > 150 ? '#dc2626' : '#0f172a'}; font-weight:700;">${fmtNum(m.doi23_365, 1)} Hari (Data Bank: ${proj.claimedDOI} hr)</td>
                <td class="num-col" style="color:#166534; font-weight:700;">&le; ${m.targetSafeDOI} Hari</td>
                <td>Membebaskan kas internal <strong>+${fmtRp(m.cashReleasedAtSafeDOI, true)}</strong></td>
              </tr>
              <tr>
                <td><strong>Siklus Gross (DOI+DOR)</strong></td>
                <td class="num-col" style="color:${m.grossCycle23 > m.scfTenor ? '#dc2626' : '#166534'}; font-weight:700;">${fmtNum(m.grossCycle23, 1)} Hari vs Tenor ${m.scfTenor} Hr</td>
                <td class="num-col" style="color:#166534; font-weight:700;">${turnaroundSim.simGrossCycle} Hari (&le; Tenor ${m.scfTenor} Hr)</td>
                <td>Fasilitas menjadi 100% Self-Liquidating</td>
              </tr>
              <tr>
                <td><strong>Gross Margin (GPM)</strong></td>
                <td class="num-col" style="color:${m.gpm23 < 0 ? '#dc2626' : '#166534'}; font-weight:700;">${fmtPct(m.gpm23, 2)} (${fmtRp(m.gp23, true)})</td>
                <td class="num-col" style="color:#166534; font-weight:700;">&ge; +${fmtNum(Math.max(10.5, m.minRequiredGPM), 1)}% (${fmtRp(turnaroundSim.simGP, true)})</td>
                <td>DSCR naik menjadi <strong>${fmtNum(turnaroundSim.simDSCR, 2)}x</strong></td>
              </tr>
              <tr>
                <td><strong>KMK Backup Khusus (Buffer Likuiditas)</strong></td>
                <td class="num-col">Standby Auto-Backup ${proj.kmkTenorDays} Hr (Pencairan di Muka)</td>
                <td class="num-col" style="color:#166534; font-weight:700;">Buffer Positif Bertahap (Maks ${fmtRp(m.recommendedTrancheSize, true)}/Tranche)</td>
                <td>Penyangga likuiditas default tanpa moral hazard penarikan dini</td>
              </tr>
              <tr>
                <td><strong>Rekomendasi Porsi Coverage Asuransi Kredit Askrindo</strong></td>
                <td class="num-col">Pengajuan Bank: Coverage 100% (Askrindo Tanggung Semua Risiko)</td>
                <td class="num-col" style="color:#166534; font-weight:700;">Maksimal ${m.recCoveragePct || 55}% (${fmtRp(proj.requestedPlafond * ((m.recCoveragePct || 55) / 100), true)}) | Risk-Sharing Bank Mitra ${100 - (m.recCoveragePct || 55)}% (${fmtRp(proj.requestedPlafond * ((100 - (m.recCoveragePct || 55)) / 100), true)})</td>
                <td>Prudent underwriting &amp; pembagian risiko proporsional demi skin-in-the-game</td>
              </tr>
              <tr>
                <td><strong>Agunan Tambahan Fixed Asset</strong></td>
                <td class="num-col">Tanpa Pengikatan Hak Tanggungan Riil (&lt; 100%)</td>
                <td class="num-col" style="color:#166534; font-weight:700;">Hak Tanggungan Peringkat I &ge; 120% (${fmtRp(proj.requestedPlafond * 1.2, true)})</td>
                <td>Loss-absorbing buffer &amp; mitigasi kepastian recovery klaim Askrindo</td>
              </tr>
              ${isMaritimeOrImportRisk(proj) ? `
                <tr>
                  <td><strong>Mitigasi Risiko Pengiriman Laut (Marine Cargo)</strong></td>
                  <td class="num-col">Tanpa Penutupan Asuransi Kargo Khusus</td>
                  <td class="num-col" style="color:#166534; font-weight:700;">Wajib Asuransi Marine Cargo Askrindo (All Risks Warehouse to Warehouse)</td>
                  <td>Proteksi mutlak kerusakan komoditas impor di laut &amp; Banker\'s Clause ${proj.bankName}</td>
                </tr>
              ` : (proj.procurementMethod === 'domestic' ? `
                <tr>
                  <td><strong>Mitigasi Logistik Distribusi Barang (Inland Transit)</strong></td>
                  <td class="num-col">Pengiriman Mandiri Jalur Darat Tanpa Polis</td>
                  <td class="num-col" style="color:#166534; font-weight:700;">Asuransi Inland Transit Askrindo (Warehouse to Warehouse)</td>
                  <td>Proteksi kecelakaan/kerusakan barang jalur darat &amp; Banker\'s Clause ${proj.bankName}</td>
                </tr>
              ` : `
                <tr>
                  <td><strong>Mitigasi Logistik &amp; Pengiriman Fisik</strong></td>
                  <td class="num-col">Tidak Ada Pengiriman Fisik (Jasa / Konstruksi)</td>
                  <td class="num-col" style="color:#475569; font-weight:600;">Tidak Diwajibkan Marine Cargo (Nihil Pengapalan)</td>
                  <td>Bebas risiko transit maritim; fokus pengikatan pada agunan tetap &amp; cash escrow account</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>

        <div class="form-group">
          <label style="font-weight:700; color:var(--askrindo-navy);"> Catatan &amp; Keputusan Tambahan Underwriter (Tersimpan Otomatis per Kasus):</label>
          <textarea id="inp_customNotes" class="form-control" placeholder="Tulis kesimpulan atau syarat khusus komite untuk debitur ini..." oninput="saveCustomNotes(this.value)">${proj.customNotes || ''}</textarea>
        </div>
      </div>
    </div>
  `;
}

function saveCustomNotes(val) {
  const proj = getActiveProject();
  if (!proj) return;
  proj.customNotes = val;
  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);
  renderPrintableReport(proj, m);
}

// ============================================================================
// 9B. KATALOG & ENGINE SKORING RASIO KEUANGAN ASKRINDO
// Sumber: Petunjuk Teknis Akseptasi Askrindo / PT. IDX Consulting - Tabel VII-1 (Rasio Keuangan)
// Komposit Bobot: 8 Rasio Finansial Utama = 100% (1.000)
// ============================================================================

const ASKRINDO_RATIOS_CATALOG = [
  {
    id: 'r_cr',
    num: 1,
    name: 'Current Ratio (CR) %',
    category: 'Likuiditas',
    formula: '(Aset Lancar / Kewajiban Lancar) × 100%',
    racStd: '≥ 100,00%',
    desc: 'Kemampuan aktiva lancar memenuhi seluruh kewajiban jangka pendek.',
    weight: 0.15,
    weightPct: 15,
    options: [
      { key: 'A', text: '≥ 100% (Memenuhi Standar RAC)', score: 100, passRac: true },
      { key: 'B', text: '≥ 75% s/d < 100% (Di Bawah Standar RAC)', score: 60, passRac: false },
      { key: 'C', text: '< 75% (Likuiditas Sangat Ketat)', score: 30, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.isNoDebtCL) return { key: 'A', score: 100, reason: 'Bebas Hutang Lancar (Prima)', val: null, valStr: 'N/A (Bebas Utang)' };
      const crPct = (ctx.cr || 0) * 100;
      const valStr = `${crPct.toFixed(2)}%`;
      if (crPct >= 100) return { key: 'A', score: 100, reason: `CR ${valStr} memenuhi standar RAC (≥ 100%)`, val: crPct, valStr };
      if (crPct >= 75) return { key: 'B', score: 60, reason: `CR ${valStr} di bawah standar RAC (75%-100%)`, val: crPct, valStr };
      return { key: 'C', score: 30, reason: `CR ${valStr} sangat ketat (< 75%)`, val: crPct, valStr };
    }
  },
  {
    id: 'r_qr',
    num: 2,
    name: 'Quick Ratio (QR) %',
    category: 'Likuiditas',
    formula: '((Aset Lancar - Persediaan) / Kewajiban Lancar) × 100%',
    racStd: '≥ 60,00%',
    desc: 'Kemampuan aset paling likuid di luar persediaan memenuhi kewajiban lancar.',
    weight: 0.15,
    weightPct: 15,
    options: [
      { key: 'A', text: '> 70% (Likuiditas Prima)', score: 100, passRac: true },
      { key: 'B', text: '≥ 60% s/d ≤ 70% (Memenuhi RAC)', score: 80, passRac: true },
      { key: 'C', text: '> 50% s/d ≤ 60% (Sedang)', score: 60, passRac: false },
      { key: 'D', text: '> 40% s/d ≤ 50% (Ketat)', score: 40, passRac: false },
      { key: 'E', text: '≤ 40% (Sangat Rentan)', score: 20, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.isNoDebtCL) return { key: 'A', score: 100, reason: 'Bebas Hutang Lancar (Prima)', val: null, valStr: 'N/A' };
      const qrPct = ctx.qrPct;
      const valStr = `${qrPct.toFixed(2)}%`;
      if (qrPct > 70) return { key: 'A', score: 100, reason: `QR ${valStr} (> 70%) - Sangat Likuid`, val: qrPct, valStr };
      if (qrPct >= 60) return { key: 'B', score: 80, reason: `QR ${valStr} (60%-70%) - Cukup`, val: qrPct, valStr };
      if (qrPct > 50) return { key: 'C', score: 60, reason: `QR ${valStr} (50%-60%) - Agak Ketat`, val: qrPct, valStr };
      if (qrPct > 40) return { key: 'D', score: 40, reason: `QR ${valStr} (40%-50%) - Ketat`, val: qrPct, valStr };
      return { key: 'E', score: 20, reason: `QR ${valStr} (≤ 40%) - Sangat Rentan`, val: qrPct, valStr };
    }
  },
  {
    id: 'r_cash',
    num: 3,
    name: 'Cash Ratio %',
    category: 'Likuiditas',
    formula: '(Kas & Setara Kas / Kewajiban Lancar) × 100%',
    racStd: '≥ 30,00%',
    desc: 'Kecukupan kas langsung untuk melunasi kewajiban jangka pendek tanpa menunggu penjualan stok/piutang.',
    weight: 0.10,
    weightPct: 10,
    options: [
      { key: 'A', text: '> 70% (Kas Sangat Berlimpah)', score: 100, passRac: true },
      { key: 'B', text: '≥ 55% s/d ≤ 70%', score: 80, passRac: true },
      { key: 'C', text: '> 45% s/d ≤ 55%', score: 60, passRac: true },
      { key: 'D', text: '≥ 30% s/d ≤ 45% (Batas Aman)', score: 40, passRac: true },
      { key: 'E', text: '< 30% (Penyangga Kas Tipis)', score: 20, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.isNoDebtCL) return { key: 'A', score: 100, reason: 'Bebas Hutang Lancar (Prima)', val: null, valStr: 'N/A' };
      const cRatioPct = ctx.cashRatioPct;
      const valStr = `${cRatioPct.toFixed(2)}%`;
      if (cRatioPct > 70) return { key: 'A', score: 100, reason: `Cash Ratio ${valStr} (> 70%) - Prima`, val: cRatioPct, valStr };
      if (cRatioPct >= 55) return { key: 'B', score: 80, reason: `Cash Ratio ${valStr} (55%-70%)`, val: cRatioPct, valStr };
      if (cRatioPct > 45) return { key: 'C', score: 60, reason: `Cash Ratio ${valStr} (45%-55%)`, val: cRatioPct, valStr };
      if (cRatioPct >= 30) return { key: 'D', score: 40, reason: `Cash Ratio ${valStr} (30%-45%)`, val: cRatioPct, valStr };
      return { key: 'E', score: 20, reason: `Cash Ratio ${valStr} (< 30%) - Penyangga kas tipis`, val: cRatioPct, valStr };
    }
  },
  {
    id: 'r_der',
    num: 4,
    name: 'Debt to Equity Ratio (DER) %',
    category: 'Solvabilitas',
    formula: '(Total Kewajiban / Total Ekuitas) × 100%',
    racStd: '≤ 400,00%',
    desc: 'Rasio leverage solvabilitas total hutang terhadap modal ekuitas.',
    weight: 0.15,
    weightPct: 15,
    options: [
      { key: 'A', text: '< 200% (Leverage Rendah / Prima)', score: 100, passRac: true },
      { key: 'B', text: '≥ 200% s/d ≤ 300% (Memenuhi RAC)', score: 75, passRac: true },
      { key: 'C', text: '> 300% s/d ≤ 400% (Batas Toleransi RAC)', score: 50, passRac: true },
      { key: 'D', text: '> 400% (Melampaui Batas Maksimum RAC)', score: 25, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.isZeroDebt) return { key: 'A', score: 100, reason: 'Bebas Hutang (DER 0,0%)', val: 0, valStr: '0,00%' };
      const derPct = ctx.der * 100;
      const valStr = `${derPct.toFixed(2)}%`;
      if (derPct < 200) return { key: 'A', score: 100, reason: `DER ${valStr} (< 200%) - Solvabilitas Aman`, val: derPct, valStr };
      if (derPct <= 300) return { key: 'B', score: 75, reason: `DER ${valStr} (200%-300%) - Memenuhi RAC`, val: derPct, valStr };
      if (derPct <= 400) return { key: 'C', score: 50, reason: `DER ${valStr} (300%-400%) - Batas Ambang RAC`, val: derPct, valStr };
      return { key: 'D', score: 25, reason: `DER ${valStr} (> 400%) - Melampaui Batas Maksimum RAC`, val: derPct, valStr };
    }
  },
  {
    id: 'r_dar',
    num: 5,
    name: 'Debt to Asset Ratio (DAR) %',
    category: 'Solvabilitas',
    formula: '(Total Kewajiban / Total Aset) × 100%',
    racStd: '< 80,00%',
    desc: 'Porsi pembiayaan total aktiva perusahaan yang didanai oleh hutang.',
    weight: 0.10,
    weightPct: 10,
    options: [
      { key: 'A', text: '< 70% (Struktur Aset Sehat)', score: 100, passRac: true },
      { key: 'B', text: '≥ 70% s/d < 80% (Wajar)', score: 75, passRac: true },
      { key: 'C', text: '≥ 80% s/d < 100% (Dominasi Utang)', score: 50, passRac: false },
      { key: 'D', text: '≥ 100% (Kewajiban Melebihi Aset)', score: 25, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      if (ctx.isZeroDebt) return { key: 'A', score: 100, reason: 'Bebas Hutang (DAR 0,0%)', val: 0, valStr: '0,00%' };
      const darPct = ctx.darPct;
      const valStr = `${darPct.toFixed(2)}%`;
      if (darPct < 70) return { key: 'A', score: 100, reason: `DAR ${valStr} (< 70%) - Sehat`, val: darPct, valStr };
      if (darPct < 80) return { key: 'B', score: 75, reason: `DAR ${valStr} (70%-80%) - Wajar`, val: darPct, valStr };
      if (darPct < 100) return { key: 'C', score: 50, reason: `DAR ${valStr} (80%-100%) - Dominasi Utang`, val: darPct, valStr };
      return { key: 'D', score: 25, reason: `DAR ${valStr} (≥ 100%) - Aset di bawah total kewajiban`, val: darPct, valStr };
    }
  },
  {
    id: 'r_roa',
    num: 6,
    name: 'Return on Assets (ROA) %',
    category: 'Profitabilitas',
    formula: '(EAT / Total Aset) × 100%',
    racStd: '≥ 1,00%',
    desc: 'Efisiensi dan kemampuan total aset menghasilkan laba bersih setelah pajak.',
    weight: 0.10,
    weightPct: 10,
    options: [
      { key: 'A', text: '≥ 3,00% (Produktivitas Aset Tinggi)', score: 100, passRac: true },
      { key: 'B', text: '≥ 1,00% s/d < 3,00% (Memenuhi Standar RAC)', score: 70, passRac: true },
      { key: 'C', text: '≥ 0,10% s/d < 1,00% (Di Bawah Standar RAC)', score: 40, passRac: false },
      { key: 'D', text: '< 0,10% (Rugi / Nihil)', score: 20, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const roa = ctx.roa;
      const valStr = `${roa.toFixed(2)}%`;
      if (roa >= 3.0) return { key: 'A', score: 100, reason: `ROA ${valStr} (≥ 3%) - Sangat Produktif`, val: roa, valStr };
      if (roa >= 1.0) return { key: 'B', score: 70, reason: `ROA ${valStr} (1%-3%) - Memenuhi RAC (≥ 1%)`, val: roa, valStr };
      if (roa >= 0.1) return { key: 'C', score: 40, reason: `ROA ${valStr} di bawah RAC (0,1%-1%)`, val: roa, valStr };
      return { key: 'D', score: 20, reason: `ROA ${valStr} (< 0,1%) - Profitabilitas defisit`, val: roa, valStr };
    }
  },
  {
    id: 'r_roe',
    num: 7,
    name: 'Return on Equity (ROE) %',
    category: 'Profitabilitas',
    formula: '(EAT / Total Ekuitas) × 100%',
    racStd: '≥ 5,00%',
    desc: 'Tingkat pengembalian keuntungan bersih atas modal pemegang saham.',
    weight: 0.10,
    weightPct: 10,
    options: [
      { key: 'A', text: '≥ 10,00% (Imbal Modal Superior)', score: 100, passRac: true },
      { key: 'B', text: '≥ 5,00% s/d < 10,00% (Memenuhi Standar RAC)', score: 75, passRac: true },
      { key: 'C', text: '≥ 1,00% s/d < 5,00% (Di Bawah RAC)', score: 40, passRac: false },
      { key: 'D', text: '< 1,00% (Rugi / Nihil)', score: 20, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const roe = ctx.roe;
      const valStr = `${roe.toFixed(2)}%`;
      if (roe >= 10.0) return { key: 'A', score: 100, reason: `ROE ${valStr} (≥ 10%) - Unggul`, val: roe, valStr };
      if (roe >= 5.0) return { key: 'B', score: 75, reason: `ROE ${valStr} (5%-10%) - Memenuhi RAC (≥ 5%)`, val: roe, valStr };
      if (roe >= 1.0) return { key: 'C', score: 40, reason: `ROE ${valStr} di bawah RAC (1%-5%)`, val: roe, valStr };
      return { key: 'D', score: 20, reason: `ROE ${valStr} (< 1%) - Ekuitas tidak bertumbuh`, val: roe, valStr };
    }
  },
  {
    id: 'r_npm',
    num: 8,
    name: 'Net Profit Margin (NPM) %',
    category: 'Profitabilitas',
    formula: '(EAT / Penjualan) × 100%',
    racStd: '≥ 3,00%',
    desc: 'Persentase margin laba bersih yang tersisa dari setiap Rupiah omzet penjualan.',
    weight: 0.15,
    weightPct: 15,
    options: [
      { key: 'A', text: '≥ 8,00% (Margin Sangat Sehat)', score: 100, passRac: true },
      { key: 'B', text: '≥ 5,00% s/d < 8,00% (Sehat)', score: 80, passRac: true },
      { key: 'C', text: '≥ 3,00% s/d < 5,00% (Memenuhi Standar)', score: 60, passRac: true },
      { key: 'D', text: '≥ 1,00% s/d < 3,00% (Margin Tipis)', score: 40, passRac: false },
      { key: 'E', text: '< 1,00% (Rentan Defisit)', score: 20, passRac: false }
    ],
    evalAuto: (proj, m, f23, ctx) => {
      const npm = ctx.npm;
      const valStr = `${npm.toFixed(2)}%`;
      if (npm >= 8.0) return { key: 'A', score: 100, reason: `NPM ${valStr} (≥ 8%) - Sangat Sehat`, val: npm, valStr };
      if (npm >= 5.0) return { key: 'B', score: 80, reason: `NPM ${valStr} (5%-8%) - Sehat`, val: npm, valStr };
      if (npm >= 3.0) return { key: 'C', score: 60, reason: `NPM ${valStr} (3%-5%) - Wajar`, val: npm, valStr };
      if (npm >= 1.0) return { key: 'D', score: 40, reason: `NPM ${valStr} (1%-3%) - Margin Tipis`, val: npm, valStr };
      return { key: 'E', score: 20, reason: `NPM ${valStr} (< 1%) - Berisiko rugi saat ada shock biaya`, val: npm, valStr };
    }
  }
];

function computeFinancialRatiosAnalysis(proj, f23 = {}, m = null) {
  const eq = (m && typeof m.eq23 === 'number') ? m.eq23 : ((f23.capital || 0) + (f23.otherCap || 0) + (f23.retEarn || 0) + (f23.re || 0));
  const tl = (m && typeof m.tl23 === 'number') ? m.tl23 : ((f23.ap || 0) + (f23.stDebt || 0) + (f23.otherAp || 0) + (f23.accrued || 0) + (f23.ltDebt || 0));
  const isZeroDebt = tl === 0 || (m && m.tl23 === 0) || (typeof m?.der23 === 'number' && m.der23 === 0);
  const der = isZeroDebt ? 0 : ((m && typeof m.der23 === 'number') ? m.der23 : (eq > 0 ? tl / eq : 99));
  const cr = (m && typeof m.currentRatio23 === 'number') ? m.currentRatio23 : ((f23.ca || 1) / Math.max(1, f23.cl || 1));
  const isNoDebtCL = (m && (m.currentRatio23 === null || m.isNoDebt23)) || (f23.cl === 0 || !f23.cl) || isZeroDebt;

  const qrPct = (m && typeof m.quickRatio23 === 'number') ? m.quickRatio23 * 100 : (((f23.ca || 0) - (f23.inv || 0)) / Math.max(1, f23.cl || 1)) * 100;
  const cashRatioPct = ((f23.cash || 0) / Math.max(1, f23.cl || 1)) * 100;
  const roa = (m && typeof m.roa23 === 'number') ? m.roa23 : (((f23.eat || f23.netInc || 0) / Math.max(1, f23.ta || 1)) * 100);
  const roe = (m && typeof m.roe23 === 'number') ? m.roe23 : (((f23.eat || f23.netInc || 0) / Math.max(1, eq || 1)) * 100);
  const npm = (m && typeof m.npm23 === 'number') ? m.npm23 : (((f23.eat || f23.netInc || 0) / Math.max(1, f23.rev || 1)) * 100);
  const darPct = (tl / Math.max(1, f23.ta || (tl + eq))) * 100;

  const ctx = {
    cr,
    qrPct,
    cashRatioPct,
    roa,
    roe,
    npm,
    der,
    darPct,
    isZeroDebt,
    isNoDebtCL
  };

  const overrides = proj.ratioOverrides || {};
  let totalScoreRaw = 0;
  let passRacCount = 0;

  const evaluatedRatios = ASKRINDO_RATIOS_CATALOG.map((r) => {
    const autoRes = r.evalAuto(proj, m, f23, ctx);
    const isOverridden = overrides[r.id] !== undefined && overrides[r.id] !== null && overrides[r.id] !== '';
    const chosenKey = isOverridden ? overrides[r.id] : autoRes.key;
    const opt = r.options.find((o) => o.key === chosenKey) || r.options[0];
    const score = opt.score;
    const weightedScore = Number((score * r.weight).toFixed(2));
    totalScoreRaw += score * r.weight;

    const isPassRac = opt.passRac === true;
    if (isPassRac) passRacCount++;

    return {
      id: r.id,
      num: r.num,
      name: r.name,
      category: r.category,
      formula: r.formula,
      racStd: r.racStd,
      desc: r.desc,
      weight: r.weight,
      weightPct: r.weightPct,
      options: r.options,
      chosenKey,
      chosenText: opt.text,
      score,
      weightedScore,
      isOverridden,
      autoKey: autoRes.key,
      autoReason: autoRes.reason,
      valStr: autoRes.valStr,
      passRac: isPassRac
    };
  });

  const totalScore = Math.max(0, Math.min(100, Math.round(totalScoreRaw)));
  const failRacCount = evaluatedRatios.length - passRacCount;
  const healthLabel = totalScore >= 80 ? 'Sangat Sehat (Prime)' : (totalScore >= 60 ? 'Sehat (Moderate)' : 'Rentan (High Risk)');
  const healthColor = totalScore >= 80 ? '#15803d' : (totalScore >= 60 ? '#0284c7' : '#dc2626');
  const healthBg = totalScore >= 80 ? '#f0fdf4' : (totalScore >= 60 ? '#f0f9ff' : '#fef2f2');

  return {
    totalScore,
    healthLabel,
    healthColor,
    healthBg,
    passRacCount,
    failRacCount,
    evaluatedRatios
  };
}

function updateRatioParameter(paramId, optKey) {
  const proj = getActiveProject();
  if (!proj) return;
  if (!proj.ratioOverrides) proj.ratioOverrides = {};
  proj.ratioOverrides[paramId] = optKey;
  saveProjectsToStorage();
  renderAll();
  const param = ASKRINDO_RATIOS_CATALOG.find((p) => p.id === paramId);
  const opt = param ? param.options.find((o) => o.key === optKey) : null;
  const score = opt ? opt.score : 0;
  showToast(`Rasio #${param ? param.num : ''} (${param ? param.name : paramId}) disesuaikan: Opsi ${optKey} (${score} Poin)`);
}

function resetRatioParameterToAuto(paramId) {
  const proj = getActiveProject();
  if (!proj || !proj.ratioOverrides) return;
  delete proj.ratioOverrides[paramId];
  saveProjectsToStorage();
  renderAll();
  const param = ASKRINDO_RATIOS_CATALOG.find((p) => p.id === paramId);
  showToast(`Rasio #${param ? param.num : ''} (${param ? param.name : paramId}) dikembalikan ke otomatis sistem.`);
}

function resetAllRatioParametersToAuto() {
  const proj = getActiveProject();
  if (!proj) return;
  proj.ratioOverrides = {};
  saveProjectsToStorage();
  renderAll();
  showToast('Seluruh parameter Rasio Keuangan berhasil dikembalikan ke kalkulasi otomatis neraca!');
}

function renderRatiosTab(proj, m) {
  const container = document.getElementById('ratiosTableContainer');
  if (!container) return;

  if (!m || !m.hasFinancials) {
    container.innerHTML = `
      <div style="background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:8px; padding:2.5rem 1.5rem; text-align:center; color:#64748b;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8" style="margin:0 auto 0.75rem auto; display:block;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h4 style="font-size:1.05rem; font-weight:800; color:#334155; margin-bottom:0.35rem;">Laporan Keuangan Belum Diinput</h4>
        <p style="font-size:0.82rem; max-width:480px; margin:0 auto 1rem auto; line-height:1.45;">Rasio Keuangan (CR, QR, Cash Ratio, DER, DAR, ROA, ROE, NPM, NWC) akan dihitung secara otomatis setelah Anda melengkapi data Neraca &amp; Laba Rugi pada tab "Input Data".</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="switchTab('tab-input')">Menuju Tab Input Data &raquo;</button>
      </div>
    `;
    return;
  }

  const f22 = proj.fin22 || {};
  const f23 = proj.fin23 || {};
  const plafond = proj.requestedPlafond || 0;

  // Calculate Ratios for Year 1 & Year 2
  const isNoDebt22 = !m.cl22 || m.cl22 === 0;
  const isNoDebt23 = !m.cl23 || m.cl23 === 0;
  const cr22 = isNoDebt22 ? null : (m.ca22 / m.cl22) * 100;
  const cr23 = isNoDebt23 ? null : (m.ca23 / m.cl23) * 100;
  const passCR = isNoDebt23 ? true : (cr23 >= 100);

  const qr22 = isNoDebt22 ? null : (((f22.ca || 0) - (f22.inv || 0)) / m.cl22) * 100;
  const qr23 = isNoDebt23 ? null : (((f23.ca || 0) - (f23.inv || 0)) / m.cl23) * 100;
  const passQR = isNoDebt23 ? true : (qr23 >= 60);

  const cashRatio22 = isNoDebt22 ? null : ((f22.cash || 0) / m.cl22) * 100;
  const cashRatio23 = isNoDebt23 ? null : ((f23.cash || 0) / m.cl23) * 100;
  const passCash = isNoDebt23 ? true : (cashRatio23 >= 30);

  const der22 = m.eq22 > 0 ? (m.tl22 / m.eq22) * 100 : 0;
  const der23 = m.eq23 > 0 ? (m.tl23 / m.eq23) * 100 : 0;
  const passDER = der23 <= 400;

  const dar22 = m.ta22 > 0 ? (m.tl22 / m.ta22) * 100 : 0;
  const dar23 = m.ta23 > 0 ? (m.tl23 / m.ta23) * 100 : 0;
  const passDAR = dar23 < 80;

  const roa22 = m.ta22 > 0 ? (m.eat22 / m.ta22) * 100 : 0;
  const roa23 = m.ta23 > 0 ? (m.eat23 / m.ta23) * 100 : 0;
  const passROA = roa23 >= 1.0;

  const roe22 = m.eq22 > 0 ? (m.eat22 / m.eq22) * 100 : 0;
  const roe23 = m.eq23 > 0 ? (m.eat23 / m.eq23) * 100 : 0;
  const passROE = roe23 >= 5.0;

  const npm22 = (f22.rev || 0) > 0 ? ((f22.eat || f22.netInc || 0) / f22.rev) * 100 : 0;
  const npm23 = (f23.rev || 0) > 0 ? ((f23.eat || f23.netInc || 0) / f23.rev) * 100 : 0;
  const passNPM = npm23 >= 3.0;

  const nwc22 = m.nwc22;
  const nwc23 = m.nwc23;
  const passNWC = nwc23 > 0;

  const nwcToCredit22 = plafond > 0 ? (nwc22 / plafond) * 100 : 0;
  const nwcToCredit23 = plafond > 0 ? (nwc23 / plafond) * 100 : 0;
  const passNWCCredit = plafond > 0 && nwcToCredit23 >= 10;

  const icr23 = (m && typeof m.icr23 === 'number') ? m.icr23 : 1.5;

  // Run official Askrindo Financial Ratio Scoring Model
  const ratAnalysis = computeFinancialRatiosAnalysis(proj, f23, m);

  // Existing RAC Compliance list
  const racList = [
    {
      no: 1,
      name: 'Current Ratio (CR)',
      formula: 'Aset Lancar / Liab. Lancar',
      rac: '&ge; 100,00%',
      v22: isNoDebt22 ? 'N/A (Bebas Utang)' : `${fmtNum(cr22, 2)}%`,
      v23: isNoDebt23 ? 'N/A (Bebas Utang)' : `${fmtNum(cr23, 2)}%`,
      pass: passCR,
      ket: isNoDebt23
        ? 'Likuiditas Sangat Prima (N/A): Perusahaan beroperasi murni modal sendiri (Hutang Lancar Rp 0). Risiko gagal bayar kewajiban lancar nihil.'
        : (passCR
          ? `Current Ratio ${fmtNum(cr23, 2)}% memenuhi standar RAC (&ge; 100,00%). Debitur memiliki likuiditas lancar memadai untuk melunasi kewajiban jangka pendek.`
          : `Current Ratio ${fmtNum(cr23, 2)}% di bawah standar RAC (&ge; 100,00%). Likuiditas jangka pendek ketat dan berisiko saat penagihan piutang terlambat.`)
    },
    {
      no: 2,
      name: 'Debt to Equity Ratio (DER)',
      formula: 'Total Liab. / Total Ekuitas',
      rac: '&le; 400,00%',
      v22: fmtNum(der22, 2) + '%',
      v23: fmtNum(der23, 2) + '%',
      pass: passDER,
      ket: passDER
        ? `DER ${fmtNum(der23, 2)}% memenuhi standar RAC (&le; 400,00%). Tingkat leverage permodalan debitur dalam toleransi risiko wajar.`
        : `DER ${fmtNum(der23, 2)}% melampaui standar RAC (&le; 400,00%). Beban utang terlalu dominan terhadap modal sendiri.`
    },
    {
      no: 3,
      name: 'Return on Assets (ROA)',
      formula: 'EAT / Total Aset',
      rac: '&ge; 1,00%',
      v22: fmtNum(roa22, 2) + '%',
      v23: fmtNum(roa23, 2) + '%',
      pass: passROA,
      ket: passROA
        ? `ROA ${fmtNum(roa23, 2)}% memenuhi standar RAC (&ge; 1,00%). Aset perusahaan bekerja produktif menghasilkan laba bersih.`
        : `ROA ${fmtNum(roa23, 2)}% di bawah standar RAC (&ge; 1,00%). Efisiensi pemanfaatan aset masih perlu ditingkatkan.`
    },
    {
      no: 4,
      name: 'Return on Equity (ROE)',
      formula: 'EAT / Total Ekuitas',
      rac: '&ge; 5,00%',
      v22: fmtNum(roe22, 2) + '%',
      v23: fmtNum(roe23, 2) + '%',
      pass: passROE,
      ket: passROE
        ? `ROE ${fmtNum(roe23, 2)}% memenuhi standar RAC (&ge; 5,00%). Imbal hasil modal memadai untuk pertumbuhan internal.`
        : `ROE ${fmtNum(roe23, 2)}% di bawah standar RAC (&ge; 5,00%). Kemampuan mencetak keuntungan ekuitas belum optimal.`
    },
    {
      no: 5,
      name: 'Net Working Capital (NWC)',
      formula: 'Aset Lancar &minus; Liab. Lancar',
      rac: '> Rp 0',
      v22: fmtRp(nwc22, true),
      v23: fmtRp(nwc23, true),
      pass: passNWC,
      ket: passNWC
        ? `NWC bernilai positif (${fmtRp(nwc23, true)}) memenuhi standar RAC (> Rp 0). Aset lancar surplus terhadap kewajiban jangka pendek.`
        : `NWC bernilai negatif (${fmtRp(nwc23, true)}) tidak memenuhi standar RAC (> Rp 0). Terjadi defisit modal kerja riil.`
    },
    {
      no: 6,
      name: 'NWC / Plafond Kredit',
      formula: 'NWC Riil / Plafond Kredit',
      rac: '&ge; 10,00%',
      v22: plafond > 0 ? fmtNum(nwcToCredit22, 2) + '%' : 'N/A',
      v23: plafond > 0 ? fmtNum(nwcToCredit23, 2) + '%' : 'N/A',
      pass: passNWCCredit,
      ket: passNWCCredit
        ? `Rasio NWC/Plafond ${fmtNum(nwcToCredit23, 2)}% memenuhi standar RAC (&ge; 10,00%). Debitur memiliki penyangga modal kerja bersih memadai.`
        : `Rasio NWC/Plafond ${fmtNum(nwcToCredit23, 2)}% di bawah standar RAC (&ge; 10,00%). Penyangga modal kerja terlalu tipis relatif terhadap nilai fasilitas.`
    }
  ];

  const passRacCount = racList.filter((r) => r.pass).length;
  const failRacCount = racList.length - passRacCount;

  container.innerHTML = `
    <!-- 1. EXECUTIVE STATUS BANNER -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem; padding:0.85rem 1.1rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
      <div>
        <div style="font-size:0.85rem; font-weight:800; color:var(--askrindo-navy);">
          Analisis &amp; Skoring Rasio Keuangan Debitur (${proj.companyName})
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
          Model Evaluasi Resmi Petunjuk Teknis Askrindo / PT. IDX Consulting &amp; Kepatuhan Risk Acceptance Criteria (RAC) - Tahun Evaluasi ${m.yr2}.
        </div>
      </div>
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <span style="font-size:0.76rem; font-weight:800; padding:4px 10px; border-radius:6px; border:1px solid ${ratAnalysis.healthColor}; background:${ratAnalysis.healthBg}; color:${ratAnalysis.healthColor};">
          Skor Rasio: ${ratAnalysis.totalScore} / 100 (${ratAnalysis.healthLabel})
        </span>
        <span class="badge-rac badge-rac-pass" style="font-size:0.76rem; padding:4px 8px;">
          ${passRacCount} RAC LULUS
        </span>
        <span class="badge-rac badge-rac-fail" style="font-size:0.76rem; padding:4px 8px;">
          ${failRacCount} TIDAK LULUS
        </span>
        <button type="button" class="btn btn-outline btn-sm" onclick="resetAllRatioParametersToAuto()" title="Reset seluruh pilihan rasio ke hitungan otomatis neraca" style="font-size:0.7rem; padding:3px 8px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:3px;"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Reset ke Otomatis Neraca
        </button>
      </div>
    </div>

    <!-- 2. 4 EXECUTIVE KPI CARDS -->
    <div class="grid-4" style="margin-bottom:1rem;">
      <!-- Likuiditas -->
      <div class="kpi-card ${passCR ? 'kpi-green' : 'kpi-red'}">
        <div class="kpi-label">Likuiditas Lancar (CR &amp; QR)</div>
        <div class="kpi-value" style="font-size:1.15rem; color:${passCR ? '#15803d' : '#dc2626'};">
          CR: ${isNoDebt23 ? 'Bebas Utang' : fmtNum(cr23, 1) + '%'}
        </div>
        <div class="kpi-sub">
          <span>QR: ${isNoDebt23 ? 'N/A' : fmtNum(qr23, 1) + '%'} | Cash: ${isNoDebt23 ? 'N/A' : fmtNum(cashRatio23, 1) + '%'}</span>
          <span style="font-weight:700;">${passCR ? 'Likuid' : 'Ketat'}</span>
        </div>
      </div>

      <!-- Solvabilitas -->
      <div class="kpi-card ${passDER ? 'kpi-green' : 'kpi-red'}">
        <div class="kpi-label">Solvabilitas &amp; Leverage (DER &amp; DAR)</div>
        <div class="kpi-value" style="font-size:1.15rem; color:${passDER ? '#15803d' : '#dc2626'};">
          DER: ${fmtNum(der23, 1)}%
        </div>
        <div class="kpi-sub">
          <span>DAR: ${fmtNum(dar23, 1)}% (Aset ${fmtRp(m.ta23, true)})</span>
          <span style="font-weight:700;">${passDER ? 'Aman' : 'Tinggi'}</span>
        </div>
      </div>

      <!-- Profitabilitas -->
      <div class="kpi-card ${passROA && passROE ? 'kpi-green' : (roa23 > 0 ? 'kpi-gold' : 'kpi-red')}">
        <div class="kpi-label">Profitabilitas (ROA &amp; ROE)</div>
        <div class="kpi-value" style="font-size:1.15rem; color:${roa23 >= 1 ? '#15803d' : '#dc2626'};">
          ROA: ${fmtNum(roa23, 2)}%
        </div>
        <div class="kpi-sub">
          <span>ROE: ${fmtNum(roe23, 1)}% | NPM: ${fmtNum(npm23, 1)}%</span>
          <span style="font-weight:700;">EAT: ${fmtRp(m.eat23, true)}</span>
        </div>
      </div>

      <!-- Modal Kerja -->
      <div class="kpi-card ${passNWC ? 'kpi-blue' : 'kpi-red'}">
        <div class="kpi-label">Modal Kerja Bersih (NWC) &amp; ICR</div>
        <div class="kpi-value" style="font-size:1.15rem; color:${passNWC ? '#0369a1' : '#dc2626'};">
          NWC: ${fmtRp(nwc23, true)}
        </div>
        <div class="kpi-sub">
          <span>NWC/Plafond: ${plafond > 0 ? fmtNum(nwcToCredit23, 1) + '%' : 'N/A'}</span>
          <span style="font-weight:700;">ICR: ${fmtNum(icr23, 1)}x</span>
        </div>
      </div>
    </div>

    <!-- 3. BAGIAN I: TABEL EVALUASI & SKORING RASIO KEUANGAN (PETUNJUK TEKNIS) -->
    <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04); margin-bottom:1.25rem;">
      <div style="padding:0.75rem 1rem; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <div style="font-size:0.82rem; font-weight:800; color:var(--askrindo-navy);">
            I. Tabel Perhitungan &amp; Evaluasi Skoring Rasio Keuangan (Petunjuk Teknis Askrindo / PT. IDX Consulting)
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            8 Rasio Keuangan Inti: Perhitungan otomatis 100% dari data Neraca &amp; Laba Rugi dengan fleksibilitas penyesuaian opsi underwriter.
          </div>
        </div>
        <span style="font-size:0.75rem; font-weight:800; color:#0369a1; background:#e0f2fe; padding:2px 8px; border-radius:4px;">
          Total Bobot: 100.00%
        </span>
      </div>

      <div class="table-responsive">
        <table class="data-table" style="font-size:0.74rem;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="width:36px; text-align:center;">No</th>
              <th style="min-width:220px;">Indikator Rasio &amp; Formula</th>
              <th style="width:85px; text-align:center;">Thn ${m.yr1}</th>
              <th style="width:115px; text-align:center; background:#e0f2fe; color:#0369a1;">Thn ${m.yr2} (Eval)</th>
              <th style="width:65px; text-align:center;">Bobot</th>
              <th style="min-width:280px;">Standar Opsi &amp; Pilihan Terpilih</th>
              <th style="width:65px; text-align:center;">Nilai</th>
              <th style="width:75px; text-align:right;">Skor Bobot</th>
              <th style="min-width:180px;">Analisis &amp; Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${ratAnalysis.evaluatedRatios.map((r) => {
              const histVal = r.id === 'r_cr' ? (isNoDebt22 ? 'N/A' : fmtNum(cr22, 2) + '%')
                : (r.id === 'r_qr' ? (isNoDebt22 ? 'N/A' : fmtNum(qr22, 2) + '%')
                : (r.id === 'r_cash' ? (isNoDebt22 ? 'N/A' : fmtNum(cashRatio22, 2) + '%')
                : (r.id === 'r_der' ? fmtNum(der22, 2) + '%'
                : (r.id === 'r_dar' ? fmtNum(dar22, 2) + '%'
                : (r.id === 'r_roa' ? fmtNum(roa22, 2) + '%'
                : (r.id === 'r_roe' ? fmtNum(roe22, 2) + '%'
                : fmtNum(npm22, 2) + '%'))))));

              return `
                <tr>
                  <td style="text-align:center; font-weight:700; color:#64748b;">${r.num}</td>
                  <td>
                    <div style="font-weight:800; color:#1e293b;">${r.name}</div>
                    <div style="font-size:0.65rem; color:#64748b; margin-top:1px;">Formula: <code>${r.formula}</code></div>
                    <div style="font-size:0.63rem; color:#0284c7; margin-top:2px;">Standar RAC: <strong>${r.racStd}</strong></div>
                  </td>
                  <td style="text-align:center; color:#64748b; font-weight:600;">${histVal}</td>
                  <td style="text-align:center; font-weight:800; background:#f0f9ff; color:${r.passRac ? '#15803d' : '#b91c1c'}; font-size:0.8rem;">
                    ${r.valStr}
                  </td>
                  <td style="text-align:center; font-weight:700; color:var(--askrindo-navy);">
                    ${r.weightPct}%
                  </td>
                  <td>
                    <select class="form-control" style="font-size:0.72rem; padding:3px 6px; width:100%; border-color:${r.isOverridden ? '#f59e0b' : '#cbd5e1'};" onchange="updateRatioParameter('${r.id}', this.value)">
                      ${r.options.map((opt) => `
                        <option value="${opt.key}" ${opt.key === r.chosenKey ? 'selected' : ''}>
                          [${opt.key}] ${opt.text} (${opt.score} Poin)
                        </option>
                      `).join('')}
                    </select>
                    ${r.isOverridden ? `
                      <div style="font-size:0.62rem; color:#b45309; margin-top:2px; display:flex; justify-content:space-between; align-items:center;">
                        <span>&#9998; Disesuaikan manual (Auto: Opsi ${r.autoKey})</span>
                        <a href="javascript:void(0)" onclick="resetRatioParameterToAuto('${r.id}')" style="color:#0284c7; text-decoration:none; font-weight:700;">Reset Auto</a>
                      </div>
                    ` : ''}
                  </td>
                  <td style="text-align:center; font-weight:800; color:${r.score >= 80 ? '#15803d' : (r.score >= 60 ? '#0284c7' : '#dc2626')};">
                    ${r.score}
                  </td>
                  <td style="text-align:right; font-weight:800; color:var(--askrindo-navy);">
                    ${r.weightedScore.toFixed(2)}
                  </td>
                  <td style="font-size:0.68rem; color:${r.passRac ? '#166534' : '#991b1b'}; line-height:1.35;">
                    ${r.autoReason || r.desc}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
              <td colspan="4" style="text-align:right; padding:0.6rem 0.8rem;">TOTAL SKOR KESEHATAN RASIO KEUANGAN:</td>
              <td style="text-align:center; color:var(--askrindo-navy);">100%</td>
              <td style="color:#64748b; font-size:0.7rem;">Komposit Bobot Resmi</td>
              <td style="text-align:center; font-size:0.85rem; color:${ratAnalysis.healthColor};">${ratAnalysis.totalScore}</td>
              <td style="text-align:right; font-size:0.85rem; color:${ratAnalysis.healthColor};">${ratAnalysis.totalScore}.00</td>
              <td>
                <span class="badge-rac ${ratAnalysis.totalScore >= 70 ? 'badge-rac-pass' : 'badge-rac-fail'}" style="font-size:0.68rem;">
                  ${ratAnalysis.healthLabel}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 4. BAGIAN II: MATRIKS KEPATUHAN STANDAR RISK ACCEPTANCE CRITERIA (RAC) -->
    <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="padding:0.75rem 1rem; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <div style="font-size:0.82rem; font-weight:800; color:var(--askrindo-navy);">
            II. Matriks Kepatuhan Risk Acceptance Criteria (RAC) Askrindo - Tahun Buku ${m.yr2}
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            Evaluasi 6 Rasio Standar Akseptasi Penjaminan Kredit: Current Ratio, DER, ROA, ROE, NWC, dan NWC/Plafond Kredit.
          </div>
        </div>
        <div style="display:flex; gap:0.4rem; align-items:center;">
          <span class="badge-rac badge-rac-pass" style="font-size:0.75rem; padding:3px 8px;">${passRacCount} RAC LULUS</span>
          <span class="badge-rac badge-rac-fail" style="font-size:0.75rem; padding:3px 8px;">${failRacCount} TIDAK LULUS</span>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table ratios-table">
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-indicator">Indikator Rasio</th>
              <th class="col-formula">Rumus Perhitungan</th>
              <th class="col-rac">Standar RAC</th>
              <th class="col-val">Tahun ${m.yr1}</th>
              <th class="col-eval">Tahun ${m.yr2} (Eval)</th>
              <th class="col-status">Status RAC</th>
              <th class="col-notes">Analisis &amp; Keterangan Komparasi</th>
            </tr>
          </thead>
          <tbody>
            ${racList.map((r) => `
              <tr>
                <td class="col-no">${r.no}</td>
                <td class="col-indicator">${r.name}</td>
                <td class="col-formula">${r.formula}</td>
                <td class="col-rac">${r.rac}</td>
                <td class="col-val" style="color:var(--text-muted);">${r.v22}</td>
                <td class="col-eval" style="color:${r.pass ? '#15803d' : '#b91c1c'};">${r.v23}</td>
                <td class="col-status">
                  <span class="badge-rac ${r.pass ? 'badge-rac-pass' : 'badge-rac-fail'}">
                    ${r.pass ? 'LULUS' : 'TIDAK LULUS'}
                  </span>
                </td>
                <td class="col-notes" style="color:${r.pass ? '#14532d' : '#7f1d1d'};">
                  ${r.ket}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}


// 10B. RENDER TAB PROYEKSI CASH FLOW (FORWARD-LOOKING 12-MONTH REPAYMENT ADEQUACY)
// ============================================================================
function renderCashFlowTab(proj, m) {
  const container = document.getElementById('cashFlowMenuContainer');
  if (!container) return;
  if (!m || !m.hasFinancials) {
    container.innerHTML = getFinEmptyStateHTML('Proyeksi Cash Flow Belum Tersedia', 'Model proyeksi arus kas bulanan (12 Bulan), Debt Service Coverage Ratio (DSCR), dan kecukupan pelunasan SCF AP akan dihitung setelah laporan keuangan dilengkapi.');
    return;
  }
  const cf = m.cfProj || computeCashFlowProjection(proj);

  const statusColor = cf.isHealthy ? '#166534' : '#991b1b';
  const statusBg = cf.isHealthy ? '#f0fdf4' : '#fef2f2';

  // SVG Chart points calculation
  const cashVals = cf.monthlyData.map((d) => d.endingCash);
  const minVal = Math.min(0, ...cashVals);
  const maxVal = Math.max(1000000, ...cashVals);
  const range = maxVal - minVal || 1;
  const svgWidth = 860;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 25;
  const plotW = svgWidth - paddingX * 2;
  const plotH = svgHeight - paddingY * 2;

  // Zero line Y
  const zeroY = paddingY + plotH - ((0 - minVal) / range) * plotH;

  const points = cf.monthlyData.map((d, idx) => {
    const x = paddingX + (idx / 11) * plotW;
    const y = paddingY + plotH - ((d.endingCash - minVal) / range) * plotH;
    return { x, y, val: d.endingCash, month: d.month, isDeficit: d.isDeficit };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  container.innerHTML = `
    <div class="card" style="border-left: 4px solid var(--askrindo-blue);">
      <div class="card-header">
        <div>
          <div class="card-title">Modul Proyeksi Arus Kas &amp; Kapasitas Pelunasan Utang (Cash Flow Projection)</div>
          <p style="font-size:0.71rem; color:var(--text-muted); margin:0.15rem 0 0;">
            Simulasi Forward-Looking 12 Bulan: Menguji kemampuan riil arus kas operasional debitur dalam melunasi bunga &amp; pokok kredit (${proj.companyName}).
          </p>
        </div>
        <span class="badge-method" style="background:#e0f2fe; color:#0369a1;">Pilar 7 Skor ASCA (Maks 10 Poin)</span>
      </div>

      <!-- 4 TOP KPI CARDS -->
      <div class="grid-4" style="margin-bottom:0.75rem;">
        <div class="kpi-card kpi-blue">
          <div class="kpi-label">Pencairan SCF AP &amp; Inflow Kas</div>
          <div class="kpi-value">${fmtRp(cf.totalInflow, true)}</div>
          <div class="kpi-sub">
            <span>Talangan SCF Persediaan: +${fmtRp(cf.totalSCFDrawdown, true)}</span>
            <span style="font-weight:700;">Growth ${cf.salesGrowth >= 0 ? '+' : ''}${cf.salesGrowth}%</span>
          </div>
        </div>

        <div class="kpi-card ${cf.totalNOCF >= 0 ? 'kpi-green' : 'kpi-red'}">
          <div class="kpi-label">Hasil Bersih Konversi Persediaan (NOCF)</div>
          <div class="kpi-value" style="color:${cf.totalNOCF >= 0 ? '#166534' : '#dc2626'};">${fmtRp(cf.totalNOCF, true)}</div>
          <div class="kpi-sub">
            <span>Inflow Kas Jual  -  HPP &amp; OPEX</span>
            <span style="font-weight:700;">${cf.totalNOCF >= 0 ? 'Surplus Konversi Kas' : 'Defisit Konversi Kas'}</span>
          </div>
        </div>

        <div class="kpi-card kpi-gold">
          <div class="kpi-label">Pelunasan SCF AP (Pokok + Bunga)</div>
          <div class="kpi-value">${fmtRp(cf.totalDebtService, true)}</div>
          <div class="kpi-sub">
            <span>Pokok SCF: ${fmtRp(proj.requestedPlafond, true)}</span>
            <span style="font-weight:700;">Bunga ${cf.interestRate}% p.a.</span>
          </div>
        </div>

        <div class="kpi-card ${cf.isHealthy ? 'kpi-green' : 'kpi-red'}">
          <div class="kpi-label">Projected DSCR &amp; Kas Minimum</div>
          <div class="kpi-value" style="color:${statusColor};">${fmtNum(cf.annualDSCR, 2)}x</div>
          <div class="kpi-sub">
            <span>Kas Terendah: ${fmtRp(cf.lowestCash, true)}</span>
            <span style="font-weight:700; color:${statusColor};">${cf.annualDSCR >= 1.20 && cf.lowestCash >= 0 ? 'Kapasitas Bayar Kuat' : 'Risiko Default Tinggi'}</span>
          </div>
        </div>
      </div>

      <!-- ALUR MEKANISME SIKLUS KREDIT SCF AP (PERSEDIAAN -> KAS -> PELUNASAN) -->
      <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:0.6rem 0.9rem; margin-bottom:0.8rem; font-size:0.71rem;">
        <div style="font-weight:800; color:var(--askrindo-navy); margin-bottom:0.3rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
          <span>Mekanisme Siklus Arus Kas Kredit SCF AP (Pembiayaan Pembelian Persediaan &rarr; Konversi Menjadi Kas &rarr; Pelunasan SCF AP)</span>
          <span style="color:#0369a1; font-weight:700;">Total Kas Tersedia (CADS): ${fmtRp(cf.cads, true)} vs Kewajiban SCF: ${fmtRp(cf.totalDebtService, true)}</span>
        </div>
        <div class="grid-4" style="gap:0.5rem;">
          <div style="background:#fff; border:1px solid #e0f2fe; border-radius:6px; padding:0.4rem 0.55rem;">
            <div style="font-weight:800; color:#0369a1;">1. Pencairan SCF AP (Beli Persediaan)</div>
            <div style="color:#334155; margin-top:2px;">Bank menalangi pembayaran supplier persediaan sebesar <strong>+${fmtRp(cf.totalSCFDrawdown, true)}</strong> (${cf.repaymentType === 'semi_annual' ? '2 siklus @ ' + fmtRp(cf.totalSCFDrawdown * 0.5, true) + ' di Bln 1 &amp; Bln 7' : 'cair penuh di Bln 1'}).</div>
          </div>
          <div style="background:#fff; border:1px solid #e0f2fe; border-radius:6px; padding:0.4rem 0.55rem;">
            <div style="font-weight:800; color:#0369a1;">2. Konversi Persediaan Menjadi Kas</div>
            <div style="color:#334155; margin-top:2px;">Persediaan yang dibiayai Bank diproduksi &amp; terjual menjadi piutang lalu cair menjadi kas penjualan sebesar <strong>+${fmtRp(cf.totalInflow, true)}</strong> (DOR ${Math.round(cf.dorDays)} hari).</div>
          </div>
          <div style="background:#fff; border:1px solid #e0f2fe; border-radius:6px; padding:0.4rem 0.55rem;">
            <div style="font-weight:800; color:${cf.totalNOCF >= 0 ? '#166534' : '#dc2626'};">3. Hasil Akhir Konversi Kas (NOCF)</div>
            <div style="color:#334155; margin-top:2px;">Setelah dikurangi HPP persediaan berjalan, OPEX &amp; pajak (-${fmtRp(cf.totalOutflow, true)}), menghasilkan NOCF bersih <strong>${fmtRp(cf.totalNOCF, true)}</strong>.</div>
          </div>
          <div style="background:#fff; border:1px solid #e0f2fe; border-radius:6px; padding:0.4rem 0.55rem;">
            <div style="font-weight:800; color:#b45309;">4. Pelunasan Pokok &amp; Bunga SCF AP</div>
            <div style="color:#334155; margin-top:2px;">Kas hasil penjualan persediaan dipakai melunasi pokok SCF AP (<strong>-${fmtRp(proj.requestedPlafond, true)}</strong>) + bunga (<strong>-${fmtRp(cf.totalDebtService - proj.requestedPlafond, true)}</strong>).</div>
          </div>
        </div>
      </div>

      <!-- CONTROL PANEL: PARAMETER ASUMSI PROYEKSI -->
      <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; padding:0.75rem 1rem; margin-bottom:0.85rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.6rem;">
          <div style="font-weight:800; font-size:0.82rem; color:var(--askrindo-navy);">
            Simulasi Parameter Asumsi Proyeksi (12 Bulan ke Depan)
          </div>
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="setCashFlowPreset('status_quo')" style="font-size:0.68rem;">Skenario Status Quo (Historis)</button>
            <button class="btn btn-outline btn-sm" onclick="setCashFlowPreset('turnaround')" style="font-size:0.68rem; color:#0369a1; border-color:#0284c7;">Skenario Optimasi DCC-SWCM (Target Layak)</button>
            <button class="btn btn-outline btn-sm" onclick="setCashFlowPreset('stress')" style="font-size:0.68rem; color:#b91c1c; border-color:#f87171;">Skenario Konservatif (Stress)</button>
          </div>
        </div>

        <div class="grid-4" style="gap:0.6rem; font-size:0.72rem; align-items:flex-end;">
          <div>
            <label style="display:block; font-weight:700; margin-bottom:0.25rem;">Pertumbuhan Penjualan (% YoY):</label>
            <input type="number" step="0.1" id="cf_inp_growth" class="form-control" value="${typeof cf.salesGrowth === 'number' && !isNaN(cf.salesGrowth) ? Number(cf.salesGrowth).toFixed(1) : '5.0'}" onchange="updateCashFlowCustomParam()" onkeydown="if(event.key==='Enter') updateCashFlowCustomParam()" style="font-size:0.78rem; padding:4px 8px;" />
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:0.25rem;">Target Gross Profit Margin (%):</label>
            <input type="number" step="0.1" id="cf_inp_gpm" class="form-control" value="${typeof cf.targetGPM === 'number' && !isNaN(cf.targetGPM) ? Number(cf.targetGPM).toFixed(1) : '8.0'}" onchange="updateCashFlowCustomParam()" onkeydown="if(event.key==='Enter') updateCashFlowCustomParam()" style="font-size:0.78rem; padding:4px 8px;" />
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:0.25rem;">Hari Piutang / DOR (Hari):</label>
            <input type="number" step="1" id="cf_inp_dor" class="form-control" value="${Math.round(cf.dorDays || 60)}" onchange="updateCashFlowCustomParam()" onkeydown="if(event.key==='Enter') updateCashFlowCustomParam()" style="font-size:0.78rem; padding:4px 8px;" />
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:0.25rem;">Skema Pelunasan Pokok Pinjaman:</label>
            <select id="cf_inp_repayment" class="form-control" onchange="updateCashFlowCustomParam()" style="font-size:0.78rem; padding:4px 8px;">
              <option value="semi_annual" ${cf.repaymentType === 'semi_annual' ? 'selected' : ''}>Dua Tahap / 6 Bulanan (Bln 6 &amp; 12)</option>
              <option value="bullet" ${cf.repaymentType === 'bullet' ? 'selected' : ''}>Pelunasan Penuh Akhir Tenor (Bln 12)</option>
              <option value="amortized" ${cf.repaymentType === 'amortized' ? 'selected' : ''}>Amortisasi Cicilan Bulanan (M1 - M12)</option>
            </select>
          </div>
        </div>
        <div style="margin-top:0.6rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem; padding-top:0.5rem; border-top:1px dashed #cbd5e1;">
          <span style="font-size:0.68rem; color:#64748b;">
            💡 Masukkan target margin / DOR lalu klik <strong>Terapkan &amp; Simpan</strong> (atau tekan <em>Enter</em>).
          </span>
          <button type="button" class="btn btn-primary btn-sm" onclick="updateCashFlowCustomParam()" style="font-size:0.72rem; font-weight:700; padding:4px 12px; display:inline-flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Terapkan &amp; Simpan Parameter
          </button>
        </div>
      </div>

      <!-- VISUALISASI GRAFIK TREN SALDO KAS -->
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem 1rem; margin-bottom:0.85rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <div style="font-weight:800; font-size:0.78rem; color:var(--askrindo-navy);">
            Grafik Proyeksi Saldo Kas Akhir Bulanan (M1 s/d M12)
          </div>
          <div style="font-size:0.68rem; color:var(--text-muted);">
            Garis merah putus-putus menandai batas defisit kas (Rp 0)
          </div>
        </div>

        <div style="width:100%; overflow-x:auto;">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; min-width:650px; height:150px; display:block;">
            <!-- Grid line & Zero line -->
            <line x1="${paddingX}" y1="${zeroY}" x2="${svgWidth - paddingX}" y2="${zeroY}" stroke="${minVal < 0 ? '#dc2626' : '#cbd5e1'}" stroke-width="1.8" stroke-dasharray="${minVal < 0 ? '4,4' : 'none'}" />
            <text x="${paddingX - 6}" y="${zeroY + 4}" font-size="9" text-anchor="end" fill="#64748b" font-weight="700">Rp 0</text>

            <!-- Line chart -->
            <polyline fill="none" stroke="${cf.lowestCash >= 0 ? '#0284c7' : '#dc2626'}" stroke-width="2.5" points="${polylineStr}" />

            <!-- Points & labels -->
            ${points.map((p) => `
              <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${p.isDeficit ? '#dc2626' : '#0284c7'}" stroke="#fff" stroke-width="1.5" />
              <text x="${p.x.toFixed(1)}" y="${p.y < 35 ? p.y + 14 : p.y - 7}" font-size="8" text-anchor="middle" font-weight="700" fill="${p.isDeficit ? '#991b1b' : '#0f172a'}">
                ${fmtRp(p.val, true)}
              </text>
              <text x="${p.x.toFixed(1)}" y="${svgHeight - 4}" font-size="9" text-anchor="middle" fill="#64748b" font-weight="600">
                M${p.month}
              </text>
            `).join('')}
          </svg>
        </div>
      </div>

      <!-- TABEL RINCIAN BULANAN 12 BULAN (1-VIEW FIT) -->
      <div style="max-width:1120px; margin:0 auto 0.6rem auto; padding:0.65rem 0.85rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
        <div>
          <div style="font-weight:900; font-size:0.95rem; color:var(--askrindo-navy, #003366); line-height:1.3; letter-spacing:-0.2px;">
            Tabel Rincian Proyeksi Arus Kas Bulanan (12 Bulan)
          </div>
          <div style="font-weight:700; font-size:0.82rem; color:#0284c7; margin-top:3px; display:flex; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span>&amp; Siklus Konversi SCF AP</span>
            <span style="font-size:0.74rem; background:#e0f2fe; color:#0369a1; padding:2px 7px; border-radius:4px; font-weight:600;">
              Persediaan &rarr; Kas Masuk (CCC &amp; Debt Service)
            </span>
          </div>
          <div style="font-size:0.70rem; color:#64748b; margin-top:3px;">
            Rincian mutasi kas masuk, beban operasional, pelunasan pokok &amp; bunga SCF, serta projected DSCR bulanan.
          </div>
        </div>
        <div style="font-size:0.72rem; color:#475569; font-style:italic; background:#ffffff; padding:4px 10px; border-radius:6px; border:1px solid #cbd5e1; box-shadow:0 1px 2px rgba(0,0,0,0.03); white-space:nowrap;">
          ✨ Arahkan kursor pada angka untuk rincian nominal penuh
        </div>
      </div>
      <div style="width:100%; max-width:1120px; margin:0 auto 0.75rem auto; overflow-x:auto; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
        <table class="data-table" style="font-size:0.73rem; width:100%; min-width:960px; table-layout:fixed; border-collapse:collapse; text-align:right;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
              <th style="width:5.5%; text-align:center; padding:7px 2px; font-size:0.70rem; color:#1e293b; line-height:1.2; vertical-align:middle;" title="Periode Proyeksi Bulan ke-1 s/d ke-12">
                Bulan<br/><span style="font-size:0.60rem; color:#64748b; font-weight:600;">(Periode)</span>
              </th>
              <th class="num-col" style="width:8%; padding:7px 3px; font-size:0.70rem; color:#1e293b; line-height:1.2; vertical-align:middle;" title="Saldo Kas di Awal Periode">
                Kas Awal<br/><span style="font-size:0.60rem; color:#64748b; font-weight:600;">(Opening)</span>
              </th>
              <th class="num-col" style="width:7.5%; padding:7px 3px; font-size:0.70rem; color:#0284c7; line-height:1.2; vertical-align:middle;" title="Pencairan Kredit SCF AP oleh Bank untuk Pembelian Persediaan">
                Pencairan<br/><span style="font-size:0.60rem; font-weight:700;">+SCF AP</span>
              </th>
              <th class="num-col" style="width:8%; padding:7px 3px; font-size:0.70rem; color:#0369a1; line-height:1.2; vertical-align:middle;" title="Kas Masuk Hasil Penjualan Persediaan">
                Kas Masuk<br/><span style="font-size:0.60rem; font-weight:700;">+Inflow</span>
              </th>
              <th class="num-col" style="width:8%; padding:7px 3px; font-size:0.70rem; color:#b91c1c; line-height:1.2; vertical-align:middle;" title="Outflow Pembayaran HPP Persediaan">
                Bayar HPP<br/><span style="font-size:0.60rem; font-weight:700;">-COGS</span>
              </th>
              <th class="num-col" style="width:7.5%; padding:7px 3px; font-size:0.70rem; color:#b91c1c; line-height:1.2; vertical-align:middle;" title="Outflow Beban Operasional">
                Beban Ops<br/><span style="font-size:0.60rem; font-weight:700;">-OPEX</span>
              </th>
              <th class="num-col" style="width:8%; padding:7px 3px; font-size:0.70rem; color:#166534; line-height:1.2; vertical-align:middle;" title="Net Operating Cash Flow (Arus Kas Operasi Bersih)">
                Arus Ops<br/><span style="font-size:0.60rem; font-weight:700;">(NOCF)</span>
              </th>
              <th class="num-col" style="width:7%; padding:7px 3px; font-size:0.70rem; color:#b45309; line-height:1.2; vertical-align:middle;" title="Beban Bunga Fasilitas SCF AP">
                Bunga SCF<br/><span style="font-size:0.60rem; font-weight:700;">-Bunga</span>
              </th>
              <th class="num-col" style="width:7.5%; padding:7px 3px; font-size:0.70rem; color:#b45309; line-height:1.2; vertical-align:middle;" title="Pelunasan Pokok Fasilitas SCF AP">
                Pokok SCF<br/><span style="font-size:0.60rem; font-weight:700;">-Pokok</span>
              </th>
              <th class="num-col" style="width:8.5%; padding:7px 3px; font-size:0.70rem; color:#0f172a; font-weight:800; line-height:1.2; vertical-align:middle;" title="Total Kewajiban Debt Service (Bunga + Pokok SCF)">
                Debt Service<br/><span style="font-size:0.60rem; font-weight:700;">(Bunga+Pokok)</span>
              </th>
              <th class="num-col" style="width:8.5%; padding:7px 3px; font-size:0.70rem; color:#0f172a; font-weight:800; line-height:1.2; vertical-align:middle;" title="Saldo Kas Akhir Periode">
                Kas Akhir<br/><span style="font-size:0.60rem; font-weight:700;">(Ending Cash)</span>
              </th>
              <th class="num-col" style="width:6.5%; padding:7px 3px; font-size:0.70rem; color:#0f172a; font-weight:800; line-height:1.2; vertical-align:middle;" title="Monthly Debt Service Coverage Ratio">
                DSCR<br/><span style="font-size:0.60rem; font-weight:700;">(Coverage)</span>
              </th>
              <th style="width:7.5%; text-align:center; padding:7px 2px; font-size:0.70rem; color:#1e293b; line-height:1.2; vertical-align:middle;" title="Status Likuiditas Kas Bulanan">
                Status<br/><span style="font-size:0.60rem; color:#64748b; font-weight:600;">(Likuiditas)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            ${cf.monthlyData.map((d) => `
              <tr style="${d.isDeficit ? 'background:#fef2f2;' : ''} border-bottom:1px solid #f1f5f9;">
                <td style="text-align:center; font-weight:700; padding:5px 2px; font-size:0.72rem; white-space:nowrap;" title="Bulan ke-${d.month}">ke-${d.month}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap;" title="Kas Awal Bulan ${d.month}: ${fmtRp(d.begCash)}">${fmtRp(d.begCash, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; color:${d.scfDrawdown > 0 ? '#0284c7' : '#94a3b8'}; font-weight:700;" title="Pencairan SCF: ${fmtRp(d.scfDrawdown)}">${d.scfDrawdown > 0 ? `+${fmtRp(d.scfDrawdown, true)}` : '-'}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; color:#0369a1; font-weight:600;" title="Inflow Kas: ${fmtRp(d.cashInflow)}">+${fmtRp(d.cashInflow, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; color:#b91c1c;" title="Outflow HPP: ${fmtRp(d.cogsPayment)}">-${fmtRp(d.cogsPayment, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; color:#b91c1c;" title="Outflow OPEX: ${fmtRp(d.opexPayment)}">-${fmtRp(d.opexPayment, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; font-weight:700; color:${d.nocf >= 0 ? '#166534' : '#dc2626'};" title="NOCF: ${fmtRp(d.nocf)}">${fmtRp(d.nocf, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap;" title="Bunga SCF: ${fmtRp(d.monthlyInterest)}">-${fmtRp(d.monthlyInterest, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; font-weight:${d.principalRepayment > 0 ? '700' : '400'};" title="Pokok SCF: ${fmtRp(d.principalRepayment)}">${d.principalRepayment > 0 ? `-${fmtRp(d.principalRepayment, true)}` : '-'}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; font-weight:700; color:#b45309;" title="Debt Service: ${fmtRp(d.debtService)}">${fmtRp(d.debtService, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; font-weight:800; color:${d.endingCash >= 0 ? '#166534' : '#dc2626'};" title="Kas Akhir: ${fmtRp(d.endingCash)}">${fmtRp(d.endingCash, true)}</td>
                <td class="num-col" style="padding:5px 3px; font-size:0.72rem; white-space:nowrap; font-weight:700; color:${d.monthDSCR >= 1.2 ? '#166534' : (d.monthDSCR >= 1.0 ? '#b45309' : '#dc2626')};" title="DSCR Bulan ${d.month}: ${fmtNum(d.monthDSCR, 2)}x">${fmtNum(d.monthDSCR, 2)}x</td>
                <td style="text-align:center; padding:5px 2px; white-space:nowrap;">
                  <span style="font-size:0.65rem; padding:2px 5px; border-radius:3px; font-weight:700; display:inline-block; background:${d.isDeficit ? '#fee2e2; color:#991b1b;' : '#dcfce7; color:#15803d;'}">
                    ${d.isDeficit ? 'DEFISIT' : 'SURPLUS'}
                  </span>
                </td>
              </tr>
            `).join('')}
            <tr style="background:#f1f5f9; font-weight:800; border-top:2px solid #94a3b8; font-size:0.73rem;">
              <td style="text-align:center; padding:6px 2px; font-size:0.70rem; white-space:nowrap;">TOTAL</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap;" title="Kas Awal Tahun: ${fmtRp(cf.initialCash)}">${fmtRp(cf.initialCash, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:#0284c7;" title="Total Pencairan SCF: ${fmtRp(cf.totalSCFDrawdown)}">+${fmtRp(cf.totalSCFDrawdown, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:#0369a1;" title="Total Inflow Penjualan: ${fmtRp(cf.totalInflow)}">+${fmtRp(cf.totalInflow, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:#b91c1c;" title="Total Outflow HPP: ${fmtRp(cf.projectedAnnualCOGS)}">-${fmtRp(cf.projectedAnnualCOGS, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:#b91c1c;" title="Total Outflow OPEX: ${fmtRp(cf.projectedAnnualOpex)}">-${fmtRp(cf.projectedAnnualOpex, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:${cf.totalNOCF >= 0 ? '#166534' : '#dc2626'};" title="Total NOCF: ${fmtRp(cf.totalNOCF)}">${fmtRp(cf.totalNOCF, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap;" title="Total Beban Bunga: ${fmtRp(cf.totalDebtService - proj.requestedPlafond)}">-${fmtRp(cf.totalDebtService - proj.requestedPlafond, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap;" title="Total Pelunasan Pokok: ${fmtRp(proj.requestedPlafond)}">-${fmtRp(proj.requestedPlafond, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:#b45309;" title="Total Debt Service: ${fmtRp(cf.totalDebtService)}">${fmtRp(cf.totalDebtService, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:${cf.lowestCash >= 0 ? '#166534' : '#dc2626'};" title="Saldo Kas Akhir Bulan 12: ${fmtRp(cf.monthlyData[11].endingCash)}">${fmtRp(cf.monthlyData[11].endingCash, true)}</td>
              <td class="num-col" style="padding:6px 3px; white-space:nowrap; color:${cf.annualDSCR >= 1.2 ? '#166534' : '#dc2626'};" title="DSCR Tahunan: ${fmtNum(cf.annualDSCR, 2)}x">${fmtNum(cf.annualDSCR, 2)}x</td>
              <td style="text-align:center; padding:6px 2px; white-space:nowrap;">
                <span style="font-size:0.65rem; padding:2px 5px; border-radius:3px; font-weight:800; display:inline-block; background:${cf.isHealthy ? '#dcfce7; color:#15803d;' : '#fee2e2; color:#991b1b;'}">
                  ${cf.isHealthy ? 'LAYAK' : 'DEFISIT'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- INSIGHT & REKOMENDASI UNDERWRITING -->
      <div style="background:${statusBg}; border:1px solid ${cf.isHealthy ? '#86efac' : '#fca5a5'}; border-left:4px solid ${statusColor}; padding:0.65rem 0.85rem; border-radius:6px; font-size:0.73rem;">
        <div style="font-weight:800; color:${statusColor}; margin-bottom:0.25rem;">
          ${cf.isHealthy ? 'KESIMPULAN PROYEKSI CASH FLOW SCF AP: KONVERSI PERSEDIAAN MENJADI KAS MEMENUHI KAPASITAS PELUNASAN' : 'KESIMPULAN PROYEKSI CASH FLOW SCF AP: DEFISIT HASIL KONVERSI PERSEDIAAN TERHADAP KEWAJIBAN PELUNASAN'}
        </div>
        <p style="margin:0; line-height:1.45; color:#334155;">
          ${cf.isHealthy
            ? `Proyeksi membuktikan bahwa dengan pencairan fasilitas SCF AP sebesar <strong>+${fmtRp(cf.totalSCFDrawdown, true)}</strong> untuk membantu pembelian persediaan, yang diikuti konversi penjualan persediaan dengan pertumbuhan ${cf.salesGrowth}% dan Target GPM ${fmtNum(cf.targetGPM, 1)}%, debitur menghasilkan surplus kas operasional (NOCF) sebesar <strong>+${fmtRp(cf.totalNOCF, true)}</strong>. Total kas tersedia (CADS: <strong>${fmtRp(cf.cads, true)}</strong>) mampu menutup penuh kewajiban pokok &amp; bunga SCF AP (<strong>${fmtRp(cf.totalDebtService, true)}</strong>) dengan Projected DSCR <strong>${fmtNum(cf.annualDSCR, 2)}x (&ge; 1,20x)</strong> dan saldo kas terendah tetap surplus ${fmtRp(cf.lowestCash, true)}.`
            : `Proyeksi membuktikan bahwa meskipun Bank telah membantu membiayai pembelian persediaan melalui fasilitas SCF AP sebesar <strong>+${fmtRp(cf.totalSCFDrawdown, true)}</strong>, pada struktur margin saat ini (GPM ${fmtNum(cf.targetGPM, 1)}%) hasil akhir konversi persediaan menjadi kas mengalami penyusutan/defisit operasional (NOCF <strong>${fmtRp(cf.totalNOCF, true)}</strong>). Akibatnya, total kas yang terkumpul (CADS: <strong>${fmtRp(cf.cads, true)}</strong>) tidak mencukupi untuk melunasi pokok &amp; bunga SCF AP (<strong>${fmtRp(cf.totalDebtService, true)}</strong>) saat jatuh tempo, sehingga saldo kas anjlok hingga <strong>${fmtRp(cf.lowestCash, true)}</strong> dengan Projected DSCR hanya <strong>${fmtNum(cf.annualDSCR, 2)}x (&lt; 1,00x)</strong>. Diperlukan pengawalan penarikan bertahap (tranching) dan syarat batas minimum marjin kontrak (covenant GPM &ge; +12,1%) agar hasil konversi persediaan mencukupi pelunasan SCF AP.`
          }
        </p>
      </div>
    </div>
  `;
}

function setCashFlowPreset(presetType) {
  const proj = getActiveProject();
  if (!proj) return;
  const m = computeDCCSWCM(proj);
  if (presetType === 'status_quo') {
    const histGPM = ((proj.fin23.rev - proj.fin23.cogs) / proj.fin23.rev) * 100;
    proj.cfProjGrowth = 0;
    proj.cfProjGPM = Number(histGPM.toFixed(1));
    proj.cfProjDOR = Math.round(m.dor23_365);
    proj.cfProjRepaymentType = 'semi_annual';
    showToast('Skenario Status Quo diterapkan: Menggunakan data audited riil.');
  } else if (presetType === 'turnaround') {
    proj.cfProjGrowth = 15;
    proj.cfProjGPM = 13.5;
    proj.cfProjDOR = 50;
    proj.cfProjRepaymentType = 'semi_annual';
    showToast('Skenario Optimasi DCC-SWCM diterapkan: Target GPM +13,5% & DOR 50 hari.');
  } else if (presetType === 'stress') {
    const histGPM = ((proj.fin23.rev - proj.fin23.cogs) / proj.fin23.rev) * 100;
    proj.cfProjGrowth = -5;
    proj.cfProjGPM = Number((histGPM - 2.5).toFixed(1));
    proj.cfProjDOR = Math.round(m.dor23_365 + 20);
    proj.cfProjRepaymentType = 'bullet';
    showToast('Skenario Konservatif diterapkan: Penjualan -5%, DOR +20 hari.');
  }
  saveProjectsToStorage();
  renderAll();
}

function updateCashFlowCustomParam() {
  const proj = getActiveProject();
  if (!proj) return;

  const rawG = document.getElementById('cf_inp_growth')?.value;
  const rawGpm = document.getElementById('cf_inp_gpm')?.value;
  const rawDor = document.getElementById('cf_inp_dor')?.value;
  const rep = document.getElementById('cf_inp_repayment')?.value;

  const parseVal = (str) => {
    if (str === undefined || str === null || String(str).trim() === '') return NaN;
    return parseFloat(String(str).trim().replace(/\s/g, '').replace(',', '.'));
  };

  const g = parseVal(rawG);
  const gpm = parseVal(rawGpm);
  const dor = parseVal(rawDor);

  if (!isNaN(g)) proj.cfProjGrowth = Number(g.toFixed(2));
  if (!isNaN(gpm)) proj.cfProjGPM = Number(gpm.toFixed(2));
  if (!isNaN(dor)) proj.cfProjDOR = Math.round(dor);
  if (rep) proj.cfProjRepaymentType = rep;

  saveProjectsToStorage();
  renderAll();
  showToast(`💾 Parameter Proyeksi Cash Flow tersimpan! (Target GPM: ${proj.cfProjGPM}%, Pertumbuhan: ${proj.cfProjGrowth}%, DOR: ${proj.cfProjDOR} hr)`);
}

function renderPrintableReport(proj, m) {
  const container = document.getElementById('printableMemoContainer');
  if (!container) return;
  if (!m || !m.hasFinancials) {
    container.innerHTML = getFinEmptyStateHTML('Nota Analisa Kredit Belum Tersedia', 'Nota analisa kredit (Executive Summary, Evaluasi Kelayakan, Mitigasi Risiko, dan Rekomendasi Komite) akan disintesis otomatis setelah laporan keuangan diisi.');
    return;
  }

  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const ins = buildDynamicCaseInsights(proj, m);
  const caseNumber = getProjectCaseNumber(proj);
  const fiveC = m.fiveC || compute5CAnalysis(proj, proj.fin23, m);
  const cf = m.cfProj || computeCashFlowProjection(proj);
  const annualDSCR = typeof cf.annualDSCR === 'number' ? cf.annualDSCR : 0;
  const lowestCash = typeof cf.lowestCash === 'number' ? cf.lowestCash : 0;
  const endingCash12 = (cf.monthlyData && cf.monthlyData[11]) ? cf.monthlyData[11].endingCash : 0;

  // Evaluasi 3 Skenario Stress-Testing untuk Rangkuman Tabel
  const params1 = { revGrowth: 0, gpm: m.gpm23, opexCut: 0, doi: Math.round(m.doi23_365), dor: Math.round(m.dor23_365), dop: Math.round(m.dop23_365), fxShock: 0, invHaircut: 0 };
  const params2 = { revGrowth: -10, gpm: m.gpm23 - 3.5, opexCut: 0, doi: Math.min(350, Math.round(m.doi23_365 + 20)), dor: Math.min(150, Math.round(m.dor23_365 + 20)), dop: Math.max(10, Math.round(m.dop23_365 - 5)), fxShock: 10, invHaircut: 10 };
  const params3 = { revGrowth: -20, gpm: m.gpm23 - 7.0, opexCut: -5, doi: Math.min(360, Math.round(m.doi23_365 + 45)), dor: Math.min(150, Math.round(m.dor23_365 + 40)), dop: Math.max(10, Math.round(m.dop23_365 - 10)), fxShock: 15, invHaircut: 20 };
  const stress1 = evaluateScenarioParams(proj, m, params1);
  const stress2 = evaluateScenarioParams(proj, m, params2);
  const stress3 = evaluateScenarioParams(proj, m, params3);

  const opm22 = proj.fin22.rev > 0 ? ((proj.fin22.rev - proj.fin22.cogs - proj.fin22.opex) / proj.fin22.rev) * 100 : 0;
  const opm23 = proj.fin23.rev > 0 ? ((proj.fin23.rev - proj.fin23.cogs - proj.fin23.opex) / proj.fin23.rev) * 100 : 0;
  const dar22 = m.ta22 > 0 ? (m.tl22 / m.ta22) : 0;
  const dar23 = m.ta23 > 0 ? (m.tl23 / m.ta23) : 0;

  const procMethodLabel = proj.procurementMethod === 'none' 
    ? 'Tidak Ada Pengiriman Fisik (Jasa / Non-Pengiriman)' 
    : (proj.procurementMethod === 'domestic' 
        ? 'Domestik / Lokal (Inland Transit Jalur Darat)' 
        : 'Impor Luar Negeri / Jalur Laut (Sea Freight)');

  const sippInfo = getSippPnInfo(proj.city || '', proj.companyName);

  document.getElementById('printableMemoContainer').innerHTML = `
    <table class="memo-print-table">
      <thead>
        <tr>
          <td>
            <table class="memo-header-table" style="width:100%; border-collapse:collapse; border:none; margin:0 0 0.85rem 0;">
              <tbody>
                <tr>
                  <td style="vertical-align:middle; text-align:left; border:none; border-bottom:2.5px solid #07192e; padding:0 0 0.65rem 0; background:transparent;">
                    <div style="display:flex; align-items:center; gap:0.85rem;">
                      <img src="logo-asca.png" alt="ASCA - Askrindo Smart Credit Analysis" style="height:46px; width:auto; object-fit:contain;" />
                      <div>
                        <h2 style="font-size:1.12rem; color:#07192e; margin:0 0 3px 0; font-weight:800; line-height:1.2; letter-spacing:0.1px;">NOTA ANALISA UNDERWRITING ASURANSI KREDIT (ASCA)</h2>
                        <p style="font-size:0.82rem; color:#475569; margin:0; line-height:1.25; font-weight:600;">Metode: Dynamic Cash Conversion &amp; Stress-Tested Working Capital Model (DCC-SWCM)</p>
                      </div>
                    </div>
                  </td>
                  <td style="vertical-align:middle; text-align:right; border:none; border-bottom:2.5px solid #07192e; padding:0 0 0.65rem 0; background:transparent; white-space:nowrap; font-size:0.82rem; line-height:1.55; color:#1e293b;">
                    <div><strong>Tanggal:</strong> ${today}</div>
                    <div><strong>ID Kasus:</strong> <span style="font-family:monospace; font-weight:800; font-size:0.86rem; color:#004274;">${caseNumber}</span></div>
                    <div><strong>Underwriter:</strong> ${proj.underwriter}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <!-- PROFIL DEBITUR & FASILITAS KREDIT -->
            <div class="grid-2" style="margin-bottom:0.65rem;">
              <table class="data-table">
                <tbody>
                  <tr><td style="width:38%;"><strong>Nama Debitur</strong></td><td><strong>${proj.companyName}</strong></td></tr>
                  <tr><td><strong>Domisili / Wilayah Hukum</strong></td><td>${proj.city || '-'} (${sippInfo.pnName})</td></tr>
                  <tr><td><strong>Sektor Usaha</strong></td><td>${proj.sector} (Berdiri ${proj.estYear})</td></tr>
                  <tr><td><strong>Bank Mitra</strong></td><td>${proj.bankName}</td></tr>
                  <tr><td><strong>Skema Fasilitas</strong></td><td>${proj.facilityType}</td></tr>
                  <tr><td><strong>Metode Pengadaan</strong></td><td>${procMethodLabel}</td></tr>
                </tbody>
              </table>
              <table class="data-table">
                <tbody>
                  <tr><td style="width:38%;"><strong>Plafond Diajukan</strong></td><td><strong>${fmtRp(proj.requestedPlafond)}</strong> ${proj.usdAmount > 0 ? `(USD ${proj.usdAmount.toLocaleString('id-ID')} @ Rp${proj.fxRate.toLocaleString('id-ID')})` : ''}</td></tr>
                  <tr><td><strong>Tenor Fasilitas</strong></td><td>PK ${proj.pkMonths} Bln | Tenor Utama: ${proj.scfTenorDays} Hr | KMK Backup: ${proj.kmkTenorDays} Hr</td></tr>
                  <tr><td><strong>Suku Bunga Kredit</strong></td><td>${proj.interestRate}% p.a. Efektif</td></tr>
                  <tr><td><strong>Skor &amp; Risk Grade</strong></td><td><strong>${m.score} / 100  -  Grade ${m.riskGrade}</strong> (IJP: ${m.ijpRate})</td></tr>
                  <tr><td><strong>Keputusan Pokok</strong></td><td><strong style="color:${m.gradeMeta.color};">${m.decision}</strong></td></tr>
                </tbody>
              </table>
            </div>

            <!-- BAGIAN I: RANGKUMAN AUDIT SIKLUS KAS (DCC) & NWC & CBRT -->
            <h4 style="color:var(--askrindo-navy); margin:0.5rem 0 0.25rem; font-size:0.75rem; font-weight:800; border-bottom:1.5px solid #e2e8f0; padding-bottom:2px;">
              I. Rangkuman Audit Siklus Kas (Dynamic CC) &amp; Ketahanan NWC &amp; CBRT
            </h4>
            <table class="data-table" style="margin-bottom:0.6rem; font-size:0.66rem;">
              <thead>
                <tr>
                  <th>Indikator Perputaran Modal Kerja</th>
                  <th class="num-col">Klaim Data Bank</th>
                  <th class="num-col">Audited ${m.yr1}</th>
                  <th class="num-col">Audited ${m.yr2}</th>
                  <th>Deviasi &amp; Analisa Underwriting</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Days of Receivables (DOR)</td>
                  <td class="num-col">${proj.claimedDOR} Hari</td>
                  <td class="num-col">${fmtNum(m.dor22_365, 1)} Hari</td>
                  <td class="num-col"><strong>${fmtNum(m.dor23_365, 1)} Hari</strong></td>
                  <td>${m.diffDOR >= 0 ? `Melambat +${fmtNum(m.diffDOR, 1)} Hari` : `Lebih cepat ${fmtNum(Math.abs(m.diffDOR), 1)} Hari`}</td>
                </tr>
                <tr>
                  <td>Days of Inventory (DOI)</td>
                  <td class="num-col">${proj.claimedDOI} Hari</td>
                  <td class="num-col">${fmtNum(m.doi22_365, 1)} Hari</td>
                  <td class="num-col"><strong style="color:${m.diffDOI > 10 ? '#dc2626' : 'inherit'};">${fmtNum(m.doi23_365, 1)} Hari</strong></td>
                  <td style="color:${m.diffDOI > 0 ? '#dc2626' : '#166534'}; font-weight:700;">
                    ${m.diffDOI > 0 ? `Overstocked +${fmtNum(m.diffDOI, 1)} Hari (Kas Terkunci ${fmtRp(m.cashLockedInExcessDOI, true)})` : 'Perputaran Persediaan Efisien'}
                  </td>
                </tr>
                <tr>
                  <td>Days of Payables (DOP Murni)</td>
                  <td class="num-col">${proj.claimedDOP} Hari</td>
                  <td class="num-col">${fmtNum(m.dop22_365, 1)} Hari</td>
                  <td class="num-col"><strong>${fmtNum(m.dop23_365, 1)} Hari</strong></td>
                  <td>Dukungan kredit supplier dagang murni: ${fmtNum(m.dop23_365, 1)} hari</td>
                </tr>
                <tr>
                  <td>Cash Conversion Cycle (CCC)</td>
                  <td class="num-col"><strong>${m.claimedCCC} Hari</strong></td>
                  <td class="num-col">${fmtNum(m.ccc22, 1)} Hari</td>
                  <td class="num-col"><strong>${fmtNum(m.ccc23, 1)} Hari</strong></td>
                  <td>Siklus konversi kas riil berjarak ${fmtNum(Math.abs(m.diffCCC), 1)} hari dari data bank</td>
                </tr>
                <tr>
                  <td>Siklus Operasi Gross (DOI + DOR)</td>
                  <td class="num-col"><strong>${m.claimedGrossCycle} Hari</strong></td>
                  <td class="num-col">${fmtNum(m.grossCycle22, 1)} Hari</td>
                  <td class="num-col"><strong style="color:${m.cashGapAtSCFMaturity_Actual > 0 ? '#dc2626' : '#166534'};">${fmtNum(m.grossCycle23, 1)} Hari</strong></td>
                  <td style="color:${m.cashGapAtSCFMaturity_Actual > 0 ? '#dc2626' : '#166534'}; font-weight:700;">
                    Tenor SCF: ${m.scfTenor} Hr &rarr; ${m.cashGapAtSCFMaturity_Actual > 0 ? `Defisit Tenor ${Math.round(m.cashGapAtSCFMaturity_Actual)} Hari saat Jatuh Tempo` : 'Tenor Sinkron & Aman'}
                  </td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td>Daily Gross Cash Burn &amp; Runway</td>
                  <td colspan="2">Burn-Rate: <strong>${fmtRp(m.dailyGrossCashBurn)} / hari</strong></td>
                  <td colspan="2" style="color:${m.pureCashRunwayMonths < 1.5 ? '#dc2626' : '#166534'}; font-weight:700;">
                    Pure Cash Runway: ${fmtNum(m.pureCashRunwayMonths, 1)} Bulan (${fmtNum(m.pureCashRunwayDays, 0)} Hari) | NWC: ${fmtRp(m.nwc23, true)}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BAGIAN II: RANGKUMAN RASIO KEUANGAN UTAMA & KEPATUHAN RAC -->
            <h4 style="color:var(--askrindo-navy); margin:0.5rem 0 0.25rem; font-size:0.75rem; font-weight:800; border-bottom:1.5px solid #e2e8f0; padding-bottom:2px;">
              II. Rangkuman Rasio Keuangan Utama &amp; Evaluasi Kepatuhan RAC
            </h4>
            <table class="data-table" style="margin-bottom:0.6rem; font-size:0.66rem;">
              <thead>
                <tr>
                  <th>Indikator Rasio Finansial</th>
                  <th class="num-col">Audited ${m.yr1}</th>
                  <th class="num-col">Audited ${m.yr2}</th>
                  <th>Threshold RAC Askrindo</th>
                  <th>Evaluasi Kepatuhan Underwriting</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Current Ratio (CR)</strong> (Likuiditas)</td>
                  <td class="num-col">${m.currentRatio22 !== null ? m.currentRatio22.toFixed(2) + 'x' : 'N/A (Bebas Utang)'}</td>
                  <td class="num-col"><strong>${m.currentRatio23 !== null ? m.currentRatio23.toFixed(2) + 'x' : 'N/A (Bebas Utang)'}</strong></td>
                  <td>&ge; 1.00x (Kecukupan Aset Lancar)</td>
                  <td style="color:${(m.currentRatio23 === null || m.currentRatio23 >= 1.0) ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${(m.currentRatio23 === null || m.currentRatio23 >= 1.0) ? '&#10003; Memenuhi RAC (Prima)' : '&#9888; Deviasi (Defisit Modal Kerja Bersih)'}
                  </td>
                </tr>
                <tr>
                  <td><strong>Quick Ratio (QR)</strong> (Likuiditas Cepat)</td>
                  <td class="num-col">${m.quickRatio22 !== null ? m.quickRatio22.toFixed(2) + 'x' : 'N/A (Bebas Utang)'}</td>
                  <td class="num-col"><strong>${m.quickRatio23 !== null ? m.quickRatio23.toFixed(2) + 'x' : 'N/A (Bebas Utang)'}</strong></td>
                  <td>&ge; 0.80x (Kecukupan Kas &amp; Piutang)</td>
                  <td style="color:${(m.quickRatio23 === null || m.quickRatio23 >= 0.8) ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${(m.quickRatio23 === null || m.quickRatio23 >= 0.8) ? '&#10003; Memenuhi RAC (Prima)' : '&#9888; Deviasi (Sangat Bergantung pada Persediaan)'}
                  </td>
                </tr>
                <tr>
                  <td><strong>Cash Ratio</strong> (Rasio Kas Tunai)</td>
                  <td class="num-col">-</td>
                  <td class="num-col"><strong>${m.cashRatio23 !== null ? m.cashRatio23.toFixed(2) + 'x' : 'N/A (Bebas Utang)'}</strong></td>
                  <td>&ge; 0.20x (Ketahanan Kas Minimum)</td>
                  <td style="color:${(m.cashRatio23 === null || m.cashRatio23 >= 0.2) ? '#166534' : '#d97706'}; font-weight:700;">
                    ${(m.cashRatio23 === null || m.cashRatio23 >= 0.2) ? '&#10003; Memenuhi RAC (Prima)' : '&#9888; Dibawah Ambang Batas Ideal'}
                  </td>
                </tr>
                <tr>
                  <td><strong>Gross Profit Margin (GPM)</strong></td>
                  <td class="num-col">${m.gpm22.toFixed(2)}%</td>
                  <td class="num-col"><strong style="color:${m.gpm23 < 0 ? '#dc2626' : 'inherit'};">${m.gpm23.toFixed(2)}%</strong></td>
                  <td>&ge; 10.00% (Batas Keamanan HPP)</td>
                  <td style="color:${m.gpm23 >= 10.0 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${m.gpm23 >= 10.0 ? '&#10003; Memenuhi RAC' : (m.gpm23 < 0 ? '&#9888; Kritis (Jual Rugi di HPP / Negative Gross)' : '&#9888; Deviasi (Margin Kotor Tipis <10%)')}
                  </td>
                </tr>
                <tr>
                  <td><strong>Net Profit Margin (NPM)</strong></td>
                  <td class="num-col">${m.npm22.toFixed(2)}%</td>
                  <td class="num-col"><strong>${m.npm23.toFixed(2)}%</strong></td>
                  <td>&ge; 3.00% (Rentabilitas Bersih)</td>
                  <td style="color:${m.npm23 >= 3.0 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${m.npm23 >= 3.0 ? '&#10003; Memenuhi RAC' : '&#9888; Deviasi (Profitabilitas Bersih Tertekan)'}
                  </td>
                </tr>
                <tr>
                  <td><strong>Debt to Equity Ratio (DER)</strong></td>
                  <td class="num-col">${m.der22.toFixed(2)}x</td>
                  <td class="num-col"><strong>${m.der23.toFixed(2)}x</strong></td>
                  <td>&le; 2.50x (Batas Solvabilitas Sehat)</td>
                  <td style="color:${m.der23 <= 2.5 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${m.der23 === 0 ? '&#10003; Memenuhi RAC (Bebas Utang)' : (m.der23 <= 2.5 ? '&#10003; Memenuhi RAC' : '&#9888; Deviasi (Leverage Berlebih / Utang Tinggi)')}
                  </td>
                </tr>
                <tr>
                  <td><strong>Debt Service Coverage Ratio (DSCR)</strong></td>
                  <td class="num-col">-</td>
                  <td class="num-col"><strong>${m.dscr23.toFixed(2)}x</strong></td>
                  <td>&ge; 1.25x (Ketahanan Pelunasan Utang)</td>
                  <td style="color:${m.dscr23 >= 1.25 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${m.dscr23 >= 1.25 ? '&#10003; Memenuhi RAC' : '&#9888; Deviasi (Kapasitas Angsuran Tertekan)'}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BAGIAN III: RANGKUMAN ANALISA KUALITATIF 5C UNDERWRITING -->
            <h4 style="color:var(--askrindo-navy); margin:0.5rem 0 0.25rem; font-size:0.75rem; font-weight:800; border-bottom:1.5px solid #e2e8f0; padding-bottom:2px;">
              III. Rangkuman Analisa Kualitatif 5C Underwriting
            </h4>
            <table class="data-table" style="margin-bottom:0.6rem; font-size:0.66rem;">
              <thead>
                <tr>
                  <th>Pilar 5C Underwriting</th>
                  <th class="num-col">Skor Pilar</th>
                  <th>Komponen Penilaian &amp; Hasil Verifikasi Sistem</th>
                  <th>Kesimpulan Kualitatif</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>1. Character (20%)</strong></td>
                  <td class="num-col"><strong style="color:${fiveC.charScore >= 70 ? '#166534' : '#dc2626'};">${fiveC.charScore} / 100</strong></td>
                  <td>
                    &bull; Lama Usaha: Usia ${fiveC.businessAge} Thn (${fiveC.charBreakdown?.agePts || 20}/25 Poin)<br/>
                    &bull; SLIK OJK: ${fiveC.slikStatus} (${fiveC.charBreakdown?.creditPts || 30}/30 Poin)<br/>
                    &bull; INAPROC LKPP: ${fiveC.inaprocStatus} (${fiveC.charBreakdown?.inaprocPts || 10}/15 Poin)<br/>
                    &bull; SIPP MA: ${fiveC.sippStatus} (${fiveC.charBreakdown?.sippPts || 10}/10 Poin)<br/>
                    &bull; Google News: Nihil Berita Negatif (${fiveC.charBreakdown?.newsPts || 20}/20 Poin)
                  </td>
                  <td style="color:${fiveC.charScore >= 80 ? '#166534' : '#d97706'}; font-weight:700;">
                    ${fiveC.charScore >= 90 ? 'Sangat Baik (Reputasi Mapan)' : (fiveC.charScore >= 70 ? 'Baik / Standar' : 'Perhatian Khusus')}
                  </td>
                </tr>
                <tr>
                  <td><strong>2. Capacity (25%)</strong></td>
                  <td class="num-col"><strong style="color:${fiveC.capScore >= 70 ? '#166534' : '#dc2626'};">${fiveC.capScore} / 100</strong></td>
                  <td>
                    &bull; Gross Margin: ${m.gpm23.toFixed(2)}% (${fiveC.capBreakdown?.gpmPts ?? 0}/35 Poin)<br/>
                    &bull; Kesesuaian Siklus Kas vs Tenor: Mismatch ${Math.round(m.cashGapAtSCFMaturity_Actual)} Hr (${fiveC.capBreakdown?.tenorPts ?? 0}/30 Poin)<br/>
                    &bull; Interest Coverage Ratio (ICR): ${fmtNum(fiveC.capBreakdown?.icrVal ?? 0, 2)}x (${fiveC.capBreakdown?.icrPts ?? 0}/20 Poin)<br/>
                    &bull; Pure Cash Runway: ${fmtNum(m.pureCashRunwayDays, 0)} Hari (${fiveC.capBreakdown?.runwayPts ?? 0}/15 Poin)
                  </td>
                  <td style="color:${fiveC.capScore >= 70 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${fiveC.capScore >= 70 ? 'Kapasitas Memadai' : 'Kapasitas Tertekan (Cash Gap)'}
                  </td>
                </tr>
                <tr>
                  <td><strong>3. Capital (20%)</strong></td>
                  <td class="num-col"><strong style="color:${fiveC.capitScore >= 70 ? '#166534' : '#dc2626'};">${fiveC.capitScore} / 100</strong></td>
                  <td>
                    &bull; Leverage DER: ${m.der23 !== null ? m.der23.toFixed(2) + 'x' + (m.der23 === 0 ? ' (Bebas Utang)' : '') : '-'} (${fiveC.capitBreakdown?.derPts ?? 0}/35 Poin)<br/>
                    &bull; Current Ratio: ${m.currentRatio23 !== null ? m.currentRatio23.toFixed(2) + 'x' : 'N/A (Bebas Utang)'} (${fiveC.capitBreakdown?.crPts ?? 0}/25 Poin)<br/>
                    &bull; Kecukupan NWC Riil: ${fmtRp(m.nwc23, true)} (${fiveC.capitBreakdown?.nwcPts ?? 0}/20 Poin)<br/>
                    &bull; Ketahanan Ekuitas: ${fmtRp(m.eq23, true)} (${fiveC.capitBreakdown?.eqPts ?? 0}/20 Poin)
                  </td>
                  <td style="color:${fiveC.capitScore >= 70 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${fiveC.capitScore >= 70 ? 'Permodalan Sehat' : 'Struktur Modal Agresif'}
                  </td>
                </tr>
                <tr>
                  <td><strong>4. Collateral (20%)</strong></td>
                  <td class="num-col"><strong style="color:${fiveC.collScore >= 70 ? '#166534' : '#dc2626'};">${fiveC.collScore} / 100</strong></td>
                  <td>
                    &bull; Agunan Pokok (${fiveC.primaryTypeLabel || 'Persediaan'}): ${fmtRp(fiveC.invVal, true)} (${fiveC.invRatio.toFixed(0)}% plafond &mdash; ${fiveC.collBreakdown?.invPts ?? 0}/50 Poin)<br/>
                    &bull; Jaminan Tambahan (${fiveC.additionalTypeLabel || 'Fixed Assets'}): ${fmtRp(fiveC.faVal, true)} (${fiveC.faRatio.toFixed(0)}% plafond &mdash; ${fiveC.collBreakdown?.faPts ?? 0}/50 Poin)
                  </td>
                  <td style="color:${fiveC.collScore >= 70 ? '#166534' : '#d97706'}; font-weight:700;">
                    ${fiveC.collScore >= 80 ? 'Sangat Memadai (HT &ge; 120%)' : (fiveC.collScore >= 60 ? 'Cukup / Standar' : 'Agunan Kurang')}
                  </td>
                </tr>
                <tr>
                  <td><strong>5. Condition (15%)</strong></td>
                  <td class="num-col"><strong style="color:${fiveC.condScore >= 70 ? '#166534' : '#dc2626'};">${fiveC.condScore} / 100</strong></td>
                  <td>
                    &bull; Risiko Rantai Pasok &amp; Logistik: ${procMethodLabel} (${fiveC.condBreakdown?.logPts ?? 0}/35 Poin)<br/>
                    &bull; Eksposur Nilai Tukar Valas: ${proj.usdAmount > 0 ? 'Valas USD' : 'Domestik IDR'} (${fiveC.condBreakdown?.fxPts ?? 0}/30 Poin)<br/>
                    &bull; Pertumbuhan Omzet Pasar: ${fmtPct(m.revGrowth, 1)} (${fiveC.condBreakdown?.growthPts ?? 0}/20 Poin)<br/>
                    &bull; Kemandirian Skema Kredit: ${proj.kmkTenorDays > 0 ? 'Dengan KMK Backup' : 'Skema Mandiri'} (${fiveC.condBreakdown?.schemePts ?? 0}/15 Poin)
                  </td>
                  <td style="color:${fiveC.condScore >= 75 ? '#166534' : '#d97706'}; font-weight:700;">
                    ${fiveC.condScore >= 75 ? 'Risiko Terkendali' : 'Sensitif terhadap Fluktuasi Eksternal'}
                  </td>
                </tr>
                <tr style="background:#f8fafc; font-weight:800;">
                  <td>Skor Terpadu 5C Underwriting</td>
                  <td class="num-col" style="color:var(--askrindo-navy); font-size:0.75rem;">${fiveC.totalScore} / 100</td>
                  <td colspan="2">
                    Skor Kualitatif Terpadu 5C memberikan kontribusi pada <strong>Pilar 2: ${fiveC.totalScore10} / 10 Poin</strong> dalam penilaian komprehensif DCC-SWCM.
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BAGIAN IV: RANGKUMAN PROYEKSI CASH FLOW & DEBT SERVICE 12 BULAN -->
            <h4 style="color:var(--askrindo-navy); margin:0.5rem 0 0.25rem; font-size:0.75rem; font-weight:800; border-bottom:1.5px solid #e2e8f0; padding-bottom:2px;">
              IV. Rangkuman Proyeksi Cash Flow SCF AP (Konversi Persediaan ke Kas) &amp; Debt Service 12 Bulan
            </h4>
            <table class="data-table" style="margin-bottom:0.6rem; font-size:0.66rem;">
              <thead>
                <tr>
                  <th>Metrik Proyeksi Arus Kas (Forward-Looking 12 Bulan)</th>
                  <th class="num-col">Nilai Proyeksi</th>
                  <th>Ambang Batas Underwriting</th>
                  <th>Analisa Kelayakan Pelunasan Utang</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Pencairan Kredit SCF AP (Pembiayaan Persediaan oleh Bank)</td>
                  <td class="num-col"><strong style="color:#0284c7;">+${fmtRp(cf.totalSCFDrawdown || proj.requestedPlafond, true)}</strong></td>
                  <td>Skema: ${cf.repaymentType === 'semi_annual' ? '2 Siklus @ 6 Bln' : '12 Bulan'}</td>
                  <td>Bank membantu pembelian persediaan untuk dikonversi menjadi penjualan &amp; kas</td>
                </tr>
                <tr>
                  <td>Total Inflow Kas Hasil Konversi Penjualan Persediaan</td>
                  <td class="num-col"><strong>+${fmtRp(cf.totalInflow, true)}</strong></td>
                  <td>Growth: +${cf.salesGrowth}% | DOR: ${Math.round(cf.dorDays)} Hr</td>
                  <td>Target Margin Kotor (GPM): ${cf.targetGPM.toFixed(1)}% (Penjualan: ${fmtRp(cf.projectedAnnualSales, true)})</td>
                </tr>
                <tr>
                  <td>Total Outflow Kas Operasional (HPP Persediaan + OPEX + Pajak)</td>
                  <td class="num-col">-${fmtRp(cf.totalOutflow, true)}</td>
                  <td>Rata-rata Outflow: ${fmtRp(cf.totalOutflow / 12, true)} / bln</td>
                  <td>Beban pengadaan persediaan berjalan dan biaya operasional rutin</td>
                </tr>
                <tr>
                  <td>Hasil Bersih Konversi Persediaan ke Kas (NOCF 12 Bulan)</td>
                  <td class="num-col"><strong style="color:${cf.totalNOCF >= 0 ? '#166534' : '#dc2626'};">${fmtRp(cf.totalNOCF, true)}</strong></td>
                  <td>Total Kas Tersedia (CADS): ${fmtRp(cf.cads || (cf.initialCash + (cf.totalSCFDrawdown || proj.requestedPlafond) + cf.totalNOCF), true)}</td>
                  <td style="color:${cf.totalNOCF >= (cf.totalDebtService - proj.requestedPlafond) ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${cf.totalNOCF >= (cf.totalDebtService - proj.requestedPlafond) ? '&#10003; Surplus Konversi Kas Menutup Pokok &amp; Bunga SCF' : '&#9888; Defisit Konversi Kas Terhadap Kewajiban SCF'}
                  </td>
                </tr>
                <tr>
                  <td>Total Pelunasan Kewajiban SCF AP (Pokok + Bunga)</td>
                  <td class="num-col">-${fmtRp(cf.totalDebtService, true)}</td>
                  <td>Bunga: ${proj.interestRate}% p.a.</td>
                  <td>Pelunasan pokok SCF AP ${fmtRp(proj.requestedPlafond, true)} + bunga dari kas hasil penjualan</td>
                </tr>
                <tr>
                  <td>Projected Debt Service Coverage Ratio (DSCR 12 Bulan)</td>
                  <td class="num-col"><strong style="color:${annualDSCR >= 1.20 ? '#166534' : (annualDSCR >= 1.0 ? '#d97706' : '#dc2626')}; font-size:0.75rem;">${annualDSCR.toFixed(2)}x</strong></td>
                  <td>Standar RAC: &ge; 1.20x (Buffer 20%)</td>
                  <td style="color:${annualDSCR >= 1.20 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${annualDSCR >= 1.20 ? '&#10003; Kapasitas Pelunasan Aman' : (annualDSCR >= 1.0 ? '&#9888; Cukup Tanpa Buffer Pengaman' : '&#9888; Risiko Tinggi Gagal Bayar (DSCR < 1.0x)')}
                  </td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td>Proyeksi Saldo Kas Akhir (Bulan ke-12)</td>
                  <td class="num-col"><strong style="color:${endingCash12 > 0 ? '#166534' : '#dc2626'};">${fmtRp(endingCash12, true)}</strong></td>
                  <td>Titik Kas Terendah: ${fmtRp(lowestCash, true)}</td>
                  <td style="color:${endingCash12 > 0 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${endingCash12 > 0 ? '&#10003; Saldo Kas Akhir Tetap Positif' : '&#9888; Kas Akhir Negatif (Memerlukan Penyesuaian Tranching &amp; Margin)'}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BAGIAN V: RANGKUMAN UJI KETAHANAN SENSITIVITAS (STRESS-TESTING) -->
            <h4 style="color:var(--askrindo-navy); margin:0.5rem 0 0.25rem; font-size:0.75rem; font-weight:800; border-bottom:1.5px solid #e2e8f0; padding-bottom:2px;">
              V. Rangkuman Simulasi Uji Ketahanan Sensitivitas (Stress-Testing)
            </h4>
            <table class="data-table" style="margin-bottom:0.6rem; font-size:0.66rem;">
              <thead>
                <tr>
                  <th>Parameter &amp; Hasil Uji Ketahanan</th>
                  <th class="num-col">Skenario 1 (Baseline Audited)</th>
                  <th class="num-col">Skenario 2 (Shock Kurs &amp; Komoditas)</th>
                  <th class="num-col">Skenario 3 (Severe Stagflasi)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gross Profit Margin (GPM)</td>
                  <td class="num-col">${fmtNum(m.gpm23, 1)}%</td>
                  <td class="num-col">${params2.gpm.toFixed(1)}%</td>
                  <td class="num-col" style="color:#dc2626; font-weight:700;">${params3.gpm.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Masa Simpan Persediaan (DOI)</td>
                  <td class="num-col">${Math.round(m.doi23_365)} Hari</td>
                  <td class="num-col">${params2.doi} Hari (+20 Hr)</td>
                  <td class="num-col" style="color:#dc2626; font-weight:700;">${params3.doi} Hari (+45 Hr)</td>
                </tr>
                <tr>
                  <td>Siklus Operasi Gross (DOI + DOR)</td>
                  <td class="num-col">${Math.round(m.grossCycle23)} Hari</td>
                  <td class="num-col">${stress2.simGrossCycle} Hari</td>
                  <td class="num-col" style="color:#dc2626; font-weight:700;">${stress3.simGrossCycle} Hari</td>
                </tr>
                <tr>
                  <td>Operating Cash Flow</td>
                  <td class="num-col">${fmtRp(stress1.operatingCashFlow, true)}</td>
                  <td class="num-col">${fmtRp(stress2.operatingCashFlow, true)}</td>
                  <td class="num-col" style="color:#dc2626; font-weight:700;">${fmtRp(stress3.operatingCashFlow, true)}</td>
                </tr>
                <tr>
                  <td>Projected DSCR</td>
                  <td class="num-col">${stress1.simDSCR.toFixed(2)}x</td>
                  <td class="num-col">${stress2.simDSCR.toFixed(2)}x</td>
                  <td class="num-col" style="color:#dc2626; font-weight:700;">${stress3.simDSCR.toFixed(2)}x</td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td>Kesimpulan Kelayakan Skema</td>
                  <td class="num-col" style="color:${stress1.isViable ? '#166534' : '#dc2626'}; font-weight:700;">${stress1.isViable ? 'Layak' : 'Defisit Likuiditas'}</td>
                  <td class="num-col" style="color:${stress2.isViable ? '#166534' : '#dc2626'}; font-weight:700;">${stress2.isViable ? 'Layak Bersyarat' : 'Severe Risk'}</td>
                  <td class="num-col" style="color:${stress3.isViable ? '#166534' : '#dc2626'}; font-weight:700;">${stress3.isViable ? 'Tolerable' : 'Pasti Default (Bangkrut)'}</td>
                </tr>
              </tbody>
            </table>

            <!-- BAGIAN VI: RANGKUMAN SKOR 7 PILAR DCC-SWCM & GRADE RISK -->
            <h4 style="color:var(--askrindo-navy); margin:0.5rem 0 0.25rem; font-size:0.75rem; font-weight:800; border-bottom:1.5px solid #e2e8f0; padding-bottom:2px;">
              VI. Rangkuman Skor Metode 7 Pilar DCC-SWCM &amp; Penetapan Grade Risk
            </h4>
            <table class="data-table" style="margin-bottom:0.6rem; font-size:0.66rem;">
              <thead>
                <tr>
                  <th>Pilar Evaluasi DCC-SWCM</th>
                  <th class="num-col">Bobot Maksimal</th>
                  <th class="num-col">Nilai Diperoleh</th>
                  <th>Indikator Evaluasi &amp; Temuan Kunci</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Pilar 1: Ketepatan Perputaran Kas &amp; Siklus CCC</strong></td>
                  <td class="num-col">20 Poin</td>
                  <td class="num-col"><strong style="color:${(m.scorePillars[0]?.earnedPts || 0) >= 14 ? '#166534' : '#dc2626'};">${m.scorePillars[0]?.earnedPts || 0} Poin</strong></td>
                  <td>Deviasi DOR (${m.diffDOR >= 0 ? '+' : ''}${fmtNum(m.diffDOR, 1)} hr), DOI (${m.diffDOI >= 0 ? '+' : ''}${fmtNum(m.diffDOI, 1)} hr), Tenor Mismatch (${Math.round(m.cashGapAtSCFMaturity_Actual)} hr)</td>
                </tr>
                <tr>
                  <td><strong>Pilar 2: Evaluasi Kualitatif 5C Underwriting</strong></td>
                  <td class="num-col">10 Poin</td>
                  <td class="num-col"><strong style="color:${(m.scorePillars[1]?.earnedPts || 0) >= 7 ? '#166534' : '#dc2626'};">${m.scorePillars[1]?.earnedPts || 0} Poin</strong></td>
                  <td>Skor 5C Terpadu: ${fiveC.totalScore}/100 (Character, Capacity, Capital, Collateral, Condition)</td>
                </tr>
                <tr>
                  <td><strong>Pilar 3: Sensitivitas NWC Burn-Rate &amp; Runway</strong></td>
                  <td class="num-col">20 Poin</td>
                  <td class="num-col"><strong style="color:${(m.scorePillars[2]?.earnedPts || 0) >= 14 ? '#166534' : '#dc2626'};">${m.scorePillars[2]?.earnedPts || 0} Poin</strong></td>
                  <td>Pure Cash Runway (${fmtNum(m.pureCashRunwayMonths, 1)} bln) &amp; Defisit Kas saat jatuh tempo SCF</td>
                </tr>
                <tr>
                  <td><strong>Pilar 4: Profitabilitas Operasional &amp; Margin HPP</strong></td>
                  <td class="num-col">15 Poin</td>
                  <td class="num-col"><strong style="color:${(m.scorePillars[3]?.earnedPts || 0) >= 10 ? '#166534' : '#dc2626'};">${m.scorePillars[3]?.earnedPts || 0} Poin</strong></td>
                  <td>GPM Audited (${m.gpm23.toFixed(2)}% vs Standar Sehat &ge;10%) &amp; EBT Operasional</td>
                </tr>
                <tr>
                  <td><strong>Pilar 5: Kecukupan Agunan Pokok &amp; Jaminan Tambahan</strong></td>
                  <td class="num-col">15 Poin</td>
                  <td class="num-col"><strong style="color:${(m.scorePillars[4]?.earnedPts || 0) >= 10 ? '#166534' : '#dc2626'};">${m.scorePillars[4]?.earnedPts || 0} Poin</strong></td>
                  <td>Agunan Pokok Persediaan (${fiveC.invRatio.toFixed(0)}%) &amp; Jaminan Tambahan Fixed Assets (${fiveC.faRatio.toFixed(0)}% vs HT &ge;120%)</td>
                </tr>
                <tr>
                  <td><strong>Pilar 6: Solvabilitas &amp; Struktur Modal</strong></td>
                  <td class="num-col">10 Poin</td>
                  <td class="num-col"><strong style="color:${(m.scorePillars[5]?.earnedPts || 0) >= 7 ? '#166534' : '#dc2626'};">${m.scorePillars[5]?.earnedPts || 0} Poin</strong></td>
                  <td>DER (${m.der23 !== null ? m.der23.toFixed(2) + 'x' : '-'} vs Batas &le;2.50x) &amp; Rasio Lancar Current Ratio (${m.currentRatio23 !== null ? m.currentRatio23.toFixed(2) + 'x' : 'N/A (Bebas Utang)'})</td>
                </tr>
                <tr>
                  <td><strong>Pilar 7: Proyeksi Arus Kas &amp; Debt Service 12 Bulan</strong></td>
                  <td class="num-col">10 Poin</td>
                  <td class="num-col"><strong style="color:${(m.scorePillars[6]?.earnedPts || 0) >= 7 ? '#166534' : '#dc2626'};">${m.scorePillars[6]?.earnedPts || 0} Poin</strong></td>
                  <td>Projected DSCR 12 Bulan (${annualDSCR.toFixed(2)}x vs Target &ge;1.25x) &amp; Ketahanan Saldo Kas Akhir</td>
                </tr>
                <tr style="background:#f1f5f9; font-weight:800;">
                  <td>TOTAL SKOR AKHIR DCC-SWCM</td>
                  <td class="num-col" style="font-size:0.75rem;">100 Poin</td>
                  <td class="num-col" style="font-size:0.78rem; color:${m.gradeMeta.color};">${m.score} / 100</td>
                  <td>
                    <strong>PENETAPAN RATING AKSEPTASI: <span class="grade-badge ${m.gradeMeta.badgeCls}">${m.shortGrade}</span> (${m.gradeMeta.name})</strong><br/>
                    Maksimal Coverage Askrindo: <strong>${m.recCoveragePct}%</strong> | Indikasi Tarif IJP: <strong>${m.ijpRate}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BAGIAN VII: CRITICAL POINTS & MITIGASI RISIKO KREDIT -->
            <div class="grid-2" style="margin-bottom:0.6rem; font-size:0.68rem;">
              <div style="border:1px solid var(--border-color); border-radius:6px; padding:0.45rem;">
                <div style="font-weight:700; color:#991b1b; margin-bottom:0.18rem;">VII. Ringkasan Critical Points (Temuan Kritis):</div>
                <ul style="padding-left:1.1rem; margin:0;">
                  ${[...ins.criticalPointsFin, ...ins.criticalPointsCredit].map((c) => `<li><strong>${c.title}</strong></li>`).join('')}
                </ul>
              </div>
              <div style="border:1px solid var(--border-color); border-radius:6px; padding:0.45rem;">
                <div style="font-weight:700; color:#166534; margin-bottom:0.18rem;">Syarat &amp; Mitigasi Asuransi Kredit (Covenants):</div>
                <ul style="padding-left:1.1rem; margin:0;">
                  ${ins.mitigations.map((mit) => `<li><strong>${mit.title}</strong></li>`).join('')}
                </ul>
              </div>
            </div>

            <!-- BAGIAN VIII: KEPUTUSAN KOMITE & REKOMENDASI PENJAMINAN -->
            <div style="border:1.5px solid ${m.isLayak ? '#059669' : (m.isInitialReject ? '#dc2626' : '#d97706')}; border-radius:6px; padding:0.6rem 0.8rem; margin-bottom:0.7rem; background:${m.isLayak ? '#f0fdf4' : (m.isInitialReject ? '#fff5f5' : '#fffbeb')};">
              <div style="font-weight:900; font-size:0.82rem; color:${m.isLayak ? '#166534' : (m.isInitialReject ? '#991b1b' : '#92400e')}; margin-bottom:0.25rem;">
                KEPUTUSAN EVALUASI AWAL SISTEM DCC-SWCM: ${m.stage1Decision}
              </div>
              <p style="font-size:0.71rem; line-height:1.4; color:#334155; margin-bottom:0.4rem;">
                ${m.stage1Summary}
              </p>

              ${m.isLayak ? `
                <div style="border-top:1px dashed #86efac; padding-top:0.35rem; margin-top:0.35rem;">
                  <div style="font-weight:800; font-size:0.75rem; color:#166534; margin-bottom:0.2rem;">
                    REKOMENDASI PERSETUJUAN PENJAMINAN KREDIT ASKRINDO (LAYAK DIJAMIN):
                  </div>
                  <div style="font-size:0.7rem; color:#1e293b; line-height:1.35;">
                    Fasilitas Kredit Modal Kerja (KMK) debitur memenuhi standar kelayakan underwriting. Rekomendasi porsi penjaminan Askrindo disetujui sebesar <strong>${m.recCoveragePct}% (${fmtRp(proj.requestedPlafond * (m.recCoveragePct / 100), true)})</strong> dengan indikasi tarif IJP <strong>${m.ijpRate}</strong>, didukung pemenuhan covenants monitoring mutasi kas operasional berkala pada <strong>${proj.bankName}</strong>.
                  </div>
                </div>
              ` : (m.isInitialReject ? `
                <div style="border-top:1px dashed #fca5a5; padding-top:0.35rem; margin-top:0.35rem;">
                  <div style="font-weight:800; font-size:0.75rem; color:#0f766e; margin-bottom:0.2rem;">
                    OPSI PERSETUJUAN BERSYARAT KOMITE ASURANSI KREDIT ASKRINDO (REKOMENDASI COVERAGE MAKS ${m.recCoveragePct || 55}%):
                  </div>
                  <div style="font-size:0.7rem; color:#1e293b; line-height:1.35;">
                    Apabila fasilitas disetujui demi kepentingan strategis kemitraan dengan <strong>${proj.bankName}</strong>, transaksi wajib direstrukturisasi dengan <strong>7 Syarat Wajib (Condition Precedent)</strong>:
                    <ol style="margin:0.2rem 0 0.3rem 1.1rem; padding:0;">
                      <li><strong>Rekomendasi Coverage Askrindo Dibatasi Maksimal ${m.recCoveragePct || 55}%</strong> (${fmtRp(proj.requestedPlafond * ((m.recCoveragePct || 55) / 100), true)}) &amp; Risk Sharing ${proj.bankName} Minimal ${100 - (m.recCoveragePct || 55)}% (${fmtRp(proj.requestedPlafond * ((100 - (m.recCoveragePct || 55)) / 100), true)}), dengan <strong>Rekomendasi Tarif IJP Bersyarat sebesar ${m.ijpRate || '3,75% - 4,50% p.a.'}</strong> (memuat <em>High-Risk Loading Premium</em> + Wajib Cash Collateral / Deposito 10-20% &amp; Restrukturisasi Ring-Fenced).</li>
                      ${isMaritimeOrImportRisk(proj) ? `
                        <li><strong>Wajib Asuransi Marine Cargo Askrindo (All Risks Warehouse to Warehouse)</strong> dengan Banker\'s Clause / Loss Payee Askrindo &amp; ${proj.bankName}.</li>
                      ` : (proj.procurementMethod === 'domestic' ? `
                        <li><strong>Wajib Asuransi Pengangkutan Darat (Inland Transit Askrindo)</strong> untuk proteksi distribusi logistik barang dengan Banker\'s Clause ${proj.bankName}.</li>
                      ` : `
                        <li><strong>Tidak Diwajibkan Asuransi Marine Cargo</strong> (aktivitas debitur non-pengiriman fisik; mitigasi difokuskan pada asuransi tempat usaha/PAR &amp; escrow rekening giro di ${proj.bankName}).</li>
                      `)}
                      <li><strong>Jaminan Tambahan Fixed Asset Hak Tanggungan Peringkat I &ge; 120%</strong> (${fmtRp(proj.requestedPlafond * 1.2, true)}) guna melengkapi Agunan Pokok Persediaan Barang (${fmtRp(proj.fin23.inv, true)}) yang diikat Fidusia/CMA.</li>
                      <li><strong>Optimalisasi KMK Backup sebagai Buffer Relaksasi Likuiditas Positif</strong> (penarikan bertahap per tranche maks ${fmtRp(m.recommendedTrancheSize, true)} berbasis bukti invoice riil).</li>
                      <li><strong>Escrow Account Khusus di ${proj.bankName}</strong> untuk penampungan 100% penerimaan kas hasil penagihan piutang.</li>
                      <li><strong>Covenant Kontrak PO Minimum Gross Margin +12,1%</strong> untuk menjamin arus kas operasional positif.</li>
                      <li><strong>Personal Guarantee (PG) &amp; Corporate Guarantee (CG)</strong> notariil dari pemegang saham pengendali / UBO.</li>
                    </ol>
                  </div>
                </div>
              ` : `
                <div style="border-top:1px dashed #fde68a; padding-top:0.35rem; margin-top:0.35rem;">
                  <div style="font-weight:800; font-size:0.75rem; color:#b45309; margin-bottom:0.2rem;">
                    KETENTUAN PERSETUJUAN BERSYARAT (MODERATE COVENANTS):
                  </div>
                  <div style="font-size:0.7rem; color:#1e293b; line-height:1.35;">
                    Penjaminan kredit direkomendasikan dengan pembatasan coverage maksimal <strong>${m.recCoveragePct}%</strong> dan indikasi tarif IJP <strong>${m.ijpRate}</strong>, disertai covenants monitoring escrow account dan penarikan kredit bertahap (tranching) di <strong>${proj.bankName}</strong>.
                  </div>
                </div>
              `)}

              ${proj.customNotes ? `<div style="font-size:0.71rem; margin-top:0.3rem; border-top:1px solid #cbd5e1; padding-top:0.25rem;"><strong>Catatan Tambahan Underwriter:</strong> ${proj.customNotes}</div>` : ''}
            </div>

            <!-- LEMBAR TANDA TANGAN -->
            <div class="memo-signature-grid">
              <div>
                <div>Disusun Oleh,</div>
                <div style="height:36px;"></div>
                <div style="font-weight:700; border-top:1px solid #94a3b8; padding-top:3px;">${proj.underwriter || 'Analis Underwriting'}</div>
                <div style="color:var(--text-muted);">${proj.underwriterTitle || 'Analis Underwriting Askrindo'}</div>
              </div>
              <div>
                <div>Diperiksa Oleh,</div>
                <div style="height:36px;"></div>
                <div style="font-weight:700; border-top:1px solid #94a3b8; padding-top:3px;">${proj.checker || 'Kepala Bagian Underwriting'}</div>
                <div style="color:var(--text-muted);">${proj.checkerTitle || 'Reviewer Risiko Asuransi Kredit'}</div>
              </div>
              <div>
                <div>Disetujui Oleh,</div>
                <div style="height:36px;"></div>
                <div style="font-weight:700; border-top:1px solid #94a3b8; padding-top:3px;">${proj.approver || 'Komite Pemutus Asuransi Kredit'}</div>
                <div style="color:var(--text-muted);">${proj.approverTitle || 'PT Asuransi Kredit Indonesia'}</div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

// ============================================================================
// 11. FORM INPUT TWO-WAY SYNC
// ============================================================================
function populateFormInputs(proj) {
  const setVal = (id, val, isDotFormatted = false) => {
    const el = document.getElementById(id);
    if (!el || document.activeElement === el) return;
    if (isDotFormatted) {
      el.value = formatNumberWithDots(val);
    } else {
      el.value = val !== undefined && val !== null ? val : '';
    }
  };

  setVal('inp_companyName', proj.companyName);
  setVal('inp_city', proj.city || '');
  setVal('inp_sector', proj.sector);
  setVal('inp_estYear', proj.estYear);
  setVal('inp_bankName', proj.bankName);
  setVal('inp_facilityType', proj.facilityType);
  setVal('inp_usdAmount', proj.usdAmount, true);
  setVal('inp_fxRate', proj.fxRate, true);
  setVal('inp_requestedPlafond', proj.requestedPlafond, true);
  setVal('inp_pkMonths', proj.pkMonths, true);
  setVal('inp_scfTenorDays', proj.scfTenorDays, true);
  setVal('inp_kmkTenorDays', proj.kmkTenorDays, true);
  setVal('inp_interestRate', proj.interestRate);
  setVal('inp_underwriter', proj.underwriter);
  setVal('inp_underwriter_title', proj.underwriterTitle || 'Analis Underwriting Askrindo');
  setVal('inp_checker', proj.checker || 'Kepala Bagian Underwriting');
  setVal('inp_checker_title', proj.checkerTitle || 'Reviewer Risiko Asuransi Kredit');
  setVal('inp_approver', proj.approver || 'Komite Pemutus Asuransi Kredit');
  setVal('inp_approver_title', proj.approverTitle || 'PT Asuransi Kredit Indonesia');
  setVal('inp_businessDesc', proj.businessDesc);

  // Parameter Otomatisasi 5C
  setVal('inp_askrindoHistory', proj.askrindoHistory || 'new');
  setVal('inp_askrindoCustYears', proj.askrindoCustYears !== undefined ? proj.askrindoCustYears : 0);
  setVal('inp_groupCategory', proj.groupCategory || 'none');
  setVal('inp_companyStatus', proj.companyStatus || 'non_public_no_rating');
  setVal('inp_isTakeOverCredit', proj.isTakeOverCredit ? 'true' : 'false');
  setVal('inp_reinsuranceSupport', proj.reinsuranceSupport || 'treaty');

  const procMethod = proj.procurementMethod || (isMaritimeOrImportRisk(proj) ? 'import_sea' : 'none');
  proj.procurementMethod = procMethod;
  const rImport = document.getElementById('inp_proc_import');
  const rDomestic = document.getElementById('inp_proc_domestic');
  const rNone = document.getElementById('inp_proc_none');
  if (rImport) rImport.checked = (procMethod === 'import_sea');
  if (rDomestic) rDomestic.checked = (procMethod === 'domestic');
  if (rNone) rNone.checked = (procMethod === 'none');

  // Cek apakah proyek memiliki data laporan keuangan riil
  const hasFinData = Object.values(proj.fin22 || {}).some(v => v !== 0 && v !== null && v !== undefined && v !== '') ||
                     Object.values(proj.fin23 || {}).some(v => v !== 0 && v !== null && v !== undefined && v !== '');

  setVal('inp_claimedDOR', proj.claimedDOR, true);
  setVal('inp_claimedDOI', proj.claimedDOI, true);
  setVal('inp_claimedDOP', proj.claimedDOP, true);

  setVal('inp_year1', proj.year1 || 2022);
  setVal('inp_year2', proj.year2 || 2023);

  const fields = [
    'rev', 'cogs', 'opex', 'otherInc', 'otherExp', 'intExp', 'tax', 'div',
    'cash', 'otherCa', 'ar', 'inv', 'otherAr', 'prepaid',
    'fa', 'depr', 'invest', 'taxAsset',
    'ap', 'stDebt', 'otherAp', 'accrued', 'ltDebt',
    'capital', 'otherCap', 'retEarn', 're'
  ];
  fields.forEach((k) => {
    const val22 = proj.fin22 ? proj.fin22[k] : undefined;
    const val23 = proj.fin23 ? proj.fin23[k] : undefined;
    if (!hasFinData && (!val22 || val22 === 0)) {
      const el22 = document.getElementById(`inp_${k}22`);
      if (el22 && document.activeElement !== el22) el22.value = '';
    } else {
      setVal(`inp_${k}22`, val22 !== undefined && val22 !== null ? val22 : 0, true);
    }
    if (!hasFinData && (!val23 || val23 === 0)) {
      const el23 = document.getElementById(`inp_${k}23`);
      if (el23 && document.activeElement !== el23) el23.value = '';
    } else {
      setVal(`inp_${k}23`, val23 !== undefined && val23 !== null ? val23 : 0, true);
    }
  });

  setVal('inp_collateralPrimaryType', proj.collateralPrimaryType || '');
  setVal('inp_collateralPrimaryVal', proj.collateralPrimaryVal, true);
  setVal('inp_collateralPrimaryBinding', proj.collateralPrimaryBinding || '');
  setVal('inp_collateralPrimaryDesc', proj.collateralPrimaryDesc || '');

  setVal('inp_collateralAdditionalType', proj.collateralAdditionalType || '');
  setVal('inp_collateralAdditionalVal', proj.collateralAdditionalVal, true);
  setVal('inp_collateralAdditionalLiquidationVal', proj.collateralAdditionalLiquidationVal, true);
  setVal('inp_collateralAdditionalBinding', proj.collateralAdditionalBinding || '');
  setVal('inp_collateralAdditionalDesc', proj.collateralAdditionalDesc || '');

  const m = computeDCCSWCM(proj);
  updateFinancialStatementTableComputed(proj, m);
  updateCollateralCardDisplay(proj);
}

function updateCollateralCardDisplay(proj) {
  if (!proj) return;
  const f23 = proj.fin23 || {};
  const reqPlafond = proj.requestedPlafond || 1;
  const hasCustomP = typeof proj.collateralPrimaryVal === 'number' && proj.collateralPrimaryVal > 0;
  const hasCustomA = typeof proj.collateralAdditionalVal === 'number' && proj.collateralAdditionalVal > 0;

  const pVal = hasCustomP ? proj.collateralPrimaryVal : (f23.inv || 0);
  const aVal = hasCustomA ? proj.collateralAdditionalVal : (f23.fa || 0);

  const lblInv = document.getElementById('lblExistingInvVal');
  const lblFa = document.getElementById('lblExistingFaVal');
  if (lblInv) lblInv.textContent = fmtRp(f23.inv || 0, true);
  if (lblFa) lblFa.textContent = fmtRp(f23.fa || 0, true);

  const bP = document.getElementById('badgePrimaryCollateralMode');
  if (bP) {
    if (hasCustomP) {
      bP.textContent = '✓ Data Input Khusus';
      bP.style.background = '#e0f2fe';
      bP.style.color = '#0369a1';
    } else {
      bP.textContent = '⚡ Kondisi Eksisting (Neraca)';
      bP.style.background = '#f1f5f9';
      bP.style.color = '#475569';
    }
  }

  const bA = document.getElementById('badgeAdditionalCollateralMode');
  if (bA) {
    if (hasCustomA) {
      bA.textContent = '✓ Data Input Khusus';
      bA.style.background = '#dcfce7';
      bA.style.color = '#15803d';
    } else {
      bA.textContent = '⚡ Kondisi Eksisting (Neraca)';
      bA.style.background = '#f1f5f9';
      bA.style.color = '#475569';
    }
  }

  const bSummary = document.getElementById('collateralStatusSummaryBadge');
  if (bSummary) {
    if (hasCustomP || hasCustomA) {
      bSummary.innerHTML = `🛡️ Mode Input Agunan: Pokok ${fmtRp(pVal, true)} (${((pVal / reqPlafond) * 100).toFixed(0)}%) &bull; Tambahan ${fmtRp(aVal, true)} (${((aVal / reqPlafond) * 100).toFixed(0)}%)`;
      bSummary.style.background = '#e0f2fe';
      bSummary.style.color = '#0369a1';
      bSummary.style.borderColor = '#bae6fd';
    } else {
      bSummary.innerHTML = `⚡ Mode Otomatis: Neraca Eksisting (Persediaan: ${fmtRp(f23.inv || 0, true)} &bull; FA: ${fmtRp(f23.fa || 0, true)})`;
      bSummary.style.background = '#f0fdf4';
      bSummary.style.color = '#166534';
      bSummary.style.borderColor = '#86efac';
    }
  }
}

function updateFinancialStatementTableComputed(proj, m) {
  if (!proj || !m) return;
  const f22 = proj.fin22 || {};
  const f23 = proj.fin23 || {};

  const setCalc = (id, val, highlightNeg = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    const rounded = Math.round(val || 0);
    el.textContent = formatNumberWithDots(rounded) || '0';
    if (highlightNeg && rounded < 0) {
      el.style.color = '#dc2626';
    } else if (id.includes('ta') || id.includes('tlEq') || id.includes('eat2')) {
      el.style.color = '#1e3a8a';
    } else {
      el.style.color = '';
    }
  };

  const setPct = (id, val, base) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!base || base === 0) {
      el.textContent = '0,0%';
      return;
    }
    const pct = ((val || 0) / base) * 100;
    el.textContent = `${pct.toFixed(1).replace('.', ',')}%`;
  };

  const setGrw = (id, v22, v23, invertGood = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    const n22 = v22 || 0;
    const n23 = v23 || 0;
    if (n22 === 0 && n23 === 0) {
      el.textContent = '0,0%';
      el.style.color = '#64748b';
      return;
    }
    if (n22 === 0) {
      el.textContent = 'N/A';
      el.style.color = '#64748b';
      return;
    }
    const g = ((n23 - n22) / Math.abs(n22)) * 100;
    const sign = g > 0 ? '+' : '';
    el.textContent = `${sign}${g.toFixed(1).replace('.', ',')}%`;
    if (Math.abs(g) < 0.05) {
      el.style.color = '#64748b';
    } else if ((g > 0 && !invertGood) || (g < 0 && invertGood)) {
      el.style.color = '#166534';
    } else {
      el.style.color = '#dc2626';
    }
  };

  // 1. Subtotals & Totals Neraca
  setCalc('calc_ca22', m.ca22);
  setCalc('calc_ca23', m.ca23);
  setCalc('calc_nca22', m.nca22);
  setCalc('calc_nca23', m.nca23);
  setCalc('calc_ta22', m.ta22);
  setCalc('calc_ta23', m.ta23);

  setCalc('calc_cl22', m.cl22);
  setCalc('calc_cl23', m.cl23);
  setCalc('calc_tl22', m.tl22);
  setCalc('calc_tl23', m.tl23);
  setCalc('calc_eq22', m.eq22);
  setCalc('calc_eq23', m.eq23);
  setCalc('calc_tlEq22', m.tlEq22);
  setCalc('calc_tlEq23', m.tlEq23);

  // 2. Subtotals & Totals Laba Rugi (R/L)
  setCalc('calc_revMo22', m.revMo22);
  setCalc('calc_revMo23', m.revMo23);
  setCalc('calc_gp22', m.gp22);
  setCalc('calc_gp23', m.gp23);
  setCalc('calc_opBruto22', m.opBruto22);
  setCalc('calc_opBruto23', m.opBruto23);
  setCalc('calc_opInc22', m.opInc22);
  setCalc('calc_opInc23', m.opInc23);
  setCalc('calc_ebit22', m.ebit22);
  setCalc('calc_ebit23', m.ebit23);
  setCalc('calc_ebitMo22', m.ebitMo22);
  setCalc('calc_ebitMo23', m.ebitMo23);
  setCalc('calc_ebt22', m.ebt22);
  setCalc('calc_ebt23', m.ebt23);
  setCalc('calc_eat22', m.eat22);
  setCalc('calc_eat23', m.eat23);
  setCalc('calc_eatMo22', m.eatMo22);
  setCalc('calc_eatMo23', m.eatMo23);

  // 3. Common-size (%) & Growth (%) Aktiva
  const bsItems = [
    ['cash', f22.cash, f23.cash, false],
    ['otherCa', f22.otherCa, f23.otherCa, false],
    ['ar', f22.ar, f23.ar, false],
    ['inv', f22.inv, f23.inv, false],
    ['otherAr', f22.otherAr, f23.otherAr, false],
    ['prepaid', f22.prepaid, f23.prepaid, false],
    ['ca', m.ca22, m.ca23, false],
    ['fa', f22.fa, f23.fa, false],
    ['depr', f22.depr, f23.depr, false],
    ['invest', f22.invest, f23.invest, false],
    ['taxAsset', f22.taxAsset, f23.taxAsset, false],
    ['nca', m.nca22, m.nca23, false],
    ['ta', m.ta22, m.ta23, false],
    ['ap', f22.ap, f23.ap, true],
    ['stDebt', f22.stDebt, f23.stDebt, true],
    ['otherAp', f22.otherAp, f23.otherAp, true],
    ['accrued', f22.accrued, f23.accrued, true],
    ['cl', m.cl22, m.cl23, true],
    ['ltDebt', f22.ltDebt, f23.ltDebt, true],
    ['tl', m.tl22, m.tl23, true],
    ['capital', f22.capital, f23.capital, false],
    ['otherCap', f22.otherCap, f23.otherCap, false],
    ['retEarn', f22.retEarn, f23.retEarn, false],
    ['re', f22.re, f23.re, false],
    ['eq', m.eq22, m.eq23, false],
    ['tlEq', m.tlEq22, m.tlEq23, false]
  ];
  bsItems.forEach(([key, v22, v23, invGood]) => {
    setPct(`pct_${key}22`, v22, m.ta22);
    setPct(`pct_${key}23`, v23, m.ta23);
    setGrw(`grw_${key}`, v22, v23, invGood);
  });

  // 4. Common-size (%) & Growth (%) Laba Rugi
  const isItems = [
    ['rev', f22.rev, f23.rev, false],
    ['revMo', m.revMo22, m.revMo23, false],
    ['cogs', f22.cogs, f23.cogs, true],
    ['gp', m.gp22, m.gp23, false],
    ['opex', f22.opex, f23.opex, true],
    ['opBruto', m.opBruto22, m.opBruto23, false],
    ['opInc', m.opInc22, m.opInc23, false],
    ['otherInc', f22.otherInc, f23.otherInc, false],
    ['otherExp', f22.otherExp, f23.otherExp, true],
    ['ebit', m.ebit22, m.ebit23, false],
    ['ebitMo', m.ebitMo22, m.ebitMo23, false],
    ['intExp', f22.intExp, f23.intExp, true],
    ['ebt', m.ebt22, m.ebt23, false],
    ['tax', f22.tax, f23.tax, true],
    ['div', f22.div, f23.div, false],
    ['eat', m.eat22, m.eat23, false],
    ['eatMo', m.eatMo22, m.eatMo23, false]
  ];
  isItems.forEach(([key, v22, v23, invGood]) => {
    setPct(`pct_${key}22`, v22, f22.rev);
    setPct(`pct_${key}23`, v23, f23.rev);
    setGrw(`grw_${key}`, v22, v23, invGood);
  });

  // 5. Indikator Keseimbangan Neraca (Aktiva = Passiva)
  const badge = document.getElementById('finBalanceStatusBadge');
  if (badge) {
    if (!m || !m.hasFinancials) {
      badge.style.background = '#f1f5f9';
      badge.style.color = '#64748b';
      badge.style.borderColor = '#cbd5e1';
      badge.innerHTML = '&#9432; Status Neraca: Menunggu Pengisian Data Laporan Keuangan';
    } else {
      const diff22 = Math.round((m.ta22 || 0) - (m.tlEq22 || 0));
      const diff23 = Math.round((m.ta23 || 0) - (m.tlEq23 || 0));
      if (Math.abs(diff22) <= 100 && Math.abs(diff23) <= 100) {
        badge.style.background = '#dcfce7';
        badge.style.color = '#166534';
        badge.style.borderColor = '#86efac';
        badge.innerHTML = '&#10003; Neraca Balance (TOTAL AKTIVA = TOTAL HTNG &amp; MODAL)';
      } else {
        badge.style.background = '#fef2f2';
        badge.style.color = '#991b1b';
        badge.style.borderColor = '#fca5a5';
        badge.innerHTML = `&#9888; Selisih Neraca (${m.yr1}: ${fmtRp(diff22, true)} | ${m.yr2}: ${fmtRp(diff23, true)})`;
      }
    }
  }
  updateCollateralCardDisplay(proj);
}

function syncInputsToModel() {
  const proj = getActiveProject();
  if (!proj) return;

  const getStr = (id) => document.getElementById(id)?.value || '';
  const getFmtNum = (id) => parseFormattedNumber(document.getElementById(id)?.value);
  const getPlainNum = (id) => parseFloat(document.getElementById(id)?.value) || 0;

  const oldCompName = (proj.companyName || '').trim();
  proj.companyName = getStr('inp_companyName');
  proj.city = getStr('inp_city') || '';
  if (proj.companyName.trim() !== oldCompName) {
    // Otomatis memicu pencarian Daftar Hitam INAPROC LKPP & Berita Google News 1x setelah user selesai mengetik nama perusahaan
    runAutoInaprocCheckSync(proj, false);
    runAutoGoogleNewsCheckSync(proj, false);
    if (inaprocAutoTriggerTimer) clearTimeout(inaprocAutoTriggerTimer);
    inaprocAutoTriggerTimer = setTimeout(() => {
      triggerLiveInaprocCheck(false);
      fetchGoogleNewsForProject(false, true);
    }, 1200);
  }

  proj.sector = getStr('inp_sector');
  proj.estYear = getPlainNum('inp_estYear');
  proj.bankName = getStr('inp_bankName');
  proj.facilityType = getStr('inp_facilityType');
  proj.usdAmount = getFmtNum('inp_usdAmount');
  proj.fxRate = getFmtNum('inp_fxRate');
  proj.requestedPlafond = getFmtNum('inp_requestedPlafond');
  proj.pkMonths = getFmtNum('inp_pkMonths');
  proj.scfTenorDays = getFmtNum('inp_scfTenorDays');
  proj.kmkTenorDays = getFmtNum('inp_kmkTenorDays');
  proj.interestRate = getPlainNum('inp_interestRate');
  proj.underwriter = getStr('inp_underwriter');
  proj.underwriterTitle = getStr('inp_underwriter_title');
  proj.checker = getStr('inp_checker');
  proj.checkerTitle = getStr('inp_checker_title');
  proj.approver = getStr('inp_approver');
  proj.approverTitle = getStr('inp_approver_title');
  proj.businessDesc = getStr('inp_businessDesc');

  // Parameter Otomatisasi 5C
  proj.askrindoHistory = getStr('inp_askrindoHistory') || 'new';
  proj.askrindoCustYears = getPlainNum('inp_askrindoCustYears');
  proj.groupCategory = getStr('inp_groupCategory') || 'none';
  proj.companyStatus = getStr('inp_companyStatus') || 'non_public_no_rating';
  proj.isTakeOverCredit = getStr('inp_isTakeOverCredit') === 'true';
  proj.reinsuranceSupport = getStr('inp_reinsuranceSupport') || 'treaty';

  const rNone = document.getElementById('inp_proc_none');
  const rDomestic = document.getElementById('inp_proc_domestic');
  const rImport = document.getElementById('inp_proc_import');
  if (rNone && rNone.checked) {
    proj.procurementMethod = 'none';
  } else if (rDomestic && rDomestic.checked) {
    proj.procurementMethod = 'domestic';
  } else if (rImport && rImport.checked) {
    proj.procurementMethod = 'import_sea';
  } else {
    const selectedProc = document.querySelector('input[name="inp_procurementMethod"]:checked');
    if (selectedProc) {
      proj.procurementMethod = selectedProc.value;
    } else if (!proj.procurementMethod) {
      proj.procurementMethod = isMaritimeOrImportRisk(proj) ? 'import_sea' : 'none';
    }
  }

  const getFmtNumOrNull = (id) => {
    const raw = (document.getElementById(id)?.value || '').trim();
    if (!raw) return null;
    return parseFormattedNumber(raw);
  };

  proj.claimedDOR = getFmtNumOrNull('inp_claimedDOR');
  proj.claimedDOI = getFmtNumOrNull('inp_claimedDOI');
  proj.claimedDOP = getFmtNumOrNull('inp_claimedDOP');

  proj.collateralPrimaryType = getStr('inp_collateralPrimaryType');
  proj.collateralPrimaryVal = getFmtNumOrNull('inp_collateralPrimaryVal');
  proj.collateralPrimaryBinding = getStr('inp_collateralPrimaryBinding');
  proj.collateralPrimaryDesc = getStr('inp_collateralPrimaryDesc');

  proj.collateralAdditionalType = getStr('inp_collateralAdditionalType');
  proj.collateralAdditionalVal = getFmtNumOrNull('inp_collateralAdditionalVal');
  proj.collateralAdditionalLiquidationVal = getFmtNumOrNull('inp_collateralAdditionalLiquidationVal');
  proj.collateralAdditionalBinding = getStr('inp_collateralAdditionalBinding');
  proj.collateralAdditionalDesc = getStr('inp_collateralAdditionalDesc');

  proj.year1 = getPlainNum('inp_year1') || 2022;
  proj.year2 = getPlainNum('inp_year2') || 2023;

  const fields = [
    'rev', 'cogs', 'opex', 'otherInc', 'otherExp', 'intExp', 'tax', 'div',
    'cash', 'otherCa', 'ar', 'inv', 'otherAr', 'prepaid',
    'fa', 'depr', 'invest', 'taxAsset',
    'ap', 'stDebt', 'otherAp', 'accrued', 'ltDebt',
    'capital', 'otherCap', 'retEarn', 're'
  ];
  fields.forEach((k) => {
    proj.fin22[k] = getFmtNum(`inp_${k}22`);
    proj.fin23[k] = getFmtNum(`inp_${k}23`);
  });

  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);
  updateFinancialStatementTableComputed(proj, m);
  updateCollateralCardDisplay(proj);

  // Update dynamic year labels
  const y1El = document.getElementById('thLabelYear1');
  const y2El = document.getElementById('thLabelYear2');
  const bYEl = document.getElementById('bannerFinYears');
  if (y1El) y1El.textContent = m.yr1;
  if (y2El) y2El.textContent = m.yr2;
  if (bYEl) bYEl.textContent = `${m.yr1} & ${m.yr2}`;

  renderProjectList();
  renderBanner(proj, m);
  renderDashboardTab(proj, m);
  renderDCCTab(proj, m);
  renderBurnRateTab(proj, m);
  runStressSimulation();
  renderGradeRiskTab(proj, m);
  render5CTab(proj, m);
  renderScoreCalculationTab(proj, m);
  renderCaseStudyQATab(proj, m);
  renderRatiosTab(proj, m);
  renderCashFlowTab(proj, m);
  renderPrintableReport(proj, m);
}

let isProcurementMethodUpdating = false;
function setProcurementMethod(method) {
  const proj = getActiveProject();
  if (!proj) return;
  if (isProcurementMethodUpdating) return;
  
  isProcurementMethodUpdating = true;
  setTimeout(() => { isProcurementMethodUpdating = false; }, 300);

  proj.procurementMethod = method;

  const rImport = document.getElementById('inp_proc_import');
  const rDomestic = document.getElementById('inp_proc_domestic');
  const rNone = document.getElementById('inp_proc_none');
  if (rImport) rImport.checked = (method === 'import_sea');
  if (rDomestic) rDomestic.checked = (method === 'domestic');
  if (rNone) rNone.checked = (method === 'none');

  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);
  renderProjectList();
  renderBanner(proj, m);
  renderDashboardTab(proj, m);
  renderDCCTab(proj, m);
  renderBurnRateTab(proj, m);
  runStressSimulation();
  renderGradeRiskTab(proj, m);
  render5CTab(proj, m);
  renderScoreCalculationTab(proj, m);
  renderCaseStudyQATab(proj, m);
  renderRatiosTab(proj, m);
  renderCashFlowTab(proj, m);
  renderPrintableReport(proj, m);

  const label = method === 'none' ? 'Tidak Ada Pengiriman Fisik' : (method === 'domestic' ? 'Domestik / Lokal' : 'Impor Luar Negeri / Jalur Laut');
  showToast(`Metode logistik berhasil diset: "${label}" & analisa telah dihitung ulang.`);
}

function saveCurrentAnalysisGlobal() {
  const proj = getActiveProject();
  if (!proj) {
    showToast('Pilih atau buat berkas analisa terlebih dahulu.');
    return;
  }
  const rNone = document.getElementById('inp_proc_none');
  const rDomestic = document.getElementById('inp_proc_domestic');
  const rImport = document.getElementById('inp_proc_import');
  if (rNone && rNone.checked) {
    proj.procurementMethod = 'none';
  } else if (rDomestic && rDomestic.checked) {
    proj.procurementMethod = 'domestic';
  } else if (rImport && rImport.checked) {
    proj.procurementMethod = 'import_sea';
  }
  syncInputsToModel();
  if (inaprocAutoTriggerTimer) {
    clearTimeout(inaprocAutoTriggerTimer);
    inaprocAutoTriggerTimer = null;
  }
  runAutoInaprocCheckSync(proj, false);
  runAutoGoogleNewsCheckSync(proj, false);
  cleanStaleLegacyKeys();
  saveProjectsToStorage(true);
  renderAll();
  showToast(`Seluruh data analisa "${proj.companyName || 'Debitur'}" berhasil disimpan ke Database Cloud.`);
}

function saveAllInputsAndRecalculate() {
  const proj = getActiveProject();
  if (!proj) {
    showToast('Pilih atau buat berkas proyek analisa terlebih dahulu.');
    return;
  }
  const rNone = document.getElementById('inp_proc_none');
  const rDomestic = document.getElementById('inp_proc_domestic');
  const rImport = document.getElementById('inp_proc_import');
  if (rNone && rNone.checked) {
    proj.procurementMethod = 'none';
  } else if (rDomestic && rDomestic.checked) {
    proj.procurementMethod = 'domestic';
  } else if (rImport && rImport.checked) {
    proj.procurementMethod = 'import_sea';
  }
  syncInputsToModel();
  if (inaprocAutoTriggerTimer) {
    clearTimeout(inaprocAutoTriggerTimer);
    inaprocAutoTriggerTimer = null;
  }
  runAutoInaprocCheckSync(proj, false);
  runAutoGoogleNewsCheckSync(proj, false);
  saveProjectsToStorage();
  renderAll();
  showToast('Perubahan data input berhasil disimpan & memindai ulang Daftar Hitam + Berita Google News...');
  // Langsung jalankan pencarian baru Daftar Hitam & Google News saat tombol Simpan diklik
  triggerLiveInaprocCheck(false);
  fetchGoogleNewsForProject(true, true);
}

// ============================================================================
// SISTEM COMBOBOX / SEARCHABLE DROPDOWN UNTUK INPUT PILIH / KETIK
// ============================================================================
function getDatalistOptions(datalist) {
  if (!datalist) return [];
  return Array.from(datalist.querySelectorAll('option')).map(opt => ({
    value: opt.value || opt.textContent || '',
    label: opt.textContent || opt.value || ''
  })).filter(o => o.value.trim().length > 0);
}

function closeAllComboboxDropdowns() {
  document.querySelectorAll('.combobox-dropdown-menu').forEach(menu => {
    menu.style.display = 'none';
  });
}

function toggleComboboxDropdown(input, datalist, wrapper) {
  const menu = wrapper.querySelector('.combobox-dropdown-menu');
  if (menu && menu.style.display === 'block') {
    menu.style.display = 'none';
  } else {
    openComboboxDropdown(input, datalist, wrapper);
  }
}

function openComboboxDropdown(input, datalist, wrapper) {
  closeAllComboboxDropdowns();
  let menu = wrapper.querySelector('.combobox-dropdown-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'combobox-dropdown-menu';
    wrapper.appendChild(menu);
  }

  renderComboboxItems(input, datalist, menu, input.value.trim());
  menu.style.display = 'block';
}

function filterComboboxDropdown(input, datalist, wrapper) {
  let menu = wrapper.querySelector('.combobox-dropdown-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'combobox-dropdown-menu';
    wrapper.appendChild(menu);
  }
  renderComboboxItems(input, datalist, menu, input.value.trim());
  menu.style.display = 'block';
}

function renderComboboxItems(input, datalist, menu, filterQuery) {
  const options = getDatalistOptions(datalist);
  const q = (filterQuery || '').toLowerCase();
  const filtered = q ? options.filter(o => o.value.toLowerCase().includes(q)) : options;

  menu.innerHTML = '';
  if (filtered.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'combobox-empty-item';
    emptyDiv.innerHTML = `<em>Tidak ada kecocokan daftar &bull; Tetap gunakan: "<strong>${filterQuery}</strong>"</em>`;
    menu.appendChild(emptyDiv);
    return;
  }

  filtered.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'combobox-item';
    if (input.value.trim().toLowerCase() === opt.value.toLowerCase()) {
      item.classList.add('selected');
    }
    item.textContent = opt.value;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      input.value = opt.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      menu.style.display = 'none';
      if (typeof syncInputsToModel === 'function' && input.id.startsWith('inp_')) {
        syncInputsToModel();
      }
    });
    menu.appendChild(item);
  });
}

function handleComboboxKeydown(e, input, wrapper) {
  const menu = wrapper.querySelector('.combobox-dropdown-menu');
  if (!menu || menu.style.display !== 'block') {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      const listId = input.getAttribute('data-list');
      const datalist = document.getElementById(listId);
      if (datalist) {
        openComboboxDropdown(input, datalist, wrapper);
        e.preventDefault();
      }
    }
    return;
  }

  const items = Array.from(menu.querySelectorAll('.combobox-item'));
  if (items.length === 0) return;

  let activeIndex = items.findIndex(el => el.classList.contains('active'));

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeIndex >= 0) items[activeIndex].classList.remove('active');
    activeIndex = (activeIndex + 1) % items.length;
    items[activeIndex].classList.add('active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeIndex >= 0) items[activeIndex].classList.remove('active');
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    items[activeIndex].classList.add('active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    if (activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      items[activeIndex].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }
  } else if (e.key === 'Escape') {
    menu.style.display = 'none';
  }
}

function setupCustomComboboxes() {
  const comboboxInputIds = [
    'new_sector',
    'new_facilityType',
    'new_bankName',
    'new_city',
    'inp_sector',
    'inp_facilityType',
    'inp_bankName',
    'inp_city'
  ];

  comboboxInputIds.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    const listId = input.getAttribute('list') || input.getAttribute('data-list');
    if (!listId) return;

    const datalist = document.getElementById(listId);
    if (!datalist) return;

    input.setAttribute('data-list', listId);
    input.removeAttribute('list');
    input.setAttribute('autocomplete', 'off');

    let wrapper = input.parentElement;
    if (!wrapper.classList.contains('combobox-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = 'combobox-wrapper';
      wrapper.insertBefore(newWrapper, input);
      newWrapper.appendChild(input);
      wrapper = newWrapper;

      const arrowBtn = document.createElement('div');
      arrowBtn.className = 'combobox-arrow-btn';
      arrowBtn.innerHTML = '&#9662;'; // ▼
      arrowBtn.title = 'Tampilkan pilihan';
      newWrapper.appendChild(arrowBtn);

      arrowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleComboboxDropdown(input, datalist, newWrapper);
      });
    }

    if (!input.dataset.comboboxInitialized) {
      input.dataset.comboboxInitialized = 'true';

      input.addEventListener('click', (e) => {
        e.stopPropagation();
        openComboboxDropdown(input, datalist, wrapper);
      });

      input.addEventListener('focus', () => {
        openComboboxDropdown(input, datalist, wrapper);
      });

      input.addEventListener('input', () => {
        filterComboboxDropdown(input, datalist, wrapper);
      });

      input.addEventListener('keydown', (e) => {
        handleComboboxKeydown(e, input, wrapper);
      });
    }
  });
}

// Tutup semua combobox ketika klik di luar
document.addEventListener('click', (e) => {
  if (!e.target.closest('.combobox-wrapper')) {
    closeAllComboboxDropdowns();
  }
});

// ============================================================================
// 12. TAB NAVIGATION & MODAL ACTIONS
// ============================================================================
function switchTab(tabId) {
  closeAllComboboxDropdowns();
  if (tabId === 'tab-mitigasi') tabId = 'tab-case-qa';
  if (tabId !== 'tab-dashboard' && (!projects || projects.length === 0 || !getActiveProject())) {
    return;
  }
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === tabId);
  });
  if (tabId === 'tab-report') {
    const proj = getActiveProject();
    if (proj) {
      const m = computeDCCSWCM(proj);
      renderPrintableReport(proj, m);
    }
  }
  setTimeout(() => {
    enhanceGlossaryTerms();
  }, 60);
}

function openNewProjectModal() {
  closeAllComboboxDropdowns();
  setupCustomComboboxes();
  const setElVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setElVal('new_companyName', '');
  setElVal('new_city', '');
  setElVal('new_sector', '');
  setElVal('new_bankName', '');
  setElVal('new_facilityType', '');
  setElVal('new_estYear', '');
  setElVal('new_plafond', '');
  setElVal('new_year1', '');
  setElVal('new_year2', '');
  document.getElementById('newProjectModal').classList.add('open');
}

function closeNewProjectModal() {
  closeAllComboboxDropdowns();
  document.getElementById('newProjectModal').classList.remove('open');
}

function createNewProjectFromModal() {
  const name = document.getElementById('new_companyName').value.trim() || `Proyek Kredit Baru #${projects.length + 1}`;
  const city = document.getElementById('new_city')?.value.trim() || '';
  const sector = document.getElementById('new_sector').value.trim() || 'Perdagangan Umum';
  const bank = document.getElementById('new_bankName').value.trim() || 'Bank Dana';
  const fac = document.getElementById('new_facilityType').value.trim() || 'Kredit Modal Kerja (KMK) Revolving';
  const plafond = parseFormattedNumber(document.getElementById('new_plafond').value) || 10000000000;
  const yr1 = parseInt(document.getElementById('new_year1').value, 10) || 2022;
  const yr2 = parseInt(document.getElementById('new_year2').value, 10) || 2023;
  const estYearVal = parseInt(document.getElementById('new_estYear')?.value, 10);
  const estYear = estYearVal || (yr2 - 5);
  const tpl = document.getElementById('new_templateType')?.value || 'blank_healthy';

  const defaults = getDefaultProjects();
  let baseObj;
  if (tpl === 'clone_rahmat') {
    baseObj = JSON.parse(JSON.stringify(defaults[0]));
  } else if (tpl === 'clone_current') {
    baseObj = JSON.parse(JSON.stringify(getActiveProject() || defaults[0]));
  } else {
    // Template Baru Bersih: Rasio Aktivitas Bank (DOR, DOI, DOP) & Laporan Keuangan (Neraca & Laba Rugi) KOSONG
    baseObj = {
      id: '',
      caseNumber: '',
      companyName: '',
      city: '',
      sector: sector,
      bankName: bank,
      facilityType: fac,
      requestedPlafond: plafond,
      usdAmount: 0,
      fxRate: 15500,
      pkMonths: 12,
      scfTenorDays: 0,
      kmkTenorDays: 120,
      interestRate: 11.0,
      underwriter: 'Analis Underwriting',
      underwriterTitle: 'Analis Underwriting Askrindo',
      checker: 'Kepala Bagian Underwriting',
      checkerTitle: 'Reviewer Risiko Asuransi Kredit',
      approver: 'Komite Pemutus Asuransi Kredit',
      approverTitle: 'PT Asuransi Kredit Indonesia',
      businessDesc: '',
      procurementMethod: 'domestic',
      claimedDOR: null,
      claimedDOI: null,
      claimedDOP: null,
      claimedWCTargetDays: null,
      collateralPrimaryType: '',
      collateralPrimaryVal: null,
      collateralPrimaryBinding: '',
      collateralPrimaryDesc: '',
      collateralAdditionalType: '',
      collateralAdditionalVal: null,
      collateralAdditionalLiquidationVal: null,
      collateralAdditionalBinding: '',
      collateralAdditionalDesc: '',
      year1: yr1,
      year2: yr2,
      estYear: estYear,
      fin22: {},
      fin23: {},
      qualitative5CScore: null,
      customNotes: '',
      manualGradeOverride: 'AUTO',
      overrideReason: '',
      inaprocStatus: 'clean',
      inaprocCheckedAt: null,
      sippStatus: 'clean',
      sippCheckedAt: null,
      googleNewsItems: [],
      googleNewsAccessedAt: null
    };
  }

  baseObj.id = 'case-' + Date.now();
  baseObj.caseNumber = generateNumericCaseNumber();
  baseObj.companyName = name;
  baseObj.city = city;
  runAutoInaprocCheckSync(baseObj, false);
  baseObj.googleNewsItems = [];
  baseObj.googleNewsAccessedAt = null;
  ensureGoogleNewsInitialized(baseObj);
  baseObj.sector = sector;
  baseObj.bankName = bank;
  baseObj.facilityType = fac;
  baseObj.estYear = estYear;
  baseObj.requestedPlafond = plafond;
  baseObj.usdAmount = 0;
  baseObj.year1 = yr1;
  baseObj.year2 = yr2;
  baseObj.qualitative5CScore = null;
  baseObj.customNotes = '';
  baseObj.manualGradeOverride = 'AUTO';
  baseObj.overrideReason = '';

  projects.unshift(baseObj);
  activeProjectId = baseObj.id;
  saveProjectsToStorage(true);
  closeNewProjectModal();

  // Beralih dari Welcome Hub ke Ruang Kerja Analisa Kasus Baru
  const hubEl = document.getElementById('welcomeHubView');
  const wsEl = document.getElementById('projectWorkspaceView');
  if (hubEl) hubEl.style.display = 'none';
  if (wsEl) wsEl.style.display = 'block';
  updateNavHomeState(false);

  renderAll();
  switchTab('tab-input');
  setTimeout(() => {
    fetchGoogleNewsForProject(false, true);
  }, 400);
  showToast(`Proyek "${name}" berhasil dibuat!`);
}

function duplicateCurrentProject() {
  const curr = getActiveProject();
  if (!curr) return;
  const copy = JSON.parse(JSON.stringify(curr));
  copy.id = 'case-' + Date.now();
  copy.caseNumber = generateNumericCaseNumber();
  copy.companyName = `${curr.companyName} (Salinan)`;
  projects.unshift(copy);
  activeProjectId = copy.id;
  saveProjectsToStorage(true);

  const hubEl = document.getElementById('welcomeHubView');
  const wsEl = document.getElementById('projectWorkspaceView');
  if (hubEl) hubEl.style.display = 'none';
  if (wsEl) wsEl.style.display = 'block';

  renderAll();
  showToast(`Kasus "${curr.companyName}" berhasil diduplikasi!`);
}

function deleteCurrentProject() {
  if (projects.length <= 1) {
    alert('Minimal harus terdapat 1 proyek analisa di dalam aplikasi.');
    return;
  }
  const curr = getActiveProject();
  if (!confirm(`Hapus proyek analisa "${curr.companyName}"?`)) return;
  projects = projects.filter((p) => p.id !== curr.id);
  activeProjectId = projects[0]?.id || null;
  cleanStaleLegacyKeys();
  saveProjectsToStorage(true);
  renderAll();
  showToast('Proyek telah dihapus.');
}

function resetToDefaultCases() {
  if (!confirm('Kembalikan daftar analisa ke contoh kasus bawaan (termasuk PT Rahmat Santosa)?')) return;
  projects = getDefaultProjects();
  activeProjectId = projects[0].id;
  saveProjectsToStorage(true);
  renderAll();
  showToast('Data contoh kasus bawaan berhasil dimuat ulang!');
}

function exportSingleProjectJSON(id) {
  const p = projects.find(item => item.id === id);
  if (!p) {
    showToast('Berkas analisa tidak ditemukan!', 'error');
    return;
  }
  const cleanName = (p.companyName || 'Analisa').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dataStr = JSON.stringify({
    app: 'Askrindo Smart Credit Analysis (ASCA)',
    method: 'DCC-SWCM',
    exportedAt: new Date().toISOString(),
    projects: [p]
  }, null, 2);

  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ASCA_${cleanName}_${new Date().toISOString().slice(0, 10)}.asca.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Berkas analisa "${p.companyName || 'Debitur'}" berhasil diunduh (.json)!`);
}

function exportWorkspaceJSON() {
  const dataStr = JSON.stringify({
    app: 'Askrindo Smart Credit Analysis (ASCA)',
    method: 'DCC-SWCM',
    exportedAt: new Date().toISOString(),
    projects
  }, null, 2);

  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ASCA_Workspace_${new Date().toISOString().slice(0, 10)}.asca.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('File database analisa (.asca.json) berhasil diunduh!');
}

function importWorkspaceJSON(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const list = Array.isArray(parsed) ? parsed : parsed.projects;
      if (Array.isArray(list) && list.length > 0) {
        if (list.length === 1) {
          const importedProj = list[0];
          const existingIdx = projects.findIndex(p => p.id === importedProj.id);
          if (existingIdx >= 0) {
            projects[existingIdx] = importedProj;
          } else {
            projects.unshift(importedProj);
          }
          activeProjectId = importedProj.id;
          saveProjectsToStorage(true);
          renderAll();
          showToast(`Berhasil memuat analisa "${importedProj.companyName || 'Debitur'}" dari file!`);
          return;
        }
        projects = list;
        activeProjectId = projects[0].id;
        saveProjectsToStorage(true);
        renderAll();
        showToast(`Berhasil memuat ${list.length} berkas analisa dari file!`);
      } else {
        alert('Format file JSON tidak valid.');
      }
    } catch (err) {
      alert('Gagal membaca file JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function printUnderwritingReport() {
  if (!getActiveProject() || !projects || projects.length === 0) {
    showToast('Belum ada berkas proyek analisa untuk dicetak.');
    return;
  }
  switchTab('tab-report');
  setTimeout(() => {
    window.print();
  }, 200);
}

// ============================================================================
// 13. INITIALIZATION
// ============================================================================
function renderAll() {
  const proj = getActiveProject();
  renderProjectList();

  const emptyStateEl = document.getElementById('dashboardEmptyState');
  const activeStateEl = document.getElementById('dashboardActiveState');

  if (!proj) {
    // Nonaktifkan semua tab fitur selain Dashboard jika belum ada proyek
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const isDashboard = btn.getAttribute('data-tab') === 'tab-dashboard';
      if (!btn.dataset.originalTitle) {
        btn.dataset.originalTitle = btn.getAttribute('title') || '';
      }
      btn.disabled = !isDashboard;
      btn.classList.toggle('disabled', !isDashboard);
      if (!isDashboard) {
        btn.setAttribute('title', 'Buat atau pilih proyek analisa terlebih dahulu untuk mengakses fitur ini');
      } else {
        btn.setAttribute('title', btn.dataset.originalTitle);
      }
    });

    switchTab('tab-dashboard');
    const btnPrint = document.getElementById('btnPrintReport');
    if (btnPrint) {
      btnPrint.disabled = true;
      btnPrint.classList.add('disabled');
      btnPrint.title = 'Belum ada berkas proyek analisa untuk dicetak';
    }
    const btnDup = document.getElementById('btnDuplicateProject');
    if (btnDup) {
      btnDup.disabled = true;
      btnDup.classList.add('disabled');
      btnDup.title = 'Belum ada proyek analisa untuk diduplikasi';
    }
    const btnExp = document.getElementById('btnExportJson');
    if (btnExp) {
      btnExp.disabled = true;
      btnExp.classList.add('disabled');
      btnExp.title = 'Belum ada database proyek analisa untuk disimpan';
    }
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('bannerCompanyName', 'Belum Ada Berkas Analisa');
    setTxt('bannerSector', 'Klik tombol "Buat Analisa Baru" untuk memulai analisa kasus kredit pertama Anda.');
    setTxt('bannerGradeBadge', '-');
    setTxt('bannerFacilityType', '-');
    setTxt('bannerBankName', '-');
    setTxt('bannerPlafond', '-');
    setTxt('bannerFinYears', '-');
    const curSession = getActiveSession();
    setTxt('bannerUnderwriter', curSession ? (curSession.fullName || curSession.username) : '-');
    setTxt('bannerScoreCircle', '0');
    setTxt('bannerDecisionText', 'SIAP ANALISA KASUS BARU');
    const decElReset = document.getElementById('bannerDecisionText');
    if (decElReset) decElReset.className = 'case-decision-pill decision-pending';
    setTxt('bannerOptimalLimit', 'Rekomendasi: -');

    const gradeBadge = document.getElementById('bannerGradeBadge');
    if (gradeBadge) {
      gradeBadge.className = 'grade-badge';
      gradeBadge.style.background = '#94a3b8';
    }
    const scoreCircle = document.getElementById('bannerScoreCircle');
    if (scoreCircle) {
      scoreCircle.style.background = '#94a3b8';
    }

    if (emptyStateEl) {
      emptyStateEl.style.display = 'block';
      emptyStateEl.innerHTML =
        '<div class="card" style="text-align:center; padding:4rem 1.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:420px; margin:0 auto; width:100%; box-sizing:border-box;">' +
        '<div style="margin:0 auto 1.2rem auto; background:rgba(0,86,145,0.08); width:88px; height:88px; border-radius:50%; display:flex; align-items:center; justify-content:center;">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#005691" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' +
        '</div>' +
        '<h2 style="color:var(--askrindo-navy); font-size:1.35rem; font-weight:800; margin:0 auto 0.5rem auto; text-align:center;">Ruang Kerja Analisa Kredit Masih Kosong</h2>' +
        '<p style="color:var(--text-muted); max-width:540px; margin:0 auto 2rem auto; font-size:0.86rem; line-height:1.5; text-align:center;">Akun ini belum memiliki berkas analisa debitur. Mulai dengan membuat proyek analisa kredit baru atau buka file database (.asca.json) yang telah disimpan sebelumnya.</p>' +
        '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; margin:0 auto;">' +
        '<button class="btn btn-primary" onclick="openNewProjectModal()" style="display:inline-flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.75rem 2rem; font-size:0.95rem; font-weight:700; margin:0 auto; box-shadow:0 4px 14px rgba(0,86,145,0.3); border-radius:6px;">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
        ' <span>Buat Proyek Pertama</span></button>' +
        '<div style="margin-top:1rem; text-align:center; width:100%;">' +
        '<label class="btn btn-light btn-sm" style="display:inline-flex; align-items:center; justify-content:center; gap:0.4rem; padding:0.45rem 1.1rem; font-size:0.78rem; font-weight:600; cursor:pointer; color:var(--text-muted); margin:0 auto;">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>' +
        ' <span>Atau buka file database (.asca.json)</span>' +
        '<input type="file" accept=".json" style="display:none" onchange="importWorkspaceJSON(event)" /></label>' +
        '</div></div></div>';
    }
    if (activeStateEl) activeStateEl.style.display = 'none';
    return;
  }

  // Jika proyek ada, aktifkan kembali semua tab
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.disabled = false;
    btn.classList.remove('disabled');
    if (btn.dataset.originalTitle) {
      btn.setAttribute('title', btn.dataset.originalTitle);
    }
  });
  const btnPrint = document.getElementById('btnPrintReport');
  if (btnPrint) {
    btnPrint.disabled = false;
    btnPrint.classList.remove('disabled');
    btnPrint.title = 'Cetak Nota Analisa Underwriting / Simpan ke PDF';
  }
  const btnDup = document.getElementById('btnDuplicateProject');
  if (btnDup) {
    btnDup.disabled = false;
    btnDup.classList.remove('disabled');
    btnDup.title = 'Duplikasi kasus aktif untuk simulasi alternatif';
  }
  const btnExp = document.getElementById('btnExportJson');
  if (btnExp) {
    btnExp.disabled = false;
    btnExp.classList.remove('disabled');
    btnExp.title = 'Simpan seluruh database kasus ke file komputer (.asca.json)';
  }
  // Jika proyek ada, sembunyikan empty state dan tampilkan dashboard aktif
  if (emptyStateEl) emptyStateEl.style.display = 'none';
  if (activeStateEl) activeStateEl.style.display = 'block';

  const m = computeDCCSWCM(proj);

  const y1El = document.getElementById('thLabelYear1');
  const y2El = document.getElementById('thLabelYear2');
  const bYEl = document.getElementById('bannerFinYears');
  if (y1El) y1El.textContent = m.yr1;
  if (y2El) y2El.textContent = m.yr2;
  if (bYEl) bYEl.textContent = `${m.yr1} & ${m.yr2}`;

  renderBanner(proj, m);
  populateFormInputs(proj);
  renderDashboardTab(proj, m);
  renderRatiosTab(proj, m);
  renderCashFlowTab(proj, m);
  renderDCCTab(proj, m);
  renderBurnRateTab(proj, m);
  syncSlidersWithCurrentProject(proj, m);
  runStressSimulation();
  renderGradeRiskTab(proj, m);
  render5CTab(proj, m);
  renderScoreCalculationTab(proj, m);
  renderCaseStudyQATab(proj, m);
  renderPrintableReport(proj, m);
  renderGlobalGlossarySection();
  setTimeout(() => {
    enhanceGlossaryTerms();
  }, 100);
}

window.addEventListener('DOMContentLoaded', () => {
  setupCustomComboboxes();
  getUsersFromStorage();
  checkAuthAndRoute();
  initFloatingTooltip();
  initTimelineTooltip();
  renderGlobalGlossarySection();
});

window.addEventListener('load', () => {
  setupSearchProjectInputProtection();
  setupAdminUserSearchProtection();
});

// ============================================================================
// 14. AUTHENTICATION & USER MANAGEMENT MODULE (SUPABASE CLOUD SYNC)
// ============================================================================
async function fetchUsersFromCloud() {
  try {
    const data = await supabaseFetch('users?select=*');
    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map((u) => ({
        id: u.id,
        username: u.username,
        password: u.password,
        fullName: u.full_name,
        role: u.role,
        unit: u.unit,
        status: u.status,
        createdAt: u.created_at,
        lastLogin: u.last_login
      }));
      
      // Pastikan akun default admin & 1922 selalu ada sebagai jaminan fallback
      for (const def of DEFAULT_USERS) {
        if (!mapped.some(m => m.username.toLowerCase() === def.username.toLowerCase())) {
          mapped.push(def);
        }
      }

      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mapped));
      return mapped;
    }
  } catch (err) {
    console.warn('Gagal memuat pengguna dari Supabase (timeout/offline), beralih ke cache lokal:', err);
  }
  return getUsersFromStorage();
}

function getUsersFromStorage() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading users:', e);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsersToStorage(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users:', e);
  }
}

function getActiveSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading session:', e);
  }
  return null;
}

function setActiveSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } else {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }
}

// ============================================================================
// REPLACEMENT CODE FOR APP.JS
// ============================================================================

// --- REGION 1: WINDOW LOAD ---
// (Replaces window.addEventListener('load') block)
/*
window.addEventListener('load', () => {
  setupSearchProjectInputProtection();
  setupAdminUserSearchProtection();
});
*/

// --- REGION 2: CHECK AUTH & SEARCH PROTECTION ---
async function checkAuthAndRoute() {
  const session = getActiveSession();
  const loginScreen = document.getElementById('loginScreen');
  const appTopNavbar = document.getElementById('appTopNavbar');
  const appLayoutContainer = document.getElementById('appLayoutContainer');
  const adminLayoutContainer = document.getElementById('adminLayoutContainer');

  if (!session) {
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      loginScreen.removeAttribute('inert');
    }
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');
    if (uInput) uInput.disabled = false;
    if (pInput) pInput.disabled = false;
    if (appTopNavbar) appTopNavbar.style.display = 'none';
    if (appLayoutContainer) appLayoutContainer.style.display = 'none';
    if (adminLayoutContainer) adminLayoutContainer.style.display = 'none';
    return;
  }

  // When logged in, mark login screen as inert & disable credentials inputs completely
  // This prevents browser credential managers from scanning them and matching search inputs
  if (loginScreen) {
    loginScreen.style.display = 'none';
    loginScreen.setAttribute('inert', '');
  }
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput) { uInput.disabled = true; uInput.value = ''; }
  if (pInput) { pInput.disabled = true; pInput.value = ''; }

  if (session.role === 'admin') {
    if (appTopNavbar) appTopNavbar.style.display = 'none';
    if (appLayoutContainer) appLayoutContainer.style.display = 'none';
    if (adminLayoutContainer) adminLayoutContainer.style.display = 'flex';
    const adminUnameEl = document.getElementById('adminSessionUserName');
    if (adminUnameEl) adminUnameEl.textContent = session.username;

    const asi = document.getElementById('adminUserSearchInput');
    adminSearchManuallyTyped = false;
    if (asi) asi.value = '';
    const arf = document.getElementById('adminUserRoleFilter');
    if (arf) arf.value = 'ALL';
    const btnClear = document.getElementById('btnAdminClearSearch');
    if (btnClear) btnClear.style.display = 'none';

    setupAdminUserSearchProtection();
    await renderAdminUserManagement();
  } else {
    if (adminLayoutContainer) adminLayoutContainer.style.display = 'none';
    if (appTopNavbar) appTopNavbar.style.display = 'flex';
    if (appLayoutContainer) appLayoutContainer.style.display = 'grid';

    const navUserEl = document.getElementById('navUserName');
    if (navUserEl) navUserEl.textContent = session.username;
    const navRoleEl = document.getElementById('navUserRoleTag');
    if (navRoleEl) navRoleEl.textContent = session.role === 'analyst' ? 'Analis' : session.role;
    const navUnitEl = document.getElementById('navUserUnit');
    if (navUnitEl) navUnitEl.textContent = getCleanUnit(session.unit) || 'Divisi Underwriting Komersial';

    const searchInput = document.getElementById('searchProjectInput');
    projectSearchManuallyTyped = false;
    if (searchInput) searchInput.value = '';
    const btnClearSidebar = document.getElementById('btnSidebarClearSearch');
    if (btnClearSidebar) btnClearSidebar.style.display = 'none';

    setupSearchProjectInputProtection();

    loadProjectsFromStorage();
    renderAll();
    showWelcomeHub();
    // Trigger 1x saat aplikasi pertama kali dibuka
    setTimeout(() => {
      const initProj = getActiveProject();
      if (initProj) {
        triggerLiveInaprocCheck(false);
        fetchGoogleNewsForProject(false, false);
      }
    }, 300);
  }
}

let projectSearchManuallyTyped = false;

function clearProjectSearch() {
  projectSearchManuallyTyped = false;
  const si = document.getElementById('searchProjectInput');
  if (si) si.value = '';
  const btnClear = document.getElementById('btnSidebarClearSearch');
  if (btnClear) btnClear.style.display = 'none';
  renderProjectList();
}

function setupSearchProjectInputProtection() {
  const si = document.getElementById('searchProjectInput');
  if (!si) return;
  projectSearchManuallyTyped = false;
  if (si.__protectionAttached) return;
  si.__protectionAttached = true;

  si.addEventListener('keydown', (e) => {
    if ((e.key && e.key.length === 1) || e.key === 'Backspace' || e.key === 'Delete') {
      projectSearchManuallyTyped = true;
    }
  });

  const isCredentialsMatch = (val) => {
    if (!val) return false;
    const lower = val.trim().toLowerCase();
    const sess = getActiveSession();
    return (
      lower === '1922' ||
      lower === 'admin' ||
      (sess && sess.username && lower === sess.username.toLowerCase())
    );
  };

  const cleanIfAutofill = () => {
    if (projectSearchManuallyTyped) return;
    if (isCredentialsMatch(si.value)) {
      si.value = '';
      const bc = document.getElementById('btnSidebarClearSearch');
      if (bc) bc.style.display = 'none';
      renderProjectList();
    }
  };

  try {
    const originalValueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (originalValueDesc && originalValueDesc.set) {
      Object.defineProperty(si, 'value', {
        get() {
          return originalValueDesc.get.call(this);
        },
        set(val) {
          if (!projectSearchManuallyTyped && isCredentialsMatch(val)) {
            return originalValueDesc.set.call(this, '');
          }
          return originalValueDesc.set.call(this, val);
        },
        configurable: true
      });
    }
  } catch (err) {
    console.warn('Property descriptor interception not supported:', err);
  }

  ['animationstart', 'change', 'input', 'focus', 'blur', 'paste'].forEach((evt) => {
    si.addEventListener(evt, () => {
      if (!projectSearchManuallyTyped) {
        cleanIfAutofill();
      } else if (!si.value) {
        projectSearchManuallyTyped = false;
      }
    });
  });

  window.addEventListener('focus', cleanIfAutofill);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') cleanIfAutofill();
  });

  setInterval(cleanIfAutofill, 500);
  cleanIfAutofill();
}

let adminSearchManuallyTyped = false;

function setupAdminUserSearchProtection() {
  const asi = document.getElementById('adminUserSearchInput');
  if (!asi) return;
  adminSearchManuallyTyped = false;
  if (asi.__protectionAttached) return;
  asi.__protectionAttached = true;

  asi.addEventListener('keydown', (e) => {
    if ((e.key && e.key.length === 1) || e.key === 'Backspace' || e.key === 'Delete') {
      adminSearchManuallyTyped = true;
    }
  });

  const isCredentialsMatch = (val) => {
    if (!val) return false;
    const lower = val.trim().toLowerCase();
    const sess = getActiveSession();
    return (
      lower === '1922' ||
      lower === 'admin' ||
      (sess && sess.username && lower === sess.username.toLowerCase())
    );
  };

  const cleanIfAutofill = () => {
    if (adminSearchManuallyTyped) return;
    if (isCredentialsMatch(asi.value)) {
      asi.value = '';
      const bc = document.getElementById('btnAdminClearSearch');
      if (bc) bc.style.display = 'none';
      renderAdminUserManagement();
    }
  };

  try {
    const originalValueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (originalValueDesc && originalValueDesc.set) {
      Object.defineProperty(asi, 'value', {
        get() {
          return originalValueDesc.get.call(this);
        },
        set(val) {
          if (!adminSearchManuallyTyped && isCredentialsMatch(val)) {
            return originalValueDesc.set.call(this, '');
          }
          return originalValueDesc.set.call(this, val);
        },
        configurable: true
      });
    }
  } catch (err) {
    console.warn('Property descriptor interception not supported:', err);
  }

  ['animationstart', 'change', 'input', 'focus', 'blur', 'paste'].forEach((evt) => {
    asi.addEventListener(evt, () => {
      if (!adminSearchManuallyTyped) {
        cleanIfAutofill();
      } else if (!asi.value) {
        adminSearchManuallyTyped = false;
      }
    });
  });

  window.addEventListener('focus', cleanIfAutofill);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') cleanIfAutofill();
  });

  setInterval(cleanIfAutofill, 500);
  cleanIfAutofill();
}

function clearAdminUserSearch() {
  const asi = document.getElementById('adminUserSearchInput');
  adminSearchManuallyTyped = false;
  if (asi) {
    asi.value = '';
    const bc = document.getElementById('btnAdminClearSearch');
    if (bc) bc.style.display = 'none';
    renderAdminUserManagement();
  }
}

// --- SESSION CONCURRENCY & LOCK HELPERS ---
const SESSION_LOCK_TIMEOUT_MS = 90 * 1000;
let sessionHeartbeatTimer = null;

function getLocalSessionId() {
  let sId = sessionStorage.getItem('ASCA_LOCAL_SESSION_ID');
  if (!sId) {
    sId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem('ASCA_LOCAL_SESSION_ID', sId);
  }
  return sId;
}

function getCleanUnit(rawUnit) {
  if (!rawUnit) return '';
  let str = rawUnit;
  const pIdx = str.indexOf('||PROJECTS:');
  if (pIdx !== -1) str = str.substring(0, pIdx);
  const sIdx = str.indexOf('||SESS:');
  if (sIdx !== -1) str = str.substring(0, sIdx);
  return str.trim();
}

function extractProjectsPayload(rawUnit) {
  if (!rawUnit || !rawUnit.includes('||PROJECTS:')) return '';
  const afterProj = rawUnit.split('||PROJECTS:')[1];
  return afterProj.includes('||SESS:') ? afterProj.split('||SESS:')[0] : afterProj;
}

function parseSessionLock(rawUnit) {
  if (!rawUnit || !rawUnit.includes('||SESS:')) return null;
  const parts = rawUnit.split('||SESS:');
  if (parts.length < 2) return null;
  const lockData = parts[1].split(':');
  const sessionId = lockData[0];
  const timestamp = parseInt(lockData[1], 10);
  if (!sessionId || isNaN(timestamp)) return null;
  const isExpired = (Date.now() - timestamp) > SESSION_LOCK_TIMEOUT_MS;
  return { sessionId, timestamp, isExpired };
}

function buildLockedUnit(baseUnit, sessionId = null, projectsPayload = null) {
  const clean = getCleanUnit(baseUnit);
  let res = clean;
  const payload = projectsPayload !== null ? projectsPayload : currentProjectsPayload;
  if (payload) {
    res += '||PROJECTS:' + payload;
  }
  if (sessionId) {
    res += '||SESS:' + sessionId + ':' + Date.now();
  }
  return res;
}

function startSessionHeartbeat(username, cleanUnit) {
  if (sessionHeartbeatTimer) clearInterval(sessionHeartbeatTimer);
  const sId = getLocalSessionId();
  sessionHeartbeatTimer = setInterval(async () => {
    try {
      const lockedUnit = buildLockedUnit(cleanUnit, sId, currentProjectsPayload);
      await supabaseFetch('users?username=eq.' + encodeURIComponent(username), {
        method: 'PATCH',
        body: JSON.stringify({ unit: lockedUnit })
      });
    } catch (e) {
      console.warn('Session heartbeat error:', e);
    }
  }, 35000);
}

function stopSessionHeartbeat() {
  if (sessionHeartbeatTimer) {
    clearInterval(sessionHeartbeatTimer);
    sessionHeartbeatTimer = null;
  }
}

async function releaseSessionLock(username, rawUnit) {
  stopSessionHeartbeat();
  try {
    const clean = getCleanUnit(rawUnit);
    const projPayload = currentProjectsPayload || extractProjectsPayload(rawUnit);
    const finalUnit = buildLockedUnit(clean, null, projPayload);
    await supabaseFetch('users?username=eq.' + encodeURIComponent(username), {
      method: 'PATCH',
      body: JSON.stringify({ unit: finalUnit })
    });
  } catch (e) {
    console.warn('Release session lock error:', e);
  }
}

async function handleLoginSubmit(event, isForce = false) {
  if (event) event.preventDefault();
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const alertBox = document.getElementById('loginAlertBox');
  const alertMsg = document.getElementById('loginAlertMsg');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  const uname = (usernameInput ? usernameInput.value : '').trim();
  const pwd = (passwordInput ? passwordInput.value : '').trim();

  if (!uname || !pwd) {
    if (alertBox) alertBox.style.display = 'flex';
    if (alertMsg) alertMsg.textContent = 'Harap isi Username dan Kata Sandi!';
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>Memeriksa Akun...</span>';
  }

  try {
    let cloudUsers = [];
    try {
      cloudUsers = await fetchUsersFromCloud();
    } catch (e) {
      console.warn('Gagal fetch cloud, fallback ke storage:', e);
    }

    let user = cloudUsers.find((u) => u.username.toLowerCase() === uname.toLowerCase());
    if (!user) {
      const localUsers = getUsersFromStorage();
      user = localUsers.find((u) => u.username.toLowerCase() === uname.toLowerCase());
    }

    if (!user || user.password !== pwd) {
      if (alertBox) alertBox.style.display = 'flex';
      if (alertMsg) alertMsg.textContent = 'Username atau kata sandi tidak valid!';
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Masuk ke Sistem</span>';
      }
      return;
    }

    if (user.status !== 'active') {
      if (alertBox) alertBox.style.display = 'flex';
      if (alertMsg) alertMsg.textContent = 'Akun Anda dinonaktifkan oleh Administrator. Hubungi IT/Super Admin.';
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Masuk ke Sistem</span>';
      }
      return;
    }

    // Periksa apakah sedang login di sesi/perangkat lain
    const mySessionId = getLocalSessionId();
    const lock = parseSessionLock(user.unit);
    if (lock && !lock.isExpired && lock.sessionId !== mySessionId && !isForce) {
      const lastActiveSec = Math.round((Date.now() - lock.timestamp) / 1000);
      if (alertBox) alertBox.style.display = 'flex';
      if (alertMsg) {
        alertMsg.innerHTML = '<div><strong>Peringatan Akun Sedang Digunakan!</strong></div>' +
          '<div style="font-size:0.75rem; margin-top:0.2rem; opacity:0.9;">' +
          'Akun ini sedang aktif digunakan di tempat/perangkat lain (aktif ' + lastActiveSec + ' detik lalu).' +
          '</div>' +
          '<div style="margin-top:0.5rem;">' +
          '<button type="button" class="btn btn-sm btn-danger" style="font-size:0.72rem; padding:3px 8px;" onclick="handleLoginSubmit(null, true)">' +
          'Paksa Masuk & Akhiri Sesi Lain' +
          '</button>' +
          '</div>';
      }
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Masuk ke Sistem</span>';
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const cleanUnit = getCleanUnit(user.unit);
    const existingProjPayload = extractProjectsPayload(user.unit);
    currentProjectsPayload = existingProjPayload;
    const newLockedUnit = buildLockedUnit(cleanUnit, mySessionId, existingProjPayload);
    user.lastLogin = nowIso;
    user.unit = newLockedUnit;

    supabaseFetch('users?username=eq.' + encodeURIComponent(user.username), {
      method: 'PATCH',
      body: JSON.stringify({ last_login: nowIso, unit: newLockedUnit })
    }).catch((e) => console.warn('Gagal update session lock ke cloud:', e));

    startSessionHeartbeat(user.username, cleanUnit);

    const session = {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      unit: cleanUnit,
      loginAt: nowIso
    };
    setActiveSession(session);

    // Reset in-memory state agar data user sebelumnya tidak terbawa ke sesi baru
    projects = [];
    activeProjectId = null;
    currentProjectsPayload = '';
    if (cloudSaveDebounceTimer) {
      clearTimeout(cloudSaveDebounceTimer);
      cloudSaveDebounceTimer = null;
    }
    cleanStaleLegacyKeys();

    if (alertBox) alertBox.style.display = 'none';
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';

    showToast('Selamat datang, ' + user.fullName + '!');
    await checkAuthAndRoute();
    projectSearchManuallyTyped = false;
    const finalSearchInput = document.getElementById('searchProjectInput');
    if (finalSearchInput) {
      finalSearchInput.value = '';
      // finalSearchInput readonly removed
      const pbc = document.getElementById('btnSidebarClearSearch');
      if (pbc) pbc.style.display = 'none';
    }
    adminSearchManuallyTyped = false;
    const finalAdminSearch = document.getElementById('adminUserSearchInput');
    if (finalAdminSearch) {
      finalAdminSearch.value = '';
      // finalAdminSearch readonly removed
      const bc = document.getElementById('btnAdminClearSearch');
      if (bc) bc.style.display = 'none';
    }
  } catch (err) {
    console.error('Login error:', err);
    if (alertBox) alertBox.style.display = 'flex';
    if (alertMsg) alertMsg.textContent = 'Terjadi kesalahan koneksi server: ' + err.message;
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Masuk ke Sistem</span>';
    }
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    btn.title = "Sembunyikan Password";
  } else {
    input.type = "password";
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    btn.title = "Tampilkan Password";
  }
}

function openLogoutModal() {
  const modal = document.getElementById('logoutConfirmModal');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  } else {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem ASCA?')) {
      performActualLogout();
    }
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutConfirmModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function confirmLogoutAction() {
  closeLogoutModal();
  performActualLogout();
}

function logoutSession(force = false) {
  if (force) {
    performActualLogout();
    return;
  }
  openLogoutModal();
}

function performActualLogout() {
  const session = getActiveSession();
  const name = session ? session.fullName : 'Pengguna';

  try {
    if (session && session.username) {
      releaseSessionLock(session.username, session.unit);
    }
  } catch (e) {
    console.warn('Error releasing session lock:', e);
  }

  // 1. Reset state in-memory
  projects = [];
  activeProjectId = null;
  currentProjectsPayload = '';
  if (cloudSaveDebounceTimer) {
    clearTimeout(cloudSaveDebounceTimer);
    cloudSaveDebounceTimer = null;
  }
  cleanStaleLegacyKeys();
  switchTab('tab-dashboard');

  // 2. Clear session auth & temp storage
  setActiveSession(null);
  try {
    sessionStorage.clear();
    localStorage.removeItem('ASCA_ACTIVE_PROJECT_ID');
    localStorage.removeItem('ASCA_DRAFT_PROJECT');
  } catch (e) {}

  // 3. Reset form inputs di DOM agar tidak ada data input yang tersisa
  projectSearchManuallyTyped = false;
  adminSearchManuallyTyped = false;
  const allInputs = document.querySelectorAll('#appLayoutContainer input, #appLayoutContainer select, #appLayoutContainer textarea, #adminLayoutContainer input, #adminLayoutContainer select, #adminLayoutContainer textarea');
  allInputs.forEach(inp => {
    if (inp.type !== 'file' && inp.type !== 'button' && inp.type !== 'submit') {
      inp.value = '';
    }
  });
  const psi = document.getElementById('searchProjectInput');
  if (psi) {
    psi.value = '';
    // psi readonly removed
  }
  const pbc = document.getElementById('btnSidebarClearSearch');
  if (pbc) pbc.style.display = 'none';
  const bc = document.getElementById('btnAdminClearSearch');
  if (bc) bc.style.display = 'none';

  // 4. Reset Banner DOM
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt('bannerCompanyName', '-');
  setTxt('bannerFacilityType', '-');
  setTxt('bannerBankName', '-');
  setTxt('bannerSector', '-');
  setTxt('bannerPlafond', '-');
  setTxt('bannerFinYears', '-');
  setTxt('bannerUnderwriter', '-');
  setTxt('bannerScoreCircle', '0');
  setTxt('bannerDecisionText', '-');
  const decElLogout = document.getElementById('bannerDecisionText');
  if (decElLogout) decElLogout.className = 'case-decision-pill decision-pending';
  setTxt('bannerOptimalLimit', 'Rekomendasi: -');

  showToast('Sampai jumpa, ' + name + '. Sesi telah diakhiri.');
  checkAuthAndRoute();
}

let currentResetTargetUsername = null;

async function renderAdminUserManagement() {
  const users = await fetchUsersFromCloud();
  const filterRole = document.getElementById('adminUserRoleFilter')?.value || 'ALL';

  const asi = document.getElementById('adminUserSearchInput');
  if (asi && !adminSearchManuallyTyped) {
    const curVal = (asi.value || '').trim().toLowerCase();
    const sess = getActiveSession();
    if (curVal === 'admin' || curVal === '1922' || (sess && curVal === sess.username.toLowerCase())) {
      asi.value = '';
      const bc = document.getElementById('btnAdminClearSearch');
      if (bc) bc.style.display = 'none';
    }
  }

  const searchKeyword = (asi?.value || '').toLowerCase().trim();

  const total = users.length;
  const active = users.filter((u) => u.status === 'active').length;
  const analysts = users.filter((u) => u.role === 'analyst').length;
  const admins = users.filter((u) => u.role === 'admin').length;

  const stTotal = document.getElementById('statTotalUsers');
  const stActive = document.getElementById('statActiveUsers');
  const stAnalyst = document.getElementById('statAnalystUsers');
  const stAdmin = document.getElementById('statAdminUsers');
  if (stTotal) stTotal.textContent = total;
  if (stActive) stActive.textContent = active;
  if (stAnalyst) stAnalyst.textContent = analysts;
  if (stAdmin) stAdmin.textContent = admins;

  const filtered = users.filter((u) => {
    if (filterRole !== 'ALL' && u.role !== filterRole) return false;
    if (searchKeyword) {
      const match =
        u.username.toLowerCase().includes(searchKeyword) ||
        u.fullName.toLowerCase().includes(searchKeyword) ||
        (u.unit && u.unit.toLowerCase().includes(searchKeyword));
      if (!match) return false;
    }
    return true;
  });

  const tbody = document.getElementById('adminUserTableBody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Tidak ditemukan pengguna yang sesuai dengan pencarian atau filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((u, idx) => {
    const isMainAdmin = u.username.toLowerCase() === 'admin';
    const roleBadge = u.role === 'admin'
      ? '<span class="badge-role-admin">Super Admin</span>'
      : '<span class="badge-role-analyst">Analis Kredit</span>';
    const statusBadge = u.status === 'active'
      ? '<span class="badge-status-active">&bull; Aktif</span>'
      : '<span class="badge-status-inactive">&cir; Non-Aktif</span>';

    let lastLoginStr = 'Belum pernah login';
    if (u.lastLogin) {
      const d = new Date(u.lastLogin);
      lastLoginStr = d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong style="color:var(--askrindo-navy); font-size:0.85rem;">${u.username}</strong>
        </td>
        <td><strong>${u.fullName}</strong></td>
        <td><span style="color:var(--text-muted); font-size:0.75rem;">${getCleanUnit(u.unit) || '-'}</span></td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td style="font-size:0.74rem; color:var(--text-muted);">${lastLoginStr}</td>
        <td>
          <div class="admin-actions" style="justify-content:center;">
            <button class="btn btn-sm btn-primary" onclick="openModalEditUser('${u.username}')" style="background:#005691; border-color:#005691; color:#fff;" title="Edit Data Pengguna">
              Edit
            </button>
            <button class="btn btn-sm btn-outline" onclick="openModalResetPassword('${u.username}')" title="Reset Kata Sandi">
              Reset
            </button>
            ${!isMainAdmin ? `
              <button class="btn btn-sm ${u.status === 'active' ? 'btn-outline' : 'btn-primary'}" onclick="toggleUserStatus('${u.username}')" title="${u.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}">
                ${u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser('${u.username}')" title="Hapus Pengguna">
                Hapus
              </button>
            ` : `
              <span style="font-size:0.68rem; color:var(--text-muted); font-style:italic; padding:0 0.3rem;">(Akun Utama)</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminUserTable() {
  const asi = document.getElementById('adminUserSearchInput');
  if (!asi) return;

  // Proteksi autofill browser saat refresh / transisi
  if (!adminSearchManuallyTyped) {
    const sess = getActiveSession();
    const val = (asi.value || '').trim().toLowerCase();
    if (val === 'admin' || val === '1922' || (sess && val === sess.username.toLowerCase())) {
      asi.value = '';
      const bc = document.getElementById('btnAdminClearSearch');
      if (bc) bc.style.display = 'none';
      renderAdminUserManagement();
      return;
    }
  }

  const bc = document.getElementById('btnAdminClearSearch');
  if (bc) {
    bc.style.display = asi.value ? 'block' : 'none';
  }
  renderAdminUserManagement();
}

function openModalAddUser() {
  const un = document.getElementById('adminNewUsername');
  const fn = document.getElementById('adminNewFullName');
  const ut = document.getElementById('adminNewUnit');
  const rl = document.getElementById('adminNewRole');
  const pw = document.getElementById('adminNewPassword');
  const st = document.getElementById('adminNewStatus');

  if (un) un.value = '';
  if (fn) fn.value = '';
  if (ut) ut.value = 'Divisi Underwriting Komersial';
  if (rl) rl.value = 'analyst';
  if (pw) pw.value = '';
  if (st) st.value = 'active';

  const modal = document.getElementById('modalAddUser');
  if (modal) modal.classList.add('open');
}

function closeModalAddUser() {
  const modal = document.getElementById('modalAddUser');
  if (modal) modal.classList.remove('open');
}

async function saveNewUserFromModal() {
  const uname = (document.getElementById('adminNewUsername')?.value || '').trim();
  const fullName = (document.getElementById('adminNewFullName')?.value || '').trim();
  const unit = (document.getElementById('adminNewUnit')?.value || '').trim();
  const role = document.getElementById('adminNewRole')?.value || 'analyst';
  const pwd = (document.getElementById('adminNewPassword')?.value || '').trim();
  const status = document.getElementById('adminNewStatus')?.value || 'active';

  if (!uname || !fullName || !pwd) {
    alert('Harap lengkapi Username, Nama Lengkap, dan Password!');
    return;
  }

  let users = getUsersFromStorage();
  if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase())) {
    alert(`Username "${uname}" sudah terdaftar! Gunakan username lain.`);
    return;
  }

  const newUserObj = {
    username: uname,
    password: pwd,
    full_name: fullName,
    unit: unit,
    role: role,
    status: status
  };

  try {
    // Simpan langsung ke Supabase Cloud
    await supabaseFetch('users', {
      method: 'POST',
      body: JSON.stringify(newUserObj)
    });

    closeModalAddUser();
    await renderAdminUserManagement();
    showToast(`Pengguna baru "${uname}" berhasil disimpan ke server Supabase! Siap login di device mana pun.`);
  } catch (err) {
    alert('Gagal menyimpan ke server Supabase: ' + err.message);
  }
}

async function openModalEditUser(username) {
  let user = null;
  try {
    const cloudUsers = await fetchUsersFromCloud();
    user = cloudUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  } catch (e) {
    console.warn('Gagal fetch cloud saat buka modal edit user:', e);
  }
  if (!user) {
    const localUsers = getUsersFromStorage();
    user = localUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  }
  if (!user) {
    alert('Data pengguna tidak ditemukan!');
    return;
  }

  const isMainAdmin = user.username.toLowerCase() === 'admin';

  const origInput = document.getElementById('adminEditOriginalUsername');
  if (origInput) origInput.value = user.username;
  const idInput = document.getElementById('adminEditUserId');
  if (idInput) idInput.value = user.id || '';

  const unInput = document.getElementById('adminEditUsername');
  if (unInput) {
    unInput.value = user.username;
    unInput.disabled = isMainAdmin;
  }

  const roleSelect = document.getElementById('adminEditRole');
  if (roleSelect) {
    roleSelect.value = user.role || 'analyst';
    roleSelect.disabled = isMainAdmin;
  }

  const fnInput = document.getElementById('adminEditFullName');
  if (fnInput) fnInput.value = user.fullName || '';

  const unitInput = document.getElementById('adminEditUnit');
  if (unitInput) unitInput.value = getCleanUnit(user.unit) || '';

  const stSelect = document.getElementById('adminEditStatus');
  if (stSelect) {
    stSelect.value = user.status || 'active';
    stSelect.disabled = isMainAdmin;
  }

  const noteEl = document.getElementById('adminEditMainAdminNote');
  if (noteEl) {
    noteEl.style.display = isMainAdmin ? 'block' : 'none';
  }

  const modal = document.getElementById('modalEditUser');
  if (modal) modal.classList.add('open');
}

function closeModalEditUser() {
  const modal = document.getElementById('modalEditUser');
  if (modal) modal.classList.remove('open');
}

async function saveEditUserFromModal() {
  const origUname = (document.getElementById('adminEditOriginalUsername')?.value || '').trim();
  const userId = (document.getElementById('adminEditUserId')?.value || '').trim();
  const isMainAdmin = origUname.toLowerCase() === 'admin';

  const newUname = isMainAdmin ? 'admin' : (document.getElementById('adminEditUsername')?.value || '').trim();
  const newFullName = (document.getElementById('adminEditFullName')?.value || '').trim();
  const newUnit = (document.getElementById('adminEditUnit')?.value || '').trim();
  const newRole = isMainAdmin ? 'admin' : (document.getElementById('adminEditRole')?.value || 'analyst');
  const newStatus = isMainAdmin ? 'active' : (document.getElementById('adminEditStatus')?.value || 'active');

  if (!newUname || !newFullName) {
    alert('Harap lengkapi Username dan Nama Lengkap!');
    return;
  }

  const allUsers = getUsersFromStorage();
  // Validasi duplikasi username bila diubah
  if (newUname.toLowerCase() !== origUname.toLowerCase()) {
    if (allUsers.some(u => u.username.toLowerCase() === newUname.toLowerCase() && u.username.toLowerCase() !== origUname.toLowerCase())) {
      alert(`Username "${newUname}" sudah digunakan oleh pengguna lain! Harap pilih username unik.`);
      return;
    }
  }

  const targetUser = allUsers.find(u => u.username.toLowerCase() === origUname.toLowerCase());
  const rawUnit = targetUser?.unit || '';
  const projPayload = extractProjectsPayload(rawUnit);
  const sessLock = rawUnit.includes('||SESS:') ? '||SESS:' + rawUnit.split('||SESS:')[1] : '';
  const finalUnit = newUnit + (projPayload ? '||PROJECTS:' + projPayload : '') + sessLock;

  const patchBody = {
    username: newUname,
    full_name: newFullName,
    unit: finalUnit,
    role: newRole,
    status: newStatus
  };

  try {
    if (userId) {
      await supabaseFetch(`users?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify(patchBody)
      });
    } else {
      await supabaseFetch(`users?username=eq.${encodeURIComponent(origUname)}`, {
        method: 'PATCH',
        body: JSON.stringify(patchBody)
      });
    }
  } catch (err) {
    console.warn('Gagal sinkronisasi update ke Supabase cloud (mungkin offline), data lokal tetap diperbarui:', err);
  }

  // Migrasikan workspace project lokal bila username diubah
  if (newUname.toLowerCase() !== origUname.toLowerCase()) {
    const oldKey = USER_PROJECTS_KEY_PREFIX + origUname;
    const newKey = USER_PROJECTS_KEY_PREFIX + newUname;
    const oldProjects = localStorage.getItem(oldKey);
    if (oldProjects) {
      localStorage.setItem(newKey, oldProjects);
      localStorage.removeItem(oldKey);
    }
  }

  // Sinkronkan session saat ini jika mengedit akun sendiri
  const currentSession = getActiveSession();
  if (currentSession && currentSession.username.toLowerCase() === origUname.toLowerCase()) {
    currentSession.username = newUname;
    currentSession.fullName = newFullName;
    currentSession.unit = newUnit;
    currentSession.role = newRole;
    setActiveSession(currentSession);

    const navUserEl = document.getElementById('navUserName');
    if (navUserEl) navUserEl.textContent = newUname;
    const navUnitEl = document.getElementById('navUserUnit');
    if (navUnitEl) navUnitEl.textContent = getCleanUnit(newUnit) || 'Divisi Underwriting Komersial';
    const adminUnameEl = document.getElementById('adminSessionUserName');
    if (adminUnameEl) adminUnameEl.textContent = newUname;
  }

  // Perbarui cache localStorage pengguna
  const localUsers = getUsersFromStorage();
  const lIdx = localUsers.findIndex(u => u.username.toLowerCase() === origUname.toLowerCase());
  if (lIdx !== -1) {
    localUsers[lIdx].username = newUname;
    localUsers[lIdx].fullName = newFullName;
    localUsers[lIdx].unit = finalUnit;
    localUsers[lIdx].role = newRole;
    localUsers[lIdx].status = newStatus;
    saveUsersToStorage(localUsers);
  }

  closeModalEditUser();
  await renderAdminUserManagement();
  showToast(`Data pengguna "${newUname}" berhasil diperbarui!`);
}

function openModalResetPassword(username) {
  currentResetTargetUsername = username;
  const targetEl = document.getElementById('resetTargetUsername');
  if (targetEl) targetEl.textContent = username;
  const pw1 = document.getElementById('adminResetNewPassword');
  const pw2 = document.getElementById('adminResetConfirmPassword');
  if (pw1) pw1.value = '';
  if (pw2) pw2.value = '';

  const modal = document.getElementById('modalResetPassword');
  if (modal) modal.classList.add('open');
}

function closeModalResetPassword() {
  currentResetTargetUsername = null;
  const modal = document.getElementById('modalResetPassword');
  if (modal) modal.classList.remove('open');
}

async function saveResetPasswordFromModal() {
  if (!currentResetTargetUsername) return;
  const newPwd = (document.getElementById('adminResetNewPassword')?.value || '').trim();
  const confirmPwd = (document.getElementById('adminResetConfirmPassword')?.value || '').trim();

  if (!newPwd) {
    alert('Password baru tidak boleh kosong!');
    return;
  }
  if (newPwd !== confirmPwd) {
    alert('Konfirmasi password tidak cocok dengan password baru!');
    return;
  }

  try {
    await supabaseFetch(`users?username=eq.${encodeURIComponent(currentResetTargetUsername)}`, {
      method: 'PATCH',
      body: JSON.stringify({ password: newPwd })
    });

    closeModalResetPassword();
    await renderAdminUserManagement();
    showToast(`Password akun "${currentResetTargetUsername}" berhasil direset di server!`);
  } catch (err) {
    alert('Gagal mereset password di server: ' + err.message);
  }
}

async function toggleUserStatus(username) {
  const users = getUsersFromStorage();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return;
  if (user.username.toLowerCase() === 'admin') {
    alert('AkunSuper Admin utama tidak boleh dinonaktifkan!');
    return;
  }

  const nextStatus = user.status === 'active' ? 'inactive' : 'active';
  try {
    await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });
    await renderAdminUserManagement();
    showToast(`Status akun "${username}" diubah menjadi: ${nextStatus.toUpperCase()}`);
  } catch (err) {
    alert('Gagal memperbarui status akun: ' + err.message);
  }
}

async function confirmDeleteUser(username) {
  if (username.toLowerCase() === 'admin') {
    alert('AkunSuper Admin utama tidak boleh dihapus!');
    return;
  }
  if (!confirm(`Apakah Anda yakin ingin menghapus akun pengguna "${username}" secara permanen dari server cloud?`)) {
    return;
  }

  try {
    await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });
    try {
      await supabaseFetch(`user_projects?username=eq.${encodeURIComponent(username)}`, {
        method: 'DELETE'
      });
    } catch (pe) {}
    localStorage.removeItem(USER_PROJECTS_KEY_PREFIX + username);
    await renderAdminUserManagement();
    showToast(`Pengguna "${username}" telah dihapus dari server cloud.`);
  } catch (err) {
    alert('Gagal menghapus pengguna dari server: ' + err.message);
  }
}

// ============================================================================
// 14. PENGATURAN AKUN PENGGUNA & GANTI KATA SANDI MANDIRI
// ============================================================================
function toggleUserDropdownMenu(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const menu = document.getElementById('userDropdownMenu');
  const btn = document.getElementById('navUserSessionPill');
  const caret = document.getElementById('userMenuCaret');
  if (!menu) return;

  const isOpen = menu.style.display === 'block';
  if (isOpen) {
    closeUserDropdownMenu();
  } else {
    const sess = getActiveSession();
    const fullNameEl = document.getElementById('dropdownUserFullName');
    const unameEl = document.getElementById('dropdownUsername');
    const unitEl = document.getElementById('dropdownUserUnit');
    const adminLink = document.getElementById('dropdownAdminLinkContainer');

    if (fullNameEl) fullNameEl.textContent = sess?.fullName || sess?.username || 'Pengguna ASCA';
    if (unameEl) unameEl.textContent = sess?.username || '-';
    if (unitEl) unitEl.textContent = getCleanUnit(sess?.unit) || 'Divisi Underwriting Komersial';
    if (adminLink) adminLink.style.display = sess?.role === 'admin' ? 'block' : 'none';

    menu.style.display = 'block';
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (caret) caret.style.transform = 'rotate(180deg)';
  }
}

function closeUserDropdownMenu() {
  const menu = document.getElementById('userDropdownMenu');
  const btn = document.getElementById('navUserSessionPill');
  const caret = document.getElementById('userMenuCaret');
  if (menu) menu.style.display = 'none';
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (caret) caret.style.transform = 'rotate(0deg)';
}

function switchToAdminConsole() {
  closeUserDropdownMenu();
  const appTopNavbar = document.getElementById('appTopNavbar');
  const appLayoutContainer = document.getElementById('appLayoutContainer');
  const adminLayoutContainer = document.getElementById('adminLayoutContainer');
  if (appTopNavbar) appTopNavbar.style.display = 'none';
  if (appLayoutContainer) appLayoutContainer.style.display = 'none';
  if (adminLayoutContainer) adminLayoutContainer.style.display = 'flex';
  renderAdminUserManagement();
}

// Tutup dropdown menu bila user klik di luar area profil
document.addEventListener('click', function(e) {
  const wrapper = document.getElementById('userMenuWrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    closeUserDropdownMenu();
  }
});

function openUserSettingsModal() {
  closeUserDropdownMenu();
  const modal = document.getElementById('modalUserSettings');
  if (!modal) return;

  // Reset form inputs & password masking
  const curInp = document.getElementById('inp_currentPassword');
  const newInp = document.getElementById('inp_newPassword');
  const cnfInp = document.getElementById('inp_confirmNewPassword');
  if (curInp) { curInp.value = ''; curInp.type = 'password'; }
  if (newInp) { newInp.value = ''; newInp.type = 'password'; }
  if (cnfInp) { cnfInp.value = ''; cnfInp.type = 'password'; }

  // Reset toggle buttons to default eye icon
  modal.querySelectorAll('.login-toggle-pwd').forEach(btn => {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    btn.title = 'Tampilkan Password';
  });

  const alertBox = document.getElementById('settingsAlertBox');
  if (alertBox) alertBox.style.display = 'none';

  const sess = getActiveSession();
  const fName = document.getElementById('settingsFullNameDisplay');
  const uName = document.getElementById('settingsUsernameDisplay');
  const uUnit = document.getElementById('settingsUnitDisplay');
  const rBadge = document.getElementById('settingsRoleBadge');

  if (fName) fName.textContent = sess?.fullName || sess?.username || 'Analis Kredit';
  if (uName) uName.textContent = sess?.username || '-';
  if (uUnit) uUnit.textContent = getCleanUnit(sess?.unit) || 'Divisi Underwriting Komersial';
  if (rBadge) rBadge.textContent = sess?.role === 'analyst' ? 'Analis' : (sess?.role || 'User');

  modal.classList.add('open');
}

function closeUserSettingsModal() {
  const modal = document.getElementById('modalUserSettings');
  if (modal) modal.classList.remove('open');
}

async function handleSelfPasswordSubmit(event) {
  if (event) event.preventDefault();
  const sess = getActiveSession();
  if (!sess || !sess.username) {
    showToast('Sesi Anda telah berakhir, silakan login kembali.');
    return;
  }

  const curInp = document.getElementById('inp_currentPassword');
  const newInp = document.getElementById('inp_newPassword');
  const cnfInp = document.getElementById('inp_confirmNewPassword');
  const alertBox = document.getElementById('settingsAlertBox');
  const alertMsg = document.getElementById('settingsAlertMsg');
  const btnSave = document.getElementById('btnSaveSelfPassword');

  const curPwd = (curInp?.value || '').trim();
  const newPwd = (newInp?.value || '').trim();
  const cnfPwd = (cnfInp?.value || '').trim();

  const showErr = (msg) => {
    if (alertBox && alertMsg) {
      alertBox.style.display = 'flex';
      alertMsg.textContent = msg;
    }
  };

  if (!curPwd) {
    showErr('Harap masukkan password awal / saat ini!');
    if (curInp) curInp.focus();
    return;
  }
  if (!newPwd) {
    showErr('Password baru tidak boleh kosong!');
    if (newInp) newInp.focus();
    return;
  }
  if (newPwd.length < 4) {
    showErr('Password baru minimal 4 karakter!');
    if (newInp) newInp.focus();
    return;
  }
  if (newPwd !== cnfPwd) {
    showErr('Konfirmasi password tidak cocok dengan password baru!');
    if (cnfInp) cnfInp.focus();
    return;
  }
  if (newPwd === curPwd) {
    showErr('Password baru tidak boleh sama dengan password awal / lama!');
    if (newInp) newInp.focus();
    return;
  }

  if (alertBox) alertBox.style.display = 'none';
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<span>Memverifikasi &amp; Menyimpan...</span>';
  }

  try {
    // 1. Verifikasi kecocokan password awal/saat ini
    let userRecord = null;
    try {
      const res = await supabaseFetch(`users?username=eq.${encodeURIComponent(sess.username)}&select=*`);
      if (Array.isArray(res) && res.length > 0) {
        userRecord = res[0];
      }
    } catch (e) {
      console.warn('Gagal fetch user dari cloud, gunakan data lokal:', e);
    }

    if (!userRecord) {
      const localUsers = getUsersFromStorage();
      userRecord = localUsers.find(u => u.username.toLowerCase() === sess.username.toLowerCase());
    }

    if (!userRecord || String(userRecord.password) !== curPwd) {
      showErr('Password awal / saat ini yang Anda masukkan salah!');
      if (curInp) {
        curInp.focus();
        curInp.select();
      }
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = '<span>Simpan Kata Sandi</span>';
      }
      return;
    }

    // 2. Simpan kata sandi baru ke Supabase Cloud
    let cloudSaved = false;
    try {
      await supabaseFetch(`users?username=eq.${encodeURIComponent(sess.username)}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPwd })
      });
      cloudSaved = true;
    } catch (errCloud) {
      console.warn('Simpan password ke Supabase cloud gagal/offline, update lokal cache:', errCloud);
    }

    // 3. Simpan kata sandi baru ke Local Storage Users
    const localUsers = getUsersFromStorage();
    const idx = localUsers.findIndex(u => u.username.toLowerCase() === sess.username.toLowerCase());
    if (idx !== -1) {
      localUsers[idx].password = newPwd;
      saveUsersToStorage(localUsers);
    }

    closeUserSettingsModal();
    showToast(`Kata sandi akun "${sess.username}" berhasil diperbarui.`);
  } catch (err) {
    showErr('Gagal memperbarui kata sandi: ' + err.message);
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span>Simpan Kata Sandi</span>
      `;
    }
  }
}

// ============================================================================
// MODUL AI FINANCIAL STATEMENT SCANNER (GEMINI MULTIMODAL VISION OCR)
// ============================================================================
const BUILTIN_GEMINI_API_KEY = (function() {
  try {
    return atob('QVEuQWI4Uk42STE0WTRhNkZkRzduNFZjdzZSWWRJMjVuZGg5bXhnUTYwOGhqMTUxbFFOMEE=');
  } catch (e) {
    return '';
  }
})();

function getActiveGeminiApiKey() {
  const custom = (localStorage.getItem('gemini_api_key') || '').trim();
  return custom || BUILTIN_GEMINI_API_KEY;
}

let selectedAiFinFiles = [];
let currentExtractedFinData = null;

function openAiFinUploadModal() {
  const proj = getActiveProject();
  const y1 = proj?.year1 || parseInt(document.getElementById('inp_year1')?.value, 10) || 2022;
  const y2 = proj?.year2 || parseInt(document.getElementById('inp_year2')?.value, 10) || 2023;

  const y1Inp = document.getElementById('aiOcrYear1');
  const y2Inp = document.getElementById('aiOcrYear2');
  if (y1Inp) y1Inp.value = y1;
  if (y2Inp) y2Inp.value = y2;

  resetAiFinUploadState();

  const modal = document.getElementById('modalAiFinExtractor');
  if (modal) modal.classList.add('open');
}

function closeAiFinUploadModal() {
  const modal = document.getElementById('modalAiFinExtractor');
  if (modal) modal.classList.remove('open');
}

// Support ESC key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modalAiFinExtractor');
    if (modal && modal.classList.contains('open')) {
      closeAiFinUploadModal();
    }
  }
});

function resetAiFinUploadState() {
  selectedAiFinFiles = [];
  currentExtractedFinData = null;

  const fileInput = document.getElementById('aiOcrFileInput');
  if (fileInput) fileInput.value = '';

  renderSelectedFilesList();

  const uploadSec = document.getElementById('aiOcrUploadSection');
  const loadingSec = document.getElementById('aiOcrLoadingSection');
  const reviewSec = document.getElementById('aiOcrReviewSection');

  if (uploadSec) uploadSec.style.display = 'block';
  if (loadingSec) loadingSec.style.display = 'none';
  if (reviewSec) {
    reviewSec.style.display = 'none';
    reviewSec.innerHTML = '';
  }
}

function handleAiFinFileSelect(event) {
  const files = Array.from(event.target?.files || []);
  if (!files.length) return;

  const maxMb = 25;
  for (const file of files) {
    if (file.size > maxMb * 1024 * 1024) {
      alert(`Berkas "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas 25 MB.`);
      continue;
    }
    // Cegah duplikasi file
    if (!selectedAiFinFiles.some((f) => f.name === file.name && f.size === file.size)) {
      selectedAiFinFiles.push(file);
    }
  }

  // Reset input agar user bisa memilih file lagi jika ingin menambah
  if (event.target) event.target.value = '';

  renderSelectedFilesList();
}

function removeAiFinFile(idx) {
  selectedAiFinFiles.splice(idx, 1);
  renderSelectedFilesList();
}

function renderSelectedFilesList() {
  const infoEl = document.getElementById('aiOcrSelectedFileInfo');
  const btnStart = document.getElementById('btnStartAiExtraction');
  if (!infoEl) return;

  if (selectedAiFinFiles.length === 0) {
    infoEl.style.display = 'none';
    infoEl.innerHTML = '';
    if (btnStart) btnStart.disabled = true;
    return;
  }

  let totalBytes = 0;
  const itemsHtml = selectedAiFinFiles.map((file, idx) => {
    totalBytes += file.size;
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const icon = isPdf ? '📕' : '🖼️';
    const szStr = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #bae6fd; border-radius:6px; padding:5px 10px; font-size:0.75rem; margin-bottom:4px;">
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
          <span style="font-size:1.1rem;">${icon}</span>
          <span style="font-weight:700; color:#0369a1; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:420px;" title="${file.name}">${file.name}</span>
          <span style="color:#64748b; font-size:0.7rem;">(${szStr})</span>
        </div>
        <button type="button" onclick="event.stopPropagation(); removeAiFinFile(${idx})" style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; font-weight:700; cursor:pointer; font-size:0.85rem; border-radius:4px; padding:1px 6px; line-height:1;" title="Hapus berkas ini">&times;</button>
      </div>
    `;
  }).join('');

  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
  infoEl.style.display = 'block';
  infoEl.innerHTML = `
    <div style="font-weight:700; font-size:0.75rem; color:#0369a1; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
      <span>📂 <strong>${selectedAiFinFiles.length} Berkas Dipilih</strong> (Total: ${totalMb} MB)</span>
      <span style="font-size:0.7rem; color:#15803d; font-weight:700;">&#10003; Siap Diproses Sekaligus</span>
    </div>
    ${itemsHtml}
    <div style="margin-top:6px; text-align:right;">
      <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation(); document.getElementById('aiOcrFileInput').click()" style="font-size:0.68rem; padding:2px 8px;">
        + Tambah Berkas Lain
      </button>
    </div>
  `;

  if (btnStart) btnStart.disabled = false;
}

// Drag & drop handlers
document.addEventListener('DOMContentLoaded', () => {
  setupAiOcrDragDrop();
});

function setupAiOcrDragDrop() {
  const dropzone = document.getElementById('aiOcrDropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.background = '#e0f2fe';
      dropzone.style.borderColor = '#0284c7';
    }, false);
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.background = '#f0f9ff';
      dropzone.style.borderColor = '#93c5fd';
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files || []);
    if (files.length) {
      handleAiFinFileSelect({ target: { files } });
    }
  }, false);
}

async function runGeminiFinExtraction() {
  const apiKey = getActiveGeminiApiKey();
  if (!apiKey) {
    alert('Google Gemini API Key belum terkonfigurasi pada sistem.');
    return;
  }

  if (!selectedAiFinFiles || selectedAiFinFiles.length === 0) {
    alert('Silakan pilih minimal 1 berkas dokumen Laporan Keuangan (PDF atau Gambar) terlebih dahulu.');
    return;
  }

  const uploadSec = document.getElementById('aiOcrUploadSection');
  const loadingSec = document.getElementById('aiOcrLoadingSection');
  const statusEl = document.getElementById('aiOcrLoadingStatus');
  const subEl = document.getElementById('aiOcrLoadingSub');

  if (uploadSec) uploadSec.style.display = 'none';
  if (loadingSec) loadingSec.style.display = 'block';

  const updateStatus = (text, sub = '') => {
    if (statusEl) statusEl.textContent = text;
    if (subEl) subEl.textContent = sub;
  };

  try {
    const targetYr1 = parseInt(document.getElementById('aiOcrYear1')?.value, 10) || 2022;
    const targetYr2 = parseInt(document.getElementById('aiOcrYear2')?.value, 10) || 2023;

    const parts = [];

    for (let i = 0; i < selectedAiFinFiles.length; i++) {
      const file = selectedAiFinFiles[i];
      updateStatus(`1. Membaca berkas ${i + 1} dari ${selectedAiFinFiles.length}...`, `Mengonversi "${file.name}" ke format transmisi aman.`);

      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error(`Gagal membaca berkas: ${file.name}`));
        reader.readAsDataURL(file);
      });

      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const mimeType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    updateStatus(`2. Mengirim ${selectedAiFinFiles.length} dokumen ke AI...`, 'AI sedang menganalisis gabungan halaman Neraca (Aktiva & Passiva) serta Laporan Laba Rugi.');

    const promptText = `Anda adalah seorang auditor independen & analis kredit senior PT Askrindo.
Tugas Anda adalah membaca Laporan Keuangan audited / in-house dari seluruh dokumen yang dilampirkan (${selectedAiFinFiles.length} berkas).
Dokumen terlampir dapat terdiri dari beberapa berkas terpisah (misal: berkas Neraca dan berkas Laba Rugi terpisah, atau tahun buku yang berbeda).
Analisis seluruh berkas yang dilampirkan secara komprehensif untuk mengekstrak 2 tahun buku terakhir.
Prioritaskan pencocokan pada periode tahun ${targetYr1} dan ${targetYr2}. Jika tidak tertera persis, gunakan 2 tahun buku terbaru yang tercantum di dokumen.

ATURAN EKSTRAKSI PENTING:
1. Seluruh nilai nominal harus dalam angka bulat murni mata uang Rupiah (integer atau float, hilangkan simbol "Rp", koma/titik ribuan). Contoh: 21352397620.
2. Perhatikan satuan penyajian! Jika dokumen mencantumkan "dalam jutaan Rupiah" atau "in millions", kalikan seluruh angka dengan 1.000.000. Jika "dalam ribuan", kalikan dengan 1.000.
3. Pos yang bernilai kurung (minus/rugi) seperti Laba Bersih yang Rugi atau Akumulasi Rugi harus bertanda negatif (-).
4. Petakan secara presisi ke dalam struktur JSON berikut:

{
  "company_name": "Nama PT / Debitur di dokumen (jika tertera)",
  "year1": ${targetYr1},
  "year2": ${targetYr2},
  "data_year1": {
    "cash": 0,
    "otherCa": 0,
    "ar": 0,
    "inv": 0,
    "otherAr": 0,
    "prepaid": 0,
    "fa": 0,
    "depr": 0,
    "invest": 0,
    "taxAsset": 0,
    "ap": 0,
    "stDebt": 0,
    "otherAp": 0,
    "accrued": 0,
    "ltDebt": 0,
    "capital": 0,
    "otherCap": 0,
    "retEarn": 0,
    "re": 0,
    "rev": 0,
    "cogs": 0,
    "opex": 0,
    "otherInc": 0,
    "otherExp": 0,
    "intExp": 0,
    "tax": 0,
    "div": 0
  },
  "data_year2": {
    "cash": 0,
    "otherCa": 0,
    "ar": 0,
    "inv": 0,
    "otherAr": 0,
    "prepaid": 0,
    "fa": 0,
    "depr": 0,
    "invest": 0,
    "taxAsset": 0,
    "ap": 0,
    "stDebt": 0,
    "otherAp": 0,
    "accrued": 0,
    "ltDebt": 0,
    "capital": 0,
    "otherCap": 0,
    "retEarn": 0,
    "re": 0,
    "rev": 0,
    "cogs": 0,
    "opex": 0,
    "otherInc": 0,
    "otherExp": 0,
    "intExp": 0,
    "tax": 0,
    "div": 0
  }
}

Kamus Pemetaan Akun ASCA:
- cash: Kas dan Setara Kas / Bank
- otherCa: Uang Jaminan / Aset Lancar Lainnya
- ar: Piutang Usaha / Piutang Dagang (Trade Accounts Receivable)
- inv: Persediaan (Inventory)
- otherAr: Piutang Lain-lain
- prepaid: Biaya Dibayar Dimuka / Uang Muka Pajak / Pekerjaan dlm Proses
- fa: Aset Tetap (Fixed Assets)
- depr: Akumulasi Penyusutan (jika dipisah, atau 0 jika Aset Tetap sudah Net)
- invest: Investasi Saham / Investasi Jangka Panjang
- taxAsset: Tagihan Pajak / Aset Pajak Tangguhan / Aset Tidak Lancar Lainnya
- ap: Utang Usaha / Utang Dagang (Trade Accounts Payable)
- stDebt: Utang Bank Jangka Pendek
- otherAp: Utang Lain-lain / Liabilitas Lancar Lainnya
- accrued: Beban Akrual / Biaya YMH Dibayar
- ltDebt: Utang Bank Jangka Panjang
- capital: Modal Saham / Modal Disetor
- otherCap: Tambahan Modal Disetor / Agio Saham / Modal Lainnya
- retEarn: Saldo Laba Ditahan (Retained Earnings) periode lalu
- re: Laba (Rugi) Bersih Tahun Berjalan
- rev: Pendapatan Usaha Netto / Penjualan Bersih
- cogs: Beban Pokok Penjualan / Harga Pokok Produksi (HPP)
- opex: Beban Operasional / Beban Usaha / Beban Umum & Administrasi
- otherInc: Pendapatan Lain-lain
- otherExp: Beban Lain-lain
- intExp: Biaya Bunga / Keuangan
- tax: Beban Pajak Penghasilan
- div: Dividen

Balas HANYA format JSON valid tanpa tanda kutip markdown (\`\`\`json) atau teks pengantar apapun.`;

    parts.push({
      text: promptText
    });

    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let lastError = null;
    let rawText = '';

    for (const modelName of modelsToTry) {
      try {
        updateStatus('3. Memproses analisa data Laporan Keuangan yang telah diupload', `Mengekstrak tabel dan angka finansial dari ${selectedAiFinFiles.length} berkas dokumen...`);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: parts
              }
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json'
            }
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errBody}`);
        }

        const resData = await response.json();
        rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) break; // Berhasil!
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} gagal:`, err);
      }
    }

    if (!rawText) {
      throw lastError || new Error('Tidak ada respon teks yang diterima dari Gemini API.');
    }

    updateStatus('4. Menyusun pratinjau verifikasi...', 'Memvalidasi keseimbangan Neraca & Laba Rugi.');

    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    currentExtractedFinData = parsed;
    renderAiFinReviewTable(parsed);

  } catch (err) {
    console.error('Error ekstraksi AI:', err);
    if (loadingSec) loadingSec.style.display = 'none';
    if (uploadSec) uploadSec.style.display = 'block';

    let msg = err.message || 'Terjadi kesalahan saat memproses dokumen.';
    if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('401')) {
      msg = 'Gemini API Key tidak valid. Mohon periksa kembali API Key Anda dari Google AI Studio.';
    } else if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      msg = 'Batas kuota gratis Gemini API tercapai sementara. Silakan tunggu beberapa detik dan coba lagi.';
    }

    alert('Gagal mengekstrak Laporan Keuangan:\n\n' + msg);
  }
}

function renderAiFinReviewTable(data) {
  const loadingSec = document.getElementById('aiOcrLoadingSection');
  const reviewSec = document.getElementById('aiOcrReviewSection');

  if (loadingSec) loadingSec.style.display = 'none';
  if (!reviewSec) return;
  reviewSec.style.display = 'block';

  const y1 = data.year1 || 2022;
  const y2 = data.year2 || 2023;
  const d1 = data.data_year1 || {};
  const d2 = data.data_year2 || {};

  // Hitung total aset & liabilitas+ekuitas untuk check balance
  const calcAct1 = (d1.cash||0) + (d1.otherCa||0) + (d1.ar||0) + (d1.inv||0) + (d1.otherAr||0) + (d1.prepaid||0) + (d1.fa||0) - (d1.depr||0) + (d1.invest||0) + (d1.taxAsset||0);
  const calcPass1 = (d1.ap||0) + (d1.stDebt||0) + (d1.otherAp||0) + (d1.accrued||0) + (d1.ltDebt||0) + (d1.capital||0) + (d1.otherCap||0) + (d1.retEarn||0) + (d1.re||0);

  const calcAct2 = (d2.cash||0) + (d2.otherCa||0) + (d2.ar||0) + (d2.inv||0) + (d2.otherAr||0) + (d2.prepaid||0) + (d2.fa||0) - (d2.depr||0) + (d2.invest||0) + (d2.taxAsset||0);
  const calcPass2 = (d2.ap||0) + (d2.stDebt||0) + (d2.otherAp||0) + (d2.accrued||0) + (d2.ltDebt||0) + (d2.capital||0) + (d2.otherCap||0) + (d2.retEarn||0) + (d2.re||0);

  const diff1 = Math.abs(calcAct1 - calcPass1);
  const isBal1 = diff1 < 10000;
  const diff2 = Math.abs(calcAct2 - calcPass2);
  const isBal2 = diff2 < 10000;

  const rows = [
    { section: 'I. NERACA &mdash; AKTIVA (ASSETS)' },
    { k: 'cash', label: 'Kas &amp; Bank' },
    { k: 'ar', label: 'Piutang Usaha (Trade AR)' },
    { k: 'inv', label: 'Persediaan Barang (Inventory)' },
    { k: 'otherAr', label: 'Piutang Lain-lain' },
    { k: 'prepaid', label: 'Biaya / Pajak Dibayar Dimuka' },
    { k: 'otherCa', label: 'Aset Lancar Lainnya' },
    { k: 'fa', label: 'Aktiva Tetap (Fixed Assets)' },
    { k: 'depr', label: 'Akumulasi Penyusutan' },
    { k: 'invest', label: 'Investasi Saham' },
    { k: 'taxAsset', label: 'Aset Pajak Tangguhan / Lain-lain' },
    
    { section: 'II. NERACA &mdash; PASSIVA (LIABILITIES &amp; EQUITY)' },
    { k: 'ap', label: 'Hutang Usaha (Trade AP)' },
    { k: 'stDebt', label: 'Hutang Jk. Pendek (Utang Bank)' },
    { k: 'otherAp', label: 'Hutang Lancar Lainnya' },
    { k: 'accrued', label: 'Biaya YMH Dibayar (Accrued)' },
    { k: 'ltDebt', label: 'Hutang Jk. Panjang (Long Term Debt)' },
    { k: 'capital', label: 'Modal Saham Disetor' },
    { k: 'otherCap', label: 'Setoran Modal Lainnya / Agio' },
    { k: 'retEarn', label: 'Laba (Rugi) Ditahan Periode Lalu' },
    { k: 're', label: 'Laba (Rugi) Tahun Berjalan' },

    { section: 'III. LAPORAN LABA RUGI (INCOME STATEMENT)' },
    { k: 'rev', label: 'Pendapatan Netto (Penjualan / Sales)' },
    { k: 'cogs', label: 'Harga Pokok Penjualan (HPP)' },
    { k: 'opex', label: 'Beban Operasional / Usaha' },
    { k: 'otherInc', label: 'Pendapatan Lain-lain' },
    { k: 'otherExp', label: 'Beban Lain-lain' },
    { k: 'intExp', label: 'Biaya Bunga / Keuangan' },
    { k: 'tax', label: 'Pajak Penghasilan' },
    { k: 'div', label: 'Dividen' }
  ];

  reviewSec.innerHTML = `
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.75rem 1rem; margin-bottom:0.85rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <div style="font-weight:800; font-size:0.85rem; color:#166534; display:flex; align-items:center; gap:6px;">
            <span>🎉</span> Ekstraksi AI Berhasil Selesai!
          </div>
          <div style="font-size:0.72rem; color:#334155; margin-top:2px;">
            Perusahaan Terdeteksi: <strong>${data.company_name || 'Sesuai Dokumen'}</strong> &bull; Periode: <strong>Tahun ${y1} &amp; ${y2}</strong>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <span style="font-size:0.70rem; padding:3px 8px; border-radius:999px; font-weight:700; ${isBal1 ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;' : 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;'}">
            Th ${y1}: ${isBal1 ? '✓ Neraca Balance' : `Selisih ${fmtRp(diff1, true)}`}
          </span>
          <span style="font-size:0.70rem; padding:3px 8px; border-radius:999px; font-weight:700; ${isBal2 ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;' : 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;'}">
            Th ${y2}: ${isBal2 ? '✓ Neraca Balance' : `Selisih ${fmtRp(diff2, true)}`}
          </span>
        </div>
      </div>
    </div>

    <div style="font-size:0.72rem; color:#64748b; margin-bottom:0.4rem;">
      Silakan tinjau dan koreksi angka hasil ekstraksi di bawah jika diperlukan, lalu klik <strong>Terapkan ke Laporan Keuangan</strong>.
    </div>

    <div style="max-height:360px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:1rem; background:#fff;">
      <table class="data-table" style="font-size:0.72rem; width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f1f5f9; position:sticky; top:0; z-index:2; border-bottom:2px solid #cbd5e1;">
            <th style="width:38%; text-align:left; padding:6px 8px;">Uraian Akun Keuangan</th>
            <th style="width:31%; text-align:right; padding:6px 8px;">Tahun ${y1} (Rp)</th>
            <th style="width:31%; text-align:right; padding:6px 8px;">Tahun ${y2} (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => {
            if (r.section) {
              return `
                <tr style="background:#0c345c; color:#fff; font-weight:800; font-size:0.70rem;">
                  <td colspan="3" style="padding:4px 8px; letter-spacing:0.3px;">${r.section}</td>
                </tr>
              `;
            }
            const val1 = d1[r.k] || 0;
            const val2 = d2[r.k] || 0;
            return `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:4px 8px; font-weight:600; color:#334155;">${r.label}</td>
                <td style="padding:3px 6px;">
                  <input type="text" inputmode="numeric" id="ai_rev_${r.k}_1" class="form-control num-col fmt-dots" value="${formatNumberWithDots(val1)}" oninput="handleDotInput(this)" onblur="handleDotBlur(this)" style="font-size:0.74rem; padding:3px 6px;" />
                </td>
                <td style="padding:3px 6px;">
                  <input type="text" inputmode="numeric" id="ai_rev_${r.k}_2" class="form-control num-col fmt-dots" value="${formatNumberWithDots(val2)}" oninput="handleDotInput(this)" onblur="handleDotBlur(this)" style="font-size:0.74rem; padding:3px 6px;" />
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; padding-top:0.5rem; border-top:1px solid #e2e8f0;">
      <button type="button" class="btn btn-outline" onclick="resetAiFinUploadState()" style="font-size:0.75rem;">
        &larr; Pindai Berkas Lain
      </button>
      <div style="display:flex; gap:0.5rem;">
        <button type="button" class="btn btn-outline" onclick="closeAiFinUploadModal()" style="font-size:0.75rem;">
          Batal
        </button>
        <button type="button" class="btn btn-primary" onclick="applyExtractedFinDataToForm()" style="font-size:0.78rem; font-weight:700; background:linear-gradient(135deg, #15803d 0%, #16a34a 100%); border:none; box-shadow:0 2px 6px rgba(22,163,74,0.3); padding:6px 16px;">
          💾 Terapkan ke Form Input Laporan Keuangan
        </button>
      </div>
    </div>
  `;
}

function applyExtractedFinDataToForm() {
  if (!currentExtractedFinData) return;
  const proj = getActiveProject();
  if (!proj) return;

  const y1 = currentExtractedFinData.year1 || 2022;
  const y2 = currentExtractedFinData.year2 || 2023;

  // Update input tahun di form utama
  const inpY1 = document.getElementById('inp_year1');
  const inpY2 = document.getElementById('inp_year2');
  if (inpY1) inpY1.value = y1;
  if (inpY2) inpY2.value = y2;
  proj.year1 = y1;
  proj.year2 = y2;

  // Nama perusahaan jika terdeteksi dan form masih kosong/default
  if (currentExtractedFinData.company_name) {
    const compInp = document.getElementById('inp_companyName');
    if (compInp && (!compInp.value || compInp.value.includes('Proyek Kredit Baru'))) {
      compInp.value = currentExtractedFinData.company_name;
      proj.companyName = currentExtractedFinData.company_name;
    }
  }

  const fields = [
    'rev', 'cogs', 'opex', 'otherInc', 'otherExp', 'intExp', 'tax', 'div',
    'cash', 'otherCa', 'ar', 'inv', 'otherAr', 'prepaid',
    'fa', 'depr', 'invest', 'taxAsset',
    'ap', 'stDebt', 'otherAp', 'accrued', 'ltDebt',
    'capital', 'otherCap', 'retEarn', 're'
  ];

  fields.forEach((k) => {
    const revVal1El = document.getElementById(`ai_rev_${k}_1`);
    const revVal2El = document.getElementById(`ai_rev_${k}_2`);

    const val1 = revVal1El ? parseFormattedNumber(revVal1El.value) : (currentExtractedFinData.data_year1?.[k] || 0);
    const val2 = revVal2El ? parseFormattedNumber(revVal2El.value) : (currentExtractedFinData.data_year2?.[k] || 0);

    const f1El = document.getElementById(`inp_${k}22`);
    const f2El = document.getElementById(`inp_${k}23`);

    if (f1El) f1El.value = formatNumberWithDots(val1);
    if (f2El) f2El.value = formatNumberWithDots(val2);

    proj.fin22[k] = val1;
    proj.fin23[k] = val2;
  });

  // Jalankan sinkronisasi penuh & render ulang kalkulasi seluruh modul
  syncInputsToModel();
  closeAiFinUploadModal();

  // Pastikan Bagian D terbuka agar data ekstraksi langsung terlihat
  toggleInputSection('secD', true);

  showToast(`🎉 Laporan Keuangan Th ${y1} & ${y2} berhasil diekstrak dan diterapkan!`);
}

// ============================================================================
// FITUR HIDE & SEE (COLLAPSIBLE) BAGIAN INPUT DATA (A, B, C, D)
// ============================================================================
const INPUT_SECTIONS_STATE = {
  secA: true, // true = terbuka (tampil), false = tertutup (sembunyi)
  secB: true,
  secC: true,
  secD: true
};

function handleCardHeaderToggle(secId, event) {
  if (event && event.target && event.target.closest('button, input, select, textarea, label, a, datalist')) {
    return;
  }
  toggleInputSection(secId);
}

function toggleInputSection(secId, forceState) {
  const cardMap = {
    secA: { card: 'cardInputSecA', body: 'bodyInputSecA', btn: 'btnToggleSecA', lbl: 'lblToggleSecA' },
    secB: { card: 'cardInputSecB', body: 'bodyInputSecB', btn: 'btnToggleSecB', lbl: 'lblToggleSecB' },
    secC: { card: 'cardCollateralInput', body: 'bodyInputSecC', btn: 'btnToggleSecC', lbl: 'lblToggleSecC' },
    secD: { card: 'cardInputSecD', body: 'bodyInputSecD', btn: 'btnToggleSecD', lbl: 'lblToggleSecD' }
  };

  const item = cardMap[secId];
  if (!item) return;

  const cardEl = document.getElementById(item.card);
  const bodyEl = document.getElementById(item.body);
  const btnEl = document.getElementById(item.btn);
  const lblEl = document.getElementById(item.lbl);

  if (!cardEl || !bodyEl) return;

  const currentState = INPUT_SECTIONS_STATE[secId] !== false;
  const newState = forceState !== undefined ? forceState : !currentState;
  INPUT_SECTIONS_STATE[secId] = newState;

  if (newState) {
    bodyEl.style.display = '';
    cardEl.classList.remove('is-collapsed');
    if (btnEl) btnEl.setAttribute('aria-expanded', 'true');
    if (lblEl) lblEl.textContent = 'Sembunyikan';
  } else {
    bodyEl.style.display = 'none';
    cardEl.classList.add('is-collapsed');
    if (btnEl) btnEl.setAttribute('aria-expanded', 'false');
    if (lblEl) lblEl.textContent = 'Tampilkan';
  }
}

function toggleAllInputSections(openAll) {
  ['secA', 'secB', 'secC', 'secD'].forEach(secId => {
    toggleInputSection(secId, openAll);
  });
}

// ============================================================================
// 16. GLOSSARY & INTERACTIVE ABBREVIATION TOOLTIP SYSTEM
// ============================================================================

const ASCA_GLOSSARY = {
  GPM: {
    abbr: 'GPM',
    fullName: 'Gross Profit Margin',
    idName: 'Margin Laba Kotor Usaha',
    category: 'Profitabilitas',
    definition: 'Persentase keuntungan laba kotor terhadap penjualan bersih setelah dikurangi seluruh biaya langsung pembelian/pembuatan barang dagangan (COGS / HPP).',
    formula: '((Penjualan Bersih - HPP) ÷ Penjualan Bersih) × 100%',
    laymanTip: 'Bantalan keuntungan dasar bisnis. Standar aman RAC Askrindo umumnya mensyaratkan GPM ≥ +10%. Semakin tebal margin kotor, semakin kuat kemampuan perusahaan menutup biaya operasional kantor dan bunga bank.'
  },
  GrossProfitMargin: {
    abbr: 'Gross Profit Margin',
    fullName: 'Gross Profit Margin (GPM)',
    idName: 'Margin Laba Kotor Usaha',
    category: 'Profitabilitas',
    definition: 'Rasio profitabilitas dasar yang mengukur efisiensi penetapan harga jual terhadap biaya langsung barang yang dijual sebelum dipotong beban usaha dan bunga.',
    formula: '((Penjualan - HPP) ÷ Penjualan) × 100%',
    laymanTip: 'Mengukur kesehatan fundamental penetapan harga dagang. Jika margin kotor tipis (< 5%), kenaikan sedikit saja pada kurs valas atau harga pokok akan membuat perusahaan menderita rugi.'
  },
  GrossLoss: {
    abbr: 'GROSS LOSS',
    fullName: 'Gross Loss (Kerugian Kotor di Tingkat HPP)',
    idName: 'Jual Rugi di Bawah Harga Pokok',
    category: 'Profitabilitas',
    definition: 'Kondisi anomali dan berbahaya di mana nilai harga pokok penjualan (HPP) melampaui total nilai penjualan bersih, sehingga Gross Profit Margin bernilai negatif (GPM < 0%).',
    formula: 'Penjualan Bersih < Harga Pokok Penjualan (HPP)',
    laymanTip: 'Perusahaan melakukan praktik "jual rugi" pada produk dasarnya. Setiap rupiah omzet justru membakar modal kerja. Merupakan defisiensi kritis (bendera merah fatal) dalam analisis penjaminan kredit.'
  },
  DSCR: {
    abbr: 'DSCR',
    fullName: 'Debt Service Coverage Ratio',
    idName: 'Rasio Kemampuan Pelunasan Pokok & Bunga Utang',
    category: 'Solvabilitas & Arus Kas',
    definition: 'Perbandingan antara arus kas bersih operasional atau kas yang tersedia (CADS) dengan total kewajiban cicilan pokok dan bunga utang bank yang jatuh tempo pada periode yang sama.',
    formula: 'Kas Tersedia (CADS) ÷ Total Kewajiban Utang (Pokok + Bunga)',
    laymanTip: 'Standar aman minimal perbankan adalah ≥ 1.20x - 1.25x. Jika DSCR < 1.0x, arus kas debitur tekor dan tidak mencukupi untuk melunasi cicilan pinjaman tanpa menambah utang baru.'
  },
  DOI: {
    abbr: 'DOI',
    fullName: 'Days of Inventory',
    idName: 'Hari Perputaran Persediaan Barang di Gudang',
    category: 'Aktivitas Modal Kerja',
    definition: 'Rata-rata waktu (dalam hari) sejak perusahaan membeli persediaan bahan baku/barang dagang hingga barang tersebut berhasil terjual ke tangan pembeli.',
    formula: '(Persediaan Barang ÷ Beban HPP) × 365 Hari',
    laymanTip: 'Semakin sedikit hari (misal 30-60 hari), barang semakin cepat berputar menjadi kas. Jika DOI melonjak ratusan hari, terjadi penumpukan stok mati di gudang yang mengunci uang kas dan berisiko rusak.'
  },
  DOR: {
    abbr: 'DOR',
    fullName: 'Days of Receivables',
    idName: 'Hari Penagihan Piutang Usaha',
    category: 'Aktivitas Modal Kerja',
    definition: 'Rata-rata jangka waktu (dalam hari) yang dibutuhkan perusahaan sejak menerbitkan faktur tagihan hingga uang pembayaran benar-benar berhasil ditagih dan masuk ke rekening bank.',
    formula: '(Piutang Usaha ÷ Total Penjualan Bersih) × 365 Hari',
    laymanTip: 'Mengukur kedisiplinan dan kelancaran pembayaran pelanggan. Jika kesepakatan tempo 30 hari namun DOR riil melonjak ke 75 hari, ada indikasi piutang macet atau pembeli menunda pembayaran.'
  },
  DOP: {
    abbr: 'DOP',
    fullName: 'Days of Payables',
    idName: 'Hari Pembayaran Utang Dagang ke Pemasok',
    category: 'Aktivitas Modal Kerja',
    definition: 'Rata-rata jangka waktu (dalam hari) yang dinikmati perusahaan untuk melunasi kewajiban utang pembelian bahan baku atau barang dagangan kepada pihak pemasok (supplier).',
    formula: '(Utang Usaha ÷ Beban HPP / Pembelian) × 365 Hari',
    laymanTip: 'Fasilitas tempo dari supplier yang berfungsi sebagai pembiayaan modal kerja gratis. Namun jika diulur terlalu lama, pemasok dapat menghentikan pengiriman bahan baku berikutnya.'
  },
  CCC: {
    abbr: 'CCC',
    fullName: 'Cash Conversion Cycle',
    idName: 'Siklus Konversi Kas Bersih',
    category: 'Aktivitas Modal Kerja',
    definition: 'Rentang waktu riil (dalam hari) yang dibutuhkan sejak uang kas tunai keluar untuk membayar pemasok hingga kas hasil penjualan kembali terkumpul ke rekening bank.',
    formula: 'Days of Inventory (DOI) + Days of Receivables (DOR) - Days of Payables (DOP)',
    laymanTip: 'Siklus riil perputaran kas. Jika CCC (misal 150 hari) lebih panjang dari tenor fasilitas kredit bank (misal 90 hari), terjadi mismatch tenor yang pasti memicu gagal bayar saat jatuh tempo kredit.'
  },
  GrossOperatingCycle: {
    abbr: 'Gross Operating Cycle',
    fullName: 'Gross Operating Cycle (DOI + DOR)',
    idName: 'Siklus Operasional Bruto',
    category: 'Aktivitas Modal Kerja',
    definition: 'Total rentang waktu (dalam hari) yang diperlukan sejak persediaan dibeli dan disimpan di gudang hingga barang laku terjual dan seluruh piutang berhasil ditagih kembali menjadi kas tunai.',
    formula: 'Days of Inventory (DOI) + Days of Receivables (DOR)',
    laymanTip: 'Siklus total perputaran fisik barang sampai jadi uang kas tunai. Jika siklus bruto melampaui jangka waktu fasilitas kredit bank, pinjaman bank dipastikan macet karena debitur belum memegang uang kas saat kredit jatuh tempo.'
  },
  NWC: {
    abbr: 'NWC',
    fullName: 'Net Working Capital',
    idName: 'Modal Kerja Bersih',
    category: 'Likuiditas & Kas',
    definition: 'Selisih antara total aset lancar (kas, piutang lancar, persediaan) dengan seluruh kewajiban utang jangka pendek yang wajib dilunasi dalam kurun waktu satu tahun kalender.',
    formula: 'Total Aset Lancar (CA) - Total Liabilitas Jangka Pendek (CL)',
    laymanTip: 'Bantalan likuiditas operasional perusahaan. Jika NWC bernilai positif, perusahaan memiliki penyangga modal kerja yang sehat. Jika NWC negatif, terjadi defisit modal kerja berbahaya di mana utang jangka pendek dipakai membiayai operasional defisit.'
  },
  CBRT: {
    abbr: 'CBRT',
    fullName: 'Cash Burn-Rate Test',
    idName: 'Uji Laju Pembakaran Kas & Daya Tahan Likuiditas',
    category: 'Likuiditas & Kas',
    definition: 'Pengujian stres likuiditas terintegrasi untuk mengukur seberapa lama (hari/bulan) cadangan kas dan modal kerja likuid perusahaan mampu membiayai beban operasional rutin jika terjadi krisis penerimaan penjualan.',
    formula: 'Total Kas & Setara Kas ÷ Rata-Rata Kas Operasional Keluar per Hari/Bulan',
    laymanTip: 'Menguji berapa bulan "napas" cadangan kas debitur untuk bertahan hidup di tengah krisis tanpa bantuan pinjaman baru.'
  },
  PureCashRunway: {
    abbr: 'Pure Cash Runway',
    fullName: 'Pure Cash Runway (Zero Revenue Freeze)',
    idName: 'Ketahanan Kas Murni Tanpa Omzet',
    category: 'Likuiditas & Kas',
    definition: 'Indikator uji ketahanan likuiditas paling konservatif yang mengukur berapa lama (hari/bulan) perusahaan sanggup bertahan membiayai operasional rutin jika terjadi kondisi darurat di mana omzet penjualan terhenti total (Rp 0) dan tidak ada fasilitas kredit baru.',
    formula: 'Total Kas & Bank ÷ Rata-Rata Pengeluaran Kas Operasional Harian (Daily Gross Cash Burn)',
    laymanTip: 'Bantalan napas kas murni saat bisnis membeku tanpa pemasukan. Standar minimal aman perbankan adalah ≥ 1,5 bulan (45 hari). Jika < 30 hari, perusahaan sangat rentan mengalami insolvensi mendadak.'
  },
  LiquidWorkingCapitalRunway: {
    abbr: 'Liquid Working Capital Runway',
    fullName: 'Liquid Working Capital Runway',
    idName: 'Daya Tahan Modal Kerja Likuid (Kas + Piutang)',
    category: 'Likuiditas & Kas',
    definition: 'Ukuran daya tahan modal kerja likuid yang memperhitungkan saldo kas tunai ditambah potensi pencairan piutang lancar tertagih (setelah memperhitungkan haircut diskon risiko 15-20%) untuk membiayai kelangsungan operasional harian.',
    formula: '(Kas & Bank + 85% Piutang Usaha) ÷ Daily Gross Cash Burn',
    laymanTip: 'Menggambarkan cadangan likuiditas jangka pendek jika perusahaan masih dapat menagih sebagian besar piutang dari pelanggan untuk menutup biaya operasional harian.'
  },
  GrossCashBurn: {
    abbr: 'Gross Cash Burn',
    fullName: 'Gross Cash Burn Rate',
    idName: 'Laju Pengeluaran Kas Operasional Rutin',
    category: 'Likuiditas & Kas',
    definition: 'Total jumlah uang tunai kas operasional yang wajib dikeluarkan perusahaan secara rutin setiap hari atau setiap bulan untuk membiayai operasional dasar (gaji, sewa, listrik, pembelian rutin) tanpa memperhitungkan pemasukan baru.',
    formula: '(Beban HPP Kas + Beban Operasional OPEX Kas) ÷ 365 Hari',
    laymanTip: 'Kecepatan "terbakarnya" kas operasional perusahaan. Indikator ini menjadi dasar perhitungan berapa lama cadangan kas (Cash Runway) mampu menopang kelangsungan hidup usaha.'
  },
  DefensiveInterval: {
    abbr: 'Defensive Interval',
    fullName: 'Defensive Interval Ratio (DIR)',
    idName: 'Rasio Interval Bertahan Likuid',
    category: 'Likuiditas & Kas',
    definition: 'Rasio yang mengukur berapa hari perusahaan sanggup melanjutkan operasional rutin hanya dengan mengandalkan aset likuid yang dimiliki (kas tunai, investasi jangka pendek, dan piutang lancar) tanpa memerlukan suntikan kas dari penjualan baru.',
    formula: '(Kas & Setara Kas + Piutang Usaha Lancar) ÷ Rata-Rata Beban Kas Operasional Harian',
    laymanTip: 'Jumlah hari perusahaan dapat beroperasi secara defensif jika operasional normal atau arus pasokan terganggu mendadak.'
  },
  CR: {
    abbr: 'CR',
    fullName: 'Current Ratio',
    idName: 'Rasio Lancar Likuiditas',
    category: 'Likuiditas & Kas',
    definition: 'Rasio perbandingan antara total seluruh aset lancar perusahaan dengan total liabilitas jangka pendek yang wajib dilunasi dalam kurun waktu satu tahun.',
    formula: 'Total Aset Lancar (CA) ÷ Total Liabilitas Jangka Pendek (CL)',
    laymanTip: 'Standar aman minimal perbankan dan RAC Askrindo adalah ≥ 1.0x - 1.25x. Jika CR < 1.0x, perusahaan berada dalam kondisi illiquid karena harta lancarnya tidak mencukupi untuk melunasi tagihan yang segera jatuh tempo.'
  },
  QR: {
    abbr: 'QR',
    fullName: 'Quick Ratio (Acid-Test Ratio)',
    idName: 'Rasio Cepat Likuiditas Murni',
    category: 'Likuiditas & Kas',
    definition: 'Rasio kesiapan likuiditas super likuid yang hanya memperhitungkan kas dan piutang lancar tanpa menyertakan persediaan barang (karena persediaan membutuhkan waktu untuk diproses dan dijual).',
    formula: '(Kas & Setara Kas + Piutang Usaha) ÷ Total Liabilitas Jangka Pendek',
    laymanTip: 'Standar aman underwriting ≥ 0.8x - 1.0x. Menguji kesiapan likuiditas debitur jika terjadi krisis pasar darurat di mana persediaan di gudang mandek tidak laku terjual.'
  },
  CA: {
    abbr: 'CA',
    fullName: 'Current Assets',
    idName: 'Aset Lancar / Aktiva Lancar',
    category: 'Likuiditas & Kas',
    definition: 'Seluruh kekayaan dan harta perusahaan yang berupa uang tunai kas, simpanan bank, atau aset lain yang dapat dicairkan menjadi uang kas dalam jangka waktu maksimal satu tahun (kas, deposito, piutang usaha, persediaan barang, dan uang muka).',
    formula: 'Kas & Bank + Piutang Usaha + Persediaan Barang + Aset Lancar Lainnya',
    laymanTip: 'Modal likuid perusahaan untuk membiayai kegiatan dagang sehari-hari dan membayar kewajiban utang jangka pendek.'
  },
  CL: {
    abbr: 'CL',
    fullName: 'Current Liabilities',
    idName: 'Liabilitas Jangka Pendek / Utang Lancar',
    category: 'Likuiditas & Kas',
    definition: 'Seluruh kewajiban pembayaran finansial dan utang perusahaan kepada pihak ketiga yang wajib dilunasi dalam tempo maksimal 12 bulan (utang usaha kepada supplier, utang bank jangka pendek KMK/SCF, beban akrual, dan pajak).',
    formula: 'Utang Usaha (AP) + Pinjaman Bank Jangka Pendek + Utang Pajak & Beban Akrual',
    laymanTip: 'Daftar seluruh tagihan yang harus segera dilunasi perusahaan dalam waktu dekat. Nilainya tidak boleh melebihi total Aset Lancar (CA).'
  },
  OWC: {
    abbr: 'OWC',
    fullName: 'Operating Working Capital',
    idName: 'Modal Kerja Operasional Riil',
    category: 'Aktivitas Modal Kerja',
    definition: 'Jumlah dana modal kerja yang benar-benar terikat langsung dalam perputaran operasional transaksi bisnis harian di luar kas menganggur atau utang bank berbunga.',
    formula: 'Piutang Usaha + Persediaan Barang - Utang Usaha (Supplier)',
    laymanTip: 'Modal kerja operasional murni yang wajib dibiayai. Semakin besar OWC, semakin banyak modal yang tersedot untuk memutar barang dagangan.'
  },
  deltaOWC: {
    abbr: 'ΔOWC',
    fullName: 'Delta Operating Working Capital',
    idName: 'Pelepasan / Penyerapan Kas Modal Kerja',
    category: 'Solvabilitas & Arus Kas',
    definition: 'Perubahan bersih kebutuhan modal kerja akibat perbaikan atau perlambatan siklus operasional (DOI, DOR, DOP).',
    formula: 'OWC Awal - OWC Baru',
    laymanTip: 'Jika bernilai positif (+), terjadi pelepasan kas surplus (uang tunai yang sebelumnya macet di stok/piutang berhasil dicairkan kembali ke rekening bank). Jika negatif (-), bisnis menyerap tambahan modal tunai.'
  },
  WorkingCapitalGap: {
    abbr: 'Working Capital Gap',
    fullName: 'Working Capital Financing Gap',
    idName: 'Kesenjangan Pembiayaan Modal Kerja',
    category: 'Aktivitas Modal Kerja',
    definition: 'Kebutuhan dana modal kerja operasional yang belum tertutup oleh kredit dagang dari supplier (DOP), sehingga harus didanai dari modal sendiri atau fasilitas kredit perbankan.',
    formula: 'Kebutuhan Modal Kerja Operasional (OWC) - Modal Kerja Bersih (NWC)',
    laymanTip: 'Besarnya defisit kas yang menjadi dasar penetapan batas maksimum plafon kredit modal kerja yang wajar diberikan oleh perbankan.'
  },
  COGS: {
    abbr: 'COGS',
    fullName: 'Cost of Goods Sold',
    idName: 'Harga Pokok Penjualan (HPP)',
    category: 'Profitabilitas',
    definition: 'Total seluruh biaya modal langsung yang dikeluarkan untuk membeli persediaan barang dagangan atau memproduksi barang yang laku terjual dalam satu periode akuntansi.',
    formula: 'Persediaan Awal + Pembelian Bersih / Biaya Pabrikasi - Persediaan Akhir',
    laymanTip: 'Harga modal bersih barang. Pengendalian COGS yang efektif sangat krusial agar perusahaan mempertahankan margin keuntungan kotor (GPM) yang sehat.'
  },
  HPP: {
    abbr: 'HPP',
    fullName: 'Harga Pokok Penjualan (COGS)',
    idName: 'Harga Pokok Penjualan',
    category: 'Profitabilitas',
    definition: 'Biaya langsung yang melekat pada barang atau komoditas yang terjual kepada pelanggan, mencakup biaya bahan baku, tenaga kerja langsung, dan overhead produksi.',
    formula: 'Persediaan Awal + Pembelian Bersih - Persediaan Akhir',
    laymanTip: 'Biaya modal barang dagangan sebelum diperhitungkan biaya kantor, sewa, listrik, dan bunga bank.'
  },
  OPEX: {
    abbr: 'OPEX',
    fullName: 'Operating Expenses',
    idName: 'Beban Operasional Rutin',
    category: 'Profitabilitas',
    definition: 'Pengeluaran kas rutin perusahaan di luar biaya modal barang (COGS) yang dibutuhkan untuk mengelola operasional harian kantor, pemasaran, dan administrasi umum.',
    formula: 'Beban Penjualan & Distribusi + Beban Umum & Administrasi',
    laymanTip: 'Biaya tetap operasional (gaji karyawan, sewa gedung, listrik, transportasi). Perlu dipastikan laba kotor perusahaan cukup untuk menutup seluruh beban OPEX ini.'
  },
  EBIT: {
    abbr: 'EBIT',
    fullName: 'Earnings Before Interest and Taxes',
    idName: 'Laba Operasional Usaha Inti',
    category: 'Profitabilitas',
    definition: 'Keuntungan yang dihasilkan murni dari aktivitas bisnis inti perusahaan setelah laba kotor dikurangi seluruh beban operasional kantor (OPEX), sebelum memperhitungkan beban bunga pinjaman dan pajak penghasilan.',
    formula: 'Laba Kotor - Beban Operasional (OPEX)',
    laymanTip: 'Mengukur profitabilitas murni bisnis inti perusahaan tanpa dipengaruhi oleh struktur pendanaan pinjaman bank atau beban pajak.'
  },
  EBITDA: {
    abbr: 'EBITDA',
    fullName: 'Earnings Before Interest, Taxes, Depreciation & Amortization',
    idName: 'Laba Kas Operasional Murni Sebelum Penyusutan',
    category: 'Profitabilitas',
    definition: 'Indikator keuntungan operasional tunai yang menambahkan kembali beban non-kas (penyusutan aktiva tetap dan amortisasi) ke dalam laba operasional.',
    formula: 'Laba Operasional (EBIT) + Beban Depresiasi + Beban Amortisasi',
    laymanTip: 'Ukuran standar yang paling banyak digunakan analis kredit perbankan untuk melihat berapa banyak uang tunai murni yang dihasilkan dari kegiatan operasional perusahaan.'
  },
  EBT: {
    abbr: 'EBT',
    fullName: 'Earnings Before Tax',
    idName: 'Laba Sebelum Pajak Penghasilan',
    category: 'Profitabilitas',
    definition: 'Keuntungan bersih usaha setelah dikurangi seluruh beban operasional dan beban bunga pinjaman bank, sebelum diperhitungkan kewajiban pajak penghasilan badan.',
    formula: 'Laba Operasional (EBIT) - Beban Bunga Pinjaman Bersih',
    laymanTip: 'Jika EBT positif, bisnis menghasilkan laba nyata setelah membayar seluruh bunga bank. Jika EBT negatif, modal perusahaan sedang tergerus.'
  },
  ROA: {
    abbr: 'ROA',
    fullName: 'Return on Assets',
    idName: 'Tingkat Imbal Hasil Total Aset',
    category: 'Profitabilitas',
    definition: 'Rasio efisiensi yang mengukur kemampuan manajemen perusahaan dalam mendayagunakan seluruh kekayaan dan aset yang dikelolanya untuk mencetak laba bersih.',
    formula: '(Laba Bersih ÷ Total Aset) × 100%',
    laymanTip: 'Mengukur seberapa produktif harta pabrik, gudang, kendaraan, dan kas perusahaan. Nilai ROA > 5% menunjukkan pemanfaatan aset yang produktif.'
  },
  ROE: {
    abbr: 'ROE',
    fullName: 'Return on Equity',
    idName: 'Tingkat Imbal Hasil Modal Sendiri',
    category: 'Profitabilitas',
    definition: 'Rasio imbal hasil keuntungan bersih yang dihasilkan perusahaan dari setiap rupiah modal yang disetorkan oleh pemilik atau pemegang saham.',
    formula: '(Laba Bersih ÷ Total Ekuitas Pemilik) × 100%',
    laymanTip: 'Tingkat keuntungan yang dirasakan pemilik modal. Nilai ROE di atas suku bunga deposito atau SBN (> 10-12%) menandakan bisnis beroperasi secara menguntungkan.'
  },
  DER: {
    abbr: 'DER',
    fullName: 'Debt to Equity Ratio',
    idName: 'Rasio Utang terhadap Modal Sendiri',
    category: 'Solvabilitas & Arus Kas',
    definition: 'Rasio solvabilitas fundamental yang membandingkan total seluruh kewajiban utang perusahaan terhadap total modal bersih yang disetor para pemegang saham.',
    formula: 'Total Liabilitas (Utang) ÷ Total Ekuitas (Modal)',
    laymanTip: 'Standar batas toleransi RAC Askrindo umumnya maksimal ≤ 3.5x - 4.0x. Jika DER terlalu tinggi (misal > 6.0x), modal perusahaan terlalu rapuh dan hampir seluruh operasional dibiayai dari utang.'
  },
  DAR: {
    abbr: 'DAR',
    fullName: 'Debt to Asset Ratio',
    idName: 'Rasio Utang terhadap Total Aset',
    category: 'Solvabilitas & Arus Kas',
    definition: 'Persentase bagian dari seluruh aset perusahaan yang dibiayai melalui pinjaman utang pihak ketiga atau kreditur.',
    formula: '(Total Liabilitas ÷ Total Aset) × 100%',
    laymanTip: 'Standar aman underwriting ≤ 70% - 80%. Jika DAR > 85%, mayoritas kepemilikan aset perusahaan secara de facto merupakan hak tagih milik para kreditur/bank.'
  },
  NOCF: {
    abbr: 'NOCF',
    fullName: 'Net Operating Cash Flow',
    idName: 'Arus Kas Bersih Aktivitas Operasional',
    category: 'Solvabilitas & Arus Kas',
    definition: 'Selisih bersih antara penerimaan kas tunai riil dari penagihan piutang penjualan pelanggan dengan seluruh pengeluaran kas tunai operasional (pembelian persediaan/HPP, beban kantor OPEX, dan pajak).',
    formula: 'Penerimaan Kas Operasional - Pengeluaran Kas Operasional (HPP + OPEX)',
    laymanTip: 'Uang tunai nyata yang tersisa di brankas/rekening dari operasional sehari-hari. Jika NOCF bernilai negatif, perusahaan mengalami tekor kas tunai dalam aktivitas dagangnya.'
  },
  CADS: {
    abbr: 'CADS',
    fullName: 'Cash Available for Debt Service',
    idName: 'Kas Bersih Tersedia untuk Membayar Utang',
    category: 'Solvabilitas & Arus Kas',
    definition: 'Total saldo kas tunai riil yang tersedia bebas di rekening debitur (termasuk saldo awal kas, pencairan modal kerja baru, dan surplus kas operasional NOCF) yang dapat dipakai untuk melunasi cicilan pokok dan bunga utang bank.',
    formula: 'Saldo Awal Kas + Pencairan Fasilitas Modal Kerja + Total NOCF',
    laymanTip: 'Total dana tunai yang siap dipakai melunasi pinjaman bank saat jatuh tempo. Jika nilai CADS lebih rendah dari total kewajiban utang, debitur dipastikan mengalami gagal bayar (default).'
  },
  DebtService: {
    abbr: 'Debt Service',
    fullName: 'Debt Service Obligation',
    idName: 'Total Kewajiban Pembayaran Pokok & Bunga Utang',
    category: 'Solvabilitas & Arus Kas',
    definition: 'Total jumlah uang tunai yang wajib disetorkan debitur kepada kreditur/bank mitra pada periode tertentu untuk melunasi cicilan pokok pinjaman ditambah seluruh beban bunga kredit yang jatuh tempo.',
    formula: 'Cicilan Pokok Pinjaman + Pembayaran Beban Bunga Kredit',
    laymanTip: 'Beban angsuran pokok dan bunga utang bank. Wajib dibandingkan dengan kas yang tersedia (CADS) untuk menguji kecukupan dana pelunasan debitur.'
  },
  StatusQuo: {
    abbr: 'Status Quo',
    fullName: 'Status Quo (Baseline Historical Audited)',
    idName: 'Kondisi Dasar Tanpa Intervensi Perbaikan',
    category: 'Simulasi SWCM & Makro',
    definition: 'Kondisi kinerja keuangan, margin laba, dan siklus perputaran modal kerja debitur sebagaimana tercermin murni pada laporan keuangan audited historis tanpa ada asumsi pemulihan atau efisiensi baru.',
    formula: 'Parameter riil laporan keuangan audited tahun terakhir',
    laymanTip: 'Fakta riil bisnis saat ini. Jika dalam skenario Status Quo arus kas debitur sudah minus dan tenor macet, pemberian fasilitas kredit tanpa perbaikan skema dipastikan berujung klaim/macet.'
  },
  Stagflasi: {
    abbr: 'Stagflasi',
    fullName: 'Severe Stagflation / Stagflasi',
    idName: 'Kondisi Stagnasi Ekonomi Disertai Lonjakan Biaya (Inflasi)',
    category: 'Simulasi SWCM & Makro',
    definition: 'Kondisi makroekonomi yang berat di mana terjadi perlambatan pertumbuhan ekonomi dan anjloknya penjualan, bersamaan dengan melonjaknya harga bahan baku impor (inflasi) dan depresiasi tajam mata uang Rupiah.',
    formula: 'Simulasi SWCM: Penjualan Turun (-20%), Margin Drop (-7%), Shock Valas (+15%), Kerusakan Persediaan (20%)',
    laymanTip: 'Skenario terberat bagi debitur impor: bahan baku naik drastis sementara pembeli lokal lesu dan lambat membayar, menguji apakah modal kerja debitur sanggup bertahan tanpa bangkrut.'
  },
  SevereStress: {
    abbr: 'Severe Stress',
    fullName: 'Severe Stress-Testing Scenario',
    idName: 'Skenario Pengujian Tekanan Ekstrim',
    category: 'Simulasi SWCM & Makro',
    definition: 'Skenario simulasi tekanan finansial berat yang memproyeksikan ketahanan debitur jika terjadi shock simultan: penurunan volume omzet, lonjakan biaya HPP, perpanjangan waktu piutang macet, dan kerugian persediaan.',
    formula: 'Simulasi multivariat parameter terburuk (Shock FX, Haircut Inventory, Drop Sales & GPM)',
    laymanTip: 'Uji ketahanan bantalan modal debitur dalam kondisi darurat terburuk untuk memastikan penjaminan kredit Askrindo tetap memiliki margin of safety yang memadai.'
  },
  Turnaround: {
    abbr: 'Turnaround / Mitigasi',
    fullName: 'Turnaround & Risk Mitigation Scheme',
    idName: 'Skenario Penyehatan & Rekayasa Mitigasi Risiko',
    category: 'Underwriting Askrindo',
    definition: 'Paket solusi restrukturisasi finansial dan operasional yang dirumuskan melalui sistem ASCA untuk membalikkan posisi debitur dari defisit menjadi surplus kas (akselerasi perputaran stok DOI, penguncian rekening escrow, penarikan berbasis PO mengikat, dan penguncian margin kontrak).',
    formula: 'Optimalisasi DOI target + Tranching Plafon Kredit + Covenant Escrow Account + Margin Terkunci',
    laymanTip: 'Jalan keluar terstruktur agar fasilitas kredit yang awalnya berisiko tinggi (macet) dapat diubah menjadi layak dijamin secara aman dengan perlindungan kas berlapis.'
  },
  DCC: {
    abbr: 'DCC',
    fullName: 'Dynamic Cash Conversion',
    idName: 'Metode Konversi Kas Dinamis ASCA',
    category: 'Underwriting Askrindo',
    definition: 'Metodologi audit siklus perputaran arus kas riil berbasis data laporan keuangan audited untuk membuktikan keselarasan perputaran fisik barang dengan tenor pinjaman bank.',
    formula: 'Audit komparasi DOR, DOI, DOP, dan CCC Audited vs Data Klaim Bank',
    laymanTip: 'Mendeteksi apakah klaim perputaran dari debitur dan bank sesuai dengan kenyataan di lapangan atau terdapat rekayasa data dan mismatch tenor.'
  },
  SWCM: {
    abbr: 'SWCM',
    fullName: 'Stress-Tested Working Capital Model',
    idName: 'Model Stres Pengujian Modal Kerja',
    category: 'Underwriting Askrindo',
    definition: 'Model simulasi ketahanan modal kerja di bawah berbagai skenario tekanan pasar (shock kurs valas, lonjakan harga bahan baku, piutang macet, dan persediaan rusak).',
    formula: 'Simulasi komparasi 5 skenario (Baseline Audited, Klaim Bank, FX Shock, Severe Stress, Turnaround Mitigasi)',
    laymanTip: 'Menguji secara kuantitatif apakah debitur tetap sanggup membayar kewajiban jika terjadi goncangan ekonomi atau pelemahan kurs.'
  },
  RAC: {
    abbr: 'RAC',
    fullName: 'Risk Acceptance Criteria',
    idName: 'Kriteria Penerimaan Risiko Askrindo',
    category: 'Underwriting Askrindo',
    definition: 'Batas ambang pedoman baku dan indikator kelayakan finansial minimal yang dipersyaratkan oleh PT Askrindo untuk menerima penjaminan asuransi kredit (contoh: CR > 1.0x, DER < 3.5x, DSCR ≥ 1.25x, GPM > 10%).',
    formula: 'Ambang batas benchmark rasio finansial standar underwriting asuransi kredit',
    laymanTip: 'Rambu-rambu kelayakan penjaminan. Jika debitur melanggar batas RAC, pengajuan penjaminan wajib disyaratkan mitigasi risiko ketat atau ditolak.'
  },
  IJP: {
    abbr: 'IJP',
    fullName: 'Imbal Jasa Penjaminan',
    idName: 'Premi Jaminan Asuransi Kredit Askrindo',
    category: 'Underwriting Askrindo',
    definition: 'Tarif imbalan jasa penjaminan (premi) yang dibayarkan bank penyalur / debitur kepada PT Askrindo atas penerbitan sertifikat jaminan penjaminan kredit.',
    formula: 'Tarif % p.a. (per tahun) × Plafon Kredit yang Dijamin',
    laymanTip: 'Harga premi asuransi kredit yang disesuaikan secara proporsional dengan kelas peringkat risiko debitur (Rating AAA tarif 0,65% s/d Rating D tarif 4,50%).'
  },
  KMK: {
    abbr: 'KMK',
    fullName: 'Kredit Modal Kerja',
    idName: 'Kredit Modal Kerja Perbankan',
    category: 'Underwriting Askrindo',
    definition: 'Fasilitas pinjaman bank jangka pendek (umumnya berjangka waktu 1 tahun dan dapat diperpanjang) yang diberikan untuk mendanai kebutuhan modal operasional usaha debitur.',
    formula: 'Fasilitas pinjaman bank berbunga berjalan',
    laymanTip: 'Pinjaman modal harian dari bank untuk membiayai pembelian persediaan, pembayaran upah operasional, atau menalangi piutang penjualan.'
  },
  SCF: {
    abbr: 'SCF',
    fullName: 'Supply Chain Financing',
    idName: 'Pembiayaan Rantai Pasok Berbasis Transaksi',
    category: 'Underwriting Askrindo',
    definition: 'Skema pembiayaan modal kerja berbasis transaksi perdagangan nyata (Purchase Order, Surat Jalan, atau Faktur Tagihan Invoice) dengan prinsipal/pembeli terpercaya.',
    formula: 'Plafon pinjaman berjangka (misal 90-180 hari) dicairkan per pengapalan atau per invoice barang',
    laymanTip: 'Pinjaman bank yang langsung dicairkan untuk membiayai pesanan dari pembeli besar yang kredibel, dengan penarikan bertahap per pengapalan.'
  },
  PO: {
    abbr: 'PO',
    fullName: 'Purchase Order',
    idName: 'Surat Pesanan Pembelian Resmi',
    category: 'Underwriting Askrindo',
    definition: 'Dokumen kontrak resmi pemesanan barang yang diterbitkan oleh pihak pembeli (buyer) kepada debitur dengan kuantum volume, spesifikasi, dan harga yang mengikat.',
    formula: 'Surat pesanan resmi yang menjadi syarat mutlak pencairan kredit (Condition Precedent)',
    laymanTip: 'Bukti sah bahwa debitur telah memiliki pembeli pasti sebelum fasilitas kredit modal kerja dicairkan oleh pihak bank.'
  },
  NPL: {
    abbr: 'NPL',
    fullName: 'Non-Performing Loan',
    idName: 'Kredit Bermasalah / Macet',
    category: 'Underwriting Askrindo',
    definition: 'Pinjaman bank yang pembayaran cicilannya tertunggak lebih dari 90 hari kalender (Kolektibilitas 3 Kurang Lancar, Kolektibilitas 4 Diragukan, atau Kolektibilitas 5 Macet).',
    formula: 'Status klasifikasi kolektibilitas kredit berdasarkan data SLIK OJK',
    laymanTip: 'Peringatan bahaya utama bagi penjaminan kredit; menunjukkan bahwa debitur memiliki rekam jejak kegagalan membayar kewajiban utang.'
  },
  LTV: {
    abbr: 'LTV',
    fullName: 'Loan to Value Ratio',
    idName: 'Rasio Plafon terhadap Nilai Agunan',
    category: 'Underwriting Askrindo',
    definition: 'Persentase perbandingan antara jumlah kredit yang diberikan bank terhadap nilai wajar/taksasi pasar aset agunan jaminan yang diserahkan debitur.',
    formula: '(Plafon Kredit ÷ Nilai Taksasi Agunan) × 100%',
    laymanTip: 'Mengukur ketebalan jaminan fisik. Semakin rendah nilai LTV (misal < 70%), jaminan semakin kuat menutupi risiko kerugian jika terjadi lelang eksekusi.'
  },
  SLIK: {
    abbr: 'SLIK',
    fullName: 'Sistem Layanan Informasi Keuangan (OJK)',
    idName: 'Laporan Riwayat Kolektibilitas Kredit OJK',
    category: 'Underwriting Askrindo',
    definition: 'Sistem database resmi Otoritas Jasa Keuangan (OJK) yang mencatat seluruh riwayat fasilitas kredit, baki debet, dan rekam jejak kelancaran pembayaran debitur di seluruh lembaga keuangan di Indonesia.',
    formula: 'Kolektibilitas 1 (Lancar) sampai dengan Kolektibilitas 5 (Macet)',
    laymanTip: 'Buku rekam jejak kejujuran dan disiplin pembayaran pinjaman debitur di seluruh perbankan Indonesia.'
  },
  RingFenced: {
    abbr: 'Ring-Fenced',
    fullName: 'Ring-Fenced Escrow Cash Account',
    idName: 'Penguncian Rekening Penampungan Kas (Escrow)',
    category: 'Underwriting Askrindo',
    definition: 'Skema mitigasi pengamanan kas di mana seluruh pembayaran dari pembeli (buyer) wajib ditransfer langsung ke rekening khusus (escrow/virtual account) di bank mitra dan didebet otomatis untuk melunasi pinjaman kredit sebelum sisanya dapat ditarik debitur.',
    formula: 'Covenant Penjaminan Askrindo (Condition Precedent & Continuous Covenant)',
    laymanTip: 'Rekening penampungan dikunci di bank sehingga debitur tidak bisa menyalahgunakan atau melarikan uang hasil penjualan untuk keperluan lain.'
  },
  SelfLiquidating: {
    abbr: 'Self-Liquidating',
    fullName: 'Self-Liquidating Facility',
    idName: 'Fasilitas Kredit Melunasi Mandiri',
    category: 'Underwriting Askrindo',
    definition: 'Struktur fasilitas kredit modal kerja perdagangan di mana pinjaman dirancang untuk melunasi pokok dan bunganya secara mandiri dari hasil pencairan penjualan barang fisik atau pelunasan tagihan invoice yang langsung masuk ke rekening penampungan.',
    formula: 'Pencairan berbasis PO/Invoice dan pelunasan didebet otomatis dari pembayaran pembeli',
    laymanTip: 'Pinjaman yang melunasi dirinya sendiri begitu barang terjual dan dibayar pembeli, sehingga risiko gagal bayar dapat ditekan seminimal mungkin.'
  },
  TenorMismatch: {
    abbr: 'Tenor Mismatch',
    fullName: 'Tenor Mismatch / Cash Gap Deficit',
    idName: 'Ketidaksesuaian Jangka Waktu Kredit vs Siklus Kas',
    category: 'Underwriting Askrindo',
    definition: 'Kondisi berisiko tinggi di mana jangka waktu jatuh tempo fasilitas kredit bank (tenor) lebih pendek daripada siklus perputaran riil uang kas perusahaan (Gross Operating Cycle atau CCC).',
    formula: 'Siklus Konversi Kas (Gross Cycle / CCC) > Tenor Fasilitas Pinjaman Bank',
    laymanTip: 'Kredit bank sudah jatuh tempo dan wajib dilunasi, sementara barang masih menumpuk di gudang atau tagihan belum dibayar pembeli. Memicu gagal bayar seketika.'
  },
  CashCollateral: {
    abbr: 'Cash Collateral',
    fullName: 'Cash Collateral / Simpanan Kas Terblokir',
    idName: 'Agunan Kas Tunai / Saldo Mengendap',
    category: 'Underwriting Askrindo',
    definition: 'Simpanan tunai dalam bentuk rekening giro atau deposito berjangka yang diblokir di bank mitra sebagai jaminan langsung atas fasilitas kredit atau garansi penjaminan yang diterbitkan.',
    formula: 'Persentase saldo kas tunai yang diblokir (biasanya 5% - 20% dari plafon kredit)',
    laymanTip: 'Uang jaminan tunai yang dikunci di bank. Bentuk agunan paling likuid dan aman dengan risiko pemotongan (haircut) 0%.'
  },
  Haircut: {
    abbr: 'Haircut',
    fullName: 'Collateral Haircut / Diskon Nilai Taksasi Agunan',
    idName: 'Diskon Pemotongan Nilai Penjaminan Aset',
    category: 'Underwriting Askrindo',
    definition: 'Persentase pengurangan atau diskon dari nilai wajar aset jaminan (tanah, bangunan, persediaan barang) untuk memperhitungkan risiko penurunan harga pasar atau biaya lelang likuidasi darurat.',
    formula: 'Nilai Taksasi Pasar × (1 - Persentase Haircut)',
    laymanTip: 'Faktor pengaman potongan harga agunan. Jika taksasi tanah Rp 1 Miliar dan haircut 30%, maka nilai agunan yang diakui bank sebagai jaminan hanya Rp 700 Juta.'
  },
  Covenant: {
    abbr: 'Covenant',
    fullName: 'Financial & Operational Covenants',
    idName: 'Persyaratan & Janji Kepatuhan Perjanjian Kredit',
    category: 'Underwriting Askrindo',
    definition: 'Klausul janji dan pembatasan hukum dalam perjanjian kredit yang wajib dipatuhi debitur selama fasilitas kredit aktif (contoh: wajib mempertahankan CR ≥ 1.0, dilarang membagi dividen, wajib menggunakan rekening penampungan escrow).',
    formula: 'Klausul pengaman legal dalam Surat Persetujuan Penjaminan (SPP)',
    laymanTip: 'Aturan main yang mengikat debitur. Jika debitur melanggar janji covenant, penjamin atau bank berhak meninjau ulang fasilitas atau menghentikan pencairan pinjaman.'
  },
  TradeFinancing: {
    abbr: 'Trade Financing',
    fullName: 'Trade Financing Facility',
    idName: 'Pembiayaan Transaksi Perdagangan',
    category: 'Underwriting Askrindo',
    definition: 'Fasilitas pembiayaan perbankan jangka pendek yang dikaitkan langsung dengan siklus pengadaan fisik barang dagangan, dokumen pengapalan, atau kontrak penjualan pembeli.',
    formula: 'Fasilitas pembiayaan berbasis transaksi tagihan invoice, Purchase Order, atau Letter of Credit',
    laymanTip: 'Kredit bank yang khusus dipakai untuk mendanai perputaran barang fisik dan dilunasi langsung begitu transaksi perdagangan selesai.'
  }
};

// Pastikan setiap entri memiliki property key
Object.entries(ASCA_GLOSSARY).forEach(([k, item]) => {
  item.key = k;
});

// Mapping kata/frasa teks ke key kamus
const GLOSSARY_ENTRY_MAP = {
  // Frasa panjang terlebih dahulu
  'Pure Cash Runway (Zero Revenue Freeze)': 'PureCashRunway',
  'Liquid Working Capital Runway': 'LiquidWorkingCapitalRunway',
  'Pure Cash Runway': 'PureCashRunway',
  'Gross Operating Cycle': 'GrossOperatingCycle',
  'Gross Profit Margin': 'GrossProfitMargin',
  'Turnaround / Mitigasi': 'Turnaround',
  'Working Capital Gap': 'WorkingCapitalGap',
  'Defensive Interval Ratio': 'DefensiveInterval',
  'Defensive Interval': 'DefensiveInterval',
  'Daily Gross Cash Burn': 'GrossCashBurn',
  'Gross Cash Burn': 'GrossCashBurn',
  'Severe Stagflasi': 'Stagflasi',
  'Severe Stress': 'SevereStress',
  'Self-Liquidating': 'SelfLiquidating',
  'Tenor Mismatch': 'TenorMismatch',
  'Trade Financing': 'TradeFinancing',
  'Cash Collateral': 'CashCollateral',
  'Debt Service Coverage Ratio': 'DSCR',
  'Debt Service': 'DebtService',
  'Ring-Fenced': 'RingFenced',
  'Status Quo': 'StatusQuo',
  'Turnaround': 'Turnaround',
  'GROSS LOSS': 'GrossLoss',
  'Gross Loss': 'GrossLoss',
  'Stagflasi': 'Stagflasi',
  'Covenants': 'Covenant',
  'Covenant': 'Covenant',
  'Haircuts': 'Haircut',
  'Haircut': 'Haircut',

  // Singkatan akronim
  'EBITDA': 'EBITDA',
  'EBIT': 'EBIT',
  'EBT': 'EBT',
  'OPEX': 'OPEX',
  'COGS': 'COGS',
  'CADS': 'CADS',
  'NOCF': 'NOCF',
  'CBRT': 'CBRT',
  'SWCM': 'SWCM',
  'SLIK': 'SLIK',
  'DSCR': 'DSCR',
  'ΔOWC': 'deltaOWC',
  'OWC': 'OWC',
  'GPM': 'GPM',
  'DOI': 'DOI',
  'DOR': 'DOR',
  'DOP': 'DOP',
  'CCC': 'CCC',
  'NWC': 'NWC',
  'RAC': 'RAC',
  'IJP': 'IJP',
  'DER': 'DER',
  'DAR': 'DAR',
  'ROE': 'ROE',
  'ROA': 'ROA',
  'DCC': 'DCC',
  'KMK': 'KMK',
  'SCF': 'SCF',
  'NPL': 'NPL',
  'LTV': 'LTV',
  'HPP': 'HPP',
  'CR': 'CR',
  'QR': 'QR',
  'CA': 'CA',
  'CL': 'CL',
  'PO': 'PO'
};

function getGlossaryKeyForMatch(matchedStr) {
  if (!matchedStr) return null;
  const clean = matchedStr.trim();
  if (GLOSSARY_ENTRY_MAP[clean]) return GLOSSARY_ENTRY_MAP[clean];
  if (ASCA_GLOSSARY[clean]) return clean;

  const lower = clean.toLowerCase();
  for (const [phrase, key] of Object.entries(GLOSSARY_ENTRY_MAP)) {
    if (phrase.toLowerCase() === lower) return key;
  }
  for (const [key, item] of Object.entries(ASCA_GLOSSARY)) {
    if (item.abbr && item.abbr.toLowerCase() === lower) return key;
    if (item.fullName && item.fullName.toLowerCase() === lower) return key;
  }
  return null;
}

function buildGlossaryMasterRegex() {
  const terms = Object.keys(GLOSSARY_ENTRY_MAP).sort((a, b) => b.length - a.length);
  const patterns = terms.map(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pfx = /^\w/.test(term) ? '\\b' : '(?<![a-zA-Z0-9])';
    const sfx = /\w$/.test(term) ? '\\b' : '(?![a-zA-Z0-9])';
    return `${pfx}${escaped}${sfx}`;
  });
  return new RegExp(`(${patterns.join('|')})`, 'gi');
}

const GLOSSARY_MASTER_REGEX = buildGlossaryMasterRegex();

let activeGlossaryCategory = 'ALL';
let glossaryTooltipTimer = null;

function initFloatingTooltip() {
  let tt = document.getElementById('ascaGlossaryTooltip');
  if (!tt) {
    tt = document.createElement('div');
    tt.id = 'ascaGlossaryTooltip';
    tt.className = 'asca-floating-tooltip';
    document.body.appendChild(tt);

    tt.addEventListener('mouseenter', () => {
      clearTimeout(glossaryTooltipTimer);
    });
    tt.addEventListener('mouseleave', () => {
      glossaryTooltipTimer = setTimeout(() => {
        hideGlossaryTooltip();
      }, 150);
    });
  }

  // Delegated Hover & Click Events
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.abbr-term');
    if (!target) return;
    const termKey = target.dataset.term;
    if (termKey && ASCA_GLOSSARY[termKey]) {
      clearTimeout(glossaryTooltipTimer);
      showGlossaryTooltip(termKey, target);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.abbr-term');
    if (!target) return;
    glossaryTooltipTimer = setTimeout(() => {
      hideGlossaryTooltip();
    }, 150);
  });

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.abbr-term');
    if (target) {
      const termKey = target.dataset.term;
      if (termKey && ASCA_GLOSSARY[termKey]) {
        if (!target.closest('button, .preset-pill, .tab-btn')) {
          e.preventDefault();
        }
        showGlossaryTooltip(termKey, target, true);
      }
    } else {
      if (!e.target.closest('#ascaGlossaryTooltip')) {
        hideGlossaryTooltip();
      }
    }
  });
}

function showGlossaryTooltip(termKey, targetEl, isSticky = false) {
  const item = ASCA_GLOSSARY[termKey];
  if (!item) return;

  let tt = document.getElementById('ascaGlossaryTooltip');
  if (!tt) {
    initFloatingTooltip();
    tt = document.getElementById('ascaGlossaryTooltip');
  }

  tt.innerHTML = `
    <div class="asca-tt-header">
      <div>
        <div class="asca-tt-abbr">${item.abbr}</div>
        <div class="asca-tt-fullname">${item.fullName}</div>
      </div>
      <span class="asca-tt-badge">${item.category}</span>
    </div>
    <div class="asca-tt-idname">${item.idName}</div>
    <div class="asca-tt-def">${item.definition}</div>
    <div class="asca-tt-formula"><strong>Formula:</strong> ${item.formula}</div>
    <div class="asca-tt-tip">
      <strong>💡 Panduan &amp; Interpretasi Praktis:</strong><br />${item.laymanTip}
    </div>
    <div style="margin-top:0.45rem; text-align:right;">
      <a href="javascript:void(0)" onclick="scrollToGlossaryTerm('${termKey}')" style="font-size:0.67rem; color:#0284c7; font-weight:700; text-decoration:none;">
        Buka di Kamus Lengkap &darr;
      </a>
    </div>
  `;

  // Perhitungan Posisi
  const rect = targetEl.getBoundingClientRect();
  const ttWidth = Math.min(340, window.innerWidth - 24);
  tt.style.width = ttWidth + 'px';

  let top = rect.bottom + 8;
  let left = rect.left + (rect.width / 2) - (ttWidth / 2);

  tt.classList.add('show');
  const ttHeight = tt.offsetHeight || 190;

  if (top + ttHeight > window.innerHeight - 12) {
    top = Math.max(12, rect.top - ttHeight - 8);
  }

  if (left + ttWidth > window.innerWidth - 12) {
    left = window.innerWidth - ttWidth - 12;
  }
  if (left < 12) left = 12;

  tt.style.top = top + 'px';
  tt.style.left = left + 'px';
}

function hideGlossaryTooltip() {
  const tt = document.getElementById('ascaGlossaryTooltip');
  if (tt) {
    tt.classList.remove('show');
  }
}

// ============================================================================
// 16B. TIMELINE CYCLE BARS FLOATING TOOLTIP ENGINE
// ============================================================================

let timelineTooltipTimer = null;

function initTimelineTooltip() {
  let tt = document.getElementById('ascaTimelineTooltip');
  if (!tt) {
    tt = document.createElement('div');
    tt.id = 'ascaTimelineTooltip';
    tt.className = 'timeline-floating-tooltip';
    document.body.appendChild(tt);

    tt.addEventListener('mouseenter', () => {
      clearTimeout(timelineTooltipTimer);
    });
    tt.addEventListener('mouseleave', () => {
      timelineTooltipTimer = setTimeout(() => {
        hideTimelineTooltip();
      }, 150);
    });
  }

  // Delegated Hover & Click Events on timeline bars
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.ccc-bar-seg');
    if (!target) return;
    clearTimeout(timelineTooltipTimer);
    showTimelineTooltip(target);
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.ccc-bar-seg');
    if (!target) return;
    timelineTooltipTimer = setTimeout(() => {
      hideTimelineTooltip();
    }, 150);
  });

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.ccc-bar-seg');
    if (target) {
      clearTimeout(timelineTooltipTimer);
      showTimelineTooltip(target);
    } else if (!e.target.closest('#ascaTimelineTooltip')) {
      hideTimelineTooltip();
    }
  });
}

function showTimelineTooltip(targetEl) {
  let tt = document.getElementById('ascaTimelineTooltip');
  if (!tt) {
    initTimelineTooltip();
    tt = document.getElementById('ascaTimelineTooltip');
  }

  const title = targetEl.getAttribute('data-tt-title') || 'Indikator Siklus Modal Kerja';
  const category = targetEl.getAttribute('data-tt-category') || 'Siklus Operasi';
  const days = targetEl.getAttribute('data-tt-days') || '-';
  const pct = targetEl.getAttribute('data-tt-pct') || '';
  const nominal = targetEl.getAttribute('data-tt-nominal') || '';
  const formula = targetEl.getAttribute('data-tt-formula') || '';
  const evalText = targetEl.getAttribute('data-tt-evaluation') || '';
  const statusBg = targetEl.getAttribute('data-tt-status-bg') || '#f1f5f9';
  const statusColor = targetEl.getAttribute('data-tt-status-color') || '#0f172a';

  tt.innerHTML = `
    <div class="timeline-tt-header">
      <div class="timeline-tt-title">${title}</div>
      <span class="timeline-tt-badge" style="background:${statusBg}; color:${statusColor};">${category}</span>
    </div>
    <div class="timeline-tt-val">
      ${days}
      ${pct ? `<span style="font-size:0.72rem; font-weight:600; color:#64748b; margin-left:4px;">(${pct})</span>` : ''}
    </div>
    ${nominal ? `<div style="font-size:0.69rem; color:#475569; margin-bottom:4px; padding:3px 6px; background:#f8fafc; border-radius:4px; border:1px solid #e2e8f0;">${nominal}</div>` : ''}
    ${formula ? `<div style="font-size:0.69rem; color:#334155; margin-bottom:4px;"><strong>Formula:</strong> ${formula}</div>` : ''}
    ${evalText ? `<div style="font-size:0.7rem; color:${statusColor}; background:${statusBg}; padding:4px 7px; border-radius:5px; line-height:1.35; margin-top:4px;">${evalText}</div>` : ''}
  `;

  // Calculate position
  const rect = targetEl.getBoundingClientRect();
  const ttWidth = Math.min(320, window.innerWidth - 24);
  tt.style.width = ttWidth + 'px';

  let top = rect.bottom + 8;
  let left = rect.left + (rect.width / 2) - (ttWidth / 2);

  tt.classList.add('show');
  const ttHeight = tt.offsetHeight || 140;

  if (top + ttHeight > window.innerHeight - 12) {
    top = Math.max(12, rect.top - ttHeight - 8);
  }

  if (left + ttWidth > window.innerWidth - 12) {
    left = window.innerWidth - ttWidth - 12;
  }
  if (left < 12) left = 12;

  tt.style.top = top + 'px';
  tt.style.left = left + 'px';
}

function hideTimelineTooltip() {
  const tt = document.getElementById('ascaTimelineTooltip');
  if (tt) {
    tt.classList.remove('show');
  }
}

function renderGlobalGlossarySection() {
  const container = document.getElementById('glossaryCardsGrid');
  const badgeEl = document.getElementById('glossaryCountBadge');
  const pillsEl = document.getElementById('glossaryCategoryPills');
  if (!container || !pillsEl) return;

  const categories = [
    { id: 'ALL', label: 'Semua Istilah' },
    { id: 'Aktivitas Modal Kerja', label: 'Aktivitas Modal Kerja (DOI, DOR, DOP, CCC, Gross Cycle)' },
    { id: 'Likuiditas & Kas', label: 'Likuiditas & Ketahanan Kas (CR, QR, NWC, CBRT, Runway, Burn Rate)' },
    { id: 'Profitabilitas', label: 'Profitabilitas & Beban (GPM, Gross Loss, EBT, EBITDA, COGS)' },
    { id: 'Solvabilitas & Arus Kas', label: 'Solvabilitas & Arus Kas (DSCR, DER, DAR, NOCF, CADS)' },
    { id: 'Simulasi SWCM & Makro', label: 'Simulasi SWCM & Skenario (Severe Stress, Stagflasi, Turnaround, Status Quo)' },
    { id: 'Underwriting Askrindo', label: 'Underwriting & Mitigasi (RAC, IJP, DCC, SWCM, Ring-Fenced, Covenant)' }
  ];

  pillsEl.innerHTML = categories.map(cat => `
    <button type="button" class="glossary-filter-pill ${activeGlossaryCategory === cat.id ? 'active' : ''}" onclick="selectGlossaryCategory('${cat.id}')">
      ${cat.label}
    </button>
  `).join('');

  filterGlossaryCards();
}

function selectGlossaryCategory(catId) {
  activeGlossaryCategory = catId;
  const pills = document.querySelectorAll('.glossary-filter-pill');
  pills.forEach((p) => {
    p.classList.toggle('active', p.getAttribute('onclick')?.includes(`'${catId}'`));
  });
  filterGlossaryCards();
}

function filterGlossaryCards() {
  const container = document.getElementById('glossaryCardsGrid');
  const badgeEl = document.getElementById('glossaryCountBadge');
  const inputEl = document.getElementById('inputSearchGlossary');
  if (!container) return;

  const query = (inputEl ? inputEl.value : '').toLowerCase().trim();
  const allTerms = Object.values(ASCA_GLOSSARY);

  const filtered = allTerms.filter(item => {
    const matchesCat = activeGlossaryCategory === 'ALL' ||
      item.category.toLowerCase().includes(activeGlossaryCategory.toLowerCase()) ||
      activeGlossaryCategory.toLowerCase().includes(item.category.toLowerCase());
    if (!matchesCat) return false;
    if (!query) return true;
    return (
      item.abbr.toLowerCase().includes(query) ||
      item.fullName.toLowerCase().includes(query) ||
      item.idName.toLowerCase().includes(query) ||
      item.definition.toLowerCase().includes(query) ||
      item.laymanTip.toLowerCase().includes(query)
    );
  });

  if (badgeEl) {
    badgeEl.textContent = `${filtered.length} dari ${allTerms.length} Istilah Tersedia`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:2rem 1rem; color:#64748b; font-size:0.8rem; background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
        Tidak ada istilah yang cocok dengan kata kunci "<strong>${query}</strong>".<br />
        Silakan coba kata kunci lain seperti <em>GPM, DSCR, Runway, NWC, atau IJP</em>.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="glossary-card" id="glossary-card-${item.key || item.abbr.replace(/[^a-zA-Z0-9]/g, '')}">
      <div>
        <div class="glossary-card-top">
          <div>
            <span class="glossary-card-abbr">${item.abbr}</span>
            <div class="glossary-card-fullname">${item.fullName}</div>
          </div>
          <span class="asca-tt-badge">${item.category}</span>
        </div>
        <div class="glossary-card-idname">${item.idName}</div>
        <div class="glossary-card-def">${item.definition}</div>
      </div>
      <div>
        <div class="glossary-card-formula"><strong>Rumus:</strong> ${item.formula}</div>
        <div class="glossary-card-tip">
          <strong>💡 Panduan &amp; Interpretasi Praktis:</strong><br />${item.laymanTip}
        </div>
      </div>
    </div>
  `).join('');
}

function toggleGlossarySection() {
  const body = document.getElementById('glossarySectionBody');
  const txt = document.getElementById('txtToggleGlossary');
  if (!body) return;
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if (txt) {
    txt.textContent = isHidden ? 'Tutup / Minimize' : 'Buka / Tampilkan';
  }
}

function scrollToGlossarySection() {
  const sec = document.getElementById('sectionGlobalGlossary');
  const body = document.getElementById('glossarySectionBody');
  const txt = document.getElementById('txtToggleGlossary');
  if (body && body.style.display === 'none') {
    body.style.display = 'block';
    if (txt) txt.textContent = 'Tutup / Minimize';
  }
  if (sec) {
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sec.style.outline = '3px solid #0284c7';
    setTimeout(() => {
      sec.style.outline = 'none';
    }, 2000);
  }
}

function scrollToGlossaryTerm(termKey) {
  scrollToGlossarySection();
  setTimeout(() => {
    const cardId = 'glossary-card-' + (termKey.replace(/[^a-zA-Z0-9]/g, ''));
    const cardEl = document.getElementById(cardId) || document.getElementById('glossary-card-' + termKey);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.style.boxShadow = '0 0 0 3px #f59e0b, 0 10px 25px rgba(245, 158, 11, 0.2)';
      cardEl.style.borderColor = '#f59e0b';
      setTimeout(() => {
        cardEl.style.boxShadow = '';
        cardEl.style.borderColor = '';
      }, 2500);
    }
  }, 350);
}

function enhanceGlossaryTerms(root) {
  if (!root) root = document.getElementById('projectWorkspaceView') || document.body;
  if (!root) return;

  const targetSelector = [
    'th',
    'td',
    '.preset-pill',
    '.slider-top span',
    '.kpi-label',
    '.kpi-sub',
    '.card-title',
    '.ratio-title',
    '.metric-title',
    '.burn-card',
    '.status-desc',
    '.case-decision-desc',
    '.term-desc',
    '.audit-note',
    '.table-summary',
    '.badge',
    '.scenario-tag',
    '.grade-badge',
    '.case-qa-question',
    '.case-qa-answer',
    '.cf-summary-card',
    '.audit-card'
  ].join(', ');

  const candidates = root.querySelectorAll(targetSelector);

  candidates.forEach(el => {
    if (
      el.dataset.glossaryProcessed ||
      el.closest('.no-glossary') ||
      el.closest('#sectionGlobalGlossary') ||
      el.closest('#printableMemoContainer') ||
      el.closest('.abbr-term')
    ) return;

    el.dataset.glossaryProcessed = 'true';

    const textNodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while ((n = walker.nextNode())) {
      if (
        n.nodeValue &&
        n.parentNode &&
        !n.parentNode.closest('.abbr-term') &&
        !n.parentNode.closest('input, textarea, select, script, style, code')
      ) {
        GLOSSARY_MASTER_REGEX.lastIndex = 0;
        if (GLOSSARY_MASTER_REGEX.test(n.nodeValue)) {
          textNodes.push(n);
        }
      }
    }

    textNodes.forEach(node => {
      const parent = node.parentNode;
      if (!parent || parent.closest('.abbr-term') || !node.isConnected) return;
      const val = node.nodeValue;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;

      GLOSSARY_MASTER_REGEX.lastIndex = 0;
      val.replace(GLOSSARY_MASTER_REGEX, (match, p1, offset) => {
        if (offset > lastIdx) {
          frag.appendChild(document.createTextNode(val.substring(lastIdx, offset)));
        }
        const termKey = getGlossaryKeyForMatch(match);
        if (termKey && ASCA_GLOSSARY[termKey]) {
          const span = document.createElement('span');
          span.className = 'abbr-term';
          span.dataset.term = termKey;
          span.tabIndex = 0;
          span.textContent = match;
          const gItem = ASCA_GLOSSARY[termKey];
          span.title = `${gItem.abbr} (${gItem.fullName}) - ${gItem.idName}`;
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(match));
        }
        lastIdx = offset + match.length;
      });

      if (lastIdx < val.length) {
        frag.appendChild(document.createTextNode(val.substring(lastIdx)));
      }
      parent.replaceChild(frag, node);
    });
  });
}
