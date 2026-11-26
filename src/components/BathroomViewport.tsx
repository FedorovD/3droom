import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildBathroomScene, BathroomSceneController } from '../scene/buildBathroom';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DimensionMode,
  FloorFinishId,
  LightingMode,
  ViewMode,
} from '../scene/dimensions';
import {
  getInitialWalkPose,
  getRoomNameAt,
  isInsideApartment,
  PLAYER_EYE_HEIGHT,
  resolveWalkCollision,
} from '../scene/walkCollision';

interface BathroomViewportProps {
  activePreset: CameraPresetId;
  presetTrigger: number;
  viewMode: ViewMode;
  lightingMode: LightingMode;
  floorFinish: FloorFinishId;
  dimensionMode: DimensionMode;
  walkMode: boolean;
  onCurrentRoomChange: (room: string) => void;
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
  dimensionMode,
  walkMode,
  onCurrentRoomChange,
}: BathroomViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  // Mutable refs so React state updates never recreate the WebGL context
  const controllerRef = useRef<BathroomSceneController | null>(null);
  const viewModeRef = useRef<ViewMode>(viewMode);
  const activePresetRef = useRef<CameraPresetId>(activePreset);
  const walkModeRef = useRef<boolean>(walkMode);
  const onRoomChangeRef = useRef(onCurrentRoomChange);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const syncWalkModeRef = useRef<((enabled: boolean) => void) | null>(null);

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

  // Sync 3D dimensions overlay (off / basic / detailed)
  useEffect(() => {
    controllerRef.current?.setDimensionMode(dimensionMode);
    requestRenderRef.current?.();
  }, [dimensionMode]);

  // Sync walkMode transitions
  useEffect(() => {
    walkModeRef.current = walkMode;
    syncWalkModeRef.current?.(walkMode);
  }, [walkMode]);

  // Trigger smooth damped camera preset transition (when not in walkMode)
  useEffect(() => {
    activePresetRef.current = activePreset;
    if (walkModeRef.current) return;
    const preset =
      CAMERA_PRESETS.find((p) => p.id === activePreset) ?? CAMERA_PRESETS[0];
    transitionRef.current = {
      active: true,
      pos: preset.position,
      target: preset.target,
      fov: preset.fov,
    };
    requestRenderRef.current?.();
  }, [activePreset, presetTrigger]);

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
    bathroom.scene.add(walkMarker);

    // Mandatory Studio PBR Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    bathroom.scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const initialPreset = CAMERA_PRESETS[0];
    const camera = new THREE.PerspectiveCamera(
      initialPreset.fov,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.08,
      65
    );
    camera.position.set(...initialPreset.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPreset.target);
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

    // First-person walkthrough state
    const walkState = {
      x: 7.42,
      z: 2.15,
      eyeY: PLAYER_EYE_HEIGHT,
      yaw: 0,
      pitch: 0,
      targetYaw: 0,
      targetPitch: 0,
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
      requestRender();
    };
    syncWalkModeRef.current = syncWalkMode;

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

    const onWindowBlur = () => {
      walkState.keys.clear();
      walkState.isDragging = false;
      walkState.pointerId = null;
    };

    const domEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (!walkModeRef.current) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
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
      if (!walkState.isDragging) return;
      if (walkState.pointerId !== null && e.pointerId !== walkState.pointerId) return;
      walkState.isDragging = false;
      walkState.pointerId = null;
      domEl.releasePointerCapture?.(e.pointerId);

      // Quick tap / click on floor -> walk smoothly to that spot
      if (allowClickWalk && walkModeRef.current && !walkState.dragMoved) {
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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
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
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        // Avoid large idle-wake dt jump on the first frame after rest
        const dt = wasAnimating
          ? Math.min((now - lastTime) / 1000, 0.05)
          : 1 / 60;
        lastTime = now;

        let needsMoreFrames = false;

        if (walkModeRef.current) {
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

        // Auto-open hinged balcony door leaf when approaching from either side in Walk Mode
        const doorMoved = bathroom.updateBalconyDoor(
          walkModeRef.current,
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
          walkModeRef.current ? 'interior' : viewModeRef.current,
          camera.position,
          activePresetRef.current
        );
        if ((cutawayChanged || doorMoved) && renderer.shadowMap.enabled) {
          renderer.shadowMap.needsUpdate = true;
        }

        renderer.render(bathroom.scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            wasAnimating = true;
            requestRender();
          } else {
            wasAnimating = false;
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
      if (!walkModeRef.current) {
        requestRender();
      }
    };
    controls.addEventListener('change', onControlChange);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getTargetPixelRatio(isSoftwareGl));
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    // Apply initial states and render first frame
    bathroom.setLightingMode(lightingMode);
    bathroom.setFloorFinish(floorFinish);
    bathroom.setDimensionMode(dimensionMode);
    bathroom.updateCutaway(
      viewModeRef.current,
      camera.position,
      activePresetRef.current
    );
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointercancel', onPointerCancel);
      domEl.removeEventListener('wheel', onWheel);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      domEl.removeEventListener('webglcontextrestored', onContextRestored);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div
      ref={mountRef}
      className={`h-full w-full touch-none ${
        walkMode
          ? 'cursor-crosshair active:cursor-grabbing'
          : 'cursor-grab active:cursor-grabbing'
      }`}
    />
  );
}
