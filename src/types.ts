export type Rarity = 'NR' | 'MID' | 'Legendary' | 'Myth' | 'Secret';

export type CropType = 
  | 'Carrot' | 'Orange' | 'Wheat' | 'Corn' | 'Dandelion'
  | 'Pumpkin' | 'Cactus' | 'Mango' | 'Kiwi'
  | 'Sky Ruller' | 'Moon Glower' | 'Sun Skaper' | 'Cozmic Apple'
  | 'Banana Tails' | 'Miniral Berys' | 'Trial Melon' | 'Crystal Strawberry' | 'Void Pear' | 'Prism Fruit';

export interface CropData {
  type: CropType;
  displayName: string;
  rarity: Rarity;
  buyPrice: number;
  sellPrice: number;
  growTime: number; // in seconds
  icon: string;
  bonus?: string;
}

export type ToolType = 'Hand' | 'Sickle' | 'Shovel';

export interface PlotState {
  id: number;
  crop: CropType | null;
  plantedAt: number | null; // timestamp
  isReady: boolean;
}

export type AnimalType = 'Cow' | 'Sheep' | 'Duck' | 'Chicken';
export type AnimalProductType = 'Milk' | 'Wool' | 'Eggs' | 'Feathers';

export interface AnimalData {
  type: AnimalType;
  buyPrice: number;
  icon: string;
  product: AnimalProductType;
  productionTime: number; // in seconds
}

export interface AnimalProductData {
  type: AnimalProductType;
  sellPrice: number;
  icon: string;
}

export interface CageState {
  id: number;
  type: AnimalType | null;
  count: number;
  lastProduction: number | null; // timestamp
}

export interface GameState {
  money: number;
  unlockedPlots: number;
  inventory: Partial<Record<CropType, number>>;
  seedInventory: Partial<Record<CropType, number>>;
  animalInventory: Partial<Record<AnimalType, number>>;
  animalProductInventory: Partial<Record<AnimalProductType, number>>;
  plots: PlotState[];
  cages: CageState[];
  unlockedCages: number;
  animalAreaUnlocked: boolean;
  activeTool: ToolType;
  selectedSeed: CropType;
  autoHarvestUntil: number | null; // timestamp
  hasPremiumPack: boolean;
  permanentAutoHarvest: boolean;
  hasGrowthBoost: boolean;
}
