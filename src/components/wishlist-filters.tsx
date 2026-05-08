"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Category } from "@prisma/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Filter, ArrowDownUp } from "lucide-react";
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";

interface WishlistFiltersProps {
    categories: Category[];
    username: string;
    maxPriceOverall?: number;
}

export function WishlistFilters({ categories, username, maxPriceOverall = 10000 }: WishlistFiltersProps) {
    const router = useRouter();
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
        router.push(`/${username}?${params.toString()}`);
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
                <div className="space-y-3">
                    <label className="text-sm font-semibold flex justify-between">
                        <span>Price Range</span>
                        <span className="text-muted-foreground font-normal text-xs">{minPrice} - {maxPrice}</span>
                    </label>
                    <div className="px-2">
                        <input
                            type="range"
                            min="0"
                            max={maxPriceOverall}
                            value={maxPrice}
                            onChange={(e) => updateFilter('maxPrice', e.target.value)}
                            className="w-full accent-primary"
                        />
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => router.push(`/${username}`)}
                >
                    Clear Filters
                </Button>
            </div>
        </div>
    );
}
