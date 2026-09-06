/* ============================================================
   APP — renderização + interações + localStorage
   ============================================================ */
(function(){
  "use strict";

  /* ---------- STORAGE HELPERS ---------- */
  const STORE_KEYS = { training: "lobotolinda_training_v1", skins: "lobotolinda_skins_v1", secrets: "lobotolinda_secrets_v1", spear: "lobotolinda_spear_v1" };
  function loadJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  }
  function saveJSON(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* localStorage indisponível — segue sem salvar */ }
  }

  const HEART_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.2-4.6-10-9.3C.4 8.6 1.6 5 5.1 4.1 7.4 3.5 9.7 4.5 12 7c2.3-2.5 4.6-3.5 6.9-2.9 3.5.9 4.7 4.5 3.1 7.6C19.2 16.4 12 21 12 21z"/></svg>';
  const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg>';
  const LEAF_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-1 3-3 4-3 7a3 3 0 006 0c0-3-2-4-3-7z"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>';

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

  /* ============ CARREGAMENTO SEGURO DE IMAGENS ============
     Qualquer <img> que falhar em qualquer lugar do site cai aqui.
     Nunca mostramos o ícone de imagem quebrada do navegador. */
  const FALLBACK_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23D98BAE'%3E%3Cpath d='M12 2c-1 3-3 4-3 7a3 3 0 006 0c0-3-2-4-3-7zM6 21c3-1 5-3 6-6-3 1-5 2-6 6zm12 0c-3-1-5-3-6-6 3 1 5 2 6 6z'/%3E%3C/svg%3E";
  document.addEventListener("error", function(e){
    const t = e.target;
    if(t && t.tagName === "IMG" && !t.dataset.fallbackApplied){
      t.dataset.fallbackApplied = "1";
      t.src = FALLBACK_ICON;
      t.classList.add("img-fallback");
    }
  }, true);

  /* ============ PATCH DISPLAY ============ */
  document.querySelectorAll(".js-patch").forEach(function(el){ el.textContent = CURRENT_PATCH; });

  /* ============ GATE ============ */
  const gate = document.getElementById("gate");
  const gateBtn = document.getElementById("gateBtn");
  let gateClicks = 0;
  gateBtn.addEventListener("click", function(){
    gateClicks++;
    if(gateClicks === 1){
      gate.classList.add("gate-hidden");
      document.body.style.overflow = "auto";
      spawnBurst(18);
      tryPlayChime();
      updateNavState();
      setTimeout(function(){
        document.getElementById("desculpas").scrollIntoView({behavior:"smooth"});
      }, 350);
    } else {
      const msgs = [
        "Júlia, vai treinar Nidalee.",
        "Não adianta clicar aqui. Vai farmar.",
        "VOCÊ ESTÁ IGNORANDO O ROADMAP."
      ];
      if(gateClicks === 2){
        registerSecret("gate4");
      } else {
        const idx = Math.min(gateClicks - 2, msgs.length - 1);
        showEggToast(msgs[idx]);
      }
      spawnBurst(4);
    }
  });

  function tryPlayChime(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [660, 880, 990];
      notes.forEach(function(freq, i){
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.0001;
        osc.connect(gain).connect(ctx.destination);
        const t = ctx.currentTime + i * 0.14;
        gain.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    }catch(e){ /* autoplay/áudio bloqueado — segue sem som */ }
  }

  /* ============ PARTICLES ============ */
  const particleLayer = document.getElementById("particles");
  function spawnBurst(n){ for(let i=0;i<n;i++){ setTimeout(spawnOne, i * 90); } }
  function spawnOne(){
    const el = document.createElement("div");
    el.className = "floaty";
    const isHeart = Math.random() > 0.4;
    el.innerHTML = isHeart ? HEART_SVG : LEAF_SVG;
    const size = 10 + Math.random() * 16;
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.left = (Math.random() * 100) + "vw";
    el.style.bottom = "-40px";
    el.style.color = isHeart ? "var(--rose-400)" : "var(--rose-300)";
    const dur = 4 + Math.random() * 3;
    el.style.animationDuration = dur + "s";
    particleLayer.appendChild(el);
    setTimeout(function(){ el.remove(); }, dur * 1000 + 200);
  }
  setInterval(function(){
    if(document.hidden) return;
    if(Math.random() > 0.6) spawnOne();
  }, 3200);

  /* ============ NAV ============ */
  const nav = document.getElementById("nav");
  const hamburger = document.getElementById("hamburger");
  const navInner = document.getElementById("navInner");
  function updateNavState(){
    const gateHidden = gate.classList.contains("gate-hidden");
    if(!gateHidden){ nav.classList.remove("nav-visible"); return; }
    nav.classList.add("nav-visible");
    if(window.scrollY > 40){ nav.classList.add("nav-solid"); } else { nav.classList.remove("nav-solid"); }
  }
  window.addEventListener("scroll", updateNavState, {passive:true});
  hamburger.addEventListener("click", function(){
    const open = navInner.classList.toggle("mobile-open");
    hamburger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll("[data-nav]").forEach(function(a){
    a.addEventListener("click", function(){ navInner.classList.remove("mobile-open"); hamburger.setAttribute("aria-expanded","false"); });
  });
  document.addEventListener("click", function(e){
    if(navInner.classList.contains("mobile-open") && !e.target.closest("#nav")){
      navInner.classList.remove("mobile-open");
      hamburger.setAttribute("aria-expanded","false");
    }
  });

  /* ============ HERO SPLASH ============ */
  const heroSplash = document.getElementById("heroSplash");
  if(heroSplash){ heroSplash.style.backgroundImage = "url('" + NIDALEE_SPLASH_HERO + "')"; }

  /* ============ FINAL — ARTE DA CAITVI ============
     Antes eram os splashes oficiais da Riot lado a lado; agora é a
     arte feita à mão que a namorada mandou (item 4 do briefing). Se
     o arquivo local não estiver no repositório por algum motivo, cai
     de volta pra dupla oficial — nunca fica com espaço vazio. */
  const finalArt = document.getElementById("finalArt");
  window.__finalArtFallback = function(imgEl){
    imgEl.parentElement.innerHTML = '<div class="final-duo">'
      + '<img class="final-duo-img" src="' + championLoadingUrl(FINAL_DUO.a.id, FINAL_DUO.a.num) + '" alt="Caitlyn">'
      + '<span class="final-duo-heart">' + HEART_SVG + '</span>'
      + '<img class="final-duo-img" src="' + championLoadingUrl(FINAL_DUO.b.id, FINAL_DUO.b.num) + '" alt="Vi">'
      + '</div>';
  };
  if(finalArt){
    finalArt.innerHTML = '<img src="' + CAITVI_FINAL_IMG + '" alt="desenho carinhoso, feito à mão" loading="lazy" style="border-radius:18px; width:100%;" onerror="window.__finalArtFallback(this);">';
  }

  /* ============ RENDER: ABILITIES (com toggle humana/puma) ============ */
  const abilityGrid = document.getElementById("abilityGrid");
  function renderAbilityGrid(){
    abilityGrid.innerHTML = ABILITIES.map(function(a){
      const hasForm = !!(a.humanDesc && a.pumaDesc);
      const bodyHtml = hasForm
        ? '<div class="form-toggle" data-key="' + a.key + '">'
          + '<button type="button" class="form-btn active" data-form="human">🧍 Humana</button>'
          + '<button type="button" class="form-btn" data-form="puma">🐆 Puma</button>'
          + '</div>'
          + '<p class="form-desc form-human active">' + a.humanDesc + '</p>'
          + '<p class="form-desc form-puma">' + a.pumaDesc + '</p>'
        : '<p style="margin:0; color:var(--ink-soft); font-size:.92rem;">' + a.desc + '</p>';
      return '<div class="ability-card">'
        + '<div class="ability-icon-wrap"><img class="ability-icon-img" src="' + a.icon + '" alt="Ícone ' + a.key + '" loading="lazy" onerror="this.onerror=null; this.src=\'' + championIcon("Nidalee") + '\';"><span class="ability-key-badge">' + a.key + '</span></div>'
        + '<div>'
        + '<h4>' + a.name + '</h4>'
        + '<div class="ability-meta">' + a.meta + '</div>'
        + bodyHtml
        + '<div class="ability-grid-inner">'
        + '<div class="ability-box"><b>Quando usar</b>' + a.when + '</div>'
        + '<div class="ability-box"><b>Erro comum</b>' + a.mistake + '</div>'
        + '</div>'
        + '<div class="ability-box" style="margin-top:10px;"><b>Dica</b>' + a.tip + '</div>'
        + '</div></div>';
    }).join("");
  }
  renderAbilityGrid();
  abilityGrid.addEventListener("click", function(e){
    const btn = e.target.closest(".form-btn");
    if(!btn) return;
    const wrap = btn.closest(".form-toggle");
    wrap.querySelectorAll(".form-btn").forEach(function(b){ b.classList.toggle("active", b === btn); });
    const card = wrap.closest(".ability-card");
    card.querySelectorAll(".form-desc").forEach(function(p){ p.classList.remove("active"); });
    card.querySelector(".form-" + btn.dataset.form).classList.add("active");
  });

  /* ============ ABILITY ICON LOOKUP (p/ combos) ============ */
  const ABILITY_ICON = {};
  ABILITIES.forEach(function(a){ ABILITY_ICON[a.key] = a.icon; });

  /* ============ RENDER: COMBOS COM TABS ============ */
  const comboTabs = document.getElementById("comboCategoryTabs");
  const comboGrid = document.getElementById("comboGrid");
  let activeCategory = "todos";
  function renderComboTabs(){
    const cats = ["todos"].concat(Object.keys(COMBO_CATEGORIES));
    comboTabs.innerHTML = cats.map(function(c){
      const label = c === "todos" ? "Todos" : COMBO_CATEGORIES[c];
      return '<button type="button" class="combo-tab' + (c === activeCategory ? " active" : "") + '" data-cat="' + c + '">' + label + '</button>';
    }).join("");
  }
  function renderCombos(){
    const list = activeCategory === "todos" ? COMBOS : COMBOS.filter(function(c){ return c.category === activeCategory; });
    comboGrid.innerHTML = list.map(function(c){
      const dots = [1,2,3,4,5].map(function(n){ return '<span class="dot' + (n<=c.difficulty ? ' on' : '') + '"></span>'; }).join("");
      const seq = c.steps.map(function(s, i){
        const icon = ABILITY_ICON[s];
        const chip = icon
          ? '<span class="combo-step" title="' + s + '"><img src="' + icon + '" alt="' + s + '"><b>' + s + '</b></span>'
          : '<span class="combo-step"><b>' + s + '</b></span>';
        return (i>0 ? '<span class="combo-arrow">→</span>' : '') + chip;
      }).join("");
      return '<div class="combo-card">'
        + '<span class="tag" style="margin-bottom:8px; display:inline-block;">' + (COMBO_CATEGORIES[c.category]||"") + '</span>'
        + '<div class="combo-diff">' + dots + '</div>'
        + '<h4 style="margin:0 0 6px; font-size:1.05rem;">' + c.name + '</h4>'
        + '<p style="margin:0; font-size:.88rem; color:var(--ink-soft);"><b>Objetivo:</b> ' + c.goal + '</p>'
        + '<div class="combo-seq">' + seq + '</div>'
        + '<p style="margin:0 0 8px; font-size:.9rem;">' + c.explain + '</p>'
        + '<p style="margin:0; font-size:.85rem; color:var(--rose-600); font-weight:600;">💡 ' + c.tip + '</p>'
        + '</div>';
    }).join("");
  }
  comboTabs.addEventListener("click", function(e){
    const btn = e.target.closest(".combo-tab");
    if(!btn) return;
    activeCategory = btn.dataset.cat;
    renderComboTabs();
    renderCombos();
  });
  renderComboTabs();
  renderCombos();

  /* ============ ACADEMIA — ROADMAP EM NÍVEIS ============ */
  let trainingState = loadJSON(STORE_KEYS.training, {});
  const academyRoot = document.getElementById("academyRoot");
  const TOTAL_TASKS = ACADEMY_LEVELS.reduce(function(sum, lvl){ return sum + lvl.tasks.length; }, 0);

  function levelDone(lvl){ return lvl.tasks.every(function(t){ return !!trainingState[t.id]; }); }
  function levelUnlocked(idx){ return idx === 0 || levelDone(ACADEMY_LEVELS[idx-1]); }

  function renderAcademy(){
    academyRoot.innerHTML = ACADEMY_LEVELS.map(function(lvl, idx){
      const unlocked = levelUnlocked(idx);
      const done = levelDone(lvl);
      const items = lvl.tasks.map(function(t){
        const checked = !!trainingState[t.id];
        return '<div class="day-item' + (checked ? ' done' : '') + '" data-id="' + t.id + '">'
          + '<input type="checkbox" class="day-checkbox" id="chk-' + t.id + '" ' + (checked ? "checked" : "") + (unlocked ? "" : " disabled") + '>'
          + '<label class="day-text" for="chk-' + t.id + '"><b>' + t.title + '</b><span>' + t.desc + '</span></label>'
          + '</div>';
      }).join("");
      return '<div class="level-card' + (unlocked ? '' : ' locked') + (done ? ' level-done' : '') + '">'
        + '<div class="level-head"><span class="level-icon">' + lvl.icon + '</span>'
        + '<div><span class="level-num">NÍVEL ' + (idx+1) + '</span><h4>' + lvl.title + '</h4></div>'
        + (done ? '<span class="level-badge">✓ Completo</span>' : (unlocked ? '' : '<span class="level-badge locked">🔒 Bloqueado</span>'))
        + '</div>'
        + '<div class="day-list">' + items + '</div>'
        + '</div>';
    }).join("");
  }

  function updateMissionBar(){
    const doneCount = Object.keys(trainingState).filter(function(k){ return trainingState[k]; }).length;
    const pct = Math.min(100, Math.round((doneCount / TOTAL_TASKS) * 100));
    const bar = document.getElementById("missionBar");
    const label = document.getElementById("missionLabel");
    if(bar) bar.style.width = pct + "%";
    if(label){
      let stage = "Perdida na jungle";
      if(pct >= 100) stage = "Nidalee main de verdade";
      else if(pct >= 75) stage = "Quase lá";
      else if(pct >= 50) stage = "Pegando o jeito";
      else if(pct >= 25) stage = "Aprendendo a trocar de forma";
      label.textContent = pct + "% — " + stage;
    }
  }

  academyRoot.addEventListener("change", function(e){
    const chk = e.target.closest(".day-checkbox");
    if(!chk) return;
    const item = chk.closest(".day-item");
    trainingState[item.dataset.id] = chk.checked;
    saveJSON(STORE_KEYS.training, trainingState);
    renderAcademy();
    updateMissionBar();
    if(typeof checkFinalUnlock === "function") checkFinalUnlock();
  });
  renderAcademy();
  updateMissionBar();

  /* ============ VIDEOS ============ */
  const CATEGORY_ICON = {
    "Fundamentos":"📘","Jungle":"🌳","Macro":"🗺️","Nidalee":"🐆","Matchups":"🔮"
  };
  const videoGrid = document.getElementById("videoGrid");
  videoGrid.innerHTML = VIDEOS.map(function(v){
    const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(v.query);
    const icon = CATEGORY_ICON[v.subject] || "🎬";
    return '<a class="video-card" href="' + url + '" target="_blank" rel="noopener">'
      + '<div class="video-thumb"><span style="font-size:2.2rem;">' + icon + '</span></div>'
      + '<div class="video-body">'
      + '<div class="video-meta"><span class="tag">' + v.subject + '</span><span class="tag tag-gold">' + v.difficulty + '</span></div>'
      + '<h4>' + v.topic + '</h4>'
      + '<p>Abre uma busca pronta no YouTube pra você escolher o criador que mais combina com você.</p>'
      + '</div></a>';
  }).join("");

  /* ============ MAPA DA JUNGLE ============
     Data Dragon/CommunityDragon não expõem URLs estáveis e redistribuíveis
     pra arte dos monstros de jungle (só existem pra campeões/itens/runas,
     e a última vez que arriscamos link direto pra arte de skin, quebrou —
     não vamos repetir isso com uma dúzia de monstros). Em vez de arriscar
     ícone quebrado, desenhei um set de ilustrações vetoriais próprias,
     coloridas e reconhecíveis por monstro — nunca emoji, nunca link externo. */
  const CAMP_GLYPH = {
    blue: '<ellipse cx="16" cy="21" rx="10" ry="7" fill="#2B5F8A"/>'
      + '<path d="M8 21c0-6 3.5-11 8-11s8 5 8 11" fill="#3E7CB1"/>'
      + '<path d="M16 6l2.4 5.2L24 13l-5.6 1.8L16 20l-2.4-5.2L8 13l5.6-1.8z" fill="#8FD8F5"/>'
      + '<circle cx="16" cy="13" r="2.1" fill="#EAFBFF"/>'
      + '<circle cx="11.5" cy="22" r="1.4" fill="#8FD8F5"/><circle cx="20.5" cy="22" r="1.4" fill="#8FD8F5"/>',
    red: '<ellipse cx="16" cy="22" rx="10" ry="6.5" fill="#7A2A1E"/>'
      + '<path d="M8 22c0-6 3.5-12 8-12s8 6 8 12" fill="#A8402B"/>'
      + '<path d="M10 14l2-5 1.5 4M16 12l1-5 1.5 4.5M22 14l-2-5-1.5 4" stroke="#E0602F" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
      + '<circle cx="16" cy="16" r="3" fill="#FFB255"/><circle cx="16" cy="16" r="1.3" fill="#FFE9C7"/>',
    gromp: '<ellipse cx="16" cy="20" rx="11" ry="8" fill="#4C7A3E"/>'
      + '<ellipse cx="16" cy="20" rx="11" ry="8" fill="#5D9149" opacity=".5"/>'
      + '<circle cx="10.5" cy="12.5" r="3.6" fill="#5D9149"/><circle cx="21.5" cy="12.5" r="3.6" fill="#5D9149"/>'
      + '<circle cx="10.5" cy="12" r="2" fill="#F4F1DC"/><circle cx="21.5" cy="12" r="2" fill="#F4F1DC"/>'
      + '<circle cx="10.9" cy="12.3" r=".9" fill="#20321C"/><circle cx="21.9" cy="12.3" r=".9" fill="#20321C"/>'
      + '<circle cx="12" cy="21" r="1" fill="#3C5F30"/><circle cx="20" cy="19" r="1.2" fill="#3C5F30"/><circle cx="16" cy="24" r="1" fill="#3C5F30"/>',
    wolves: '<path d="M16 8l4 5 6-1-3 6 3 6-6-2-4 5-4-5-6 2 3-6-3-6 6 1z" fill="#8A93A3" opacity=".28"/>'
      + '<path d="M16 11c-4 0-7 3-8 8 2-1 3-1.6 4-1.6-.4 1.6 0 3 1 4 .6-1 1.4-1.8 3-1.8s2.4.8 3 1.8c1-1 1.4-2.4 1-4 1 0 2 .6 4 1.6-1-5-4-8-8-8z" fill="#7C8698"/>'
      + '<path d="M12.5 12l-1.4-3.4 2.6 2M19.5 12l1.4-3.4-2.6 2" fill="#7C8698"/>'
      + '<circle cx="13.4" cy="14.8" r="1" fill="#F4D25A"/><circle cx="18.6" cy="14.8" r="1" fill="#F4D25A"/>'
      + '<path d="M16 15.6l-1.1 1.4h2.2z" fill="#2A2E36"/>',
    raptors: '<path d="M16 5l2 4.4 4.6.6-3.4 3.2.9 4.6L16 15.4l-4.1 2.4.9-4.6-3.4-3.2 4.6-.6z" fill="#3E8F72"/>'
      + '<path d="M16 15c-4.4 0-7.6 3-8.6 7.6 1.6-1.2 2.6-1.8 3.6-2-.4 1.6 0 2.8 1 3.8.6-1 1.6-1.8 4-1.8s3.4.8 4 1.8c1-1 1.4-2.2 1-3.8 1 .2 2 .8 3.6 2-1-4.6-4.2-7.6-8.6-7.6z" fill="#4FAE86"/>'
      + '<path d="M16 15l1.4-4 2.2 1.4z" fill="#E8A23F"/>'
      + '<circle cx="13.6" cy="20.5" r="1" fill="#1E2E27"/><circle cx="18.4" cy="20.5" r="1" fill="#1E2E27"/>',
    krugs: '<ellipse cx="16" cy="22" rx="8" ry="5.5" fill="#6B6459"/>'
      + '<path d="M16 8l5 4.4-1.4 6.4-3.6 2.4-3.6-2.4-1.4-6.4z" fill="#8B8375"/>'
      + '<circle cx="7.5" cy="23" r="3.4" fill="#7A7266"/><circle cx="24.5" cy="23" r="3.4" fill="#7A7266"/>'
      + '<path d="M13 13l1.4 2.4M19 13l-1.4 2.4M16 16v3" stroke="#4A4438" stroke-width="1.1" fill="none" stroke-linecap="round"/>',
    scuttle: '<ellipse cx="16" cy="18" rx="9.5" ry="7" fill="#2D8F8A"/>'
      + '<ellipse cx="16" cy="17" rx="9.5" ry="7" fill="#3FADA6" opacity=".55"/>'
      + '<path d="M6 15l-3-3M26 15l3-3M6 21l-3 3M26 21l3 3" stroke="#2D8F8A" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M8.5 12l-1.5-3.4M23.5 12l1.5-3.4" stroke="#E8A23F" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
      + '<circle cx="11.5" cy="16" r="1.4" fill="#0D3B38"/><circle cx="20.5" cy="16" r="1.4" fill="#0D3B38"/>',
    dragon: '<path d="M16 5c3 2.6 5 6.6 5 10.4 2.4-.6 3.6-.2 4.6 1-1.6 3-4 4.2-6.6 4.6.8 1.8.4 3.8-1.2 5.6-1.2-2-2-3-2.2-3s-1 1-2.2 3c-1.6-1.8-2-3.8-1.2-5.6-2.6-.4-5-1.6-6.6-4.6 1-1.2 2.2-1.6 4.6-1 0-3.8 2-7.8 5-10.4z" fill="#C0472F"/>'
      + '<path d="M16 5c3 2.6 5 6.6 5 10.4 1.4-.3 2.4-.3 3.2-.1-.9-3.5-3.8-7-8.2-10.3z" fill="#E0602F" opacity=".7"/>'
      + '<circle cx="13.6" cy="13.5" r="1" fill="#FFDB80"/><circle cx="18.4" cy="13.5" r="1" fill="#FFDB80"/>',
    herald: '<ellipse cx="16" cy="18" rx="11" ry="8.5" fill="#8A6A3E"/>'
      + '<ellipse cx="16" cy="17" rx="11" ry="8.5" fill="#A5804E" opacity=".6"/>'
      + '<path d="M4 18c2-1.6 4-2 5.6-1.2M28 18c-2-1.6-4-2-5.6-1.2" stroke="#5E4527" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
      + '<circle cx="16" cy="17" r="4.4" fill="#D9C48F"/><circle cx="16" cy="17" r="2.6" fill="#8A6A3E"/><circle cx="16" cy="17" r="1.1" fill="#F3E3BE"/>',
    grubs: '<ellipse cx="8.5" cy="20" rx="4.6" ry="3.4" fill="#6A5AB0"/>'
      + '<ellipse cx="16" cy="18.5" rx="5.6" ry="4.2" fill="#7C6BC7"/>'
      + '<ellipse cx="24" cy="20" rx="3.8" ry="2.8" fill="#6A5AB0"/>'
      + '<circle cx="6.5" cy="18.6" r=".8" fill="#E4DCFF"/><circle cx="14" cy="16.8" r=".9" fill="#E4DCFF"/><circle cx="22.5" cy="18.4" r=".7" fill="#E4DCFF"/>'
      + '<path d="M16 14.3v-2.6M12.5 15l-1.6-2M19.5 15l1.6-2" stroke="#9B8CE0" stroke-width="1.1" fill="none" stroke-linecap="round"/>',
    baron: '<path d="M6 15c3-2.4 6-3.4 10-3.4s7 1 10 3.4c-.8 5.4-4.4 9.4-10 9.4S6.8 20.4 6 15z" fill="#3E6B3A"/>'
      + '<path d="M16 4l2 5.4M9 7l3.6 4.4M23 7l-3.6 4.4" stroke="#5E8A52" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      + '<path d="M6 15c3-2.4 6-3.4 10-3.4s7 1 10 3.4" fill="none" stroke="#274A26" stroke-width="1.2"/>'
      + '<circle cx="12" cy="16" r="1.8" fill="#E6C24A"/><circle cx="20" cy="16" r="1.8" fill="#E6C24A"/>'
      + '<circle cx="12" cy="16" r=".7" fill="#3B2A0A"/><circle cx="20" cy="16" r=".7" fill="#3B2A0A"/>'
      + '<path d="M11 21c1.6 1.2 3.2 1.8 5 1.8s3.4-.6 5-1.8" stroke="#274A26" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
  };
  /* Cor de fundo do "selo" de cada monstro — pra imitar o estilo dos
     ícones reais de timer de jungle do próprio cliente (item 1 do
     briefing): selo colorido + silhueta simples por cima. */
  const CAMP_BADGE_COLOR = {
    blue: "#1B3A54", red: "#4A1712", gromp: "#2E4A24", wolves: "#3A3F4A",
    raptors: "#1F3D2E", krugs: "#3E3628", scuttle: "#0E3D3A", dragon: "#5A1E12",
    herald: "#3A2C14", grubs: "#2A1F4A", baron: "#16281A"
  };
  function campIconSvg(id, size){
    const bg = CAMP_BADGE_COLOR[id] || "#3B2430";
    return '<svg viewBox="0 0 32 32" style="width:' + size + 'px;height:' + size + 'px;">'
      + '<rect x="1" y="1" width="30" height="30" rx="9" fill="' + bg + '"/>'
      + '<rect x="1" y="1" width="30" height="30" rx="9" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>'
      + (CAMP_GLYPH[id]||'') + '</svg>';
  }

  const jungleMapRoot = document.getElementById("jungleMapRoot");
  let activePath = 0;
  function renderJungleMap(){
    const camps = Object.keys(JUNGLE_CAMPS).map(function(key){ return JUNGLE_CAMPS[key]; });
    const pathTabs = JUNGLE_PATHS.map(function(p, i){
      return '<button type="button" class="combo-tab' + (i === activePath ? " active" : "") + '" data-path="' + i + '">' + p.name + '</button>';
    }).join("");
    const path = JUNGLE_PATHS[activePath];
    const routeHtml = path.route.map(function(campId, i){
      const c = JUNGLE_CAMPS[campId];
      return (i>0 ? '<span class="combo-arrow">→</span>' : '') + '<span class="combo-step camp-chip-' + c.id + '">' + campIconSvg(c.id, 18) + '<b>' + c.name + '</b></span>';
    }).join("");
    const campsHtml = camps.map(function(c){
      const onRoute = path.route.indexOf(c.id) !== -1;
      return '<button type="button" class="camp-card camp-tone-' + c.id + (onRoute ? ' on-route' : '') + '" data-camp="' + c.id + '">'
        + '<span class="camp-icon">' + campIconSvg(c.id, 26) + '</span>'
        + '<span class="camp-name">' + c.name + '</span>'
        + '<span class="tag camp-risk-' + c.risk.replace("í","i") + '">' + c.risk + '</span>'
        + '</button>';
    }).join("");
    jungleMapRoot.innerHTML =
      '<div class="rift-schematic">' + riftSvg(path) + '</div>'
      + '<div class="combo-tab-row" style="margin-top:22px;">' + pathTabs + '</div>'
      + '<p class="phase-intro" style="margin-top:14px;">' + path.desc + '</p>'
      + '<div class="jungle-route">' + routeHtml + '</div>'
      + '<div class="camps-grid">' + campsHtml + '</div>'
      + '<div class="camp-detail" id="campDetail"></div>';
  }

  /* Coordenadas aproximadas dentro do esquema (viewBox 0–300, losango
     representando a Summoner's Rift — não são as coordenadas exatas do
     mapa oficial, mas seguem a lógica real: base azul/vermelha nos
     vértices esquerdo/direito, rota do rio no meio, monstros de
     objetivo (Dragão, Arauto, Barão, Vastilarvas, Scuttle) alinhados
     no rio, camps básicos espalhados pelas 4 áreas de jungle). */
  /* Coordenadas redesenhadas pra seguir a orientação real da
     Summoner's Rift (item 1 do briefing, usando a imagem do mapa
     oficial como referência): base azul no canto inferior-esquerdo,
     base vermelha no canto superior-direito, rio cortando na
     diagonal, Arauto no pit de cima e Dragão no pit de baixo. */
  const NEXUS_BLUE = {x:42,y:278};
  const NEXUS_RED = {x:278,y:42};
  const BARON_PIT = {x:118,y:92};
  const DRAGON_PIT = {x:212,y:222};
  /* Layout batido com o mapa oficial (imagens de referência): perto da
     base cada time tem duas trincas — Sentinela Azul+Gromp+Lobos de um
     lado, e Brutamontes Vermelho+Krugs+Aves-navalha do outro, essa
     última sempre coladinha no pit do Arauto/Barão ou no do Dragão. */
  const CAMP_POS = {
    blue:{x:100,y:205}, gromp:{x:50,y:155}, wolves:{x:140,y:195}, raptors:{x:100,y:145},
    red:{x:150,y:115}, krugs:{x:75,y:100}, scuttle:{x:196,y:238}, dragon:{x:DRAGON_PIT.x,y:DRAGON_PIT.y},
    herald:{x:BARON_PIT.x,y:BARON_PIT.y}, grubs:{x:64,y:268}
  };
  /* Essas 6 existem nos dois lados do mapa (o adversário tem a mesma
     trinca espelhada) — geradas automaticamente por simetria de 180°,
     igual às imagens que a Júlia mandou. */
  const MIRRORED_CAMPS = ["blue","gromp","wolves","red","krugs","raptors"];
  function mirrorPoint(p){ return {x:320-p.x, y:320-p.y}; }
  /* Moitas decorativas, só estética (não clicáveis). */
  const FOLIAGE = [
    {x:70,y:258,r:5},{x:33,y:198,r:4.2},{x:78,y:96,r:4.5},{x:172,y:150,r:4},{x:112,y:270,r:5},
    {x:205,y:284,r:4},{x:255,y:178,r:5},{x:162,y:58,r:4},{x:232,y:118,r:4.5},{x:40,y:98,r:4},
    {x:20,y:240,r:4},{x:288,y:120,r:4},{x:150,y:290,r:4},{x:290,y:200,r:4}
  ];
  const LANE_TURRETS = [
    {x:112.8,y:207.2,tone:"blue"},{x:183.6,y:136.4,tone:"red"},
    {x:61.8,y:132.6,tone:"blue"},{x:149.2,y:54.8,tone:"red"},
    {x:187.4,y:258.2,tone:"blue"},{x:265.2,y:170.8,tone:"red"}
  ];
  function turretSvg(t){
    const col = t.tone === "blue" ? "#3E7FB8" : "#B84A4A";
    return '<g transform="translate(' + t.x + ',' + t.y + ')" class="rift-turret">'
      + '<rect x="-6" y="-6" width="12" height="14" rx="2" fill="#2A2620" stroke="' + col + '" stroke-width="1.4"></rect>'
      + '<circle cy="-8" r="3.4" fill="' + col + '"></circle>'
      + '</g>';
  }
  function bushSvg(x,y,r){
    return '<g transform="translate(' + x + ',' + y + ')" class="rift-foliage">'
      + '<ellipse cx="-' + r*0.5 + '" cy="2" rx="' + r*0.7 + '" ry="' + r*0.55 + '"></ellipse>'
      + '<ellipse cx="' + r*0.5 + '" cy="2" rx="' + r*0.7 + '" ry="' + r*0.55 + '"></ellipse>'
      + '<ellipse cx="0" cy="-2" rx="' + r*0.75 + '" ry="' + r*0.6 + '"></ellipse>'
      + '</g>';
  }
  function baseSvg(p, tone){
    const col = tone === "blue" ? "#3E7FB8" : "#B84A4A";
    return '<g transform="translate(' + p.x + ',' + p.y + ')">'
      + '<circle r="30" fill="' + col + '" opacity=".14"></circle>'
      + turretSvg({x:-24,y:10,tone:tone}) + turretSvg({x:24,y:-10,tone:tone})
      + '</g>';
  }
  function riftSvg(path){
    const routePts = path.route.map(function(id){ return CAMP_POS[id]; }).filter(Boolean);
    const routeD = routePts.length ? routePts.map(function(p,i){ return (i===0?"M":"L") + p.x + "," + p.y; }).join(" ") : "";
    const foliage = FOLIAGE.map(function(f){ return bushSvg(f.x, f.y, f.r*1.8); }).join("");
    const turrets = LANE_TURRETS.map(turretSvg).join("");
    const markers = Object.keys(CAMP_POS).map(function(id){
      const p = CAMP_POS[id];
      const onRoute = path.route.indexOf(id) !== -1;
      return '<g class="rift-marker camp-tone-' + id + (onRoute?' on-route':'') + '" data-camp="' + id + '" transform="translate(' + p.x + ',' + p.y + ')" role="button" tabindex="0">'
        + '<circle r="15.5" class="rift-marker-bg"></circle>'
        + '<foreignObject x="-12" y="-12" width="24" height="24">' + campIconSvg(id, 24) + '</foreignObject>'
        + '</g>';
    }).join("");
    /* Versão espelhada no lado adversário — mesmo camp, é o "irmão"
       dele do outro lado do mapa (clicar mostra a mesma explicação). */
    const mirroredMarkers = MIRRORED_CAMPS.map(function(id){
      const p = mirrorPoint(CAMP_POS[id]);
      return '<g class="rift-marker rift-marker-enemy camp-tone-' + id + '" data-camp="' + id + '" transform="translate(' + p.x + ',' + p.y + ')" role="button" tabindex="0">'
        + '<circle r="13.5" class="rift-marker-bg"></circle>'
        + '<foreignObject x="-10.5" y="-10.5" width="21" height="21">' + campIconSvg(id, 21) + '</foreignObject>'
        + '</g>';
    }).join("");
    return '<svg viewBox="0 0 320 320" class="rift-svg" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<pattern id="riftGrass" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">'
      + '<rect width="18" height="18" fill="#2C4A2C"></rect>'
      + '<path d="M0 9h18M9 0v18" stroke="#33532F" stroke-width="1" opacity=".5"></path>'
      + '</pattern>'
      /* "parede" de moita entalhada, tipo labirinto — pra imitar a textura do mapa oficial */
      + '<pattern id="riftHedge" width="46" height="46" patternUnits="userSpaceOnUse">'
      + '<rect width="46" height="46" fill="none"></rect>'
      + '<path d="M0 23a23 23 0 0 1 23-23a23 23 0 0 1 23 23a23 23 0 0 1-23 23a23 23 0 0 1-23-23z" fill="none" stroke="#1F3B2E" stroke-width="7" opacity=".55"></path>'
      + '<path d="M0 23a23 23 0 0 1 23-23a23 23 0 0 1 23 23a23 23 0 0 1-23 23a23 23 0 0 1-23-23z" fill="none" stroke="#2E5643" stroke-width="2.4" opacity=".6"></path>'
      + '</pattern>'
      + '<radialGradient id="riftGlowBlue" cx="50%" cy="50%" r="50%">'
      + '<stop offset="0%" stop-color="#5B9BD5" stop-opacity=".55"></stop>'
      + '<stop offset="100%" stop-color="#5B9BD5" stop-opacity="0"></stop>'
      + '</radialGradient>'
      + '<radialGradient id="riftGlowRed" cx="50%" cy="50%" r="50%">'
      + '<stop offset="0%" stop-color="#C1495A" stop-opacity=".55"></stop>'
      + '<stop offset="100%" stop-color="#C1495A" stop-opacity="0"></stop>'
      + '</radialGradient>'
      + '<linearGradient id="riftRiverFill" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0%" stop-color="#3E8FA6"></stop><stop offset="100%" stop-color="#2A6E86"></stop>'
      + '</linearGradient>'
      + '</defs>'
      /* piso: grama + camada de moita entalhada por cima, igual ao print oficial */
      + '<rect x="4" y="4" width="312" height="312" rx="22" fill="url(#riftGrass)"></rect>'
      + '<rect x="4" y="4" width="312" height="312" rx="22" fill="url(#riftHedge)" opacity=".9"></rect>'
      + '<rect x="4" y="4" width="312" height="312" rx="22" class="rift-outline"></rect>'
      /* clarão azul no canto da base azul, vermelho no canto oposto */
      + '<circle cx="30" cy="290" r="120" fill="url(#riftGlowBlue)"></circle>'
      + '<circle cx="290" cy="30" r="120" fill="url(#riftGlowRed)"></circle>'
      /* três rotas: lane de cima, lane do meio (reta) e lane de baixo — "asfaltadas" (faixa larga clara) */
      + '<path d="M' + NEXUS_BLUE.x + ',' + NEXUS_BLUE.y + ' Q22,22 ' + NEXUS_RED.x + ',' + NEXUS_RED.y + '" class="rift-lane"></path>'
      + '<path d="M' + NEXUS_BLUE.x + ',' + NEXUS_BLUE.y + ' L' + NEXUS_RED.x + ',' + NEXUS_RED.y + '" class="rift-lane rift-lane-mid"></path>'
      + '<path d="M' + NEXUS_BLUE.x + ',' + NEXUS_BLUE.y + ' Q298,298 ' + NEXUS_RED.x + ',' + NEXUS_RED.y + '" class="rift-lane"></path>'
      /* rio em faixa (não só linha), com ponte de pedra e espuma nas bordas */
      + '<path d="M4,140 Q160,168 316,182 L316,198 Q160,184 4,156 Z" fill="url(#riftRiverFill)" opacity=".92"></path>'
      + '<path d="M4,140 Q160,168 316,182" class="rift-river-edge"></path>'
      + '<path d="M4,156 Q160,184 316,198" class="rift-river-edge" opacity=".5"></path>'
      + '<rect x="146" y="150" width="26" height="42" rx="3" transform="rotate(18 159 171)" fill="#8A7A62" stroke="#5A4E3C" stroke-width="1.5"></rect>'
      + '<ellipse cx="' + BARON_PIT.x + '" cy="' + BARON_PIT.y + '" rx="32" ry="24" class="rift-pit rift-pit-void"></ellipse>'
      + '<ellipse cx="' + DRAGON_PIT.x + '" cy="' + DRAGON_PIT.y + '" rx="30" ry="24" class="rift-pit rift-pit-fire"></ellipse>'
      /* torres nas lanes */
      + turrets
      /* bases com torres flanqueando o nexus */
      + baseSvg(NEXUS_BLUE, "blue") + baseSvg(NEXUS_RED, "red")
      /* moitas (agrupamentos de folhas, não só bolinhas) */
      + foliage
      /* nexus */
      + '<g transform="translate(' + NEXUS_BLUE.x + ',' + NEXUS_BLUE.y + ')"><path d="M0-13 L11 0 0 13 -11 0z" class="rift-nexus rift-nexus-blue"></path></g>'
      + '<g transform="translate(' + NEXUS_RED.x + ',' + NEXUS_RED.y + ')"><path d="M0-13 L11 0 0 13 -11 0z" class="rift-nexus rift-nexus-red"></path></g>'
      + (routeD ? '<path d="' + routeD + '" class="rift-route"></path>' : '')
      + mirroredMarkers
      + markers
      + '</svg>';
  }

  function showCampDetail(campId){
    const c = JUNGLE_CAMPS[campId];
    const detail = document.getElementById("campDetail");
    if(!c || !detail) return;
    detail.innerHTML = '<div class="camp-detail-inner">'
      + '<div class="camp-detail-head">' + campIconSvg(c.id, 34) + '<h4>' + c.name + '</h4><span class="tag camp-risk-' + c.risk.replace("í","i") + '">risco ' + c.risk + '</span></div>'
      + '<div class="ability-grid-inner">'
      + '<div class="ability-box"><b>O que é</b>' + c.what + '</div>'
      + '<div class="ability-box"><b>Quando fazer</b>' + c.when + '</div>'
      + '</div>'
      + '<div class="ability-box" style="margin-top:10px;"><b>Dica de Nidalee</b>' + c.tip + '</div>'
      + '<div class="ability-box" style="margin-top:10px;"><b>Próximo passo sugerido</b>' + c.next + '</div>'
      + '</div>';
    detail.classList.add("show");
  }
  jungleMapRoot.addEventListener("click", function(e){
    const pathBtn = e.target.closest("[data-path]");
    if(pathBtn){ activePath = parseInt(pathBtn.dataset.path, 10); renderJungleMap(); return; }
    const campBtn = e.target.closest(".camp-card, .rift-marker");
    if(campBtn){ showCampDetail(campBtn.dataset.camp); }
  });
  renderJungleMap();

  /* ============ BUSCA DE CAMPEÃO (reutilizável) ============ */
  function attachChampionSearch(input, resultsEl, nameList, onSelect){
    input.addEventListener("input", function(){
      const q = input.value.trim().toLowerCase();
      if(!q){ resultsEl.classList.remove("open"); resultsEl.innerHTML = ""; return; }
      const matches = nameList.filter(function(n){ return n.toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
      if(!matches.length){ resultsEl.classList.remove("open"); resultsEl.innerHTML = ""; return; }
      resultsEl.innerHTML = matches.map(function(n){
        const icon = champIcon(n);
        const c = CHAMPIONS[n];
        const roleTag = c ? '<em>' + (ROLE_LABEL_PT[c.role]||c.role) + '</em>' : '';
        return '<li><button type="button" data-name="' + esc(n) + '">' + (icon ? '<img src="' + icon + '" alt="" loading="lazy">' : '') + '<span>' + esc(n) + '</span>' + roleTag + '</button></li>';
      }).join("");
      resultsEl.classList.add("open");
    });
    resultsEl.addEventListener("click", function(e){
      const btn = e.target.closest("button[data-name]");
      if(!btn) return;
      onSelect(btn.dataset.name);
      resultsEl.classList.remove("open");
      resultsEl.innerHTML = "";
      input.value = "";
    });
    document.addEventListener("click", function(e){
      if(!e.target.closest(".matchup-search") && !e.target.closest(".slot-search")) resultsEl.classList.remove("open");
    });
  }

  /* ============ RUNAS/BUILD VISUAL (compartilhado) ============
     Árvore completa com ícones (primária + secundária + fragmentos),
     igual ao cliente do jogo, e build com o minuto estimado de cada
     item — o perfil (padrão ou resiliente) é escolhido automático
     pelas tags do adversário em pickBuildProfile(). */
  function runePickHtml(rune, isKeystone){
    return '<div class="rune-pick' + (isKeystone ? ' keystone' : '') + '" title="' + esc(rune.name) + '">'
      + '<img src="' + rune.icon + '" alt="' + esc(rune.name) + '">'
      + '<span>' + esc(rune.name) + '</span></div>';
  }
  function buildBlockHtml(champName){
    const b = champName ? pickBuildProfile(champName) : BUILD_PROFILES.padrao;
    const treePrimary = RUNE_TREES[b.keystoneTree];
    const treeSecondary = RUNE_TREES[b.secondaryTree];
    const shardsHtml = b.shards.map(function(icon, i){
      return '<div class="rune-pick shard" title="' + esc(b.shardLabels[i]) + '"><img src="' + icon + '" alt="' + esc(b.shardLabels[i]) + '"></div>';
    }).join("");
    const itemsHtml = [b.startItem].concat(b.items).map(function(it){
      return '<div class="item-timeline-step" title="' + esc(it.name) + '">'
        + '<img src="' + itemIcon(it.id) + '" alt="' + esc(it.name) + '">'
        + '<span class="item-timeline-min">' + (it.readyBy > 0 ? "~" + it.readyBy + "min" : "início") + '</span>'
        + '</div>';
    }).join('<span class="combo-arrow">→</span>');
    return '<div class="matchup-block">'
      + '<h5>Runas <span class="tag tag-gold" style="margin-left:6px; font-weight:700;">' + esc(b.label) + '</span></h5>'
      + '<p style="margin:0 0 12px; font-size:.82rem; color:var(--ink-soft);">' + esc(b.useWhen) + '</p>'
      + '<div class="rune-tree-grid">'
      + '<div class="rune-col">'
      + '<div class="rune-col-head"><img class="rune-tree-icon" src="' + treePrimary.icon + '" alt="' + treePrimary.name + '"><b>' + treePrimary.name + '</b></div>'
      + runePickHtml(b.keystone, true)
      + b.primary.map(function(r){ return runePickHtml(r, false); }).join("")
      + '</div>'
      + '<div class="rune-col">'
      + '<div class="rune-col-head"><img class="rune-tree-icon" src="' + treeSecondary.icon + '" alt="' + treeSecondary.name + '"><b>' + treeSecondary.name + '</b></div>'
      + b.secondary.map(function(r){ return runePickHtml(r, false); }).join("")
      + '<div class="shard-row">' + shardsHtml + '</div>'
      + '</div>'
      + '</div>'
      + '<h5 style="margin-top:18px;">Build (minuto estimado pronto)</h5>'
      + '<div class="item-timeline">' + itemsHtml + '</div>'
      + '<p class="patch-note" style="margin-top:10px;">Referência de meta atual (<span class="js-patch">' + CURRENT_PATCH + '</span>), agregado de fontes como Mobalytics, op.gg e U.GG. Os minutos são uma estimativa de curva de ouro típica — confira sempre a build ao vivo no seu client antes de uma ranked importante.</p>'
      + '</div>';
  }

  /* ============ MATCHUPS — ANALISADOR DA JUNGLE ============ */
  const matchupSearch = document.getElementById("matchupSearch");
  const matchupResults = document.getElementById("matchupResults");
  const matchupChips = document.getElementById("matchupChips");
  const matchupPanel = document.getElementById("matchupPanel");

  const FEATURED_JUNGLERS = ["Rengar","Lee Sin","Kha'Zix","Viego","Kayn","Kindred","Graves","Vi","Evelynn","Hecarim"];
  matchupChips.innerHTML = FEATURED_JUNGLERS.map(function(n){
    return '<button type="button" class="matchup-chip" data-name="' + esc(n) + '">' + esc(n) + '</button>';
  }).join("");

  function openMatchup(name){
    const detailed = MATCHUPS[name];
    const champ = CHAMPIONS[name];
    const isJungle = champ && champ.role === "jungle";
    const m = detailed || (champ ? GENERIC_MATCHUP_BY_ROLE[champ.role] : null);
    if(!m) return;
    const icon = champIcon(name);
    const roleNote = (!isJungle && champ)
      ? '<p class="mistake-box" style="background:var(--cream-2); border-left-color:var(--rose-400);"><b>Sobre esse confronto:</b> ' + esc(name) + ' joga na rota de ' + (ROLE_LABEL_PT[champ.role]||champ.role) + ', então esse não é um matchup direto de jungle contra jungle — mas ele ainda impacta sua partida da forma abaixo.</p>'
      : '';
    matchupPanel.innerHTML =
      '<div class="matchup-header">'
      + '<div style="display:flex; align-items:center; gap:14px;">'
      + (icon ? '<img class="matchup-portrait" src="' + icon + '" alt="' + esc(name) + '">' : '')
      + '<div><div class="eyebrow" style="margin:0;">NIDALEE VS</div><h3 class="matchup-title">' + esc(name) + '</h3></div>'
      + '</div>'
      + '<span class="danger-badge danger-' + m.danger + '">' + dangerLabel(m.danger) + '</span>'
      + '</div>'
      + roleNote
      + '<div class="matchup-grid">'
      + '<div class="matchup-block"><h5>Estratégia</h5><ul>' + m.strategy.map(function(s){ return '<li>' + s + '</li>'; }).join("") + '</ul></div>'
      + buildBlockHtml(name)
      + '</div>'
      + '<div class="matchup-grid" style="margin-top:6px;">'
      + '<div class="matchup-block"><h5>⚠️ Perigos</h5><ul>' + m.dangers.map(function(s){ return '<li>' + s + '</li>'; }).join("") + '</ul></div>'
      + '</div>'
      + '<div class="mistake-box"><b>Erro comum:</b> ' + m.mistakes + '</div>';
    matchupPanel.classList.add("show");
    matchupPanel.scrollIntoView({behavior:"smooth", block:"nearest"});
  }
  function dangerLabel(d){ return d === "alto" ? "DIFICULDADE ALTA" : d === "medio" ? "DIFICULDADE MÉDIA" : "DIFICULDADE BAIXA"; }

  attachChampionSearch(matchupSearch, matchupResults, CHAMPION_NAMES, openMatchup);
  matchupChips.addEventListener("click", function(e){
    const btn = e.target.closest(".matchup-chip");
    if(btn) openMatchup(btn.dataset.name);
  });

  /* ============ CHEAT SHEET RÁPIDO ============ */
  const cheatGrid = document.getElementById("cheatGrid");
  cheatGrid.innerHTML = Object.keys(CHEAT_SHEET).map(function(title){
    const items = CHEAT_SHEET[title].map(function(t){
      return '<li>' + CHECK_SVG.replace("<svg ", '<svg class="cheat-check-icon" ') + '<span>' + t + '</span></li>';
    }).join("");
    return '<div class="cheat-card"><h4>' + title + '</h4><ul>' + items + '</ul></div>';
  }).join("");

  /* ============ DICAS ============ */
  const dicasGrid = document.getElementById("dicasGrid");
  dicasGrid.innerHTML = DICAS.map(function(d){ return '<div class="dica-card">"' + d + '"</div>'; }).join("");

  /* ============ ANALISADOR DE COMPOSIÇÃO — CHEAT SHEET AVANÇADA ============ */
  const ROLE_LABELS = { top:"TOP", jungle:"JUNGLE", mid:"MID", adc:"ADC", support:"SUPPORT" };
  const teamState = { my: {top:null,jungle:"Nidalee",mid:null,adc:null,support:null}, enemy: {top:null,jungle:null,mid:null,adc:null,support:null} };

  const cheatBuilderRoot = document.getElementById("cheatBuilderRoot");
  function slotHtml(side, role){
    const val = teamState[side][role];
    const locked = side === "my" && role === "jungle";
    const icon = val ? champIcon(val) : null;
    return '<div class="team-slot" data-side="' + side + '" data-role="' + role + '">'
      + '<span class="team-slot-label">' + ROLE_LABELS[role] + '</span>'
      + (locked
        ? '<div class="slot-filled"><img src="' + championIcon("Nidalee") + '" onerror="this.style.display=\'none\'" alt=""><span>Nidalee (você)</span></div>'
        : (val
          ? '<div class="slot-filled">' + (icon ? '<img src="' + icon + '" alt="">' : '') + '<span>' + esc(val) + '</span><button type="button" class="slot-clear" data-side="' + side + '" data-role="' + role + '">✕</button></div>'
          : '<div class="slot-search"><input type="text" placeholder="Pesquisar campeão..." data-side="' + side + '" data-role="' + role + '"><ul class="matchup-list slot-results"></ul></div>'))
      + '</div>';
  }
  function renderTeamSlots(){
    const roles = ["top","jungle","mid","adc","support"];
    cheatBuilderRoot.innerHTML =
      '<div class="team-columns">'
      + '<div class="team-col"><h4 class="team-col-title">🩵 Meu time</h4>' + roles.map(function(r){ return slotHtml("my", r); }).join("") + '</div>'
      + '<div class="team-col"><h4 class="team-col-title">🔺 Time inimigo</h4>' + roles.map(function(r){ return slotHtml("enemy", r); }).join("") + '</div>'
      + '</div>'
      + '<button type="button" class="btn" id="analyzeBtn" style="margin-top:22px;">🔮 Analisar partida</button>'
      + '<div id="compositionAnalysis"></div>';
    cheatBuilderRoot.querySelectorAll(".slot-search input").forEach(function(input){
      const resultsEl = input.parentElement.querySelector(".slot-results");
      attachChampionSearch(input, resultsEl, CHAMPION_NAMES, function(name){
        teamState[input.dataset.side][input.dataset.role] = name;
        renderTeamSlots();
      });
    });
  }
  cheatBuilderRoot.addEventListener("click", function(e){
    const clearBtn = e.target.closest(".slot-clear");
    if(clearBtn){ teamState[clearBtn.dataset.side][clearBtn.dataset.role] = null; renderTeamSlots(); return; }
    if(e.target.id === "analyzeBtn"){ renderAnalysis(); }
  });
  renderTeamSlots();

  function filledCount(side){
    return Object.keys(teamState[side]).filter(function(r){ return !!teamState[side][r]; }).length;
  }
  function tagCount(side, tag){
    return Object.keys(teamState[side]).reduce(function(sum, r){
      const name = teamState[side][r];
      if(!name) return sum;
      const c = CHAMPIONS[name];
      return sum + (c && c.tags.indexOf(tag) !== -1 ? 1 : 0);
    }, 0);
  }
  function renderAnalysis(){
    const out = document.getElementById("compositionAnalysis");
    if(filledCount("my") < 2 || filledCount("enemy") < 2){
      out.innerHTML = '<p class="phase-intro" style="margin-top:18px;">Preencha pelo menos alguns campeões dos dois times pra gerar a análise. Quanto mais completo, melhor a leitura.</p>';
      return;
    }
    const insights = [];
    const myAp = tagCount("my","ap"), myAd = tagCount("my","ad");
    const myEngage = tagCount("my","engage"), myTank = tagCount("my","tank");
    const enEngage = tagCount("enemy","engage"), enDive = tagCount("enemy","dive"), enMobi = tagCount("enemy","mobilidade");
    const enJungle = teamState.enemy.jungle;

    if(myAp >= 3) insights.push({c:"🟢", t:"Seu time tem bastante dano mágico — priorize itens mágicos no inimigo e evite lutas onde ele resiste fácil a esse tipo de dano."});
    if(myAd >= 3) insights.push({c:"🟢", t:"Seu time é majoritariamente físico — cuidado com tanques de armadura alta do lado inimigo."});
    if(myTank === 0) insights.push({c:"🔴", t:"Seu time tem pouca frontline — evite entrar em teamfight primeiro, procure flanquear com o combo."});
    if(enEngage + enDive >= 3) insights.push({c:"🔴", t:"O time inimigo tem muito engajamento — jogue mais cauteloso em pick e evite ficar isolada."});
    if(enJungle){
      const m = MATCHUPS[enJungle];
      if(m) insights.push({c: m.danger === "alto" ? "🔴" : m.danger === "baixo" ? "🟢" : "🟡", t: "Jungler inimigo (" + enJungle + "): " + m.strategy[0]});
    }
    if(enMobi >= 3) insights.push({c:"🟡", t:"O time inimigo tem muita mobilidade — tenha cuidado ao tentar perseguir alvos, prefira pegar quem ficar isolado."});
    insights.push({c:"🔵", t:"Priorize objetivos onde seu time tem prioridade de lane, e use a lança pra confirmar visão antes de contestar."});
    insights.push({c:"🟣", t:"Onde jogar: com esse cenário, foque em farmar vantagem cedo e procurar ganks nas lanes com maior prioridade, alternando forma humana/puma conforme a distância do alvo."});

    out.innerHTML = '<div class="analysis-box"><h4 style="margin-top:0;">🔮 Análise da partida</h4>'
      + insights.map(function(i){ return '<div class="analysis-line"><span>' + i.c + '</span><p>' + i.t + '</p></div>'; }).join("")
      + '</div>';
  }

  /* ============ CHECKLIST DE OBSERVAÇÃO ============ */
  const SCOUT_EXPLANATIONS = [
    "Compare os dois junglers no Analisador acima — quem tem clear mais rápido e mais dano cedo costuma sair na frente.",
    "Junglers com habilidades em área (como Raptors/Krugs favoráveis) limpam mais rápido — isso libera tempo pra gankar antes.",
    "Veja o matchup do jungler inimigo: dificuldade alta no Analisador normalmente significa que ele consegue invadir você com segurança.",
    "Olhe as lanes: quem empurra mais rápido ou tem mais dano cedo costuma ter prioridade pra ir ajudar em outro lugar.",
    "Lanes com pouca mobilidade de fuga (sem dash/flash cedo) são mais fáceis de gankar com sucesso.",
    "Composições com muito dano mágico ou físico consistente tendem a escalar melhor pro late game — fique de olho nisso na análise.",
    "A maior ameaça geralmente é quem tem mais engajamento ou mobilidade no time inimigo — o Analisador já aponta isso.",
    "Priorize o objetivo onde seu time tem mais prioridade de lane ou já está com vantagem numérica.",
    "Volte no Analisador da Jungle e veja qual matchup individual está pior avaliado (dificuldade alta) pra pedir ajuda no chat.",
    "Pense no último lugar onde ele foi visto e na direção do desaparecimento — geralmente ele está pathing pro lado oposto.",
    "A lane com prioridade e sem visão do lado inimigo é normalmente a mais segura pra gankar primeiro.",
    "Coloque visão nas entradas da sua jungle e nas moitas do rio — são os pontos mais usados pra invasão.",
    "Só contest o dragão com visão do time inimigo e prioridade de lane — objetivo sem visão costuma virar troca ruim.",
    "As Vastilarvas valem pressão, mas não valem morrer se um dragão real estiver sendo disputado ao mesmo tempo.",
    "Não lute se o time inimigo tem mais engajamento, se você não tem visão do jungler dele, ou se está sozinha sem escape."
  ];
  const scoutRoot = document.getElementById("scoutChecklist");
  if(scoutRoot){
    scoutRoot.innerHTML = SCOUT_CHECKLIST.map(function(q, i){
      return '<div class="scout-item" data-idx="' + i + '">'
        + '<div class="scout-item-head"><span class="scout-box"></span><span class="scout-text">' + q + '</span></div>'
        + '<p class="scout-explain">' + (SCOUT_EXPLANATIONS[i] || "") + '</p>'
        + '</div>';
    }).join("");
    scoutRoot.addEventListener("click", function(e){
      const item = e.target.closest(".scout-item");
      if(!item) return;
      item.classList.toggle("open");
    });
  }

  /* ============ TRIBUNAL DAS SKINS (com splash real) ============ */
  let skinRatings = loadJSON(STORE_KEYS.skins, {});
  const skinsGrid = document.getElementById("skinsGrid");
  const VERDICTS = { 1: "Pode devolver para a loja.", 2: "Não me convenceu.", 3: "Até que vai.", 4: "Muito bonita.", 5: "PERFEITA." };

  function starsMarkup(rating, size){
    let html = "";
    for(let i=1;i<=5;i++){
      html += '<span style="display:inline-flex;">' + STAR_SVG.replace("<svg ", '<svg style="width:' + size + 'px;height:' + size + 'px;color:' + (i<=rating ? "var(--gold-500)" : "var(--line)") + ';" ') + '</span>';
    }
    return html;
  }

  function renderSkins(){
    skinsGrid.innerHTML = SKINS.map(function(s){
      const rating = skinRatings[s.name] || 0;
      const starButtons = [1,2,3,4,5].map(function(n){
        return '<button class="star-btn' + (n<=rating ? ' filled' : '') + '" data-skin="' + encodeURIComponent(s.name) + '" data-value="' + n + '" aria-label="Dar nota ' + n + '">' + STAR_SVG + '</button>';
      }).join("");
      return '<div class="skin-card" data-open="' + encodeURIComponent(s.name) + '">'
        + '<div class="skin-visual"><img src="' + loadingUrl(s.num) + '" alt="' + esc(s.name) + '" loading="lazy" onerror="this.onerror=null; this.src=\'' + loadingUrl(0) + '\';"></div>'
        + '<div class="skin-body">'
        + '<h4>' + s.name + '</h4>'
        + '<div class="skin-price">' + (s.price ? s.price + " RP" : "gratuita") + ' · ' + s.year + '</div>'
        + '<div class="stars" data-stars-for="' + encodeURIComponent(s.name) + '">' + starButtons + '</div>'
        + '<div class="skin-verdict">' + (rating ? VERDICTS[rating] : "") + '</div>'
        + '</div></div>';
    }).join("");
    updateTribunalStats();
  }

  function setRating(name, value){
    skinRatings[name] = value;
    saveJSON(STORE_KEYS.skins, skinRatings);
    renderSkins();
    renderRanking();
    if(typeof checkFinalUnlock === "function") checkFinalUnlock();
  }

  skinsGrid.addEventListener("click", function(e){
    const starBtn = e.target.closest(".star-btn");
    if(starBtn){
      e.stopPropagation();
      const name = decodeURIComponent(starBtn.dataset.skin);
      setRating(name, parseInt(starBtn.dataset.value, 10));
      return;
    }
    const card = e.target.closest(".skin-card");
    if(card){ openJudgment(decodeURIComponent(card.dataset.open)); }
  });

  function updateTribunalStats(){
    const names = SKINS.map(function(s){ return s.name; });
    const judged = names.filter(function(n){ return skinRatings[n]; });
    document.getElementById("statJudged").textContent = judged.length + "/" + names.length;
    if(judged.length){
      const avg = judged.reduce(function(sum, n){ return sum + skinRatings[n]; }, 0) / judged.length;
      document.getElementById("statAvg").textContent = avg.toFixed(1) + " ★";
      let favName = judged[0], favVal = skinRatings[favName];
      judged.forEach(function(n){ if(skinRatings[n] > favVal){ favVal = skinRatings[n]; favName = n; } });
      document.getElementById("statFav").textContent = favName;
    } else {
      document.getElementById("statAvg").textContent = "—";
      document.getElementById("statFav").textContent = "—";
    }
  }

  function renderRanking(){
    const rankBox = document.getElementById("rankingList");
    const rated = SKINS.filter(function(s){ return skinRatings[s.name]; })
      .sort(function(a,b){
        const diff = skinRatings[b.name] - skinRatings[a.name];
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
    if(!rated.length){
      rankBox.innerHTML = '<p style="color:var(--ink-soft); font-size:.9rem;">Nenhuma skin julgada ainda — comece dando notas lá em cima. ♡</p>';
      return;
    }
    rankBox.innerHTML = rated.map(function(s, i){
      const podium = i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
      return '<div class="rank-row"><span class="rank-pos">' + podium + (podium?"":(i+1)) + '</span>'
        + '<img class="rank-thumb" src="' + loadingUrl(s.num) + '" alt="">'
        + '<span class="rank-name">' + s.name + '</span><span class="rank-stars">' + starsMarkup(skinRatings[s.name], 15) + '</span></div>';
    }).join("");
  }

  /* ---------- JUDGMENT MODAL ---------- */
  const overlay = document.getElementById("judgmentOverlay");
  const judgmentClose = document.getElementById("judgmentClose");
  let currentJudgmentSkin = null;

  function openJudgment(name){
    currentJudgmentSkin = name;
    const skin = SKINS.find(function(s){ return s.name === name; });
    document.getElementById("judgmentSkinName").textContent = name;
    document.getElementById("judgmentResult").textContent = "";
    document.getElementById("judgmentSplash").innerHTML = skin ? '<img src="' + splashUrl(skin.num) + '" alt="" onerror="this.onerror=null; this.src=\'' + splashUrl(0) + '\';">' : "";
    const rating = skinRatings[name] || 0;
    renderJudgmentStars(rating);
    overlay.classList.add("show");
  }
  function renderJudgmentStars(rating){
    const starsEl = document.getElementById("judgmentStars");
    starsEl.innerHTML = [1,2,3,4,5].map(function(n){
      return '<button class="star-btn' + (n<=rating ? ' filled' : '') + '" data-value="' + n + '" aria-label="Dar nota ' + n + '">' + STAR_SVG + '</button>';
    }).join("");
  }
  document.getElementById("judgmentStars").addEventListener("click", function(e){
    const btn = e.target.closest(".star-btn");
    if(!btn || !currentJudgmentSkin) return;
    const value = parseInt(btn.dataset.value, 10);
    setRating(currentJudgmentSkin, value);
    renderJudgmentStars(value);
    document.getElementById("judgmentResult").textContent = "VEREDITO REGISTRADO — " + VERDICTS[value];
  });
  judgmentClose.addEventListener("click", function(){ overlay.classList.remove("show"); });
  overlay.addEventListener("click", function(e){ if(e.target === overlay) overlay.classList.remove("show"); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") overlay.classList.remove("show"); });

  renderSkins();
  renderRanking();

  /* ============ CORREÇÃO AO VIVO DOS ASSETS DA NIDALEE ============
     Os nomes reais dos arquivos de ícone (habilidades) e os números
     reais de cada skin no Data Dragon nem sempre batem com uma lista
     montada manualmente. Pra garantir que NENHUMA arte fique quebrada,
     buscamos os dados oficiais direto da API da Riot (roda no
     navegador de quem visita, sem precisar de backend) e corrigimos
     os ícones/números na hora, sem precisar readivinhar nada. Se a
     busca falhar (ex: sem internet), os fallbacks onerror() acima já
     seguram qualquer imagem que não carregar. */
  function normalizeSkinName(s){
    return s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/nidalee/g, "")
      .replace(/[^a-z0-9]/g, "");
  }
  fetch(DD_CDN + "/data/en_US/champion/Nidalee.json")
    .then(function(res){ if(!res.ok) throw new Error("ddragon offline"); return res.json(); })
    .then(function(json){
      const champ = json && json.data && json.data.Nidalee;
      if(!champ) return;

      /* ---- corrige ícones de P/Q/W/E/R com os nomes reais de arquivo ---- */
      if(champ.passive && champ.passive.image && champ.passive.image.full){
        const pAbility = ABILITIES.find(function(a){ return a.key === "P"; });
        if(pAbility) pAbility.icon = DD_IMG + "/passive/" + champ.passive.image.full;
      }
      if(Array.isArray(champ.spells)){
        const order = ["Q", "W", "E", "R"];
        champ.spells.forEach(function(spell, i){
          const key = order[i];
          const ability = ABILITIES.find(function(a){ return a.key === key; });
          if(ability && spell.image && spell.image.full){
            ability.icon = DD_IMG + "/spell/" + spell.image.full;
          }
        });
      }
      renderAbilityGrid();
      const abilityIconLookup = {};
      ABILITIES.forEach(function(a){ abilityIconLookup[a.key] = a.icon; });
      Object.keys(ABILITY_ICON).forEach(function(k){ ABILITY_ICON[k] = abilityIconLookup[k] || ABILITY_ICON[k]; });
      renderCombos();

      /* ---- corrige o "num" de cada skin usando os dados reais ---- */
      if(Array.isArray(champ.skins)){
        const byNormName = {};
        champ.skins.forEach(function(sk){ byNormName[normalizeSkinName(sk.name)] = sk.num; });
        SKINS.forEach(function(s){
          if(s.num === 0) return; // skin clássica sempre é 0, não precisa corrigir
          const norm = normalizeSkinName(s.name);
          if(byNormName[norm] !== undefined) s.num = byNormName[norm];
        });
      }
      renderSkins();
    })
    .catch(function(){ /* offline ou bloqueado — segue com os fallbacks onerror já ativos */ });

  /* ============ EASTER EGG ============ */
  const toast = document.getElementById("egg-toast");
  let toastTimer = null;
  function showEggToast(msg){
    if(!msg) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove("show"); }, 3200);
  }

  /* ---------- Sistema de segredos (8 no total) ---------- */
  let secretsFound = loadJSON(STORE_KEYS.secrets, {});
  const secretCounter = document.getElementById("secretCounter");
  const secretCounterVal = document.getElementById("secretCounterVal");
  const secretCounterTotal = document.getElementById("secretCounterTotal");
  if(secretCounterTotal) secretCounterTotal.textContent = TOTAL_SECRETS;

  function foundCount(){ return Object.keys(secretsFound).filter(function(k){ return secretsFound[k]; }).length; }
  function updateSecretCounter(){
    if(secretCounterVal) secretCounterVal.textContent = foundCount();
    if(secretCounter && foundCount() > 0) secretCounter.classList.add("show");
  }

  function registerSecret(id){
    const def = SECRETS[id];
    if(!def) return;
    if(secretsFound[id]){
      showEggToast(def.repeat);
      return;
    }
    secretsFound[id] = true;
    saveJSON(STORE_KEYS.secrets, secretsFound);
    updateSecretCounter();
    showEggToast(def.discover);
    checkFinalUnlock();
  }

  document.querySelectorAll("[data-egg]").forEach(function(el){
    el.addEventListener("click", function(e){
      e.stopPropagation();
      registerSecret(el.dataset.egg);
    });
  });

  if(heroSplash){
    heroSplash.style.cursor = "pointer";
    heroSplash.addEventListener("dblclick", function(){ registerSecret("splash"); });
  }

  const tribunalSection = document.getElementById("tribunal");
  const alertObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        alertObserver.disconnect();
        setTimeout(function(){ registerSecret("tribunalAlert"); }, 1800);
      }
    });
  }, {threshold:.4});
  if(tribunalSection) alertObserver.observe(tribunalSection);

  updateSecretCounter();

  /* ---------- Condição de desbloqueio final ---------- */
  let finalUnlockShown = false;
  function tribunalComplete(){
    return SKINS.every(function(s){ return !!skinRatings[s.name]; });
  }
  function academyComplete(){
    const done = Object.keys(trainingState).filter(function(k){ return trainingState[k]; }).length;
    return done >= TOTAL_TASKS;
  }
  function checkFinalUnlock(){
    if(finalUnlockShown) return;
    if(foundCount() < TOTAL_SECRETS) return;
    if(!academyComplete()) return;
    if(!tribunalComplete()) return;
    if(!spearWon) return;
    finalUnlockShown = true;
    const overlay = document.getElementById("finalUnlockOverlay");
    if(overlay){
      spawnBurst(24);
      setTimeout(function(){ overlay.classList.add("show"); }, 400);
    }
  }
  const finalUnlockOverlay = document.getElementById("finalUnlockOverlay");
  const finalUnlockClose = document.getElementById("finalUnlockClose");
  if(finalUnlockClose) finalUnlockClose.addEventListener("click", function(){ finalUnlockOverlay.classList.remove("show"); });
  if(finalUnlockOverlay) finalUnlockOverlay.addEventListener("click", function(e){ if(e.target === finalUnlockOverlay) finalUnlockOverlay.classList.remove("show"); });

  /* ============ FLIPERAMA DA NIDALEE (MINI GAME — ARCADE) ============
     Item 3 do briefing: virou um fliperama de verdade. Cada rodada
     solta vários camps fugindo pela arena — acertar a lança neles dá
     ponto e combo; acertar um coração decoy tira uma vida. 5 rodadas,
     dificuldade sobe, vidas e combo salvos só durante a partida (o
     "já venceu uma vez" continua salvo no navegador, igual antes). */
  let spearWon = loadJSON(STORE_KEYS.spear, false);
  const arcadeRoot = document.getElementById("arcadeRoot");
  const ARCADE_TARGET_CAMPS = ["blue","gromp","wolves","raptors","red","krugs","scuttle","dragon","herald","grubs"];

  if(arcadeRoot){
    arcadeRoot.innerHTML =
      '<div class="spear-game">'
      + '<div class="spear-hud">'
      + '<div class="spear-score">Pontos: <b id="arcScore">0</b> <span style="opacity:.6; font-weight:600;">· combo x<span id="arcCombo">1</span></span></div>'
      + '<div class="arcade-lives" id="arcLives"></div>'
      + '<div class="spear-dots" id="arcRoundDots"></div>'
      + '<button type="button" class="btn btn-sm btn-ghost" id="arcReset">Reiniciar</button>'
      + '</div>'
      + '<div class="arcade-timerbar"><div class="arcade-timerbar-inner" id="arcTimerBar"></div></div>'
      + '<div class="spear-arena" id="arcArena" role="button" aria-label="Arena do fliperama — toque nos alvos"></div>'
      + '<div class="spear-message" id="arcMessage">Toque em "Começar" pra jogar.</div>'
      + '<div style="text-align:center; margin-top:14px;"><button type="button" class="btn" id="arcStart">▶ Começar rodada 1</button></div>'
      + '</div>';
  }

  const arcArena = document.getElementById("arcArena");
  const arcScoreEl = document.getElementById("arcScore");
  const arcComboEl = document.getElementById("arcCombo");
  const arcLivesEl = document.getElementById("arcLives");
  const arcRoundDotsEl = document.getElementById("arcRoundDots");
  const arcTimerBar = document.getElementById("arcTimerBar");
  const arcMessage = document.getElementById("arcMessage");
  const arcStartBtn = document.getElementById("arcStart");
  const arcResetBtn = document.getElementById("arcReset");

  const ARC_LIVES_MAX = 3;
  let arcState = null; // criado em startArcadeGame

  function renderArcLives(){
    if(!arcLivesEl || !arcState) return;
    let html = "";
    for(let i=1;i<=ARC_LIVES_MAX;i++){ html += (i<=arcState.lives ? HEART_SVG : LEAF_SVG.replace('fill="currentColor"', 'fill="none" stroke="currentColor" stroke-width="1.5"')); }
    arcLivesEl.innerHTML = html;
  }
  function renderArcRoundDots(){
    if(!arcRoundDotsEl) return;
    let html = "";
    for(let i=1;i<=SPEAR_ROUNDS.length;i++){ html += '<span class="' + (arcState && i < arcState.round ? "hit" : "") + '"></span>'; }
    arcRoundDotsEl.innerHTML = html;
  }

  function spawnSpearBurst(x, y, color){
    if(!arcArena) return;
    for(let i=0;i<10;i++){
      const b = document.createElement("div");
      b.className = "spear-burst";
      if(color) b.style.background = color;
      b.style.left = x + "px";
      b.style.top = y + "px";
      const angle = (Math.PI * 2 * i) / 10;
      b.style.setProperty("--dx", Math.cos(angle) * 40 + "px");
      arcArena.appendChild(b);
      setTimeout(function(){ b.remove(); }, 650);
    }
  }
  function comboPop(text){
    if(!arcArena) return;
    const el = document.createElement("div");
    el.className = "arcade-combo-pop";
    el.textContent = text;
    el.style.left = (30 + Math.random()*40) + "%";
    el.style.top = "40%";
    arcArena.appendChild(el);
    setTimeout(function(){ el.remove(); }, 750);
  }

  function stopArcadeTimers(){
    if(!arcState) return;
    clearInterval(arcState.tickId);
    arcState.entities.forEach(function(e){ if(e.moveId) clearInterval(e.moveId); });
  }

  function placeEntity(el){
    if(!arcArena) return;
    const w = arcArena.clientWidth, h = arcArena.clientHeight, size = 56, pad = 12;
    const x = pad + Math.random() * Math.max(1, w - size - pad*2);
    const y = pad + Math.random() * Math.max(1, h - size - pad*2);
    el.style.left = x + "px";
    el.style.top = y + "px";
  }
  function moveEntityRandomly(el, speed){
    return setInterval(function(){
      if(!arcArena || !el.isConnected) return;
      const w = arcArena.clientWidth, h = arcArena.clientHeight, size = 56, pad = 12;
      const curX = parseFloat(el.style.left) || 0, curY = parseFloat(el.style.top) || 0;
      const dx = (Math.random() - 0.5) * 90 * speed, dy = (Math.random() - 0.5) * 90 * speed;
      const nx = Math.min(Math.max(curX + dx, pad), Math.max(pad, w - size - pad));
      const ny = Math.min(Math.max(curY + dy, pad), Math.max(pad, h - size - pad));
      el.style.left = nx + "px";
      el.style.top = ny + "px";
    }, 850);
  }

  function endRun(won){
    stopArcadeTimers();
    if(arcArena) arcArena.innerHTML = "";
    if(won){
      arcMessage.textContent = spearWon ? SPEAR_WIN_REPLAY : SPEAR_WIN_FIRST;
      if(!spearWon){ spearWon = true; saveJSON(STORE_KEYS.spear, true); checkFinalUnlock(); }
      if(arcStartBtn){ arcStartBtn.textContent = "▶ Jogar de novo"; arcStartBtn.style.display = "inline-flex"; }
    } else {
      arcMessage.textContent = "GAME OVER — sem vidas. Bora tentar de novo?";
      if(arcStartBtn){ arcStartBtn.textContent = "▶ Tentar de novo"; arcStartBtn.style.display = "inline-flex"; }
    }
    arcState = null;
  }

  function startRound(roundIdx){
    const cfg = SPEAR_ROUNDS[roundIdx];
    arcState.round = cfg.round;
    arcState.timeLeft = cfg.time;
    arcState.entities = [];
    renderArcRoundDots();
    if(arcArena) arcArena.innerHTML = "";
    arcMessage.textContent = cfg.label;

    for(let i=0;i<cfg.targets;i++){
      const campId = ARCADE_TARGET_CAMPS[Math.floor(Math.random()*ARCADE_TARGET_CAMPS.length)];
      const el = document.createElement("div");
      el.className = "spear-target arcade-target";
      el.dataset.kind = "target";
      el.innerHTML = campIconSvg(campId, 56);
      arcArena.appendChild(el);
      placeEntity(el);
      const moveId = moveEntityRandomly(el, cfg.speed);
      arcState.entities.push({ el:el, moveId:moveId });
    }
    for(let i=0;i<cfg.decoys;i++){
      const el = document.createElement("div");
      el.className = "spear-target arcade-target arcade-decoy";
      el.dataset.kind = "decoy";
      el.innerHTML = HEART_SVG;
      arcArena.appendChild(el);
      placeEntity(el);
      const moveId = moveEntityRandomly(el, cfg.speed * 1.1);
      arcState.entities.push({ el:el, moveId:moveId });
    }

    arcTimerBar.style.transition = "none";
    arcTimerBar.style.width = "100%";
    requestAnimationFrame(function(){ arcTimerBar.style.transition = "width " + cfg.time + "s linear"; arcTimerBar.style.width = "0%"; });

    arcState.tickId = setInterval(function(){
      arcState.timeLeft -= 1;
      if(arcState.timeLeft <= 0){
        clearInterval(arcState.tickId);
        loseLife("o tempo acabou — os camps fugiram todos.");
      }
    }, 1000);
  }

  function loseLife(reason){
    if(!arcState) return;
    arcState.lives -= 1;
    renderArcLives();
    if(reason) comboPop(reason.indexOf("tempo") !== -1 ? "⏱️" : "💔");
    arcState.combo = 1;
    if(arcComboEl) arcComboEl.textContent = "1";
    if(arcState.lives <= 0){ endRun(false); return; }
    arcState.entities.forEach(function(e){ if(e.moveId) clearInterval(e.moveId); });
    setTimeout(function(){ if(arcState) startRound(arcState.round - 1); }, 900);
  }

  function nextRoundOrWin(){
    stopArcadeTimers();
    const idx = arcState.round; // já é 1-based na config, então idx aponta pra próxima
    if(idx >= SPEAR_ROUNDS.length){ endRun(true); return; }
    setTimeout(function(){ if(arcState) startRound(idx); }, 700);
  }

  function hitEntity(el){
    if(!arcState || !el || el.classList.contains("hit-anim")) return;
    const rect = el.getBoundingClientRect();
    const arenaRect = arcArena.getBoundingClientRect();
    const cx = rect.left - arenaRect.left + rect.width/2, cy = rect.top - arenaRect.top + rect.height/2;
    if(el.dataset.kind === "decoy"){
      spawnSpearBurst(cx, cy, "#E79CC0");
      arcMessage.textContent = SPEAR_DECOY_HIT_MESSAGE;
      el.classList.add("hit-anim");
      setTimeout(function(){ el.remove(); }, 300);
      loseLife("decoy");
      return;
    }
    spawnSpearBurst(cx, cy, "#E3C275");
    el.classList.add("hit-anim");
    const entryIdx = arcState.entities.findIndex(function(e){ return e.el === el; });
    if(entryIdx !== -1){ clearInterval(arcState.entities[entryIdx].moveId); arcState.entities.splice(entryIdx, 1); }
    setTimeout(function(){ el.remove(); }, 300);
    arcState.combo += 1;
    if(arcComboEl) arcComboEl.textContent = String(arcState.combo);
    arcState.score += 10 * arcState.combo;
    if(arcScoreEl) arcScoreEl.textContent = String(arcState.score);
    comboPop("+" + (10*arcState.combo));
    const msg = SPEAR_HIT_MESSAGES[Math.floor(Math.random()*SPEAR_HIT_MESSAGES.length)];
    arcMessage.textContent = msg;
    const remainingTargets = arcState.entities.filter(function(e){ return e.el.dataset.kind === "target"; }).length;
    if(remainingTargets === 0){ clearInterval(arcState.tickId); nextRoundOrWin(); }
  }

  function startArcadeGame(){
    arcState = { round: 1, lives: ARC_LIVES_MAX, score: 0, combo: 1, entities: [], tickId: null, timeLeft: 0 };
    if(arcScoreEl) arcScoreEl.textContent = "0";
    if(arcComboEl) arcComboEl.textContent = "1";
    renderArcLives();
    if(arcStartBtn) arcStartBtn.style.display = "none";
    startRound(0);
  }

  if(arcArena){
    arcArena.addEventListener("pointerdown", function(e){
      const el = e.target.closest(".arcade-target");
      if(el) hitEntity(el);
      else if(arcState){ arcState.combo = 1; if(arcComboEl) arcComboEl.textContent = "1"; }
    });
  }
  if(arcStartBtn) arcStartBtn.addEventListener("click", startArcadeGame);
  if(arcResetBtn) arcResetBtn.addEventListener("click", function(){
    stopArcadeTimers();
    if(arcArena) arcArena.innerHTML = "";
    arcState = null;
    if(arcStartBtn){ arcStartBtn.style.display = "inline-flex"; arcStartBtn.textContent = "▶ Começar rodada 1"; }
    if(arcMessage) arcMessage.textContent = 'Toque em "Começar" pra jogar.';
    renderArcRoundDots();
  });
  renderArcRoundDots();

  /* ============ SCROLL REVEAL ============ */
  const revealTargets = document.querySelectorAll(".card, .ability-card, .combo-card, .skin-card, .gloss-item, .day-item, .level-card, .camp-card");
  if("IntersectionObserver" in window){
    const io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.style.transition = "opacity .5s ease, transform .5s ease";
          e.target.style.opacity = "1";
          e.target.style.transform = "translateY(0)";
          io.unobserve(e.target);
        }
      });
    }, {threshold:.12});
    revealTargets.forEach(function(t){
      t.style.opacity = "0";
      t.style.transform = "translateY(10px)";
      io.observe(t);
    });
  }

})();
