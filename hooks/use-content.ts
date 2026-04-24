"use client";

import { useState, useCallback } from "react";

interface Asset {
  id: string;
  folder_id: string | null;
  name: string;
  type: string;
  mime_type: string | null;
  file_size: number | null;
  file_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
}

export function useContent() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async (folderId?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (folderId !== undefined) {
        if (folderId) {
          params.append("folderId", folderId);
        }
      } else if (currentFolderId) {
        params.append("folderId", currentFolderId);
      }

      const response = await fetch(`/api/content/assets?${params}`);
      if (!response.ok) throw new Error("Failed to fetch assets");
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch(`/api/content/folders`);
      if (!response.ok) throw new Error("Failed to fetch folders");
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  }, []);

  const uploadFile = useCallback(async (file: File, folderId?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const FIVE_MB = 5 * 1024 * 1024;

      if (file.size > FIVE_MB) {
        // For larger files, upload through the Next.js API route
        // which sends to Supabase server-side (bypasses client infrastructure limits)
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);

        const response = await fetch("/api/content/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to upload file");
        }

        const data = await response.json();
        await fetchAssets(currentFolderId);
        return data.asset;
      } else {
        // For small files, upload directly to Supabase from client (faster)
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const filePath = `uploads/${Date.now()}-${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("content")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message || "Failed to upload file to storage");
        }

        const { data: publicUrlData } = supabase.storage
          .from("content")
          .getPublicUrl(filePath);

        // Save metadata via API route
        const response = await fetch("/api/content/upload/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            fileUrl: publicUrlData.publicUrl,
            folderId: folderId || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save file metadata");
        }

        const data = await response.json();
        await fetchAssets(currentFolderId);
        return data.asset;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, fetchAssets]);

  const createFolder = useCallback(async (name: string, parentId?: string | null) => {
    try {
      const response = await fetch("/api/content/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: parentId || currentFolderId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create folder");
      const data = await response.json();
      await fetchFolders();
      return data.folder;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  }, [currentFolderId, fetchFolders]);

  const moveAsset = useCallback(async (assetId: string, folderId: string | null) => {
    try {
      const response = await fetch("/api/content/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, folderId }),
      });

      if (!response.ok) throw new Error("Failed to move asset");
      await fetchAssets(currentFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  }, [currentFolderId, fetchAssets]);

  const deleteAsset = useCallback(async (assetId: string) => {
    try {
      const response = await fetch(`/api/content/assets?id=${assetId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete asset");
      await fetchAssets(currentFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  }, [currentFolderId, fetchAssets]);

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      const response = await fetch(`/api/content/folders?id=${folderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete folder");
      }
      await fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  }, [fetchFolders]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      const response = await fetch("/api/content/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId, name: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rename folder");
      }
      await fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  }, [fetchFolders]);

  const navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    fetchAssets(folderId);
  }, [fetchAssets]);

  return {
    assets,
    folders,
    currentFolderId,
    isLoading,
    error,
    fetchAssets,
    fetchFolders,
    uploadFile,
    createFolder,
    moveAsset,
    deleteAsset,
    deleteFolder,
    renameFolder,
    navigateToFolder,
    setCurrentFolderId,
  };
}
