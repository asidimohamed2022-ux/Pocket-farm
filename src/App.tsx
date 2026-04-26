/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  Sprout, 
  Hand, 
  Trash2, 
  ShoppingBasket, 
  Package, 
  Store, 
  Zap, 
  Coins,
  ChevronUp,
  ChevronDown,
  Play,
  X,
  Check,
  PawPrint,
  Bird,
  Home,
  Plus,
  Star,
  Gift,
  User,
  HelpCircle,
  FlaskConical,
  RotateCcw,
  MessageCircle,
  Instagram,
  Settings,
  Languages,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CropType, ToolType, PlotState, GameState, Rarity, AnimalType, CageState, AnimalProductType, InfusionType } from './types';
import { TRANSLATIONS, LANGUAGES, LanguageCode } from './translations';
import { 
  CROPS, 
  ANIMALS,
  ANIMAL_PRODUCTS,
  INITIAL_MONEY, 
  INITIAL_PLOTS, 
  PLOT_COST, 
  AUTO_HARVEST_DURATION,
  ANIMAL_AREA_COST,
  CAGE_COST,
  INITIAL_CAGES,
  MAX_CAGES,
  PREMIUM_PACK_PRICE,
  INFUSIONS,
  TONIC_PRICES,
  TONICS,
  RARITY_ORDER
} from './constants';

// --- Constants & Helpers ---

const getInfusedCropKey = (type: CropType, infusions?: InfusionType[], isFavorite: boolean = false) => {
  const infusionsPart = infusions && infusions.length > 0 ? [...infusions].sort().join(',') : '';
  return `${type}|${infusionsPart}|${isFavorite}`;
};

const parseInfusedCropKey = (key: string): { type: CropType, infusions: InfusionType[], isFavorite: boolean } => {
  const parts = key.split('|');
  if (parts.length === 3) {
    const [type, infusionsStr, isFavoriteStr] = parts;
    return { 
      type: type as CropType, 
      infusions: infusionsStr ? infusionsStr.split(',') as InfusionType[] : [], 
      isFavorite: isFavoriteStr === 'true' 
    };
  }
  // Fallback for old keys
  const [type, ...infusions] = key.split('|');
  return { type: type as CropType, infusions: infusions as InfusionType[], isFavorite: false };
};

const getInfusionMultiplier = (infusions: InfusionType[]) => {
  if (!infusions || !Array.isArray(infusions) || !INFUSIONS) return 1;
  return infusions.reduce((acc, inf) => {
    const infusion = INFUSIONS[inf];
    return acc * (infusion ? infusion.multiplier : 1);
  }, 1);
};

const INITIAL_STATE_BASE: Omit<GameState, 'lastSaved'> = {
  money: INITIAL_MONEY,
  unlockedPlots: INITIAL_PLOTS,
  inventory: {},
  seedInventory: {},
  animalInventory: {},
  animalProductInventory: {},
  tonicInventory: {},
  plots: Array.from({ length: 16 }, (_, i) => ({
    id: i,
    crop: null,
    plantedAt: null,
    isReady: false,
    infusions: []
  })),
  cages: Array.from({ length: MAX_CAGES }, (_, i) => ({
    id: i,
    type: null,
    count: 0,
    lastProduction: null
  })),
  unlockedCages: INITIAL_CAGES,
  animalAreaUnlocked: false,
  activeTool: 'Hand',
  selectedSeed: 'Carrot',
  selectedTonic: null,
  autoHarvestUntil: null,
  hasPremiumPack: false,
  permanentAutoHarvest: false,
  hasGrowthBoost: false,
  tutorialStep: 'welcome',
  hasCompletedTutorial: false,
  totalMoneyEarned: 0,
  totalCropsHarvested: 0,
  language: 'en'
};

const formatNumberShort = (num: number) => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString();
};

const formatTimeShort = (seconds: number) => {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return seconds + 's';
};

const formatCurrency = (amount: number) => {
  return `£${formatNumberShort(amount)}`;
};

const rollForInfusions = (): InfusionType[] => {
  const infusions: InfusionType[] = [];
  const chances: Record<InfusionType, number> = {
    Lucky: 0.05,
    Corrupted: 0.03,
    Hollowed: 0.03,
    Darker: 0.02,
    Dragonic: 0.01,
    Radioactive: 0.005,
    Random: 0,
  };

  Object.entries(chances).forEach(([type, chance]) => {
    if (Math.random() < chance) {
      infusions.push(type as InfusionType);
    }
  });

  return infusions;
};

const sortCrops = (cropTypes: string[]) => {
  return [...cropTypes].sort((a, b) => {
    const { type: typeA, infusions: infA, isFavorite: favA } = parseInfusedCropKey(a);
    const { type: typeB, infusions: infB, isFavorite: favB } = parseInfusedCropKey(b);

    // Favorite first
    if (favA && !favB) return -1;
    if (favB && !favA) return 1;

    // Then by multiplier (infusions)
    const multA = getInfusionMultiplier(infA);
    const multB = getInfusionMultiplier(infB);
    if (multB !== multA) return multB - multA;

    const cropA = CROPS[typeA];
    const cropB = CROPS[typeB];
    const rarityDiff = RARITY_ORDER.indexOf(cropA.rarity) - RARITY_ORDER.indexOf(cropB.rarity);
    if (rarityDiff !== 0) return rarityDiff;
    return cropA.buyPrice - cropB.buyPrice;
  });
};

// --- Components ---

const RarityEffect = memo(({ rarity, children, className = "" }: { rarity: Rarity; children: React.ReactNode; className?: string }) => {
  const effects: Record<Rarity, string> = {
    NR: "",
    MID: "shadow-[0_0_10px_rgba(255,255,255,0.5)]",
    Legendary: "shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse",
    Myth: "shadow-[0_0_20px_rgba(147,51,234,0.7)] animate-pulse",
    Secret: "shadow-[0_0_25px_rgba(0,0,0,0.8)] bg-slate-200 animate-pulse",
    Divine: "shadow-[0_0_35px_rgba(255,255,255,0.9),0_0_20px_rgba(255,215,0,0.8)] bg-amber-300 animate-pulse",
  };

  return (
    <div className={`relative rounded-2xl ${effects[rarity]} ${className}`}>
      {rarity === 'Legendary' && (
        <div key="legendary-effect" className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`legendary-sparkle-${i}`}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: [0, (i - 2) * 10], y: [0, (i - 2) * -10] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
              className="absolute top-1/2 left-1/2 w-1 h-1 bg-yellow-300 rounded-full"
            />
          ))}
        </div>
      )}
      {rarity === 'Secret' && (
        <div key="secret-effect" className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`secret-sparkle-${i}`}
              animate={{ opacity: [0, 0.5, 0], scale: [0.5, 1.5, 0.5], x: [0, (i - 4) * 5], y: [0, (i - 4) * 5] }}
              transition={{ repeat: Infinity, duration: 3, delay: i * 0.3 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-500/30 blur-sm rounded-full"
            />
          ))}
        </div>
      )}
      {children}
    </div>
  );
});

const Plot = memo(({ 
  plot, 
  activeTool, 
  onInteract,
  hasGrowthBoost
}: { 
  plot: PlotState; 
  activeTool: ToolType; 
  onInteract: (id: number) => void;
  hasGrowthBoost: boolean;
}) => {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (plot.crop && plot.plantedAt && !plot.isReady) {
      const cropData = CROPS[plot.crop];
      const updateProgress = () => {
        const elapsed = (Date.now() - plot.plantedAt!) / 1000;
        const effectiveGrowTime = hasGrowthBoost ? cropData.growTime * 0.8 : cropData.growTime;
        const p = Math.min((elapsed / effectiveGrowTime) * 100, 100);
        setProgress(p);
        if (p < 100) {
          timerRef.current = setTimeout(updateProgress, 100);
        }
      };
      updateProgress();
    } else {
      setProgress(plot.isReady ? 100 : 0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [plot.crop, plot.plantedAt, plot.isReady]);

  const cropData = plot.crop ? CROPS[plot.crop] : null;

  return (
    <motion.div 
      layout
      whileTap={{ scale: 0.95 }}
      onClick={() => onInteract(plot.id)}
      className="relative w-full aspect-square bg-amber-900/40 rounded-xl border-2 border-amber-900/20 flex items-center justify-center cursor-pointer overflow-hidden shadow-inner"
    >
      {!plot.crop && (
        <div className="text-amber-900/20">
          <Sprout size={32} />
        </div>
      )}

      {plot.crop && (
        <div className="relative flex flex-col items-center">
          <RarityEffect rarity={cropData?.rarity || 'NR'}>
            <motion.span 
              key="crop-icon"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: plot.isReady ? 1.2 : 0.5 + (progress / 200),
                opacity: 1 
              }}
              className="text-4xl filter drop-shadow-md block p-2"
            >
              {cropData?.icon}
            </motion.span>
          </RarityEffect>
          
          {/* Infusion Icons */}
          {(plot.infusions && plot.infusions.length > 0 || plot.tonicApplied) && (
            <div className="absolute -top-2 -right-2 flex flex-col gap-0.5">
              {plot.tonicApplied && (
                <motion.div
                  key="tonic-indicator"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-purple-100 rounded-full p-0.5 shadow-sm border border-purple-200 flex items-center justify-center"
                  title="Tonic Applied"
                >
                  <span className="text-[10px]">🧪</span>
                </motion.div>
              )}
              {plot.infusions && plot.infusions.map((inf, i) => (
                <motion.div
                  key={`infusion-${i}`}
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="bg-white/90 rounded-full p-0.5 shadow-sm border border-slate-200 flex items-center justify-center"
                  title={inf}
                >
                  <span className="text-[10px]">{INFUSIONS[inf]?.icon || '✨'}</span>
                </motion.div>
              ))}
            </div>
          )}
          
          {!plot.isReady && (
            <div className="absolute -bottom-4 w-12 h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-100" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          )}

          {plot.isReady && (
            <motion.div 
              key="ready-indicator"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-6 bg-white rounded-full p-1 shadow-lg z-10"
            >
              <Check size={12} className="text-green-600" />
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
});

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'farm'>('menu');
  const [gameState, setGameState] = useState<GameState>({
    ...INITIAL_STATE_BASE,
    lastSaved: Date.now(),
  });

  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState<'seeds' | 'tonics'>('seeds');
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<'crops' | 'animals' | 'tonics'>('crops');
  const [showAnimalScreen, setShowAnimalScreen] = useState(false);
  const [showAnimalShop, setShowAnimalShop] = useState(false);
  const [showAnimalSelector, setShowAnimalSelector] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState<number | null>(null);
  const [showTonicSelector, setShowTonicSelector] = useState<number | null>(null);
  const [pendingTonicPlotId, setPendingTonicPlotId] = useState<number | null>(null);
  const [showAutoHarvestInfo, setShowAutoHarvestInfo] = useState(false);
  const [showPremiumPackInfo, setShowPremiumPackInfo] = useState(false);
  const [showRoyMenu, setShowRoyMenu] = useState(false);
  const [showRoyHelp, setShowRoyHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<'main' | 'fruits' | 'infusions'>('main');
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [spinResult, setSpinResult] = useState<CropType | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineReadyCount, setOfflineReadyCount] = useState(0);
  const [showSellAllConfirm, setShowSellAllConfirm] = useState(false);
  const [sellAllFeedback, setSellAllFeedback] = useState<string | null>(null);
  const [showFullMoney, setShowFullMoney] = useState(false);

  const t = (key: string) => {
    return TRANSLATIONS[gameState.language]?.[key] || TRANSLATIONS['en'][key] || key;
  };

  const handleReset = () => {
    const newState = {
      ...INITIAL_STATE_BASE,
      lastSaved: Date.now(),
      language: gameState.language // Keep language preference
    };
    setGameState(newState);
    setShowResetConfirm(false);
    setShowSettings(false);
    setScreen('menu');
  };

  // --- Persistence & Notifications ---
  
  // Load game state
  useEffect(() => {
    const saved = localStorage.getItem('pocket_farm_save_v3');
    if (saved) {
      try {
        const parsed: GameState = JSON.parse(saved);
        if (!parsed.tonicInventory) parsed.tonicInventory = {};
        if (!parsed.animalProductInventory) parsed.animalProductInventory = {};
        if (!parsed.inventory) parsed.inventory = {};
        if (!parsed.seedInventory) parsed.seedInventory = {};
        if (!parsed.animalInventory) parsed.animalInventory = {};
        if (!parsed.cages) parsed.cages = [];
        if (!parsed.plots) parsed.plots = [];
        if (!parsed.language) parsed.language = 'en';
        
        const now = Date.now();
        let readyCount = 0;

        // Calculate offline growth
        const updatedPlots = parsed.plots.map(plot => {
          const infusions = plot.infusions || [];
          if (plot.crop && plot.plantedAt && !plot.isReady) {
            const cropData = CROPS[plot.crop];
            const effectiveGrowTime = parsed.hasGrowthBoost ? cropData.growTime * 0.8 : cropData.growTime;
            const elapsed = (now - plot.plantedAt) / 1000;
            
            // Roll for infusions for the time it was growing
            const newInfusions = [...infusions];
            const chances: Record<InfusionType, number> = {
              Lucky: 0.0005,
              Corrupted: 0.0003,
              Hollowed: 0.0003,
              Darker: 0.0002,
              Dragonic: 0.0001,
              Radioactive: 0.00005,
              Random: 0,
            };
            
            const rollTime = Math.min(elapsed, effectiveGrowTime);
            (Object.keys(chances) as InfusionType[]).forEach(type => {
              const p = 1 - Math.pow(1 - chances[type], rollTime);
              if (Math.random() < p) {
                newInfusions.push(type);
              }
            });

            if (elapsed >= effectiveGrowTime) {
              readyCount++;
              return { ...plot, isReady: true, infusions: newInfusions };
            }
            return { ...plot, infusions: newInfusions };
          }
          return { ...plot, infusions };
        });

        // Calculate offline animal production
        const newProductInventory = { ...parsed.animalProductInventory };
        const updatedCages = parsed.cages.map(cage => {
          if (cage.type && cage.count > 0 && cage.lastProduction) {
            const animalData = ANIMALS[cage.type];
            const elapsedSeconds = (now - cage.lastProduction) / 1000;
            const cycles = Math.floor(elapsedSeconds / animalData.productionTime);
            
            if (cycles > 0) {
              const productType = animalData.product;
              newProductInventory[productType] = (newProductInventory[productType] || 0) + (cycles * cage.count);
              return { ...cage, lastProduction: now - (elapsedSeconds % animalData.productionTime) * 1000 };
            }
          }
          return cage;
        });

        setGameState({ 
          ...parsed, 
          plots: updatedPlots, 
          cages: updatedCages, 
          animalProductInventory: newProductInventory,
          lastSaved: now 
        });
        
        if (readyCount > 0) {
          setOfflineReadyCount(readyCount);
          setShowOfflineModal(true);
          sendOfflineNotification(readyCount);
        }
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }

    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === "granted");
      });
    }
  }, []);

  // Save game state
  useEffect(() => {
    const save = () => {
      localStorage.setItem('pocket_farm_save_v3', JSON.stringify({
        ...gameState,
        lastSaved: Date.now()
      }));
    };
    const timeout = setTimeout(save, 1000); // Debounce save
    return () => clearTimeout(timeout);
  }, [gameState]);

  const sendOfflineNotification = (count: number) => {
    if (notificationsEnabled && document.visibilityState === 'hidden') {
      const n = new Notification("Pocket Farm", {
        body: `Your farm was busy 🌱 ${count} crops are ready to harvest!`,
        icon: "/favicon.ico",
        tag: "offline-ready",
        // Note: actions are only supported in service workers, but we can use onclick
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  };

  const sendNotification = (cropType: CropType) => {
    if (notificationsEnabled && document.visibilityState === 'hidden') {
      const cropData = CROPS[cropType];
      new Notification("Pocket Farm", {
        body: `Your ${cropData.displayName} is ready to harvest!`,
        icon: "/favicon.ico",
        tag: `crop-ready-${cropType}`
      });
    }
  };

  const collectAllReady = () => {
    setGameState(prev => {
      const newInventory = { ...prev.inventory };
      let harvestedCount = 0;
      const newPlots = prev.plots.map(plot => {
        if (plot.isReady && plot.crop) {
          const key = getInfusedCropKey(plot.crop, plot.infusions);
          newInventory[key] = (newInventory[key] || 0) + 1;
          harvestedCount++;
          return { ...plot, crop: null, plantedAt: null, isReady: false, infusions: [] };
        }
        return plot;
      });
      return { 
        ...prev, 
        inventory: newInventory, 
        plots: newPlots,
        totalCropsHarvested: prev.totalCropsHarvested + harvestedCount
      };
    });
    setShowOfflineModal(false);
  };

  // --- Game Loop ---

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => {
        let changed = false;
        const now = Date.now();
        const newPlots = prev.plots.map(plot => {
          if (plot.crop && plot.plantedAt && !plot.isReady) {
            const cropData = CROPS[plot.crop];
            const effectiveGrowTime = prev.hasGrowthBoost ? cropData.growTime * 0.8 : cropData.growTime;
            
            // Roll for infusions during growth
            const newInfusions = [...(plot.infusions || [])];
            const chances: Record<InfusionType, number> = {
              Lucky: 0.0005,
              Corrupted: 0.0003,
              Hollowed: 0.0003,
              Darker: 0.0002,
              Dragonic: 0.0001,
              Radioactive: 0.00005,
              Random: 0,
            };

            (Object.keys(chances) as InfusionType[]).forEach(type => {
              if (Math.random() < chances[type]) {
                newInfusions.push(type);
                changed = true;
              }
            });

            if (now - plot.plantedAt >= effectiveGrowTime * 1000) {
              changed = true;
              sendNotification(plot.crop);
              return { ...plot, isReady: true, infusions: newInfusions };
            }

            if (newInfusions.length !== (plot.infusions?.length || 0)) {
              return { ...plot, infusions: newInfusions };
            }
          }
          return plot;
        });

        // Auto-harvest logic
        let newInventory = { ...prev.inventory };
        let harvestedCount = 0;
        let autoHarvestUntil = prev.autoHarvestUntil;
        
        // Clear expired auto-harvest
        if (autoHarvestUntil && now >= autoHarvestUntil && !prev.permanentAutoHarvest) {
          autoHarvestUntil = null;
          changed = true;
        }

        const isAutoHarvestActive = (autoHarvestUntil && now < autoHarvestUntil) || prev.permanentAutoHarvest;

        if (isAutoHarvestActive) {
          newPlots.forEach((plot, idx) => {
            if (plot.isReady && idx < prev.unlockedPlots) {
              changed = true;
              const cropType = plot.crop!;
              const infusions = plot.infusions || [];
              const key = getInfusedCropKey(cropType, infusions);
              
              newInventory[key] = (newInventory[key] || 0) + 1;
              harvestedCount++;
              newPlots[idx] = { ...plot, crop: null, plantedAt: null, isReady: false, infusions: [] };
            }
          });
        }

        if (changed) {
          return { 
            ...prev, 
            plots: newPlots, 
            inventory: newInventory,
            autoHarvestUntil,
            totalCropsHarvested: prev.totalCropsHarvested + harvestedCount
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [notificationsEnabled]);

  // --- Actions ---

  const handlePlotInteract = (id: number) => {
    if (id >= gameState.unlockedPlots) return;

    const plot = gameState.plots[id];
    const tool = gameState.activeTool;

    if (tool === 'Hand') {
      if (!plot.crop) {
        setShowSeedSelector(id);
      }
    } else if (tool === 'Sickle') {
      if (plot.isReady) {
        const cropType = plot.crop!;
        const infusions = plot.infusions || [];
        const key = getInfusedCropKey(cropType, infusions);
        
        setGameState(prev => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            [key]: (prev.inventory[key] || 0) + 1
          },
          totalCropsHarvested: prev.totalCropsHarvested + 1,
          plots: prev.plots.map(p => p.id === id ? {
            ...p,
            crop: null,
            plantedAt: null,
            isReady: false,
            infusions: []
          } : p)
        }));
      }
    } else if (tool === 'Shovel') {
      if (plot.crop) {
        setGameState(prev => ({
          ...prev,
          plots: prev.plots.map(p => p.id === id ? {
            ...p,
            crop: null,
            plantedAt: null,
            isReady: false,
            infusions: []
          } : p)
        }));
      }
    } else if (tool === 'Tonic') {
      if (plot.crop && !plot.isReady) {
        if (gameState.selectedTonic) {
          const tonicType = gameState.selectedTonic;
          if ((gameState.tonicInventory[tonicType] || 0) > 0) {
            // Logic for Random Tonic
            let infusionToApply: InfusionType = tonicType;
            if (tonicType === 'Random') {
              const availableInfusions: InfusionType[] = ['Lucky', 'Corrupted', 'Hollowed', 'Darker', 'Dragonic', 'Radioactive'];
              infusionToApply = availableInfusions[Math.floor(Math.random() * availableInfusions.length)];
            }

            setGameState(prev => ({
              ...prev,
              tonicInventory: {
                ...prev.tonicInventory,
                [tonicType]: (prev.tonicInventory[tonicType] || 0) - 1
              },
              plots: prev.plots.map(p => p.id === id ? {
                ...p,
                infusions: [...(p.infusions || []), infusionToApply],
                tonicApplied: true
              } : p)
            }));
          } else {
            // Out of stock, show inventory tonics tab
            setPendingTonicPlotId(id);
            setInventoryTab('tonics');
            setShowInventory(true);
          }
        } else {
          // No tonic selected, show inventory tonics tab
          setPendingTonicPlotId(id);
          setInventoryTab('tonics');
          setShowInventory(true);
        }
      }
    }
  };

  const plantSeed = (plotId: number, type: CropType) => {
    if ((gameState.seedInventory[type] || 0) > 0) {
      setGameState(prev => ({
        ...prev,
        seedInventory: {
          ...prev.seedInventory,
          [type]: (prev.seedInventory[type] || 0) - 1
        },
        plots: prev.plots.map(p => p.id === plotId ? {
          ...p,
          crop: type,
          plantedAt: Date.now(),
          isReady: false,
          infusions: []
        } : p)
      }));
      setShowSeedSelector(null);
    }
  };

  const buySeed = (type: CropType) => {
    const cropData = CROPS[type];
    if (gameState.money >= cropData.buyPrice) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - cropData.buyPrice,
        seedInventory: {
          ...prev.seedInventory,
          [type]: (prev.seedInventory[type] || 0) + 1
        }
      }));
    }
  };

  const buyTonic = (type: InfusionType) => {
    if (!TONIC_PRICES) return;
    const price = TONIC_PRICES[type];
    if (price !== undefined && gameState.money >= price) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - price,
        tonicInventory: {
          ...prev.tonicInventory,
          [type]: ((prev.tonicInventory && prev.tonicInventory[type]) || 0) + 1
        }
      }));
    }
  };

  const buyPlot = () => {
    if (gameState.money >= PLOT_COST && gameState.unlockedPlots < 16) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - PLOT_COST,
        unlockedPlots: prev.unlockedPlots + 1
      }));
    }
  };

  const sellCrop = (inventoryKey: string) => {
    const { type, infusions, isFavorite } = parseInfusedCropKey(inventoryKey);
    if (isFavorite) return; // Cannot sell favorite
    if ((gameState.inventory[inventoryKey] || 0) > 0) {
      const cropData = CROPS[type];
      const multiplier = getInfusionMultiplier(infusions);
      const finalPrice = Math.floor(cropData.sellPrice * multiplier);
      
      setGameState(prev => ({
        ...prev,
        money: prev.money + finalPrice,
        totalMoneyEarned: prev.totalMoneyEarned + finalPrice,
        inventory: {
          ...prev.inventory,
          [inventoryKey]: (prev.inventory[inventoryKey] || 0) - 1
        }
      }));
    }
  };

  const sellAnimalProduct = (type: AnimalProductType) => {
    if ((gameState.animalProductInventory[type] || 0) > 0) {
      const productData = ANIMAL_PRODUCTS[type];
      setGameState(prev => ({
        ...prev,
        money: prev.money + productData.sellPrice,
        totalMoneyEarned: prev.totalMoneyEarned + productData.sellPrice,
        animalProductInventory: {
          ...prev.animalProductInventory,
          [type]: (prev.animalProductInventory[type] || 0) - 1
        }
      }));
    }
  };

  const sellAll = () => {
    let totalEarnings = 0;
    
    // Calculate crop earnings
    Object.keys(gameState.inventory).forEach(key => {
      const { type, infusions, isFavorite } = parseInfusedCropKey(key);
      if (isFavorite) return; // Skip favorite
      const count = gameState.inventory[key] || 0;
      if (count > 0) {
        const multiplier = getInfusionMultiplier(infusions);
        totalEarnings += count * Math.floor(CROPS[type].sellPrice * multiplier);
      }
    });

    // Calculate animal product earnings
    (Object.keys(gameState.animalProductInventory) as AnimalProductType[]).forEach(type => {
      const count = gameState.animalProductInventory[type] || 0;
      if (count > 0) {
        totalEarnings += count * ANIMAL_PRODUCTS[type].sellPrice;
      }
    });

    if (totalEarnings > 0) {
      setGameState(prev => {
        const newInventory = { ...prev.inventory };
        const newAnimalProductInventory = { ...prev.animalProductInventory };
        
        // Clear inventories (except favorite)
        Object.keys(newInventory).forEach(key => {
          const { isFavorite } = parseInfusedCropKey(key);
          if (!isFavorite) {
            newInventory[key] = 0;
          }
        });
        Object.keys(newAnimalProductInventory).forEach(key => {
          newAnimalProductInventory[key as AnimalProductType] = 0;
        });

        return {
          ...prev,
          money: prev.money + totalEarnings,
          totalMoneyEarned: prev.totalMoneyEarned + totalEarnings,
          inventory: newInventory,
          animalProductInventory: newAnimalProductInventory
        };
      });
      
      setSellAllFeedback(`Sold all items for £${formatNumberShort(totalEarnings)}`);
      setTimeout(() => setSellAllFeedback(null), 3000);
    }
    
    setShowSellAllConfirm(false);
  };

  const toggleFavorite = (key: string) => {
    const { type, infusions, isFavorite } = parseInfusedCropKey(key);
    
    setGameState(prev => {
      const newInventory = { ...prev.inventory };
      const currentCount = newInventory[key] || 0;
      
      if (currentCount <= 0) return prev;

      // Decrement current stack
      if (currentCount === 1) {
        delete newInventory[key];
      } else {
        newInventory[key] = currentCount - 1;
      }

      // Toggle favorite status for the ONE item
      const newKey = getInfusedCropKey(type, infusions, !isFavorite);
      newInventory[newKey] = (newInventory[newKey] || 0) + 1;

      return {
        ...prev,
        inventory: newInventory
      };
    });
  };

  const activateAutoHarvest = () => {
    // Simulate ad watch
    const confirm = window.confirm("Watch a quick ad to activate 1-hour Auto-Harvest?");
    if (confirm) {
      setGameState(prev => ({
        ...prev,
        autoHarvestUntil: Date.now() + AUTO_HARVEST_DURATION
      }));
    }
  };

  const buyPremiumPack = () => {
    setGameState(prev => {
      if (prev.hasPremiumPack) return prev;

      const newUnlockedPlots = Math.min(16, prev.unlockedPlots + 2);
      const newAnimalInventory = { ...prev.animalInventory };
      (Object.keys(ANIMALS) as AnimalType[]).forEach(type => {
        newAnimalInventory[type] = (newAnimalInventory[type] || 0) + 1;
      });

      return {
        ...prev,
        money: prev.money + 300,
        unlockedPlots: newUnlockedPlots,
        animalAreaUnlocked: true,
        animalInventory: newAnimalInventory,
        hasPremiumPack: true,
        permanentAutoHarvest: true,
        hasGrowthBoost: true
      };
    });
  };

  const getTimeRemaining = (until: number) => {
    const remaining = until - Date.now();
    if (remaining <= 0) return null;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpin = () => {
    if (gameState.money < 250) return;

    setGameState(prev => ({ ...prev, money: prev.money - 250 }));

    // Rarity weights
    const rand = Math.random() * 100;
    let rarity: Rarity = 'NR';
    if (rand < 1) rarity = 'Divine';
    else if (rand < 4) rarity = 'Secret';
    else if (rand < 10) rarity = 'Myth';
    else if (rand < 20) rarity = 'Legendary';
    else if (rand < 50) rarity = 'MID';
    else rarity = 'NR';

    const possibleCrops = (Object.keys(CROPS) as CropType[]).filter(type => CROPS[type].rarity === rarity);
    const wonCrop = possibleCrops[Math.floor(Math.random() * possibleCrops.length)];

    setGameState(prev => ({
      ...prev,
      seedInventory: {
        ...prev.seedInventory,
        [wonCrop]: (prev.seedInventory[wonCrop] || 0) + 1
      }
    }));

    setSpinResult(wonCrop);
    setShowRoyMenu(false);
  };

  const [timeStr, setTimeStr] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      if (gameState.permanentAutoHarvest) {
        setTimeStr(null);
      } else if (gameState.autoHarvestUntil) {
        const remaining = getTimeRemaining(gameState.autoHarvestUntil);
        setTimeStr(remaining);
      } else {
        setTimeStr(null);
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [gameState.autoHarvestUntil, gameState.permanentAutoHarvest]);

  // --- Animal Production ---
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => {
        let updated = false;
        const newCages = prev.cages.map(cage => {
          if (cage.type && cage.count > 0) {
            const animalData = ANIMALS[cage.type];
            const now = Date.now();
            const lastProd = cage.lastProduction || now;
            const elapsed = (now - lastProd) / 1000;
            
            if (elapsed >= animalData.productionTime) {
              updated = true;
              return { ...cage, lastProduction: now };
            }
          }
          return cage;
        });

        if (updated) {
          const newProductInventory = { ...prev.animalProductInventory };
          prev.cages.forEach((cage, index) => {
            const newCage = newCages[index];
            if (newCage.lastProduction !== cage.lastProduction && newCage.type) {
              const animalData = ANIMALS[newCage.type];
              const productType = animalData.product;
              newProductInventory[productType] = (newProductInventory[productType] || 0) + newCage.count;
            }
          });
          return { ...prev, cages: newCages, animalProductInventory: newProductInventory };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const buyAnimalArea = () => {
    if (gameState.money >= ANIMAL_AREA_COST && !gameState.animalAreaUnlocked) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - ANIMAL_AREA_COST,
        animalAreaUnlocked: true
      }));
    }
  };

  const buyAnimal = (type: AnimalType) => {
    const animalData = ANIMALS[type];
    if (gameState.money >= animalData.buyPrice) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - animalData.buyPrice,
        animalInventory: {
          ...prev.animalInventory,
          [type]: (prev.animalInventory[type] || 0) + 1
        }
      }));
    }
  };

  const buyCage = () => {
    if (gameState.money >= CAGE_COST && gameState.unlockedCages < MAX_CAGES) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - CAGE_COST,
        unlockedCages: prev.unlockedCages + 1
      }));
    }
  };

  const placeAnimal = (cageId: number, type: AnimalType) => {
    const cage = gameState.cages[cageId];
    const inventoryCount = gameState.animalInventory[type] || 0;

    if (inventoryCount > 0) {
      const canPlace = !cage.type || (cage.type === type && cage.count < 2);
      
      if (canPlace) {
        setGameState(prev => ({
          ...prev,
          animalInventory: {
            ...prev.animalInventory,
            [type]: inventoryCount - 1
          },
          cages: prev.cages.map(c => c.id === cageId ? {
            ...c,
            type: type,
            count: c.count + 1,
            lastProduction: c.count === 0 ? Date.now() : c.lastProduction
          } : c)
        }));
        setShowAnimalSelector(null);
      }
    }
  };

  const hasSellableItems = Object.keys(gameState.inventory).some(key => {
    const { isFavorite } = parseInfusedCropKey(key);
    return !isFavorite && (gameState.inventory[key] || 0) > 0;
  }) || (Object.values(gameState.animalProductInventory) as number[]).some(count => (count || 0) > 0);

  // --- Render Helpers ---

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-green-100 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-12"
        >
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-green-600 mb-4 inline-block">
            <Sprout size={80} className="text-green-600" />
          </div>
          <h1 className="text-5xl font-black text-green-800 tracking-tight">Pocket Farm</h1>
          <p className="text-green-700 font-medium mt-2">{t('subtitle')}</p>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setScreen('farm')}
          className="bg-green-600 text-white px-12 py-4 rounded-full text-2xl font-bold shadow-lg flex items-center gap-3"
        >
          <Play fill="currentColor" /> {t('play')}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col max-w-md mx-auto relative overflow-hidden font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-20" dir={gameState.language === 'ar' || gameState.language === 'ur' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200 shrink-0">
          <Coins className="text-amber-600" size={20} />
          {gameState.money >= 1000000 ? (
            <button 
              onClick={() => setShowFullMoney(true)}
              className="flex items-center justify-center p-1 hover:bg-amber-200 rounded-full transition-colors active:scale-95"
              title="View full balance"
            >
              <Wallet className="text-amber-700" size={18} />
            </button>
          ) : (
            <span className="font-bold text-base md:text-lg">£{formatNumberShort(gameState.money)}</span>
          )}
        </div>
        <h2 className="font-black text-lg md:text-xl text-green-700 italic truncate mx-2 flex-1 text-center">Pocket Farm</h2>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Settings size={22} />
          </button>
          <button 
            onClick={() => setScreen('menu')}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      {/* Animals Button */}
      {gameState.animalAreaUnlocked && (
          <motion.button
            key="animals-button"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setShowAnimalScreen(true)}
            className="absolute top-20 right-4 z-30 bg-purple-600 text-white p-3 rounded-2xl shadow-lg border-2 border-purple-400 flex items-center gap-2 font-black text-sm"
          >
            <PawPrint size={20} />
            <span>{t('animals')}</span>
          </motion.button>
      )}

      {/* Roy NPC Button */}
      <motion.button
        key="roy-npc-button"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        onClick={() => setShowRoyMenu(true)}
        className="absolute top-20 left-4 z-30 bg-amber-500 text-white p-3 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center gap-2 font-black text-sm"
      >
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-amber-600">
          <User size={16} />
        </div>
        <span>{t('roy')}</span>
      </motion.button>

      {/* Auto Harvest Indicator */}
      <AnimatePresence>
        {(gameState.permanentAutoHarvest || (gameState.autoHarvestUntil && gameState.autoHarvestUntil > Date.now())) && (
          <motion.div
            key="auto-harvest-indicator"
            initial={{ y: -20, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -20, opacity: 0, x: '-50%' }}
            className="absolute top-20 left-1/2 z-30 bg-green-50 text-green-700 px-4 py-1.5 rounded-full shadow-md border border-green-200 flex items-center gap-2 font-black text-[10px] whitespace-nowrap"
          >
            <Zap size={12} className="fill-green-500 animate-pulse" />
            <span>
              {t('auto_harvest')}: {gameState.permanentAutoHarvest ? t('active') : (timeStr || '...')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Farm Area */}
      <main className="flex-1 p-4 flex items-center justify-center overflow-hidden">
        <motion.div 
          layout
          className={`grid gap-3 w-full max-w-sm mx-auto ${
            gameState.unlockedPlots <= 4 ? 'grid-cols-2' : 
            gameState.unlockedPlots <= 9 ? 'grid-cols-3' : 'grid-cols-4'
          }`}
        >
          {gameState.plots.slice(0, gameState.unlockedPlots).map((plot) => (
            <motion.div key={`plot-container-${plot.id}`} layout className="w-full aspect-square">
              <Plot 
                plot={plot} 
                activeTool={gameState.activeTool} 
                onInteract={handlePlotInteract}
                hasGrowthBoost={gameState.hasGrowthBoost}
              />
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 shadow-[0_-4px_15px_rgba(0,0,0,0.1)] z-40 h-20">
        <div className="grid grid-cols-3 h-full items-center px-4 relative">
          
          {/* Inventory Tab */}
          <button 
            onClick={() => setShowInventory(true)}
            className="flex flex-col items-center gap-1 text-amber-600 hover:text-amber-700 transition-all active:scale-90"
          >
            <Package size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('inventory')}</span>
          </button>

          {/* Middle: Tool Button */}
          <div className="flex flex-col items-center justify-center relative h-full">
            <AnimatePresence>
              {toolsExpanded && (
                <motion.div 
                  key="tools-expanded-panel"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-row gap-3 bg-white p-3 rounded-3xl shadow-2xl border border-slate-100 z-50"
                >
                  {(['Hand', 'Sickle', 'Shovel', 'Tonic'] as ToolType[]).map(tool => (
                    <button
                      key={`tool-option-${tool}`}
                      onClick={() => {
                        setGameState(prev => ({ ...prev, activeTool: tool }));
                        setToolsExpanded(false);
                        if (tool === 'Tonic') {
                          setInventoryTab('tonics');
                          setShowInventory(true);
                        }
                      }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                        gameState.activeTool === tool 
                          ? 'bg-green-600 text-white shadow-lg' 
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {tool === 'Hand' && <Hand size={28} />}
                      {tool === 'Sickle' && <Sprout size={28} />}
                      {tool === 'Shovel' && <Trash2 size={28} />}
                      {tool === 'Tonic' && <FlaskConical size={28} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="relative -mt-10 flex flex-col items-center">
              <button 
                onClick={() => setToolsExpanded(!toolsExpanded)}
                className="w-16 h-16 bg-green-600 rounded-full shadow-xl flex items-center justify-center text-white border-4 border-white relative z-50 transition-transform active:scale-95"
              >
                {gameState.activeTool === 'Hand' && <Hand size={30} />}
                {gameState.activeTool === 'Sickle' && <Sprout size={30} />}
                {gameState.activeTool === 'Shovel' && <Trash2 size={30} />}
                {gameState.activeTool === 'Tonic' && <FlaskConical size={30} />}
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                  {toolsExpanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronUp size={12} className="text-slate-400" />}
                </div>
              </button>
              <div className="mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-50 flex items-center gap-1">
                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{gameState.activeTool}</span>
                {gameState.activeTool === 'Tonic' && gameState.selectedTonic && (
                  <span className="text-[10px] font-bold text-purple-600 border-l border-slate-200 pl-1">
                    {TONICS?.[gameState.selectedTonic]?.icon || '🧪'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Shop Tab */}
          <button 
            onClick={() => setShowShop(true)}
            className="flex flex-col items-center gap-1 text-green-600 hover:text-green-700 transition-all active:scale-90"
          >
            <ShoppingBasket size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('shop')}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Tonic Selector */}
        {showTonicSelector !== null && (
          <motion.div 
            key="tonic-selector-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
            onClick={() => setShowTonicSelector(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-slate-800 mb-4 text-center">Select a Tonic</h3>
              <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                {(gameState.tonicInventory && TONICS ? (Object.keys(gameState.tonicInventory) as InfusionType[]) : []).map(type => {
                  const count = gameState.tonicInventory[type] || 0;
                  if (count === 0) return null;
                  const tonic = TONICS?.[type];
                  const infusion = INFUSIONS?.[type];
                  if (!tonic) return null;
                  
                  return (
                    <button
                      key={`tonic-option-${type}`}
                      onClick={() => {
                        setGameState(prev => ({ ...prev, selectedTonic: type }));
                        setShowTonicSelector(null);
                        // After selecting, apply it to the plot
                        handlePlotInteract(showTonicSelector!);
                      }}
                      className="flex items-center justify-between p-3 rounded-2xl border-2 border-purple-50 bg-purple-50 hover:border-purple-200 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm relative">
                          <span className="text-3xl">{tonic.icon || '🧪'}</span>
                          <div className="absolute -bottom-1 -right-1 bg-purple-100 rounded-full p-1 border border-purple-200">
                            <span className="text-[10px]">{infusion?.icon || '?'}</span>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-800">{tonic.displayName}</p>
                          <p className="text-xs text-slate-500">{count} in stock</p>
                        </div>
                      </div>
                      <Check className="text-purple-600" size={20} />
                    </button>
                  );
                })}
                {(!gameState.tonicInventory || Object.values(gameState.tonicInventory).every(v => v === 0)) && (
                  <div className="py-8 text-center">
                    <p className="text-slate-400 font-medium mb-4">No tonics in stock!</p>
                    <button 
                      onClick={() => {
                        setShowTonicSelector(null);
                        setShopTab('tonics');
                        setShowShop(true);
                      }}
                      className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold shadow-md"
                    >
                      Visit Shop
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {showSeedSelector !== null && (
          <motion.div 
            key="seed-selector-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
            onClick={() => setShowSeedSelector(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-slate-800 mb-4 text-center">{t('plant')}</h3>
              <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                {sortCrops(Object.keys(CROPS)).map(key => {
                  const type = key as CropType;
                  const count = gameState.seedInventory[type] || 0;
                  const crop = CROPS[type];
                  if (count === 0) return null;
                  return (
                    <button
                      key={`seed-option-${type}`}
                      onClick={() => plantSeed(showSeedSelector!, type)}
                      className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all group relative ${
                        crop.rarity === 'Secret' ? 'bg-black border-slate-800 hover:border-purple-900' : 
                        crop.rarity === 'Divine' ? 'bg-amber-400 border-amber-300 hover:border-amber-200' : 
                        'bg-green-50 border-green-100 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <RarityEffect rarity={crop.rarity} className="p-1">
                            <span className="text-3xl">{crop.icon}</span>
                          </RarityEffect>
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-1">
                            <p className={`font-bold ${
                              crop.rarity === 'Secret' ? 'text-purple-500' : 
                              crop.rarity === 'Divine' ? 'text-white' : 
                              'text-slate-800'
                            }`}>
                              {crop.displayName}
                            </p>
                          </div>
                          <p className={`text-xs ${
                            crop.rarity === 'Secret' ? 'text-slate-400' : 
                            crop.rarity === 'Divine' ? 'text-amber-100' : 
                            'text-slate-500'
                          }`}>
                            {count} seeds
                          </p>
                        </div>
                      </div>
                      <Check className="text-green-600" size={20} />
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                        <div className="font-bold text-amber-400 mb-1">{crop.rarity}</div>
                        {crop.bonus && <div className="italic opacity-80">{crop.bonus}</div>}
                      </div>
                    </button>
                  );
                })}
                {Object.values(gameState.seedInventory).every(c => !c || (typeof c === 'number' && c <= 0)) && (
                  <div className="py-8 text-center text-slate-400 font-medium">
                    No seeds in inventory!
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowSeedSelector(null)}
                className="w-full mt-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}

        {showShop && (
          <motion.div 
            key="shop-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4"
            onClick={() => setShowShop(false)}
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-slate-800">{t('shop')}</h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setShopTab('seeds')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        shopTab === 'seeds' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      {t('fruits')}
                    </button>
                    <button 
                      onClick={() => setShopTab('tonics')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        shopTab === 'tonics' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      {t('tonics')}
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowPremiumPackInfo(true)}
                    className="p-2 bg-amber-100 text-amber-600 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    <Gift size={20} />
                  </button>
                </div>
                <button onClick={() => setShowShop(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                {shopTab === 'seeds' ? (
                  <>
                    {/* Top Area: Quick Actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={buyPlot}
                        disabled={gameState.money < PLOT_COST || gameState.unlockedPlots >= 16}
                        className="flex flex-col items-center justify-center p-3 bg-amber-50 rounded-2xl border border-amber-100 disabled:opacity-50"
                      >
                        <Sprout size={20} className="text-amber-600 mb-1" />
                        <span className="text-[10px] font-black text-amber-800 uppercase">Plot</span>
                        <span className="text-[9px] font-bold text-amber-600">£{formatNumberShort(PLOT_COST)}</span>
                      </button>

                      <button 
                        onClick={buyAnimalArea}
                        disabled={gameState.money < ANIMAL_AREA_COST || gameState.animalAreaUnlocked}
                        className="flex flex-col items-center justify-center p-3 bg-purple-50 rounded-2xl border border-purple-100 disabled:opacity-50"
                      >
                        <PawPrint size={20} className="text-purple-600 mb-1" />
                        <span className="text-[10px] font-black text-purple-800 uppercase">Animals</span>
                        <span className="text-[9px] font-bold text-purple-600">
                          {gameState.animalAreaUnlocked ? 'Owned' : `£${ANIMAL_AREA_COST}`}
                        </span>
                      </button>

                      <button 
                        onClick={() => setShowAutoHarvestInfo(true)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                          gameState.permanentAutoHarvest ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'
                        }`}
                      >
                        <Zap size={20} className={gameState.permanentAutoHarvest ? 'text-green-600 mb-1' : 'text-blue-600 mb-1'} />
                        <span className={`text-[10px] font-black uppercase ${gameState.permanentAutoHarvest ? 'text-green-800' : 'text-blue-800'}`}>
                          Auto
                        </span>
                        <span className={`text-[9px] font-bold ${gameState.permanentAutoHarvest ? 'text-green-600' : 'text-blue-600'}`}>
                          {gameState.permanentAutoHarvest ? 'Active' : 'Boost'}
                        </span>
                      </button>
                    </div>

                    {/* Seeds Section */}
                    <div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">{t('buy_seeds')}</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {sortCrops(Object.keys(CROPS)).map(key => {
                          const type = key as CropType;
                          const crop = CROPS[type];
                          return (
                            <div 
                              key={`shop-item-${type}`} 
                              className={`flex items-center justify-between p-4 rounded-2xl border group relative transition-all ${
                                crop.rarity === 'Secret' ? 'bg-black border-slate-800' : 
                                crop.rarity === 'Divine' ? 'bg-amber-400 border-amber-300' : 
                                'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <RarityEffect rarity={crop.rarity} className="p-2">
                                  <span className="text-4xl">{crop.icon}</span>
                                </RarityEffect>
                                <div>
                                  <p className={`font-bold text-lg ${
                                    crop.rarity === 'Secret' ? 'text-purple-500' : 
                                    crop.rarity === 'Divine' ? 'text-white' : 
                                    'text-slate-800'
                                  }`}>
                                    {crop.displayName}
                                  </p>
                                  <p className={`text-xs ${
                                    crop.rarity === 'Secret' ? 'text-slate-400' : 
                                    crop.rarity === 'Divine' ? 'text-amber-100' : 
                                    'text-slate-500'
                                  }`}>
                                    In stock: {formatNumberShort(gameState.seedInventory[type] || 0)}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => buySeed(type)}
                                disabled={gameState.money < crop.buyPrice}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-md disabled:opacity-50"
                              >
                                <Coins size={16} /> £{formatNumberShort(crop.buyPrice)}
                              </button>

                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                <div className="font-bold text-amber-400 mb-1">{crop.rarity}</div>
                                {crop.bonus && <div className="italic opacity-80 mb-1">{crop.bonus}</div>}
                                <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                                  <span>Sell: £{formatNumberShort(crop.sellPrice)}</span>
                                  <span>Grow: {formatTimeShort(crop.growTime)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">{t('tonics')}</h4>
                    <p className="text-[10px] text-slate-500 font-medium italic">{t('apply_to_growing')}</p>
                    <div className="grid grid-cols-1 gap-3">
                      {(TONICS ? (Object.keys(TONICS) as InfusionType[]) : []).map(type => {
                        const tonic = TONICS?.[type];
                        const infusion = INFUSIONS?.[type];
                        if (!tonic || !tonic.displayName || !tonic.buyPrice) return null;
                        return (
                          <div key={`shop-tonic-${type}`} className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100 group relative">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-white rounded-xl shadow-sm relative">
                                <span className="text-4xl">{tonic.icon || '🧪'}</span>
                                <div className="absolute -bottom-1 -right-1 bg-purple-100 rounded-full p-1 border border-purple-200">
                                  <span className="text-[10px]">{infusion?.icon || '?'}</span>
                                </div>
                              </div>
                              <div>
                                <p className="font-bold text-lg text-slate-800">{tonic.displayName}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${infusion?.color || 'text-slate-500'}`}>
                                    {type === 'Random' ? 'Random Infusion' : `${type} (x${infusion?.multiplier || 1})`}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {t('owned')}: {gameState.tonicInventory[type] || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => buyTonic(type)}
                              disabled={gameState.money < tonic.buyPrice}
                              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-bold shadow-md disabled:opacity-50"
                            >
                              <Coins size={16} /> £{formatNumberShort(tonic.buyPrice)}
                            </button>
                          </div>
                        );
                      })}
                      {(!TONICS || Object.keys(TONICS).length === 0) && (
                        <div className="py-8 text-center text-slate-400 font-medium">
                          No tonics available at the moment.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Auto-Harvest Info Modal */}
        {showAutoHarvestInfo && (
          <motion.div 
            key="auto-harvest-info-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6"
            onClick={() => setShowAutoHarvestInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="fill-blue-600" />
              </div>
              <h4 className="text-xl font-black mb-2">Auto-Harvest</h4>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Tired of clicking? Activate Auto-Harvest to automatically collect all ready crops for 1 hour!
              </p>
              
              {gameState.permanentAutoHarvest ? (
                <div className="p-4 bg-green-100 text-green-700 rounded-2xl font-bold text-sm mb-4">
                  ✨ Permanent Auto-Harvest Active!
                </div>
              ) : (
                <button 
                  onClick={() => {
                    activateAutoHarvest();
                    setShowAutoHarvestInfo(false);
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                >
                  Watch Ad (1h Boost)
                </button>
              )}
              
              <button 
                onClick={() => setShowAutoHarvestInfo(false)}
                className="mt-4 text-slate-400 font-bold text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Premium Pack Info Modal */}
        {showPremiumPackInfo && (
          <motion.div 
            key="premium-pack-info-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6"
            onClick={() => setShowPremiumPackInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-2xl font-black text-slate-800">Premium Pack</h4>
                <button onClick={() => setShowPremiumPackInfo(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="p-5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl text-white shadow-xl relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Star size={80} />
                </div>
                <div className="relative z-10">
                  <h5 className="text-xl font-black mb-2">Premium Farm Pack</h5>
                  <ul className="text-xs space-y-2 mb-6 opacity-90 font-bold">
                    <li className="flex items-center gap-2"><span>✨</span> {t('auto_harvest')}</li>
                    <li className="flex items-center gap-2"><span>🐾</span> {t('animal_place')}</li>
                    <li className="flex items-center gap-2"><span>💰</span> {t('bonus_coins')}</li>
                    <li className="flex items-center gap-2"><span>🌱</span> {t('extra_plots')}</li>
                    <li className="flex items-center gap-2"><span>🐄</span> {t('each_animal')}</li>
                    <li className="flex items-center gap-2"><span>⚡</span> {t('growth_speed')}</li>
                  </ul>
                  
                  {gameState.hasPremiumPack ? (
                    <div className="w-full py-3 bg-white/20 text-white rounded-2xl font-black text-center border border-white/30">
                      {t('already_owned')}
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        buyPremiumPack();
                        setShowPremiumPackInfo(false);
                      }}
                      className="w-full py-3 bg-white text-orange-600 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                    >
                      {t('buy')} for {formatCurrency(PREMIUM_PACK_PRICE)}
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 text-center font-medium">
                Support the developer and unlock exclusive features!
              </p>
            </motion.div>
          </motion.div>
        )}

        {showInventory && (
          <motion.div 
            key="inventory-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4"
            onClick={() => setShowInventory(false)}
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-slate-800">{t('inventory')}</h3>
                  {hasSellableItems && (
                    <button 
                      onClick={() => setShowSellAllConfirm(true)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] uppercase font-black hover:bg-green-200 transition-colors shadow-sm"
                    >
                      {t('sell_all')}
                    </button>
                  )}
                </div>
                <button onClick={() => setShowInventory(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 shrink-0">
                <button 
                  onClick={() => setInventoryTab('crops')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    inventoryTab === 'crops' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {t('fruits')}
                </button>
                <button 
                  onClick={() => setInventoryTab('animals')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    inventoryTab === 'animals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {t('animals')}
                </button>
                <button 
                  onClick={() => setInventoryTab('tonics')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    inventoryTab === 'tonics' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {t('tonics')}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <AnimatePresence>
                  {sellAllFeedback && (
                    <motion.div 
                      key="sell-all-feedback"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-green-600 text-white text-center rounded-2xl font-bold text-sm shadow-lg">
                        {sellAllFeedback}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Crops Section */}
                {inventoryTab === 'crops' && sortCrops(Object.keys(gameState.inventory)).map(key => {
                  const count = gameState.inventory[key] || 0;
                  if (count === 0) return null;
                  const { type, infusions, isFavorite } = parseInfusedCropKey(key);
                  const crop = CROPS[type];
                  const multiplier = getInfusionMultiplier(infusions);
                  
                  return (
                    <div 
                      key={`inv-crop-${key}`} 
                      className={`flex items-center justify-between p-4 rounded-2xl border group relative transition-all ${
                        crop.rarity === 'Secret' ? 'bg-black border-slate-800' : 
                        crop.rarity === 'Divine' ? 'bg-amber-400 border-amber-300' : 
                        'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <RarityEffect rarity={crop.rarity} className="p-2">
                            <span className="text-4xl">{crop.icon}</span>
                          </RarityEffect>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(key);
                            }}
                            className={`absolute -top-2 -left-2 p-1.5 rounded-full shadow-lg border transition-all ${
                              isFavorite 
                                ? 'bg-amber-400 border-amber-300 text-white scale-110' 
                                : 'bg-white border-slate-200 text-slate-300 hover:text-amber-400'
                            }`}
                          >
                            <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                          </button>
                          
                          {/* Infusion Icons in Inventory */}
                          {infusions.length > 0 && (
                            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                              {infusions.map((inf, i) => (
                                <div key={`inv-inf-${i}`} className="bg-white rounded-full p-0.5 shadow-sm border border-slate-100" title={inf}>
                                  <span className="text-[8px]">{INFUSIONS[inf]?.icon || '✨'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-lg ${
                              crop.rarity === 'Secret' ? 'text-purple-500' : 
                              crop.rarity === 'Divine' ? 'text-white' : 
                              'text-slate-800'
                            }`}>
                              {crop.displayName}
                            </p>
                            {isFavorite && <Star size={14} className="text-amber-400 fill-current" />}
                            {infusions.length > 0 && (
                              <div className="flex gap-1">
                                {infusions.map((inf, i) => (
                                  <span key={i} title={inf} className="text-xs">
                                    {INFUSIONS[inf]?.icon || '✨'}
                                  </span>
                                ))}
                              </div>
                            )}
                            {multiplier > 1 && (
                              <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                x{multiplier}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${
                            crop.rarity === 'Secret' ? 'text-slate-400' : 
                            crop.rarity === 'Divine' ? 'text-amber-100' : 
                            'text-slate-500'
                          }`}>
                            Stock: {formatNumberShort(count)}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => !isFavorite && sellCrop(key)}
                        disabled={isFavorite}
                        className={`px-6 py-2 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all ${
                          isFavorite 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isFavorite ? 'Favorite' : `Sell £${formatNumberShort(Math.floor(crop.sellPrice * multiplier))}`}
                      </button>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                        <div className="font-bold text-amber-400 mb-1">{crop.rarity}</div>
                        {crop.bonus && <div className="italic opacity-80">{crop.bonus}</div>}
                      </div>
                    </div>
                  );
                })}

                {/* Animal Products Section */}
                {inventoryTab === 'animals' && (Object.keys(gameState.animalProductInventory) as AnimalProductType[]).map(type => {
                  const count = gameState.animalProductInventory[type] || 0;
                  if (count === 0) return null;
                  const product = ANIMAL_PRODUCTS[type];
                  return (
                    <div key={`inv-prod-${type}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <span className="text-4xl">{product.icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-lg">{product.type}</p>
                          <p className="text-sm text-slate-500">Stock: {formatNumberShort(count)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => sellAnimalProduct(type)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2"
                      >
                        Sell £{formatNumberShort(product.sellPrice)}
                      </button>
                    </div>
                  );
                })}

                {/* Tonics Section */}
                {inventoryTab === 'tonics' && (gameState.tonicInventory && TONICS ? (Object.keys(gameState.tonicInventory) as InfusionType[]) : []).map(type => {
                  const count = gameState.tonicInventory[type] || 0;
                  if (count === 0) return null;
                  const tonic = TONICS?.[type];
                  const infusion = INFUSIONS?.[type];
                  if (!tonic) return null;
                  const isSelected = gameState.selectedTonic === type && gameState.activeTool === 'Tonic';
                  
                  return (
                    <div 
                      key={`inv-tonic-${type}`} 
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isSelected ? 'bg-purple-100 border-purple-300 shadow-md' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-xl shadow-sm relative">
                          <span className="text-4xl">{tonic.icon || '🧪'}</span>
                          <div className="absolute -bottom-1 -right-1 bg-purple-100 rounded-full p-1 border border-purple-200">
                            <span className="text-[10px]">{infusion?.icon || '?'}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-lg text-slate-800">{tonic.displayName}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${infusion?.color || 'text-slate-500'}`}>
                              {type === 'Random' ? 'Random Infusion' : `${type} (x${infusion?.multiplier || 1})`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">Stock: {count}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setGameState(prev => ({ 
                            ...prev, 
                            selectedTonic: type,
                            activeTool: 'Tonic' 
                          }));
                          setShowInventory(false);
                          if (pendingTonicPlotId !== null) {
                            // Apply it to the plot
                            handlePlotInteract(pendingTonicPlotId);
                            setPendingTonicPlotId(null);
                          }
                        }}
                        className={`px-6 py-2 rounded-xl font-bold shadow-md transition-all ${
                          isSelected 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Use'}
                      </button>
                    </div>
                  );
                })}

                {((inventoryTab === 'crops' && Object.values(gameState.inventory).every(c => !c || (typeof c === 'number' && c <= 0))) ||
                  (inventoryTab === 'animals' && Object.values(gameState.animalProductInventory).every(c => !c || (typeof c === 'number' && c <= 0))) ||
                  (inventoryTab === 'tonics' && Object.values(gameState.tonicInventory).every(c => !c || (typeof c === 'number' && c <= 0)))) && (
                  <div key="empty-inventory-msg" className="py-12 text-center text-slate-400 font-medium">
                    This section is empty!
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Sell All Confirmation Modal */}
        {showSellAllConfirm && (
          <motion.div 
            key="sell-all-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6"
            onClick={() => setShowSellAllConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBasket size={32} />
              </div>
              <h4 className="text-xl font-black mb-2">Sell Everything?</h4>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Are you sure you want to sell all your crops and animal products?
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={sellAll}
                  className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-transform"
                >
                  Yes, Sell All
                </button>
                <button 
                  onClick={() => setShowSellAllConfirm(false)}
                  className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAnimalScreen && (
          <motion.div 
            key="animal-screen-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAnimalScreen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-purple-50 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <PawPrint className="text-purple-600" size={24} />
                  <h3 className="text-2xl font-black text-slate-800">Animal Place</h3>
                </div>
                <button onClick={() => setShowAnimalScreen(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Animal Shop Button */}
                <button 
                  onClick={() => setShowAnimalShop(true)}
                  className="w-full p-4 bg-purple-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-purple-700 transition-colors"
                >
                  <ShoppingBasket size={20} />
                  <span>Animal Shop</span>
                </button>

                {/* Cages Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {gameState.cages.slice(0, gameState.unlockedCages).map((cage) => (
                    <button
                      key={`cage-display-${cage.id}`}
                      onClick={() => cage.count < 2 && setShowAnimalSelector(cage.id)}
                      className="aspect-square bg-white rounded-3xl border-4 border-purple-100 flex flex-col items-center justify-center relative shadow-sm hover:border-purple-300 transition-all group"
                    >
                      <div className="absolute top-2 right-2 bg-purple-100 text-purple-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {cage.count}/2
                      </div>
                      
                      {cage.type ? (
                        <div className="flex flex-col items-center">
                          <div className="flex gap-1">
                            {[...Array(cage.count)].map((_, i) => (
                              <span key={`cage-animal-${cage.id}-${i}`} className="text-4xl">{ANIMALS[cage.type!].icon}</span>
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">{cage.type}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-slate-300">
                          <Home size={32} />
                          <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Empty Cage</span>
                        </div>
                      )}

                      {cage.count < 2 && (
                        <div key={`add-animal-overlay-${cage.id}`} className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/5 flex items-center justify-center transition-all">
                          <div className="opacity-0 group-hover:opacity-100 bg-white p-1.5 rounded-full shadow-md">
                            <Plus size={16} className="text-purple-600" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}

                  {gameState.unlockedCages < MAX_CAGES && (
                    <button
                      key="buy-cage-button"
                      onClick={buyCage}
                      disabled={gameState.money < CAGE_COST}
                      className="aspect-square bg-slate-100 rounded-3xl border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition-all disabled:opacity-50"
                    >
                      <Plus size={32} />
                      <span className="text-[10px] font-black mt-1 uppercase tracking-widest">New Cage</span>
                      <span className="text-xs font-bold mt-1">£{formatNumberShort(CAGE_COST)}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAnimalShop && (
          <motion.div 
            key="animal-shop-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6"
            onClick={() => setShowAnimalShop(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-xl font-black text-slate-800">Animal Shop</h3>
                <button onClick={() => setShowAnimalShop(false)} className="p-2 bg-slate-100 rounded-full"><X size={16}/></button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(ANIMALS) as AnimalType[]).map(type => {
                  const animal = ANIMALS[type];
                  return (
                    <div key={`shop-animal-${type}`} className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{animal.icon}</span>
                        <div>
                          <p className="font-bold text-slate-800">{type}</p>
                          <p className="text-[10px] text-slate-500">Owned: {formatNumberShort(gameState.animalInventory[type] || 0)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => buyAnimal(type)}
                        disabled={gameState.money < animal.buyPrice}
                        className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-xl font-bold shadow-md disabled:opacity-50 text-xs"
                      >
                        <Coins size={12} /> £{formatNumberShort(animal.buyPrice)}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAnimalSelector !== null && (
          <motion.div 
            key="animal-selector-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6"
            onClick={() => setShowAnimalSelector(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-slate-800 mb-4 text-center">Place Animal</h3>
              <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                {(Object.keys(ANIMALS) as AnimalType[]).map(type => {
                  const count = gameState.animalInventory[type] || 0;
                  const animal = ANIMALS[type];
                  const cage = gameState.cages[showAnimalSelector!];
                  const canPlace = count > 0 && (!cage.type || cage.type === type);

                  if (count === 0) return null;

                  return (
                    <button
                      key={`animal-option-${type}`}
                      onClick={() => placeAnimal(showAnimalSelector!, type)}
                      disabled={!canPlace}
                      className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                        canPlace 
                          ? 'border-purple-100 bg-purple-50 hover:border-purple-300' 
                          : 'border-slate-100 bg-slate-50 opacity-50 grayscale cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{animal.icon}</span>
                        <div className="text-left">
                          <p className="font-bold text-slate-800">{type}</p>
                          <p className="text-xs text-slate-500">{formatNumberShort(count)} in inventory</p>
                        </div>
                      </div>
                      {canPlace && <Check className="text-purple-600" size={20} />}
                    </button>
                  );
                })}
                {Object.values(gameState.animalInventory).every(c => !c || (typeof c === 'number' && c <= 0)) && (
                  <div key="empty-animal-inventory-msg" className="py-8 text-center text-slate-400 font-medium">
                    No animals in inventory!
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowAnimalSelector(null)}
                className="w-full mt-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Roy Menu Modal */}
        {showRoyMenu && (
          <motion.div 
            key="roy-menu-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6"
            onClick={() => setShowRoyMenu(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50">
                <User size={40} />
              </div>
              <h4 className="text-2xl font-black mb-1">Roy the Trader</h4>
              <p className="text-xs text-slate-400 mb-6 font-bold uppercase tracking-widest">"Need a lucky spin?"</p>
              
              <div className="space-y-3">
                <button 
                  onClick={handleSpin}
                  disabled={gameState.money < 250}
                  className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 flex items-center justify-center gap-3 hover:bg-amber-600 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  <Coins size={20} />
                  <span>Spin (£250)</span>
                </button>
                
                <button 
                  onClick={() => {
                    setShowRoyMenu(false);
                    setShowRoyHelp(true);
                  }}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
                >
                  <HelpCircle size={20} />
                  <span>Help</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Roy Help Modal */}
        {showRoyHelp && (
          <motion.div 
            key="roy-help-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6"
            onClick={() => {
              setShowRoyHelp(false);
              setHelpTab('main');
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h4 className="text-2xl font-black text-slate-800">
                  {helpTab === 'main' ? 'How to Play' : helpTab === 'fruits' ? 'Fruit Values' : 'Infusions'}
                </h4>
                <button onClick={() => {
                  setShowRoyHelp(false);
                  setHelpTab('main');
                }} className="p-2 bg-slate-100 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-2 mb-6 shrink-0">
                <button 
                  onClick={() => setHelpTab('main')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    helpTab === 'main' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  Main
                </button>
                <button 
                  onClick={() => setHelpTab('fruits')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    helpTab === 'fruits' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  Fruits
                </button>
                <button 
                  onClick={() => setHelpTab('infusions')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    helpTab === 'infusions' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  Infusions
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {helpTab === 'main' && (
                  <>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Hand size={24} />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Planting</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">Select the <span className="font-bold text-green-600">Hand</span> tool and tap an empty plot to plant seeds from your inventory.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Sprout size={24} />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Harvesting</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">Use the <span className="font-bold text-amber-600 text-lg leading-none">✂️</span> (Sickle) tool to harvest fully grown crops. They go straight to your inventory!</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Trash2 size={24} />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Shovel</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">Use the <span className="font-bold text-red-600">Shovel</span> tool to remove any crop from a plot, even if it's not ready yet.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ShoppingBasket size={24} />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Shop</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">Buy new seeds, expand your farm, and unlock animals in the shop. Rarer seeds cost more but sell for a fortune!</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                        <FlaskConical size={24} />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Tonic Tool</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          Select the <span className="font-bold text-purple-600">Tonic</span> tool to apply boosters to growing crops. 
                          Selecting the tool opens your <span className="font-bold text-purple-600">Tonic Inventory</span>. 
                          Apply them to <span className="font-black underline">growing crops only</span> to add powerful infusions!
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Star size={24} />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Obtaining Tonics</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          Buy tonics in the <span className="font-bold text-blue-600">Shop</span>, win them from <span className="font-bold text-amber-500">Roy's Spin</span>, or earn them as special rewards. 
                          The <span className="font-black">Random Tonic</span> gives a random infusion from the list!
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                        <PawPrint size={24} />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Animals</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">Unlock the Animal Place to raise cows, sheep, and more. They produce valuable items over time.</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Connect with Us</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <a 
                          href="https://discord.gg/dRFcH6eSAy" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors group"
                        >
                          <div className="w-8 h-8 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-sm">
                            <MessageCircle size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Discord</p>
                            <p className="text-[8px] text-indigo-400 font-bold">Join Server</p>
                          </div>
                        </a>
                        <a 
                          href="https://www.instagram.com/simox.__.m.h/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-pink-50 rounded-2xl border border-pink-100 hover:bg-pink-100 transition-colors group"
                        >
                          <div className="w-8 h-8 bg-pink-500 text-white rounded-xl flex items-center justify-center shadow-sm">
                            <Instagram size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Instagram</p>
                            <p className="text-[8px] text-pink-400 font-bold">Follow Us</p>
                          </div>
                        </a>
                      </div>
                    </div>
                  </>
                )}

                {helpTab === 'fruits' && (
                  <div className="space-y-3">
                    {sortCrops(Object.keys(CROPS)).map(key => {
                      const type = key as CropType;
                      const crop = CROPS[type];
                      return (
                        <div key={`help-fruit-${type}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{crop.icon}</span>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{crop.displayName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{crop.rarity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-[10px] font-bold text-slate-400">Buy: £{formatNumberShort(crop.buyPrice)}</span>
                              <span className="text-[10px] font-bold text-green-600">Sell: £{formatNumberShort(crop.sellPrice)}</span>
                            </div>
                            <p className="text-[10px] font-bold text-blue-500">Time: {formatTimeShort(crop.growTime)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {helpTab === 'infusions' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                      <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                        ✨ Infusions are rare boosts that can appear on your crops <span className="font-black underline">only while they are growing</span>.
                      </p>
                    </div>
                    {(INFUSIONS ? Object.entries(INFUSIONS) : []).map(([name, data]) => (
                      <div key={`help-infusion-${name}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                            <span className="text-xl">{data?.icon || '✨'}</span>
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${data?.color || 'text-slate-500'}`}>{name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Multiplier</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-800">×{data?.multiplier || 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setShowRoyHelp(false);
                  setHelpTab('main');
                }}
                className="w-full mt-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all shrink-0"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Spin Result Modal */}
        {spinResult && (
          <motion.div 
            key="spin-result-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-6"
            onClick={() => setSpinResult(null)}
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 10 }}
              className="bg-white w-full max-w-xs rounded-[3rem] p-8 shadow-2xl text-center relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
              <h4 className="text-3xl font-black mb-6 text-slate-800">You Won!</h4>
              
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-amber-100 blur-3xl rounded-full opacity-50 animate-pulse" />
                <RarityEffect rarity={CROPS[spinResult].rarity} className="w-32 h-32 mx-auto flex items-center justify-center bg-slate-50 rounded-[2rem] border-4 border-white shadow-xl relative z-10">
                  <span className="text-7xl">{CROPS[spinResult].icon}</span>
                </RarityEffect>
              </div>
              
              <div className="mb-8">
                <p className="text-2xl font-black text-slate-800 mb-1">{CROPS[spinResult].displayName} Seed</p>
                <div className="inline-block px-4 py-1 bg-slate-100 rounded-full">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-600">{CROPS[spinResult].rarity}</span>
                </div>
              </div>
              
              <button 
                onClick={() => setSpinResult(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Settings Modal */}
        {/* Full Money Modal */}
        {showFullMoney && (
          <motion.div 
            key="full-money-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-6"
            onClick={() => setShowFullMoney(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Wallet size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-2">Total Balance</h4>
              <p className="text-3xl font-black text-amber-600 mb-6">
                £{gameState.money.toLocaleString()}
              </p>
              <button 
                onClick={() => setShowFullMoney(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            key="settings-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-6"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 shrink-0" dir={gameState.language === 'ar' || gameState.language === 'ur' ? 'rtl' : 'ltr'}>
                <h4 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Settings size={28} className="text-slate-400" />
                  {t('settings')}
                </h4>
                <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full">
                  <X size={20}/>
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                {/* Language Selection */}
                <div>
                  <h5 className="font-black text-slate-400 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                    <Languages size={14} />
                    {t('select_language')}
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(LANGUAGES) as LanguageCode[]).map(code => (
                      <button
                        key={`lang-${code}`}
                        onClick={() => setGameState(prev => ({ ...prev, language: code }))}
                        className={`py-3 px-4 rounded-2xl text-xs font-bold border-2 transition-all ${
                          gameState.language === code 
                            ? 'bg-green-600 border-green-600 text-white shadow-md' 
                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        {LANGUAGES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-slate-100">
                  <h5 className="font-black text-red-400 uppercase text-[10px] tracking-widest mb-4">
                    Danger Zone
                  </h5>
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-4 bg-red-50 text-red-600 border-2 border-red-100 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                  >
                    <RotateCcw size={20} />
                    {t('reset_game')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <motion.div 
            key="reset-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-6 text-center"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-50">
                <RotateCcw size={40} />
              </div>
              <h4 className="text-2xl font-black text-slate-800 mb-4">{t('reset_game')}</h4>
              <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                {t('reset_confirm')}
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={handleReset}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                >
                  {t('yes_reset')}
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Offline Growth Modal */}
        {showOfflineModal && (
          <motion.div 
            key="offline-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
            onClick={() => setShowOfflineModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-green-50">
                <Sprout size={48} />
              </div>
              <h4 className="text-3xl font-black text-slate-800 mb-2">Welcome Back!</h4>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Your farm was busy while you were away! <br />
                <span className="font-bold text-green-600">{offlineReadyCount} crops</span> are ready to harvest!
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={collectAllReady}
                  className="w-full py-5 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-200 flex items-center justify-center gap-3 hover:bg-green-700 transition-all active:scale-95"
                >
                  <Check size={24} />
                  <span>Collect All</span>
                </button>
                
                <button 
                  onClick={() => setShowOfflineModal(false)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all"
                >
                  Go to Farm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
