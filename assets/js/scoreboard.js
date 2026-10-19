/**
 * CYRA CTF — Static Showcase Scoreboard & Analytics Engine
 * Manages podium rendering, live search/filtering, ECharts score graph,
 * and interactive team drill-down drawer.
 */

(function () {
  "use strict";

  let scoreboardData = [];
  let top10Data = {};
  let challengesData = [];
  let outroData = {};
  let teamSolvesMap = {};
  let chartInstance = null;

  // Color generator for ECharts lines
  function getColor(str) {
    const palette = [
      "#ffd666", "#d5ddec", "#e69a6e", "#38bdf8", "#ff6080",
      "#4ade80", "#c084fc", "#fb923c", "#f472b6", "#2dd4bf"
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  }

  async function loadData() {
    if (window.__CYRA_DATA__) {
      scoreboardData = window.__CYRA_DATA__.scoreboard || [];
      top10Data = window.__CYRA_DATA__.scoreboardTop10 || {};
      challengesData = window.__CYRA_DATA__.challenges || [];
      outroData = window.__CYRA_DATA__.outro || {};
      teamSolvesMap = window.__CYRA_DATA__.teamsDetail || {};
      initApp();
      return;
    }

    try {
      const [sbRes, topRes, chRes, outroRes, tmRes] = await Promise.all([
        fetch("./data/scoreboard.json"),
        fetch("./data/scoreboard_top10.json"),
        fetch("./data/challenges.json"),
        fetch("./data/outro-data.json"),
        fetch("./data/teams_detail.json")
      ]);

      scoreboardData = (await sbRes.json()).data || [];
      top10Data = (await topRes.json()).data || {};
      challengesData = (await chRes.json()).data || [];
      outroData = (await outroRes.json()).data || {};
      teamSolvesMap = (await tmRes.json()).data || {};
    } catch (e) {
      console.error("Error loading static data:", e);
    }

    initApp();
  }

  function initApp() {
    renderStats();
    renderPodium();
    renderScoreboardTable(scoreboardData);
    initChart();
    renderChallengesOverview();
    bindEvents();
  }

  /* ------------------------------------------------------------------
   * Telemetry Stats Overview
   * ------------------------------------------------------------------ */
  function renderStats() {
    const totalTeams = scoreboardData.length || 49;
    let totalContestants = 0;
    let totalSolves = 0;
    
    scoreboardData.forEach(t => {
      totalContestants += (t.members ? t.members.length : 1);
      totalSolves += (t.total_solves || 0);
    });

    const totalChallenges = challengesData.length || 80;
    const solvedChallenges = challengesData.filter(c => c.solves_count > 0).length;

    const elTeams = document.getElementById("stat-total-teams");
    const elContestants = document.getElementById("stat-total-contestants");
    const elSolves = document.getElementById("stat-total-solves");
    const elChallenges = document.getElementById("stat-total-challenges");
    const elChampion = document.getElementById("stat-blood-champion");

    if (elTeams) elTeams.textContent = totalTeams;
    if (elContestants) elContestants.textContent = totalContestants;
    if (elSolves) elSolves.textContent = totalSolves;
    if (elChallenges) elChallenges.textContent = `${solvedChallenges} / ${totalChallenges}`;

    if (elChampion && outroData.top_blood_champion) {
      const champ = outroData.top_blood_champion;
      elChampion.textContent = `${champ.player_name} (${champ.blood_count} 🩸)`;
    }
  }

  /* ------------------------------------------------------------------
   * Grand Podium Top 3
   * ------------------------------------------------------------------ */
  function renderPodium() {
    const podiumEl = document.getElementById("podium-cards");
    if (!podiumEl || scoreboardData.length < 3) return;

    const first = scoreboardData[0];
    const second = scoreboardData[1];
    const third = scoreboardData[2];

    const makeMembers = (team) => {
      if (!team.members || !team.members.length) return "";
      return team.members
        .map(m => `<span class="member-chip">${escapeHtml(m.name)} <small style="color:var(--color-cyan);">${m.score}p</small></span>`)
        .join("");
    };

    podiumEl.innerHTML = `
      <!-- 2nd Place: Silver -->
      <div class="podium-card silver-podium order-2nd" data-team-id="${second.account_id}">
        <div class="podium-rank-badge">🥈</div>
        <div class="podium-team-name">${escapeHtml(second.name)}</div>
        <div class="podium-score">${second.score.toLocaleString()} <span style="font-size:0.85rem; color:#94a3b8;">PTS</span></div>
        <div class="podium-stats">
          <span><i class="fa-solid fa-flag text-secondary"></i> ${second.total_solves || 0} Solves</span>
          <span><i class="fa-solid fa-users text-secondary"></i> ${second.members?.length || 0} Members</span>
        </div>
        <div class="podium-members">
          ${makeMembers(second)}
        </div>
      </div>

      <!-- 1st Place: Gold Champion -->
      <div class="podium-card gold-podium order-1st" data-team-id="${first.account_id}">
        <div class="podium-rank-badge">🥇</div>
        <div class="podium-team-name">${escapeHtml(first.name)}</div>
        <div class="podium-score">${first.score.toLocaleString()} <span style="font-size:0.95rem; color:var(--color-gold);">PTS</span></div>
        <div class="podium-stats">
          <span style="color:#ffd666;"><i class="fa-solid fa-trophy"></i> 1ST CHAMPION</span>
          <span><i class="fa-solid fa-flag text-warning"></i> ${first.total_solves || 0} Solves</span>
        </div>
        <div class="podium-members">
          ${makeMembers(first)}
        </div>
      </div>

      <!-- 3rd Place: Bronze -->
      <div class="podium-card bronze-podium order-3rd" data-team-id="${third.account_id}">
        <div class="podium-rank-badge">🥉</div>
        <div class="podium-team-name">${escapeHtml(third.name)}</div>
        <div class="podium-score">${third.score.toLocaleString()} <span style="font-size:0.85rem; color:#94a3b8;">PTS</span></div>
        <div class="podium-stats">
          <span><i class="fa-solid fa-flag" style="color:var(--color-bronze);"></i> ${third.total_solves || 0} Solves</span>
          <span><i class="fa-solid fa-users" style="color:var(--color-bronze);"></i> ${third.members?.length || 0} Members</span>
        </div>
        <div class="podium-members">
          ${makeMembers(third)}
        </div>
      </div>
    `;

    // Click on podium card to view team drawer
    podiumEl.querySelectorAll(".podium-card").forEach(card => {
      card.addEventListener("click", () => {
        const teamId = parseInt(card.dataset.teamId, 10);
        openTeamDrawer(teamId);
      });
    });
  }

  /* ------------------------------------------------------------------
   * Scoreboard Table
   * ------------------------------------------------------------------ */
  function renderScoreboardTable(teams) {
    const tbody = document.getElementById("scoreboard-tbody");
    const countEl = document.getElementById("scoreboard-count");
    if (!tbody) return;

    if (countEl) {
      countEl.textContent = `${teams.length} ${teams.length === 1 ? 'Team' : 'Teams'}`;
    }

    if (!teams.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5 text-muted">
            <i class="fa-solid fa-magnifying-glass fa-2x mb-3 d-block text-secondary"></i>
            No teams found matching search criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = teams.map((team, idx) => {
      const rank = team.pos || (idx + 1);
      let rankBadge = `#${rank < 10 ? '0' + rank : rank}`;
      let rowClass = "cyra-table-row";

      if (rank === 1) {
        rankBadge = "🥇 #1";
        rowClass += " row-rank-1";
      } else if (rank === 2) {
        rankBadge = "🥈 #2";
        rowClass += " row-rank-2";
      } else if (rank === 3) {
        rankBadge = "🥉 #3";
        rowClass += " row-rank-3";
      }

      const fbCount = team.first_bloods_count || 0;
      const fbBadge = fbCount > 0 
        ? `<span class="first-blood-pill" title="${fbCount} First Blood${fbCount > 1 ? 's' : ''}"><i class="fa-solid fa-droplet"></i> ${fbCount}</span>` 
        : "";

      const memberNames = team.members ? team.members.map(m => escapeHtml(m.name)).join(", ") : "";

      return `
        <tr class="${rowClass}" data-team-id="${team.account_id}">
          <td class="text-center cyra-col-rank">
            <span class="cyra-rank-badge rank-${rank <= 3 ? rank : 'default'}">${rankBadge}</span>
          </td>
          <td class="text-start ps-3 cyra-col-team">
            <div class="d-flex align-items-center flex-wrap">
              <span class="cyra-team-link fw-bold" style="font-size:1.05rem;">${escapeHtml(team.name)}</span>
              ${fbBadge}
            </div>
            <div class="text-muted small text-truncate" style="max-width: 480px; font-family:'Share Tech Mono', monospace; font-size:0.75rem;">
              <i class="fa-solid fa-users me-1 text-secondary"></i> ${memberNames}
            </div>
          </td>
          <td class="text-center cyra-col-solves" style="width: 140px;">
            <span class="badge bg-dark-subtle border border-secondary-subtle px-2 py-1 font-monospace">
              ${team.total_solves || 0} solves
            </span>
          </td>
          <td class="text-end pe-4 cyra-col-score" style="width: 160px;">
            <span class="cyra-score-badge">
              <span>${team.score.toLocaleString()}</span>
              <span class="cyra-score-unit">PTS</span>
            </span>
          </td>
          <td class="text-center" style="width: 80px;">
            <button type="button" class="btn btn-sm btn-outline-info rounded-circle view-team-btn" title="Inspect Team Solves">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    // Bind row clicks
    tbody.querySelectorAll("tr[data-team-id]").forEach(row => {
      row.addEventListener("click", () => {
        const tid = parseInt(row.dataset.teamId, 10);
        openTeamDrawer(tid);
      });
    });
  }

  /* ------------------------------------------------------------------
   * Interactive ECharts Timeline Graph
   * ------------------------------------------------------------------ */
  function initChart() {
    const container = document.getElementById("scoregraph");
    if (!container || !window.echarts || !top10Data) return;

    if (chartInstance) {
      chartInstance.dispose();
    }

    chartInstance = window.echarts.init(container);

    const teams = Object.keys(top10Data);
    const series = [];
    const legendData = [];

    teams.forEach(tKey => {
      const teamObj = top10Data[tKey];
      if (!teamObj || !teamObj.solves) return;

      legendData.push(teamObj.name);

      let cumScore = 0;
      const points = [];

      teamObj.solves.forEach(solve => {
        cumScore += solve.value;
        const solveDate = window.dayjs ? window.dayjs(solve.date).toDate() : new Date(solve.date);
        points.push([solveDate, cumScore]);
      });

      series.push({
        name: teamObj.name,
        type: "line",
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        data: points,
        itemStyle: {
          color: getColor(teamObj.name + teamObj.id)
        },
        lineStyle: {
          width: 2.5
        }
      });
    });

    const option = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(12, 14, 28, 0.95)",
        borderColor: "rgba(255, 195, 120, 0.3)",
        borderWidth: 1,
        textStyle: {
          color: "#f8fafc",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 12
        },
        axisPointer: {
          type: "cross",
          lineStyle: { color: "#ff6080" },
          crossStyle: { color: "#38bdf8" }
        }
      },
      legend: {
        data: legendData,
        type: "scroll",
        bottom: 10,
        textStyle: {
          color: "#94a3b8",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 12
        },
        pageIconColor: "#38bdf8",
        pageTextStyle: { color: "#94a3b8" }
      },
      grid: {
        left: "4%",
        right: "4%",
        top: "14%",
        bottom: "16%",
        containLabel: true
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
        axisLabel: {
          color: "#94a3b8",
          fontFamily: "'Share Tech Mono', monospace"
        },
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.15)" } },
        splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.05)" } }
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "#94a3b8",
          fontFamily: "'Share Tech Mono', monospace"
        },
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.15)" } },
        splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.05)", type: "dashed" } }
      },
      dataZoom: [
        {
          type: "slider",
          height: 18,
          top: 10,
          fillerColor: "rgba(255, 96, 128, 0.2)",
          borderColor: "rgba(255, 255, 255, 0.1)",
          textStyle: { color: "#94a3b8" },
          handleStyle: { color: "#ff6080" }
        }
      ],
      series: series
    };

    chartInstance.setOption(option);
    window.addEventListener("resize", () => {
      if (chartInstance) chartInstance.resize();
    });
  }

  /* ------------------------------------------------------------------
   * Team Solves Drilldown Drawer
   * ------------------------------------------------------------------ */
  function openTeamDrawer(teamId) {
    const team = scoreboardData.find(t => t.account_id === teamId);
    if (!team) return;

    const drawer = document.getElementById("team-drawer");
    const backdrop = document.getElementById("team-drawer-backdrop");
    const titleEl = document.getElementById("drawer-team-name");
    const bodyEl = document.getElementById("drawer-body-content");

    if (!drawer || !backdrop) return;

    titleEl.textContent = team.name;

    // Member cards
    const memberChips = (team.members || []).map(m => `
      <div class="col-6 mb-2">
        <div class="p-2 border rounded border-secondary-subtle bg-dark-subtle d-flex justify-content-between align-items-center">
          <span class="small font-monospace text-truncate">${escapeHtml(m.name)}</span>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle">${m.score}p</span>
        </div>
      </div>
    `).join("");

    // Solves list
    const solves = teamSolvesMap[teamId] || team.solves || [];
    const solvesHtml = solves.length ? solves.map((s, idx) => {
      const fbBadge = s.is_first_blood 
        ? `<span class="badge bg-danger ms-2"><i class="fa-solid fa-droplet"></i> FIRST BLOOD</span>`
        : "";
      const cat = s.category || "General";
      const catClass = cat.split(" ")[0];

      return `
        <div class="solve-item ${s.is_first_blood ? 'is-fb' : ''}">
          <div style="flex:1;">
            <div class="d-flex align-items-center flex-wrap gap-1">
              <span class="category-tag ${catClass}">${cat}</span>
              <strong style="color:#f8fafc; font-size:0.95rem;">${escapeHtml(s.challenge_name)}</strong>
              ${fbBadge}
            </div>
            <div class="solve-meta mt-1">
              <span><i class="fa-solid fa-user me-1"></i>${escapeHtml(s.user_name || 'Team')}</span> &bull; 
              <span><i class="fa-regular fa-clock me-1"></i>${formatDate(s.date)}</span>
            </div>
          </div>
          <div class="text-end">
            <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace" style="font-size:0.85rem;">
              +${s.value} PTS
            </span>
          </div>
        </div>
      `;
    }).join("") : `<div class="text-muted text-center py-4">No solves recorded for this team.</div>`;

    bodyEl.innerHTML = `
      <div class="drawer-stats-row">
        <div class="drawer-mini-stat">
          <div class="val text-warning">#${team.pos || '--'}</div>
          <div class="lbl">Final Rank</div>
        </div>
        <div class="drawer-mini-stat">
          <div class="val text-info">${team.score.toLocaleString()}</div>
          <div class="lbl">Total Points</div>
        </div>
        <div class="drawer-mini-stat">
          <div class="val text-success">${solves.length}</div>
          <div class="lbl">Flags Captured</div>
        </div>
      </div>

      <div class="drawer-section-title">
        <span><i class="fa-solid fa-users me-2"></i>TEAM ROSTER</span>
        <span class="badge bg-secondary-subtle text-secondary">${team.members?.length || 0} Members</span>
      </div>
      <div class="row g-2 mb-4">
        ${memberChips}
      </div>

      <div class="drawer-section-title">
        <span><i class="fa-solid fa-flag-checkered me-2"></i>SOLVED CHALLENGES</span>
        <span class="badge bg-secondary-subtle text-secondary">${solves.length} Solves</span>
      </div>
      <div class="solves-stream">
        ${solvesHtml}
      </div>
    `;

    drawer.classList.add("active");
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeTeamDrawer() {
    const drawer = document.getElementById("team-drawer");
    const backdrop = document.getElementById("team-drawer-backdrop");
    if (drawer) drawer.classList.remove("active");
    if (backdrop) backdrop.classList.remove("active");
    document.body.style.overflow = "";
  }

  /* ------------------------------------------------------------------
   * Challenges Overview
   * ------------------------------------------------------------------ */
  function renderChallengesOverview() {
    const container = document.getElementById("categories-container");
    if (!container || !challengesData.length) return;

    // Group challenges by category
    const cats = {};
    challengesData.forEach(c => {
      const cat = c.category || "General";
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(c);
    });

    const catHtml = Object.keys(cats).sort().map(catName => {
      const chals = cats[catName];
      const solvedCount = chals.filter(c => c.solves_count > 0).length;
      const totalPoints = chals.reduce((sum, c) => sum + c.value, 0);

      const items = chals.map(ch => {
        const isUntouched = ch.solves_count === 0;
        const fbSolver = ch.first_blood ? escapeHtml(ch.first_blood.team_name) : "Unclaimed";
        return `
          <div class="d-flex justify-content-between align-items-center py-2 px-3 border-bottom border-secondary-subtle ${isUntouched ? 'opacity-50' : ''}">
            <div>
              <span class="fw-semibold text-light">${escapeHtml(ch.name)}</span>
              <div class="small text-muted font-monospace" style="font-size:0.75rem;">
                ${isUntouched ? '<span class="text-danger">● UNTOUCHED</span>' : `<span>🩸 Blood: ${fbSolver}</span>`}
              </div>
            </div>
            <div class="text-end">
              <span class="badge bg-dark-subtle border border-secondary-subtle font-monospace me-2">${ch.value} PTS</span>
              <span class="badge ${ch.solves_count > 0 ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} font-monospace">
                ${ch.solves_count} solves
              </span>
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="col-md-6 col-lg-4 mb-4">
          <div class="card h-100 bg-dark-subtle border-secondary-subtle" style="backdrop-filter: blur(8px);">
            <div class="card-header border-secondary-subtle d-flex justify-content-between align-items-center">
              <h5 class="mb-0 text-light font-monospace" style="font-size:1.1rem;">
                <i class="fa-solid fa-folder-open text-primary me-2"></i>${catName}
              </h5>
              <span class="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                ${solvedCount}/${chals.length}
              </span>
            </div>
            <div class="card-body p-0" style="max-height: 280px; overflow-y: auto;">
              ${items}
            </div>
            <div class="card-footer border-secondary-subtle text-muted small font-monospace d-flex justify-content-between">
              <span>${chals.length} Challenges</span>
              <span>Total ${totalPoints} PTS</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = catHtml;
  }

  /* ------------------------------------------------------------------
   * Event Listeners & Search
   * ------------------------------------------------------------------ */
  function bindEvents() {
    const searchInput = document.getElementById("search-team");
    const filterPills = document.querySelectorAll(".filter-pill");

    let currentFilter = "all";

    function applyFilter() {
      const q = (searchInput?.value || "").toLowerCase().trim();
      let filtered = scoreboardData.filter(team => {
        const nameMatch = team.name.toLowerCase().includes(q);
        const memberMatch = team.members?.some(m => m.name.toLowerCase().includes(q));
        if (q && !nameMatch && !memberMatch) return false;

        if (currentFilter === "top10") {
          return team.pos <= 10;
        } else if (currentFilter === "bloods") {
          return (team.first_bloods_count || 0) > 0;
        } else if (currentFilter === "highsolves") {
          return (team.total_solves || 0) >= 10;
        }
        return true;
      });

      renderScoreboardTable(filtered);
    }

    if (searchInput) {
      searchInput.addEventListener("input", applyFilter);
    }

    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentFilter = pill.dataset.filter || "all";
        applyFilter();
      });
    });

    // Drawer close events
    document.getElementById("drawer-close-btn")?.addEventListener("click", closeTeamDrawer);
    document.getElementById("team-drawer-backdrop")?.addEventListener("click", closeTeamDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTeamDrawer();
    });
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

  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  }

  document.addEventListener("DOMContentLoaded", loadData);
})();
