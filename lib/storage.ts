"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Shipment attachments live in a private bucket (migration 0024), so their
// contents are reachable only through a short-lived signed URL that Supabase
// issues after checking the caller is a member of the owning organization.
const BUCKET = "shipment-attachments";
const MARKER = `/${BUCKET}/`;
const SIGNED_TTL = 60 * 60; // 1 hour

// Turn a stored attachment value into a signed URL. The stored value may be a
// full public-style URL (…/object/public/shipment-attachments/{path}) from
// before the bucket was made private, or a bare object path — both resolve to
// the same object path here. Signing also works while the bucket is still
// public, so this is safe to ship before running the migration. On any failure
// it returns the original value unchanged so the UI never breaks.
export async function signedAttachmentUrl(
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  const i = stored.indexOf(MARKER);
  const path = i >= 0 ? stored.slice(i + MARKER.length) : stored;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_TTL);
    if (error || !data?.signedUrl) return stored;
    return data.signedUrl;
  } catch {
    return stored;
  }
}

// Hook form: resolves a stored attachment value to a signed URL for display.
// Returns null until resolved (a brief tick), then the signed URL.
export function useSignedAttachment(
  stored: string | null | undefined,
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    // signedAttachmentUrl(null) resolves to null, so the empty case flows
    // through the async path too — no synchronous setState in the effect.
    signedAttachmentUrl(stored).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [stored]);
  return url;
}
