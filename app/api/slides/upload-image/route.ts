import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "File is required" },
                { status: 400 }
            );
        }

        const mimeType = file.type || "image/png";
        const ext = mimeType.split("/")[1] || "png";
        const name = `slide-img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`;
        const filePath = `slide-images/${name}`;

        const fileBuffer = await file.arrayBuffer();

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("content")
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (uploadError) {
            console.error("Slide image upload error:", uploadError);
            return NextResponse.json(
                { error: "Failed to upload image: " + uploadError.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from("content")
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl,
        });
    } catch (error) {
        console.error("Slide image upload error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
