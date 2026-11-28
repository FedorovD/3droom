import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  ImagePlus,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  EDITABLE_TYPE_META,
  EDITABLE_TYPE_ORDER,
  EditableObjectType,
} from '../scene/objectCatalog';
import {
  compressCatalogPhoto,
  createCustomCatalogItem,
  CustomCatalogItem,
  CustomCatalogSpec,
  deleteCustomCatalogItem,
  generateThumbnailFromDataUrl,
  syncCustomCatalogItem,
} from '../state/customCatalog';

interface CatalogManagerModalProps {
  open: boolean;
  initialType?: EditableObjectType | null;
  items: CustomCatalogItem[];
  loading: boolean;
  loadError: string;
  onItemsChange: (nextItems: CustomCatalogItem[]) => void;
  onPlaceInScene: (item: CustomCatalogItem) => void;
  onClose: () => void;
}

interface DraftPhoto {
  photoDataUrl: string;
  thumbnailDataUrl: string;
}

function formatDimensionsCm(dims: [number, number, number]): string {
  const [w, h, d] = dims;
  return `${Math.round(w * 100)}×${Math.round(d * 100)}×${Math.round(h * 100)} см`;
}

const SILHOUETTE_LABELS_RU: Record<string, string> = {
  vitrine_cabinet: 'шкаф-витрина',
  sideboard_doors: 'тумба с дверцами',
  chest_drawers: 'комод с ящиками',
  open_shelving: 'стеллаж с полками',
  wardrobe_tall: 'высокий шкаф',
  floating_console: 'подвесная консоль',
  rect_legs: 'прямоугольный стол',
  round_pedestal: 'круглый стол на опоре',
  oval_glass: 'стеклянный стол',
  nesting_plinth: 'двухуровневый столик',
  dining_upholstered: 'обеденный стул',
  lounge_armchair: 'кресло',
  round_pouf: 'круглый пуф',
  straight_legs: 'прямой диван',
  l_sectional: 'угловой диван',
  low_modular: 'модульный диван',
  upholstered_panel: 'мягкое изголовье',
  wood_frame_bed: 'деревянный каркас',
  tall_winged_bed: 'высокое изголовье',
  arc_floor_lamp: 'арочный торшер',
  tripod_shade: 'торшер с абажуром',
  linear_pendant: 'линейный подвес',
  globe_pendant: 'подвес-шар',
  wall_sconce: 'настенное бра',
  framed_art: 'рама',
  arch_mirror: 'арочное зеркало',
  round_mirror: 'круглое зеркало',
};

const GLASS_ZONE_LABELS_RU: Record<string, string> = {
  top: 'стекло сверху',
  left: 'стекло слева',
  right: 'стекло справа',
  full: 'стекло во всю высоту',
  center: 'стекло по центру',
};

const LEG_STYLE_LABELS_RU: Record<string, string> = {
  straight: 'прямые ножки',
  tapered: 'конусные ножки',
  sled: 'метал. рама',
  plinth: 'цоколь',
  floating: 'подвесной',
};

const BAY_KIND_LABELS_RU: Record<string, string> = {
  door: 'дверца',
  open_shelves: 'полки',
  drawers: 'ящики',
  glass_door: 'витрина',
  glass_top_door: 'верх-стекло',
  open_top_door: 'ниша+дверца',
};

const HANDLE_STYLE_LABELS_RU: Record<string, string> = {
  edge_pull: 'торц. ручки сверху',
  horizontal_bar: 'гориз. ручки',
  vertical_bar: 'верт. ручки',
  knob: 'ручки-кнопки',
  none: 'без ручек',
};

function formatShapeSummary(spec?: CustomCatalogSpec): string {
  const sh = spec?.shape;
  if (!sh) return '';
  const parts: string[] = [];
  if (sh.bays && sh.bays.length > 0) {
    parts.push(sh.bays.map((b) => BAY_KIND_LABELS_RU[b] ?? b).join(' + '));
  } else {
    parts.push(SILHOUETTE_LABELS_RU[sh.silhouette] ?? sh.silhouette);
    if (sh.columns > 1) parts.push(`${sh.columns} секц.`);
    const glassLabel = GLASS_ZONE_LABELS_RU[sh.glassZone];
    if (glassLabel) parts.push(glassLabel);
  }
  if (sh.glassFrameStyle === 'metal') {
    parts.push('тёмн. рама стекла');
  } else if (sh.glassFrameStyle === 'secondary') {
    parts.push('контраст. рама стекла');
  }
  if (
    sh.upperSectionRatio !== undefined &&
    (sh.bays?.some((b) => b === 'glass_top_door' || b === 'open_top_door') ||
      sh.glassZone === 'top')
  ) {
    parts.push(`верх ${Math.round(sh.upperSectionRatio * 100)}%`);
  }
  const handleLabel = HANDLE_STYLE_LABELS_RU[sh.handleStyle];
  if (handleLabel) parts.push(handleLabel);
  const legLabel = LEG_STYLE_LABELS_RU[sh.legStyle];
  if (legLabel) {
    parts.push(
      sh.legStyle === 'floating' || sh.legHeightM <= 0.01
        ? legLabel
        : `${legLabel} ${Math.round(sh.legHeightM * 100)} см`
    );
  }
  if (sh.hasFluting) parts.push('рифление');
  if (sh.hasBacklight) parts.push('подсветка');
  return parts.join(' · ');
}

export function CatalogManagerModal({
  open,
  initialType,
  items,
  loading,
  loadError,
  onItemsChange,
  onPlaceInScene,
  onClose,
}: CatalogManagerModalProps) {
  const [formType, setFormType] = useState<EditableObjectType>(initialType ?? 'sofa');
  const [title, setTitle] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [filterType, setFilterType] = useState<EditableObjectType | 'all'>('all');
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncNotice, setSyncNotice] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refiningItemId, setRefiningItemId] = useState<string | null>(null);
  const [refinementDrafts, setRefinementDrafts] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && initialType) {
      setFormType(initialType);
      setFilterType(initialType);
    }
  }, [open, initialType]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [open, onClose]);

  const unsyncedItems = useMemo(
    () => items.filter((item) => item.status !== 'synced'),
    [items]
  );

  const countByType = useMemo(() => {
    const counts = new Map<EditableObjectType, number>();
    for (const t of EDITABLE_TYPE_ORDER) counts.set(t, 0);
    for (const item of items) {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const filteredGroups = useMemo(() => {
    const visible =
      filterType === 'all' ? items : items.filter((i) => i.type === filterType);
    const groups: Array<{
      type: EditableObjectType;
      label: string;
      entries: CustomCatalogItem[];
    }> = [];
    for (const t of EDITABLE_TYPE_ORDER) {
      const entries = visible.filter((i) => i.type === t);
      if (entries.length > 0) {
        groups.push({ type: t, label: EDITABLE_TYPE_META[t].label, entries });
      }
    }
    return groups;
  }, [items, filterType]);

  if (!open) return null;

  const processFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) {
      setFormError('Выберите изображения в формате JPG, PNG или WebP.');
      return;
    }

    const remainingSlots = Math.max(0, 4 - draftPhotos.length);
    if (remainingSlots === 0) {
      setFormError('Можно загрузить максимум 4 фото для одного предмета.');
      return;
    }

    setFormError('');
    setIsCompressing(true);
    try {
      const next: DraftPhoto[] = [];
      for (const file of incoming.slice(0, remainingSlots)) {
        const compressed = await compressCatalogPhoto(file);
        next.push(compressed);
      }
      setDraftPhotos((prev) => [...prev, ...next].slice(0, 4));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Не удалось обработать фото.'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files);
    }
  };

  const handleSetPrimaryPhoto = (idx: number) => {
    if (idx <= 0) return;
    setDraftPhotos((prev) => {
      if (idx >= prev.length) return prev;
      const picked = prev[idx];
      return [picked, ...prev.filter((_, i) => i !== idx)];
    });
  };

  const handleRemoveDraftPhoto = (idx: number) => {
    setDraftPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Укажите название предмета.');
      return;
    }
    if (draftPhotos.length === 0) {
      setFormError('Добавьте хотя бы 1 фото предмета.');
      return;
    }

    setFormError('');
    setSyncNotice(null);
    setIsSaving(true);
    try {
      const primaryThumb =
        draftPhotos[0].thumbnailDataUrl ||
        (await generateThumbnailFromDataUrl(draftPhotos[0].photoDataUrl));
      const created = await createCustomCatalogItem({
        type: formType,
        title: cleanTitle,
        specsText: specsText.trim(),
        photos: draftPhotos.map((p) => p.photoDataUrl),
        thumbnailUrl: primaryThumb,
      });
      onItemsChange([created, ...items]);
      setTitle('');
      setSpecsText('');
      setDraftPhotos([]);
      setSyncNotice({
        kind: 'ok',
        text: `«${created.title}» добавлен в список. Нажмите «Синхронизировать», чтобы перенести его в 3D-сцену.`,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setFormError(
        raw.includes('permission') || raw.includes('PERMISSION_DENIED')
          ? 'База отклонила запись. Проверьте размер фото или обновите страницу.'
          : 'Не удалось сохранить предмет в базу. Проверьте соединение.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncAllNew = async () => {
    if (syncingAll || syncingItemId) return;
    const queue = items.filter((item) => item.status !== 'synced');
    if (queue.length === 0) {
      setSyncNotice({
        kind: 'ok',
        text: 'Все предметы из списка уже синхронизированы и доступны в 3D-сцене.',
      });
      return;
    }

    setSyncingAll(true);
    setSyncNotice(null);
    let working = [...items];
    let okCount = 0;
    let errCount = 0;
    let lastError = '';

    for (let i = 0; i < queue.length; i++) {
      const target = queue[i];
      setSyncingItemId(target.id);
      setSyncProgress(`Анализ ${i + 1} из ${queue.length}: ${target.title}…`);

      try {
        const updated = await syncCustomCatalogItem(target);
        working = working.map((it) => (it.id === updated.id ? updated : it));
        onItemsChange(working);

        if (updated.status === 'synced') {
          okCount += 1;
        } else {
          errCount += 1;
          lastError = updated.errorMessage || 'Неизвестная ошибка анализа.';
          // Stop early on hard quota/key error instead of spamming remaining items
          if (
            lastError.includes('GEMINI_API_KEY') ||
            lastError.includes('лимит')
          ) {
            break;
          }
        }
      } catch (err) {
        errCount += 1;
        const raw = err instanceof Error ? err.message : '';
        lastError =
          raw.includes('permission') || raw.includes('PERMISSION_DENIED')
            ? 'База данных отклонила сохранение 3D-параметров. Попробуйте обновить страницу.'
            : 'Не удалось сохранить результат генерации в базу. Попробуйте ещё раз.';
      }
    }

    setSyncingAll(false);
    setSyncingItemId(null);
    setSyncProgress('');

    if (errCount === 0) {
      setSyncNotice({
        kind: 'ok',
        text: `Готово: добавлено в 3D-сцену ${okCount} ${okCount === 1 ? 'предмет' : okCount < 5 ? 'предмета' : 'предметов'}. Теперь они доступны в меню «Заменить» по двойному клику.`,
      });
    } else if (okCount > 0) {
      setSyncNotice({
        kind: 'error',
        text: `Синхронизировано: ${okCount}, с ошибкой: ${errCount}. ${lastError}`,
      });
    } else {
      setSyncNotice({
        kind: 'error',
        text: lastError,
      });
    }
  };

  const openRefinementEditor = (item: CustomCatalogItem) => {
    setRefiningItemId((cur) => {
      if (cur === item.id) return null;
      setRefinementDrafts((prev) =>
        prev[item.id] !== undefined
          ? prev
          : { ...prev, [item.id]: item.refinementNotes ?? '' }
      );
      return item.id;
    });
  };

  const handleResyncSingle = async (item: CustomCatalogItem, feedbackOverride?: string) => {
    if (syncingAll || syncingItemId) return;
    setSyncingItemId(item.id);
    setSyncProgress(
      feedbackOverride?.trim()
        ? `Перегенерация с учётом правок: ${item.title}…`
        : `Анализ: ${item.title}…`
    );
    setSyncNotice(null);
    try {
      const updated = await syncCustomCatalogItem(item, feedbackOverride);
      onItemsChange(items.map((it) => (it.id === updated.id ? updated : it)));
      if (updated.status === 'synced') {
        setRefiningItemId((cur) => (cur === item.id ? null : cur));
        setRefinementDrafts((prev) => ({
          ...prev,
          [item.id]: updated.refinementNotes ?? '',
        }));
        setSyncNotice({
          kind: 'ok',
          text: feedbackOverride?.trim()
            ? `«${updated.title}» перегенерирован с учётом ваших правок и обновлён в 3D-сцене.`
            : `«${updated.title}» синхронизирован и доступен в 3D-сцене.`,
        });
      } else {
        setSyncNotice({
          kind: 'error',
          text: updated.errorMessage || 'Не удалось синхронизировать предмет.',
        });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setSyncNotice({
        kind: 'error',
        text:
          raw.includes('permission') || raw.includes('PERMISSION_DENIED')
            ? 'База данных отклонила сохранение обновлённой 3D-модели. Обновите страницу и повторите.'
            : 'Не удалось сохранить перегенерированный предмет. Проверьте соединение и попробуйте ещё раз.',
      });
    } finally {
      setSyncingItemId(null);
      setSyncProgress('');
    }
  };

  const handleDelete = async (item: CustomCatalogItem) => {
    if (deletingId || syncingAll) return;
    setDeletingId(item.id);
    try {
      await deleteCustomCatalogItem(item.id);
      onItemsChange(items.filter((it) => it.id !== item.id));
    } catch {
      setSyncNotice({
        kind: 'error',
        text: 'Не удалось удалить предмет. Проверьте соединение.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const syncedCount = items.length - unsyncedItems.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-2.5 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Каталог своих предметов интерьера"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-[1040px] flex-col border border-white/15 bg-[#161918] text-[#ecebe5] shadow-2xl"
      >
        {/* Top Header + Primary Sync CTA */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#131615] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-[#f3f2ed] sm:text-[15px]">
              Свой каталог предметов и синхронизация с 3D
            </h2>
            <p className="mt-0.5 text-[11px] text-[#9b9a92]">
              Добавьте фото и свободное описание с размерами · «Синхронизировать» добавит новые позиции в 3D (уже добавленные пропускаются)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAllNew}
              disabled={syncingAll || Boolean(syncingItemId) || loading}
              className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                unsyncedItems.length > 0
                  ? 'border-[#89a692] bg-[#2a3b30] text-[#f0f7f2] hover:bg-[#354c3d]'
                  : 'border-white/12 bg-[#1e2220] text-[#b4c2b8] hover:border-white/25 hover:text-white'
              }`}
            >
              {syncingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a8cbb3]" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-[#a8cbb3]" />
              )}
              <span>
                {syncingAll
                  ? 'Синхронизация…'
                  : unsyncedItems.length > 0
                    ? `Синхронизировать (${unsyncedItems.length} нов.)`
                    : 'Синхронизировать'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center border border-white/10 bg-[#1c201e] text-[#a7a59d] transition-colors hover:border-white/25 hover:text-white"
              aria-label="Закрыть окно каталога"
              title="Закрыть (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Live Progress / Result Banner */}
        {(syncProgress || syncNotice || loadError) && (
          <div
            className={`flex items-center justify-between gap-2 border-b px-4 py-2 text-[11.5px] ${
              loadError || syncNotice?.kind === 'error'
                ? 'border-[#b86f6f]/35 bg-[#261919] text-[#f2c8c8]'
                : 'border-[#7a9181]/35 bg-[#1b241e] text-[#d5e7da]'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {syncProgress ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9cb8a4]" />
              ) : loadError || syncNotice?.kind === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#e09393]" />
              ) : (
                <Check className="h-3.5 w-3.5 shrink-0 text-[#9cb8a4]" />
              )}
              <span className="truncate">
                {syncProgress || loadError || syncNotice?.text}
              </span>
            </div>
            {syncNotice && !syncProgress && (
              <button
                type="button"
                onClick={() => setSyncNotice(null)}
                className="shrink-0 text-[10.5px] opacity-75 hover:opacity-100"
              >
                Скрыть
              </button>
            )}
          </div>
        )}

        {/* Main 2-Column Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[368px_1fr] lg:overflow-hidden">
          {/* LEFT: Add New Custom Item Form */}
          <form
            onSubmit={handleAddSubmit}
            className="flex flex-col gap-3 border-b border-white/10 bg-[#151817] p-4 lg:overflow-y-auto lg:border-r lg:border-b-0"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-wide text-[#aebcb2] uppercase">
                Новый предмет
              </h3>
              <span className="text-[10px] text-[#7f8781]">
                Сохраняется в облако
              </span>
            </div>

            {/* Object Type Selector (All 11 Types) */}
            <div>
              <label
                htmlFor="catalog-item-type"
                className="mb-1 block text-[11px] font-medium text-[#c9c7bf]"
              >
                Тип предмета
              </label>
              <select
                id="catalog-item-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as EditableObjectType)}
                className="w-full border border-white/15 bg-[#1c201e] px-2.5 py-2 text-xs text-[#f0efec] outline-none focus:border-[#7a9181]"
              >
                {EDITABLE_TYPE_ORDER.map((t) => (
                  <option key={t} value={t} className="bg-[#1c201e] text-[#f0efec]">
                    {EDITABLE_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Item Name */}
            <div>
              <label
                htmlFor="catalog-item-title"
                className="mb-1 block text-[11px] font-medium text-[#c9c7bf]"
              >
                Название
              </label>
              <input
                id="catalog-item-title"
                type="text"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Диван Милан светлое букле"
                className="w-full border border-white/15 bg-[#1c201e] px-2.5 py-2 text-xs text-[#f0efec] placeholder-[#727672] outline-none focus:border-[#7a9181]"
              />
            </div>

            {/* Free-Text Dimensions & Extra Parameters */}
            <div>
              <label
                htmlFor="catalog-item-specs"
                className="mb-1 block text-[11px] font-medium text-[#c9c7bf]"
              >
                Размеры и доп. параметры (свободный текст)
              </label>
              <textarea
                id="catalog-item-specs"
                rows={4}
                maxLength={1200}
                value={specsText}
                onChange={(e) => setSpecsText(e.target.value)}
                placeholder="Например: 230×105×82 см, высота сиденья 44 см, ткань молочное букле, тонкие чёрные ножки 14 см, модульный..."
                className="w-full resize-y border border-white/15 bg-[#1c201e] px-2.5 py-2 text-xs leading-relaxed text-[#f0efec] placeholder-[#727672] outline-none focus:border-[#7a9181]"
              />
              <p className="mt-1 text-[10px] text-[#838b85]">
                ИИ сам распознает габариты (см/мм/м), фактуру, цвет фурнитуры и любые пометки.
              </p>
            </div>

            {/* Multi-Photo Uploader (1–4 images) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#c9c7bf]">
                  Фотографии предмета ({draftPhotos.length}/4)
                </span>
                {draftPhotos.length > 1 && (
                  <span className="text-[10px] text-[#8d9d92]">
                    Клик по фото — сделать главным
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFiles(true);
                }}
                onDragLeave={() => setIsDraggingFiles(false)}
                onDrop={handleDrop}
                onClick={() => draftPhotos.length < 4 && fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed px-3 py-4 text-center transition-colors ${
                  draftPhotos.length >= 4
                    ? 'cursor-default border-white/10 bg-[#191c1b] opacity-60'
                    : isDraggingFiles
                      ? 'border-[#89a692] bg-[#212c25]'
                      : 'border-white/20 bg-[#1a1e1c] hover:border-[#7a9181] hover:bg-[#1f2421]'
                }`}
              >
                {isCompressing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#9cb8a4]" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-[#9cb8a4]" />
                )}
                <div className="text-[11px] font-medium text-[#e4e2db]">
                  {isCompressing
                    ? 'Сжатие фотографий…'
                    : draftPhotos.length >= 4
                      ? 'Загружено максимум 4 фото'
                      : 'Нажмите или перетащите фото сюда'}
                </div>
                <div className="text-[10px] text-[#838b85]">
                  Можно несколько ракурсов (JPG, PNG, WebP)
                </div>
              </div>

              {draftPhotos.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {draftPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className={`group relative aspect-[4/3] overflow-hidden border ${
                        idx === 0
                          ? 'border-[#7a9181]'
                          : 'border-white/12 hover:border-white/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryPhoto(idx)}
                        className="h-full w-full"
                        title={
                          idx === 0
                            ? 'Главное мини-фото для каталога'
                            : 'Сделать главным мини-фото'
                        }
                      >
                        <img
                          src={photo.thumbnailDataUrl}
                          alt={`Фото ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      {idx === 0 && (
                        <span
                          className="pointer-events-none absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-[#151817]/90 px-1 py-0.5 text-[8.5px] font-semibold text-[#a5c6af]"
                          title="Главное фото"
                        >
                          <Star className="h-2.5 w-2.5 fill-[#a5c6af]" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftPhoto(idx)}
                        className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center bg-black/80 text-white/80 hover:bg-[#5c2525] hover:text-white"
                        aria-label="Удалить фото"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <div className="border border-[#c47c7c]/40 bg-[#261919] px-2.5 py-1.5 text-[11px] text-[#f0c5c5]">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="mt-auto flex items-center justify-center gap-2 border border-[#7a9181]/70 bg-[#233128] px-3 py-2 text-xs font-semibold text-[#eef5f0] transition-colors hover:bg-[#2e4134] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{isSaving ? 'Сохранение…' : 'Добавить в список'}</span>
            </button>
          </form>

          {/* RIGHT: All 11 Types Filter + List of Added Items */}
          <div className="flex min-h-0 flex-col bg-[#141715]">
            {/* Type Filter Strip (All 11 Types Always Visible) */}
            <div className="border-b border-white/10 bg-[#161918] px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between gap-2 text-[10.5px]">
                <span className="font-semibold tracking-wide text-[#aebcb2] uppercase">
                  Все типы ({EDITABLE_TYPE_ORDER.length}) · Предметов: {items.length}
                </span>
                <span className="text-[#8d9d92]">
                  В 3D: {syncedCount} · Ожидают: {unsyncedItems.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`border px-2 py-1 text-[10.5px] font-medium transition-colors ${
                    filterType === 'all'
                      ? 'border-[#7a9181] bg-[#243028] text-white'
                      : 'border-white/10 bg-[#1b1f1d] text-[#a9a79f] hover:border-white/25 hover:text-white'
                  }`}
                >
                  Все ({items.length})
                </button>
                {EDITABLE_TYPE_ORDER.map((t) => {
                  const count = countByType.get(t) ?? 0;
                  const active = filterType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`border px-2 py-1 text-[10.5px] font-medium transition-colors ${
                        active
                          ? 'border-[#7a9181] bg-[#243028] text-white'
                          : count > 0
                            ? 'border-white/14 bg-[#1c211e] text-[#d6dcd7] hover:border-white/30 hover:text-white'
                            : 'border-white/8 bg-[#181b1a] text-[#7c7e7a] hover:border-white/20 hover:text-[#b5b4ad]'
                      }`}
                    >
                      {EDITABLE_TYPE_META[t].shortLabel}
                      {count > 0 && (
                        <span className="font-mono-nums ml-1 text-[#9cb8a4]">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Catalog List */}
            <div className="flex-1 overflow-y-auto p-3.5">
              {loading ? (
                <div className="flex h-48 items-center justify-center gap-2 text-xs text-[#9b9a92]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#9cb8a4]" />
                  <span>Загрузка списка предметов…</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center border border-dashed border-white/10 bg-[#171a19] px-6 text-center">
                  <p className="text-xs font-medium text-[#d4d2cb]">
                    {filterType === 'all'
                      ? 'Пока нет добавленных предметов'
                      : `В категории «${EDITABLE_TYPE_META[filterType].label}» пока нет своих предметов`}
                  </p>
                  <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-[#868b86]">
                    Загрузите 1–4 фото и укажите размеры или детали в форме слева, затем нажмите «Синхронизировать» — предмет сразу появится в 3D-меню «Заменить».
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGroups.map((grp) => (
                    <section key={grp.type} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-white/8 pb-1">
                        <h4 className="text-[11px] font-semibold tracking-wide text-[#9db4a4] uppercase">
                          {grp.label}
                        </h4>
                        <span className="font-mono-nums text-[10px] text-[#7e8781]">
                          {grp.entries.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {grp.entries.map((item) => {
                          const isBusy = syncingItemId === item.id;
                          const isDeleting = deletingId === item.id;
                          const isRefining = refiningItemId === item.id;
                          const draftNote =
                            refinementDrafts[item.id] ?? item.refinementNotes ?? '';
                          const shapeSummary = formatShapeSummary(item.spec);

                          return (
                            <article
                              key={item.id}
                              className={`flex flex-col border bg-[#191d1b] transition-colors ${
                                isRefining ? 'border-[#7a9181]/70' : 'border-white/10'
                              }`}
                            >
                              <div className="flex flex-col gap-2.5 p-2.5 sm:flex-row">
                                {/* Thumbnail + photo count */}
                                <div className="relative h-24 w-full shrink-0 overflow-hidden border border-white/12 bg-[#131615] sm:h-[78px] sm:w-[114px]">
                                  <img
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                  />
                                  {item.photos.length > 1 && (
                                    <span className="font-mono-nums absolute right-1 bottom-1 bg-black/80 px-1.5 py-0.5 text-[9.5px] font-medium text-[#e4e2db]">
                                      {item.photos.length} фото
                                    </span>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                                  <div>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h5 className="truncate text-xs font-semibold text-[#f2f1ec]">
                                        {item.title}
                                      </h5>

                                      {/* Status Badge */}
                                      {isBusy ? (
                                        <span className="flex items-center gap-1 border border-[#7a9181]/50 bg-[#202d24] px-1.5 py-0.5 text-[10px] font-medium text-[#b5d6be]">
                                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                          Анализ…
                                        </span>
                                      ) : item.status === 'synced' ? (
                                        <span className="flex items-center gap-1 border border-[#7a9181]/55 bg-[#1e2c22] px-1.5 py-0.5 text-[10px] font-medium text-[#a8cfb3]">
                                          <Check className="h-2.5 w-2.5" />
                                          В 3D-сцене
                                        </span>
                                      ) : item.status === 'error' ? (
                                        <span className="flex items-center gap-1 border border-[#c47c7c]/50 bg-[#2a1a1a] px-1.5 py-0.5 text-[10px] font-medium text-[#f0b4b4]">
                                          <AlertCircle className="h-2.5 w-2.5" />
                                          Ошибка
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 border border-[#c4a163]/45 bg-[#292318] px-1.5 py-0.5 text-[10px] font-medium text-[#e6c88e]">
                                          <Clock className="h-2.5 w-2.5" />
                                          Ожидает
                                        </span>
                                      )}
                                    </div>

                                    {item.specsText && (
                                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#aaa9a1]">
                                        {item.specsText}
                                      </p>
                                    )}

                                    {item.refinementNotes && !isRefining && (
                                      <p className="mt-1 line-clamp-1 text-[10.5px] leading-snug text-[#9cb8a4]">
                                        Правка: {item.refinementNotes}
                                      </p>
                                    )}

                                    {item.status === 'error' && item.errorMessage && (
                                      <p className="mt-1 text-[10.5px] leading-snug text-[#e8a3a3]">
                                        {item.errorMessage}
                                      </p>
                                    )}
                                  </div>

                                  {/* Synced 3D Recipe Swatches + Actions */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                    {item.spec ? (
                                      <div className="flex min-w-0 items-center gap-2">
                                        <div
                                          className="flex h-3.5 w-11 shrink-0 overflow-hidden border border-white/20"
                                          title={`Палитра 3D: ${item.spec.primaryHex} / ${item.spec.secondaryHex} / ${item.spec.metalHex}`}
                                        >
                                          <span
                                            className="flex-1"
                                            style={{ backgroundColor: item.spec.primaryHex }}
                                          />
                                          <span
                                            className="flex-1"
                                            style={{ backgroundColor: item.spec.secondaryHex }}
                                          />
                                          <span
                                            className="flex-1"
                                            style={{ backgroundColor: item.spec.metalHex }}
                                          />
                                        </div>
                                        {item.spec.dimensionsM && (
                                          <span className="font-mono-nums shrink-0 border border-white/10 bg-[#202422] px-1.5 py-0.5 text-[9.5px] text-[#bfd1c4]">
                                            {formatDimensionsCm(item.spec.dimensionsM)}
                                          </span>
                                        )}
                                        <span className="truncate text-[10px] text-[#8d9d92]">
                                          {item.spec.subtitle}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-[#7c807c]">
                                        Будет проанализирован при синхронизации
                                      </span>
                                    )}

                                    <div className="flex shrink-0 items-center gap-1">
                                      {item.status === 'synced' ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => onPlaceInScene(item)}
                                            disabled={syncingAll || Boolean(syncingItemId) || isDeleting}
                                            className="flex items-center gap-1 border border-[#73917c] bg-[#223228] px-2 py-1 text-[10px] font-medium text-[#e4f1e8] transition-colors hover:border-[#95b89f] hover:bg-[#2c4234] hover:text-white disabled:opacity-45"
                                            title="Добавить этот предмет в 3D-интерьер перед камерой"
                                          >
                                            <Plus className="h-2.5 w-2.5" />
                                            <span>В интерьер</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openRefinementEditor(item)}
                                            disabled={syncingAll || Boolean(syncingItemId) || isDeleting}
                                            className={`flex items-center gap-1 border px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-45 ${
                                              isRefining
                                                ? 'border-[#89a692] bg-[#2a3b30] text-white'
                                                : 'border-white/12 bg-[#212623] text-[#cfd9d2] hover:border-[#7a9181] hover:text-white'
                                            }`}
                                            title="Написать, что поправить, и перегенерировать 3D-модель"
                                          >
                                            <RefreshCw className="h-2.5 w-2.5" />
                                            <span>Обновить</span>
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => openRefinementEditor(item)}
                                            disabled={syncingAll || Boolean(syncingItemId) || isDeleting}
                                            className={`flex h-6 items-center gap-1 border px-1.5 text-[10px] font-medium transition-colors disabled:opacity-45 ${
                                              isRefining
                                                ? 'border-[#89a692] bg-[#2a3b30] text-white'
                                                : 'border-white/10 bg-[#1e2220] text-[#aebcb2] hover:border-[#7a9181] hover:text-white'
                                            }`}
                                            title="Добавить комментарий или правку перед генерацией"
                                          >
                                            <MessageSquareText className="h-2.5 w-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void handleResyncSingle(item)}
                                            disabled={syncingAll || Boolean(syncingItemId) || isDeleting}
                                            className="flex items-center gap-1 border border-white/12 bg-[#212623] px-2 py-1 text-[10px] font-medium text-[#cfd9d2] transition-colors hover:border-[#7a9181] hover:text-white disabled:opacity-45"
                                            title="Синхронизировать этот предмет"
                                          >
                                            <RefreshCw className="h-2.5 w-2.5" />
                                            <span>В 3D</span>
                                          </button>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => void handleDelete(item)}
                                        disabled={syncingAll || Boolean(syncingItemId) || isDeleting}
                                        className="flex h-6 w-6 items-center justify-center border border-white/10 bg-[#251b1b] text-[#df9e9e] transition-colors hover:border-[#c47c7c]/60 hover:bg-[#3a2020] hover:text-white disabled:opacity-45"
                                        title="Удалить предмет из каталога"
                                        aria-label={`Удалить ${item.title}`}
                                      >
                                        {isDeleting ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Inline Refinement / Regeneration Feedback Drawer */}
                              {isRefining && (
                                <div className="border-t border-white/10 bg-[#131715] px-2.5 py-2.5">
                                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                    <label
                                      htmlFor={`refine-note-${item.id}`}
                                      className="text-[10.5px] font-medium text-[#d5e0d8]"
                                    >
                                      Что не так и как нужно сделать?
                                    </label>
                                    {shapeSummary && (
                                      <span className="text-[9.5px] text-[#829187]">
                                        Сейчас: {shapeSummary}
                                      </span>
                                    )}
                                  </div>

                                  <textarea
                                    id={`refine-note-${item.id}`}
                                    autoFocus
                                    rows={3}
                                    maxLength={1000}
                                    value={draftNote}
                                    onChange={(e) =>
                                      setRefinementDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                        e.preventDefault();
                                        void handleResyncSingle(item, draftNote);
                                      }
                                    }}
                                    placeholder="Например: сделай стекло только в верхней половине, корпус более светлый матовый шалфей, чёрные ножки 14 см, 2 дверцы без рифления…"
                                    className="w-full resize-y border border-white/15 bg-[#1b201e] px-2.5 py-2 text-[11.5px] leading-relaxed text-[#f0efec] placeholder-[#727874] outline-none focus:border-[#7a9181]"
                                  />

                                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[9.5px] text-[#7c847f]">
                                      Можно оставить пустым для обычной перегенерации · Ctrl+Enter
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {draftNote.trim().length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRefinementDrafts((prev) => ({
                                              ...prev,
                                              [item.id]: '',
                                            }))
                                          }
                                          disabled={isBusy}
                                          className="px-1.5 py-1 text-[10px] text-[#8d9690] hover:text-white disabled:opacity-45"
                                        >
                                          Очистить
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setRefiningItemId(null)}
                                        disabled={isBusy}
                                        className="border border-white/12 bg-[#1c201e] px-2.5 py-1 text-[10.5px] font-medium text-[#b5b4ad] transition-colors hover:border-white/25 hover:text-white disabled:opacity-45"
                                      >
                                        Отмена
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleResyncSingle(item, draftNote)}
                                        disabled={syncingAll || Boolean(syncingItemId) || isDeleting}
                                        className="flex items-center gap-1.5 border border-[#89a692] bg-[#2a3b30] px-2.5 py-1 text-[10.5px] font-semibold text-[#f0f7f2] transition-colors hover:bg-[#354c3d] disabled:opacity-45"
                                      >
                                        {isBusy ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3 w-3" />
                                        )}
                                        <span>
                                          {isBusy ? 'Генерация…' : 'Перегенерировать в 3D'}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
