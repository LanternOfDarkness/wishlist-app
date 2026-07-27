import { describe, expect, it } from "vitest";

import type { IWishlistRepository } from "../interface";

/**
 * A single set of assertions run against every adapter that implements
 * IWishlistRepository. The in-memory adapter runs this unconditionally in
 * CI; the Prisma adapter runs it against a live database (see
 * prisma-adapter.conformance.test.ts), gated behind an env var. A rule that
 * holds for one adapter and not the other now fails a test instead of
 * shipping — this is what stops the two adapters from drifting apart again.
 *
 * Each adapter under test supplies a `ConformanceHarness`: a small,
 * adapter-specific way to seed a user/wishlist/item/follow and to reset
 * state between tests. The test bodies below are 100% shared.
 */
export interface SeededUser {
  id: string;
  username: string;
}

export interface SeededWishlist {
  id: string;
}

export interface SeededItem {
  id: string;
}

export interface ConformanceHarness {
  repo: IWishlistRepository;
  reset(): Promise<void>;
  createUser(overrides?: { username?: string; email?: string }): Promise<SeededUser>;
  createWishlist(
    userId: string,
    overrides?: { isPublic?: boolean; shareToken?: string | null },
  ): Promise<SeededWishlist>;
  createItem(
    wishlistId: string,
    overrides?: {
      name?: string;
      price?: number | null;
      isPrivate?: boolean;
      isArchived?: boolean;
      isReserved?: boolean;
      showInWidget?: boolean;
    },
  ): Promise<SeededItem>;
  createFollow(followerId: string, followingId: string): Promise<void>;
}

const FULL_ACCESS = { includeArchived: false, includePrivate: true, widgetOnly: false };
const PUBLIC_ACCESS = { includeArchived: false, includePrivate: false, widgetOnly: false };

export function runRepositoryConformanceSuite(
  label: string,
  createHarness: () => Promise<ConformanceHarness> | ConformanceHarness,
) {
  describe(`repository conformance: ${label}`, () => {
    async function harness() {
      const h = await createHarness();
      await h.reset();
      return h;
    }

    describe("wishlist-presentation visibility", () => {
      it("hides private items from a viewer without private access", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        await h.createItem(wishlist.id, { name: "Public", isPrivate: false });
        await h.createItem(wishlist.id, { name: "Secret", isPrivate: true });

        const result = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: PUBLIC_ACCESS,
        });

        expect(result?.items.map((i) => i.name)).toEqual(["Public"]);
      });

      it("shows private items when itemVisibility grants access", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        await h.createItem(wishlist.id, { name: "Secret", isPrivate: true });

        const result = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });

        expect(result?.items.map((i) => i.name)).toEqual(["Secret"]);
      });

      it("never returns archived items, even when private access is granted", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        await h.createItem(wishlist.id, { name: "Live", isArchived: false });
        await h.createItem(wishlist.id, { name: "Archived", isArchived: true });

        const result = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });

        expect(result?.items.map((i) => i.name)).toEqual(["Live"]);
      });

      it("returns the wishlist's isPublic and shareToken alongside its items", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id, {
          isPublic: false,
          shareToken: "secret-token",
        });

        const result = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });

        expect(result?.wishlist.id).toBe(wishlist.id);
        expect(result?.wishlist.isPublic).toBe(false);
        expect(result?.wishlist.shareToken).toBe("secret-token");
      });

      it("returns null when the user has no wishlist", async () => {
        const h = await harness();
        const owner = await h.createUser();

        const result = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });

        expect(result).toBeNull();
      });

      it("carries partial-pledge amounts per item for the reservation progress bar", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { name: "Bike", price: 100 });

        await h.repo.execute({
          type: "create-pledge",
          itemId: item.id,
          userId: null,
          mode: "partial",
          amount: 40,
        });

        const result = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });

        const loaded = result?.items.find((i) => i.id === item.id);
        expect(loaded?.pledges).toEqual([{ amount: 40 }]);
      });
    });

    describe("embed-presentation visibility", () => {
      it("excludes both private and archived items (regression: archived items leaked into the widget)", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id, { isPublic: true });
        await h.createItem(wishlist.id, { name: "Public", isPrivate: false, isArchived: false });
        await h.createItem(wishlist.id, { name: "Private", isPrivate: true });
        await h.createItem(wishlist.id, { name: "Archived", isArchived: true });

        const result = await h.repo.load({ type: "embed-presentation", username: owner.username });

        expect(result?.items.map((i) => i.name)).toEqual(["Public"]);
      });
    });

    describe("item-for-reservation", () => {
      it("returns the item with its wishlist and owner's follow graph", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const friend = await h.createUser();
        await h.createFollow(friend.id, owner.id);
        await h.createFollow(owner.id, friend.id);
        const wishlist = await h.createWishlist(owner.id, { isPublic: false, shareToken: "tok" });
        const item = await h.createItem(wishlist.id, { name: "Bike", price: 100 });

        const result = await h.repo.load({ type: "item-for-reservation", itemId: item.id });

        expect(result?.id).toBe(item.id);
        expect(result?.wishlist.id).toBe(wishlist.id);
        expect(result?.wishlist.isPublic).toBe(false);
        expect(result?.wishlist.shareToken).toBe("tok");
        expect(result?.wishlist.user.id).toBe(owner.id);
        expect(result?.wishlist.user.followers).toEqual(
          expect.arrayContaining([{ followerId: friend.id }]),
        );
        expect(result?.wishlist.user.following).toEqual(
          expect.arrayContaining([{ followingId: friend.id }]),
        );
      });

      it("returns null for a missing item", async () => {
        const h = await harness();
        const result = await h.repo.load({ type: "item-for-reservation", itemId: "missing" });
        expect(result).toBeNull();
      });
    });

    describe("create-pledge", () => {
      it("lets exactly one of two concurrent full reservations succeed", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { price: 100 });

        const [first, second] = await Promise.all([
          h.repo.execute({ type: "create-pledge", itemId: item.id, userId: null, mode: "full" }),
          h.repo.execute({ type: "create-pledge", itemId: item.id, userId: null, mode: "full" }),
        ]);

        const successes = [first, second].filter((r) => r.success);
        expect(successes).toHaveLength(1);

        const reloaded = await h.repo.load({ type: "item-for-reservation", itemId: item.id });
        expect(reloaded?.isReserved).toBe(true);
      });

      it("rejects a full reservation once the item is already reserved", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { price: 100, isReserved: true });

        const result = await h.repo.execute({
          type: "create-pledge",
          itemId: item.id,
          userId: null,
          mode: "full",
        });

        expect(result).toEqual({ success: false, error: "Item is already reserved" });
      });

      it("accumulates partial pledges and marks the item reserved once they reach the price", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { price: 100 });

        const first = await h.repo.execute({
          type: "create-pledge",
          itemId: item.id,
          userId: null,
          mode: "partial",
          amount: 60,
        });
        expect(first.success).toBe(true);

        let reloaded = await h.repo.load({ type: "item-for-reservation", itemId: item.id });
        expect(reloaded?.isReserved).toBe(false);

        const second = await h.repo.execute({
          type: "create-pledge",
          itemId: item.id,
          userId: null,
          mode: "partial",
          amount: 40,
        });
        expect(second.success).toBe(true);

        reloaded = await h.repo.load({ type: "item-for-reservation", itemId: item.id });
        expect(reloaded?.isReserved).toBe(true);
      });

      it("rejects a partial pledge once the item is already reserved", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { price: 100, isReserved: true });

        const result = await h.repo.execute({
          type: "create-pledge",
          itemId: item.id,
          userId: null,
          mode: "partial",
          amount: 10,
        });

        expect(result).toEqual({ success: false, error: "Item is already reserved" });
      });
    });

    describe("update-widget-item-visibility", () => {
      it("enforces the 5-item widget cap", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const items = await Promise.all(
          Array.from({ length: 6 }, () => h.createItem(wishlist.id)),
        );

        for (const item of items.slice(0, 5)) {
          const result = await h.repo.execute({
            type: "update-widget-item-visibility",
            itemId: item.id,
            userId: owner.id,
            showInWidget: true,
          });
          expect(result).toEqual({ success: true });
        }

        const sixth = await h.repo.execute({
          type: "update-widget-item-visibility",
          itemId: items[5].id,
          userId: owner.id,
          showInWidget: true,
        });
        expect(sixth).toEqual({ success: false, error: "limit-exceeded" });

        const count = await h.repo.load({ type: "widget-item-count", userId: owner.id });
        expect(count).toBe(5);
      });

      it("allows removing an item from the widget without counting toward the cap", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { showInWidget: true });

        const result = await h.repo.execute({
          type: "update-widget-item-visibility",
          itemId: item.id,
          userId: owner.id,
          showInWidget: false,
        });

        expect(result).toEqual({ success: true });
      });
    });

    describe("share token commands", () => {
      it("regenerates a share token, overwriting any previous one", async () => {
        const h = await harness();
        const owner = await h.createUser();
        await h.createWishlist(owner.id, { shareToken: "old-token" });

        const result = await h.repo.execute({ type: "regenerate-share-token", userId: owner.id });

        expect(result.shareToken).toBeTruthy();
        expect(result.shareToken).not.toBe("old-token");

        const reloaded = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });
        expect(reloaded?.wishlist.shareToken).toBe(result.shareToken);
      });

      it("revokes a share token", async () => {
        const h = await harness();
        const owner = await h.createUser();
        await h.createWishlist(owner.id, { shareToken: "old-token" });

        await h.repo.execute({ type: "revoke-share-token", userId: owner.id });

        const reloaded = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });
        expect(reloaded?.wishlist.shareToken).toBeNull();
      });
    });

    describe("update-user-profile", () => {
      it("updates name, username, appearance, and isPublic together", async () => {
        const h = await harness();
        const owner = await h.createUser();
        await h.createWishlist(owner.id, { isPublic: true });

        await h.repo.execute({
          type: "update-user-profile",
          userId: owner.id,
          name: "New Name",
          appearance: { colorPreset: "rose" },
          isPublic: false,
        });

        const reloaded = await h.repo.load({
          type: "wishlist-presentation",
          userId: owner.id,
          itemVisibility: FULL_ACCESS,
        });
        expect(reloaded?.wishlist.isPublic).toBe(false);
        expect(reloaded?.wishlist.appearance).toEqual({ colorPreset: "rose" });
      });
    });

    describe("item mutations", () => {
      it("update-item changes the stored fields", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { name: "Old name" });

        const updated = await h.repo.execute({
          type: "update-item",
          itemId: item.id,
          item: {
            name: "New name",
            currency: "USD",
            priority: 2,
            isPrivate: true,
          },
        });

        expect(updated.name).toBe("New name");
        expect(updated.isPrivate).toBe(true);
      });

      it("delete-item removes the item", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id);

        await h.repo.execute({ type: "delete-item", itemId: item.id });

        const reloaded = await h.repo.load({ type: "owned-item", itemId: item.id, userId: owner.id });
        expect(reloaded).toBeNull();
      });

      it("set-item-archived toggles the archived flag", async () => {
        const h = await harness();
        const owner = await h.createUser();
        const wishlist = await h.createWishlist(owner.id);
        const item = await h.createItem(wishlist.id, { isArchived: false });

        const archived = await h.repo.execute({
          type: "set-item-archived",
          itemId: item.id,
          archived: true,
        });
        expect(archived.isArchived).toBe(true);

        const unarchived = await h.repo.execute({
          type: "set-item-archived",
          itemId: item.id,
          archived: false,
        });
        expect(unarchived.isArchived).toBe(false);
      });
    });
  });
}
