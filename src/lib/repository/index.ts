import { PrismaWishlistRepository } from "./prisma-adapter";
import type { IWishlistRepository } from "./interface";

let _repo: IWishlistRepository | null = null;

export function getRepository(): IWishlistRepository {
  if (!_repo) {
    _repo = new PrismaWishlistRepository();
  }
  return _repo;
}

export function setTestRepository(repo: IWishlistRepository) {
  _repo = repo;
}

export type { IWishlistRepository } from "./interface";
export type * from "./types";
