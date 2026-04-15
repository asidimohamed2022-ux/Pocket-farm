import { CropData, CropType, AnimalData, AnimalType, AnimalProductData, AnimalProductType, Rarity, InfusionType } from './types';

export const CROPS: Record<CropType, CropData> = {
  // NR (Normal)
  Carrot: { type: 'Carrot', displayName: 'Carrot', rarity: 'NR', buyPrice: 2, sellPrice: 5, growTime: 30, icon: '🥕' },
  Orange: { type: 'Orange', displayName: 'Orange', rarity: 'NR', buyPrice: 2, sellPrice: 5, growTime: 30, icon: '🍊' },
  Wheat: { type: 'Wheat', displayName: 'Wheat', rarity: 'NR', buyPrice: 10, sellPrice: 20, growTime: 120, icon: '🌾' },
  Corn: { type: 'Corn', displayName: 'Corn', rarity: 'NR', buyPrice: 25, sellPrice: 50, growTime: 300, icon: '🌽' },
  Dandelion: { type: 'Dandelion', displayName: 'Dandelion', rarity: 'NR', buyPrice: 5, sellPrice: 10, growTime: 60, icon: '🌼' },

  // MID
  Pumpkin: { type: 'Pumpkin', displayName: 'Pumpkin', rarity: 'MID', buyPrice: 100, sellPrice: 200, growTime: 900, icon: '🎃', bonus: 'Small growth boost' },
  Cactus: { type: 'Cactus', displayName: 'Cactus', rarity: 'MID', buyPrice: 50, sellPrice: 100, growTime: 1800, icon: '🌵', bonus: 'Hardy plant' },
  Mango: { type: 'Mango', displayName: 'Mango', rarity: 'MID', buyPrice: 125, sellPrice: 300, growTime: 3600, icon: '🥭', bonus: 'Extra juice' },
  Kiwi: { type: 'Kiwi', displayName: 'Kiwi', rarity: 'MID', buyPrice: 150, sellPrice: 350, growTime: 2700, icon: '🥝', bonus: 'Vitamin boost' },

  // Legendary
  'Sky Ruller': { type: 'Sky Ruller', displayName: 'Sky Ruller', rarity: 'Legendary', buyPrice: 500, sellPrice: 1400, growTime: 5100, icon: '☁️', bonus: 'Chance for extra coins' },
  'Moon Glower': { type: 'Moon Glower', displayName: 'Moon Glower', rarity: 'Legendary', buyPrice: 200, sellPrice: 550, growTime: 2700, icon: '🌙', bonus: 'Glows at night' },
  'Sun Skaper': { type: 'Sun Skaper', displayName: 'Sun Skaper', rarity: 'Legendary', buyPrice: 200, sellPrice: 550, growTime: 2700, icon: '☀️', bonus: 'Daylight boost' },
  'Cozmic Apple': { type: 'Cozmic Apple', displayName: 'Cozmic Apple', rarity: 'Legendary', buyPrice: 900, sellPrice: 2000, growTime: 1800, icon: '🍎', bonus: 'Interstellar taste' },

  // Myth
  'Banana Tails': { type: 'Banana Tails', displayName: 'Banana Tails', rarity: 'Myth', buyPrice: 1500, sellPrice: 5000, growTime: 2700, icon: '🍌', bonus: 'Pulsating energy' },
  'Miniral Berys': { type: 'Miniral Berys', displayName: 'Miniral Berys', rarity: 'Myth', buyPrice: 2000, sellPrice: 7000, growTime: 3600, icon: '🫐', bonus: 'Rich in minerals' },
  'Trial Melon': { type: 'Trial Melon', displayName: 'Trial Melon', rarity: 'Myth', buyPrice: 5000, sellPrice: 10000, growTime: 5400, icon: '🍉', bonus: 'Ancient power' },
  'Crystal Strawberry': { type: 'Crystal Strawberry', displayName: 'Crystal Strawberry', rarity: 'Myth', buyPrice: 6000, sellPrice: 15000, growTime: 7200, icon: '🍓', bonus: 'Shiny and sweet' },

  // Secret
  'Void Pear': { type: 'Void Pear', displayName: 'Void Pear', rarity: 'Secret', buyPrice: 8000, sellPrice: 20000, growTime: 10800, icon: '🌑', bonus: 'Cosmic particles' },
  'Prism Fruit': { type: 'Prism Fruit', displayName: 'Prism Fruit', rarity: 'Secret', buyPrice: 10000, sellPrice: 25000, growTime: 14400, icon: '🌀', bonus: 'Dark cosmic energy' },

  // New Myth
  'Dragon Tooth': { type: 'Dragon Tooth', displayName: 'Dragon Tooth', rarity: 'Myth', buyPrice: 7000, sellPrice: 17000, growTime: 9000, icon: '🦷', bonus: 'Sharp and powerful' },

  // New Secret
  'Demonic Core': { type: 'Demonic Core', displayName: 'Demonic Core', rarity: 'Secret', buyPrice: 15000, sellPrice: 40000, growTime: 16200, icon: '☢️', bonus: 'Highly unstable' },

  // Divine
  'God Apple': { type: 'God Apple', displayName: 'God Apple', rarity: 'Divine', buyPrice: 20000, sellPrice: 60000, growTime: 16200, icon: '🍎', bonus: 'Forbidden knowledge' },
  'Celestial Berry': { type: 'Celestial Berry', displayName: 'Celestial Berry', rarity: 'Divine', buyPrice: 25000, sellPrice: 75000, growTime: 18000, icon: '🫐', bonus: 'Star-touched' },
  'Heaven Fruit': { type: 'Heaven Fruit', displayName: 'Heaven Fruit', rarity: 'Divine', buyPrice: 30000, sellPrice: 90000, growTime: 19800, icon: '🍐', bonus: 'Angelic sweetness' },
  'Light Core': { type: 'Light Core', displayName: 'Light Core', rarity: 'Divine', buyPrice: 40000, sellPrice: 120000, growTime: 21600, icon: '✨', bonus: 'Pure radiance' },
  'Angelic Mango': { type: 'Angelic Mango', displayName: 'Angelic Mango', rarity: 'Divine', buyPrice: 50000, sellPrice: 150000, growTime: 23400, icon: '🥭', bonus: 'Divine flavor' },
};

export const ANIMALS: Record<AnimalType, AnimalData> = {
  Cow: { type: 'Cow', buyPrice: 200, icon: '🐄', product: 'Milk', productionTime: 60 },
  Sheep: { type: 'Sheep', buyPrice: 150, icon: '🐑', product: 'Wool', productionTime: 90 },
  Duck: { type: 'Duck', buyPrice: 100, icon: '🦆', product: 'Feathers', productionTime: 75 },
  Chicken: { type: 'Chicken', buyPrice: 50, icon: '🐔', product: 'Eggs', productionTime: 45 },
};

export const ANIMAL_PRODUCTS: Record<AnimalProductType, AnimalProductData> = {
  Milk: { type: 'Milk', sellPrice: 15, icon: '🥛' },
  Wool: { type: 'Wool', sellPrice: 25, icon: '🧶' },
  Eggs: { type: 'Eggs', sellPrice: 10, icon: '🥚' },
  Feathers: { type: 'Feathers', sellPrice: 20, icon: '🪶' },
};

export const INFUSIONS: Record<InfusionType, { multiplier: number; icon: string; color: string }> = {
  Lucky: { multiplier: 2, icon: '🍀', color: 'text-green-400' },
  Corrupted: { multiplier: 3, icon: '💀', color: 'text-purple-600' },
  Hollowed: { multiplier: 3, icon: '👻', color: 'text-blue-300' },
  Darker: { multiplier: 4, icon: '🌑', color: 'text-slate-900' },
  Dragonic: { multiplier: 5, icon: '🐲', color: 'text-red-600' },
  Radioactive: { multiplier: 10, icon: '☢️', color: 'text-yellow-400' },
  Random: { multiplier: 1, icon: '?', color: 'text-slate-400' },
};

export const TONIC_PRICES: Record<InfusionType, number> = {
  Lucky: 150,
  Corrupted: 400,
  Hollowed: 400,
  Darker: 800,
  Dragonic: 2000,
  Radioactive: 10000,
  Random: 1000,
};

export const TONICS: Record<InfusionType, { displayName: string; icon: string; buyPrice: number }> = {
  Lucky: { displayName: 'Lucky Tonic', icon: '🧪', buyPrice: TONIC_PRICES.Lucky },
  Corrupted: { displayName: 'Corrupted Tonic', icon: '🧪', buyPrice: TONIC_PRICES.Corrupted },
  Hollowed: { displayName: 'Hollowed Tonic', icon: '🧪', buyPrice: TONIC_PRICES.Hollowed },
  Darker: { displayName: 'Darker Tonic', icon: '🧪', buyPrice: TONIC_PRICES.Darker },
  Dragonic: { displayName: 'Dragonic Tonic', icon: '🧪', buyPrice: TONIC_PRICES.Dragonic },
  Radioactive: { displayName: 'Radioactive Tonic', icon: '🧪', buyPrice: TONIC_PRICES.Radioactive },
  Random: { displayName: 'Random Tonic', icon: '🧪', buyPrice: TONIC_PRICES.Random },
};

export const INITIAL_MONEY = 15;
export const INITIAL_PLOTS = 4;
export const PLOT_COST = 100;
export const ANIMAL_AREA_COST = 300;
export const CAGE_COST = 100;
export const INITIAL_CAGES = 4;
export const MAX_CAGES = 8;
export const AUTO_HARVEST_DURATION = 3600 * 1000; // 1 hour in ms
export const PREMIUM_PACK_PRICE = 2.99; // 2.99 USD

export const RARITY_ORDER: Rarity[] = ['NR', 'MID', 'Legendary', 'Myth', 'Secret', 'Divine'];
