# 🌸 CYRA CTF 2026 — Independent Static Showcase

An independent, standalone, high-fidelity static website archiving the **CYRA CTF 2026** competition scores, podium champions, interactive telemetry graph, challenge matrix, and the **Grand Escape Closing Ceremony Outro**.

This bundle has **ZERO dependencies on Docker, MariaDB, Redis, or Python backend services**. It is 100% client-side HTML, CSS, JavaScript, and static JSON data.

---

## 🚀 Quick Start / How to Run

You can run this showcase with any static file server:

### Option 1: Python 3 Built-in Server (Recommended)
```bash
python3 -m http.server 8080 --directory showcase
```
Then open: **[http://localhost:8080](http://localhost:8080)**

### Option 2: Node.js `serve` / `npx`
```bash
npx serve showcase
```

### Option 3: GitHub Pages / Vercel / Netlify / Cloudflare Pages
Simply push the contents of the `showcase/` directory to GitHub Pages or import the repository into Vercel/Netlify. The paths are 100% relative and work seamlessly.

### Option 4: Direct Offline File Browsing (`file:///`)
The bundle includes `data/data-bundle.js` which pre-loads `window.__CYRA_DATA__`. You can directly open `showcase/index.html` or `showcase/outro.html` in modern web browsers (Firefox, Safari, Edge, Chrome).

---

## 🌟 Pages & Key Features

### 1. 🏆 Scoreboard & Champions Showcase (`index.html`)
- **Aesthetic**: Japanese-Cyberpunk Twilight aesthetic matching CTFd's CyRA theme with falling cherry blossom petals (`cyra-sakura-canvas`).
- **Grand Podium**: 🥇 1st Place (Sec_Vectors - 1,830 pts), 🥈 2nd Place (VEX-7 - 1,550 pts), 🥉 3rd Place (Techvortex - 1,530 pts) with glowing badges and member rosters.
- **Top 10 Score Progression Timeline**: Fully interactive line chart powered by ECharts with time zoom slider, tooltips, and legend toggles.
- **Official Scoreboard Table**: All 46 ranked teams with search-as-you-type filter, category blood indicators, and solve counts.
- **Team Drill-Down Drawer**: Click any team to slide out an interactive drawer showing every challenge they solved, solver handles, points, timestamps, and First Blood badges.
- **Challenges Matrix**: Category-by-category breakdown showing challenges, points, solve counts, and first blood solvers.

### 2. 🎬 Grand Escape Outro Closing Ceremony (`outro.html`)
- **Soundtrack**: RADWIMPS ft. Toko Miura — *"Grand Escape"* (`ceremony_bgm.mp3`).
- **Dynamic 13-Stage Cinematic Presentation**:
  1. Cold Open Attract screen
  2. Ceremony Title Card (Glitch reveal)
  3. Competition Telemetry & Metrics (Count-up animation)
  4. Behind the Scenes War-Room HUD
  5. Category Breakdowns (Forensics, Cryptography, Linux, OSINT, Reverse, Web)
  6. The Untouchables (Locked terminal for unsolved challenges)
  7. Chronological Solve Timeline
  8. Climax Interstitial ("AND NOW... THE FINAL PODIUM")
  9. Top 5 Team Countdown (5th -> 4th -> 3rd -> 2nd -> 1st CHAMPION!)
  10. Grand Podium Overview
  11. Hall of Fame (God of Blood coronation for Mithun_S_0071 - 9 Bloods)
  12. Continuous Movie Credits (Authors with actual photos, staff, mentors)
  13. Final Thank You emotional departure
- **Controls**:
  - `Space` or `K`: Play / Pause auto-advance
  - `←` / `→`: Previous / Next slide
  - `M`: Toggle ceremony music
  - `F`: Toggle Fullscreen
  - `ESC` or Scoreboard button: Return to the Scoreboard Showcase

---

## 📁 Directory Structure

```text
showcase/
├── index.html                  # Main Scoreboard & Results Showcase
├── outro.html                  # Grand Escape Closing Ceremony
├── README.md                   # This documentation
├── data/
│   ├── data-bundle.js          # Unified telemetry bundle for offline file:// compatibility
│   ├── scoreboard.json         # All 46 teams with rankings and scores
│   ├── scoreboard_top10.json   # Timeline solves for top 10 teams
│   ├── outro-data.json         # Outro presentation data (categories, credits, stats)
│   ├── challenges.json         # All challenges with solve counts and first bloods
│   └── teams_detail.json       # Per-team solve breakdowns
└── assets/
    ├── css/
    │   ├── main.css            # Compiled CyRA theme stylesheet
    │   └── showcase.css        # Custom showcase layout, podium, and drawer styles
    ├── js/
    │   ├── vendor/
    │   │   ├── echarts.min.js  # ECharts library
    │   │   └── dayjs.min.js    # Day.js date parsing library
    │   ├── cyra-petals.js      # Sakura 3D particle physics engine
    │   ├── cyra_outro.js       # Grand Escape closing ceremony sequencer
    │   └── scoreboard.js       # Scoreboard search, filter, drawer, and chart engine
    ├── img/
    │   ├── logo.png            # CyRA CTF logo
    │   ├── favicon.ico         # Favicon
    │   ├── weathering-bg.png   # Cinematic background artwork
    │   ├── credits/            # 11 author and mentor photos
    │   └── ...                 # Category peek graphics
    ├── audio/
    │   ├── ceremony_bgm.mp3    # RADWIMPS Grand Escape (12.9 MB)
    │   └── blood_sfx.mp3       # First blood katana slash sound effect (244 KB)
    └── webfonts/               # FontAwesome & typography webfonts
```

---

## 🛠 Rebuilding Data

If competition data in CTFd changes, simply run the build script:
```bash
python3 scripts/build_static_showcase.py
```
This will automatically refresh all JSON files, update `data-bundle.js`, and re-sync assets.
