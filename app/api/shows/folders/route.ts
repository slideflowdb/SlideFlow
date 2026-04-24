import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("show_folders")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching show folders:", error);
      return NextResponse.json(
        { error: "Failed to fetch folders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ folders: data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, parentId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name in both tables
    const { count: countShow } = await supabase.from("show_folders").select("*", { count: "exact", head: true }).eq("name", name);
    const { count: countContent } = await supabase.from("folders").select("*", { count: "exact", head: true }).eq("name", name);
    if ((countShow && countShow > 0) || (countContent && countContent > 0)) {
      return NextResponse.json({ error: "A folder with this name already exists in Storing or Content navigation." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("show_folders")
      .insert({
        name,
        parent_id: parentId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating show folder:", error);
      return NextResponse.json(
        { error: "Failed to create folder" },
        { status: 500 }
      );
    }

    return NextResponse.json({ folder: data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Id and name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate name in both tables
    const { count: countShow } = await supabase.from("show_folders").select("*", { count: "exact", head: true }).eq("name", name).neq("id", id);
    const { count: countContent } = await supabase.from("folders").select("*", { count: "exact", head: true }).eq("name", name);
    if ((countShow && countShow > 0) || (countContent && countContent > 0)) {
      return NextResponse.json({ error: "A folder with this name already exists in Storing or Content navigation." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("show_folders")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating show folder:", error);
      return NextResponse.json(
        { error: "Failed to update folder" },
        { status: 500 }
      );
    }

    return NextResponse.json({ folder: data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Folder id is required" },
        { status: 400 }
      );
    }

    // Check if folder has presentations
    const { count, error: countError } = await supabase
      .from("show")
      .select("*", { count: "exact", head: true })
      .eq("folder_id", id);

    if (countError) {
      console.error("Error checking folder contents:", countError);
      return NextResponse.json(
        { error: "Failed to check folder contents" },
        { status: 500 }
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Cannot delete folder with presentations. Please move or delete presentations first." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("show_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting show folder:", error);
      return NextResponse.json(
        { error: "Failed to delete folder" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
