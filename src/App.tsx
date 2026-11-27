import { useCallback, useEffect, useRef, useState } from 'react';
import { BathroomViewport } from './components/BathroomViewport';
import { ControlDock, SharedBannerState, SharePanelState } from './components/ControlDock';
import {
  CuratedDesignPreset,
  DEFAULT_DESIGN_CONFIG,
  DesignConfig,
} from './scene/designCatalog';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DimensionMode,
  FloorFinishId,
  LightingMode,
  ViewMode,
} from './scene/dimensions';
import { ObjectEditsMap } from './scene/editableObjects';
import {
  copyTextToClipboard,
  createSharedScene,
  getShareIdFromUrl,
  loadSharedScene,
} from './state/shareScene';
import {
  DesignTab,
  loadPersistedAppState,
  loadPersistedCameraState,
  PersistedCameraState,
  savePersistedAppState,
  savePersistedCameraState,
  WallZoneTab,
} from './state/storage';

export default function App() {
  const [initialState] = useState(loadPersistedAppState);

  const [activePreset, setActivePreset] = useState<CameraPresetId>(initialState.activePreset);
  const [presetTrigger, setPresetTrigger] = useState(0);
  const [walkMode, setWalkMode] = useState(initialState.walkMode);
  const [currentRoom, setCurrentRoom] = useState('Прихожая');
  const [viewMode, setViewMode] = useState<ViewMode>(initialState.viewMode);
  const [lightingMode, setLightingMode] = useState<LightingMode>(initialState.lightingMode);
  const [floorFinish, setFloorFinish] = useState<FloorFinishId>(initialState.floorFinish);
  const [designConfig, setDesignConfig] = useState<DesignConfig>(initialState.designConfig);
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>(initialState.dimensionMode);
  const [dockCollapsed, setDockCollapsed] = useState(initialState.dockCollapsed);
  const [finishMenuOpen, setFinishMenuOpen] = useState(initialState.finishMenuOpen);
  const [activeTab, setActiveTab] = useState<DesignTab>(initialState.activeTab);
  const [wallZoneTab, setWallZoneTab] = useState<WallZoneTab>(initialState.wallZoneTab);
  const [objectEdits, setObjectEdits] = useState<ObjectEditsMap>(initialState.objectEdits);

  const captureCameraRef = useRef<(() => PersistedCameraState) | null>(null);
  const applyCameraRef = useRef<
    ((cam: PersistedCameraState, targetWalkMode: boolean) => void) | null
  >(null);

  const [shareState, setShareState] = useState<SharePanelState>({
    status: 'idle',
    url: '',
    copied: false,
    error: '',
  });
  const [sharedBanner, setSharedBanner] = useState<SharedBannerState | null>(null);

  // Hydrate full environment + camera pose when opened via a shared link (?s=<shareId>)
  useEffect(() => {
    const shareId = getShareIdFromUrl();
    if (!shareId) return;

    let cancelled = false;
    let dismissTimer: number | undefined;
    setSharedBanner({ kind: 'loading', text: 'Загрузка сохранённой сцены…' });

    loadSharedScene(shareId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setSharedBanner({
            kind: 'not_found',
            text: 'Ссылка не найдена — открыта локальная сцена',
          });
          dismissTimer = window.setTimeout(() => setSharedBanner(null), 4200);
          return;
        }

        const { state: s, camera: cam } = result;
        setActivePreset(s.activePreset);
        setViewMode(s.viewMode);
        setLightingMode(s.lightingMode);
        setFloorFinish(s.floorFinish);
        setDesignConfig(s.designConfig);
        setDimensionMode(s.dimensionMode);
        setObjectEdits(s.objectEdits);
        setDockCollapsed(false);
        setFinishMenuOpen(false);
        setWalkMode(s.walkMode);

        savePersistedCameraState(cam);
        applyCameraRef.current?.(cam, s.walkMode);

        setSharedBanner({ kind: 'loaded', text: 'Сцена загружена по ссылке' });
        dismissTimer = window.setTimeout(() => setSharedBanner(null), 3500);
      })
      .catch(() => {
        if (cancelled) return;
        setSharedBanner({
          kind: 'error',
          text: 'Не удалось загрузить сцену по ссылке',
        });
        dismissTimer = window.setTimeout(() => setSharedBanner(null), 4500);
      });

    return () => {
      cancelled = true;
      if (dismissTimer) window.clearTimeout(dismissTimer);
    };
  }, []);

  // Persist every finish, furniture item, object position/deletion, lighting, view, dimension & panel setting to localStorage
  useEffect(() => {
    savePersistedAppState({
      activePreset,
      walkMode,
      viewMode,
      lightingMode,
      floorFinish,
      designConfig,
      dimensionMode,
      dockCollapsed,
      finishMenuOpen,
      activeTab,
      wallZoneTab,
      objectEdits,
    });
  }, [
    activePreset,
    walkMode,
    viewMode,
    lightingMode,
    floorFinish,
    designConfig,
    dimensionMode,
    dockCollapsed,
    finishMenuOpen,
    activeTab,
    wallZoneTab,
    objectEdits,
  ]);

  const handleShareScene = useCallback(async () => {
    setShareState({ status: 'saving', url: '', copied: false, error: '' });
    try {
      const liveCamera = captureCameraRef.current?.() ?? loadPersistedCameraState();
      const { url } = await createSharedScene(
        {
          activePreset,
          walkMode,
          viewMode,
          lightingMode,
          floorFinish,
          designConfig,
          dimensionMode,
          dockCollapsed,
          finishMenuOpen,
          activeTab,
          wallZoneTab,
          objectEdits,
        },
        liveCamera
      );
      const copied = await copyTextToClipboard(url);
      setShareState({ status: 'ready', url, copied, error: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isQuota = /quota exceeded/i.test(msg);
      setShareState({
        status: 'error',
        url: '',
        copied: false,
        error: isQuota
          ? 'Превышен дневной лимит базы Firebase. Попробуйте завтра.'
          : 'Не удалось сохранить ссылку. Проверьте соединение с интернетом.',
      });
    }
  }, [
    activePreset,
    walkMode,
    viewMode,
    lightingMode,
    floorFinish,
    designConfig,
    dimensionMode,
    dockCollapsed,
    finishMenuOpen,
    activeTab,
    wallZoneTab,
    objectEdits,
  ]);

  const handleCopyShareUrl = useCallback(async () => {
    if (!shareState.url) return;
    const copied = await copyTextToClipboard(shareState.url);
    if (copied) {
      setShareState((prev) => ({ ...prev, copied: true }));
    }
  }, [shareState.url]);

  const handleCloseSharePanel = useCallback(() => {
    setShareState({ status: 'idle', url: '', copied: false, error: '' });
  }, []);

  const handleUpdateDesign = useCallback((patch: Partial<DesignConfig>) => {
    setDesignConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApplyConcept = useCallback((preset: CuratedDesignPreset) => {
    setFloorFinish(preset.floorFinish);
    setDesignConfig(preset.design);
  }, []);

  const handleResetDesign = useCallback(() => {
    setFloorFinish('screed');
    setDesignConfig(DEFAULT_DESIGN_CONFIG);
    setObjectEdits({});
  }, []);

  const handleMoveObject = useCallback(
    (id: string, offset: [number, number, number]) => {
      setObjectEdits((prev) => {
        const rounded: [number, number, number] = [
          Number(offset[0].toFixed(3)),
          Number(offset[1].toFixed(3)),
          Number(offset[2].toFixed(3)),
        ];
        const isZero =
          Math.abs(rounded[0]) < 0.001 &&
          Math.abs(rounded[1]) < 0.001 &&
          Math.abs(rounded[2]) < 0.001;
        const existing = prev[id];
        if (isZero && !existing?.deleted) {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return {
          ...prev,
          [id]: {
            ...existing,
            offset: isZero ? undefined : rounded,
          },
        };
      });
    },
    []
  );

  const handleDeleteObject = useCallback((id: string) => {
    setObjectEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        deleted: true,
      },
    }));
  }, []);

  const handleResetObject = useCallback((id: string) => {
    setObjectEdits((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleResetObjects = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setObjectEdits((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of ids) {
        if (id in next) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const handleCycleDimensions = useCallback(() => {
    setDimensionMode((prev) =>
      prev === 'off' ? 'basic' : prev === 'basic' ? 'detailed' : 'off'
    );
  }, []);

  const handleSelectPreset = useCallback((id: CameraPresetId) => {
    const preset = CAMERA_PRESETS.find((p) => p.id === id);
    setWalkMode(false);
    setActivePreset(id);
    setPresetTrigger((n) => n + 1);
    if (preset) {
      setViewMode(preset.preferredViewMode);
    }
  }, []);

  const handleToggleWalkMode = useCallback(() => {
    setWalkMode((prev) => {
      const next = !prev;
      if (next) {
        setViewMode('interior');
      }
      return next;
    });
  }, []);

  const handleChangeViewMode = useCallback((mode: ViewMode) => {
    if (mode === 'cutaway') {
      setWalkMode(false);
    }
    setViewMode(mode);
  }, []);

  // Keyboard shortcuts: 1-9 for camera views, F for Walk Mode, Esc to close Share/Walk Mode, H to toggle HUD
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        if (shareState.status !== 'idle') {
          handleCloseSharePanel();
          return;
        }
        setWalkMode(false);
      } else if (e.code === 'KeyF') {
        handleToggleWalkMode();
      } else if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else {
        const match = CAMERA_PRESETS.find((p) => p.shortKey === e.key);
        if (match) {
          handleSelectPreset(match.id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCloseSharePanel, handleSelectPreset, handleToggleWalkMode, shareState.status]);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#161817]">
      <BathroomViewport
        activePreset={activePreset}
        presetTrigger={presetTrigger}
        viewMode={viewMode}
        lightingMode={lightingMode}
        floorFinish={floorFinish}
        designConfig={designConfig}
        dimensionMode={dimensionMode}
        walkMode={walkMode}
        onCurrentRoomChange={setCurrentRoom}
        objectEdits={objectEdits}
        onMoveObject={handleMoveObject}
        onDeleteObject={handleDeleteObject}
        onResetObject={handleResetObject}
        captureCameraRef={captureCameraRef}
        applyCameraRef={applyCameraRef}
      />

      <ControlDock
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        walkMode={walkMode}
        onToggleWalkMode={handleToggleWalkMode}
        currentRoom={currentRoom}
        viewMode={viewMode}
        onChangeViewMode={handleChangeViewMode}
        lightingMode={lightingMode}
        onChangeLightingMode={setLightingMode}
        floorFinish={floorFinish}
        onChangeFloorFinish={setFloorFinish}
        designConfig={designConfig}
        onUpdateDesign={handleUpdateDesign}
        onApplyConcept={handleApplyConcept}
        onResetDesign={handleResetDesign}
        dimensionMode={dimensionMode}
        onCycleDimensions={handleCycleDimensions}
        dockCollapsed={dockCollapsed}
        onToggleDock={() => setDockCollapsed((v) => !v)}
        finishMenuOpen={finishMenuOpen}
        onToggleFinishMenu={() => setFinishMenuOpen((v) => !v)}
        activeTab={activeTab}
        onChangeActiveTab={setActiveTab}
        wallZoneTab={wallZoneTab}
        onChangeWallZoneTab={setWallZoneTab}
        objectEdits={objectEdits}
        onResetObjects={handleResetObjects}
        shareState={shareState}
        onShareScene={handleShareScene}
        onCopyShareUrl={handleCopyShareUrl}
        onCloseSharePanel={handleCloseSharePanel}
        sharedBanner={sharedBanner}
      />
    </main>
  );
}
