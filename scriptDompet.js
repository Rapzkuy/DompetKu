/* ============================================================
   FITUR 1 — INPUT MASKING (FORMAT RUPIAH OTOMATIS)
   Saat user mengetik di input Jumlah, angka diformat otomatis
   dengan titik ribuan. Nilai murni diambil via getRawAmount().
============================================================ */
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

/* ================================================================
   TAMBAHAN scriptDompet.js
   Paste kode ini di PALING BAWAH file scriptDompet.js yang ada.
   JANGAN ubah kode yang sudah ada di atas.
================================================================ */


/* ============================================================
   FITUR 3 — SOUND EFFECTS
   ============================================================
   Gunakan Web Audio API (built-in browser, tanpa file eksternal).
   Synthesizer sederhana yang membuat suara "kring" untuk
   pemasukan dan suara "klik pendek" untuk pengeluaran.

   AudioContext  → mesin audio browser
   oscillator    → pembangkit gelombang suara
   gainNode      → kontrol volume (fade out agar tidak klik keras)
   frequency     → tinggi/rendahnya nada dalam Hz
   type          → bentuk gelombang: sine, square, sawtooth, triangle
============================================================ */
function bunyiPemasukan() {
  try {
    // AudioContext: engine audio bawaan browser
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Nada 1 — "kring" tinggi
    const osc1  = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1); gain1.connect(ctx.destination);
    osc1.type      = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);           // Nada A5
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // Naik ke E6
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Nada 2 — "kring" kedua sedikit terlambat
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.type      = 'sine';
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.25);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.5);
  } catch(e) { /* Browser tidak support, abaikan */ }
}

function bunyiPengeluaran() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Suara "duh" — nada turun singkat
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.2); // Turun
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

/*
   PATCH addTransaction — tambahkan panggilan sound effect.
   Ganti fungsi addTransaction yang sudah ada dengan ini,
   ATAU cukup tambahkan baris bunyiPemasukan()/bunyiPengeluaran()
   di dalam fungsi addTransaction yang sudah ada setelah
   baris: transactions.unshift({...})

   Tambahkan setelah baris showToast di addTransaction:
   -------------------------------------------------------
   if (type === 'income') bunyiPemasukan();
   else bunyiPengeluaran();
   -------------------------------------------------------
   NOTE: Cari baris showToast('✅ Transaksi berhasil...')
   dan tambahkan 2 baris di atas persis setelahnya.
*/


/* ============================================================
   FITUR 1 — KALENDER HEATMAP PENGELUARAN
   ============================================================
   Menampilkan kalender satu bulan sebagai CSS Grid 7×n.
   Setiap sel diwarnai merah dengan intensitas berbeda
   berdasarkan total pengeluaran di tanggal tersebut.

   Logika intensitas (heat-1 s/d heat-5):
   Dibagi berdasarkan persentase dari pengeluaran tertinggi
   di bulan itu (relative scale).
============================================================ */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

function renderCalendar() {
  const NAMA_HARI  = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                      'Juli','Agustus','September','Oktober','November','Desember'];

  // Update label bulan
  document.getElementById('cal-month-label').textContent =
    NAMA_BULAN[calMonth] + ' ' + calYear;

  // Render nama hari (header)
  const dayNames = document.getElementById('cal-day-names');
  dayNames.innerHTML = NAMA_HARI.map(h =>
    `<div class="cal-day-name">${h}</div>`).join('');

  // Hitung pengeluaran per tanggal di bulan ini
  // expByDate: { "YYYY-MM-DD": totalPengeluaran }
  const expByDate = {};
  transactions.forEach(tx => {
    if (tx.type !== 'expense') return;
    const d = new Date(tx.date);
    if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) return;
    const key = tx.date;
    expByDate[key] = (expByDate[key] || 0) + tx.amount;
  });

  // Cari nilai maksimal untuk skala relatif
  const maxExp = Math.max(...Object.values(expByDate), 1);

  // Hari pertama bulan ini jatuh di hari apa?
  // getDay(): 0=Min, 1=Sen, ..., 6=Sab → kita pakai Sen=0
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const offset   = (firstDay === 0) ? 6 : firstDay - 1; // Offset ke Senin

  // Total hari dalam bulan
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const todayStr = toDateStr(new Date());
  const cells    = document.getElementById('cal-cells');

  let html = '';

  // Sel kosong sebelum hari pertama
  for (let i = 0; i < offset; i++) {
    html += `<div class="cal-cell empty"></div>`;
  }

  // Sel untuk setiap tanggal
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const exp     = expByDate[dateStr] || 0;
    const isToday = dateStr === todayStr;

    // Tentukan kelas intensitas (heat-1 s/d heat-5)
    let heatClass = '';
    if (exp > 0) {
      const ratio = exp / maxExp;
      if      (ratio <= 0.2) heatClass = 'heat-1';
      else if (ratio <= 0.4) heatClass = 'heat-2';
      else if (ratio <= 0.6) heatClass = 'heat-3';
      else if (ratio <= 0.8) heatClass = 'heat-4';
      else                   heatClass = 'heat-5';
    }

    const tooltip = exp > 0
      ? `<span class="cal-tooltip">📉 ${formatRupiah(exp)}</span>`
      : '';

    html += `<div class="cal-cell ${heatClass} ${isToday?'today':''}">
      ${d}
      ${tooltip}
    </div>`;
  }

  cells.innerHTML = html;
}

function calPrev() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}
function calNext() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}


/* ============================================================
   FITUR 2 — MANAJEMEN UTANG/PIUTANG (IOU)
   ============================================================
   Data disimpan di localStorage key: 'dompetku-iou'
   Setiap item: { id, tipe, nama, amount, note, lunas, tanggal }
   - tipe: 'hutang' (saya yang hutang) | 'piutang' (orang hutang ke saya)
   - lunas: boolean
============================================================ */
let iouList    = JSON.parse(localStorage.getItem('dompetku-iou') || '[]');
let iouTab     = 'hutang'; // Tab aktif
let iouFormOpen = false;

function simpanIou() { localStorage.setItem('dompetku-iou', JSON.stringify(iouList)); }

function setIouTab(tab) {
  iouTab = tab;
  // Update tampilan tab
  document.getElementById('iou-tab-hutang').className  = 'iou-tab' + (tab==='hutang'  ? ' active-hutang'  : '');
  document.getElementById('iou-tab-piutang').className = 'iou-tab' + (tab==='piutang' ? ' active-piutang' : '');
  document.getElementById('iou-toggle-btn').textContent =
    tab === 'hutang' ? '＋ Catat Hutang Baru' : '＋ Catat Piutang Baru';
  renderIou();
}

function toggleIouForm() {
  iouFormOpen = !iouFormOpen;
  document.getElementById('iou-form').style.display = iouFormOpen ? 'block' : 'none';
}

function addIou() {
  const nama   = document.getElementById('iou-name').value.trim();
  const amount = getRawAmount('iou-amount');
  const note   = document.getElementById('iou-note').value.trim();
  if (!nama || !amount || amount <= 0) { showToast('⚠️ Lengkapi nama dan nominal!'); return; }

  iouList.push({
    id:      Date.now(),
    tipe:    iouTab,       // 'hutang' atau 'piutang'
    nama,
    amount,
    note,
    lunas:   false,
    tanggal: toDateStr(new Date())
  });

  simpanIou(); renderIou();
  document.getElementById('iou-name').value   = '';
  document.getElementById('iou-amount').value = '';
  document.getElementById('iou-note').value   = '';
  iouFormOpen = false;
  document.getElementById('iou-form').style.display = 'none';
  showToast(iouTab === 'hutang' ? '💸 Hutang dicatat!' : '💰 Piutang dicatat!');
}

function lunasIou(id) {
  const item = iouList.find(i => i.id === id);
  if (!item) return;
  item.lunas = !item.lunas;
  simpanIou(); renderIou();
  showToast(item.lunas ? '✅ Ditandai lunas!' : '↩️ Dibatalkan lunas.');
}

function deleteIou(id) {
  iouList = iouList.filter(i => i.id !== id);
  simpanIou(); renderIou();
  showToast('🗑️ Catatan dihapus.');
}

function renderIou() {
  const el      = document.getElementById('iou-list');
  const filtered = iouList.filter(i => i.tipe === iouTab);

  // Update ringkasan total
  const totalHutang  = iouList.filter(i=>i.tipe==='hutang'  && !i.lunas).reduce((s,i)=>s+i.amount,0);
  const totalPiutang = iouList.filter(i=>i.tipe==='piutang' && !i.lunas).reduce((s,i)=>s+i.amount,0);
  const net          = totalPiutang - totalHutang;

  document.getElementById('iou-total-hutang').textContent  = formatRupiah(totalHutang);
  document.getElementById('iou-total-piutang').textContent = formatRupiah(totalPiutang);
  const netEl = document.getElementById('iou-net');
  netEl.textContent = formatRupiah(Math.abs(net));
  netEl.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-msg">${
      iouTab==='hutang' ? 'Tidak ada hutang. Tetap hemat! 💪' : 'Tidak ada piutang tercatat. 👍'
    }</div>`;
    return;
  }

  el.innerHTML = filtered.map(item => `
    <div class="iou-item ${item.lunas ? 'lunas' : ''}">
      <div class="iou-icon">${item.tipe==='hutang' ? '💸' : '💰'}</div>
      <div class="iou-info">
        <div class="iou-name">${item.nama}${item.lunas ? ' <span style="font-size:.65rem;color:var(--green)">✓ Lunas</span>' : ''}</div>
        <div class="iou-detail">${item.note || '—'} · ${formatDate(item.tanggal)}</div>
      </div>
      <div class="iou-amount ${item.tipe}">${formatRupiah(item.amount)}</div>
      <div class="iou-actions">
        <button class="iou-btn-lunas ${item.lunas?'done':''}"
          onclick="lunasIou(${item.id})">
          ${item.lunas ? '↩ Batal' : '✓ Lunas'}
        </button>
        <button class="iou-del" onclick="deleteIou(${item.id})">×</button>
      </div>
    </div>`).join('');
}


/* ============================================================
   FITUR 4 — RAPOR KEUANGAN MINGGUAN
   ============================================================
   Membandingkan total pengeluaran 7 hari terakhir (minggu ini)
   dengan 7 hari sebelumnya (minggu lalu).
   Menampilkan ringkasan teks otomatis dengan persentase.

   Rumus:
   selisih = ((mingguIni - mingguLalu) / mingguLalu) * 100
   Positif  = lebih boros, Negatif = lebih hemat
============================================================ */
function renderRapor() {
  const container = document.getElementById('rapor-container');
  if (!container) return;

  const today = new Date(); today.setHours(0,0,0,0);

  // Ambil total pengeluaran dalam rentang tanggal tertentu
  function totalExpInRange(startOffset, endOffset) {
    const start = new Date(today); start.setDate(today.getDate() - startOffset);
    const end   = new Date(today); end.setDate(today.getDate() - endOffset);
    return transactions
      .filter(tx => {
        if (tx.type !== 'expense') return false;
        const d = new Date(tx.date); d.setHours(0,0,0,0);
        return d >= end && d <= start;
      })
      .reduce((s, tx) => s + tx.amount, 0);
  }

  const mingguIni  = totalExpInRange(0, 6);   // 7 hari terakhir (hari ini sampai 6 hari lalu)
  const mingguLalu = totalExpInRange(7, 13);  // 7 hari sebelumnya

  // Jika belum ada data sama sekali, sembunyikan rapor
  if (mingguIni === 0 && mingguLalu === 0) {
    container.innerHTML = ''; return;
  }

  let icon, msg, detail, badgeClass, pctText;

  if (mingguLalu === 0) {
    // Belum ada data minggu lalu untuk dibandingkan
    icon       = '📊';
    msg        = `Minggu ini kamu mengeluarkan <strong>${formatRupiah(mingguIni)}</strong>`;
    detail     = 'Belum ada data minggu lalu untuk dibandingkan.';
    badgeClass = 'sama';
    pctText    = 'Pertama!';
  } else {
    const pct = ((mingguIni - mingguLalu) / mingguLalu) * 100;

    if (pct < -5) {
      // Lebih hemat
      icon       = '🎉';
      msg        = `Minggu ini kamu <strong>${Math.abs(pct).toFixed(0)}% lebih hemat</strong> dari minggu lalu!`;
      detail     = `Minggu ini: ${formatRupiah(mingguIni)} · Minggu lalu: ${formatRupiah(mingguLalu)}`;
      badgeClass = 'hemat';
      pctText    = `-${Math.abs(pct).toFixed(0)}%`;
    } else if (pct > 5) {
      // Lebih boros
      icon       = '😬';
      msg        = `Minggu ini pengeluaran <strong>${pct.toFixed(0)}% lebih boros</strong> dari minggu lalu.`;
      detail     = `Minggu ini: ${formatRupiah(mingguIni)} · Minggu lalu: ${formatRupiah(mingguLalu)}`;
      badgeClass = 'boros';
      pctText    = `+${pct.toFixed(0)}%`;
    } else {
      // Hampir sama
      icon       = '😐';
      msg        = `Pengeluaran minggu ini <strong>hampir sama</strong> dengan minggu lalu.`;
      detail     = `Minggu ini: ${formatRupiah(mingguIni)} · Minggu lalu: ${formatRupiah(mingguLalu)}`;
      badgeClass = 'sama';
      pctText    = `~${Math.abs(pct).toFixed(0)}%`;
    }
  }

  container.innerHTML = `
    <div class="rapor-card">
      <div class="rapor-icon">${icon}</div>
      <div class="rapor-text">
        <div class="rapor-title">📋 Rapor Mingguan</div>
        <div class="rapor-msg">${msg}</div>
        <div class="rapor-detail">${detail}</div>
      </div>
      <div class="rapor-badge ${badgeClass}">${pctText}</div>
    </div>`;
}


/* ============================================================
   FITUR 5 — KALKULATOR MELAYANG
   ============================================================
   Kalkulator mini dengan state string ekspresi.
   Tombol mengumpulkan karakter → tombol = mengevaluasi.

   Simbol visual (÷ × −) dikonversi ke operator JS (/ * -)
   sebelum dievaluasi dengan Function() agar aman.
============================================================ */
let calcExpr    = '';  // String ekspresi yang sedang dibangun
let calcWidgetOpen = false;

function toggleCalc() {
  calcWidgetOpen = !calcWidgetOpen;
  document.getElementById('calc-widget').style.display = calcWidgetOpen ? 'block' : 'none';
}

function calcInput(val) {
  calcExpr += val;
  document.getElementById('calc-expr').textContent = calcExpr;
  // Preview hasil sementara jika ekspresi valid
  try {
    const preview = Function('"use strict"; return (' +
      calcExpr.replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-').replace(/%/g,'/100') +
    ')')();
    if (isFinite(preview))
      document.getElementById('calc-result').textContent = singkat(preview);
  } catch(e) {}
}

function calcEqual() {
  try {
    // Evaluasi ekspresi — ganti simbol visual ke operator JS
    const jsExpr = calcExpr
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/−/g, '-')
      .replace(/%/g, '/100');
    // Function() lebih aman dari eval() — hanya eksekusi ekspresi matematika
    const result = Function('"use strict"; return (' + jsExpr + ')')();
    if (!isFinite(result)) throw new Error('Invalid');
    document.getElementById('calc-result').textContent =
      new Intl.NumberFormat('id-ID').format(parseFloat(result.toFixed(10)));
    document.getElementById('calc-expr').textContent  = calcExpr + ' =';
    calcExpr = String(result); // Simpan hasil sebagai input berikutnya
  } catch(e) {
    document.getElementById('calc-result').textContent = 'Error';
    calcExpr = '';
  }
}

function calcClear() {
  calcExpr = '';
  document.getElementById('calc-expr').textContent   = '';
  document.getElementById('calc-result').textContent = '0';
}

function calcDel() {
  // Hapus karakter terakhir dari ekspresi
  calcExpr = calcExpr.slice(0, -1);
  document.getElementById('calc-expr').textContent = calcExpr;
  if (!calcExpr) document.getElementById('calc-result').textContent = '0';
}

// Tutup kalkulator jika klik di luar widget
document.addEventListener('click', e => {
  const widget = document.getElementById('calc-widget');
  const fab    = document.getElementById('calc-fab');
  if (calcWidgetOpen && !widget.contains(e.target) && !fab.contains(e.target)) {
    calcWidgetOpen = false;
    widget.style.display = 'none';
  }
});


/* ============================================================
   FITUR 6 — WISHLIST DENGAN HITUNG MUNDUR
   ============================================================
   Data: { id, name, price, daily, tanggal }
   Estimasi hari = (harga - saldo_sekarang) / nabung_harian
   Jika saldo >= harga → tampilkan "Bisa dibeli sekarang!"
   Progress bar = saldo / harga (max 100%)
============================================================ */
let wishList     = JSON.parse(localStorage.getItem('dompetku-wishlist') || '[]');
let wishFormOpen = false;

function simpanWish() { localStorage.setItem('dompetku-wishlist', JSON.stringify(wishList)); }

function toggleWishForm() {
  wishFormOpen = !wishFormOpen;
  document.getElementById('wish-form').style.display = wishFormOpen ? 'block' : 'none';
  document.getElementById('wish-toggle-btn').textContent =
    wishFormOpen ? '× Tutup' : '＋ Tambah Wishlist';
}

function addWish() {
  const name  = document.getElementById('wish-name').value.trim();
  const price = getRawAmount('wish-price');
  const daily = getRawAmount('wish-daily');
  if (!name || !price || price <= 0) { showToast('⚠️ Lengkapi nama dan harga!'); return; }

  wishList.push({ id:Date.now(), name, price, daily: daily || 0 });
  simpanWish(); renderWish();
  document.getElementById('wish-name').value  = '';
  document.getElementById('wish-price').value = '';
  document.getElementById('wish-daily').value = '';
  wishFormOpen = false;
  document.getElementById('wish-form').style.display = 'none';
  document.getElementById('wish-toggle-btn').textContent = '＋ Tambah Wishlist';
  showToast('✨ Wishlist ditambahkan!');
}

function deleteWish(id) {
  wishList = wishList.filter(w => w.id !== id);
  simpanWish(); renderWish();
  showToast('🗑️ Wishlist dihapus.');
}

function renderWish() {
  const el    = document.getElementById('wish-list');
  const empty = document.getElementById('wish-empty');

  if (!wishList.length) {
    el.innerHTML = ''; el.appendChild(empty); empty.style.display = 'block'; return;
  }
  empty.style.display = 'none';

  // Ambil saldo saat ini
  const saldo = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
              - transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  el.innerHTML = wishList.map(w => {
    const pct    = Math.min(100, Math.max(0, saldo / w.price * 100));
    const kurang = Math.max(0, w.price - saldo);
    const done   = saldo >= w.price;

    // Hitung mundur hari
    let countdown = '';
    if (done) {
      countdown = `<div class="wish-countdown done">🎉 Bisa dibeli sekarang!</div>`;
    } else if (w.daily > 0) {
      const hari = Math.ceil(kurang / w.daily);
      // Estimasi tanggal target
      const target = new Date();
      target.setDate(target.getDate() + hari);
      const tglTarget = target.toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'});
      countdown = `<div class="wish-countdown">
        ⏳ Estimasi <strong>${hari} hari lagi</strong> · Sekitar ${tglTarget}
      </div>`;
    } else {
      countdown = `<div class="wish-countdown" style="color:var(--muted)">
        Isi "Nabung/hari" untuk lihat estimasi ⬆
      </div>`;
    }

    return `<div class="wish-card">
      <div class="wish-header">
        <div class="wish-name">✨ ${w.name}</div>
        <button class="wish-del" onclick="deleteWish(${w.id})">×</button>
      </div>
      <div class="wish-meta">
        Target: <strong>${formatRupiah(w.price)}</strong>
        ${w.daily ? ` · Nabung/hari: ${formatRupiah(w.daily)}` : ''}
        · Kurang: <strong style="color:var(--red)">${formatRupiah(kurang)}</strong>
      </div>
      <div class="wish-track"><div class="wish-bar" style="width:${pct}%"></div></div>
      <div style="font-size:.7rem;color:var(--muted);text-align:right;margin-bottom:6px">${pct.toFixed(1)}%</div>
      ${countdown}
    </div>`;
  }).join('');
}


/* ============================================================
   HOOK — Sambungkan semua fitur baru ke render() yang ada
   ============================================================
   Tambahkan baris-baris ini ke bagian INIT di bagian paling
   bawah scriptDompet.js (setelah baris render(); yang ada).

   CARA: Cari baris:
     window.addEventListener('resize', renderLineChart);
   Tambahkan SETELAH baris itu:
   -------------------------------------------------------
   renderCalendar();
   renderIou();
   renderRapor();
   renderWish();
   setupInputMask('iou-amount');
   setupInputMask('wish-price');
   setupInputMask('wish-daily');
   -------------------------------------------------------

   Dan di fungsi render() yang sudah ada, tambahkan:
   -------------------------------------------------------
   renderCalendar();
   renderRapor();
   renderWish();
   -------------------------------------------------------
*/

/* Tambahan otomatis — panggil langsung di sini juga sebagai fallback */
document.addEventListener('DOMContentLoaded', () => {
  // Setup input mask untuk field baru
  setupInputMask('iou-amount');
  setupInputMask('wish-price');
  setupInputMask('wish-daily');

  // Render komponen baru
  renderCalendar();
  renderIou();
  renderRapor();
  renderWish();

  // Inisialisasi tab IOU default
  setIouTab('hutang');
});

/*
   PENTING: Tambahkan juga di dalam fungsi render() yang sudah ada
   (cari "function render() {" di scriptDompet.js):

   function render() {
     updateSummary();
     renderList();
     renderChart();
     renderLineChart();
     renderRecurring();
     renderExpRecurring();
     renderGoals();
     renderCalendar();   ← TAMBAHKAN INI
     renderRapor();      ← TAMBAHKAN INI
     renderWish();       ← TAMBAHKAN INI
   }

   Dan di addTransaction() setelah showToast('✅ Transaksi berhasil...'):
   if (type === 'income') bunyiPemasukan();   ← TAMBAHKAN
   else bunyiPengeluaran();                   ← TAMBAHKAN
*/
// Shortcut keyboard
document.addEventListener('keydown', e => {
  if (e.key==='Enter' && document.activeElement.closest('.panel'))  addTransaction();
  if (e.key==='Escape') closeFotoModal();
});
