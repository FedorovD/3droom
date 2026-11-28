import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
} from 'firebase/firestore/lite';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  EDITABLE_TYPE_ORDER,
  EditableObjectType,
  ObjectVariantSpec,
  VariantBayKind,
  VariantGlassFrameStyle,
  VariantGlassZone,
  VariantHandleStyle,
  VariantLegStyle,
  VariantShapeSpec,
  VariantSilhouette,
  VariantTextureKind,
} from '../scene/objectCatalog';

const COLLECTION_NAME = 'customCatalogItems';
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const ALLOWED_TYPES = new Set<string>(EDITABLE_TYPE_ORDER);
const ALLOWED_TEXTURES = new Set<string>([
  'fabric',
  'wood',
  'stone',
  'matte',
  'art_arch',
  'art_botanic',
  'art_mono',
  'art_terracotta',
]);
const ALLOWED_SILHOUETTES = new Set<string>([
  'vitrine_cabinet',
  'sideboard_doors',
  'chest_drawers',
  'open_shelving',
  'wardrobe_tall',
  'floating_console',
  'rect_legs',
  'round_pedestal',
  'oval_glass',
  'nesting_plinth',
  'dining_upholstered',
  'lounge_armchair',
  'round_pouf',
  'straight_legs',
  'l_sectional',
  'low_modular',
  'upholstered_panel',
  'wood_frame_bed',
  'tall_winged_bed',
  'arc_floor_lamp',
  'tripod_shade',
  'linear_pendant',
  'globe_pendant',
  'wall_sconce',
  'framed_art',
  'arch_mirror',
  'round_mirror',
]);
const ALLOWED_LEG_STYLES = new Set<string>(['straight', 'tapered', 'sled', 'plinth', 'floating']);
const ALLOWED_GLASS_ZONES = new Set<string>(['none', 'top', 'left', 'right', 'full', 'center']);
const ALLOWED_HANDLE_STYLES = new Set<string>([
  'none',
  'vertical_bar',
  'horizontal_bar',
  'knob',
  'edge_pull',
]);
const ALLOWED_BAY_KINDS = new Set<string>([
  'door',
  'open_shelves',
  'drawers',
  'glass_door',
  'glass_top_door',
  'open_top_door',
]);
const ALLOWED_GLASS_FRAME_STYLES = new Set<string>(['body', 'metal', 'secondary']);
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export type CustomCatalogStatus = 'pending' | 'synced' | 'error';

export interface CustomCatalogSpec {
  primaryHex: string;
  secondaryHex: string;
  metalHex: string;
  roughness: number;
  metalness: number;
  textureKind: VariantTextureKind;
  glassTintHex?: string;
  dimensionsM?: [number, number, number];
  shape?: VariantShapeSpec;
  subtitle: string;
}

export interface CustomCatalogItem {
  id: string;
  type: EditableObjectType;
  title: string;
  specsText: string;
  photos: string[];
  thumbnailUrl: string;
  status: CustomCatalogStatus;
  spec?: CustomCatalogSpec;
  errorMessage?: string;
  refinementNotes?: string;
  createdAt: number;
  updatedAt: number;
}

function generateCustomCatalogId(): string {
  const bytes = new Uint8Array(10);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let suffix = '';
  for (let i = 0; i < bytes.length; i++) {
    suffix += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  }
  return `cust_${suffix}`;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Файл не является корректным изображением.'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function renderContainedJpeg(img: HTMLImageElement, maxSide: number, quality: number): string {
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D недоступен.');
  ctx.fillStyle = '#1c1f1e';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

function renderCoverThumbnailJpeg(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  quality: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D недоступен.');
  ctx.fillStyle = '#1b1e1d';
  ctx.fillRect(0, 0, targetW, targetH);

  const srcAspect = img.width / Math.max(1, img.height);
  const dstAspect = targetW / targetH;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (srcAspect > dstAspect) {
    sw = img.height * dstAspect;
    sx = (img.width - sw) * 0.5;
  } else {
    sh = img.width / dstAspect;
    sy = (img.height - sh) * 0.5;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', quality);
}

export interface CompressedPhotoResult {
  photoDataUrl: string;
  thumbnailDataUrl: string;
}

/**
 * Compresses an uploaded photo into both an analysis JPEG (<= 640px, ~30–60KB)
 * and a crisp 240x162 mini-photo thumbnail (~10–16KB) that fits comfortably inside Firestore.
 */
export async function compressCatalogPhoto(file: File): Promise<CompressedPhotoResult> {
  const img = await loadImageFromFile(file);
  let photoDataUrl = renderContainedJpeg(img, 640, 0.72);
  if (photoDataUrl.length > 210_000) {
    photoDataUrl = renderContainedJpeg(img, 512, 0.62);
  }
  const thumbnailDataUrl = renderCoverThumbnailJpeg(img, 240, 162, 0.78);
  return { photoDataUrl, thumbnailDataUrl };
}

export async function generateThumbnailFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(renderCoverThumbnailJpeg(img, 240, 162, 0.78));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Не удалось создать миниатюру.'));
    img.src = dataUrl;
  });
}

function sanitizeFirestoreItem(raw: Record<string, unknown>): CustomCatalogItem | null {
  const id = typeof raw.id === 'string' ? raw.id : '';
  const type = typeof raw.type === 'string' ? raw.type : '';
  const title = typeof raw.title === 'string' ? raw.title : '';
  const specsText = typeof raw.specsText === 'string' ? raw.specsText : '';
  const thumbnailUrl = typeof raw.thumbnailUrl === 'string' ? raw.thumbnailUrl : '';
  const status = raw.status;

  if (!/^cust_[a-zA-Z0-9]{3,27}$/.test(id)) return null;
  if (!ALLOWED_TYPES.has(type)) return null;
  if (!title || title.length > 80) return null;
  if (!SAFE_DATA_IMAGE_REGEX.test(thumbnailUrl)) return null;
  if (status !== 'pending' && status !== 'synced' && status !== 'error') return null;

  const rawPhotos = Array.isArray(raw.photos) ? raw.photos : [];
  const photos = rawPhotos.filter(
    (p): p is string => typeof p === 'string' && SAFE_DATA_IMAGE_REGEX.test(p)
  );
  if (photos.length === 0) return null;

  let spec: CustomCatalogSpec | undefined;
  if (raw.spec && typeof raw.spec === 'object') {
    const s = raw.spec as Record<string, unknown>;
    if (
      typeof s.primaryHex === 'string' &&
      HEX_REGEX.test(s.primaryHex) &&
      typeof s.secondaryHex === 'string' &&
      HEX_REGEX.test(s.secondaryHex) &&
      typeof s.metalHex === 'string' &&
      HEX_REGEX.test(s.metalHex) &&
      typeof s.roughness === 'number' &&
      typeof s.metalness === 'number' &&
      typeof s.textureKind === 'string' &&
      ALLOWED_TEXTURES.has(s.textureKind)
    ) {
      const rawDims = Array.isArray(s.dimensionsM) ? s.dimensionsM : null;
      const dims: [number, number, number] | undefined =
        rawDims &&
        rawDims.length === 3 &&
        rawDims.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0.04)
          ? [rawDims[0] as number, rawDims[1] as number, rawDims[2] as number]
          : undefined;
      const glassTintHex =
        typeof s.glassTintHex === 'string' && HEX_REGEX.test(s.glassTintHex)
          ? s.glassTintHex
          : undefined;

      let shape: VariantShapeSpec | undefined;
      if (s.shape && typeof s.shape === 'object') {
        const sh = s.shape as Record<string, unknown>;
        if (
          typeof sh.silhouette === 'string' &&
          ALLOWED_SILHOUETTES.has(sh.silhouette) &&
          typeof sh.columns === 'number' &&
          typeof sh.rows === 'number' &&
          typeof sh.legStyle === 'string' &&
          ALLOWED_LEG_STYLES.has(sh.legStyle) &&
          typeof sh.legHeightM === 'number' &&
          typeof sh.glassZone === 'string' &&
          ALLOWED_GLASS_ZONES.has(sh.glassZone) &&
          typeof sh.hasFluting === 'boolean' &&
          typeof sh.hasTopContrast === 'boolean' &&
          typeof sh.handleStyle === 'string' &&
          ALLOWED_HANDLE_STYLES.has(sh.handleStyle) &&
          typeof sh.hasBacklight === 'boolean'
        ) {
          const cleanedBays = Array.isArray(sh.bays)
            ? sh.bays
                .filter((b): b is VariantBayKind => typeof b === 'string' && ALLOWED_BAY_KINDS.has(b))
                .slice(0, 4)
            : [];
          const glassFrameStyle =
            typeof sh.glassFrameStyle === 'string' && ALLOWED_GLASS_FRAME_STYLES.has(sh.glassFrameStyle)
              ? (sh.glassFrameStyle as VariantGlassFrameStyle)
              : undefined;
          const upperSectionRatio =
            typeof sh.upperSectionRatio === 'number' &&
            Number.isFinite(sh.upperSectionRatio) &&
            sh.upperSectionRatio >= 0.25 &&
            sh.upperSectionRatio <= 0.75
              ? Number(sh.upperSectionRatio.toFixed(2))
              : undefined;
          shape = {
            silhouette: sh.silhouette as VariantSilhouette,
            columns: Math.max(1, Math.min(4, Math.round(sh.columns))),
            rows: Math.max(1, Math.min(4, Math.round(sh.rows))),
            legStyle: sh.legStyle as VariantLegStyle,
            legHeightM: Math.max(0, Math.min(0.75, sh.legHeightM)),
            glassZone: sh.glassZone as VariantGlassZone,
            hasFluting: sh.hasFluting,
            hasTopContrast: sh.hasTopContrast,
            handleStyle: sh.handleStyle as VariantHandleStyle,
            hasBacklight: sh.hasBacklight,
            ...(cleanedBays.length > 0 ? { bays: cleanedBays } : {}),
            ...(glassFrameStyle ? { glassFrameStyle } : {}),
            ...(upperSectionRatio !== undefined ? { upperSectionRatio } : {}),
          };
        }
      }

      spec = {
        primaryHex: s.primaryHex,
        secondaryHex: s.secondaryHex,
        metalHex: s.metalHex,
        roughness: s.roughness,
        metalness: s.metalness,
        textureKind: s.textureKind as VariantTextureKind,
        ...(glassTintHex ? { glassTintHex } : {}),
        ...(dims ? { dimensionsM: dims } : {}),
        ...(shape ? { shape } : {}),
        subtitle: typeof s.subtitle === 'string' ? s.subtitle : '',
      };
    }
  }

  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : createdAt;
  const errorMessage =
    typeof raw.errorMessage === 'string' && raw.errorMessage.trim()
      ? raw.errorMessage.trim()
      : undefined;
  const refinementNotes =
    typeof raw.refinementNotes === 'string' && raw.refinementNotes.trim()
      ? raw.refinementNotes.trim().slice(0, 1000)
      : undefined;

  return {
    id,
    type: type as EditableObjectType,
    title,
    specsText,
    photos,
    thumbnailUrl,
    status,
    ...(spec ? { spec } : {}),
    ...(errorMessage ? { errorMessage } : {}),
    ...(refinementNotes ? { refinementNotes } : {}),
    createdAt,
    updatedAt,
  };
}

function buildFirestorePayload(item: CustomCatalogItem): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: item.id,
    type: item.type,
    title: item.title.trim().slice(0, 80),
    specsText: item.specsText.trim().slice(0, 1200),
    photos: item.photos.slice(0, 4),
    thumbnailUrl: item.thumbnailUrl,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  if (item.spec) {
    const cleanSpec: Record<string, unknown> = {
      primaryHex: item.spec.primaryHex,
      secondaryHex: item.spec.secondaryHex,
      metalHex: item.spec.metalHex,
      roughness: item.spec.roughness,
      metalness: item.spec.metalness,
      textureKind: item.spec.textureKind,
      subtitle: item.spec.subtitle.slice(0, 120),
    };
    if (item.spec.glassTintHex && HEX_REGEX.test(item.spec.glassTintHex)) {
      cleanSpec.glassTintHex = item.spec.glassTintHex;
    }
    if (item.spec.dimensionsM) {
      cleanSpec.dimensionsM = item.spec.dimensionsM;
    }
    if (item.spec.shape) {
      const cleanedBays = Array.isArray(item.spec.shape.bays)
        ? item.spec.shape.bays
            .filter((b) => typeof b === 'string' && ALLOWED_BAY_KINDS.has(b))
            .slice(0, 4)
        : [];
      const glassFrameStyle =
        typeof item.spec.shape.glassFrameStyle === 'string' &&
        ALLOWED_GLASS_FRAME_STYLES.has(item.spec.shape.glassFrameStyle)
          ? item.spec.shape.glassFrameStyle
          : undefined;
      const upperSectionRatio =
        typeof item.spec.shape.upperSectionRatio === 'number' &&
        Number.isFinite(item.spec.shape.upperSectionRatio) &&
        item.spec.shape.upperSectionRatio >= 0.25 &&
        item.spec.shape.upperSectionRatio <= 0.75
          ? Number(item.spec.shape.upperSectionRatio.toFixed(2))
          : undefined;
      cleanSpec.shape = {
        silhouette: item.spec.shape.silhouette,
        columns: Math.max(1, Math.min(4, Math.round(item.spec.shape.columns))),
        rows: Math.max(1, Math.min(4, Math.round(item.spec.shape.rows))),
        legStyle: item.spec.shape.legStyle,
        legHeightM: Number(Math.max(0, Math.min(0.75, item.spec.shape.legHeightM)).toFixed(3)),
        glassZone: item.spec.shape.glassZone,
        hasFluting: Boolean(item.spec.shape.hasFluting),
        hasTopContrast: Boolean(item.spec.shape.hasTopContrast),
        handleStyle: item.spec.shape.handleStyle,
        hasBacklight: Boolean(item.spec.shape.hasBacklight),
        ...(cleanedBays.length > 0 ? { bays: cleanedBays } : {}),
        ...(glassFrameStyle ? { glassFrameStyle } : {}),
        ...(upperSectionRatio !== undefined ? { upperSectionRatio } : {}),
      };
    }
    payload.spec = cleanSpec;
  }

  if (item.errorMessage) {
    payload.errorMessage = item.errorMessage.slice(0, 300);
  }

  if (item.refinementNotes && item.refinementNotes.trim()) {
    payload.refinementNotes = item.refinementNotes.trim().slice(0, 1000);
  }

  return payload;
}

export async function listCustomCatalogItems(): Promise<CustomCatalogItem[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), limit(100));
    const snap = await getDocs(q);
    const items: CustomCatalogItem[] = [];
    snap.forEach((docSnap) => {
      const parsed = sanitizeFirestoreItem(docSnap.data() as Record<string, unknown>);
      if (parsed) items.push(parsed);
    });
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function createCustomCatalogItem(input: {
  type: EditableObjectType;
  title: string;
  specsText: string;
  photos: string[];
  thumbnailUrl: string;
}): Promise<CustomCatalogItem> {
  const now = Date.now();
  const item: CustomCatalogItem = {
    id: generateCustomCatalogId(),
    type: input.type,
    title: input.title.trim().slice(0, 80),
    specsText: input.specsText.trim().slice(0, 1200),
    photos: input.photos.slice(0, 4),
    thumbnailUrl: input.thumbnailUrl,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const docPath = `${COLLECTION_NAME}/${item.id}`;
  try {
    await setDoc(doc(db, COLLECTION_NAME, item.id), buildFirestorePayload(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
  return item;
}

export async function updateCustomCatalogItem(item: CustomCatalogItem): Promise<void> {
  const docPath = `${COLLECTION_NAME}/${item.id}`;
  try {
    await setDoc(doc(db, COLLECTION_NAME, item.id), buildFirestorePayload(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteCustomCatalogItem(id: string): Promise<void> {
  const docPath = `${COLLECTION_NAME}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Sends a custom item's photos + free-text dimensions/params to the server-side Gemini Free Tier
 * endpoint, saves the resulting 3D PBR + dimension spec to Firestore, and returns the updated item.
 */
export async function syncCustomCatalogItem(
  item: CustomCatalogItem,
  feedbackOverride?: string
): Promise<CustomCatalogItem> {
  const effectiveFeedback =
    feedbackOverride !== undefined
      ? feedbackOverride.trim().slice(0, 1000)
      : (item.refinementNotes?.trim().slice(0, 1000) ?? '');

  const payload = JSON.stringify({
    type: item.type,
    title: item.title,
    specsText: item.specsText,
    ...(effectiveFeedback ? { feedbackText: effectiveFeedback } : {}),
    ...(item.spec ? { previousSpec: item.spec } : {}),
    photos: item.photos,
  });

  let lastError = 'Не удалось выполнить анализ предмета. Попробуйте ещё раз.';
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch('/api/catalog/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
    } catch {
      lastError = 'Не удалось связаться с сервером анализа. Проверьте соединение и повторите.';
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 900));
        continue;
      }
      break;
    }

    const contentType = response.headers.get('content-type') ?? '';
    let data: { spec?: CustomCatalogSpec; error?: string } = {};
    let parsedJson = false;
    if (contentType.includes('application/json')) {
      try {
        data = (await response.json()) as { spec?: CustomCatalogSpec; error?: string };
        parsedJson = true;
      } catch {
        parsedJson = false;
      }
    }

    if (response.ok && parsedJson && data.spec) {
      const synced: CustomCatalogItem = {
        ...item,
        status: 'synced',
        spec: data.spec,
        errorMessage: undefined,
        refinementNotes: effectiveFeedback || undefined,
        updatedAt: Date.now(),
      };
      await updateCustomCatalogItem(synced);
      return synced;
    }

    // Transient server restart / proxy HTML response -> retry once automatically
    if (!parsedJson && attempt === 0) {
      await new Promise((r) => setTimeout(r, 900));
      continue;
    }

    if (data.error) {
      lastError = data.error;
    } else if (!parsedJson) {
      lastError =
        'Сервер анализа временно перезапускался и вернул некорректный ответ. Нажмите «Повторить».';
    } else {
      lastError = `Сервер вернул ошибку ${response.status}. Попробуйте ещё раз.`;
    }
    break;
  }

  const failed: CustomCatalogItem = {
    ...item,
    status: 'error',
    errorMessage: lastError.slice(0, 300),
    refinementNotes: effectiveFeedback || undefined,
    updatedAt: Date.now(),
  };
  await updateCustomCatalogItem(failed).catch(() => {});
  return failed;
}

export function customItemsToVariantSpecs(
  items: CustomCatalogItem[]
): ObjectVariantSpec[] {
  const result: ObjectVariantSpec[] = [];
  for (const item of items) {
    if (item.status !== 'synced' || !item.spec) continue;
    result.push({
      id: item.id,
      type: item.type,
      label: item.title,
      subtitle: item.spec.subtitle || 'Свой предмет',
      primaryHex: item.spec.primaryHex,
      secondaryHex: item.spec.secondaryHex,
      metalHex: item.spec.metalHex,
      roughness: item.spec.roughness,
      metalness: item.spec.metalness,
      textureKind: item.spec.textureKind,
      glassTintHex: item.spec.glassTintHex || undefined,
      shape: item.spec.shape,
      isCustom: true,
      thumbnailUrl: item.thumbnailUrl,
      photoUrl: item.photos[0],
      dimensionsM: item.spec.dimensionsM,
      specsText: item.specsText,
      photosCount: item.photos.length,
      updatedAt: item.updatedAt,
    });
  }
  return result;
}
