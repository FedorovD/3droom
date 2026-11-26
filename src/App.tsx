import { useCallback, useEffect, useState } from 'react';
import { BathroomViewport } from './components/BathroomViewport';
import { ControlDock } from './components/ControlDock';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DimensionMode,
  FloorFinishId,
  LightingMode,
  ViewMode,
} from './scene/dimensions';

export default function App() {
  const [activePreset, setActivePreset] = useState<CameraPresetId>('apartment');
  const [presetTrigger, setPresetTrigger] = useState(0);
  const [walkMode, setWalkMode] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('Прихожая');
  const [viewMode, setViewMode] = useState<ViewMode>('cutaway');
  const [lightingMode, setLightingMode] = useState<LightingMode>('daylight');
  const [floorFinish, setFloorFinish] = useState<FloorFinishId>('screed');
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>('off');
  const [dockCollapsed, setDockCollapsed] = useState(false);

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

  // Keyboard shortcuts: 1-9 for camera views, F for Walk Mode, Esc to exit Walk Mode, H to toggle HUD
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
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
  }, [handleSelectPreset, handleToggleWalkMode]);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#161817]">
      <BathroomViewport
        activePreset={activePreset}
        presetTrigger={presetTrigger}
        viewMode={viewMode}
        lightingMode={lightingMode}
        floorFinish={floorFinish}
        dimensionMode={dimensionMode}
        walkMode={walkMode}
        onCurrentRoomChange={setCurrentRoom}
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
        dimensionMode={dimensionMode}
        onCycleDimensions={handleCycleDimensions}
        dockCollapsed={dockCollapsed}
        onToggleDock={() => setDockCollapsed((v) => !v)}
      />
    </main>
  );
}
