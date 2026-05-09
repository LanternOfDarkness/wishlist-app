"use client";

import { useState, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import { Category } from "@prisma/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Filter } from "lucide-react";
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";

interface WishlistFiltersProps {
    categories: Category[];
    maxPriceOverall?: number;
}

export function WishlistFilters({ categories, maxPriceOverall = 10000 }: WishlistFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    const currentCategories = searchParams.getAll('category');
    const currentSort = searchParams.get('sort') || 'priority';
    const urlMinPrice = searchParams.get('minPrice') || '0';
    const urlMaxPrice = searchParams.get('maxPrice') || maxPriceOverall.toString();

    const [localMinPrice, setLocalMinPrice] = useState(urlMinPrice);
    const [localMaxPrice, setLocalMaxPrice] = useState(urlMaxPrice);

    // Sync local state when URL changes externally (e.g. clear filters)
    const [prevUrlMinPrice, setPrevUrlMinPrice] = useState(urlMinPrice);
    const [prevUrlMaxPrice, setPrevUrlMaxPrice] = useState(urlMaxPrice);

    if (urlMinPrice !== prevUrlMinPrice) {
        setLocalMinPrice(urlMinPrice);
        setPrevUrlMinPrice(urlMinPrice);
    }
    if (urlMaxPrice !== prevUrlMaxPrice) {
        setLocalMaxPrice(urlMaxPrice);
        setPrevUrlMaxPrice(urlMaxPrice);
    }
    const currentCurrency = searchParams.get('currency') || '';

    const [isExpanded, setIsExpanded] = useState(false);

    const updateFilter = (key: string, value: string | string[]) => {
        const params = new URLSearchParams(searchParams.toString());

        if (Array.isArray(value)) {
            params.delete(key);
            value.forEach(v => params.append(key, v));
        } else {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        }
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
        const newCategories = currentCategories.includes(categoryId)
            ? currentCategories.filter(id => id !== categoryId)
            : [...currentCategories, categoryId];
        updateFilter('category', newCategories);
    };

    return (
        <div className="w-full md:w-64 shrink-0 mb-8 md:mb-0 bg-card border rounded-lg p-4 shadow-sm h-fit sticky top-20">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex gap-2 items-center">
                    <Filter className="w-4 h-4" />
                    <h3 className="font-medium text-lg">Filters</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    aria-controls="filters-content"
                >
                    {isExpanded ? 'Hide' : 'Show'}
                </Button>
            </div>

            <div id="filters-content" className={`space-y-6 ${isExpanded ? 'block' : 'hidden md:block'}`}>
                {/* Sort */}
                <div className="space-y-3">
                    <label htmlFor="sort-select" className="text-sm font-semibold">Sort By</label>
                    <select
                        id="sort-select"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={currentSort}
                        onChange={(e) => updateFilter('sort', e.target.value)}
                    >
                        <option value="priority">Highest Priority</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                    </select>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                    <div className="space-y-3">
                        <label className="text-sm font-semibold">Categories</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {categories.map(c => (
                                <div key={c.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`cat-${c.id}`}
                                        checked={currentCategories.includes(c.id)}
                                        onChange={() => toggleCategory(c.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor={`cat-${c.id}`} className="text-sm cursor-pointer">{c.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Currency */}
                <div className="space-y-3">
                    <label htmlFor="currency-select" className="text-sm font-semibold">Currency</label>
                    <select
                        id="currency-select"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={currentCurrency}
                        onChange={(e) => updateFilter('currency', e.target.value)}
                    >
                        <option value="">All Currencies</option>
                        {AVAILABLE_CURRENCIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                    <div className="text-sm font-semibold flex justify-between">
                        <span>Price Range</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 w-full">
                            <label htmlFor="min-price-input" className="text-xs text-muted-foreground">Min</label>
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
                            <label htmlFor="max-price-input" className="text-xs text-muted-foreground">Max</label>
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
                             <label htmlFor="min-price-range" className="text-[10px] text-muted-foreground">Min Price</label>
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
                             <label htmlFor="max-price-range" className="text-[10px] text-muted-foreground">Max Price</label>
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
                    onClick={() => startTransition(() => {
            router.push(pathname, { scroll: false });
        })}
                >
                    Clear Filters
                </Button>
            </div>
        </div>
    );
}
