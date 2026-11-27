import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Move, RotateCcw, Trash2, X } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildBathroomScene, BathroomSceneController } from '../scene/buildBathroom';
import { DesignConfig } from '../scene/designCatalog';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DimensionMode,
  FloorFinishId,
  LightingMode,
  ViewMode,
} from '../scene/dimensions';
import {
  EditableMeta,
  findEditableAncestor,
  getEditableMeta,
  isEffectivelyVisible,
  ObjectEditsMap,
} from '../scene/editableObjects';
import {
  getInitialWalkPose,
  getRoomNameAt,
  isInsideApartment,
  PLAYER_EYE_HEIGHT,
  resolveWalkCollision,
} from '../scene/walkCollision';
import {
  loadPersistedCameraState,
  PersistedCameraState,
  savePersistedCameraState,
} from '../state/storage';
import {
  checkImmersiveVrSupport,
  findNearestVrViewpoint,
  getVrViewpoint,
  GyroPanoramaController,
  GyroStatus,
  VR_VIEWPOINTS,
  VrViewpointId,
} from '../scene/vrPanorama';

export interface VrViewportActions {
  startGyroFromGesture: (viewpointId?: VrViewpointId) => Promise<void>;
  stopGyro: () => void;
  enterWebXR: () => Promise<boolean>;
  exitWebXR: () => Promise<void>;
  toggleFullscreen: () => Promise<boolean>;
}

interface BathroomViewportProps {
  activePreset: CameraPresetId;
  presetTrigger: number;
  viewMode: ViewMode;
  lightingMode: LightingMode;
  floorFinish: FloorFinishId;
  designConfig: DesignConfig;
  dimensionMode: DimensionMode;
  walkMode: boolean;
  onCurrentRoomChange: (room: string) => void;
  objectEdits: ObjectEditsMap;
  onMoveObject: (id: string, offset: [number, number, number]) => void;
  onDeleteObject: (id: string) => void;
  onResetObject: (id: string) => void;
  captureCameraRef?: MutableRefObject<(() => PersistedCameraState) | null>;
  applyCameraRef?: MutableRefObject<
    ((cam: PersistedCameraState, targetWalkMode: boolean) => void) | null
  >;
  vrPanoMode: boolean;
  vrViewpoint: VrViewpointId;
  vrRecenterTrigger: number;
  onVrGyroStatusChange: (status: GyroStatus) => void;
  onXrSupportChange: (supported: boolean) => void;
  onXrSessionChange: (active: boolean) => void;
  onVrViewpointChange: (id: VrViewpointId) => void;
  vrActionsRef?: MutableRefObject<VrViewportActions | null>;
}

// Module-scope reusable math helpers (zero GC inside render loop)
const _goalPos = new THREE.Vector3();
const _goalTarget = new THREE.Vector3();
const _walkForward = new THREE.Vector3();
const _walkRight = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _floorHit = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _dragPlane = new THREE.Plane();
const _dragHit = new THREE.Vector3();
const _worldDelta = new THREE.Vector3();
const _localDelta = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _anchorWorld = new THREE.Vector3();
const _anchorNdc = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();
const _expandedHitBox = new THREE.Box3();
const _boxHit = new THREE.Vector3();
const _invParentQuat = new THREE.Quaternion();
const _xrTempMat4 = new THREE.Matrix4();
const _xrRayOrigin = new THREE.Vector3();
const _xrRayDir = new THREE.Vector3();
const _xrFloorHit = new THREE.Vector3();
const _xrHeadPos = new THREE.Vector3();
const _xrForward = new THREE.Vector3();
const _xrRight = new THREE.Vector3();

function isMeshTransparent(obj: THREE.Object3D): boolean {
  const mat = (obj as THREE.Mesh).material;
  if (!mat) return false;
  if (Array.isArray(mat)) {
    return mat.length > 0 && mat.every((m) => m.transparent && m.opacity < 0.72);
  }
  return Boolean(mat.transparent && mat.opacity < 0.72);
}

function hasIgnoredAncestor(obj: THREE.Object3D | null): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.ignoreRaycast) return true;
    cur = cur.parent;
  }
  return false;
}

const WALK_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
]);

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getTargetPixelRatio(isSoftwareGl: boolean): number {
  if (isSoftwareGl) return 1;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr, window.innerWidth < 768 ? 1.5 : 1.75);
}

export function BathroomViewport({
  activePreset,
  presetTrigger,
  viewMode,
  lightingMode,
  floorFinish,
  designConfig,
  dimensionMode,
  walkMode,
  onCurrentRoomChange,
  objectEdits,
  onMoveObject,
  onDeleteObject,
  onResetObject,
  captureCameraRef,
  applyCameraRef,
  vrPanoMode,
  vrViewpoint,
  vrRecenterTrigger,
  onVrGyroStatusChange,
  onXrSupportChange,
  onXrSessionChange,
  onVrViewpointChange,
  vrActionsRef,
}: BathroomViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  // Double-click selected object state & move mode
  const [selectedObj, setSelectedObj] = useState<EditableMeta | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [moveAxis, setMoveAxis] = useState<'xz' | 'y'>('xz');
  const [isDraggingObj, setIsDraggingObj] = useState(false);

  // Mutable refs so React state updates never recreate the WebGL context
  const controllerRef = useRef<BathroomSceneController | null>(null);
  const viewModeRef = useRef<ViewMode>(viewMode);
  const activePresetRef = useRef<CameraPresetId>(activePreset);
  const walkModeRef = useRef<boolean>(walkMode);
  const onRoomChangeRef = useRef(onCurrentRoomChange);
  const objectEditsRef = useRef<ObjectEditsMap>(objectEdits);
  const onMoveObjectRef = useRef(onMoveObject);
  const onDeleteObjectRef = useRef(onDeleteObject);
  const onResetObjectRef = useRef(onResetObject);
  const selectedIdRef = useRef<string | null>(null);
  const moveModeRef = useRef<boolean>(false);
  const moveAxisRef = useRef<'xz' | 'y'>('xz');
  const requestRenderRef = useRef<(() => void) | null>(null);
  const syncWalkModeRef = useRef<((enabled: boolean) => void) | null>(null);
  const nudgeSelectedRef = useRef<
    ((worldDx: number, worldDy: number, worldDz: number) => void) | null
  >(null);
  const syncSelectionHighlightRef = useRef<(() => void) | null>(null);
  const shadowDirtyRef = useRef<boolean>(false);
  const vrPanoModeRef = useRef<boolean>(vrPanoMode);
  const vrViewpointRef = useRef<VrViewpointId>(vrViewpoint);
  const onVrGyroStatusRef = useRef(onVrGyroStatusChange);
  const onXrSupportRef = useRef(onXrSupportChange);
  const onXrSessionRef = useRef(onXrSessionChange);
  const onVrViewpointChangeRef = useRef(onVrViewpointChange);
  const syncVrPanoModeRef = useRef<((enabled: boolean) => void) | null>(null);
  const moveVrViewpointRef = useRef<((id: VrViewpointId) => void) | null>(null);
  const recenterVrRef = useRef<(() => void) | null>(null);

  const transitionRef = useRef<{
    active: boolean;
    pos: [number, number, number];
    target: [number, number, number];
    fov: number;
  }>({
    active: false,
    pos: CAMERA_PRESETS[0].position,
    target: CAMERA_PRESETS[0].target,
    fov: CAMERA_PRESETS[0].fov,
  });

  useEffect(() => {
    onRoomChangeRef.current = onCurrentRoomChange;
  }, [onCurrentRoomChange]);

  useEffect(() => {
    onMoveObjectRef.current = onMoveObject;
  }, [onMoveObject]);

  useEffect(() => {
    onDeleteObjectRef.current = onDeleteObject;
  }, [onDeleteObject]);

  useEffect(() => {
    onResetObjectRef.current = onResetObject;
  }, [onResetObject]);

  useEffect(() => {
    onVrGyroStatusRef.current = onVrGyroStatusChange;
  }, [onVrGyroStatusChange]);

  useEffect(() => {
    onXrSupportRef.current = onXrSupportChange;
  }, [onXrSupportChange]);

  useEffect(() => {
    onXrSessionRef.current = onXrSessionChange;
  }, [onXrSessionChange]);

  useEffect(() => {
    onVrViewpointChangeRef.current = onVrViewpointChange;
  }, [onVrViewpointChange]);

  useEffect(() => {
    selectedIdRef.current = selectedObj?.id ?? null;
    syncSelectionHighlightRef.current?.();
    const raf = requestAnimationFrame(() => requestRenderRef.current?.());
    return () => cancelAnimationFrame(raf);
  }, [selectedObj]);

  useEffect(() => {
    moveModeRef.current = moveMode;
    syncSelectionHighlightRef.current?.();
    const raf = requestAnimationFrame(() => requestRenderRef.current?.());
    return () => cancelAnimationFrame(raf);
  }, [moveMode]);

  useEffect(() => {
    moveAxisRef.current = moveAxis;
  }, [moveAxis]);

  // Sync viewMode ref & re-evaluate cutaway immediately
  useEffect(() => {
    viewModeRef.current = viewMode;
    requestRenderRef.current?.();
  }, [viewMode]);

  // Sync lighting mood
  useEffect(() => {
    controllerRef.current?.setLightingMode(lightingMode);
    requestRenderRef.current?.();
  }, [lightingMode]);

  // Sync apartment floor finish
  useEffect(() => {
    controllerRef.current?.setFloorFinish(floorFinish);
    requestRenderRef.current?.();
  }, [floorFinish]);

  // Sync apartment wall finish, stretch ceiling & furniture design config
  useEffect(() => {
    controllerRef.current?.setDesignConfig(designConfig);
    controllerRef.current?.setObjectEdits(objectEditsRef.current);
    // Deselect if the selected object's furniture category was turned off
    if (selectedIdRef.current && controllerRef.current) {
      const candidates = controllerRef.current.getEditableObjects(selectedIdRef.current);
      if (!candidates.some((obj) => isEffectivelyVisible(obj))) {
        setSelectedObj(null);
        setMoveMode(false);
      }
    }
    syncSelectionHighlightRef.current?.();
    shadowDirtyRef.current = true;
    requestRenderRef.current?.();
  }, [designConfig]);

  // Sync saved/edited object positions & deletions
  useEffect(() => {
    objectEditsRef.current = objectEdits;
    controllerRef.current?.setObjectEdits(objectEdits);
    if (selectedIdRef.current && objectEdits[selectedIdRef.current]?.deleted) {
      setSelectedObj(null);
      setMoveMode(false);
    }
    syncSelectionHighlightRef.current?.();
    shadowDirtyRef.current = true;
    requestRenderRef.current?.();
  }, [objectEdits]);

  // Sync 3D dimensions overlay (off / basic / detailed)
  useEffect(() => {
    controllerRef.current?.setDimensionMode(dimensionMode);
    requestRenderRef.current?.();
  }, [dimensionMode]);

  // Sync walkMode transitions (skip initial mount & external shared-scene camera restoration)
  const didMountWalkRef = useRef(false);
  const suppressWalkSyncRef = useRef(false);
  useEffect(() => {
    walkModeRef.current = walkMode;
    if (!didMountWalkRef.current) {
      didMountWalkRef.current = true;
      return;
    }
    if (suppressWalkSyncRef.current) {
      suppressWalkSyncRef.current = false;
      return;
    }
    syncWalkModeRef.current?.(walkMode);
  }, [walkMode]);

  // Keep activePresetRef in sync without triggering camera animation on shared-scene hydration
  useEffect(() => {
    activePresetRef.current = activePreset;
  }, [activePreset]);

  // Trigger smooth damped camera preset transition ONLY when user explicitly selects a preset
  useEffect(() => {
    if (presetTrigger === 0) return;
    if (walkModeRef.current || vrPanoModeRef.current) return;
    const preset =
      CAMERA_PRESETS.find((p) => p.id === activePresetRef.current) ?? CAMERA_PRESETS[0];
    transitionRef.current = {
      active: true,
      pos: preset.position,
      target: preset.target,
      fov: preset.fov,
    };
    requestRenderRef.current?.();
  }, [presetTrigger]);

  // Sync VR 360° panoramic mode entry/exit
  const didMountVrRef = useRef(false);
  useEffect(() => {
    vrPanoModeRef.current = vrPanoMode;
    if (!didMountVrRef.current) {
      didMountVrRef.current = true;
      return;
    }
    syncVrPanoModeRef.current?.(vrPanoMode);
  }, [vrPanoMode]);

  // Move to selected panoramic room viewpoint
  useEffect(() => {
    vrViewpointRef.current = vrViewpoint;
    if (!vrPanoModeRef.current) return;
    moveVrViewpointRef.current?.(vrViewpoint);
  }, [vrViewpoint]);

  // Recenter gyroscope / panoramic heading on demand
  useEffect(() => {
    if (vrRecenterTrigger === 0) return;
    recenterVrRef.current?.();
  }, [vrRecenterTrigger]);

  // Mount Three.js WebGL scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        stencil: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.setPixelRatio(getTargetPixelRatio(isSoftwareGl));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Render shadow map on-demand only when static visibility changes (0.00 ms steady-state shadow cost!)
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );

    container.appendChild(renderer.domElement);

    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const bathroom = buildBathroomScene(maxAnisotropy, isSoftwareGl, () => {
      requestRenderRef.current?.();
    });
    controllerRef.current = bathroom;

    // Subtle floor destination ring shown briefly when clicking the floor in Walk Mode
    const walkMarkerGeo = new THREE.RingGeometry(0.11, 0.145, 32);
    const walkMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x9cb8a4,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const walkMarker = new THREE.Mesh(walkMarkerGeo, walkMarkerMat);
    walkMarker.rotation.x = -Math.PI / 2;
    walkMarker.position.y = 0.012;
    walkMarker.visible = false;
    walkMarker.userData.ignoreRaycast = true;
    bathroom.scene.add(walkMarker);

    // 3D wireframe bounding box highlight for double-click selected objects
    const selectionBox = new THREE.Box3();
    const selectionHelper = new THREE.Box3Helper(selectionBox, 0x9cb8a4);
    selectionHelper.visible = false;
    selectionHelper.userData.ignoreRaycast = true;
    const selectionMat = selectionHelper.material as THREE.LineBasicMaterial;
    selectionMat.depthTest = true;
    selectionMat.transparent = true;
    selectionMat.opacity = 0.92;
    bathroom.scene.add(selectionHelper);

    // VR Rig + Oculus Quest 2 controller laser pointers & floor teleport ring
    const vrRig = new THREE.Group();
    vrRig.name = 'VRRig';
    vrRig.userData.ignoreRaycast = true;
    bathroom.scene.add(vrRig);

    const vrTeleportGeo = new THREE.RingGeometry(0.16, 0.215, 36);
    const vrTeleportMat = new THREE.MeshBasicMaterial({
      color: 0x9cb8a4,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const vrTeleportRing = new THREE.Mesh(vrTeleportGeo, vrTeleportMat);
    vrTeleportRing.rotation.x = -Math.PI / 2;
    vrTeleportRing.position.y = 0.015;
    vrTeleportRing.visible = false;
    vrTeleportRing.userData.ignoreRaycast = true;
    bathroom.scene.add(vrTeleportRing);

    const vrRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);
    const vrRayMat = new THREE.LineBasicMaterial({
      color: 0x9cb8a4,
      transparent: true,
      opacity: 0.72,
    });
    const xrControllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    const xrControllerLines = xrControllers.map((ctrl) => {
      const line = new THREE.Line(vrRayGeo, vrRayMat);
      line.name = 'VRControllerRay';
      line.visible = false;
      line.userData.ignoreRaycast = true;
      ctrl.add(line);
      vrRig.add(ctrl);
      return line;
    });

    // Mandatory Studio PBR Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    bathroom.scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const savedCam = loadPersistedCameraState();
    const initialPreset =
      CAMERA_PRESETS.find((p) => p.id === activePresetRef.current) ?? CAMERA_PRESETS[0];
    const startFov = savedCam.orbit?.fov ?? initialPreset.fov;
    const startPos = savedCam.orbit?.position ?? initialPreset.position;
    const startTarget = savedCam.orbit?.target ?? initialPreset.target;

    const camera = new THREE.PerspectiveCamera(
      startFov,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.08,
      65
    );
    camera.position.set(...startPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...startTarget);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.075;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.78;
    controls.minDistance = 0.45;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.86;
    controls.minPolarAngle = 0.06;
    controls.update();

    if (!isSoftwareGl) {
      renderer.compile(bathroom.scene, camera);
    }

    const savedWalkSafe = savedCam.walk
      ? resolveWalkCollision(savedCam.walk.x, savedCam.walk.z)
      : null;

    // First-person walkthrough state
    const walkState = {
      x: savedWalkSafe ? savedWalkSafe.x : 7.42,
      z: savedWalkSafe ? savedWalkSafe.z : 2.15,
      eyeY: PLAYER_EYE_HEIGHT,
      yaw: savedCam.walk?.yaw ?? 0,
      pitch: savedCam.walk?.pitch ?? 0,
      targetYaw: savedCam.walk?.yaw ?? 0,
      targetPitch: savedCam.walk?.pitch ?? 0,
      vx: 0,
      vz: 0,
      bobPhase: 0,
      clickTarget: null as { x: number; z: number } | null,
      stuckTime: 0,
      keys: new Set<string>(),
      isDragging: false,
      dragMoved: false,
      downX: 0,
      downY: 0,
      lastX: 0,
      lastY: 0,
      pointerId: null as number | null,
      lastRoom: '',
    };

    const persistedCamCache: PersistedCameraState = { ...savedCam };
    let lastCamSaveTime = 0;

    // VR 360° panoramic state + WebXR (Oculus Quest 2) session state
    const panoState = {
      x: VR_VIEWPOINTS[0].x,
      z: VR_VIEWPOINTS[0].z,
      yaw: VR_VIEWPOINTS[0].initialYaw,
      prevOrbitFov: startFov,
      isDragging: false,
      lastX: 0,
      lastY: 0,
      pointerId: null as number | null,
    };

    let xrPresenting = false;
    let activeXrSession: XRSession | null = null;
    let xrTeleportValid = false;
    let xrTeleportX = panoState.x;
    let xrTeleportZ = panoState.z;
    let xrSnapReady = true;
    let xrCycleBtnLatch = false;
    let xrActiveAimCtrl = 1;
    let xrLastTime = performance.now();

    const gyroController = new GyroPanoramaController({
      onStatusChange: (status) => {
        onVrGyroStatusRef.current(status);
      },
      onSensorUpdate: () => {
        if (vrPanoModeRef.current && !xrPresenting) {
          requestRender();
        }
      },
    });

    // Detect Oculus Quest 2 / WebXR headset support once
    void checkImmersiveVrSupport().then((supported) => {
      if (!disposed) {
        onXrSupportRef.current(supported);
      }
    });

    const persistCurrentCamera = (force = false) => {
      if (vrPanoModeRef.current || xrPresenting) return;
      const now = performance.now();
      if (!force && now - lastCamSaveTime < 350) return;
      lastCamSaveTime = now;
      if (walkModeRef.current) {
        persistedCamCache.walk = {
          x: Number(walkState.x.toFixed(3)),
          z: Number(walkState.z.toFixed(3)),
          yaw: Number(walkState.yaw.toFixed(4)),
          pitch: Number(walkState.pitch.toFixed(4)),
        };
      } else {
        persistedCamCache.orbit = {
          position: [
            Number(camera.position.x.toFixed(3)),
            Number(camera.position.y.toFixed(3)),
            Number(camera.position.z.toFixed(3)),
          ],
          target: [
            Number(controls.target.x.toFixed(3)),
            Number(controls.target.y.toFixed(3)),
            Number(controls.target.z.toFixed(3)),
          ],
          fov: Number(camera.fov.toFixed(1)),
        };
      }
      savePersistedCameraState(persistedCamCache);
    };

    if (captureCameraRef) {
      captureCameraRef.current = () => {
        persistCurrentCamera(true);
        return {
          ...(persistedCamCache.orbit
            ? {
                orbit: {
                  position: [...persistedCamCache.orbit.position] as [number, number, number],
                  target: [...persistedCamCache.orbit.target] as [number, number, number],
                  fov: persistedCamCache.orbit.fov,
                },
              }
            : {}),
          ...(persistedCamCache.walk
            ? {
                walk: { ...persistedCamCache.walk },
              }
            : {}),
        };
      };
    }

    if (applyCameraRef) {
      applyCameraRef.current = (cam: PersistedCameraState, targetWalkMode: boolean) => {
        transitionRef.current.active = false;
        walkState.keys.clear();
        walkState.isDragging = false;
        walkState.pointerId = null;
        walkState.clickTarget = null;
        walkState.vx = 0;
        walkState.vz = 0;
        walkState.stuckTime = 0;
        walkMarker.visible = false;

        if (cam.orbit) {
          persistedCamCache.orbit = {
            position: [...cam.orbit.position] as [number, number, number],
            target: [...cam.orbit.target] as [number, number, number],
            fov: cam.orbit.fov,
          };
        }

        if (cam.walk) {
          const safe = resolveWalkCollision(cam.walk.x, cam.walk.z);
          walkState.x = safe.x;
          walkState.z = safe.z;
          walkState.eyeY = PLAYER_EYE_HEIGHT;
          walkState.yaw = cam.walk.yaw;
          walkState.targetYaw = cam.walk.yaw;
          walkState.pitch = cam.walk.pitch;
          walkState.targetPitch = cam.walk.pitch;
          walkState.bobPhase = 0;
          persistedCamCache.walk = {
            x: Number(safe.x.toFixed(3)),
            z: Number(safe.z.toFixed(3)),
            yaw: Number(cam.walk.yaw.toFixed(4)),
            pitch: Number(cam.walk.pitch.toFixed(4)),
          };
        }

        const walkModeChanging = walkModeRef.current !== targetWalkMode;
        if (walkModeChanging) {
          suppressWalkSyncRef.current = true;
        }
        walkModeRef.current = targetWalkMode;

        if (targetWalkMode) {
          controls.enabled = false;
          if (!cam.walk) {
            const fallbackOrbitPos = cam.orbit?.position ?? [camera.position.x, camera.position.y, camera.position.z];
            const fallbackOrbitTgt = cam.orbit?.target ?? [controls.target.x, controls.target.y, controls.target.z];
            const pose = getInitialWalkPose(
              new THREE.Vector3(...fallbackOrbitPos),
              new THREE.Vector3(...fallbackOrbitTgt),
              activePresetRef.current
            );
            walkState.x = pose.x;
            walkState.z = pose.z;
            walkState.yaw = pose.yaw;
            walkState.targetYaw = pose.yaw;
            walkState.pitch = pose.pitch;
            walkState.targetPitch = pose.pitch;
          }
          camera.rotation.order = 'YXZ';
          camera.position.set(walkState.x, walkState.eyeY, walkState.z);
          camera.rotation.set(walkState.pitch, walkState.yaw, 0, 'YXZ');
          camera.fov = 60;
          camera.updateProjectionMatrix();
          const room = getRoomNameAt(walkState.x, walkState.z);
          walkState.lastRoom = room;
          onRoomChangeRef.current(room);
        } else {
          const presetFallback =
            CAMERA_PRESETS.find((p) => p.id === activePresetRef.current) ?? CAMERA_PRESETS[0];
          const orbitPos = cam.orbit?.position ?? presetFallback.position;
          const orbitTarget = cam.orbit?.target ?? presetFallback.target;
          const orbitFov = cam.orbit?.fov ?? presetFallback.fov;
          camera.rotation.order = 'XYZ';
          camera.position.set(orbitPos[0], orbitPos[1], orbitPos[2]);
          controls.target.set(orbitTarget[0], orbitTarget[1], orbitTarget[2]);
          camera.fov = orbitFov;
          camera.updateProjectionMatrix();
          controls.enabled = true;
          controls.update();
        }

        savePersistedCameraState(persistedCamCache);
        shadowDirtyRef.current = true;
        requestRender();
      };
    }

    const syncWalkMode = (enabled: boolean) => {
      walkState.keys.clear();
      walkState.isDragging = false;
      walkState.pointerId = null;
      walkState.clickTarget = null;
      walkState.vx = 0;
      walkState.vz = 0;
      walkState.stuckTime = 0;
      walkMarker.visible = false;

      if (enabled) {
        transitionRef.current.active = false;
        controls.enabled = false;
        const pose = getInitialWalkPose(
          camera.position,
          controls.target,
          activePresetRef.current
        );
        walkState.x = pose.x;
        walkState.z = pose.z;
        walkState.eyeY = PLAYER_EYE_HEIGHT;
        walkState.yaw = pose.yaw;
        walkState.targetYaw = pose.yaw;
        walkState.pitch = pose.pitch;
        walkState.targetPitch = pose.pitch;
        walkState.bobPhase = 0;

        camera.rotation.order = 'YXZ';
        camera.position.set(walkState.x, walkState.eyeY, walkState.z);
        camera.rotation.set(walkState.pitch, walkState.yaw, 0, 'YXZ');
        camera.fov = 60;
        camera.updateProjectionMatrix();

        const room = getRoomNameAt(walkState.x, walkState.z);
        walkState.lastRoom = room;
        onRoomChangeRef.current(room);
      } else {
        // Place OrbitControls target directly ahead of current walk look direction
        _walkForward.set(
          -Math.sin(walkState.yaw) * Math.cos(walkState.pitch),
          Math.sin(walkState.pitch),
          -Math.cos(walkState.yaw) * Math.cos(walkState.pitch)
        );
        controls.target.copy(camera.position).addScaledVector(_walkForward, 1.6);
        controls.enabled = true;
        controls.update();
      }
      persistCurrentCamera(true);
      requestRender();
    };
    syncWalkModeRef.current = syncWalkMode;

    const placePanoAtViewpoint = (id: VrViewpointId) => {
      const vp = getVrViewpoint(id);
      const safe = resolveWalkCollision(vp.x, vp.z);
      panoState.x = safe.x;
      panoState.z = safe.z;
      panoState.yaw = vp.initialYaw;

      if (xrPresenting) {
        vrRig.position.set(safe.x, vrRig.position.y, safe.z);
        vrRig.rotation.set(0, vp.initialYaw, 0);
      } else if (vrPanoModeRef.current) {
        camera.position.set(safe.x, PLAYER_EYE_HEIGHT, safe.z);
        gyroController.recenter(vp.initialYaw);
      }
      onRoomChangeRef.current(getRoomNameAt(safe.x, safe.z));
      shadowDirtyRef.current = true;
      requestRender();
    };

    moveVrViewpointRef.current = placePanoAtViewpoint;

    recenterVrRef.current = () => {
      const vp = getVrViewpoint(vrViewpointRef.current);
      if (xrPresenting) {
        vrRig.rotation.set(0, vp.initialYaw, 0);
      } else {
        gyroController.recenter(vp.initialYaw);
        requestRender();
      }
    };

    const syncVrPanoMode = (enabled: boolean) => {
      panoState.isDragging = false;
      panoState.pointerId = null;

      if (enabled) {
        transitionRef.current.active = false;
        setSelectedObj(null);
        setMoveMode(false);
        controls.enabled = false;
        panoState.prevOrbitFov = camera.fov;

        const vp = getVrViewpoint(vrViewpointRef.current);
        const safe = resolveWalkCollision(vp.x, vp.z);
        panoState.x = safe.x;
        panoState.z = safe.z;
        panoState.yaw = vp.initialYaw;

        camera.position.set(safe.x, PLAYER_EYE_HEIGHT, safe.z);
        camera.fov = 72;
        camera.updateProjectionMatrix();

        onRoomChangeRef.current(getRoomNameAt(safe.x, safe.z));
        shadowDirtyRef.current = true;
        requestRender();
      } else {
        gyroController.stop();
        if (activeXrSession) {
          void activeXrSession.end().catch(() => {});
        }
        // Exit cleanly back to Orbit Controls facing the current panoramic look direction
        if (!walkModeRef.current) {
          camera.getWorldDirection(_walkForward);
          controls.target.copy(camera.position).addScaledVector(_walkForward, 1.8);
          camera.fov = Math.max(35, Math.min(65, panoState.prevOrbitFov || 48));
          camera.updateProjectionMatrix();
          controls.enabled = true;
          controls.update();
        }
        shadowDirtyRef.current = true;
        requestRender();
      }
    };

    syncVrPanoModeRef.current = syncVrPanoMode;

    // Quest 2 Controller trigger -> instant floor teleport
    const handleXrSelectStart = (ctrlIdx: number) => () => {
      xrActiveAimCtrl = ctrlIdx;
      if (!xrPresenting || !xrTeleportValid) return;

      const xrCam = renderer.xr.getCamera();
      xrCam.getWorldPosition(_xrHeadPos);
      const dx = xrTeleportX - _xrHeadPos.x;
      const dz = xrTeleportZ - _xrHeadPos.z;
      const nextHead = resolveWalkCollision(_xrHeadPos.x + dx, _xrHeadPos.z + dz);
      vrRig.position.x += nextHead.x - _xrHeadPos.x;
      vrRig.position.z += nextHead.z - _xrHeadPos.z;
      panoState.x = nextHead.x;
      panoState.z = nextHead.z;
      onRoomChangeRef.current(getRoomNameAt(nextHead.x, nextHead.z));
    };

    const xrSelectHandlers = [handleXrSelectStart(0), handleXrSelectStart(1)];
    xrControllers[0].addEventListener('selectstart', xrSelectHandlers[0]);
    xrControllers[1].addEventListener('selectstart', xrSelectHandlers[1]);

    // Dedicated 72/90Hz stereoscopic WebXR frame loop (active ONLY while Quest 2 VR session is presenting)
    const xrRenderFrame = (now: number) => {
      if (disposed || !xrPresenting) return;
      const dt = Math.min(Math.max((now - xrLastTime) / 1000, 0.001), 0.05);
      xrLastTime = now;

      const session = renderer.xr.getSession();
      if (session) {
        let moveForward = 0;
        let moveStrafe = 0;
        let snapInput = 0;
        let cyclePressed = false;

        for (let i = 0; i < session.inputSources.length; i++) {
          const src = session.inputSources[i];
          const gp = src.gamepad;
          if (!gp || !gp.axes) continue;

          // Quest 2 Touch thumbsticks map to axes[2] (X) and axes[3] (Y)
          const axX = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0] ?? 0;
          const axY = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1] ?? 0;

          if (src.handedness === 'left') {
            if (Math.abs(axX) > 0.16) moveStrafe += axX;
            if (Math.abs(axY) > 0.16) moveForward -= axY;
          } else if (src.handedness === 'right') {
            if (Math.abs(axX) > 0.16) snapInput = axX;
          } else {
            if (Math.abs(axY) > 0.16) moveForward -= axY;
          }

          // Button A / X (index 4 on Quest 2 Touch) cycles apartment rooms
          if (gp.buttons.length > 4 && gp.buttons[4]?.pressed) {
            cyclePressed = true;
          }
        }

        // Smooth collision-safe locomotion along XR headset gaze
        if (moveForward !== 0 || moveStrafe !== 0) {
          const xrCam = renderer.xr.getCamera();
          xrCam.getWorldDirection(_xrForward);
          _xrForward.y = 0;
          if (_xrForward.lengthSq() > 1e-5) {
            _xrForward.normalize();
            _xrRight.crossVectors(_xrForward, _upAxis).normalize();
            const speed = 1.85;
            const len = Math.hypot(moveForward, moveStrafe);
            const normF = len > 1 ? moveForward / len : moveForward;
            const normS = len > 1 ? moveStrafe / len : moveStrafe;

            xrCam.getWorldPosition(_xrHeadPos);
            const desiredX = _xrHeadPos.x + (_xrForward.x * normF + _xrRight.x * normS) * speed * dt;
            const desiredZ = _xrHeadPos.z + (_xrForward.z * normF + _xrRight.z * normS) * speed * dt;
            const safe = resolveWalkCollision(desiredX, desiredZ);
            vrRig.position.x += safe.x - _xrHeadPos.x;
            vrRig.position.z += safe.z - _xrHeadPos.z;
            panoState.x = safe.x;
            panoState.z = safe.z;
          }
        }

        // Comfortable 30° snap-turn on right thumbstick
        if (Math.abs(snapInput) > 0.65 && xrSnapReady) {
          xrSnapReady = false;
          const angle = snapInput > 0 ? -Math.PI / 6 : Math.PI / 6;
          const xrCam = renderer.xr.getCamera();
          xrCam.getWorldPosition(_xrHeadPos);
          const ox = _xrHeadPos.x - vrRig.position.x;
          const oz = _xrHeadPos.z - vrRig.position.z;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const rx = ox * cosA + oz * sinA;
          const rz = -ox * sinA + oz * cosA;
          vrRig.rotation.y += angle;
          vrRig.position.x += ox - rx;
          vrRig.position.z += oz - rz;
        } else if (Math.abs(snapInput) < 0.25) {
          xrSnapReady = true;
        }

        // A / X button cycles through curated room panoramic viewpoints
        if (cyclePressed && !xrCycleBtnLatch) {
          xrCycleBtnLatch = true;
          const idx = VR_VIEWPOINTS.findIndex((v) => v.id === vrViewpointRef.current);
          const nextVp = VR_VIEWPOINTS[(idx + 1) % VR_VIEWPOINTS.length];
          vrViewpointRef.current = nextVp.id;
          onVrViewpointChangeRef.current(nextVp.id);
          placePanoAtViewpoint(nextVp.id);
        } else if (!cyclePressed) {
          xrCycleBtnLatch = false;
        }

        // Update floor teleport pointer ray from active Quest 2 controller
        xrTeleportValid = false;
        const aimCtrl = xrControllers[xrActiveAimCtrl] ?? xrControllers[0];
        if (aimCtrl && session.inputSources.length > 0) {
          xrControllerLines[0].visible = true;
          xrControllerLines[1].visible = true;
          _xrTempMat4.identity().extractRotation(aimCtrl.matrixWorld);
          _xrRayOrigin.setFromMatrixPosition(aimCtrl.matrixWorld);
          _xrRayDir.set(0, 0, -1).applyMatrix4(_xrTempMat4).normalize();
          _raycaster.set(_xrRayOrigin, _xrRayDir);
          if (_raycaster.ray.intersectPlane(_floorPlane, _xrFloorHit)) {
            const dist = Math.hypot(_xrFloorHit.x - _xrRayOrigin.x, _xrFloorHit.z - _xrRayOrigin.z);
            if (dist > 0.25 && dist < 11 && isInsideApartment(_xrFloorHit.x, _xrFloorHit.z)) {
              const safe = resolveWalkCollision(_xrFloorHit.x, _xrFloorHit.z);
              xrTeleportX = safe.x;
              xrTeleportZ = safe.z;
              xrTeleportValid = true;
              vrTeleportRing.position.set(safe.x, 0.015, safe.z);
            }
          }
        }
        vrTeleportRing.visible = xrTeleportValid;
      }

      const xrCam = renderer.xr.getCamera();
      xrCam.getWorldPosition(_xrHeadPos);

      const doorMoved = bathroom.updateBalconyDoor(true, _xrHeadPos, dt, false);
      const cutawayChanged = bathroom.updateCutaway('interior', _xrHeadPos, activePresetRef.current);
      if ((cutawayChanged || doorMoved || shadowDirtyRef.current) && renderer.shadowMap.enabled) {
        renderer.shadowMap.needsUpdate = true;
        shadowDirtyRef.current = false;
      }

      renderer.render(bathroom.scene, camera);
    };

    const enterWebXR = async (): Promise<boolean> => {
      try {
        const nav = navigator as Navigator & {
          xr?: {
            requestSession: (
              mode: string,
              opts?: { optionalFeatures?: string[] }
            ) => Promise<XRSession>;
          };
        };
        if (!nav.xr) return false;
        if (activeXrSession) return true;

        let useFloorSpace = true;
        let session: XRSession;
        try {
          session = await nav.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
          });
        } catch {
          useFloorSpace = false;
          session = await nav.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local'],
          });
        }

        activeXrSession = session;
        xrPresenting = true;
        xrLastTime = performance.now();
        gyroController.stop();
        controls.enabled = false;

        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType(useFloorSpace ? 'local-floor' : 'local');

        const safe = resolveWalkCollision(panoState.x, panoState.z);
        vrRig.position.set(safe.x, useFloorSpace ? 0 : PLAYER_EYE_HEIGHT, safe.z);
        vrRig.rotation.set(0, panoState.yaw, 0);
        vrRig.add(camera);
        camera.position.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);

        session.addEventListener('end', () => {
          xrPresenting = false;
          activeXrSession = null;
          xrTeleportValid = false;
          vrTeleportRing.visible = false;
          xrControllerLines[0].visible = false;
          xrControllerLines[1].visible = false;
          renderer.setAnimationLoop(null);
          renderer.xr.enabled = false;

          // Restore camera back into root scene at final VR world position
          bathroom.scene.add(camera);
          const finalPos = resolveWalkCollision(panoState.x, panoState.z);
          camera.position.set(finalPos.x, PLAYER_EYE_HEIGHT, finalPos.z);
          camera.aspect =
            (container.clientWidth || window.innerWidth) /
            (container.clientHeight || window.innerHeight);
          camera.fov = vrPanoModeRef.current ? 72 : Math.max(35, Math.min(65, panoState.prevOrbitFov || 48));
          camera.updateProjectionMatrix();

          onXrSessionRef.current(false);
          if (vrPanoModeRef.current) {
            void gyroController.start(panoState.yaw);
          } else if (!walkModeRef.current) {
            controls.enabled = true;
            controls.update();
          }
          shadowDirtyRef.current = true;
          requestRender();
        });

        await renderer.xr.setSession(session);
        onXrSessionRef.current(true);
        renderer.setAnimationLoop(xrRenderFrame);
        return true;
      } catch (err) {
        console.warn('WebXR session failed to start:', err);
        xrPresenting = false;
        activeXrSession = null;
        renderer.xr.enabled = false;
        return false;
      }
    };

    const exitWebXR = async (): Promise<void> => {
      if (activeXrSession) {
        await activeXrSession.end().catch(() => {});
      }
    };

    if (vrActionsRef) {
      vrActionsRef.current = {
        startGyroFromGesture: async (viewpointId?: VrViewpointId) => {
          const targetVp = viewpointId
            ? getVrViewpoint(viewpointId)
            : findNearestVrViewpoint(camera.position.x, camera.position.z);
          vrViewpointRef.current = targetVp.id;
          onVrViewpointChangeRef.current(targetVp.id);
          await gyroController.start(targetVp.initialYaw);
          requestRender();
        },
        stopGyro: () => {
          gyroController.stop();
        },
        enterWebXR,
        exitWebXR,
        toggleFullscreen: async () => {
          try {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
              return true;
            }
            await document.exitFullscreen();
            return false;
          } catch {
            return Boolean(document.fullscreenElement);
          }
        },
      };
    }

    // Cancel any scripted camera transition immediately when user interacts
    const onControlStart = () => {
      transitionRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // --- Walk Mode Keyboard, Pointer Drag Look, Click-to-Walk & Wheel Step ---
    const onKeyDown = (e: KeyboardEvent) => {
      if (!walkModeRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (WALK_KEYS.has(e.code)) {
        if (e.code.startsWith('Arrow')) e.preventDefault();
        walkState.keys.add(e.code);
        requestRender();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (walkState.keys.delete(e.code) && walkModeRef.current) {
        requestRender();
      }
    };

    const domEl = renderer.domElement;

    // --- Interactive Double-Click Object Selection, Dragging & Screen-Space Popover ---
    const getActiveEditableObject = (id: string | null): THREE.Object3D | null => {
      if (!id) return null;
      const list = bathroom.getEditableObjects(id);
      for (const obj of list) {
        if (isEffectivelyVisible(obj)) return obj;
      }
      return null;
    };

    const getObjectBasePos = (obj: THREE.Object3D): THREE.Vector3 => {
      if (obj.userData.basePos instanceof THREE.Vector3) {
        return obj.userData.basePos;
      }
      const cloned = obj.position.clone();
      obj.userData.basePos = cloned;
      return cloned;
    };

    const applyLiveOffsetToId = (
      id: string,
      dx: number,
      dy: number,
      dz: number
    ): [number, number, number] => {
      const clamped: [number, number, number] = [
        THREE.MathUtils.clamp(dx, -12, 12),
        THREE.MathUtils.clamp(dy, -2.4, 2.4),
        THREE.MathUtils.clamp(dz, -12, 12),
      ];
      const list = bathroom.getEditableObjects(id);
      for (const obj of list) {
        const basePos = getObjectBasePos(obj);
        obj.position.set(
          basePos.x + clamped[0],
          basePos.y + clamped[1],
          basePos.z + clamped[2]
        );
        obj.updateMatrix();
        obj.updateMatrixWorld(true);
      }
      return clamped;
    };

    const syncSelectionHighlight = () => {
      const activeObj = getActiveEditableObject(selectedIdRef.current);
      if (!activeObj) {
        selectionHelper.visible = false;
        return;
      }
      selectionBox.setFromObject(activeObj);
      if (selectionBox.isEmpty()) {
        selectionHelper.visible = false;
        return;
      }
      selectionBox.expandByScalar(0.01);
      selectionMat.color.setHex(moveModeRef.current ? 0xe4b468 : 0x9cb8a4);
      selectionHelper.visible = true;
      selectionHelper.updateMatrixWorld(true);
    };
    syncSelectionHighlightRef.current = syncSelectionHighlight;

    const updateOverlayPosition = () => {
      const el = overlayRef.current;
      if (!el) return;
      const activeObj = getActiveEditableObject(selectedIdRef.current);
      if (!activeObj) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }
      selectionBox.setFromObject(activeObj);
      if (selectionBox.isEmpty()) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }
      selectionBox.getCenter(_boxCenter);
      _anchorWorld.set(_boxCenter.x, selectionBox.max.y + 0.08, _boxCenter.z);

      // Hide popover only when the selected object is completely behind the camera
      camera.getWorldDirection(_camDir);
      const toCenterDot = _worldDelta.copy(_boxCenter).sub(camera.position).dot(_camDir);
      if (toCenterDot <= 0.05) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      _anchorNdc.copy(_anchorWorld).project(camera);
      // If the top edge is behind/above frustum, anchor on the bounding center instead
      if (_anchorNdc.z > 1 || _anchorNdc.y > 0.98) {
        _anchorNdc.copy(_boxCenter).project(camera);
      }

      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const px = (_anchorNdc.x * 0.5 + 0.5) * w;
      const py = (-_anchorNdc.y * 0.5 + 0.5) * h;

      const popW = el.offsetWidth || 236;
      const popH = el.offsetHeight || 76;
      const pad = 12;

      const desiredX = px - popW * 0.5;
      const desiredY = py - popH - 16;
      const clampedX = THREE.MathUtils.clamp(desiredX, pad, Math.max(pad, w - popW - pad));
      const clampedY = THREE.MathUtils.clamp(
        desiredY < pad ? py + 18 : desiredY,
        pad,
        Math.max(pad, h - popH - pad)
      );

      el.style.transform = `translate3d(${Math.round(clampedX)}px, ${Math.round(clampedY)}px, 0)`;
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    };

    const objDragState = {
      active: false,
      pointerId: null as number | null,
      editableId: '' as string,
      vertical: false,
      startWorldHit: new THREE.Vector3(),
      startLocalPos: new THREE.Vector3(),
      basePos: new THREE.Vector3(),
      invParentQuat: new THREE.Quaternion(),
      currentOffset: [0, 0, 0] as [number, number, number],
    };

    nudgeSelectedRef.current = (worldDx: number, worldDy: number, worldDz: number) => {
      const id = selectedIdRef.current;
      const activeObj = getActiveEditableObject(id);
      if (!id || !activeObj) return;
      if (activeObj.parent) {
        activeObj.parent.getWorldQuaternion(_invParentQuat).invert();
      } else {
        _invParentQuat.identity();
      }
      _localDelta.set(worldDx, worldDy, worldDz).applyQuaternion(_invParentQuat);
      const basePos = getObjectBasePos(activeObj);
      const nextOffset = applyLiveOffsetToId(
        id,
        activeObj.position.x + _localDelta.x - basePos.x,
        activeObj.position.y + _localDelta.y - basePos.y,
        activeObj.position.z + _localDelta.z - basePos.z
      );
      syncSelectionHighlight();
      shadowDirtyRef.current = true;
      onMoveObjectRef.current(id, nextOffset);
      requestRender();
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (vrPanoModeRef.current || xrPresenting) return;
      const rect = domEl.getBoundingClientRect();
      _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, camera);

      const hits = _raycaster.intersectObjects(bathroom.scene.children, true);
      let picked: THREE.Object3D | null = null;

      for (const hit of hits) {
        const obj = hit.object;
        if (
          obj instanceof THREE.Sprite ||
          obj instanceof THREE.Line ||
          obj instanceof THREE.LineSegments ||
          hasIgnoredAncestor(obj) ||
          !isEffectivelyVisible(obj)
        ) {
          continue;
        }
        const editable = findEditableAncestor(obj);
        if (editable && isEffectivelyVisible(editable)) {
          picked = editable;
          break;
        }
        // Stop at the first opaque non-editable architectural surface (wall/floor)
        if (!isMeshTransparent(obj)) {
          break;
        }
      }

      // Cancel any pending Walk Mode click-to-walk target triggered by double-click taps
      walkState.clickTarget = null;
      walkMarker.visible = false;

      if (picked) {
        const meta = getEditableMeta(picked);
        if (meta) {
          selectedIdRef.current = meta.id;
          moveModeRef.current = false;
          moveAxisRef.current = 'xz';
          setSelectedObj(meta);
          setMoveMode(false);
          setMoveAxis('xz');
          syncSelectionHighlight();
          requestRender();
          return;
        }
      }

      if (selectedIdRef.current) {
        selectedIdRef.current = null;
        moveModeRef.current = false;
        setSelectedObj(null);
        setMoveMode(false);
        syncSelectionHighlight();
        requestRender();
      }
    };

    // Capture-phase pointerdown intercepts dragging on the selected object before OrbitControls / Walk Mode
    const onObjectPointerDown = (e: PointerEvent) => {
      if (!moveModeRef.current || !selectedIdRef.current) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const activeObj = getActiveEditableObject(selectedIdRef.current);
      if (!activeObj) return;

      const rect = domEl.getBoundingClientRect();
      _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, camera);

      let grabPoint: THREE.Vector3 | null = null;
      const directHits = _raycaster.intersectObject(activeObj, true);
      for (const h of directHits) {
        if (
          !(h.object instanceof THREE.Sprite) &&
          !(h.object instanceof THREE.Line) &&
          isEffectivelyVisible(h.object)
        ) {
          grabPoint = h.point.clone();
          break;
        }
      }

      if (!grabPoint) {
        selectionBox.setFromObject(activeObj);
        if (!selectionBox.isEmpty()) {
          _expandedHitBox.copy(selectionBox).expandByScalar(0.09);
          if (_raycaster.ray.intersectBox(_expandedHitBox, _boxHit)) {
            grabPoint = _boxHit.clone();
          }
        }
      }

      if (!grabPoint) return;

      const meta = getEditableMeta(activeObj);
      const useVertical =
        meta?.axes === 'xyz' && (moveAxisRef.current === 'y' || e.shiftKey);

      if (useVertical) {
        camera.getWorldDirection(_camDir);
        _camDir.y = 0;
        if (_camDir.lengthSq() < 1e-4) {
          _camDir.set(0, 0, 1);
        } else {
          _camDir.normalize();
        }
        _dragPlane.setFromNormalAndCoplanarPoint(_camDir, grabPoint);
      } else {
        _dragPlane.setFromNormalAndCoplanarPoint(_upAxis, grabPoint);
      }

      if (!_raycaster.ray.intersectPlane(_dragPlane, _dragHit)) return;

      e.stopImmediatePropagation();
      e.preventDefault();

      transitionRef.current.active = false;
      controls.enabled = false;
      domEl.setPointerCapture?.(e.pointerId);

      const basePos = getObjectBasePos(activeObj);
      objDragState.active = true;
      objDragState.pointerId = e.pointerId;
      objDragState.editableId = selectedIdRef.current;
      objDragState.vertical = useVertical;
      objDragState.startWorldHit.copy(_dragHit);
      objDragState.startLocalPos.copy(activeObj.position);
      objDragState.basePos.copy(basePos);
      if (activeObj.parent) {
        activeObj.parent.getWorldQuaternion(objDragState.invParentQuat).invert();
      } else {
        objDragState.invParentQuat.identity();
      }
      objDragState.currentOffset = [
        activeObj.position.x - basePos.x,
        activeObj.position.y - basePos.y,
        activeObj.position.z - basePos.z,
      ];
      setIsDraggingObj(true);
    };

    const onObjectPointerMove = (e: PointerEvent) => {
      if (!objDragState.active) return;
      if (objDragState.pointerId !== null && e.pointerId !== objDragState.pointerId) return;

      e.stopImmediatePropagation();
      const rect = domEl.getBoundingClientRect();
      _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, camera);

      if (!_raycaster.ray.intersectPlane(_dragPlane, _dragHit)) return;

      _worldDelta.copy(_dragHit).sub(objDragState.startWorldHit);
      if (objDragState.vertical) {
        _worldDelta.x = 0;
        _worldDelta.z = 0;
      } else {
        _worldDelta.y = 0;
      }

      _localDelta.copy(_worldDelta).applyQuaternion(objDragState.invParentQuat);

      const nextDx = objDragState.startLocalPos.x + _localDelta.x - objDragState.basePos.x;
      const nextDy = objDragState.startLocalPos.y + _localDelta.y - objDragState.basePos.y;
      const nextDz = objDragState.startLocalPos.z + _localDelta.z - objDragState.basePos.z;

      objDragState.currentOffset = applyLiveOffsetToId(
        objDragState.editableId,
        nextDx,
        nextDy,
        nextDz
      );
      syncSelectionHighlight();
      shadowDirtyRef.current = true;
      requestRender();
    };

    const finishObjectDrag = (e: PointerEvent) => {
      if (!objDragState.active) return;
      if (objDragState.pointerId !== null && e.pointerId !== objDragState.pointerId) return;

      e.stopImmediatePropagation();
      objDragState.active = false;
      objDragState.pointerId = null;
      domEl.releasePointerCapture?.(e.pointerId);
      controls.enabled = !walkModeRef.current;
      setIsDraggingObj(false);
      onMoveObjectRef.current(objDragState.editableId, [...objDragState.currentOffset]);
      requestRender();
    };

    const onWindowBlur = () => {
      walkState.keys.clear();
      walkState.isDragging = false;
      walkState.pointerId = null;
      if (objDragState.active) {
        objDragState.active = false;
        objDragState.pointerId = null;
        controls.enabled = !walkModeRef.current;
        setIsDraggingObj(false);
        onMoveObjectRef.current(objDragState.editableId, [...objDragState.currentOffset]);
      }
    };

    // Keyboard: Esc exits move mode / deselects; Arrow keys nudge selected object in Move Mode
    const onSelectionKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape' && selectedIdRef.current) {
        e.preventDefault();
        if (moveModeRef.current) {
          moveModeRef.current = false;
          setMoveMode(false);
        } else {
          selectedIdRef.current = null;
          setSelectedObj(null);
        }
        syncSelectionHighlight();
        requestRender();
        return;
      }

      if (moveModeRef.current && selectedIdRef.current) {
        const isArrow =
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight';
        if (!isArrow) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        const step = e.shiftKey ? 0.1 : 0.02;

        if (moveAxisRef.current === 'y' && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
          const dy = e.code === 'ArrowUp' ? step : -step;
          nudgeSelectedRef.current?.(0, dy, 0);
          return;
        }

        camera.getWorldDirection(_camDir);
        _camDir.y = 0;
        if (_camDir.lengthSq() < 1e-4) {
          _camDir.set(0, 0, -1);
        } else {
          _camDir.normalize();
        }
        _camRight.crossVectors(_camDir, _upAxis).normalize();

        let wx = 0;
        let wz = 0;
        if (e.code === 'ArrowUp') {
          wx = _camDir.x * step;
          wz = _camDir.z * step;
        } else if (e.code === 'ArrowDown') {
          wx = -_camDir.x * step;
          wz = -_camDir.z * step;
        } else if (e.code === 'ArrowRight') {
          wx = _camRight.x * step;
          wz = _camRight.z * step;
        } else if (e.code === 'ArrowLeft') {
          wx = -_camRight.x * step;
          wz = -_camRight.z * step;
        }
        nudgeSelectedRef.current?.(wx, 0, wz);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (xrPresenting || objDragState.active) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      if (vrPanoModeRef.current) {
        panoState.isDragging = true;
        panoState.lastX = e.clientX;
        panoState.lastY = e.clientY;
        panoState.pointerId = e.pointerId;
        domEl.setPointerCapture?.(e.pointerId);
        return;
      }

      if (!walkModeRef.current) return;
      walkState.isDragging = true;
      walkState.dragMoved = false;
      walkState.downX = e.clientX;
      walkState.downY = e.clientY;
      walkState.lastX = e.clientX;
      walkState.lastY = e.clientY;
      walkState.pointerId = e.pointerId;
      domEl.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (vrPanoModeRef.current && panoState.isDragging) {
        if (panoState.pointerId !== null && e.pointerId !== panoState.pointerId) return;
        const dx = e.clientX - panoState.lastX;
        const dy = e.clientY - panoState.lastY;
        panoState.lastX = e.clientX;
        panoState.lastY = e.clientY;
        const dir = e.pointerType === 'touch' ? 1 : -1;
        gyroController.addLookDelta(dir * dx * 0.0038, dir * dy * 0.0032);
        requestRender();
        return;
      }

      if (!walkModeRef.current || !walkState.isDragging) return;
      if (walkState.pointerId !== null && e.pointerId !== walkState.pointerId) return;

      const dx = e.clientX - walkState.lastX;
      const dy = e.clientY - walkState.lastY;
      walkState.lastX = e.clientX;
      walkState.lastY = e.clientY;

      if (
        !walkState.dragMoved &&
        Math.hypot(e.clientX - walkState.downX, e.clientY - walkState.downY) > 6
      ) {
        walkState.dragMoved = true;
      }

      const yawSensitivity = 0.0034;
      const pitchSensitivity = 0.0028;
      // Touch screens use drag-the-scene direction (+dx/+dy), while mouse uses direct look (-dx/-dy)
      const dir = e.pointerType === 'touch' ? 1 : -1;
      walkState.targetYaw += dir * dx * yawSensitivity;
      walkState.targetPitch = THREE.MathUtils.clamp(
        walkState.targetPitch + dir * dy * pitchSensitivity,
        -1.26,
        1.26
      );
      requestRender();
    };

    const finishPointer = (e: PointerEvent, allowClickWalk: boolean) => {
      if (panoState.isDragging && (panoState.pointerId === null || e.pointerId === panoState.pointerId)) {
        panoState.isDragging = false;
        panoState.pointerId = null;
        domEl.releasePointerCapture?.(e.pointerId);
        return;
      }
      if (!walkState.isDragging) return;
      if (walkState.pointerId !== null && e.pointerId !== walkState.pointerId) return;
      walkState.isDragging = false;
      walkState.pointerId = null;
      domEl.releasePointerCapture?.(e.pointerId);

      // Quick tap / click on floor -> walk smoothly to that spot
      if (allowClickWalk && walkModeRef.current && !walkState.dragMoved && !moveModeRef.current) {
        const rect = domEl.getBoundingClientRect();
        _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        _raycaster.setFromCamera(_ndc, camera);
        if (_raycaster.ray.intersectPlane(_floorPlane, _floorHit)) {
          const dist = Math.hypot(_floorHit.x - walkState.x, _floorHit.z - walkState.z);
          if (dist > 0.2 && dist < 13 && isInsideApartment(_floorHit.x, _floorHit.z)) {
            const safe = resolveWalkCollision(_floorHit.x, _floorHit.z);
            walkState.clickTarget = { x: safe.x, z: safe.z };
            walkState.stuckTime = 0;
            walkMarker.position.set(safe.x, 0.012, safe.z);
            walkMarker.visible = true;
            requestRender();
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => finishPointer(e, true);
    const onPointerCancel = (e: PointerEvent) => finishPointer(e, false);

    // Mouse wheel in Walk Mode gently steps forward/backward along horizontal gaze
    const onWheel = (e: WheelEvent) => {
      if (!walkModeRef.current) return;
      e.preventDefault();
      walkState.clickTarget = null;
      walkMarker.visible = false;
      const dir = e.deltaY < 0 ? 1 : -1;
      const impulse = 1.95 * dir;
      walkState.vx += -Math.sin(walkState.yaw) * impulse;
      walkState.vz += -Math.cos(walkState.yaw) * impulse;
      requestRender();
    };

    window.addEventListener('keydown', onSelectionKeyDown, { capture: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    domEl.addEventListener('dblclick', onDoubleClick);
    domEl.addEventListener('pointerdown', onObjectPointerDown, { capture: true });
    domEl.addEventListener('pointermove', onObjectPointerMove, { capture: true });
    domEl.addEventListener('pointerup', finishObjectDrag, { capture: true });
    domEl.addEventListener('pointercancel', finishObjectDrag, { capture: true });
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('pointercancel', onPointerCancel);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // WebGL context loss safety
    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    const onContextRestored = () => {
      requestRender();
    };
    domEl.addEventListener('webglcontextlost', onContextLost);
    domEl.addEventListener('webglcontextrestored', onContextRestored);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let wasAnimating = false;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed || xrPresenting) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed || xrPresenting) {
          renderBusy = false;
          return;
        }
        renderDirty = false;
        // Avoid large idle-wake dt jump on the first frame after rest
        const dt = wasAnimating
          ? Math.min((now - lastTime) / 1000, 0.05)
          : 1 / 60;
        lastTime = now;

        let needsMoreFrames = false;

        if (vrPanoModeRef.current) {
          camera.position.set(panoState.x, PLAYER_EYE_HEIGHT, panoState.z);
          const gyroSettling = gyroController.updateCamera(camera, dt, isSoftwareGl);
          if (gyroSettling) {
            needsMoreFrames = true;
          }
        } else if (walkModeRef.current) {
          const keys = walkState.keys;
          const fwd =
            (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
            (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
          const str =
            (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
            (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
          const turn = (keys.has('KeyQ') ? 1 : 0) - (keys.has('KeyE') ? 1 : 0);

          if (turn !== 0) {
            walkState.targetYaw += turn * 1.65 * dt;
            needsMoreFrames = true;
          }

          // Smooth look damping
          if (isSoftwareGl) {
            walkState.yaw = walkState.targetYaw;
            walkState.pitch = walkState.targetPitch;
          } else {
            const lookLambda = 18;
            walkState.yaw = THREE.MathUtils.damp(
              walkState.yaw,
              walkState.targetYaw,
              lookLambda,
              dt
            );
            walkState.pitch = THREE.MathUtils.damp(
              walkState.pitch,
              walkState.targetPitch,
              lookLambda,
              dt
            );
            if (
              Math.abs(walkState.targetYaw - walkState.yaw) > 0.0006 ||
              Math.abs(walkState.targetPitch - walkState.pitch) > 0.0006
            ) {
              needsMoreFrames = true;
            }
          }

          // Compute desired walk velocity
          let desVx = 0;
          let desVz = 0;
          const moveSpeed =
            keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.65 : 1.65;

          if (fwd !== 0 || str !== 0) {
            // Manual keyboard movement cancels floor click-to-walk target
            if (walkState.clickTarget) {
              walkState.clickTarget = null;
              walkMarker.visible = false;
            }
            _walkForward.set(-Math.sin(walkState.yaw), 0, -Math.cos(walkState.yaw));
            _walkRight.set(Math.cos(walkState.yaw), 0, -Math.sin(walkState.yaw));
            desVx = _walkForward.x * fwd + _walkRight.x * str;
            desVz = _walkForward.z * fwd + _walkRight.z * str;
            const len = Math.hypot(desVx, desVz) || 1;
            desVx = (desVx / len) * moveSpeed;
            desVz = (desVz / len) * moveSpeed;
            needsMoreFrames = true;
          } else if (walkState.clickTarget) {
            const tx = walkState.clickTarget.x - walkState.x;
            const tz = walkState.clickTarget.z - walkState.z;
            const dist = Math.hypot(tx, tz);
            if (dist < 0.14) {
              walkState.clickTarget = null;
              walkMarker.visible = false;
            } else {
              const approachSpeed = Math.min(1.9, Math.max(0.55, dist * 2.4));
              desVx = (tx / dist) * approachSpeed;
              desVz = (tz / dist) * approachSpeed;
              needsMoreFrames = true;
            }
          }

          // Smooth velocity damping
          if (isSoftwareGl) {
            walkState.vx = desVx;
            walkState.vz = desVz;
          } else {
            const velLambda = fwd !== 0 || str !== 0 || walkState.clickTarget ? 11 : 10;
            walkState.vx = THREE.MathUtils.damp(walkState.vx, desVx, velLambda, dt);
            walkState.vz = THREE.MathUtils.damp(walkState.vz, desVz, velLambda, dt);
          }

          const prevX = walkState.x;
          const prevZ = walkState.z;
          const stepX = walkState.x + walkState.vx * dt;
          const stepZ = walkState.z + walkState.vz * dt;
          const resolved = resolveWalkCollision(stepX, stepZ);
          walkState.x = resolved.x;
          walkState.z = resolved.z;

          const movedDist = Math.hypot(walkState.x - prevX, walkState.z - prevZ);
          const actualSpeed = dt > 1e-4 ? movedDist / dt : 0;

          // Cancel click-to-walk if blocked by a wall
          if (walkState.clickTarget) {
            if (actualSpeed < 0.12) {
              walkState.stuckTime += dt;
              if (walkState.stuckTime > 0.3) {
                walkState.clickTarget = null;
                walkMarker.visible = false;
              }
            } else {
              walkState.stuckTime = 0;
            }
          }

          // Subtle natural eye-level walking cadence (only when moving on real GPU)
          if (!isSoftwareGl && actualSpeed > 0.18) {
            walkState.bobPhase += dt * Math.min(actualSpeed * 4.5, 11);
            const targetEyeY = PLAYER_EYE_HEIGHT + Math.sin(walkState.bobPhase) * 0.015;
            walkState.eyeY = THREE.MathUtils.damp(walkState.eyeY, targetEyeY, 12, dt);
          } else {
            walkState.eyeY = THREE.MathUtils.damp(
              walkState.eyeY,
              PLAYER_EYE_HEIGHT,
              10,
              dt
            );
          }

          const velMag = Math.hypot(walkState.vx, walkState.vz);
          if (
            velMag > 0.015 ||
            Math.abs(walkState.eyeY - PLAYER_EYE_HEIGHT) > 0.001
          ) {
            needsMoreFrames = true;
          }

          camera.position.set(walkState.x, walkState.eyeY, walkState.z);
          camera.rotation.set(walkState.pitch, walkState.yaw, 0, 'YXZ');

          const room = getRoomNameAt(walkState.x, walkState.z);
          if (room !== walkState.lastRoom) {
            walkState.lastRoom = room;
            onRoomChangeRef.current(room);
          }
        } else {
          // Orbit Mode: smooth camera preset damping
          const tr = transitionRef.current;
          if (tr.active) {
            _goalPos.set(tr.pos[0], tr.pos[1], tr.pos[2]);
            _goalTarget.set(tr.target[0], tr.target[1], tr.target[2]);

            if (isSoftwareGl) {
              camera.position.copy(_goalPos);
              controls.target.copy(_goalTarget);
              camera.fov = tr.fov;
              camera.updateProjectionMatrix();
              tr.active = false;
            } else {
              const lambda = 7.5;
              camera.position.x = THREE.MathUtils.damp(camera.position.x, _goalPos.x, lambda, dt);
              camera.position.y = THREE.MathUtils.damp(camera.position.y, _goalPos.y, lambda, dt);
              camera.position.z = THREE.MathUtils.damp(camera.position.z, _goalPos.z, lambda, dt);

              controls.target.x = THREE.MathUtils.damp(controls.target.x, _goalTarget.x, lambda, dt);
              controls.target.y = THREE.MathUtils.damp(controls.target.y, _goalTarget.y, lambda, dt);
              controls.target.z = THREE.MathUtils.damp(controls.target.z, _goalTarget.z, lambda, dt);

              const nextFov = THREE.MathUtils.damp(camera.fov, tr.fov, lambda, dt);
              if (Math.abs(nextFov - camera.fov) > 0.01) {
                camera.fov = nextFov;
                camera.updateProjectionMatrix();
              }

              const posDist = camera.position.distanceTo(_goalPos);
              const tgtDist = controls.target.distanceTo(_goalTarget);
              if (
                posDist < 0.008 &&
                tgtDist < 0.008 &&
                Math.abs(camera.fov - tr.fov) < 0.08
              ) {
                camera.position.copy(_goalPos);
                controls.target.copy(_goalTarget);
                camera.fov = tr.fov;
                camera.updateProjectionMatrix();
                tr.active = false;
              } else {
                needsMoreFrames = true;
              }
            }
          }

          const didControlMove = controls.update();
          if (didControlMove && !isSoftwareGl) {
            needsMoreFrames = true;
          }
        }

        // Auto-open hinged balcony door leaf when approaching from either side in Walk or VR mode
        const doorMoved = bathroom.updateBalconyDoor(
          walkModeRef.current || vrPanoModeRef.current,
          camera.position,
          dt,
          isSoftwareGl
        );
        if (doorMoved && !isSoftwareGl) {
          needsMoreFrames = true;
        }

        // Keep dynamic architectural cutaway aligned with current camera position & preset;
        // only invalidate cached shadow map if a wall/ceiling or door actually moved!
        const cutawayChanged = bathroom.updateCutaway(
          walkModeRef.current || vrPanoModeRef.current ? 'interior' : viewModeRef.current,
          camera.position,
          activePresetRef.current
        );
        if ((cutawayChanged || doorMoved || shadowDirtyRef.current) && renderer.shadowMap.enabled) {
          renderer.shadowMap.needsUpdate = true;
          shadowDirtyRef.current = false;
        }

        renderer.render(bathroom.scene, camera);
        updateOverlayPosition();

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            wasAnimating = true;
            requestRender();
          } else {
            wasAnimating = false;
            persistCurrentCamera(false);
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    }

    requestRenderRef.current = requestRender;

    const onControlChange = () => {
      if (!walkModeRef.current && !vrPanoModeRef.current && !xrPresenting) {
        requestRender();
      }
    };
    controls.addEventListener('change', onControlChange);

    const onResize = () => {
      if (!container || xrPresenting) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getTargetPixelRatio(isSoftwareGl));
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    // Apply initial states (including restored Walk Mode pose if active) and render first frame
    if (walkModeRef.current) {
      controls.enabled = false;
      if (!savedWalkSafe) {
        const pose = getInitialWalkPose(camera.position, controls.target, activePresetRef.current);
        walkState.x = pose.x;
        walkState.z = pose.z;
        walkState.yaw = pose.yaw;
        walkState.targetYaw = pose.yaw;
        walkState.pitch = pose.pitch;
        walkState.targetPitch = pose.pitch;
      }
      camera.rotation.order = 'YXZ';
      camera.position.set(walkState.x, walkState.eyeY, walkState.z);
      camera.rotation.set(walkState.pitch, walkState.yaw, 0, 'YXZ');
      camera.fov = 60;
      camera.updateProjectionMatrix();
      const room = getRoomNameAt(walkState.x, walkState.z);
      walkState.lastRoom = room;
      onRoomChangeRef.current(room);
    }

    const onBeforeUnload = () => persistCurrentCamera(true);
    window.addEventListener('beforeunload', onBeforeUnload);

    bathroom.setLightingMode(lightingMode);
    bathroom.setFloorFinish(floorFinish);
    bathroom.setDesignConfig(designConfig);
    bathroom.setObjectEdits(objectEditsRef.current);
    bathroom.setDimensionMode(dimensionMode);
    bathroom.updateCutaway(
      walkModeRef.current ? 'interior' : viewModeRef.current,
      camera.position,
      activePresetRef.current
    );
    shadowDirtyRef.current = true;
    requestRender();

    return () => {
      persistCurrentCamera(true);
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onSelectionKeyDown, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      domEl.removeEventListener('dblclick', onDoubleClick);
      domEl.removeEventListener('pointerdown', onObjectPointerDown, { capture: true });
      domEl.removeEventListener('pointermove', onObjectPointerMove, { capture: true });
      domEl.removeEventListener('pointerup', finishObjectDrag, { capture: true });
      domEl.removeEventListener('pointercancel', finishObjectDrag, { capture: true });
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointercancel', onPointerCancel);
      domEl.removeEventListener('wheel', onWheel);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      domEl.removeEventListener('webglcontextrestored', onContextRestored);
      gyroController.stop();
      if (activeXrSession) {
        void activeXrSession.end().catch(() => {});
      }
      renderer.setAnimationLoop(null);
      xrControllers[0].removeEventListener('selectstart', xrSelectHandlers[0]);
      xrControllers[1].removeEventListener('selectstart', xrSelectHandlers[1]);
      vrTeleportGeo.dispose();
      vrTeleportMat.dispose();
      vrRayGeo.dispose();
      vrRayMat.dispose();
      selectionHelper.dispose();
      walkMarkerGeo.dispose();
      walkMarkerMat.dispose();
      controls.dispose();
      envTarget.dispose();
      bathroom.dispose();
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
      controllerRef.current = null;
      requestRenderRef.current = null;
      syncWalkModeRef.current = null;
      syncVrPanoModeRef.current = null;
      moveVrViewpointRef.current = null;
      recenterVrRef.current = null;
      if (captureCameraRef) captureCameraRef.current = null;
      if (applyCameraRef) applyCameraRef.current = null;
      if (vrActionsRef) vrActionsRef.current = null;
      nudgeSelectedRef.current = null;
      syncSelectionHighlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCloseSelection = useCallback(() => {
    setSelectedObj(null);
    setMoveMode(false);
    setMoveAxis('xz');
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedObj) return;
    onDeleteObjectRef.current(selectedObj.id);
    setSelectedObj(null);
    setMoveMode(false);
    setMoveAxis('xz');
  }, [selectedObj]);

  const handleResetSelected = useCallback(() => {
    if (!selectedObj) return;
    onResetObjectRef.current(selectedObj.id);
  }, [selectedObj]);

  const activeOffset = selectedObj ? objectEdits[selectedObj.id]?.offset : undefined;
  const hasMovedOffset = Boolean(
    activeOffset &&
      (Math.abs(activeOffset[0]) >= 0.001 ||
        Math.abs(activeOffset[1]) >= 0.001 ||
        Math.abs(activeOffset[2]) >= 0.001)
  );

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#161817] p-6 text-center">
        <div className="max-w-md border border-white/10 bg-[#1e2120] p-6">
          <p className="text-base font-semibold text-[#f0efec]">
            WebGL недоступен в этом браузере
          </p>
          <p className="mt-2 text-sm text-[#a3a19a]">
            Включите аппаратное ускорение WebGL, чтобы просматривать интерактивную 3D сцену санузла.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={mountRef}
        className={`h-full w-full touch-none ${
          isDraggingObj
            ? 'cursor-grabbing'
            : moveMode
              ? 'cursor-move'
              : walkMode
                ? 'cursor-crosshair active:cursor-grabbing'
                : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Screen-Anchored Floating Object Action Bar (Move / Reset / Delete) */}
      <div
        ref={overlayRef}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          left: 0,
          top: 0,
          opacity: 0,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
        className="fixed z-30 select-none"
      >
        {selectedObj && (
          <div className="border border-white/16 bg-[#171918]/96 shadow-2xl">
            {/* Object Title + Close */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-2.5 py-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 ${
                    moveMode ? 'bg-[#e4b468]' : 'bg-[#9cb8a4]'
                  }`}
                />
                <span className="max-w-[200px] truncate text-[11px] font-semibold text-[#f0efec]">
                  {selectedObj.label}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseSelection}
                className="flex h-5 w-5 items-center justify-center text-[#9c9a93] transition-colors hover:bg-white/[0.08] hover:text-white"
                title="Закрыть (Esc)"
                aria-label="Закрыть меню объекта"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-1 p-1.5">
              <button
                type="button"
                onClick={() => setMoveMode((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  moveMode
                    ? 'bg-[#e4b468] text-[#151614]'
                    : 'bg-[#262c28] text-[#e7ece8] hover:bg-[#313a34] hover:text-white'
                }`}
              >
                {moveMode ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Готово</span>
                  </>
                ) : (
                  <>
                    <Move className="h-3.5 w-3.5" />
                    <span>Переместить</span>
                  </>
                )}
              </button>

              {hasMovedOffset && (
                <button
                  type="button"
                  onClick={handleResetSelected}
                  className="flex items-center gap-1 bg-[#222524] px-2 py-1.5 text-[11px] font-medium text-[#c8c6bf] transition-colors hover:bg-[#2d312f] hover:text-white"
                  title="Вернуть на исходное место"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Сброс</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 bg-[#2a1d1d] px-2.5 py-1.5 text-[11px] font-medium text-[#f0b4b4] whitespace-nowrap transition-colors hover:bg-[#442525] hover:text-[#ffd9d9]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Удалить</span>
              </button>
            </div>

            {/* Move Mode Controls & Height Toggle (for wall-hung / XYZ objects) */}
            {moveMode && (
              <div className="border-t border-white/10 bg-[#141615] px-2.5 py-1.5">
                {selectedObj.axes === 'xyz' && (
                  <div className="mb-1.5 flex items-center justify-between gap-1.5">
                    <div className="flex bg-[#202322] p-0.5">
                      <button
                        type="button"
                        onClick={() => setMoveAxis('xz')}
                        className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          moveAxis === 'xz'
                            ? 'bg-[#343b36] text-white'
                            : 'text-[#9c9a93] hover:text-[#e5e3dc]'
                        }`}
                      >
                        По полу
                      </button>
                      <button
                        type="button"
                        onClick={() => setMoveAxis('y')}
                        className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          moveAxis === 'y'
                            ? 'bg-[#343b36] text-white'
                            : 'text-[#9c9a93] hover:text-[#e5e3dc]'
                        }`}
                      >
                        Высота
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => nudgeSelectedRef.current?.(0, -0.05, 0)}
                        className="flex h-5 w-6 items-center justify-center bg-[#222624] text-[#d4d2cb] hover:bg-[#303532] hover:text-white"
                        title="Опустить на 5 см"
                        aria-label="Опустить на 5 см"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeSelectedRef.current?.(0, 0.05, 0)}
                        className="flex h-5 w-6 items-center justify-center bg-[#222624] text-[#d4d2cb] hover:bg-[#303532] hover:text-white"
                        title="Поднять на 5 см"
                        aria-label="Поднять на 5 см"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-[10px] leading-tight text-[#a3a19a]">
                  {selectedObj.axes === 'xyz'
                    ? 'Тяните объект мышью · Shift — высота · Стрелки — 2 см'
                    : 'Тяните объект мышью или стрелками (шаг 2 см)'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
