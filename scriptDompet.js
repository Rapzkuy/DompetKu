/* ============================================================
   FITUR 1 — INPUT MASKING (FORMAT RUPIAH OTOMATIS)
   Saat user mengetik di input Jumlah, angka diformat otomatis
   dengan titik ribuan. Nilai murni diambil via getRawAmount().
============================================================ */
function setupInputMask(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.addEventListener('input', function() {
    const cursorPos = el.selectionStart;
    const prevLen   = el.value.length;
    const rawValue  = el.value.replace(/\D/g, '');
    if (rawValue === '') { el.value = ''; return; }
    const formatted = new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10));
    el.value = formatted;
    const diff = el.value.length - prevLen;
    el.setSelectionRange(cursorPos + diff, cursorPos + diff);
  });
}
function getRawAmount(inputId) {
  const val = document.getElementById(inputId).value.replace(/\./g,'').replace(/\D/g,'');
  return parseFloat(val) || 0;
}

/* ============================================================
   FITUR 3 — PENGELUARAN RUTIN
============================================================ */
let expRecurringList = JSON.parse(localStorage.getItem('dompetku-exp-recurring') || '[]');
let expRecFormOpen   = false;
function simpanExpRutin() { localStorage.setItem('dompetku-exp-recurring', JSON.stringify(expRecurringList)); }
function toggleExpRecForm() {
  expRecFormOpen = !expRecFormOpen;
  document.getElementById('exp-rec-form').style.display = expRecFormOpen ? 'block' : 'none';
  document.getElementById('exp-rec-toggle-btn').textContent = expRecFormOpen ? '\u00d7 Tutup' : '\uff0b Tambah Pengeluaran Rutin';
}
function addExpRecurring() {
  const name   = document.getElementById('exp-rec-name').value.trim();
  const amount = parseFloat(document.getElementById('exp-rec-amount').value);
  const freq   = document.getElementById('exp-rec-freq').value;
  const start  = document.getElementById('exp-rec-start').value;
  if (!name || !amount || amount <= 0 || !start) { showToast('\u26a0\ufe0f Lengkapi semua field!'); return; }
  expRecurringList.push({ id:Date.now(), name, amount, freq, startDate:start, lastRun:null });
  simpanExpRutin(); renderExpRecurring();
  document.getElementById('exp-rec-name').value='';
  document.getElementById('exp-rec-amount').value='';
  document.getElementById('exp-rec-start').value='';
  toggleExpRecForm();
  showToast('\u2705 Pengeluaran rutin ditambahkan!');
}
function deleteExpRecurring(id) {
  expRecurringList = expRecurringList.filter(r => r.id !== id);
  simpanExpRutin(); renderExpRecurring();
  showToast('\ud83d\uddd1\ufe0f Pengeluaran rutin dihapus.');
}
function renderExpRecurring() {
  const el    = document.getElementById('exp-recurring-list');
  const empty = document.getElementById('exp-rec-empty');
  if (!expRecurringList.length) { el.innerHTML=''; el.appendChild(empty); empty.style.display='block'; return; }
  empty.style.display = 'none';
  el.innerHTML = expRecurringList.map(rec => {
    const ok = rec.lastRun !== null;
    return `<div class="rec-item">
      <div class="tx-icon expense">&#128308;</div>
      <div class="rec-info">
        <div class="rec-name">${rec.name} <span class="rec-status ${ok?'ok':'pending'}">${ok?'\u2713 Aktif':'Menunggu'}</span></div>
        <div class="rec-detail">${labelFreq(rec.freq)} &middot; Mulai ${formatDate(rec.startDate)}${rec.lastRun?' &middot; Terakhir '+formatDate(rec.lastRun):''}</div>
      </div>
      <div class="rec-amount" style="color:var(--red)">-${formatRupiah(rec.amount)}</div>
      <button class="rec-del" onclick="deleteExpRecurring(${rec.id})">\u00d7</button>
    </div>`;
  }).join('');
}
function cekExpRutin() {
  const today    = new Date(); today.setHours(0,0,0,0);
  const todayStr = toDateStr(today);
  let ada = false;
  expRecurringList.forEach(rec => {
    const start = new Date(rec.startDate);
    const ref   = rec.lastRun ? new Date(rec.lastRun) : new Date(rec.startDate);
    ref.setHours(0,0,0,0);
    let jatuh = false;
    if (rec.freq==='weekly')  jatuh = Math.floor((today-ref)/864e5) >= 7;
    else if (rec.freq==='monthly') jatuh = today.getMonth()!==ref.getMonth() || today.getFullYear()!==ref.getFullYear();
    else if (rec.freq==='yearly')  jatuh = today.getFullYear()!==ref.getFullYear();
    if (jatuh && today>=start && rec.lastRun!==todayStr) {
      transactions.unshift({ id:Date.now()+Math.random(), type:'expense',
        desc:rec.name+' (otomatis)', amount:rec.amount, cat:'\ud83c\udfe0 Tagihan', date:todayStr, foto:null, isRecurring:true });
      rec.lastRun = todayStr; ada = true;
    }
  });
  if (ada) { simpanData(); simpanExpRutin(); showToast('\ud83d\udd34 Pengeluaran rutin otomatis dicatat!'); }
}

/* ============================================================
   FITUR 4 — EXPORT CSV
   Buat file .csv dari semua transaksi lalu unduh otomatis.
============================================================ */
function exportCSV() {
  if (!transactions.length) { showToast('\u26a0\ufe0f Belum ada data untuk diexport!'); return; }
  const header = ['Tanggal','Tipe','Keterangan','Kategori','Jumlah (Rp)'];
  const rows = transactions.map(tx => [
    tx.date,
    tx.type==='income' ? 'Pemasukan' : 'Pengeluaran',
    '"'+tx.desc.replace(/"/g,'""')+'"',
    '"'+tx.cat+'"',
    tx.amount
  ]);
  const csv  = [header,...rows].map(r=>r.join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'dompetku-'+toDateStr(new Date())+'.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('\ud83d\udce5 Export berhasil! '+transactions.length+' transaksi diunduh.');
}

/* ============================================================
   FITUR 5 — GOAL TRACKER (TARGET TABUNGAN)
   Progress bar menunjukkan saldo saat ini vs target.
============================================================ */
let goals        = JSON.parse(localStorage.getItem('dompetku-goals') || '[]');
let goalFormOpen = false;
function simpanGoals() { localStorage.setItem('dompetku-goals', JSON.stringify(goals)); }
function toggleGoalForm() {
  goalFormOpen = !goalFormOpen;
  document.getElementById('goal-form-panel').style.display = goalFormOpen ? 'block' : 'none';
  document.getElementById('goal-toggle-btn').textContent = goalFormOpen ? '\u00d7 Tutup Form Target' : '\ud83c\udfaf Tambah Target Tabungan';
}
function addGoal() {
  const name   = document.getElementById('goal-name').value.trim();
  const target = getRawAmount('goal-target');
  if (!name || !target || target<=0) { showToast('\u26a0\ufe0f Lengkapi nama dan nominal target!'); return; }
  goals.push({ id:Date.now(), name, target });
  simpanGoals(); renderGoals();
  document.getElementById('goal-name').value='';
  document.getElementById('goal-target').value='';
  toggleGoalForm();
  showToast('\ud83c\udfaf Target tabungan ditambahkan!');
}
function deleteGoal(id) {
  goals = goals.filter(g => g.id !== id);
  simpanGoals(); renderGoals();
  showToast('\ud83d\uddd1\ufe0f Target dihapus.');
}
function renderGoals() {
  const el = document.getElementById('goal-section');
  if (!goals.length) { el.innerHTML=''; return; }
  const saldo = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
              - transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  el.innerHTML = goals.map(g => {
    const pct  = Math.min(100, Math.max(0, saldo/g.target*100));
    const done = pct >= 100;
    return `<div class="goal-card">
      <div class="goal-header">
        <div class="goal-name">&#127919; ${g.name}</div>
        <button class="goal-del" onclick="deleteGoal(${g.id})">\u00d7</button>
      </div>
      <div class="goal-amounts">
        <span>Saldo: <strong style="color:var(--green)">${formatRupiah(Math.max(0,saldo))}</strong></span>
        <span>Target: ${formatRupiah(g.target)}</span>
      </div>
      <div class="goal-track"><div class="goal-bar" style="width:${pct}%"></div></div>
      <div class="goal-pct ${done?'done':''}">
        ${done ? '\ud83c\udf89 Target tercapai!' : pct.toFixed(1)+'% tercapai \u00b7 Kurang '+formatRupiah(Math.max(0,g.target-saldo))}
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   DATA & SETUP
============================================================ */
const CATEGORIES = {
  income:  ['💼 Gaji','💡 Bonus','🏪 Usaha','📦 Investasi','🎁 Lainnya'],
  expense: ['🍜 Makanan','🚗 Transport','🏠 Tagihan','🎮 Hiburan','🛍 Belanja','💊 Kesehatan','📚 Pendidikan','💸 Lainnya']
};

let transactions = JSON.parse(localStorage.getItem('dompetku') || '[]');
let recurringList = JSON.parse(localStorage.getItem('dompetku-recurring') || '[]');
/*
  recurringList menyimpan daftar pemasukan rutin.
  Setiap item: { id, name, amount, freq, startDate, lastRun }
  - freq: 'weekly' | 'monthly' | 'yearly'
  - lastRun: tanggal terakhir pemasukan ini dijalankan (string YYYY-MM-DD)
*/

let activeFilter   = 'semua';
let chartPeriod    = 'minggu'; // Periode aktif grafik garis
let fotoBase64     = null;
let recFormOpen    = false;

/* ============================================================
   PEMASUKAN RUTIN — CEK & JALANKAN OTOMATIS
   ============================================================
   Setiap kali halaman dibuka, fungsi ini mengecek apakah
   ada pemasukan rutin yang sudah jatuh tempo.
   Jika iya, otomatis ditambahkan ke transaksi.

   Logika pengecekan per frekuensi:
   - weekly  → selisih hari >= 7
   - monthly → bulan/tahun berbeda
   - yearly  → tahun berbeda
*/
function cekRutin() {
  const today = new Date();
  today.setHours(0,0,0,0); // Hilangkan komponen waktu
  const todayStr = toDateStr(today);
  let ada = false;

  recurringList.forEach(rec => {
    const start    = new Date(rec.startDate);
    const lastRun  = rec.lastRun ? new Date(rec.lastRun) : null;
    // Referensi = lastRun jika pernah jalan, kalau tidak = startDate
    const ref      = lastRun || start;
    ref.setHours(0,0,0,0);

    let jatuhTempo = false;

    if (rec.freq === 'weekly') {
      // Selisih dalam hari
      const selisihHari = Math.floor((today - ref) / (1000*60*60*24));
      jatuhTempo = selisihHari >= 7;
    } else if (rec.freq === 'monthly') {
      // Beda bulan atau beda tahun
      jatuhTempo = (today.getMonth() !== ref.getMonth()) ||
                   (today.getFullYear() !== ref.getFullYear());
    } else if (rec.freq === 'yearly') {
      jatuhTempo = today.getFullYear() !== ref.getFullYear();
    }

    // Pastikan today >= startDate dan belum dijalankan hari ini
    const sudahMulai  = today >= start;
    const belumHariIni = rec.lastRun !== todayStr;

    if (jatuhTempo && sudahMulai && belumHariIni) {
      // Tambahkan sebagai transaksi otomatis
      transactions.unshift({
        id:   Date.now() + Math.random(), // Unik walau dijalankan cepat berurutan
        type: 'income',
        desc: rec.name + ' (otomatis)',
        amount: rec.amount,
        cat:  '💼 Gaji',
        date: todayStr,
        foto: null,
        isRecurring: true // Tandai sebagai pemasukan rutin
      });
      rec.lastRun = todayStr; // Catat sudah dijalankan hari ini
      ada = true;
    }
  });

  if (ada) {
    simpanData();
    simpanRutin();
    showToast('🔁 Pemasukan rutin otomatis ditambahkan!');
  }
}

/* Helper: ubah objek Date → string "YYYY-MM-DD" */
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

/* ============================================================
   DRAG & DROP FOTO
============================================================ */
const uploadArea = document.getElementById('upload-area');
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault(); uploadArea.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) prosesGambar(f);
});
function handleFoto(e) { if (e.target.files[0]) prosesGambar(e.target.files[0]); }

/* Kompresi foto via Canvas */
function prosesGambar(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h*MAX/w); w = MAX; } }
      else        { if (h > MAX) { w = Math.round(w*MAX/h); h = MAX; } }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      fotoBase64 = cv.toDataURL('image/jpeg', 0.6);
      const sb = Math.round(file.size/1024), ss = Math.round(fotoBase64.length*.75/1024);
      document.getElementById('foto-preview').src = fotoBase64;
      document.getElementById('foto-preview').style.display = 'block';
      document.getElementById('upload-placeholder').style.display = 'none';
      const cb = document.getElementById('foto-clear');
      cb.style.display = 'inline-block';
      cb.textContent = `× Hapus (${ss}KB, hemat dari ${sb}KB)`;
      showToast(`🗜️ Dikompres: ${sb}KB → ${ss}KB`);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function clearFoto(e) {
  e.stopPropagation(); fotoBase64 = null;
  document.getElementById('foto-input').value = '';
  document.getElementById('foto-preview').style.display = 'none';
  document.getElementById('foto-preview').src = '';
  document.getElementById('upload-placeholder').style.display = 'flex';
  document.getElementById('foto-clear').style.display = 'none';
}
function openFotoModal(src) { document.getElementById('modal-img').src=src; document.getElementById('foto-modal').classList.add('open'); }
function closeFotoModal()   { document.getElementById('foto-modal').classList.remove('open'); }

/* ============================================================
   FORMAT & SIMPAN
============================================================ */
function formatRupiah(n) { return 'Rp '+new Intl.NumberFormat('id-ID').format(Math.round(n)); }
function formatDate(s)   { return new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); }
function simpanData()    { localStorage.setItem('dompetku', JSON.stringify(transactions)); }
function simpanRutin()   { localStorage.setItem('dompetku-recurring', JSON.stringify(recurringList)); }

/* ============================================================
   FORM TRANSAKSI
============================================================ */
function updateCategories() {
  const type = document.getElementById('type').value;
  const el   = document.getElementById('category');
  el.innerHTML = '';
  CATEGORIES[type].forEach(c => { const o = document.createElement('option'); o.value = o.textContent = c; el.appendChild(o); });
}

function addTransaction() {
  const type   = document.getElementById('type').value;
  const desc   = document.getElementById('desc').value.trim();
  const amount = getRawAmount('amount');
  const cat    = document.getElementById('category').value;
  const date   = document.getElementById('date').value;
  if (!desc || !amount || amount <= 0 || !date) { showToast('⚠️ Lengkapi semua field!'); return; }
  transactions.unshift({ id:Date.now(), type, desc, amount, cat, date, foto:fotoBase64 });
  simpanData(); render();
  document.getElementById('desc').value = '';
  document.getElementById('amount').value = '';
  clearFoto({ stopPropagation:()=>{} });
  renderGoals();
  showToast('✅ Transaksi berhasil ditambahkan!');
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  simpanData(); render();
  showToast('🗑️ Transaksi dihapus.');
}

function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

/* ============================================================
   PEMASUKAN RUTIN — FORM & KELOLA
============================================================ */
function toggleRecForm() {
  recFormOpen = !recFormOpen;
  document.getElementById('rec-form').style.display = recFormOpen ? 'block' : 'none';
  document.getElementById('rec-toggle-btn').textContent = recFormOpen ? '× Tutup' : '＋ Tambah Pemasukan Rutin';
}

function addRecurring() {
  const name   = document.getElementById('rec-name').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const freq   = document.getElementById('rec-freq').value;
  const start  = document.getElementById('rec-start').value;
  if (!name || !amount || amount <= 0 || !start) { showToast('⚠️ Lengkapi semua field rutin!'); return; }

  recurringList.push({ id:Date.now(), name, amount, freq, startDate:start, lastRun:null });
  simpanRutin();
  renderRecurring();
  // Reset form
  document.getElementById('rec-name').value   = '';
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-start').value  = '';
  toggleRecForm();
  showToast('✅ Pemasukan rutin ditambahkan!');
}

function deleteRecurring(id) {
  recurringList = recurringList.filter(r => r.id !== id);
  simpanRutin();
  renderRecurring();
  showToast('🗑️ Pemasukan rutin dihapus.');
}

/* Label frekuensi untuk ditampilkan */
function labelFreq(f) {
  return { weekly:'Setiap Minggu', monthly:'Setiap Bulan', yearly:'Setiap Tahun' }[f] || f;
}

function renderRecurring() {
  const el    = document.getElementById('recurring-list');
  const empty = document.getElementById('rec-empty');
  if (!recurringList.length) {
    el.innerHTML = '';
    el.appendChild(empty);
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  // Tampilkan setiap item rutin
  el.innerHTML = recurringList.map(rec => {
    const sudahJalan = rec.lastRun !== null;
    return `<div class="rec-item">
      <div class="tx-icon recurring">🔁</div>
      <div class="rec-info">
        <div class="rec-name">${rec.name}
          <span class="rec-status ${sudahJalan?'ok':'pending'}">${sudahJalan?'✓ Aktif':'Menunggu'}</span>
        </div>
        <div class="rec-detail">${labelFreq(rec.freq)} · Mulai ${formatDate(rec.startDate)}${rec.lastRun?' · Terakhir '+formatDate(rec.lastRun):''}</div>
      </div>
      <div class="rec-amount">+${formatRupiah(rec.amount)}</div>
      <button class="rec-del" onclick="deleteRecurring(${rec.id})" title="Hapus">×</button>
    </div>`;
  }).join('');
}

/* ============================================================
   UPDATE SUMMARY (SALDO, PEMASUKAN, PENGELUARAN)
============================================================ */
function updateSummary() {
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  document.getElementById('total-balance').textContent = formatRupiah(inc-exp);
  document.getElementById('total-income').textContent  = formatRupiah(inc);
  document.getElementById('total-expense').textContent = formatRupiah(exp);
  // Update goal progress setiap kali saldo berubah
  if (typeof renderGoals === 'function') renderGoals();
}

/* ============================================================
   RENDER LIST TRANSAKSI
============================================================ */
function renderList() {
  const el         = document.getElementById('transaction-list');
  const searchVal  = (document.getElementById('search-input')?.value||'').toLowerCase();
  const timePeriod = document.getElementById('time-filter')?.value || 'semua';
  const today      = new Date(); today.setHours(0,0,0,0);

  // Filter berdasarkan tipe (Semua/Pemasukan/Pengeluaran)
  let filtered = activeFilter==='semua' ? transactions : transactions.filter(t=>t.type===activeFilter);

  // Filter berdasarkan pencarian keterangan
  if (searchVal) filtered = filtered.filter(t => t.desc.toLowerCase().includes(searchVal));

  // Filter berdasarkan rentang waktu
  if (timePeriod !== 'semua') {
    filtered = filtered.filter(t => {
      const d = new Date(t.date); d.setHours(0,0,0,0);
      if (timePeriod==='minggu') {
        // Senin minggu ini
        const monday = new Date(today); monday.setDate(today.getDate()-((today.getDay()+6)%7));
        return d >= monday;
      } else if (timePeriod==='bulan') {
        return d.getMonth()===today.getMonth() && d.getFullYear()===today.getFullYear();
      } else if (timePeriod==='tahun') {
        return d.getFullYear()===today.getFullYear();
      }
      return true;
    });
  }

  if (!filtered.length) { el.innerHTML='<div class="empty-msg">Tidak ada transaksi ditemukan 🌱</div>'; return; }
  el.innerHTML = filtered.map(tx=>`
    <div class="tx-item">
      <div class="tx-icon ${tx.isRecurring?'recurring':tx.type}">${tx.isRecurring?'🔁':tx.type==='income'?'📈':'📉'}</div>
      <div class="tx-info">
        <div class="tx-desc">${tx.desc}${tx.isRecurring?'<span class="badge-recurring">rutin</span>':''}</div>
        <div class="tx-cat">${tx.cat} · ${formatDate(tx.date)}</div>
      </div>
      ${tx.foto?`<img class="tx-thumb" src="${tx.foto}" alt="bukti" onclick="openFotoModal('${tx.foto}')" title="Lihat bukti">`:''}
      <div class="tx-amount ${tx.type}">${tx.type==='income'?'+':'-'}${formatRupiah(tx.amount)}</div>
      <button class="tx-del" onclick="deleteTransaction(${tx.id})" title="Hapus">×</button>
    </div>`).join('');
}

/* ============================================================
   GRAFIK BATANG KATEGORI
============================================================ */
function renderChart() {
  const sec = document.getElementById('chart-section');
  if (!transactions.length) { sec.style.display='none'; return; }
  sec.style.display='block';
  const totals = {};
  transactions.forEach(tx => {
    if (!totals[tx.cat]) totals[tx.cat]={type:tx.type,total:0};
    totals[tx.cat].total += tx.amount;
  });
  const maxV = Math.max(...Object.values(totals).map(v=>v.total));
  document.getElementById('chart-bars').innerHTML = Object.entries(totals)
    .sort((a,b)=>b[1].total-a[1].total).slice(0,6)
    .map(([cat,d])=>`<div class="chart-row">
      <div class="chart-label">${cat.split(' ').slice(1).join(' ')}</div>
      <div class="chart-track"><div class="chart-fill ${d.type}" style="width:${(d.total/maxV*100).toFixed(0)}%"></div></div>
      <div class="chart-val" style="color:${d.type==='income'?'var(--green)':'var(--red)'}">${formatRupiah(d.total)}</div>
    </div>`).join('');
}

/* ============================================================
   GRAFIK GARIS — renderLineChart()
   ============================================================
   Mirip Google Sheets / chart biasa:
   - Sumbu Y di kiri dengan label nilai (disingkat: jt, rb)
   - Sumbu X di bawah dengan label tanggal/bulan
   - Grid garis horizontal abu-abu
   - 3 garis berwarna: hijau, merah, biru
   - Titik bulat di setiap data point
   - Filter periode: Minggu (7 hari terakhir), Bulan (30 hari), Tahun (12 bulan)

   Konsep canvas yang dipakai:
   ctx.beginPath()          → mulai jalur baru
   ctx.moveTo(x, y)         → pindah ke titik tanpa garis
   ctx.lineTo(x, y)         → tarik garis ke titik
   ctx.stroke()             → gambar garis
   ctx.arc(x,y,r,0,PI*2)   → gambar lingkaran
   ctx.fill()               → isi warna
   ctx.fillText(txt, x, y) → tulis teks
============================================================ */
function setChartPeriod(p, el) {
  chartPeriod = p;
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderLineChart();
}

function renderLineChart() {
  const panel  = document.getElementById('line-chart-panel');
  const canvas = document.getElementById('lineChart');
  const empty  = document.getElementById('chart-empty');

  if (!transactions.length) { panel.style.display='none'; return; }
  panel.style.display = 'block';

  /* -- STEP 1: Tentukan rentang tanggal berdasarkan periode -- */
  const today = new Date(); today.setHours(0,0,0,0);
  let labels   = []; // Array string label untuk sumbu X
  let byLabel  = {}; // { label: { income:0, expense:0 } }

  if (chartPeriod === 'minggu') {
    // 7 hari terakhir — sumbu X = nama hari (Sen, Sel, ...)
    const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    for (let i=6; i>=0; i--) {
      const d = new Date(today); d.setDate(today.getDate()-i);
      const lbl = HARI[d.getDay()]+' '+d.getDate();
      labels.push(lbl);
      byLabel[lbl] = { income:0, expense:0, dateStr: toDateStr(d) };
    }
    // Kelompokkan transaksi ke label hari
    transactions.forEach(tx => {
      const found = Object.values(byLabel).find(b => b.dateStr === tx.date);
      if (found) found[tx.type] += tx.amount;
    });

  } else if (chartPeriod === 'bulan') {
    // 30 hari terakhir, dikelompokkan per 3 hari agar label tidak penuh
    // Buat 10 titik (setiap 3 hari)
    for (let i=9; i>=0; i--) {
      const d = new Date(today); d.setDate(today.getDate()-(i*3));
      const lbl = d.getDate()+'/'+(d.getMonth()+1);
      labels.push(lbl);
      byLabel[lbl] = { income:0, expense:0, startDate: toDateStr(d) };
    }
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      // Cari bucket yang paling dekat (mundur)
      for (let i=labels.length-1; i>=0; i--) {
        const bucketDate = new Date(byLabel[labels[i]].startDate);
        if (txDate >= bucketDate) {
          byLabel[labels[i]][tx.type] += tx.amount;
          break;
        }
      }
    });

  } else { // tahun
    // 12 bulan terakhir — sumbu X = nama bulan (Jan, Feb, ...)
    const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    for (let i=11; i>=0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      const lbl = BULAN[d.getMonth()]+' '+d.getFullYear().toString().slice(2);
      labels.push(lbl);
      byLabel[lbl] = { income:0, expense:0, month: d.getMonth(), year: d.getFullYear() };
    }
    transactions.forEach(tx => {
      const d   = new Date(tx.date);
      const m   = d.getMonth(), y = d.getFullYear();
      const lbl = labels.find(l => byLabel[l].month===m && byLabel[l].year===y);
      if (lbl) byLabel[lbl][tx.type] += tx.amount;
    });
  }

  /* -- STEP 2: Hitung saldo kumulatif per titik -- */
  let saldo = 0;
  const dataIn = [], dataEx = [], dataSaldo = [];
  labels.forEach(lbl => {
    dataIn.push(byLabel[lbl].income);
    dataEx.push(byLabel[lbl].expense);
    saldo += byLabel[lbl].income - byLabel[lbl].expense;
    dataSaldo.push(saldo);
  });

  // Cek ada data atau tidak (semua 0 = belum ada)
  const adaData = dataIn.some(v=>v>0) || dataEx.some(v=>v>0);
  if (!adaData && chartPeriod==='minggu') {
    canvas.style.display='none'; empty.style.display='block'; return;
  }
  canvas.style.display='block'; empty.style.display='none';

  /* -- STEP 3: Setup canvas -- */
  const W = canvas.offsetWidth || 760;
  const H = 260;
  canvas.width  = W * window.devicePixelRatio; // Retina/HiDPI support
  canvas.height = H * window.devicePixelRatio;
  canvas.style.width  = W+'px';
  canvas.style.height = H+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio); // Skala untuk layar retina
  ctx.clearRect(0, 0, W, H);

  // Padding (ruang tepi untuk label)
  const pL=68, pR=24, pT=24, pB=44;
  const cW = W-pL-pR; // Lebar area grafik
  const cH = H-pT-pB; // Tinggi area grafik

  /* -- Skala Y -- */
  const allVals = [...dataIn, ...dataEx, ...dataSaldo];
  const maxV = Math.max(...allVals, 1);
  const minV = Math.min(...allVals, 0);
  const range = maxV - minV || 1;

  // Nilai → piksel Y (Y=0 di atas, jadi dibalik)
  const sY = v => pT + cH - ((v-minV)/range * cH);
  // Index → piksel X
  const sX = i => pL + (i/(labels.length-1||1)) * cW;

  /* -- STEP 4: Gambar background area grafik -- */
  ctx.fillStyle = 'rgba(30,30,36,0.4)';
  ctx.fillRect(pL, pT, cW, cH);

  /* -- STEP 5: Garis grid horizontal (5 garis) -- */
  const gridCount = 5;
  ctx.setLineDash([4, 4]); // Garis putus-putus
  for (let i=0; i<=gridCount; i++) {
    const y   = pT + (cH/gridCount)*i;
    const val = maxV - (range/gridCount)*i;

    // Garis grid
    ctx.strokeStyle = i===gridCount ? '#3a3a46' : '#2a2a38';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W-pR, y); ctx.stroke();

    // Label nilai Y (kiri)
    ctx.fillStyle  = '#7a7880';
    ctx.font       = '11px DM Sans, sans-serif';
    ctx.textAlign  = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(singkat(val), pL-8, y);
  }
  ctx.setLineDash([]); // Reset garis putus-putus

  /* -- STEP 6: Garis vertikal tipis di setiap titik data -- */
  labels.forEach((_, i) => {
    ctx.strokeStyle = '#22222c';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(sX(i), pT); ctx.lineTo(sX(i), pT+cH); ctx.stroke();
  });

  /* -- STEP 7: Label sumbu X (bawah) -- */
  ctx.fillStyle    = '#7a7880';
  ctx.font         = '11px DM Sans, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  // Tampilkan max 8 label agar tidak tumpang tindih
  const xStep = Math.ceil(labels.length/8);
  labels.forEach((lbl, i) => {
    if (i%xStep===0 || i===labels.length-1)
      ctx.fillText(lbl, sX(i), pT+cH+10);
  });

  /* -- STEP 8: Fungsi gambar garis + titik + area fill -- */
  function drawLine(data, color, fillColor) {
    if (!data.length) return;

    // Area fill di bawah garis (transparan)
    ctx.beginPath();
    data.forEach((v,i) => i===0 ? ctx.moveTo(sX(i),sY(v)) : ctx.lineTo(sX(i),sY(v)));
    ctx.lineTo(sX(data.length-1), pT+cH); // Titik kanan bawah
    ctx.lineTo(sX(0), pT+cH);             // Titik kiri bawah
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Garis utama
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    data.forEach((v,i) => i===0 ? ctx.moveTo(sX(i),sY(v)) : ctx.lineTo(sX(i),sY(v)));
    ctx.stroke();

    // Titik data (lingkaran)
    data.forEach((v,i) => {
      // Lingkaran luar (warna garis)
      ctx.beginPath(); ctx.arc(sX(i),sY(v),4,0,Math.PI*2);
      ctx.fillStyle=color; ctx.fill();
      // Titik dalam (warna gelap = efek donat)
      ctx.beginPath(); ctx.arc(sX(i),sY(v),2,0,Math.PI*2);
      ctx.fillStyle='#16161a'; ctx.fill();
    });
  }

  // Gambar 3 garis dengan warna berbeda
  drawLine(dataSaldo, '#5b9cf6', 'rgba(91,156,246,0.06)');   // Biru  = saldo
  drawLine(dataEx,    '#f16060', 'rgba(241,96,96,0.06)');    // Merah = pengeluaran
  drawLine(dataIn,    '#3ecf74', 'rgba(62,207,116,0.08)');   // Hijau = pemasukan

  /* -- STEP 9: Judul sumbu Y -- */
  ctx.save();
  ctx.translate(14, pT + cH/2);
  ctx.rotate(-Math.PI/2); // Putar 90 derajat untuk teks vertikal
  ctx.fillStyle    = '#5a5870';
  ctx.font         = '10px DM Sans, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Jumlah (Rp)', 0, 0);
  ctx.restore();
}

/* Singkat angka: 1500000 → "1,5jt" */
function singkat(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign+(abs/1e9).toFixed(1).replace('.0','')+'M';
  if (abs >= 1e6) return sign+(abs/1e6).toFixed(1).replace('.0','')+'jt';
  if (abs >= 1e3) return sign+(abs/1e3).toFixed(0)+'rb';
  return sign+abs.toFixed(0);
}

/* ============================================================
   TOAST & RENDER UTAMA
============================================================ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2800);
}

function render() {
  updateSummary();
  renderList();
  renderChart();
  renderLineChart();
  renderRecurring();
  renderExpRecurring();
  renderGoals();
}

/* ============================================================
   INIT — Dijalankan saat halaman pertama kali dibuka
============================================================ */
document.getElementById('date').valueAsDate = new Date();
document.getElementById('rec-start').valueAsDate = new Date();
document.getElementById('exp-rec-start').valueAsDate = new Date();
setupInputMask('amount');
setupInputMask('goal-target');
updateCategories();
document.getElementById('type').addEventListener('change', updateCategories);

// Cek pemasukan & pengeluaran rutin yang jatuh tempo
cekRutin();
cekExpRutin();

// Render semua komponen
render();

// Gambar ulang grafik saat layar di-resize
window.addEventListener('resize', renderLineChart);

// Shortcut keyboard
document.addEventListener('keydown', e => {
  if (e.key==='Enter' && document.activeElement.closest('.panel'))  addTransaction();
  if (e.key==='Escape') closeFotoModal();
});
