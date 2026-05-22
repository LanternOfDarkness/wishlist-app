# Plan: Repository seam for Prisma

Based on Design A ("Minimal"). One interface with 3 entry points (`load`, `require`, `execute`). All 21 Prisma call sites move behind it.

## New file tree

```
src/lib/repository/
  types.ts           — domain types + load specs + write commands
  interface.ts       — IWishlistRepository
  prisma-adapter.ts  — production adapter
  in-memory-adapter.ts — test adapter
  index.ts           — exports the active adapter
```

## 1. Domain types (`types.ts`)

```typescript
// ── Core entities (plain TS, no Prisma dependency) ────────

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  createdAt: Date;
}

export interface WishlistData {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublic: boolean;
  appearance: Record<string, unknown>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnedWishlistInfo {
  id: string;
  slug: string;
}

export interface WishlistAppearanceInfo {
  id: string;
  appearance: Record<string, unknown>;
}

export interface ItemData {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  priority: number;
  isReserved: boolean;
  isPrivate: boolean;
  showInWidget: boolean;
  wishlistId: string;
  categoryId: string | null;
  createdAt: Date;
}

export interface ItemWithCategory extends ItemData {
  category: CategoryData | null;
}

export interface OwnedItemInfo {
  id: string;
  wishlistId: string;
}

export interface CategoryData {
  id: string;
  name: string;
}

export interface FollowRelation {
  followerId: string;
  followingId: string;
}

export interface ViewerPageUser {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  createdAt: Date;
  categories: CategoryData[];
  followers: Array<{ followerId: string }>;
  following: Array<{ followingId: string }>;
}

export interface WishlistPageData {
  wishlist: WishlistData;
  items: ItemWithCategory[];
  maxPrice: number;
}

export interface EmbedWishlistData {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
  };
  wishlist: WishlistData;
  items: ItemData[];
}

export interface DashboardUserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  createdAt: Date;
  wishlist: (WishlistData & { items: ItemData[] }) | null;
}

// ── Result value for wishlist-presentation ────────────────

export interface WishlistPresentationResult {
  user: ViewerPageUser;
  wishlistResult: WishlistPageData;
}

export interface EmbedPresentationResult {
  user: ViewerPageUser;
  items: ItemData[];
  profileUrl: string;
  appearance: WishlistAppearanceInfo;
  widget: { widgetLayout: string; widgetItemSize: number };
}

// ── Intake domain types (moved from wishlist-item-intake) ─

export interface ItemDraft {
  name: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency: string;
  priority: number;
  isPrivate: boolean;
  wishlistId: string;
  categoryId?: string;
  newCategoryName?: string;
}
```

## 2. Interface (`interface.ts`)

```typescript
import type {
  ViewerPageUser,
  WishlistAppearanceInfo,
  OwnedWishlistInfo,
  OwnedItemInfo,
  FollowRelation,
  DashboardUserData,
  WishlistPresentationResult,
  EmbedWishlistData,
  UserProfile,
  WishlistData,
  ItemData,
  ItemDraft,
  CategoryData,
} from "./types";

// ── Load specs: every read operation ───────────────────────

export type LoadSpec =
  | { type: "viewer-page-user"; username: string }
  | { type: "wishlist-presentation"; userId: string; canViewPrivate: boolean; categories?: string[]; currency?: string; minPrice?: number; maxPrice?: number; sort?: string }
  | { type: "embed-presentation"; username: string }
  | { type: "owned-wishlist"; wishlistId: string; userId: string }
  | { type: "wishlist-appearance"; userId: string }
  | { type: "owned-item"; itemId: string; userId: string }
  | { type: "widget-item-count"; userId: string }
  | { type: "follow-status"; followerId: string; followingId: string }
  | { type: "dashboard-user"; userId: string }
  | { type: "user-by-id"; id: string }
  | { type: "user-by-username"; username: string }
  | { type: "user-by-email"; email: string };

// ── Require specs: entities that throw when not found ──────

export type RequireSpec =
  | { type: "owned-wishlist"; wishlistId: string; userId: string }
  | { type: "wishlist-appearance"; userId: string }
  | { type: "owned-item"; itemId: string; userId: string };

// ── Write commands: every mutation ──────────────────────────

export type WriteCommand =
  | { type: "create-wishlist"; userId: string; title: string; slug: string }
  | { type: "add-item"; userId: string; item: ItemDraft }
  | { type: "toggle-follow"; followerId: string; followingId: string }
  | { type: "update-user-profile"; userId: string; name?: string; username?: string; appearance?: Record<string, unknown> }
  | { type: "update-widget-item-visibility"; itemId: string; showInWidget: boolean }
  | { type: "update-widget-settings"; wishlistId: string; appearance: Record<string, unknown> }
  | { type: "setup-user-account"; userId: string; username: string };

// ── Return type map ─────────────────────────────────────────

export interface SpecResultMap {
  "viewer-page-user": ViewerPageUser | null;
  "wishlist-presentation": WishlistPresentationResult | null;
  "embed-presentation": EmbedWishlistData | null;
  "owned-wishlist": OwnedWishlistInfo | null;
  "wishlist-appearance": WishlistAppearanceInfo | null;
  "owned-item": OwnedItemInfo | null;
  "widget-item-count": number;
  "follow-status": FollowRelation | null;
  "dashboard-user": DashboardUserData | null;
  "user-by-id": UserProfile | null;
  "user-by-username": UserProfile | null;
  "user-by-email": UserProfile | null;
}

// ── Interface ──────────────────────────────────────────────

export interface IWishlistRepository {
  load<S extends LoadSpec>(spec: S): Promise<SpecResultMap[S["type"]]>;
  require<S extends RequireSpec>(spec: S & { message?: string }): Promise<SpecResultMap[S["type"]] & {}>;
  execute<T>(command: WriteCommand): Promise<T>;
}
```

## 3. Prisma adapter (`prisma-adapter.ts`)

Single class. Big `switch` in `load` and `execute`. Every case maps to the existing Prisma query shape.

```typescript
import { prisma } from "@/lib/prisma";
import type { IWishlistRepository, LoadSpec, RequireSpec, WriteCommand, SpecResultMap } from "./interface";

export class PrismaWishlistRepository implements IWishlistRepository {
  async load<S extends LoadSpec>(spec: S): Promise<SpecResultMap[S["type"]]> {
    switch (spec.type) {
      case "viewer-page-user": {
        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          include: {
            categories: true,
            followers: { select: { followerId: true } },
            following: { select: { followingId: true } },
          },
        });
        if (!user) return null as any;
        return {
          id: user.id,
          name: user.name,
          image: user.image,
          username: user.username,
          createdAt: user.createdAt,
          categories: user.categories,
          followers: user.followers,
          following: user.following,
        } as any;
      }

      case "wishlist-presentation": {
        const wishlist = await prisma.wishlist.findUnique({
          where: { userId: spec.userId },
          include: {
            items: {
              where: {
                ...(spec.canViewPrivate ? {} : { isPrivate: false }),
                ...(spec.categories?.length ? { categoryId: { in: spec.categories } } : {}),
                ...(spec.currency ? { currency: spec.currency } : {}),
                ...(spec.minPrice !== undefined ? { price: { gte: spec.minPrice } } : {}),
                ...(spec.maxPrice !== undefined ? { price: { lte: spec.maxPrice } } : {}),
              },
              orderBy: buildOrderBy(spec.sort),
              include: { category: true },
            },
          },
        });
        if (!wishlist) return null as any;
        const prices = wishlist.items.map(i => i.price).filter((p): p is number => p !== null);
        return {
          wishlist: { id: wishlist.id, title: wishlist.title, slug: wishlist.slug, ... },
          items: wishlist.items.map(i => ({ ...i, category: i.category })),
          maxPrice: prices.length ? Math.max(...prices) : 10000,
        } as any;
      }

      case "owned-wishlist": {
        const w = await prisma.wishlist.findFirst({
          where: { id: spec.wishlistId, userId: spec.userId },
          select: { id: true, slug: true },
        });
        return w as any;
      }

      case "wishlist-appearance": {
        const w = await prisma.wishlist.findUnique({
          where: { userId: spec.userId },
          select: { id: true, appearance: true },
        });
        if (!w) return null as any;
        return {
          id: w.id,
          appearance: (w.appearance as Record<string, unknown>) ?? {},
        } as any;
      }

      case "owned-item": {
        const item = await prisma.item.findFirst({
          where: { id: spec.itemId, wishlist: { userId: spec.userId } },
          select: { id: true, wishlistId: true },
        });
        return item as any;
      }

      case "widget-item-count": {
        const count = await prisma.item.count({
          where: { wishlist: { userId: spec.userId }, showInWidget: true },
        });
        return count as any;
      }

      case "follow-status": {
        const follow = await prisma.follows.findUnique({
          where: {
            followerId_followingId: {
              followerId: spec.followerId,
              followingId: spec.followingId,
            },
          },
        });
        return follow as any;
      }

      case "dashboard-user": {
        const user = await prisma.user.findUnique({
          where: { id: spec.userId },
          include: {
            wishlist: {
              include: {
                items: { orderBy: { createdAt: "desc" } },
              },
            },
          },
        });
        if (!user) return null as any;
        return {
          id: user.id, name: user.name, email: user.email, image: user.image,
          username: user.username, createdAt: user.createdAt,
          wishlist: user.wishlist ? {
            id: user.wishlist.id, title: user.wishlist.title, slug: user.wishlist.slug,
            isPublic: user.wishlist.isPublic, appearance: (user.wishlist.appearance as Record<string, unknown>) ?? {},
            userId: user.wishlist.userId, createdAt: user.wishlist.createdAt, updatedAt: user.wishlist.updatedAt,
            items: user.wishlist.items.map(i => ({ ...i })),
          } : null,
        } as any;
      }

      case "user-by-id": {
        const user = await prisma.user.findUnique({
          where: { id: spec.id },
          select: { id: true, name: true, email: true, image: true, username: true, createdAt: true },
        });
        return user as any;
      }

      case "user-by-username": {
        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          select: { id: true, name: true, email: true, image: true, username: true, createdAt: true },
        });
        return user as any;
      }

      case "user-by-email": {
        const user = await prisma.user.findUnique({
          where: { email: spec.email },
          select: { id: true, name: true, email: true, image: true, username: true, createdAt: true },
        });
        return user as any;
      }

      case "embed-presentation": {
        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          include: {
            wishlist: {
              include: {
                items: {
                  where: { isPrivate: false },
                  orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
                },
              },
            },
          },
        });
        if (!user?.wishlist) return null as any;
        return {
          user: { id: user.id, name: user.name, image: user.image, username: user.username },
          wishlist: { id: user.wishlist.id, title: user.wishlist.title, slug: user.wishlist.slug, ... },
          items: user.wishlist.items,
        } as any;
      }
    }
  }

  async require<S extends RequireSpec>(spec: S & { message?: string }): Promise<any> {
    const result = await this.load(spec as any);
    if (result === null || result === undefined) {
      throw new Error(spec.message || `Required ${spec.type} not found`);
    }
    return result;
  }

  async execute<T>(command: WriteCommand): Promise<T> {
    switch (command.type) {
      case "create-wishlist": {
        const wishlist = await prisma.wishlist.create({
          data: { title: command.title, slug: command.slug, userId: command.userId },
        });
        return wishlist as any;
      }

      case "add-item": {
        const intake = command.item;
        let categoryId = intake.categoryId;
        if (intake.newCategoryName) {
          const cat = await prisma.category.create({
            data: { name: intake.newCategoryName, userId: command.userId },
          });
          categoryId = cat.id;
        }
        const item = await prisma.item.create({
          data: {
            name: intake.name,
            url: intake.url ?? null,
            imageUrl: intake.imageUrl ?? null,
            price: intake.price ?? null,
            currency: intake.currency,
            priority: intake.priority,
            isPrivate: intake.isPrivate,
            wishlistId: intake.wishlistId,
            categoryId: categoryId ?? null,
          },
        });
        return item as any;
      }

      case "toggle-follow": {
        const existing = await prisma.follows.findUnique({
          where: {
            followerId_followingId: {
              followerId: command.followerId,
              followingId: command.followingId,
            },
          },
        });
        if (existing) {
          await prisma.follows.delete({
            where: {
              followerId_followingId: {
                followerId: command.followerId,
                followingId: command.followingId,
              },
            },
          });
        } else {
          await prisma.follows.create({
            data: { followerId: command.followerId, followingId: command.followingId },
          });
        }
        return { followed: !existing } as any;
      }

      case "update-user-profile": {
        await prisma.user.update({
          where: { id: command.userId },
          data: {
            ...(command.name !== undefined ? { name: command.name } : {}),
            ...(command.username !== undefined ? { username: command.username } : {}),
            ...(command.appearance !== undefined
              ? { wishlist: { update: { appearance: command.appearance as any } } }
              : {}),
          },
        });
        return undefined as any;
      }

      case "update-widget-item-visibility": {
        await prisma.item.update({
          where: { id: command.itemId },
          data: { showInWidget: command.showInWidget },
        });
        return undefined as any;
      }

      case "update-widget-settings": {
        await prisma.wishlist.update({
          where: { id: command.wishlistId },
          data: { appearance: command.appearance as any },
        });
        return undefined as any;
      }

      case "setup-user-account": {
        await prisma.user.update({
          where: { id: command.userId },
          data: { username: command.username },
        });
        await prisma.wishlist.create({
          data: { userId: command.userId, title: "Мої бажання", slug: command.username },
        });
        return undefined as any;
      }
    }
  }
}

function buildOrderBy(sort?: string) {
  switch (sort) {
    case "price_asc": return [{ price: "asc" as const }, { createdAt: "desc" as const }];
    case "price_desc": return [{ price: "desc" as const }, { createdAt: "desc" as const }];
    case "newest": return [{ createdAt: "desc" as const }];
    default: return [{ priority: "desc" as const }, { createdAt: "desc" as const }];
  }
}
```

## 4. In-memory adapter (`in-memory-adapter.ts`)

```typescript
import type { IWishlistRepository, LoadSpec, RequireSpec, WriteCommand, SpecResultMap } from "./interface";
import type {
  UserProfile, WishlistData, ItemData, CategoryData, FollowRelation,
  ViewerPageUser, OwnedWishlistInfo, OwnedItemInfo, WishlistAppearanceInfo,
  DashboardUserData, EmbedWishlistData, WishlistPresentationResult, ItemWithCategory,
} from "./types";

export class InMemoryWishlistRepository implements IWishlistRepository {
  users = new Map<string, UserProfile>();
  wishlists = new Map<string, WishlistData>();
  items = new Map<string, ItemData>();
  categories = new Map<string, CategoryData>();
  follows = new Map<string, FollowRelation>();

  async load<S extends LoadSpec>(spec: S): Promise<any> {
    switch (spec.type) {
      case "viewer-page-user": {
        const user = [...this.users.values()].find(u => u.username === spec.username);
        if (!user) return null;
        return {
          ...user,
          categories: [...this.categories.values()].filter(c => c.userId === user.id),
          followers: [...this.follows.values()].filter(f => f.followingId === user.id).map(f => ({ followerId: f.followerId })),
          following: [...this.follows.values()].filter(f => f.followerId === user.id).map(f => ({ followingId: f.followingId })),
        };
      }
      case "owned-wishlist": {
        const w = [...this.wishlists.values()].find(w => w.id === spec.wishlistId && w.userId === spec.userId);
        return w ? { id: w.id, slug: w.slug } : null;
      }
      case "follow-status": {
        const f = [...this.follows.values()].find(f => f.followerId === spec.followerId && f.followingId === spec.followingId);
        return f ?? null;
      }
      case "widget-item-count": {
        return [...this.items.values()].filter(i => {
          const w = this.wishlists.get(i.wishlistId);
          return w?.userId === spec.userId && i.showInWidget;
        }).length;
      }
      // ... remaining cases mirrored from the Prisma adapter, operating on Maps
      default: throw new Error(`Unhandled spec: ${(spec as any).type}`);
    }
  }

  async require<S extends RequireSpec>(spec: S & { message?: string }): Promise<any> {
    const result = await this.load(spec as any);
    if (result === null || result === undefined) throw new Error(spec.message ?? "Not found");
    return result;
  }

  async execute<T>(command: WriteCommand): Promise<any> {
    switch (command.type) {
      case "create-wishlist": {
        const w: WishlistData = {
          id: crypto.randomUUID(), title: command.title, slug: command.slug,
          description: null, isPublic: true, appearance: {}, userId: command.userId,
          createdAt: new Date(), updatedAt: new Date(),
        };
        this.wishlists.set(w.id, w);
        return w;
      }
      case "toggle-follow": {
        const key = `${command.followerId}:${command.followingId}`;
        const existing = [...this.follows.values()].find(
          f => f.followerId === command.followerId && f.followingId === command.followingId
        );
        if (existing) { this.follows.delete(key); return { followed: false }; }
        this.follows.set(key, { followerId: command.followerId, followingId: command.followingId });
        return { followed: true };
      }
      // ... remaining cases
      default: throw new Error(`Unhandled command: ${(command as any).type}`);
    }
  }
}
```

## 5. Index (`index.ts`)

```typescript
import { PrismaWishlistRepository } from "./prisma-adapter";
import type { IWishlistRepository } from "./interface";

let _repo: IWishlistRepository | null = null;

export function getRepository(): IWishlistRepository {
  if (!_repo) {
    _repo = new PrismaWishlistRepository();
  }
  return _repo;
}

// For tests to inject the in-memory adapter
export function setTestRepository(repo: IWishlistRepository) {
  _repo = repo;
}

export type { IWishlistRepository } from "./interface";
export type * from "./types";
```

## 6. Caller migration: every file that changes

| File | Current | After |
|------|---------|-------|
| **auth.ts** | `prisma.user.findUnique(...)` + `prisma.user.update(...)` + `prisma.wishlist.create(...)` | `repo.execute({ type: "setup-user-account", userId, username })` |
| **wishlist-command-context.ts** | 5 Prisma calls wrapped in auth-check functions | **DELETE** — all callers use repository directly |
| **wishlist-item-intake-command.ts** | `normalizeWishlistItemIntake` + `requireOwnedWishlistById` + `prisma.item.create` | **DELETE** — logic moves into `execute({ type: "add-item" })` |
| **wishlist-presentation.ts** | 2 Prisma queries + filter building + null checks | Calls `repo.load({ type: "viewer-page-user" })` + `repo.load({ type: "wishlist-presentation" })`. Pure `buildWishlistPresentation` remains. |
| **dashboard-settings-intake.ts** | `prisma.user.findUnique(...)` deep include | **DELETE** — callers use `repo.load({ type: "dashboard-user" })` |
| **create-wishlist.ts** | `prisma.wishlist.create(...)` | `repo.execute({ type: "create-wishlist", ... })` |
| **follow-user.ts** | `prisma.follows.findUnique` + `delete`/`create` | `repo.execute({ type: "toggle-follow", ... })` |
| **update-profile.ts** | `prisma.user.findUnique` + `prisma.user.update` | `repo.load({ type: "user-by-username" })` + `repo.execute({ type: "update-user-profile" })` |
| **update-widget-items.ts** | `prisma.item.update(...)` | `repo.execute({ type: "update-widget-item-visibility", ... })` |
| **update-widget-settings.ts** | `prisma.wishlist.update(...)` | `repo.execute({ type: "update-widget-settings", ... })` |
| **dashboard/page.tsx** | `prisma.user.findUnique` + `prisma.wishlist.create` | `repo.load({ type: "user-by-email" })` + `repo.execute({ type: "create-wishlist" })` |
| **wishlist-filter-state.ts** | Returns `Prisma.ItemWhereInput` — type leakage | Now private to PrismaAdapter. Public API returns domain filter params. |

## 7. Files to delete

- `src/lib/wishlist-command-context.ts` — folded into repository require methods
- `src/lib/wishlist-item-intake-command.ts` — folded into `execute({ type: "add-item" })`
- `src/lib/dashboard-settings-intake.ts` — folded into `load({ type: "dashboard-user" })`

## 8. Files to modify

- `src/lib/wishlist-presentation.ts` — extract pure `buildWishlistPresentation`, data loading calls repository
- `src/lib/wishlist-filter-state.ts` — remove Prisma type exports; keep URL-side helpers only
- All 7 action files — replace `prisma` imports with `getRepository()`
- `src/auth.ts` — use repository for `createUser` event
- `src/app/[locale]/dashboard/page.tsx` — use repository
- `src/lib/wishlist-item-intake.ts` — keep type definitions, remove command wiring

## 9. Test strategy

**What tests survive unchanged:**
- `wishlist-appearance.test.ts` — pure functions, no Prisma dependency
- `wishlist-appearance-form.test.ts` — pure functions
- `wishlist-item-intake.test.ts` — pure normalization, no command wiring
- `wishlist-settings-state.test.ts` — pure transformations
- `fetch-metadata.test.ts` — pure I/O, no Prisma

**What gets deleted:**
- `wishlist-presentation.test.ts` — tests of pure helpers move to `buildWishlistPresentation` tests. Old tests tested the data-loading wrapper which is now the repository's job.

**What gets new tests at the interface:**
- `repository/__tests__/in-memory-adapter.test.ts` — tests the in-memory adapter directly (it IS the test seam)
- `wishlist-presentation.test.ts` — rewritten tests for `buildWishlistPresentation` that pass domain data directly, no DB

**What integration tests need:**
- `repository/__tests__/prisma-adapter.integration.test.ts` — optional, tests the Prisma adapter against a real test DB. Only needed if Prisma behavior (constraints, transactions) diverges from the in-memory adapter.

## 10. Migration order

1. Create `src/lib/repository/` with types, interface, in-memory adapter, and index
2. Implement the Prisma adapter (all 12 load cases + 7 execute cases)
3. Migrate action files one by one (no callers break until imports change)
4. Migrate `wishlist-presentation.ts` — extract pure builder, wire data-loading to repository
5. Migrate `auth.ts` and `dashboard/page.tsx`
6. Delete old command-context, intake-command, dashboard-intake files
7. Update `wishlist-filter-state.ts` to stop exporting Prisma types
8. Write new tests for `buildWishlistPresentation` using in-memory adapter
9. Write in-memory adapter tests
