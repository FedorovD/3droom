import * as THREE from 'three';
import { APT, ROOM } from './dimensions';

export type VrViewpointId =
  | 'living'
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'entry'
  | 'balcony';

export interface VrViewpoint {
  id: VrViewpointId;
  label: string;
  x: number;
  z: number;
  /** Default horizontal facing direction (radians, Three.js camera YXZ yaw: 0 = -Z North, PI = +Z South) */
  initialYaw: number;
}

/**
 * Six collision-free 1:1 standing viewpoints positioned in the heart of every space
 * for 360° VR panoramic inspection (Oculus Quest 2 WebXR + Gyroscope mode).
 */
export const VR_VIEWPOINTS: VrViewpoint[] = [
  {
    id: 'living',
    label: 'Гостиная',
    x: 5.28,
    z: 4.35,
    initialYaw: Math.PI * 0.78, // Facing sofa, copper archway & South balcony
  },
  {
    id: 'kitchen',
    label: 'Кухня',
    x: 8.35,
    z: 5.75,
    initialYaw: -Math.PI * 0.52, // Facing L-shaped kitchen & dining area
  },
  {
    id: 'bathroom',
    label: 'Санузел',
    // Bathroom local (lx = 1.50, lz = 1.05) -> world (APT.X7 - 1.05, APT.Z1 + 1.50)
    x: APT.X7 - 1.05,
    z: APT.Z1 + 1.5,
    initialYaw: -Math.PI * 0.48, // Facing MaybahGlass screen, Lauter Lea vanity & shower
  },
  {
    id: 'bedroom',
    label: 'Спальня',
    x: 1.72,
    z: 3.18,
    initialYaw: Math.PI * 0.42, // Facing West twin windows & bed
  },
  {
    id: 'entry',
    label: 'Прихожая',
    x: 7.45,
    z: 2.28,
    initialYaw: Math.PI * 0.68, // Facing Living Room & Bathroom entrance
  },
  {
    id: 'balcony',
    label: 'Балкон',
    x: 4.85,
    z: APT.Z2 + APT.EXT_T + APT.BALC_DEPTH * 0.5,
    initialYaw: Math.PI, // Facing South toward ul. Lenina panorama
  },
];

export function getVrViewpoint(id: VrViewpointId): VrViewpoint {
  return VR_VIEWPOINTS.find((v) => v.id === id) ?? VR_VIEWPOINTS[0];
}

export function findNearestVrViewpoint(x: number, z: number): VrViewpoint {
  let best = VR_VIEWPOINTS[0];
  let bestDistSq = Infinity;
  for (let i = 0; i < VR_VIEWPOINTS.length; i++) {
    const vp = VR_VIEWPOINTS[i];
    const dx = vp.x - x;
    const dz = vp.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = vp;
    }
  }
  return best;
}

export type GyroStatus = 'idle' | 'listening' | 'active' | 'denied' | 'unsupported';

// Module-scope reusable math helpers (zero GC inside sensor / render hot loops)
const _zee = new THREE.Vector3(0, 0, 1);
const _upY = new THREE.Vector3(0, 1, 0);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X
const _deviceQuat = new THREE.Quaternion();
const _yawOffsetQuat = new THREE.Quaternion();
const _forwardVec = new THREE.Vector3();
const _manualEuler = new THREE.Euler(0, 0, 0, 'YXZ');

interface DeviceOrientationEventWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

function getScreenOrientationRad(): number {
  if (typeof window === 'undefined') return 0;
  const screenAngle =
    typeof window.screen?.orientation?.angle === 'number'
      ? window.screen.orientation.angle
      : typeof (window as unknown as { orientation?: number }).orientation === 'number'
        ? (window as unknown as { orientation?: number }).orientation!
        : 0;
  return THREE.MathUtils.degToRad(screenAngle);
}

/**
 * Gimbal-lock-free W3C DeviceOrientation (gyroscope) + touch/mouse fallback controller
 * designed for 360° VR panoramic viewing on Oculus Quest 2 browser, mobile VR, and desktop.
 */
export class GyroPanoramaController {
  private active = false;
  private status: GyroStatus = 'idle';
  private hasSensorData = false;
  private screenOrientRad = 0;

  // Latest raw orientation from gyroscope (radians)
  private alpha = 0;
  private beta = Math.PI * 0.5;
  private gamma = 0;

  // Heading calibration & user recenter/drag yaw offset
  private desiredInitialYaw = 0;
  private yawOffset = 0;
  private needsAutoAlign = true;

  // Fallback manual look angles (used smoothly on desktop or before gyro data arrives)
  private manualYaw = 0;
  private manualPitch = 0;
  private targetManualYaw = 0;
  private targetManualPitch = 0;

  private readonly currentQuat = new THREE.Quaternion();
  private readonly targetQuat = new THREE.Quaternion();

  private onStatusChange?: (status: GyroStatus) => void;
  private onSensorUpdate?: () => void;

  constructor(callbacks?: {
    onStatusChange?: (status: GyroStatus) => void;
    onSensorUpdate?: () => void;
  }) {
    this.onStatusChange = callbacks?.onStatusChange;
    this.onSensorUpdate = callbacks?.onSensorUpdate;
  }

  private setStatus(next: GyroStatus) {
    if (this.status !== next) {
      this.status = next;
      this.onStatusChange?.(next);
    }
  }

  public getStatus(): GyroStatus {
    return this.status;
  }

  public isReceivingGyro(): boolean {
    return this.hasSensorData;
  }

  private computeDeviceQuaternion(out: THREE.Quaternion): void {
    // Standard W3C DeviceOrientation -> Three.js camera orientation ('YXZ': beta, alpha, -gamma)
    _euler.set(this.beta, this.alpha, -this.gamma, 'YXZ');
    out.setFromEuler(_euler);
    out.multiply(_q1); // Camera looks out back of device/headset
    out.multiply(_q0.setFromAxisAngle(_zee, -this.screenOrientRad));
  }

  private extractYawFromQuat(q: THREE.Quaternion): number {
    _forwardVec.set(0, 0, -1).applyQuaternion(q);
    return Math.atan2(-_forwardVec.x, -_forwardVec.z);
  }

  private handleOrientation = (e: DeviceOrientationEvent) => {
    if (!this.active) return;
    if (e.alpha === null && e.beta === null && e.gamma === null) return;

    this.alpha = e.alpha !== null ? THREE.MathUtils.degToRad(e.alpha) : 0;
    this.beta = e.beta !== null ? THREE.MathUtils.degToRad(e.beta) : Math.PI * 0.5;
    this.gamma = e.gamma !== null ? THREE.MathUtils.degToRad(e.gamma) : 0;
    this.screenOrientRad = getScreenOrientationRad();

    if (!this.hasSensorData) {
      this.hasSensorData = true;
      this.setStatus('active');
    }

    if (this.needsAutoAlign) {
      this.computeDeviceQuaternion(_deviceQuat);
      const sensorYaw = this.extractYawFromQuat(_deviceQuat);
      this.yawOffset = this.desiredInitialYaw - sensorYaw;
      this.needsAutoAlign = false;
    }

    this.onSensorUpdate?.();
  };

  private handleScreenOrientation = () => {
    this.screenOrientRad = getScreenOrientationRad();
    this.onSensorUpdate?.();
  };

  /**
   * Must be called inside a user gesture handler (click/tap) so iOS / Quest sensor permission prompts succeed.
   */
  public async start(initialYaw: number): Promise<GyroStatus> {
    this.active = true;
    this.hasSensorData = false;
    this.desiredInitialYaw = initialYaw;
    this.manualYaw = initialYaw;
    this.targetManualYaw = initialYaw;
    this.manualPitch = 0;
    this.targetManualPitch = 0;
    this.needsAutoAlign = true;
    this.screenOrientRad = getScreenOrientationRad();

    _manualEuler.set(0, initialYaw, 0, 'YXZ');
    this.currentQuat.setFromEuler(_manualEuler);
    this.targetQuat.copy(this.currentQuat);

    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      this.setStatus('unsupported');
      return this.status;
    }

    const DOE = window.DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;
    if (typeof DOE.requestPermission === 'function') {
      try {
        const permission = await DOE.requestPermission();
        if (permission !== 'granted') {
          this.setStatus('denied');
          return this.status;
        }
      } catch {
        this.setStatus('denied');
        return this.status;
      }
    }

    if (!this.active) return this.status;

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    window.addEventListener('orientationchange', this.handleScreenOrientation);
    window.screen?.orientation?.addEventListener?.('change', this.handleScreenOrientation);

    this.setStatus('listening');
    return this.status;
  }

  public stop(): void {
    this.active = false;
    this.hasSensorData = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.handleOrientation, true);
      window.removeEventListener('orientationchange', this.handleScreenOrientation);
      window.screen?.orientation?.removeEventListener?.('change', this.handleScreenOrientation);
    }
    this.setStatus('idle');
  }

  /**
   * Aligns the current headset / device forward heading to face `targetYaw`.
   */
  public recenter(targetYaw: number): void {
    this.desiredInitialYaw = targetYaw;
    this.targetManualYaw = targetYaw;
    this.targetManualPitch = 0;
    if (this.hasSensorData) {
      this.computeDeviceQuaternion(_deviceQuat);
      const sensorYaw = this.extractYawFromQuat(_deviceQuat);
      this.yawOffset = targetYaw - sensorYaw;
      this.needsAutoAlign = false;
    } else {
      this.needsAutoAlign = true;
    }
  }

  /**
   * Supports drag-to-look fallback on desktop AND horizontal heading offset while seated with gyro.
   */
  public addLookDelta(deltaYaw: number, deltaPitch: number): void {
    if (this.hasSensorData) {
      this.yawOffset += deltaYaw;
    } else {
      this.targetManualYaw += deltaYaw;
      this.targetManualPitch = THREE.MathUtils.clamp(
        this.targetManualPitch + deltaPitch,
        -Math.PI * 0.47,
        Math.PI * 0.47
      );
    }
  }

  /**
   * Advances smoothed orientation and writes directly into `camera.quaternion`.
   * Returns `true` if orientation is still settling and needs another frame.
   */
  public updateCamera(camera: THREE.PerspectiveCamera, dt: number, isSoftwareGl: boolean): boolean {
    if (this.hasSensorData) {
      this.computeDeviceQuaternion(_deviceQuat);
      _yawOffsetQuat.setFromAxisAngle(_upY, this.yawOffset);
      this.targetQuat.multiplyQuaternions(_yawOffsetQuat, _deviceQuat);

      if (isSoftwareGl) {
        this.currentQuat.copy(this.targetQuat);
        camera.quaternion.copy(this.currentQuat);
        return false;
      }

      const alpha = 1 - Math.exp(-18 * dt);
      this.currentQuat.slerp(this.targetQuat, alpha);
      camera.quaternion.copy(this.currentQuat);

      return this.currentQuat.angleTo(this.targetQuat) > 0.0008;
    }

    // Manual drag / keyboard fallback when no gyro sensor events are active
    if (isSoftwareGl) {
      this.manualYaw = this.targetManualYaw;
      this.manualPitch = this.targetManualPitch;
    } else {
      this.manualYaw = THREE.MathUtils.damp(this.manualYaw, this.targetManualYaw, 14, dt);
      this.manualPitch = THREE.MathUtils.damp(this.manualPitch, this.targetManualPitch, 14, dt);
    }
    _manualEuler.set(this.manualPitch, this.manualYaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(_manualEuler);

    return (
      Math.abs(this.manualYaw - this.targetManualYaw) > 0.0008 ||
      Math.abs(this.manualPitch - this.targetManualPitch) > 0.0008
    );
  }
}

/**
 * Lightweight WebXR capability detection for Meta / Oculus Quest 2 Browser and other VR headsets.
 */
export async function checkImmersiveVrSupport(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
    };
    if (!nav.xr || typeof nav.xr.isSessionSupported !== 'function') {
      return false;
    }
    return await nav.xr.isSessionSupported('immersive-vr');
  } catch {
    return false;
  }
}

export const VR_BATHROOM_EYE_Y = Math.min(1.67, ROOM.H - 0.5);
