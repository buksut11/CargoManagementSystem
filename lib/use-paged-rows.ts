"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PageResult<T> = { data: T[] | null };
type PageFetcher<T> = (from: number, to: number) => PromiseLike<PageResult<T>>;

// Incremental "Load more" fetching for list pages. Loads the first `pageSize`
// rows on mount and appends another page per loadMore() call, so a list's
// initial payload stays constant no matter how much history an organization
// accumulates.
//
// Only use this on pure lists. A page that derives an on-screen total from its
// rows (Payments, Expenses, the statements) must keep fetching everything —
// summing a partial list would display a wrong figure — until that total comes
// from a database aggregate.
//
// hasMore is inferred from receiving a full page; when the row count is an
// exact multiple of pageSize the final loadMore() simply returns empty.
export function usePagedRows<T>(fetcher: PageFetcher<T>, pageSize = 100) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Refs so loadMore always sees the live offset/fetcher without pages having
  // to memoize the query builder they pass in. The fetcher ref is synced in an
  // effect (not during render); it is declared first so it runs before the
  // initial-load effect below.
  const offsetRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await fetcherRef.current(0, pageSize - 1);
      if (!active) return;
      const page = data ?? [];
      offsetRef.current = page.length;
      setRows(page);
      setHasMore(page.length === pageSize);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const from = offsetRef.current;
    const { data } = await fetcherRef.current(from, from + pageSize - 1);
    const page = data ?? [];
    offsetRef.current = from + page.length;
    setRows((prev) => [...prev, ...page]);
    setHasMore(page.length === pageSize);
    setLoadingMore(false);
  }, [pageSize]);

  return { rows, loading, loadingMore, hasMore, loadMore };
}
