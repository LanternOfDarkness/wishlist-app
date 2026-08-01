"use client";

import { useState, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import type { CategoryData } from "@/lib/repository";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Filter } from "@/components/brand/icons";
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";
import {
    WISHLIST_SORT_OPTIONS,
    getWishlistFilterUrlState,
    writeWishlistFilterParam,
} from "@/lib/wishlist-filter-state";
import { useTranslations } from "next-intl";

interface WishlistFiltersProps {
    categories: CategoryData[];
    maxPriceOverall?: number;
}

export function WishlistFilters({ categories, maxPriceOverall = 10000 }: WishlistFiltersProps) {
    const t = useTranslations("WishlistFilters");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    const filterState = getWishlistFilterUrlState(searchParams, maxPriceOverall);

    const [localMinPrice, setLocalMinPrice] = useState(filterState.minPrice);
    const [localMaxPrice, setLocalMaxPrice] = useState(filterState.maxPrice);

    const [isExpanded, setIsExpanded] = useState(false);

    const updateFilter = (key: string, value: string | string[]) => {
        const params = writeWishlistFilterParam(searchParams, key, value);
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    const debouncedUpdateFilter = (key: string, value: string | string[]) => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            updateFilter(key, value);
        }, 300);
    };

    const toggleCategory = (categoryId: string) => {
        const newCategories = filterState.currentCategories.includes(categoryId)
            ? filterState.currentCategories.filter(id => id !== categoryId)
            : [...filterState.currentCategories, categoryId];
        updateFilter('category', newCategories);
    };

    return (
        <div className="sketch sketch-interactive w-full md:w-64 shrink-0 mb-8 md:mb-0 bg-card p-4 h-fit sticky top-20">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex gap-2 items-center">
                    <Filter className="size-5" />
                    <h3 className="font-medium text-lg">{t("title")}</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    aria-controls="filters-content"
                >
                    {isExpanded ? t("hide") : t("show")}
                </Button>
            </div>

            <div id="filters-content" className={`space-y-6 ${isExpanded ? 'block' : 'hidden md:block'}`}>
                {/* Sort */}
                <div className="space-y-3">
                    <label htmlFor="sort-select" className="text-sm font-semibold">{t("sortBy")}</label>
                    <Select
                        id="sort-select"
                        value={filterState.currentSort}
                        onChange={(e) => updateFilter('sort', e.target.value)}
                    >
                        {WISHLIST_SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {t(option.labelKey)}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                    <div className="space-y-3">
                        <label className="text-sm font-semibold">{t("categories")}</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {categories.map(c => (
                                <div key={c.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`cat-${c.id}`}
                                        checked={filterState.currentCategories.includes(c.id)}
                                        onChange={() => toggleCategory(c.id)}
                                    />
                                    <label htmlFor={`cat-${c.id}`} className="text-sm cursor-pointer">{c.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Currency */}
                <div className="space-y-3">
                    <label htmlFor="currency-select" className="text-sm font-semibold">{t("currency")}</label>
                    <Select
                        id="currency-select"
                        value={filterState.currentCurrency}
                        onChange={(e) => updateFilter('currency', e.target.value)}
                    >
                        <option value="">{t("allCurrencies")}</option>
                        {AVAILABLE_CURRENCIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                    <div className="text-sm font-semibold flex justify-between">
                        <span>{t("priceRange")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 w-full">
                            <label htmlFor="min-price-input" className="text-xs text-muted-foreground">{t("min")}</label>
                            <Input
                                id="min-price-input"
                                type="number"
                                min="0"
                                max={localMaxPrice}
                                value={localMinPrice}
                                onChange={(e) => { setLocalMinPrice(e.target.value); debouncedUpdateFilter('minPrice', e.target.value); }}
                                className="h-8 text-xs"
                                placeholder="Min"
                            />
                        </div>
                        <span className="text-muted-foreground mt-5" aria-hidden="true">-</span>
                        <div className="flex flex-col gap-1 w-full">
                            <label htmlFor="max-price-input" className="text-xs text-muted-foreground">{t("max")}</label>
                            <Input
                                id="max-price-input"
                                type="number"
                                min={localMinPrice}
                                max={maxPriceOverall}
                                value={localMaxPrice}
                                onChange={(e) => { setLocalMaxPrice(e.target.value); debouncedUpdateFilter('maxPrice', e.target.value); }}
                                className="h-8 text-xs"
                                placeholder="Max"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2 px-1">
                         <div className="flex flex-col gap-1">
                             <label htmlFor="min-price-range" className="text-[10px] text-muted-foreground">{t("minPrice")}</label>
                             <input
                                 id="min-price-range"
                                 type="range"
                                 min="0"
                                 max={maxPriceOverall}
                                 value={localMinPrice}
                                 onChange={(e) => { setLocalMinPrice(e.target.value); debouncedUpdateFilter('minPrice', e.target.value); }}
                                 className="w-full accent-primary h-1"
                             />
                         </div>
                         <div className="flex flex-col gap-1">
                             <label htmlFor="max-price-range" className="text-[10px] text-muted-foreground">{t("maxPrice")}</label>
                             <input
                                 id="max-price-range"
                                 type="range"
                                 min="0"
                                 max={maxPriceOverall}
                                 value={localMaxPrice}
                                 onChange={(e) => { setLocalMaxPrice(e.target.value); debouncedUpdateFilter('maxPrice', e.target.value); }}
                                 className="w-full accent-primary h-1"
                             />
                         </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                        setLocalMinPrice("0");
                        setLocalMaxPrice(maxPriceOverall.toString());
                        startTransition(() => {
                            const shareKey = searchParams.get("k");
                            const query = shareKey ? `?k=${encodeURIComponent(shareKey)}` : "";
                            router.push(`${pathname}${query}`, { scroll: false });
                        });
                    }}
                >
                    {t("clearFilters")}
                </Button>
            </div>
        </div>
    );
}
