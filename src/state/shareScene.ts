import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DEFAULT_APP_STATE,
  PersistedAppState,
  PersistedCameraState,
  sanitizeAppState,
  sanitizeCameraState,
} from './storage';

const COLLECTION_NAME = 'sharedScenes';
const SHARE_PARAM = 's';
const SHARE_ID_REGEX = /^[a-zA-Z0-9]{8,16}$/;
const SHARE_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const SHARE_ID_LENGTH = 9;
const MAX_OBJECT_EDITS = 80;

interface SerializedObjectEdit {
  id: string;
  offset?: [number, number, number];
  rotY?: number;
  deleted?: boolean;
  variant?: string;
}

export interface SharedSceneLoadResult {
  state: PersistedAppState;
  camera: PersistedCameraState;
}

function generateShareId(): string {
  const bytes = new Uint8Array(SHARE_ID_LENGTH);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < SHARE_ID_LENGTH; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let id = '';
  for (let i = 0; i < SHARE_ID_LENGTH; i++) {
    id += SHARE_ID_ALPHABET[bytes[i] % SHARE_ID_ALPHABET.length];
  }
  return id;
}

export function getShareIdFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get(SHARE_PARAM);
    if (fromQuery && SHARE_ID_REGEX.test(fromQuery)) {
      return fromQuery;
    }
    const hash = window.location.hash;
    if (hash && hash.startsWith('#s=')) {
      const fromHash = hash.slice(3).split('&')[0];
      if (SHARE_ID_REGEX.test(fromHash)) {
        return fromHash;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(shareId: string): string {
  const configuredBase = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  const url = configuredBase ? new URL(configuredBase) : new URL(window.location.href);

  // Inside AI Studio's private dev iframe, switch ais-dev-* to the public shared ais-pre-* host
  if (!configuredBase && url.hostname.startsWith('ais-dev-')) {
    url.hostname = url.hostname.replace(/^ais-dev-/, 'ais-pre-');
  }

  url.searchParams.set(SHARE_PARAM, shareId);
  if (url.hash.startsWith('#s=')) {
    url.hash = '';
  }
  return url.toString();
}

export async function createSharedScene(
  appState: PersistedAppState,
  cameraState: PersistedCameraState
): Promise<{ shareId: string; url: string }> {
  const cleanState = sanitizeAppState(
    appState as unknown as Record<string, unknown>,
    DEFAULT_APP_STATE
  );
  const cleanCamera = sanitizeCameraState(
    cameraState as unknown as Record<string, unknown>
  );

  // Convert objectEdits map into a strict Pillar-5 bounded array matching firestore.rules
  const objectEditsList: SerializedObjectEdit[] = [];
  for (const [id, edit] of Object.entries(cleanState.objectEdits)) {
    if (objectEditsList.length >= MAX_OBJECT_EDITS) break;
    if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) continue;
    const entry: SerializedObjectEdit = { id };
    if (edit.offset) {
      entry.offset = [
        Number(Math.max(-15, Math.min(15, edit.offset[0])).toFixed(3)),
        Number(Math.max(-5, Math.min(5, edit.offset[1])).toFixed(3)),
        Number(Math.max(-15, Math.min(15, edit.offset[2])).toFixed(3)),
      ];
    }
    if (
      typeof edit.rotY === 'number' &&
      Number.isFinite(edit.rotY) &&
      Math.abs(edit.rotY) >= 0.05 &&
      Math.abs(edit.rotY) <= 360
    ) {
      entry.rotY = Number(edit.rotY.toFixed(1));
    }
    if (edit.deleted) {
      entry.deleted = true;
    }
    if (
      typeof edit.variant === 'string' &&
      edit.variant.length >= 1 &&
      edit.variant.length <= 48 &&
      /^[a-zA-Z0-9_-]+$/.test(edit.variant)
    ) {
      entry.variant = edit.variant;
    }
    if (entry.offset || entry.rotY !== undefined || entry.deleted || entry.variant) {
      objectEditsList.push(entry);
    }
  }

  const cameraPayload: Record<string, unknown> = {};
  if (cleanCamera.orbit) {
    cameraPayload.orbit = cleanCamera.orbit;
  }
  if (cleanCamera.walk) {
    cameraPayload.walk = cleanCamera.walk;
  }

  const shareId = generateShareId();
  const docPath = `${COLLECTION_NAME}/${shareId}`;

  const payload = {
    version: 1,
    createdAt: serverTimestamp(),
    state: {
      activePreset: cleanState.activePreset,
      walkMode: cleanState.walkMode,
      viewMode: cleanState.viewMode,
      lightingMode: cleanState.lightingMode,
      floorFinish: cleanState.floorFinish,
      dimensionMode: cleanState.dimensionMode,
      designConfig: {
        wallFinish: cleanState.designConfig.wallFinish,
        bedroomWallFinish: cleanState.designConfig.bedroomWallFinish,
        ceilingStyle: cleanState.designConfig.ceilingStyle,
        tvZone: cleanState.designConfig.tvZone,
        sofa: cleanState.designConfig.sofa,
        kitchen: cleanState.designConfig.kitchen,
        bedroom: cleanState.designConfig.bedroom,
        entryFurniture: cleanState.designConfig.entryFurniture,
        curtains: cleanState.designConfig.curtains,
      },
      objectEdits: objectEditsList,
    },
    camera: cameraPayload,
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, shareId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }

  const url = buildShareUrl(shareId);
  try {
    const localUrl = new URL(window.location.href);
    localUrl.searchParams.set(SHARE_PARAM, shareId);
    window.history.replaceState(null, '', `${localUrl.pathname}${localUrl.search}`);
  } catch {
    // Ignore history API restrictions in sandboxed environments
  }

  return { shareId, url };
}

export async function loadSharedScene(
  shareId: string,
  baseState: PersistedAppState = DEFAULT_APP_STATE
): Promise<SharedSceneLoadResult | null> {
  if (!SHARE_ID_REGEX.test(shareId)) {
    return null;
  }

  const docPath = `${COLLECTION_NAME}/${shareId}`;
  let snap;
  try {
    snap = await getDoc(doc(db, COLLECTION_NAME, shareId));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  if (!snap.exists()) {
    return null;
  }

  const raw = snap.data() as Record<string, unknown>;
  const rawState =
    raw.state && typeof raw.state === 'object'
      ? (raw.state as Record<string, unknown>)
      : null;
  const rawCamera =
    raw.camera && typeof raw.camera === 'object'
      ? (raw.camera as Record<string, unknown>)
      : null;

  if (!rawState) {
    return null;
  }

  // Keep clean UI panel defaults when opening a shared link (drawer closed, bottom dock visible)
  const sanitizedState = sanitizeAppState(rawState, {
    ...baseState,
    dockCollapsed: false,
    finishMenuOpen: false,
  });
  const sanitizedCamera = sanitizeCameraState(rawCamera);

  return {
    state: sanitizedState,
    camera: sanitizedCamera,
  };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback for restricted iframes
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
