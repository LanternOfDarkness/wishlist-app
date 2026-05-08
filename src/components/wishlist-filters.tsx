"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Category } from "@prisma/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Filter, ArrowDownUp } from "lucide-react";

interface WishlistFiltersProps {
    categories: Category[];
    username: string;
}

export function WishlistFilters({ categories, username }: WishlistFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentCategory = searchParams.get('category') || '';
    const currentSort = searchParams.get('sort') || 'priority';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    const [isExpanded, setIsExpanded] = useState(false);

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`/${username}?${params.toString()}`);
    };

    return (
        <div className="w-full mb-8 bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2 items-center">
                    <Filter className="w-4 h-4" />
                    <h3 className="font-medium">Filters</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? 'Hide' : 'Show'} Filters
                </Button>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    {/* Category Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            value={currentCategory}
                            onChange={(e) => updateFilters('category', e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Sort By</label>
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            value={currentSort}
                            onChange={(e) => updateFilters('sort', e.target.value)}
                        >
                            <option value="priority">Highest Priority</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="newest">Newest First</option>
                        </select>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Price Range</label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder="Min"
                                value={minPrice}
                                onChange={(e) => updateFilters('minPrice', e.target.value)}
                            />
                            <Input
                                type="number"
                                placeholder="Max"
                                value={maxPrice}
                                onChange={(e) => updateFilters('maxPrice', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
