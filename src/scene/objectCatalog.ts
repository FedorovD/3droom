import * as THREE from 'three';

export type EditableObjectType =
  | 'sofa'
  | 'bed'
  | 'chair'
  | 'table'
  | 'storage'
  | 'kitchen'
  | 'lighting'
  | 'art'
  | 'mirror'
  | 'rug'
  | 'textile'
  | 'partition'
  | 'media_decor'
  | 'decor'
  | 'bath_fixtures';

export interface EditableTypeInfo {
  id: EditableObjectType;
  label: string;
  shortLabel: string;
}

export const EDITABLE_TYPE_ORDER: EditableObjectType[] = [
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
];

export const EDITABLE_TYPE_META: Record<EditableObjectType, EditableTypeInfo> = {
  sofa: { id: 'sofa', label: 'Диваны', shortLabel: 'Диван' },
  bed: { id: 'bed', label: 'Кровати', shortLabel: 'Кровать' },
  chair: { id: 'chair', label: 'Стулья, кресла и пуфы', shortLabel: 'Стул / кресло' },
  table: { id: 'table', label: 'Столы и столики', shortLabel: 'Стол' },
  storage: { id: 'storage', label: 'Шкафы, тумбы и консоли', shortLabel: 'Тумба / шкаф' },
  kitchen: { id: 'kitchen', label: 'Кухонный гарнитур', shortLabel: 'Кухня' },
  lighting: { id: 'lighting', label: 'Светильники', shortLabel: 'Свет' },
  art: { id: 'art', label: 'Картины и постеры', shortLabel: 'Картина' },
  mirror: { id: 'mirror', label: 'Зеркала', shortLabel: 'Зеркало' },
  rug: { id: 'rug', label: 'Ковры', shortLabel: 'Ковёр' },
  textile: { id: 'textile', label: 'Шторы', shortLabel: 'Шторы' },
  partition: { id: 'partition', label: 'Перегородки', shortLabel: 'Перегородка' },
  media_decor: { id: 'media_decor', label: 'ТВ-зона', shortLabel: 'ТВ-зона' },
  decor: { id: 'decor', label: 'Декор', shortLabel: 'Декор' },
  bath_fixtures: { id: 'bath_fixtures', label: 'Сантехника и санузел', shortLabel: 'Сантехника' },
};

/** Explicit type assignment for every editable object in the 3D apartment */
export const EDITABLE_OBJECT_TYPE_MAP: Record<string, EditableObjectType> = {
  // Sofa
  sofa_main: 'sofa',

  // Bed
  bed_main: 'bed',

  // Chairs, desk chair & pouf
  dining_chair_1: 'chair',
  dining_chair_2: 'chair',
  dining_chair_3: 'chair',
  dining_chair_4: 'chair',
  desk_chair: 'chair',
  entry_pouf: 'chair',

  // Tables
  coffee_table: 'table',
  dining_table: 'table',
  study_desk: 'table',

  // Storage, consoles, nightstands, cabinets & wardrobes
  tv_console: 'storage',
  living_console: 'storage',
  nightstand_l: 'storage',
  nightstand_r: 'storage',
  bedroom_dresser: 'storage',
  closet_wardrobe: 'storage',
  entry_wardrobe: 'storage',
  entry_console: 'storage',
  bath_cabinet: 'storage',

  // Kitchen modules
  kitchen_fridge: 'kitchen',
  kitchen_lower: 'kitchen',
  kitchen_upper: 'kitchen',

  // Lighting
  floor_lamp: 'lighting',
  dining_pendant: 'lighting',
  bed_sconce_l: 'lighting',
  bed_sconce_r: 'lighting',

  // Wall art
  living_art_l: 'art',
  living_art_r: 'art',
  bedroom_art: 'art',

  // Mirrors
  entry_mirror: 'mirror',

  // Rugs
  living_rug: 'rug',
  bed_rug: 'rug',

  // Curtains
  curtains_living: 'textile',
  curtains_kitchen: 'textile',
  curtains_bedroom: 'textile',

  // Architectural partition
  arch_partition: 'partition',

  // TV zone
  tv_backdrop: 'media_decor',
  tv_screen: 'media_decor',

  // Tabletop decor
  tv_decor: 'decor',

  // Bathroom fixtures
  bath_vanity: 'bath_fixtures',
  bath_tub: 'bath_fixtures',
  bath_shower_screen: 'bath_fixtures',
  bath_mixer: 'bath_fixtures',
  bath_flush_plate: 'bath_fixtures',
  bath_towel_warmer: 'bath_fixtures',
  bath_drain: 'bath_fixtures',
};

export type VariantTextureKind =
  | 'fabric'
  | 'wood'
  | 'stone'
  | 'matte'
  | 'art_arch'
  | 'art_botanic'
  | 'art_mono'
  | 'art_terracotta';

export type VariantSilhouette =
  | 'vitrine_cabinet'
  | 'sideboard_doors'
  | 'chest_drawers'
  | 'open_shelving'
  | 'wardrobe_tall'
  | 'floating_console'
  | 'rect_legs'
  | 'round_pedestal'
  | 'oval_glass'
  | 'nesting_plinth'
  | 'dining_upholstered'
  | 'lounge_armchair'
  | 'round_pouf'
  | 'straight_legs'
  | 'l_sectional'
  | 'low_modular'
  | 'upholstered_panel'
  | 'wood_frame_bed'
  | 'tall_winged_bed'
  | 'arc_floor_lamp'
  | 'tripod_shade'
  | 'linear_pendant'
  | 'globe_pendant'
  | 'wall_sconce'
  | 'framed_art'
  | 'arch_mirror'
  | 'round_mirror';

export type VariantLegStyle = 'straight' | 'tapered' | 'sled' | 'plinth' | 'floating';
export type VariantGlassZone = 'none' | 'top' | 'left' | 'right' | 'full' | 'center';
export type VariantHandleStyle =
  | 'none'
  | 'vertical_bar'
  | 'horizontal_bar'
  | 'knob'
  | 'edge_pull';

export type VariantBayKind =
  | 'door'
  | 'open_shelves'
  | 'drawers'
  | 'glass_door'
  | 'glass_top_door'
  | 'open_top_door';

export type VariantGlassFrameStyle = 'body' | 'metal' | 'secondary';

export interface VariantShapeSpec {
  silhouette: VariantSilhouette;
  columns: number;
  rows: number;
  legStyle: VariantLegStyle;
  legHeightM: number;
  glassZone: VariantGlassZone;
  hasFluting: boolean;
  hasTopContrast: boolean;
  handleStyle: VariantHandleStyle;
  hasBacklight: boolean;
  /** Optional left-to-right per-column layout for storage cabinets & media consoles (1..4 bays) */
  bays?: VariantBayKind[];
  /** Material for glass door frames: cabinet body color, dark/metal frame, or secondary contrast */
  glassFrameStyle?: VariantGlassFrameStyle;
  /** Height ratio (0.25..0.75) of the upper glass/open zone in split doors like glass_top_door (e.g. 0.40 = 40% glass top / 60% solid bottom) */
  upperSectionRatio?: number;
}

export interface ObjectVariantSpec {
  id: string;
  type: EditableObjectType;
  label: string;
  subtitle: string;
  primaryHex: string;
  secondaryHex: string;
  metalHex: string;
  roughness: number;
  metalness: number;
  secondaryRoughness?: number;
  metalRoughness?: number;
  metalMetalness?: number;
  textureKind: VariantTextureKind;
  glassTintHex?: string;
  /** Architectural 3D procedural geometry specification */
  shape?: VariantShapeSpec;
  /** True for user-uploaded custom items synced from Firestore + Gemini */
  isCustom?: boolean;
  /** Real compressed uploaded mini-photo data URL */
  thumbnailUrl?: string;
  /** Primary uploaded photo data URL (used as live canvas texture for custom art) */
  photoUrl?: string;
  /** Parsed [width, height, depth] in meters from free-text dimensions */
  dimensionsM?: [number, number, number];
  /** Original user free-text dimensions & notes */
  specsText?: string;
  /** Number of uploaded reference photos */
  photosCount?: number;
  /** Last update timestamp to trigger 3D material/geometry refresh after re-sync */
  updatedAt?: number;
}

export const OBJECT_VARIANT_CATALOG: ObjectVariantSpec[] = [
  // --- SOFA ---
  {
    id: 'sofa_boucle_cream',
    type: 'sofa',
    label: 'Букле крем',
    subtitle: 'Молочное букле · олива и терракота',
    primaryHex: '#ded7cb',
    secondaryHex: '#6c7a67',
    metalHex: '#3c3834',
    roughness: 0.94,
    metalness: 0.02,
    textureKind: 'fabric',
  },
  {
    id: 'sofa_velvet_olive',
    type: 'sofa',
    label: 'Велюр олива',
    subtitle: 'Шалфейный велюр · кремовые подушки',
    primaryHex: '#687664',
    secondaryHex: '#dfd8cc',
    metalHex: '#b39562',
    roughness: 0.86,
    metalness: 0.03,
    textureKind: 'fabric',
  },
  {
    id: 'sofa_graphite_mod',
    type: 'sofa',
    label: 'Графит модуль',
    subtitle: 'Рогожка антрацит · акцент терракота',
    primaryHex: '#464a4d',
    secondaryHex: '#b06d53',
    metalHex: '#252729',
    roughness: 0.9,
    metalness: 0.02,
    textureKind: 'fabric',
  },
  {
    id: 'sofa_terracotta_linen',
    type: 'sofa',
    label: 'Терракота лён',
    subtitle: 'Тёплый терракотовый лён · песок',
    primaryHex: '#a96850',
    secondaryHex: '#d7ccbc',
    metalHex: '#4e3b2e',
    roughness: 0.91,
    metalness: 0.02,
    textureKind: 'fabric',
  },
  {
    id: 'sofa_camel_leather',
    type: 'sofa',
    label: 'Коньячная кожа',
    subtitle: 'Матовая карамельная кожа · графит',
    primaryHex: '#9a6845',
    secondaryHex: '#d9d1c5',
    metalHex: '#2a2b2d',
    roughness: 0.56,
    metalness: 0.06,
    textureKind: 'matte',
  },

  // --- BED ---
  {
    id: 'bed_linen_oak',
    type: 'bed',
    label: 'Лён и дуб',
    subtitle: 'Светлый лён · натуральный дуб',
    primaryHex: '#d6cdc0',
    secondaryHex: '#e7e2d9',
    metalHex: '#a88763',
    roughness: 0.92,
    metalness: 0.02,
    textureKind: 'fabric',
  },
  {
    id: 'bed_walnut_burgundy',
    type: 'bed',
    label: 'Орех и бордо',
    subtitle: 'Шпон ореха · винный текстиль',
    primaryHex: '#6c383a',
    secondaryHex: '#6e4e3a',
    metalHex: '#b59763',
    roughness: 0.88,
    metalness: 0.03,
    textureKind: 'fabric',
  },
  {
    id: 'bed_graphite_cream',
    type: 'bed',
    label: 'Графит и крем',
    subtitle: 'Графитовое изголовье · молочный лён',
    primaryHex: '#4c5054',
    secondaryHex: '#e4dfd5',
    metalHex: '#2a2c2e',
    roughness: 0.89,
    metalness: 0.02,
    textureKind: 'fabric',
  },
  {
    id: 'bed_sage_velvet',
    type: 'bed',
    label: 'Шалфей велюр',
    subtitle: 'Мягкий шалфей · тёплый кашемир',
    primaryHex: '#738271',
    secondaryHex: '#d5cbbd',
    metalHex: '#b09362',
    roughness: 0.86,
    metalness: 0.03,
    textureKind: 'fabric',
  },

  // --- CHAIR / POUF ---
  {
    id: 'chair_oak_boucle',
    type: 'chair',
    label: 'Дуб и букле',
    subtitle: 'Светлое букле · ножки светлый дуб',
    primaryHex: '#ded8cc',
    secondaryHex: '#b6946e',
    metalHex: '#b6946e',
    roughness: 0.92,
    metalness: 0.02,
    secondaryRoughness: 0.62,
    metalRoughness: 0.6,
    metalMetalness: 0.08,
    textureKind: 'fabric',
    shape: {
      silhouette: 'dining_upholstered',
      columns: 1,
      rows: 1,
      legStyle: 'tapered',
      legHeightM: 0.45,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },
  {
    id: 'chair_walnut_sage',
    type: 'chair',
    label: 'Орех и шалфей',
    subtitle: 'Кресло велюр олива · тёплый орех',
    primaryHex: '#6d7b69',
    secondaryHex: '#6c4d38',
    metalHex: '#b39460',
    roughness: 0.86,
    metalness: 0.03,
    secondaryRoughness: 0.54,
    textureKind: 'fabric',
    shape: {
      silhouette: 'lounge_armchair',
      columns: 1,
      rows: 1,
      legStyle: 'tapered',
      legHeightM: 0.36,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },
  {
    id: 'chair_graphite_black',
    type: 'chair',
    label: 'Графит лофт',
    subtitle: 'Тёмно-серая ткань · чёрные полозья',
    primaryHex: '#494d50',
    secondaryHex: '#252729',
    metalHex: '#242628',
    roughness: 0.88,
    metalness: 0.03,
    metalRoughness: 0.42,
    metalMetalness: 0.68,
    textureKind: 'fabric',
    shape: {
      silhouette: 'dining_upholstered',
      columns: 1,
      rows: 1,
      legStyle: 'sled',
      legHeightM: 0.45,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },
  {
    id: 'chair_cognac_brass',
    type: 'chair',
    label: 'Карамель и латунь',
    subtitle: 'Кресло коньячная кожа · латунь',
    primaryHex: '#9c6946',
    secondaryHex: '#5a3d2b',
    metalHex: '#b6965d',
    roughness: 0.54,
    metalness: 0.06,
    metalRoughness: 0.34,
    metalMetalness: 0.84,
    textureKind: 'matte',
    shape: {
      silhouette: 'lounge_armchair',
      columns: 1,
      rows: 1,
      legStyle: 'sled',
      legHeightM: 0.38,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },
  {
    id: 'chair_terracotta_oak',
    type: 'chair',
    label: 'Терракота пуф',
    subtitle: 'Мягкий пуф терракота · дубовый цоколь',
    primaryHex: '#ad6d55',
    secondaryHex: '#b89771',
    metalHex: '#b89771',
    roughness: 0.9,
    metalness: 0.02,
    metalRoughness: 0.56,
    metalMetalness: 0.08,
    textureKind: 'fabric',
    shape: {
      silhouette: 'round_pouf',
      columns: 1,
      rows: 1,
      legStyle: 'plinth',
      legHeightM: 0.05,
      glassZone: 'none',
      hasFluting: true,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },

  // --- TABLE ---
  {
    id: 'table_light_oak',
    type: 'table',
    label: 'Светлый дуб',
    subtitle: 'Прямоугольный дуб · чёрные опоры',
    primaryHex: '#ba9a74',
    secondaryHex: '#9e7e5b',
    metalHex: '#27292b',
    roughness: 0.56,
    metalness: 0.04,
    textureKind: 'wood',
    shape: {
      silhouette: 'rect_legs',
      columns: 2,
      rows: 1,
      legStyle: 'tapered',
      legHeightM: 0.72,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },
  {
    id: 'table_warm_walnut',
    type: 'table',
    label: 'Орех на опоре',
    subtitle: 'Круглый орех · рифлёное основание',
    primaryHex: '#6c4d39',
    secondaryHex: '#563c2c',
    metalHex: '#b69760',
    roughness: 0.5,
    metalness: 0.05,
    metalRoughness: 0.32,
    metalMetalness: 0.85,
    textureKind: 'wood',
    shape: {
      silhouette: 'round_pedestal',
      columns: 1,
      rows: 1,
      legStyle: 'plinth',
      legHeightM: 0.68,
      glassZone: 'none',
      hasFluting: true,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },
  {
    id: 'table_travertine',
    type: 'table',
    label: 'Травертин подиум',
    subtitle: 'Двухуровневый травертин · бронза',
    primaryHex: '#d5cbbd',
    secondaryHex: '#bfb3a1',
    metalHex: '#80684d',
    roughness: 0.62,
    metalness: 0.04,
    textureKind: 'stone',
    shape: {
      silhouette: 'nesting_plinth',
      columns: 2,
      rows: 2,
      legStyle: 'plinth',
      legHeightM: 0.34,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: true,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },
  {
    id: 'table_dark_slate',
    type: 'table',
    label: 'Стекло и графит',
    subtitle: 'Тонированное стекло · чёрный каркас',
    primaryHex: '#3f4346',
    secondaryHex: '#2b2e30',
    metalHex: '#202224',
    roughness: 0.48,
    metalness: 0.08,
    textureKind: 'stone',
    glassTintHex: '#33383c',
    shape: {
      silhouette: 'oval_glass',
      columns: 1,
      rows: 2,
      legStyle: 'straight',
      legHeightM: 0.38,
      glassZone: 'top',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    },
  },

  // --- STORAGE / CONSOLES / CABINETS ---
  {
    id: 'storage_cashmere',
    type: 'storage',
    label: 'Комод кашемир',
    subtitle: 'Матовый кашемир · 3 ящика · латунь',
    primaryHex: '#cbc0b2',
    secondaryHex: '#ddd5ca',
    metalHex: '#b69760',
    roughness: 0.66,
    metalness: 0.04,
    textureKind: 'matte',
    shape: {
      silhouette: 'chest_drawers',
      columns: 2,
      rows: 3,
      legStyle: 'straight',
      legHeightM: 0.14,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: true,
      handleStyle: 'horizontal_bar',
      hasBacklight: false,
    },
  },
  {
    id: 'storage_walnut',
    type: 'storage',
    label: 'Рифлёный орех',
    subtitle: 'Реечный фасад орех · опоры латунь',
    primaryHex: '#6e4f3b',
    secondaryHex: '#573d2d',
    metalHex: '#b69760',
    roughness: 0.52,
    metalness: 0.05,
    textureKind: 'wood',
    shape: {
      silhouette: 'sideboard_doors',
      columns: 3,
      rows: 1,
      legStyle: 'tapered',
      legHeightM: 0.18,
      glassZone: 'none',
      hasFluting: true,
      hasTopContrast: false,
      handleStyle: 'vertical_bar',
      hasBacklight: false,
    },
  },
  {
    id: 'storage_sage',
    type: 'storage',
    label: 'Витрина шалфей',
    subtitle: 'Шалфейный фасад · стекло и дуб',
    primaryHex: '#738272',
    secondaryHex: '#b89974',
    metalHex: '#252729',
    roughness: 0.62,
    metalness: 0.04,
    textureKind: 'matte',
    glassTintHex: '#2f3532',
    shape: {
      silhouette: 'vitrine_cabinet',
      columns: 2,
      rows: 2,
      legStyle: 'straight',
      legHeightM: 0.15,
      glassZone: 'top',
      hasFluting: false,
      hasTopContrast: true,
      handleStyle: 'vertical_bar',
      hasBacklight: true,
    },
  },
  {
    id: 'storage_graphite',
    type: 'storage',
    label: 'Витрина графит',
    subtitle: 'Стеклянные двери · подсветка полок',
    primaryHex: '#3a3d40',
    secondaryHex: '#252729',
    metalHex: '#1c1e20',
    roughness: 0.56,
    metalness: 0.06,
    textureKind: 'matte',
    glassTintHex: '#2c3135',
    shape: {
      silhouette: 'vitrine_cabinet',
      columns: 2,
      rows: 3,
      legStyle: 'sled',
      legHeightM: 0.16,
      glassZone: 'full',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'vertical_bar',
      hasBacklight: true,
    },
  },
  {
    id: 'storage_warm_white',
    type: 'storage',
    label: 'Стеллаж молочный',
    subtitle: 'Открытые полки · тёплый дуб',
    primaryHex: '#e4dfd6',
    secondaryHex: '#bc9d77',
    metalHex: '#2a2d2f',
    roughness: 0.62,
    metalness: 0.03,
    textureKind: 'matte',
    shape: {
      silhouette: 'open_shelving',
      columns: 2,
      rows: 3,
      legStyle: 'straight',
      legHeightM: 0.14,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: true,
      handleStyle: 'edge_pull',
      hasBacklight: false,
    },
  },

  // --- KITCHEN ---
  {
    id: 'kitchen_cashmere_oak',
    type: 'kitchen',
    label: 'Кашемир и дуб',
    subtitle: 'Фасады кашемир · светлый кварц',
    primaryHex: '#cbbeb0',
    secondaryHex: '#e2dcd2',
    metalHex: '#b39562',
    roughness: 0.62,
    metalness: 0.04,
    textureKind: 'matte',
  },
  {
    id: 'kitchen_sage_walnut',
    type: 'kitchen',
    label: 'Шалфей и орех',
    subtitle: 'Оливковые фасады · орех и латунь',
    primaryHex: '#7c8a79',
    secondaryHex: '#6c4e3a',
    metalHex: '#b69760',
    roughness: 0.6,
    metalness: 0.04,
    textureKind: 'matte',
  },
  {
    id: 'kitchen_graphite_stone',
    type: 'kitchen',
    label: 'Графит и камень',
    subtitle: 'Матовый графит · тёмная столешница',
    primaryHex: '#3d4043',
    secondaryHex: '#2d3033',
    metalHex: '#222426',
    roughness: 0.56,
    metalness: 0.06,
    textureKind: 'stone',
  },
  {
    id: 'kitchen_milk_minimal',
    type: 'kitchen',
    label: 'Молочный минимал',
    subtitle: 'Тёплый белый · тёплый дуб',
    primaryHex: '#e7e2d9',
    secondaryHex: '#bd9d77',
    metalHex: '#a7acb2',
    roughness: 0.58,
    metalness: 0.03,
    textureKind: 'matte',
  },

  // --- LIGHTING ---
  {
    id: 'light_brass_opal',
    type: 'lighting',
    label: 'Латунь и опал',
    subtitle: 'Матовая латунь · тёплый плафон',
    primaryHex: '#ede6d8',
    secondaryHex: '#d9ccb6',
    metalHex: '#bd9c62',
    roughness: 0.38,
    metalness: 0.05,
    metalRoughness: 0.3,
    metalMetalness: 0.88,
    textureKind: 'matte',
  },
  {
    id: 'light_matte_black',
    type: 'lighting',
    label: 'Чёрный минимал',
    subtitle: 'Графитовый корпус · матовый опал',
    primaryHex: '#252729',
    secondaryHex: '#ece6da',
    metalHex: '#222426',
    roughness: 0.44,
    metalness: 0.55,
    metalRoughness: 0.42,
    metalMetalness: 0.65,
    textureKind: 'matte',
  },
  {
    id: 'light_satin_chrome',
    type: 'lighting',
    label: 'Сатин хром',
    subtitle: 'Матовый никель · светлый плафон',
    primaryHex: '#eef0f2',
    secondaryHex: '#cfd3d7',
    metalHex: '#b4b9bf',
    roughness: 0.34,
    metalness: 0.12,
    metalRoughness: 0.28,
    metalMetalness: 0.88,
    textureKind: 'matte',
  },
  {
    id: 'light_warm_bronze',
    type: 'lighting',
    label: 'Бронза и лён',
    subtitle: 'Античная бронза · льняной абажур',
    primaryHex: '#dfd3c0',
    secondaryHex: '#8a6c4e',
    metalHex: '#826345',
    roughness: 0.78,
    metalness: 0.05,
    metalRoughness: 0.38,
    metalMetalness: 0.8,
    textureKind: 'fabric',
  },

  // --- ART & MIRRORS ---
  {
    id: 'art_sand_arch',
    type: 'art',
    label: 'Арка и песок',
    subtitle: 'Минимализм песок/крем · рама дуб',
    primaryHex: '#e6dfd3',
    secondaryHex: '#c3b19b',
    metalHex: '#b28f68',
    roughness: 0.82,
    metalness: 0.02,
    metalRoughness: 0.55,
    metalMetalness: 0.12,
    textureKind: 'art_arch',
  },
  {
    id: 'art_sage_botanic',
    type: 'art',
    label: 'Шалфей и охра',
    subtitle: 'Природные формы · рама латунь',
    primaryHex: '#dde0d8',
    secondaryHex: '#738270',
    metalHex: '#b6975e',
    roughness: 0.82,
    metalness: 0.02,
    metalRoughness: 0.34,
    metalMetalness: 0.82,
    textureKind: 'art_botanic',
  },
  {
    id: 'art_mono_graphite',
    type: 'art',
    label: 'Графика монохром',
    subtitle: 'Архитектурный контраст · чёрная рама',
    primaryHex: '#e5e3de',
    secondaryHex: '#35383b',
    metalHex: '#202224',
    roughness: 0.82,
    metalness: 0.02,
    metalRoughness: 0.42,
    metalMetalness: 0.6,
    textureKind: 'art_mono',
  },
  {
    id: 'art_terracotta_sun',
    type: 'art',
    label: 'Терракота и глина',
    subtitle: 'Тёплая абстракция · рама орех',
    primaryHex: '#e7dcd0',
    secondaryHex: '#b26b52',
    metalHex: '#694a36',
    roughness: 0.82,
    metalness: 0.02,
    metalRoughness: 0.52,
    metalMetalness: 0.08,
    textureKind: 'art_terracotta',
  },

  // --- MIRRORS ---
  {
    id: 'mirror_arch_brass',
    type: 'mirror',
    label: 'Арочное латунь',
    subtitle: 'Тонкая латунная рама · тёплая LED-подсветка',
    primaryHex: '#dde5ea',
    secondaryHex: '#c8d2d8',
    metalHex: '#c09e62',
    roughness: 0.08,
    metalness: 0.92,
    metalRoughness: 0.28,
    metalMetalness: 0.88,
    textureKind: 'matte',
    shape: {
      silhouette: 'arch_mirror',
      columns: 1,
      rows: 1,
      legStyle: 'floating',
      legHeightM: 0,
      glassZone: 'full',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: true,
    },
  },
  {
    id: 'mirror_arch_black',
    type: 'mirror',
    label: 'Арочное графит',
    subtitle: 'Чёрный тонкий профиль · контурный свет',
    primaryHex: '#dce3e8',
    secondaryHex: '#c5ced4',
    metalHex: '#202224',
    roughness: 0.08,
    metalness: 0.92,
    metalRoughness: 0.38,
    metalMetalness: 0.72,
    textureKind: 'matte',
    shape: {
      silhouette: 'arch_mirror',
      columns: 1,
      rows: 1,
      legStyle: 'floating',
      legHeightM: 0,
      glassZone: 'full',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: true,
    },
  },
  {
    id: 'mirror_round_oak',
    type: 'mirror',
    label: 'Круглое дуб',
    subtitle: 'Круглое зеркало · рама светлый дуб',
    primaryHex: '#dfe6ea',
    secondaryHex: '#cad3d8',
    metalHex: '#b4926c',
    roughness: 0.08,
    metalness: 0.92,
    metalRoughness: 0.56,
    metalMetalness: 0.08,
    textureKind: 'wood',
    shape: {
      silhouette: 'round_mirror',
      columns: 1,
      rows: 1,
      legStyle: 'floating',
      legHeightM: 0,
      glassZone: 'full',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: true,
    },
  },
  {
    id: 'mirror_rect_bronze',
    type: 'mirror',
    label: 'Высокое бронза',
    subtitle: 'Прямоугольное в рост · матовая бронза',
    primaryHex: '#dce4e8',
    secondaryHex: '#c6cfd5',
    metalHex: '#846549',
    roughness: 0.08,
    metalness: 0.92,
    metalRoughness: 0.34,
    metalMetalness: 0.82,
    textureKind: 'matte',
  },

  // --- RUGS ---
  {
    id: 'rug_milk_wool',
    type: 'rug',
    label: 'Молочная шерсть',
    subtitle: 'Мягкий светлый ворс · рогожка',
    primaryHex: '#e4ded3',
    secondaryHex: '#d3cabd',
    metalHex: '#c5bbb0',
    roughness: 0.95,
    metalness: 0.01,
    textureKind: 'fabric',
  },
  {
    id: 'rug_warm_sand',
    type: 'rug',
    label: 'Тёплый песок',
    subtitle: 'Песочное плетение · кант кашемир',
    primaryHex: '#cbbca8',
    secondaryHex: '#b6a58e',
    metalHex: '#9f8c76',
    roughness: 0.94,
    metalness: 0.01,
    textureKind: 'fabric',
  },
  {
    id: 'rug_sage_weave',
    type: 'rug',
    label: 'Шалфей и лён',
    subtitle: 'Спокойный оливково-серый ковёр',
    primaryHex: '#94a191',
    secondaryHex: '#7d8a7a',
    metalHex: '#6c7969',
    roughness: 0.94,
    metalness: 0.01,
    textureKind: 'fabric',
  },
  {
    id: 'rug_smoke_graphite',
    type: 'rug',
    label: 'Дымчатый графит',
    subtitle: 'Плотный фактурный графит',
    primaryHex: '#565a5e',
    secondaryHex: '#434649',
    metalHex: '#34373a',
    roughness: 0.93,
    metalness: 0.02,
    textureKind: 'fabric',
  },

  // --- CURTAINS (TEXTILE) ---
  {
    id: 'textile_milk_linen',
    type: 'textile',
    label: 'Молочный лён',
    subtitle: 'Светлые портьеры · натуральный лён',
    primaryHex: '#e4ded3',
    secondaryHex: '#d4ccc0',
    metalHex: '#c8bfb2',
    roughness: 0.94,
    metalness: 0.01,
    textureKind: 'fabric',
  },
  {
    id: 'textile_warm_sand',
    type: 'textile',
    label: 'Тёплый песок',
    subtitle: 'Плотный блэкаут · песочный кашемир',
    primaryHex: '#cbbca8',
    secondaryHex: '#b9a892',
    metalHex: '#a5927c',
    roughness: 0.94,
    metalness: 0.01,
    textureKind: 'fabric',
  },
  {
    id: 'textile_sage_mist',
    type: 'textile',
    label: 'Шалфейная дымка',
    subtitle: 'Приглушённый серо-оливковый бархат',
    primaryHex: '#9aa697',
    secondaryHex: '#849181',
    metalHex: '#717f6e',
    roughness: 0.93,
    metalness: 0.01,
    textureKind: 'fabric',
  },
  {
    id: 'textile_smoke_grey',
    type: 'textile',
    label: 'Дымчатый графит',
    subtitle: 'Глубокий графитово-серый блэкаут',
    primaryHex: '#5c6064',
    secondaryHex: '#484b4e',
    metalHex: '#383b3e',
    roughness: 0.92,
    metalness: 0.02,
    textureKind: 'fabric',
  },

  // --- ARCHITECTURAL PARTITIONS ---
  {
    id: 'partition_walnut_copper',
    type: 'partition',
    label: 'Орех и медь',
    subtitle: 'Шпон ореха · медный профиль и стекло',
    primaryHex: '#6c4d39',
    secondaryHex: '#583d2c',
    metalHex: '#b37552',
    roughness: 0.52,
    metalness: 0.05,
    metalRoughness: 0.34,
    metalMetalness: 0.84,
    textureKind: 'wood',
    glassTintHex: '#d6e2e6',
  },
  {
    id: 'partition_black_loft',
    type: 'partition',
    label: 'Чёрный лофт',
    subtitle: 'Графитовый металл · дымчатое стекло',
    primaryHex: '#2e3134',
    secondaryHex: '#232628',
    metalHex: '#1e2022',
    roughness: 0.54,
    metalness: 0.08,
    metalRoughness: 0.4,
    metalMetalness: 0.74,
    textureKind: 'matte',
    glassTintHex: '#535c62',
  },
  {
    id: 'partition_oak_champagne',
    type: 'partition',
    label: 'Светлый дуб и шампань',
    subtitle: 'Натуральный дуб · профиль шампань',
    primaryHex: '#c2a37d',
    secondaryHex: '#ae8e68',
    metalHex: '#baa27d',
    roughness: 0.56,
    metalness: 0.04,
    metalRoughness: 0.32,
    metalMetalness: 0.82,
    textureKind: 'wood',
    glassTintHex: '#e4ecea',
  },
  {
    id: 'partition_sage_brass',
    type: 'partition',
    label: 'Шалфей и латунь',
    subtitle: 'Шалфейные панели · матовая латунь',
    primaryHex: '#738272',
    secondaryHex: '#5d6b5c',
    metalHex: '#b8985f',
    roughness: 0.6,
    metalness: 0.04,
    metalRoughness: 0.32,
    metalMetalness: 0.85,
    textureKind: 'matte',
    glassTintHex: '#cad8ce',
  },

  // --- TV ZONE ---
  {
    id: 'media_walnut_copper',
    type: 'media_decor',
    label: 'Орех и медь',
    subtitle: 'Тёплые рейки ореха · медный акцент',
    primaryHex: '#6c4d39',
    secondaryHex: '#d5cbbd',
    metalHex: '#b37552',
    roughness: 0.54,
    metalness: 0.06,
    metalRoughness: 0.34,
    metalMetalness: 0.84,
    textureKind: 'wood',
    glassTintHex: '#d6e0e3',
  },
  {
    id: 'media_dark_slate',
    type: 'media_decor',
    label: 'Тёмный сланец',
    subtitle: 'Графитовый камень · чёрная рамка',
    primaryHex: '#3e4245',
    secondaryHex: '#2b2e30',
    metalHex: '#202224',
    roughness: 0.5,
    metalness: 0.08,
    metalRoughness: 0.4,
    metalMetalness: 0.72,
    textureKind: 'stone',
    glassTintHex: '#5b6368',
  },
  {
    id: 'media_light_travertine',
    type: 'media_decor',
    label: 'Светлый травертин',
    subtitle: 'Травертин · профиль шампань',
    primaryHex: '#d6cdc0',
    secondaryHex: '#e6e0d6',
    metalHex: '#b8a07a',
    roughness: 0.6,
    metalness: 0.04,
    metalRoughness: 0.34,
    metalMetalness: 0.8,
    textureKind: 'stone',
    glassTintHex: '#e6ece8',
  },
  {
    id: 'media_sage_brass',
    type: 'media_decor',
    label: 'Шалфей и латунь',
    subtitle: 'Шалфейный акцент · матовая латунь',
    primaryHex: '#798777',
    secondaryHex: '#d5cbbd',
    metalHex: '#b79760',
    roughness: 0.62,
    metalness: 0.04,
    metalRoughness: 0.32,
    metalMetalness: 0.85,
    textureKind: 'matte',
    glassTintHex: '#cad7cd',
  },

  // --- TABLETOP DECOR ---
  {
    id: 'decor_travertine_brass',
    type: 'decor',
    label: 'Травертин и латунь',
    subtitle: 'Светлая керамика · бежевые альбомы',
    primaryHex: '#e5dfd5',
    secondaryHex: '#c5b8a5',
    metalHex: '#b79760',
    roughness: 0.48,
    metalness: 0.04,
    textureKind: 'stone',
  },
  {
    id: 'decor_terracotta_oak',
    type: 'decor',
    label: 'Терракота и глина',
    subtitle: 'Матовая глина · тёплые книги',
    primaryHex: '#b36e54',
    secondaryHex: '#dcd3c5',
    metalHex: '#7e593f',
    roughness: 0.68,
    metalness: 0.02,
    textureKind: 'matte',
  },
  {
    id: 'decor_graphite_stone',
    type: 'decor',
    label: 'Графит и камень',
    subtitle: 'Чёрная керамика · каменный контраст',
    primaryHex: '#35383b',
    secondaryHex: '#c8c3ba',
    metalHex: '#202224',
    roughness: 0.42,
    metalness: 0.08,
    textureKind: 'stone',
  },
  {
    id: 'decor_sage_ceramic',
    type: 'decor',
    label: 'Шалфей керамика',
    subtitle: 'Глазурованный шалфей · молочные тома',
    primaryHex: '#7b8a78',
    secondaryHex: '#e4dfd6',
    metalHex: '#b49662',
    roughness: 0.44,
    metalness: 0.04,
    textureKind: 'matte',
  },

  // --- BATHROOM FIXTURES ---
  {
    id: 'bath_chrome_classic',
    type: 'bath_fixtures',
    label: 'Хром и светлый дуб',
    subtitle: 'Полированный хром · натуральный дуб',
    primaryHex: '#c8a578',
    secondaryHex: '#f6f6f3',
    metalHex: '#dfe4e8',
    roughness: 0.54,
    metalness: 0.04,
    secondaryRoughness: 0.12,
    metalRoughness: 0.14,
    metalMetalness: 0.96,
    textureKind: 'wood',
    glassTintHex: '#dce8ec',
  },
  {
    id: 'bath_matte_black',
    type: 'bath_fixtures',
    label: 'Чёрный матовый',
    subtitle: 'Чёрная сантехника · графитовый профиль',
    primaryHex: '#2f3235',
    secondaryHex: '#e6e4de',
    metalHex: '#181a1c',
    roughness: 0.54,
    metalness: 0.08,
    secondaryRoughness: 0.18,
    metalRoughness: 0.56,
    metalMetalness: 0.28,
    textureKind: 'matte',
    glassTintHex: '#5e6870',
  },
  {
    id: 'bath_brushed_brass',
    type: 'bath_fixtures',
    label: 'Матовая латунь',
    subtitle: 'Тёплая латунь · американский орех',
    primaryHex: '#63422e',
    secondaryHex: '#f4efe6',
    metalHex: '#d4a94f',
    roughness: 0.5,
    metalness: 0.05,
    secondaryRoughness: 0.14,
    metalRoughness: 0.24,
    metalMetalness: 0.92,
    textureKind: 'wood',
    glassTintHex: '#e6decb',
  },
  {
    id: 'bath_satin_sage',
    type: 'bath_fixtures',
    label: 'Сатин и шалфей',
    subtitle: 'Шалфейная отделка · тёплый сатин',
    primaryHex: '#6c806d',
    secondaryHex: '#eef2ec',
    metalHex: '#7e9583',
    roughness: 0.56,
    metalness: 0.04,
    secondaryRoughness: 0.15,
    metalRoughness: 0.34,
    metalMetalness: 0.72,
    textureKind: 'matte',
    glassTintHex: '#bfd3c6',
  },
];

const VARIANT_BY_ID = new Map<string, ObjectVariantSpec>();
const VARIANTS_BY_TYPE = new Map<EditableObjectType, ObjectVariantSpec[]>();
let customVariantCatalog: ObjectVariantSpec[] = [];

function rebuildVariantIndexes(): void {
  VARIANT_BY_ID.clear();
  for (const t of EDITABLE_TYPE_ORDER) {
    VARIANTS_BY_TYPE.set(t, []);
  }
  // Custom user-synced items appear first in every type bucket so they are immediately selectable
  const combined = [...customVariantCatalog, ...OBJECT_VARIANT_CATALOG];
  for (const spec of combined) {
    VARIANT_BY_ID.set(spec.id, spec);
    const list = VARIANTS_BY_TYPE.get(spec.type);
    if (list) list.push(spec);
  }
}

rebuildVariantIndexes();

const SAFE_DATA_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * Registers user-synced custom interior variants into the live 3D catalog so they immediately
 * appear in the "Заменить" mini-photo grid and render in the 3D scene.
 */
export function registerCustomVariants(specs: ObjectVariantSpec[]): void {
  customVariantCatalog = specs.filter(
    (s) => Boolean(s.id) && EDITABLE_TYPE_ORDER.includes(s.type)
  );
  rebuildVariantIndexes();
}

export function getVariantSignature(spec: ObjectVariantSpec): string {
  const dims = spec.dimensionsM ? spec.dimensionsM.join(',') : '';
  const sh = spec.shape
    ? `${spec.shape.silhouette}:${spec.shape.columns}x${spec.shape.rows}:${spec.shape.bays?.join(',') ?? ''}:${spec.shape.glassFrameStyle ?? ''}:${spec.shape.upperSectionRatio ?? ''}:${spec.shape.legStyle}:${spec.shape.legHeightM}:${spec.shape.glassZone}:${spec.shape.hasFluting ? 1 : 0}:${spec.shape.hasTopContrast ? 1 : 0}:${spec.shape.handleStyle}:${spec.shape.hasBacklight ? 1 : 0}`
    : '';
  return `${spec.id}|${spec.primaryHex}|${spec.secondaryHex}|${spec.metalHex}|${spec.roughness}|${spec.metalness}|${spec.textureKind}|${spec.glassTintHex ?? ''}|${dims}|${sh}|${spec.photoUrl ? spec.photoUrl.length : 0}|${spec.updatedAt ?? 0}`;
}

/**
 * Resolves a rich 3D architectural shape specification for any variant.
 * Uses the explicit Gemini/catalog `spec.shape` when present, or deterministically infers
 * the best matching silhouette from Russian/English title, subtitle, glassTintHex & dimensions.
 */
export function inferShapeSpecForVariant(spec: ObjectVariantSpec): VariantShapeSpec | null {
  if (spec.shape) return spec.shape;

  const text = `${spec.label} ${spec.subtitle} ${spec.specsText ?? ''}`.toLowerCase();
  const dims = spec.dimensionsM;
  const widthM = dims?.[0] ?? 1.2;
  const heightM = dims?.[1] ?? 0.9;

  if (spec.type === 'storage') {
    const isVitrine =
      Boolean(spec.glassTintHex) ||
      /витрин|стекл|vitrine|glass|сервант|буфет|reg\d*w/i.test(text);
    const isShelf = /стеллаж|полк|книжн|etagere|bookcase|shelf/i.test(text);
    const isDresser = /комод|ящик|dresser|chest|drawer|тумб/i.test(text);
    const isWardrobe = /шкаф-купе|гардероб|платян|wardrobe/i.test(text) || (!isVitrine && heightM >= 1.85);
    const isFloating = /подвесн|настенн|floating|консоль/i.test(text) && heightM < 0.55;
    const hasFluting = /рифл|реек|рейк|flut|slat/i.test(text);

    if (isVitrine) {
      const cols = widthM >= 1.35 ? 3 : widthM >= 0.72 ? 2 : 1;
      const rows = heightM >= 1.75 ? 3 : 2;
      const isLeftGlass = /лев|1w|reg1w/i.test(text);
      const isFullGlass = /полн|весь|3w/i.test(text) && !/2d|ящик/i.test(text);
      return {
        silhouette: 'vitrine_cabinet',
        columns: cols,
        rows,
        legStyle: heightM < 1.9 ? 'straight' : 'plinth',
        legHeightM: heightM < 1.9 ? 0.14 : 0.06,
        glassZone: isFullGlass ? 'full' : isLeftGlass ? 'left' : 'top',
        hasFluting,
        hasTopContrast: spec.secondaryHex.toLowerCase() !== spec.primaryHex.toLowerCase(),
        handleStyle: 'vertical_bar',
        hasBacklight: true,
      };
    }
    if (isShelf) {
      return {
        silhouette: 'open_shelving',
        columns: widthM >= 1.1 ? 2 : 1,
        rows: Math.max(2, Math.min(4, Math.round(heightM / 0.42))),
        legStyle: 'straight',
        legHeightM: 0.12,
        glassZone: 'none',
        hasFluting,
        hasTopContrast: false,
        handleStyle: 'edge_pull',
        hasBacklight: false,
      };
    }
    if (isFloating) {
      return {
        silhouette: 'floating_console',
        columns: widthM >= 1.5 ? 3 : 2,
        rows: 1,
        legStyle: 'floating',
        legHeightM: 0,
        glassZone: 'none',
        hasFluting,
        hasTopContrast: true,
        handleStyle: 'edge_pull',
        hasBacklight: true,
      };
    }
    if (isWardrobe) {
      return {
        silhouette: 'wardrobe_tall',
        columns: widthM >= 1.6 ? 3 : 2,
        rows: 1,
        legStyle: 'plinth',
        legHeightM: 0.06,
        glassZone: 'none',
        hasFluting,
        hasTopContrast: false,
        handleStyle: 'vertical_bar',
        hasBacklight: false,
      };
    }
    if (isDresser) {
      return {
        silhouette: 'chest_drawers',
        columns: widthM >= 1.15 ? 2 : 1,
        rows: heightM >= 0.95 ? 4 : 3,
        legStyle: 'straight',
        legHeightM: 0.14,
        glassZone: 'none',
        hasFluting,
        hasTopContrast: true,
        handleStyle: 'horizontal_bar',
        hasBacklight: false,
      };
    }
    return {
      silhouette: 'sideboard_doors',
      columns: widthM >= 1.5 ? 3 : 2,
      rows: 1,
      legStyle: 'tapered',
      legHeightM: 0.16,
      glassZone: 'none',
      hasFluting,
      hasTopContrast: true,
      handleStyle: 'vertical_bar',
      hasBacklight: false,
    };
  }

  if (spec.type === 'table') {
    if (spec.glassTintHex || /стекл|glass/i.test(text)) {
      return {
        silhouette: 'oval_glass',
        columns: 1,
        rows: 2,
        legStyle: 'straight',
        legHeightM: 0.42,
        glassZone: 'top',
        hasFluting: false,
        hasTopContrast: false,
        handleStyle: 'none',
        hasBacklight: false,
      };
    }
    if (/кругл|овал|round|pedestal|опор/i.test(text)) {
      return {
        silhouette: 'round_pedestal',
        columns: 1,
        rows: 1,
        legStyle: 'plinth',
        legHeightM: 0.68,
        glassZone: 'none',
        hasFluting: /рифл|flut/i.test(text),
        hasTopContrast: false,
        handleStyle: 'none',
        hasBacklight: false,
      };
    }
    return {
      silhouette: 'rect_legs',
      columns: 2,
      rows: 1,
      legStyle: 'tapered',
      legHeightM: 0.7,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    };
  }

  if (spec.type === 'chair') {
    if (/пуф|оттоман|банкет|pouf|ottoman/i.test(text)) {
      return {
        silhouette: 'round_pouf',
        columns: 1,
        rows: 1,
        legStyle: 'plinth',
        legHeightM: 0.05,
        glassZone: 'none',
        hasFluting: false,
        hasTopContrast: false,
        handleStyle: 'none',
        hasBacklight: false,
      };
    }
    if (/кресл|armchair|lounge|подлокот/i.test(text)) {
      return {
        silhouette: 'lounge_armchair',
        columns: 1,
        rows: 1,
        legStyle: 'tapered',
        legHeightM: 0.36,
        glassZone: 'none',
        hasFluting: false,
        hasTopContrast: false,
        handleStyle: 'none',
        hasBacklight: false,
      };
    }
    return {
      silhouette: 'dining_upholstered',
      columns: 1,
      rows: 1,
      legStyle: 'tapered',
      legHeightM: 0.45,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    };
  }

  if (spec.type === 'sofa' && spec.isCustom) {
    const isCorner = /углов|оттоман|l-образ|sectional|corner/i.test(text);
    const isModular = /модул|низк|modular/i.test(text);
    return {
      silhouette: isCorner ? 'l_sectional' : isModular ? 'low_modular' : 'straight_legs',
      columns: widthM >= 2.4 ? 3 : 2,
      rows: 1,
      legStyle: isModular ? 'plinth' : 'straight',
      legHeightM: isModular ? 0.04 : 0.14,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    };
  }

  if (spec.type === 'bed' && spec.isCustom) {
    const isWood = spec.textureKind === 'wood' || /дерев|дуб|орех|массив|wood/i.test(text);
    return {
      silhouette: isWood ? 'wood_frame_bed' : 'upholstered_panel',
      columns: 2,
      rows: 1,
      legStyle: 'straight',
      legHeightM: 0.12,
      glassZone: 'none',
      hasFluting: /стег|рейк|рифл|channel/i.test(text),
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    };
  }

  if (spec.type === 'lighting' && spec.isCustom) {
    if (/подвес|люстр|pendant|chandelier/i.test(text)) {
      return {
        silhouette: /линейн|бар|рельс|linear/i.test(text) ? 'linear_pendant' : 'globe_pendant',
        columns: 1,
        rows: 1,
        legStyle: 'floating',
        legHeightM: 0,
        glassZone: 'none',
        hasFluting: false,
        hasTopContrast: false,
        handleStyle: 'none',
        hasBacklight: true,
      };
    }
    if (/бра|настен|sconce/i.test(text)) {
      return {
        silhouette: 'wall_sconce',
        columns: 1,
        rows: 1,
        legStyle: 'floating',
        legHeightM: 0,
        glassZone: 'none',
        hasFluting: false,
        hasTopContrast: false,
        handleStyle: 'none',
        hasBacklight: true,
      };
    }
    return {
      silhouette: /арк|дуг|arc/i.test(text) ? 'arc_floor_lamp' : 'tripod_shade',
      columns: 1,
      rows: 1,
      legStyle: 'straight',
      legHeightM: 0,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: true,
    };
  }

  if (spec.type === 'mirror' && spec.isCustom) {
    return {
      silhouette: /круг|round/i.test(text) ? 'round_mirror' : 'arch_mirror',
      columns: 1,
      rows: 1,
      legStyle: 'floating',
      legHeightM: 0,
      glassZone: 'full',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: /подсвет|led/i.test(text) || true,
    };
  }

  if (spec.type === 'art' && spec.isCustom) {
    if (/зеркал|mirror/i.test(text)) {
      return {
        silhouette: /круг|round/i.test(text) ? 'round_mirror' : 'arch_mirror',
        columns: 1,
        rows: 1,
        legStyle: 'floating',
        legHeightM: 0,
        glassZone: 'full',
        hasFluting: false,
        hasTopContrast: false,
        handleStyle: 'none',
        hasBacklight: /подсвет|led/i.test(text),
      };
    }
    return {
      silhouette: 'framed_art',
      columns: 1,
      rows: 1,
      legStyle: 'floating',
      legHeightM: 0,
      glassZone: 'none',
      hasFluting: false,
      hasTopContrast: false,
      handleStyle: 'none',
      hasBacklight: false,
    };
  }

  return null;
}

const LEGACY_VARIANT_MIGRATIONS: Record<string, Record<string, string>> = {
  arch_partition: {
    media_walnut_copper: 'partition_walnut_copper',
    media_dark_slate: 'partition_black_loft',
    media_light_travertine: 'partition_oak_champagne',
    media_sage_brass: 'partition_sage_brass',
  },
  entry_mirror: {
    art_sand_arch: 'mirror_round_oak',
    art_sage_botanic: 'mirror_arch_brass',
    art_mono_graphite: 'mirror_arch_black',
    art_terracotta_sun: 'mirror_rect_bronze',
  },
  living_rug: {
    textile_milk_linen: 'rug_milk_wool',
    textile_warm_sand: 'rug_warm_sand',
    textile_sage_mist: 'rug_sage_weave',
    textile_smoke_grey: 'rug_smoke_graphite',
  },
  bed_rug: {
    textile_milk_linen: 'rug_milk_wool',
    textile_warm_sand: 'rug_warm_sand',
    textile_sage_mist: 'rug_sage_weave',
    textile_smoke_grey: 'rug_smoke_graphite',
  },
  tv_decor: {
    media_walnut_copper: 'decor_terracotta_oak',
    media_dark_slate: 'decor_graphite_stone',
    media_light_travertine: 'decor_travertine_brass',
    media_sage_brass: 'decor_sage_ceramic',
  },
};

/**
 * Seamlessly maps legacy saved variant IDs from earlier combined categories
 * (e.g. arch_partition previously using media_* variants) to the new dedicated category IDs.
 */
export function migrateLegacyVariantId(objectId: string, variantId: string): string {
  return LEGACY_VARIANT_MIGRATIONS[objectId]?.[variantId] ?? variantId;
}

const dynamicEditableTypeMap = new Map<string, EditableObjectType>();

export function registerDynamicEditableType(id: string, type: EditableObjectType): void {
  dynamicEditableTypeMap.set(id, type);
}

export function unregisterDynamicEditableType(id: string): void {
  dynamicEditableTypeMap.delete(id);
}

export function getEditableType(id: string): EditableObjectType {
  return EDITABLE_OBJECT_TYPE_MAP[id] ?? dynamicEditableTypeMap.get(id) ?? 'storage';
}

export function getEditableTypeInfo(type: EditableObjectType): EditableTypeInfo {
  return EDITABLE_TYPE_META[type];
}

export function getVariantsForType(type: EditableObjectType): ObjectVariantSpec[] {
  return VARIANTS_BY_TYPE.get(type) ?? [];
}

export function getVariantById(variantId: string | undefined): ObjectVariantSpec | null {
  if (!variantId) return null;
  return VARIANT_BY_ID.get(variantId) ?? null;
}

export function isValidVariantForObject(objectId: string, variantId: string): boolean {
  const migrated = migrateLegacyVariantId(objectId, variantId);
  const spec = VARIANT_BY_ID.get(migrated);
  if (!spec) return false;
  return spec.type === getEditableType(objectId);
}

export type EditableDesignGroupKey =
  | 'always'
  | 'sofa'
  | 'tvZone'
  | 'livingAny'
  | 'kitchen'
  | 'bedroom'
  | 'entryFurniture'
  | 'curtains';

const EDITABLE_DESIGN_GROUP_MAP: Record<string, EditableDesignGroupKey> = {
  // Always present in the apartment shell / finished bathroom
  bath_drain: 'always',
  bath_tub: 'always',
  bath_mixer: 'always',
  bath_vanity: 'always',
  bath_shower_screen: 'always',
  bath_cabinet: 'always',
  bath_flush_plate: 'always',
  bath_towel_warmer: 'always',
  arch_partition: 'always',

  // Living room TV zone
  tv_console: 'tvZone',
  tv_backdrop: 'tvZone',
  tv_screen: 'tvZone',
  tv_decor: 'tvZone',

  // Living room shared console & gallery art (visible when either tvZone or sofa is active)
  living_console: 'livingAny',
  living_art_l: 'livingAny',
  living_art_r: 'livingAny',

  // Living room sofa group
  living_rug: 'sofa',
  sofa_main: 'sofa',
  coffee_table: 'sofa',
  floor_lamp: 'sofa',

  // Kitchen & dining group
  kitchen_fridge: 'kitchen',
  kitchen_lower: 'kitchen',
  kitchen_upper: 'kitchen',
  dining_table: 'kitchen',
  dining_chair_1: 'kitchen',
  dining_chair_2: 'kitchen',
  dining_chair_3: 'kitchen',
  dining_chair_4: 'kitchen',
  dining_pendant: 'kitchen',

  // Bedroom & closet group
  bed_rug: 'bedroom',
  bed_main: 'bedroom',
  nightstand_l: 'bedroom',
  nightstand_r: 'bedroom',
  bed_sconce_l: 'bedroom',
  bed_sconce_r: 'bedroom',
  study_desk: 'bedroom',
  desk_chair: 'bedroom',
  bedroom_dresser: 'bedroom',
  bedroom_art: 'bedroom',
  closet_wardrobe: 'bedroom',

  // Entry hallway group
  entry_wardrobe: 'entryFurniture',
  entry_mirror: 'entryFurniture',
  entry_console: 'entryFurniture',
  entry_pouf: 'entryFurniture',

  // Curtains group
  curtains_living: 'curtains',
  curtains_kitchen: 'curtains',
  curtains_bedroom: 'curtains',
};

export function getEditableDesignGroup(objectId: string): EditableDesignGroupKey {
  return EDITABLE_DESIGN_GROUP_MAP[objectId] ?? 'always';
}

export function isEditableObjectEnabledInDesign(
  objectId: string,
  design: {
    tvZone: string;
    sofa: string;
    kitchen: string;
    bedroom: string;
    entryFurniture: boolean;
    curtains: boolean;
  }
): boolean {
  const grp = getEditableDesignGroup(objectId);
  if (grp === 'always') return true;
  if (grp === 'sofa') return design.sofa !== 'none';
  if (grp === 'tvZone') return design.tvZone !== 'none';
  if (grp === 'livingAny') return design.tvZone !== 'none' || design.sofa !== 'none';
  if (grp === 'kitchen') return design.kitchen !== 'none';
  if (grp === 'bedroom') return design.bedroom !== 'none';
  if (grp === 'entryFurniture') return design.entryFurniture;
  if (grp === 'curtains') return design.curtains;
  return true;
}

export function groupEditableIdsByType(
  ids: string[]
): Array<{ type: EditableObjectType; info: EditableTypeInfo; ids: string[] }> {
  const buckets = new Map<EditableObjectType, string[]>();
  for (const id of ids) {
    const t = getEditableType(id);
    const list = buckets.get(t);
    if (list) list.push(id);
    else buckets.set(t, [id]);
  }
  const result: Array<{ type: EditableObjectType; info: EditableTypeInfo; ids: string[] }> = [];
  for (const t of EDITABLE_TYPE_ORDER) {
    const list = buckets.get(t);
    if (list && list.length > 0) {
      result.push({ type: t, info: EDITABLE_TYPE_META[t], ids: list });
    }
  }
  return result;
}

// ============================================================================
// HIGH-CRAFT STUDIO MINI-PHOTO THUMBNAIL RENDERER (CACHED PNG DATA URLS)
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `rgb(${cl(r)}, ${cl(g)}, ${cl(b)})`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

const thumbnailCache = new Map<string, string>();

function resolveThumbKind(spec: ObjectVariantSpec, objectId?: string): string {
  if (spec.type === 'lighting') {
    if (objectId === 'dining_pendant') return 'pendant';
    if (objectId === 'bed_sconce_l' || objectId === 'bed_sconce_r') return 'sconce';
    return 'floor_lamp';
  }
  if (spec.type === 'bath_fixtures') {
    if (objectId === 'bath_tub') return 'bath_tub';
    if (objectId === 'bath_shower_screen') return 'bath_shower_screen';
    if (objectId === 'bath_mixer') return 'bath_mixer';
    if (objectId === 'bath_towel_warmer') return 'bath_towel_warmer';
    if (objectId === 'bath_flush_plate') return 'bath_flush_plate';
    if (objectId === 'bath_drain') return 'bath_drain';
    return 'bath_vanity';
  }
  if (spec.type === 'media_decor') {
    if (objectId === 'tv_screen') return 'tv_screen';
    return 'tv_backdrop';
  }
  if (spec.type === 'kitchen') {
    if (objectId === 'kitchen_fridge') return 'kitchen_fridge';
    if (objectId === 'kitchen_upper') return 'kitchen_upper';
    return 'kitchen_full';
  }
  if (spec.shape?.silhouette) {
    return spec.shape.silhouette;
  }
  return 'default';
}

/**
 * Generates a studio-lit product mini-photo (160x108 PNG data URL) for any catalog variant.
 * When `objectId` is supplied, multi-object categories (lighting, bath_fixtures, media_decor, kitchen)
 * render the exact matching fixture silhouette so the user never sees a wrong item preview.
 */
export function getVariantThumbnail(spec: ObjectVariantSpec, objectId?: string): string {
  if (spec.thumbnailUrl && SAFE_DATA_IMAGE_REGEX.test(spec.thumbnailUrl)) {
    return spec.thumbnailUrl;
  }

  const thumbKind = resolveThumbKind(spec, objectId);
  const cacheKey = `${spec.id}::${thumbKind}`;
  const cached = thumbnailCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document === 'undefined') return '';

  const w = 160;
  const h = 108;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Studio cyclorama backdrop (warm architectural dark-to-mid studio lighting)
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#2a2e2c');
  bg.addColorStop(0.68, '#1f2321');
  bg.addColorStop(1, '#151817');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle top studio softbox glow
  const glow = ctx.createRadialGradient(w * 0.5, 16, 4, w * 0.5, 24, 92);
  glow.addColorStop(0, 'rgba(255, 248, 236, 0.14)');
  glow.addColorStop(1, 'rgba(255, 248, 236, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Subtle floor plane horizon line
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 74, w, 1);

  // Soft floor contact shadow
  const drawFloorShadow = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const sg = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    sg.addColorStop(0, 'rgba(0,0,0,0.52)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const pMain = spec.primaryHex;
  const pLight = shadeHex(spec.primaryHex, 1.14);
  const pDark = shadeHex(spec.primaryHex, 0.78);
  const pDeep = shadeHex(spec.primaryHex, 0.62);
  const sMain = spec.secondaryHex;
  const sLight = shadeHex(spec.secondaryHex, 1.12);
  const sDark = shadeHex(spec.secondaryHex, 0.78);
  const mMain = spec.metalHex;
  const mLight = shadeHex(spec.metalHex, 1.24);
  const mDark = shadeHex(spec.metalHex, 0.72);

  switch (spec.type) {
    case 'sofa': {
      drawFloorShadow(80, 86, 62, 13);
      ctx.fillStyle = mDark;
      ctx.fillRect(26, 78, 5, 6);
      ctx.fillRect(128, 78, 5, 6);
      ctx.fillRect(72, 82, 5, 5);
      roundedRect(ctx, 22, 34, 116, 32, 7);
      ctx.fillStyle = pDark;
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        roundedRect(ctx, 28 + i * 35, 37, 33, 24, 6);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      roundedRect(ctx, 20, 62, 120, 17, 4);
      ctx.fillStyle = pDark;
      ctx.fill();
      roundedRect(ctx, 26, 56, 74, 15, 5);
      ctx.fillStyle = pLight;
      ctx.fill();
      roundedRect(ctx, 101, 56, 34, 24, 5);
      ctx.fillStyle = pLight;
      ctx.fill();
      roundedRect(ctx, 17, 47, 13, 31, 4);
      ctx.fillStyle = pMain;
      ctx.fill();
      roundedRect(ctx, 130, 47, 13, 31, 4);
      ctx.fillStyle = pMain;
      ctx.fill();
      roundedRect(ctx, 32, 46, 15, 13, 3);
      ctx.fillStyle = sMain;
      ctx.fill();
      roundedRect(ctx, 108, 45, 16, 13, 3);
      ctx.fillStyle = sMain;
      ctx.fill();
      break;
    }

    case 'bed': {
      drawFloorShadow(80, 88, 60, 12);
      roundedRect(ctx, 26, 20, 108, 42, 6);
      ctx.fillStyle = pMain;
      ctx.fill();
      ctx.strokeStyle = pDark;
      ctx.lineWidth = 1;
      for (let x = 44; x <= 116; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x, 60);
        ctx.stroke();
      }
      roundedRect(ctx, 22, 64, 116, 18, 3);
      ctx.fillStyle = mMain;
      ctx.fill();
      roundedRect(ctx, 26, 51, 108, 22, 4);
      ctx.fillStyle = '#ebe6dd';
      ctx.fill();
      roundedRect(ctx, 26, 58, 108, 17, 4);
      ctx.fillStyle = sMain;
      ctx.fill();
      roundedRect(ctx, 34, 42, 42, 13, 4);
      ctx.fillStyle = pLight;
      ctx.fill();
      roundedRect(ctx, 84, 42, 42, 13, 4);
      ctx.fillStyle = pLight;
      ctx.fill();
      break;
    }

    case 'chair': {
      if (thumbKind === 'round_pouf') {
        drawFloorShadow(80, 88, 36, 9);
        // Plinth ring
        roundedRect(ctx, 50, 74, 60, 10, 4);
        ctx.fillStyle = mMain;
        ctx.fill();
        // Plump cylinder pouf body
        roundedRect(ctx, 46, 40, 68, 38, 16);
        ctx.fillStyle = pMain;
        ctx.fill();
        // Top highlight dome
        ctx.fillStyle = pLight;
        ctx.beginPath();
        ctx.ellipse(80, 44, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Vertical subtle pleat lines
        ctx.strokeStyle = pDark;
        ctx.lineWidth = 1;
        for (const x of [58, 72, 88, 102]) {
          ctx.beginPath();
          ctx.moveTo(x, 48);
          ctx.lineTo(x, 74);
          ctx.stroke();
        }
      } else if (thumbKind === 'lounge_armchair') {
        drawFloorShadow(80, 90, 40, 9);
        ctx.strokeStyle = mMain;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(52, 66);
        ctx.lineTo(44, 88);
        ctx.moveTo(108, 66);
        ctx.lineTo(116, 88);
        ctx.stroke();
        // Wide enveloping backrest
        roundedRect(ctx, 44, 24, 72, 38, 14);
        ctx.fillStyle = pDark;
        ctx.fill();
        // Armrests
        roundedRect(ctx, 38, 44, 15, 28, 6);
        ctx.fillStyle = pMain;
        ctx.fill();
        roundedRect(ctx, 107, 44, 15, 28, 6);
        ctx.fillStyle = pMain;
        ctx.fill();
        // Plush seat cushion
        roundedRect(ctx, 48, 52, 64, 18, 6);
        ctx.fillStyle = pLight;
        ctx.fill();
      } else {
        drawFloorShadow(80, 90, 34, 9);
        ctx.strokeStyle = mMain;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(62, 62);
        ctx.lineTo(54, 88);
        ctx.moveTo(98, 62);
        ctx.lineTo(106, 88);
        ctx.moveTo(68, 62);
        ctx.lineTo(64, 84);
        ctx.moveTo(92, 62);
        ctx.lineTo(96, 84);
        ctx.stroke();
        roundedRect(ctx, 54, 22, 52, 32, 12);
        ctx.fillStyle = pMain;
        ctx.fill();
        roundedRect(ctx, 50, 52, 60, 14, 5);
        ctx.fillStyle = pLight;
        ctx.fill();
        ctx.strokeStyle = sDark;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      break;
    }

    case 'table': {
      drawFloorShadow(80, 88, 56, 11);
      if (thumbKind === 'round_pedestal') {
        // Fluted central pedestal column
        roundedRect(ctx, 64, 46, 32, 40, 4);
        ctx.fillStyle = pDark;
        ctx.fill();
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 1.2;
        for (let x = 68; x <= 92; x += 4) {
          ctx.beginPath();
          ctx.moveTo(x, 48);
          ctx.lineTo(x, 84);
          ctx.stroke();
        }
        // Brass base collar
        roundedRect(ctx, 58, 82, 44, 5, 2);
        ctx.fillStyle = mMain;
        ctx.fill();
        // Round tabletop
        ctx.fillStyle = pDark;
        ctx.beginPath();
        ctx.ellipse(80, 44, 52, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pLight;
        ctx.beginPath();
        ctx.ellipse(80, 40, 52, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (thumbKind === 'nesting_plinth') {
        // Larger low stone plinth table
        roundedRect(ctx, 26, 52, 72, 32, 4);
        ctx.fillStyle = pDark;
        ctx.fill();
        roundedRect(ctx, 24, 46, 76, 10, 4);
        ctx.fillStyle = pLight;
        ctx.fill();
        // Overlapping taller secondary nesting table
        roundedRect(ctx, 74, 38, 60, 46, 4);
        ctx.fillStyle = sDark;
        ctx.fill();
        roundedRect(ctx, 72, 32, 64, 10, 4);
        ctx.fillStyle = sLight;
        ctx.fill();
      } else if (thumbKind === 'oval_glass') {
        // Sleek dark metal cage frame
        ctx.strokeStyle = mMain;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(36, 48);
        ctx.lineTo(36, 82);
        ctx.moveTo(124, 48);
        ctx.lineTo(124, 82);
        ctx.moveTo(36, 76);
        ctx.lineTo(124, 76);
        ctx.stroke();
        // Lower shelf
        roundedRect(ctx, 36, 70, 88, 6, 3);
        ctx.fillStyle = pDark;
        ctx.fill();
        // Smoked glass oval top
        ctx.fillStyle = 'rgba(130, 152, 162, 0.34)';
        ctx.beginPath();
        ctx.ellipse(80, 44, 54, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // Specular streak on glass
        ctx.strokeStyle = 'rgba(255,255,255,0.34)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(46, 40);
        ctx.lineTo(94, 40);
        ctx.stroke();
      } else {
        ctx.fillStyle = mMain;
        roundedRect(ctx, 44, 52, 10, 34, 2);
        ctx.fill();
        roundedRect(ctx, 106, 52, 10, 34, 2);
        ctx.fill();
        ctx.fillStyle = mLight;
        ctx.fillRect(52, 72, 56, 3);
        roundedRect(ctx, 24, 40, 112, 14, 5);
        ctx.fillStyle = pDark;
        ctx.fill();
        roundedRect(ctx, 24, 36, 112, 12, 5);
        ctx.fillStyle = pLight;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(34, 41);
        ctx.lineTo(124, 41);
        ctx.stroke();
        ctx.fillStyle = '#ece9e2';
        ctx.beginPath();
        ctx.ellipse(80, 34, 11, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'storage': {
      if (thumbKind === 'vitrine_cabinet') {
        drawFloorShadow(80, 92, 42, 8);
        // Legs
        ctx.fillStyle = mMain;
        ctx.fillRect(46, 80, 4, 10);
        ctx.fillRect(110, 80, 4, 10);
        // Tall cabinet carcass
        roundedRect(ctx, 40, 14, 80, 68, 2);
        ctx.fillStyle = pMain;
        ctx.fill();
        // Contrast top slab
        ctx.fillStyle = sMain;
        ctx.fillRect(39, 13, 82, 4);
        // Illuminated upper glass vitrine zone
        const isFullGlass = spec.shape?.glassZone === 'full';
        const glassH = isFullGlass ? 54 : 34;
        ctx.fillStyle = '#1b201e';
        ctx.fillRect(46, 20, 68, glassH);
        // Warm shelf LED glow
        const shelfGlow = ctx.createRadialGradient(80, 30, 3, 80, 34, 34);
        shelfGlow.addColorStop(0, 'rgba(255, 224, 165, 0.42)');
        shelfGlow.addColorStop(1, 'rgba(255, 224, 165, 0)');
        ctx.fillStyle = shelfGlow;
        ctx.fillRect(46, 20, 68, glassH);
        // Internal shelves
        ctx.fillStyle = 'rgba(248, 232, 198, 0.65)';
        ctx.fillRect(47, 32, 66, 1.5);
        if (isFullGlass) ctx.fillRect(47, 48, 66, 1.5);
        // Glass door frames & vertical muntin
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(46, 20, 33, glassH);
        ctx.strokeRect(81, 20, 33, glassH);
        // Diagonal glass sheen
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(50, 26);
        ctx.lineTo(62, 42);
        ctx.moveTo(86, 26);
        ctx.lineTo(98, 42);
        ctx.stroke();
        // Lower solid doors & handles
        if (!isFullGlass) {
          ctx.strokeStyle = pDeep;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(80, 56);
          ctx.lineTo(80, 81);
          ctx.stroke();
          ctx.fillStyle = mLight;
          ctx.fillRect(75, 62, 2, 12);
          ctx.fillRect(83, 62, 2, 12);
        }
      } else if (thumbKind === 'open_shelving') {
        drawFloorShadow(80, 92, 44, 8);
        // Slender metal frame uprights
        ctx.fillStyle = mMain;
        ctx.fillRect(36, 14, 3, 76);
        ctx.fillRect(121, 14, 3, 76);
        ctx.fillRect(78.5, 14, 3, 76);
        // 4 open horizontal shelves
        for (const y of [18, 36, 54, 72]) {
          ctx.fillStyle = sMain;
          ctx.fillRect(36, y, 88, 4);
        }
        // Lower enclosed cabinet bay
        ctx.fillStyle = pMain;
        ctx.fillRect(39, 58, 82, 24);
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 58);
        ctx.lineTo(80, 82);
        ctx.stroke();
        // Minimal decor books on upper shelf
        ctx.fillStyle = pMain;
        ctx.fillRect(46, 25, 16, 11);
        ctx.fillStyle = pLight;
        ctx.fillRect(92, 43, 12, 11);
      } else if (thumbKind === 'chest_drawers') {
        drawFloorShadow(80, 89, 54, 9);
        ctx.fillStyle = mMain;
        ctx.fillRect(36, 78, 4, 10);
        ctx.fillRect(120, 78, 4, 10);
        roundedRect(ctx, 28, 24, 104, 56, 3);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.fillStyle = sMain;
        ctx.fillRect(28, 24, 104, 4);
        // 3 horizontal drawer rows
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 1.2;
        for (const y of [43, 61]) {
          ctx.beginPath();
          ctx.moveTo(30, y);
          ctx.lineTo(130, y);
          ctx.stroke();
        }
        // Horizontal pulls on each drawer
        ctx.fillStyle = mLight;
        for (const y of [33, 51, 69]) {
          ctx.fillRect(66, y, 28, 2.5);
        }
      } else {
        drawFloorShadow(80, 88, 58, 10);
        ctx.fillStyle = mMain;
        ctx.fillRect(32, 76, 4, 10);
        ctx.fillRect(124, 76, 4, 10);
        roundedRect(ctx, 24, 30, 112, 48, 3);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.fillStyle = pLight;
        ctx.fillRect(24, 30, 112, 4);
        if (spec.shape?.hasFluting) {
          ctx.strokeStyle = pDeep;
          ctx.lineWidth = 1;
          for (let x = 29; x <= 131; x += 5) {
            ctx.beginPath();
            ctx.moveTo(x, 34);
            ctx.lineTo(x, 77);
            ctx.stroke();
          }
        }
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(61, 34);
        ctx.lineTo(61, 77);
        ctx.moveTo(99, 34);
        ctx.lineTo(99, 77);
        ctx.stroke();
        ctx.fillStyle = mLight;
        ctx.fillRect(56, 46, 2.5, 16);
        ctx.fillRect(64, 46, 2.5, 16);
        ctx.fillRect(102, 46, 2.5, 16);
      }
      break;
    }

    case 'kitchen': {
      if (thumbKind === 'kitchen_fridge') {
        drawFloorShadow(80, 92, 34, 8);
        // Tall built-in fridge column
        roundedRect(ctx, 50, 12, 60, 78, 2);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(50, 58);
        ctx.lineTo(110, 58);
        ctx.stroke();
        // Sleek vertical handles
        ctx.fillStyle = mLight;
        ctx.fillRect(56, 30, 2.5, 22);
        ctx.fillRect(56, 64, 2.5, 16);
      } else if (thumbKind === 'kitchen_upper') {
        drawFloorShadow(80, 88, 56, 8);
        // Wall-hung upper cabinets + warm LED strip
        roundedRect(ctx, 22, 22, 116, 40, 2);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 1.1;
        for (const x of [51, 80, 109]) {
          ctx.beginPath();
          ctx.moveTo(x, 22);
          ctx.lineTo(x, 62);
          ctx.stroke();
        }
        ctx.fillStyle = '#fae5bc';
        ctx.fillRect(24, 62, 112, 3);
        const ledGlow = ctx.createLinearGradient(0, 65, 0, 86);
        ledGlow.addColorStop(0, 'rgba(250, 229, 188, 0.34)');
        ledGlow.addColorStop(1, 'rgba(250, 229, 188, 0)');
        ctx.fillStyle = ledGlow;
        ctx.fillRect(24, 65, 112, 20);
      } else {
        drawFloorShadow(80, 90, 62, 10);
        roundedRect(ctx, 22, 14, 116, 24, 2);
        ctx.fillStyle = sMain;
        ctx.fill();
        ctx.fillStyle = '#f8e3b8';
        ctx.fillRect(24, 38, 112, 2);
        ctx.fillStyle = '#d8d3c9';
        ctx.fillRect(22, 40, 116, 15);
        ctx.fillStyle = sMain;
        ctx.fillRect(20, 55, 120, 5);
        roundedRect(ctx, 22, 60, 116, 28, 2);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 1;
        for (const x of [51, 80, 109]) {
          ctx.beginPath();
          ctx.moveTo(x, 60);
          ctx.lineTo(x, 88);
          ctx.moveTo(x, 14);
          ctx.lineTo(x, 38);
          ctx.stroke();
        }
        ctx.fillStyle = mMain;
        for (const x of [31, 60, 89, 118]) {
          ctx.fillRect(x, 64, 11, 2);
        }
      }
      break;
    }

    case 'lighting': {
      if (thumbKind === 'pendant') {
        // Ceiling canopy & suspension cord
        ctx.fillStyle = mMain;
        ctx.fillRect(68, 4, 24, 5);
        ctx.fillRect(79, 9, 2, 30);
        // Warm glow around pendant dome
        const halo = ctx.createRadialGradient(80, 56, 4, 80, 58, 42);
        halo.addColorStop(0, 'rgba(255, 228, 175, 0.52)');
        halo.addColorStop(1, 'rgba(255, 228, 175, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(80, 58, 42, 0, Math.PI * 2);
        ctx.fill();
        // Pendant metal collar + dome shade
        ctx.fillStyle = mLight;
        roundedRect(ctx, 74, 37, 12, 7, 2);
        ctx.fill();
        ctx.fillStyle = pMain;
        ctx.beginPath();
        ctx.arc(80, 62, 22, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff3d6';
        ctx.beginPath();
        ctx.ellipse(80, 62, 18, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (thumbKind === 'sconce') {
        // Wall halo glow
        const halo = ctx.createRadialGradient(80, 48, 4, 80, 48, 40);
        halo.addColorStop(0, 'rgba(255, 224, 168, 0.5)');
        halo.addColorStop(1, 'rgba(255, 224, 168, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(80, 48, 40, 0, Math.PI * 2);
        ctx.fill();
        // Wall backplate & arm
        ctx.fillStyle = mMain;
        roundedRect(ctx, 72, 60, 16, 26, 3);
        ctx.fill();
        ctx.fillStyle = mLight;
        ctx.fillRect(78, 48, 4, 16);
        // Frosted opal glass globe
        ctx.fillStyle = pMain;
        ctx.beginPath();
        ctx.arc(80, 40, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else {
        drawFloorShadow(80, 91, 24, 6);
        const halo = ctx.createRadialGradient(80, 34, 4, 80, 34, 36);
        halo.addColorStop(0, 'rgba(255, 228, 175, 0.48)');
        halo.addColorStop(1, 'rgba(255, 228, 175, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(80, 34, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = mMain;
        ctx.beginPath();
        ctx.ellipse(80, 89, 16, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(78.5, 42, 3, 46);
        ctx.fillStyle = pMain;
        ctx.beginPath();
        ctx.moveTo(64, 20);
        ctx.lineTo(96, 20);
        ctx.lineTo(103, 44);
        ctx.lineTo(57, 44);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      break;
    }

    case 'art': {
      drawFloorShadow(80, 94, 38, 6);
      roundedRect(ctx, 48, 12, 64, 80, 2);
      ctx.fillStyle = mMain;
      ctx.fill();
      ctx.fillStyle = pMain;
      ctx.fillRect(53, 17, 54, 70);
      if (spec.textureKind === 'art_botanic') {
        ctx.fillStyle = sMain;
        ctx.beginPath();
        ctx.ellipse(76, 54, 15, 22, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c9a66b';
        ctx.beginPath();
        ctx.arc(90, 38, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (spec.textureKind === 'art_mono') {
        ctx.fillStyle = sMain;
        ctx.fillRect(59, 25, 26, 44);
        ctx.strokeStyle = sMain;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(86, 62, 13, 0, Math.PI * 2);
        ctx.stroke();
      } else if (spec.textureKind === 'art_terracotta') {
        ctx.fillStyle = sMain;
        ctx.beginPath();
        ctx.arc(80, 46, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6f4e39';
        ctx.fillRect(60, 62, 40, 16);
      } else {
        ctx.fillStyle = sMain;
        ctx.beginPath();
        ctx.arc(80, 50, 18, Math.PI, 0);
        ctx.lineTo(98, 78);
        ctx.lineTo(62, 78);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'mirror': {
      // Warm LED contour backlight halo
      const halo = ctx.createRadialGradient(80, 52, 10, 80, 52, 48);
      halo.addColorStop(0, 'rgba(255, 226, 172, 0.52)');
      halo.addColorStop(1, 'rgba(255, 226, 172, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(80, 52, 48, 0, Math.PI * 2);
      ctx.fill();

      const mirGrad = ctx.createLinearGradient(52, 16, 108, 90);
      mirGrad.addColorStop(0, '#c7d3da');
      mirGrad.addColorStop(0.42, '#eef4f7');
      mirGrad.addColorStop(0.56, '#b7c5ce');
      mirGrad.addColorStop(1, '#dce5ea');

      if (thumbKind === 'round_mirror') {
        ctx.fillStyle = mMain;
        ctx.beginPath();
        ctx.arc(80, 52, 33, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = mirGrad;
        ctx.beginPath();
        ctx.arc(80, 52, 29, 0, Math.PI * 2);
        ctx.fill();
      } else if (thumbKind === 'arch_mirror') {
        // Outer arched frame
        ctx.fillStyle = mMain;
        ctx.beginPath();
        ctx.arc(80, 38, 25, Math.PI, 0);
        ctx.lineTo(105, 90);
        ctx.lineTo(55, 90);
        ctx.closePath();
        ctx.fill();
        // Inner reflective arched glass
        ctx.fillStyle = mirGrad;
        ctx.beginPath();
        ctx.arc(80, 38, 21.5, Math.PI, 0);
        ctx.lineTo(101.5, 86.5);
        ctx.lineTo(58.5, 86.5);
        ctx.closePath();
        ctx.fill();
      } else {
        roundedRect(ctx, 56, 13, 48, 80, 2);
        ctx.fillStyle = mMain;
        ctx.fill();
        ctx.fillStyle = mirGrad;
        ctx.fillRect(60, 17, 40, 72);
      }

      // Crisp diagonal reflection highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.68)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(67, 46);
      ctx.lineTo(86, 27);
      ctx.moveTo(73, 55);
      ctx.lineTo(94, 34);
      ctx.stroke();
      break;
    }

    case 'rug': {
      drawFloorShadow(80, 70, 62, 18);
      // Perspective floor rug trapezoid
      ctx.beginPath();
      ctx.moveTo(34, 34);
      ctx.lineTo(126, 34);
      ctx.lineTo(142, 82);
      ctx.lineTo(18, 82);
      ctx.closePath();
      ctx.fillStyle = pMain;
      ctx.fill();
      // Woven outer border trim
      ctx.strokeStyle = sDark;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Inner subtle geometric frame
      ctx.beginPath();
      ctx.moveTo(44, 42);
      ctx.lineTo(116, 42);
      ctx.lineTo(128, 74);
      ctx.lineTo(32, 74);
      ctx.closePath();
      ctx.strokeStyle = pLight;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Subtle horizontal woven texture lines
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      for (const y of [48, 56, 64, 72]) {
        ctx.beginPath();
        ctx.moveTo(36, y);
        ctx.lineTo(124, y);
        ctx.stroke();
      }
      break;
    }

    case 'textile': {
      drawFloorShadow(80, 88, 56, 10);
      // Concealed ceiling track bar
      ctx.fillStyle = '#3b403d';
      ctx.fillRect(26, 14, 108, 3);
      // Pleated curtains
      for (let i = 0; i < 6; i++) {
        const x = 32 + i * 16;
        const grad = ctx.createLinearGradient(x, 16, x + 16, 16);
        grad.addColorStop(0, pDark);
        grad.addColorStop(0.45, pLight);
        grad.addColorStop(1, pDark);
        ctx.fillStyle = grad;
        roundedRect(ctx, x, 17, 16, 70, 2);
        ctx.fill();
      }
      break;
    }

    case 'partition': {
      drawFloorShadow(80, 92, 60, 8);
      // Archway outer surround
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, 90);
      ctx.lineTo(24, 28);
      ctx.quadraticCurveTo(24, 12, 42, 12);
      ctx.lineTo(118, 12);
      ctx.quadraticCurveTo(136, 12, 136, 28);
      ctx.lineTo(136, 90);
      ctx.stroke();

      // Glazed loft panels (4 bays: 2 fixed sides + 2 central doors)
      const tint = spec.glassTintHex ?? '#cad8dd';
      const [gr, gg, gb] = hexToRgb(tint);
      ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, 0.28)`;
      ctx.fillRect(28, 16, 104, 48);

      // Lower wood/matte kick panels
      ctx.fillStyle = pMain;
      ctx.fillRect(28, 64, 104, 24);
      ctx.fillStyle = pDark;
      ctx.fillRect(28, 64, 104, 3);

      // Slim metal frame, horizontal mid-rail, vertical mullions & arched muntin accents
      ctx.strokeStyle = mMain;
      ctx.lineWidth = 2.4;
      ctx.strokeRect(28, 16, 104, 72);
      ctx.beginPath();
      ctx.moveTo(28, 64);
      ctx.lineTo(132, 64);
      for (const x of [54, 80, 106]) {
        ctx.moveTo(x, 16);
        ctx.lineTo(x, 88);
      }
      ctx.stroke();

      // Art Deco arched muntins inside each glazed bay
      ctx.strokeStyle = mLight;
      ctx.lineWidth = 1.1;
      for (const cx of [41, 67, 93, 119]) {
        ctx.beginPath();
        ctx.arc(cx, 32, 8.5, Math.PI, 0);
        ctx.lineTo(cx + 8.5, 62);
        ctx.moveTo(cx - 8.5, 32);
        ctx.lineTo(cx - 8.5, 62);
        ctx.stroke();
      }
      // Door handles on center leaves
      ctx.fillStyle = mLight;
      ctx.fillRect(75.5, 48, 2, 12);
      ctx.fillRect(82.5, 48, 2, 12);
      break;
    }

    case 'media_decor': {
      drawFloorShadow(80, 88, 60, 10);
      if (thumbKind === 'tv_screen') {
        // Subtle warm bias backlight behind TV
        const tvGlow = ctx.createRadialGradient(80, 48, 10, 80, 48, 64);
        tvGlow.addColorStop(0, 'rgba(255, 224, 170, 0.34)');
        tvGlow.addColorStop(1, 'rgba(255, 224, 170, 0)');
        ctx.fillStyle = tvGlow;
        ctx.fillRect(14, 10, 132, 78);
        // Ultra-slim 65" OLED frame + dark glossy screen
        roundedRect(ctx, 22, 18, 116, 62, 3);
        ctx.fillStyle = mMain;
        ctx.fill();
        ctx.fillStyle = '#121417';
        ctx.fillRect(26, 22, 108, 54);
        // Subtle diagonal screen glass reflection
        const sheen = ctx.createLinearGradient(26, 22, 120, 76);
        sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
        sheen.addColorStop(0.45, 'rgba(255,255,255,0.02)');
        sheen.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sheen;
        ctx.fillRect(26, 22, 108, 54);
      } else {
        // Architectural slatted / stone TV wall panel
        roundedRect(ctx, 22, 16, 116, 68, 3);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.fillStyle = mMain;
        for (let x = 28; x <= 130; x += 14) {
          ctx.fillRect(x, 18, 3, 64);
        }
        roundedRect(ctx, 44, 28, 72, 42, 2);
        ctx.fillStyle = '#181a1c';
        ctx.fill();
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      break;
    }

    case 'decor': {
      drawFloorShadow(80, 86, 48, 9);
      // Stacked coffee-table art books on left
      roundedRect(ctx, 28, 70, 56, 11, 2);
      ctx.fillStyle = sDark;
      ctx.fill();
      roundedRect(ctx, 33, 60, 46, 10, 2);
      ctx.fillStyle = sMain;
      ctx.fill();
      ctx.fillStyle = '#f2eee6';
      ctx.fillRect(35, 63, 42, 2);
      // Sculptural ceramic vase on right
      ctx.fillStyle = pMain;
      ctx.beginPath();
      ctx.moveTo(96, 81);
      ctx.quadraticCurveTo(86, 60, 98, 42);
      ctx.lineTo(100, 26);
      ctx.lineTo(116, 26);
      ctx.lineTo(118, 42);
      ctx.quadraticCurveTo(130, 60, 120, 81);
      ctx.closePath();
      ctx.fill();
      // Vase rim highlight
      ctx.fillStyle = pLight;
      ctx.beginPath();
      ctx.ellipse(108, 26, 8, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Minimal metallic sphere accent
      ctx.fillStyle = mLight;
      ctx.beginPath();
      ctx.arc(56, 54, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'bath_fixtures': {
      if (thumbKind === 'bath_tub') {
        drawFloorShadow(80, 86, 58, 10);
        // Sculptural bathtub body
        roundedRect(ctx, 22, 42, 116, 40, 14);
        ctx.fillStyle = sMain;
        ctx.fill();
        // Top rim
        roundedRect(ctx, 20, 38, 120, 9, 4);
        ctx.fillStyle = '#faf9f5';
        ctx.fill();
        // Metal mixer spout at side
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(126, 38);
        ctx.lineTo(126, 22);
        ctx.lineTo(114, 22);
        ctx.stroke();
      } else if (thumbKind === 'bath_shower_screen') {
        drawFloorShadow(80, 92, 44, 7);
        // Glass shower screen panel
        const tint = spec.glassTintHex ?? '#cddae0';
        const [gr, gg, gb] = hexToRgb(tint);
        ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, 0.34)`;
        ctx.fillRect(48, 14, 64, 76);
        // Perimeter metal channel profile
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 3;
        ctx.strokeRect(48, 14, 64, 76);
        // Top stabilizer bar
        ctx.fillStyle = mMain;
        ctx.fillRect(48, 20, 64, 2.5);
        // Glass specular reflections
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(58, 34);
        ctx.lineTo(78, 18);
        ctx.moveTo(68, 62);
        ctx.lineTo(98, 36);
        ctx.stroke();
      } else if (thumbKind === 'bath_mixer') {
        drawFloorShadow(80, 88, 34, 8);
        // Wall-mount architectural bath mixer + rain head accent
        ctx.fillStyle = mDark;
        roundedRect(ctx, 50, 44, 60, 14, 4);
        ctx.fill();
        ctx.fillStyle = mLight;
        roundedRect(ctx, 52, 46, 56, 10, 3);
        ctx.fill();
        // Spout & lever
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(80, 56);
        ctx.lineTo(80, 72);
        ctx.lineTo(96, 72);
        ctx.moveTo(64, 46);
        ctx.lineTo(64, 30);
        ctx.stroke();
      } else if (thumbKind === 'bath_towel_warmer') {
        drawFloorShadow(80, 92, 34, 7);
        // Vertical ladder heated towel warmer
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(54, 14);
        ctx.lineTo(54, 88);
        ctx.moveTo(106, 14);
        ctx.lineTo(106, 88);
        for (const y of [22, 34, 46, 58, 70, 82]) {
          ctx.moveTo(54, y);
          ctx.lineTo(106, y);
        }
        ctx.stroke();
      } else if (thumbKind === 'bath_flush_plate') {
        drawFloorShadow(80, 88, 44, 8);
        // Minimalist dual-button concealed flush plate
        roundedRect(ctx, 36, 28, 88, 52, 3);
        ctx.fillStyle = mMain;
        ctx.fill();
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Large & small flush buttons
        roundedRect(ctx, 44, 38, 42, 32, 2);
        ctx.fillStyle = mDark;
        ctx.fill();
        roundedRect(ctx, 92, 38, 24, 32, 2);
        ctx.fillStyle = mDark;
        ctx.fill();
      } else if (thumbKind === 'bath_drain') {
        drawFloorShadow(80, 62, 62, 12);
        // Linear stainless/black/brass floor drain channel
        ctx.beginPath();
        ctx.moveTo(22, 50);
        ctx.lineTo(138, 50);
        ctx.lineTo(146, 62);
        ctx.lineTo(14, 62);
        ctx.closePath();
        ctx.fillStyle = mMain;
        ctx.fill();
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#121414';
        ctx.fillRect(28, 54, 104, 4);
      } else {
        drawFloorShadow(80, 88, 52, 10);
        roundedRect(ctx, 34, 46, 92, 34, 3);
        ctx.fillStyle = pMain;
        ctx.fill();
        roundedRect(ctx, 32, 40, 96, 7, 2);
        ctx.fillStyle = sMain;
        ctx.fill();
        roundedRect(ctx, 56, 29, 48, 12, 5);
        ctx.fillStyle = '#f8f7f3';
        ctx.fill();
        ctx.strokeStyle = mLight;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(80, 29);
        ctx.lineTo(80, 17);
        ctx.lineTo(89, 17);
        ctx.stroke();
        ctx.fillStyle = mMain;
        ctx.fillRect(62, 58, 36, 3);
      }
      break;
    }
  }

  // Subtle top-right swatch dot showing metal/accent pairing
  ctx.fillStyle = mMain;
  ctx.beginPath();
  ctx.arc(w - 13, 13, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const url = canvas.toDataURL('image/png');
  thumbnailCache.set(cacheKey, url);
  return url;
}

// ============================================================================
// LAZY PBR MATERIAL CACHE FOR LIVE 3D OBJECT VARIANT REPLACEMENT
// ============================================================================

export interface VariantMaterialBundle {
  primary: THREE.MeshStandardMaterial;
  primaryFlat: THREE.MeshStandardMaterial;
  primaryDoubleSide: THREE.MeshStandardMaterial;
  primaryPolygonOffset: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  metalDoubleSide: THREE.MeshStandardMaterial;
  emissiveWarm: THREE.MeshStandardMaterial;
  glass?: THREE.MeshStandardMaterial;
  photoArt?: THREE.MeshStandardMaterial;
}

export interface ObjectVariantMaterialCache {
  getBundle: (variantId: string) => VariantMaterialBundle | null;
  dispose: () => void;
}

function createPhotoCanvasTexture(
  dataUrl: string,
  anisotropy: number
): THREE.Texture | null {
  if (typeof document === 'undefined' || !SAFE_DATA_IMAGE_REGEX.test(dataUrl)) return null;
  const img = new Image();
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  img.onload = () => {
    tex.needsUpdate = true;
  };
  img.src = dataUrl;
  return tex;
}

function createProceduralVariantTexture(
  spec: ObjectVariantSpec,
  anisotropy: number
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  if (
    spec.textureKind === 'art_arch' ||
    spec.textureKind === 'art_botanic' ||
    spec.textureKind === 'art_mono' ||
    spec.textureKind === 'art_terracotta'
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = spec.primaryHex;
    ctx.fillRect(0, 0, 384, 512);

    if (spec.textureKind === 'art_botanic') {
      ctx.fillStyle = spec.secondaryHex;
      ctx.beginPath();
      ctx.ellipse(166, 286, 92, 138, -0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8a66b';
      ctx.beginPath();
      ctx.arc(258, 174, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4e5b4c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(140, 448);
      ctx.quadraticCurveTo(175, 290, 214, 150);
      ctx.stroke();
    } else if (spec.textureKind === 'art_mono') {
      ctx.fillStyle = spec.secondaryHex;
      ctx.fillRect(58, 72, 152, 265);
      ctx.strokeStyle = spec.secondaryHex;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(242, 326, 78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#b7b3ab';
      ctx.fillRect(160, 380, 165, 52);
    } else if (spec.textureKind === 'art_terracotta') {
      ctx.fillStyle = spec.secondaryHex;
      ctx.beginPath();
      ctx.arc(192, 208, 104, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#734f3a';
      ctx.beginPath();
      ctx.roundRect(70, 310, 244, 118, 16);
      ctx.fill();
      ctx.strokeStyle = '#dfd2c3';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(70, 368);
      ctx.lineTo(314, 368);
      ctx.stroke();
    } else {
      ctx.fillStyle = spec.secondaryHex;
      ctx.beginPath();
      ctx.arc(192, 236, 118, Math.PI, 0);
      ctx.lineTo(310, 434);
      ctx.lineTo(74, 434);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dfd6c8';
      ctx.beginPath();
      ctx.arc(240, 178, 52, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = anisotropy;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  if (spec.textureKind === 'matte') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const [br, bg, bb] = hexToRgb(spec.primaryHex);
  const img = ctx.createImageData(size, size);

  // Deterministic pseudo-random per variant id
  let seed = 2166136261;
  for (let i = 0; i < spec.id.length; i++) {
    seed ^= spec.id.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let delta = 0;
      if (spec.textureKind === 'wood') {
        const grain = Math.sin(x * 0.22 + Math.sin(y * 0.04) * 2.4) * 11;
        const pore = (rand() - 0.5) * 9;
        delta = grain + pore;
      } else if (spec.textureKind === 'stone') {
        const cloud = Math.sin(x * 0.035 + y * 0.025) * 10 + Math.cos(x * 0.06 - y * 0.05) * 7;
        const vein = Math.abs(Math.sin(x * 0.028 + y * 0.05 + Math.sin(x * 0.04) * 1.5)) < 0.04 ? -18 : 0;
        delta = cloud + vein + (rand() - 0.5) * 8;
      } else {
        // Woven upholstery / bouclé / linen fabric
        const weave = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? 5 : -5);
        const thread = Math.sin(x * 1.3) * 3.5 + Math.sin(y * 1.3) * 3.5;
        delta = weave + thread + (rand() - 0.5) * 12;
      }
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.max(16, Math.min(246, br + delta));
      img.data[idx + 1] = Math.max(16, Math.min(246, bg + delta * 0.97));
      img.data[idx + 2] = Math.max(16, Math.min(246, bb + delta * 0.94));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(spec.textureKind === 'wood' ? 2 : 4, spec.textureKind === 'wood' ? 2 : 4);
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createObjectVariantMaterialCache(
  anisotropy: number
): ObjectVariantMaterialCache {
  const bundles = new Map<
    string,
    {
      sig: string;
      bundle: VariantMaterialBundle;
      texture: THREE.Texture | null;
      photoTexture: THREE.Texture | null;
    }
  >();

  const getBundle = (variantId: string): VariantMaterialBundle | null => {
    const spec = VARIANT_BY_ID.get(variantId);
    if (!spec) return null;

    const sig = getVariantSignature(spec);
    const existing = bundles.get(variantId);
    if (existing && existing.sig === sig) {
      return existing.bundle;
    }
    if (existing) {
      existing.bundle.primary.dispose();
      existing.bundle.primaryFlat.dispose();
      existing.bundle.primaryDoubleSide.dispose();
      existing.bundle.primaryPolygonOffset.dispose();
      existing.bundle.secondary.dispose();
      existing.bundle.metal.dispose();
      existing.bundle.metalDoubleSide.dispose();
      existing.bundle.emissiveWarm.dispose();
      existing.bundle.glass?.dispose();
      existing.bundle.photoArt?.dispose();
      existing.texture?.dispose();
      existing.photoTexture?.dispose();
      bundles.delete(variantId);
    }

    const tex = createProceduralVariantTexture(spec, anisotropy);
    const primaryEnv = spec.metalness > 0.3 ? 0.85 : 0.24;

    const primary = new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : new THREE.Color(spec.primaryHex),
      ...(tex ? { map: tex } : {}),
      roughness: spec.roughness,
      metalness: spec.metalness,
      envMapIntensity: primaryEnv,
    });

    const primaryFlat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.primaryHex),
      roughness: spec.roughness,
      metalness: spec.metalness,
      envMapIntensity: primaryEnv,
    });

    const primaryDoubleSide = new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : new THREE.Color(spec.primaryHex),
      ...(tex ? { map: tex } : {}),
      roughness: spec.roughness,
      metalness: spec.metalness,
      envMapIntensity: primaryEnv,
      side: THREE.DoubleSide,
    });

    const primaryPolygonOffset = new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : new THREE.Color(spec.primaryHex),
      ...(tex ? { map: tex } : {}),
      roughness: spec.roughness,
      metalness: spec.metalness,
      envMapIntensity: primaryEnv,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const secondary = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.secondaryHex),
      roughness: spec.secondaryRoughness ?? Math.min(0.95, spec.roughness + 0.04),
      metalness: 0.04,
      envMapIntensity: 0.24,
    });

    const [mr, mg, mb] = hexToRgb(spec.metalHex);
    const metalLum = (0.299 * mr + 0.587 * mg + 0.114 * mb) / 255;
    const isDarkPowderMetal = metalLum < 0.24;
    const metalRoughness = spec.metalRoughness ?? (isDarkPowderMetal ? 0.46 : 0.32);
    const metalMetalness = spec.metalMetalness ?? (isDarkPowderMetal ? 0.34 : 0.82);
    const metalEnv = metalMetalness < 0.45 ? 0.42 : 1.05;

    const metal = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.metalHex),
      roughness: metalRoughness,
      metalness: metalMetalness,
      envMapIntensity: metalEnv,
    });

    const metalDoubleSide = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.metalHex),
      roughness: metalRoughness,
      metalness: metalMetalness,
      envMapIntensity: metalEnv,
      side: THREE.DoubleSide,
    });

    const emissiveWarm = new THREE.MeshStandardMaterial({
      color: 0xfff5e4,
      emissive: 0xffd59c,
      emissiveIntensity: 1.5,
      roughness: 0.35,
      metalness: 0.0,
    });

    let glass: THREE.MeshStandardMaterial | undefined;
    if (spec.glassTintHex) {
      const [gr, gg, gb] = hexToRgb(spec.glassTintHex);
      const glassLum = (0.299 * gr + 0.587 * gg + 0.114 * gb) / 255;
      const isSmokedDark = glassLum < 0.32;
      glass = new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.glassTintHex),
        roughness: 0.08,
        metalness: 0.14,
        transparent: true,
        opacity: spec.type === 'partition' ? 0.26 : isSmokedDark ? 0.5 : 0.36,
        envMapIntensity: isSmokedDark ? 0.92 : 1.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    let photoTexture: THREE.Texture | null = null;
    let photoArt: THREE.MeshStandardMaterial | undefined;
    if (spec.type === 'art' && spec.photoUrl) {
      photoTexture = createPhotoCanvasTexture(spec.photoUrl, anisotropy);
      if (photoTexture) {
        photoArt = new THREE.MeshStandardMaterial({
          map: photoTexture,
          roughness: 0.78,
          metalness: 0.02,
          envMapIntensity: 0.3,
        });
      }
    }

    const bundle: VariantMaterialBundle = {
      primary,
      primaryFlat,
      primaryDoubleSide,
      primaryPolygonOffset,
      secondary,
      metal,
      metalDoubleSide,
      emissiveWarm,
      glass,
      photoArt,
    };
    bundles.set(variantId, { sig, bundle, texture: tex, photoTexture });
    return bundle;
  };

  const dispose = () => {
    bundles.forEach((entry) => {
      entry.bundle.primary.dispose();
      entry.bundle.primaryFlat.dispose();
      entry.bundle.primaryDoubleSide.dispose();
      entry.bundle.primaryPolygonOffset.dispose();
      entry.bundle.secondary.dispose();
      entry.bundle.metal.dispose();
      entry.bundle.metalDoubleSide.dispose();
      entry.bundle.emissiveWarm.dispose();
      entry.bundle.glass?.dispose();
      entry.bundle.photoArt?.dispose();
      entry.texture?.dispose();
      entry.photoTexture?.dispose();
    });
    bundles.clear();
  };

  return { getBundle, dispose };
}
