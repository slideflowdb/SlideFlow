import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Allow longer processing time for large file uploads
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const fileName = file.name;
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";

    let type: string;
    if (mimeType.startsWith("image/")) {
      type = "image";
    } else if (mimeType.startsWith("video/")) {
      type = "video";
    } else if (mimeType === "application/pdf" ||
      fileExtension === "pdf" ||
      fileExtension === "ppt" ||
      fileExtension === "pptx" ||
      fileExtension === "doc" ||
      fileExtension === "docx") {
      type = "document";
    } else {
      type = "other";
    }

    const filePath = `uploads/${Date.now()}-${fileName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Upload] File: ${fileName}, Size: ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // Upload via server-side supabase client (proven to work up to 50MB server-side)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("content")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("content")
      .getPublicUrl(filePath);

    let thumbnailUrl: string | null = null;
    if (type === "image") {
      thumbnailUrl = publicUrlData.publicUrl;
    }

    const { data: contentData, error: dbError } = await supabase
      .from("content")
      .insert({
        folder_id: folderId || null,
        name: fileName,
        type: type,
        mime_type: mimeType,
        file_size: file.size,
        file_url: publicUrlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        status: "active",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      await supabase.storage.from("content").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to save content metadata" },
        { status: 500 }
      );
    }

    const categoryMap: Record<string, number> = {
      image: 1,
      video: 2,
      audio: 3,
      document: 4,
      other: 5,
    };
    const catId = categoryMap[type] || 5;

    let resolvedCatId = catId;
    if (mimeType.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac"].includes(fileExtension)) {
      resolvedCatId = 3;
    }

    const { error: catError } = await supabase
      .from("content_cat")
      .insert({ content_id: contentData.id, cat_id: resolvedCatId });

    if (catError) {
      console.error("Category link error:", catError);
    }

    return NextResponse.json({
      success: true,
      asset: contentData,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
