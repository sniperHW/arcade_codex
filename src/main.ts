import "./styles.css";

type ArcadeCore = "fbneo" | "mame2003" | "mame2003_plus";

type RomEntry = {
  id: string;
  title: string;
  core: ArcadeCore;
  playable: boolean;
  note?: string;
};

declare global {
  interface Window {
    EJS_player: string;
    EJS_core: ArcadeCore;
    EJS_gameName?: string;
    EJS_gameUrl: string;
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
    EJS_defaultOptions: Record<string, unknown>;
    EJS_defaultControls: Record<string, unknown>;
    EJS_ready?: () => void;
    EJS_emulator?: EmulatorJsInstance;
    EJS_Runtime?: unknown;
    EmulatorJS?: unknown;
  }
}

const PENDING_BOOT_KEY = "arcade-codex-pending-boot";
let gamepadBridgeTimer = 0;

type EmulatorJsInstance = {
  callEvent?: (eventName: string) => void;
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
  mame2003_plus: "MAME 2003 Plus"
};

const ROM_OVERRIDES: Record<string, Partial<RomEntry>> = {
  "1942": { title: "1942", core: "fbneo", playable: true },
  bloodbro: { title: "Blood Bros.", core: "mame2003_plus", playable: true },
  dino: { title: "Cadillacs and Dinosaurs", core: "fbneo", playable: true },
  dinou: { title: "Cadillacs and Dinosaurs (US)", core: "fbneo", playable: true },
  goalx3: { title: "Goal! Goal! Goal!", core: "fbneo", playable: true },
  heatbrl: { title: "Heated Barrel", core: "fbneo", playable: true },
  hook: { title: "Hook", core: "fbneo", playable: true },
  kof97: { title: "The King of Fighters '97", core: "fbneo", playable: true },
  kov2: { title: "Knights of Valour 2", core: "fbneo", playable: true },
  s1945: { title: "Strikers 1945", core: "fbneo", playable: true },
  s1945ii: { title: "Strikers 1945 II", core: "fbneo", playable: true },
  sf2: { title: "Street Fighter II", core: "fbneo", playable: true },
  neogeo: { title: "Neo Geo BIOS", core: "fbneo", playable: false, note: "BIOS 文件，供 Neo Geo 游戏依赖" },
  pgm: { title: "PGM BIOS", core: "fbneo", playable: false, note: "BIOS 文件，供 PGM 游戏依赖" }
};

const BIOS_SUFFIXES = ["bios", "naomi", "sys", "taito", "konami", "cpzn", "megaplay", "megatech"];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app element");
}

app.innerHTML = `
  <main class="shell">
    <section class="toolbar" aria-label="模拟器控制">
      <div class="brand">
        <h1>Arcade Codex</h1>
        <p>800x600 browser arcade runtime</p>
      </div>
      <div class="controls">
        <label>
          ROM
          <select id="romSelect"></select>
        </label>
        <label>
          Core
          <select id="coreSelect">
            ${Object.entries(CORE_LABELS).map(([core, label]) => `<option value="${core}">${label}</option>`).join("")}
          </select>
        </label>
        <button id="runButton" type="button">运行</button>
      </div>
    </section>

    <section class="cabinet">
      <div id="game" class="screen">
        <div class="empty">
          <strong>选择游戏并运行</strong>
          <span>WASD 方向 · Enter 选择 · 1 投币 · J/K/L 按钮</span>
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

const romSelect = getElement<HTMLSelectElement>("romSelect");
const coreSelect = getElement<HTMLSelectElement>("coreSelect");
const runButton = getElement<HTMLButtonElement>("runButton");
const statusText = getElement<HTMLSpanElement>("statusText");
const gameContainer = getElement<HTMLDivElement>("game");

let roms: RomEntry[] = [];

loadRomList().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  statusText.textContent = `读取 ROM 列表失败: ${message}`;
  runButton.disabled = true;
});

romSelect.addEventListener("change", () => {
  const selected = getSelectedRom();
  if (!selected) return;
  coreSelect.value = selected.core;
  statusText.textContent = selected.note ?? `${selected.title} 将使用 ${CORE_LABELS[selected.core]} 核心。`;
});

runButton.addEventListener("click", () => {
  const selected = getSelectedRom();
  if (!selected) return;
  requestBoot(selected.id, coreSelect.value as ArcadeCore);
});

async function loadRomList(): Promise<void> {
  const response = await fetch("/roms.json");
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const ids = (await response.json()) as string[];
  roms = ids.map(toRomEntry);
  const playableRoms = roms.filter((rom) => rom.playable);

  romSelect.innerHTML = playableRoms
    .map((rom) => `<option value="${rom.id}">${rom.title}</option>`)
    .join("");

  const firstPlayable = playableRoms[0];
  if (firstPlayable) {
    romSelect.value = firstPlayable.id;
    coreSelect.value = firstPlayable.core;
    statusText.textContent = `已载入 ${roms.length} 个 ROM，当前选择 ${firstPlayable.title}。`;
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
  if (!pendingBoot) return;

  sessionStorage.removeItem(PENDING_BOOT_KEY);
  try {
    const boot = JSON.parse(pendingBoot) as { romId: string; core: ArcadeCore };
    if (roms.some((rom) => rom.id === boot.romId && rom.playable)) {
      romSelect.value = boot.romId;
      coreSelect.value = boot.core;
      bootGame(boot.romId, boot.core);
    }
  } catch {
    statusText.textContent = "恢复游戏启动状态失败，请重新选择 ROM。";
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

  const player = document.createElement("div");
  player.id = "emulator";
  player.className = "emulator";
  gameContainer.append(player);

  window.EJS_player = "#emulator";
  window.EJS_core = core;
  window.EJS_gameName = selected.title;
  window.EJS_gameUrl = `/roms/${romId}.zip`;
  window.EJS_pathtodata = "/emulatorjs-data/";
  window.EJS_startOnLoaded = true;
  window.EJS_fullscreenOnLoaded = false;
  window.EJS_backgroundColor = "#050505";
  window.EJS_color = "#9fd36f";
  window.EJS_volume = 0.75;
  window.EJS_language = "en-US";
  window.EJS_disableAutoLang = false;
  window.EJS_threads = false;
  window.EJS_disableLocalStorage = true;
  window.EJS_controlScheme = "arcade";
  window.EJS_defaultOptions = {
    "ejs_threads": "disabled",
    "save-state-slot": 1,
    "rewind": false
  };
  window.EJS_defaultControls = buildDefaultControls();
  window.EJS_ready = installGamepadBridge;

  loadCoreRuntime(core)
    .then(() => {
      removeExistingLoader();
      const loader = document.createElement("script");
      loader.dataset.emulatorjsLoader = "true";
      loader.src = `${window.EJS_pathtodata}loader.js`;
      loader.async = true;
      loader.onerror = () => {
        statusText.textContent = "模拟器核心加载失败，请检查 /emulatorjs-data/ 本地文件是否完整。";
      };
      loader.onload = () => {
        statusText.textContent = `${selected.title} 已加载。`;
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

  if (window.EJS_Runtime && document.querySelector(`script[data-core-runtime="${core}"]`)) {
    return Promise.resolve();
  }

  delete window.EJS_Runtime;
  document.querySelectorAll<HTMLScriptElement>("script[data-core-runtime]").forEach((script) => script.remove());

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
  clearInterval(gamepadBridgeTimer);
  syncGamepadsToEmulator();
  gamepadBridgeTimer = window.setInterval(syncGamepadsToEmulator, 500);
  window.addEventListener("gamepadconnected", syncGamepadsToEmulator);
  window.addEventListener("gamepaddisconnected", syncGamepadsToEmulator);
}

function syncGamepadsToEmulator(): void {
  const emulator = window.EJS_emulator;
  if (!emulator?.gamepad || !emulator.gamepadLabels || !emulator.gamepadSelection || !emulator.updateGamepadLabels) {
    return;
  }

  const detectedGamepads = getBrowserGamepads();

  if (emulator.gamepad.gamepads.length > 0) {
    if (!emulator.gamepadSelection[0]) {
      const first = emulator.gamepad.gamepads[0];
      emulator.gamepadSelection[0] = `${first.id}_${first.index}`;
    }
    emulator.updateGamepadLabels();
    return;
  }

  if (detectedGamepads.length > 0 && !emulator.gamepadSelection[0]) {
    const first = detectedGamepads[0];
    emulator.gamepadSelection[0] = `${first.id}_${first.index}`;
  }

  for (let playerIndex = 0; playerIndex < emulator.gamepadLabels.length; playerIndex++) {
    const select = emulator.gamepadLabels[playerIndex];
    const selectedValue = emulator.gamepadSelection[playerIndex] || "notconnected";
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
}

function getBrowserGamepads(): BrowserGamepadSnapshot[] {
  const rawGamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];

  return rawGamepads
    .filter((gamepad): gamepad is Gamepad => Boolean(gamepad))
    .map((gamepad) => ({
      axes: Array.from(gamepad.axes),
      buttons: Array.from(gamepad.buttons, (button) => ({ pressed: button.pressed })),
      id: gamepad.id || `Gamepad ${gamepad.index}`,
      index: gamepad.index
    }));
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
    29: { value: "" }
  };

  return {
    0: {
      ...blankPlayerControls,
      0: { value: "j", value2: "BUTTON_1" },
      1: { value: "k", value2: "BUTTON_2" },
      2: { value: "1", value2: "SELECT" },
      3: { value: "enter", value2: "START" },
      4: { value: "w", value2: "DPAD_UP" },
      5: { value: "s", value2: "DPAD_DOWN" },
      6: { value: "a", value2: "DPAD_LEFT" },
      7: { value: "d", value2: "DPAD_RIGHT" },
      8: { value: "l", value2: "BUTTON_3" },
      16: { value: "", value2: "LEFT_STICK_X:+1" },
      17: { value: "", value2: "LEFT_STICK_X:-1" },
      18: { value: "", value2: "LEFT_STICK_Y:+1" },
      19: { value: "", value2: "LEFT_STICK_Y:-1" }
    },
    1: { ...blankPlayerControls },
    2: { ...blankPlayerControls },
    3: { ...blankPlayerControls }
  };
}

function toRomEntry(id: string): RomEntry {
  const override = ROM_OVERRIDES[id] ?? {};
  const looksLikeBios = BIOS_SUFFIXES.some((token) => id.includes(token)) || id.endsWith("_bios");

  return {
    id,
    title: override.title ?? id,
    core: override.core ?? "fbneo",
    playable: override.playable ?? false,
    note: override.note
  };
}

function getSelectedRom(): RomEntry | undefined {
  return roms.find((rom) => rom.id === romSelect.value);
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
    .querySelectorAll<HTMLScriptElement>('script[data-emulatorjs-loader="true"], script[src$="/loader.js"]')
    .forEach((script) => script.remove());
}

function hasLoadedEmulatorRuntime(): boolean {
  return Boolean(
    window.EmulatorJS ||
      window.EJS_emulator ||
      document.querySelector('script[src$="/emulator.min.js"], script[data-emulatorjs-loader="true"]')
  );
}
