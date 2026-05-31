import "./styles.css";

type ArcadeCore = "fbneo" | "mame2003" | "mame2003_plus";

type RomEntry = {
  id: string;
  title: string;
  core: ArcadeCore;
  playable: boolean;
  parent?: string;
  bios?: string;
  note?: string;
};

declare global {
  interface Window {
    EJS_player: string;
    EJS_core: ArcadeCore;
    EJS_gameName?: string;
    EJS_gameUrl: string;
    EJS_gameParentUrl?: string;
    EJS_biosUrl?: string;
    EJS_pathtodata: string;
    EJS_startOnLoaded: boolean;
    EJS_fullscreenOnLoaded: boolean;
    EJS_backgroundColor: string;
    EJS_color: string;
    EJS_volume: number;
    EJS_language: string;
    EJS_disableAutoLang: boolean;
    EJS_threads: boolean;
    EJS_disableLocalStorage: boolean;
    EJS_controlScheme: string;
    EJS_hideSettings: boolean;
    EJS_VirtualGamepadSettings: {
      visible: boolean;
    };
    EJS_defaultOptions: Record<string, unknown>;
    EJS_defaultControls: Record<string, unknown>;
    EJS_ready?: () => void;
    EJS_emulator?: EmulatorJsInstance;
    EJS_Runtime?: unknown;
    EmulatorJS?: unknown;
  }
}

const PENDING_BOOT_KEY = "arcade-codex-pending-boot";
const ACTIVE_GAME_KEY = "arcade-codex-active-game";
let gamepadBridgeTimer = 0;
let wakeLock: WakeLockSentinel | null = null;

type EmulatorJsInstance = {
  callEvent?: (eventName: string) => void;
  gameManager?: {
    simulateInput: (player: number, input: number, value: number) => void;
  };
  gamepad?: {
    gamepads: BrowserGamepadSnapshot[];
  };
  gamepadLabels?: HTMLSelectElement[];
  gamepadSelection?: string[];
  updateGamepadLabels?: () => void;
};

type BrowserGamepadSnapshot = {
  axes: number[];
  buttons: Array<{ pressed: boolean }>;
  id: string;
  index: number;
};

const CORE_LABELS: Record<ArcadeCore, string> = {
  fbneo: "FinalBurn Neo",
  mame2003: "MAME 2003",
  mame2003_plus: "MAME 2003 Plus",
};

const ROM_OVERRIDES: Record<string, Partial<RomEntry>> = {
  "1941": { title: "1941", core: "mame2003_plus", playable: true },
  "1942": { title: "1942", core: "fbneo", playable: true },
  "2020bb": {
    title: "2020 Super Baseball",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  "3wonders": { title: "Three Wonders", core: "fbneo", playable: true },
  alpham2: {
    title: "Alpha Mission II",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  aodk: {
    title: "Aggressors of Dark Kombat",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  aof3: {
    title: "Art of Fighting 3",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  bakatono: {
    title: "Bakatonosama Mahjong Manyuuki",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  bangbead: {
    title: "Bang Bead",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  blazstar: {
    title: "Blazing Star",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  bloodbro: { title: "Blood Bros.", core: "fbneo", playable: true },
  breakers: {
    title: "Breakers",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  bublbust: { title: "Bubble Buster", core: "fbneo", playable: true },
  burningf: {
    title: "Burning Fight",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  captcomm: { title: "Captain Commando", core: "fbneo", playable: true },
  cawing: { title: "Carrier Air Wing", core: "fbneo", playable: true },
  ctomaday: {
    title: "Captain Tomaday",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  dino: { title: "Cadillacs and Dinosaurs", core: "fbneo", playable: true },
  dinou: {
    title: "Cadillacs and Dinosaurs (US)",
    core: "fbneo",
    playable: true,
    parent: "dino",
  },
  doubledr: {
    title: "Double Dragon",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  dynwar: { title: "Dynasty Wars", core: "fbneo", playable: true },
  eightman: {
    title: "Eight Man",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  fatfursp: {
    title: "Fatal Fury Special",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  fatfury3: {
    title: "Fatal Fury 3",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  fbfrenzy: {
    title: "Football Frenzy",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ffight: { title: "Final Fight", core: "fbneo", playable: true },
  forgottn: { title: "Forgotten Worlds", core: "fbneo", playable: true },
  galaxyfg: {
    title: "Galaxy Fight",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ganryu: { title: "Ganryu", core: "fbneo", playable: true, bios: "neogeo" },
  garou: {
    title: "Garou: Mark of the Wolves",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ghostlop: {
    title: "Ghostlop",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ghouls: { title: "Ghouls 'n Ghosts", core: "fbneo", playable: true },
  goalx3: {
    title: "Goal! Goal! Goal!",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  gpilots: {
    title: "Ghost Pilots",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  heatbrl: { title: "Heated Barrel", core: "fbneo", playable: true },
  hook: { title: "Hook", core: "fbneo", playable: true },
  jockeygp: {
    title: "Jockey Grand Prix",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  karnovr: {
    title: "Karnov's Revenge",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kizuna: {
    title: "Kizuna Encounter",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  knights: { title: "Knights of the Round", core: "fbneo", playable: true },
  kof2000: {
    title: "The King of Fighters 2000",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kof94: {
    title: "The King of Fighters '94",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kof95: {
    title: "The King of Fighters '95",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kof96: {
    title: "The King of Fighters '96",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kof97: {
    title: "The King of Fighters '97",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kof98: {
    title: "The King of Fighters '98",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kof99: {
    title: "The King of Fighters '99",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  kod: { title: "King of Dragons", core: "fbneo", playable: true },
  kotm2: {
    title: "King of the Monsters 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  lastbld2: {
    title: "The Last Blade 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  lresort: {
    title: "Last Resort",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  magdrop2: {
    title: "Magical Drop II",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  magdrop3: {
    title: "Magical Drop III",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  megaman: {
    title: "Mega Man: The Power Battle",
    core: "fbneo",
    playable: true,
  },
  mercs: { title: "Mercs", core: "fbneo", playable: true },
  minasan: {
    title: "Minasan no Okagesama Desu!",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  mslug: { title: "Metal Slug", core: "fbneo", playable: true, bios: "neogeo" },
  mslug2: {
    title: "Metal Slug 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  mslug3: {
    title: "Metal Slug 3",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  mslugx: {
    title: "Metal Slug X",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  msword: { title: "Magic Sword", core: "fbneo", playable: true },
  mtwins: { title: "Mega Twins", core: "fbneo", playable: true },
  mutnat: {
    title: "Mutation Nation",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ncombat: {
    title: "Ninja Combat",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ncommand: {
    title: "Ninja Commando",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  nemo: { title: "Nemo", core: "fbneo", playable: true },
  neobombe: {
    title: "Neo Bomberman",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  neodrift: {
    title: "Neo Drift Out",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  neopong: { title: "Neo Pong", core: "fbneo", playable: true, bios: "neogeo" },
  ninjamas: {
    title: "Ninja Master's",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  nitd: {
    title: "Nightmare in the Dark",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  overtop: { title: "Over Top", core: "fbneo", playable: true, bios: "neogeo" },
  pang3: { title: "Pang! 3", core: "fbneo", playable: true },
  pbobbl2n: {
    title: "Puzzle Bobble 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  pnickj: { title: "Pnickies", core: "fbneo", playable: true },
  popbounc: {
    title: "Pop 'n Bounce",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  preisle2: {
    title: "Prehistoric Isle 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  pspikes2: {
    title: "Power Spikes II",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  punisher: { title: "The Punisher", core: "fbneo", playable: true },
  puzzledp: {
    title: "Puzzle de Pon!",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ragnagrd: {
    title: "Ragnagard",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  rbff1: {
    title: "Real Bout Fatal Fury",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  rbffspec: {
    title: "Real Bout Fatal Fury Special",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  roboarmy: {
    title: "Robo Army",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  s1945: { title: "Strikers 1945", core: "fbneo", playable: true },
  s1945ii: { title: "Strikers 1945 II", core: "fbneo", playable: true },
  s1945p: {
    title: "Strikers 1945 Plus",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  samsho2: {
    title: "Samurai Shodown II",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  samsho3: {
    title: "Samurai Shodown III",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  samsho4: {
    title: "Samurai Shodown IV",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  savagere: {
    title: "Savage Reign",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  sengoku: { title: "Sengoku", core: "fbneo", playable: true, bios: "neogeo" },
  sf2: { title: "Street Fighter II", core: "fbneo", playable: true },
  sf2ce: {
    title: "Street Fighter II': Champion Edition",
    core: "fbneo",
    playable: true,
  },
  sfzch: { title: "Street Fighter Zero: Chuu", core: "fbneo", playable: true },
  shocktr2: {
    title: "Shock Troopers: 2nd Squad",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  shocktro: {
    title: "Shock Troopers",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  slammast: {
    title: "Saturday Night Slam Masters",
    core: "fbneo",
    playable: true,
  },
  ssideki: {
    title: "Super Sidekicks",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ssideki2: {
    title: "Super Sidekicks 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ssideki3: {
    title: "Super Sidekicks 3",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  ssideki4: {
    title: "Super Sidekicks 4",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  stakwin: {
    title: "Stakes Winner",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  stakwin2: {
    title: "Stakes Winner 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  strider: { title: "Strider", core: "fbneo", playable: true },
  tophuntr: {
    title: "Top Hunter",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  trally: {
    title: "Thrash Rally",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  turfmast: {
    title: "Neo Turf Masters",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  twinspri: {
    title: "Twinkle Star Sprites",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  unsquad: { title: "U.N. Squadron", core: "fbneo", playable: true },
  varth: { title: "Varth", core: "fbneo", playable: true },
  wakuwak7: {
    title: "Waku Waku 7",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  wh2: {
    title: "World Heroes 2",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  wh2j: {
    title: "World Heroes 2 Jet",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  whp: {
    title: "World Heroes Perfect",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  wjammers: {
    title: "Windjammers",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  willow: { title: "Willow", core: "fbneo", playable: true },
  wof: { title: "Warriors of Fate", core: "mame2003_plus", playable: true },
  zedblade: {
    title: "Zed Blade",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  zintrckb: {
    title: "Zintrick",
    core: "fbneo",
    playable: true,
    bios: "neogeo",
  },
  zupapa: { title: "Zupapa!", core: "fbneo", playable: true, bios: "neogeo" },
  neogeo: {
    title: "Neo Geo BIOS",
    core: "fbneo",
    playable: false,
    note: "BIOS 文件，供 Neo Geo 游戏依赖",
  },
  pgm: {
    title: "PGM BIOS",
    core: "fbneo",
    playable: false,
    note: "BIOS 文件，供 PGM 游戏依赖",
  },
};

const BIOS_SUFFIXES = [
  "bios",
  "naomi",
  "sys",
  "taito",
  "konami",
  "cpzn",
  "megaplay",
  "megatech",
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app element");
}

app.innerHTML = `
  <main class="shell">
    <section class="toolbar" aria-label="模拟器控制">
      <div class="brand">
        <h1>Arcade</h1>
        <p>800x600 browser arcade runtime</p>
      </div>
      <div class="controls">
        <label class="rom-select-mobile">
          ROM
          <select id="romSelectMobile"></select>
        </label>
        <label>
          Core
          <select id="coreSelect">
            ${Object.entries(CORE_LABELS)
              .map(
                ([core, label]) => `<option value="${core}">${label}</option>`,
              )
              .join("")}
          </select>
        </label>
        <button id="runButton" type="button">运行</button>
      </div>
    </section>

    <section class="game-area">
      <aside class="rom-gallery" aria-label="游戏列表">
        <div class="gallery-search">
          <input type="text" id="romSearch" placeholder="搜索游戏..." />
        </div>
        <div class="gallery-slider">
          <button class="slider-arrow slider-prev" id="sliderPrev" type="button">‹</button>
          <div class="gallery-scroll" id="galleryScroll"></div>
          <button class="slider-arrow slider-next" id="sliderNext" type="button">›</button>
        </div>
        <div class="slider-info" id="sliderInfo"></div>
      </aside>
      <div class="cabinet">
        <div id="game" class="screen">
          <div class="empty">
            <strong>选择游戏并运行</strong>
            <span class="desktop-hint">WASD 方向 · Enter 选择 · 1 投币 · I/J/K/L 按钮</span>
          </div>
        </div>
        <div class="mobile-controls" aria-label="手机虚拟控制器">
          <div id="dpadTouchZone" class="dpad-touch-zone" aria-label="方向控制触摸区域"></div>
          <div id="mobileDpad" class="mobile-dpad" role="group" aria-label="方向控制">
            <img class="mobile-dpad-plate" src="/assets/rocker/plate.png" alt="" draggable="false" />
            <img class="mobile-dpad-cross" src="/assets/rocker/gameboy_black_dpad_177.png" alt="" draggable="false" />
          </div>
          <div class="mobile-buttons" aria-label="动作按钮">
            <button class="mobile-action-button mobile-action-button-y" type="button" data-virtual-input="9" aria-label="Y">Y</button>
            <button class="mobile-action-button mobile-action-button-x" type="button" data-virtual-input="0" aria-label="X">X</button>
            <button class="mobile-action-button mobile-action-button-b" type="button" data-virtual-input="1" aria-label="B">B</button>
            <button class="mobile-action-button mobile-action-button-a" type="button" data-virtual-input="8" aria-label="A">A</button>
          </div>
          <div class="mobile-system-buttons" aria-label="系统按钮">
            <button class="mobile-system-button" type="button" data-virtual-input="3" aria-label="选择">选择</button>
            <button class="mobile-system-button" type="button" data-virtual-input="2" aria-label="投币">投币</button>
          </div>
        </div>
      </div>
    </section>

    <section class="status">
      <span id="statusText">正在读取 ROM 列表...</span>
      <span>Screen: 800 x 600</span>
      <span>ROM path: /roms/*.zip</span>
    </section>
  </main>
`;

const coreSelect = getElement<HTMLSelectElement>("coreSelect");
const runButton = getElement<HTMLButtonElement>("runButton");
const statusText = getElement<HTMLSpanElement>("statusText");
const gameContainer = getElement<HTMLDivElement>("game");
const galleryScroll = getElement<HTMLDivElement>("galleryScroll");
const romSearch = getElement<HTMLInputElement>("romSearch");
const romSelectMobile = document.getElementById(
  "romSelectMobile",
) as HTMLSelectElement | null;
const sliderPrev = document.getElementById(
  "sliderPrev",
) as HTMLButtonElement | null;
const sliderNext = document.getElementById(
  "sliderNext",
) as HTMLButtonElement | null;
const sliderInfo = document.getElementById(
  "sliderInfo",
) as HTMLDivElement | null;

let roms: RomEntry[] = [];
let selectedRomId: string | null = null;
let activeVirtualDirection: number | null = null;

if (isMobileBrowser()) {
  document.body.classList.add("is-mobile-browser");
}

installVirtualControls();

loadRomList().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  statusText.textContent = `读取 ROM 列表失败: ${message}`;
  runButton.disabled = true;
});

romSearch.addEventListener("input", () => {
  filterGallery(romSearch.value.toLowerCase().trim());
  scrollToSelected();
});

sliderPrev?.addEventListener("click", () => {
  navigateSlider(-1);
});

sliderNext?.addEventListener("click", () => {
  navigateSlider(1);
});

galleryScroll.addEventListener("scroll", () => {
  const cards = galleryScroll.querySelectorAll<HTMLElement>(
    ".rom-card:not([style*='display: none'])",
  );
  if (cards.length === 0) return;
  const scrollLeft = galleryScroll.scrollLeft;
  const cardWidth = (cards[0] as HTMLElement).offsetWidth || 1;
  const index = Math.round(scrollLeft / cardWidth);
  const clampedIndex = Math.min(Math.max(index, 0), cards.length - 1);
  const card = cards[clampedIndex];
  if (card?.dataset.romId && card.dataset.romId !== selectedRomId) {
    selectedRomId = card.dataset.romId;
    const rom = roms.find((r) => r.id === selectedRomId);
    if (rom) {
      coreSelect.value = rom.core;
      if (romSelectMobile) romSelectMobile.value = selectedRomId;
      galleryScroll.querySelectorAll<HTMLElement>(".rom-card").forEach((c) => {
        c.classList.toggle("selected", c.dataset.romId === selectedRomId);
      });
      statusText.textContent =
        rom.note ?? `${rom.title} 将使用 ${CORE_LABELS[rom.core]} 核心。`;
      updateSliderInfo(clampedIndex, cards.length);
    }
  }
});

romSelectMobile?.addEventListener("change", () => {
  if (romSelectMobile.value) {
    selectRom(romSelectMobile.value);
  }
});

runButton.addEventListener("click", () => {
  if (!selectedRomId) return;
  requestBoot(selectedRomId, coreSelect.value as ArcadeCore);
});

async function loadRomList(): Promise<void> {
  const response = await fetch("/roms.json");
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const ids = (await response.json()) as string[];
  roms = ids.map(toRomEntry);
  const playableRoms = roms.filter((rom) => rom.playable);

  renderGallery(playableRoms);

  if (romSelectMobile) {
    romSelectMobile.innerHTML = playableRoms
      .map((rom) => `<option value="${rom.id}">${rom.title}</option>`)
      .join("");
  }

  const defaultRom =
    playableRoms.find((rom) => rom.id === "1941") ?? playableRoms[0];
  if (defaultRom) {
    selectRom(defaultRom.id);
    statusText.textContent = `已载入 ${roms.length} 个 ROM，当前选择 ${defaultRom.title}。`;
    bootPendingGame();
  } else {
    statusText.textContent = "没有找到可直接运行的游戏 ROM。";
    runButton.disabled = true;
  }
}

function requestBoot(romId: string, core: ArcadeCore): void {
  if (hasLoadedEmulatorRuntime()) {
    sessionStorage.setItem(PENDING_BOOT_KEY, JSON.stringify({ romId, core }));
    location.reload();
    return;
  }

  bootGame(romId, core);
}

function bootPendingGame(): void {
  const pendingBoot = sessionStorage.getItem(PENDING_BOOT_KEY);
  if (pendingBoot) {
    sessionStorage.removeItem(PENDING_BOOT_KEY);
    try {
      const boot = JSON.parse(pendingBoot) as {
        romId: string;
        core: ArcadeCore;
      };
      if (roms.some((rom) => rom.id === boot.romId && rom.playable)) {
        selectRom(boot.romId);
        coreSelect.value = boot.core;
        bootGame(boot.romId, boot.core);
      }
    } catch {
      statusText.textContent = "恢复游戏启动状态失败，请重新选择 ROM。";
    }
    return;
  }

  const activeGame = sessionStorage.getItem(ACTIVE_GAME_KEY);
  if (activeGame) {
    sessionStorage.removeItem(ACTIVE_GAME_KEY);
    try {
      const game = JSON.parse(activeGame) as {
        romId: string;
        core: ArcadeCore;
      };
      if (roms.some((rom) => rom.id === game.romId && rom.playable)) {
        selectRom(game.romId);
        coreSelect.value = game.core;
        statusText.textContent = `正在恢复 ${roms.find((r) => r.id === game.romId)?.title}...`;
        bootGame(game.romId, game.core);
      }
    } catch {
      sessionStorage.removeItem(ACTIVE_GAME_KEY);
    }
  }
}

function bootGame(romId: string, core: ArcadeCore): void {
  const selected = roms.find((rom) => rom.id === romId);
  if (!selected || !selected.playable) {
    statusText.textContent = "请选择可运行的游戏 ROM。";
    return;
  }

  statusText.textContent = `正在启动 ${selected.title} (${CORE_LABELS[core]})...`;
  gameContainer.replaceChildren();

  sessionStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({ romId, core }));

  const player = document.createElement("div");
  player.id = "emulator";
  player.className = "emulator";
  gameContainer.append(player);

  window.EJS_player = "#emulator";
  window.EJS_core = core;
  window.EJS_gameName = selected.title;
  window.EJS_gameUrl = `/roms/${romId}.zip`;
  window.EJS_gameParentUrl = selected.parent
    ? `/roms/${selected.parent}.zip`
    : undefined;
  window.EJS_biosUrl = selected.bios ? `/roms/${selected.bios}.zip` : undefined;
  window.EJS_pathtodata = "/emulatorjs-data/";
  window.EJS_startOnLoaded = true;
  window.EJS_fullscreenOnLoaded = false;
  window.EJS_backgroundColor = "#050505";
  window.EJS_color = "#9fd36f";
  window.EJS_volume = 0.75;
  window.EJS_language = "en-US";
  window.EJS_disableAutoLang = false;
  window.EJS_threads = false;
  window.EJS_disableLocalStorage = false;
  window.EJS_controlScheme = "arcade";
  window.EJS_hideSettings = isMobileBrowser();
  window.EJS_defaultOptions = {
    ejs_threads: "disabled",
    "save-state-slot": 1,
    rewind: false,
  };
  window.EJS_defaultControls = buildDefaultControls();
  window.EJS_ready = () => {
    installGamepadBridge();
    installAudioResumeHandler();
  };

  loadCoreRuntime(core)
    .then(() => {
      removeExistingLoader();
      const loader = document.createElement("script");
      loader.dataset.emulatorjsLoader = "true";
      loader.src = `${window.EJS_pathtodata}loader.js`;
      loader.async = true;
      loader.onerror = () => {
        statusText.textContent =
          "模拟器核心加载失败，请检查 /emulatorjs-data/ 本地文件是否完整。";
      };
      loader.onload = () => {
        statusText.textContent = `${selected.title} 已加载。`;
        requestWakeLock();
      };
      document.body.append(loader);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      statusText.textContent = `核心 runtime 加载失败: ${message}`;
    });
}

function loadCoreRuntime(core: ArcadeCore): Promise<void> {
  const runtimeName = `${core}_libretro.js`;
  const runtimeUrl = `/emulatorjs-data/cores/runtime/${runtimeName}`;

  if (
    window.EJS_Runtime &&
    document.querySelector(`script[data-core-runtime="${core}"]`)
  ) {
    return Promise.resolve();
  }

  delete window.EJS_Runtime;
  document
    .querySelectorAll<HTMLScriptElement>("script[data-core-runtime]")
    .forEach((script) => script.remove());

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.coreRuntime = core;
    script.src = runtimeUrl;
    script.async = false;
    script.onload = () => {
      if (typeof window.EJS_Runtime === "function") {
        resolve();
      } else {
        reject(new Error(`${runtimeName} 未定义 EJS_Runtime`));
      }
    };
    script.onerror = () => reject(new Error(runtimeUrl));
    document.body.append(script);
  });
}

function installGamepadBridge(): void {
  console.log(
    "[gamepad] secure context:",
    window.isSecureContext,
    "getGamepads:",
    !!navigator.getGamepads,
  );
  clearInterval(gamepadBridgeTimer);
  syncGamepadsToEmulator();
  gamepadBridgeTimer = window.setInterval(syncGamepadsToEmulator, 500);
  window.addEventListener("gamepadconnected", syncGamepadsToEmulator);
  window.addEventListener("gamepaddisconnected", syncGamepadsToEmulator);
}

function installAudioResumeHandler(): void {
  if (!isMobileBrowser()) return;

  const tryClickResume = () => {
    for (const btn of document.querySelectorAll<HTMLButtonElement>(
      ".ejs_popup_container .ejs_menu_button",
    )) {
      if (btn.textContent?.toLowerCase().includes("resume")) {
        btn.click();
      }
    }
  };

  const onInteraction = () => {
    tryClickResume();
    const timer = window.setInterval(tryClickResume, 300);
    setTimeout(() => clearInterval(timer), 3000);
  };

  document.addEventListener("touchstart", onInteraction, {
    once: true,
    passive: true,
  });
  document.addEventListener("click", onInteraction, { once: true });
}

function syncGamepadsToEmulator(): void {
  const emulator = window.EJS_emulator;
  if (
    !emulator?.gamepad ||
    !emulator.gamepadLabels ||
    !emulator.gamepadSelection ||
    !emulator.updateGamepadLabels
  ) {
    return;
  }

  const detectedGamepads = getBrowserGamepads();

  if (detectedGamepads.length === 0) return;

  if (!emulator.gamepadSelection[0]) {
    const first = detectedGamepads[0];
    emulator.gamepadSelection[0] = `${first.id}_${first.index}`;
  }

  for (
    let playerIndex = 0;
    playerIndex < emulator.gamepadLabels.length;
    playerIndex++
  ) {
    const select = emulator.gamepadLabels[playerIndex];
    const selectedValue =
      emulator.gamepadSelection[playerIndex] || "notconnected";
    select.innerHTML = "";

    const notConnected = document.createElement("option");
    notConnected.value = "notconnected";
    notConnected.innerText = "Not Connected";
    select.append(notConnected);

    for (const gamepad of detectedGamepads) {
      const option = document.createElement("option");
      option.value = `${gamepad.id}_${gamepad.index}`;
      option.innerText = `${gamepad.id}_${gamepad.index}`;
      select.append(option);
    }

    select.value = selectedValue;
  }

  emulator.updateGamepadLabels();
}

function getBrowserGamepads(): BrowserGamepadSnapshot[] {
  if (!navigator.getGamepads) return [];

  const raw = navigator.getGamepads();
  //console.log("[gamepad] raw slots:", raw.length, "entries:", raw.map((g) => g ? `${g.id} (idx:${g.index})` : "null"));

  const gamepads = Array.from(raw)
    .filter((gamepad): gamepad is Gamepad => Boolean(gamepad))
    .map((gamepad) => ({
      axes: Array.from(gamepad.axes),
      buttons: Array.from(gamepad.buttons, (button) => ({
        pressed: button.pressed,
      })),
      id: gamepad.id || `Gamepad ${gamepad.index}`,
      index: gamepad.index,
    }));

  if (gamepads.length > 0) {
    console.log(
      "[gamepad] detected:",
      gamepads.map((g) => g.id),
    );
  }

  return gamepads;
}

function installVirtualControls(): void {
  const dpad = document.getElementById("mobileDpad");
  const touchZone = document.getElementById("dpadTouchZone");
  const cross = dpad?.querySelector(".mobile-dpad-cross") as HTMLElement | null;
  const buttons = document.querySelectorAll<HTMLElement>(
    "[data-virtual-input]",
  );

  let dpadOriginX = 0;
  let dpadOriginY = 0;
  let dpadDragging = false;
  const maxCrossDisplacement = 12;

  touchZone?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchZone.setPointerCapture(event.pointerId);
    if (!dpad) return;

    const controlsRect = (
      dpad.closest(".mobile-controls") as HTMLElement
    )?.getBoundingClientRect();
    if (!controlsRect) return;

    dpadOriginX = event.clientX;
    dpadOriginY = event.clientY;
    dpad.classList.remove("is-returning");
    dpad.style.left = `${event.clientX - controlsRect.left}px`;
    dpad.style.top = `${event.clientY - controlsRect.top}px`;
    dpadDragging = true;
  });

  touchZone?.addEventListener("pointermove", (event) => {
    if (!dpad || !dpadDragging) return;

    const dx = event.clientX - dpadOriginX;
    const dy = event.clientY - dpadOriginY;
    const dist = Math.hypot(dx, dy);
    const deadZone = 8;

    if (cross && dist > 0) {
      const clampedDist = Math.min(dist, maxCrossDisplacement);
      const angle = Math.atan2(dy, dx);
      cross.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;
    }

    if (dist < deadZone) {
      setVirtualDirection(null);
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      setVirtualDirection(dx > 0 ? 7 : 6);
    } else {
      setVirtualDirection(dy > 0 ? 5 : 4);
    }
  });

  const hideDpad = () => {
    dpadDragging = false;
    if (dpad) {
      dpad.classList.add("is-returning");
      dpad.style.left = "";
      dpad.style.top = "";
    }
    if (cross) {
      cross.style.transform = "";
    }
    dpadOriginX = 0;
    dpadOriginY = 0;
    clearVirtualDirection();
    setTimeout(() => dpad?.classList.remove("is-returning"), 250);
  };

  touchZone?.addEventListener("pointerup", hideDpad);
  touchZone?.addEventListener("pointercancel", hideDpad);
  touchZone?.addEventListener("lostpointercapture", hideDpad);

  buttons.forEach((button) => {
    const input = Number(button.dataset.virtualInput);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add("is-pressed");
      setVirtualInput(input, 1);
    });
    button.addEventListener("pointerup", (event) => {
      event.preventDefault();
      button.classList.remove("is-pressed");
      setVirtualInput(input, 0);
    });
    button.addEventListener("pointercancel", () => {
      button.classList.remove("is-pressed");
      setVirtualInput(input, 0);
    });
    button.addEventListener("lostpointercapture", () => {
      button.classList.remove("is-pressed");
      setVirtualInput(input, 0);
    });
  });
}

function setVirtualDirection(input: number | null): void {
  if (activeVirtualDirection === input) return;
  if (activeVirtualDirection !== null) {
    setVirtualInput(activeVirtualDirection, 0);
  }
  activeVirtualDirection = input;
  if (input !== null) {
    setVirtualInput(input, 1);
  }
}

function clearVirtualDirection(): void {
  setVirtualDirection(null);
}

function setVirtualInput(input: number, value: number): void {
  window.EJS_emulator?.gameManager?.simulateInput(0, input, value);
}

function isMobileBrowser(): boolean {
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 &&
      window.matchMedia("(max-width: 760px)").matches)
  );
}

function buildDefaultControls(): Record<string, unknown> {
  const blankPlayerControls = {
    0: { value: "", value2: "BUTTON_2" },
    1: { value: "", value2: "BUTTON_4" },
    2: { value: "", value2: "SELECT" },
    3: { value: "", value2: "START" },
    4: { value: "", value2: "DPAD_UP" },
    5: { value: "", value2: "DPAD_DOWN" },
    6: { value: "", value2: "DPAD_LEFT" },
    7: { value: "", value2: "DPAD_RIGHT" },
    8: { value: "", value2: "BUTTON_1" },
    9: { value: "", value2: "BUTTON_3" },
    10: { value: "", value2: "LEFT_TOP_SHOULDER" },
    11: { value: "", value2: "RIGHT_TOP_SHOULDER" },
    12: { value: "", value2: "LEFT_BOTTOM_SHOULDER" },
    13: { value: "", value2: "RIGHT_BOTTOM_SHOULDER" },
    14: { value: "", value2: "LEFT_STICK" },
    15: { value: "", value2: "RIGHT_STICK" },
    16: { value: "", value2: "LEFT_STICK_X:+1" },
    17: { value: "", value2: "LEFT_STICK_X:-1" },
    18: { value: "", value2: "LEFT_STICK_Y:+1" },
    19: { value: "", value2: "LEFT_STICK_Y:-1" },
    20: { value: "" },
    21: { value: "" },
    22: { value: "" },
    23: { value: "" },
    24: { value: "" },
    25: { value: "" },
    26: { value: "" },
    27: { value: "" },
    28: { value: "" },
    29: { value: "" },
  };

  return {
    0: {
      ...blankPlayerControls,
      0: { value: "j", value2: "BUTTON_1" },
      1: { value: "l", value2: "BUTTON_2" },
      2: { value: "1", value2: "SELECT" },
      3: { value: "enter", value2: "START" },
      4: { value: "w", value2: "DPAD_UP" },
      5: { value: "s", value2: "DPAD_DOWN" },
      6: { value: "a", value2: "DPAD_LEFT" },
      7: { value: "d", value2: "DPAD_RIGHT" },
      8: { value: "k", value2: "BUTTON_3" },
      9: { value: "i", value2: "BUTTON_4" },
      16: { value: "", value2: "LEFT_STICK_X:+1" },
      17: { value: "", value2: "LEFT_STICK_X:-1" },
      18: { value: "", value2: "LEFT_STICK_Y:+1" },
      19: { value: "", value2: "LEFT_STICK_Y:-1" },
    },
    1: { ...blankPlayerControls },
    2: { ...blankPlayerControls },
    3: { ...blankPlayerControls },
  };
}

function toRomEntry(id: string): RomEntry {
  const override = ROM_OVERRIDES[id] ?? {};
  const looksLikeBios =
    BIOS_SUFFIXES.some((token) => id.includes(token)) || id.endsWith("_bios");

  return {
    id,
    title: override.title ?? id,
    core: override.core ?? "fbneo",
    playable: override.playable ?? false,
    parent: override.parent,
    bios: override.bios,
    note: override.note,
  };
}

function getSelectedRom(): RomEntry | undefined {
  if (!selectedRomId) return undefined;
  return roms.find((rom) => rom.id === selectedRomId);
}

function renderGallery(playableRoms: RomEntry[]): void {
  galleryScroll.innerHTML = playableRoms
    .map(
      (rom) => `
    <div class="rom-card" data-rom-id="${rom.id}" tabindex="0">
      <div class="rom-card-image">
        <img src="/images/roms/${rom.id}.png" alt="${rom.title}" loading="lazy" />
        <div class="rom-card-fallback">${rom.title}</div>
      </div>
      <div class="rom-card-title">${rom.title}</div>
    </div>`,
    )
    .join("");

  galleryScroll.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".rom-card");
    if (card?.dataset.romId) {
      selectRom(card.dataset.romId);
    }
  });

  galleryScroll.addEventListener("dblclick", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".rom-card");
    if (card?.dataset.romId) {
      selectRom(card.dataset.romId);
      requestBoot(card.dataset.romId, coreSelect.value as ArcadeCore);
    }
  });

  galleryScroll.addEventListener(
    "error",
    (e) => {
      const img = e.target as HTMLImageElement;
      if (img.tagName === "IMG") {
        img.style.display = "none";
        const fallback = img.nextElementSibling as HTMLElement;
        if (fallback) fallback.style.display = "flex";
      }
    },
    true,
  );
}

function selectRom(romId: string): void {
  selectedRomId = romId;
  const rom = roms.find((r) => r.id === romId);
  if (!rom) return;
  coreSelect.value = rom.core;
  if (romSelectMobile) romSelectMobile.value = romId;

  galleryScroll.querySelectorAll<HTMLElement>(".rom-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.romId === romId);
  });

  const selectedCard = galleryScroll.querySelector<HTMLElement>(
    `.rom-card[data-rom-id="${romId}"]`,
  );
  if (selectedCard) {
    galleryScroll.scrollTo({
      left: selectedCard.offsetLeft,
      behavior: "smooth",
    });
  }

  updateSliderInfoFromRom(romId);

  statusText.textContent =
    rom.note ?? `${rom.title} 将使用 ${CORE_LABELS[rom.core]} 核心。`;
}

function filterGallery(query: string): void {
  const cards = galleryScroll.querySelectorAll<HTMLElement>(".rom-card");
  cards.forEach((card) => {
    const title = card.querySelector(".rom-card-title")?.textContent ?? "";
    const romId = card.dataset.romId ?? "";
    const match =
      !query ||
      title.toLowerCase().includes(query) ||
      romId.toLowerCase().includes(query);
    card.style.display = match ? "" : "none";
  });
}

function navigateSlider(direction: number): void {
  const cards = galleryScroll.querySelectorAll<HTMLElement>(
    ".rom-card:not([style*='display: none'])",
  );
  if (cards.length === 0) return;
  const currentCard = galleryScroll.querySelector<HTMLElement>(
    `.rom-card[data-rom-id="${selectedRomId}"]`,
  );
  const currentIndex = currentCard ? Array.from(cards).indexOf(currentCard) : 0;
  const newIndex = Math.min(
    Math.max(currentIndex + direction, 0),
    cards.length - 1,
  );
  const targetCard = cards[newIndex];
  if (targetCard?.dataset.romId) {
    selectRom(targetCard.dataset.romId);
  }
}

function scrollToSelected(): void {
  const selectedCard = galleryScroll.querySelector<HTMLElement>(
    `.rom-card[data-rom-id="${selectedRomId}"]`,
  );
  if (selectedCard && selectedCard.style.display !== "none") {
    galleryScroll.scrollTo({
      left: selectedCard.offsetLeft,
      behavior: "smooth",
    });
  } else {
    const first = galleryScroll.querySelector<HTMLElement>(
      ".rom-card:not([style*='display: none'])",
    );
    if (first?.dataset.romId) selectRom(first.dataset.romId);
  }
}

function updateSliderInfo(current: number, total: number): void {
  if (!sliderInfo) return;
  sliderInfo.textContent = `${current + 1} / ${total}`;
}

function updateSliderInfoFromRom(romId: string): void {
  if (!sliderInfo) return;
  const cards = galleryScroll.querySelectorAll<HTMLElement>(
    ".rom-card:not([style*='display: none'])",
  );
  const allCards = galleryScroll.querySelectorAll<HTMLElement>(".rom-card");
  const index = Array.from(allCards).findIndex(
    (c) => c.dataset.romId === romId,
  );
  updateSliderInfo(index >= 0 ? index : 0, cards.length);
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}`);
  }
  return element as T;
}

function removeExistingLoader(): void {
  document
    .querySelectorAll<HTMLScriptElement>(
      'script[data-emulatorjs-loader="true"], script[src$="/loader.js"]',
    )
    .forEach((script) => script.remove());
}

function hasLoadedEmulatorRuntime(): boolean {
  return Boolean(
    window.EmulatorJS ||
    window.EJS_emulator ||
    document.querySelector(
      'script[src$="/emulator.min.js"], script[data-emulatorjs-loader="true"]',
    ),
  );
}

async function requestWakeLock(): Promise<void> {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    // Wake lock may fail (e.g. low power mode), ignore
  }
}

function releaseWakeLock(): void {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    sessionStorage.getItem(ACTIVE_GAME_KEY)
  ) {
    requestWakeLock();
  }
});

window.addEventListener("pagehide", () => {
  // ACTIVE_GAME_KEY is already in sessionStorage for auto-resume.
  // Release wake lock synchronously.
  releaseWakeLock();
});
