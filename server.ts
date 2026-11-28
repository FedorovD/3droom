import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Free-Tier multimodal Gemini model (requires @google/genai >= 2.29.1)
const GEMINI_CATALOG_MODEL = 'gemini-4-hydrogen';

const ALLOWED_TYPES = new Set([
  'sofa',
  'bed',
  'chair',
  'table',
  'storage',
  'kitchen',
  'lighting',
  'art',
  'mirror',
  'rug',
  'textile',
  'partition',
  'media_decor',
  'decor',
  'bath_fixtures',
]);

const ALLOWED_TEXTURE_KINDS = new Set([
  'fabric',
  'wood',
  'stone',
  'matte',
  'art_arch',
  'art_botanic',
  'art_mono',
  'art_terracotta',
]);

const ALLOWED_SILHOUETTES = new Set([
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

const ALLOWED_LEG_STYLES = new Set(['straight', 'tapered', 'sled', 'plinth', 'floating']);
const ALLOWED_GLASS_ZONES = new Set(['none', 'top', 'left', 'right', 'full', 'center']);
const ALLOWED_HANDLE_STYLES = new Set([
  'none',
  'vertical_bar',
  'horizontal_bar',
  'knob',
  'edge_pull',
]);
const ALLOWED_BAY_KINDS = new Set([
  'door',
  'open_shelves',
  'drawers',
  'glass_door',
  'glass_top_door',
  'open_top_door',
]);
const ALLOWED_GLASS_FRAME_STYLES = new Set(['body', 'metal', 'secondary']);

const DEFAULT_SILHOUETTE_BY_TYPE: Record<string, string> = {
  storage: 'sideboard_doors',
  table: 'rect_legs',
  chair: 'dining_upholstered',
  sofa: 'straight_legs',
  bed: 'upholstered_panel',
  lighting: 'tripod_shade',
  art: 'framed_art',
  mirror: 'arch_mirror',
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  sofa: 'Диван / мягкая зона (sofa)',
  bed: 'Кровать (bed)',
  chair: 'Стул, кресло или пуф (chair)',
  table: 'Стол или столик (table)',
  storage: 'Шкаф, витрина, тумба, комод, стеллаж или консоль (storage)',
  kitchen: 'Кухонный гарнитур / фасад / холодильник (kitchen)',
  lighting: 'Светильник, торшер, подвес или бра (lighting)',
  art: 'Картина или постер в раме (art)',
  mirror: 'Зеркало с подсветкой или в раме (mirror)',
  rug: 'Ковёр (rug)',
  textile: 'Шторы / портьеры (textile)',
  partition: 'Перегородка в арке / стеклянная перегородка (partition)',
  media_decor: 'ТВ-зона, телевизор или стеновая панель за ТВ (media_decor)',
  decor: 'Декор, ваза, книги, скульптура (decor)',
  bath_fixtures: 'Сантехника, тумба в ванной, ванна, смеситель или душ (bath_fixtures)',
};

const DATA_URL_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

interface AnalyzeRequestBody {
  type?: unknown;
  title?: unknown;
  specsText?: unknown;
  feedbackText?: unknown;
  previousSpec?: unknown;
  photos?: unknown;
}

interface ParsedShapeSpec {
  silhouette: string;
  columns: number;
  rows: number;
  legStyle: string;
  legHeightM: number;
  glassZone: string;
  hasFluting: boolean;
  hasTopContrast: boolean;
  handleStyle: string;
  hasBacklight: boolean;
  bays?: string[];
  glassFrameStyle?: string;
  upperSectionRatio?: number;
}

interface ParsedCatalogSpec {
  primaryHex: string;
  secondaryHex: string;
  metalHex: string;
  roughness: number;
  metalness: number;
  textureKind: string;
  glassTintHex: string;
  dimensionsM?: [number, number, number];
  shape?: ParsedShapeSpec;
  subtitle: string;
}

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (HEX_COLOR_REGEX.test(trimmed)) {
      return trimmed.toLowerCase();
    }
  }
  return fallback;
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(Math.max(min, Math.min(max, value)).toFixed(3));
  }
  return fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }
  return fallback;
}

function sanitizeParsedSpec(raw: Record<string, unknown>, itemType: string): ParsedCatalogSpec {
  const defaultTex =
    itemType === 'sofa' ||
    itemType === 'bed' ||
    itemType === 'chair' ||
    itemType === 'textile' ||
    itemType === 'rug'
      ? 'fabric'
      : itemType === 'table' || itemType === 'storage' || itemType === 'partition'
        ? 'wood'
        : itemType === 'decor'
          ? 'stone'
          : itemType === 'art'
            ? 'art_arch'
            : 'matte';

  const textureKind =
    typeof raw.textureKind === 'string' && ALLOWED_TEXTURE_KINDS.has(raw.textureKind)
      ? raw.textureKind
      : defaultTex;

  const primaryHex = normalizeHex(raw.primaryHex, '#cfc7ba');
  const secondaryHex = normalizeHex(raw.secondaryHex, '#b5aa99');
  const metalHex = normalizeHex(raw.metalHex, '#333638');
  const glassTintRaw = typeof raw.glassTintHex === 'string' ? raw.glassTintHex.trim() : '';
  const glassTintHex = HEX_COLOR_REGEX.test(glassTintRaw) ? glassTintRaw.toLowerCase() : '';

  const roughness = clampNum(raw.roughness, 0.08, 0.98, textureKind === 'fabric' ? 0.9 : 0.56);
  const metalness = clampNum(raw.metalness, 0.0, 0.95, 0.04);

  const w = typeof raw.widthM === 'number' && Number.isFinite(raw.widthM) ? raw.widthM : 0;
  const h = typeof raw.heightM === 'number' && Number.isFinite(raw.heightM) ? raw.heightM : 0;
  const d = typeof raw.depthM === 'number' && Number.isFinite(raw.depthM) ? raw.depthM : 0;

  let dimensionsM: [number, number, number] | undefined;
  if (w >= 0.08 && w <= 5.5 && h >= 0.05 && h <= 3.2 && d >= 0.04 && d <= 4.5) {
    dimensionsM = [
      Number(w.toFixed(3)),
      Number(h.toFixed(3)),
      Number(d.toFixed(3)),
    ];
  }

  let shape: ParsedShapeSpec | undefined;
  if (itemType in DEFAULT_SILHOUETTE_BY_TYPE) {
    const rawSilhouette = typeof raw.silhouette === 'string' ? raw.silhouette.trim() : '';
    const silhouette = ALLOWED_SILHOUETTES.has(rawSilhouette)
      ? rawSilhouette
      : DEFAULT_SILHOUETTE_BY_TYPE[itemType];
    const legStyle =
      typeof raw.legStyle === 'string' && ALLOWED_LEG_STYLES.has(raw.legStyle)
        ? raw.legStyle
        : silhouette === 'floating_console' ||
            itemType === 'art' ||
            itemType === 'mirror' ||
            itemType === 'lighting'
          ? 'floating'
          : 'straight';
    const glassZone =
      typeof raw.glassZone === 'string' && ALLOWED_GLASS_ZONES.has(raw.glassZone)
        ? raw.glassZone
        : silhouette === 'vitrine_cabinet'
          ? 'top'
          : 'none';
    const handleStyle =
      typeof raw.handleStyle === 'string' && ALLOWED_HANDLE_STYLES.has(raw.handleStyle)
        ? raw.handleStyle
        : itemType === 'storage'
          ? 'vertical_bar'
          : 'none';

    const parsedCols = clampInt(raw.columns, 1, 4, 2);
    let bays: string[] | undefined;
    if (itemType === 'storage' && Array.isArray(raw.bays)) {
      const cleanedBays = raw.bays
        .filter((b): b is string => typeof b === 'string' && ALLOWED_BAY_KINDS.has(b.trim()))
        .map((b) => b.trim())
        .slice(0, 4);
      if (cleanedBays.length >= 1) {
        bays = cleanedBays;
      }
    }

    const glassFrameStyle =
      itemType === 'storage' &&
      typeof raw.glassFrameStyle === 'string' &&
      ALLOWED_GLASS_FRAME_STYLES.has(raw.glassFrameStyle.trim())
        ? raw.glassFrameStyle.trim()
        : undefined;

    const upperSectionRatio =
      itemType === 'storage' &&
      typeof raw.upperSectionRatio === 'number' &&
      Number.isFinite(raw.upperSectionRatio) &&
      raw.upperSectionRatio >= 0.25 &&
      raw.upperSectionRatio <= 0.75
        ? Number(raw.upperSectionRatio.toFixed(2))
        : undefined;

    shape = {
      silhouette,
      columns: bays ? bays.length : parsedCols,
      rows: clampInt(raw.rows, 1, 4, 2),
      legStyle,
      legHeightM: clampNum(raw.legHeightM, 0, 0.75, legStyle === 'floating' ? 0 : 0.14),
      glassZone,
      hasFluting: Boolean(raw.hasFluting),
      hasTopContrast: Boolean(raw.hasTopContrast),
      handleStyle,
      hasBacklight: Boolean(raw.hasBacklight),
      ...(bays ? { bays } : {}),
      ...(glassFrameStyle ? { glassFrameStyle } : {}),
      ...(upperSectionRatio !== undefined ? { upperSectionRatio } : {}),
    };
  }

  let subtitle =
    typeof raw.subtitle === 'string'
      ? raw.subtitle.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 110)
      : '';
  if (!subtitle) {
    subtitle = dimensionsM
      ? `${Math.round(dimensionsM[0] * 100)}×${Math.round(dimensionsM[2] * 100)}×${Math.round(dimensionsM[1] * 100)} см`
      : 'Свой предмет интерьера';
  }

  return {
    primaryHex,
    secondaryHex,
    metalHex,
    roughness,
    metalness,
    textureKind,
    glassTintHex,
    ...(dimensionsM ? { dimensionsM } : {}),
    ...(shape ? { shape } : {}),
    subtitle,
  };
}

function classifyGeminiError(err: unknown): { status: number; message: string; retryable: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      status: 429,
      message:
        'Исчерпан лимит запросов Gemini Free Tier. Подождите минуту и повторите синхронизацию.',
      retryable: false,
    };
  }

  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('api_key') ||
    lower.includes('api key') ||
    lower.includes('permission') ||
    lower.includes('unauthenticated')
  ) {
    return {
      status: 403,
      message:
        'Ключ GEMINI_API_KEY недействителен или не имеет доступа к модели. Проверьте Settings → Secrets.',
      retryable: false,
    };
  }

  const retryable =
    lower.includes('503') ||
    lower.includes('500') ||
    lower.includes('timeout') ||
    lower.includes('econnreset') ||
    lower.includes('fetch failed') ||
    lower.includes('unavailable');

  return {
    status: 502,
    message: `Ошибка анализа в Gemini API: ${raw.slice(0, 180)}`,
    retryable,
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10mb' }));

  // Return clean JSON errors for malformed or oversized request bodies (never HTML)
  app.use((err: unknown, req: Request, res: Response, next: express.NextFunction) => {
    if (err && req.path.startsWith('/api/')) {
      const e = err as { type?: string; status?: number };
      if (e.type === 'entity.too.large') {
        res.status(413).json({
          error: 'Фотографии слишком большие для отправки. Уменьшите количество фото или попробуйте снова.',
        });
        return;
      }
      res.status(e.status || 400).json({
        error: 'Некорректный формат запроса к серверу.',
      });
      return;
    }
    next(err);
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.post('/api/catalog/analyze', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'Серверный ключ GEMINI_API_KEY не настроен. Добавьте ключ в Settings → Secrets.',
      });
      return;
    }

    const body = (req.body ?? {}) as AnalyzeRequestBody;
    const itemType = typeof body.type === 'string' ? body.type.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const specsText = typeof body.specsText === 'string' ? body.specsText.trim() : '';
    const feedbackText = typeof body.feedbackText === 'string' ? body.feedbackText.trim() : '';
    const photos = Array.isArray(body.photos) ? body.photos : [];

    if (!ALLOWED_TYPES.has(itemType)) {
      res.status(400).json({ error: 'Недопустимый тип предмета.' });
      return;
    }
    if (title.length < 1 || title.length > 80) {
      res.status(400).json({ error: 'Название должно быть от 1 до 80 символов.' });
      return;
    }
    if (specsText.length > 1200) {
      res.status(400).json({ error: 'Текст с размерами и параметрами слишком длинный (макс. 1200 символов).' });
      return;
    }
    if (feedbackText.length > 1000) {
      res.status(400).json({ error: 'Текст с правками слишком длинный (макс. 1000 символов).' });
      return;
    }
    if (photos.length < 1 || photos.length > 4) {
      res.status(400).json({ error: 'Загрузите от 1 до 4 фотографий предмета.' });
      return;
    }

    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    for (const entry of photos) {
      if (typeof entry !== 'string' || entry.length > 1_600_000) {
        res.status(400).json({ error: 'Одно из фото повреждено или превышает допустимый размер.' });
        return;
      }
      const match = DATA_URL_IMAGE_REGEX.exec(entry);
      if (!match) {
        res.status(400).json({ error: 'Поддерживаются только изображения JPEG, PNG или WebP.' });
        return;
      }
      const fmt = match[1] === 'jpg' ? 'jpeg' : match[1];
      imageParts.push({
        inlineData: {
          mimeType: `image/${fmt}`,
          data: match[2],
        },
      });
    }

    let previousSpecJson = '';
    if (body.previousSpec && typeof body.previousSpec === 'object' && !Array.isArray(body.previousSpec)) {
      const prevRaw = body.previousSpec as Record<string, unknown>;
      const prevShape =
        prevRaw.shape && typeof prevRaw.shape === 'object' && !Array.isArray(prevRaw.shape)
          ? (prevRaw.shape as Record<string, unknown>)
          : undefined;
      const sanitizedPrev = sanitizeParsedSpec(
        {
          ...prevRaw,
          ...(prevShape ?? {}),
          widthM: Array.isArray(prevRaw.dimensionsM) ? prevRaw.dimensionsM[0] : 0,
          heightM: Array.isArray(prevRaw.dimensionsM) ? prevRaw.dimensionsM[1] : 0,
          depthM: Array.isArray(prevRaw.dimensionsM) ? prevRaw.dimensionsM[2] : 0,
        },
        itemType
      );
      previousSpecJson = JSON.stringify(sanitizedPrev);
    }

    const typeDesc = TYPE_DESCRIPTIONS[itemType] ?? itemType;
    const promptLines = [
      'Ты 3D-архитектор и специалист по PBR-материалам и 3D-моделированию мебели (Three.js).',
      'Внимательно рассмотри прикреплённые фотографии предмета интерьера и свободный текст с размерами/параметрами.',
      `Категория предмета: ${typeDesc}`,
      `Название: ${title}`,
      `Свободное описание (размеры, материалы, доп. параметры): ${specsText || '(не указано — определи по фото)'}`,
    ];

    if (feedbackText) {
      promptLines.push(
        '',
        'ВАЖНО — РУЧНЫЕ ПРАВКИ ОТ ПОЛЬЗОВАТЕЛЯ (НАИВЫСШИЙ ПРИОРИТЕТ, ОБЯЗАТЕЛЬНО ИСПРАВЬ):',
        feedbackText
      );
      if (previousSpecJson) {
        promptLines.push(
          '',
          `Предыдущая сгенерированная 3D-спецификация (которую нужно поправить с учётом замечаний выше): ${previousSpecJson}`
        );
      }
    } else if (previousSpecJson) {
      promptLines.push(
        '',
        `Предыдущая попытка генерации: ${previousSpecJson}. Перепроверь фото внимательнее и улучши точность конструкции, материалов и пропорций.`
      );
    }

    promptLines.push(
      '',
      'Верни строго JSON со следующими полями для точного воспроизведения ВНЕШНЕГО ВИДА и КОНСТРУКЦИИ предмета в 3D:',
      '- primaryHex: ТОЧНЫЙ основной цвет корпуса/фасадов/обивки (#RRGGBB). Бери насыщенный реальный чуть приглушённый средний тон с плоской поверхности фасада, НЕ высветляй (например матовый тёмно-оливковый/шалфейный фасад это #485747..#566654, а не светло-мятный #8aa590!).',
      '- secondaryHex: вторичный цвет (верхняя крышка при hasTopContrast=true, внутренняя стенка витрины/полок, подушки) (#RRGGBB). Если верхняя столешница того же цвета что корпус, поставь hasTopContrast=false.',
      '- metalHex: цвет ножек, ручек, рамы стеклянных дверок, профиля или фурнитуры (#RRGGBB). Для чёрного матового металла/алюминиевой рамы используй #1d1f1e..#252726.',
      '- roughness: шероховатость основного материала от 0.08 до 0.98 (ткань 0.86–0.95, матовый фасад 0.68–0.78, дерево 0.48–0.62, камень 0.45–0.65).',
      '- metalness: металличность основного материала от 0.0 до 0.95 (ткань/дерево/матовый МДФ 0.01–0.04, металл 0.70–0.92).',
      '- textureKind: выбери из fabric, wood, stone, matte, art_arch, art_botanic, art_mono, art_terracotta.',
      '- glassTintHex: если на фото есть стеклянные дверцы, витрина или стеклянная столешница — цвет тонировки стекла (#RRGGBB, для тёмного дымчатого стекла #1e2320..#2b302d), иначе пустую строку "".',
      '- widthM, heightM, depthM: переведи габариты из текста в МЕТРЫ (widthM=ширина/длина, heightM=высота, depthM=глубина). Если габариты не указаны — верни 0.',
      '- silhouette: точная 3D-форма предмета по фото:',
      '  * для storage: vitrine_cabinet (шкаф-витрина со стеклом), sideboard_doors (тумба/ТВ-тумба/буфет с дверцами и/или открытыми полками), chest_drawers (комод с ящиками), open_shelving (стеллаж полностью с открытыми полками), wardrobe_tall (высокий шкаф), floating_console (подвесная консоль)',
      '  * для table: rect_legs (прямоугольный стол на ножках), round_pedestal (круглый на центральной опоре), oval_glass (стеклянный стол на каркасе), nesting_plinth (двухуровневый подиум)',
      '  * для chair: dining_upholstered (обеденный стул), lounge_armchair (кресло с подлокотниками), round_pouf (круглый пуф)',
      '  * для sofa: straight_legs (прямой диван на ножках), l_sectional (угловой диван с оттоманкой), low_modular (низкий модульный диван)',
      '  * для bed: upholstered_panel (мягкое изголовье), wood_frame_bed (деревянный каркас), tall_winged_bed (высокое изголовье с ушками)',
      '  * для lighting: arc_floor_lamp, tripod_shade, linear_pendant, globe_pendant, wall_sconce',
      '  * для art: framed_art',
      '  * для mirror: arch_mirror (арочное зеркало), round_mirror (круглое зеркало), framed_art (прямоугольное зеркало в раме)',
      '- bays: ОБЯЗАТЕЛЬНО для storage! Внимательно осмотри фасад СТРОГО СЛЕВА НАПРАВО и перечисли тип КАЖДОЙ вертикальной секции (массив из 1..4 элементов, длина совпадает с columns):',
      '  * "door" — глухая дверца',
      '  * "open_shelves" — открытая секция с полками без дверцы (число открытых отсеков по вертикали укажи в rows)',
      '  * "drawers" — секция с выдвижными ящиками (число ящиков по вертикали укажи в rows)',
      '  * "glass_door" — дверца со стеклом во всю высоту',
      '  * "glass_top_door" — комбинированная секция (сверху дверца со стеклом, снизу глухая дверца)',
      '  * "open_top_door" — сверху открытая ниша, снизу глухая дверца',
      '  Примеры: тумба с 1 дверцей, открытой секцией на 3 отсека и 2 дверцами -> columns: 4, rows: 3, bays: ["door", "open_shelves", "door", "door"]. Шкаф-витрина с 2 верхними стеклянными дверцами и 2 нижними глухими дверцами -> columns: 2, rows: 2, bays: ["glass_top_door", "glass_top_door"]. Для не-storage верни пустой массив [].',
      '- glassFrameStyle: ОБЯЗАТЕЛЬНО для storage со стеклом! Какого цвета РАМА вокруг стеклянных дверок на фото:',
      '  * "metal" — если рамка стеклянных дверок контрастная чёрная/тёмная/металлическая (цвета metalHex, например чёрные рамы витрины на зелёном или деревянном корпусе!)',
      '  * "secondary" — если рамка вторичного контрастного цвета (secondaryHex)',
      '  * "body" — если рамка стеклянных дверок того же цвета, что и основной корпус (primaryHex)',
      '- upperSectionRatio: для комбинированных секций glass_top_door / open_top_door — доля высоты ВЕРХНЕЙ стеклянной/открытой части от высоты корпуса без ножек (число от 0.25 до 0.75). Например, если сверху стекло занимает ~40% корпуса, а снизу глухие дверцы ~60% — верни 0.40. Если стекло 55%, снизу 45% — верни 0.55. Для остальных предметов верни 0.42.',
      '- columns: число вертикальных секций/дверок/подушек по ширине (целое 1..4).',
      '- rows: число ярусов/отсеков внутри открытой или стеклянной секции по вертикали (целое 1..4; например 1 полка внутри витрины = 2 отсека -> rows: 2; 2 полки = 3 отсека -> rows: 3).',
      '- legStyle: тип опор по фото — straight (прямые ножки или металлическая рама на ножках), tapered (конусные), sled (металлические полозья), plinth (сплошной цоколь), floating (подвесной без ножек).',
      '- legHeightM: примерная высота ножек/цоколя в метрах (0 для подвесных, 0.05–0.08 для цоколя, 0.10–0.20 для ножек тумб/шкафов/диванов, 0.36–0.72 для стульев/столов).',
      '- glassZone: расположение стекла на фасаде — top, left, right, full, center, none.',
      '- hasFluting: true если на фасаде/опоре есть вертикальное рифление или рейки.',
      '- hasTopContrast: true ТОЛЬКО если верхняя столешница явно другого цвета/материала (например дубовая столешница на белом/зелёном корпусе).',
      '- handleStyle: стиль ручек по фото — edge_pull (торцевая/накладная плоская ручка-планка на самом верхнем краю дверцы по центру), horizontal_bar (горизонтальная ручка-скоба по центру ящика), vertical_bar (вертикальная ручка сбоку дверцы), knob (кнопка), none (без ручек).',
      '- hasBacklight: true если на фото есть внутренняя или контурная подсветка.',
      '- subtitle: краткая подпись на русском (до 60 символов) с материалом, дизайном и размерами.'
    );

    const prompt = promptLines.join('\n');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: GEMINI_CATALOG_MODEL,
          contents: [...imageParts, prompt],
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                primaryHex: { type: Type.STRING },
                secondaryHex: { type: Type.STRING },
                metalHex: { type: Type.STRING },
                roughness: { type: Type.NUMBER },
                metalness: { type: Type.NUMBER },
                textureKind: {
                  type: Type.STRING,
                  enum: [
                    'fabric',
                    'wood',
                    'stone',
                    'matte',
                    'art_arch',
                    'art_botanic',
                    'art_mono',
                    'art_terracotta',
                  ],
                },
                glassTintHex: { type: Type.STRING },
                widthM: { type: Type.NUMBER },
                heightM: { type: Type.NUMBER },
                depthM: { type: Type.NUMBER },
                silhouette: {
                  type: Type.STRING,
                  enum: Array.from(ALLOWED_SILHOUETTES),
                },
                bays: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                    enum: Array.from(ALLOWED_BAY_KINDS),
                  },
                },
                glassFrameStyle: {
                  type: Type.STRING,
                  enum: Array.from(ALLOWED_GLASS_FRAME_STYLES),
                },
                upperSectionRatio: { type: Type.NUMBER },
                columns: { type: Type.INTEGER },
                rows: { type: Type.INTEGER },
                legStyle: {
                  type: Type.STRING,
                  enum: Array.from(ALLOWED_LEG_STYLES),
                },
                legHeightM: { type: Type.NUMBER },
                glassZone: {
                  type: Type.STRING,
                  enum: Array.from(ALLOWED_GLASS_ZONES),
                },
                hasFluting: { type: Type.BOOLEAN },
                hasTopContrast: { type: Type.BOOLEAN },
                handleStyle: {
                  type: Type.STRING,
                  enum: Array.from(ALLOWED_HANDLE_STYLES),
                },
                hasBacklight: { type: Type.BOOLEAN },
                subtitle: { type: Type.STRING },
              },
              required: [
                'primaryHex',
                'secondaryHex',
                'metalHex',
                'roughness',
                'metalness',
                'textureKind',
                'glassTintHex',
                'widthM',
                'heightM',
                'depthM',
                'silhouette',
                'bays',
                'glassFrameStyle',
                'upperSectionRatio',
                'columns',
                'rows',
                'legStyle',
                'legHeightM',
                'glassZone',
                'hasFluting',
                'hasTopContrast',
                'handleStyle',
                'hasBacklight',
                'subtitle',
              ],
            },
          },
        });

        const rawText = response.text?.trim();
        if (!rawText) {
          throw new Error('Empty response from Gemini API');
        }

        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        const spec = sanitizeParsedSpec(parsed, itemType);
        res.status(200).json({ spec, model: GEMINI_CATALOG_MODEL });
        return;
      } catch (err) {
        lastErr = err;
        const classified = classifyGeminiError(err);
        if (!classified.retryable || attempt === 1) {
          res.status(classified.status).json({ error: classified.message });
          return;
        }
        await new Promise((r) => setTimeout(r, 700));
      }
    }

    const fallbackClassified = classifyGeminiError(lastErr);
    res.status(fallbackClassified.status).json({ error: fallbackClassified.message });
  });

  // Never let unknown /api/* requests fall through to SPA index.html with HTTP 200
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API маршрут не найден.' });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
