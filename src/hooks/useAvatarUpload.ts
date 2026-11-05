"use client";

/**
 * Shared avatar upload flow for the account area.
 * Picking a file never saves immediately: the processed image is held as a
 * pending preview until the user confirms it in the preview dialog. The
 * confirmed data URL is persisted through the existing account profile
 * overlay (localStorage key: hsp-mart-account-profile).
 */

import { useCallback, useRef, useState } from "react";
import { useAccountProfile } from "@/context/AccountProfileContext";
import { fileToAvatarDataUrl } from "@/lib/avatar";

export function useAvatarUpload() {
  const { profile, hydrated, saveProfile } = useAccountProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");

  const hasAvatar = Boolean(profile.avatar);

  const openPicker = useCallback(() => {
    setPhotoError("");
    setPhotoNotice("");
    fileInputRef.current?.click();
  }, []);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setPhotoError("");
    setPhotoNotice("");
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setPendingPhoto(dataUrl);
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "Could not save that photo.",
      );
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const savePendingPhoto = useCallback(() => {
    if (!pendingPhoto) return;
    saveProfile({ ...profile, avatar: pendingPhoto });
    setPendingPhoto(null);
    setPhotoNotice("Profile photo updated on this device.");
  }, [pendingPhoto, profile, saveProfile]);

  const cancelPendingPhoto = useCallback(() => {
    setPendingPhoto(null);
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoError("");
    setPhotoNotice("");
    saveProfile({ ...profile, avatar: undefined });
    setPhotoNotice("Photo removed — your initials are shown instead.");
  }, [profile, saveProfile]);

  const dismissNotice = useCallback(() => setPhotoNotice(""), []);

  return {
    profile,
    hydrated,
    hasAvatar,
    fileInputRef,
    pendingPhoto,
    photoBusy,
    photoError,
    photoNotice,
    openPicker,
    handleFile,
    savePendingPhoto,
    cancelPendingPhoto,
    removePhoto,
    dismissNotice,
  };
}
