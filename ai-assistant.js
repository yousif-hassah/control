/**
 * CONTROL SYSTEMS — AI Assistant v3.0
 * Professional clean UI. No emojis. No developer console.
 * RAG pipeline calls /api/chat securely.
 */

class ControlAIAssistant {
  constructor() {
    this.isOpen = false;
    this.isListening = false;
    this.voiceEnabled = false;
    this.history = [];
    this.quoteWizardActive = false;
    this.quoteStep = 0;
    this.quoteData = { type: '', tier: '', timeline: '', contact: '' };

    this.initAudio();
    this.renderWidget();
    this.bindEvents();

    // ── AI Mini Calendar — site-matching dark calendar ──────────────────────
    window._aiMCState = window._aiMCState || {};

    /** Build and attach the calendar DOM directly into cardEl (avoids <script> injection) */
    window._buildAiMiniCal = (cardId, cardEl, prefillData = {}) => {
      const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const AR_DAYS  = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
      const WDS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const MAX_AHEAD = 3;

      let state = {
        cur: (() => { const d = new Date(); d.setDate(1); return d; })(),
        selectedDay: null,
        takenDates: new Set()
      };
      window._aiMCState[cardId] = state;

      // ── DOM structure ────────────────────────────────────────────────────
      const wrap = document.createElement('div');
      wrap.className = 'ai-interactive-booking-card';
      wrap.id = `card_${cardId}`;

      wrap.innerHTML = `
        <div class="ai-card-header">
          <div class="ai-card-title"><i class="fas fa-calendar-check" style="color:#30d158;"></i> استمارة حجز موعد تفاعلية</div>
          <div class="ai-card-subtitle">اختر اليوم من التقويم ثم أكمل بياناتك لتثبيت الحجز</div>
        </div>
        <div class="ai-mini-cal" id="aimc_cal_${cardId}">
          <div class="ai-mini-cal-header">
            <div class="ai-mini-cal-month" id="aimc_month_${cardId}">…</div>
            <div class="ai-mini-cal-nav">
              <button type="button" class="ai-mini-cal-btn" id="aimc_prev_${cardId}"><i class="fas fa-chevron-left"></i></button>
              <button type="button" class="ai-mini-cal-btn" id="aimc_next_${cardId}"><i class="fas fa-chevron-right"></i></button>
            </div>
          </div>
          <div class="ai-mini-cal-body">
            <div class="ai-mini-cal-weekdays">
              ${WDS.map(w => `<div class="ai-mini-cal-wd">${w}</div>`).join('')}
            </div>
            <div class="ai-mini-cal-days" id="aimc_days_${cardId}"></div>
          </div>
          <!-- Form appears below when a day is clicked -->
          <div class="ai-mini-cal-form" id="aimc_form_${cardId}">
            <div class="ai-mini-cal-panel-head">
              <div class="ai-mini-cal-panel-date" id="aimc_pdate_${cardId}">—</div>
              <button type="button" class="ai-mini-cal-close-btn" id="aimc_close_${cardId}"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="ai-mc-field">
              <label>الاسم الكامل *</label>
              <input type="text" id="aimc_name_${cardId}" placeholder="e.g. Ahmed Ali" value="${prefillData.name || ''}" />
            </div>
            <div class="ai-mc-field">
              <label>رقم الهاتف / الواتساب *</label>
              <input type="tel" id="aimc_phone_${cardId}" placeholder="+964 ..." value="${prefillData.phone || ''}" />
            </div>
            <div class="ai-mc-field">
              <label>نوع الخدمة / المشروع</label>
              <input type="text" id="aimc_service_${cardId}" placeholder="مثال: تطبيق موبايل، متجر، استشارة..." value="${prefillData.service || ''}" />
            </div>
            <div class="ai-mc-field">
              <label>ملاحظات إضافية</label>
              <textarea id="aimc_notes_${cardId}" placeholder="Any extra details..."></textarea>
            </div>
            <input type="hidden" id="aimc_date_${cardId}" value="" />
            <button type="button" class="ai-submit-booking-btn" id="aimc_submit_${cardId}">
              <i class="fas fa-paper-plane"></i> Confirm Booking
            </button>
          </div>
        </div>
      `;

      cardEl.appendChild(wrap);

      // ── Helper functions ─────────────────────────────────────────────────
      function today0() {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
      }

      function maxDate() {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth() + MAX_AHEAD + 1, 0);
      }

      function toDateStr(y, m, d) {
        return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }

      function renderGrid() {
        const y = state.cur.getFullYear(), m = state.cur.getMonth();
        const monthEl  = document.getElementById(`aimc_month_${cardId}`);
        const daysEl   = document.getElementById(`aimc_days_${cardId}`);
        const prevBtn  = document.getElementById(`aimc_prev_${cardId}`);
        const nextBtn  = document.getElementById(`aimc_next_${cardId}`);
        if (!monthEl || !daysEl) return;

        monthEl.textContent = `${MONTHS[m]} ${y}`;

        const now  = today0();
        const max  = maxDate();
        const prev = new Date(y, m - 1, 1);
        const next = new Date(y, m + 1, 1);

        if (prevBtn) prevBtn.disabled = prev < new Date(now.getFullYear(), now.getMonth(), 1);
        if (nextBtn) nextBtn.disabled = next > new Date(now.getFullYear(), now.getMonth() + MAX_AHEAD, 1);

        daysEl.innerHTML = '';
        const firstDow = new Date(y, m, 1).getDay();
        const total    = new Date(y, m + 1, 0).getDate();

        for (let i = 0; i < firstDow; i++) {
          const e = document.createElement('div');
          e.className = 'ai-mini-cal-day ai-mc-empty';
          daysEl.appendChild(e);
        }

        for (let d = 1; d <= total; d++) {
          const dateObj = new Date(y, m, d);
          const dStr    = toDateStr(y, m, d);
          const isToday = dateObj.toDateString() === now.toDateString();
          const isPast  = dateObj < now;
          const isBeyond= dateObj > max;
          const isBook  = state.takenDates.has(dStr);
          const isSel   = state.selectedDay &&
                          state.selectedDay.d === d &&
                          state.selectedDay.m === m &&
                          state.selectedDay.y === y;

          const el = document.createElement('div');
          el.className  = 'ai-mini-cal-day';
          el.textContent = d;

          if (isToday)  el.classList.add('ai-mc-today');
          if (isPast || isBeyond) {
            el.classList.add('ai-mc-past');
          } else if (isBook) {
            el.classList.add('ai-mc-booked');
            el.title = 'This date is already booked';
          } else {
            if (isSel) el.classList.add('ai-mc-selected');
            el.addEventListener('click', () => selectDay(d, m, y, AR_DAYS[dateObj.getDay()], dStr));
          }

          daysEl.appendChild(el);
        }
      }

      function selectDay(d, m, y, dayName, dStr) {
        state.selectedDay = { d, m, y };

        const pdateEl   = document.getElementById(`aimc_pdate_${cardId}`);
        const dateInput = document.getElementById(`aimc_date_${cardId}`);
        const formEl    = document.getElementById(`aimc_form_${cardId}`);
        const submitBtn = document.getElementById(`aimc_submit_${cardId}`);

        if (pdateEl)   pdateEl.textContent = `${dayName}، ${MONTHS[m]} ${d}، ${y}`;
        if (dateInput) dateInput.value = dStr;
        if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> تأكيد الحجز — ${dStr}`;

        if (formEl) {
          formEl.classList.remove('open'); // restart animation
          void formEl.offsetWidth;
          formEl.classList.add('open');
          setTimeout(() => formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
        }

        renderGrid();
      }

      // ── Event wiring ─────────────────────────────────────────────────────
      document.getElementById(`aimc_prev_${cardId}`)?.addEventListener('click', () => {
        state.cur.setMonth(state.cur.getMonth() - 1); renderGrid();
      });
      document.getElementById(`aimc_next_${cardId}`)?.addEventListener('click', () => {
        state.cur.setMonth(state.cur.getMonth() + 1); renderGrid();
      });
      document.getElementById(`aimc_close_${cardId}`)?.addEventListener('click', () => {
        const formEl = document.getElementById(`aimc_form_${cardId}`);
        if (formEl) formEl.classList.remove('open');
        state.selectedDay = null;
        renderGrid();
      });

      document.getElementById(`aimc_submit_${cardId}`)?.addEventListener('click', async () => {
        const name    = document.getElementById(`aimc_name_${cardId}`)?.value?.trim();
        const phone   = document.getElementById(`aimc_phone_${cardId}`)?.value?.trim();
        const date    = document.getElementById(`aimc_date_${cardId}`)?.value?.trim();
        const service = document.getElementById(`aimc_service_${cardId}`)?.value?.trim() || 'استشارة عامة';
        const notes   = document.getElementById(`aimc_notes_${cardId}`)?.value?.trim() || '';
        const btn     = document.getElementById(`aimc_submit_${cardId}`);

        if (!name)  { document.getElementById(`aimc_name_${cardId}`).focus(); return; }
        if (!phone) { document.getElementById(`aimc_phone_${cardId}`).focus(); return; }
        if (!date)  { alert('يرجى اختيار يوم من التقويم أولاً.'); return; }

        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting...`; }

        try {
          const res  = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, date, service, project: service, notes })
          });
          const data = await res.json();

          if (res.status === 409) {
            state.takenDates.add(date);
            renderGrid();
            const formEl = document.getElementById(`aimc_form_${cardId}`);
            if (formEl) formEl.classList.remove('open');
            state.selectedDay = null;
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-paper-plane"></i> Confirm Booking`; }
            alert('هذا التاريخ محجوز للتو. يرجى اختيار يوم آخر.');
            return;
          }

          if (!res.ok || !data.success) {
            alert('❌ ' + (data.error || 'حدث خطأ. يرجى المحاولة لاحقاً.'));
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-paper-plane"></i> إعادة المحاولة`; }
            return;
          }

          // Success — mark date locally & show confirmation
          state.takenDates.add(date);
          renderGrid();

          const calEl = document.getElementById(`aimc_cal_${cardId}`);
          if (calEl) {
            calEl.innerHTML = `
              <div class="ai-booking-success-card" style="padding:22px;text-align:center;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:16px;margin:10px 0;">
                <div style="width:52px;height:52px;border-radius:50%;background:#ffffff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.4rem;color:#000;box-shadow:0 0 16px rgba(255,255,255,0.4);">✓</div>
                <div style="font-size:0.98rem;font-weight:700;color:#ffffff;margin-bottom:6px;">تم تأكيد وحجز موعدك بنجاح!</div>
                <div style="color:#a1a1a6;font-size:0.82rem;margin-bottom:10px;">رقم الحجز: <span style="font-family:monospace;color:#ffffff;font-weight:700;">${data.booking.id}</span></div>
                <div style="color:#e0e0e0;font-size:0.85rem;line-height:1.8;">
                  📅 <strong style="color:#ffffff;">${data.booking.date}</strong><br>
                  👤 <span style="color:#e0e0e0;">${data.booking.name}</span><br>
                  📞 <span style="direction:ltr;display:inline-block;color:#e0e0e0;">${data.booking.phone}</span>
                </div>
                <div style="margin-top:12px;font-size:0.78rem;color:#a1a1a6;">📧 سنتواصل معك عبر الواتساب لتأكيد الاستشارة.</div>
              </div>`;
          }
        } catch (err) {
          alert('حدث خطأ بالشبكة. يرجى إعادة المحاولة.');
          if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-paper-plane"></i> إعادة المحاولة`; }
        }
      });

      // ── Load taken dates then render ────────────────────────────────────
      (async () => {
        try {
          const res = await fetch('/api/bookings?dates=true');
          if (res.ok) state.takenDates = new Set(await res.json());
        } catch (e) {}
        renderGrid();
      })();
    };
  } // end constructor

  /* ── Audio ── */
  initAudio() {
    this.ctx = null;
    this.tone = (f, t, d) => {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = t; o.frequency.value = f;
        g.gain.setValueAtTime(0.06, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + d);
      } catch(e) {}
    };
  }

  beep(m) {
    if (m === 'open')    { this.tone(880,'sine',0.1); setTimeout(()=>this.tone(1100,'sine',0.12),70); }
    if (m === 'close')   { this.tone(1100,'sine',0.1); setTimeout(()=>this.tone(880,'sine',0.12),70); }
    if (m === 'send')    { this.tone(700,'triangle',0.07); }
    if (m === 'receive') { this.tone(500,'triangle',0.07); setTimeout(()=>this.tone(700,'triangle',0.09),60); }
    if (m === 'success') { this.tone(880,'sine',0.07); setTimeout(()=>this.tone(1320,'sine',0.1),80); setTimeout(()=>this.tone(1760,'sine',0.14),160); }
  }

  /* ── Render ── */
  renderWidget() {
    // Trigger button
    const btn = document.createElement('button');
    btn.id = 'aiWidgetTrigger';
    btn.className = 'ai-widget-trigger';
    btn.setAttribute('aria-label', 'Open AI Assistant');
    btn.innerHTML = `
      <div class="ai-avatar-wrapper">
        <img src="app-icon.png" class="ai-trigger-owl" alt="Ctrl" />
      </div>
    `;
    document.body.appendChild(btn);

    // Chat window
    const win = document.createElement('div');
    win.id = 'aiChatWindow';
    win.className = 'ai-chat-window';
    win.innerHTML = `
      <div class="ai-notification" id="aiNotif"></div>

      <div class="ai-chat-header">
        <div class="ai-header-info">
          <div class="ai-avatar-wrapper">
            <img src="app-icon.png" class="ai-owl-avatar" alt="Ctrl" />
          </div>
          <div class="ai-title-block">
            <span class="ai-title-name">CONTROL Assistant</span>
            <span class="ai-title-status" id="aiStatusText">Online — Ready to help</span>
          </div>
        </div>
        <div class="ai-header-controls">
          <button class="ai-control-btn" id="aiVoiceToggle" title="Toggle voice output"><i class="fas fa-volume-mute"></i></button>
          <button class="ai-control-btn" id="aiCloseChat" title="Close"><i class="fas fa-xmark"></i></button>
        </div>
      </div>

      <div class="ai-chat-messages" id="aiChatMessages">
        <div class="ai-message bot ai-rtl">
          أهلاً وسهلاً! 👋<br><br>
          أنا مهندس من فريق <strong>CONTROL</strong>، ويسعدني أكون معاك.<br>
          سواء عندك سؤال، تريد تشوف شغلنا، أو تخطط لمشروع — كلنا آذان صاغية. تفضل!
        </div>
      </div>

      <div class="ai-quick-replies" id="aiChips">
        <button class="ai-chip" data-action="booking"><i class="fas fa-calendar-check"></i> حجز موعد</button>
        <button class="ai-chip" data-action="projects"><i class="fas fa-layer-group"></i> المشاريع</button>
        <button class="ai-chip" data-action="team"><i class="fas fa-users"></i> الفريق</button>
        <button class="ai-chip" data-action="contact"><i class="fas fa-envelope"></i> تواصل</button>
      </div>

      <div class="ai-compose-bar">
        <div class="ai-compose-inner">
          <input type="text" id="aiInput" class="ai-compose-input ai-rtl" placeholder="اكتب رسالتك..." autocomplete="off" />
          <button class="ai-compose-send" id="aiSendBtn" aria-label="Send">
            <i class="fas fa-arrow-up"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(win);

    // Backdrop overlay for computers
    const backdrop = document.createElement('div');
    backdrop.id = 'aiChatBackdrop';
    backdrop.className = 'ai-chat-backdrop';
    document.body.appendChild(backdrop);

    // Cache refs
    this.triggerBtn   = btn;
    this.chatWindow   = win;
    this.backdrop     = backdrop;
    this.messages     = document.getElementById('aiChatMessages');
    this.input        = document.getElementById('aiInput');
    this.sendBtn      = document.getElementById('aiSendBtn');
    this.chips        = document.getElementById('aiChips');
    this.voiceBtn     = document.getElementById('aiVoiceToggle');
    this.closeBtn     = document.getElementById('aiCloseChat');
    this.statusDot    = document.querySelector('.ai-owl-avatar');
    this.statusText   = document.getElementById('aiStatusText');
  }

  /* ── Events ── */
  bindEvents() {
    this.triggerBtn.addEventListener('click', () => this.toggle());
    this.closeBtn.addEventListener('click', () => this.toggle(false));
    this.backdrop.addEventListener('click', () => this.toggle(false));

    this.sendBtn.addEventListener('click', () => this.send());
    this.input.addEventListener('keydown', e => { if (e.key === 'Enter') this.send(); });

    this.chips.addEventListener('click', e => {
      const chip = e.target.closest('.ai-chip');
      if (chip) this.handleChip(chip.dataset.action);
    });

    this.voiceBtn.addEventListener('click', () => {
      this.voiceEnabled = !this.voiceEnabled;
      this.voiceBtn.classList.toggle('active', this.voiceEnabled);
      this.voiceBtn.innerHTML = this.voiceEnabled
        ? `<i class="fas fa-volume-up"></i>`
        : `<i class="fas fa-volume-mute"></i>`;
      this.notify(this.voiceEnabled ? 'Voice output on' : 'Voice output off');
    });
  }

  /* ── Toggle ── */
  toggle(state) {
    this.isOpen = state !== undefined ? state : !this.isOpen;
    this.chatWindow.classList.toggle('active', this.isOpen);
    this.triggerBtn.classList.toggle('hidden', this.isOpen);
    this.backdrop.classList.toggle('active', this.isOpen);
    this.beep(this.isOpen ? 'open' : 'close');
    if (this.isOpen) setTimeout(() => this.input.focus(), 280);
  }

  /* ── Notify ── */
  notify(txt) {
    const el = document.getElementById('aiNotif');
    el.textContent = txt;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ── TTS ── */
  speak(html) {
    if (!this.voiceEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const text = html.replace(/<[^>]*>/g, '');
      const u = new SpeechSynthesisUtterance(text);
      u.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-EG' : 'en-US';
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch(e) {}
  }

  /* ── Add Messages ── */
  addUser(text) {
    const d = document.createElement('div');
    d.className = 'ai-message user';
    d.textContent = text;
    this.messages.appendChild(d);
    this.scrollDown();
    this.beep('send');
    this.history.push({ role: 'user', text });
    if (this.history.length > 12) this.history.shift();
  }

  addBot(html, speakText) {
    this.removeTyping();
    const d = document.createElement('div');
    d.className = 'ai-message bot ai-rtl';
    this.messages.appendChild(d);

    // Fast, responsive typewriter effect
    let index = 0;
    const speed = 8; // Milliseconds per token/char
    const tokens = [];
    let i = 0;
    
    // Parse HTML tags into single tokens so they render instantly
    while (i < html.length) {
      if (html[i] === '<') {
        const end = html.indexOf('>', i);
        if (end !== -1) {
          tokens.push(html.slice(i, end + 1));
          i = end + 1;
          continue;
        }
      }
      tokens.push(html[i]);
      i++;
    }

    const type = () => {
      if (index < tokens.length) {
        d.innerHTML += tokens[index++];
        this.scrollDown();
        setTimeout(type, speed);
      } else {
        this.beep('receive');
        this.speak(speakText || html);
        const text = d.textContent || '';
        this.history.push({ role: 'bot', text });
        if (this.history.length > 12) this.history.shift();
      }
    };
    type();
  }

  showTyping() {
    this.removeTyping();
    this.setStatus('thinking');
    const d = document.createElement('div');
    d.id = 'aiTyping';
    d.className = 'ai-typing-indicator';
    d.innerHTML = `<div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div>`;
    this.messages.appendChild(d);
    this.scrollDown();
  }

  removeTyping() {
    this.setStatus('online');
    const el = document.getElementById('aiTyping');
    if (el) el.remove();
  }

  setStatus(state) {
    const avatar = this.statusDot || document.querySelector('.ai-owl-avatar');
    if (state === 'thinking') {
      if (avatar) avatar.classList.add('thinking');
      this.statusText.textContent = 'Processing...';
    } else {
      if (avatar) avatar.classList.remove('thinking');
      this.statusText.textContent = 'Online — Ready to help';
    }
  }

  scrollDown() {
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  /* ── Chips ── */
  handleChip(action) {
    const labels = {
      booking: 'حجز موعد مباشرة',
      projects: 'عرض المشاريع',
      quote: 'طلب عرض سعر',
      team: 'فريق التطوير',
      contact: 'التواصل معنا'
    };

    if (action === 'booking') {
      this.addUser(labels.booking);
      this.showTyping();
      setTimeout(() => {
        this.removeTyping();
        this.addInteractiveBookingForm();
      }, 400);
      return;
    }

    this.addUser(labels[action] || action);
    this.showTyping();

    const delay = 480;
    if (action === 'projects') setTimeout(() => this.showProjects(), delay);
    else if (action === 'quote') setTimeout(() => this.startWizard(), delay);
    else if (action === 'team') setTimeout(() => this.showTeam(), delay);
    else if (action === 'contact') setTimeout(() => this.showContact(), delay);
  }

  addInteractiveBookingForm(initialData = {}) {
    const cardId = 'bkg_' + Math.floor(100000 + Math.random() * 900000);

    // Create message bubble directly (bypass typewriter — calendar needs live DOM)
    this.removeTyping();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message bot ai-rtl';
    msgDiv.textContent = 'أهلاً! اختر يوماً مناسباً من التقويم لتثبيت موعد استشارتك مع فريق CONTROL:';
    this.messages.appendChild(msgDiv);

    // Container for the calendar card
    const calContainer = document.createElement('div');
    this.messages.appendChild(calContainer);

    // Build the full calendar widget into calContainer
    window._buildAiMiniCal(cardId, calContainer, {
      name: initialData.name || '',
      phone: initialData.phone || '',
      service: initialData.service || ''
    });

    this.scrollDown();
    this.beep('receive');
  }

  /* ── Main Send ── */
  async send() {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this.addUser(text);

    if (this.quoteWizardActive) { this.wizardInput(text); return; }

    this.showTyping();

    // 1. Try secure server endpoint (Vercel production / vercel dev)
    try {
      const data = await this.callServer(text);
      this.removeTyping();
      this.addBot(data.response);
      return;
    } catch(e) {
      // Server not available — fall through to local KB
    }

    // 2. Smart local knowledge base fallback (always works offline)
    setTimeout(() => this.smartFallback(text), 300);
  }

  /* ── Server /api/chat call (DeepSeek RAG) ── */
  async callServer(message) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: this.history }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /* ── Smart Local Knowledge Base Fallback ── */
  smartFallback(text) {
    const t = text.toLowerCase();

    // 1. Car Parking & Garage Systems (كراج / موقف / بارك / سيارات)
    if (t.includes('موقف') || t.includes('سيارات') || t.includes('بارك') || t.includes('كراج') || t.includes('parking') || t.includes('garage')) {
      this.removeTyping();
      this.addBot(
        `أهلاً بك عيني. كمهندس برمجيات عراقي بخبرة 15 سنة، هذا المجال فيه فرص ممتازة للابتكار الرقمي بالسوق المحلي. هذي 4 حلول ذكية نقدر نبنيها إلك بمشروعك:<br><br>` +
        `1. <strong>نظام التعرف الذكي (License Plate Recognition)</strong>: استخدام كاميرات المراقبة الحالية مع خوارزمية ذكاء اصطناعي لقراءة أرقام السيارات تلقائياً عند الدخول والخروج بدون الحاجة لبطاقات ورقية.<br>` +
        `2. <strong>تطبيق الحجز المسبق (Spot Booking App)</strong>: تطبيق بسيط يتيح للمشتركين حجز مكان وقوف قبل وصولهم مع رؤية الأماكن الشاغرة لحظياً.<br>` +
        `3. <strong>بوابة الدفع التلقائي (Auto-Pay Gate)</strong>: ربط الحساب بمحفظة (Zain Cash أو FIB) ليتم اقتطاع كلفة الوقوف تلقائياً عبر رمز QR عند الخروج لتجنب الازدحام.<br>` +
        `4. <strong>لوحة إدارة المشرف (Admin Dashboard)</strong>: لوحة تحكم سحابية لمالك الكراج لمتابعة الدخل اليومي، أوقات الذروة، والاشتراكات الشهرية.<br><br>` +
        `هذي الحلول تعتمد على حجم الكراج؛ هل الكراج عام للزبائن لو خاص بمجمع أو شركة؟ تفضل احجيلي تفاصيل أكثر حتى نخطط للنظام الصح.`
      );
      return;
    }

    // 2. Cafe & Restaurant Development Suggestions
    if (t.includes('قهوة') || t.includes('كوفي') || t.includes('كافيه') || t.includes('مطعم') || t.includes('مطاعم') || t.includes('اكل') || t.includes('منيو') || t.includes('كوفي شوب')) {
      this.removeTyping();
      this.addBot(
        `عيني، كمهندس اشتغل بالسوق العراقي لأكثر من 15 سنة، تطوير عمل الكوفي شوب صار يعتمد بشكل أساسي على التقنية وتجربة الزبون الرقمية والسريعة. نصيحتي إلك تركز على ثلاث محاور أساسية:<br><br>` +
        `1. <strong>المنيو الرقمي التفاعلي (Smart QR Menu)</strong>: مو بس يعرض الصور والأسعار، وإنما يدعم الطلب المباشر من الطاولة، ونظام طلبات خارجي (Takeaway) لتقليل طوابير الانتظار عند الكاشير.<br>` +
        `2. <strong>برنامج الولاء الرقمي (Digital Loyalty Program)</strong>: اربط نظام الكاشير (POS) بقاعدة بيانات بسيطة للزبائن (مثلاً عن طريق رقم الهاتف). الزبون يحصل نقاط على كل قهوة يشتريها، وتجيه عروض مخصصة بيوم ميلاده أو خصومات للمشتركين الدائمين.<br>` +
        `3. <strong>تكامل الدفع الإلكتروني</strong>: توفير خيارات الدفع مثل Zain Cash أو FIB يسهل عملية الشراء ويجذب فئة الزبائن الشباب والشركات الي يفضلون الدفع الرقمي.<br><br>` +
        `هذي الأفكار تزيد المبيعات بنسبة لا تقل عن 25%. شنو نوع الكافيه أو المطعم الي عندك حالياً؟ خليني أساعدك بالتفاصيل.`
      );
      return;
    }

    // 3. E-commerce & Retail Store (متجر / محل / بيع / شراء / بضاعة / ملابس)
    if (t.includes('متجر') || t.includes('محل') || t.includes('بيع') || t.includes('شراء') || t.includes('بضاعة') || t.includes('ملابس') || t.includes('أزياء') || t.includes('توصيل')) {
      this.removeTyping();
      this.addBot(
        `أهلاً بك عيني. بناء متجر إلكتروني احترافي يحتاج معايير عالمية لتكسب ثقة الزبون العراقي. أنصحك بالتركيز على:<br><br>` +
        `1. <strong>نظام مخازن متعدد الفروع (Multi-branch Inventory)</strong>: يربط موقع الويب بمخازنك الفعلية لحظة بلحظة لمنع بيع بضاعة غير متوفرة.<br>` +
        `2. <strong>بوابات الدفع المحلية</strong>: تكامل تام مع زين كاش وآسيا حوالة، مع خيار الدفع عند الاستلام كخيار أساسي.<br>` +
        `3. <strong>نظام سلة المهملات (Abandoned Cart Recovery)</strong>: إرسال تذكير تلقائي عبر الواتساب للزبائن الذين أضافوا منتجات للسلة ولم يكملوا الشراء، وهذا يرجع 15% من المبيعات المفقودة.<br><br>` +
        `هل تريد المتجر يكون موقع ويب لو تطبيق للموبايل؟`
      );
      return;
    }

    // 4. Real Estate & Properties (عقار / عقارات / شقق / بيوت / مكتب عقاري)
    if (t.includes('عقار') || t.includes('عقارات') || t.includes('شقة') || t.includes('شقق') || t.includes('بيت') || t.includes('بيوت') || t.includes('أراضي')) {
      this.removeTyping();
      this.addBot(
        `يا هلا بيك. تسويق وإدارة العقارات بالعراق تطور جداً. هذي أهم الأنظمة المبتكرة الي نقدر ننفذها إلك:<br><br>` +
        `1. <strong>خريطة تفاعلية (Interactive Map)</strong>: تتيح للمشتري البحث عن العقارات حسب المنطقة والشارع مع فلاتر ذكية للأسعار والمساحة.<br>` +
        `2. <strong>نظام الجولات الافتراضية (3D VR Tours)</strong>: دمج جولات ثلاثية الأبعاد داخل الموقع لتسهيل المعاينة عن بعد وتقليل الجولات الميدانية غير المجدية.<br>` +
        `3. <strong>لوحة إدارة الوسطاء (Broker CRM)</strong>: تتبع أداء فريق المبيعات والعملاء المحتملين تلقائياً مع نظام إشعارات ذكي لجدولة مواعيد الاتصال.<br><br>` +
        `هل تبحث عن موقع لعرض العقارات أم نظام إدارة داخلي لشركتك؟`
      );
      return;
    }

    // 5. Salons & Barbershops (حلاقة / صالون / كوافير / تجميل / عيادة تجميل)
    if (t.includes('حلاقة') || t.includes('صالون') || t.includes('كوافير') || t.includes('تجميل')) {
      this.removeTyping();
      this.addBot(
        `يا هلا بيك عيني. إدارة الحجوزات وتقليل وقت انتظار الزبائن هو سر نجاح الصالونات الحديثة. هذي حلول برمجية فخمة نقدر نبنيها:<br><br>` +
        `1. <strong>نظام الحجز التفاعلي (Smart Booking Calendar)</strong>: يتيح للزبون اختيار الحلاق أو المصفف، ونوع الخدمة، والوقت المتاح بدقة.<br>` +
        `2. <strong>تتبع الطابور لحظياً (Live Queue Tracker)</strong>: إمكانية رؤية الزبون لدوره وتوقع وقت بدء خدمته من الموبايل مباشرة.<br>` +
        `3. <strong>تذكير تلقائي عبر SMS/WhatsApp</strong>: نظام يرسل إشعارات تلقائية لتذكير الزبائن بمواعيدهم لتقليل إلغاء الحجوزات.<br><br>` +
        `شلون تدير الحجوزات حالياً؟ بشكل يدوي لو تستخدم نظام معين؟`
      );
      return;
    }

    // 6. Iraqi Market & Local Tech Dynamics
    if (t.includes('عراق') || t.includes('بغداد') || t.includes('سوق') || t.includes('دفع') || t.includes('زين كاش') || t.includes('فيب') || t.includes('fib') || t.includes('محلي') || t.includes('توصيل')) {
      this.removeTyping();
      this.addBot(
        `أهلاً بك عيني. السوق التقني العراقي حالياً يمر بطفرة رقمية ممتازة، وبصفتي مهندس عراقي عايشت هذا التطور، هذي أهم المحاور للنجاح محلياً:<br><br>` +
        `1. <strong>ثقافة الدفع الإلكتروني</strong>: تكامل بوابات الدفع (Zain Cash, FIB, Qi Card, Tasded) صار أساسي لزيادة المبيعات وبناء الثقة.<br>` +
        `2. <strong>البنية التحتية والاستضافة</strong>: استخدام CDN مثل Cloudflare ضروري جداً لتقليل زمن الاستجابة (Latency) داخل العراق لأن بوابات الإنترنت المحلية تعتمد على مسارات دولية متعددة.<br>` +
        `3. <strong>لوجستيات التوصيل</strong>: تكامل نظام الويب مع شركات التوصيل المحلية عبر API يضمن تتبع حقيقي للطلبات وتقليل نسبة المرتجعات.<br><br>` +
        `إذا عندك فكرة مشروع محددة وتريد تطلقها بالسوق العراقي، كلي حتى نخطط لها صح.`
      );
      return;
    }

    // 7. System Design & Architecture
    if (t.includes('تصميم') || t.includes('معمارية') || t.includes('سيرفر') || t.includes('سحابية') || t.includes('قاعدة بيانات') || t.includes('سكيل') || t.includes('بطء') || t.includes('سريعة') || t.includes('قواعد بيانات') || t.includes('لود')) {
      this.removeTyping();
      this.addBot(
        `يا هلا بيك. تصميم الأنظمة (System Design) هو العمود القبلي لأي مشروع ناجح. كمهندس برمجيات خبير، هذي نصائحي لبناء معمارية قوية وقابلة للتوسع (Scalable):<br><br>` +
        `1. <strong>Monolith vs Microservices</strong>: للمشاريع الناشئة (MVPs)، ابدأ دائماً بـ Monolithic نظيف ومنظم. لا تشتت نفسك بالـ Microservices من البداية إلا إذا كان عندك فريق عمل كبير وتوزيع واضح للمهام.<br>` +
        `2. <strong>اختيار قاعدة البيانات</strong>: PostgreSQL هي الخيار الذهبي لأغلب الأنظمة بفضل دعمها للبيانات المهيكلة (SQL) وغير المهيكلة (JSONB)، بالإضافة إلى استقرارها العالي.<br>` +
        `3. <strong>الاستضافة والسحابية</strong>: أنصح باستخدام Vercel أو Netlify للواجهات (Frontend)، وسيرفرات VPS مثل DigitalOcean أو AWS للـ Backend، مع إعداد Caching قوي باستخدام Redis لتخفيف الضغط على قاعدة البيانات.<br><br>` +
        `شكد تتوقع حجم اللود أو عدد المستخدمين المتزامن بمشروعك؟`
      );
      return;
    }

    const matchers = [
      { keys: ['سعر','تكلف','بكم','كم يكلف','فلوس','ميزانية','quote','cost','price','كلفة'], action: () => this.addBot(`أهلاً بك عيني. كجزء من سياستنا البرمجية، نقوم بتقديم عروض أسعار مخصصة بدقة بعد دراسة متطلبات كل مشروع على حدة لضمان أفضل جودة وكلفة.<br><br>تفضل بالتواصل معنا مباشرة عبر الإيميل أو انستغرام لمناقشة فكرتك مجاناً وتحديد كلفة دقيقة:<br>• البريد الإلكتروني: <strong>controltxt.11@gmail.com</strong><br>• انستغرام: <strong>@controltxt.c</strong>`) },
      { keys: ['مشروع','مشاريع','اعمال','عملتو','شوف','show','project','work','portfolio','اعمالكم'], action: () => this.showProjects() },
      { keys: ['فريق','مطور','يوسف','مصطفى','علي','أزهر','team','developer','مين يشتغل','طاقم'], action: () => this.showTeam() },
      { keys: ['تواصل','اتصال','ايميل','انستغرام','واتساب','contact','email','instagram','رقم','هاتف'], action: () => this.showContact() },
      { keys: ['حجز','احجز','ثبت','تثبيت','اجتماع','موعد','تاريخ','استمارة','meeting','book','booking','schedule','consultation','استشارة'], action: () => this.showBookingForm() },
      { keys: ['lady','ليدي','متجر ازياء','فخامة'], action: () => this.addBot(`متجر <strong>LADY</strong> هو واحد من أبرز مشاريعنا — متجر أزياء عراقي فاخر مصمم بمعايير العلامات التجارية الراقية.<br><br><a href="https://lady-xi.vercel.app/" target="_blank" class="project-link">معاينة المتجر مباشرة</a>`) },
      { keys: ['delish','دليش','مطعم','restaurant','حجز طاولة'], action: () => this.addBot(`مشروع <strong>DELISH</strong> هو موقع مطعم فاخر يتضمن نظام حجز طاولات تفاعلي متكامل.<br><br><a href="https://cursormh1947.vercel.app/website/" target="_blank" class="project-link">معاينة موقع DELISH</a>`) },
      { keys: ['شركة','control','من انتم','about','عنكم'], action: () => this.addBot(`<strong>CONTROL Systems</strong> هي شركة تقنية عراقية مقرها بغداد، متخصصة في بناء منتجات رقمية فاخرة تشمل:<br><br>• مواقع الويب الاحترافية<br>• تطبيقات الهواتف الذكية<br>• المتاجر الإلكترونية<br>• الأنظمة السحابية للمؤسسات<br><br>فريقنا من أفضل المطورين والمصممين العراقيين.`) },
    ];

    for (const m of matchers) {
      if (m.keys.some(k => t.includes(k))) {
        this.removeTyping();
        m.action();
        return;
      }
    }

    // 9. General Consultation & Natural Chat
    const defaults = [
      `يا هلا بيك عيني! كمهندس برمجيات بخبرة 15 سنة بالسوق العراقي، يسعدني أجاوبك على أي سؤال يخص:<br>• تصميم معمارية الأنظمة وقواعد البيانات<br>• دمج الدفع الإلكتروني (زين كاش وفيب)<br>• تطوير المتاجر وتطبيقات الموبايل<br><br>احجيلي تفاصيل فكرتك أو المشروع الي ببالك حتى نقدر نساعدك نخطط اله ونبني الك بأعلى كفاءة.`,
      `أهلاً وسهلاً عيني. من خلال خبرتي الطويلة بمشاريع الويب والموبايل بالمنطقة، أهم شي هو التخطيط الصحيح واختيار الـ Tech Stack المناسب قبل البدء. تريد نناقش الجانب التقني لو الجانب التسويقي والمالي لمشروعك؟`,
      `يسعدني جداً هذا النقاش. كمهندس خبير، أنصح دائماً بالبدء بـ <strong>MVP (المنتج الأدنى القابل للتجربة)</strong> لتقليل المخاطر واختبار السوق. شلون تكدر تبسط فكرتك وتنطلق بيها بأسرع وقت؟ خليني أساعدك نخططها.`,
    ];

    this.removeTyping();
    const pick = defaults[Math.floor(Math.random() * defaults.length)];
    this.addBot(pick);
  }

  /* ── Booking Form ── */
  showBookingForm(initialData = {}) {
    this.addInteractiveBookingForm(initialData);
  }

  /* ── Preset Responses ── */
  showProjects() {
    const projects = [
      { name: 'store LADY', desc: 'متجر أزياء عراقي فاخر', url: 'https://lady-xi.vercel.app/' },
      { name: 'store shope', desc: 'متجر إلكتروني متكامل للملابس', url: 'https://shirt2026.vercel.app/' },
      { name: 'DELISH Restaurant', desc: 'موقع مطعم فاخر مع حجز طاولات', url: 'https://cursormh1947.vercel.app/website/' },
      { name: 'Menu Coffee', desc: 'قائمة مقهى رقمية سريعة التحميل', url: 'https://menu-plus.vercel.app/' },
      { name: 'DIJLAH Studio', desc: 'استوديو تصميم هويات بصرية', url: 'https://graphicdijlah.vercel.app/' },
      { name: 'PLANET', desc: 'أرشيف صور فني رقمي', url: 'https://planet-907018080690.europe-west1.run.app/' },
    ];

    let html = `مشاريع منجزة من فريق <strong>CONTROL</strong>:<br>`;
    projects.forEach(p => {
      html += `
        <div class="ai-project-card" onclick="window.open('${p.url}','_blank')">
          <div class="ai-proj-info">
            <span class="ai-proj-title">${p.name}</span>
            <span class="ai-proj-desc">${p.desc}</span>
          </div>
          <i class="fas fa-arrow-left ai-proj-arrow"></i>
        </div>
      `;
    });
    this.addBot(html, 'إليك أبرز المشاريع المنجزة');
  }

  showTeam() {
    this.addBot(`
      يتكون فريق <strong>CONTROL</strong> من:<br><br>
      <strong>يوسف حسن</strong> — Full-stack Developer<br>
      <strong>مصطفى أحمد</strong> — Backend Developer<br>
      <strong>علي يوسف</strong> — UI/UX Designer<br>
      <strong>أزهر</strong> — Mobile App Developer
    `);
  }

  showContact() {
    this.addBot(`
      للتواصل مع فريق <strong>CONTROL</strong>:<br><br>
      <strong>البريد الإلكتروني</strong><br>
      <a href="mailto:controltxt.11@gmail.com" class="project-link">controltxt.11@gmail.com</a><br><br>
      <strong>انستغرام</strong><br>
      <a href="https://www.instagram.com/controltxt.c/" target="_blank" class="project-link">@controltxt.c</a>
    `);
  }

  /* ── Quote Wizard ── */
  startWizard() {
    this.quoteWizardActive = true;
    this.quoteStep = 1;
    this.quoteData = { type: '', tier: '', timeline: '', contact: '' };
    this.renderWizard();
  }

  renderWizard() {
    const steps = {
      1: { label: 'Step 1 of 4 — Project Type', pct: 25, content: `
        ما نوع المشروع الذي تحتاجه؟
        <div class="ai-wizard-options">
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('متجر إلكتروني')"><i class="fas fa-bag-shopping"></i> متجر إلكتروني</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('منيو رقمي أو حجز مطاعم')"><i class="fas fa-utensils"></i> منيو رقمي / مطعم</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('موقع تعريفي / معرض أعمال')"><i class="fas fa-briefcase"></i> موقع تعريفي</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('تطبيق موبايل')"><i class="fas fa-mobile-screen"></i> تطبيق موبايل</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('نظام مؤسسي ERP/CRM')"><i class="fas fa-server"></i> نظام مؤسسي</button>
        </div>` },
      2: { label: 'Step 2 of 4 — Scope', pct: 50, content: `
        ما مستوى التطوير المطلوب؟
        <div class="ai-wizard-options">
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('أساسي')"><i class="fas fa-bolt"></i> أساسي — تصميم سريع وميزات قياسية</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('متقدم')"><i class="fas fa-star"></i> متقدم — تصميم مخصص ولوحة تحكم</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('مؤسسي')"><i class="fas fa-shield-halved"></i> مؤسسي — أمان فائق وتكاملات معقدة</button>
        </div>` },
      3: { label: 'Step 3 of 4 — Timeline', pct: 75, content: `
        ما الإطار الزمني المفضل للتسليم؟
        <div class="ai-wizard-options">
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('عاجل (1-2 أسبوع)')"><i class="fas fa-gauge-high"></i> عاجل — 1 إلى 2 أسبوع</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('قياسي (3-5 أسابيع)')"><i class="fas fa-calendar-check"></i> قياسي — 3 إلى 5 أسابيع</button>
          <button class="ai-wizard-opt" onclick="window.aiAssistant.pick('مرن (أكثر من 6 أسابيع)')"><i class="fas fa-leaf"></i> مرن — أكثر من 6 أسابيع</button>
        </div>` },
      4: { label: 'Step 4 of 4 — Contact', pct: 100, content: `
        أدخل اسمك وطريقة التواصل معك (هاتف أو بريد إلكتروني أو انستغرام).<br>
        سنتواصل معك في أقرب وقت.` }
    };

    const s = steps[this.quoteStep];
    this.addBot(`
      <div class="ai-wizard-header">
        <span class="ai-wizard-step-label">${s.label}</span>
        <div class="ai-wizard-bar-track"><div class="ai-wizard-bar-fill" style="width:${s.pct}%"></div></div>
      </div>
      ${s.content}
    `);
  }

  pick(value) {
    this.addUser(value);
    this.showTyping();
    setTimeout(() => this.wizardInput(value), 400);
  }

  wizardInput(text) {
    if      (this.quoteStep === 1) { this.quoteData.type = text; this.quoteStep = 2; this.renderWizard(); }
    else if (this.quoteStep === 2) { this.quoteData.tier = text; this.quoteStep = 3; this.renderWizard(); }
    else if (this.quoteStep === 3) { this.quoteData.timeline = text; this.quoteStep = 4; this.renderWizard(); }
    else if (this.quoteStep === 4) {
      this.quoteData.contact = text;
      this.quoteWizardActive = false;
      this.quoteStep = 0;
      this.buildQuote();
    }
  }

  /* ── Generate Quote ── */
  buildQuote() {
    this.showTyping();
    this.beep('success');

    let price = 500, days = 20, stack = 'HTML / CSS / JavaScript';
    const { type, tier, timeline } = this.quoteData;

    if (type.includes('متجر'))      { price = 950;  days = 30; stack = 'Next.js + Supabase'; }
    if (type.includes('منيو'))      { price = 600;  days = 15; stack = 'React + Node.js API'; }
    if (type.includes('تطبيق'))     { price = 1900; days = 42; stack = 'Flutter / React Native'; }
    if (type.includes('نظام'))      { price = 3200; days = 56; stack = 'Next.js Enterprise + PostgreSQL + AWS'; }

    if (tier === 'متقدم')   { price += 400; days += 7; }
    if (tier === 'مؤسسي')   { price += 950; days += 14; }
    if (timeline.includes('عاجل'))  { price = Math.round(price * 1.35); days = Math.round(days * 0.5); }
    if (timeline.includes('مرن'))   { price = Math.round(price * 0.9); days = Math.round(days * 1.3); }

    const id = 'CTRL-' + Math.floor(10000 + Math.random() * 90000);

    const specText =
`REF: ${id}
Client: ${this.quoteData.contact}
Type: ${this.quoteData.type}
Scope: ${this.quoteData.tier}
Timeline: ${this.quoteData.timeline}

Tech Stack: ${stack}
Security: SSL / CSRF Protected / CDN
Responsive: Yes — all screen sizes

Estimated Cost: $${price} USD
Estimated Duration: ~${days} working days`;

    setTimeout(() => {
      this.addBot(`
        تم إعداد عرض السعر بنجاح.<br><br>
        <div class="ai-quote-card">
          <div class="ai-quote-ref">
            <span>${id}</span>
            <span class="ai-quote-badge">VALIDATED</span>
          </div>
          <div class="ai-quote-body" id="spec_${id}"><strong>النوع:</strong> ${this.quoteData.type}
<strong>المستوى:</strong> ${this.quoteData.tier}
<strong>التسليم:</strong> ${this.quoteData.timeline}
<strong>التقنيات:</strong> ${stack}
<strong>التكلفة المقدرة:</strong> $${price} USD
<strong>المدة المقدرة:</strong> ~${days} يوم عمل</div>
          <div class="ai-quote-actions">
            <button class="ai-quote-btn" onclick="window.aiAssistant.copySpec('${id}')"><i class="fas fa-copy"></i> نسخ</button>
            <button class="ai-quote-btn" onclick="window.aiAssistant.downloadSpec('${id}',\`${specText.replace(/`/g,"'")}\`)"><i class="fas fa-arrow-down-to-line"></i> تحميل</button>
          </div>
        </div>
        <br>سيتواصل معك أحد مهندسينا عبر <strong>${this.quoteData.contact}</strong> في أقرب وقت.
      `);
    }, 500);
  }

  copySpec(id) {
    const el = document.getElementById(`spec_${id}`);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      this.notify('Copied to clipboard');
      this.beep('success');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = el.innerText;
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.notify('Copied');
    });
  }

  downloadSpec(id, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `control_quote_${id}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    this.notify('Downloading...');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.aiAssistant = new ControlAIAssistant();
});
