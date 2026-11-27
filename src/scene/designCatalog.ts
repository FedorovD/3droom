import { FloorFinishId } from './dimensions';

export type WallFinishId =
  | 'white_putty'
  | 'warm_milk'
  | 'greige_linen'
  | 'cashmere_sand'
  | 'sage_whisper'
  | 'limewash_travertine'
  | 'mineral_clay'
  | 'nordic_mist'
  | 'graphite_velvet'
  | 'stalin_moldings';

export type CeilingStyleId = 'basic' | 'shadow_spots' | 'magnetic_track';
export type TvZoneStyleId = 'none' | 'minimal_wood' | 'stone_slate' | 'clean_floating';
export type SofaStyleId = 'none' | 'boucle_l' | 'velvet_olive' | 'graphite_mod';
export type KitchenStyleId = 'none' | 'warm_cashmere' | 'sage_walnut' | 'graphite_stone';
export type BedroomStyleId = 'none' | 'soft_linen' | 'walnut_burgundy' | 'modern_boucle';

export interface DesignConfig {
  wallFinish: WallFinishId;
  bedroomWallFinish: WallFinishId | 'same';
  ceilingStyle: CeilingStyleId;
  tvZone: TvZoneStyleId;
  sofa: SofaStyleId;
  kitchen: KitchenStyleId;
  bedroom: BedroomStyleId;
  entryFurniture: boolean;
  curtains: boolean;
}

export const DEFAULT_DESIGN_CONFIG: DesignConfig = {
  wallFinish: 'white_putty',
  bedroomWallFinish: 'same',
  ceilingStyle: 'basic',
  tvZone: 'none',
  sofa: 'none',
  kitchen: 'none',
  bedroom: 'none',
  entryFurniture: false,
  curtains: false,
};

export interface WallFinishOption {
  id: WallFinishId;
  label: string;
  shortLabel: string;
  code: string;
  swatchHex: string;
  accentHex?: string;
  rgb: [number, number, number];
  cutCapHex: number;
  finishType: 'plaster' | 'matte' | 'limewash' | 'accent' | 'molding';
  roughness: number;
  note: string;
}

/**
 * 10 researched architectural wall finishes tailored for a 2.92 m ceiling Stalin-era apartment
 * with smooth putty walls prepped for paint, matte stretch ceiling, honey-oak sills,
 * Tulesna Okovango/Saguaro oak laminate, and an olive-sage/concrete/walnut bathroom.
 */
export const WALL_FINISHES: WallFinishOption[] = [
  {
    id: 'white_putty',
    label: 'Базовая шпатлёвка',
    shortLabel: 'Шпатлёвка',
    code: 'База',
    swatchHex: '#d8d7d2',
    rgb: [216, 215, 210],
    cutCapHex: 0xbab8b1,
    finishType: 'plaster',
    roughness: 0.93,
    note: 'Текущее состояние стен под покраску: чистая матовая гипсовая база.',
  },
  {
    id: 'warm_milk',
    label: 'Тёплое молоко',
    shortLabel: 'Молоко',
    code: 'F497',
    swatchHex: '#e8e2d6',
    rgb: [232, 226, 214],
    cutCapHex: 0xc5bfb3,
    finishType: 'matte',
    roughness: 0.89,
    note: 'Мягкий тёплый белый для сталинок: сохраняет воздух и дружит с дубовыми подоконниками.',
  },
  {
    id: 'greige_linen',
    label: 'Грейдж Лён',
    shortLabel: 'Грейдж',
    code: 'OC-27',
    swatchHex: '#d1cbc0',
    rgb: [209, 203, 192],
    cutCapHex: 0xb3ada2,
    finishType: 'matte',
    roughness: 0.9,
    note: 'Универсальный серо-бежевый фон: связывает Окованго, Сагуаро и микробетон санузла.',
  },
  {
    id: 'cashmere_sand',
    label: 'Кашемир и песок',
    shortLabel: 'Кашемир',
    code: 'Y487',
    swatchHex: '#d4c5b2',
    rgb: [212, 197, 178],
    cutCapHex: 0xb6a896,
    finishType: 'matte',
    roughness: 0.9,
    note: 'Тёплый обволакивающий беж — красиво подчёркивает скруглённую арку кухни и южный свет.',
  },
  {
    id: 'sage_whisper',
    label: 'Шалфейная дымка',
    shortLabel: 'Шалфей',
    code: 'V447',
    swatchHex: '#bfc7bc',
    rgb: [191, 199, 188],
    cutCapHex: 0xa2aaa0,
    finishType: 'matte',
    roughness: 0.9,
    note: 'Деликатный серо-оливковый тон — тонкая цветовая перекличка с плиткой Majorelle в санузле.',
  },
  {
    id: 'limewash_travertine',
    label: 'Известковая (Limewash)',
    shortLabel: 'Limewash',
    code: 'Минерал',
    swatchHex: '#d7cec0',
    accentHex: '#c4b8a6',
    rgb: [215, 206, 192],
    cutCapHex: 0xb7ae9f,
    finishType: 'limewash',
    roughness: 0.95,
    note: 'Бархатистая минеральная покраска кистью с мягкими облачными переходами травертина.',
  },
  {
    id: 'mineral_clay',
    label: 'Тёплая глина',
    shortLabel: 'Глина',
    code: 'H484',
    swatchHex: '#c6b7a9',
    rgb: [198, 183, 169],
    cutCapHex: 0xa99b8f,
    finishType: 'matte',
    roughness: 0.91,
    note: 'Приглушённый тауп-глиняный оттенок в духе Japandi — уютно смотрится с орехом и букле.',
  },
  {
    id: 'nordic_mist',
    label: 'Сканди туман',
    shortLabel: 'Туман',
    code: 'G488',
    swatchHex: '#c9cfd1',
    rgb: [201, 207, 209],
    cutCapHex: 0xacb2b4,
    finishType: 'matte',
    roughness: 0.89,
    note: 'Свежий прохладный светло-серый: идеально балансирует южное солнце и ламинат Сагуаро.',
  },
  {
    id: 'graphite_velvet',
    label: 'Графит + молоко',
    shortLabel: 'Акцент',
    code: '2-тон',
    swatchHex: '#e3dfd6',
    accentHex: '#464a4c',
    rgb: [227, 223, 214],
    cutCapHex: 0xbfbbb2,
    finishType: 'accent',
    roughness: 0.9,
    note: 'Глубокие матовые графитовые акцентные стены за ТВ-зоной и в спальне на фоне светлой базы.',
  },
  {
    id: 'stalin_moldings',
    label: 'Сталинка с молдингами',
    shortLabel: 'Молдинги',
    code: 'Декор',
    swatchHex: '#dfd9ce',
    accentHex: '#c9c1b4',
    rgb: [223, 217, 206],
    cutCapHex: 0xbeb8ad,
    finishType: 'molding',
    roughness: 0.88,
    note: 'Жемчужно-кремовая покраска с тонкими настенными молдингами под 2.92 м потолок сталинки.',
  },
];

export const CEILING_STYLES: Array<{
  id: CeilingStyleId;
  label: string;
  subtitle: string;
}> = [
  { id: 'basic', label: 'Базовый', subtitle: 'Гладкий матовый' },
  { id: 'shadow_spots', label: 'Теневой + споты', subtitle: 'EuroKraab · точки' },
  { id: 'magnetic_track', label: 'Треки + шторы', subtitle: 'Магнитные шины · LED' },
];

export const TV_ZONE_STYLES: Array<{
  id: TvZoneStyleId;
  label: string;
  swatchHex: string;
}> = [
  { id: 'none', label: 'Нет', swatchHex: '#2c302e' },
  { id: 'minimal_wood', label: 'Орех и рейки', swatchHex: '#6c4f3b' },
  { id: 'stone_slate', label: 'Тёмный камень', swatchHex: '#3f4244' },
  { id: 'clean_floating', label: 'Светлый минимал', swatchHex: '#d5cfc4' },
];

export const SOFA_STYLES: Array<{
  id: SofaStyleId;
  label: string;
  swatchHex: string;
}> = [
  { id: 'none', label: 'Нет', swatchHex: '#2c302e' },
  { id: 'boucle_l', label: 'Букле крем', swatchHex: '#dfd9ce' },
  { id: 'velvet_olive', label: 'Олива велюр', swatchHex: '#687664' },
  { id: 'graphite_mod', label: 'Графит модуль', swatchHex: '#46494c' },
];

export const KITCHEN_STYLES: Array<{
  id: KitchenStyleId;
  label: string;
  swatchHex: string;
}> = [
  { id: 'none', label: 'Нет', swatchHex: '#2c302e' },
  { id: 'warm_cashmere', label: 'Кашемир + дуб', swatchHex: '#c9bcae' },
  { id: 'sage_walnut', label: 'Шалфей + орех', swatchHex: '#7c8a79' },
  { id: 'graphite_stone', label: 'Графит + камень', swatchHex: '#3c3f41' },
];

export const BEDROOM_STYLES: Array<{
  id: BedroomStyleId;
  label: string;
  swatchHex: string;
}> = [
  { id: 'none', label: 'Нет', swatchHex: '#2c302e' },
  { id: 'soft_linen', label: 'Лён + дуб', swatchHex: '#d5cbbd' },
  { id: 'walnut_burgundy', label: 'Орех + бордо', swatchHex: '#6a3536' },
  { id: 'modern_boucle', label: 'Графит + крем', swatchHex: '#505356' },
];

export interface CuratedDesignPreset {
  id: string;
  label: string;
  subtitle: string;
  swatches: [string, string, string];
  floorFinish: FloorFinishId;
  design: DesignConfig;
}

export const DESIGN_PRESETS: CuratedDesignPreset[] = [
  {
    id: 'warm_minimal',
    label: 'Тёплый минимализм',
    subtitle: 'Молоко + Кашемир в спальне · Окованго',
    swatches: ['#e8e2d6', '#d4c5b2', '#917f70'],
    floorFinish: 'okovango',
    design: {
      wallFinish: 'warm_milk',
      bedroomWallFinish: 'cashmere_sand',
      ceilingStyle: 'shadow_spots',
      tvZone: 'minimal_wood',
      sofa: 'boucle_l',
      kitchen: 'warm_cashmere',
      bedroom: 'soft_linen',
      entryFurniture: true,
      curtains: true,
    },
  },
  {
    id: 'sage_walnut',
    label: 'Шалфей и орех',
    subtitle: 'Limewash + Шалфей в спальне · Олива',
    swatches: ['#d7cec0', '#bfc7bc', '#6a3536'],
    floorFinish: 'okovango',
    design: {
      wallFinish: 'limewash_travertine',
      bedroomWallFinish: 'sage_whisper',
      ceilingStyle: 'magnetic_track',
      tvZone: 'stone_slate',
      sofa: 'velvet_olive',
      kitchen: 'sage_walnut',
      bedroom: 'walnut_burgundy',
      entryFurniture: true,
      curtains: true,
    },
  },
  {
    id: 'stalin_classic',
    label: 'Сталинка с молдингами',
    subtitle: 'Молдинги + Глина в спальне · Сагуаро',
    swatches: ['#dfd9ce', '#c6b7a9', '#46494c'],
    floorFinish: 'saguaro',
    design: {
      wallFinish: 'stalin_moldings',
      bedroomWallFinish: 'mineral_clay',
      ceilingStyle: 'magnetic_track',
      tvZone: 'clean_floating',
      sofa: 'graphite_mod',
      kitchen: 'graphite_stone',
      bedroom: 'modern_boucle',
      entryFurniture: true,
      curtains: true,
    },
  },
];
