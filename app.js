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
    unit: 'IT & Sistem Risiko Penjaminan',
    status: 'active',
    createdAt: '2026-10-25T08:00:00.000Z',
    lastLogin: null
  }
];

// ============================================================================
// 1. DEFAULT SAMPLE CASES
// ============================================================================
function getDefaultProjects() {
  return [
    {
      id: 'case-rahmat-santosa',
      companyName: 'PT Rahmat Santosa (Kasus Trade Financing)',
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
      companyName: 'PT Rahmat Santosa (Simulasi Turnaround DCC-SWCM)',
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
        'Skema hasil inovasi analisa DCC-SWCM: Fasilitas dipangkas ke USD 600.000 (tranche maksimal USD 200.000â€“300.000 per pengapalan), KMK Khusus Backup Default dihapus untuk mencegah moral hazard, pencairan wajib berbasis Purchase Order (PO) mengikat dari pabrik tahu/tempe/kecap & pakan ternak sehingga DOI kedelai dikunci maksimal 115 hari dan Gross Margin terkunci minimal +10,5%.',
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
      companyName: 'PT Nusantara Distribusi Pangan',
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
    ijpRate: '0,65% â€“ 0,90% p.a.',
    decision: 'DIREKOMENDASIKAN LAYAK PENUH (FAST-TRACK APPROVE)',
    decisionClass: 'layak',
    criteriaSummary: 'GPM â‰¥ 12%, Siklus Gross < Tenor Kredit (Buffer > 30 hr), Cash Runway â‰¥ 4 bln, NWC Surplus, Quick Ratio â‰¥ 1,2x, DER < 1,5x, DSCR â‰¥ 1,50x.'
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
    ijpRate: '0,90% â€“ 1,25% p.a.',
    decision: 'DIREKOMENDASIKAN LAYAK (APPROVE)',
    decisionClass: 'layak',
    criteriaSummary: 'GPM â‰¥ 9%, Siklus Gross â‰¤ Tenor Kredit, Cash Runway â‰¥ 3 bln, Quick Ratio â‰¥ 0,9x, DER â‰¤ 2,2x, DSCR â‰¥ 1,30x, Rasio data bank akurat.'
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
    ijpRate: '1,25% â€“ 1,60% p.a.',
    decision: 'LAYAK DENGAN COVENANT STANDAR',
    decisionClass: 'layak',
    criteriaSummary: 'GPM â‰¥ 6%, Siklus Gross â‰¤ Tenor Kredit, Cash Runway 2â€“3 bln, Quick Ratio â‰¥ 0,75x, DER â‰¤ 2,8x, DSCR â‰¥ 1,15x.'
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
    ijpRate: '1,60% â€“ 2,10% p.a.',
    decision: 'LAYAK BERSYARAT (MODERATE COVENANT)',
    decisionClass: 'bersyarat',
    criteriaSummary: 'GPM 3%â€“6%, Siklus mendekati batas tenor, Cash Runway 1,5â€“2 bln, butuh escrow account & pembatasan pencairan bertahap.'
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
    ijpRate: '2,10% â€“ 2,85% p.a.',
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
    ijpRate: '2,85% â€“ 3,75% p.a. (+Cash Collateral)',
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
    ijpRate: 'Tidak Direkomendasikan (Except Ring-Fenced Restructuring)',
    decision: 'TOLAK SKEMA PENGAJUAN AWAL (CERTAIN DEFAULT ON MATURITY)',
    decisionClass: 'tolak',
    criteriaSummary: 'Gross Loss beruntun + Mismatch Tenor parah + Runway kas kritis (<15 hari) + Moral hazard fasilitas backup default.'
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
  if (icon) icon.textContent = isSidebarCollapsed ? 'â–¶' : 'â—€';
}

function getCurrentProjectStorageKey() {
  const session = getActiveSession();
  const uname = session ? session.username : '1922';
  return USER_PROJECTS_KEY_PREFIX + uname;
}

function loadProjectsFromStorage() {
  const session = getActiveSession();
  const userKey = getCurrentProjectStorageKey();

  try {
    // Cek data milik user yang login saat ini
    const rawUser = localStorage.getItem(userKey);
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (Array.isArray(parsed) && parsed.length > 0) {
        projects = parsed.map((p) => ({
          year1: p.year1 || 2022,
          year2: p.year2 || 2023,
          qualitative5CScore: typeof p.qualitative5CScore === 'number' ? p.qualitative5CScore : 6,
          manualGradeOverride: p.manualGradeOverride || 'AUTO',
          overrideReason: p.overrideReason || '',
          burnStressOpexGrowth: p.burnStressOpexGrowth || 0,
          burnStressCollectionFreeze: !!p.burnStressCollectionFreeze,
          ...p
        }));
        activeProjectId = projects[0].id;
        return;
      }
    }

    // User 1922 (akun lama/bawaan): coba muat dari legacy keys untuk migrasi
    const is1922 = !session || session.username === '1922';
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
              ...p
            }));
            activeProjectId = projects[0].id;
            saveProjectsToStorage();
            return;
          }
        }
      }
      // User 1922 tanpa data: muat demo bawaan
      projects = getDefaultProjects();
      activeProjectId = projects[0].id;
      saveProjectsToStorage();
      return;
    }
  } catch (e) {
    console.warn('Gagal memuat localStorage:', e);
  }

  // User baru selain 1922: mulai dengan proyek KOSONG
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
      el.textContent = `â— Tersimpan (${now})`;
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
            <span>${p.bankName}</span> â€¢
            <span>${fmtRp(p.requestedPlafond, true)}</span> â€¢
            <span style="font-weight:600;">Score: ${m.score}</span>
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
  setEl('bannerPlafond', fmtRp(proj.requestedPlafond));
  setEl('bannerFinYears', `${m.yr1} & ${m.yr2}`);
  setEl('bannerUnderwriter', proj.underwriter || '-');

  const gradeBadge = document.getElementById('bannerGradeBadge');
  if (gradeBadge) {
    gradeBadge.className = `grade-badge ${m.gradeMeta.badgeCls}`;
    gradeBadge.textContent = `${m.shortGrade} (${m.score}/100)`;
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
    optEl.textContent = `Plafond Optimal DCC: ${fmtRp(m.optimalLimit, true)} (Cov: ${m.gradeMeta.maxCoverage}%)`;
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

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>âœ…</span> <span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.remove();
  }, 3000);
}

// ============================================================================
// 5. CORE DCC-SWCM ENGINE & NWC BURN-RATE ANALYZER
// ============================================================================
function computeDCCSWCM(proj) {
  const f22 = proj.fin22;
  const f23 = proj.fin23;
  const yr1 = proj.year1 || 2022;
  const yr2 = proj.year2 || 2023;

  // Laba Rugi
  const gp22 = f22.rev - f22.cogs;
  const gpm22 = f22.rev > 0 ? (gp22 / f22.rev) * 100 : 0;
  const ebt22 = gp22 - f22.opex;
  const eat22 = ebt22 - f22.tax;
  const npm22 = f22.rev > 0 ? (eat22 / f22.rev) * 100 : 0;

  const gp23 = f23.rev - f23.cogs;
  const gpm23 = f23.rev > 0 ? (gp23 / f23.rev) * 100 : 0;
  const ebt23 = gp23 - f23.opex;
  const eat23 = ebt23 - f23.tax;
  const npm23 = f23.rev > 0 ? (eat23 / f23.rev) * 100 : 0;

  // Neraca
  const ca22 = f22.cash + f22.ar + f22.otherAr + f22.inv + f22.otherCa;
  const nca22 = f22.fa + f22.taxAsset;
  const ta22 = ca22 + nca22;
  const cl22 = f22.stDebt + f22.ap + f22.otherAp + f22.accrued;
  const tl22 = cl22 + f22.ltDebt;
  const eq22 = f22.capital + f22.re;

  const ca23 = f23.cash + f23.ar + f23.otherAr + f23.inv + f23.otherCa;
  const nca23 = f23.fa + f23.taxAsset;
  const ta23 = ca23 + nca23;
  const cl23 = f23.stDebt + f23.ap + f23.otherAp + f23.accrued;
  const tl23 = cl23 + f23.ltDebt;
  const eq23 = f23.capital + f23.re;

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
  // GRANULAR 100-POINT SCORING MODEL
  // ==========================================================================
  const scoreComponents = [];

  // PILAR 1: KESESUAIAN SIKLUS KAS & TENOR KREDIT (BOBOT MAKS: 25 POIN)
  let s1A = 0;
  let r1A = '';
  if (cashGapAtSCFMaturity_Actual <= -20) {
    s1A = 15;
    r1A = `Siklus Gross (${fmtNum(grossCycle23, 1)} hr) jauh di bawah Tenor (${scfTenor} hr) â€” Buffer ${fmtNum(Math.abs(cashGapAtSCFMaturity_Actual), 1)} hr.`;
  } else if (cashGapAtSCFMaturity_Actual <= 0) {
    s1A = 12;
    r1A = `Siklus Gross (${fmtNum(grossCycle23, 1)} hr) pas di bawah Tenor (${scfTenor} hr).`;
  } else if (cashGapAtSCFMaturity_Actual <= 30) {
    s1A = 6;
    r1A = `Siklus Gross melampaui Tenor +${fmtNum(cashGapAtSCFMaturity_Actual, 1)} hr.`;
  } else {
    s1A = 0;
    r1A = `Mismatch Tenor ekstrem (+${fmtNum(cashGapAtSCFMaturity_Actual, 1)} hr); kas belum kembali saat jatuh tempo.`;
  }
  scoreComponents.push({
    pillarId: 'P1',
    pillarName: 'Pilar 1: Dynamic CCC & Kesesuaian Tenor (Maks 25)',
    code: '1A',
    name: 'Kesesuaian Siklus Gross vs Tenor Fasilitas',
    formula: '(DOI + DOR) â‰¤ Tenor Kredit',
    benchmark: `â‰¤ ${scfTenor} Hari`,
    actualStr: `${fmtNum(grossCycle23, 1)} Hari (Gap: ${cashGapAtSCFMaturity_Actual >= 0 ? '+' : ''}${fmtNum(cashGapAtSCFMaturity_Actual, 1)} hr)`,
    maxPts: 15,
    earnedPts: s1A,
    lostPts: 15 - s1A,
    reason: r1A
  });

  let s1B = 0;
  let r1B = '';
  if (doi23_365 <= 60) {
    s1B = 10;
    r1B = `Perputaran persediaan sangat cepat (${fmtNum(doi23_365, 1)} hr â‰¤ 60 hr).`;
  } else if (doi23_365 <= 120) {
    s1B = 8;
    r1B = `Perputaran persediaan sehat (${fmtNum(doi23_365, 1)} hr â‰¤ 120 hr).`;
  } else if (doi23_365 <= 180) {
    s1B = 4;
    r1B = `Persediaan mulai lambat (${fmtNum(doi23_365, 1)} hr).`;
  } else {
    s1B = 0;
    r1B = `Persediaan menumpuk (${fmtNum(doi23_365, 1)} hr / ~${fmtNum(doi23_365 / 30, 1)} bln); risiko rusak tinggi.`;
  }
  scoreComponents.push({
    pillarId: 'P1',
    pillarName: 'Pilar 1: Dynamic CCC & Kesesuaian Tenor (Maks 25)',
    code: '1B',
    name: 'Kecepatan Perputaran Persediaan (DOI)',
    formula: '(Persediaan / HPP) Ã— 365',
    benchmark: 'â‰¤ 120 Hari',
    actualStr: `${fmtNum(doi23_365, 1)} Hari`,
    maxPts: 10,
    earnedPts: s1B,
    lostPts: 10 - s1B,
    reason: r1B
  });

  // PILAR 2: INTEGRITAS DATA BANK VS AUDITED (BOBOT MAKS: 15 POIN)
  let s2A = 0;
  let r2A = '';
  const absDiffDOI = Math.abs(diffDOI);
  if (absDiffDOI <= 10) {
    s2A = 8;
    r2A = `Data Bank DOI (${proj.claimedDOI} hr) terverifikasi akurat sesuai laporan audited (${fmtNum(doi23_365, 1)} hr).`;
  } else if (absDiffDOI <= 30) {
    s2A = 5;
    r2A = `Deviasi moderat terhadap Data Bank DOI (${proj.claimedDOI} hr vs aktual ${fmtNum(doi23_365, 1)} hr).`;
  } else {
    s2A = 0;
    r2A = `Deviasi material terhadap Data Bank DOI: tertulis ${proj.claimedDOI} hr padahal riil ${fmtNum(doi23_365, 1)} hr (selisih +${fmtNum(diffDOI, 1)} hr).`;
  }
  scoreComponents.push({
    pillarId: 'P2',
    pillarName: 'Pilar 2: Verifikasi Data Bank vs Audited (Maks 15)',
    code: '2A',
    name: 'Akurasi Data Bank Hari Persediaan (Î”DOI)',
    formula: '|DOI Aktual âˆ’ DOI Data Bank|',
    benchmark: 'Deviasi â‰¤ 10 Hari',
    actualStr: `Selisih ${diffDOI >= 0 ? '+' : ''}${fmtNum(diffDOI, 1)} Hari`,
    maxPts: 8,
    earnedPts: s2A,
    lostPts: 8 - s2A,
    reason: r2A
  });

  let s2B = 0;
  let r2B = '';
  const absDiffDOP = Math.abs(diffDOP);
  if (absDiffDOP <= 12) {
    s2B = 7;
    r2B = `Data Bank DOR (${proj.claimedDOR} hr) & DOP (${proj.claimedDOP} hr) sesuai Neraca.`;
  } else {
    s2B = 2;
    r2B = `DOP Utang Dagang murni ${fmtNum(dop23_365, 1)} hr berbeda dari Data Bank ${proj.claimedDOP} hr.`;
  }
  scoreComponents.push({
    pillarId: 'P2',
    pillarName: 'Pilar 2: Verifikasi Data Bank vs Audited (Maks 15)',
    code: '2B',
    name: 'Akurasi Data Bank Piutang (DOR) & Utang (DOP)',
    formula: '|DOP Aktual âˆ’ Data Bank|',
    benchmark: 'Deviasi â‰¤ 12 Hari',
    actualStr: `Î”DOR: ${fmtNum(diffDOR, 1)}h | Î”DOP: ${fmtNum(diffDOP, 1)}h`,
    maxPts: 7,
    earnedPts: s2B,
    lostPts: 7 - s2B,
    reason: r2B
  });

  // PILAR 3: PROFITABILITAS & ARUS KAS (BOBOT MAKS: 25 POIN)
  let s3A = 0;
  let r3A = '';
  if (gpm23 >= 12) {
    s3A = 12;
    r3A = `Gross Margin sangat kuat (${fmtPct(gpm23)}).`;
  } else if (gpm23 >= 8) {
    s3A = 10;
    r3A = `Gross Margin sehat (${fmtPct(gpm23)}).`;
  } else if (gpm23 >= 3) {
    s3A = 6;
    r3A = `Gross Margin tipis (${fmtPct(gpm23)}).`;
  } else if (gpm23 >= 0) {
    s3A = 2;
    r3A = `Gross Margin nyaris impas (${fmtPct(gpm23)}).`;
  } else {
    s3A = 0;
    r3A = `Gross Loss (${fmtPct(gpm23)}); perusahaan jual rugi!`;
  }
  scoreComponents.push({
    pillarId: 'P3',
    pillarName: 'Pilar 3: Profitabilitas & Kapasitas Bayar (Maks 25)',
    code: '3A',
    name: 'Marjin Laba Kotor (Gross Margin)',
    formula: '(Penjualan âˆ’ HPP) / Penjualan',
    benchmark: 'â‰¥ +8,0%',
    actualStr: `${fmtPct(gpm23, 2)} (${fmtRp(gp23, true)})`,
    maxPts: 12,
    earnedPts: s3A,
    lostPts: 12 - s3A,
    reason: r3A
  });

  let s3B = eat23 > 0 && revGrowth >= 5 ? 6 : (eat23 > 0 ? 4.5 : (eat23 < 0 && revGrowth >= 10 ? 2 : 0));
  scoreComponents.push({
    pillarId: 'P3',
    pillarName: 'Pilar 3: Profitabilitas & Kapasitas Bayar (Maks 25)',
    code: '3B',
    name: 'Laba Bersih & Pertumbuhan Penjualan',
    formula: 'EAT > 0 & Sales YoY',
    benchmark: 'EAT Positif & Sales > +5%',
    actualStr: `EAT: ${fmtRp(eat23, true)} | Sales: ${fmtPct(revGrowth, 1)}`,
    maxPts: 6,
    earnedPts: s3B,
    lostPts: 6 - s3B,
    reason: eat23 > 0 ? 'Laba Bersih positif.' : 'Rugi bersih berlanjut.'
  });

  let s3C = dscr23 >= 1.5 ? 7 : (dscr23 >= 1.2 ? 5.5 : (dscr23 >= 1.0 ? 3 : 0));
  scoreComponents.push({
    pillarId: 'P3',
    pillarName: 'Pilar 3: Profitabilitas & Kapasitas Bayar (Maks 25)',
    code: '3C',
    name: 'Debt Service Coverage Ratio (DSCR)',
    formula: 'EBITDA Proxy / Kewajiban Utang',
    benchmark: 'â‰¥ 1,20x',
    actualStr: `${fmtNum(dscr23, 2)}x`,
    maxPts: 7,
    earnedPts: s3C,
    lostPts: 7 - s3C,
    reason: dscr23 >= 1.2 ? 'DSCR memadai.' : 'EBITDA operasional tidak cukup menutup cicilan.'
  });

  // PILAR 4: KETAHANAN NWC & CASH BURN-RATE (BOBOT MAKS: 15 POIN)
  let s4A = 0;
  let r4A = '';
  if (pureCashRunwayMonths >= 3.0) {
    s4A = 8;
    r4A = `Ketahanan Kas Murni sangat kuat (${fmtNum(pureCashRunwayMonths, 1)} bulan â‰¥ 3 bulan).`;
  } else if (pureCashRunwayMonths >= 1.5) {
    s4A = 6;
    r4A = `Ketahanan Kas Murni memadai (${fmtNum(pureCashRunwayMonths, 1)} bulan).`;
  } else if (pureCashRunwayMonths >= 0.8) {
    s4A = 3;
    r4A = `Ketahanan Kas Murni ketat (${fmtNum(pureCashRunwayMonths, 1)} bulan / ~${fmtNum(pureCashRunwayDays, 0)} hari).`;
  } else {
    s4A = 0.5;
    r4A = `Ketahanan Kas kritis (${fmtNum(pureCashRunwayDays, 0)} hari); kas habis dalam waktu singkat jika terjadi collection freeze.`;
  }
  scoreComponents.push({
    pillarId: 'P4',
    pillarName: 'Pilar 4: Ketahanan NWC & Cash Burn (Maks 15)',
    code: '4A',
    name: 'Pure Cash Runway (Ketahanan Kas Murni Tanpa Omzet)',
    formula: 'Kas & Bank / Daily Gross Cash Burn',
    benchmark: 'â‰¥ 1,5 Bulan (â‰¥ 45 Hari)',
    actualStr: `${fmtNum(pureCashRunwayMonths, 1)} Bulan (${fmtNum(pureCashRunwayDays, 0)} Hari)`,
    maxPts: 8,
    earnedPts: s4A,
    lostPts: 8 - s4A,
    reason: r4A
  });

  let s4B = 0;
  let r4B = '';
  if (!isNWCDeficit) {
    s4B = 7;
    r4B = `NWC Surplus (+${fmtRp(nwcFinancingGap, true)}) untuk memutar 1 siklus operasional.`;
  } else if (Math.abs(nwcFinancingGap) <= proj.requestedPlafond * 0.5) {
    s4B = 3.5;
    r4B = `Terdapat defisit modal kerja 1 siklus (${fmtRp(nwcFinancingGap, true)}) yang dapat ditutup kredit bank.`;
  } else {
    s4B = 1;
    r4B = `Defisit modal kerja 1 siklus sangat besar (${fmtRp(nwcFinancingGap, true)}); NWC riil tidak mencukupi membiayai siklus ${fmtNum(grossCycle23, 0)} hari.`;
  }
  scoreComponents.push({
    pillarId: 'P4',
    pillarName: 'Pilar 4: Ketahanan NWC & Cash Burn (Maks 15)',
    code: '4B',
    name: 'NWC Adequacy & Working Capital Gap per Siklus',
    formula: 'NWC Riil âˆ’ Kebutuhan Dana 1 Siklus Gross',
    benchmark: 'Surplus (Gap â‰¥ 0)',
    actualStr: `${isNWCDeficit ? 'Defisit ' : 'Surplus '}${fmtRp(nwcFinancingGap, true)}`,
    maxPts: 7,
    earnedPts: s4B,
    lostPts: 7 - s4B,
    reason: r4B
  });

  // PILAR 5: SOLVABILITAS & TREN UTANG (BOBOT MAKS: 10 POIN)
  let s5A = der23 <= 2.0 && reErosionPct23 === 0 ? 5 : (der23 <= 3.0 && reErosionPct23 <= 30 ? 3.5 : 1);
  scoreComponents.push({
    pillarId: 'P5',
    pillarName: 'Pilar 5: Solvabilitas & Tren Utang (Maks 10)',
    code: '5A',
    name: 'Debt to Equity Ratio & Erosi Modal',
    formula: 'Total Liabilitas / Ekuitas',
    benchmark: 'DER â‰¤ 2,5x & Erosi < 25%',
    actualStr: `DER: ${fmtNum(der23, 2)}x | Erosi: ${fmtNum(reErosionPct23, 1)}%`,
    maxPts: 5,
    earnedPts: s5A,
    lostPts: 5 - s5A,
    reason: reErosionPct23 > 50 ? 'Akumulasi rugi menggerus sebagian besar modal.' : 'Permodalan stabil.'
  });

  let s5B = stDebtGrowth <= 20 ? 5 : (stDebtGrowth <= 50 ? 3 : 0);
  scoreComponents.push({
    pillarId: 'P5',
    pillarName: 'Pilar 5: Solvabilitas & Tren Utang (Maks 10)',
    code: '5B',
    name: 'Stabilitas Utang Bank Jangka Pendek',
    formula: 'Pertumbuhan Utang Bank Pendek YoY',
    benchmark: 'â‰¤ +25% YoY',
    actualStr: `${fmtPct(stDebtGrowth, 1)} (${fmtRp(f23.stDebt, true)})`,
    maxPts: 5,
    earnedPts: s5B,
    lostPts: 5 - s5B,
    reason: stDebtGrowth > 50 ? 'Lonjakan tajam utang bank jangka pendek; refinancing risk tinggi.' : 'Utang jangka pendek stabil.'
  });

  // PILAR 6: STRUKTUR SKEMA & 5C UNDERWRITER (BOBOT MAKS: 10 POIN)
  let s6A = proj.kmkTenorDays > 0 ? 0 : (proj.usdAmount > 0 ? 3.5 : 4);
  scoreComponents.push({
    pillarId: 'P6',
    pillarName: 'Pilar 6: Struktur Skema & Kualitatif 5C (Maks 10)',
    code: '6A',
    name: 'Keamanan Skema (Anti-Moral Hazard Backup Default)',
    formula: 'Evaluasi KMK Backup Default & Valas',
    benchmark: 'Tanpa Auto-Backup Default',
    actualStr: proj.kmkTenorDays > 0 ? `Ada KMK Backup (${proj.kmkTenorDays} hr)` : 'Skema Mandiri',
    maxPts: 4,
    earnedPts: s6A,
    lostPts: 4 - s6A,
    reason: proj.kmkTenorDays > 0 ? 'Terdapat klausul backup default otomatis.' : 'Skema bersih self-liquidating.'
  });

  const rawQual = typeof proj.qualitative5CScore === 'number' ? proj.qualitative5CScore : 6;
  const s6B = Number(((Math.max(0, Math.min(10, rawQual)) / 10) * 6).toFixed(1));
  scoreComponents.push({
    pillarId: 'P6',
    pillarName: 'Pilar 6: Struktur Skema & Kualitatif 5C (Maks 10)',
    code: '6B',
    name: 'Penilaian Kualitatif 5C Underwriter',
    formula: '(Nilai 5C / 10) Ã— 6 Poin',
    benchmark: 'â‰¥ 7,5 / 10',
    actualStr: `${fmtNum(rawQual, 1)} / 10 (${fmtNum(s6B, 1)} Poin)`,
    maxPts: 6,
    earnedPts: s6B,
    lostPts: Number((6 - s6B).toFixed(1)),
    reason: `Penilaian aspek kualitatif 5C (Karakter SLIK, Agunan ${fmtRp(f23.fa, true)}, Kondisi).`
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
    gp22, gpm22, ebt22, eat22, npm22,
    gp23, gpm23, ebt23, eat23, npm23,
    ca22, nca22, ta22, cl22, tl22, eq22,
    ca23, nca23, ta23, cl23, tl23, eq23,
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
    score,
    riskGrade: `${gradeMeta.grade} (${gradeMeta.name})`,
    shortGrade: gradeMeta.grade,
    decision: gradeMeta.decision,
    decisionClass: gradeMeta.decisionClass,
    recCoveragePct: gradeMeta.maxCoverage,
    ijpRate: gradeMeta.ijpRate
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
      detail: `Meminta bedah komponen HPP ${m.yr1}â€“${m.yr2} (harga beli bahan baku, kurs impor, biaya pabrik/pengolahan, susut bahan baku).`
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
      title: `Covenant Penurunan DOI ke â‰¤ ${m.targetSafeDOI} Hari & Pengikatan Agunan CMA`,
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
      title: `Sinkronisasi Siklus Transaksi (Ring-Fenced Batch â‰¤ ${m.scfTenor} Hari) & Escrow Account`,
      detail: `Fasilitas hanya boleh membiayai batch pesanan dengan siklus total maksimal <strong>${m.scfTenor - 10} hari</strong>, dan seluruh pembayaran pembeli wajib masuk ke Escrow Account di ${proj.bankName}.`
    });
  }

  // KMK Backup
  if (proj.kmkTenorDays > 0) {
    criticalPointsCredit.push({
      severity: 'CRITICAL',
      title: `Moral Hazard pada Struktur "KMK Khusus Backup Default" (Tenor +${proj.kmkTenorDays} Hari)`,
      detail: `Adanya fasilitas KMK Khusus berjangka ${proj.kmkTenorDays} hari untuk mem-backup fasilitas utama saat terjadi default menciptakan risiko evergreening.`
    });
    mitigations.push({
      title: `Penghapusan Klausul Auto-Backup Default & Pembagian Sub-Limit Pencairan`,
      detail: `Plafond dicairkan bertahap maksimal <strong>${fmtRp(m.recommendedTrancheSize)} per tranche</strong> dan meniadakan backup default otomatis.`
    });
  }

  // Rekomendasi Agunan Tambahan Fixed Asset 120% & Pembatasan Coverage Askrindo
  const minCollateralVal = proj.requestedPlafond * 1.2;
  mitigations.push({
    title: `Pembatasan Coverage Penjaminan Maksimal ${m.recCoveragePct}% & Agunan Tambahan Fixed Asset â‰¥ 120% (${fmtRp(minCollateralVal, true)})`,
    detail: `Menerapkan <em>risk sharing</em> penjaminan Askrindo maksimal <strong>${m.recCoveragePct}%</strong> (${100 - m.recCoveragePct}% porsi risiko ditanggung ${proj.bankName}), kewajiban pengikatan <strong>Agunan Tambahan Fixed Asset (tanah, bangunan, mesin pabrik) minimal 120% dari nilai plafon kredit (${fmtRp(minCollateralVal, true)})</strong> dari aset tetap debitur (${fmtRp(proj.fin23.fa)}) yang berstatus <em>free & clear</em>, serta klausul <em>Negative Covenant</em> (larangan menambah pinjaman bank baru atau membagikan dividen tanpa persetujuan tertulis Askrindo).`
  });

  requiredInfos.push({
    title: `Daftar & Penilaian Appraisal Aset Tetap Free & Clear (${fmtRp(proj.fin23.fa)})`,
    detail: `Underwriter wajib meminta laporan appraisal independen terbaru atas Aset Tetap debitur (${fmtRp(proj.fin23.fa)}) guna memastikan kecukupan nilai pasar agunan tambahan minimal 120% (${fmtRp(minCollateralVal, true)}) yang bebas sengketa.`
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
        <div class="card-title">ðŸ’§ Modul Analisis Ketahanan Modal Kerja Bersih &amp; Cash Burn-Rate Test (${proj.companyName})</div>
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
          <span style="color:${runwayStatusColor};">${m.pureCashRunwayMonths >= 2.0 ? 'âœ… Buffer Kas Aman' : (m.pureCashRunwayMonths >= 1.0 ? 'âš ï¸ Buffer Kas Menipis' : 'ðŸš¨ Runway Kritis (<30 Hari)')}</span>
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
            âš¡ Simulator Uji Stress Ketahanan Kas &amp; Pembekuan Piutang
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
              Simulasi Gagal Tagih / Pembeli Menunda Bayar (Collection Freeze) â€” Hanya Mengandalkan Kas Riil di Rekening
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
            ${m.stressedRunwayMonths < 1.0 ? 'ðŸš¨ Kesimpulan: Debitur tidak memiliki ketahanan likuiditas yang cukup. Wajib ada fasilitas standby line atau jaminan kas.' : 'âœ… Kesimpulan: Debitur memiliki ketahanan likuiditas yang cukup menyerap keterlambatan arus kas.'}
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
              <td><strong>Net Working Capital Riil (Aset Lancar âˆ’ Liabilitas Lancar)</strong></td>
              <td>${fmtRp(m.ca23, true)} âˆ’ ${fmtRp(m.cl23, true)}</td>
              <td colspan="2" class="num-col"><strong>${fmtRp(m.nwc23)}</strong></td>
              <td>${m.nwc23 > 0 ? 'Positif (Aset lancar melampaui utang lancar)' : 'Negatif (Tekanan utang lancar)'}</td>
            </tr>
            <tr>
              <td><strong>Kebutuhan Modal Kerja 1 Siklus Penuh (${fmtNum(m.grossCycle23, 0)} Hari)</strong></td>
              <td>Daily Burn (${fmtRp(m.dailyGrossCashBurn)}) Ã— (${fmtNum(m.grossCycle23, 0)} hari siklus gross)</td>
              <td colspan="2" class="num-col" style="font-weight:700;">${fmtRp(m.wcRequiredPerCycle)}</td>
              <td>Total biaya operasional yang harus ditalangi per siklus batch</td>
            </tr>
            <tr style="background:${!m.isNWCDeficit ? '#f0fdf4' : '#fef2f2'}; font-weight:800;">
              <td><strong>FINANCING GAP MODAL KERJA (KMK DEFICIT / SURPLUS)</strong></td>
              <td>NWC Riil âˆ’ Kebutuhan 1 Siklus</td>
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
        <div style="font-size:0.62rem; font-weight:700; color:#334155;">Skor ${g.minScore}â€“${g.maxScore}</div>
        <div style="font-size:0.6rem; color:#64748b; margin-top:2px;">${g.name}</div>
        ${isActive ? `<div style="margin-top:2px; font-size:0.58rem; font-weight:800; background:${g.color}; color:#fff; border-radius:3px; padding:1px 3px;">POSISI SAAT INI</div>` : ''}
      </div>
    `;
  }).join('');

  document.getElementById('gradeRiskMenuContainer').innerHTML = `
    <div class="card" style="border-left: 4px solid ${m.gradeMeta.color};">
      <div class="card-header">
        <div class="card-title">ðŸ… Menu Penentuan Grade Risk Askrindo &amp; Indikator Penyebabnya (${proj.companyName})</div>
        <button class="btn btn-primary btn-sm" onclick="switchTab('tab-score')">Lihat Rincian Perhitungan Score (${m.score}/100) â†’</button>
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
          <div style="font-size:0.64rem; color:#475569;">Maksimal Coverage Penjaminan</div>
          <div style="font-size:0.92rem; font-weight:800; color:#0f172a;">${m.recCoveragePct > 0 ? `${m.recCoveragePct}% Plafond` : '0% (Wajib Restrukturisasi)'}</div>
          <div style="font-size:0.63rem; color:#64748b;">Risk Sharing Bank: ${m.recCoveragePct > 0 ? `${100 - m.recCoveragePct}%` : '100%'}</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Indikasi Rate IJP Askrindo</div>
          <div style="font-size:0.82rem; font-weight:800; color:var(--askrindo-blue);">${m.ijpRate}</div>
          <div style="font-size:0.63rem; color:#64748b;">Berdasarkan profil risiko siklus kas</div>
        </div>
        <div>
          <div style="font-size:0.64rem; color:#475569;">Rekomendasi Keputusan Komite</div>
          <div style="font-size:0.74rem; font-weight:800; color:${m.gradeMeta.color};">${m.decision}</div>
        </div>
      </div>

      ${m.hasKnockOutCap ? `
      <div style="background:#fef2f2; border:1px solid #fca5a5; border-left:4px solid #dc2626; padding:0.45rem 0.65rem; border-radius:6px; margin-bottom:0.6rem; font-size:0.71rem; color:#991b1b;">
        âš ï¸ <strong>Aturan Veto / Hard-Cap Grade Underwriting Aktif:</strong> Karena debitur mengalami <strong>Gross Loss (${fmtPct(m.gpm23)})</strong> sekaligus <strong>Mismatch Tenor Berat (Siklus Gross ${fmtNum(m.grossCycle23, 1)} hr > Tenor ${m.scfTenor} hr)</strong>, maka Risk Grade otomatis terkunci maksimal pada zona <strong>High Risk / Reject (B / C)</strong> hingga struktur transaksi dimodifikasi menjadi <em>Ring-Fenced Self-Liquidating</em>.
      </div>` : ''}

      <div class="grid-2" style="margin-bottom:0.6rem;">
        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:0.6rem;">
          <div style="font-weight:800; color:#991b1b; font-size:0.76rem; margin-bottom:0.35rem; display:flex; justify-content:space-between;">
            <span>ðŸ”´ Indikator Penyebab Turunnya Grade (${negativeDrivers.length} Faktor)</span>
            <span>Penalti: -${fmtNum(m.totalLostPoints, 1)} Poin</span>
          </div>
          ${negativeDrivers.length === 0
            ? `<div style="font-size:0.71rem; color:#166534; padding:0.35rem;">âœ… Tidak ada indikator penekan material. Seluruh rasio berada dalam batas sehat.</div>`
            : `<div style="display:flex; flex-direction:column; gap:0.3rem;">
                ${negativeDrivers.map((d) => `
                  <div style="background:#fff; padding:0.38rem 0.5rem; border-radius:5px; border-left:3px solid #dc2626; font-size:0.69rem;">
                    <div style="display:flex; justify-content:space-between; font-weight:700; color:#991b1b;">
                      <span>[${d.code}] ${d.name}</span>
                      <span>-${fmtNum(d.lostPts, 1)} Poin</span>
                    </div>
                    <div style="color:#334155; margin-top:2px;">
                      <strong>Aktual:</strong> ${d.actualStr} <em>(Standar: ${d.benchmark})</em> â€” ${d.reason}
                    </div>
                  </div>
                `).join('')}
              </div>`
          }
        </div>

        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.6rem;">
          <div style="font-weight:800; color:#166534; font-size:0.76rem; margin-bottom:0.35rem; display:flex; justify-content:space-between;">
            <span>ðŸŸ¢ Indikator Penopang / Penguat Grade (${positiveDrivers.length} Faktor)</span>
            <span>Diperoleh: +${fmtNum(m.totalRawScore, 1)} Poin</span>
          </div>
          ${positiveDrivers.length === 0
            ? `<div style="font-size:0.71rem; color:#991b1b; padding:0.35rem;">âš ï¸ Sangat sedikit indikator positif yang menopang grade saat ini.</div>`
            : `<div style="display:flex; flex-direction:column; gap:0.3rem;">
                ${positiveDrivers.map((d) => `
                  <div style="background:#fff; padding:0.38rem 0.5rem; border-radius:5px; border-left:3px solid #166534; font-size:0.69rem;">
                    <div style="display:flex; justify-content:space-between; font-weight:700; color:#166534;">
                      <span>[${d.code}] ${d.name}</span>
                      <span>+${fmtNum(d.earnedPts, 1)} Poin</span>
                    </div>
                    <div style="color:#334155; margin-top:2px;">
                      <strong>Aktual:</strong> ${d.actualStr} <em>(Standar: ${d.benchmark})</em> â€” ${d.reason}
                    </div>
                  </div>
                `).join('')}
              </div>`
          }

          <div style="margin-top:0.5rem; background:#fff; padding:0.45rem 0.55rem; border-radius:6px; border:1px solid #cbd5e1;">
            <div style="font-weight:700; font-size:0.71rem; color:var(--askrindo-navy); margin-bottom:0.25rem;">
              âš™ï¸ Penetapan / Override Grade Risk oleh Underwriter (Opsional):
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
        <div class="card-title">ðŸ“‹ Tabel Parameter &amp; Matriks Standar Penentuan Grade Risk Askrindo (AAA s/d C)</div>
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
                  <td><span class="grade-badge ${g.badgeCls}">${g.grade}</span> ${active ? 'â—€' : ''}</td>
                  <td><strong>${g.minScore} â€“ ${g.maxScore}</strong></td>
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
// 9. RENDER SCORE CALCULATION TAB
// ============================================================================
function renderScoreCalculationTab(proj, m) {
  const qualVal = typeof proj.qualitative5CScore === 'number' ? proj.qualitative5CScore : 6;

  document.getElementById('scoreCalculationMenuContainer').innerHTML = `
    <div class="card" style="border-left: 4px solid var(--askrindo-blue);">
      <div class="card-header">
        <div class="card-title">ðŸ§® Menu Rincian Perhitungan Score DCC-SWCM (${proj.companyName})</div>
        <div style="display:flex; gap:0.35rem; align-items:center;">
          <span class="grade-badge ${m.gradeMeta.badgeCls}" style="font-size:0.72rem; padding:2px 8px;">
            Total Score: ${m.score} / 100 (Grade ${m.shortGrade})
          </span>
          <button class="btn btn-outline btn-sm" onclick="switchTab('tab-grade')">â† Indikator Grade</button>
        </div>
      </div>

      <div class="grid-3" style="margin-bottom:0.6rem;">
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

      <div class="grid-2" style="margin-bottom:0.6rem;">
        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; padding:0.5rem 0.65rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
            <span style="font-weight:700; font-size:0.73rem; color:var(--askrindo-navy);">
              ðŸŽšï¸ Kalibrasi Penilaian Kualitatif 5C Underwriter (Sub-Indikator 6B)
            </span>
            <span class="slider-val" id="lblQual5CScore">${fmtNum(qualVal, 1)} / 10 (+${fmtNum((qualVal / 10) * 6, 1)} Poin)</span>
          </div>
          <input type="range" min="0" max="10" step="0.5" value="${qualVal}" oninput="updateQualitative5CScore(this.value)" />
          <div class="slider-scale">
            <span>0 (Macet / Tanpa Agunan)</span>
            <span>5 (Cukup)</span>
            <span>10 (SLIK Kol 1 + Agunan Kuat â‰¥150%)</span>
          </div>
        </div>

        <div style="background:#fff; border:1px solid var(--border-color); border-radius:6px; padding:0.5rem 0.65rem; display:flex; flex-direction:column; justify-content:center;">
          <div style="font-weight:700; font-size:0.73rem; color:var(--askrindo-navy); margin-bottom:0.2rem;">
            ðŸ“ Rumus Rekonsiliasi Score Akhir DCC-SWCM:
          </div>
          <div style="font-size:0.71rem; color:#334155; display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:0.3rem 0.5rem; border-radius:4px;">
            <span><strong>Skor Awal:</strong> 100,0</span>
            <span>âˆ’</span>
            <span style="color:#dc2626; font-weight:700;">Penalti: ${fmtNum(m.totalLostPoints, 1)}</span>
            <span>=</span>
            <span style="color:${m.gradeMeta.color}; font-weight:900; font-size:0.84rem;">Skor Akhir: ${m.score} / 100 (Grade ${m.shortGrade})</span>
          </div>
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

function updateQualitative5CScore(val) {
  const proj = getActiveProject();
  if (!proj) return;
  proj.qualitative5CScore = parseFloat(val) || 0;
  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);
  renderProjectList();
  renderBanner(proj, m);
  renderDashboardTab(proj, m);
  renderBurnRateTab(proj, m);
  renderGradeRiskTab(proj, m);
  renderScoreCalculationTab(proj, m);
  renderCaseStudyQATab(proj, m);
  renderPortfolioComparisonTab();
  renderPrintableReport(proj, m);
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
          ? `âš ï¸ Defisit siklus ${fmtNum(m.cashGapAtSCFMaturity_Actual, 0)} hari saat jatuh tempo hari ke-${m.scfTenor} (Memicu klaim / KMK Backup)!`
          : `âœ… Siklus operasi masuk di dalam tenor ${m.scfTenor} hari (Surplus waktu ${fmtNum(Math.abs(m.cashGapAtSCFMaturity_Actual), 0)} hari).`}
      </div>
    </div>
  `;

  document.getElementById('dashboardSummaryCardTitle').textContent = `ðŸ“ˆ Ringkasan Keuangan (Audited ${m.yr1} vs ${m.yr2})`;
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
  document.getElementById('dccAuditCardTitle').textContent = `ðŸ”„ Audit Dynamic Cash Conversion Cycle (Data Bank vs Audited ${m.yr1} & ${m.yr2})`;
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
        <td>(AR / Sales) Ã— 365</td>
        <td class="num-col"><strong>${proj.claimedDOR} hr</strong></td>
        <td class="num-col">${fmtNum(m.dor22_365, 1)} hr</td>
        <td class="num-col"><strong>${fmtNum(m.dor23_365, 1)} hr</strong></td>
        <td class="num-col">${fmtNum(m.dor23_360, 1)} hr</td>
        <td class="num-col">${m.diffDOR >= 0 ? '+' : ''}${fmtNum(m.diffDOR, 1)} hr</td>
        <td>${Math.abs(m.diffDOR) <= 10 ? 'Sesuai Data Bank (~2 bulan)' : 'Deviasi periode penagihan'}</td>
      </tr>
      <tr>
        <td><strong>DOI / DIO</strong> (Persediaan)</td>
        <td>(Inv / HPP) Ã— 365</td>
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
        <td>(AP / HPP) Ã— 365</td>
        <td class="num-col"><strong>${proj.claimedDOP} hr</strong></td>
        <td class="num-col">${fmtNum(m.dop22_365, 1)} hr</td>
        <td class="num-col" style="font-weight:800;">${fmtNum(m.dop23_365, 1)} hr</td>
        <td class="num-col">${fmtNum(m.dop23_360, 1)} hr</td>
        <td class="num-col">${fmtNum(m.diffDOP, 1)} hr</td>
        <td>${Math.abs(m.diffDOP) > 20 ? 'Kredit supplier murni jauh lebih pendek dari Data Bank' : 'Sesuai termin supplier'}</td>
      </tr>
      <tr>
        <td><em>DOP Luas (+Utang Lain &amp; YMH)</em></td>
        <td>((AP+Lain+YMH)/HPP)Ã—365</td>
        <td class="num-col"><em>(${proj.claimedDOP} hr)</em></td>
        <td class="num-col">${fmtNum(m.dopBroad22_365, 1)} hr</td>
        <td class="num-col">${fmtNum(m.dopBroad23_365, 1)} hr</td>
        <td class="num-col">${fmtNum((m.dopBroad23_365 * 360) / 365, 1)} hr</td>
        <td class="num-col">+${fmtNum(m.dopBroad23_365 - proj.claimedDOP, 1)} hr</td>
        <td>Termasuk Biaya YMH Dibayar ${fmtRp(proj.fin23.accrued, true)}</td>
      </tr>
      <tr style="background:#f0f9ff; font-weight:700;">
        <td><strong>Cash Conversion Cycle (CCC)</strong></td>
        <td>DOI + DOR âˆ’ DOP Murni</td>
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
        <p>Siklus Operasi Gross membutuhkan <strong>${m.claimedGrossCycle} hari (Data Bank)</strong> atau <strong>${fmtNum(m.grossCycle23, 1)} hari (aktual ${m.yr2})</strong>, sedangkan Tenor Pembayaran Kredit adalah <strong>${m.scfTenor} hari</strong> (${m.cashGapAtSCFMaturity_Actual > 0 ? `Defisit waktu <strong>${fmtNum(m.cashGapAtSCFMaturity_Actual, 1)} hari</strong> â€” kas belum terkumpul saat jatuh tempo!` : `Surplus waktu <strong>${fmtNum(Math.abs(m.cashGapAtSCFMaturity_Actual), 1)} hari</strong> â€” aman & self-liquidating.`}).</p>
      </div>

      <div style="padding:0.45rem; background:#fffbeb; border:1px solid #fde68a; border-radius:6px;">
        <div style="font-weight:700; color:#92400e; margin-bottom:0.12rem;">
          2. Evaluasi Fasilitas Tambahan / KMK Backup (+${m.kmkTenor} Hari â†’ Total ${m.totalMaxTenor} Hari)
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
          <td><strong>Operating Working Capital (AR + Inv âˆ’ AP)</strong></td>
          <td class="num-col"><strong>${fmtRp(m.owc23)}</strong></td>
        </tr>
        <tr>
          <td><strong>Net Working Capital (CA âˆ’ CL)</strong></td>
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
    document.getElementById('rng_simGPM').value = Number(Math.max(10.5, m.minRequiredGPM).toFixed(1));
    document.getElementById('rng_simDOI').value = m.targetSafeDOI;
    document.getElementById('rng_simDOR').value = Math.min(55, Math.round(m.dor23_365));
    document.getElementById('rng_simDOP').value = Math.max(65, proj.claimedDOP);
    document.getElementById('rng_simRevGrowth').value = 15;
    document.getElementById('rng_simOpexCut').value = m.gp23 < 0 ? 45 : 10;
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
  const isViable = simGP > 0 && simEBT > 0 && tenorFit && simDSCR >= 1.15;

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

  const statusColor = res.isViable ? '#166534' : (res.simGP > 0 ? '#92400e' : '#991b1b');
  const statusBg = res.isViable ? '#f0fdf4' : (res.simGP > 0 ? '#fffbeb' : '#fef2f2');
  const statusLabel = res.isViable
    ? `âœ… LAYAK & SELF-LIQUIDATING (SIKLUS â‰¤ ${proj.scfTenorDays} HARI)`
    : (res.simGP > 0
      ? 'âš ï¸ MARGIN POSITIF TETAPI SIKLUS/DSCR PERLU PENYESUAIAN'
      : 'âŒ TIDAK LAYAK (DEFISIT KAS & DEFAULT SAAT JATUH TEMPO)');

  document.getElementById('stressTestResultPanel').innerHTML = `
    <div style="background:${statusBg}; border:1.5px solid ${statusColor}; border-radius:8px; padding:0.65rem;">
      <div style="font-size:0.66rem; font-weight:700; text-transform:uppercase; color:${statusColor};">Hasil Simulasi SWCM</div>
      <div style="font-size:0.8rem; font-weight:800; color:${statusColor}; margin:0.1rem 0 0.45rem;">${statusLabel}</div>

      <div class="grid-2" style="gap:0.35rem; margin-bottom:0.45rem;">
        <div style="background:#fff; padding:0.35rem 0.5rem; border-radius:5px; border:1px solid var(--border-color);">
          <div style="font-size:0.64rem; color:var(--text-muted);">Siklus Gross (DOI + DOR)</div>
          <div style="font-size:0.9rem; font-weight:800; color:${res.tenorFit ? '#166534' : '#dc2626'};">
            ${res.simGrossCycle} Hr ${res.tenorFit ? `â‰¤ ${proj.scfTenorDays}h` : `> ${proj.scfTenorDays}h!`}
          </div>
          <div style="font-size:0.64rem; color:var(--text-muted);">CCC Bersih: <strong>${res.simCCC} Hr</strong></div>
        </div>

        <div style="background:#fff; padding:0.35rem 0.5rem; border-radius:5px; border:1px solid var(--border-color);">
          <div style="font-size:0.64rem; color:var(--text-muted);">Pelepasan Kas Modal Kerja (Î”OWC)</div>
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
      name: '5. â­ Skenario Turnaround / Mitigasi DCC-SWCM',
      params: { gpm: Math.max(10.5, m.minRequiredGPM), doi: m.targetSafeDOI, dor: Math.min(55, Math.round(m.dor23_365)), dop: Math.max(65, proj.claimedDOP), revGrowth: 15, opexCut: m.gp23 < 0 ? 45 : 10, fxShock: 0, invHaircut: 0 }
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
        <th class="num-col">Pelepasan Kas (Î”OWC)</th>
        <th class="num-col">DSCR</th>
        <th>Status Kelayakan</th>
      </tr>
    </thead>
    <tbody>
      ${scenarios.map((s) => {
        const r = evaluateScenarioParams(proj, m, s.params);
        return `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td class="num-col" style="color:${s.params.gpm >= 0 ? '#166534' : '#dc2626'}; font-weight:700;">${fmtPct(s.params.gpm, 1)}</td>
            <td class="num-col">${r.simGrossCycle}h ${r.tenorFit ? 'âœ…' : 'âŒ'}</td>
            <td class="num-col">${r.simCCC}h</td>
            <td class="num-col">${fmtRp(r.simGP, true)}</td>
            <td class="num-col" style="color:${r.deltaOWC >= 0 ? '#166534' : '#dc2626'}; font-weight:700;">
              ${r.deltaOWC >= 0 ? '+' : ''}${fmtRp(r.deltaOWC, true)}
            </td>
            <td class="num-col" style="font-weight:700;">${fmtNum(r.simDSCR, 2)}x</td>
            <td>
              <span class="grade-badge ${r.isViable ? 'grade-AA' : 'grade-B'}">
                ${r.isViable ? 'LAYAK (SELF-LIQUIDATING)' : `DEFAULT HARI KE-${proj.scfTenorDays}`}
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
          <strong>Kasus Aktif:</strong> <span style="color:var(--askrindo-blue); font-weight:700;">${proj.companyName}</span>
          <span style="color:var(--text-muted); margin-left:0.35rem;">| Bank: <strong>${proj.bankName}</strong> | Plafond: <strong>${fmtRp(proj.requestedPlafond)}</strong></span>
        </div>
        <div>
          <span class="grade-badge ${m.gradeMeta.badgeCls}">
            Skor: ${m.score}/100 (Grade ${m.shortGrade}) â€” ${m.decision}
          </span>
        </div>
      </div>

      <div style="border:1px solid #cbd5e1; border-radius:7px; padding:0.65rem; background:#fff;">
        <h3 style="color:var(--askrindo-navy); font-size:0.88rem; margin-bottom:0.4rem; border-bottom:2px solid var(--askrindo-blue); padding-bottom:0.25rem;">
          ðŸ“Œ I. CRITICAL POINTS (Kondisi Keuangan, Siklus Kas &amp; Ketahanan NWC)
        </h3>
        <div class="grid-2" style="gap:0.55rem;">
          <div style="background:#fef2f2; padding:0.55rem; border-radius:6px; border-left:3.5px solid #dc2626;">
            <h4 style="color:#991b1b; font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">A. Critical Points Kondisi Keuangan &amp; Likuiditas (${proj.companyName})</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.criticalPointsFin.map((item) => `<li><strong>${item.title}:</strong> ${item.detail}</li>`).join('')}
            </ol>
          </div>

          <div style="background:#fffbeb; padding:0.55rem; border-radius:6px; border-left:3.5px solid #f59e0b;">
            <h4 style="color:#92400e; font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">B. Critical Points Struktur Fasilitas &amp; Eksposur Penjaminan (${proj.bankName})</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.criticalPointsCredit.map((item) => `<li><strong>${item.title}:</strong> ${item.detail}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>

      <div style="border:1px solid #cbd5e1; border-radius:7px; padding:0.65rem; background:#fff;">
        <h3 style="color:var(--askrindo-navy); font-size:0.88rem; margin-bottom:0.4rem; border-bottom:2px solid var(--askrindo-green); padding-bottom:0.25rem;">
          ðŸ›¡ï¸ II. INFORMASI WAJIB UNDERWRITER &amp; KETENTUAN MITIGASI RISIKO (COVENANTS)
        </h3>
        <div class="grid-2" style="gap:0.55rem;">
          <div style="background:#f8fafc; padding:0.55rem; border-radius:6px; border:1px solid var(--border-color);">
            <h4 style="color:var(--askrindo-blue); font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">A. Informasi &amp; Dokumen Wajib Diminta</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.requiredInfos.map((info) => `<li><strong>${info.title}:</strong> ${info.detail}</li>`).join('')}
            </ol>
          </div>

          <div style="background:#f0fdf4; padding:0.55rem; border-radius:6px; border:1px solid #bbf7d0;">
            <h4 style="color:#166534; font-size:0.82rem; font-weight:800; margin-bottom:0.25rem;">B. Syarat &amp; Mitigasi Penjaminan Askrindo</h4>
            <ol style="padding-left:1.1rem; display:flex; flex-direction:column; gap:0.3rem;">
              ${ins.mitigations.map((mit) => `<li><strong>${mit.title}:</strong> ${mit.detail}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>

      <div style="border:1.5px solid var(--askrindo-blue); border-radius:7px; padding:0.65rem; background:#f0f9ff;">
        <h3 style="color:var(--askrindo-navy); font-size:0.8rem; margin-bottom:0.35rem;">
          ðŸ’¡ III. REKOMENDASI UNDERWRITING &amp; RESTRUKTURISASI PARAMETER (METODE DCC-SWCM)
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
                <td class="num-col" style="color:#166534; font-weight:700;">â‰¤ ${m.targetSafeDOI} Hari</td>
                <td>Membebaskan kas internal <strong>+${fmtRp(m.cashReleasedAtSafeDOI, true)}</strong></td>
              </tr>
              <tr>
                <td><strong>Siklus Gross (DOI+DOR)</strong></td>
                <td class="num-col" style="color:${m.grossCycle23 > m.scfTenor ? '#dc2626' : '#166534'}; font-weight:700;">${fmtNum(m.grossCycle23, 1)} Hari vs Tenor ${m.scfTenor} Hr</td>
                <td class="num-col" style="color:#166534; font-weight:700;">${turnaroundSim.simGrossCycle} Hari (â‰¤ Tenor ${m.scfTenor} Hr)</td>
                <td>Fasilitas menjadi 100% Self-Liquidating</td>
              </tr>
              <tr>
                <td><strong>Gross Margin (GPM)</strong></td>
                <td class="num-col" style="color:${m.gpm23 < 0 ? '#dc2626' : '#166534'}; font-weight:700;">${fmtPct(m.gpm23, 2)} (${fmtRp(m.gp23, true)})</td>
                <td class="num-col" style="color:#166534; font-weight:700;">â‰¥ +${fmtNum(Math.max(10.5, m.minRequiredGPM), 1)}% (${fmtRp(turnaroundSim.simGP, true)})</td>
                <td>DSCR naik menjadi <strong>${fmtNum(turnaroundSim.simDSCR, 2)}x</strong></td>
              </tr>
              <tr>
                <td><strong>KMK Backup &amp; Coverage</strong></td>
                <td class="num-col">KMK Backup: ${proj.kmkTenorDays} Hr | Full Risk</td>
                <td class="num-col" style="color:#166534; font-weight:700;">Hapus Auto-Backup | Coverage Maks ${m.recCoveragePct || 55}%</td>
                <td>Eliminasi moral hazard default di hari ke-${m.scfTenor}</td>
              </tr>
              <tr>
                <td><strong>Agunan Tambahan &amp; Risk Sharing</strong></td>
                <td class="num-col">Coverage 100% (Tanpa Tambahan Agunan Riil)</td>
                <td class="num-col" style="color:#166534; font-weight:700;">Agunan Fixed Asset â‰¥ 120% (${fmtRp(proj.requestedPlafond * 1.2, true)}) | Risk Sharing Askrindo Maks ${m.recCoveragePct || 55}%</td>
                <td>Loss-absorbing buffer &amp; kepastian pemulihan recovery klaim Askrindo</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-group">
          <label style="font-weight:700; color:var(--askrindo-navy);">âœï¸ Catatan &amp; Keputusan Tambahan Underwriter (Tersimpan Otomatis per Kasus):</label>
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

function renderPortfolioComparisonTab() {
  const tbody = projects.map((p) => {
    const m = computeDCCSWCM(p);
    const activeRowStyle = p.id === activeProjectId ? 'background:#f0f9ff;' : '';
    return `
      <tr style="${activeRowStyle}">
        <td>
          <a href="javascript:void(0)" onclick="selectProject('${p.id}'); switchTab('tab-dashboard');" style="font-weight:700; color:var(--askrindo-blue); text-decoration:none;">
            ${p.companyName}
          </a>
          <div style="font-size:0.65rem; color:var(--text-muted);">${p.sector}</div>
        </td>
        <td>${p.bankName}<br/><small style="color:var(--text-muted);">${p.facilityType}</small></td>
        <td class="num-col">${fmtRp(p.requestedPlafond, true)}</td>
        <td class="num-col">${m.claimedCCC} hr</td>
        <td class="num-col" style="font-weight:700; color:${m.ccc23 > 200 ? '#dc2626' : '#0f172a'};">${fmtNum(m.ccc23, 1)} hr</td>
        <td class="num-col">${fmtNum(m.pureCashRunwayMonths, 1)} bln (${fmtNum(m.pureCashRunwayDays, 0)}h)</td>
        <td class="num-col" style="color:${m.gpm23 < 0 ? '#dc2626' : '#166534'}; font-weight:700;">${fmtPct(m.gpm23, 1)}</td>
        <td class="num-col"><span class="grade-badge ${m.gradeMeta.badgeCls}">${m.score}/100 (${m.shortGrade})</span></td>
        <td>
          <div style="display:flex; gap:0.2rem;">
            <button class="btn btn-outline btn-sm" onclick="selectProject('${p.id}'); switchTab('tab-burn');">NWC</button>
            <button class="btn btn-outline btn-sm" onclick="selectProject('${p.id}'); switchTab('tab-grade');">Grade</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('portfolioComparisonTable').innerHTML = `
    <thead>
      <tr>
        <th>Nama Debitur &amp; Sektor</th>
        <th>Mitra Bank &amp; Skema</th>
        <th class="num-col">Plafond</th>
        <th class="num-col">CCC Data Bank</th>
        <th class="num-col">CCC Aktual</th>
        <th class="num-col">Cash Runway</th>
        <th class="num-col">GPM</th>
        <th class="num-col">Skor &amp; Risk Grade</th>
        <th>Aksi</th>
      </tr>
    </thead>
    <tbody>${tbody}</tbody>
  `;
}

function renderPrintableReport(proj, m) {
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const ins = buildDynamicCaseInsights(proj, m);

  document.getElementById('printableMemoContainer').innerHTML = `
    <div style="border-bottom:2.5px solid var(--askrindo-navy); padding-bottom:0.65rem; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <img src="logo-asca.png" alt="ASCA - Askrindo Smart Credit Analysis" style="height:38px; width:auto; object-fit:contain;" />
        <div>
          <h2 style="font-size:0.95rem; color:var(--askrindo-navy);">NOTA ANALISA UNDERWRITING PENJAMINAN KREDIT (ASCA)</h2>
          <p style="font-size:0.68rem; color:var(--text-muted);">Metode: Dynamic Cash Conversion &amp; Stress-Tested Working Capital Model (DCC-SWCM)</p>
        </div>
      </div>
      <div style="text-align:right; font-size:0.68rem;">
        <div><strong>Tanggal:</strong> ${today}</div>
        <div><strong>ID Kasus:</strong> ${proj.id.toUpperCase()}</div>
        <div><strong>Underwriter:</strong> ${proj.underwriter}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:0.65rem;">
      <table class="data-table">
        <tbody>
          <tr><td><strong>Nama Debitur</strong></td><td><strong>${proj.companyName}</strong></td></tr>
          <tr><td><strong>Sektor Usaha</strong></td><td>${proj.sector} (Berdiri ${proj.estYear})</td></tr>
          <tr><td><strong>Bank Mitra</strong></td><td>${proj.bankName}</td></tr>
          <tr><td><strong>Skema Fasilitas</strong></td><td>${proj.facilityType}</td></tr>
        </tbody>
      </table>
      <table class="data-table">
        <tbody>
          <tr><td><strong>Plafond Diajukan</strong></td><td><strong>${fmtRp(proj.requestedPlafond)}</strong> ${proj.usdAmount > 0 ? `(USD ${proj.usdAmount.toLocaleString('id-ID')} @ Rp${proj.fxRate.toLocaleString('id-ID')})` : ''}</td></tr>
          <tr><td><strong>Tenor Fasilitas</strong></td><td>PK ${proj.pkMonths} Bln | Tenor Utama: ${proj.scfTenorDays} Hr | KMK Backup: ${proj.kmkTenorDays} Hr</td></tr>
          <tr><td><strong>Skor &amp; Risk Grade</strong></td><td><strong>${m.score} / 100 â€” Grade ${m.riskGrade}</strong> (IJP: ${m.ijpRate})</td></tr>
          <tr><td><strong>Keputusan</strong></td><td><strong style="color:${m.gradeMeta.color};">${m.decision}</strong></td></tr>
        </tbody>
      </table>
    </div>

    <h4 style="color:var(--askrindo-navy); margin:0.4rem 0 0.2rem; font-size:0.76rem;">I. Audit Siklus Kas &amp; Ketahanan NWC Burn Rate</h4>
    <table class="data-table" style="margin-bottom:0.6rem;">
      <thead>
        <tr>
          <th>Indikator</th>
          <th class="num-col">Data Bank</th>
          <th class="num-col">Audited ${m.yr1}</th>
          <th class="num-col">Audited ${m.yr2}</th>
          <th class="num-col">Deviasi / Evaluasi</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>DOR (Days of Receivables)</td>
          <td class="num-col">${proj.claimedDOR} Hari</td>
          <td class="num-col">${fmtNum(m.dor22_365, 1)} Hari</td>
          <td class="num-col">${fmtNum(m.dor23_365, 1)} Hari</td>
          <td class="num-col">${m.diffDOR >= 0 ? '+' : ''}${fmtNum(m.diffDOR, 1)} Hari</td>
        </tr>
        <tr>
          <td>DOI (Days of Inventory)</td>
          <td class="num-col">${proj.claimedDOI} Hari</td>
          <td class="num-col">${fmtNum(m.doi22_365, 1)} Hari</td>
          <td class="num-col"><strong>${fmtNum(m.doi23_365, 1)} Hari</strong></td>
          <td class="num-col" style="color:#dc2626; font-weight:700;">${m.diffDOI >= 0 ? '+' : ''}${fmtNum(m.diffDOI, 1)} Hari</td>
        </tr>
        <tr>
          <td>Siklus Operasi Gross (DOI+DOR)</td>
          <td class="num-col"><strong>${m.claimedGrossCycle} Hari</strong></td>
          <td class="num-col">${fmtNum(m.grossCycle22, 1)} Hari</td>
          <td class="num-col"><strong>${fmtNum(m.grossCycle23, 1)} Hari</strong></td>
          <td class="num-col">Tenor: ${m.scfTenor} Hr (${m.cashGapAtSCFMaturity_Actual > 0 ? `Defisit ${fmtNum(m.cashGapAtSCFMaturity_Actual, 1)} Hr` : 'Aman'})</td>
        </tr>
        <tr>
          <td>Daily Gross Cash Burn &amp; Runway</td>
          <td colspan="2">Burn: <strong>${fmtRp(m.dailyGrossCashBurn)} / hari</strong></td>
          <td colspan="2" class="num-col" style="color:${m.pureCashRunwayMonths < 1.5 ? '#dc2626' : '#166534'}; font-weight:700;">
            Pure Cash Runway: ${fmtNum(m.pureCashRunwayMonths, 1)} Bulan (${fmtNum(m.pureCashRunwayDays, 0)} Hari)
          </td>
        </tr>
      </tbody>
    </table>

    <div class="grid-2" style="margin-bottom:0.6rem; font-size:0.7rem;">
      <div style="border:1px solid var(--border-color); border-radius:6px; padding:0.45rem;">
        <div style="font-weight:700; color:#991b1b; margin-bottom:0.18rem;">II. Ringkasan Critical Points:</div>
        <ul style="padding-left:1.1rem;">
          ${[...ins.criticalPointsFin, ...ins.criticalPointsCredit].map((c) => `<li><strong>${c.title}</strong></li>`).join('')}
        </ul>
      </div>
      <div style="border:1px solid var(--border-color); border-radius:6px; padding:0.45rem;">
        <div style="font-weight:700; color:#166534; margin-bottom:0.18rem;">III. Syarat &amp; Mitigasi Penjaminan (Covenants):</div>
        <ul style="padding-left:1.1rem;">
          ${ins.mitigations.map((mit) => `<li><strong>${mit.title}</strong></li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="decision-box ${m.decisionClass}">
      <div style="font-weight:800; font-size:0.78rem; margin-bottom:0.12rem;">REKOMENDASI KOMITE UNDERWRITING ASKRINDO: ${m.decision} (Coverage Maks ${m.recCoveragePct || 55}%)</div>
      <p style="font-size:0.71rem; line-height:1.4;">
        ${proj.customNotes ? `<strong>Catatan Underwriter:</strong> ${proj.customNotes}<br/>` : ''}
        Plafond Rekomendasi: <strong>${fmtRp(m.recommendedMitigatedLimit > 0 ? m.recommendedMitigatedLimit : proj.requestedPlafond)}</strong> dengan pencairan bertahap maksimal <strong>${fmtRp(m.recommendedTrancheSize)} per tranche</strong>, target DOI â‰¤ <strong>${m.targetSafeDOI} hari</strong>, dan Gross Margin minimal <strong>+${fmtNum(Math.max(8, m.minRequiredGPM), 1)}%</strong>.
      </p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1.5rem; margin-top:1.3rem; text-align:center; font-size:0.71rem;">
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
        <div style="color:var(--text-muted);">Reviewer Risiko Penjaminan</div>
      </div>
      <div>
        <div>Disetujui Oleh,</div>
        <div style="height:36px;"></div>
        <div style="font-weight:700; border-top:1px solid #94a3b8; padding-top:3px;">Komite Pemutus Penjaminan</div>
        <div style="color:var(--text-muted);">PT Asuransi Kredit Indonesia</div>
      </div>
    </div>
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

  setVal('inp_claimedDOR', proj.claimedDOR, true);
  setVal('inp_claimedDOI', proj.claimedDOI, true);
  setVal('inp_claimedDOP', proj.claimedDOP, true);

  setVal('inp_year1', proj.year1 || 2022);
  setVal('inp_year2', proj.year2 || 2023);

  const fields = ['rev', 'cogs', 'opex', 'tax', 'cash', 'ar', 'otherAr', 'inv', 'otherCa', 'fa', 'taxAsset', 'stDebt', 'ap', 'otherAp', 'accrued', 'ltDebt', 'capital', 're'];
  fields.forEach((k) => {
    setVal(`inp_${k}22`, proj.fin22[k], true);
    setVal(`inp_${k}23`, proj.fin23[k], true);
  });
}

function syncInputsToModel() {
  const proj = getActiveProject();
  if (!proj) return;

  const getStr = (id) => document.getElementById(id)?.value || '';
  const getFmtNum = (id) => parseFormattedNumber(document.getElementById(id)?.value);
  const getPlainNum = (id) => parseFloat(document.getElementById(id)?.value) || 0;

  proj.companyName = getStr('inp_companyName');
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

  proj.claimedDOR = getFmtNum('inp_claimedDOR');
  proj.claimedDOI = getFmtNum('inp_claimedDOI');
  proj.claimedDOP = getFmtNum('inp_claimedDOP');

  proj.year1 = getPlainNum('inp_year1') || 2022;
  proj.year2 = getPlainNum('inp_year2') || 2023;

  const fields = ['rev', 'cogs', 'opex', 'tax', 'cash', 'ar', 'otherAr', 'inv', 'otherCa', 'fa', 'taxAsset', 'stDebt', 'ap', 'otherAp', 'accrued', 'ltDebt', 'capital', 're'];
  fields.forEach((k) => {
    proj.fin22[k] = getFmtNum(`inp_${k}22`);
    proj.fin23[k] = getFmtNum(`inp_${k}23`);
  });

  saveProjectsToStorage();
  const m = computeDCCSWCM(proj);

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
  renderScoreCalculationTab(proj, m);
  renderCaseStudyQATab(proj, m);
  renderPortfolioComparisonTab();
  renderPrintableReport(proj, m);
}

// ============================================================================
// 12. TAB NAVIGATION & MODAL ACTIONS
// ============================================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === tabId);
  });
}

function openNewProjectModal() {
  document.getElementById('new_companyName').value = '';
  document.getElementById('new_sector').value = 'Perdagangan / Industri Pengolahan';
  document.getElementById('new_bankName').value = 'Bank Dana';
  document.getElementById('new_facilityType').value = 'Kredit Modal Kerja / SCF';
  document.getElementById('new_plafond').value = formatNumberWithDots(15000000000);
  document.getElementById('new_year1').value = 2022;
  document.getElementById('new_year2').value = 2023;
  document.getElementById('newProjectModal').classList.add('open');
}

function closeNewProjectModal() {
  document.getElementById('newProjectModal').classList.remove('open');
}

function createNewProjectFromModal() {
  const name = document.getElementById('new_companyName').value.trim() || `Proyek Kredit Baru #${projects.length + 1}`;
  const sector = document.getElementById('new_sector').value.trim() || 'Umum';
  const bank = document.getElementById('new_bankName').value.trim() || 'Bank Mitra';
  const fac = document.getElementById('new_facilityType').value.trim() || 'KMK';
  const plafond = parseFormattedNumber(document.getElementById('new_plafond').value) || 10000000000;
  const yr1 = parseInt(document.getElementById('new_year1').value, 10) || 2022;
  const yr2 = parseInt(document.getElementById('new_year2').value, 10) || 2023;
  const tpl = document.getElementById('new_templateType').value;

  const defaults = getDefaultProjects();
  let baseObj;
  if (tpl === 'clone_rahmat') {
    baseObj = JSON.parse(JSON.stringify(defaults[0]));
  } else if (tpl === 'clone_current') {
    baseObj = JSON.parse(JSON.stringify(getActiveProject()));
  } else {
    baseObj = JSON.parse(JSON.stringify(defaults[2]));
  }

  baseObj.id = 'case-' + Date.now();
  baseObj.companyName = name;
  baseObj.sector = sector;
  baseObj.bankName = bank;
  baseObj.facilityType = fac;
  baseObj.requestedPlafond = plafond;
  baseObj.usdAmount = 0;
  baseObj.year1 = yr1;
  baseObj.year2 = yr2;
  baseObj.customNotes = '';
  baseObj.manualGradeOverride = 'AUTO';
  baseObj.overrideReason = '';

  projects.unshift(baseObj);
  activeProjectId = baseObj.id;
  saveProjectsToStorage();
  closeNewProjectModal();
  renderAll();
  switchTab('tab-input');
  showToast(`Proyek "${name}" berhasil dibuat!`);
}

function duplicateCurrentProject() {
  const curr = getActiveProject();
  if (!curr) return;
  const copy = JSON.parse(JSON.stringify(curr));
  copy.id = 'case-' + Date.now();
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

  if (!proj) {
    // Tampilan ketika belum ada proyek yang dibuat (User Baru / Akun Kosong)
    const bYEl = document.getElementById('bannerFinYears');
    if (bYEl) bYEl.textContent = '-';
    
    const bannerTitle = document.getElementById('bannerCompanyName');
    if (bannerTitle) bannerTitle.textContent = 'Belum Ada Proyek Analisa';
    const bannerSector = document.getElementById('bannerSector');
    if (bannerSector) bannerSector.textContent = 'Klik tombol "+ Proyek Baru" di atas untuk memulai analisa kasus kredit pertama Anda.';
    const bannerGrade = document.getElementById('bannerGrade');
    if (bannerGrade) bannerGrade.textContent = '-';
    const bannerScore = document.getElementById('bannerScore');
    if (bannerScore) bannerScore.textContent = '-';
    const bannerDecision = document.getElementById('bannerDecision');
    if (bannerDecision) bannerDecision.textContent = 'SIAP ANALISA KASUS BARU';

        const dashPane = document.getElementById('tab-dashboard');
    if (dashPane) {
      dashPane.innerHTML =
        '<div class="card" style="text-align:center; padding:3.5rem 1.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center;">' +
        '<div style="margin-bottom:1.2rem; background:rgba(0,86,145,0.08); width:88px; height:88px; border-radius:50%; display:flex; align-items:center; justify-content:center;">' +
        '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#005691" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin:0 auto;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' +
        '</div>' +
        '<h2 style="color:var(--askrindo-navy); font-size:1.35rem; font-weight:800; margin-bottom:0.5rem; text-align:center;">Ruang Kerja Analisa Kredit Masih Kosong</h2>' +
        '<p style="color:var(--text-muted); max-width:540px; margin:0 auto 1.8rem; font-size:0.86rem; line-height:1.5; text-align:center;">Akun ini belum memiliki berkas analisa debitur. Mulai dengan membuat proyek analisa kredit baru atau buka file database (.asca.json) yang telah disimpan sebelumnya.</p>' +
        '<div style="display:flex; justify-content:center; align-items:center; gap:0.85rem; flex-wrap:wrap; margin:0 auto;">' +
        '<button class="btn btn-primary" onclick="openNewProjectModal()" style="display:inline-flex; align-items:center; justify-content:center; gap:0.45rem; padding:0.6rem 1.3rem; font-size:0.88rem; font-weight:700;">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
        ' <span>Buat Proyek Pertama</span></button>' +
        '<label class="btn btn-light" style="display:inline-flex; align-items:center; justify-content:center; gap:0.45rem; padding:0.6rem 1.3rem; font-size:0.88rem; font-weight:700; margin:0; cursor:pointer;">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>' +
        ' <span>Buka File (.asca.json)</span>' +
        '<input type="file" accept=".json" style="display:none" onchange="importWorkspaceJSON(event)" /></label>' +
        '</div></div>';
    }
    return;
  }

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
  renderDCCTab(proj, m);
  renderBurnRateTab(proj, m);
  syncSlidersWithCurrentProject(proj, m);
  runStressSimulation();
  renderGradeRiskTab(proj, m);
  renderScoreCalculationTab(proj, m);
  renderCaseStudyQATab(proj, m);
  renderPortfolioComparisonTab();
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

    loadProjectsFromStorage();
    renderAll();
  }
}

async function handleLoginSubmit(event) {
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
    btnSubmit.innerHTML = '<span>⏳ Memeriksa Akun...</span>';
  }

  try {
    // 1. Coba periksa langsung ke akun lokal/default terlebih dahulu (instant login)
    let localUsers = getUsersFromStorage();
    let user = localUsers.find((u) => u.username.toLowerCase() === uname.toLowerCase());

    // 2. Jika tidak ditemukan atau butuh data cloud terbaru, ambil dari Supabase Cloud
    if (!user) {
      const cloudUsers = await fetchUsersFromCloud();
      user = cloudUsers.find((u) => u.username.toLowerCase() === uname.toLowerCase());
    } else {
      // Ambil update cloud di latar belakang tanpa memblokir login
      fetchUsersFromCloud().catch(() => {});
    }

    if (!user || user.password !== pwd) {
      // Coba sekali lagi fetch dari cloud jika password salah di cache
      const cloudUsers = await fetchUsersFromCloud();
      user = cloudUsers.find((u) => u.username.toLowerCase() === uname.toLowerCase());
      
      if (!user || user.password !== pwd) {
        if (alertBox) alertBox.style.display = 'flex';
        if (alertMsg) alertMsg.textContent = 'Username atau kata sandi tidak valid!';
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>🔐 Masuk ke Sistem</span>';
        }
        return;
      }
    }

    if (user.status !== 'active') {
      if (alertBox) alertBox.style.display = 'flex';
      if (alertMsg) alertMsg.textContent = 'Akun Anda dinonaktifkan oleh Administrator. Hubungi IT/Super Admin.';
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>🔐 Masuk ke Sistem</span>';
      }
      return;
    }

    // Update last login di Supabase Cloud
    const nowIso = new Date().toISOString();
    user.lastLogin = nowIso;
    saveUsersToStorage(localUsers);

    supabaseFetch(`users?username=eq.${encodeURIComponent(user.username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_login: nowIso })
    }).catch((e) => console.warn('Gagal update last_login ke cloud:', e));

    // Simpan sesi lokal
    const session = {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      unit: user.unit,
      loginAt: nowIso
    };
    setActiveSession(session);

    if (alertBox) alertBox.style.display = 'none';
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';

    showToast(`Selamat datang, ${user.fullName}!`);
    await checkAuthAndRoute();
  } catch (err) {
    console.error('Login error:', err);
    if (alertBox) alertBox.style.display = 'flex';
    if (alertMsg) alertMsg.textContent = 'Terjadi kesalahan koneksi server: ' + err.message;
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>🔐 Masuk ke Sistem</span>';
    }
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

function logoutSession() {
  const session = getActiveSession();
  const name = session ? session.fullName : 'Pengguna';
  setActiveSession(null);
  showToast(`Sampai jumpa, ${name}. Sesi telah diakhiri.`);
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
      ? '<span class="badge-role-admin">🛡️ Super Admin</span>'
      : '<span class="badge-role-analyst">📝 Analis Kredit</span>';
    const statusBadge = u.status === 'active'
      ? '<span class="badge-status-active">● Aktif</span>'
      : '<span class="badge-status-inactive">○ Non-Aktif</span>';

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
        <td><span style="color:var(--text-muted); font-size:0.75rem;">${u.unit || '-'}</span></td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td style="font-size:0.74rem; color:var(--text-muted);">${lastLoginStr}</td>
        <td>
          <div class="admin-actions" style="justify-content:center;">
            <button class="btn btn-sm btn-outline" onclick="openModalResetPassword('${u.username}')" title="Reset Kata Sandi">
              🔑 Reset
            </button>
            ${!isMainAdmin ? `
              <button class="btn btn-sm ${u.status === 'active' ? 'btn-outline' : 'btn-primary'}" onclick="toggleUserStatus('${u.username}')" title="${u.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}">
                ${u.status === 'active' ? '🔒 Nonaktifkan' : '🔓 Aktifkan'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser('${u.username}')" title="Hapus Pengguna">
                🗑️
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
    alert('Akun Super Admin utama tidak boleh dinonaktifkan!');
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
    alert('Akun Super Admin utama tidak boleh dihapus!');
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