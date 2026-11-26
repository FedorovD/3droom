import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Footprints,
  Layers,
  Ruler,
  Sun,
  Moon,
} from 'lucide-react';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DimensionMode,
  FLOOR_FINISHES,
  FloorFinishId,
  LightingMode,
  ViewMode,
} from '../scene/dimensions';

interface ControlDockProps {
  activePreset: CameraPresetId;
  onSelectPreset: (preset: CameraPresetId) => void;
  walkMode: boolean;
  onToggleWalkMode: () => void;
  currentRoom: string;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  lightingMode: LightingMode;
  onChangeLightingMode: (mode: LightingMode) => void;
  floorFinish: FloorFinishId;
  onChangeFloorFinish: (finish: FloorFinishId) => void;
  dimensionMode: DimensionMode;
  onCycleDimensions: () => void;
  dockCollapsed: boolean;
  onToggleDock: () => void;
}

export function ControlDock({
  activePreset,
  onSelectPreset,
  walkMode,
  onToggleWalkMode,
  currentRoom,
  viewMode,
  onChangeViewMode,
  lightingMode,
  onChangeLightingMode,
  floorFinish,
  onChangeFloorFinish,
  dimensionMode,
  onCycleDimensions,
  dockCollapsed,
  onToggleDock,
}: ControlDockProps) {
  const [finishMenuOpen, setFinishMenuOpen] = useState(false);
  const activeFinishOption =
    FLOOR_FINISHES.find((f) => f.id === floorFinish) ?? FLOOR_FINISHES[0];

  return (
    <>
      {/* Minimal Top-Left Architectural Header (responsive on mobile, no backdrop-filter) */}
      <header className="pointer-events-none fixed top-3 left-3 z-10 max-w-[calc(100%-138px)] select-none sm:top-5 sm:left-5 sm:max-w-none">
        <div className="pointer-events-auto inline-block max-w-full border border-white/10 bg-[#171918]/92 px-3 py-2 shadow-lg sm:px-4 sm:py-2.5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xs font-semibold tracking-tight text-[#f0efec] sm:text-sm">
              Квартира и санузел — 3D план
            </h1>
            {walkMode && currentRoom && (
              <span className="border border-[#7a9181]/45 bg-[#232b26] px-2 py-0.5 text-[10px] font-medium text-[#c5d9cb] sm:text-[11px]">
                {currentRoom}
              </span>
            )}
          </div>
          <div className="font-mono-nums mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#a3a19a] sm:gap-2 sm:text-[11px]">
            <span>59.75 м²</span>
            <span aria-hidden="true">·</span>
            <span>5 помещений</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline">
              Санузел с отделкой · Белые стены · {activeFinishOption.shortLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Top-Right Finish Selection Menu (Отделка пола) */}
      <aside
        className="pointer-events-none fixed top-3 right-3 z-20 flex flex-col items-end select-none sm:top-5 sm:right-5"
        aria-label="Выбор отделки"
      >
        <div className="pointer-events-auto w-[228px] max-w-[calc(100vw-24px)] border border-white/10 bg-[#171918]/94 shadow-xl sm:w-[264px]">
          <button
            type="button"
            onClick={() => setFinishMenuOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
            aria-expanded={finishMenuOpen}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Layers className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-tight text-[#f0efec] sm:text-xs">
                  Отделка пола
                </div>
                {!finishMenuOpen && (
                  <div className="truncate text-[10px] text-[#a3a19a]">
                    {activeFinishOption.shortLabel}
                  </div>
                )}
              </div>
            </div>
            {finishMenuOpen ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#9c9a93]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9c9a93]" />
            )}
          </button>

          {finishMenuOpen && (
            <div className="border-t border-white/10 p-1.5">
              <div className="flex flex-col gap-1" role="radiogroup" aria-label="Покрытие пола">
                {FLOOR_FINISHES.map((opt, idx) => {
                  const isActive = floorFinish === opt.id;
                  const isDisabled = !opt.ready;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={isDisabled}
                      onClick={() => onChangeFloorFinish(opt.id)}
                      className={`group flex w-full items-center gap-2.5 border px-2 py-1.5 text-left transition-colors ${
                        isActive
                          ? 'border-[#7a9181] bg-[#222a24]'
                          : isDisabled
                            ? 'cursor-not-allowed border-white/5 bg-[#1b1d1c]/70 opacity-55'
                            : 'border-white/8 bg-[#1e2120] hover:border-white/20 hover:bg-[#252927]'
                      }`}
                    >
                      {/* Swatch thumbnail calibrated to real-room board tone */}
                      <div
                        className="relative h-9 w-9 shrink-0 overflow-hidden border border-white/15"
                        style={{ backgroundColor: opt.swatchColor }}
                      >
                        {opt.swatchSrc ? (
                          <>
                            <img
                              src={opt.swatchSrc}
                              alt={opt.label}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover grayscale-[0.55] contrast-[0.95] brightness-[1.06]"
                            />
                            <div
                              className="pointer-events-none absolute inset-0 mix-blend-color opacity-85"
                              style={{ backgroundColor: opt.swatchColor }}
                            />
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-mono-nums text-white/50">
                            {idx < 2 ? `${idx + 1}` : '0'}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-[11px] font-medium leading-tight ${
                            isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                          }`}
                        >
                          {opt.label}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] leading-tight text-[#96948d]">
                          {opt.subtitle}
                        </div>
                      </div>

                      {isActive && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Unified Collapsible Bottom Control Dock — centered strictly with inset-x-0 + flex justify-center (never shifts left) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-2.5 z-20 flex justify-center px-2 sm:bottom-4 sm:px-4">
        <div
          className="pointer-events-auto flex w-full max-w-[1180px] flex-col items-center transition-transform duration-300 ease-out"
          style={{
            transform: dockCollapsed
              ? 'translateY(calc(100% - 28px))'
              : 'translateY(0)',
          }}
        >
          {/* Minimal Walk Mode Navigation Hint Strip */}
          {walkMode && !dockCollapsed && (
            <div className="mb-1.5 max-w-full border border-white/10 bg-[#171918]/94 px-3 py-1 text-center text-[10px] text-[#c5c3bc] shadow-lg sm:px-3.5 sm:text-[11px]">
              <span className="sm:hidden">
                Свайп — осмотр · Тап по полу — идти
              </span>
              <span className="hidden sm:inline">
                WASD / стрелки — идти
                <span className="mx-2 text-[#696863]" aria-hidden="true">·</span>
                Мышь — осмотр
                <span className="mx-2 text-[#696863]" aria-hidden="true">·</span>
                Клик по полу — подойти
                <span className="mx-2 text-[#696863]" aria-hidden="true">·</span>
                Shift — быстрее
                <span className="mx-2 text-[#696863]" aria-hidden="true">·</span>
                Esc — выход
              </span>
            </div>
          )}

          {/* Collapse / Expand Drawer Handle */}
          <button
            type="button"
            onClick={onToggleDock}
            className="flex h-7 items-center gap-1.5 border border-b-0 border-white/12 bg-[#171918]/94 px-3.5 text-[11px] font-medium text-[#b9b7b0] transition-colors hover:text-[#f0efec]"
            aria-expanded={!dockCollapsed}
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Показать панель</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Скрыть панель</span>
              </>
            )}
          </button>

          {/* Main Dock Body: compact horizontally-scrollable rows on mobile, clean flex layout on desktop */}
          <div className="w-full overflow-hidden border border-white/12 bg-[#171918]/95 px-2 py-2 shadow-2xl sm:px-3 sm:py-2.5">
            <div className="flex flex-col gap-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-2.5">
              {/* Zone 1: Walk Mode Toggle + Camera Presets */}
              <div
                className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto sm:flex-wrap"
                role="group"
                aria-label="Режим прогулки и ракурсы камеры"
              >
                <button
                  type="button"
                  onClick={onToggleWalkMode}
                  className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors sm:text-xs ${
                    walkMode
                      ? 'bg-[#7a9181] text-[#111412]'
                      : 'border border-[#7a9181]/45 bg-[#202722] text-[#d6e4da] hover:bg-[#2a342d] hover:text-white'
                  }`}
                  title="Ходить от первого лица (F)"
                >
                  <Footprints className="h-3.5 w-3.5" />
                  <span>Прогулка</span>
                </button>

                <div className="mx-0.5 h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />

                {CAMERA_PRESETS.map((preset) => {
                  const isActive = !walkMode && activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset.id)}
                      className={`flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                        isActive
                          ? 'bg-[#7a9181] text-[#111412]'
                          : 'bg-[#222524] text-[#d1cfc8] hover:bg-[#2c302e] hover:text-white'
                      }`}
                    >
                      <span
                        className={`font-mono-nums hidden text-[10px] sm:inline ${
                          isActive ? 'text-[#111412]/70' : 'text-[#8c8a83]'
                        }`}
                      >
                        {preset.shortKey}
                      </span>
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Subtle vertical separator on wide viewports */}
              <div className="hidden h-5 w-px bg-white/10 lg:block" aria-hidden="true" />

              {/* Zone 2: Wall Cutaway + Finish Stage + Lighting + Utilities */}
              <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto sm:flex-wrap sm:gap-2">
                {/* View mode: Cutaway vs Interior */}
                <div className="flex shrink-0 items-center bg-[#222524] p-0.5">
                  <button
                    type="button"
                    onClick={() => onChangeViewMode('cutaway')}
                    className={`px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                      !walkMode && viewMode === 'cutaway'
                        ? 'bg-[#363b39] text-white'
                        : 'text-[#a3a19a] hover:text-[#e5e4de]'
                    }`}
                  >
                    Разрез
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeViewMode('interior')}
                    className={`px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                      walkMode || viewMode === 'interior'
                        ? 'bg-[#363b39] text-white'
                        : 'text-[#a3a19a] hover:text-[#e5e4de]'
                    }`}
                  >
                    Внутри
                  </button>
                </div>

                {/* Lighting Mood Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    onChangeLightingMode(
                      lightingMode === 'daylight' ? 'warmSpa' : 'daylight'
                    )
                  }
                  className="flex shrink-0 items-center gap-1.5 bg-[#222524] px-2 py-1.5 text-[11px] font-medium whitespace-nowrap text-[#d1cfc8] transition-colors hover:bg-[#2c302e] hover:text-white sm:px-2.5 sm:text-xs"
                  title="Переключить освещение"
                >
                  {lightingMode === 'daylight' ? (
                    <>
                      <Sun className="h-3.5 w-3.5 text-[#d9c39e]" />
                      <span>Дневной</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-3.5 w-3.5 text-[#c8a97e]" />
                      <span>Вечерний</span>
                    </>
                  )}
                </button>

                {/* 3D Dimensions 3-State Cycle Toggle (Off -> Basic -> Detailed) */}
                <button
                  type="button"
                  onClick={onCycleDimensions}
                  title="Размеры: выкл → основные → все линейки"
                  className={`flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                    dimensionMode === 'detailed'
                      ? 'bg-[#c9b482] text-[#141310]'
                      : dimensionMode === 'basic'
                        ? 'bg-[#7a9181] text-[#111412]'
                        : 'bg-[#222524] text-[#d1cfc8] hover:bg-[#2c302e] hover:text-white'
                  }`}
                >
                  <Ruler className="h-3.5 w-3.5" />
                  <span>
                    {dimensionMode === 'detailed' ? 'Все размеры' : 'Размеры'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
