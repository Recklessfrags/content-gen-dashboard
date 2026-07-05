import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import {
  lockVisualIdentity,
  signedRefImageUrl,
  unlockVisualIdentity,
  uploadRefImage,
  validateRefImage,
  VisualIdentityError,
} from "@/lib/castingVisual";
import { createClient } from "@/lib/supabase/client";
import type { FlatChar } from "./shared";

export type VisualIdentityFields = {
  reference_image_url: string | null;
  visual_style: string | null;
};

type VisualCharacter = FlatChar;

type VisualIdentityPanelProps = {
  character: VisualCharacter;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onCharacterPatched: (id: string, patch: VisualIdentityFields) => void;
  showFlash: (msg: string, err?: boolean) => void;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
  variant?: "modal" | "inline";
};

type Mode = "empty" | "preview" | "locked" | "loading" | "error" | "missing";

export function VisualIdentityPanel({
  character,
  supabase,
  onClose,
  onCharacterPatched,
  showFlash,
  restoreFocusRef,
  variant = "modal",
}: VisualIdentityPanelProps) {
  const inline = variant === "inline";
  const panelRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [style, setStyle] = useState(character.visual_style ?? "");
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const aliveRef = useRef(true);

  const lockedPath = character.reference_image_url?.trim() || null;
  const hasPreview = previewFile !== null && previewUrl !== null;
  const canLock = style.trim().length >= 3 && hasPreview && !loading;
  const locked = lockedPath !== null && !hasPreview;
  const mode: Mode = loading
    ? "loading"
    : error
      ? "error"
      : missing && lockedPath
        ? "missing"
        : hasPreview
          ? "preview"
          : lockedPath
            ? "locked"
            : "empty";
  const handleEscape = useCallback(() => {
    if (hasPreview || style.trim() !== (character.visual_style ?? "").trim()) return;
    onClose();
  }, [character.visual_style, hasPreview, onClose, style]);

  useScrollLock(!inline);

  useFocusTrap({
    active: !inline,
    containerRef: panelRef,
    onEscape: handleEscape,
    initialFocusRef: firstFieldRef,
    restoreFocusRef,
  });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    setStyle(character.visual_style ?? "");
  }, [character.id, character.visual_style]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!lockedPath || hasPreview) {
      setSignedUrl(null);
      setMissing(false);
      return undefined;
    }

    let cancelled = false;
    setSigning(true);
    setMissing(false);
    setError(null);
    void signedRefImageUrl(supabase, lockedPath)
      .then((url) => {
        if (!cancelled && aliveRef.current) setSignedUrl(url);
      })
      .catch(() => {
        if (!cancelled && aliveRef.current) {
          setSignedUrl(null);
          setMissing(true);
        }
      })
      .finally(() => {
        if (!cancelled && aliveRef.current) setSigning(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasPreview, lockedPath, supabase]);

  const className = useMemo(() => `visual-studio-modal visual-studio--${mode}`, [mode]);

  const resetPreview = useCallback(() => {
    setPreviewFile(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const selectFile = useCallback(
    (file: File | null) => {
      if (!file || loading) return;
      const validationError = validateRefImage(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      resetPreview();
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStyle(character.visual_style ?? "");
      setMissing(false);
      setError(null);
    },
    [character.visual_style, loading, resetPreview],
  );

  const openFilePicker = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files.item(0));
  };

  const handleLock = async () => {
    if (!previewFile || !canLock || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const ownerId = userData.user?.id;
      if (userError || !ownerId) {
        throw new VisualIdentityError("Your session expired - sign in again to lock the image.");
      }
      const path = await uploadRefImage(supabase, ownerId, character.id, previewFile);
      await lockVisualIdentity(supabase, character.id, path, style);
      if (!aliveRef.current) return;
      onCharacterPatched(character.id, {
        reference_image_url: path,
        visual_style: style.trim(),
      });
      resetPreview();
      setMissing(false);
      showFlash("Visual identity locked");
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to secure image. Check network connection.");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (loading) return;
    const confirmed = window.confirm(
      "Remove this visual identity from the character profile? Stored files are kept for your records.",
    );
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      await unlockVisualIdentity(supabase, character.id);
      if (!aliveRef.current) return;
      onCharacterPatched(character.id, { reference_image_url: null, visual_style: null });
      setSignedUrl(null);
      setMissing(false);
      setStyle("");
      showFlash("Visual identity removed");
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : "Could not remove visual identity.");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  };

  const handleReplace = () => {
    if (loading) return;
    setError(null);
    fileInputRef.current?.click();
  };

  const handleLayerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (hasPreview || style.trim() !== (character.visual_style ?? "").trim()) return;
    onClose();
  };

  const content = (
    <>
        <div className="visual-studio-head">
          <div>
            <span className="eyebrow">CHARACTER</span>
            <h2 id="visual-panel-title">VISUAL IDENTITY ARCHIVE</h2>
          </div>
          {!inline && (
            <button
              ref={firstFieldRef}
              className="history-x"
              type="button"
              aria-label="Close visual identity archive"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>

        <div className="visual-studio-body" aria-busy={loading || signing}>
          <div className="visual-studio-file">
            <span className="eyebrow">Profile · {character.codename || "Untitled"}</span>
            <span className={"chip " + (lockedPath && !missing ? "active" : "draft")}>
              {lockedPath && !missing ? "Locked" : missing ? "Missing" : "No visual yet"}
            </span>
          </div>

          {error && (
            <div className="visual-error-banner" role="alert">
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => selectFile(event.target.files?.item(0) ?? null)}
          />

          {!lockedPath && !hasPreview && (
            <section className="visual-empty-state">
              <p>
                Generate your character reference elsewhere (Midjourney, Gemini, etc.), then upload the final image
                here to lock their visual identity.
              </p>
              <button
                className="upload-dropzone"
                type="button"
                aria-label="Upload reference image"
                onClick={openFilePicker}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                disabled={loading}
              >
                <span className="visual-drop-icon" aria-hidden="true">
                  ◱
                </span>
                <span>Drag & Drop reference image or Click to Browse</span>
                <small>JPEG, PNG, WEBP. Max 5MB.</small>
              </button>
            </section>
          )}

          {hasPreview && (
            <section className="visual-preview-state">
              {previewUrl && (
                <div className="visual-photo-frame">
                  <img className="preview-thumbnail" src={previewUrl} alt="" />
                  {loading && <span className="visual-spinner" aria-hidden="true" />}
                </div>
              )}
              {loading && <p className="visual-loading-text">Archiving to Secure Storage...</p>}
              <label className="visual-style-label" htmlFor="visual-style-input">
                Visual Style Descriptor (Required)
              </label>
              <input
                id="visual-style-input"
                className="visual-style-input"
                type="text"
                maxLength={100}
                value={style}
                placeholder="e.g. Scruffy smuggler, cinematic lighting..."
                aria-invalid={style.trim().length > 0 && style.trim().length < 3}
                disabled={loading}
                onChange={(event) => setStyle(event.target.value)}
              />
              <div className="visual-action-bar">
                <button className="btn-discard" type="button" onClick={resetPreview} disabled={loading}>
                  Discard
                </button>
                <button
                  className="btn-lock"
                  type="button"
                  onClick={() => void handleLock()}
                  disabled={!canLock}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <span className="visual-inline-spinner" aria-hidden="true" /> LOCKING...
                    </>
                  ) : (
                    "Lock Identity"
                  )}
                </button>
              </div>
            </section>
          )}

          {locked && !missing && (
            <section className="visual-locked-state">
              <div className="visual-photo-frame">
                {signing ? (
                  <div className="visual-photo-skeleton skeleton" aria-label="Loading secure image" />
                ) : signedUrl ? (
                  <>
                    <img className="preview-thumbnail" src={signedUrl} alt="" />
                    <span className="visual-locked-stamp">LOCKED</span>
                  </>
                ) : (
                  <div className="visual-photo-skeleton" />
                )}
              </div>
              <div className="visual-style-readout">{character.visual_style || "No style descriptor on file."}</div>
              <div className="visual-action-bar">
                <button className="btn-remove" type="button" onClick={() => void handleRemove()} disabled={loading}>
                  Remove
                </button>
                <button className="btn-replace" type="button" onClick={handleReplace} disabled={loading}>
                  Replace Image
                </button>
              </div>
            </section>
          )}

          {lockedPath && missing && (
            <section className="visual-missing-state">
              <div className="visual-torn-photo" aria-hidden="true" />
              <h3>ARCHIVE CORRUPTED</h3>
              <p>Image missing from secure storage.</p>
              <div className="visual-action-bar">
                <button className="btn-remove" type="button" onClick={() => void handleRemove()} disabled={loading}>
                  Remove
                </button>
                <button className="btn-replace" type="button" onClick={handleReplace} disabled={loading}>
                  Replace
                </button>
              </div>
            </section>
          )}
        </div>
    </>
  );

  if (inline) {
    return (
      <section ref={panelRef} className={"visual-inline visual-inline--" + mode} aria-labelledby="visual-panel-title">
        {content}
      </section>
    );
  }

  return (
    <div className="history-layer visual-studio-layer" role="presentation" onMouseDown={handleLayerMouseDown}>
      <aside
        ref={panelRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visual-panel-title"
      >
        {content}
      </aside>
    </div>
  );
}
