/**
 * MiroFish v5 - 主应用
 * 三路径推演 + AI 集成 + 共鸣互动
 */

class App {
  constructor() {
    this.engine = new PredictionEngine();
    this.selectedMood = null;
    this.selectedFactors = new Set();
    this.currentPhase = 'input';
    this.lastResult = null;

    this.init();
  }

  init() {
    this.setupBgCanvas();
    this.setupApiModal();
    this.setupInspiration();
    this.setupScenes();
    this.setupInput();
    this.setupMood();
    this.setupSliders();
    this.setupFactors();
    this.setupNav();
    this.setupExport();
    this.updateApiStatus();
  }

  // ===== 背景粒子 =====
  setupBgCanvas() {
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.5 + 0.3, a: Math.random() * 0.15 + 0.02
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.a})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.03 * (1 - d / 120)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  // ===== API 弹窗 =====
  setupApiModal() {
    const overlay = document.getElementById('apiOverlay');
    const input = document.getElementById('apiKeyInput');
    const toggle = document.getElementById('apiToggle');
    const skip = document.getElementById('apiSkip');
    const save = document.getElementById('apiSave');
    const btnSettings = document.getElementById('btnApiSettings');

    // 如果已有 key，隐藏弹窗
    if (this.engine.apiKey) {
      overlay.classList.add('hidden');
    }

    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    skip.addEventListener('click', () => {
      overlay.classList.add('hidden');
      audioSystem.play('click');
    });

    save.addEventListener('click', () => {
      const key = input.value.trim();
      if (key) {
        this.engine.setApiKey(key);
        this.updateApiStatus();
        overlay.classList.add('hidden');
        audioSystem.play('success');
        this.showToast('AI 推演引擎已连接');
      } else {
        input.style.borderColor = 'var(--red)';
        setTimeout(() => input.style.borderColor = '', 1500);
      }
    });

    btnSettings.addEventListener('click', () => {
      overlay.classList.remove('hidden');
      audioSystem.play('click');
    });
  }

  updateApiStatus() {
    const status = document.getElementById('apiStatus');
    if (this.engine.useAI) {
      status.classList.add('connected');
      status.innerHTML = '<span class="api-dot"></span><span>DeepSeek AI 已连接</span><button id="btnApiSettings" class="btn-link">切换</button>';
    } else {
      status.classList.remove('connected');
      status.innerHTML = '<span class="api-dot"></span><span>本地推演模式</span><button id="btnApiSettings" class="btn-link">连接 AI</button>';
    }
    // 重新绑定
    document.getElementById('btnApiSettings').addEventListener('click', () => {
      document.getElementById('apiOverlay').classList.remove('hidden');
      audioSystem.play('click');
    });
  }

  // ===== 每日灵感 =====
  setupInspiration() {
    const today = new Date();
    const idx = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % DAILY_QUOTES.length;
    document.getElementById('inspirationText').textContent = DAILY_QUOTES[idx];
  }

  // ===== 场景轮播 =====
  setupScenes() {
    const track = document.getElementById('sceneTrack');
    document.querySelectorAll('.scene-card').forEach(card => {
      card.addEventListener('click', () => {
        document.getElementById('userInput').value = card.dataset.text;
        this.updateInputState();
        if (card.dataset.mood) {
          this.selectedMood = card.dataset.mood;
          document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
          const chip = document.querySelector(`.mood-chip[data-mood="${card.dataset.mood}"]`);
          if (chip) chip.classList.add('selected');
        }
        audioSystem.play('click');
      });
    });

    // 自动滚动
    let dir = 1;
    let auto = setInterval(() => {
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) dir = -1;
      if (track.scrollLeft <= 0) dir = 1;
      track.scrollBy({ left: dir * 0.8, behavior: 'auto' });
    }, 30);
    track.addEventListener('mouseenter', () => clearInterval(auto));
    track.addEventListener('mouseleave', () => {
      auto = setInterval(() => {
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) dir = -1;
        if (track.scrollLeft <= 0) dir = 1;
        track.scrollBy({ left: dir * 0.8, behavior: 'auto' });
      }, 30);
    });
  }

  // ===== 输入 =====
  setupInput() {
    const textarea = document.getElementById('userInput');
    textarea.addEventListener('input', () => this.updateInputState());

    document.getElementById('btnNext').addEventListener('click', () => {
      if (textarea.value.trim()) {
        audioSystem.play('transition');
        this.goToPhase('calibrate');
        this.analyzeInput();
      }
    });
  }

  updateInputState() {
    const ta = document.getElementById('userInput');
    document.getElementById('btnNext').disabled = ta.value.trim().length === 0;
  }

  // ===== 情绪 =====
  setupMood() {
    document.querySelectorAll('.mood-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        this.selectedMood = chip.dataset.mood;
        audioSystem.play('click');
      });
    });
  }

  // ===== 滑块 =====
  setupSliders() {
    const sliders = [
      { id: 'slScope', valId: 'valScope', labels: SCOPE_LABELS },
      { id: 'slIntensity', valId: 'valIntensity', labels: INTENSITY_LABELS },
      { id: 'slTime', valId: 'valTime', labels: TIME_LABELS },
      { id: 'slUncertainty', valId: 'valUncertainty', labels: UNCERTAINTY_LABELS },
    ];
    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      const val = document.getElementById(s.valId);
      el.addEventListener('input', () => { val.textContent = s.labels[el.value]; });
    });
  }

  // ===== 因素 =====
  setupFactors() {
    document.querySelectorAll('.factor-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const f = chip.dataset.factor;
        if (this.selectedFactors.has(f)) {
          this.selectedFactors.delete(f);
          chip.classList.remove('selected');
        } else {
          this.selectedFactors.add(f);
          chip.classList.add('selected');
        }
        audioSystem.play('click');
      });
    });
  }

  // ===== 分析输入 =====
  analyzeInput() {
    const text = document.getElementById('userInput').value;
    const keywords = this.engine.extractKeywords(text);

    document.getElementById('keywordCloud').innerHTML = keywords.map(k =>
      `<span class="keyword-tag">${k.icon} ${k.tag} · ${k.words.join('、')}</span>`
    ).join('');

    // 自动推荐因素
    this.selectedFactors.clear();
    document.querySelectorAll('.factor-chip').forEach(c => c.classList.remove('selected'));
    const autoMap = {
      media: /朋友圈|微博|抖音|群里|社交/,
      family: /父母|家人|亲戚|家庭/,
      peer: /同事|朋友|同学|大家/,
      money: /钱|工资|投资|房贷|亏|赚/,
      reputation: /面子|别人怎么看|丢人/,
      time: /急|赶|截止|来不及|马上/,
      health: /身体|健康|生病|失眠|疲劳/,
    };
    for (const [f, re] of Object.entries(autoMap)) {
      if (re.test(text)) {
        this.selectedFactors.add(f);
        const chip = document.querySelector(`.factor-chip[data-factor="${f}"]`);
        if (chip) chip.classList.add('selected');
      }
    }
  }

  // ===== 导航 =====
  setupNav() {
    document.getElementById('btnBack').addEventListener('click', () => {
      audioSystem.play('click');
      this.goToPhase('input');
    });

    document.getElementById('btnStart').addEventListener('click', () => {
      this.startSimulation();
    });

    document.getElementById('btnNew').addEventListener('click', () => {
      audioSystem.play('click');
      this.reset();
      this.goToPhase('input');
    });
  }

  // ===== 推演 =====
  async startSimulation() {
    const text = document.getElementById('userInput').value;
    const mood = this.selectedMood || 'neutral';
    const scope = parseInt(document.getElementById('slScope').value);
    const intensity = parseInt(document.getElementById('slIntensity').value);
    const timeScale = parseInt(document.getElementById('slTime').value);
    const uncertainty = parseInt(document.getElementById('slUncertainty').value);
    const factors = [...this.selectedFactors];

    audioSystem.play('scan');
    this.goToPhase('simulate');

    // 更新引擎标签
    document.getElementById('simEngine').textContent = this.engine.useAI ? 'DeepSeek AI' : '本地引擎';

    // 清空
    const stepsEl = document.getElementById('simSteps');
    stepsEl.innerHTML = '';
    document.getElementById('empathyText').textContent = '';
    document.getElementById('simProgressBar').style.width = '0%';

    try {
      const result = await this.engine.run(text, mood, scope, intensity, timeScale, uncertainty, factors,
        (step, msg, progress) => {
          // 更新进度条
          document.getElementById('simProgressBar').style.width = progress + '%';

          // 添加步骤
          const stepEl = document.createElement('div');
          stepEl.className = 'sim-step active';
          stepEl.innerHTML = `<span class="sim-step-icon">⟳</span><span>${msg}</span>`;
          stepsEl.appendChild(stepEl);

          // 标记前一个步骤完成
          const prev = stepsEl.querySelectorAll('.sim-step');
          if (prev.length > 1) {
            const p = prev[prev.length - 2];
            p.classList.remove('active');
            p.classList.add('done');
            p.querySelector('.sim-step-icon').textContent = '✓';
          }

          // 共鸣
          if (step === 'empathy' || step === 'local') {
            // 等待结果返回后显示
          }
        }
      );

      this.lastResult = result;

      // 标记最后一步完成
      const allSteps = stepsEl.querySelectorAll('.sim-step');
      if (allSteps.length > 0) {
        const last = allSteps[allSteps.length - 1];
        last.classList.remove('active');
        last.classList.add('done');
        last.querySelector('.sim-step-icon').textContent = '✓';
      }

      // 显示共鸣
      if (result.empathy) {
        document.getElementById('empathyText').textContent = result.empathy;
      }

      await this.delay(800);
      this.showResult(result);

    } catch (err) {
      console.error('推演失败:', err);
      this.showToast('推演出错，请重试');
      this.goToPhase('input');
    }
  }

  // ===== 显示结果 =====
  showResult(result) {
    audioSystem.play('complete');
    this.goToPhase('result');

    // 共鸣区
    document.getElementById('empathyBubble').textContent = result.empathy || '';

    // 三路径概率
    document.getElementById('probOptimistic').textContent = result.optimistic.probability + '%';
    document.getElementById('probNeutral').textContent = result.neutral.probability + '%';
    document.getElementById('probPessimistic').textContent = result.pessimistic.probability + '%';

    // 渲染三条路径
    this.renderPath('pathOptimistic', result.optimistic);
    this.renderPath('pathNeutral', result.neutral);
    this.renderPath('pathPessimistic', result.pessimistic);

    // 建议
    document.getElementById('adviceList').innerHTML = result.advice.map(a => `
      <div class="advice-card">
        <span class="advice-icon">${a.icon}</span>
        <span class="advice-text">${a.text}</span>
      </div>
    `).join('');

    // 心理学洞察
    if (result.psychology) {
      document.getElementById('insightCard').innerHTML = `
        <div class="insight-header">
          <span class="insight-icon">🧠</span>
          <span class="insight-title">${result.psychology.title}</span>
        </div>
        <div class="insight-content">${result.psychology.content}</div>
      `;
    }

    // 保存历史
    this.saveHistory(result);
  }

  renderPath(containerId, path) {
    const el = document.getElementById(containerId);
    let html = '';

    // 路径标题
    html += `<div class="path-section">
      <div class="path-section-title">走向概述</div>
      <div class="path-section-content">${path.title}</div>
    </div>`;

    // 核心驱动因素
    if (path.driving_factors && path.driving_factors.length) {
      html += `<div class="path-section">
        <div class="path-section-title">核心驱动因素</div>
        <ul class="path-section-list">
          ${path.driving_factors.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>`;
    }

    // 关键发展节点
    if (path.timeline && path.timeline.length) {
      html += `<div class="path-section">
        <div class="path-section-title">关键发展节点</div>
        <ul class="path-section-list">
          ${path.timeline.map(t => `<li><strong>${t.period}：</strong>${t.event}</li>`).join('')}
        </ul>
      </div>`;
    }

    // 连锁影响
    if (path.chain_effects && path.chain_effects.length) {
      html += `<div class="path-section">
        <div class="path-section-title">连锁影响</div>
        <ul class="path-section-list">
          ${path.chain_effects.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>`;
    }

    // 机遇与风险
    if ((path.opportunities && path.opportunities.length) || (path.risks && path.risks.length)) {
      html += `<div class="path-section">`;
      if (path.opportunities && path.opportunities.length) {
        html += `<div class="path-section-title">潜在机遇</div>
          <ul class="path-section-list">${path.opportunities.map(o => `<li>${o}</li>`).join('')}</ul>`;
      }
      if (path.risks && path.risks.length) {
        html += `<div class="path-section-title">潜在风险</div>
          <ul class="path-section-list">${path.risks.map(r => `<li>${r}</li>`).join('')}</ul>`;
      }
      html += `</div>`;
    }

    // 各方观点
    if (path.stakeholders && path.stakeholders.length) {
      html += `<div class="path-section">
        <div class="path-section-title">各方立场</div>
        <div class="path-stakeholders">
          ${path.stakeholders.map(s => `
            <div class="stakeholder">
              <span class="stakeholder-role">${s.role}</span>
              <span class="stakeholder-view">${s.view}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
    }

    el.innerHTML = html;
  }

  // ===== Emoji 游戏 =====
  setupEmojiGame() {
    document.getElementById('btnEmoji').addEventListener('click', () => {
      const text = document.getElementById('userInput').value;
      const url = 'emoji.html' + (text ? '?text=' + encodeURIComponent(text) : '');
      window.open(url, '_blank');
      audioSystem.play('click');
    });
  }

  // ===== 导出 =====
  setupExport() {
    document.getElementById('btnExport').addEventListener('click', () => {
      if (!this.lastResult) return;
      const r = this.lastResult;
      const text = document.getElementById('userInput').value;

      let content = `【MiroFish 未来推演报告】\n\n`;
      content += `输入：${text}\n\n`;
      content += `--- 共鸣 ---\n${r.empathy}\n\n`;

      [
        { name: '乐观', data: r.optimistic },
        { name: '中性', data: r.neutral },
        { name: '悲观', data: r.pessimistic },
      ].forEach(p => {
        content += `--- ${p.name}路径（${p.data.probability}%）---\n`;
        content += `${p.data.title}\n\n`;
        if (p.data.driving_factors) {
          content += `驱动因素：${p.data.driving_factors.join('；')}\n`;
        }
        if (p.data.timeline) {
          content += `发展节点：\n`;
          p.data.timeline.forEach(t => content += `  ${t.period}：${t.event}\n`);
        }
        if (p.data.chain_effects) {
          content += `连锁影响：${p.data.chain_effects.join('；')}\n`;
        }
        if (p.data.opportunities) {
          content += `机遇：${p.data.opportunities.join('；')}\n`;
        }
        if (p.data.risks) {
          content += `风险：${p.data.risks.join('；')}\n`;
        }
        content += `\n`;
      });

      if (r.advice) {
        content += `--- 建议 ---\n`;
        r.advice.forEach(a => content += `${a.icon} ${a.text}\n`);
      }

      content += `\n生成时间：${new Date().toLocaleString()}\n— MiroFish v5`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mirofish-report-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      audioSystem.play('success');
      this.showToast('报告已导出');
    });

    document.getElementById('btnShare').addEventListener('click', () => {
      if (!this.lastResult) return;
      const r = this.lastResult;
      const share = `🔮 MiroFish 未来推演\n\n${r.empathy}\n\n🌅 乐观 ${r.optimistic.probability}%：${r.optimistic.title}\n🌊 中性 ${r.neutral.probability}%：${r.neutral.title}\n🌧️ 悲观 ${r.pessimistic.probability}%：${r.pessimistic.title}\n\n— MiroFish v5`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(share).then(() => {
          audioSystem.play('success');
          this.showToast('已复制到剪贴板');
        });
      }
    });
  }

  // ===== 工具 =====
  showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  goToPhase(name) {
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    document.getElementById(`phase${name.charAt(0).toUpperCase() + name.slice(1)}`).classList.add('active');
    this.currentPhase = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveHistory(result) {
    try {
      const h = JSON.parse(localStorage.getItem('mf_v5_history') || '[]');
      h.unshift({
        text: document.getElementById('userInput').value,
        time: new Date().toLocaleString(),
        opt: result.optimistic.title,
        neu: result.neutral.title,
        pes: result.pessimistic.title,
      });
      if (h.length > 30) h.length = 30;
      localStorage.setItem('mf_v5_history', JSON.stringify(h));
    } catch (e) {}
  }

  reset() {
    this.selectedMood = null;
    this.selectedFactors.clear();
    this.lastResult = null;
    document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.factor-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('userInput').value = '';
    this.updateInputState();
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
