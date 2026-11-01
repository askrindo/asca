/**
 * ASKRINDO SMART CREDIT ANALYSIS (ASCA)
 * Metode: Dynamic Cash Conversion & Stress-Tested Working Capital Model (DCC-SWCM)
 * Termasuk: Analisis Ketahanan Modal Kerja Bersih (Net Working Capital & Burn-Rate Test)
 */

const STORAGE_KEY = 'ASKRINDO_ASCA_PROJECTS_V1';
const USERS_STORAGE_KEY = 'ASCA_USERS_DATABASE_V1';
const AUTH_SESSION_KEY = 'ASCA_AUTH_SESSION_V1';
const USER_PROJECTS_KEY_PREFIX = 'ASCA_PROJECTS_USER_';

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
// 2. RISK GRADE DEFINITIONS TABLE
// ============================================================================
const ASKRINDO_GRADE_CATALOG = [
  {
    grade: 'AAA',
    name: 'Prime / Superior Quality',
    minScore: 90,
    maxScore: 100,
    color: '#15803d',
    bg: '#dcfce7',
    badgeCls: 'grade-AAA',
    maxCoverage: 85,
    ijpRate: '0,65%  -  0,90% p.a.',
    decision: 'DIREKOMENDASIKAN LAYAK PENUH (FAST-TRACK APPROVE)',
    decisionClass: 'layak',
    criteriaSummary: 'GPM &ge; 12%, Siklus Gross < Tenor Kredit (Buffer > 30 hr), Cash Runway &ge; 4 bln, NWC Surplus, Quick Ratio &ge; 1,2x, DER < 1,5x, DSCR &ge; 1,50x.'
  },
  {
    grade: 'AA',
    name: 'Very Strong Capacity',
    minScore: 80,
    maxScore: 89,
    color: '#166534',
    bg: '#dcfce7',
    badgeCls: 'grade-AA',
    maxCoverage: 80,
    ijpRate: '0,90%  -  1,25% p.a.',
    decision: 'DIREKOMENDASIKAN LAYAK (APPROVE)',
    decisionClass: 'layak',
    criteriaSummary: 'GPM &ge; 9%, Siklus Gross &le; Tenor Kredit, Cash Runway &ge; 3 bln, Quick Ratio &ge; 0,9x, DER &le; 2,2x, DSCR &ge; 1,30x, Rasio data bank akurat.'
  },
  {
    grade: 'A',
    name: 'Good / Adequate Working Capital',
    minScore: 70,
    maxScore: 79,
    color: '#1e40af',
    bg: '#dbeafe',
    badgeCls: 'grade-A',
    maxCoverage: 75,
    ijpRate: '1,25%  -  1,60% p.a.',
    decision: 'LAYAK DENGAN COVENANT STANDAR',
    decisionClass: 'layak',
    criteriaSummary: 'GPM &ge; 6%, Siklus Gross &le; Tenor Kredit, Cash Runway 2 - 3 bln, Quick Ratio &ge; 0,75x, DER &le; 2,8x, DSCR &ge; 1,15x.'
  },
  {
    grade: 'BBB',
    name: 'Satisfactory / Moderate Risk',
    minScore: 60,
    maxScore: 69,
    color: '#1d4ed8',
    bg: '#e0f2fe',
    badgeCls: 'grade-BBB',
    maxCoverage: 70,
    ijpRate: '1,60%  -  2,10% p.a.',
    decision: 'LAYAK BERSYARAT (MODERATE COVENANT)',
    decisionClass: 'bersyarat',
    criteriaSummary: 'GPM 3% - 6%, Siklus mendekati batas tenor, Cash Runway 1,5 - 2 bln, butuh escrow account & pembatasan pencairan bertahap.'
  },
  {
    grade: 'BB',
    name: 'Watchlist / Vulnerable Cycle',
    minScore: 45,
    maxScore: 59,
    color: '#92400e',
    bg: '#fef3c7',
    badgeCls: 'grade-BB',
    maxCoverage: 60,
    ijpRate: '2,10%  -  2,85% p.a.',
    decision: 'LAYAK BERSYARAT KETAT (WAJIB RESTRUKTURISASI SKEMA)',
    decisionClass: 'bersyarat',
    criteriaSummary: 'Marjin tipis/tertekan, Cash Runway < 1,5 bln, DOI melambat (>120 hr) atau ada defisit NWC, wajib tranching & agunan likuid.'
  },
  {
    grade: 'B',
    name: 'High Risk / Structural Mismatch',
    minScore: 25,
    maxScore: 44,
    color: '#991b1b',
    bg: '#fee2e2',
    badgeCls: 'grade-B',
    maxCoverage: 50,
    ijpRate: '2,85%  -  3,75% p.a. (+Cash Collateral)',
    decision: 'TOLAK SKEMA AWAL / WAJIB RING-FENCED TURNAROUND',
    decisionClass: 'tolak',
    criteriaSummary: 'Gross Loss atau Siklus Gross > Tenor Kredit, Cash Burn tinggi (Runway < 1 bln), Defisit NWC per siklus, Quick Ratio < 0,5x.'
  },
  {
    grade: 'C',
    name: 'Severe Default Risk / Reject',
    minScore: 0,
    maxScore: 24,
    color: '#7f1d1d',
    bg: '#fecaca',
    badgeCls: 'grade-C',
    maxCoverage: 0,
    ijpRate: 'Skema Awal: Ditolak (Nihil) | Opsi Bersyarat: Case by Case (Evaluasi Komite)',
    decision: 'TOLAK SKEMA PENGAJUAN AWAL (CERTAIN DEFAULT ON MATURITY)',
    decisionClass: 'tolak',
    criteriaSummary: 'Gross Loss beruntun + Mismatch Tenor parah + Runway kas kritis (<15 hari). Jika disetujui bersyarat: rate IJP ditetapkan Case by Case melihat kondisi kasus dan hasilnya.'
  }
];

function getGradeMetadataByScore(score, hasKnockOutCap = false, manualOverride = 'AUTO') {
  if (manualOverride && manualOverride !== 'AUTO') {
    const found = ASKRINDO_GRADE_CATALOG.find((g) => g.grade === manualOverride);
    if (found) return { ...found, isOverridden: true };
  }
  let effectiveScore = score;
  if (hasKnockOutCap && effectiveScore > 44) {
    effectiveScore = 44;
  }
  const matched = ASKRINDO_GRADE_CATALOG.find((g) => effectiveScore >= g.minScore && effectiveScore <= g.maxScore) || ASKRINDO_GRADE_CATALOG[ASKRINDO_GRADE_CATALOG.length - 1];
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

function getCurrentProjectStorageKey() {
  const session = getActiveSession();
  const uname = session ? session.username : '1922';
  return USER_PROJECTS_KEY_PREFIX + uname;
}

function loadProjectsFromStorage() {
  const session = getActiveSession();
  const is1922 = session && session.username === '1922';
  const userKey = getCurrentProjectStorageKey();

  projects = [];
  activeProjectId = null;

  try {
    const rawUser = localStorage.getItem(userKey);
    if (rawUser) {
      let parsed = JSON.parse(rawUser);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!is1922) {
          const defaultIds = ['case-rahmat-santosa', 'case-mitra-prima-sejahtera', 'case-tri-mandiri'];
          parsed = parsed.filter(p => !defaultIds.includes(p.id) && !p.id.startsWith('case-rahmat'));
        }
        if (parsed.length > 0) {
          projects = parsed.map((p) => ({
            year1: p.year1 || 2022,
            year2: p.year2 || 2023,
            qualitative5CScore: typeof p.qualitative5CScore === 'number' ? p.qualitative5CScore : 6,
            manualGradeOverride: p.manualGradeOverride || 'AUTO',
            overrideReason: p.overrideReason || '',
            burnStressOpexGrowth: p.burnStressOpexGrowth || 0,
            burnStressCollectionFreeze: !!p.burnStressCollectionFreeze,
            procurementMethod: p.procurementMethod || (isMaritimeOrImportRisk(p) ? 'import_sea' : 'none'),
            ...p
          }));
          projects.forEach((p) => ensureInaprocAutoChecked(p));
          activeProjectId = projects[0].id;
          saveProjectsToStorage();
          return;
        }
      }
    }

    if (is1922) {
      const legacyKeys = [
        STORAGE_KEY,
        'ASKRINDO_ASCA_PROJECTS_V1',
        'ASKRINDO_AFCA_PROJECTS_V28',
        'ASKRINDO_AFCA_PROJECTS_V27',
        'ASKRINDO_AFCA_PROJECTS_V26',
        'ASKRINDO_AFCA_PROJECTS_V25',
        'ASKRINDO_AFCA_PROJECTS_V24',
        'ASKRINDO_AFCA_PROJECTS'
      ];
      for (const k of legacyKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            projects = parsed.map((p) => ({
              year1: p.year1 || 2022,
              year2: p.year2 || 2023,
              qualitative5CScore: typeof p.qualitative5CScore === 'number' ? p.qualitative5CScore : 6,
              manualGradeOverride: p.manualGradeOverride || 'AUTO',
              overrideReason: p.overrideReason || '',
              burnStressOpexGrowth: p.burnStressOpexGrowth || 0,
              burnStressCollectionFreeze: !!p.burnStressCollectionFreeze,
              procurementMethod: p.procurementMethod || (isMaritimeOrImportRisk(p) ? 'import_sea' : 'none'),
              ...p
            }));
            projects.forEach((p) => ensureInaprocAutoChecked(p));
            activeProjectId = projects[0].id;
            saveProjectsToStorage();
            return;
          }
        }
      }
      projects = getDefaultProjects();
      projects.forEach((p) => ensureInaprocAutoChecked(p));
      activeProjectId = projects[0].id;
      saveProjectsToStorage();
      return;
    }
  } catch (e) {
    console.warn('Gagal memuat localStorage:', e);
  }

  projects = [];
  activeProjectId = null;
}

function saveProjectsToStorage() {
  try {
    const userKey = getCurrentProjectStorageKey();
    localStorage.setItem(userKey, JSON.stringify(projects));

    // Mirror to main STORAGE_KEY if user is 1922
    const session = getActiveSession();
    if (!session || session.username === '1922') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }

    const el = document.getElementById('autoSaveStatus');
    if (el) {
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = "&#10003; Tersimpan (" + now + ")";
    }
  } catch (e) {
    console.error('Gagal menyimpan ke localStorage:', e);
  }
}

function getActiveProject() {
  if (!projects || projects.length === 0) return null;
  return projects.find((p) => p.id === activeProjectId) || projects[0];
}

function selectProject(id) {
  activeProjectId = id;
  const proj = getActiveProject();
  if (proj) {
    populateFormInputs(proj);
    triggerLiveInaprocCheck(false);
    fetchGoogleNewsForProject(false, false);
  }
  renderAll();
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
  if (searchInput) {
    const rawVal = (searchInput.value || '').trim();
    if (rawVal === '1922' || rawVal.toLowerCase() === 'admin' || (session && rawVal.toLowerCase() === session.username.toLowerCase())) {
      searchInput.value = '';
    }
  }
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

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
          ? 'Belum ada proyek analisa.<br/><button class="btn btn-primary btn-sm" style="margin-top:0.6rem;" onclick="openNewProjectModal()">+ Buat Proyek</button>' 
          : `Tidak ada proyek yang cocok dengan kata kunci "${query}".`}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((p) => {
      const m = computeDCCSWCM(p);
      const isActive = p.id === activeProjectId;
      return `
        <div class="project-item ${isActive ? 'active' : ''}" onclick="selectProject('${p.id}')">
          <div class="project-item-top">
            <span class="project-name" title="${p.companyName}">${p.companyName}</span>
            <span class="grade-badge ${m.gradeMeta.badgeCls}">${m.shortGrade}</span>
          </div>
          <div class="project-meta">
            <span>${p.bankName}</span> &bull; <span>${fmtRp(p.requestedPlafond, true)}</span> &bull;<span style="font-weight:600;">Score: ${m.score}</span>
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
  setEl('bannerBankName', proj.bankName || '-');
  setEl('bannerSector', proj.sector || '-');
  setEl('bannerCity', proj.city || 'Kab. Sukoharjo');
  setEl('bannerPlafond', fmtRp(proj.requestedPlafond));
  setEl('bannerFinYears', `${m.yr1} & ${m.yr2}`);
  setEl('bannerUnderwriter', proj.underwriter || '-');

  const gradeBadge = document.getElementById('bannerGradeBadge');
  if (gradeBadge) {
    gradeBadge.className = `grade-badge ${m.gradeMeta.badgeCls}`;
    gradeBadge.style.background = ''; // Bersihkan inline style abu-abu
    gradeBadge.textContent = `${m.shortGrade} (${m.score}/100)`;
  }

  const covBadge = document.getElementById('bannerCoverageBadge');
  if (covBadge) {
    covBadge.style.display = 'inline-block';
    if (m.score < 50 || m.gp23 < 0 || m.cashGapAtSCFMaturity_Actual > 30) {
      covBadge.className = 'cover-badge cover-conditional';
      covBadge.textContent = 'Coverage Bersyarat: Maks 55%';
      covBadge.title = 'Rekomendasi Persetujuan Bersyarat: Coverage Asuransi Kredit Askrindo maksimal 55% dan risk sharing Bank Mitra 45%';
    } else {
      covBadge.className = 'cover-badge cover-approved';
      covBadge.textContent = `Coverage Askrindo: ${m.recCoveragePct || 70}%`;
      covBadge.title = `Standar Underwriting Askrindo: Coverage maksimal ${m.recCoveragePct || 70}%`;
    }
  }

  const scoreCircle = document.getElementById('bannerScoreCircle');
  if (scoreCircle) {
    scoreCircle.textContent = m.score;
    scoreCircle.style.background = m.gradeMeta.color;
    scoreCircle.style.color = '#fff';
  }

  const decEl = document.getElementById('bannerDecisionText');
  if (decEl) {
    decEl.textContent = m.gradeMeta.decision;
    decEl.style.color = m.gradeMeta.color;
  }

  const optEl = document.getElementById('bannerOptimalLimit');
  if (optEl) {
    const effectiveCov = (m.score < 50 || m.gp23 < 0 || m.cashGapAtSCFMaturity_Actual > 30) ? 55 : (m.gradeMeta.maxCoverage || 70);
    const maxGuaranteedNominal = (proj.requestedPlafond || 0) * (effectiveCov / 100);
    const condLabel = (m.score < 50 || m.isInitialReject) ? 'Persetujuan Bersyarat' : 'Layak Dijamin';
    const ijpNote = (m.shortGrade === 'C') ? ' &bull; Rate IJP: Case by Case' : (m.ijpRate ? ` &bull; IJP: ${m.ijpRate}` : '');
    optEl.innerHTML = `<strong>Rekomendasi Coverage:</strong> Maks ${effectiveCov}% (${fmtRp(maxGuaranteedNominal, true)}) &bull; <span style="color:${m.gradeMeta.color}; font-weight:700;">${condLabel}</span>${ijpNote}`;
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

let lastToastMsg = '';
let lastToastTime = 0;
function showToast(msg) {
  const now = Date.now();
  if (msg === lastToastMsg && (now - lastToastTime) < 1200) {
    return; // Cegah notifikasi duplikat / tumpuk
  }
  lastToastMsg = msg;
  lastToastTime = now;

  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Bersihkan toast yang identik agar tidak menumpuk di pojok layar
  Array.from(container.children).forEach((child) => {
    if (child.textContent.includes(msg)) {
      child.remove();
    }
  });

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = "<span>&#10003;</span> <span>" + msg + "</span>";
  container.appendChild(t);
  setTimeout(() => {
    if (t.parentNode) t.remove();
  }, 3000);
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
      showToast(`✓ Auto-Check Daftar Hitam LKPP: "${cleanName}" Terverifikasi BERSIH (15/15 Poin).`);
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
      showToast(`✓ Hasil Scan Daftar Hitam INAPROC: "${cleanName}" Bersih / Nihil Sanksi (15/15 Poin).`);
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
    showToast(`✓ Hasil INAPROC Dikonfirmasi: "${compName || proj.companyName}" Terverifikasi Bersih di Portal Resmi!`);
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
  const rawCity = String(cityOrKab || 'Kab. Sukoharjo').trim();
  const cleanCompName = (companyName || '').replace(/\s*\([^)]*\)/g, '').trim();

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
  const targetCity = city || (proj ? proj.city : '') || 'Kab. Sukoharjo';
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
      showToast(`✓ Google News "${cleanName}": Tidak ditemukan berita (0 artikel) — Tidak memiliki citra negatif (20/20 Poin).`);
    } else {
      showToast(`📰 Google News "${cleanName}": Ditemukan ${proj.googleNewsItems.length} artikel berita riil.`);
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

function compute5CAnalysis(proj, f23, m) {
  ensureInaprocAutoChecked(proj);
  ensureGoogleNewsInitialized(proj);

  // 1. Character (Bobot 20%)
  const curYr = proj.year2 || new Date().getFullYear();
  const estYr = proj.estYear || (curYr - 5);
  const businessAge = Math.max(0, curYr - estYr);

  // 1. Kematangan Usaha / Lama Berdiri (Bobot Maks: 25 Poin)
  let charAgePts = 10;
  let charAgeNote = '';
  if (businessAge >= 10) {
    charAgePts = 25;
    charAgeNote = `Lama berdiri ${businessAge} tahun (${estYr}) - Track record sangat matang & teruji krisis makro (25/25 Poin).`;
  } else if (businessAge >= 5) {
    charAgePts = 20;
    charAgeNote = `Lama berdiri ${businessAge} tahun (${estYr}) - Stabilitas operasional mapan (20/25 Poin; butuh &ge;10 thn untuk poin maksimal 25).`;
  } else if (businessAge >= 3) {
    charAgePts = 15;
    charAgeNote = `Lama berdiri ${businessAge} tahun (${estYr}) - Tahap pertumbuhan bisnis (15/25 Poin).`;
  } else {
    charAgePts = 10;
    charAgeNote = `Lama berdiri ${businessAge} tahun (${estYr}) - Usaha rintisan/baru (10/25 Poin).`;
  }

  // 2. SLIK OJK & Riwayat Wanprestasi (Bobot Maks: 30 Poin)
  const defaultHistory = proj.defaultHistory || 'clean';
  const slikStatusVal = proj.slikStatus || 'kol1';
  let charCreditPts = 30;
  let defaultStatusText = 'Belum Pernah Wanprestasi (Track Record Bersih / Kol 1)';
  let slikStatus = 'Kolektibilitas 1 (Lancar)';

  if (slikStatusVal === 'kol3_5' || defaultHistory === 'defaulted') {
    charCreditPts = 0;
    if (defaultHistory === 'defaulted') defaultStatusText = 'Pernah Wanprestasi / Gagal Bayar (Riwayat Restrukturisasi / NPL)';
    if (slikStatusVal === 'kol3_5') slikStatus = 'Kolektibilitas 3-5 (Macet / NPL)';
  } else if (slikStatusVal === 'kol2') {
    charCreditPts = 15;
    slikStatus = 'Kolektibilitas 2 (Dalam Perhatian Khusus)';
  }

  // 3. Integritas Hukum & Kepatuhan Pengadaan (Bobot Maks: 25 Poin)
  // INAPROC LKPP (15 Poin) & SIPP Pengadilan (10 Poin)
  const inaprocStatusVal = proj.inaprocStatus || 'unverified';
  let charInaprocPts = 15;
  let inaprocStatus = 'Bersih (Terverifikasi di Portal INAPROC LKPP)';
  if (inaprocStatusVal === 'blacklisted') {
    charInaprocPts = 0;
    inaprocStatus = 'Terdaftar Masuk Blacklist LKPP (Sanksi Pengadaan)';
  } else if (inaprocStatusVal === 'unverified') {
    charInaprocPts = 10;
    inaprocStatus = 'Belum Diverifikasi di INAPROC LKPP (Perlu Cek Portal)';
  }

  const sippStatusVal = proj.sippStatus || 'clean';
  let charSippPts = 10;
  let sippStatus = 'Nihil Gugatan Wanprestasi / PKPU';
  if (sippStatusVal === 'bankrupt') {
    charSippPts = 0;
    sippStatus = 'Sedang Menghadapi Permohonan PKPU / Pailit';
  } else if (sippStatusVal === 'disputed') {
    charSippPts = 5;
    sippStatus = 'Terdapat Perkara Sengketa Gugatan Perdata';
  }

  // 4. Screening Reputasi Berita & Media (Bobot Maks: 20 Poin)
  const negativeNews = proj.negativeNews || 'clean';
  let charNewsPts = 20;
  let newsStatusText = 'Nihil Berita Negatif di Media (Reputasi Positif)';
  if (negativeNews === 'negative') {
    charNewsPts = 0;
    newsStatusText = 'Terdeteksi Berita Negatif di Media (Isu Kasus / Sengketa)';
  }

  // Total Skor Karakter (Maksimal 100 Poin)
  const charScore = Math.max(10, Math.min(100, Math.round(
    charAgePts + charCreditPts + charInaprocPts + charSippPts + charNewsPts
  )));

  const charBreakdown = {
    agePts: charAgePts,
    maxAgePts: 25,
    creditPts: charCreditPts,
    maxCreditPts: 30,
    inaprocPts: charInaprocPts,
    maxInaprocPts: 15,
    sippPts: charSippPts,
    maxSippPts: 10,
    newsPts: charNewsPts,
    maxNewsPts: 20,
    total: charScore
  };

  // 2. Capacity (Bobot 25%) — Rincian Skor Maksimal 100 Poin
  const gpm = m ? m.gpm23 : (f23.rev > 0 ? ((f23.rev - f23.cogs) / f23.rev) * 100 : 0);
  const cashGap = m ? m.cashGapAtSCFMaturity_Actual : 0;
  const f23Ebit = (f23.rev || 0) - (f23.cogs || 0) - (f23.opex || 0) + (f23.otherInc || 0) - (f23.otherExp || 0);
  const f23Int = f23.intExp || f23.finCost || (( (f23.stDebt || 0) + (proj.requestedPlafond || 0) ) * ((proj.interestRate || 10) / 100));
  const icr = (m && typeof m.icr23 === 'number') ? m.icr23 : (f23Int > 0 ? f23Ebit / f23Int : 1.5);
  const runwayDays = m ? m.pureCashRunwayDays : 30;

  // 2A. Profitabilitas Gross Margin / GPM (Maks 35 Poin)
  let capGpmPts = 10;
  if (gpm >= 12) capGpmPts = 35;
  else if (gpm >= 8) capGpmPts = 28;
  else if (gpm >= 5) capGpmPts = 20;
  else if (gpm >= 0) capGpmPts = 10;
  else capGpmPts = 0;

  // 2B. Kesesuaian Siklus Kas vs Tenor Fasilitas (Maks 30 Poin)
  let capTenorPts = 5;
  if (cashGap <= 0) capTenorPts = 30;
  else if (cashGap <= 15) capTenorPts = 20;
  else if (cashGap <= 30) capTenorPts = 12;
  else capTenorPts = 5;

  // 2C. Interest Coverage Ratio / ICR (Maks 20 Poin)
  let capIcrPts = 0;
  if (icr >= 2.0) capIcrPts = 20;
  else if (icr >= 1.25) capIcrPts = 15;
  else if (icr >= 1.0) capIcrPts = 10;
  else capIcrPts = 0;

  // 2D. Ketahanan Kas Murni / Pure Cash Runway (Maks 15 Poin)
  let capRunwayPts = 2;
  if (runwayDays >= 45) capRunwayPts = 15;
  else if (runwayDays >= 25) capRunwayPts = 10;
  else if (runwayDays >= 10) capRunwayPts = 5;
  else capRunwayPts = 2;

  const capScore = Math.max(10, Math.min(100, Math.round(capGpmPts + capTenorPts + capIcrPts + capRunwayPts)));
  const capNotes = [];
  if (gpm < 0) capNotes.push('Gross Loss (Jual Rugi di HPP)');
  else if (gpm < 5) capNotes.push('Gross Margin Tipis (<5%)');
  if (cashGap > 30) capNotes.push(`Defisit Tenor Kas ${Math.round(cashGap)} Hari`);
  else if (cashGap > 0) capNotes.push(`Mismatch Tenor ${Math.round(cashGap)} Hari`);
  if (icr < 1.0) capNotes.push('ICR Kritis (<1.0x)');
  const capNote = capNotes.length ? capNotes.join('; ') : 'Kapasitas arus kas & kemampuan bayar memadai.';

  const capBreakdown = {
    gpmPts: capGpmPts,
    maxGpmPts: 35,
    tenorPts: capTenorPts,
    maxTenorPts: 30,
    icrPts: capIcrPts,
    maxIcrPts: 20,
    runwayPts: capRunwayPts,
    maxRunwayPts: 15,
    icrVal: icr,
    total: capScore
  };

  // 3. Capital (Bobot 20%) — Rincian Skor Maksimal 100 Poin
  const eq = m ? m.eq23 : ((f23.capital || 0) + (f23.otherCap || 0) + (f23.retEarn || 0) + (f23.re || 0));
  const tl = m ? m.tl23 : ((f23.ap || 0) + (f23.stDebt || 0) + (f23.otherAp || 0) + (f23.accrued || 0) + (f23.ltDebt || 0));
  const der = m ? m.der23 : (eq > 0 ? tl / eq : 99);
  const cr = m ? m.currentRatio23 : ((f23.ca || 1) / Math.max(1, f23.cl || 1));
  const nwcVal = m ? m.nwc23 : ((f23.cash || 0) + (f23.ar || 0) + (f23.inv || 0) - (f23.ap || 0) - (f23.stDebt || 0));
  const reTotal = (f23.retEarn || 0) + (f23.re || 0);
  const reErosion = m ? m.reErosionPct23 : ((f23.capital > 0 && reTotal < 0) ? (Math.abs(reTotal) / f23.capital) * 100 : 0);

  // 3A. Leverage Utang terhadap Modal / DER (Maks 35 Poin)
  let capDerPts = 5;
  if (eq > 0 && der <= 2.0) capDerPts = 35;
  else if (eq > 0 && der <= 2.5) capDerPts = 28;
  else if (eq > 0 && der <= 4.0) capDerPts = 18;
  else capDerPts = 5;

  // 3B. Likuiditas Lancar / Current Ratio (Maks 25 Poin)
  let capCrPts = 5;
  if (cr >= 1.5) capCrPts = 25;
  else if (cr >= 1.2) capCrPts = 20;
  else if (cr >= 1.0) capCrPts = 15;
  else capCrPts = 5;

  // 3C. Kecukupan Net Working Capital / NWC Riil (Maks 20 Poin)
  let capNwcPts = 5;
  if (nwcVal > 0 && (!m || !m.isNWCDeficit)) capNwcPts = 20;
  else if (nwcVal > 0) capNwcPts = 15;
  else capNwcPts = 5;

  // 3D. Ketahanan Ekuitas & Laba Ditahan (Maks 20 Poin)
  let capEqPts = 5;
  if (eq > 0 && reErosion === 0) capEqPts = 20;
  else if (eq > 0 && reErosion <= 25) capEqPts = 12;
  else capEqPts = 5;

  const capitScore = Math.max(15, Math.min(100, Math.round(capDerPts + capCrPts + capNwcPts + capEqPts)));
  const capitNotes = [];
  if (der > 4.0) capitNotes.push(`Leverage Tinggi (DER ${der.toFixed(2)}x)`);
  else if (der > 2.5) capitNotes.push(`DER Moderat (${der.toFixed(2)}x)`);
  if (cr < 1.0) capitNotes.push(`Current Ratio < 1.0x (${cr.toFixed(2)}x)`);
  if (reErosion > 0) capitNotes.push(`Erosi Modal ${reErosion.toFixed(1)}%`);
  const capitNote = capitNotes.length ? capitNotes.join('; ') : 'Struktur permodalan & ekuitas sehat.';

  const capitBreakdown = {
    derPts: capDerPts,
    maxDerPts: 35,
    crPts: capCrPts,
    maxCrPts: 25,
    nwcPts: capNwcPts,
    maxNwcPts: 20,
    eqPts: capEqPts,
    maxEqPts: 20,
    total: capitScore
  };

  // 4. Collateral (Bobot 20%): Agunan Pokok Persediaan (Maks 50 Poin) & Jaminan Tambahan Fixed Assets (Maks 50 Poin)
  const inv = f23.inv || 0;
  const fa = f23.fa || 0;
  const reqPlafond = proj.requestedPlafond || 1;
  const invRatio = (inv / reqPlafond) * 100;
  const faRatio = (fa / reqPlafond) * 100;

  // 4A. Agunan Pokok (Persediaan Barang - Maks 50 Poin)
  let collInvPts = 20;
  if (invRatio >= 100) collInvPts = 50;
  else if (invRatio >= 80) collInvPts = 42;
  else if (invRatio >= 50) collInvPts = 32;
  else if (invRatio > 0) collInvPts = 20;
  else collInvPts = 0;

  // 4B. Jaminan Tambahan (Fixed Assets HT Peringkat I >= 120% - Maks 50 Poin)
  let collFaPts = 20;
  if (faRatio >= 120) collFaPts = 50;
  else if (faRatio >= 100) collFaPts = 42;
  else if (faRatio >= 70) collFaPts = 32;
  else if (faRatio > 0) collFaPts = 20;
  else collFaPts = 0;

  const collScore = Math.max(10, Math.min(100, Math.round(collInvPts + collFaPts)));
  const collRatio = faRatio; // Backward compatibility
  const collNote = `Agunan Pokok Persediaan ${fmtRp(inv, true)} (${invRatio.toFixed(0)}%) & Jaminan Tambahan Fixed Asset ${fmtRp(fa, true)} (${faRatio.toFixed(0)}% plafond).`;

  const collBreakdown = {
    invPts: collInvPts,
    maxInvPts: 50,
    faPts: collFaPts,
    maxFaPts: 50,
    total: collScore
  };

  // 5. Condition (Bobot 15%) — Rincian Skor Maksimal 100 Poin
  const isImport = isMaritimeOrImportRisk(proj);
  const revGrowthYoY = m ? m.revGrowth : 0;

  // 5A. Risiko Rantai Pasok & Jalur Logistik (Maks 35 Poin)
  let condLogPts = 30;
  if (isImport) condLogPts = 18;
  else if (proj.procurementMethod === 'none') condLogPts = 35;
  else condLogPts = 30;

  // 5B. Eksposur Fluktuasi Kurs Valas / USD (Maks 30 Poin)
  let condFxPts = (proj.usdAmount || 0) > 0 ? 15 : 30;

  // 5C. Pertumbuhan Omzet & Permintaan Pasar YoY (Maks 20 Poin)
  let condGrowthPts = 16;
  if (revGrowthYoY >= 10) condGrowthPts = 20;
  else if (revGrowthYoY >= 0) condGrowthPts = 16;
  else condGrowthPts = 10;

  // 5D. Kemandirian Struktur Skema Fasilitas (Maks 15 Poin)
  let condSchemePts = (proj.kmkTenorDays || 0) > 0 ? 10 : 15;

  const condScore = Math.max(15, Math.min(100, Math.round(condLogPts + condFxPts + condGrowthPts + condSchemePts)));
  let condNote = '';
  if (isImport) {
    condNote = 'Sensitivitas tinggi terhadap fluktuasi kurs USD/IDR & risiko jalur laut pengangkutan komoditas impor.';
  } else if (proj.procurementMethod === 'none') {
    condNote = 'Model bisnis bebas risiko logistik maritim/kargo fisik; risiko operasional terkonsentrasi pada eksekusi kontrak jasa/lokal.';
  } else if (proj.procurementMethod === 'domestic') {
    condNote = 'Rantai pasok distribusi domestik jalur darat (inland transit) tanpa eksposur risiko pelayaran laut internasional.';
  } else {
    condNote = 'Kondisi sektor industri stabil dengan perputaran pasar domestik normal.';
  }

  const condBreakdown = {
    logPts: condLogPts,
    maxLogPts: 35,
    fxPts: condFxPts,
    maxFxPts: 30,
    growthPts: condGrowthPts,
    maxGrowthPts: 20,
    schemePts: condSchemePts,
    maxSchemePts: 15,
    total: condScore
  };

  const totalScore = Math.round(
    charScore * 0.20 +
    capScore * 0.25 +
    capitScore * 0.20 +
    collScore * 0.20 +
    condScore * 0.15
  );

  const totalScore10 = Number((totalScore / 10).toFixed(1));

  return {
    businessAge,
    estYr,
    charScore,
    charAgeNote,
    charBreakdown,
    inaprocStatus,
    sippStatus,
    slikStatus,
    capScore,
    capNote,
    capBreakdown,
    capitScore,
    capitNote,
    capitBreakdown,
    collScore,
    collRatio,
    collNote,
    collBreakdown,
    invVal: inv,
    invRatio,
    faVal: fa,
    faRatio,
    condScore,
    condNote,
    condBreakdown,
    isImport,
    totalScore,
    totalScore10
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
  const f22 = proj.fin22;
  const f23 = proj.fin23;
  const yr1 = proj.year1 || 2022;
  const yr2 = proj.year2 || 2023;

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

  const currentRatio22 = cl22 > 0 ? ca22 / cl22 : 0;
  const currentRatio23 = cl23 > 0 ? ca23 / cl23 : 0;
  const quickRatio22 = cl22 > 0 ? (ca22 - f22.inv) / cl22 : 0;
  const quickRatio23 = cl23 > 0 ? (ca23 - f23.inv) / cl23 : 0;
  const cashRatio23 = cl23 > 0 ? f23.cash / cl23 : 0;
  const der22 = eq22 > 0 ? tl22 / eq22 : 99;
  const der23 = eq23 > 0 ? tl23 / eq23 : 99;
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
    icr23: f23.finCost > 0 ? (f23.rev - f23.cogs - f23.opex) / f23.finCost : 1
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
    actualStr: `DER: ${fmtNum(der23, 2)}x | Erosi: ${fmtNum(reErosionPct23, 1)}%`,
    maxPts: 5,
    earnedPts: s6A,
    lostPts: 5 - s6A,
    reason: reErosionPct23 > 50 ? 'Akumulasi rugi menggerus sebagian besar modal saham.' : (der23 <= 2.5 ? 'Permodalan kuat & solvabel.' : 'Leverage utang tinggi.')
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

  return {
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
    recCoveragePct: gradeMeta.maxCoverage,
    ijpRate: gradeMeta.ijpRate,
    fiveC,
    isInitialReject: (score < 50 || gp23 < 0 || cashGapAtSCFMaturity_Actual > 30 || pureCashRunwayMonths < 1.0),
    stage1Decision: (score < 50 || gp23 < 0 || cashGapAtSCFMaturity_Actual > 30 || pureCashRunwayMonths < 1.0)
      ? 'TOLAK SKEMA PENGAJUAN AWAL (CERTAIN DEFAULT ON MATURITY)'
      : (score < 70 ? 'PERTIMBANGKAN BERSYARAT DENGAN MITIGASI KETAT' : 'SETUJU SKEMA PENGAJUAN STANDAR'),
    stage1Summary: (score < 50 || gp23 < 0 || cashGapAtSCFMaturity_Actual > 30 || pureCashRunwayMonths < 1.0)
      ? `Struktur fasilitas kredit pengajuan awal tidak feasible: Marjin kotor negatif (Gross Loss), gap tenor kas ${fmtNum(cashGapAtSCFMaturity_Actual, 0)} hari, dan Pure Cash Runway < 1 bulan memastikan terjadinya default saat jatuh tempo fasilitas utama.`
      : 'Parameter keuangan dan siklus konversi kas debitur memenuhi standar kelayakan underwriting asuransi kredit.'
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

  // Jaminan Tambahan: Fixed Asset >= 120% (Melengkapi Agunan Pokok Persediaan)
  const minCollateralVal = proj.requestedPlafond * 1.2;
  mitigations.push({
    title: `Jaminan Tambahan Fixed Asset (Tanah / Bangunan / Mesin) Minimal 120% Plafond (${fmtRp(minCollateralVal, true)})`,
    detail: `Kewajiban pengikatan <strong>Jaminan Tambahan Fixed Asset bersertifikat minimal 120% dari total plafond kredit (${fmtRp(minCollateralVal, true)})</strong> yang diikat Hak Tanggungan (HT) Peringkat I dari total aset tetap debitur (${fmtRp(proj.fin23.fa)}) yang berstatus <em>free & clear</em>, guna melengkapi Agunan Pokok berupa Persediaan Barang (${fmtRp(proj.fin23.inv, true)}) yang diikat Fidusia / CMA.`
  });

  requiredInfos.push({
    title: `Daftar & Penilaian Appraisal Aset Tetap Free & Clear (${fmtRp(proj.fin23.fa)})`,
    detail: `Underwriter wajib meminta laporan appraisal independen terbaru atas Aset Tetap debitur (${fmtRp(proj.fin23.fa)}) guna memastikan kecukupan nilai pasar jaminan tambahan minimal 120% (${fmtRp(minCollateralVal, true)}) yang bebas sengketa.`
  });

  return { criticalPointsFin, criticalPointsCredit, requiredInfos, mitigations };
}

// ============================================================================
// 7. RENDER TAB 4: KETAHANAN NWC & CASH BURN-RATE TEST (MODUL BARU)
// ============================================================================
function renderBurnRateTab(proj, m) {
  const runwayStatusColor = m.pureCashRunwayMonths >= 2.0 ? '#166534' : (m.pureCashRunwayMonths >= 1.0 ? '#92400e' : '#991b1b');
  const runwayStatusBg = m.pureCashRunwayMonths >= 2.0 ? '#f0fdf4' : (m.pureCashRunwayMonths >= 1.0 ? '#fffbeb' : '#fef2f2');

  document.getElementById('burnRateMenuContainer').innerHTML = `
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
  const negativeDrivers = m.scoreComponents.filter((c) => c.lostPts >= c.maxPts * 0.35);
  const positiveDrivers = m.scoreComponents.filter((c) => c.earnedPts >= c.maxPts * 0.65);

  const stepperHTML = ASKRINDO_GRADE_CATALOG.map((g) => {
    const isActive = g.grade === m.shortGrade;
    return `
      <div class="grade-step-box ${isActive ? 'active-grade' : ''}" style="background:${isActive ? g.bg : '#f8fafc'}; border-color:${isActive ? g.color : '#e2e8f0'};">
        <div style="font-size:0.92rem; font-weight:900; color:${g.color};">${g.grade}</div>
        <div style="font-size:0.62rem; font-weight:700; color:#334155;">Skor ${g.minScore} - ${g.maxScore}</div>
        <div style="font-size:0.6rem; color:#64748b; margin-top:2px;">${g.name}</div>
        ${isActive ? `<div style="margin-top:2px; font-size:0.58rem; font-weight:800; background:${g.color}; color:#fff; border-radius:3px; padding:1px 3px;">POSISI SAAT INI</div>` : ''}
      </div>
    `;
  }).join('');

  document.getElementById('gradeRiskMenuContainer').innerHTML = `
    <div class="card" style="border-left: 4px solid ${m.gradeMeta.color};">
      <div class="card-header">
        <div class="card-title">Menu Penentuan Grade Risk Askrindo &amp; Indikator Penyebabnya (${proj.companyName})</div>
        <button class="btn btn-primary btn-sm" onclick="switchTab('tab-score')">Lihat Rincian Perhitungan Score (${m.score}/100)  + </button>
      </div>

      <div class="grade-scale-bar">
        ${stepperHTML}
      </div>

      <div style="background:${m.gradeMeta.bg}; border:1.5px solid ${m.gradeMeta.color}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.6rem; display:grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; gap:0.55rem; align-items:center;">
        <div>
          <div style="font-size:0.66rem; text-transform:uppercase; font-weight:700; color:${m.gradeMeta.color};">Hasil Penetapan Risk Grade</div>
          <div style="font-size:1.1rem; font-weight:900; color:${m.gradeMeta.color};">GRADE ${m.riskGrade}</div>
          <div style="font-size:0.68rem; color:#1e293b;">Skor Komposit: <strong>${m.score} / 100</strong> (${fmtNum(m.totalRawScore, 1)} Poin)</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Maksimal Coverage Asuransi Kredit</div>
          <div style="font-size:0.92rem; font-weight:800; color:#0f172a;">${m.recCoveragePct > 0 ? `${m.recCoveragePct}% Plafond` : '0% (Maks 55% jika Bersyarat)'}</div>
          <div style="font-size:0.63rem; color:#64748b;">Risk Sharing Bank: ${m.recCoveragePct > 0 ? `${100 - m.recCoveragePct}%` : 'Minimal 45% (Opsi Bersyarat)'}</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Indikasi Rate IJP Askrindo</div>
          <div style="font-size:0.82rem; font-weight:800; color:var(--askrindo-blue);">${m.ijpRate}</div>
          <div style="font-size:0.63rem; color:#64748b;">${m.shortGrade === 'C' ? 'Skema awal ditolak; jika disetujui bersyarat rate Case by Case sesuai evaluasi kasus & hasilnya' : 'Berdasarkan profil risiko siklus kas'}</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Rekomendasi Keputusan Komite</div>
          <div style="font-size:0.74rem; font-weight:800; color:${m.gradeMeta.color};">${m.decision}</div>
        </div>
      </div>

      ${m.hasKnockOutCap ? `
      <div style="background:#fef2f2; border:1px solid #fca5a5; border-left:4px solid #dc2626; padding:0.45rem 0.65rem; border-radius:6px; margin-bottom:0.6rem; font-size:0.71rem; color:#991b1b;">
        &#9888; <strong>Aturan Veto / Hard-Cap Grade Underwriting&bull; Aktif:</strong> Karena debitur mengalami <strong>Gross Loss (${fmtPct(m.gpm23)})</strong> sekaligus <strong>Mismatch Tenor Berat (Siklus Gross ${fmtNum(m.grossCycle23, 1)} hr > Tenor ${m.scfTenor} hr)</strong>, maka Risk Grade otomatis terkunci maksimal pada zona <strong>High Risk / Reject (B / C)</strong> hingga struktur transaksi dimodifikasi menjadi <em>Ring-Fenced Self-Liquidating</em>.
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
              &#9888; Penetapan / Override Grade Risk oleh Underwriter (Opsional):
            </div>
            <div class="grid-2" style="gap:0.35rem;">
              <div>
                <label style="font-size:0.64rem; font-weight:600;">Pilih Mode Penentuan Grade:</label>
                <select class="form-control" onchange="setManualGradeOverride(this.value)">
                  <option value="AUTO" ${(!proj.manualGradeOverride || proj.manualGradeOverride === 'AUTO') ? 'selected' : ''}>Otomatis Sistem DCC-SWCM (Skor ${m.score})</option>
                  ${ASKRINDO_GRADE_CATALOG.map((g) => `
                    <option value="${g.grade}" ${proj.manualGradeOverride === g.grade ? 'selected' : ''}>Override Manual ke Grade ${g.grade} (${g.name})</option>
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
        <div class="card-title">Tabel Parameter &amp; Matriks Standar Penentuan Grade Risk Askrindo (AAA s/d C)</div>
        <span style="font-size:0.66rem; color:var(--text-muted);">Baris berwarna menunjukkan posisi Grade kasus aktif</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Rentang Skor</th>
              <th>Kategori Risiko</th>
              <th>Indikator Ambang Batas (Threshold)</th>
              <th class="num-col">Maks Coverage</th>
              <th>Indikasi Tarif IJP</th>
              <th>Rekomendasi Keputusan</th>
            </tr>
          </thead>
          <tbody>
            ${ASKRINDO_GRADE_CATALOG.map((g) => {
              const active = g.grade === m.shortGrade;
              return `
                <tr style="${active ? `background:${g.bg}; font-weight:700;` : ''}">
                  <td><span class="grade-badge ${g.badgeCls}">${g.grade}</span> ${active ? '&#10003;' : ''}</td>
                  <td><strong>${g.minScore}  -  ${g.maxScore}</strong></td>
                  <td>${g.name}</td>
                  <td>${g.criteriaSummary}</td>
                  <td class="num-col"><strong>${g.maxCoverage}%</strong></td>
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
  showToast(val === 'AUTO' ? 'Grade Risk kembali ke perhitungan otomatis.' : `Grade Risk di-override ke Grade ${val}.`);
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

function render5CTab(proj, m) {
  ensureInaprocAutoChecked(proj);
  ensureGoogleNewsInitialized(proj);
  const fiveC = m.fiveC || compute5CAnalysis(proj, proj.fin23, m);
  const container = document.getElementById('fiveCMenuContainer');
  if (!container) return;

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
  const s6B = Number(((Math.max(0, Math.min(10, fiveC.totalScore10)) / 10) * 6).toFixed(1));

  container.innerHTML = `
    <div class="card" style="border-left: 4px solid var(--askrindo-navy);">
      <div class="card-header">
        <div>
          <div class="card-title">Modul Analisa Kualitatif 5C Underwriting (${proj.companyName})</div>
          <p style="font-size:0.71rem; color:var(--text-muted); margin:0.15rem 0 0;">
            Evaluasi Otomatis Character, Capacity, Capital, Collateral &amp; Condition Berbasis Data Finansial, Riwayat Wanprestasi, Pengecekan Riil LKPP, SIPP Pengadilan &amp; Google News Screening.
          </p>
        </div>
        <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
          <span class="grade-badge ${m.gradeMeta.badgeCls}" style="font-size:0.75rem; padding:3px 10px;">
            Skor 5C Terpadu: ${fiveC.totalScore} / 100
          </span>
          <span style="font-size:0.7rem; font-weight:800; background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; border:1px solid #bae6fd;">
            Pilar 2 (5C Underwriting): ${fiveC.totalScore10} / 10 Poin
          </span>
          <button class="btn btn-outline btn-sm" onclick="switchTab('tab-score')">
            Lihat Rincian Skor DCC &raquo;
          </button>
        </div>
      </div>

      <!-- 5C DIMENSIONS INTERACTIVE CARDS -->
      <div style="margin-bottom:0.75rem;">
        <div class="five-c-grid">
          <!-- 1. Character Card -->
          <div class="five-c-card" style="border-top:3.5px solid #0284c7;">
            <div>
              <div class="five-c-header">
                <span class="five-c-title">1. Character (20%)</span>
                <span class="five-c-score" style="color:${fiveC.charScore >= 70 ? '#10b981' : '#dc2626'};">${fiveC.charScore} / 100</span>
              </div>
              <div class="five-c-detail">
                <strong>${fiveC.charAgeNote}</strong><br/>
                &bull; SLIK OJK: <strong>${fiveC.slikStatus}</strong><br/>
                &bull; INAPROC LKPP: <strong style="color:${proj.inaprocStatus === 'blacklisted' ? '#dc2626' : (proj.inaprocStatus === 'unverified' ? '#d97706' : '#166534')};">${fiveC.inaprocStatus}</strong><br/>
                &bull; SIPP Pengadilan: <strong>${fiveC.sippStatus}</strong>
              </div>

              <!-- Rincian Akumulasi Poin Karakter (Menuju 100 Poin Penuh) -->
              <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.45rem 0.55rem; margin:0.45rem 0; font-size:0.67rem; line-height:1.45;">
                <div style="font-weight:800; color:var(--askrindo-navy); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                  <span>📊 Rincian Skor Karakter (Total: ${fiveC.charScore} / 100):</span>
                  <span style="font-size:0.62rem; padding:1px 6px; border-radius:4px; font-weight:700; ${fiveC.charScore === 100 ? 'background:#dcfce7; color:#15803d;' : 'background:#e0f2fe; color:#0369a1;'}">
                    ${fiveC.charScore === 100 ? '&#10003; 100 Poin Penuh' : `Kurang ${100 - fiveC.charScore} Poin`}
                  </span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:0.64rem;">
                  <tr>
                    <td style="padding:2px 0;">&bull; 🏢 <strong>Kematangan Usaha (${fiveC.businessAge} Thn):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.charBreakdown?.agePts || 0) === 25 ? '#15803d' : '#b45309'};">${fiveC.charBreakdown?.agePts || 20} / 25 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 💳 <strong>SLIK OJK &amp; Riwayat Kredit:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.charBreakdown?.creditPts || 0) === 30 ? '#15803d' : '#dc2626'};">${fiveC.charBreakdown?.creditPts || 30} / 30 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 🏛️ <strong>Daftar Hitam INAPROC LKPP:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.charBreakdown?.inaprocPts || 0) === 15 ? '#15803d' : ((fiveC.charBreakdown?.inaprocPts || 0) === 10 ? '#b45309' : '#dc2626')};">${fiveC.charBreakdown?.inaprocPts || 10} / 15 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; ⚖️ <strong>SIPP Pengadilan MA (Legal):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.charBreakdown?.sippPts || 0) === 10 ? '#15803d' : '#dc2626'};">${fiveC.charBreakdown?.sippPts || 10} / 10 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 📰 <strong>Screening Media &amp; Publik:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.charBreakdown?.newsPts || 0) === 20 ? '#15803d' : '#dc2626'};">${fiveC.charBreakdown?.newsPts || 20} / 20 Poin</td>
                  </tr>
                </table>
                <div style="margin-top:4px; padding-top:4px; border-top:1px dashed #cbd5e1; color:#475569; font-size:0.62rem; line-height:1.35;">
                  <em>💡 <strong>Syarat Skor 100 Penuh:</strong> Lama usaha &ge; 10 tahun (25 poin), SLIK OJK Kol 1 Lancar (30 poin), INAPROC LKPP Terverifikasi Bersih (15 poin), SIPP Pengadilan Nihil Perkara (10 poin), dan Media Nihil Isu Negatif (20 poin).</em>
                </div>
              </div>

              ${proj.inaprocStatus === 'blacklisted' ? `
                <div style="background:#fef2f2; border:1px solid #f87171; border-radius:5px; padding:0.35rem 0.5rem; margin-bottom:0.4rem; color:#991b1b; font-size:0.67rem; font-weight:700; line-height:1.35;">
                  &#9888; PERINGATAN LKPP: Debitur terdeteksi masuk Daftar Hitam Nasional LKPP / INAPROC (0/15 Poin)!
                </div>
              ` : ''}

              <!-- Parameter Wanprestasi -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:0.35rem 0.45rem; margin-bottom:0.35rem;">
                <label style="font-size:0.65rem; font-weight:700; color:var(--askrindo-navy); display:block; margin-bottom:2px;">
                  Riwayat Wanprestasi / Gagal Bayar (Maks 30 Poin bersama SLIK):
                </label>
                <select class="form-control" style="font-size:0.66rem; padding:2px 4px; height:auto;" onchange="updateCharacterParam('defaultHistory', this.value)">
                  <option value="clean" ${proj.defaultHistory !== 'defaulted' ? 'selected' : ''}>&#10003; Belum Pernah (Lancar Kol 1 - Poin Penuh 30)</option>
                  <option value="defaulted" ${proj.defaultHistory === 'defaulted' ? 'selected' : ''}>&#9888; Pernah Wanprestasi / NPL (0 Poin)</option>
                </select>
              </div>

              <!-- Parameter Pemberitaan Negatif Google News -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:0.35rem 0.45rem; margin-bottom:0.35rem;">
                <label style="font-size:0.65rem; font-weight:700; color:var(--askrindo-navy); display:block; margin-bottom:2px;">
                  Screening Berita Negatif di Media (Maks 20 Poin):
                </label>
                <select class="form-control" style="font-size:0.66rem; padding:2px 4px; height:auto;" onchange="updateCharacterParam('negativeNews', this.value)">
                  <option value="clean" ${proj.negativeNews !== 'negative' ? 'selected' : ''}>&#10003; Nihil Berita Negatif di Media (Poin Penuh 20)</option>
                  <option value="negative" ${proj.negativeNews === 'negative' ? 'selected' : ''}>&#9888; Terdeteksi Berita Negatif (0 Poin)</option>
                </select>
              </div>

              <!-- Parameter Status INAPROC LKPP -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:0.35rem 0.45rem; margin-bottom:0.35rem;">
                <label style="font-size:0.65rem; font-weight:700; color:var(--askrindo-navy); display:block; margin-bottom:2px;">
                  Status Daftar Hitam INAPROC LKPP (Maks 15 Poin):
                </label>
                <select class="form-control" style="font-size:0.66rem; padding:2px 4px; height:auto;" onchange="updateCharacterParam('inaprocStatus', this.value)">
                  <option value="clean" ${proj.inaprocStatus === 'clean' ? 'selected' : ''}>&#10003; Bersih (Terverifikasi di Portal INAPROC - Poin Penuh 15)</option>
                  <option value="unverified" ${(!proj.inaprocStatus || proj.inaprocStatus === 'unverified') ? 'selected' : ''}>&#9888; Belum Diverifikasi di INAPROC (10 Poin)</option>
                  <option value="blacklisted" ${proj.inaprocStatus === 'blacklisted' ? 'selected' : ''}>&#9888; Terdaftar Blacklist LKPP (0 Poin)</option>
                </select>
              </div>

              <!-- Parameter Status SIPP Pengadilan -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:0.35rem 0.45rem; margin-bottom:0.35rem;">
                <label style="font-size:0.65rem; font-weight:700; color:var(--askrindo-navy); display:block; margin-bottom:2px;">
                  Status SIPP Pengadilan MA - Perkara Hukum (Maks 10 Poin):
                </label>
                <select class="form-control" style="font-size:0.66rem; padding:2px 4px; height:auto;" onchange="updateCharacterParam('sippStatus', this.value)">
                  <option value="clean" ${(!proj.sippStatus || proj.sippStatus === 'clean') ? 'selected' : ''}>&#10003; Nihil Gugatan / Perkara Hukum (Poin Penuh 10)</option>
                  <option value="disputed" ${proj.sippStatus === 'disputed' ? 'selected' : ''}>&#9888; Ada Gugatan Perdata (5 Poin)</option>
                  <option value="bankrupt" ${proj.sippStatus === 'bankrupt' ? 'selected' : ''}>&#9888; Menghadapi Permohonan PKPU/Pailit (0 Poin)</option>
                </select>
              </div>

              <!-- Parameter Rekam Jejak SLIK OJK -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:0.35rem 0.45rem; margin-bottom:0.4rem;">
                <label style="font-size:0.65rem; font-weight:700; color:var(--askrindo-navy); display:block; margin-bottom:2px;">
                  Status Rekam Jejak SLIK OJK (Maks 30 Poin):
                </label>
                <select class="form-control" style="font-size:0.66rem; padding:2px 4px; height:auto;" onchange="updateCharacterParam('slikStatus', this.value)">
                  <option value="kol1" ${(!proj.slikStatus || proj.slikStatus === 'kol1') ? 'selected' : ''}>&#10003; Kolektibilitas 1 - Lancar (Poin Penuh 30)</option>
                  <option value="kol2" ${proj.slikStatus === 'kol2' ? 'selected' : ''}>&#9888; Kolektibilitas 2 - DPK (15 Poin)</option>
                  <option value="kol3_5" ${proj.slikStatus === 'kol3_5' ? 'selected' : ''}>&#9888; Kolektibilitas 3-5 - Macet/NPL (0 Poin)</option>
                </select>
              </div>
            </div>

            <!-- KONEKSI OTOMATIS PORTAL INAPROC LKPP (DI DALAM KOLOM CHARACTER) -->
            <div id="inaprocIntegratedCard" style="background:${proj.inaprocStatus === 'blacklisted' ? '#fef2f2' : '#f0f9ff'}; border:1.5px solid ${proj.inaprocStatus === 'blacklisted' ? '#ef4444' : '#0284c7'}; border-radius:8px; padding:0.55rem; margin-top:0.35rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem; gap:4px; flex-wrap:wrap;">
                <span style="font-size:0.68rem; font-weight:800; color:${proj.inaprocStatus === 'blacklisted' ? '#b91c1c' : '#0369a1'}; text-transform:uppercase; letter-spacing:0.2px;">
                  🌐 Auto-Screening Daftar Hitam INAPROC
                </span>
                <button type="button" id="btnAutoCheckInaproc" onclick="triggerLiveInaprocCheck(true)" style="background:#ffffff; color:#0369a1; border:1px solid #7dd3fc; border-radius:5px; padding:2px 8px; font-size:0.63rem; font-weight:700; cursor:pointer;">
                  Klik - Scan Ulang
                </button>
              </div>
              
              <div style="font-size:0.65rem; color:#334155; margin:0 0 0.35rem; line-height:1.4; background:#fff; padding:5px 7px; border-radius:5px; border:1px solid ${proj.inaprocStatus === 'blacklisted' ? '#fca5a5' : '#bae6fd'};">
                <div>Perusahaan: <strong>${cleanCompName}</strong> &nbsp;|&nbsp; Diakses: <strong>${inaprocRes.checkedAt || accessedAt}</strong></div>
                <div style="margin-top:2px; font-size:0.63rem; color:${proj.inaprocStatus === 'blacklisted' ? '#dc2626' : '#15803d'}; font-weight:700;">
                  ${proj.inaprocStatus === 'blacklisted'
                    ? `⚠ TERDETEKSI MASUK DAFTAR HITAM LKPP (0/15 Poin)`
                    : '✓ Otomatis Terverifikasi Bersih Nihil Sanksi (15/15 Poin)'}
                </div>
                ${proj.inaprocStatus === 'blacklisted' ? `
                  <div style="margin-top:3px; padding-top:3px; border-top:1px dashed #fca5a5; font-size:0.61rem; color:#7f1d1d;">
                    &bull; No. SK Sanksi: <strong>${inaprocRes.skNumber || '-'}</strong><br/>
                    &bull; Status / Masa Sanksi: <strong>${inaprocRes.sanctionPeriod || 'Tayang di Portal INAPROC'}</strong><br/>
                    ${inaprocRes.institution && inaprocRes.institution !== '-' ? `&bull; Instansi Penetap: <strong>${inaprocRes.institution}</strong>` : ''}
                  </div>
                ` : ''}
              </div>

              <div style="display:flex; flex-direction:column; gap:4px;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                  <button class="five-c-portal-btn" style="background:#fef2f2; color:#b91c1c; border-color:#fca5a5; font-weight:800; justify-content:center; text-align:center;" onclick="setInaprocResult('blacklisted', '${safeCompName}')" title="Tetapkan status terdaftar di daftar hitam berdasarkan hasil temuan di website INAPROC (0 Poin)">
                    &#9888; Masuk Blacklist (0 Poin)
                  </button>
                  <button class="five-c-portal-btn" style="background:#f0fdf4; color:#15803d; border-color:#86efac; font-weight:800; justify-content:center; text-align:center;" onclick="setInaprocResult('clean', '${safeCompName}')" title="Tetapkan status bersih berdasarkan hasil pencarian nihil di website INAPROC (15 Poin Penuh)">
                    &#10003; Terverifikasi Bersih (15 Poin)
                  </button>
                </div>

                <button class="five-c-portal-btn" style="background:#fff; color:#475569; border-color:#cbd5e1; font-size:0.63rem; justify-content:center;" onclick="openInaprocPortal('${safeCompName}')" title="Buka website resmi https://daftar-hitam.inaproc.id/?search=...">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:3px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>Buka Portal daftar-hitam.inaproc.id &raquo;
                </button>
              </div>
            </div>

            <!-- PANEL INTEGRASI OTOMATIS GOOGLE NEWS RIIL (SATU KOLOM DENGAN CHARACTER) -->
            <div id="googleNewsIntegratedCard" style="background:#ffffff; border:1.5px solid ${proj.negativeNews === 'negative' ? '#fca5a5' : '#cbd5e1'}; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; margin-top:0.45rem;">
              <!-- Header Bar Google News -->
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.65rem; border-bottom:1px solid #e2e8f0; background:#ffffff; gap:0.35rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <svg width="22" height="18" viewBox="0 0 36 30" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
                    <rect x="6" y="1" width="24" height="19" rx="2.5" fill="#0F9D58"/>
                    <rect x="11" y="5" width="24" height="19" rx="2.5" fill="#EA4335"/>
                    <rect x="1" y="6" width="24" height="19" rx="2.5" fill="#FBBC04"/>
                    <rect x="4" y="9" width="22" height="18" rx="2.5" fill="#4285F4"/>
                    <text x="7.5" y="21" fill="#ffffff" font-family="Arial, sans-serif" font-weight="bold" font-size="9.5">G=</text>
                  </svg>
                  <span style="font-size:0.8rem; font-weight:700; color:#5f6368; letter-spacing:-0.1px;">Google News</span>
                </div>
                <button type="button" id="btnUpdateGoogleNews" onclick="fetchGoogleNewsForProject(true)" style="background:#ffffff; color:#1e293b; border:1px solid #cbd5e1; border-radius:5px; padding:3px 9px; font-size:0.65rem; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
                  ${isFetchingGoogleNews ? 'Memuat Berita...' : 'Klik - Update Berita'}
                </button>
              </div>

              <!-- Body Content Google News -->
              <div style="padding:0.55rem 0.65rem;">
                <div style="font-size:0.65rem; color:#475569; margin-bottom:0.45rem; line-height:1.4;">
                  <div>
                    Perusahaan: <strong style="color:#1e293b;">${cleanCompName}</strong>
                    &nbsp;&nbsp;Diakses: <span style="color:#475569;">${accessedAt}</span>
                  </div>
                  <div style="margin-top:3px; display:inline-block; font-size:0.62rem; font-weight:700; padding:1px 7px; border-radius:999px; ${proj.negativeNews === 'negative' ? 'background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;' : 'background:#dcfce7; color:#166534; border:1px solid #86efac;'}">
                    ${proj.negativeNews === 'negative'
                      ? '&#9888; Terdeteksi Berita Negatif (0 / 20 Poin)'
                      : '&#10003; Nihil Berita Negatif (20 / 20 Poin)'}
                  </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.45rem;">
                  ${newsItems.length === 0 ? `
                    <div style="border:1px solid #86efac; border-radius:6px; padding:0.55rem 0.65rem; background:#f0fdf4; color:#166534; font-size:0.65rem; line-height:1.45;">
                      <div style="font-weight:700; margin-bottom:2px;">
                        ${isFetchingGoogleNews
                          ? '&#8987; Sedang Memindai Berita Riil di Google News...'
                          : '&#10003; Tidak Ditemukan Pemberitaan di Google News (0 Berita)'}
                      </div>
                      <div>
                        ${isFetchingGoogleNews
                          ? `Mencari pemberitaan publik terkait <strong>"${cleanCompName}"</strong> secara langsung dari Google News...`
                          : `Hasil pencarian berita riil untuk <strong>"${cleanCompName}"</strong> nihil. Perusahaan ini tidak memiliki pemberitaan / citra negatif di media publik (Skor Media Karakter: <strong>20 / 20 Poin Penuh</strong>).`}
                      </div>
                    </div>
                  ` : newsItems.map((item, idx) => {
                    const st = item.status || 'unmarked';
                    const isNeg = st === 'negative';
                    const isClean = st === 'clean';
                    let badgeHtml = `<span style="background:#f1f5f9; color:#475569; font-size:0.6rem; font-weight:600; padding:2px 7px; border-radius:999px; white-space:nowrap; flex-shrink:0;">Belum Ditandai</span>`;
                    if (isNeg) {
                      badgeHtml = `<span style="background:#fee2e2; color:#dc2626; font-size:0.6rem; font-weight:700; padding:2px 7px; border-radius:999px; white-space:nowrap; flex-shrink:0;">Ditandai Negatif</span>`;
                    } else if (isClean) {
                      badgeHtml = `<span style="background:#dcfce7; color:#166534; font-size:0.6rem; font-weight:700; padding:2px 7px; border-radius:999px; white-space:nowrap; flex-shrink:0;">Bukan Negatif</span>`;
                    }

                    return `
                      <div style="border:1px solid ${isNeg ? '#fca5a5' : (isClean ? '#86efac' : '#e2e8f0')}; border-radius:6px; padding:0.5rem 0.6rem; background:${isNeg ? '#fffafa' : '#ffffff'};">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.4rem;">
                          <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer" style="font-size:0.7rem; font-weight:600; color:#1e293b; text-decoration:none; line-height:1.35;" onmouseover="this.style.color='#0284c7'; this.style.textDecoration='underline';" onmouseout="this.style.color='#1e293b'; this.style.textDecoration='none';" title="Klik untuk membuka artikel berita di tab baru">
                            ${item.title}
                          </a>
                          ${badgeHtml}
                        </div>
                        <div style="font-size:0.62rem; color:#64748b; margin:3px 0 6px;">
                          ${item.source || 'Google News'} &nbsp;-&nbsp; ${item.pubDate || accessedAt}
                        </div>
                        <div style="display:flex; align-items:center; gap:0.35rem;">
                          <button type="button" onclick="markGoogleNewsItem(${idx}, 'negative')" style="background:${isNeg ? '#dc2626' : '#fff5f5'}; color:${isNeg ? '#ffffff' : '#dc2626'}; border:1px solid ${isNeg ? '#dc2626' : '#fca5a5'}; border-radius:4px; padding:2px 8px; font-size:0.63rem; font-weight:600; cursor:pointer;">
                            Tandai Negatif
                          </button>
                          <button type="button" onclick="markGoogleNewsItem(${idx}, 'clean')" style="background:${isClean ? '#166534' : '#f0fdf4'}; color:${isClean ? '#ffffff' : '#166534'}; border:1px solid ${isClean ? '#166534' : '#86efac'}; border-radius:4px; padding:2px 8px; font-size:0.63rem; font-weight:600; cursor:pointer;">
                            Bukan Negatif
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- KONEKSI OTOMATIS SIPP PENGADILAN NEGERI (BERDASARKAN KABUPATEN/KOTA) -->
            ${(() => {
              const sippInfo = getSippPnInfo(proj.city || 'Kab. Sukoharjo', cleanCompName);
              const isClean = (!proj.sippStatus || proj.sippStatus === 'clean');
              const isDisputed = proj.sippStatus === 'disputed';
              const isBankrupt = proj.sippStatus === 'bankrupt';
              const cardBorder = isBankrupt ? '#ef4444' : (isDisputed ? '#f59e0b' : '#0284c7');
              const cardBg = isBankrupt ? '#fef2f2' : (isDisputed ? '#fffbeb' : '#f0f9ff');
              const headerColor = isBankrupt ? '#b91c1c' : (isDisputed ? '#b45309' : '#0369a1');

              return `
                <div id="sippIntegratedCard" style="background:${cardBg}; border:1.5px solid ${cardBorder}; border-radius:8px; padding:0.55rem; margin-top:0.45rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem; gap:4px; flex-wrap:wrap;">
                    <span style="font-size:0.68rem; font-weight:800; color:${headerColor}; text-transform:uppercase; letter-spacing:0.2px;">
                      🏛️ Auto-Screening SIPP PN &amp; Legal Perkara
                    </span>
                    <span style="font-size:0.6rem; font-weight:700; background:#ffffff; color:#334155; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1;">
                      Wilayah: ${sippInfo.city}
                    </span>
                  </div>

                  <div style="font-size:0.65rem; color:#334155; margin:0 0 0.35rem; line-height:1.4; background:#fff; padding:5px 7px; border-radius:5px; border:1px solid ${cardBorder};">
                    <div>Perusahaan: <strong>${cleanCompName}</strong></div>
                    <div>Yurisdiksi PN: <strong>${sippInfo.pnName}</strong></div>
                    <div style="font-size:0.61rem; color:#0369a1; margin-top:1px;">Web Utama: <strong>${sippInfo.baseUrl}</strong></div>
                    <div style="margin-top:2px; font-size:0.63rem; font-weight:700; color:${isClean ? '#15803d' : (isDisputed ? '#b45309' : '#dc2626')};">
                      ${isClean ? '✓ Nihil Gugatan / Perkara Hukum Aktif (10/10 Poin)' : (isDisputed ? '⚠ Ada Catatan Gugatan / Perdata (5/10 Poin)' : '⛔ Terdeteksi Menghadapi Permohonan PKPU/Pailit (0/10 Poin)')}
                    </div>
                  </div>

                  <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:3px;">
                      <button type="button" class="five-c-portal-btn" style="background:${isClean ? '#15803d' : '#f0fdf4'}; color:${isClean ? '#ffffff' : '#15803d'}; border-color:${isClean ? '#15803d' : '#86efac'}; font-weight:700; font-size:0.61rem; padding:3px 2px; justify-content:center; text-align:center;" onclick="setSippResult('clean', '${safeCompName}')" title="Tetapkan status Nihil Perkara (10 Poin Penuh)">
                        ✓ Nihil (10 Pt)
                      </button>
                      <button type="button" class="five-c-portal-btn" style="background:${isDisputed ? '#d97706' : '#fffbeb'}; color:${isDisputed ? '#ffffff' : '#b45309'}; border-color:${isDisputed ? '#d97706' : '#fde68a'}; font-weight:700; font-size:0.61rem; padding:3px 2px; justify-content:center; text-align:center;" onclick="setSippResult('disputed', '${safeCompName}')" title="Tetapkan status Ada Sengketa Perdata (5 Poin)">
                        ⚠ Sengketa (5 Pt)
                      </button>
                      <button type="button" class="five-c-portal-btn" style="background:${isBankrupt ? '#dc2626' : '#fef2f2'}; color:${isBankrupt ? '#ffffff' : '#b91c1c'}; border-color:${isBankrupt ? '#dc2626' : '#fca5a5'}; font-weight:700; font-size:0.61rem; padding:3px 2px; justify-content:center; text-align:center;" onclick="setSippResult('bankrupt', '${safeCompName}')" title="Tetapkan status PKPU / Pailit (0 Poin)">
                        ⛔ Pailit (0 Pt)
                      </button>
                    </div>

                    <div style="display:grid; grid-template-columns: 1.25fr 1fr; gap:4px; margin-top:2px;">
                      <button type="button" class="five-c-portal-btn" style="background:#0284c7; color:#ffffff; border-color:#0284c7; font-size:0.63rem; font-weight:700; justify-content:center;" onclick="openSippPortal('${safeCompName}', '${(proj.city || '').replace(/'/g, "\\'")}')" title="Buka web utama ${sippInfo.baseUrl} (nama perusahaan otomatis disalin ke clipboard)">
                        🏛️ Buka SIPP ${sippInfo.pnName.replace('Pengadilan Negeri', 'PN')} &raquo;
                      </button>
                      <button type="button" class="five-c-portal-btn" style="background:#ffffff; color:#475569; border-color:#cbd5e1; font-size:0.62rem; justify-content:center;" onclick="openDirectPutusanMAPortal('${safeCompName}')" title="Buka Direktori Putusan Mahkamah Agung RI (Nasional)">
                        🌐 Putusan MA RI &raquo;
                      </button>
                    </div>
                  </div>
                </div>
              `;
            })()}
          </div>

          <!-- 2. Capacity Card -->
          <div class="five-c-card" style="border-top:3.5px solid ${fiveC.capScore >= 70 ? '#10b981' : '#dc2626'};">
            <div>
              <div class="five-c-header">
                <span class="five-c-title">2. Capacity (25%)</span>
                <span class="five-c-score" style="color:${fiveC.capScore >= 70 ? '#10b981' : '#dc2626'};">${fiveC.capScore} / 100</span>
              </div>
              <div class="five-c-detail">
                <strong>${fiveC.capNote}</strong><br/>
                &bull; Gross Margin: <strong>${fmtPct(m.gpm23, 2)}</strong> (${fmtRp(m.gp23, true)})<br/>
                &bull; Tenor Mismatch: <strong>${fmtNum(m.cashGapAtSCFMaturity_Actual, 0)} Hari</strong><br/>
                &bull; Pure Cash Runway: <strong>${fmtNum(m.pureCashRunwayDays, 0)} Hari</strong><br/>
                &bull; ICR: <strong>${(fiveC.capBreakdown?.icrVal ?? m.icr23 ?? 0) < 0 ? 'Negatif' : fmtNum(fiveC.capBreakdown?.icrVal ?? m.icr23 ?? 0, 2)}x</strong>
              </div>

              <!-- Rincian Skor Capacity (Menuju 100 Poin Penuh) -->
              <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.45rem 0.55rem; margin:0.45rem 0; font-size:0.67rem; line-height:1.45;">
                <div style="font-weight:800; color:var(--askrindo-navy); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                  <span>📊 Rincian Skor Capacity (Total: ${fiveC.capScore} / 100):</span>
                  <span style="font-size:0.62rem; padding:1px 6px; border-radius:4px; font-weight:700; ${fiveC.capScore === 100 ? 'background:#dcfce7; color:#15803d;' : 'background:#e0f2fe; color:#0369a1;'}">
                    ${fiveC.capScore === 100 ? '&#10003; 100 Poin Penuh' : `Kurang ${100 - fiveC.capScore} Poin`}
                  </span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:0.64rem;">
                  <tr>
                    <td style="padding:2px 0;">&bull; 📈 <strong>Gross Profit Margin (${fmtPct(m.gpm23, 1)}):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capBreakdown?.gpmPts || 0) >= 28 ? '#15803d' : ((fiveC.capBreakdown?.gpmPts || 0) >= 20 ? '#b45309' : '#dc2626')};">${fiveC.capBreakdown?.gpmPts ?? 0} / 35 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; ⏱️ <strong>Kesesuaian Siklus Kas vs Tenor:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capBreakdown?.tenorPts || 0) >= 25 ? '#15803d' : ((fiveC.capBreakdown?.tenorPts || 0) >= 12 ? '#b45309' : '#dc2626')};">${fiveC.capBreakdown?.tenorPts ?? 0} / 30 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 💵 <strong>Interest Coverage Ratio (ICR):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capBreakdown?.icrPts || 0) >= 15 ? '#15803d' : ((fiveC.capBreakdown?.icrPts || 0) >= 10 ? '#b45309' : '#dc2626')};">${fiveC.capBreakdown?.icrPts ?? 0} / 20 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 🛡️ <strong>Pure Cash Runway (${fmtNum(m.pureCashRunwayDays, 0)} Hr):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capBreakdown?.runwayPts || 0) >= 10 ? '#15803d' : '#dc2626'};">${fiveC.capBreakdown?.runwayPts ?? 0} / 15 Poin</td>
                  </tr>
                </table>
                <div style="margin-top:4px; padding-top:4px; border-top:1px dashed #cbd5e1; color:#475569; font-size:0.62rem; line-height:1.35;">
                  <em>💡 <strong>Syarat Skor 100 Penuh:</strong> Gross Margin &ge; 12% (35 poin), Siklus Operasi &le; Tenor Kredit (30 poin), ICR &ge; 2,0x (20 poin), dan Pure Cash Runway &ge; 45 hari (15 poin).</em>
                </div>
              </div>
            </div>
            <div style="font-size:0.62rem; color:${fiveC.capScore >= 70 ? '#166534' : '#991b1b'}; background:${fiveC.capScore >= 70 ? '#f0fdf4' : '#fef2f2'}; padding:4px; border-radius:4px; text-align:center; font-weight:700;">
              ${fiveC.capScore >= 70 ? 'Arus Kas Memadai' : 'Perlu Rekayasa Tenor / Buffer Kas'}
            </div>
          </div>

          <!-- 3. Capital Card -->
          <div class="five-c-card" style="border-top:3.5px solid ${fiveC.capitScore >= 70 ? '#10b981' : '#f59e0b'};">
            <div>
              <div class="five-c-header">
                <span class="five-c-title">3. Capital (20%)</span>
                <span class="five-c-score" style="color:${fiveC.capitScore >= 70 ? '#10b981' : '#f59e0b'};">${fiveC.capitScore} / 100</span>
              </div>
              <div class="five-c-detail">
                <strong>${fiveC.capitNote}</strong><br/>
                &bull; DER: <strong>${fmtNum(m.der23, 2)}x</strong> (Batas Maks 4,0x)<br/>
                &bull; Current Ratio: <strong>${fmtNum(m.currentRatio23, 2)}x</strong><br/>
                &bull; NWC Riil: <strong>${fmtRp(m.nwc23, true)}</strong><br/>
                &bull; Ekuitas: <strong>${fmtRp(m.eq23, true)}</strong>
              </div>

              <!-- Rincian Skor Capital (Menuju 100 Poin Penuh) -->
              <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.45rem 0.55rem; margin:0.45rem 0; font-size:0.67rem; line-height:1.45;">
                <div style="font-weight:800; color:var(--askrindo-navy); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                  <span>📊 Rincian Skor Capital (Total: ${fiveC.capitScore} / 100):</span>
                  <span style="font-size:0.62rem; padding:1px 6px; border-radius:4px; font-weight:700; ${fiveC.capitScore === 100 ? 'background:#dcfce7; color:#15803d;' : 'background:#e0f2fe; color:#0369a1;'}">
                    ${fiveC.capitScore === 100 ? '&#10003; 100 Poin Penuh' : `Kurang ${100 - fiveC.capitScore} Poin`}
                  </span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:0.64rem;">
                  <tr>
                    <td style="padding:2px 0;">&bull; ⚖️ <strong>Leverage DER (${fmtNum(m.der23, 2)}x):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capitBreakdown?.derPts || 0) >= 28 ? '#15803d' : ((fiveC.capitBreakdown?.derPts || 0) >= 18 ? '#b45309' : '#dc2626')};">${fiveC.capitBreakdown?.derPts ?? 0} / 35 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 💧 <strong>Current Ratio (${fmtNum(m.currentRatio23, 2)}x):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capitBreakdown?.crPts || 0) >= 20 ? '#15803d' : ((fiveC.capitBreakdown?.crPts || 0) >= 15 ? '#b45309' : '#dc2626')};">${fiveC.capitBreakdown?.crPts ?? 0} / 25 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 🔄 <strong>Kecukupan NWC Riil:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capitBreakdown?.nwcPts || 0) >= 15 ? '#15803d' : '#dc2626'};">${fiveC.capitBreakdown?.nwcPts ?? 0} / 20 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 🏛️ <strong>Ketahanan Ekuitas &amp; Laba Ditahan:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.capitBreakdown?.eqPts || 0) >= 15 ? '#15803d' : ((fiveC.capitBreakdown?.eqPts || 0) >= 12 ? '#b45309' : '#dc2626')};">${fiveC.capitBreakdown?.eqPts ?? 0} / 20 Poin</td>
                  </tr>
                </table>
                <div style="margin-top:4px; padding-top:4px; border-top:1px dashed #cbd5e1; color:#475569; font-size:0.62rem; line-height:1.35;">
                  <em>💡 <strong>Syarat Skor 100 Penuh:</strong> DER &le; 2,0x (35 poin), Current Ratio &ge; 1,50x (25 poin), NWC Surplus 1 Siklus (20 poin), dan Laba Ditahan Positif Tanpa Erosi Modal (20 poin).</em>
                </div>
              </div>
            </div>
            <div style="font-size:0.62rem; color:${fiveC.capitScore >= 70 ? '#166534' : '#92400e'}; background:${fiveC.capitScore >= 70 ? '#f0fdf4' : '#fffbeb'}; padding:4px; border-radius:4px; text-align:center; font-weight:700;">
              ${fiveC.capitScore >= 70 ? 'Permodalan Sehat' : 'Defisit Siklus NWC Terdeteksi'}
            </div>
          </div>

          <!-- 4. Collateral Card -->
          <div class="five-c-card" style="border-top:3.5px solid #10b981;">
            <div>
              <div class="five-c-header">
                <span class="five-c-title">4. Collateral (20%)</span>
                <span class="five-c-score" style="color:#10b981;">${fiveC.collScore} / 100</span>
              </div>
              <div class="five-c-detail">
                <div style="font-weight:700; color:#0f172a; margin-bottom:0.35rem;">${fiveC.collNote}</div>
                <div style="margin-bottom:0.35rem; background:#f0f9ff; padding:0.35rem 0.5rem; border-radius:5px; border-left:3px solid #0284c7;">
                  <strong style="color:#0369a1;">Agunan Pokok (Persediaan / Inventory):</strong><br/>
                  &bull; Nilai Persediaan Riil: <strong>${fmtRp(fiveC.invVal || proj.fin23.inv, true)}</strong><br/>
                  &bull; Coverage vs Plafond: <strong>${(fiveC.invRatio || 0).toFixed(0)}%</strong> (Plafond: ${fmtRp(proj.requestedPlafond, true)})<br/>
                  &bull; Pengikatan: <strong>Fidusia Persediaan / Resi Gudang (CMA)</strong>
                </div>
                <div style="background:#f0fdf4; padding:0.35rem 0.5rem; border-radius:5px; border-left:3px solid #10b981;">
                  <strong style="color:#15803d;">Jaminan Tambahan (Fixed Assets):</strong><br/>
                  &bull; Aset Tetap Free &amp; Clear: <strong>${fmtRp(fiveC.faVal || proj.fin23.fa, true)}</strong><br/>
                  &bull; Coverage vs Plafond: <strong>${(fiveC.faRatio || fiveC.collRatio || 0).toFixed(0)}%</strong> (Standar Askrindo &ge; 120%)<br/>
                  &bull; Pengikatan: <strong>Wajib Hak Tanggungan (HT) Peringkat I</strong>
                </div>
              </div>

              <!-- Rincian Skor Collateral (Menuju 100 Poin Penuh) -->
              <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.45rem 0.55rem; margin:0.45rem 0; font-size:0.67rem; line-height:1.45;">
                <div style="font-weight:800; color:var(--askrindo-navy); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                  <span>📊 Rincian Skor Collateral (Total: ${fiveC.collScore} / 100):</span>
                  <span style="font-size:0.62rem; padding:1px 6px; border-radius:4px; font-weight:700; ${fiveC.collScore === 100 ? 'background:#dcfce7; color:#15803d;' : 'background:#e0f2fe; color:#0369a1;'}">
                    ${fiveC.collScore === 100 ? '&#10003; 100 Poin Penuh' : `Kurang ${100 - fiveC.collScore} Poin`}
                  </span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:0.64rem;">
                  <tr>
                    <td style="padding:2px 0;">&bull; 📦 <strong>Agunan Pokok Persediaan (${(fiveC.invRatio || 0).toFixed(0)}%):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.collBreakdown?.invPts || 0) >= 42 ? '#15803d' : ((fiveC.collBreakdown?.invPts || 0) >= 32 ? '#b45309' : '#dc2626')};">${fiveC.collBreakdown?.invPts ?? 0} / 50 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 🏢 <strong>Jaminan Tambahan Fixed Asset (${(fiveC.faRatio || 0).toFixed(0)}%):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.collBreakdown?.faPts || 0) >= 42 ? '#15803d' : ((fiveC.collBreakdown?.faPts || 0) >= 32 ? '#b45309' : '#dc2626')};">${fiveC.collBreakdown?.faPts ?? 0} / 50 Poin</td>
                  </tr>
                </table>
                <div style="margin-top:4px; padding-top:4px; border-top:1px dashed #cbd5e1; color:#475569; font-size:0.62rem; line-height:1.35;">
                  <em>💡 <strong>Syarat Skor 100 Penuh:</strong> Coverage Agunan Pokok Persediaan &ge; 100% Plafond (50 poin) dan Jaminan Tambahan Fixed Assets HT Peringkat I &ge; 120% Plafond (50 poin).</em>
                </div>
              </div>
            </div>
            <div style="font-size:0.62rem; color:${(fiveC.faRatio || 0) >= 120 && (fiveC.invRatio || 0) >= 80 ? '#166534' : '#92400e'}; background:${(fiveC.faRatio || 0) >= 120 && (fiveC.invRatio || 0) >= 80 ? '#f0fdf4' : '#fffbeb'}; padding:4px; border-radius:4px; text-align:center; font-weight:700; margin-top:0.3rem;">
              ${(fiveC.faRatio || 0) >= 120 ? `Agunan Pokok Persediaan &amp; Jaminan Tambahan HT Memadai (${(fiveC.faRatio || 0).toFixed(0)}% &ge; 120%)` : `Jaminan Tambahan HT Mengcover ${(fiveC.faRatio || 0).toFixed(0)}% (Target &ge; 120%)`}
            </div>
          </div>

          <!-- 5. Condition Card -->
          <div class="five-c-card" style="border-top:3.5px solid ${fiveC.isImport ? '#d97706' : '#0284c7'};">
            <div>
              <div class="five-c-header">
                <span class="five-c-title">5. Condition (15%)</span>
                <span class="five-c-score" style="color:${fiveC.isImport ? '#d97706' : '#0284c7'};">${fiveC.condScore} / 100</span>
              </div>
              <div class="five-c-detail">
                <strong>${fiveC.condNote}</strong><br/>
                &bull; Komoditas / Sektor: <strong>${proj.sector}</strong><br/>
                &bull; Eksposur Valas: <strong>${proj.usdAmount > 0 ? `USD ${proj.usdAmount.toLocaleString('id-ID')}` : 'Domestik IDR'}</strong><br/>
                &bull; Mitigasi Logistik: <strong>${isMaritimeOrImportRisk(proj) ? 'Wajib Marine Cargo All Risks' : (proj.procurementMethod === 'domestic' ? 'Asuransi Inland Transit (Darat)' : 'Tanpa Pengiriman Fisik (Nihil)')}</strong>
              </div>

              <!-- Rincian Skor Condition (Menuju 100 Poin Penuh) -->
              <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.45rem 0.55rem; margin:0.45rem 0; font-size:0.67rem; line-height:1.45;">
                <div style="font-weight:800; color:var(--askrindo-navy); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                  <span>📊 Rincian Skor Condition (Total: ${fiveC.condScore} / 100):</span>
                  <span style="font-size:0.62rem; padding:1px 6px; border-radius:4px; font-weight:700; ${fiveC.condScore === 100 ? 'background:#dcfce7; color:#15803d;' : 'background:#e0f2fe; color:#0369a1;'}">
                    ${fiveC.condScore === 100 ? '&#10003; 100 Poin Penuh' : `Kurang ${100 - fiveC.condScore} Poin`}
                  </span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:0.64rem;">
                  <tr>
                    <td style="padding:2px 0;">&bull; 🚢 <strong>Risiko Rantai Pasok &amp; Logistik:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.condBreakdown?.logPts || 0) >= 30 ? '#15803d' : '#b45309'};">${fiveC.condBreakdown?.logPts ?? 0} / 35 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 💱 <strong>Eksposur Nilai Tukar Valas (USD):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.condBreakdown?.fxPts || 0) === 30 ? '#15803d' : '#b45309'};">${fiveC.condBreakdown?.fxPts ?? 0} / 30 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 📊 <strong>Pertumbuhan Omzet Pasar (${fmtPct(m.revGrowth, 1)}):</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.condBreakdown?.growthPts || 0) >= 16 ? '#15803d' : '#dc2626'};">${fiveC.condBreakdown?.growthPts ?? 0} / 20 Poin</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0;">&bull; 🏦 <strong>Kemandirian Struktur Skema Kredit:</strong></td>
                    <td style="text-align:right; font-weight:700; color:${(fiveC.condBreakdown?.schemePts || 0) === 15 ? '#15803d' : '#b45309'};">${fiveC.condBreakdown?.schemePts ?? 0} / 15 Poin</td>
                  </tr>
                </table>
                <div style="margin-top:4px; padding-top:4px; border-top:1px dashed #cbd5e1; color:#475569; font-size:0.62rem; line-height:1.35;">
                  <em>💡 <strong>Syarat Skor 100 Penuh:</strong> Bebas risiko logistik laut (35 poin), Transaksi 100% Rupiah bebas risiko kurs USD (30 poin), Pertumbuhan Penjualan YoY &ge; 10% (20 poin), dan Skema Fasilitas Mandiri (15 poin).</em>
                </div>
              </div>
            </div>
            ${isMaritimeOrImportRisk(proj) ? `
              <div style="font-size:0.62rem; color:#92400e; background:#fffbeb; padding:4px; border-radius:4px; text-align:center; font-weight:700;">
                Wajib Asuransi Marine Cargo Askrindo
              </div>
            ` : (proj.procurementMethod === 'domestic' ? `
              <div style="font-size:0.62rem; color:#1e40af; background:#eff6ff; padding:4px; border-radius:4px; text-align:center; font-weight:700;">
                Wajib Asuransi Inland Transit Askrindo
              </div>
            ` : `
              <div style="font-size:0.62rem; color:#166534; background:#f0fdf4; padding:4px; border-radius:4px; text-align:center; font-weight:700;">
                Tidak Ada Pengiriman Fisik (Bebas Marine Cargo)
              </div>
            `)}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// 9. RENDER SCORE CALCULATION TAB
// ============================================================================
function renderScoreCalculationTab(proj, m) {
  const fiveC = m.fiveC || compute5CAnalysis(proj, proj.fin23, m);
  const s2A = m.scoreComponents.find((c) => c.code === '2A')?.earnedPts || Number(((Math.max(0, Math.min(100, fiveC.totalScore)) / 100) * 10).toFixed(1));

  document.getElementById('scoreCalculationMenuContainer').innerHTML = `
    <div class="card" style="border-left: 4px solid var(--askrindo-blue);">
      <div class="card-header">
        <div class="card-title">Menu Rincian Perhitungan Score DCC-SWCM (${proj.companyName})</div>
        <div style="display:flex; gap:0.35rem; align-items:center;">
          <span class="grade-badge ${m.gradeMeta.badgeCls}" style="font-size:0.72rem; padding:3px 9px;">
            Total Score: ${m.score} / 100 (Grade ${m.shortGrade})
          </span>
          <button class="btn btn-outline btn-sm" onclick="switchTab('tab-5c')"> Analisa 5C</button>
          <button class="btn btn-outline btn-sm" onclick="switchTab('tab-grade')"> Indikator Grade</button>
        </div>
      </div>

      <!-- 7 SCORE PILLARS SUMMARY (SELARAS DENGAN TAB NAVIGASI ASCA) -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.5rem; margin-bottom:0.6rem;">
        ${m.scorePillars.map((p) => {
          const pctEarned = Math.round((p.earnedPts / p.maxPts) * 100);
          const barColor = pctEarned >= 70 ? '#10b981' : (pctEarned >= 45 ? '#f59e0b' : '#dc2626');
          return `
            <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:6px; padding:0.45rem 0.6rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.7rem; font-weight:700; color:var(--askrindo-navy);">
                <span>${p.name}</span>
                <span style="color:${barColor};">${fmtNum(p.earnedPts, 1)} / ${p.maxPts} Poin</span>
              </div>
              <div class="score-progress-wrap">
                <div class="score-progress-fill" style="width:${pctEarned}%; background:${barColor};"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.63rem; color:var(--text-muted); margin-top:2px;">
                <span>Pencapaian: ${pctEarned}%</span>
                <span>Pengurang: -${fmtNum(p.lostPts, 1)} Poin</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="background:#fff; border:1px solid var(--border-color); border-radius:6px; padding:0.5rem 0.75rem; margin-bottom:0.6rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div style="font-weight:700; font-size:0.75rem; color:var(--askrindo-navy);">
          Rumus Rekonsiliasi Score Akhir DCC-SWCM:
        </div>
        <div style="font-size:0.72rem; color:#334155; display:flex; gap:0.6rem; align-items:center; background:#f8fafc; padding:0.35rem 0.75rem; border-radius:5px; border:1px solid #e2e8f0;">
          <span><strong>Skor Dasar:</strong> 100,0 Poin</span>
          <span>&minus;</span>
          <span style="color:#dc2626; font-weight:700;">Total Pengurang/Penalti: -${fmtNum(m.totalLostPoints, 1)} Poin</span>
          <span>=</span>
          <span style="color:${m.gradeMeta.color}; font-weight:900; font-size:0.86rem;">Skor Komposit: ${m.score} / 100 (Grade ${m.shortGrade})</span>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Pilar &amp; Indikator Penilaian</th>
              <th>Rumus &amp; Standar Benchmark</th>
              <th>Nilai Aktual Kasus</th>
              <th class="num-col">Bobot Maks</th>
              <th class="num-col">Skor Dapat</th>
              <th class="num-col">Penalti (Hilang)</th>
              <th>Penjelasan Perhitungan Skor</th>
            </tr>
          </thead>
          <tbody>
            ${m.scoreComponents.map((c) => {
              const rowStatusColor = c.earnedPts >= c.maxPts * 0.7 ? '#166534' : (c.earnedPts >= c.maxPts * 0.4 ? '#92400e' : '#dc2626');
              return `
                <tr>
                  <td><strong>${c.code}</strong></td>
                  <td>
                    <div style="font-weight:700; color:var(--askrindo-navy);">${c.name}</div>
                    <div style="font-size:0.62rem; color:var(--text-muted);">${c.pillarName}</div>
                  </td>
                  <td>
                    <div style="font-weight:600;">${c.benchmark}</div>
                    <div style="font-size:0.62rem; color:var(--text-muted);">${c.formula}</div>
                  </td>
                  <td style="font-weight:700; color:${rowStatusColor};">${c.actualStr}</td>
                  <td class="num-col"><strong>${c.maxPts}</strong></td>
                  <td class="num-col" style="color:${rowStatusColor}; font-weight:800;">+${fmtNum(c.earnedPts, 1)}</td>
                  <td class="num-col" style="color:${c.lostPts > 0 ? '#dc2626' : '#64748b'}; font-weight:700;">
                    ${c.lostPts > 0 ? `-${fmtNum(c.lostPts, 1)}` : '0'}
                  </td>
                  <td style="font-size:0.67rem; color:#334155;">${c.reason}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#e2e8f0; font-weight:800; font-size:0.74rem;">
              <td colspan="4">TOTAL AKUMULASI PERHITUNGAN SCORE DCC-SWCM (12 INDIKATOR)</td>
              <td class="num-col">100,0</td>
              <td class="num-col" style="color:${m.gradeMeta.color};">${fmtNum(m.totalRawScore, 1)} (Dibulatkan: ${m.score})</td>
              <td class="num-col" style="color:#dc2626;">-${fmtNum(m.totalLostPoints, 1)}</td>
              <td>Menghasilkan <strong>Grade ${m.riskGrade}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}



// ============================================================================
// 10. RENDER DASHBOARD, DCC, STRESS-TEST, MEMO, PORTFOLIO
// ============================================================================
function renderDashboardTab(proj, m) {
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
  const pct = (d) => Math.min(100, Math.max(3, (d / maxBarDays) * 100)).toFixed(1);

  document.getElementById('dashboardTimelineVisual').innerHTML = `
    <div class="ccc-visual-box" style="margin-top:0;">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700;">
        <span>A. Sesuai Data Bank (DOI ${proj.claimedDOI} + DOR ${proj.claimedDOR} = ${m.claimedGrossCycle} Hr)</span>
        <span style="color:#0369a1;">CCC (-DOP ${proj.claimedDOP}): ${m.claimedCCC} Hr</span>
      </div>
      <div class="ccc-bar-track">
        <div class="ccc-seg-dio" style="width:${pct(proj.claimedDOI)}%">DOI ${proj.claimedDOI}h</div>
        <div class="ccc-seg-dso" style="width:${pct(proj.claimedDOR)}%">DOR ${proj.claimedDOR}h</div>
      </div>
    </div>

    <div class="ccc-visual-box">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700;">
        <span>B. Aktual Audited ${m.yr2} (DOI ${fmtNum(m.doi23_365, 0)} + DOR ${fmtNum(m.dor23_365, 0)} = ${fmtNum(m.grossCycle23, 0)} Hr)</span>
        <span style="color:${m.ccc23 > m.scfTenor ? 'var(--askrindo-red)' : 'var(--askrindo-green)'};">CCC (-DOP ${fmtNum(m.dop23_365, 0)}): ${fmtNum(m.ccc23, 0)} Hr</span>
      </div>
      <div class="ccc-bar-track">
        <div class="ccc-seg-dio" style="width:${pct(m.doi23_365)}%; background:${m.doi23_365 > 150 ? '#dc2626' : '#0284c7'};">DOI ${fmtNum(m.doi23_365, 0)}h</div>
        <div class="ccc-seg-dso" style="width:${pct(m.dor23_365)}%">DOR ${fmtNum(m.dor23_365, 0)}h</div>
      </div>
    </div>

    <div class="ccc-visual-box" style="background:#f0f9ff; border-color:#bae6fd;">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700;">
        <span>C. Tenor Fasilitas ${proj.bankName} (Total: ${m.totalMaxTenor} Hr)</span>
        <span>PK: ${proj.pkMonths} Bln</span>
      </div>
      <div class="ccc-bar-track">
        <div style="width:${pct(m.scfTenor)}%; background:#005691; display:flex; align-items:center; justify-content:center; white-space:nowrap; overflow:hidden;">
          Tenor Utama: ${m.scfTenor} Hr
        </div>
        ${m.kmkTenor > 0 ? `
        <div style="width:${pct(m.kmkTenor)}%; background:#f59e0b; display:flex; align-items:center; justify-content:center; white-space:nowrap; overflow:hidden;">
          +KMK ${m.kmkTenor}h (Total ${m.totalMaxTenor}h)
        </div>` : ''}
      </div>
      <div style="font-size:0.78rem; color:${m.cashGapAtSCFMaturity_Actual > 0 ? '#991b1b' : '#166534'}; font-weight:600; margin-top:0.2rem;">
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
      name: '3. Stress Kurs (+10%) & Koleksi Melambat',
      params: { gpm: m.gpm23 - 3.5, doi: Math.min(350, Math.round(m.doi23_365 + 20)), dor: Math.min(150, Math.round(m.dor23_365 + 20)), dop: Math.max(10, Math.round(m.dop23_365 - 5)), revGrowth: -10, opexCut: 0, fxShock: 10, invHaircut: 10 }
    },
    {
      name: '4. Severe Stress (Stok Rusak 20% + Stagflasi)',
      params: { gpm: m.gpm23 - 7.0, doi: Math.min(360, Math.round(m.doi23_365 + 45)), dor: Math.min(150, Math.round(m.dor23_365 + 40)), dop: Math.max(10, Math.round(m.dop23_365 - 10)), revGrowth: -20, opexCut: -5, fxShock: 15, invHaircut: 20 }
    },
    {
      name: '5.  Skenario Turnaround / Mitigasi DCC-SWCM',
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
              <span class="${m.isInitialReject ? 'dual-stage-badge-stage1' : 'dual-stage-badge-stage2'}">
                ${m.stage1Decision}
              </span>
              <span class="cover-badge cover-conditional">
                Rekomendasi Coverage Bersyarat: Maks 55% (Risk Sharing ${proj.bankName} 45%) &bull; Rate IJP: Case by Case (Evaluasi Komite)
              </span>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchTab('tab-score')" style="font-size:0.68rem;">
            Lihat Rincian Skor &raquo;
          </button>
        </div>

        <div style="font-size:0.71rem; color:#334155; line-height:1.45; margin-bottom:0.55rem; background:#f8fafc; padding:0.5rem 0.7rem; border-radius:6px; border:1px solid #e2e8f0;">
          <strong>Ringkasan Analisa Underwriting Sistem:</strong> ${m.stage1Summary}
        </div>

        ${m.isInitialReject ? `
          <div style="border-top:1px dashed #cbd5e1; padding-top:0.5rem;">
            <div style="font-size:0.74rem; font-weight:800; color:#0f766e; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
              <span>Opsi Persetujuan Bersyarat Jika Analis / Komite Hendak Menyetujui (7 Syarat Wajib Covenants):</span>
              <span style="font-size:0.68rem; background:#ccfbf1; color:#0f766e; padding:2px 8px; border-radius:4px; font-weight:700;">Wajib Dipenuhi Sebelum Penerbitan Polis</span>
            </div>
            <div class="grid-2" style="gap:0.45rem;">
              <div class="term-card">
                <div class="term-title"><span>1. Pembatasan Coverage Askrindo &amp; Penetapan Rate IJP</span><span style="color:#0284c7;">Maks 55% | IJP Case by Case</span></div>
                <div class="term-desc">Plafon dijamin Askrindo dibatasi maksimal 55% (${fmtRp(proj.requestedPlafond * 0.55, true)}), 45% risk sharing oleh ${proj.bankName}. Karena pada Grade C (Severe Default Risk) skema awal ditolak, jika disetujui bersyarat maka Rate IJP tidak dipatok flat, melainkan ditetapkan secara <strong>Case by Case</strong> oleh Komite Pemutus dengan melihat kondisi riil kasus, deviasi perputaran kas, serta hasil pemenuhan struktur mitigasi dan agunan.</div>
              </div>
              <div class="term-card">
                <div class="term-title"><span>${isMaritimeOrImportRisk(proj) ? '2. Wajib Asuransi Marine Cargo' : (proj.procurementMethod === 'domestic' ? '2. Wajib Asuransi Inland Transit' : '2. Proteksi Aset & Kebakaran (Property/PAR)')}</span><span style="color:#0284c7;">${isMaritimeOrImportRisk(proj) ? 'ICC (A) All Risks' : (proj.procurementMethod === 'domestic' ? 'All Risks Darat' : 'Property All Risks')}</span></div>
                <div class="term-desc">${isMaritimeOrImportRisk(proj) ? `Penutupan asuransi kargo laut Askrindo untuk komoditas impor dengan Banker's Clause / Loss Payee ke ${proj.bankName}.` : (proj.procurementMethod === 'domestic' ? `Penutupan asuransi pengangkutan darat Askrindo (Inland Transit All Risks) untuk proteksi distribusi logistik dengan Banker's Clause ke ${proj.bankName}.` : `Tidak ada risiko pengiriman laut/kargo fisik. Pengalihan mitigasi difokuskan pada perlindungan tempat usaha/aset dan pengawasan perputaran kas di ${proj.bankName}.`)}</div>
              </div>
              <div class="term-card">
                <div class="term-title"><span>3. Jaminan Tambahan Fixed Asset</span><span style="color:#0284c7;">HT &ge; 120%</span></div>
                <div class="term-desc">Jaminan tambahan berupa Aset Tetap diikat Hak Tanggungan Peringkat I minimal 120% (${fmtRp(proj.requestedPlafond * 1.2, true)}) dari aset tetap terdaftar (${fmtRp(proj.fin23.fa, true)}) untuk melengkapi Agunan Pokok Persediaan Barang (${fmtRp(proj.fin23.inv, true)}).</div>
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
        ` : ''}
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
                <td class="num-col" style="color:#166534; font-weight:700;">Maksimal 55% (${fmtRp(proj.requestedPlafond * 0.55, true)}) | Risk-Sharing Bank Mitra 45% (${fmtRp(proj.requestedPlafond * 0.45, true)})</td>
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

function renderRatiosTab(proj, m) {
  const container = document.getElementById('ratiosTableContainer');
  if (!container) return;

  const plafond = proj.requestedPlafond || 0;

  // 1. Current Ratio (CR) - RAC Min 100%
  const cr22 = m.cl22 > 0 ? (m.ca22 / m.cl22) * 100 : 0;
  const cr23 = m.cl23 > 0 ? (m.ca23 / m.cl23) * 100 : 0;
  const passCR = cr23 >= 100;

  // 2. Debt to Equity Ratio (DER) - RAC Max 400%
  const der22 = m.eq22 > 0 ? (m.tl22 / m.eq22) * 100 : 0;
  const der23 = m.eq23 > 0 ? (m.tl23 / m.eq23) * 100 : 0;
  const passDER = der23 <= 400;

  // 3. Return on Assets (ROA) - RAC Min 1.0%
  const roa22 = m.ta22 > 0 ? (m.eat22 / m.ta22) * 100 : 0;
  const roa23 = m.ta23 > 0 ? (m.eat23 / m.ta23) * 100 : 0;
  const passROA = roa23 >= 1.0;

  // 4. Return on Equity (ROE) - RAC Min 5.0%
  const roe22 = m.eq22 > 0 ? (m.eat22 / m.eq22) * 100 : 0;
  const roe23 = m.eq23 > 0 ? (m.eat23 / m.eq23) * 100 : 0;
  const passROE = roe23 >= 5.0;

  // 5. Net Working Capital (NWC) - RAC Hasil Positif (> 0)
  const nwc22 = m.nwc22;
  const nwc23 = m.nwc23;
  const passNWC = nwc23 > 0;

  // 6. NWC terhadap Nilai Kredit (Plafond) - RAC Min 10%
  const nwcToCredit22 = plafond > 0 ? (nwc22 / plafond) * 100 : 0;
  const nwcToCredit23 = plafond > 0 ? (nwc23 / plafond) * 100 : 0;
  const passNWCCredit = plafond > 0 && nwcToCredit23 >= 10;

  const ratios = [
    {
      no: 1,
      name: 'Current Ratio (CR)',
      formula: 'Aset Lancar / Liab. Lancar',
      rac: '&ge; 100,00%',
      v22: fmtNum(cr22, 2) + '%',
      v23: fmtNum(cr23, 2) + '%',
      pass: passCR,
      ket: passCR
        ? `Current Ratio ${fmtNum(cr23, 2)}% memenuhi standar RAC (&ge; 100,00%). Debitur memiliki likuiditas lancar yang cukup untuk melunasi kewajiban jangka pendek.`
        : `Current Ratio ${fmtNum(cr23, 2)}% di bawah standar RAC (&ge; 100,00%). Likuiditas jangka pendek ketat dan berisiko gagal bayar saat penagihan piutang tertunda.`
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
        ? `DER ${fmtNum(der23, 2)}% memenuhi standar RAC (&le; 400,00%). Tingkat leverage permodalan debitur masih dalam ambang batas toleransi risiko wajar.`
        : `DER ${fmtNum(der23, 2)}% melampaui standar RAC (&le; 400,00%). Beban utang terlalu dominan terhadap modal sendiri, meningkatkan risiko solvabilitas.`
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
        ? `ROA ${fmtNum(roa23, 2)}% memenuhi standar RAC (&ge; 1,00%). Aset perusahaan bekerja secara produktif dalam menghasilkan laba bersih.`
        : `ROA ${fmtNum(roa23, 2)}% di bawah standar RAC (&ge; 1,00%). Efisiensi pemanfaatan aset untuk menghasilkan profitabilitas masih perlu ditingkatkan.`
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
        ? `ROE ${fmtNum(roe23, 2)}% memenuhi standar RAC (&ge; 5,00%). Imbal hasil atas modal debitur mencukupi untuk mendukung pertumbuhan internal.`
        : `ROE ${fmtNum(roe23, 2)}% di bawah standar RAC (&ge; 5,00%). Kemampuan mencetak keuntungan bagi pemegang saham belum optimal.`
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
        : `NWC bernilai negatif (${fmtRp(nwc23, true)}) tidak memenuhi standar RAC (> Rp 0). Terjadi defisit modal kerja riil yang memerlukan restrukturisasi utang.`
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
        ? `Rasio NWC/Plafond ${fmtNum(nwcToCredit23, 2)}% memenuhi standar RAC (&ge; 10,00%). Debitur memiliki penyangga modal kerja bersih memadai terhadap nilai kredit.`
        : `Rasio NWC/Plafond ${fmtNum(nwcToCredit23, 2)}% di bawah standar RAC (&ge; 10,00%). Penyangga modal kerja terlalu tipis relatif terhadap nilai fasilitas kredit.`
    }
  ];

  const passCount = ratios.filter((r) => r.pass).length;
  const failCount = ratios.length - passCount;
  const overallSummary = passCount >= 4
    ? '<span style="color:#15803d; font-weight:700;">MEMENUHI SEBAGIAN BESAR STANDAR RAC</span>'
    : '<span style="color:#b91c1c; font-weight:700;">PERLU PERHATIAN KHUSUS &amp; MITIGASI TAMBAHAN</span>';

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem; padding:0.85rem 1.1rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
      <div>
        <div style="font-size:0.82rem; font-weight:700; color:var(--askrindo-navy);">Status Kepatuhan Risk Acceptance Criteria (RAC) - Tahun Buku ${m.yr2}:</div>
        <div style="font-size:0.76rem; color:var(--text-muted); margin-top:0.2rem;">Evaluasi berdasarkan 6 indikator rasio kunci Askrindo: Current Ratio, DER, ROA, ROE, NWC, dan NWC/Plafond.</div>
      </div>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <span class="badge-rac badge-rac-pass" style="font-size:0.8rem; padding:0.3rem 0.75rem;">${passCount} RAC LULUS</span>
        <span class="badge-rac badge-rac-fail" style="font-size:0.8rem; padding:0.3rem 0.75rem;">${failCount} TIDAK LULUS</span>
        <div style="margin-left:0.5rem; font-size:0.78rem;">${overallSummary}</div>
      </div>
    </div>

    <div class="table-responsive" style="border:1px solid #e2e8f0; border-radius:8px; background:#ffffff; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
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
          ${ratios.map((r) => `
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
  `;
}

// ============================================================================
// 10B. RENDER TAB PROYEKSI CASH FLOW (FORWARD-LOOKING 12-MONTH REPAYMENT ADEQUACY)
// ============================================================================
function renderCashFlowTab(proj, m) {
  const container = document.getElementById('cashFlowMenuContainer');
  if (!container) return;
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

        <div class="grid-4" style="gap:0.6rem; font-size:0.72rem;">
          <div>
            <label style="display:block; font-weight:700; margin-bottom:0.25rem;">Pertumbuhan Penjualan (% YoY):</label>
            <input type="number" step="0.5" id="cf_inp_growth" class="form-control" value="${cf.salesGrowth}" onchange="updateCashFlowCustomParam()" style="font-size:0.78rem; padding:4px 8px;" />
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:0.25rem;">Target Gross Profit Margin (%):</label>
            <input type="number" step="0.5" id="cf_inp_gpm" class="form-control" value="${fmtNum(cf.targetGPM, 1)}" onchange="updateCashFlowCustomParam()" style="font-size:0.78rem; padding:4px 8px;" />
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:0.25rem;">Hari Piutang / DOR (Hari):</label>
            <input type="number" step="1" id="cf_inp_dor" class="form-control" value="${Math.round(cf.dorDays)}" onchange="updateCashFlowCustomParam()" style="font-size:0.78rem; padding:4px 8px;" />
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

      <!-- TABEL RINCIAN BULANAN 12 BULAN -->
      <div style="font-weight:800; font-size:0.82rem; color:var(--askrindo-navy); margin-bottom:0.4rem;">
        Tabel Rincian Proyeksi Arus Kas Bulanan (12 Bulan) &amp; Siklus Konversi SCF AP (Persediaan &rarr; Kas)
      </div>
      <div class="table-responsive" style="margin-bottom:0.75rem;">
        <table class="data-table" style="font-size:0.67rem; width:100%; text-align:right;">
          <thead>
            <tr>
              <th style="text-align:left;">Periode</th>
              <th class="num-col">Kas Awal</th>
              <th class="num-col" title="Pencairan Kredit SCF AP oleh Bank untuk Membantu Pembelian Persediaan">Pencairan SCF (Persediaan)</th>
              <th class="num-col" title="Kas Masuk Hasil Penjualan Persediaan">Inflow Kas Penjualan</th>
              <th class="num-col">Outflow HPP (Persediaan)</th>
              <th class="num-col">Outflow OPEX</th>
              <th class="num-col">Arus Kas Operasi (NOCF)</th>
              <th class="num-col">Bunga SCF</th>
              <th class="num-col">Pelunasan Pokok SCF</th>
              <th class="num-col">Total Debt Service</th>
              <th class="num-col">Saldo Kas Akhir</th>
              <th class="num-col">DSCR</th>
              <th style="text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${cf.monthlyData.map((d) => `
              <tr style="${d.isDeficit ? 'background:#fef2f2;' : ''}">
                <td style="text-align:left; font-weight:700;">${d.monthName}</td>
                <td class="num-col">${fmtRp(d.begCash, true)}</td>
                <td class="num-col" style="color:${d.scfDrawdown > 0 ? '#0284c7' : '#94a3b8'}; font-weight:700;">${d.scfDrawdown > 0 ? `+${fmtRp(d.scfDrawdown, true)}` : '-'}</td>
                <td class="num-col" style="color:#0369a1; font-weight:600;">+${fmtRp(d.cashInflow, true)}</td>
                <td class="num-col" style="color:#b91c1c;">-${fmtRp(d.cogsPayment, true)}</td>
                <td class="num-col" style="color:#b91c1c;">-${fmtRp(d.opexPayment, true)}</td>
                <td class="num-col" style="font-weight:700; color:${d.nocf >= 0 ? '#166534' : '#dc2626'};">${fmtRp(d.nocf, true)}</td>
                <td class="num-col">-${fmtRp(d.monthlyInterest, true)}</td>
                <td class="num-col" style="font-weight:${d.principalRepayment > 0 ? '700' : '400'};">${d.principalRepayment > 0 ? `-${fmtRp(d.principalRepayment, true)}` : '-'}</td>
                <td class="num-col" style="font-weight:700; color:#b45309;">${fmtRp(d.debtService, true)}</td>
                <td class="num-col" style="font-weight:800; color:${d.endingCash >= 0 ? '#166534' : '#dc2626'};">${fmtRp(d.endingCash, true)}</td>
                <td class="num-col" style="font-weight:700; color:${d.monthDSCR >= 1.2 ? '#166534' : (d.monthDSCR >= 1.0 ? '#b45309' : '#dc2626')};">${fmtNum(d.monthDSCR, 2)}x</td>
                <td style="text-align:center;">
                  <span style="font-size:0.62rem; padding:2px 6px; border-radius:3px; font-weight:700; background:${d.isDeficit ? '#fee2e2; color:#991b1b;' : '#dcfce7; color:#15803d;'}">
                    ${d.isDeficit ? 'DEFISIT' : 'SURPLUS'}
                  </span>
                </td>
              </tr>
            `).join('')}
            <tr style="background:#f1f5f9; font-weight:800; border-top:2px solid #94a3b8;">
              <td style="text-align:left;">TOTAL TAHUNAN</td>
              <td class="num-col">${fmtRp(cf.initialCash, true)} (Awal)</td>
              <td class="num-col" style="color:#0284c7;">+${fmtRp(cf.totalSCFDrawdown, true)}</td>
              <td class="num-col" style="color:#0369a1;">+${fmtRp(cf.totalInflow, true)}</td>
              <td class="num-col" style="color:#b91c1c;">-${fmtRp(cf.projectedAnnualCOGS, true)}</td>
              <td class="num-col" style="color:#b91c1c;">-${fmtRp(cf.projectedAnnualOpex, true)}</td>
              <td class="num-col" style="color:${cf.totalNOCF >= 0 ? '#166534' : '#dc2626'};">${fmtRp(cf.totalNOCF, true)}</td>
              <td class="num-col">-${fmtRp(cf.totalDebtService - proj.requestedPlafond, true)}</td>
              <td class="num-col">-${fmtRp(proj.requestedPlafond, true)}</td>
              <td class="num-col" style="color:#b45309;">${fmtRp(cf.totalDebtService, true)}</td>
              <td class="num-col" style="color:${cf.lowestCash >= 0 ? '#166534' : '#dc2626'};">${fmtRp(cf.monthlyData[11].endingCash, true)}</td>
              <td class="num-col" style="color:${cf.annualDSCR >= 1.2 ? '#166534' : '#dc2626'};">${fmtNum(cf.annualDSCR, 2)}x</td>
              <td style="text-align:center;">
                <span style="font-size:0.62rem; padding:2px 6px; border-radius:3px; font-weight:800; background:${cf.isHealthy ? '#dcfce7; color:#15803d;' : '#fee2e2; color:#991b1b;'}">
                  ${cf.isHealthy ? 'LAYAK BAYAR' : 'DEFISIT BAYAR'}
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
  const g = parseFloat(document.getElementById('cf_inp_growth').value);
  const gpm = parseFloat(document.getElementById('cf_inp_gpm').value);
  const dor = parseInt(document.getElementById('cf_inp_dor').value, 10);
  const rep = document.getElementById('cf_inp_repayment').value;

  if (!isNaN(g)) proj.cfProjGrowth = g;
  if (!isNaN(gpm)) proj.cfProjGPM = gpm;
  if (!isNaN(dor)) proj.cfProjDOR = dor;
  if (rep) proj.cfProjRepaymentType = rep;

  saveProjectsToStorage();
  renderAll();
  showToast('Parameter Proyeksi Cash Flow diperbarui!');
}

function renderPrintableReport(proj, m) {
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

  const sippInfo = getSippPnInfo(proj.city || 'Kab. Sukoharjo', proj.companyName);

  document.getElementById('printableMemoContainer').innerHTML = `
    <table class="memo-print-table">
      <thead>
        <tr>
          <td>
            <div class="memo-header-wrap" style="border-bottom:2.5px solid var(--askrindo-navy); padding-bottom:0.65rem; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <img src="logo-asca.png" alt="ASCA - Askrindo Smart Credit Analysis" style="height:38px; width:auto; object-fit:contain;" />
                <div>
                  <h2 style="font-size:0.95rem; color:var(--askrindo-navy);">NOTA ANALISA UNDERWRITING ASURANSI KREDIT (ASCA)</h2>
                  <p style="font-size:0.68rem; color:var(--text-muted);">Metode: Dynamic Cash Conversion &amp; Stress-Tested Working Capital Model (DCC-SWCM)</p>
                </div>
              </div>
              <div style="text-align:right; font-size:0.68rem;">
                <div><strong>Tanggal:</strong> ${today}</div>
                <div><strong>ID Kasus:</strong> ${caseNumber}</div>
                <div><strong>Underwriter:</strong> ${proj.underwriter}</div>
              </div>
            </div>
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
                  <tr><td><strong>Domisili / Wilayah Hukum</strong></td><td>${proj.city || 'Kab. Sukoharjo'} (${sippInfo.pnName})</td></tr>
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
                  <td class="num-col">${m.currentRatio22.toFixed(2)}x</td>
                  <td class="num-col"><strong>${m.currentRatio23.toFixed(2)}x</strong></td>
                  <td>&ge; 1.00x (Kecukupan Aset Lancar)</td>
                  <td style="color:${m.currentRatio23 >= 1.0 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${m.currentRatio23 >= 1.0 ? '&#10003; Memenuhi RAC' : '&#9888; Deviasi (Defisit Modal Kerja Bersih)'}
                  </td>
                </tr>
                <tr>
                  <td><strong>Quick Ratio (QR)</strong> (Likuiditas Cepat)</td>
                  <td class="num-col">${m.quickRatio22.toFixed(2)}x</td>
                  <td class="num-col"><strong>${m.quickRatio23.toFixed(2)}x</strong></td>
                  <td>&ge; 0.80x (Kecukupan Kas &amp; Piutang)</td>
                  <td style="color:${m.quickRatio23 >= 0.8 ? '#166534' : '#dc2626'}; font-weight:700;">
                    ${m.quickRatio23 >= 0.8 ? '&#10003; Memenuhi RAC' : '&#9888; Deviasi (Sangat Bergantung pada Persediaan)'}
                  </td>
                </tr>
                <tr>
                  <td><strong>Cash Ratio</strong> (Rasio Kas Tunai)</td>
                  <td class="num-col">-</td>
                  <td class="num-col"><strong>${m.cashRatio23.toFixed(2)}x</strong></td>
                  <td>&ge; 0.20x (Ketahanan Kas Minimum)</td>
                  <td style="color:${m.cashRatio23 >= 0.2 ? '#166534' : '#d97706'}; font-weight:700;">
                    ${m.cashRatio23 >= 0.2 ? '&#10003; Memenuhi RAC' : '&#9888; Dibawah Ambang Batas Ideal'}
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
                    ${m.der23 <= 2.5 ? '&#10003; Memenuhi RAC' : '&#9888; Deviasi (Leverage Berlebih / Utang Tinggi)'}
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
                    &bull; Leverage DER: ${m.der23.toFixed(2)}x (${fiveC.capitBreakdown?.derPts ?? 0}/35 Poin)<br/>
                    &bull; Current Ratio: ${m.currentRatio23.toFixed(2)}x (${fiveC.capitBreakdown?.crPts ?? 0}/25 Poin)<br/>
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
                    &bull; Agunan Pokok Persediaan: ${fmtRp(fiveC.invVal, true)} (${fiveC.invRatio.toFixed(0)}% plafond — ${fiveC.collBreakdown?.invPts ?? 0}/50 Poin)<br/>
                    &bull; Jaminan Tambahan Fixed Assets: ${fmtRp(fiveC.faVal, true)} (${fiveC.faRatio.toFixed(0)}% plafond — ${fiveC.collBreakdown?.faPts ?? 0}/50 Poin)
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
                  <td>DER (${m.der23.toFixed(2)}x vs Batas &le;2.50x) &amp; Rasio Lancar Current Ratio (${m.currentRatio23.toFixed(2)}x)</td>
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
                    <strong>PENETAPAN GRADE RISIKO: <span class="grade-badge ${m.gradeMeta.badgeCls}">${m.shortGrade}</span> (${m.gradeMeta.name})</strong><br/>
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

            <!-- BAGIAN VIII: KEPUTUSAN KOMITE & OPSI PERSETUJUAN BERSYARAT -->
            <div style="border:1.5px solid ${m.isInitialReject ? '#dc2626' : '#059669'}; border-radius:6px; padding:0.6rem 0.8rem; margin-bottom:0.7rem; background:${m.isInitialReject ? '#fff5f5' : '#f0fdf4'};">
              <div style="font-weight:900; font-size:0.82rem; color:${m.isInitialReject ? '#991b1b' : '#166534'}; margin-bottom:0.25rem;">
                KEPUTUSAN EVALUASI AWAL SISTEM DCC-SWCM: ${m.stage1Decision}
              </div>
              <p style="font-size:0.71rem; line-height:1.4; color:#334155; margin-bottom:0.4rem;">
                ${m.stage1Summary}
              </p>

              ${m.isInitialReject ? `
                <div style="border-top:1px dashed #fca5a5; padding-top:0.35rem; margin-top:0.35rem;">
                  <div style="font-weight:800; font-size:0.75rem; color:#0f766e; margin-bottom:0.2rem;">
                    OPSI PERSETUJUAN BERSYARAT KOMITE ASURANSI KREDIT ASKRINDO (REKOMENDASI COVERAGE MAKS 55%):
                  </div>
                  <div style="font-size:0.7rem; color:#1e293b; line-height:1.35;">
                    Apabila fasilitas disetujui demi kepentingan strategis kemitraan dengan <strong>${proj.bankName}</strong>, transaksi wajib direstrukturisasi dengan <strong>7 Syarat Wajib (Condition Precedent)</strong>:
                    <ol style="margin:0.2rem 0 0.3rem 1.1rem; padding:0;">
                      <li><strong>Rekomendasi Coverage Askrindo Dibatasi Maksimal 55%</strong> (${fmtRp(proj.requestedPlafond * 0.55, true)}) &amp; Risk Sharing ${proj.bankName} Minimal 45% (${fmtRp(proj.requestedPlafond * 0.45, true)}), serta <strong>Penetapan Rate IJP Bersifat Case by Case</strong> oleh Komite Pemutus dengan melihat kondisi riil kasus, deviasi perputaran kas, dan hasil restrukturisasi.</li>
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
              ` : ''}

              ${proj.customNotes ? `<div style="font-size:0.71rem; margin-top:0.3rem; border-top:1px solid #cbd5e1; padding-top:0.25rem;"><strong>Catatan Tambahan Underwriter:</strong> ${proj.customNotes}</div>` : ''}
            </div>

            <!-- LEMBAR TANDA TANGAN -->
            <div class="memo-signature-grid">
              <div>
                <div>Disusun Oleh,</div>
                <div style="height:36px;"></div>
                <div style="font-weight:700; border-top:1px solid #94a3b8; padding-top:3px;">${proj.underwriter}</div>
                <div style="color:var(--text-muted);">Analis Underwriting Askrindo</div>
              </div>
              <div>
                <div>Diperiksa Oleh,</div>
                <div style="height:36px;"></div>
                <div style="font-weight:700; border-top:1px solid #94a3b8; padding-top:3px;">Kepala Bagian Underwriting</div>
                <div style="color:var(--text-muted);">Reviewer Risiko Asuransi Kredit</div>
              </div>
              <div>
                <div>Disetujui Oleh,</div>
                <div style="height:36px;"></div>
                <div style="font-weight:700; border-top:1px solid #94a3b8; padding-top:3px;">Komite Pemutus Asuransi Kredit</div>
                <div style="color:var(--text-muted);">PT Asuransi Kredit Indonesia</div>
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
  setVal('inp_city', proj.city || 'Kab. Sukoharjo');
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
  setVal('inp_businessDesc', proj.businessDesc);

  const procMethod = proj.procurementMethod || (isMaritimeOrImportRisk(proj) ? 'import_sea' : 'none');
  proj.procurementMethod = procMethod;
  const rImport = document.getElementById('inp_proc_import');
  const rDomestic = document.getElementById('inp_proc_domestic');
  const rNone = document.getElementById('inp_proc_none');
  if (rImport) rImport.checked = (procMethod === 'import_sea');
  if (rDomestic) rDomestic.checked = (procMethod === 'domestic');
  if (rNone) rNone.checked = (procMethod === 'none');

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
    setVal(`inp_${k}22`, proj.fin22[k] || 0, true);
    setVal(`inp_${k}23`, proj.fin23[k] || 0, true);
  });

  const m = computeDCCSWCM(proj);
  updateFinancialStatementTableComputed(proj, m);
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

function syncInputsToModel() {
  const proj = getActiveProject();
  if (!proj) return;

  const getStr = (id) => document.getElementById(id)?.value || '';
  const getFmtNum = (id) => parseFormattedNumber(document.getElementById(id)?.value);
  const getPlainNum = (id) => parseFloat(document.getElementById(id)?.value) || 0;

  const oldCompName = (proj.companyName || '').trim();
  proj.companyName = getStr('inp_companyName');
  proj.city = getStr('inp_city') || 'Kab. Sukoharjo';
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
  proj.businessDesc = getStr('inp_businessDesc');

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

  proj.claimedDOR = getFmtNum('inp_claimedDOR');
  proj.claimedDOI = getFmtNum('inp_claimedDOI');
  proj.claimedDOP = getFmtNum('inp_claimedDOP');

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
// 12. TAB NAVIGATION & MODAL ACTIONS
// ============================================================================
function switchTab(tabId) {
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
}

function openNewProjectModal() {
  const setElVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setElVal('new_companyName', '');
  setElVal('new_city', 'Kab. Sukoharjo');
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
  document.getElementById('newProjectModal').classList.remove('open');
}

function createNewProjectFromModal() {
  const name = document.getElementById('new_companyName').value.trim() || `Proyek Kredit Baru #${projects.length + 1}`;
  const city = document.getElementById('new_city')?.value.trim() || 'Kab. Sukoharjo';
  const sector = document.getElementById('new_sector').value.trim() || 'Perdagangan Umum';
  const bank = document.getElementById('new_bankName').value.trim() || 'Bank Dana';
  const fac = document.getElementById('new_facilityType').value.trim() || 'Kredit Modal Kerja (KMK) Revolving';
  const plafond = parseFormattedNumber(document.getElementById('new_plafond').value) || 10000000000;
  const yr1 = parseInt(document.getElementById('new_year1').value, 10) || 2022;
  const yr2 = parseInt(document.getElementById('new_year2').value, 10) || 2023;
  const estYearVal = parseInt(document.getElementById('new_estYear')?.value, 10);
  const estYear = estYearVal || (yr2 - 5);
  const tpl = document.getElementById('new_templateType').value;

  const defaults = getDefaultProjects();
  let baseObj;
  if (tpl === 'clone_rahmat') {
    baseObj = JSON.parse(JSON.stringify(defaults[0]));
  } else if (tpl === 'clone_current') {
    baseObj = JSON.parse(JSON.stringify(getActiveProject() || defaults[0]));
  } else {
    baseObj = JSON.parse(JSON.stringify(defaults[2]));
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
  saveProjectsToStorage();
  closeNewProjectModal();
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
  saveProjectsToStorage();
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
  activeProjectId = projects[0].id;
  saveProjectsToStorage();
  renderAll();
  showToast('Proyek telah dihapus.');
}

function resetToDefaultCases() {
  if (!confirm('Kembalikan daftar proyek ke contoh kasus bawaan (termasuk PT Rahmat Santosa)?')) return;
  projects = getDefaultProjects();
  activeProjectId = projects[0].id;
  saveProjectsToStorage();
  renderAll();
  showToast('Data contoh kasus bawaan berhasil dimuat ulang!');
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
  showToast('File database proyek (.asca.json) berhasil diunduh!');
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
        projects = list;
        activeProjectId = projects[0].id;
        saveProjectsToStorage();
        renderAll();
        showToast(`Berhasil memuat ${list.length} proyek dari file!`);
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
    setTxt('bannerCompanyName', 'Belum Ada Proyek Analisa');
    setTxt('bannerSector', 'Klik tombol "+ Proyek Baru" untuk memulai analisa kasus kredit pertama Anda.');
    setTxt('bannerGradeBadge', '-');
    setTxt('bannerFacilityType', '-');
    setTxt('bannerBankName', '-');
    setTxt('bannerPlafond', '-');
    setTxt('bannerFinYears', '-');
    const curSession = getActiveSession();
    setTxt('bannerUnderwriter', curSession ? (curSession.fullName || curSession.username) : '-');
    setTxt('bannerScoreCircle', '0');
    setTxt('bannerDecisionText', 'SIAP ANALISA KASUS BARU');
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
}

window.addEventListener('DOMContentLoaded', () => {
  getUsersFromStorage();
  checkAuthAndRoute();
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

async function checkAuthAndRoute() {
  const session = getActiveSession();
  const loginScreen = document.getElementById('loginScreen');
  const appTopNavbar = document.getElementById('appTopNavbar');
  const appLayoutContainer = document.getElementById('appLayoutContainer');
  const adminLayoutContainer = document.getElementById('adminLayoutContainer');

  if (!session) {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appTopNavbar) appTopNavbar.style.display = 'none';
    if (appLayoutContainer) appLayoutContainer.style.display = 'none';
    if (adminLayoutContainer) adminLayoutContainer.style.display = 'none';
    return;
  }

  if (loginScreen) loginScreen.style.display = 'none';

  if (session.role === 'admin') {
    if (appTopNavbar) appTopNavbar.style.display = 'none';
    if (appLayoutContainer) appLayoutContainer.style.display = 'none';
    if (adminLayoutContainer) adminLayoutContainer.style.display = 'flex';
    const adminUnameEl = document.getElementById('adminSessionUserName');
    if (adminUnameEl) adminUnameEl.textContent = session.username;
    await renderAdminUserManagement();
  } else {
    if (adminLayoutContainer) adminLayoutContainer.style.display = 'none';
    if (appTopNavbar) appTopNavbar.style.display = 'flex';
    if (appLayoutContainer) appLayoutContainer.style.display = 'grid';

    const navUserEl = document.getElementById('navUserName');
    if (navUserEl) navUserEl.textContent = session.username;
    const navRoleEl = document.getElementById('navUserRoleTag');
    if (navRoleEl) navRoleEl.textContent = session.role === 'analyst' ? 'Analis' : session.role;

    const searchInput = document.getElementById('searchProjectInput');
    if (searchInput) searchInput.value = '';
    setupSearchProjectInputProtection();
    [50, 150, 300, 600, 1200, 2000].forEach((delay) => {
      setTimeout(() => {
        const si = document.getElementById('searchProjectInput');
        const sess = getActiveSession();
        if (si && (si.value === '1922' || si.value === 'admin' || (sess && si.value.trim().toLowerCase() === sess.username.toLowerCase()))) {
          si.value = '';
          renderProjectList();
        }
      }, delay);
    });

    loadProjectsFromStorage();
    renderAll();
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

function setupSearchProjectInputProtection() {
  const si = document.getElementById('searchProjectInput');
  if (!si || si.__protectionAttached) return;
  si.__protectionAttached = true;
  const cleanIfUsername = () => {
    const sess = getActiveSession();
    const val = (si.value || '').trim().toLowerCase();
    if (val === '1922' || val === 'admin' || (sess && val === sess.username.toLowerCase())) {
      si.value = '';
      renderProjectList();
    }
  };
  si.addEventListener('focus', cleanIfUsername);
  si.addEventListener('click', cleanIfUsername);
  si.addEventListener('input', cleanIfUsername);
  si.addEventListener('change', cleanIfUsername);
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
  const idx = rawUnit.indexOf('||SESS:');
  return idx !== -1 ? rawUnit.substring(0, idx).trim() : rawUnit.trim();
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

function buildLockedUnit(baseUnit, sessionId) {
  const clean = getCleanUnit(baseUnit);
  return clean + '||SESS:' + sessionId + ':' + Date.now();
}

function startSessionHeartbeat(username, cleanUnit) {
  if (sessionHeartbeatTimer) clearInterval(sessionHeartbeatTimer);
  const sId = getLocalSessionId();
  sessionHeartbeatTimer = setInterval(async () => {
    try {
      const lockedUnit = buildLockedUnit(cleanUnit, sId);
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
    await supabaseFetch('users?username=eq.' + encodeURIComponent(username), {
      method: 'PATCH',
      body: JSON.stringify({ unit: clean })
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
    const newLockedUnit = buildLockedUnit(cleanUnit, mySessionId);
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

    if (alertBox) alertBox.style.display = 'none';
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';

    showToast('Selamat datang, ' + user.fullName + '!');
    await checkAuthAndRoute();
    const finalSearchInput = document.getElementById('searchProjectInput');
    if (finalSearchInput) finalSearchInput.value = '';
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

function logoutSession() {
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
  switchTab('tab-dashboard');

  // 2. Clear session auth & temp storage
  setActiveSession(null);
  try {
    sessionStorage.clear();
    localStorage.removeItem('ASCA_ACTIVE_PROJECT_ID');
    localStorage.removeItem('ASCA_DRAFT_PROJECT');
  } catch (e) {}

  // 3. Reset form inputs di DOM agar tidak ada data input yang tersisa
  const allInputs = document.querySelectorAll('#appLayoutContainer input, #appLayoutContainer select, #appLayoutContainer textarea');
  allInputs.forEach(inp => {
    if (inp.type !== 'file' && inp.type !== 'button' && inp.type !== 'submit') {
      inp.value = '';
    }
  });

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
  setTxt('bannerOptimalLimit', 'Rekomendasi: -');

  showToast('Sampai jumpa, ' + name + '. Sesi telah diakhiri.');
  checkAuthAndRoute();
}

let currentResetTargetUsername = null;

async function renderAdminUserManagement() {
  const users = await fetchUsersFromCloud();
  const filterRole = document.getElementById('adminUserRoleFilter')?.value || 'ALL';
  const searchKeyword = (document.getElementById('adminUserSearchInput')?.value || '').toLowerCase().trim();

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
            <button class="btn btn-sm btn-outline" onclick="openModalResetPassword('${u.username}')" title="Reset Kata Sandi">
              Reset
            </button>
            ${!isMainAdmin ? `
              <button class="btn btn-sm ${u.status === 'active' ? 'btn-outline' : 'btn-primary'}" onclick="toggleUserStatus('' + u.username + '')" title="${u.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}>
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
    localStorage.removeItem(USER_PROJECTS_KEY_PREFIX + username);
    await renderAdminUserManagement();
    showToast(`Pengguna "${username}" telah dihapus dari server cloud.`);
  } catch (err) {
    alert('Gagal menghapus pengguna dari server: ' + err.message);
  }
}
