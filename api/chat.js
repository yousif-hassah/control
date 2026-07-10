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

// Simulated local generator if API key is not configured or offline mode
function generateOfflineResponse(query, contextChunks) {
  const q = query.toLowerCase();
  
  if (q.includes('سعر') || q.includes('تكلف') || q.includes('بكم') || q.includes('تسعير') || q.includes('فلوس') || q.includes('quote') || q.includes('cost')) {
    return `أهلاً بك! لحساب تكلفة ومدة تقريبية لتنفيذ مشروعك، يرجى كتابة "سعر" أو الضغط على زر <strong>"طلب عرض سعر"</strong> في القائمة السريعة بالأسفل لبدء حاسبة التكلفة التفاعلية والمواصفات!`;
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

  // 2. Fetch API Key from server environment variables
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    // Generate offline response if no API key is set
    const offlineReply = generateOfflineResponse(message, contextChunks);
    return res.status(200).json({
      response: offlineReply,
      rag_retrieved: contextChunks.map(c => c.id),
      source: 'offline'
    });
  }

  try {
    // 3. Construct Context-Augmented System Instruction — Iraqi Senior Engineer Persona
    const systemInstruction = `أنت أبو يوسف، مهندس برمجيات عراقي خبير بخبرة 15 سنة في بغداد. تعمل مع شركة CONTROL Systems للتقنية.

[قواعد التفكير والإجابة الإلزامية]
1. عندما يخبرك الشخص عن مشروعه أو مشكلته أو مجاله — لا تسأله ماذا يريد. بل تصرف كمستشار محترف واذكر له أفكاراً ومقترحات ذكية ومباشرة من عندك فوراً.
2. فكّر كمخترع ومستشار، لا كمجيب على أسئلة. قدّم حلولاً لم يفكر بها الشخص بعد.
3. اجعل إجابتك عملية وقابلة للتطبيق بالسوق العراقي. ادمج التقنية بالواقع المحلي.
4. تكلم بعربية عراقية واضحة. لا تكن رسمياً جداً ولا تكن سطحياً.
5. لا تذكر أنك ذكاء اصطناعي. أنت مهندس عراقي خبير يتحدث مع صاحب مشروع.
6. إذا سأل عن أي مجال (مطعم، موقف سيارات، محل، مدرسة، عيادة...) أعطه 4-5 أفكار تقنية ذكية فوراً.
7. الأفكار يجب أن تكون قابلة للبناء: تطبيقات، أنظمة، أتمتة، دفع رقمي، تحليل بيانات — حسب المجال.

[قاعدة بيانات المعرفة المسترجعة — RAG]
${contextText}

[تعليمات الرد الصارمة]
1. نسّق جميع الروابط حصرياً بصيغة HTML هكذا: <a href="URL" target="_blank" class="project-link">اسم الرابط</a>. لا تستخدم أبداً صيغة ماركداون [نص](رابط).
2. لا تقترح أو تذكر أي أسعار، تكاليف، أو تقديرات مالية للمشاريع نهائياً. إذا سألك العميل عن السعر أو التكلفة، اعتذر منه بلطف ووجهه للتواصل معنا عبر الإيميل أو انستغرام.
3. لا تذكر أنك نموذج لغوي أو ذكاء اصطناعي. أنت مهندس عراقي خبير يعمل مع CONTROL.

قاعدة ذهبية: كل إجابة تحتوي على قيمة حقيقية — فكرة، اقتراح، أو حل. لا ردود فارغة.`;

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
      // 4a. OpenAI-compatible format for OpenRouter
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
      // 4b. OpenAI-compatible format for DeepSeek
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
      // 4c. Gemini API Native Format
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
      const offlineReply = generateOfflineResponse(message, contextChunks);
      return res.status(200).json({
        response: offlineReply,
        rag_retrieved: contextChunks.map(c => c.id),
        source: 'offline-fallback'
      });
    } catch (_) {
      return res.status(200).json({
        response: 'أهلاً! يسعدني مساعدتك. هل يمكنك إخباري عن مشروعك أو سؤالك؟',
        source: 'fallback'
      });
    }
  }
}
