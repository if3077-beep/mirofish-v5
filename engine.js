/**
 * MiroFish v5 - 推演引擎
 * DeepSeek AI + 三路径推演 + 共鸣互动
 */

const EMOTION_MAP = {
  anxious:   { valence: -0.6, arousal:  0.7, primary: 'fear',       label: '焦虑' },
  angry:     { valence: -0.7, arousal:  0.9, primary: 'anger',      label: '愤怒' },
  sad:       { valence: -0.8, arousal: -0.5, primary: 'sadness',    label: '难过' },
  confused:  { valence: -0.3, arousal:  0.2, primary: 'surprise',   label: '迷茫' },
  hopeful:   { valence:  0.5, arousal:  0.3, primary: 'anticipation', label: '期待' },
  fearful:   { valence: -0.7, arousal:  0.8, primary: 'fear',       label: '恐惧' },
  neutral:   { valence:  0.0, arousal:  0.0, primary: 'trust',      label: '平静' },
  excited:   { valence:  0.8, arousal:  0.9, primary: 'joy',        label: '兴奋' }
};

const SCOPE_LABELS = ['', '仅自己', '身边几个人', '一个群体', '大范围', '全社会'];
const TIME_LABELS = ['', '一周', '两周', '一个月', '三个月', '一年'];
const INTENSITY_LABELS = ['', '微弱', '轻微', '中等', '强烈', '剧烈'];
const UNCERTAINTY_LABELS = ['', '几乎确定', '比较确定', '中等', '不确定', '完全未知'];

const FACTOR_LABELS = {
  media: '社交媒体放大', authority: '权威介入', peer: '同辈压力',
  money: '经济因素', time: '时间紧迫', reputation: '面子/声誉',
  health: '健康相关', family: '家庭牵扯'
};

class PredictionEngine {
  constructor() {
    this.apiKey = localStorage.getItem('mf_api_key') || '';
    this.useAI = !!this.apiKey;
  }

  setApiKey(key) {
    this.apiKey = key;
    this.useAI = !!key;
    if (key) localStorage.setItem('mf_api_key', key);
    else localStorage.removeItem('mf_api_key');
  }

  extractKeywords(text) {
    const keywords = [];
    const patterns = [
      { regex: /跳槽|换工作|辞职|离职|求职|面试|升职|降薪|加班|职场|职业倦怠|副业/g, tag: '职业', icon: '💼' },
      { regex: /对象|男友|女友|老公|老婆|分手|吵架|冷战|恋爱|结婚|离婚|暧昧|前任/g, tag: '感情', icon: '💕' },
      { regex: /公司|老板|同事|领导|团队|项目|裁员|失业|被裁|优化/g, tag: '职场', icon: '🏢' },
      { regex: /创业|开公司|合伙人|融资|生意/g, tag: '创业', icon: '🚀' },
      { regex: /孩子|高考|考试|学校|成绩|老师|同学|留学|考研/g, tag: '教育', icon: '📚' },
      { regex: /股票|基金|投资|理财|亏损|赚钱|房价|房贷|工资|消费/g, tag: '财务', icon: '💰' },
      { regex: /焦虑|抑郁|失眠|压力|崩溃|迷茫|害怕|内耗|情绪|心理/g, tag: '心理', icon: '🧠' },
      { regex: /父母|家人|亲戚|家庭|养老|带娃|原生家庭/g, tag: '家庭', icon: '👨‍👩‍👧' },
      { regex: /健康|生病|医院|体检|减肥|运动|疲劳|亚健康/g, tag: '健康', icon: '❤️' },
      { regex: /AI|人工智能|ChatGPT|技术|转型|学习|被取代/g, tag: '科技', icon: '🤖' },
      { regex: /自媒体|短视频|直播|流量|粉丝|内容|创作/g, tag: '自媒体', icon: '📱' },
      { regex: /物业|小区|邻居|装修|搬家|租房|买房|换城市/g, tag: '居住', icon: '🏠' }
    ];

    patterns.forEach(p => {
      const matches = text.match(p.regex);
      if (matches) {
        keywords.push({ tag: p.tag, icon: p.icon, words: [...new Set(matches)].slice(0, 3) });
      }
    });

    if (keywords.length === 0) {
      keywords.push({ tag: '日常', icon: '📌', words: [text.substring(0, 6)] });
    }
    return keywords;
  }

  // ===== 共鸣生成 =====
  generateEmpathy(text, mood) {
    const moodInfo = EMOTION_MAP[mood] || EMOTION_MAP.neutral;
    const empathyTemplates = {
      anxious: [
        '我能感受到你内心的不安。面对不确定性时，焦虑是很正常的反应——这说明你在认真对待这件事。',
        '你现在一定感觉压力很大。焦虑的本质是我们对未来的重视，这恰恰说明你是一个有责任心的人。',
      ],
      angry: [
        '你的愤怒是可以理解的。当我们的付出没有得到应有的回报时，生气是人之常情。',
        '听起来你确实受了委屈。愤怒有时候是一种信号，提醒我们需要为自己争取什么。',
      ],
      sad: [
        '我能感受到你的难过。有些事情确实让人心里不好受，允许自己悲伤是很重要的。',
        '你现在的感受是完全合理的。难过的时候不需要硬撑，给自己一些时间和空间。',
      ],
      confused: [
        '迷茫的时候最难熬，因为连方向都看不清。但很多时候，迷茫恰恰是成长的前奏。',
        '不知道该怎么选，说明你面前有很多可能性。这种纠结虽然痛苦，但也是一种幸运。',
      ],
      hopeful: [
        '你的期待让我感到振奋。有目标、有动力，这本身就是一种很宝贵的状态。',
        '能感受到你内心的热情。带着这份期待去行动，结果往往不会太差。',
      ],
      fearful: [
        '恐惧是人类最原始的保护机制。你感到害怕，说明你意识到了某种真实的风险。',
        '面对未知时感到恐惧很正常。重要的是，不要让恐惧阻止你做出理性的判断。',
      ],
      neutral: [
        '你看起来比较平静，这种状态其实很适合做理性分析。让我们来看看各种可能的走向。',
        '以平和的心态面对问题，往往能看到更全面的图景。我来帮你梳理一下。',
      ],
      excited: [
        '你的兴奋很有感染力！这种能量是推动事情发展的重要动力。',
        '能感受到你对这件事的热情。兴奋的时候也别忘了留一分冷静，做好充分准备。',
      ],
    };

    const templates = empathyTemplates[mood] || empathyTemplates.neutral;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // ===== AI 推演 =====
  async callDeepSeek(text, mood, scope, intensity, timeScale, uncertainty, factors) {
    const moodInfo = EMOTION_MAP[mood] || EMOTION_MAP.neutral;
    const keywords = this.extractKeywords(text);
    const domain = keywords[0]?.tag || '日常';
    const factorLabels = factors.map(f => FACTOR_LABELS[f]).filter(Boolean);
    const timeLabel = TIME_LABELS[timeScale] || '一个月';
    const scopeLabel = SCOPE_LABELS[scope] || '身边几个人';

    const systemPrompt = `你是 MiroFish，一个专业的未来推演引擎。你的任务是基于用户描述的处境，生成三条独立的未来推演路径。

## 核心原则
- 贴合现实现状，拒绝空洞套话和模板化内容
- 有针对性、有细节、有实际落地场景
- 每条路径差异要明显，不能重复同质化
- 语言精炼不啰嗦，用小标题分段
- 若涉及多角色，必须体现立场差异和观点冲突
- 融入行业趋势特征与合理趋势预判，保持逻辑自洽

## 输出格式（严格按此 JSON 格式返回）
{
  "empathy": "一段有共鸣感的开场白，针对用户的情绪状态和处境，2-3句话，要有温度",
  "optimistic": {
    "probability": 35,
    "title": "乐观路径标题（一句话概括）",
    "driving_factors": ["核心驱动因素1", "核心驱动因素2"],
    "timeline": [
      {"period": "第1-2周", "event": "具体事件描述"},
      {"period": "第3-4周", "event": "具体事件描述"},
      {"period": "第2-3个月", "event": "具体事件描述"}
    ],
    "chain_effects": ["连锁影响1", "连锁影响2"],
    "opportunities": ["机遇1", "机遇2"],
    "risks": ["风险1"],
    "stakeholders": [
      {"role": "角色", "view": "该角色的观点"}
    ]
  },
  "neutral": {
    "probability": 45,
    "title": "中性路径标题",
    "driving_factors": [...],
    "timeline": [...],
    "chain_effects": [...],
    "opportunities": [...],
    "risks": [...],
    "stakeholders": [...]
  },
  "pessimistic": {
    "probability": 20,
    "title": "悲观路径标题",
    "driving_factors": [...],
    "timeline": [...],
    "chain_effects": [...],
    "opportunities": [...],
    "risks": [...],
    "stakeholders": [...]
  },
  "advice": [
    {"icon": "emoji", "text": "建议内容"}
  ],
  "psychology": {
    "title": "相关心理学概念名称",
    "content": "简要解释这个概念如何应用于当前处境"
  }
}`;

    const userPrompt = `## 用户处境
- 描述：${text}
- 当前情绪：${moodInfo.label}（${mood}）
- 影响范围：${scopeLabel}
- 情绪强度：${INTENSITY_LABELS[intensity]}
- 推演时间跨度：${timeLabel}
- 不确定性：${UNCERTAINTY_LABELS[uncertainty]}
- 相关因素：${factorLabels.length > 0 ? factorLabels.join('、') : '无特别因素'}
- 识别领域：${domain}

请根据以上信息，生成三条差异化的推演路径。概率之和为100。每条路径的timeline至少3个节点。`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 调用失败: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  }

  // ===== 本地推演（无 API 时的降级方案）=====
  generateLocal(text, mood, scope, intensity, timeScale, uncertainty, factors) {
    const moodInfo = EMOTION_MAP[mood] || EMOTION_MAP.neutral;
    const keywords = this.extractKeywords(text);
    const domain = keywords[0]?.tag || '日常';
    const timeLabel = TIME_LABELS[timeScale] || '一个月';

    const empathy = this.generateEmpathy(text, mood);

    // 根据情绪倾向调整概率
    const baseOptimistic = moodInfo.valence > 0.2 ? 40 : (moodInfo.valence < -0.2 ? 25 : 35);
    const basePessimistic = moodInfo.valence < -0.2 ? 30 : (moodInfo.valence > 0.2 ? 15 : 20);
    const baseNeutral = 100 - baseOptimistic - basePessimistic;

    // 根据不确定性调整
    const uncFactor = uncertainty / 5;
    const optimistic = Math.max(10, Math.min(60, baseOptimistic + Math.round((Math.random() - 0.5) * uncFactor * 20)));
    const pessimistic = Math.max(10, Math.min(50, basePessimistic + Math.round((Math.random() - 0.5) * uncFactor * 15)));
    const neutral = 100 - optimistic - pessimistic;

    const templates = PATH_TEMPLATES[domain] || PATH_TEMPLATES.default;

    return {
      empathy,
      optimistic: {
        probability: optimistic,
        ...templates.optimistic(text, timeLabel)
      },
      neutral: {
        probability: Math.max(15, neutral),
        ...templates.neutral(text, timeLabel)
      },
      pessimistic: {
        probability: pessimistic,
        ...templates.pessimistic(text, timeLabel)
      },
      advice: this.generateAdvice(domain, mood),
      psychology: this.getPsychologyInsight(mood)
    };
  }

  generateAdvice(domain, mood) {
    const advicePool = {
      职业: [
        { icon: '📝', text: '列出你真正在意的 3 件事（成长、收入、自由、意义），用它们做判断标准。' },
        { icon: '💬', text: '找一个做过类似决定的人聊聊，比搜 100 篇文章更有用。' },
        { icon: '⏰', text: '给自己设一个决策截止日，避免无限期纠结消耗精力。' },
      ],
      感情: [
        { icon: '🪞', text: '先想清楚自己想要什么，再去看对方做了什么。' },
        { icon: '⏰', text: '给彼此空间和时间，情绪过去后再沟通效果会好很多。' },
      ],
      财务: [
        { icon: '📊', text: '不要在情绪最激动的时候做投资决定。设好止损线，然后关掉行情软件。' },
        { icon: '🎯', text: '区分"投资"和"投机"。前者看长期价值，后者赌短期波动。' },
      ],
      default: [
        { icon: '🎯', text: '聚焦在你能控制的事情上，放下无法控制的。' },
        { icon: '📊', text: '把大问题拆成小步骤，每完成一步都是真实的进展。' },
      ],
    };

    const moodAdvice = {
      anxious: { icon: '🧘', text: '先照顾好自己的情绪。深呼吸、运动、和信任的人聊聊，比做任何决定都重要。' },
      angry: { icon: '⏸️', text: '在做重大决定前，给自己至少 24 小时的冷静期。' },
      fearful: { icon: '🔄', text: '接受不确定性本身。把注意力放在你能控制的事情上。' },
    };

    const pool = advicePool[domain] || advicePool.default;
    const result = [];

    if (moodAdvice[mood]) result.push(moodAdvice[mood]);
    result.push(...pool);

    return result.slice(0, 4);
  }

  getPsychologyInsight(mood) {
    const insights = {
      anxious: { title: '情绪预测偏差 (Impact Bias)', content: '人们倾向于高估未来事件对自己情绪的影响强度。无论好事还是坏事，实际带来的情绪变化通常没有想象中那么剧烈，恢复也比预期快。' },
      angry: { title: '确认偏误 (Confirmation Bias)', content: '愤怒时我们倾向于寻找支持自己已有信念的信息，而忽略相反证据。在做重要决定时，主动寻找反对意见是明智的。' },
      sad: { title: '峰终定律 (Peak-End Rule)', content: '人们对经历的评价主要取决于情绪最强烈的峰值和结束时的感受。这意味着结尾的质量比过程的长度更重要。' },
      confused: { title: '选择悖论 (Paradox of Choice)', content: '选项越多反而越难做出决定，做出决定后的满意度也越低。有时候减少选项反而能提升幸福感。' },
      fearful: { title: '习得性无助 (Learned Helplessness)', content: '当人反复经历无法控制的负面事件后，即使环境改变了也会放弃尝试。意识到这一点是打破循环的第一步。' },
      hopeful: { title: '心理韧性 (Psychological Resilience)', content: '韧性不是不受伤，而是受伤后能恢复。经历过适度逆境的人比从未经历挫折的人具有更强的心理韧性。' },
      neutral: { title: '自我服务偏差 (Self-Serving Bias)', content: '人们倾向于把成功归因于自己的能力，把失败归因于外部因素。这种偏差保护了自尊，但也阻碍了成长。' },
      excited: { title: '情绪传染 (Emotional Contagion)', content: '情绪像病毒一样在人群中传播。与积极的人在一起会让你也变得积极，反之亦然。选择你的社交圈就是选择你的情绪状态。' },
    };
    return insights[mood] || insights.neutral;
  }

  // ===== 主推演入口 =====
  async run(text, mood, scope, intensity, timeScale, uncertainty, factors, onStep) {
    const params = { text, mood, scope, intensity, timeScale, uncertainty, factors };

    if (onStep) onStep('empathy', '生成共鸣回应...', 10);

    if (this.useAI) {
      try {
        if (onStep) onStep('ai', '正在连接 DeepSeek AI...', 20);
        const result = await this.callDeepSeek(text, mood, scope, intensity, timeScale, uncertainty, factors);
        if (onStep) onStep('complete', '推演完成', 100);
        return result;
      } catch (err) {
        console.warn('AI 推演失败，降级到本地推演:', err.message);
        if (onStep) onStep('fallback', 'AI 连接失败，使用本地推演...', 30);
        // 降级
      }
    }

    // 本地推演
    if (onStep) onStep('local', '本地推演引擎启动...', 30);
    await this.delay(300);
    if (onStep) onStep('analyze', '分析输入内容...', 50);
    await this.delay(400);
    if (onStep) onStep('paths', '生成三条推演路径...', 70);
    await this.delay(300);
    if (onStep) onStep('insights', '整合心理学洞察...', 85);
    await this.delay(200);

    const result = this.generateLocal(text, mood, scope, intensity, timeScale, uncertainty, factors);
    if (onStep) onStep('complete', '推演完成', 100);
    return result;
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ===== 本地路径模板 =====
const PATH_TEMPLATES = {
  职业: {
    optimistic: (text, time) => ({
      title: '破局而出，找到新的职业赛道',
      driving_factors: ['行业需求持续增长，你的技能有市场', '主动出击带来的信息差优势'],
      timeline: [
        { period: '第1-2周', event: '开始有意识地拓展人脉，更新简历，获得几个面试机会' },
        { period: '第3-4周', event: '面试过程中更清晰了自己的定位，收到1-2个offer' },
        { period: `第2-3个月`, event: '进入新环境，虽然有适应期但成长速度明显加快' },
      ],
      chain_effects: ['收入提升带来生活质量改善', '新环境激发新的学习动力'],
      opportunities: ['新行业可能带来意想不到的发展方向', '跳槽过程中积累的人脉成为长期资源'],
      risks: ['新环境的文化适应需要时间'],
      stakeholders: [
        { role: '你自己', view: '虽然紧张但充满期待，愿意接受挑战' },
        { role: '现公司', view: '可能会挽留，提出加薪或调岗' },
      ],
    }),
    neutral: (text, time) => ({
      title: '原地调整，在现有位置上寻找突破',
      driving_factors: ['现有平台的稳定性价值', '内部转岗或项目调整的可能性'],
      timeline: [
        { period: '第1-2周', event: '和领导谈了一次，表达了想尝试新方向的想法' },
        { period: '第3-4周', event: '被安排参与一个新项目，工作内容有了变化' },
        { period: `第2-3个月`, event: '新项目有一定进展，但核心问题（激情缺失）仍在' },
      ],
      chain_effects: ['暂时缓解了焦虑，但根本矛盾未解决', '积累了新项目经验，为未来跳槽增加筹码'],
      opportunities: ['内部转岗的成本远低于外部跳槽', '新项目可能成为晋升的跳板'],
      risks: ['如果新项目也不满意，可能陷入反复纠结'],
      stakeholders: [
        { role: '你自己', view: '选择观望，但内心仍在权衡' },
        { role: '家人', view: '倾向于稳定，不希望你冒险' },
      ],
    }),
    pessimistic: (text, time) => ({
      title: '继续消耗，职业倦怠逐渐加深',
      driving_factors: ['缺乏改变的勇气或外部条件不支持', '行业整体下行压缩了跳槽窗口'],
      timeline: [
        { period: '第1-2周', event: '继续投了几份简历，但回复寥寥' },
        { period: '第3-4周', event: '面试了几家但都不太合适，开始怀疑自己' },
        { period: `第2-3个月`, event: '回到原点，工作热情进一步下降，效率也受影响' },
      ],
      chain_effects: ['持续的不满影响工作表现', '情绪低落可能波及生活其他方面'],
      opportunities: ['这段经历让你更清楚自己不想要什么'],
      risks: ['长期职业倦怠可能导致更严重的职业危机', '年龄增长会进一步压缩选择空间'],
      stakeholders: [
        { role: '你自己', view: '感到无力和挫败，需要重新调整心态' },
        { role: '同事', view: '可能注意到你状态的变化' },
      ],
    }),
  },
  default: {
    optimistic: (text, time) => ({
      title: '积极变化正在发生，事情向好的方向发展',
      driving_factors: ['你的主动应对创造了有利条件', '外部环境出现了积极信号'],
      timeline: [
        { period: '第1-2周', event: '开始采取行动，心态逐渐从被动转为主动' },
        { period: '第3-4周', event: '看到一些积极的反馈，信心增强' },
        { period: `第2-3个月`, event: '事情进入良性循环，比预期发展得更好' },
      ],
      chain_effects: ['积极的心态带来更多机会', '小胜利积累成大突破'],
      opportunities: ['这段经历可能成为人生的转折点'],
      risks: ['不要因为顺利而掉以轻心'],
      stakeholders: [
        { role: '你自己', view: '从焦虑转为自信，行动力增强' },
      ],
    }),
    neutral: (text, time) => ({
      title: '缓慢调整，找到一个中间状态',
      driving_factors: ['时间带来的自然缓冲', '你逐渐适应了新的现实'],
      timeline: [
        { period: '第1-2周', event: '情绪波动较大，在积极和消极之间摇摆' },
        { period: '第3-4周', event: '开始接受现状，减少内耗' },
        { period: `第2-3个月`, event: '找到一种平衡状态，不好不坏但可以接受' },
      ],
      chain_effects: ['心态趋于平稳', '有更多精力关注其他方面'],
      opportunities: ['稳定期是为下一次突破积蓄力量的好时机'],
      risks: ['可能陷入舒适区，错过改变的最佳窗口'],
      stakeholders: [
        { role: '你自己', view: '不再那么痛苦，但也没有特别满意' },
      ],
    }),
    pessimistic: (text, time) => ({
      title: '压力持续，需要做好长期应对准备',
      driving_factors: ['外部环境没有明显改善', '问题的根源尚未被触及'],
      timeline: [
        { period: '第1-2周', event: '尝试了一些方法但效果不明显' },
        { period: '第3-4周', event: '感到疲惫和无力，开始怀疑方向' },
        { period: `第2-3个月`, event: '压力仍在，但你学会了和它共处' },
      ],
      chain_effects: ['长期压力可能影响身心健康', '但也锻炼了你的抗压能力'],
      opportunities: ['逆境中的成长往往最深刻'],
      risks: ['需要警惕长期压力带来的健康问题'],
      stakeholders: [
        { role: '你自己', view: '虽然艰难，但没有放弃' },
      ],
    }),
  },
};

window.PredictionEngine = PredictionEngine;
window.EMOTION_MAP = EMOTION_MAP;
window.SCOPE_LABELS = SCOPE_LABELS;
window.TIME_LABELS = TIME_LABELS;
window.INTENSITY_LABELS = INTENSITY_LABELS;
window.UNCERTAINTY_LABELS = UNCERTAINTY_LABELS;
