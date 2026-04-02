export type Rarity = 'NR' | 'MID' | 'Legendary' | 'Myth' | 'Secret' | 'Divine';

export type InfusionType = 'Lucky' | 'Corrupted' | 'Hollowed' | 'Darker' | 'Dragonic' | 'Radioactive' | 'Random';

export interface InfusedCrop {
  type: CropType;
  infusions: InfusionType[];
  count: number;
}

export type CropType = 
  | 'Carrot' | 'Orange' | 'Wheat' | 'Corn' | 'Dandelion'
  | 'Pumpkin' | 'Cactus' | 'Mango' | 'Kiwi'
  | 'Sky Ruller' | 'Moon Glower' | 'Sun Skaper' | 'Cozmic Apple'
  | 'Banana Tails' | 'Miniral Berys' | 'Trial Melon' | 'Crystal Strawberry' | 'Void Pear' | 'Prism Fruit'
  | 'Dragon Tooth' | 'Demonic Core' | 'God Apple' | 'Celestial Berry' | 'Heaven Fruit' | 'Light Core' | 'Angelic Mango';

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

export type ToolType = 'Hand' | 'Sickle' | 'Shovel' | 'Tonic';

export interface PlotState {
  id: number;
  crop: CropType | null;
  plantedAt: number | null; // timestamp
  isReady: boolean;
  infusions?: InfusionType[];
  tonicApplied?: boolean;
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

export type TutorialStep = 'welcome' | 'open_shop' | 'buy_seeds' | 'plant_crop' | 'harvest_crop' | 'completed';

export interface GameState {
  money: number;
  unlockedPlots: number;
  inventory: Record<string, number>;
  seedInventory: Partial<Record<CropType, number>>;
  animalInventory: Partial<Record<AnimalType, number>>;
  animalProductInventory: Partial<Record<AnimalProductType, number>>;
  tonicInventory: Partial<Record<InfusionType, number>>;
  plots: PlotState[];
  cages: CageState[];
  unlockedCages: number;
  animalAreaUnlocked: boolean;
  activeTool: ToolType;
  selectedSeed: CropType;
  selectedTonic: InfusionType | null;
  autoHarvestUntil: number | null; // timestamp
  hasPremiumPack: boolean;
  permanentAutoHarvest: boolean;
  hasGrowthBoost: boolean;
  tutorialStep: TutorialStep;
  hasCompletedTutorial: boolean;
  totalMoneyEarned: number;
  totalCropsHarvested: number;
  lastSaved: number;
}
