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
  | 'textile'
  | 'media_decor'
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
  'textile',
  'media_decor',
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
  art: { id: 'art', label: 'Картины и зеркала', shortLabel: 'Декор стены' },
  textile: { id: 'textile', label: 'Ковры и шторы', shortLabel: 'Текстиль' },
  media_decor: { id: 'media_decor', label: 'ТВ, декор и перегородка', shortLabel: 'ТВ / декор' },
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

  // Wall art & mirrors
  living_art_l: 'art',
  living_art_r: 'art',
  bedroom_art: 'art',
  entry_mirror: 'art',

  // Rugs & curtains
  living_rug: 'textile',
  bed_rug: 'textile',
  curtains_living: 'textile',
  curtains_kitchen: 'textile',
  curtains_bedroom: 'textile',

  // Media, decor & architectural partition
  tv_backdrop: 'media_decor',
  tv_screen: 'media_decor',
  tv_decor: 'media_decor',
  arch_partition: 'media_decor',

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
  },
  {
    id: 'chair_walnut_sage',
    type: 'chair',
    label: 'Орех и шалфей',
    subtitle: 'Велюр олива · тёплый орех',
    primaryHex: '#6d7b69',
    secondaryHex: '#6c4d38',
    metalHex: '#b39460',
    roughness: 0.86,
    metalness: 0.03,
    secondaryRoughness: 0.54,
    textureKind: 'fabric',
  },
  {
    id: 'chair_graphite_black',
    type: 'chair',
    label: 'Графит лофт',
    subtitle: 'Тёмно-серая ткань · чёрный металл',
    primaryHex: '#494d50',
    secondaryHex: '#252729',
    metalHex: '#242628',
    roughness: 0.88,
    metalness: 0.03,
    metalRoughness: 0.42,
    metalMetalness: 0.68,
    textureKind: 'fabric',
  },
  {
    id: 'chair_cognac_brass',
    type: 'chair',
    label: 'Карамель и латунь',
    subtitle: 'Коньячная экокожа · матовая латунь',
    primaryHex: '#9c6946',
    secondaryHex: '#5a3d2b',
    metalHex: '#b6965d',
    roughness: 0.54,
    metalness: 0.06,
    metalRoughness: 0.34,
    metalMetalness: 0.84,
    textureKind: 'matte',
  },
  {
    id: 'chair_terracotta_oak',
    type: 'chair',
    label: 'Терракота и дуб',
    subtitle: 'Тёплая терракота · дуб',
    primaryHex: '#ad6d55',
    secondaryHex: '#b89771',
    metalHex: '#333638',
    roughness: 0.9,
    metalness: 0.02,
    textureKind: 'fabric',
  },

  // --- TABLE ---
  {
    id: 'table_light_oak',
    type: 'table',
    label: 'Светлый дуб',
    subtitle: 'Натуральный шпон дуба · чёрный металл',
    primaryHex: '#ba9a74',
    secondaryHex: '#9e7e5b',
    metalHex: '#27292b',
    roughness: 0.56,
    metalness: 0.04,
    textureKind: 'wood',
  },
  {
    id: 'table_warm_walnut',
    type: 'table',
    label: 'Орех и латунь',
    subtitle: 'Американский орех · матовая латунь',
    primaryHex: '#6c4d39',
    secondaryHex: '#563c2c',
    metalHex: '#b69760',
    roughness: 0.5,
    metalness: 0.05,
    metalRoughness: 0.32,
    metalMetalness: 0.85,
    textureKind: 'wood',
  },
  {
    id: 'table_travertine',
    type: 'table',
    label: 'Травертин',
    subtitle: 'Светлый камень травертин · бронза',
    primaryHex: '#d5cbbd',
    secondaryHex: '#bfb3a1',
    metalHex: '#80684d',
    roughness: 0.62,
    metalness: 0.04,
    textureKind: 'stone',
    glassTintHex: '#d6cdc0',
  },
  {
    id: 'table_dark_slate',
    type: 'table',
    label: 'Тёмный сланец',
    subtitle: 'Графитовый камень · чёрное основание',
    primaryHex: '#3f4346',
    secondaryHex: '#2b2e30',
    metalHex: '#202224',
    roughness: 0.48,
    metalness: 0.08,
    textureKind: 'stone',
    glassTintHex: '#33383c',
  },

  // --- STORAGE / CONSOLES / CABINETS ---
  {
    id: 'storage_cashmere',
    type: 'storage',
    label: 'Тёплый кашемир',
    subtitle: 'Матовый кашемир · шампань-латунь',
    primaryHex: '#cbc0b2',
    secondaryHex: '#ddd5ca',
    metalHex: '#b69760',
    roughness: 0.66,
    metalness: 0.04,
    textureKind: 'matte',
  },
  {
    id: 'storage_walnut',
    type: 'storage',
    label: 'Орех и латунь',
    subtitle: 'Шпон ореха · фурнитура латунь',
    primaryHex: '#6e4f3b',
    secondaryHex: '#573d2d',
    metalHex: '#b69760',
    roughness: 0.52,
    metalness: 0.05,
    textureKind: 'wood',
  },
  {
    id: 'storage_sage',
    type: 'storage',
    label: 'Шалфей матовый',
    subtitle: 'Пыльно-оливковый фасад · светлый дуб',
    primaryHex: '#7d8a7a',
    secondaryHex: '#b89974',
    metalHex: '#b29460',
    roughness: 0.64,
    metalness: 0.04,
    textureKind: 'matte',
  },
  {
    id: 'storage_graphite',
    type: 'storage',
    label: 'Графит антрацит',
    subtitle: 'Тёмно-серый матовый · чёрный металл',
    primaryHex: '#3d4043',
    secondaryHex: '#2c2f31',
    metalHex: '#1f2123',
    roughness: 0.58,
    metalness: 0.06,
    textureKind: 'matte',
  },
  {
    id: 'storage_warm_white',
    type: 'storage',
    label: 'Молочный минимал',
    subtitle: 'Тёплый белый фасад · дуб',
    primaryHex: '#e4dfd6',
    secondaryHex: '#bc9d77',
    metalHex: '#a5aab0',
    roughness: 0.62,
    metalness: 0.03,
    textureKind: 'matte',
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

  // --- TEXTILE (RUGS & CURTAINS) ---
  {
    id: 'textile_milk_linen',
    type: 'textile',
    label: 'Молочный лён',
    subtitle: 'Светлый воздушный текстиль',
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
    subtitle: 'Кашемирово-песочное плетение',
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
    subtitle: 'Приглушённый серо-оливковый',
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
    subtitle: 'Глубокий графитово-серый',
    primaryHex: '#5c6064',
    secondaryHex: '#484b4e',
    metalHex: '#383b3e',
    roughness: 0.92,
    metalness: 0.02,
    textureKind: 'fabric',
  },

  // --- MEDIA / DECOR / PARTITION ---
  {
    id: 'media_walnut_copper',
    type: 'media_decor',
    label: 'Орех и медь',
    subtitle: 'Тёплые рейки ореха · медный профиль',
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
    subtitle: 'Графитовый камень · чёрный профиль',
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

  // --- BATHROOM FIXTURES ---
  {
    id: 'bath_chrome_classic',
    type: 'bath_fixtures',
    label: 'Хром и светлый дуб',
    subtitle: 'Полированный хром · натуральный дуб',
    primaryHex: '#bd9e79',
    secondaryHex: '#f3f2ee',
    metalHex: '#cfd4d8',
    roughness: 0.56,
    metalness: 0.04,
    secondaryRoughness: 0.14,
    metalRoughness: 0.16,
    metalMetalness: 0.94,
    textureKind: 'wood',
    glassTintHex: '#dce8ec',
  },
  {
    id: 'bath_matte_black',
    type: 'bath_fixtures',
    label: 'Чёрный матовый',
    subtitle: 'Чёрная сантехника · графитовый профиль',
    primaryHex: '#3f4245',
    secondaryHex: '#eceae4',
    metalHex: '#1f2123',
    roughness: 0.52,
    metalness: 0.08,
    secondaryRoughness: 0.16,
    metalRoughness: 0.4,
    metalMetalness: 0.72,
    textureKind: 'matte',
    glassTintHex: '#7b848a',
  },
  {
    id: 'bath_brushed_brass',
    type: 'bath_fixtures',
    label: 'Матовая латунь',
    subtitle: 'Тёплая латунь · американский орех',
    primaryHex: '#6c4d39',
    secondaryHex: '#f2efe8',
    metalHex: '#be9d60',
    roughness: 0.52,
    metalness: 0.05,
    secondaryRoughness: 0.14,
    metalRoughness: 0.28,
    metalMetalness: 0.9,
    textureKind: 'wood',
    glassTintHex: '#e2ded4',
  },
  {
    id: 'bath_satin_sage',
    type: 'bath_fixtures',
    label: 'Сатин и шалфей',
    subtitle: 'Матовый никель · шалфейная отделка',
    primaryHex: '#7d8a7b',
    secondaryHex: '#f1f0eb',
    metalHex: '#adb2b8',
    roughness: 0.58,
    metalness: 0.04,
    secondaryRoughness: 0.15,
    metalRoughness: 0.28,
    metalMetalness: 0.86,
    textureKind: 'matte',
    glassTintHex: '#d5e2db',
  },
];

const VARIANT_BY_ID = new Map<string, ObjectVariantSpec>(
  OBJECT_VARIANT_CATALOG.map((v) => [v.id, v])
);

const VARIANTS_BY_TYPE = new Map<EditableObjectType, ObjectVariantSpec[]>();
for (const t of EDITABLE_TYPE_ORDER) {
  VARIANTS_BY_TYPE.set(
    t,
    OBJECT_VARIANT_CATALOG.filter((v) => v.type === t)
  );
}

export function getEditableType(id: string): EditableObjectType {
  return EDITABLE_OBJECT_TYPE_MAP[id] ?? 'storage';
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
  const spec = VARIANT_BY_ID.get(variantId);
  if (!spec) return false;
  return spec.type === getEditableType(objectId);
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

/**
 * Generates a studio-lit product mini-photo (160x108 PNG data URL) for any catalog variant.
 * Rendered once and cached in memory — instant, offline-safe, zero extra WebGL contexts.
 */
export function getVariantThumbnail(spec: ObjectVariantSpec): string {
  const cached = thumbnailCache.get(spec.id);
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
  const sDark = shadeHex(spec.secondaryHex, 0.78);
  const mMain = spec.metalHex;
  const mLight = shadeHex(spec.metalHex, 1.24);
  const mDark = shadeHex(spec.metalHex, 0.72);

  switch (spec.type) {
    case 'sofa': {
      drawFloorShadow(80, 86, 62, 13);
      // Legs
      ctx.fillStyle = mDark;
      ctx.fillRect(26, 78, 5, 6);
      ctx.fillRect(128, 78, 5, 6);
      ctx.fillRect(72, 82, 5, 5);
      // Backrest
      roundedRect(ctx, 22, 34, 116, 32, 7);
      ctx.fillStyle = pDark;
      ctx.fill();
      // Back cushions
      for (let i = 0; i < 3; i++) {
        roundedRect(ctx, 28 + i * 35, 37, 33, 24, 6);
        ctx.fillStyle = pMain;
        ctx.fill();
        ctx.strokeStyle = pDeep;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      // Seat base + L-chaise
      roundedRect(ctx, 20, 62, 120, 17, 4);
      ctx.fillStyle = pDark;
      ctx.fill();
      roundedRect(ctx, 26, 56, 74, 15, 5);
      ctx.fillStyle = pLight;
      ctx.fill();
      // Chaise lounge extension on right
      roundedRect(ctx, 101, 56, 34, 24, 5);
      ctx.fillStyle = pLight;
      ctx.fill();
      // Armrests
      roundedRect(ctx, 17, 47, 13, 31, 4);
      ctx.fillStyle = pMain;
      ctx.fill();
      roundedRect(ctx, 130, 47, 13, 31, 4);
      ctx.fillStyle = pMain;
      ctx.fill();
      // Contrast throw pillows
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
      // Tall upholstered headboard
      roundedRect(ctx, 26, 20, 108, 42, 6);
      ctx.fillStyle = pMain;
      ctx.fill();
      // Vertical channel tufting lines on headboard
      ctx.strokeStyle = pDark;
      ctx.lineWidth = 1;
      for (let x = 44; x <= 116; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x, 60);
        ctx.stroke();
      }
      // Wooden/upholstered bed frame
      roundedRect(ctx, 22, 64, 116, 18, 3);
      ctx.fillStyle = mMain;
      ctx.fill();
      // Crisp mattress & folded duvet
      roundedRect(ctx, 26, 51, 108, 22, 4);
      ctx.fillStyle = '#ebe6dd';
      ctx.fill();
      roundedRect(ctx, 26, 58, 108, 17, 4);
      ctx.fillStyle = sMain;
      ctx.fill();
      // Two plump pillows
      roundedRect(ctx, 34, 42, 42, 13, 4);
      ctx.fillStyle = pLight;
      ctx.fill();
      roundedRect(ctx, 84, 42, 42, 13, 4);
      ctx.fillStyle = pLight;
      ctx.fill();
      break;
    }

    case 'chair': {
      drawFloorShadow(80, 90, 34, 9);
      // Tapered legs
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
      // Curved backrest
      roundedRect(ctx, 54, 22, 52, 32, 12);
      ctx.fillStyle = pMain;
      ctx.fill();
      // Seat cushion
      roundedRect(ctx, 50, 52, 60, 14, 5);
      ctx.fillStyle = pLight;
      ctx.fill();
      // Subtle frame rim
      ctx.strokeStyle = sDark;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      break;
    }

    case 'table': {
      drawFloorShadow(80, 88, 56, 11);
      // Sculptural pedestal / architectural legs
      ctx.fillStyle = mMain;
      roundedRect(ctx, 44, 52, 10, 34, 2);
      ctx.fill();
      roundedRect(ctx, 106, 52, 10, 34, 2);
      ctx.fill();
      // Crossbar accent
      ctx.fillStyle = mLight;
      ctx.fillRect(52, 72, 56, 3);
      // Tabletop perspective ellipse/slab
      roundedRect(ctx, 24, 40, 112, 14, 5);
      ctx.fillStyle = pDark;
      ctx.fill();
      roundedRect(ctx, 24, 36, 112, 12, 5);
      ctx.fillStyle = pLight;
      ctx.fill();
      // Subtle grain / stone veins
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(34, 41);
      ctx.lineTo(124, 41);
      ctx.stroke();
      // Minimal ceramic bowl on table
      ctx.fillStyle = '#ece9e2';
      ctx.beginPath();
      ctx.ellipse(80, 34, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'storage': {
      drawFloorShadow(80, 88, 58, 10);
      // Slim metallic legs
      ctx.fillStyle = mMain;
      ctx.fillRect(32, 76, 4, 10);
      ctx.fillRect(124, 76, 4, 10);
      // Cabinet body
      roundedRect(ctx, 24, 30, 112, 48, 3);
      ctx.fillStyle = pMain;
      ctx.fill();
      // Top bevel highlight
      ctx.fillStyle = pLight;
      ctx.fillRect(24, 30, 112, 4);
      // 3 crisp cabinet doors with micro-reveals
      ctx.strokeStyle = pDeep;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(61, 34);
      ctx.lineTo(61, 77);
      ctx.moveTo(99, 34);
      ctx.lineTo(99, 77);
      ctx.stroke();
      // Vertical slim hardware handles
      ctx.fillStyle = mLight;
      ctx.fillRect(56, 46, 2.5, 16);
      ctx.fillRect(64, 46, 2.5, 16);
      ctx.fillRect(102, 46, 2.5, 16);
      break;
    }

    case 'kitchen': {
      drawFloorShadow(80, 90, 62, 10);
      // Upper wall cabinets
      roundedRect(ctx, 22, 14, 116, 24, 2);
      ctx.fillStyle = sMain;
      ctx.fill();
      // Under-cabinet warm LED strip
      ctx.fillStyle = '#f8e3b8';
      ctx.fillRect(24, 38, 112, 2);
      // Backsplash
      ctx.fillStyle = '#d8d3c9';
      ctx.fillRect(22, 40, 116, 15);
      // Countertop
      ctx.fillStyle = sMain;
      ctx.fillRect(20, 55, 120, 5);
      // Lower cabinets
      roundedRect(ctx, 22, 60, 116, 28, 2);
      ctx.fillStyle = pMain;
      ctx.fill();
      // Vertical module seams + sleek handles
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
      break;
    }

    case 'lighting': {
      drawFloorShadow(80, 91, 24, 6);
      // Warm glow halo behind shade
      const halo = ctx.createRadialGradient(80, 34, 4, 80, 34, 36);
      halo.addColorStop(0, 'rgba(255, 228, 175, 0.48)');
      halo.addColorStop(1, 'rgba(255, 228, 175, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(80, 34, 36, 0, Math.PI * 2);
      ctx.fill();
      // Base & slender stem
      ctx.fillStyle = mMain;
      ctx.beginPath();
      ctx.ellipse(80, 89, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(78.5, 42, 3, 46);
      // Lamp shade / opal globe
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
      break;
    }

    case 'art': {
      drawFloorShadow(80, 94, 38, 6);
      // Outer gallery frame
      roundedRect(ctx, 48, 12, 64, 80, 2);
      ctx.fillStyle = mMain;
      ctx.fill();
      // Canvas interior
      ctx.fillStyle = pMain;
      ctx.fillRect(53, 17, 54, 70);
      // Distinct mini abstract artwork per variant
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

    case 'textile': {
      drawFloorShadow(80, 86, 56, 12);
      // Draped pleated textile + woven rug preview
      for (let i = 0; i < 6; i++) {
        const x = 32 + i * 16;
        const grad = ctx.createLinearGradient(x, 16, x + 16, 16);
        grad.addColorStop(0, pDark);
        grad.addColorStop(0.45, pLight);
        grad.addColorStop(1, pDark);
        ctx.fillStyle = grad;
        roundedRect(ctx, x, 18, 16, 68, 3);
        ctx.fill();
      }
      // Subtle woven horizontal texture lines
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let y = 26; y <= 78; y += 8) {
        ctx.beginPath();
        ctx.moveTo(34, y);
        ctx.lineTo(126, y);
        ctx.stroke();
      }
      break;
    }

    case 'media_decor': {
      drawFloorShadow(80, 88, 60, 10);
      // Architectural backdrop / slats / partition panel
      roundedRect(ctx, 22, 16, 116, 68, 3);
      ctx.fillStyle = pMain;
      ctx.fill();
      // Vertical architectural slats / metal mullions
      ctx.fillStyle = mMain;
      for (let x = 28; x <= 130; x += 14) {
        ctx.fillRect(x, 18, 3, 64);
      }
      // Sleek floating dark screen / glass centerpiece
      roundedRect(ctx, 44, 28, 72, 42, 2);
      ctx.fillStyle = '#181a1c';
      ctx.fill();
      ctx.strokeStyle = mLight;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'bath_fixtures': {
      drawFloorShadow(80, 88, 52, 10);
      // Wall-hung vanity cabinet body
      roundedRect(ctx, 34, 46, 92, 34, 3);
      ctx.fillStyle = pMain;
      ctx.fill();
      // Crisp white ceramic countertop & vessel basin
      roundedRect(ctx, 32, 40, 96, 7, 2);
      ctx.fillStyle = sMain;
      ctx.fill();
      roundedRect(ctx, 56, 29, 48, 12, 5);
      ctx.fillStyle = '#f8f7f3';
      ctx.fill();
      // Sleek tall faucet / fixture metal accent
      ctx.strokeStyle = mLight;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(80, 29);
      ctx.lineTo(80, 17);
      ctx.lineTo(89, 17);
      ctx.stroke();
      // Drawer handle line
      ctx.fillStyle = mMain;
      ctx.fillRect(62, 58, 36, 3);
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
  thumbnailCache.set(spec.id, url);
  return url;
}

// ============================================================================
// LAZY PBR MATERIAL CACHE FOR LIVE 3D OBJECT VARIANT REPLACEMENT
// ============================================================================

export interface VariantMaterialBundle {
  primary: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  glass?: THREE.MeshStandardMaterial;
}

export interface ObjectVariantMaterialCache {
  getBundle: (variantId: string) => VariantMaterialBundle | null;
  dispose: () => void;
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
  const bundles = new Map<string, VariantMaterialBundle>();
  const textures: THREE.Texture[] = [];

  const getBundle = (variantId: string): VariantMaterialBundle | null => {
    const existing = bundles.get(variantId);
    if (existing) return existing;

    const spec = VARIANT_BY_ID.get(variantId);
    if (!spec) return null;

    const tex = createProceduralVariantTexture(spec, anisotropy);
    if (tex) textures.push(tex);

    const primary = new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : new THREE.Color(spec.primaryHex),
      map: tex ?? undefined,
      roughness: spec.roughness,
      metalness: spec.metalness,
      envMapIntensity: spec.metalness > 0.3 ? 0.85 : 0.42,
    });

    const secondary = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.secondaryHex),
      roughness: spec.secondaryRoughness ?? Math.min(0.95, spec.roughness + 0.04),
      metalness: 0.04,
      envMapIntensity: 0.42,
    });

    const metal = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.metalHex),
      roughness: spec.metalRoughness ?? 0.32,
      metalness: spec.metalMetalness ?? 0.82,
      envMapIntensity: 1.05,
    });

    let glass: THREE.MeshStandardMaterial | undefined;
    if (spec.glassTintHex) {
      glass = new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.glassTintHex),
        roughness: 0.08,
        metalness: 0.14,
        transparent: true,
        opacity: 0.34,
        envMapIntensity: 1.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    const bundle: VariantMaterialBundle = { primary, secondary, metal, glass };
    bundles.set(variantId, bundle);
    return bundle;
  };

  const dispose = () => {
    bundles.forEach((b) => {
      b.primary.dispose();
      b.secondary.dispose();
      b.metal.dispose();
      b.glass?.dispose();
    });
    bundles.clear();
    textures.forEach((t) => t.dispose());
    textures.length = 0;
  };

  return { getBundle, dispose };
}
