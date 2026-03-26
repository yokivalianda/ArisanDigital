// ============================================
// ArisanKu – App Logic (Supabase Integration)
// ============================================

let supabaseClient = null;
let currentGroup = null;
let currentPaymentMonth = new Date();
let groups = [];

// ---- SUPABASE INIT ----
async function initSupabase(url, key) {
  try {
    supabaseClient = supabase.createClient(url, key);
    // Test connection
    const { error } = await supabaseClient.from('groups').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') throw error;
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ---- LOCAL STORAGE ----
function saveLocal() {
  localStorage.setItem('cached_groups', JSON.stringify(groups));
}
function loadLocal() {
  try { return JSON.parse(localStorage.getItem('cached_groups')) || []; } catch { return []; }
}

// ---- TOAST ----
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 2800);
}

// ---- MODAL ----
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
  el.addEventListener('click', () => closeModal(el.dataset.modal || el.closest('.modal-overlay').id));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); });
});

// ---- TABS ----
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'payments') renderPayments();
    if (btn.dataset.tab === 'history') renderHistory();
    if (btn.dataset.tab === 'members') renderMembers();
  });
});

// ---- FORMAT CURRENCY ----
function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function formatMonth(date) {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}

// ============================================
// GROUPS
// ============================================
async function loadGroups() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('groups').select('*').order('created_at', { ascending: false });
  if (!error && data) {
    groups = data;
    saveLocal();
  } else {
    groups = loadLocal();
  }
  renderGroups();
}

function renderGroups() {
  const el = document.getElementById('group-list');
  if (!groups.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏦</div><p>Belum ada grup arisan</p><button class="btn-sm" onclick="openModal('modal-add-group')">Buat Grup</button></div>`;
    return;
  }
  el.innerHTML = groups.map(g => `
    <div class="group-item ${currentGroup?.id === g.id ? 'selected' : ''}" onclick="selectGroup('${g.id}')">
      <div class="group-avatar">🏦</div>
      <div class="group-info">
        <div class="group-name">${g.name}</div>
        <div class="group-meta">${formatRp(g.amount_per_month)} / bulan · Tgl ${g.draw_day}</div>
      </div>
      <div class="group-badge">${formatMonth(new Date(g.start_month + '-01')).split(' ')[0]}</div>
    </div>
  `).join('');
}

async function selectGroup(id) {
  currentGroup = groups.find(g => g.id === id);
  document.getElementById('header-group-name').textContent = currentGroup.name;
  document.getElementById('stats-section').style.display = 'grid';
  document.getElementById('kocok-section').style.display = 'block';
  renderGroups();
  await updateStats();
  renderPayments();
}

document.getElementById('btn-add-group').addEventListener('click', () => {
  const today = new Date();
  document.getElementById('new-group-start').value = today.toISOString().slice(0,7);
  openModal('modal-add-group');
});

document.getElementById('btn-save-group').addEventListener('click', async () => {
  const name = document.getElementById('new-group-name').value.trim();
  const amount = Number(document.getElementById('new-group-amount').value);
  const drawDay = Number(document.getElementById('new-group-draw-day').value);
  const startMonth = document.getElementById('new-group-start').value;

  if (!name || !amount || !drawDay || !startMonth) { showToast('Lengkapi semua field!', 'error'); return; }

  const btn = document.getElementById('btn-save-group');
  btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';
  btn.disabled = true;

  const { data, error } = await supabaseClient.from('groups').insert({
    name, amount_per_month: amount, draw_day: drawDay, start_month: startMonth
  }).select().single();

  btn.innerHTML = 'Simpan Grup'; btn.disabled = false;

  if (error) { showToast('Gagal menyimpan: ' + error.message, 'error'); return; }
  
  closeModal('modal-add-group');
  document.getElementById('new-group-name').value = '';
  document.getElementById('new-group-amount').value = '';
  document.getElementById('new-group-draw-day').value = '';
  showToast('Grup berhasil dibuat! 🎉', 'success');
  await loadGroups();
  if (data) selectGroup(data.id);
});

// ============================================
// MEMBERS
// ============================================
async function loadMembers(groupId) {
  if (!supabaseClient || !groupId) return [];
  const { data, error } = await supabaseClient.from('members')
    .select('*').eq('group_id', groupId).order('order_number', { ascending: true });
  return error ? [] : (data || []);
}

async function renderMembers() {
  const el = document.getElementById('member-list');
  if (!currentGroup) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>Pilih grup terlebih dahulu</p></div>`;
    return;
  }
  const members = await loadMembers(currentGroup.id);
  if (!members.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>Belum ada anggota</p><button class="btn-sm" onclick="openModal('modal-add-member')">Tambah Anggota</button></div>`;
    return;
  }

  // Get winner history
  const { data: wins } = await supabaseClient.from('draw_results')
    .select('member_id').eq('group_id', currentGroup.id);
  const winnerIds = new Set((wins || []).map(w => w.member_id));

  el.innerHTML = members.map(m => `
    <div class="member-item">
      <div class="member-avatar">${m.name.charAt(0).toUpperCase()}</div>
      <div class="member-info">
        <div class="member-name">${m.name}</div>
        <div class="member-phone">📱 ${m.phone || '–'}</div>
        ${winnerIds.has(m.id) ? '<span class="winner-badge-member">🏆 Sudah Menang</span>' : ''}
      </div>
      <div class="member-order">${m.order_number || '–'}</div>
      <button class="btn-delete" onclick="deleteMember('${m.id}')">🗑</button>
    </div>
  `).join('');
}

document.getElementById('btn-add-member').addEventListener('click', () => {
  if (!currentGroup) { showToast('Pilih grup dulu!', 'error'); return; }
  openModal('modal-add-member');
});

document.getElementById('btn-save-member').addEventListener('click', async () => {
  if (!currentGroup) return;
  const name = document.getElementById('new-member-name').value.trim();
  const phone = document.getElementById('new-member-phone').value.trim();
  const order = document.getElementById('new-member-order').value;

  if (!name) { showToast('Nama wajib diisi!', 'error'); return; }

  const btn = document.getElementById('btn-save-member');
  btn.innerHTML = '<span class="loading-spinner"></span>'; btn.disabled = true;

  // Auto order
  let orderNum = order ? Number(order) : null;
  if (!orderNum) {
    const members = await loadMembers(currentGroup.id);
    orderNum = members.length + 1;
  }

  const { error } = await supabaseClient.from('members').insert({
    group_id: currentGroup.id, name, phone, order_number: orderNum
  });

  btn.innerHTML = 'Tambah Anggota'; btn.disabled = false;
  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }

  closeModal('modal-add-member');
  document.getElementById('new-member-name').value = '';
  document.getElementById('new-member-phone').value = '';
  document.getElementById('new-member-order').value = '';
  showToast('Anggota ditambahkan! 👤', 'success');
  renderMembers();
  updateStats();
});

async function deleteMember(id) {
  if (!confirm('Hapus anggota ini?')) return;
  const { error } = await supabaseClient.from('members').delete().eq('id', id);
  if (error) { showToast('Gagal hapus: ' + error.message, 'error'); return; }
  showToast('Anggota dihapus', '');
  renderMembers();
  updateStats();
}

// ============================================
// PAYMENTS
// ============================================
async function renderPayments() {
  const el = document.getElementById('payment-list');
  document.getElementById('current-month-label').textContent = formatMonth(currentPaymentMonth);

  if (!currentGroup) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💳</div><p>Pilih grup terlebih dahulu</p></div>`;
    return;
  }

  const members = await loadMembers(currentGroup.id);
  if (!members.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💳</div><p>Belum ada anggota</p></div>`;
    return;
  }

  const mk = monthKey(currentPaymentMonth);
  const { data: payments } = await supabaseClient.from('payments')
    .select('*').eq('group_id', currentGroup.id).eq('month_key', mk);

  const payMap = {};
  (payments || []).forEach(p => payMap[p.member_id] = p);

  el.innerHTML = members.map(m => {
    const p = payMap[m.id];
    const paid = !!p;
    const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f97316','#3b82f6'];
    const color = colors[m.order_number % colors.length];
    return `
      <div class="payment-item">
        <div class="payment-avatar" style="background:${color}20; color:${color}">
          ${m.name.charAt(0).toUpperCase()}
        </div>
        <div class="payment-info">
          <div class="payment-name">${m.name}</div>
          <div class="payment-date">${paid ? '✅ Bayar ' + new Date(p.paid_at).toLocaleDateString('id-ID') : '⏳ Belum bayar'}</div>
        </div>
        <button class="payment-toggle ${paid ? 'paid' : 'unpaid'}" 
          onclick="togglePayment('${m.id}', ${paid}, '${p?.id || ''}')">
          ${paid ? 'Lunas' : 'Belum'}
        </button>
      </div>
    `;
  }).join('');
}

async function togglePayment(memberId, currentlyPaid, paymentId) {
  if (!currentGroup) return;
  const mk = monthKey(currentPaymentMonth);

  if (currentlyPaid) {
    await supabaseClient.from('payments').delete().eq('id', paymentId);
    showToast('Status diubah ke belum lunas');
  } else {
    await supabaseClient.from('payments').insert({
      group_id: currentGroup.id,
      member_id: memberId,
      month_key: mk,
      paid_at: new Date().toISOString()
    });
    showToast('Pembayaran dicatat! 💰', 'success');
  }
  renderPayments();
  updateStats();
}

// Month navigation
document.getElementById('btn-prev-month').addEventListener('click', () => {
  currentPaymentMonth = new Date(currentPaymentMonth.getFullYear(), currentPaymentMonth.getMonth() - 1, 1);
  renderPayments();
});
document.getElementById('btn-next-month').addEventListener('click', () => {
  currentPaymentMonth = new Date(currentPaymentMonth.getFullYear(), currentPaymentMonth.getMonth() + 1, 1);
  renderPayments();
});

// ============================================
// STATS
// ============================================
async function updateStats() {
  if (!currentGroup) return;
  const members = await loadMembers(currentGroup.id);
  const mk = monthKey(new Date());
  const { data: payments } = await supabaseClient.from('payments')
    .select('*').eq('group_id', currentGroup.id).eq('month_key', mk);

  const { data: draws } = await supabaseClient.from('draw_results')
    .select('*, members(name)').eq('group_id', currentGroup.id).order('round_number', { ascending: false });

  const totalPaid = (payments || []).length;
  const totalFund = totalPaid * currentGroup.amount_per_month;
  const lastWinner = draws && draws.length ? draws[0].members?.name || '–' : '–';
  const currentRound = draws ? draws.length : 0;

  document.getElementById('stat-total').textContent = formatRp(totalFund);
  document.getElementById('stat-paid').textContent = `${totalPaid}/${members.length}`;
  document.getElementById('stat-round').textContent = `${currentRound}/${members.length}`;
  document.getElementById('stat-winner').textContent = lastWinner.split(' ')[0] || '–';

  // Check if already drawn this month
  const thisMonthDraw = draws?.find(d => d.month_key === mk);
  const btnKocok = document.getElementById('btn-kocok');
  const kocokDesc = document.getElementById('kocok-desc');
  const kocokBadge = document.getElementById('kocok-month-badge');

  kocokBadge.textContent = formatMonth(new Date()).split(' ')[0];

  if (thisMonthDraw) {
    const winName = thisMonthDraw.members?.name || '–';
    kocokDesc.textContent = `Bulan ini sudah dikocok! Pemenang: ${winName}`;
    btnKocok.disabled = true;
    document.getElementById('winner-result').innerHTML = `
      <div class="winner-name">🏆 ${winName}</div>
      <div class="winner-meta">Putaran ke-${thisMonthDraw.round_number} · ${formatMonth(new Date())}</div>
    `;
    document.getElementById('winner-result').style.display = 'block';
  } else {
    kocokDesc.textContent = 'Klik tombol untuk mengundi pemenang bulan ini';
    btnKocok.disabled = members.length === 0;
    document.getElementById('winner-result').style.display = 'none';
  }
}

// ============================================
// DRAW / KOCOK
// ============================================
document.getElementById('btn-kocok').addEventListener('click', async () => {
  if (!currentGroup) return;

  const members = await loadMembers(currentGroup.id);
  if (!members.length) { showToast('Tambahkan anggota dulu!', 'error'); return; }

  // Get already won members
  const { data: draws } = await supabaseClient.from('draw_results')
    .select('member_id').eq('group_id', currentGroup.id);
  const wonIds = new Set((draws || []).map(d => d.member_id));

  const eligible = members.filter(m => !wonIds.has(m.id));

  if (!eligible.length) {
    showToast('Semua anggota sudah menang! Arisan selesai 🎊', 'success');
    return;
  }

  // Check if current month already drawn
  const mk = monthKey(new Date());
  const { data: existing } = await supabaseClient.from('draw_results')
    .select('id').eq('group_id', currentGroup.id).eq('month_key', mk);
  if (existing && existing.length > 0) {
    showToast('Bulan ini sudah dikocok!', 'error'); return;
  }

  // Animate drum
  const drum = document.getElementById('drum');
  const drumInner = document.getElementById('drum-inner');
  const btn = document.getElementById('btn-kocok');
  btn.disabled = true;
  drum.classList.add('spinning');

  const emojis = ['🎲','🎰','🃏','🎴','🎯','🎪','🎠'];
  let counter = 0;
  const scramble = setInterval(() => {
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    drumInner.textContent = pick.name.charAt(0).toUpperCase();
    counter++;
    if (counter > 20) {
      clearInterval(scramble);
      // Pick winner
      const winner = eligible[Math.floor(Math.random() * eligible.length)];
      finalizeWinner(winner);
    }
  }, 120);
});

async function finalizeWinner(winner) {
  const drum = document.getElementById('drum');
  const drumInner = document.getElementById('drum-inner');

  drum.classList.remove('spinning');
  drumInner.textContent = '🏆';

  const { data: draws } = await supabaseClient.from('draw_results')
    .select('id').eq('group_id', currentGroup.id);
  const roundNumber = (draws?.length || 0) + 1;
  const mk = monthKey(new Date());
  const totalAmount = (await loadMembers(currentGroup.id)).length * currentGroup.amount_per_month;

  const { error } = await supabaseClient.from('draw_results').insert({
    group_id: currentGroup.id,
    member_id: winner.id,
    month_key: mk,
    round_number: roundNumber,
    total_amount: totalAmount,
    drawn_at: new Date().toISOString()
  });

  if (error) {
    showToast('Gagal simpan hasil: ' + error.message, 'error');
    document.getElementById('btn-kocok').disabled = false;
    return;
  }

  // Show result
  const resultEl = document.getElementById('winner-result');
  resultEl.innerHTML = `
    <div class="winner-name">🏆 ${winner.name}!</div>
    <div class="winner-meta">Putaran ke-${roundNumber} · ${formatMonth(new Date())} · ${formatRp(totalAmount)}</div>
  `;
  resultEl.style.display = 'block';

  showToast(`🎉 Selamat ${winner.name}!`, 'success');
  launchConfetti();
  updateStats();
  renderHistory();
}

// ============================================
// HISTORY
// ============================================
async function renderHistory() {
  const el = document.getElementById('history-list');
  if (!currentGroup) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📜</div><p>Pilih grup terlebih dahulu</p></div>`;
    return;
  }

  const { data, error } = await supabaseClient.from('draw_results')
    .select('*, members(name, phone)')
    .eq('group_id', currentGroup.id)
    .order('round_number', { ascending: false });

  if (!data || !data.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📜</div><p>Belum ada riwayat kocok</p></div>`;
    return;
  }

  el.innerHTML = data.map(d => `
    <div class="history-item">
      <div class="history-number">${d.round_number}</div>
      <div class="history-info">
        <div class="history-winner">🏆 ${d.members?.name || '–'}</div>
        <div class="history-meta">${formatMonthFromKey(d.month_key)} · ${new Date(d.drawn_at).toLocaleDateString('id-ID')}</div>
      </div>
      <div class="history-amount">${formatRp(d.total_amount)}</div>
    </div>
  `).join('');
}

function formatMonthFromKey(key) {
  if (!key) return '–';
  const [y, m] = key.split('-');
  return new Date(y, m-1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// ============================================
// CONFETTI
// ============================================
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    r: Math.random() * 8 + 4,
    d: Math.random() * 40 + 10,
    color: ['#f4c430','#34d399','#60a5fa','#f87171','#a78bfa'][Math.floor(Math.random()*5)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05,
    speed: Math.random() * 3 + 2,
  }));

  let angle = 0;
  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    angle += 0.01;
    pieces.forEach((p, i) => {
      p.tiltAngle += p.tiltSpeed;
      p.y += p.speed;
      p.x += Math.sin(angle + i) * 0.5;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, (p.tilt * Math.PI) / 180, 0, Math.PI * 2);
      ctx.fill();
    });
    if (pieces.some(p => p.y < canvas.height)) {
      frame = requestAnimationFrame(draw);
    } else {
      canvas.style.display = 'none';
    }
  }
  draw();
  setTimeout(() => { cancelAnimationFrame(frame); canvas.style.display = 'none'; }, 4000);
}

// ============================================
// SPLASH / CONNECT
// ============================================
document.getElementById('btn-connect').addEventListener('click', async () => {
  const url = document.getElementById('sb-url').value.trim();
  const key = document.getElementById('sb-key').value.trim();
  const status = document.getElementById('connect-status');
  const btn = document.getElementById('btn-connect');

  if (!url || !key) { showToast('URL dan Key wajib diisi!', 'error'); return; }

  btn.innerHTML = '<span class="loading-spinner"></span> Menghubungkan...';
  btn.disabled = true;

  const ok = await initSupabase(url, key);
  btn.innerHTML = '<span>Hubungkan Database</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  btn.disabled = false;

  if (ok) {
    status.className = 'connect-status success';
    status.textContent = '✅ Terhubung! Memuat data...';
    setTimeout(() => {
      document.getElementById('splash-screen').classList.remove('active');
      document.getElementById('app-screen').classList.add('active');
      loadGroups();
    }, 800);
  } else {
    status.className = 'connect-status error';
    status.textContent = '❌ Koneksi gagal. Periksa URL dan Key Anda.';
  }
});

// ---- AUTO-LOGIN ----
window.addEventListener('DOMContentLoaded', async () => {
  const savedUrl = localStorage.getItem('sb_url');
  const savedKey = localStorage.getItem('sb_key');
  if (savedUrl && savedKey) {
    document.getElementById('sb-url').value = savedUrl;
    document.getElementById('sb-key').value = savedKey;
    const ok = await initSupabase(savedUrl, savedKey);
    if (ok) {
      document.getElementById('splash-screen').classList.remove('active');
      document.getElementById('app-screen').classList.add('active');
      loadGroups();
    }
  }
});

// Settings = logout
document.getElementById('btn-settings').addEventListener('click', () => {
  if (confirm('Keluar dan hapus konfigurasi Supabase?')) {
    localStorage.removeItem('sb_url');
    localStorage.removeItem('sb_key');
    location.reload();
  }
});
