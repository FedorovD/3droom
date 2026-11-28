import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BathroomViewport,
  SpawnPose,
  VrViewportActions,
} from './components/BathroomViewport';
import { CatalogManagerModal } from './components/CatalogManagerModal';
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
import {
  generatePlacedObjectId,
  isPlacedObjectId,
  ObjectEditsMap,
} from './scene/editableObjects';
import {
  EditableObjectType,
  getEditableDesignGroup,
  registerCustomVariants,
  VariantShapeSpec,
} from './scene/objectCatalog';
import { GyroStatus, VrViewpointId } from './scene/vrPanorama';
import {
  CustomCatalogItem,
  customItemsToVariantSpecs,
  listCustomCatalogItems,
} from './state/customCatalog';
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
  const [vrPanoMode, setVrPanoMode] = useState(false);
  const [vrViewpoint, setVrViewpoint] = useState<VrViewpointId>('living');
  const [vrRecenterTrigger, setVrRecenterTrigger] = useState(0);
  const [vrGyroStatus, setVrGyroStatus] = useState<GyroStatus>('idle');
  const [xrSupported, setXrSupported] = useState(false);
  const [xrSessionActive, setXrSessionActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const vrActionsRef = useRef<VrViewportActions | null>(null);

  const [shareState, setShareState] = useState<SharePanelState>({
    status: 'idle',
    url: '',
    copied: false,
    error: '',
  });
  const [sharedBanner, setSharedBanner] = useState<SharedBannerState | null>(null);

  const [customItems, setCustomItems] = useState<CustomCatalogItem[]>([]);
  const [customItemsLoading, setCustomItemsLoading] = useState(true);
  const [customItemsError, setCustomItemsError] = useState('');
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogInitialType, setCatalogInitialType] = useState<EditableObjectType | null>(null);

  const applyCustomCatalogItems = useCallback((nextItems: CustomCatalogItem[]) => {
    registerCustomVariants(customItemsToVariantSpecs(nextItems));
    setCustomItems(nextItems);
    setCatalogVersion((v) => v + 1);
  }, []);

  // Load user's custom catalog items from Firestore once on startup so synced items are immediately live in 3D
  useEffect(() => {
    let cancelled = false;
    setCustomItemsLoading(true);
    listCustomCatalogItems()
      .then((items) => {
        if (cancelled) return;
        applyCustomCatalogItems(items);
        setCustomItemsError('');
      })
      .catch(() => {
        if (cancelled) return;
        setCustomItemsError('Не удалось загрузить свой каталог из Firebase.');
      })
      .finally(() => {
        if (!cancelled) setCustomItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyCustomCatalogItems]);

  const customPendingCount = useMemo(
    () => customItems.filter((i) => i.status !== 'synced').length,
    [customItems]
  );
  const customSyncedCount = customItems.length - customPendingCount;

  const handleOpenCatalogModal = useCallback((initialType?: EditableObjectType) => {
    setCatalogInitialType(initialType ?? null);
    setCatalogModalOpen(true);
  }, []);

  const getSpawnPoseRef = useRef<
    ((type: EditableObjectType, shape?: VariantShapeSpec) => SpawnPose) | null
  >(null);
  const focusPlacedObjectRef = useRef<((objectId: string) => void) | null>(null);

  const handleCloseCatalogModal = useCallback(() => {
    setCatalogModalOpen(false);
  }, []);

  const handlePlaceCatalogItemInScene = useCallback((item: CustomCatalogItem) => {
    if (item.status !== 'synced' || !item.spec) return;
    const pose = getSpawnPoseRef.current?.(item.type, item.spec.shape) ?? {
      position: [5.2, 0, 4.2] as [number, number, number],
      rotY: 0,
    };
    const placedId = generatePlacedObjectId();
    setObjectEdits((prev) => ({
      ...prev,
      [placedId]: {
        variant: item.id,
        offset: pose.position,
        ...(Math.abs(pose.rotY) >= 0.05 ? { rotY: pose.rotY } : {}),
      },
    }));
    setCatalogModalOpen(false);
    focusPlacedObjectRef.current?.(placedId);
  }, []);

  // Track browser fullscreen state cleanly
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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
        setVrPanoMode(false);
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
        if (
          isZero &&
          !existing?.deleted &&
          !existing?.variant &&
          existing?.rotY === undefined
        ) {
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

  const handleRotateObject = useCallback((id: string, rotYDeg: number) => {
    setObjectEdits((prev) => {
      let norm = ((rotYDeg + 180) % 360 + 360) % 360 - 180;
      if (norm <= -180) norm += 360;
      const isZero = Math.abs(norm) < 0.05;
      const nextRotY = isZero ? undefined : Number(norm.toFixed(1));
      const existing = prev[id];
      if (isZero && !existing?.deleted && !existing?.variant && !existing?.offset) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return {
        ...prev,
        [id]: {
          ...existing,
          rotY: nextRotY,
        },
      };
    });
  }, []);

  const handleReplaceObject = useCallback((id: string, variantId: string | null) => {
    // Enable hidden furniture groups automatically and switch to matching 3D geometry
    // when replacing main sofa/bed/TV/kitchen objects with a corresponding built-in style.
    if (variantId) {
      const grp = getEditableDesignGroup(id);
      if (grp !== 'always') {
        setDesignConfig((prev) => {
          if (grp === 'sofa') {
            const matchedSofaStyle =
              variantId === 'sofa_boucle_cream'
                ? ('boucle_l' as const)
                : variantId === 'sofa_velvet_olive'
                  ? ('velvet_olive' as const)
                  : variantId === 'sofa_graphite_mod'
                    ? ('graphite_mod' as const)
                    : null;
            if (id === 'sofa_main' && matchedSofaStyle && prev.sofa !== matchedSofaStyle) {
              return { ...prev, sofa: matchedSofaStyle };
            }
            if (prev.sofa === 'none') {
              return { ...prev, sofa: matchedSofaStyle ?? 'boucle_l' };
            }
            return prev;
          }
          if (grp === 'tvZone') {
            const matchedTvStyle =
              variantId === 'media_walnut_copper'
                ? ('minimal_wood' as const)
                : variantId === 'media_dark_slate'
                  ? ('stone_slate' as const)
                  : variantId === 'media_light_travertine'
                    ? ('clean_floating' as const)
                    : null;
            if (
              (id === 'tv_console' || id === 'tv_backdrop') &&
              matchedTvStyle &&
              prev.tvZone !== matchedTvStyle
            ) {
              return { ...prev, tvZone: matchedTvStyle };
            }
            if (prev.tvZone === 'none') {
              return { ...prev, tvZone: matchedTvStyle ?? 'minimal_wood' };
            }
            return prev;
          }
          if (grp === 'livingAny' && prev.tvZone === 'none' && prev.sofa === 'none') {
            return { ...prev, sofa: 'boucle_l' };
          }
          if (grp === 'kitchen') {
            const matchedKitchenStyle =
              variantId === 'kitchen_cashmere_oak'
                ? ('warm_cashmere' as const)
                : variantId === 'kitchen_sage_walnut'
                  ? ('sage_walnut' as const)
                  : variantId === 'kitchen_graphite_stone'
                    ? ('graphite_stone' as const)
                    : null;
            if (
              (id === 'kitchen_lower' || id === 'kitchen_upper' || id === 'kitchen_fridge') &&
              matchedKitchenStyle &&
              prev.kitchen !== matchedKitchenStyle
            ) {
              return { ...prev, kitchen: matchedKitchenStyle };
            }
            if (prev.kitchen === 'none') {
              return { ...prev, kitchen: matchedKitchenStyle ?? 'warm_cashmere' };
            }
            return prev;
          }
          if (grp === 'bedroom') {
            const matchedBedroomStyle =
              variantId === 'bed_linen_oak'
                ? ('soft_linen' as const)
                : variantId === 'bed_walnut_burgundy'
                  ? ('walnut_burgundy' as const)
                  : variantId === 'bed_graphite_cream'
                    ? ('modern_boucle' as const)
                    : null;
            if (id === 'bed_main' && matchedBedroomStyle && prev.bedroom !== matchedBedroomStyle) {
              return { ...prev, bedroom: matchedBedroomStyle };
            }
            if (prev.bedroom === 'none') {
              return { ...prev, bedroom: matchedBedroomStyle ?? 'soft_linen' };
            }
            return prev;
          }
          if (grp === 'entryFurniture' && !prev.entryFurniture) {
            return { ...prev, entryFurniture: true };
          }
          if (grp === 'curtains' && !prev.curtains) {
            return { ...prev, curtains: true };
          }
          return prev;
        });
      }
    }

    setObjectEdits((prev) => {
      const existing = prev[id];
      const nextVariant = variantId || (isPlacedObjectId(id) ? existing?.variant : undefined);
      if (
        !nextVariant &&
        !existing?.deleted &&
        !existing?.offset &&
        existing?.rotY === undefined
      ) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return {
        ...prev,
        [id]: {
          ...existing,
          deleted: undefined,
          variant: nextVariant,
        },
      };
    });
  }, []);

  const handleDeleteObject = useCallback((id: string) => {
    setObjectEdits((prev) => {
      if (isPlacedObjectId(id)) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return {
        ...prev,
        [id]: {
          ...prev[id],
          deleted: true,
        },
      };
    });
  }, []);

  const handleResetObject = useCallback((id: string) => {
    setObjectEdits((prev) => {
      if (!(id in prev)) return prev;
      if (isPlacedObjectId(id)) {
        return {
          ...prev,
          [id]: {
            ...prev[id],
            rotY: undefined,
          },
        };
      }
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
    setVrPanoMode(false);
    setWalkMode(false);
    setActivePreset(id);
    setPresetTrigger((n) => n + 1);
    if (preset) {
      setViewMode(preset.preferredViewMode);
    }
  }, []);

  const handleToggleWalkMode = useCallback(() => {
    setVrPanoMode(false);
    setWalkMode((prev) => {
      const next = !prev;
      if (next) {
        setViewMode('interior');
      }
      return next;
    });
  }, []);

  const handleToggleVrPanoMode = useCallback(() => {
    if (vrPanoMode) {
      vrActionsRef.current?.stopGyro();
      void vrActionsRef.current?.exitWebXR();
      setVrPanoMode(false);
      return;
    }
    // Start gyroscope sensor directly inside click gesture (required on iOS & Quest browsers)
    setWalkMode(false);
    setViewMode('interior');
    setFinishMenuOpen(false);
    setVrPanoMode(true);
    void vrActionsRef.current?.startGyroFromGesture();
  }, [vrPanoMode]);

  const handleSelectVrViewpoint = useCallback((id: VrViewpointId) => {
    setVrViewpoint(id);
  }, []);

  const handleRecenterVr = useCallback(() => {
    setVrRecenterTrigger((n) => n + 1);
  }, []);

  const handleEnterWebXR = useCallback(() => {
    if (!vrPanoMode) {
      setWalkMode(false);
      setViewMode('interior');
      setFinishMenuOpen(false);
      setVrPanoMode(true);
    }
    void vrActionsRef.current?.enterWebXR();
  }, [vrPanoMode]);

  const handleToggleFullscreen = useCallback(() => {
    void vrActionsRef.current?.toggleFullscreen();
  }, []);

  const handleChangeViewMode = useCallback((mode: ViewMode) => {
    if (mode === 'cutaway') {
      setWalkMode(false);
      setVrPanoMode(false);
    }
    setViewMode(mode);
  }, []);

  // Keyboard shortcuts: 1-9 for camera views, F for Walk Mode, V for VR 360°, Esc to exit, H to toggle HUD
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (catalogModalOpen) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        if (shareState.status !== 'idle') {
          handleCloseSharePanel();
          return;
        }
        if (vrPanoMode) {
          handleToggleVrPanoMode();
          return;
        }
        setWalkMode(false);
      } else if (e.code === 'KeyF') {
        handleToggleWalkMode();
      } else if (e.code === 'KeyV') {
        handleToggleVrPanoMode();
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
  }, [
    catalogModalOpen,
    handleCloseSharePanel,
    handleSelectPreset,
    handleToggleVrPanoMode,
    handleToggleWalkMode,
    shareState.status,
    vrPanoMode,
  ]);

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
        catalogVersion={catalogVersion}
        onOpenCatalogModal={handleOpenCatalogModal}
        onMoveObject={handleMoveObject}
        onRotateObject={handleRotateObject}
        onReplaceObject={handleReplaceObject}
        onDeleteObject={handleDeleteObject}
        onResetObject={handleResetObject}
        captureCameraRef={captureCameraRef}
        applyCameraRef={applyCameraRef}
        getSpawnPoseRef={getSpawnPoseRef}
        focusPlacedObjectRef={focusPlacedObjectRef}
        vrPanoMode={vrPanoMode}
        vrViewpoint={vrViewpoint}
        vrRecenterTrigger={vrRecenterTrigger}
        onVrGyroStatusChange={setVrGyroStatus}
        onXrSupportChange={setXrSupported}
        onXrSessionChange={setXrSessionActive}
        onVrViewpointChange={setVrViewpoint}
        vrActionsRef={vrActionsRef}
      />

      <ControlDock
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        walkMode={walkMode}
        onToggleWalkMode={handleToggleWalkMode}
        vrPanoMode={vrPanoMode}
        onToggleVrPanoMode={handleToggleVrPanoMode}
        vrViewpoint={vrViewpoint}
        onSelectVrViewpoint={handleSelectVrViewpoint}
        vrGyroStatus={vrGyroStatus}
        onRecenterVr={handleRecenterVr}
        xrSupported={xrSupported}
        xrSessionActive={xrSessionActive}
        onEnterWebXR={handleEnterWebXR}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
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
        catalogVersion={catalogVersion}
        customPendingCount={customPendingCount}
        customSyncedCount={customSyncedCount}
        onOpenCatalogModal={handleOpenCatalogModal}
        onReplaceObject={handleReplaceObject}
        onResetObjects={handleResetObjects}
        shareState={shareState}
        onShareScene={handleShareScene}
        onCopyShareUrl={handleCopyShareUrl}
        onCloseSharePanel={handleCloseSharePanel}
        sharedBanner={sharedBanner}
      />

      <CatalogManagerModal
        open={catalogModalOpen}
        initialType={catalogInitialType}
        items={customItems}
        loading={customItemsLoading}
        loadError={customItemsError}
        onItemsChange={applyCustomCatalogItems}
        onPlaceInScene={handlePlaceCatalogItemInScene}
        onClose={handleCloseCatalogModal}
      />
    </main>
  );
}
