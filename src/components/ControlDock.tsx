import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Footprints,
  Glasses,
  Lamp,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  RefreshCw,
  RotateCcw,
  Ruler,
  Share2,
  SlidersHorizontal,
  Sofa,
  Sun,
  X,
} from 'lucide-react';
import {
  BEDROOM_STYLES,
  CEILING_STYLES,
  CuratedDesignPreset,
  DESIGN_PRESETS,
  DesignConfig,
  KITCHEN_STYLES,
  SOFA_STYLES,
  TV_ZONE_STYLES,
  WALL_FINISHES,
} from '../scene/designCatalog';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DimensionMode,
  FLOOR_FINISHES,
  FloorFinishId,
  LightingMode,
  ViewMode,
} from '../scene/dimensions';
import {
  ALL_EDITABLE_IDS,
  getEditableLabel,
  ObjectEditsMap,
} from '../scene/editableObjects';
import {
  EditableObjectType,
  getVariantById,
  getVariantsForType,
  getVariantThumbnail,
  groupEditableIdsByType,
} from '../scene/objectCatalog';
import { GyroStatus, VR_VIEWPOINTS, VrViewpointId } from '../scene/vrPanorama';
import { DesignTab, WallZoneTab } from '../state/storage';

export interface SharePanelState {
  status: 'idle' | 'saving' | 'ready' | 'error';
  url: string;
  copied: boolean;
  error: string;
}

export interface SharedBannerState {
  kind: 'loading' | 'loaded' | 'not_found' | 'error';
  text: string;
}

interface ControlDockProps {
  activePreset: CameraPresetId;
  onSelectPreset: (preset: CameraPresetId) => void;
  walkMode: boolean;
  onToggleWalkMode: () => void;
  vrPanoMode: boolean;
  onToggleVrPanoMode: () => void;
  vrViewpoint: VrViewpointId;
  onSelectVrViewpoint: (id: VrViewpointId) => void;
  vrGyroStatus: GyroStatus;
  onRecenterVr: () => void;
  xrSupported: boolean;
  xrSessionActive: boolean;
  onEnterWebXR: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  currentRoom: string;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  lightingMode: LightingMode;
  onChangeLightingMode: (mode: LightingMode) => void;
  floorFinish: FloorFinishId;
  onChangeFloorFinish: (finish: FloorFinishId) => void;
  designConfig: DesignConfig;
  onUpdateDesign: (patch: Partial<DesignConfig>) => void;
  onApplyConcept: (preset: CuratedDesignPreset) => void;
  onResetDesign: () => void;
  dimensionMode: DimensionMode;
  onCycleDimensions: () => void;
  dockCollapsed: boolean;
  onToggleDock: () => void;
  finishMenuOpen: boolean;
  onToggleFinishMenu: () => void;
  activeTab: DesignTab;
  onChangeActiveTab: (tab: DesignTab) => void;
  wallZoneTab: WallZoneTab;
  onChangeWallZoneTab: (tab: WallZoneTab) => void;
  objectEdits: ObjectEditsMap;
  onReplaceObject: (id: string, variantId: string | null) => void;
  onResetObjects: (ids: string[]) => void;
  shareState: SharePanelState;
  onShareScene: () => void;
  onCopyShareUrl: () => void;
  onCloseSharePanel: () => void;
  sharedBanner: SharedBannerState | null;
}

export function ControlDock({
  activePreset,
  onSelectPreset,
  walkMode,
  onToggleWalkMode,
  vrPanoMode,
  onToggleVrPanoMode,
  vrViewpoint,
  onSelectVrViewpoint,
  vrGyroStatus,
  onRecenterVr,
  xrSupported,
  xrSessionActive,
  onEnterWebXR,
  isFullscreen,
  onToggleFullscreen,
  currentRoom,
  viewMode,
  onChangeViewMode,
  lightingMode,
  onChangeLightingMode,
  floorFinish,
  onChangeFloorFinish,
  designConfig,
  onUpdateDesign,
  onApplyConcept,
  onResetDesign,
  dimensionMode,
  onCycleDimensions,
  dockCollapsed,
  onToggleDock,
  finishMenuOpen,
  onToggleFinishMenu,
  activeTab,
  onChangeActiveTab,
  wallZoneTab,
  onChangeWallZoneTab,
  objectEdits,
  onReplaceObject,
  onResetObjects,
  shareState,
  onShareScene,
  onCopyShareUrl,
  onCloseSharePanel,
  sharedBanner,
}: ControlDockProps) {
  const [restoreListOpen, setRestoreListOpen] = useState(false);
  const [selectedRestoreIds, setSelectedRestoreIds] = useState<string[]>([]);
  const [catalogGroupsOpen, setCatalogGroupsOpen] = useState(false);
  const [openTypeGroup, setOpenTypeGroup] = useState<EditableObjectType | null>(null);
  const [activeCatalogItemId, setActiveCatalogItemId] = useState<string | null>(null);

  const editedEntries = Object.entries(objectEdits);
  const editedObjectsCount = editedEntries.length;
  const groupedEdited = groupEditableIdsByType(editedEntries.map(([id]) => id));
  const groupedAllEditable = groupEditableIdsByType(ALL_EDITABLE_IDS);

  // Keep checked IDs synchronized with currently edited objects and close panel when empty
  useEffect(() => {
    setSelectedRestoreIds((prev) => prev.filter((id) => id in objectEdits));
    if (editedObjectsCount === 0) {
      setRestoreListOpen(false);
    }
  }, [objectEdits, editedObjectsCount]);

  const toggleRestoreId = (id: string) => {
    setSelectedRestoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected =
    editedObjectsCount > 0 && selectedRestoreIds.length === editedObjectsCount;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedRestoreIds([]);
    } else {
      setSelectedRestoreIds(editedEntries.map(([id]) => id));
    }
  };

  const handleRestoreSelected = () => {
    if (selectedRestoreIds.length === 0) return;
    onResetObjects(selectedRestoreIds);
    setSelectedRestoreIds([]);
  };

  const activeFinishOption =
    FLOOR_FINISHES.find((f) => f.id === floorFinish) ?? FLOOR_FINISHES[0];
  const activeWallOption =
    WALL_FINISHES.find((w) => w.id === designConfig.wallFinish) ?? WALL_FINISHES[0];
  const resolvedBedroomWallId =
    designConfig.bedroomWallFinish === 'same'
      ? designConfig.wallFinish
      : designConfig.bedroomWallFinish;
  const activeBedroomWallOption =
    WALL_FINISHES.find((w) => w.id === resolvedBedroomWallId) ?? activeWallOption;
  const hasSeparateBedroomWall =
    designConfig.bedroomWallFinish !== 'same' &&
    designConfig.bedroomWallFinish !== designConfig.wallFinish;
  const wallSummaryLabel = hasSeparateBedroomWall
    ? `${activeWallOption.shortLabel} / ${activeBedroomWallOption.shortLabel}`
    : activeWallOption.shortLabel;
  const editingWallOption =
    wallZoneTab === 'main' ? activeWallOption : activeBedroomWallOption;

  const isFurnished =
    designConfig.tvZone !== 'none' ||
    designConfig.sofa !== 'none' ||
    designConfig.kitchen !== 'none' ||
    designConfig.bedroom !== 'none' ||
    designConfig.entryFurniture ||
    designConfig.curtains;

  const activeConceptId = DESIGN_PRESETS.find(
    (p) =>
      p.floorFinish === floorFinish &&
      p.design.wallFinish === designConfig.wallFinish &&
      p.design.bedroomWallFinish === designConfig.bedroomWallFinish &&
      p.design.ceilingStyle === designConfig.ceilingStyle &&
      p.design.tvZone === designConfig.tvZone &&
      p.design.sofa === designConfig.sofa &&
      p.design.kitchen === designConfig.kitchen &&
      p.design.bedroom === designConfig.bedroom &&
      p.design.entryFurniture === designConfig.entryFurniture &&
      p.design.curtains === designConfig.curtains
  )?.id;

  const handleStageAllFurniture = () => {
    onUpdateDesign({
      tvZone: designConfig.tvZone === 'none' ? 'minimal_wood' : designConfig.tvZone,
      sofa: designConfig.sofa === 'none' ? 'boucle_l' : designConfig.sofa,
      kitchen: designConfig.kitchen === 'none' ? 'warm_cashmere' : designConfig.kitchen,
      bedroom: designConfig.bedroom === 'none' ? 'soft_linen' : designConfig.bedroom,
      entryFurniture: true,
      curtains: true,
    });
  };

  const handleClearFurniture = () => {
    onUpdateDesign({
      tvZone: 'none',
      sofa: 'none',
      kitchen: 'none',
      bedroom: 'none',
      entryFurniture: false,
      curtains: false,
    });
  };

  return (
    <>
      {/* Subtle Top-Center Banner When Loading / Opening a Shared Link */}
      {sharedBanner && (
        <div
          className="pointer-events-none fixed inset-x-0 top-3 z-30 flex justify-center px-3 sm:top-5"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-2 border px-3 py-1.5 text-[11px] font-medium shadow-xl sm:text-xs ${
              sharedBanner.kind === 'error' || sharedBanner.kind === 'not_found'
                ? 'border-[#c47c7c]/45 bg-[#241919]/96 text-[#f0d2d2]'
                : 'border-[#7a9181]/45 bg-[#171918]/96 text-[#e4ece6]'
            }`}
          >
            {sharedBanner.kind === 'loading' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9cb8a4]" />
            )}
            {sharedBanner.kind === 'loaded' && (
              <Check className="h-3.5 w-3.5 text-[#9cb8a4]" />
            )}
            <span>{sharedBanner.text}</span>
          </div>
        </div>
      )}

      {/* Top-Right Collapsible Design & Finish Configurator (Дизайн и отделка) */}
      <aside
        className="pointer-events-none fixed top-3 right-3 z-20 flex flex-col items-end select-none sm:top-5 sm:right-5"
        aria-label="Дизайн и отделка квартиры"
      >
        <div
          className={`pointer-events-auto border border-white/12 bg-[#171918]/95 shadow-2xl transition-[width] duration-200 ${
            finishMenuOpen
              ? 'w-[294px] max-w-[calc(100vw-24px)] sm:w-[340px]'
              : 'w-[208px] max-w-[calc(100vw-24px)] sm:w-[258px]'
          }`}
        >
          {/* Header Toggle Button */}
          <button
            type="button"
            onClick={onToggleFinishMenu}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
            aria-expanded={finishMenuOpen}
          >
            <div className="flex min-w-0 items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-tight text-[#f0efec] sm:text-xs">
                  Дизайн и отделка
                </div>
                {!finishMenuOpen && (
                  <div className="truncate text-[10px] text-[#a3a19a]">
                    {wallSummaryLabel} · {activeFinishOption.shortLabel}
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
            <div className="flex max-h-[calc(100dvh-146px)] flex-col border-t border-white/10">
              {/* Quick Curated Concepts Strip + Reset */}
              <div className="border-b border-white/10 bg-[#141615] px-2.5 py-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium tracking-wide text-[#9c9a93] uppercase">
                    Готовые концепции
                  </span>
                  <button
                    type="button"
                    onClick={onResetDesign}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#a3a19a] transition-colors hover:bg-white/[0.05] hover:text-[#f0efec]"
                    title="Вернуть базовую отделку без мебели"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Сброс</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {DESIGN_PRESETS.map((preset) => {
                    const isSelected = activeConceptId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApplyConcept(preset)}
                        className={`flex flex-col gap-1 border px-1.5 py-1.5 text-left transition-colors ${
                          isSelected
                            ? 'border-[#7a9181] bg-[#222a24]'
                            : 'border-white/8 bg-[#1c1f1e] hover:border-white/20 hover:bg-[#242826]'
                        }`}
                        title={preset.subtitle}
                      >
                        <div className="flex h-2 w-full overflow-hidden border border-white/10">
                          {preset.swatches.map((hex, idx) => (
                            <span
                              key={idx}
                              className="h-full flex-1"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        <span
                          className={`line-clamp-2 text-[10px] leading-tight font-medium ${
                            isSelected ? 'text-[#f0efec]' : 'text-[#cfcdc6]'
                          }`}
                        >
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {editedObjectsCount > 0 && (
                  <div className="mt-2 border border-[#7a9181]/35 bg-[#191e1b]">
                    <button
                      type="button"
                      onClick={() => setRestoreListOpen((v) => !v)}
                      aria-expanded={restoreListOpen}
                      className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-[10.5px] font-medium text-[#d5e3d8] transition-colors hover:bg-[#222a24] hover:text-white"
                    >
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="h-3 w-3 shrink-0 text-[#9cb8a4]" />
                        <span>Вернуть объекты и позиции ({editedObjectsCount})</span>
                      </span>
                      {restoreListOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
                      )}
                    </button>

                    {restoreListOpen && (
                      <div className="border-t border-white/10 bg-[#141715] p-1.5">
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-0.5">
                          {groupedEdited.map((grp) => (
                            <div key={grp.type} className="space-y-1">
                              <div className="flex items-center justify-between px-0.5 text-[9.5px] font-semibold tracking-wide text-[#93a699] uppercase">
                                <span>{grp.info.label}</span>
                                <span className="font-mono-nums text-[#758279]">
                                  {grp.ids.length}
                                </span>
                              </div>
                              {grp.ids.map((id) => {
                                const edit = objectEdits[id];
                                if (!edit) return null;
                                const checked = selectedRestoreIds.includes(id);
                                const hasOffset = Boolean(
                                  edit.offset &&
                                    (Math.abs(edit.offset[0]) >= 0.001 ||
                                      Math.abs(edit.offset[1]) >= 0.001 ||
                                      Math.abs(edit.offset[2]) >= 0.001)
                                );
                                const isDeleted = Boolean(edit.deleted);
                                const variantSpec = getVariantById(edit.variant);
                                const statusParts: string[] = [];
                                if (isDeleted) statusParts.push('Удалён');
                                if (variantSpec) statusParts.push(`Заменён: ${variantSpec.label}`);
                                if (hasOffset) statusParts.push('Сдвинут');
                                const statusText = statusParts.join(' · ') || 'Изменён';

                                return (
                                  <div
                                    key={id}
                                    className={`flex items-center justify-between gap-1.5 border px-1.5 py-1 transition-colors ${
                                      checked
                                        ? 'border-[#7a9181]/70 bg-[#202923]'
                                        : 'border-white/8 bg-[#1b1e1d] hover:border-white/15'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleRestoreId(id)}
                                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                                    >
                                      <span
                                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
                                          checked
                                            ? 'border-[#7a9181] bg-[#7a9181] text-[#111412]'
                                            : 'border-white/25 bg-transparent'
                                        }`}
                                      >
                                        {checked && <Check className="h-2.5 w-2.5" />}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-[10.5px] leading-tight font-medium text-[#e9e7e0]">
                                          {getEditableLabel(id)}
                                        </div>
                                        <div
                                          className={`truncate text-[9.5px] leading-tight ${
                                            isDeleted
                                              ? 'text-[#e09d9d]'
                                              : variantSpec
                                                ? 'text-[#a8c5b1]'
                                                : 'text-[#d9b87a]'
                                          }`}
                                        >
                                          {statusText}
                                        </div>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onResetObjects([id])}
                                      className="shrink-0 border border-white/10 bg-[#232826] px-1.5 py-0.5 text-[9.5px] font-medium text-[#cfd9d2] transition-colors hover:border-[#7a9181]/60 hover:bg-[#2b352e] hover:text-white"
                                      title="Вернуть этот объект"
                                    >
                                      Вернуть
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-1.5 border-t border-white/10 pt-1.5">
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="px-1 py-0.5 text-[10px] text-[#a3a19a] transition-colors hover:text-[#f0efec]"
                          >
                            {allSelected ? 'Снять выбор' : 'Выбрать все'}
                          </button>
                          <button
                            type="button"
                            onClick={handleRestoreSelected}
                            disabled={selectedRestoreIds.length === 0}
                            className="border border-[#7a9181]/60 bg-[#253129] px-2 py-1 text-[10px] font-semibold text-[#e6f0e9] transition-colors hover:bg-[#314236] hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-[#1c1f1e] disabled:text-[#6f6e68]"
                          >
                            Вернуть выбранные ({selectedRestoreIds.length})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2-Tab Navigation: Отделка | Мебель */}
              <div className="grid grid-cols-2 border-b border-white/10 bg-[#1a1d1c] p-1">
                <button
                  type="button"
                  onClick={() => onChangeActiveTab('finishes')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                    activeTab === 'finishes'
                      ? 'bg-[#2c332e] text-[#f0efec]'
                      : 'text-[#9c9a93] hover:text-[#dfddd6]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Отделка</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeActiveTab('furniture')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                    activeTab === 'furniture'
                      ? 'bg-[#2c332e] text-[#f0efec]'
                      : 'text-[#9c9a93] hover:text-[#dfddd6]'
                  }`}
                >
                  <Sofa className="h-3.5 w-3.5" />
                  <span>Мебель</span>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto p-2.5">
                {activeTab === 'finishes' ? (
                  <div className="flex flex-col gap-3.5">
                    {/* Section 1: 10 Wall Paint & Plaster Finishes (Split Living/Kitchen vs Bedroom) */}
                    <section aria-label="Отделка стен">
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <h2 className="text-[10px] font-semibold tracking-wide text-[#b5b3ac] uppercase">
                          Стены под покраску (10)
                        </h2>
                        <span className="font-mono-nums text-[10px] text-[#8d9c92]">
                          {editingWallOption.code}
                        </span>
                      </div>

                      {/* Per-Room Wall Zone Switcher */}
                      <div className="mb-1.5 grid grid-cols-2 border border-white/10 bg-[#141615] p-0.5">
                        <button
                          type="button"
                          onClick={() => onChangeWallZoneTab('main')}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1 text-[10.5px] font-medium transition-colors ${
                            wallZoneTab === 'main'
                              ? 'bg-[#2a312c] text-[#f0efec]'
                              : 'text-[#9a9890] hover:text-[#dfddd6]'
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 border border-white/25"
                            style={{ backgroundColor: activeWallOption.swatchHex }}
                          />
                          <span className="truncate">Гостиная / Кухня</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeWallZoneTab('bedroom')}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1 text-[10.5px] font-medium transition-colors ${
                            wallZoneTab === 'bedroom'
                              ? 'bg-[#2a312c] text-[#f0efec]'
                              : 'text-[#9a9890] hover:text-[#dfddd6]'
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 border border-white/25"
                            style={{ backgroundColor: activeBedroomWallOption.swatchHex }}
                          />
                          <span className="truncate">Спальня</span>
                        </button>
                      </div>

                      {/* Quick sync option when editing Bedroom walls */}
                      {wallZoneTab === 'bedroom' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateDesign({
                              bedroomWallFinish:
                                designConfig.bedroomWallFinish === 'same'
                                  ? activeBedroomWallOption.id
                                  : 'same',
                            })
                          }
                          className={`mb-1.5 flex w-full items-center justify-between border px-2 py-1 text-[10px] transition-colors ${
                            designConfig.bedroomWallFinish === 'same'
                              ? 'border-[#7a9181]/70 bg-[#1e2621] text-[#d5e3d8]'
                              : 'border-white/10 bg-[#1a1d1c] text-[#a3a19a] hover:border-white/20 hover:text-[#e5e3dc]'
                          }`}
                        >
                          <span>Как в гостиной ({activeWallOption.shortLabel})</span>
                          {designConfig.bedroomWallFinish === 'same' && (
                            <Check className="h-3 w-3 shrink-0 text-[#9cb8a4]" />
                          )}
                        </button>
                      )}

                      <div
                        className="grid grid-cols-2 gap-1"
                        role="radiogroup"
                        aria-label={
                          wallZoneTab === 'main'
                            ? 'Отделка стен гостиной и кухни'
                            : 'Отделка стен спальни'
                        }
                      >
                        {WALL_FINISHES.map((opt) => {
                          const isActive =
                            wallZoneTab === 'main'
                              ? designConfig.wallFinish === opt.id
                              : resolvedBedroomWallId === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              onClick={() =>
                                wallZoneTab === 'main'
                                  ? onUpdateDesign({ wallFinish: opt.id })
                                  : onUpdateDesign({ bedroomWallFinish: opt.id })
                              }
                              className={`flex items-center gap-2 border px-1.5 py-1.5 text-left transition-colors ${
                                isActive
                                  ? 'border-[#7a9181] bg-[#222a24]'
                                  : 'border-white/8 bg-[#1d201f] hover:border-white/20 hover:bg-[#242826]'
                              }`}
                            >
                              {/* Architectural Swatch Preview */}
                              <div
                                className="relative h-6 w-6 shrink-0 overflow-hidden border border-white/18"
                                style={
                                  opt.finishType === 'limewash' && opt.accentHex
                                    ? {
                                        background: `linear-gradient(135deg, ${opt.swatchHex} 0%, ${opt.accentHex} 55%, ${opt.swatchHex} 100%)`,
                                      }
                                    : { backgroundColor: opt.swatchHex }
                                }
                              >
                                {opt.finishType === 'accent' && opt.accentHex && (
                                  <span
                                    className="absolute inset-y-0 right-0 w-1/2"
                                    style={{ backgroundColor: opt.accentHex }}
                                  />
                                )}
                                {opt.finishType === 'molding' && (
                                  <span className="absolute inset-[3px] border border-[#8e887d]/70" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div
                                  className={`truncate text-[10.5px] leading-tight font-medium ${
                                    isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                                  }`}
                                >
                                  {opt.label}
                                </div>
                                <div className="font-mono-nums truncate text-[9.5px] text-[#8f8d86]">
                                  {opt.code}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* 1-Line Designer Pairing Note */}
                      <p className="mt-1.5 border-l-2 border-[#7a9181]/60 bg-[#1c201e] px-2 py-1.5 text-[10.5px] leading-snug text-[#c2c0b8]">
                        {editingWallOption.note}
                      </p>
                    </section>

                    {/* Section 2: Stretch Ceiling & Lighting */}
                    <section aria-label="Натяжной потолок">
                      <h2 className="mb-1.5 text-[10px] font-semibold tracking-wide text-[#b5b3ac] uppercase">
                        Натяжной потолок
                      </h2>
                      <div
                        className="grid grid-cols-3 gap-1"
                        role="radiogroup"
                        aria-label="Сценарий натяжного потолка"
                      >
                        {CEILING_STYLES.map((opt) => {
                          const isActive = designConfig.ceilingStyle === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              onClick={() => onUpdateDesign({ ceilingStyle: opt.id })}
                              className={`flex flex-col border px-1.5 py-1.5 text-left transition-colors ${
                                isActive
                                  ? 'border-[#7a9181] bg-[#222a24]'
                                  : 'border-white/8 bg-[#1d201f] hover:border-white/20 hover:bg-[#242826]'
                              }`}
                            >
                              <span
                                className={`text-[10.5px] leading-tight font-medium ${
                                  isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                                }`}
                              >
                                {opt.label}
                              </span>
                              <span className="mt-0.5 text-[9px] leading-tight text-[#8f8d86]">
                                {opt.subtitle}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Section 3: Floor Finish */}
                    <section aria-label="Отделка пола">
                      <h2 className="mb-1.5 text-[10px] font-semibold tracking-wide text-[#b5b3ac] uppercase">
                        Отделка пола
                      </h2>
                      <div
                        className="flex flex-col gap-1"
                        role="radiogroup"
                        aria-label="Покрытие пола"
                      >
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
                                    : 'border-white/8 bg-[#1d201f] hover:border-white/20 hover:bg-[#242826]'
                              }`}
                            >
                              <div
                                className="relative h-8 w-8 shrink-0 overflow-hidden border border-white/15"
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
                                      className="pointer-events-none absolute inset-0 opacity-85 mix-blend-color"
                                      style={{ backgroundColor: opt.swatchColor }}
                                    />
                                  </>
                                ) : (
                                  <div className="font-mono-nums flex h-full w-full items-center justify-center text-[10px] text-white/50">
                                    {idx < 2 ? `${idx + 1}` : '0'}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div
                                  className={`truncate text-[11px] leading-tight font-medium ${
                                    isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                                  }`}
                                >
                                  {opt.label}
                                </div>
                                <div className="mt-0.5 truncate text-[9.5px] leading-tight text-[#96948d]">
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
                    </section>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Quick Bulk Furniture Staging Actions */}
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={handleStageAllFurniture}
                        className="border border-[#7a9181]/45 bg-[#202822] px-2 py-1.5 text-[10.5px] font-medium text-[#d6e4da] transition-colors hover:bg-[#29342c] hover:text-white"
                      >
                        Обставить по плану
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFurniture}
                        disabled={!isFurnished}
                        className="border border-white/10 bg-[#1d201f] px-2 py-1.5 text-[10.5px] font-medium text-[#b5b3ac] transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Убрать мебель
                      </button>
                    </div>

                    {/* TV Zone */}
                    <section aria-label="ТВ-зона">
                      <h2 className="mb-1 text-[10px] font-semibold tracking-wide text-[#b5b3ac] uppercase">
                        ТВ-зона и консоль (Гостиная)
                      </h2>
                      <div className="grid grid-cols-2 gap-1">
                        {TV_ZONE_STYLES.map((opt) => {
                          const isActive = designConfig.tvZone === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onUpdateDesign({ tvZone: opt.id })}
                              className={`flex items-center gap-2 border px-2 py-1.5 text-left transition-colors ${
                                isActive
                                  ? 'border-[#7a9181] bg-[#222a24]'
                                  : 'border-white/8 bg-[#1d201f] hover:border-white/20 hover:bg-[#242826]'
                              }`}
                            >
                              <span
                                className="h-3.5 w-3.5 shrink-0 border border-white/20"
                                style={{ backgroundColor: opt.swatchHex }}
                              />
                              <span
                                className={`truncate text-[10.5px] font-medium ${
                                  isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                                }`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Sofa & Rug */}
                    <section aria-label="Диван и ковёр">
                      <h2 className="mb-1 text-[10px] font-semibold tracking-wide text-[#b5b3ac] uppercase">
                        Диван 306×172 и столик
                      </h2>
                      <div className="grid grid-cols-2 gap-1">
                        {SOFA_STYLES.map((opt) => {
                          const isActive = designConfig.sofa === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onUpdateDesign({ sofa: opt.id })}
                              className={`flex items-center gap-2 border px-2 py-1.5 text-left transition-colors ${
                                isActive
                                  ? 'border-[#7a9181] bg-[#222a24]'
                                  : 'border-white/8 bg-[#1d201f] hover:border-white/20 hover:bg-[#242826]'
                              }`}
                            >
                              <span
                                className="h-3.5 w-3.5 shrink-0 border border-white/20"
                                style={{ backgroundColor: opt.swatchHex }}
                              />
                              <span
                                className={`truncate text-[10.5px] font-medium ${
                                  isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                                }`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Kitchen & Dining */}
                    <section aria-label="Кухня и обеденная зона">
                      <h2 className="mb-1 text-[10px] font-semibold tracking-wide text-[#b5b3ac] uppercase">
                        Кухня и круглый стол Ø86
                      </h2>
                      <div className="grid grid-cols-2 gap-1">
                        {KITCHEN_STYLES.map((opt) => {
                          const isActive = designConfig.kitchen === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onUpdateDesign({ kitchen: opt.id })}
                              className={`flex items-center gap-2 border px-2 py-1.5 text-left transition-colors ${
                                isActive
                                  ? 'border-[#7a9181] bg-[#222a24]'
                                  : 'border-white/8 bg-[#1d201f] hover:border-white/20 hover:bg-[#242826]'
                              }`}
                            >
                              <span
                                className="h-3.5 w-3.5 shrink-0 border border-white/20"
                                style={{ backgroundColor: opt.swatchHex }}
                              />
                              <span
                                className={`truncate text-[10.5px] font-medium ${
                                  isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                                }`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Bedroom & Walk-in Closet */}
                    <section aria-label="Спальня и гардеробная">
                      <h2 className="mb-1 text-[10px] font-semibold tracking-wide text-[#b5b3ac] uppercase">
                        Спальня 160×205, стол и гардероб
                      </h2>
                      <div className="grid grid-cols-2 gap-1">
                        {BEDROOM_STYLES.map((opt) => {
                          const isActive = designConfig.bedroom === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onUpdateDesign({ bedroom: opt.id })}
                              className={`flex items-center gap-2 border px-2 py-1.5 text-left transition-colors ${
                                isActive
                                  ? 'border-[#7a9181] bg-[#222a24]'
                                  : 'border-white/8 bg-[#1d201f] hover:border-white/20 hover:bg-[#242826]'
                              }`}
                            >
                              <span
                                className="h-3.5 w-3.5 shrink-0 border border-white/20"
                                style={{ backgroundColor: opt.swatchHex }}
                              />
                              <span
                                className={`truncate text-[10.5px] font-medium ${
                                  isActive ? 'text-[#f0efec]' : 'text-[#d4d2cb]'
                                }`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Entry Vestibule & Floor-to-Ceiling Curtains Toggles */}
                    <section aria-label="Дополнительные элементы" className="flex flex-col gap-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={designConfig.entryFurniture}
                        onClick={() =>
                          onUpdateDesign({ entryFurniture: !designConfig.entryFurniture })
                        }
                        className={`flex items-center justify-between gap-2 border px-2.5 py-2 text-left transition-colors ${
                          designConfig.entryFurniture
                            ? 'border-[#7a9181] bg-[#222a24]'
                            : 'border-white/8 bg-[#1d201f] hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-medium text-[#e9e7e0]">
                            Прихожая (шкаф, зеркало, пуф)
                          </div>
                          <div className="text-[9.5px] text-[#96948d]">
                            Шкаф 60 см, консоль 70 см и зеркало с подсветкой
                          </div>
                        </div>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                            designConfig.entryFurniture
                              ? 'border-[#7a9181] bg-[#7a9181] text-[#111412]'
                              : 'border-white/25 bg-transparent'
                          }`}
                        >
                          {designConfig.entryFurniture && <Check className="h-3 w-3" />}
                        </span>
                      </button>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={designConfig.curtains}
                        onClick={() => onUpdateDesign({ curtains: !designConfig.curtains })}
                        className={`flex items-center justify-between gap-2 border px-2.5 py-2 text-left transition-colors ${
                          designConfig.curtains
                            ? 'border-[#7a9181] bg-[#222a24]'
                            : 'border-white/8 bg-[#1d201f] hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-medium text-[#e9e7e0]">
                            Шторы и тюль в пол
                          </div>
                          <div className="text-[9.5px] text-[#96948d]">
                            Скрытый карниз натяжного потолка (гостиная, спальня, кухня)
                          </div>
                        </div>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                            designConfig.curtains
                              ? 'border-[#7a9181] bg-[#7a9181] text-[#111412]'
                              : 'border-white/25 bg-transparent'
                          }`}
                        >
                          {designConfig.curtains && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    </section>

                    {/* All Editable Objects Grouped by Type with Inline Mini-Photo Replacement */}
                    <section
                      aria-label="Редактируемые предметы по типам"
                      className="border border-white/10 bg-[#191d1b]"
                    >
                      <button
                        type="button"
                        onClick={() => setCatalogGroupsOpen((v) => !v)}
                        aria-expanded={catalogGroupsOpen}
                        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition-colors hover:bg-[#212724]"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#e9e7e0]">
                            <RefreshCw className="h-3.5 w-3.5 text-[#9cb8a4]" />
                            <span>Предметы по типам ({ALL_EDITABLE_IDS.length})</span>
                          </div>
                          <div className="text-[9.5px] text-[#96948d]">
                            Группировка и замена с мини-фото по типу предмета
                          </div>
                        </div>
                        {catalogGroupsOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
                        )}
                      </button>

                      {catalogGroupsOpen && (
                        <div className="divide-y divide-white/8 border-t border-white/10 bg-[#141715]">
                          {groupedAllEditable.map((grp) => {
                            const isOpen = openTypeGroup === grp.type;
                            const variants = getVariantsForType(grp.type);
                            const replacedInGroup = grp.ids.filter((id) =>
                              Boolean(objectEdits[id]?.variant)
                            ).length;

                            return (
                              <div key={grp.type}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenTypeGroup((cur) => (cur === grp.type ? null : grp.type))
                                  }
                                  className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-[#1e2320]"
                                >
                                  <span className="truncate text-[10.5px] font-semibold text-[#d9ddd9]">
                                    {grp.info.label}
                                  </span>
                                  <span className="flex shrink-0 items-center gap-1.5">
                                    {replacedInGroup > 0 && (
                                      <span className="font-mono-nums bg-[#243228] px-1 py-0.5 text-[9px] font-semibold text-[#a5c6af]">
                                        {replacedInGroup} зам.
                                      </span>
                                    )}
                                    <span className="font-mono-nums text-[9.5px] text-[#838b85]">
                                      {grp.ids.length}
                                    </span>
                                    {isOpen ? (
                                      <ChevronUp className="h-3 w-3 text-[#9cb8a4]" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 text-[#7f8781]" />
                                    )}
                                  </span>
                                </button>

                                {isOpen && (
                                  <div className="space-y-1 bg-[#121514] px-2 py-1.5">
                                    {grp.ids.map((id) => {
                                      const edit = objectEdits[id];
                                      const activeVar = getVariantById(edit?.variant);
                                      const isItemExpanded = activeCatalogItemId === id;
                                      const activeThumb = activeVar
                                        ? getVariantThumbnail(activeVar)
                                        : '';

                                      return (
                                        <div
                                          key={id}
                                          className="border border-white/8 bg-[#191d1b]"
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setActiveCatalogItemId((cur) =>
                                                cur === id ? null : id
                                              )
                                            }
                                            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors hover:bg-[#212724]"
                                          >
                                            <div className="flex min-w-0 items-center gap-2">
                                              {activeThumb ? (
                                                <img
                                                  src={activeThumb}
                                                  alt={activeVar?.label ?? ''}
                                                  className="h-6 w-8 shrink-0 border border-white/15 object-cover"
                                                />
                                              ) : (
                                                <span className="flex h-6 w-8 shrink-0 items-center justify-center border border-white/10 bg-[#202422] text-[8.5px] text-[#838a85]">
                                                  База
                                                </span>
                                              )}
                                              <div className="min-w-0">
                                                <div className="truncate text-[10.5px] leading-tight font-medium text-[#e9e7e0]">
                                                  {getEditableLabel(id)}
                                                </div>
                                                <div className="truncate text-[9px] leading-tight text-[#8f9d93]">
                                                  {edit?.deleted
                                                    ? 'Удалён (нажмите вариант, чтобы вернуть)'
                                                    : activeVar
                                                      ? activeVar.label
                                                      : 'Оригинал'}
                                                </div>
                                              </div>
                                            </div>
                                            <span className="shrink-0 text-[9.5px] font-medium text-[#9cb8a4]">
                                              {isItemExpanded ? 'Скрыть' : 'Заменить'}
                                            </span>
                                          </button>

                                          {isItemExpanded && variants.length > 0 && (
                                            <div className="border-t border-white/8 bg-[#141715] p-1.5">
                                              <div className="mb-1 flex items-center justify-between">
                                                <span className="text-[9px] text-[#8b938d]">
                                                  Выберите замену ({grp.info.shortLabel})
                                                </span>
                                                {activeVar && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onReplaceObject(id, null)}
                                                    className="text-[9px] font-medium text-[#9cb8a4] hover:text-white"
                                                  >
                                                    Оригинал
                                                  </button>
                                                )}
                                              </div>
                                              <div className="grid grid-cols-2 gap-1">
                                                {variants.map((opt) => {
                                                  const isCur = edit?.variant === opt.id;
                                                  const thumb = getVariantThumbnail(opt);
                                                  return (
                                                    <button
                                                      key={opt.id}
                                                      type="button"
                                                      onClick={() => onReplaceObject(id, opt.id)}
                                                      className={`overflow-hidden border text-left transition-colors ${
                                                        isCur
                                                          ? 'border-[#7a9181] bg-[#222c25]'
                                                          : 'border-white/8 bg-[#1b1f1d] hover:border-white/25'
                                                      }`}
                                                    >
                                                      <div className="relative h-12 w-full overflow-hidden border-b border-white/8">
                                                        {thumb && (
                                                          <img
                                                            src={thumb}
                                                            alt={opt.label}
                                                            className="h-full w-full object-cover"
                                                          />
                                                        )}
                                                        {isCur && (
                                                          <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center bg-[#7a9181] text-[#111412]">
                                                            <Check className="h-2.5 w-2.5" />
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="truncate px-1.5 py-1 text-[9.5px] font-medium text-[#e4e2db]">
                                                        {opt.label}
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <p className="border-t border-white/8 pt-2 text-[10px] leading-snug text-[#8f8d86]">
                      Двойной клик по любому предмету в 3D — переместить, заменить или удалить.
                    </p>
                  </div>
                )}
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
          {/* Share Link Popover anchored cleanly above bottom dock */}
          {(shareState.status === 'ready' || shareState.status === 'error') && !dockCollapsed && (
            <div
              className="mb-2 w-full max-w-[460px] border border-white/14 bg-[#171918]/96 p-3 shadow-2xl"
              role="dialog"
              aria-label="Поделиться сценой"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {shareState.status === 'ready' ? (
                    <Check className="h-3.5 w-3.5 text-[#9cb8a4]" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5 text-[#d99494]" />
                  )}
                  <span className="text-xs font-semibold text-[#f0efec]">
                    {shareState.status === 'ready'
                      ? shareState.copied
                        ? 'Ссылка скопирована'
                        : 'Ссылка на сцену готова'
                      : 'Не удалось создать ссылку'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseSharePanel}
                  className="p-0.5 text-[#9c9a93] transition-colors hover:text-[#f0efec]"
                  aria-label="Закрыть окно ссылки"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {shareState.status === 'ready' ? (
                <>
                  <p className="mt-1 text-[10.5px] leading-snug text-[#a3a19a]">
                    Сохранены отделка, мебель, освещение, позиции объектов и текущий ракурс камеры.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={shareState.url}
                      onFocus={(e) => e.currentTarget.select()}
                      onClick={(e) => e.currentTarget.select()}
                      className="font-mono-nums min-w-0 flex-1 border border-white/12 bg-[#121413] px-2 py-1.5 text-[11px] text-[#e7e5de] outline-none focus:border-[#7a9181]"
                      aria-label="Короткая ссылка на 3D сцену"
                    />
                    <button
                      type="button"
                      onClick={onCopyShareUrl}
                      className="flex shrink-0 items-center gap-1.5 border border-[#7a9181]/60 bg-[#253129] px-2.5 py-1.5 text-[11px] font-medium text-[#e6f0e9] transition-colors hover:bg-[#314236] hover:text-white"
                    >
                      {shareState.copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-1.5 text-[11px] leading-snug text-[#e0a8a8]">
                  {shareState.error}
                </p>
              )}
            </div>
          )}

          {/* VR 360° Panoramic Strip (Oculus Quest 2 WebXR + Gyroscope + Room Teleport Points) */}
          {vrPanoMode && !dockCollapsed && (
            <div
              className="mb-1.5 w-full max-w-[920px] border border-[#7a9181]/40 bg-[#171918]/96 px-2.5 py-2 shadow-2xl sm:px-3"
              role="region"
              aria-label="VR панорамный режим"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* 6 Standing Room Panoramic Points */}
                <div className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto sm:flex-wrap">
                  {VR_VIEWPOINTS.map((vp) => {
                    const active = vrViewpoint === vp.id;
                    return (
                      <button
                        key={vp.id}
                        type="button"
                        onClick={() => onSelectVrViewpoint(vp.id)}
                        className={`shrink-0 px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                          active
                            ? 'bg-[#7a9181] text-[#111412]'
                            : 'bg-[#222624] text-[#d1cfc8] hover:bg-[#2c312f] hover:text-white'
                        }`}
                      >
                        {vp.label}
                      </button>
                    );
                  })}
                </div>

                {/* Gyroscope Status + Recenter + Quest 2 WebXR + Fullscreen + Exit */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="border border-white/10 bg-[#1d201f] px-2 py-1 text-[10.5px] text-[#b9c6bd]">
                    {vrGyroStatus === 'active'
                      ? 'Гироскоп активен'
                      : vrGyroStatus === 'denied'
                        ? 'Доступ к гироскопу запрещён · свайп'
                        : 'Поворот головой / мышью'}
                  </span>

                  <button
                    type="button"
                    onClick={onRecenterVr}
                    title="Выровнять центр обзора по комнате"
                    className="flex items-center gap-1 border border-white/12 bg-[#222524] px-2 py-1 text-[11px] font-medium text-[#d8d6cf] transition-colors hover:bg-[#2d312f] hover:text-white"
                  >
                    <Compass className="h-3.5 w-3.5 text-[#9cb8a4]" />
                    <span>Центр</span>
                  </button>

                  {xrSupported && (
                    <button
                      type="button"
                      onClick={onEnterWebXR}
                      disabled={xrSessionActive}
                      title="Запустить стерео VR-режим в шлеме Oculus Quest 2 (WebXR)"
                      className="flex items-center gap-1.5 bg-[#7a9181] px-2.5 py-1 text-[11px] font-semibold text-[#111412] transition-colors hover:bg-[#8da694] disabled:opacity-60"
                    >
                      <Glasses className="h-3.5 w-3.5" />
                      <span>{xrSessionActive ? 'В шлеме VR' : 'Открыть в Quest 2 (VR)'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onToggleFullscreen}
                    title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
                    className="flex items-center gap-1 border border-white/12 bg-[#222524] px-2 py-1 text-[11px] font-medium text-[#d8d6cf] transition-colors hover:bg-[#2d312f] hover:text-white"
                    aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onToggleVrPanoMode}
                    title="Выйти из VR панорамы (Esc)"
                    className="flex items-center gap-1 border border-white/12 bg-[#222524] px-2 py-1 text-[11px] font-medium text-[#c8c6bf] transition-colors hover:bg-[#312626] hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Выход</span>
                  </button>
                </div>
              </div>
              {xrSupported && (
                <div className="mt-1.5 border-t border-white/8 pt-1 text-[10px] text-[#9eb0a3]">
                  Quest 2: левый стик — ходьба · правый стик вверх — телепорт (навести и отпустить) · правый влево/вправо — поворот 30° · A/X — комнаты
                </div>
              )}
            </div>
          )}

          {/* Minimal Walk Mode Navigation Hint Strip */}
          {walkMode && !vrPanoMode && !dockCollapsed && (
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

                <button
                  type="button"
                  onClick={onToggleVrPanoMode}
                  className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors sm:text-xs ${
                    vrPanoMode
                      ? 'bg-[#7a9181] text-[#111412]'
                      : 'border border-[#7a9181]/45 bg-[#202722] text-[#d6e4da] hover:bg-[#2a342d] hover:text-white'
                  }`}
                  title="VR 360° панорамный обзор через гироскоп и Oculus Quest 2 (V)"
                >
                  <Glasses className="h-3.5 w-3.5" />
                  <span>VR 360°</span>
                </button>

                <div className="mx-0.5 h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />

                {CAMERA_PRESETS.map((preset) => {
                  const isActive = !walkMode && !vrPanoMode && activePreset === preset.id;
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
                      !walkMode && !vrPanoMode && viewMode === 'cutaway'
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
                      walkMode || vrPanoMode || viewMode === 'interior'
                        ? 'bg-[#363b39] text-white'
                        : 'text-[#a3a19a] hover:text-[#e5e4de]'
                    }`}
                  >
                    Внутри
                  </button>
                </div>

                {/* Architectural 3-Scenario Lighting Switcher (Daylight / Evening 3000K / Cozy 2700K) */}
                <div
                  className="flex shrink-0 items-center bg-[#222524] p-0.5"
                  role="group"
                  aria-label="Сценарий освещения"
                >
                  <button
                    type="button"
                    onClick={() => onChangeLightingMode('daylight')}
                    title="Естественный дневной свет (5200K)"
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                      lightingMode === 'daylight'
                        ? 'bg-[#363b39] text-white'
                        : 'text-[#a3a19a] hover:text-[#e5e4de]'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 text-[#e6d3a7]" />
                    <span>День</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeLightingMode('warm3000')}
                    title="Реальный вечерний свет 3000K (верхний + подсветка)"
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                      lightingMode === 'warm3000'
                        ? 'bg-[#3d372d] text-[#ffebd1]'
                        : 'text-[#a3a19a] hover:text-[#e5e4de]'
                    }`}
                  >
                    <Lamp className="h-3.5 w-3.5 text-[#f0c588]" />
                    <span className="font-mono-nums">3000K</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeLightingMode('cozy2700')}
                    title="Камерный уют 2700K (только бра, подвес, торшер и LED-подсветка)"
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                      lightingMode === 'cozy2700'
                        ? 'bg-[#3a3026] text-[#ffdfb3]'
                        : 'text-[#a3a19a] hover:text-[#e5e4de]'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 text-[#e5a866]" />
                    <span className="font-mono-nums">2700K</span>
                  </button>
                </div>

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

                {/* Share Current Environment & Camera as Short Link */}
                <button
                  type="button"
                  onClick={onShareScene}
                  disabled={shareState.status === 'saving'}
                  title="Сохранить окружение, отделку, мебель, позиции и камеру в короткую ссылку"
                  className={`flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                    shareState.status === 'ready'
                      ? 'bg-[#7a9181] text-[#111412]'
                      : 'border border-[#7a9181]/40 bg-[#202722] text-[#d6e4da] hover:bg-[#2a342d] hover:text-white disabled:opacity-65'
                  }`}
                >
                  {shareState.status === 'saving' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {shareState.status === 'saving' ? 'Сохранение…' : 'Поделиться'}
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
