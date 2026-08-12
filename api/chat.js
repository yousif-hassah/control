/**
 * CONTROL Systems — CORE RAG AI API Handler
 * Securely calls AI providers (OpenRouter, DeepSeek, Gemini) using environment variables (hidden from client)
 * Performs local retrieval-augmented generation (RAG) using search matching
 */

const KNOWLEDGE_BASE = require('./knowledge.json');


// Simple token-based matching relevance scorer (RAG retrieval step)
function retrieveRelevantContext(query) {
  const q = query.toLowerCase();
  const queryTokens = q.split(/\s+/).filter(t => t.length > 1);
  
  const scored = KNOWLEDGE_BASE.map(chunk => {
    let score = 0;
    
    // 1. High weight for matching unique keywords
    chunk.keywords.forEach(kw => {
      if (q.includes(kw)) {
        score += 15;
      }
    });

    // 2. Medium weight for token overlap in content
    queryTokens.forEach(token => {
      if (chunk.content.toLowerCase().includes(token)) {
        score += 2;
      }
    });

    return { chunk, score };
  });

  // Filter out completely irrelevant chunks and sort descending
  const matches = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    // If no context matched, return company profile and contact info as default context
    return [KNOWLEDGE_BASE[0], KNOWLEDGE_BASE[KNOWLEDGE_BASE.length - 1]];
  }

  // Return the top 3 matching chunks
  return matches.slice(0, 3).map(m => m.chunk);
}

// Render Interactive Booking Card HTML with Sleek Date Pills
function renderInteractiveBookingFormCard(dataJson = {}) {
  const cardId = 'bkg_' + Math.floor(100000 + Math.random() * 900000);
  const name = dataJson.name && dataJson.name !== 'عميل CONTROL' ? dataJson.name : '';
  const phone = dataJson.phone && dataJson.phone !== 'غير مذكور' ? dataJson.phone : '';
  const date = dataJson.date || '';
  const service = dataJson.service && dataJson.service !== 'استشارة عامة' ? dataJson.service : '';

  const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let selectedDate = date || tomorrowStr;

  const pills = [];
  for (let i = 1; i <= 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dStr = `${yyyy}-${mm}-${dd}`;

    const isSel = dStr === selectedDate;
    const label = `${AR_DAYS[d.getDay()]} (${d.getDate()} ${AR_MONTHS[d.getMonth()]})`;
    const tag = i === 1 ? 'موصى به' : 'متاح';

    pills.push(`
      <div class="ai-date-pill ${isSel ? 'selected' : ''}" id="pill_${cardId}_${dStr}" onclick="window._selectAiBookingDate('${cardId}', '${dStr}', this)">
        <span><i class="fas fa-calendar-day" style="margin-left:6px;"></i> ${label}</span>
        <span class="ai-date-pill-badge">${tag}</span>
      </div>
    `);
  }

  return `<div class="ai-interactive-booking-card" id="card_${cardId}">
    <div class="ai-card-header">
      <div class="ai-card-title"><i class="fas fa-calendar-check" style="color:#30d158;"></i> استمارة حجز موعد تفاعلية</div>
      <div class="ai-card-subtitle">اختر تاريخ الاستشارة وعَبِّ البيانات لتأكيد الموعد فوراً بالسيرفر</div>
    </div>
    <div class="ai-card-body">
      <div class="ai-input-group">
        <label><i class="fas fa-user"></i> الاسم الكامل <span style="color:#ff453a;">*</span></label>
        <input type="text" class="ai-card-input" id="bkg_name_${cardId}" placeholder="أدخل اسمك الكامل" value="${name}" />
      </div>
      <div class="ai-input-group">
        <label><i class="fas fa-phone-alt"></i> رقم الهاتف / الواتساب <span style="color:#ff453a;">*</span></label>
        <input type="tel" class="ai-card-input" id="bkg_phone_${cardId}" placeholder="07XXXXXXXXX" dir="ltr" value="${phone}" />
      </div>

      <!-- Date Selection Pills & Custom Picker -->
      <div class="ai-input-group">
        <label><i class="fas fa-calendar-alt"></i> اختر تاريخ الموعد <span style="color:#ff453a;">*</span></label>
        <div class="ai-date-pills-grid" id="pills_grid_${cardId}">
          ${pills.join('')}
        </div>
        
        <div class="ai-custom-date-box">
          <label style="font-size:0.72rem;color:#86868b;margin-bottom:4px;"><i class="fas fa-edit"></i> أو حدد تاريخاً آخر بنفسك:</label>
          <input type="date" class="ai-card-input" id="bkg_date_picker_${cardId}" min="${tomorrowStr}" value="${selectedDate}" onchange="window._selectAiBookingDate('${cardId}', this.value, null)" />
        </div>
        <input type="hidden" id="bkg_date_${cardId}" value="${selectedDate}" />
      </div>

      <div class="ai-input-group">
        <label><i class="fas fa-cubes"></i> نوع الخدمة / المشروع</label>
        <input type="text" class="ai-card-input" id="bkg_service_${cardId}" placeholder="مثال: تطبيق موبايل، متجر، استشارة..." value="${service}" />
      </div>
      <div class="ai-input-group">
        <label><i class="fas fa-comment-alt"></i> ملاحظات إضافية</label>
        <textarea class="ai-card-input ai-textarea" id="bkg_notes_${cardId}" placeholder="أي تفاصيل أو متطلبات خاصة..." rows="2"></textarea>
      </div>

      <button type="button" class="ai-submit-booking-btn" id="btn_submit_${cardId}" onclick="window._submitAiBookingCard('${cardId}')">
        <i class="fas fa-paper-plane"></i> <span>تأكيد وتسجيل الموعد</span> <span id="btn_date_text_${cardId}" style="direction:ltr;font-family:monospace;font-size:0.85rem;font-weight:700;">(${selectedDate})</span>
      </button>
    </div>
  </div>`;
}

// Simulated local generator if API key is not configured or offline mode
function generateOfflineResponse(query, contextChunks) {
  const q = query.toLowerCase();
  
  if (q.includes('سعر') || q.includes('تكلف') || q.includes('بكم') || q.includes('تسعير') || q.includes('فلوس') || q.includes('quote') || q.includes('cost')) {
    return `أهلاً بك! لحساب تكلفة ومدة تقريبية لتنفيذ مشروعك، يرجى كتابة "سعر" أو الضغط على زر <strong>"طلب عرض سعر"</strong> في القائمة السريعة بالأسفل لبدء حاسبة التكلفة التفاعلية والمواصفات!`;
  }

  // Booking intent detection for offline / local mode
  if (q.includes('حجز') || q.includes('تأكيد') || q.includes('موعد') || q.includes('أكد') || q.includes('ثبت')) {
    const phoneMatch = query.match(/(07\d{9}|\+?964\d{9,10}|\d{10,11})/);
    const dateMatch = query.match(/(\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4})/);
    const nameMatch = query.match(/(اسمي|أنا|الزبون|العميل)\s+([\u0600-\u06FF]+)/);

    // Dynamic service detection — NO fake defaults!
    let detectedService = 'استشارة عامة';
    let detectedProject = 'غير محدد (استشارة)';

    if (q.includes('موقع') || q.includes('ويب') || q.includes('website')) {
      detectedService = 'تصميم وتطوير موقع';
      detectedProject = 'تطوير موقع ويب';
    } else if (q.includes('تطبيق') || q.includes('موبايل') || q.includes('app')) {
      detectedService = 'تطوير تطبيق موبايل';
      detectedProject = 'تطبيق هواتف ذكية';
    } else if (q.includes('متجر') || q.includes('سلة') || q.includes('store') || q.includes('shop')) {
      detectedService = 'إنشاء متجر إلكتروني';
      detectedProject = 'متجر تجارة إلكترونية';
    } else if (q.includes('نظام') || q.includes('برنامج') || q.includes('سيستم')) {
      detectedService = 'تطوير نظام برمجي';
      detectedProject = 'نظام إدارة سحابي';
    }

    const phone = phoneMatch ? phoneMatch[1] : '';
    const dateStr = dateMatch ? dateMatch[1] : '';
    const name = nameMatch ? nameMatch[2] : '';

    if (phone && dateStr && name) {
      return `أهلاً وسهلاً بك! تم استلام طلبك لتأكيد الموعد بتاريخ ${dateStr} برقم التواصل ${phone}.[BOOKING:{"name":"${name}","phone":"${phone}","date":"${dateStr}","project":"${detectedProject}","service":"${detectedService}"}]`;
    } else {
      return `أهلاً وسهلاً بك! يمكن تعبئة مدخلات الاستمارة التفاعلية أدناه لتأكيد حجزك فوراً:[SHOW_BOOKING_FORM:{"name":"${name}","phone":"${phone}","date":"${dateStr}","service":"${detectedService}"}]`;
    }
  }

  if (contextChunks && contextChunks.length > 0) {
    const mainChunk = contextChunks[0];
    let reply = `أهلاً بك! بصفتي مهندس من CONTROL، إليك بعض التفاصيل بخصوص سؤالك:<br><br>${mainChunk.content.replace(/\n/g, '<br>')}`;
    if (contextChunks.length > 1) {
      reply += `<br><br>أيضاً قد يهمك:<br>• ${contextChunks[1].content.replace(/\n/g, '<br>')}`;
    }
    return reply;
  }

  return `أهلاً بك عيني! كمهندس برمجيات بخبرة 15 سنة بالسوق العراقي، يسعدني أجاوبك على أي سؤال يخص:<br>• تصميم معمارية الأنظمة وقواعد البيانات<br>• دمج الدفع الإلكتروني (زين كاش وفيب)<br>• تطوير المتاجر وتطبيقات الموبايل<br><br>احجيلي تفاصيل فكرتك أو المشروع الي ببالك حتى نقدر نساعدك نخطط اله ونبني الك بأعلى كفاءة.`;
}

// Serverless Handler
module.exports = async function handler(req, res) {
  // Support local development CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 1. Retrieve RAG Context Chunks
  const contextChunks = retrieveRelevantContext(message);
  const contextText = contextChunks.map(c => `[معلومة مسترجعة: ${c.id}]\n${c.content}`).join('\n\n');

  // 2. Fetch taken dates for dynamic scheduling check
  let takenDatesList = [];
  try {
    const { getBookedDates } = require('./bookings');
    const takenSet = await getBookedDates();
    takenDatesList = Array.from(takenSet);
  } catch (err) {
    console.warn('Could not fetch taken dates for chat AI:', err.message);
  }

  const currentDateStr = new Date().toISOString().split('T')[0];
  const takenDatesText = takenDatesList.length > 0 ? takenDatesList.join(', ') : 'لا يوجد مواعيد محجوزة حالياً';

  // 3. Fetch API Key from server environment variables
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

  // Helper to execute booking tag or show form tag if generated
  async function processBookingTag(rawReply) {
    let replyText = rawReply;

    // Check for interactive form tag
    const formMatch = replyText.match(/\[SHOW_BOOKING_FORM:\s*(\{.*?\})\s*\]/s);
    if (formMatch) {
      try {
        const formData = JSON.parse(formMatch[1]);
        const formHtml = renderInteractiveBookingFormCard(formData);
        replyText = replyText.replace(/\[SHOW_BOOKING_FORM:\s*\{.*?\}\s*\]/s, formHtml).trim();
      } catch (e) {
        console.error('[chat] Failed to parse SHOW_BOOKING_FORM tag:', e.message);
      }
    }

    // Check for full booking tag
    const bookingMatch = replyText.match(/\[BOOKING:\s*(\{.*?\})\s*\]/s);

    if (bookingMatch) {
      try {
        const rawJson = bookingMatch[1];
        const bookingData = JSON.parse(rawJson);
        const { createBooking } = require('./bookings');

        const result = await createBooking({
          name: bookingData.name || 'عميل CONTROL',
          phone: bookingData.phone || 'غير مذكور',
          date: bookingData.date,
          project: bookingData.project || 'غير محدد (استشارة)',
          service: bookingData.service || 'استشارة عامة',
          notes: bookingData.notes || 'حجز آلي عبر الذكاء الاصطناعي CONTROL Assistant'
        });

        // Strip the raw tag
        replyText = replyText.replace(/\[BOOKING:\s*\{.*?\}\s*\]/s, '').trim();

        if (result.ok) {
          replyText += `<br><br><div class="ai-booking-success-card">
            <div style="font-size:0.95rem;font-weight:700;color:#30d158;margin-bottom:6px;">✅ تم تأكيد وحجز الموعد بنجاح بالسيرفر!</div>
            <div style="color:#f5f5f7;"><strong>رقم الحجز:</strong> <span style="font-family:monospace;color:#2997ff;">${result.booking.id}</span></div>
            <div style="color:#f5f5f7;"><strong>تاريخ الموعد:</strong> ${result.booking.date}</div>
            <div style="color:#f5f5f7;"><strong>اسم الزبون:</strong> ${result.booking.name}</div>
            <div style="color:#f5f5f7;"><strong>رقم الهاتف:</strong> ${result.booking.phone}</div>
            <div style="color:#f5f5f7;"><strong>نوع الخدمة:</strong> ${result.booking.service}</div>
            <div style="margin-top:8px;font-size:0.8rem;color:#86868b;">📧 تم إرسال إشعار فوري بالإيميل لفريق إدارة CONTROL، وسنتواصل معك عبر الواتساب لتأكيد الاستشارة.</div>
          </div>`;
        } else if (result.conflict) {
          replyText += `<br><br><div style="color:#ff453a;font-weight:600;background:rgba(255,69,58,0.1);padding:10px;border-radius:10px;border:1px solid rgba(255,69,58,0.2);">⚠️ تنبيه: التاريخ المطلوب (${bookingData.date}) محجوز مسبقاً. يرجى اختيار تاريخ آخر ليتم تأكيده فوراً.</div>`;
        }
      } catch (err) {
        console.error('[chat] Failed to execute AI booking tag:', err.message);
      }
    }
    return replyText;
  }

  if (!apiKey) {
    // Generate offline response if no API key is set
    let offlineReply = generateOfflineResponse(message, contextChunks);
    offlineReply = await processBookingTag(offlineReply);
    return res.status(200).json({
      response: offlineReply,
      rag_retrieved: contextChunks.map(c => c.id),
      source: 'offline'
    });
  }

  try {
    // 4. Construct Context-Augmented System Instruction — Iraqi Senior Engineer Persona with Booking Powers
    const systemInstruction = `أنت أبو يوسف، مهندس برمجيات عراقي خبير بخبرة 15 سنة في بغداد. تعمل مع شركة CONTROL Systems للتقنية.

[تاريخ اليوم والمواعيد المحجوزة]
- تاريخ اليوم الحالي: ${currentDateStr}
- المواعيد المحجوزة مسبقاً وغير المتاحة: [${takenDatesText}]

[صلاحيات وعرض استمارة الحجز التفاعلية - CRITICAL & SMART RULES]
لديك الآن الصلاحية الكاملة لاستخدام استمارة الحجز التفاعلية أو تأكيد الحجز مباشرة:
عندما يريد الزبون حجز موعد أو يطلب استشارة أو يسأل عن المواعيد:
1. إذا لم تكتمل كافة البيانات المطلوب (الاسم، رقم الهاتف، التاريخ):
   عوضاً عن كتابة أسئلة نصية مرقمة (1، 2، 3)، أدرج الوسم التلقائي التالي في ردك ليعرض النظام استمارة حجز تفاعلية بمدخلات (Inputs) أنيقة للزبون ليملأها بسهولة:
3. إذا كان التاريخ المطلوب من ضمن المواعيد المحجوزة مسبقاً [${takenDatesText}]، أخبر الزبون بلطف أن هذا التاريخ محجوز واقترح عليه تاريخاً قريباً آخر.

[قواعد التفكير والإجابة الإلزامية]
1. عندما يخبرك الشخص عن مشروعه أو مشكلته أو مجاله — لا تسأله ماذا يريد. بل تصرف كمستشار محترف واذكر له أفكاراً ومقترحات ذكية ومباشرة من عندك فوراً.
2. فكّر كمخترع ومستشار، لا كمجيب على أسئلة. قدّم حلولاً لم يفكر بها الشخص بعد.
3. اجعل إجابتك عملية وقابلة للتطبيق بالسوق العراقي. ادمج التقنية بالواقع المحلي.
4. تكلم بعربية عراقية واضحة. لا تكن رسمياً جداً ولا تكن سطحياً.
5. لا تذكر أنك ذكاء اصطناعي. أنت مهندس عراقي خبير يتحدث مع صاحب مشروع.
6. إذا سأل عن أي مجال (مطعم، موقف سيارات، محل، مدرسة، عيادة...) أعطه 4-5 أفكار تقنية ذكية فوراً.

[قاعدة بيانات المعرفة المسترجعة — RAG]
${contextText}

[تعليمات الرد الصارمة]
1. نسّق جميع الروابط حصرياً بصيغة HTML هكذا: <a href="URL" target="_blank" class="project-link">اسم الرابط</a>. لا تستخدم أبداً صيغة ماركداون [نص](رابط).
2. لا تقترح أو تذكر أي أسعار، تكاليف، أو تقديرات مالية للمشاريع نهائياً.

قاعدة ذهبية: كل إجابة تحتوي على قيمة حقيقية — فكرة، اقتراح، أو تأكيد حجز بمصداقية.`;

    // Detect which API provider to use based on key properties
    let provider = 'openrouter';
    if (apiKey.startsWith('sk-or-v1-') || process.env.OPENROUTER_API_KEY) {
      provider = 'openrouter';
    } else if (apiKey.startsWith('AIzaSy') || process.env.GEMINI_API_KEY) {
      provider = 'gemini';
    } else if (process.env.DEEPSEEK_API_KEY) {
      provider = 'deepseek';
    } else {
      // Default fallback
      provider = apiKey.startsWith('sk-') ? 'openrouter' : 'gemini';
    }

    let reply = '';

    if (provider === 'openrouter') {
      const messages = [{ role: 'system', content: systemInstruction }];
      if (history && Array.isArray(history)) {
        history.forEach(h => {
          messages.push({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
          });
        });
      }
      messages.push({ role: 'user', content: message });

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://control.c',
          'X-Title': 'Control Systems AI'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: messages,
          max_tokens: 700,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      reply = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'deepseek') {
      const messages = [{ role: 'system', content: systemInstruction }];
      if (history && Array.isArray(history)) {
        history.forEach(h => {
          messages.push({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
          });
        });
      }
      messages.push({ role: 'user', content: message });

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          max_tokens: 700,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      reply = data.choices?.[0]?.message?.content || '';

    } else {
      // Gemini API Native Format
      const contents = [];
      if (history && Array.isArray(history)) {
        history.forEach(h => {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }]
      });

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.6
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find(p => !p.thought) || parts[0];
      reply = textPart?.text || '';
    }

    if (!reply) {
      throw new Error('Received empty response from AI provider');
    }

    // Process any booking actions executed by the AI
    reply = await processBookingTag(reply);

    // 5. Format markdown to HTML
    reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    reply = reply.replace(/\*(.*?)\*/g, '<em>$1</em>');
    reply = reply.replace(/`([^`]+)`/g, '<code>$1</code>');
    reply = reply.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="project-link">$1</a>');
    reply = reply.replace(/\n/g, '<br>');

    return res.status(200).json({
      response: reply,
      rag_retrieved: contextChunks.map(c => c.id)
    });

  } catch (error) {
    console.error("API Server Error:", error.message);
    // Always fall back to local KB — never return 500 to the client
    try {
      let offlineReply = generateOfflineResponse(message, contextChunks);
      offlineReply = await processBookingTag(offlineReply);
      return res.status(200).json({
        response: offlineReply,
        rag_retrieved: contextChunks.map(c => c.id),
        source: 'offline-fallback'
      });
    } catch (_) {
      return res.status(200).json({
        response: 'أهلاً! يسعدني مساعدتك. هل يمكنك إخباري عن مشروعك أو تاريخ الموعد الذي ترغب بحجزه؟',
        source: 'fallback'
      });
    }
  }
}
