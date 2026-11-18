import React, { useState } from 'react';
import { Check, Coins, Lock, RotateCw, User, X } from 'lucide-react';
import { COSMETIC_ITEMS } from '../data/cosmetics';
import {
  CharacterCustomization,
  CosmeticCategory,
  CosmeticItem,
  Gender,
} from '../types/game';

interface WardrobeModalProps {
  coins: number;
  highestUnlockedLevel: number;
  unlockedIds: string[];
  equipped: CharacterCustomization;
  onChangeGender: (gender: Gender) => void;
  onEquip: (item: CosmeticItem) => void;
  onPurchase: (item: CosmeticItem) => void;
  onClose: () => void;
}

const CATEGORIES: { id: CosmeticCategory; label: string }[] = [
  { id: 'hat', label: 'Hats' },
  { id: 'outfit', label: 'Outfits' },
  { id: 'backpack', label: 'Back Gear' },
  { id: 'boots', label: 'Boots' },
  { id: 'trail', label: 'Trails' },
  { id: 'color', label: 'Colors' },
];

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  coins,
  highestUnlockedLevel,
  unlockedIds,
  equipped,
  onChangeGender,
  onEquip,
  onPurchase,
  onClose,
}) => {
  const [activeCat, setActiveCat] = useState<CosmeticCategory>('hat');
  const items = COSMETIC_ITEMS.filter((c) => c.category === activeCat);

  const getEquippedId = (cat: CosmeticCategory): string => {
    switch (cat) {
      case 'hat':
        return equipped.hat;
      case 'outfit':
        return equipped.outfit;
      case 'backpack':
        return equipped.backpack;
      case 'boots':
        return equipped.boots;
      case 'trail':
        return equipped.trail;
      case 'color':
        return equipped.color;
    }
  };

  const currentEquippedId = getEquippedId(activeCat);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-end">
      {/* Top hint over live 3D Character */}
      <div className="pointer-events-none flex justify-center pt-16">
        <div
          className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-[11px] font-medium text-stone-200"
          style={{ backgroundColor: 'rgba(12, 24, 19, 0.82)' }}
        >
          <RotateCw className="h-3 w-3 text-amber-400" />
          <span>Swipe character above to rotate 360°</span>
        </div>
      </div>

      {/* Bottom Sheet Wardrobe inside Portrait Mobile Frame */}
      <div
        className="pointer-events-auto mt-auto mx-auto flex h-[54%] w-full max-w-lg flex-col rounded-t-3xl border-t border-x border-white/15 shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(14, 27, 22, 0.96)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-bold text-stone-50">
              Explorer Wardrobe
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-xs font-bold text-amber-300 font-mono-tabular">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{coins}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-300 active:bg-white/15"
              aria-label="Close Wardrobe"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Male / Female Switch */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-300">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span>Model</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-black/40 p-1">
            <button
              type="button"
              onClick={() => onChangeGender('male')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                equipped.gender === 'male'
                  ? 'bg-amber-400 text-stone-950'
                  : 'text-stone-300'
              }`}
            >
              Male (Kai)
            </button>
            <button
              type="button"
              onClick={() => onChangeGender('female')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                equipped.gender === 'female'
                  ? 'bg-amber-400 text-stone-950'
                  : 'text-stone-300'
              }`}
            >
              Female (Maya)
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 custom-scroll">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCat(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeCat === cat.id
                  ? 'bg-emerald-500 text-stone-950'
                  : 'text-stone-300 active:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
          {items.map((item) => {
            const unlocked = unlockedIds.includes(item.id);
            const isEquipped = currentEquippedId === item.id;
            const levelLocked =
              !unlocked &&
              item.unlockLevel !== undefined &&
              highestUnlockedLevel < item.unlockLevel;
            const canAfford = coins >= item.price;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 ${
                  isEquipped
                    ? 'border-amber-400/70 bg-amber-400/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-9 w-9 shrink-0 rounded-lg border border-white/20 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${item.primaryHex} 55%, ${item.secondaryHex} 55%)`,
                    }}
                  >
                    {isEquipped && <Check className="h-4 w-4 text-white drop-shadow" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-stone-100">
                      {item.name}
                    </div>
                    <p className="text-[11px] text-stone-400 truncate">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isEquipped ? (
                    <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-amber-400/20 text-[11px] font-bold text-amber-300">
                      Equipped
                    </span>
                  ) : unlocked ? (
                    <button
                      type="button"
                      onClick={() => onEquip(item)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-[11px] font-bold text-stone-950 active:scale-95"
                    >
                      Equip
                    </button>
                  ) : levelLocked ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/40 text-[11px] font-semibold text-stone-400">
                      <Lock className="h-3 w-3" />
                      Lvl {item.unlockLevel}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onPurchase(item)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                        canAfford
                          ? 'bg-amber-400 text-stone-950 active:scale-95'
                          : 'bg-white/10 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="h-3 w-3" />
                      <span>{item.price}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5">
          <span className="text-[11px] text-stone-400">
            {unlockedIds.length} / {COSMETIC_ITEMS.length} unlocked
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-400 text-xs font-bold text-stone-950"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
