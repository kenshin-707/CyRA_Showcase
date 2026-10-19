/**
 * CYRA CTF — "Grand Escape" Closing Ceremony Experience
 * -----------------------------------------------------------------------------
 * Aesthetic: Twilight Broadcast × Tactical Shrine Interface × Rain-Lit Tokyo
 * Features:
 * - 3-Act dynamic motion arc matching RADWIMPS ft. Toko Miura "Grand Escape"
 * - 4 Crossfading Background Atmosphere States: Dawn, Dusk, Night, Bloom
 * - Strict semantic color palette (Gold=1st, Silver=2nd, Bronze=3rd, Cyan=Telemetry, Red=Unbroken)
 * - 3-Face typography system with clamp() fluid scaling
 * - Hairline HUD corner brackets and base card primitive with 4 variants
 * - Terminal-style typing reveal for winner reveals
 * - Redesigned Segmented Credential Strip Component (ID-badge architecture)
 * - Exactly ONE screen-wide God Ray pulse for 1st place champion reveal
 * - Glitch budget: Exactly 2 uses maximum in entire ceremony
 * - Zero raw emojis — full line/duotone vector icon set
 * - Responsive 2/3-column credits stream preventing any viewport overflow
 * - Compressed high-impact category showcase maintaining 100% data fidelity
 * - Night / locked-terminal theme for The Untouchables
 * - Prefers-reduced-motion compliance and WCAG AA contrast
 */

class CyraOutroPresentation {
  constructor() {
    this.currentSlideIndex = 0;
    this.slides = [];
    this.isPlaying = false;
    this.autoAdvanceTimer = null;
    this.creditsHoldTimer = null;
    this.untouchablesHoldTimer = null;
    this.soundEnabled = true;
    this.audioPlayer = null;
    this.data = null;
    this.timelineAnimFrame = null;
    this.creditsAnimFrame = null;
    this.untouchablesAnimFrame = null;
    this.typingTimer = null;
    this.isAudioSeeking = false;
    this.transitionTimeout = null;
    this.isTransitioning = false;

    this.init();
  }

  async init() {
    await this.fetchData();
    this.buildSlideSequence();
    this.renderSlides();
    this.bindEvents();
    this.goToSlide(0, false);
  }

  async fetchData() {
    if (window.__CYRA_DATA__ && window.__CYRA_DATA__.outro) {
      this.data = window.__CYRA_DATA__.outro;
      return;
    }
    try {
      const res = await fetch("./data/outro-data.json");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.data = json.data;
        }
      }
    } catch (e) {
      console.warn("Outro data fallback:", e);
    }
  }

  /* ------------------------------------------------------------------
   * Audio Engine & Audio-Duration Sync
   * ------------------------------------------------------------------ */
  startThemeSong() {
    if (!this.soundEnabled) return;

    if (!this.audioPlayer) {
      const audioSrc = this.data?.ceremony_audio || "./assets/audio/ceremony_bgm.mp3";
      this.audioPlayer = new Audio(audioSrc);
      this.audioPlayer.volume = 0.9;
      this.audioPlayer.loop = false;
      this.initAudioSync();
    }

    this.audioPlayer.play().catch(e => {
      console.warn("Audio play prevented (requires user gesture):", e);
    });
  }

  initAudioSync() {
    if (!this.audioPlayer) return;

    const setupTiming = () => {
      if (!this.audioPlayer || isNaN(this.audioPlayer.duration) || this.audioPlayer.duration <= 0) {
        this.calculateSlideTimings(339.2);
        return;
      }
      this.calculateSlideTimings(this.audioPlayer.duration);
    };

    this.audioPlayer.addEventListener("loadedmetadata", setupTiming);
    this.audioPlayer.addEventListener("durationchange", setupTiming);
    this.audioPlayer.addEventListener("canplay", setupTiming);

    if (!isNaN(this.audioPlayer.duration) && this.audioPlayer.duration > 0) {
      this.calculateSlideTimings(this.audioPlayer.duration);
    } else {
      this.calculateSlideTimings(339.2);
    }

    this.audioPlayer.addEventListener("timeupdate", () => {
      if (!this.isPlaying || this.isAudioSeeking || !this.slideTimeline || this.slideTimeline.length === 0) return;
      const curTime = this.audioPlayer.currentTime;

      // When on movie-credits or final-thanks, do not force slide changes via timeupdate.
      // Credits and final thanks manage their own smooth timing and completion.
      const currentSlideType = this.slides[this.currentSlideIndex]?.type;
      if (currentSlideType === "movie-credits" || currentSlideType === "final-thanks") {
        return;
      }

      for (let i = 0; i < this.slideTimeline.length; i++) {
        const item = this.slideTimeline[i];
        if (item.type === "final-thanks") {
          continue;
        }
        if (curTime >= item.start && curTime < item.end) {
          if (this.currentSlideIndex !== i) {
            this.goToSlide(i, true);
          }
          break;
        }
      }
    });

    this.audioPlayer.addEventListener("ended", () => {
      // Audio finished: smoothly advance from God of Blood to Movie Credits
      console.log("Ceremony theme audio concluded. Transitioning to movie credits.");
      const creditsIndex = this.slides.findIndex(s => s.type === "movie-credits");
      if (creditsIndex !== -1 && this.currentSlideIndex < creditsIndex) {
        this.goToSlide(creditsIndex, true);
      }
    });
  }

  calculateSlideTimings(totalAudioDuration = 339.2) {
    if (!this.slides || this.slides.length === 0) return;

    // The user requirement: Podium starts exactly at 4:42 in the song (4 * 60 + 42 = 282.0s)
    const PODIUM_START_TARGET = 282.0;

    // 1. Find the index where the Podium sequence begins (interstitial-top-teams)
    const podiumStartIndex = this.slides.findIndex(s => s.type === "interstitial-top-teams");
    const safePodiumIndex = podiumStartIndex !== -1 ? podiumStartIndex : Math.max(1, this.slides.length - 8);

    // Act 1 Weight Map (for slides leading up to the 4:42 Podium climax)
    const act1WeightMap = {
      "cold-open": 0.8,
      "ceremony-start": 1.0,
      "metrics": 1.1,
      "behind-scenes": 1.0,
      "ref-bloods-category": 0.75,
      "untouchables": 1.4,
      "solve-timeline": 1.2
    };

    // Calculate total weight for Act 1 slides (index 0 up to safePodiumIndex - 1)
    let totalAct1Weight = 0;
    for (let i = 0; i < safePodiumIndex; i++) {
      const s = this.slides[i];
      totalAct1Weight += act1WeightMap[s.type] || 1.0;
    }

    this.slideTimeline = [];
    let accumulatedTime = 0;

    // A. Allocate Act 1 slides so that the podium starts at EXACTLY 282.0s (4:42)
    for (let i = 0; i < safePodiumIndex; i++) {
      const s = this.slides[i];
      const weight = act1WeightMap[s.type] || 1.0;
      const dur = (weight / totalAct1Weight) * PODIUM_START_TARGET;
      this.slideTimeline.push({
        index: i,
        type: s.type,
        start: accumulatedTime,
        end: accumulatedTime + dur,
        duration: dur
      });
      accumulatedTime += dur;
    }

    // Lock accumulatedTime to exactly 282.0s at the podium start
    accumulatedTime = PODIUM_START_TARGET;

    // B. Allocate Podium, Hall of Fame (God of Blood) such that God of Blood concludes precisely with totalAudioDuration
    const hofIndex = this.slides.findIndex(s => s.type === "hall-of-fame");
    const safeHofIndex = hofIndex !== -1 ? hofIndex : safePodiumIndex;

    const climaxWeightMap = {
      "interstitial-top-teams": 4.0,
      "podium-overview": 9.0,
      "hall-of-fame": 11.0
    };

    const getClimaxWeight = (slide) => {
      if (slide.type === "reveal-top-team") {
        if (slide.rank === 1) return 8.5;
        if (slide.rank === 2) return 7.2;
        if (slide.rank === 3) return 6.5;
        return 5.5;
      }
      return climaxWeightMap[slide.type] || 6.0;
    };

    let totalClimaxWeight = 0;
    for (let i = safePodiumIndex; i <= safeHofIndex; i++) {
      totalClimaxWeight += getClimaxWeight(this.slides[i]);
    }

    const climaxTargetDuration = Math.max(10, totalAudioDuration - PODIUM_START_TARGET);

    for (let i = safePodiumIndex; i <= safeHofIndex; i++) {
      const s = this.slides[i];
      let dur;
      if (i === safeHofIndex) {
        // Hall of Fame (God of Blood) ends precisely when the song ends (totalAudioDuration)
        dur = Math.max(0, totalAudioDuration - accumulatedTime);
      } else {
        const weight = getClimaxWeight(s);
        dur = (weight / totalClimaxWeight) * climaxTargetDuration;
      }

      this.slideTimeline.push({
        index: i,
        type: s.type,
        start: accumulatedTime,
        end: accumulatedTime + dur,
        duration: dur
      });
      accumulatedTime += dur;
    }

    // Ensure accumulatedTime aligns cleanly with audio ending for the post-song sequence
    accumulatedTime = totalAudioDuration;

    // C. Allocate Movie Credits & Final Thanks (running smoothly after song finishes)
    for (let i = safeHofIndex + 1; i < this.slides.length; i++) {
      const s = this.slides[i];
      let dur = 72.0;

      if (s.type === "final-thanks") {
        dur = 10.0; // Final thank you hold screen
      }

      const isLastSlide = (i === this.slides.length - 1);
      this.slideTimeline.push({
        index: i,
        type: s.type,
        start: accumulatedTime,
        end: isLastSlide ? accumulatedTime + dur + 3600 : accumulatedTime + dur,
        duration: dur
      });
      accumulatedTime += dur;
    }
  }

  stopThemeSong(fadeSeconds = 3) {
    if (this.audioPlayer) {
      try {
        let vol = this.audioPlayer.volume;
        const fadeInterval = setInterval(() => {
          vol = Math.max(0, vol - 0.05);
          if (this.audioPlayer) this.audioPlayer.volume = vol;
          if (vol <= 0) {
            clearInterval(fadeInterval);
            if (this.audioPlayer) this.audioPlayer.pause();
          }
        }, 100);
      } catch (e) {}
    }
  }

  /* ------------------------------------------------------------------
   * Dynamic Slide Sequence Builder (Compressed & Balanced Pacing)
   * ------------------------------------------------------------------ */
  buildSlideSequence() {
    const d = this.data || {};
    this.slides = [];

    // ACT 1: Quiet Build (leading up to 4:42 Climax)
    // 1. Cold Open (Attract Screen)
    this.slides.push({ type: "cold-open" });

    // 2. Ceremony Title Card (Glitch 1 on reveal)
    this.slides.push({ type: "ceremony-start" });

    // 3. Operation Metrics (Telemetry Count-Up)
    this.slides.push({ type: "metrics" });

    // 4. Behind the Scenes (War-room HUD)
    this.slides.push({ type: "behind-scenes" });

    // 5. Individual Category Breakdown Slides (Paginated 3 challenges per slide)
    const categories = d.categories || d.category_stats || [];
    categories.forEach(cat => {
      const chals = cat.challenges || [];
      if (chals.length === 0) return;

      const chunkSize = 3;
      const totalPages = Math.ceil(chals.length / chunkSize);
      for (let i = 0; i < chals.length; i += chunkSize) {
        const chunk = chals.slice(i, i + chunkSize);
        const pageNum = Math.floor(i / chunkSize) + 1;
        this.slides.push({
          type: "ref-bloods-category",
          categoryName: cat.name,
          challenges: chunk,
          pageNum: pageNum,
          totalPages: totalPages
        });
      }
    });

    // 6. The Untouchables (Night / Locked Terminal Theme)
    this.slides.push({ type: "untouchables" });

    // 7. Solve Timeline (Chronological Submission Log)
    this.slides.push({ type: "solve-timeline" });

    // ACT 2: Rising Energy (The Climax - Starts at 4:42 in the song)
    // 8. Interstitial: "AND NOW... THE FINAL PODIUM" (Glitch 2 on kicker line)
    this.slides.push({ type: "interstitial-top-teams" });

    // 9. Individual Top Team Countdown (5th -> 4th -> 3rd -> 2nd -> 1st CHAMPION!)
    const topTeams = d.top_teams || [];
    const maxRevealRank = Math.min(5, topTeams.length);

    for (let r = maxRevealRank; r >= 1; r--) {
      const team = topTeams[r - 1];
      if (team) {
        this.slides.push({
          type: "reveal-top-team",
          rank: r,
          team: team
        });
      }
    }

    // 10. Top Teams Podium Overview (Coronation & Trophy Showcase)
    this.slides.push({ type: "podium-overview" });

    // ACT 2.5: Grand Accolade (FIRST BLOOD GOD announced AFTER the Podiums!)
    // 11. Hall of Fame (First Blood Champion & MVP Shrine)
    this.slides.push({ type: "hall-of-fame" });

    // ACT 3: End Credits & Emotional Departure
    // 12. Continuous Cinematic Movie End Credits (Authors, Staff & Mentors in single continuous roll)
    this.slides.push({ type: "movie-credits" });

    // 13. Final Thank You & Mission Accomplished (Full Bloom State, Slow Zoom)
    this.slides.push({ type: "final-thanks" });
  }

  /* ------------------------------------------------------------------
   * Atmosphere State Management (Crossfading 4 Section Boundaries)
   * ------------------------------------------------------------------ */
  updateAtmosphereState(slideType) {
    const viewport = document.getElementById("cyra-outro-viewport");
    if (!viewport) return;
    let state = "dusk";

    if (slideType === "movie-credits" || slideType.startsWith("credits-")) {
      state = "dawn"; // Soft dusk & calm pink
    } else if (slideType === "podium-overview" || slideType === "reveal-top-team" || slideType === "interstitial-top-teams" || slideType === "hall-of-fame") {
      state = "dusk"; // Climax gold & rich rays (including God of Blood accolade)
    } else if (slideType === "metrics" || slideType === "behind-scenes" || slideType === "ref-bloods-category" || slideType === "solve-timeline" || slideType === "untouchables") {
      state = "night"; // Data-dense desaturated contrast
    } else if (slideType === "final-thanks" || slideType === "ceremony-start" || slideType === "cold-open") {
      state = "bloom"; // Full bloom emotional close
    }

    viewport.setAttribute("data-bg-state", state);
  }

  /* ------------------------------------------------------------------
   * Render All Presentation Slides
   * ------------------------------------------------------------------ */
  renderSlides() {
    const d = this.data || {
      ctf_name: "CyRA CTF",
      stats: { challenges: 0, teams: 0, players: 0, solves: 0 },
      top_teams: [],
      scoreboard_teams: [],
      blood_mvps: [],
      submission_logs: [],
      untouchables: [],
      authors: [],
      staff: [],
      mentors: { faculty: [], seniors: [] }
    };

    const container = document.getElementById("cyra-outro-slides-container");
    if (!container) return;

    let html = "";

    this.slides.forEach((slide, idx) => {
      let slideContent = "";

      switch (slide.type) {
        case "cold-open":
          slideContent = `
            <div class="cyra-jp-tag">不可思議のカルテ // 終幕儀礼</div>
            <h1 class="cyra-glitch-title">${escapeHtml(d.ctf_name || "CyRA CTF")}</h1>
            <div class="cyra-sub-title">CLOSING CEREMONY // FINAL TRANSMISSION</div>
            <button type="button" class="btn-cyra btn-cyra--primary" id="btn-cold-open-start">
              <i class="fa-solid fa-play"></i> START CEREMONY (再生)
            </button>
          `;
          break;

        case "ceremony-start":
          slideContent = `
            <div class="cyra-jp-tag">作戦完了 // FINAL TRANSMISSION</div>
            <h1 class="cyra-glitch-title glitch-flicker-1">CLOSING CEREMONY</h1>
            <div class="cyra-sub-title">${escapeHtml(d.ctf_name)} — THE VERDICT</div>
            <div class="text-muted font-mono text-center" style="max-width: 650px; line-height: 1.8; font-size: 0.92rem;">
              The challenges have concluded. Flags were forged, defenses tested, and champions crowned.<br>
              <span style="color: var(--color-cyan-data);">Let us review the definitive operation telemetry.</span>
            </div>
          `;
          break;

        case "metrics":
          slideContent = `
            <div class="cyra-jp-tag">作戦戦績 // ENGAGEMENT METRICS</div>
            <h2 class="cyra-glitch-title">OPERATION METRICS</h2>
            <div class="cyra-sub-title">TELEMETRY SUMMARY</div>
            <div class="cyra-stats-grid">
              <div class="cyra-stat-card">
                <div class="cyra-stat-value" data-target="${d.stats?.challenges || 0}">0</div>
                <div class="cyra-stat-label">Challenges Hosted</div>
              </div>
              <div class="cyra-stat-card">
                <div class="cyra-stat-value" data-target="${d.stats?.teams || 0}">0</div>
                <div class="cyra-stat-label">Teams Registered</div>
              </div>
              <div class="cyra-stat-card">
                <div class="cyra-stat-value" data-target="${d.stats?.players || 0}">0</div>
                <div class="cyra-stat-label">Total Contestants</div>
              </div>
              <div class="cyra-stat-card">
                <div class="cyra-stat-value" data-target="${d.stats?.solves || 0}">0</div>
                <div class="cyra-stat-label">Flags Captured</div>
              </div>
            </div>
          `;
          break;

        case "behind-scenes":
          slideContent = `
            <div class="cyra-jp-tag">作戦管制室 // WAR ROOM TELEMETRY</div>
            <h2 class="cyra-glitch-title">BEHIND THE SCENES</h2>
            <div class="cyra-sub-title">INFRASTRUCTURE & OPERATIONS TELEMETRY</div>
            <div class="cyra-warroom-container">
              <div class="text-center text-light mb-3 font-mono" style="font-size: 0.88rem;">
                <strong>INFRASTRUCTURE STACK:</strong> 4 Worker Clusters · 60 RPS Peak Load · Dynamic Flag Validation
              </div>
              <div class="cyra-warroom-grid">
                <div class="cyra-warroom-tile">
                  <div class="cyra-warroom-icon"><i class="fa-solid fa-server"></i></div>
                  <strong class="text-light d-block mb-1">Zero Outages</strong>
                  <span class="text-muted font-mono" style="font-size: 0.82rem;">99.98% Telemetry Uptime</span>
                </div>
                <div class="cyra-warroom-tile">
                  <div class="cyra-warroom-icon"><i class="fa-solid fa-shield-virus"></i></div>
                  <strong class="text-light d-block mb-1">Defenses Tested</strong>
                  <span class="text-muted font-mono" style="font-size: 0.82rem;">Real-time Exploit Capture</span>
                </div>
                <div class="cyra-warroom-tile">
                  <div class="cyra-warroom-icon"><i class="fa-solid fa-tower-broadcast"></i></div>
                  <strong class="text-light d-block mb-1">Live SSE Feeds</strong>
                  <span class="text-muted font-mono" style="font-size: 0.82rem;">Sub-10ms Blood Broadcasts</span>
                </div>
              </div>
            </div>
          `;
          break;

        case "ref-bloods-category":
          slideContent = `
            <div class="cyra-ref-category-stage">
              <div class="cyra-jp-tag">部門別速攻賞 // CATEGORY FIRST BLOODS</div>
              <div class="cyra-ref-category-header">
                ${escapeHtml((slide.categoryName || "CATEGORY").toUpperCase())}
                ${slide.totalPages > 1 ? `<span class="cyra-page-badge">(${slide.pageNum}/${slide.totalPages})</span>` : ''}
              </div>
              <div class="cyra-sub-title" style="margin-bottom: var(--space-lg);">
                SOLVE MASTERY &amp; FIRST BLOOD STANDINGS
              </div>

              <div class="cyra-ref-cards-grid">
                ${(slide.challenges || []).map(chal => {
                  const firstSolver = chal.first_blood?.solver_name || (typeof chal.first_blood === 'string' ? chal.first_blood : null);
                  const secondSolver = chal.second_blood?.solver_name || (typeof chal.second_blood === 'string' ? chal.second_blood : null);
                  const thirdSolver = chal.third_blood?.solver_name || (typeof chal.third_blood === 'string' ? chal.third_blood : null);
                  const pts = chal.value ?? chal.points ?? 0;
                  const solves = chal.solves_count ?? chal.solves ?? 0;

                  return `
                    <div class="cyra-ref-card">
                      <div class="cyra-ref-chal-name">${escapeHtml(chal.name)}</div>
                      <div class="cyra-ref-points-box">
                        <div class="cyra-ref-points-num" data-target="${pts}">${pts}</div>
                        <div class="cyra-ref-points-label">POINTS</div>
                      </div>
                      <div class="cyra-ref-solves-pill">
                        <i class="fa-solid fa-circle-check"></i> ${solves} SOLVES
                      </div>
                      <div class="cyra-ref-divider">
                        <span>FIRST BLOODS</span>
                      </div>
                      <div class="cyra-ref-bloods-list">
                        <div class="cyra-ref-blood-row blood-1 ${firstSolver ? '' : 'unclaimed'}">
                          <div class="cyra-ref-blood-left">
                            <i class="fa-solid fa-trophy rank-icon-1" style="color: var(--color-gold-winner);"></i>
                            <span class="cyra-ref-team-name">${escapeHtml(firstSolver || 'Unclaimed')}</span>
                          </div>
                          <span class="badge-tag--rank ${firstSolver ? 'gold' : 'ghost'}">1ST</span>
                        </div>
                        <div class="cyra-ref-blood-row blood-2 ${secondSolver ? '' : 'unclaimed'}">
                          <div class="cyra-ref-blood-left">
                            <i class="fa-solid fa-medal rank-icon-2" style="color: var(--color-silver-runnerup);"></i>
                            <span class="cyra-ref-team-name">${escapeHtml(secondSolver || 'Unclaimed')}</span>
                          </div>
                          <span class="badge-tag--rank ${secondSolver ? 'silver' : 'ghost'}">2ND</span>
                        </div>
                        <div class="cyra-ref-blood-row blood-3 ${thirdSolver ? '' : 'unclaimed'}">
                          <div class="cyra-ref-blood-left">
                            <i class="fa-solid fa-award rank-icon-3" style="color: var(--color-bronze-third);"></i>
                            <span class="cyra-ref-team-name">${escapeHtml(thirdSolver || 'Unclaimed')}</span>
                          </div>
                          <span class="badge-tag--rank ${thirdSolver ? 'bronze' : 'ghost'}">3RD</span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
          break;

        case "untouchables":
          const untouchedList = d.untouchables || [];
          slideContent = `
            <div class="cyra-jp-tag" style="color: var(--color-danger-red);"><i class="fa-solid fa-lock me-1"></i> 難攻不落 // FORTRESS LOCKDOWN</div>
            <h2 class="cyra-glitch-title" style="color: var(--color-danger-red); text-shadow: 0 0 25px rgba(239, 68, 68, 0.65);">THE UNTOUCHABLES</h2>
            <div class="cyra-sub-title" style="color: #fca5a5;">SURVIVING DEFENSES // ZERO BREACHES RECORDED</div>

            <div class="cyra-untouchables-wrapper">
              <div class="cyra-untouchables-scroll-container">
                <div class="cyra-untouchables-scroll-stream">
                  ${untouchedList.length > 0 ? untouchedList.map(u => `
                    <div class="cyra-untouchable-ref-card">
                      <div class="d-flex align-items-center gap-3">
                        <i class="fa-solid fa-shield-halved text-danger fa-lg"></i>
                        <div>
                          <div class="cyra-untouchable-name">${escapeHtml(u.name)}</div>
                          <div class="text-muted font-mono" style="font-size: 0.78rem;">CATEGORY: ${escapeHtml(u.category || 'General').toUpperCase()}</div>
                        </div>
                      </div>
                      <div class="cyra-untouchable-pts">${u.value || 0} PTS</div>
                      <div class="badge-pill--unbroken"><i class="fa-solid fa-lock"></i> 0 SOLVES // UNBREACHED</div>
                    </div>
                  `).join('') : `
                    <div class="text-center py-5 text-muted font-mono">All fortresses were breached. No untouchables remain.</div>
                  `}
                </div>
              </div>
            </div>
          `;
          break;

        case "solve-timeline":
          let logs = d.submission_logs || [];
          if (logs.length === 0) {
            logs = [{ solver_name: "Contestants", challenge_name: "CTF Challenges", value: 100, time: "00:00:00" }];
          }
          let displayLogs = [...logs];
          while (displayLogs.length < 24) {
            displayLogs = displayLogs.concat(logs);
          }

          slideContent = `
            <div class="cyra-jp-tag">作戦経過 // SUBMISSION LOG</div>
            <h2 class="cyra-glitch-title">SOLVE TIMELINE</h2>
            <div class="cyra-sub-title">CHRONOLOGICAL EXPLOIT STREAM</div>
            <div class="cyra-timeline-container" id="timeline-scroll-box">
              <div class="cyra-timeline-stream" id="timeline-stream-track">
                ${displayLogs.map(log => `
                  <div class="cyra-timeline-row">
                    <div class="cyra-timeline-left">
                      <span class="cyra-solve-dot"></span>
                      <span class="cyra-timeline-time">${escapeHtml(log.time || '00:00:00')}</span>
                      <span class="cyra-timeline-team">${escapeHtml(log.solver_name)}</span>
                      <span class="cyra-timeline-arrow">→</span>
                      <span class="cyra-timeline-chal">${escapeHtml(log.challenge_name)}</span>
                    </div>
                    <div class="cyra-timeline-pts">+${log.value || 0} PTS</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
          break;

        case "hall-of-fame":
          const mvps = d.blood_mvps || [];
          const champion = d.top_blood_champion || (mvps.length > 0 ? mvps[0] : null);

          if (!champion) {
            slideContent = `
              <div class="cyra-jp-tag">初撃神殿 // HALL OF FAME APEX</div>
              <h2 class="cyra-glitch-title">FIRST BLOOD HALL OF FAME</h2>
              <div class="cyra-sub-title">THE FASTEST BLADE IN THE REALM</div>
              <div class="text-center py-5 text-muted font-mono">No First Blood records logged.</div>
            `;
          } else {
            const champName = champion.player_name || champion.name || "Unknown";
            const champTeam = champion.team_name;
            const champBloods = champion.blood_count || 0;
            const champPoints = champion.total_blood_points || 0;
            const champCategories = champion.categories || [];

            slideContent = `
              <div class="cyra-jp-tag">初撃神殿 // HALL OF FAME APEX</div>
              <h2 class="cyra-glitch-title">FIRST BLOOD HALL OF FAME</h2>
              <div class="cyra-sub-title">MOST FIRST BLOODS CONQUERED // 最多初撃覇者</div>

              <div class="cyra-hof-container">
                <div class="cyra-hof-champion-card">
                  <div class="cyra-hof-champ-badge">
                    <i class="fa-solid fa-crown"></i> FIRST BLOOD GOD <i class="fa-solid fa-droplet text-danger"></i>
                  </div>
                  <h1 class="cyra-hof-champ-name">${escapeHtml(champName)}</h1>
                  ${champTeam ? `
                    <div class="text-light font-mono mb-2" style="font-size: 0.95rem;">
                      TEAM: <span style="color: var(--color-cyan-data);">${escapeHtml(champTeam)}</span>
                    </div>
                  ` : ''}

                  <div class="cyra-hof-champ-metrics">
                    <div class="cyra-hof-metric-box">
                      <div class="cyra-hof-metric-val" data-target="${champBloods}">0</div>
                      <div class="cyra-hof-metric-lbl">First Bloods</div>
                    </div>
                    ${champPoints > 0 ? `
                      <div class="cyra-hof-metric-box">
                        <div class="cyra-hof-metric-val" data-target="${champPoints}">0</div>
                        <div class="cyra-hof-metric-lbl">Blood Points</div>
                      </div>
                    ` : ''}
                    <div class="cyra-hof-metric-box">
                      <div class="cyra-hof-metric-val" data-target="${champCategories.length || 1}">0</div>
                      <div class="cyra-hof-metric-lbl">Categories Swept</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          break;

        case "interstitial-top-teams":
          slideContent = `
            <div class="cyra-jp-tag glitch-flicker-2">栄光の頂へ // THE ASCENT</div>
            <h1 class="cyra-glitch-title" style="font-size: clamp(2.6rem, 5.5vw, 4.2rem);">AND NOW...</h1>
            <div class="cyra-sub-title" style="font-size: clamp(1.2rem, 2.4vw, 1.8rem); color: var(--color-gold-winner);">
              THE FINAL PODIUM
            </div>
            <p class="text-muted font-mono" style="letter-spacing: 0.15em; font-size: 0.95rem;">COUNTDOWN TO THE 2026 CHAMPION</p>
          `;
          break;

        case "reveal-top-team":
          const r = slide.rank;
          const t = slide.team || { name: "Team", score: 0 };

          let rankNumText = `${r}TH PLACE`;
          let rankKanjiText = `第${r}位 // 敢闘賞 FIGHTING SPIRIT`;
          let crestIcon = '<i class="fa-solid fa-bolt"></i>';
          let prizeText = "Official Podium Certificate";
          let rankClass = "cyan";

          if (r === 1) {
            rankNumText = "1ST PLACE";
            rankKanjiText = "優勝 // 覇者 GRAND CHAMPION";
            crestIcon = '<i class="fa-solid fa-crown"></i>';
            prizeText = "1st Place Trophy & Gold Medal";
            rankClass = "gold";
          } else if (r === 2) {
            rankNumText = "2ND PLACE";
            rankKanjiText = "準優勝 // 銀賞 RUNNER-UP";
            crestIcon = '<i class="fa-solid fa-medal"></i>';
            prizeText = "2nd Place Silver Medal";
            rankClass = "silver";
          } else if (r === 3) {
            rankNumText = "3RD PLACE";
            rankKanjiText = "第3位 // 銅賞 BRONZE PODIUM";
            crestIcon = '<i class="fa-solid fa-award"></i>';
            prizeText = "3rd Place Bronze Medal";
            rankClass = "bronze";
          } else if (r === 4) {
            rankNumText = "4TH PLACE";
            rankKanjiText = "第4位 // 敢闘賞 TOP 4 ELITE";
            crestIcon = '<i class="fa-solid fa-bolt"></i>';
            prizeText = "Top 4 Merit Award";
            rankClass = "cyan";
          } else if (r === 5) {
            rankNumText = "5TH PLACE";
            rankKanjiText = "第5位 // 優秀賞 TOP 5 FINALIST";
            crestIcon = '<i class="fa-solid fa-shield-halved"></i>';
            prizeText = "Top 5 Finalist Certificate";
            rankClass = "cyan";
          }

          slideContent = `
            <div class="cyra-jp-podium-reveal rank-${r}">
              <div class="cyra-jp-podium-header">
                <span class="cyra-jp-stamp-left">堅忍不抜</span>
                <div class="cyra-jp-rank-badge rank-${r}">
                  <span class="cyra-jp-rank-num">
                    ${crestIcon} ${rankNumText}
                  </span>
                  <span class="cyra-jp-rank-kanji">${rankKanjiText}</span>
                </div>
                <span class="cyra-jp-stamp-right">電脳頂点</span>
              </div>

              <div class="cyra-jp-team-card rank-${r}">
                <div class="cyra-jp-team-crest">${crestIcon}</div>
                <h1 class="cyra-jp-team-title rank-${r}" data-team-name="${escapeHtml(t.name)}">${escapeHtml(t.name)}</h1>
                <div class="cyra-jp-team-score-row">
                  <span class="cyra-jp-score-label">FINAL SCORE // 獲得点数</span>
                  <span class="cyra-jp-team-score rank-${r}" data-score="${t.score || 0}">0 PTS</span>
                </div>
              </div>

              <!-- Segmented Credential Strip Component (ID-Badge Architecture) -->
              <div class="credential-strip">
                <div class="credential-segment">
                  <div class="credential-label"><i class="fa-solid fa-circle-check text-success"></i> TELEMETRY STATUS</div>
                  <div class="credential-val verified"><i class="fa-solid fa-shield-check"></i> VERIFIED SOLVER</div>
                </div>
                <div class="credential-segment">
                  <div class="credential-label"><i class="fa-solid fa-layer-group"></i> OFFICIAL PLACEMENT</div>
                  <div class="credential-val ${rankClass}">TOP ${r} CONTESTANT</div>
                </div>
                <div class="credential-segment">
                  <div class="credential-label"><i class="fa-solid fa-award"></i> PRIZE ALLOCATION</div>
                  <div class="credential-val ${rankClass}">${escapeHtml(prizeText)}</div>
                </div>
              </div>
            </div>
          `;
          break;

        case "podium-overview":
          const podiumTeams = d.top_teams || [];
          slideContent = `
            <div class="cyra-jp-tag">表彰台 // OFFICIAL PRIZE PODIUM</div>
            <h2 class="cyra-glitch-title">FINAL PODIUM STANDINGS</h2>
            <div class="cyra-sub-title">GLORY TO THE CHAMPIONS</div>
            <div class="cyra-podium-container">
              ${podiumTeams.length >= 1 ? `
                ${podiumTeams.length >= 2 ? `
                  <div class="cyra-podium-card cyra-podium-2">
                    <div class="cyra-podium-trophy cyra-trophy-silver"><i class="fa-solid fa-medal"></i></div>
                    <div class="cyra-podium-rank text-light">2ND PLACE</div>
                    <div class="cyra-podium-team">${escapeHtml(podiumTeams[1]?.name || '2nd Place')}</div>
                    <div class="cyra-podium-score" data-score="${podiumTeams[1]?.score || 0}">0 pts</div>
                    <span class="cyra-prize-badge badge bg-secondary text-light fw-bold"><i class="fa-solid fa-award me-1"></i> RUNNER-UP</span>
                  </div>
                ` : ''}

                <div class="cyra-podium-card cyra-podium-1">
                  <div class="cyra-podium-trophy cyra-trophy-gold"><i class="fa-solid fa-crown"></i></div>
                  <div class="cyra-podium-rank text-warning">1ST PLACE</div>
                  <div class="cyra-podium-team">${escapeHtml(podiumTeams[0]?.name || '1st Place')}</div>
                  <div class="cyra-podium-score" data-score="${podiumTeams[0]?.score || 0}">0 pts</div>
                  <span class="cyra-prize-badge badge bg-warning text-dark fw-bold"><i class="fa-solid fa-trophy me-1"></i> GRAND CHAMPION</span>
                </div>

                ${podiumTeams.length >= 3 ? `
                  <div class="cyra-podium-card cyra-podium-3">
                    <div class="cyra-podium-trophy cyra-trophy-bronze"><i class="fa-solid fa-award"></i></div>
                    <div class="cyra-podium-rank" style="color: var(--color-bronze-third) !important;">3RD PLACE</div>
                    <div class="cyra-podium-team">${escapeHtml(podiumTeams[2]?.name || '3rd Place')}</div>
                    <div class="cyra-podium-score" data-score="${podiumTeams[2]?.score || 0}">0 pts</div>
                    <span class="cyra-prize-badge badge bg-dark text-warning border border-warning fw-bold"><i class="fa-solid fa-award me-1"></i> 3RD PRIZE</span>
                  </div>
                ` : ''}
              ` : `
                <div class="text-center py-4 text-muted">No podium teams recorded.</div>
              `}
            </div>
          `;
          break;

        case "movie-credits":
          const authors = d.authors || [];
          const staff = d.staff || [];
          const faculty = d.mentors?.faculty || [];
          const seniors = d.mentors?.seniors || [];

          const renderCreditPhotoCard = (person, type) => {
            let fallbackIcon = "fa-solid fa-graduation-cap";
            let defaultRole = "Faculty Advisor";
            const badges = [];

            if (type === "author") {
              fallbackIcon = "fa-solid fa-code";
              defaultRole = "Challenge Author";
              if (person.category) badges.push({ icon: "fa-solid fa-layer-group", text: person.category });
              if (person.year_of_study) badges.push({ icon: "fa-solid fa-graduation-cap", text: person.year_of_study });
            } else if (type === "staff") {
              fallbackIcon = "fa-solid fa-user-shield";
              defaultRole = "Staff Coordinator";
              if (person.department) badges.push({ icon: "fa-solid fa-building-shield", text: person.department });
              if (person.year_of_study) badges.push({ icon: "fa-solid fa-graduation-cap", text: person.year_of_study });
            } else if (type === "faculty") {
              fallbackIcon = "fa-solid fa-graduation-cap";
              defaultRole = "Faculty Advisor";
              if (person.designation) badges.push({ icon: "fa-solid fa-award", text: person.designation });
            } else if (type === "senior") {
              fallbackIcon = "fa-solid fa-user-graduate";
              defaultRole = "Senior Mentor";
              if (person.batch) badges.push({ icon: "fa-solid fa-user-clock", text: person.batch });
            }

            const hasPhoto = Boolean(person.photo && String(person.photo).trim());

            return `
              <div class="cyra-credit-photo-card cyra-credit-card--gold cyra-credit-card--${type}">
                <div class="cyra-photo-frame-wrapper">
                  <div class="cyra-photo-frame ${hasPhoto ? '' : 'is-fallback'}">
                    ${hasPhoto ? `
                      <img class="cyra-credit-photo-img" 
                           src="${escapeHtml(String(person.photo).trim())}" 
                           alt="${escapeHtml(person.name || '')}" 
                           loading="eager"
                           onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                      <div class="cyra-photo-fallback" style="display: none;">
                        <i class="${fallbackIcon}"></i>
                      </div>
                    ` : `
                      <div class="cyra-photo-fallback">
                        <i class="${fallbackIcon}"></i>
                      </div>
                    `}
                    <div class="cyra-photo-glow-ring"></div>
                  </div>
                </div>

                <div class="cyra-credit-card-info">
                  <div class="cyra-credit-card-name">${escapeHtml(person.name || "Anonymous")}</div>
                  ${person.nickname ? `<div class="cyra-credit-card-nick">"${escapeHtml(person.nickname)}"</div>` : ''}
                  <div class="cyra-credit-card-role">${escapeHtml(person.role || defaultRole)}</div>
                  ${badges.length > 0 ? `
                    <div class="cyra-credit-card-tags">
                      ${badges.map(b => `<span class="cyra-credit-pill"><i class="${b.icon} me-1"></i>${escapeHtml(b.text)}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          };

          slideContent = `
            <div class="cyra-movie-credits-viewport" id="movie-credits-viewport">
              <div class="cyra-movie-credits-track" id="movie-credits-track">
                <!-- Opening Roster Title -->
                <div class="cyra-movie-credit-intro">
                  <div class="cyra-movie-credit-jp-tag">終幕謝辞 // PRODUCTION CREDITS</div>
                  <h1 class="cyra-movie-credit-main-title">${escapeHtml(d.ctf_name || "CYRA CTF 2026")}</h1>
                  <div class="cyra-movie-credit-sub-title">OPERATIONS & CHALLENGE ROSTER</div>
                </div>

                <!-- 1. Challenge Authors -->
                ${authors.length > 0 ? `
                  <div class="cyra-movie-credit-section">
                    <div class="cyra-movie-credit-jp-tag">問題作成 // ARCHITECTS</div>
                    <h2 class="cyra-movie-credit-header">CHALLENGE AUTHORS</h2>
                    <div class="cyra-movie-credit-divider"></div>
                  </div>
                  <div class="cyra-movie-credits-stack cyra-credits-stack--authors">
                    ${authors.map(a => renderCreditPhotoCard(a, "author")).join('')}
                  </div>
                ` : ''}

                <!-- 2. Staff & Coordinators -->
                ${staff.length > 0 ? `
                  <div class="cyra-movie-credit-section">
                    <div class="cyra-movie-credit-jp-tag">運営統括 // MANAGEMENT</div>
                    <h2 class="cyra-movie-credit-header">STAFF & COORDINATORS</h2>
                    <div class="cyra-movie-credit-divider"></div>
                  </div>
                  <div class="cyra-movie-credits-stack cyra-credits-stack--staff">
                    ${staff.map(s => renderCreditPhotoCard(s, "staff")).join('')}
                  </div>
                ` : ''}

                <!-- 3. Faculty Advisors -->
                ${faculty.length > 0 ? `
                  <div class="cyra-movie-credit-section">
                    <div class="cyra-movie-credit-jp-tag">特別感謝 // FACULTY PATRONS</div>
                    <h2 class="cyra-movie-credit-header">FACULTY ADVISORS</h2>
                    <div class="cyra-movie-credit-divider"></div>
                  </div>
                  <div class="cyra-movie-credits-stack cyra-credits-stack--faculty">
                    ${faculty.map(f => renderCreditPhotoCard(f, "faculty")).join('')}
                  </div>
                ` : ''}

                <!-- 4. Senior Mentors -->
                ${seniors.length > 0 ? `
                  <div class="cyra-movie-credit-section">
                    <div class="cyra-movie-credit-jp-tag">指導助言 // SENIOR GUIDANCE</div>
                    <h2 class="cyra-movie-credit-header">SENIOR MENTORS</h2>
                    <div class="cyra-movie-credit-divider"></div>
                  </div>
                  <div class="cyra-movie-credits-stack cyra-credits-stack--seniors">
                    ${seniors.map(sn => renderCreditPhotoCard(sn, "senior")).join('')}
                  </div>
                ` : ''}

                <!-- Closing Footer -->
                <div class="cyra-movie-credit-outro">
                  <div class="cyra-movie-credit-jp-tag">作戦完了 // MISSION CONCLUDED</div>
                  <div class="cyra-movie-credit-footer-text">THANK YOU TO ALL PARTICIPANTS & ORGANIZERS</div>
                </div>
              </div>
            </div>
          `;
          break;


        case "final-thanks":
          slideContent = `
            <div class="cyra-final-thanks-box">
              <div class="cyra-jp-tag">作戦完了 // MISSION ACCOMPLISHED</div>
              <h1 class="cyra-glitch-title" style="font-size: clamp(2.8rem, 6vw, 4.4rem);">THANK YOU FOR PLAYING</h1>
              <div class="cyra-sub-title" style="font-size: clamp(1.2rem, 2.2vw, 1.6rem); color: var(--color-gold-winner);">
                GRAND ESCAPE // 天気の子
              </div>
              <p class="text-muted font-mono" style="letter-spacing: 3px; font-size: 0.95rem; margin-bottom: 2.2rem;">
                CYRA CTF 2026 // SEE YOU NEXT SEASON
              </p>
              <div class="d-flex align-items-center justify-content-center gap-3 flex-wrap">
                <button id="btn-replay-final" class="btn-cyra btn-cyra--secondary">
                  <i class="fa-solid fa-rotate-left"></i> REPLAY TRANSMISSION
                </button>
                <a href="/" class="btn-cyra btn-cyra--ghost">
                  <i class="fa-solid fa-house"></i> RETURN TO PLATFORM
                </a>
              </div>
            </div>
          `;
          break;
      }

      html += `
        <div class="cyra-slide ${idx === 0 ? 'active' : ''}" data-slide-index="${idx}" data-slide-type="${slide.type}">
          ${slideContent}
        </div>
      `;
    });

    container.innerHTML = html;

    document.getElementById("btn-cold-open-start")?.addEventListener("click", () => {
      this.startAnimatedSequence();
    });

    document.getElementById("btn-replay-final")?.addEventListener("click", () => {
      this.goToSlide(0, true);
      if (this.audioPlayer) {
        this.audioPlayer.currentTime = 0;
        this.audioPlayer.play().catch(() => {});
      }
    });
  }

  startAnimatedSequence() {
    this.isPlaying = true;
    const playIcon = document.getElementById("btn-hud-play-icon");
    if (playIcon) {
      playIcon.classList.remove("fa-play");
      playIcon.classList.add("fa-pause");
    }
    this.startThemeSong();
    this.nextSlide();
  }

  scheduleNextSlide() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
    }

    if (!this.isPlaying) return;

    const currentSlideConfig = this.slides[this.currentSlideIndex];

    // For movie-credits, transition is handled after smooth scroll completes
    if (currentSlideConfig?.type === "movie-credits" || currentSlideConfig?.type.startsWith("credits-")) {
      return;
    }

    let allocatedDuration = 7500;
    if (this.slideTimeline && this.slideTimeline[this.currentSlideIndex]) {
      allocatedDuration = this.slideTimeline[this.currentSlideIndex].duration * 1000;
    }

    this.autoAdvanceTimer = setTimeout(() => {
      this.nextSlide();
    }, allocatedDuration);
  }

  goToSlide(targetIndex, withWipe = true) {
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= this.slides.length) targetIndex = this.slides.length - 1;

    if (this.currentSlideIndex === targetIndex && this.isTransitioning) return;
    if (this.transitionTimeout) clearTimeout(this.transitionTimeout);
    this.isTransitioning = true;

    if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
    if (this.creditsHoldTimer) clearTimeout(this.creditsHoldTimer);
    if (this.untouchablesHoldTimer) clearTimeout(this.untouchablesHoldTimer);
    if (this.timelineAnimFrame) cancelAnimationFrame(this.timelineAnimFrame);
    if (this.creditsAnimFrame) cancelAnimationFrame(this.creditsAnimFrame);
    if (this.creditsTimeUpdateHandler && this.audioPlayer) {
      this.audioPlayer.removeEventListener("timeupdate", this.creditsTimeUpdateHandler);
      this.creditsTimeUpdateHandler = null;
    }
    if (this.untouchablesAnimFrame) cancelAnimationFrame(this.untouchablesAnimFrame);
    if (this.typingTimer) clearInterval(this.typingTimer);

    // Synchronize Audio CurrentTime smoothly without backwards snap
    if (this.audioPlayer && this.slideTimeline && this.slideTimeline[targetIndex]) {
      const targetTime = this.slideTimeline[targetIndex].start;
      const audioDur = (!isNaN(this.audioPlayer.duration) && this.audioPlayer.duration > 0) ? this.audioPlayer.duration : 339.2;
      if (targetTime < audioDur) {
        if (Math.abs(this.audioPlayer.currentTime - targetTime) > 0.5) {
          this.isAudioSeeking = true;
          try {
            this.audioPlayer.currentTime = targetTime;
          } catch (e) {}
          setTimeout(() => {
            this.isAudioSeeking = false;
          }, 400);
        }
      }
    }

    this.currentSlideIndex = targetIndex;
    const slideConfig = this.slides[this.currentSlideIndex];

    // Update Atmosphere State
    if (slideConfig) {
      this.updateAtmosphereState(slideConfig.type);
    }

    // Update HUD Counter
    const counterEl = document.getElementById("cyra-hud-counter");
    if (counterEl) {
      counterEl.textContent = `${this.currentSlideIndex + 1} / ${this.slides.length}`;
    }

    const allSlideEls = document.querySelectorAll(".cyra-slide");
    const slash = document.getElementById("cyra-katana-slash");

    if (withWipe && slash) {
      slash.classList.remove("slashing");
      void slash.offsetWidth;
      slash.classList.add("slashing");
    }

    const switchDelay = (withWipe && slash) ? 180 : 0;

    this.transitionTimeout = setTimeout(() => {
      allSlideEls.forEach((slideEl, idx) => {
        if (idx === this.currentSlideIndex) {
          slideEl.classList.add("active");
          this.triggerSlideEntrance(slideEl, this.slides[idx]);
        } else {
          slideEl.classList.remove("active");
        }
      });

      this.isTransitioning = false;

      if (this.isPlaying) {
        this.scheduleNextSlide();
      }
    }, switchDelay);
  }

  nextSlide() {
    if (this.currentSlideIndex < this.slides.length - 1) {
      this.goToSlide(this.currentSlideIndex + 1, true);
    }
  }

  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.goToSlide(this.currentSlideIndex - 1, true);
    }
  }

  togglePause() {
    this.isPlaying = !this.isPlaying;
    const playIcon = document.getElementById("btn-hud-play-icon");
    if (this.isPlaying) {
      if (playIcon) {
        playIcon.classList.remove("fa-play");
        playIcon.classList.add("fa-pause");
      }
      if (this.audioPlayer && this.soundEnabled) this.audioPlayer.play().catch(() => {});
      this.scheduleNextSlide();
    } else {
      if (playIcon) {
        playIcon.classList.remove("fa-pause");
        playIcon.classList.add("fa-play");
      }
      if (this.audioPlayer) this.audioPlayer.pause();
      if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
      if (this.creditsHoldTimer) clearTimeout(this.creditsHoldTimer);
      if (this.untouchablesHoldTimer) clearTimeout(this.untouchablesHoldTimer);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    const soundIcon = document.getElementById("btn-hud-sound-icon");
    if (!this.soundEnabled) {
      if (soundIcon) {
        soundIcon.classList.remove("fa-volume-high");
        soundIcon.classList.add("fa-volume-xmark");
      }
      if (this.audioPlayer) this.audioPlayer.pause();
    } else {
      if (soundIcon) {
        soundIcon.classList.remove("fa-volume-xmark");
        soundIcon.classList.add("fa-volume-high");
      }
      if (this.audioPlayer && this.isPlaying) this.audioPlayer.play().catch(() => {});
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  triggerSlideEntrance(slideEl, slideConfig) {
    if (!slideConfig) return;

    // 1. Operation Metrics Count-up
    if (slideConfig.type === "metrics") {
      this.animateStaggeredMetrics(slideEl);
    }

    // 2. Compressed Category Cards 120ms Staggered Entrance
    if (slideConfig.type === "ref-bloods-category") {
      this.animateChallengeCards(slideEl);
    }

    // 3. Untouchables Auto-Scroll Stream
    if (slideConfig.type === "untouchables") {
      this.startUntouchablesScroll(slideEl);
    }

    // 4. Individual Top Team Reveal (Terminal Typing + Score Count-Up + Champion Climax Pulse)
    if (slideConfig.type === "reveal-top-team") {
      this.animateRevealScore(slideEl, slideConfig.rank);
    }

    // 5. Grand Podium Overview
    if (slideConfig.type === "podium-overview") {
      this.animatePodium(slideEl);
    }

    // 6. Solve Timeline Auto-Scrolling Loop
    if (slideConfig.type === "solve-timeline") {
      this.startSolveTimelineScroll(slideEl);
    }

    // 7. Hall of Fame Champion Count-up
    if (slideConfig.type === "hall-of-fame") {
      this.animateHallOfFame(slideEl);
    }

    // 8. Continuous Cinematic Movie End Credits
    if (slideConfig.type === "movie-credits") {
      this.startMovieCreditsScroll(slideEl);
    }
  }

  animateStaggeredMetrics(slideEl) {
    const cards = slideEl.querySelectorAll(".cyra-stat-card");
    cards.forEach((card, idx) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(18px)";
      setTimeout(() => {
        card.style.transition = "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 100 * (idx + 1));
    });

    const values = slideEl.querySelectorAll(".cyra-stat-value");
    values.forEach(valEl => {
      const target = parseInt(valEl.dataset.target || "0", 10);
      if (!target) return;
      this.animateCountUp(valEl, target, 1800);
    });
  }

  animateChallengeCards(slideEl) {
    const cards = slideEl.querySelectorAll(".cyra-ref-card");
    cards.forEach((card, cIdx) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(16px)";
      setTimeout(() => {
        card.style.transition = "all 0.45s cubic-bezier(0.16, 1, 0.3, 1)";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 120 * (cIdx + 1));

      const bloodRows = card.querySelectorAll(".cyra-ref-blood-row");
      bloodRows.forEach((row, rIdx) => {
        row.style.opacity = "0";
        row.style.transform = "translateX(-10px)";
        setTimeout(() => {
          row.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
          row.style.opacity = "1";
          row.style.transform = "translateX(0)";
        }, 300 + rIdx * 150);
      });
    });

    const points = slideEl.querySelectorAll(".cyra-ref-points-num");
    points.forEach((ptsEl, pIdx) => {
      const target = parseInt(ptsEl.dataset.target || ptsEl.textContent || "0", 10);
      if (!target) return;
      setTimeout(() => {
        this.animateCountUp(ptsEl, target, 1000);
      }, 150 + pIdx * 120);
    });
  }

  animateCountUp(el, target, duration = 1500) {
    if (!el || !target) return;
    const startTime = performance.now();
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const current = Math.floor(progress * target);
      el.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString();
      }
    };
    requestAnimationFrame(update);
  }

  animateRevealScore(slideEl, rank) {
    // 1. Terminal-Style Typing Reveal for the Team Name
    const titleEl = slideEl.querySelector(".cyra-jp-team-title");
    if (titleEl) {
      const fullText = titleEl.getAttribute("data-team-name") || titleEl.textContent || "";
      titleEl.textContent = "";
      let charIdx = 0;
      const typeSpeed = Math.max(25, Math.min(55, 750 / Math.max(1, fullText.length)));
      this.typingTimer = setInterval(() => {
        if (charIdx < fullText.length) {
          titleEl.textContent += fullText[charIdx++];
        } else {
          clearInterval(this.typingTimer);
        }
      }, typeSpeed);
    }

    // 2. Count-up Score
    const scoreEl = slideEl.querySelector(".cyra-jp-team-score");
    if (scoreEl) {
      const target = parseInt(scoreEl.getAttribute("data-score") || "0", 10);
      setTimeout(() => {
        this.animateCountUp(scoreEl, target, 1400);
      }, 300);
    }

    // 3. Staggered Rise for Credential Strip
    const strip = slideEl.querySelector(".credential-strip");
    if (strip) {
      strip.style.opacity = "0";
      strip.style.transform = "translateY(16px)";
      setTimeout(() => {
        strip.style.transition = "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
        strip.style.opacity = "1";
        strip.style.transform = "translateY(0)";
      }, 550);
    }

    // 4. Reserve exactly ONE screen-wide light pulse for the 1st-place champion reveal
    if (rank === 1) {
      const viewport = document.getElementById("cyra-outro-viewport");
      if (viewport) {
        viewport.classList.remove("champion-pulse-active");
        void viewport.offsetWidth;
        viewport.classList.add("champion-pulse-active");
        setTimeout(() => {
          viewport.classList.remove("champion-pulse-active");
        }, 1600);
      }
    }
  }

  animatePodium(slideEl) {
    const scores = slideEl.querySelectorAll(".cyra-podium-score");
    scores.forEach(el => {
      const target = parseInt(el.getAttribute("data-score") || "0", 10);
      if (target) this.animateCountUp(el, target, 1400);
    });
  }

  animateHallOfFame(slideEl) {
    const card = slideEl.querySelector(".cyra-hof-champion-card");
    if (card) {
      card.style.opacity = "0";
      card.style.transform = "scale(0.96) translateY(20px)";
      setTimeout(() => {
        card.style.transition = "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
        card.style.opacity = "1";
        card.style.transform = "scale(1) translateY(0)";
      }, 100);
    }

    const metricVals = slideEl.querySelectorAll(".cyra-hof-metric-val");
    metricVals.forEach((valEl, idx) => {
      const target = parseInt(valEl.getAttribute("data-target") || "0", 10);
      if (target) {
        setTimeout(() => {
          this.animateCountUp(valEl, target, 1200);
        }, 300 + idx * 120);
      }
    });
  }

  /* ------------------------------------------------------------------
   * Untouchables (Locked Terminal) Dynamic Auto-Scroll Engine
   * ------------------------------------------------------------------ */
  startUntouchablesScroll(slideEl) {
    if (this.untouchablesAnimFrame) {
      cancelAnimationFrame(this.untouchablesAnimFrame);
      this.untouchablesAnimFrame = null;
    }
    if (this.untouchablesHoldTimer) {
      clearTimeout(this.untouchablesHoldTimer);
      this.untouchablesHoldTimer = null;
    }

    const stream = slideEl.querySelector(".cyra-untouchables-scroll-stream");
    const box = slideEl.querySelector(".cyra-untouchables-scroll-container");
    if (!stream || !box) return;

    const allCards = stream.querySelectorAll(".cyra-untouchable-ref-card");
    if (allCards.length === 0) {
      return;
    }

    const boxHeight = box.offsetHeight || 440;
    const streamHeight = stream.scrollHeight || stream.offsetHeight || 800;

    if (streamHeight <= boxHeight) {
      stream.style.transform = "none";
      return;
    }

    const currentTimelineItem = this.slideTimeline && this.slideTimeline[this.currentSlideIndex];
    const untouchablesDuration = (currentTimelineItem && currentTimelineItem.duration) ? currentTimelineItem.duration : 14;

    const startY = 10;
    const endY = -(streamHeight - boxHeight + 40);
    const scrollDistance = startY - endY;
    const scrollDuration = Math.max(6, untouchablesDuration - 1.5);
    let elapsed = 0;
    let lastTime = performance.now();

    const step = (now) => {
      if (this.slides[this.currentSlideIndex]?.type !== "untouchables") return;

      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (this.isPlaying) {
        elapsed += dt;
      }

      const progress = Math.min(1.0, elapsed / scrollDuration);
      const currentY = startY - (progress * scrollDistance);
      stream.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;

      if (progress < 1.0) {
        this.untouchablesAnimFrame = requestAnimationFrame(step);
      }
    };

    stream.style.transform = `translate3d(0, ${startY}px, 0)`;
    this.untouchablesAnimFrame = requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------
   * Solve Timeline Live Cyber Log Stream
   * ------------------------------------------------------------------ */
  startSolveTimelineScroll(slideEl) {
    const box = slideEl.querySelector("#timeline-scroll-box");
    if (!box) return;

    let currentPos = 0;
    const scrollSpeed = 2.6;

    const step = () => {
      if (this.slides[this.currentSlideIndex]?.type !== "solve-timeline") return;

      currentPos += scrollSpeed;
      if (box.scrollHeight > 0 && currentPos >= box.scrollHeight / 2) {
        currentPos = 0;
      }
      box.scrollTop = currentPos;
      this.timelineAnimFrame = requestAnimationFrame(step);
    };

    box.scrollTop = 0;
    this.timelineAnimFrame = requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------
   * Continuous Cinematic Movie End Credits Engine
   * Dynamically adapts speed to allocated timeline duration & content height
   * ------------------------------------------------------------------ */
  startMovieCreditsScroll(slideEl) {
    if (this.creditsAnimFrame) {
      cancelAnimationFrame(this.creditsAnimFrame);
      this.creditsAnimFrame = null;
    }
    if (this.creditsHoldTimer) {
      clearTimeout(this.creditsHoldTimer);
      this.creditsHoldTimer = null;
    }
    if (this.creditsTimeUpdateHandler && this.audioPlayer) {
      this.audioPlayer.removeEventListener("timeupdate", this.creditsTimeUpdateHandler);
      this.creditsTimeUpdateHandler = null;
    }

    const viewport = slideEl.querySelector("#movie-credits-viewport");
    const track = slideEl.querySelector("#movie-credits-track");
    if (!viewport || !track) return;

    const viewportHeight = viewport.clientHeight || window.innerHeight;
    const totalCreditsHeight = track.scrollHeight || track.offsetHeight || 1200;

    // Allocated duration from the timeline (e.g. ~71s for full audio)
    const currentTimelineItem = this.slideTimeline && this.slideTimeline[this.currentSlideIndex];
    const creditsDuration = (currentTimelineItem && currentTimelineItem.duration) ? currentTimelineItem.duration : 71;
    const slideStartTime = (currentTimelineItem && currentTimelineItem.start != null) ? currentTimelineItem.start : 0;

    // Start position: top of credits is safely below the bottom edge of screen
    // End position: bottom of credits is safely above the top edge of screen
    const startY = viewportHeight + 40;
    const endY = -(totalCreditsHeight + 60);
    const scrollDistance = startY - endY;

    // Position initially below screen
    track.style.transform = `translate3d(0, ${startY}px, 0)`;

    // Audio interpolation tracker
    let baseAudioTime = (this.audioPlayer && !isNaN(this.audioPlayer.currentTime)) ? this.audioPlayer.currentTime : null;
    let basePerfTime = performance.now();
    let fallbackElapsed = 0;
    let lastFramePerf = performance.now();
    let isFinished = false;

    this.creditsTimeUpdateHandler = () => {
      if (this.audioPlayer && !isNaN(this.audioPlayer.currentTime)) {
        baseAudioTime = this.audioPlayer.currentTime;
        basePerfTime = performance.now();
      }
    };

    if (this.audioPlayer) {
      this.audioPlayer.addEventListener("timeupdate", this.creditsTimeUpdateHandler);
    }

    const step = (now) => {
      if (this.slides[this.currentSlideIndex]?.type !== "movie-credits") {
        if (this.creditsTimeUpdateHandler && this.audioPlayer) {
          this.audioPlayer.removeEventListener("timeupdate", this.creditsTimeUpdateHandler);
          this.creditsTimeUpdateHandler = null;
        }
        return;
      }

      let progress = 0;
      const dt = (now - lastFramePerf) / 1000;
      lastFramePerf = now;

      const isAudioActive = this.audioPlayer && 
                            !this.audioPlayer.paused && 
                            !this.audioPlayer.ended && 
                            baseAudioTime !== null;

      if (isAudioActive) {
        // High-precision sub-millisecond audio interpolation between discrete HTML5 timeupdate ticks
        const deltaAudioSec = (now - basePerfTime) / 1000;
        const currentAudioTime = baseAudioTime + deltaAudioSec;
        if (currentAudioTime >= slideStartTime) {
          fallbackElapsed = Math.max(fallbackElapsed, currentAudioTime - slideStartTime);
        } else {
          if (this.isPlaying) fallbackElapsed += dt;
        }
      } else {
        // Audio has ended or is absent: smoothly scroll credits in real time without audio!
        if (this.isPlaying) {
          fallbackElapsed += dt;
        }
      }

      progress = fallbackElapsed / creditsDuration;

      progress = Math.max(0, Math.min(1.02, progress));
      const currentY = startY - (progress * scrollDistance);
      track.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;

      if (progress >= 1.0) {
        if (!isFinished) {
          isFinished = true;
          if (this.creditsTimeUpdateHandler && this.audioPlayer) {
            this.audioPlayer.removeEventListener("timeupdate", this.creditsTimeUpdateHandler);
            this.creditsTimeUpdateHandler = null;
          }
          if (this.isPlaying) {
            this.creditsHoldTimer = setTimeout(() => {
              if (this.slides[this.currentSlideIndex]?.type === "movie-credits") {
                this.nextSlide();
              }
            }, 600);
          }
        }
        return;
      }

      this.creditsAnimFrame = requestAnimationFrame(step);
    };

    this.creditsAnimFrame = requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------
   * Keyboard & Fullscreen Controls
   * ------------------------------------------------------------------ */
  bindEvents() {
    document.addEventListener("keydown", e => {
      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        this.togglePause();
      } else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === "PageDown") {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        this.prevSlide();
      } else if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === "m" || e.key === "M") {
        this.soundEnabled = !this.soundEnabled;
        if (!this.soundEnabled) {
          if (this.audioPlayer) this.audioPlayer.pause();
        } else {
          if (this.audioPlayer && this.isPlaying) this.audioPlayer.play().catch(() => {});
        }
      } else if (e.key === "Escape") {
        window.location.href = "/";
      }
    });

    // Floating HUD Button Listeners
    document.getElementById("btn-hud-prev")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.prevSlide();
    });

    document.getElementById("btn-hud-next")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.nextSlide();
    });

    document.getElementById("btn-hud-play")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePause();
    });

    document.getElementById("btn-hud-sound")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleSound();
    });

    document.getElementById("btn-hud-fullscreen")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleFullscreen();
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("cyra-outro-viewport")) {
      window.cyraOutro = new CyraOutroPresentation();
    }
  });
}

if (typeof window !== "undefined") { window.CyraOutroPresentation = CyraOutroPresentation; }

