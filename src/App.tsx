/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CropType, ToolType, PlotState, GameState, Rarity, AnimalType, CageState, AnimalProductType } from './types';
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
  PREMIUM_PACK_PRICE
} from './constants';

// --- Components ---

const RarityEffect = ({ rarity, children, className = "" }: { rarity: Rarity; children: React.ReactNode; className?: string }) => {
  const effects: Record<Rarity, string> = {
    NR: "",
    MID: "shadow-[0_0_10px_rgba(255,255,255,0.5)]",
    Legendary: "shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse",
    Myth: "shadow-[0_0_20px_rgba(147,51,234,0.7)] animate-pulse",
    Secret: "shadow-[0_0_25px_rgba(0,0,0,0.8)] bg-gradient-to-br from-slate-900 to-purple-900 animate-pulse",
  };

  return (
    <div className={`relative rounded-2xl ${effects[rarity]} ${className}`}>
      {rarity === 'Legendary' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
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
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
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
};

const Plot = ({ 
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
};

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'farm'>('menu');
  const [gameState, setGameState] = useState<GameState>({
    money: INITIAL_MONEY,
    unlockedPlots: INITIAL_PLOTS,
    inventory: {},
    seedInventory: {},
    animalInventory: {},
    animalProductInventory: {},
    plots: Array.from({ length: 16 }, (_, i) => ({
      id: i,
      crop: null,
      plantedAt: null,
      isReady: false
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
    autoHarvestUntil: null,
    hasPremiumPack: false,
    permanentAutoHarvest: false,
    hasGrowthBoost: false,
  });

  const [showShop, setShowShop] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showAnimalScreen, setShowAnimalScreen] = useState(false);
  const [showAnimalShop, setShowAnimalShop] = useState(false);
  const [showAnimalSelector, setShowAnimalSelector] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState<number | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // --- Persistence & Notifications ---
  
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === "granted");
      });
    }
  }, []);

  const sendNotification = (cropType: CropType) => {
    if (notificationsEnabled) {
      const cropData = CROPS[cropType];
      new Notification("Pocket Farm", {
        body: `Your ${cropData.displayName} is ready to harvest!`,
        icon: "/favicon.ico",
        tag: `crop-ready-${cropType}` // Use tag to prevent duplicate notifications
      });
    }
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
            if (now - plot.plantedAt >= effectiveGrowTime * 1000) {
              changed = true;
              sendNotification(plot.crop);
              return { ...plot, isReady: true };
            }
          }
          return plot;
        });

        // Auto-harvest logic
        let newInventory = { ...prev.inventory };
        const isAutoHarvestActive = (prev.autoHarvestUntil && now < prev.autoHarvestUntil) || prev.permanentAutoHarvest;

        if (isAutoHarvestActive) {
          newPlots.forEach((plot, idx) => {
            if (plot.isReady && idx < prev.unlockedPlots) {
              changed = true;
              const cropType = plot.crop!;
              newInventory[cropType] = (newInventory[cropType] || 0) + 1;
              newPlots[idx] = { ...plot, crop: null, plantedAt: null, isReady: false };
            }
          });
        }

        if (changed) {
          return { ...prev, plots: newPlots, inventory: newInventory };
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
        setGameState(prev => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            [plot.crop!]: (prev.inventory[plot.crop!] || 0) + 1
          },
          plots: prev.plots.map(p => p.id === id ? {
            ...p,
            crop: null,
            plantedAt: null,
            isReady: false
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
            isReady: false
          } : p)
        }));
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
          isReady: false
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

  const buyPlot = () => {
    if (gameState.money >= PLOT_COST && gameState.unlockedPlots < 16) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - PLOT_COST,
        unlockedPlots: prev.unlockedPlots + 1
      }));
    }
  };

  const sellCrop = (type: CropType) => {
    if ((gameState.inventory[type] || 0) > 0) {
      const cropData = CROPS[type];
      setGameState(prev => ({
        ...prev,
        money: prev.money + cropData.sellPrice,
        inventory: {
          ...prev.inventory,
          [type]: (prev.inventory[type] || 0) - 1
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
        animalProductInventory: {
          ...prev.animalProductInventory,
          [type]: (prev.animalProductInventory[type] || 0) - 1
        }
      }));
    }
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

  const [timeStr, setTimeStr] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      if (gameState.autoHarvestUntil) {
        setTimeStr(getTimeRemaining(gameState.autoHarvestUntil));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [gameState.autoHarvestUntil]);

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
          <p className="text-green-700 font-medium mt-2">Your tiny garden in your pocket</p>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setScreen('farm')}
          className="bg-green-600 text-white px-12 py-4 rounded-full text-2xl font-bold shadow-lg flex items-center gap-3"
        >
          <Play fill="currentColor" /> Play
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col max-w-md mx-auto relative overflow-hidden font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200">
          <Coins className="text-amber-600" size={20} />
          <span className="font-bold text-lg">£{gameState.money}</span>
        </div>
        <h2 className="font-black text-xl text-green-700 italic">Pocket Farm</h2>
        <button 
          onClick={() => setScreen('menu')}
          className="p-2 text-slate-400 hover:text-slate-600"
        >
          <X size={24} />
        </button>
      </header>

      {/* Animals Button */}
      {gameState.animalAreaUnlocked && (
        <motion.button
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setShowAnimalScreen(true)}
          className="absolute top-20 right-4 z-30 bg-purple-600 text-white p-3 rounded-2xl shadow-lg border-2 border-purple-400 flex items-center gap-2 font-black text-sm"
        >
          <PawPrint size={20} />
          <span>Animals</span>
        </motion.button>
      )}

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
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="flex items-center justify-between px-6 py-3 relative">
          
          {/* Inventory Tab */}
          <button 
            onClick={() => setShowInventory(true)}
            className="flex flex-col items-center gap-1 text-amber-600 hover:text-amber-700 transition-colors"
          >
            <Package size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Inventory</span>
          </button>

          {/* Middle: Tool Button (Floating above) */}
          <div className="relative -top-8">
            <AnimatePresence>
              {toolsExpanded && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-row gap-3 bg-white p-3 rounded-3xl shadow-2xl border border-slate-100"
                >
                  {(['Hand', 'Sickle', 'Shovel'] as ToolType[]).map(tool => (
                    <button
                      key={`tool-option-${tool}`}
                      onClick={() => {
                        setGameState(prev => ({ ...prev, activeTool: tool }));
                        setToolsExpanded(false);
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
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            <button 
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className="w-20 h-20 bg-green-600 rounded-full shadow-xl flex items-center justify-center text-white border-4 border-white relative z-50"
            >
              {gameState.activeTool === 'Hand' && <Hand size={36} />}
              {gameState.activeTool === 'Sickle' && <Sprout size={36} />}
              {gameState.activeTool === 'Shovel' && <Trash2 size={36} />}
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                {toolsExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
              </div>
            </button>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{gameState.activeTool}</span>
            </div>
          </div>

          {/* Shop Tab */}
          <button 
            onClick={() => setShowShop(true)}
            className="flex flex-col items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
          >
            <ShoppingBasket size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Shop</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Seed Selector (Hand Tool) */}
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
              <h3 className="text-xl font-black text-slate-800 mb-4 text-center">Plant a Seed</h3>
              <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                {(Object.keys(CROPS) as CropType[]).map(type => {
                  const count = gameState.seedInventory[type] || 0;
                  const crop = CROPS[type];
                  if (count === 0) return null;
                  return (
                    <button
                      key={`seed-option-${type}`}
                      onClick={() => plantSeed(showSeedSelector, type)}
                      className="flex items-center justify-between p-3 rounded-2xl border-2 border-green-100 bg-green-50 hover:border-green-300 transition-all group relative"
                    >
                      <div className="flex items-center gap-3">
                        <RarityEffect rarity={crop.rarity} className="p-1">
                          <span className="text-3xl">{crop.icon}</span>
                        </RarityEffect>
                        <div className="text-left">
                          <p className="font-bold text-slate-800">{crop.displayName}</p>
                          <p className="text-xs text-slate-500">{count} seeds</p>
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
                <h3 className="text-2xl font-black text-slate-800">Shop</h3>
                <button onClick={() => setShowShop(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                {/* Premium Section */}
                {!gameState.hasPremiumPack && (
                  <div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Premium</h4>
                    <div className="p-5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <Star size={80} />
                      </div>
                      <div className="relative z-10">
                        <h5 className="text-xl font-black mb-2">Premium Farm Pack</h5>
                        <ul className="text-xs space-y-1 mb-4 opacity-90 font-bold">
                          <li>✨ Permanent Auto-Harvest</li>
                          <li>🐾 Unlock Animal Place</li>
                          <li>💰 300 Coins Bonus</li>
                          <li>🌱 +2 Extra Plots</li>
                          <li>🐄 1 of Each Animal</li>
                          <li>⚡ +25% Crop Growing Speed</li>
                        </ul>
                        <button 
                          onClick={buyPremiumPack}
                          className="w-full py-3 bg-white text-orange-600 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                        >
                          Buy for {PREMIUM_PACK_PRICE} MAD
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Seeds Section */}
                <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Buy Seeds</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {(Object.keys(CROPS) as CropType[]).map(type => {
                      const crop = CROPS[type];
                      return (
                        <div key={`shop-item-${type}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                          <div className="flex items-center gap-4">
                            <RarityEffect rarity={crop.rarity} className="p-2">
                              <span className="text-4xl">{crop.icon}</span>
                            </RarityEffect>
                            <div>
                              <p className="font-bold text-lg">{crop.displayName}</p>
                              <p className="text-xs text-slate-500">In stock: {gameState.seedInventory[type] || 0}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => buySeed(type)}
                            disabled={gameState.money < crop.buyPrice}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-md disabled:opacity-50"
                          >
                            <Coins size={16} /> £{crop.buyPrice}
                          </button>

                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                            <div className="font-bold text-amber-400 mb-1">{crop.rarity}</div>
                            {crop.bonus && <div className="italic opacity-80 mb-1">{crop.bonus}</div>}
                            <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                              <span>Sell: £{crop.sellPrice}</span>
                              <span>Grow: {crop.growTime}s</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expansion Section */}
                <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Expansion</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={buyPlot}
                      disabled={gameState.money < PLOT_COST || gameState.unlockedPlots >= 16}
                      className="w-full p-4 bg-amber-100 text-amber-800 rounded-2xl font-black flex items-center justify-between disabled:opacity-50 border-2 border-amber-200"
                    >
                      <div className="flex items-center gap-3">
                        <Sprout />
                        <span>Unlock New Plot</span>
                      </div>
                      <span className="flex items-center gap-1"><Coins size={16}/> £{PLOT_COST}</span>
                    </button>

                    <button 
                      onClick={buyAnimalArea}
                      disabled={gameState.money < ANIMAL_AREA_COST || gameState.animalAreaUnlocked}
                      className="w-full p-4 bg-purple-100 text-purple-800 rounded-2xl font-black flex items-center justify-between disabled:opacity-50 border-2 border-purple-200"
                    >
                      <div className="flex items-center gap-3">
                        <PawPrint />
                        <span>Animal Place Extension</span>
                      </div>
                      {!gameState.animalAreaUnlocked ? (
                        <span className="flex items-center gap-1"><Coins size={16}/> £{ANIMAL_AREA_COST}</span>
                      ) : (
                        <Check className="text-purple-600" size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Auto Harvest Section */}
                <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Boosts</h4>
                  <button 
                    onClick={activateAutoHarvest}
                    disabled={gameState.permanentAutoHarvest}
                    className={`w-full p-4 rounded-2xl font-black flex items-center justify-between shadow-lg transition-all ${
                      gameState.permanentAutoHarvest ? 'bg-amber-500 text-white' :
                      timeStr ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className={(timeStr || gameState.permanentAutoHarvest) ? 'text-yellow-300 fill-yellow-300' : ''} />
                      <span>
                        {gameState.permanentAutoHarvest ? 'Permanent Auto-Harvest Active' :
                         timeStr ? `Auto-Harvest Active (${timeStr})` : '1h Auto-Harvest'}
                      </span>
                    </div>
                    {!timeStr && !gameState.permanentAutoHarvest && <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">WATCH AD</span>}
                  </button>
                </div>
              </div>
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
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-2xl font-black text-slate-800">Inventory</h3>
                <button onClick={() => setShowInventory(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* Crops Section */}
                {(Object.keys(gameState.inventory) as CropType[]).map(type => {
                  const count = gameState.inventory[type] || 0;
                  if (count === 0) return null;
                  const crop = CROPS[type];
                  return (
                    <div key={`inv-crop-${type}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                      <div className="flex items-center gap-4">
                        <RarityEffect rarity={crop.rarity} className="p-2">
                          <span className="text-4xl">{crop.icon}</span>
                        </RarityEffect>
                        <div>
                          <p className="font-bold text-lg">{crop.displayName}</p>
                          <p className="text-sm text-slate-500">Stock: {count}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => sellCrop(type)}
                        className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2"
                      >
                        Sell £{crop.sellPrice}
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
                {(Object.keys(gameState.animalProductInventory) as AnimalProductType[]).map(type => {
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
                          <p className="text-sm text-slate-500">Stock: {count}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => sellAnimalProduct(type)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2"
                      >
                        Sell £{product.sellPrice}
                      </button>
                    </div>
                  );
                })}

                {Object.values(gameState.inventory).every(c => !c || (typeof c === 'number' && c <= 0)) && 
                 Object.values(gameState.animalProductInventory).every(c => !c || (typeof c === 'number' && c <= 0)) && (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    Inventory is empty!
                  </div>
                )}
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
                        <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/5 flex items-center justify-center transition-all">
                          <div className="opacity-0 group-hover:opacity-100 bg-white p-1.5 rounded-full shadow-md">
                            <Plus size={16} className="text-purple-600" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}

                  {gameState.unlockedCages < MAX_CAGES && (
                    <button
                      onClick={buyCage}
                      disabled={gameState.money < CAGE_COST}
                      className="aspect-square bg-slate-100 rounded-3xl border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition-all disabled:opacity-50"
                    >
                      <Plus size={32} />
                      <span className="text-[10px] font-black mt-1 uppercase tracking-widest">New Cage</span>
                      <span className="text-xs font-bold mt-1">£{CAGE_COST}</span>
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
                          <p className="text-[10px] text-slate-500">Owned: {gameState.animalInventory[type] || 0}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => buyAnimal(type)}
                        disabled={gameState.money < animal.buyPrice}
                        className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-xl font-bold shadow-md disabled:opacity-50 text-xs"
                      >
                        <Coins size={12} /> £{animal.buyPrice}
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
                          <p className="text-xs text-slate-500">{count} in inventory</p>
                        </div>
                      </div>
                      {canPlace && <Check className="text-purple-600" size={20} />}
                    </button>
                  );
                })}
                {Object.values(gameState.animalInventory).every(c => !c || (typeof c === 'number' && c <= 0)) && (
                  <div className="py-8 text-center text-slate-400 font-medium">
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
      </AnimatePresence>
    </div>
  );
}
