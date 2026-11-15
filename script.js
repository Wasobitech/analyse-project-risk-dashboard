/* ===============================
   UTILITIES
================================ */
function rupiah(value) {
  if (!isFinite(value)) value = 0;
  return "Rp" + Math.round(value).toLocaleString("id-ID");
}

function shortRupiah(value) {
  if (Math.abs(value) >= 1000000000)
    return "Rp" + (value / 1000000000).toFixed(2) + " M";
  if (Math.abs(value) >= 1000000)
    return "Rp" + (value / 1000000).toFixed(1) + " jt";
  if (Math.abs(value) >= 1000)
    return "Rp" + (value / 1000).toFixed(0) + " rb";
  return rupiah(value);
}

function percent(value) {
  return (value || 0).toFixed(2) + "%";
}

/* ===============================
   NAVIGATION & MOBILE DRAWER
================================ */
function showPage(id, button) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const targetPage = document.getElementById(id);
  if (targetPage) targetPage.classList.add("active");

  document.querySelectorAll(".nav button, .mobile-bottom-nav button").forEach(b => b.classList.remove("active"));
  if (button) {
    button.classList.add("active");
  } else {
    // Sync buttons across sidebar & bottom nav
    document.querySelectorAll(`.nav button[onclick*="${id}"], .mobile-bottom-nav button[onclick*="${id}"]`).forEach(b => b.classList.add("active"));
  }

  // Close mobile sidebar if open
  document.getElementById("sidebar").classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  buildEscrow();
  buildChecklist();
  calculate();
});

/* ===============================
   PROJECT MODEL CALCULATIONS
================================ */
function getProject() {
  const units = Number(document.getElementById("units").value) || 0;
  const physicalUnit = Number(document.getElementById("physicalUnit").value) || 0;
  const projectCost = Number(document.getElementById("projectCost").value) || 0;
  const contractUnit = Number(document.getElementById("contractUnit").value) || 0;
  const contingency = Number(document.getElementById("contingency").value) || 0;

  const contractRevenue = units * contractUnit;
  const physicalCost = units * physicalUnit;
  const contingencyAmount = projectCost * contingency / 100;
  const riskAdjustedCost = projectCost + contingencyAmount;
  const grossProfit = contractRevenue - projectCost;
  const riskAdjustedProfit = contractRevenue - riskAdjustedCost;
  const margin = contractRevenue ? (grossProfit / contractRevenue) * 100 : 0;
  const riskAdjustedMargin = contractRevenue ? (riskAdjustedProfit / contractRevenue) * 100 : 0;

  return {
    units,
    physicalUnit,
    physicalCost,
    projectCost,
    contractUnit,
    contractRevenue,
    contingency,
    contingencyAmount,
    riskAdjustedCost,
    grossProfit,
    riskAdjustedProfit,
    margin,
    riskAdjustedMargin
  };
}

function calculate() {
  const p = getProject();

  document.getElementById("dashUnits").textContent = p.units;
  document.getElementById("dashCost").textContent = shortRupiah(p.projectCost);
  document.getElementById("dashRevenue").textContent = shortRupiah(p.contractRevenue);
  
  document.getElementById("dashRisk").textContent = 
    p.margin < 0 ? "CRITICAL" :
    p.margin < 5 ? "HIGH" :
    p.margin < 10 ? "MEDIUM" : "CONTROLLED";

  document.getElementById("physicalPct").textContent = percent(p.projectCost ? (p.physicalCost / p.projectCost) * 100 : 0);
  document.getElementById("physicalBar").style.width = Math.min(100, p.projectCost ? (p.physicalCost / p.projectCost) * 100 : 0) + "%";

  document.getElementById("otherPct").textContent = percent(p.projectCost ? ((p.projectCost - p.physicalCost) / p.projectCost) * 100 : 0);
  document.getElementById("otherBar").style.width = Math.min(100, p.projectCost ? ((p.projectCost - p.physicalCost) / p.projectCost) * 100 : 0) + "%";

  document.getElementById("marginPct").textContent = percent(p.margin);
  document.getElementById("marginBar").style.width = Math.max(0, Math.min(100, p.margin * 2)) + "%";

  /* Economics Page */
  document.getElementById("econRevenue").textContent = shortRupiah(p.contractRevenue);
  document.getElementById("econCost").textContent = shortRupiah(p.projectCost);
  document.getElementById("econProfit").textContent = shortRupiah(p.grossProfit);
  document.getElementById("econMargin").textContent = percent(p.margin);

  document.getElementById("unitPhysical").textContent = rupiah(p.physicalUnit);
  document.getElementById("unitCost").textContent = rupiah(p.units ? p.projectCost / p.units : 0);
  document.getElementById("unitRevenue").textContent = rupiah(p.contractUnit);
  document.getElementById("unitProfit").textContent = rupiah(p.units ? p.grossProfit / p.units : 0);
  document.getElementById("unitMargin").textContent = percent(p.margin);

  buildSensitivity(p);
  calculateCashflow();
  calculateBuyer();
  calculateDecision();
  updateDashboardDecision(p);
}

/* ===============================
   SENSITIVITY & SIMULATORS
================================ */
function buildSensitivity(p) {
  const prices = [60000000, 65000000, 66666667, 70000000, 75000000, 80000000];
  const html = prices.map(price => {
    const revenue = p.units * price;
    const profit = revenue - p.projectCost;
    const margin = revenue ? (profit / revenue) * 100 : 0;
    return `
      <tr>
        <td>${rupiah(price)}</td>
        <td>${shortRupiah(revenue)}</td>
        <td>${shortRupiah(profit)}</td>
        <td>${percent(margin)}</td>
      </tr>
    `;
  }).join("");
  document.getElementById("sensitivityTable").innerHTML = html;
}

function calculateCashflow() {
  const p = getProject();
  const fundingPct = Number(document.getElementById("fundingPct").value) || 0;
  const delayDays = Number(document.getElementById("delayDays").value) || 0;
  const capitalCost = Number(document.getElementById("capitalCost").value) || 0;

  const peakFunding = p.projectCost * fundingPct / 100;
  const financingCost = peakFunding * (capitalCost / 100) * (delayDays / 365);
  const effectiveCost = p.projectCost + financingCost;
  const riskProfit = p.contractRevenue - effectiveCost;

  document.getElementById("peakFunding").textContent = shortRupiah(peakFunding);
  document.getElementById("finCost").textContent = shortRupiah(financingCost);
  document.getElementById("effectiveCost").textContent = shortRupiah(effectiveCost);
  document.getElementById("riskProfit").textContent = shortRupiah(riskProfit);

  const delays = [30, 60, 90, 120, 180];
  document.getElementById("delayTable").innerHTML = delays.map(days => {
    const cost = peakFunding * (capitalCost / 100) * (days / 365);
    const effective = p.projectCost + cost;
    const profit = p.contractRevenue - effective;
    return `
      <tr>
        <td>${days} hari</td>
        <td>${shortRupiah(cost)}</td>
        <td>${shortRupiah(effective)}</td>
        <td>${shortRupiah(profit)}</td>
      </tr>
    `;
  }).join("");
}

function calculateBuyer() {
  const buyers = Number(document.getElementById("buyers").value) || 0;
  const batch = Number(document.getElementById("batchBuyers").value) || 0;
  const failure = Number(document.getElementById("failureRate").value) || 0;

  const risk = Math.ceil(batch * failure / 100);
  const good = Math.max(0, batch - risk);
  const p = getProject();
  const unpaid = risk * p.contractUnit;

  document.getElementById("buyerGood").textContent = good;
  document.getElementById("buyerRisk").textContent = risk;
  document.getElementById("unpaidWork").textContent = shortRupiah(unpaid);
}

/* ===============================
   ESCROW & DUE DILIGENCE
================================ */
const escrowData = [
  { q: "Siapa pemilik hukum dana di rekening?", weight: 15 },
  { q: "Apakah developer dapat menarik dana secara sepihak?", weight: 15 },
  { q: "Apakah release berdasarkan milestone objektif?", weight: 15 },
  { q: "Apakah bank menerima instruksi release tertulis yang jelas?", weight: 15 },
  { q: "Apakah kontraktor memiliki hak pembayaran yang unconditional?", weight: 15 },
  { q: "Apakah ada mekanisme jika developer dan kontraktor berselisih?", weight: 10 },
  { q: "Apakah ada mekanisme pengembalian dana jika proyek dihentikan?", weight: 5 },
  { q: "Apakah draft escrow telah direview lawyer/notary?", weight: 10 }
];

function buildEscrow() {
  const container = document.getElementById("escrowQuestions");
  container.innerHTML = escrowData.map((item, index) => `
    <div class="check-item">
      <input type="checkbox" id="escrow_${index}" onchange="calculateEscrow()">
      <label for="escrow_${index}">
        ${item.q}
        <small>Bobot ${item.weight} poin</small>
      </label>
    </div>
  `).join("");
}

function calculateEscrow() {
  let score = 0;
  escrowData.forEach((item, index) => {
    if (document.getElementById("escrow_" + index).checked) {
      score += item.weight;
    }
  });

  document.getElementById("escrowScore").textContent = score + " / 100";
  document.getElementById("escrowBar").style.width = score + "%";

  let text = "";
  let cls = "alert-warning";

  if (score < 40) {
    text = "Escrow protection sangat lemah. Jangan menempatkan dana sebelum mekanisme release diperbaiki[cite: 1].";
    cls = "alert-danger";
  } else if (score < 70) {
    text = "Escrow memiliki sebagian kontrol tetapi masih terdapat celah material[cite: 1].";
    cls = "alert-warning";
  } else {
    text = "Struktur escrow relatif lebih kuat, tetapi tetap harus diverifikasi melalui dokumen bank dan kontrak[cite: 1].";
    cls = "alert-success";
  }

  const el = document.getElementById("escrowInterpretation");
  el.className = "alert " + cls;
  el.textContent = text;
}

const ddItems = [
  ["Akta dan perubahan terakhir developer", "Pastikan pihak yang menandatangani memiliki kewenangan[cite: 1]."],
  ["NIB / legal business documents", "Verifikasi identitas dan status usaha[cite: 1]."],
  ["Laporan keuangan developer", "Evaluasi kemampuan membayar kontraktor[cite: 1]."],
  ["Daftar utang / kewajiban developer", "Cari potensi default atau cross-default[cite: 1]."],
  ["Sertifikat tanah", "Verifikasi SHM/HGB dan penguasaan lahan[cite: 1]."],
  ["Hak tanggungan / beban tanah", "Pastikan tanah tidak menjadi sumber konflik[cite: 1]."],
  ["PBG", "Verifikasi persetujuan bangunan gedung[cite: 1]."],
  ["SLF jika relevan", "Pastikan kelayakan fungsi bangunan sesuai kebutuhan[cite: 1]."],
  ["Dokumen lingkungan", "UKL-UPL/AMDAL atau dokumen yang diwajibkan[cite: 1]."],
  ["RAB + BoQ + drawing", "Tidak boleh bekerja hanya berdasarkan angka global[cite: 1]."],
  ["Draft kontrak konstruksi", "Review scope, payment, default dan termination[cite: 1]."],
  ["Draft akta perubahan", "Pastikan tidak membuat kontraktor menanggung kewajiban developer[cite: 1]."],
  ["Draft rekening bersama / escrow", "Review mekanisme control dan release[cite: 1]."],
  ["Status 70 buyer", "Pisahkan lead, PPJB, submitted, approved dan akad[cite: 1]."],
  ["Bukti proses KPR", "Jangan menerima klaim “siap akad” tanpa dokumen[cite: 1]."],
  ["Jaminan pembayaran developer", "BG/corporate guarantee/security lain sesuai legal advice[cite: 1]."],
  ["Asuransi proyek dan K3", "Pastikan risiko konstruksi tidak seluruhnya menjadi beban kontraktor[cite: 1]."],
  ["Review pajak", "Tentukan treatment pajak transaksi secara spesifik[cite: 1]."]
];

function buildChecklist() {
  const el = document.getElementById("checklist");
  el.innerHTML = ddItems.map((item, i) => `
    <div class="check-item">
      <input type="checkbox" class="ddCheck" onchange="calculateDD()" id="dd_${i}">
      <label for="dd_${i}">
        ${item[0]}
        <small>${item[1]}</small>
      </label>
    </div>
  `).join("");
}

function calculateDD() {
  const checks = document.querySelectorAll(".ddCheck");
  const done = [...checks].filter(x => x.checked).length;
  const score = checks.length ? (done / checks.length) * 100 : 0;

  document.getElementById("ddScore").textContent = Math.round(score) + "%";
  document.getElementById("ddBar").style.width = score + "%";
  calculateDecision();
}

/* ===============================
   DECISION ENGINE
================================ */
function calculateDecision() {
  const p = getProject();
  const ddChecks = document.querySelectorAll(".ddCheck");
  const ddDone = [...ddChecks].filter(x => x.checked).length;
  const ddScore = ddChecks.length ? (ddDone / ddChecks.length) * 100 : 0;

  let economicScore = 0;
  if (p.margin >= 15) economicScore = 100;
  else if (p.margin >= 10) economicScore = 80;
  else if (p.margin >= 5) economicScore = 60;
  else if (p.margin >= 0) economicScore = 35;
  else economicScore = 0;

  const dependency = document.getElementById("paymentDependency").value;
  let paymentScore = dependency === "progress" ? 90 : dependency === "mixed" ? 65 : 20;

  const finalScore = economicScore * 0.40 + paymentScore * 0.30 + ddScore * 0.30;

  document.getElementById("economicScore").textContent = Math.round(economicScore);
  document.getElementById("paymentScore").textContent = Math.round(paymentScore);
  document.getElementById("readinessScore").textContent = Math.round(ddScore);

  const box = document.getElementById("decisionBox");
  let title = "CONDITIONAL GO";
  let text = "";
  box.className = "decision";

  if (p.margin < 0) {
    title = "NO-GO";
    text = "Nilai kontrak berada di bawah biaya proyek. Kontraktor berpotensi rugi bahkan sebelum biaya financing dan risiko tambahan[cite: 1].";
    box.classList.add("nogo");
  } else if (dependency === "akad" && ddScore < 70) {
    title = "NO-GO / HOLD";
    text = "Pembayaran masih bergantung pada akad buyer sementara due diligence belum memadai. Struktur ini membuat kontraktor menanggung risiko developer dan buyer[cite: 1].";
    box.classList.add("nogo");
  } else if (finalScore >= 75) {
    title = "POTENTIAL GO";
    text = "Secara awal proyek memiliki ekonomi dan proteksi yang cukup baik. Tetap lakukan legal review dan verifikasi bank sebelum funding[cite: 1].";
    box.classList.add("go");
  } else if (finalScore >= 50) {
    title = "CONDITIONAL GO";
    text = "Proyek dapat dilanjutkan hanya setelah gap kontrak, pembayaran, escrow atau due diligence ditutup[cite: 1].";
    box.classList.add("conditional");
  } else {
    title = "NO-GO / HOLD";
    text = "Risk-adjusted protection belum memadai untuk menempatkan modal kontraktor[cite: 1].";
    box.classList.add("nogo");
  }

  document.getElementById("decisionTitle").textContent = title;
  document.getElementById("decisionText").textContent = text;
}

function updateDashboardDecision(p) {
  const el = document.getElementById("dashDecision");
  if (p.margin < 0) {
    el.className = "alert alert-danger";
    el.innerHTML = "<strong>NO-GO</strong> Nilai kontrak berada di bawah biaya proyek[cite: 1].";
  } else if (p.margin < 5) {
    el.className = "alert alert-warning";
    el.innerHTML = "<strong>HIGH RISK</strong> Margin terlalu tipis untuk menyerap financing, delay dan cost overrun[cite: 1].";
  } else {
    el.className = "alert alert-info";
    el.innerHTML = "<strong>Potentially viable</strong> Margin positif, tetapi proteksi pembayaran dan legal due diligence tetap menentukan keputusan[cite: 1].";
  }
}

function resetProject() {
  document.getElementById("units").value = 30;
  document.getElementById("physicalUnit").value = 60000000;
  document.getElementById("projectCost").value = 2000000000;
  document.getElementById("contractUnit").value = 70000000;
  document.getElementById("contingency").value = 10;
  document.getElementById("paymentDependency").value = "akad";
  calculate();
}