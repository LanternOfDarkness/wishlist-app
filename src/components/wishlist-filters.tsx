"use client";

import { useState } from "react";
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

    const currentCategories = searchParams.getAll('category');
    const currentSort = searchParams.get('sort') || 'priority';
    const minPrice = searchParams.get('minPrice') || '0';
    const maxPrice = searchParams.get('maxPrice') || maxPriceOverall.toString();
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
        router.push(`${pathname}?${params.toString()}`);
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
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? 'Hide' : 'Show'}
                </Button>
            </div>

            <div className={`space-y-6 ${isExpanded ? 'block' : 'hidden md:block'}`}>
                {/* Sort */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold">Sort By</label>
                    <select
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
                    <label className="text-sm font-semibold">Currency</label>
                    <select
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
                    <label className="text-sm font-semibold flex justify-between">
                        <span>Price Range</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 w-full">
                            <span className="text-xs text-muted-foreground">Min</span>
                            <Input
                                type="number"
                                min="0"
                                max={maxPrice}
                                value={minPrice}
                                onChange={(e) => updateFilter('minPrice', e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Min"
                            />
                        </div>
                        <span className="text-muted-foreground mt-5">-</span>
                        <div className="flex flex-col gap-1 w-full">
                            <span className="text-xs text-muted-foreground">Max</span>
                            <Input
                                type="number"
                                min={minPrice}
                                max={maxPriceOverall}
                                value={maxPrice}
                                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Max"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2 px-1">
                         <div className="flex flex-col gap-1">
                             <label className="text-[10px] text-muted-foreground">Min Price</label>
                             <input
                                 type="range"
                                 min="0"
                                 max={maxPriceOverall}
                                 value={minPrice}
                                 onChange={(e) => updateFilter('minPrice', e.target.value)}
                                 className="w-full accent-primary h-1"
                             />
                         </div>
                         <div className="flex flex-col gap-1">
                             <label className="text-[10px] text-muted-foreground">Max Price</label>
                             <input
                                 type="range"
                                 min="0"
                                 max={maxPriceOverall}
                                 value={maxPrice}
                                 onChange={(e) => updateFilter('maxPrice', e.target.value)}
                                 className="w-full accent-primary h-1"
                             />
                         </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => router.push(pathname)}
                >
                    Clear Filters
                </Button>
            </div>
        </div>
    );
}
