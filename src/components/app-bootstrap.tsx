"use client";

import { useEffect } from "react";
import { seedDefaultCategories } from "@/lib/seed";

/**
 * 初回起動時に既定カテゴリを投入する（冪等）。
 * IndexedDB はクライアントのみで使えるため client component で 1 度だけ実行する。
 */
export function AppBootstrap() {
  useEffect(() => {
    void seedDefaultCategories();
  }, []);
  return null;
}
