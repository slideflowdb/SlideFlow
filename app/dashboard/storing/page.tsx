"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  Presentation,
  Search,
  Grid,
  List,
  MoreVertical,
  Trash2,
  Edit,
  ChevronRight,
  Home,
  Plus,
  FolderOpen,
  Clock,
  Layers,
  ArrowDownAZ,
  ArrowUpAZ,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ${diffInHours % 24 > 0 ? `${diffInHours % 24}h ` : ''}ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ${diffInMonths % 12 > 0 ? `${diffInMonths % 12}mo ` : ''}ago`;
};

interface ShowFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface Show {
  id: number;
  name: string;
  folder_id: string | null;
  slides_data: any[];
  created_at: string;
  updated_at: string;
  start_time: string | null;
  finish_time: string | null;
}

export default function StoringPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [folders, setFolders] = useState<ShowFolder[]>([]);
  const [allFolders, setAllFolders] = useState<ShowFolder[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Home" }]);

  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; showId: number | null }>({ open: false, showId: null });
  const [renameFolderDialog, setRenameFolderDialog] = useState<{ open: boolean; folderId: string | null; name: string }>({ open: false, folderId: null, name: "" });
  const [error, setError] = useState<string | null>(null);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [allShows, setAllShows] = useState<Show[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("slideflow_darkmode");
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const folderParam = currentFolderId ? `folderId=${currentFolderId}` : "folderId=root";
      const [showsRes, foldersRes] = await Promise.all([
        fetch(`/api/shows?${folderParam}`),
        fetch("/api/shows/folders"),
      ]);
      const showsData = await showsRes.json();
      const foldersData = await foldersRes.json();

      setShows(showsData.shows || []);

      // Store all folders + filter to current parent
      const allFoldersList: ShowFolder[] = foldersData.folders || [];
      setAllFolders(allFoldersList);
      const childFolders = allFoldersList.filter((f) =>
        currentFolderId ? f.parent_id === currentFolderId : !f.parent_id
      );
      setFolders(childFolders);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    }
    setIsLoading(false);
  };

  const navigateToFolder = (folderId: string | null, folderName?: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setBreadcrumbPath([{ id: null, name: "Home" }]);
    } else {
      setBreadcrumbPath((prev) => [...prev, { id: folderId, name: folderName || "Folder" }]);
    }
  };

  const navigateBreadcrumb = (index: number) => {
    const newPath = breadcrumbPath.slice(0, index + 1);
    setBreadcrumbPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/shows/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      setNewFolderDialog(false);
      setNewFolderName("");
      fetchData();
    } catch (err) {
      console.error("Error creating folder:", err);
      setError("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? It must be empty.")) return;
    try {
      const res = await fetch(`/api/shows/folders?id=${folderId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete folder");
        return;
      }
      fetchData();
    } catch (err) {
      console.error("Error deleting folder:", err);
    }
  };

  const handleRenameFolder = async () => {
    if (!renameFolderDialog.folderId || !renameFolderDialog.name.trim()) return;
    try {
      const res = await fetch("/api/shows/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renameFolderDialog.folderId, name: renameFolderDialog.name.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename folder");
      setRenameFolderDialog({ open: false, folderId: null, name: "" });
      fetchData();
    } catch (err) {
      console.error("Error renaming folder:", err);
    }
  };

  const handleMoveShow = async (targetFolderId: string | null) => {
    if (moveDialog.showId === null) return;
    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: moveDialog.showId, folderId: targetFolderId }),
      });
      if (!res.ok) throw new Error("Failed to move presentation");
      setMoveDialog({ open: false, showId: null });
      fetchData();
    } catch (err) {
      console.error("Error moving presentation:", err);
    }
  };

  const handleDeleteShow = async (showId: number) => {
    if (!confirm("Are you sure you want to delete this presentation? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/shows?id=${showId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete presentation");
      fetchData();
    } catch (err) {
      console.error("Error deleting presentation:", err);
    }
  };

  const handleOpenStorePicker = async () => {
    try {
      const res = await fetch("/api/shows");
      const data = await res.json();
      setAllShows(data.shows || []);
      setStorePickerOpen(true);
    } catch (err) {
      console.error("Error fetching all shows:", err);
    }
  };

  const handleStorePresentation = async (showId: number) => {
    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showId, folderId: currentFolderId }),
      });
      if (!res.ok) throw new Error("Failed to store presentation");
      // Update the allShows list to reflect the change
      setAllShows((prev) =>
        prev.map((s) => (s.id === showId ? { ...s, folder_id: currentFolderId } : s))
      );
      fetchData();
    } catch (err) {
      console.error("Error storing presentation:", err);
    }
  };

  const filteredShows = [...shows]
    .filter((s) => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  const filteredFolders = [...folders]
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  const getSlideCount = (show: Show) => {
    return Array.isArray(show.slides_data) ? show.slides_data.length : 0;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get first slide thumbnail bg color
  const getShowPreviewBg = (show: Show) => {
    if (Array.isArray(show.slides_data) && show.slides_data.length > 0) {
      return show.slides_data[0].backgroundColor || "#f3f4f6";
    }
    return "#f3f4f6";
  };

  return (
    <div className={`space-y-6 p-6 min-h-screen ${darkMode ? 'dashboard-bg' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'dashboard-text' : ''}`}>Storing</h1>
          <p className={darkMode ? 'dashboard-text-muted' : 'text-muted-foreground'}>
            Organize your presentations into folders
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>
        {breadcrumbPath.map((item, index, array) => (
          <div key={item.id || "home"} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
            <button
              onClick={() => navigateBreadcrumb(index)}
              className={cn(
                "hover:underline cursor-pointer transition-colors",
                index === array.length - 1
                  ? (darkMode ? 'text-white font-medium' : 'text-foreground font-medium')
                  : ''
              )}
            >
              {index === 0 ? <Home className="h-4 w-4" /> : item.name}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className={`absolute left-2 top-2.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`} />
          <Input
            placeholder="Search presentations & folders..."
            className={`pl-8 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className={`gap-2 h-9 border ${darkMode ? 'border-gray-600 hover:bg-gray-800' : ''}`}
            title={sortOrder === "desc" ? "Sorted: Newest first (click for oldest first)" : "Sorted: Oldest first (click for newest first)"}
          >
            {sortOrder === "desc" ? (
              <>
                <ArrowDownAZ className="h-4 w-4" />
                <span className="hidden sm:inline">Newest First</span>
              </>
            ) : (
              <>
                <ArrowUpAZ className="h-4 w-4" />
                <span className="hidden sm:inline">Oldest First</span>
              </>
            )}
          </Button>
          {currentFolderId && (
            <Button onClick={() => handleOpenStorePicker()} className="gap-2">
              <Plus className="h-4 w-4" /> Store Presentations
            </Button>
          )}
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className={darkMode && viewMode !== "grid" ? 'border-gray-600 hover:bg-gray-800' : ''}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            className={darkMode && viewMode !== "list" ? 'border-gray-600 hover:bg-gray-800' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Folders Section */}
      <div className="space-y-2">
        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Folders</h3>
        <div className={cn(
          "grid gap-4",
          viewMode === "grid" ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" : "grid-cols-1"
        )}>
          {filteredFolders.map((folder) => (
            <Card
              key={folder.id}
              className={cn(
                "cursor-pointer transition-colors p-0 gap-0",
                darkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50' : 'hover:bg-accent',
                viewMode === "list" && "flex items-center"
              )}
              onClick={() => navigateToFolder(folder.id, folder.name)}
            >
              <CardContent className={cn(
                "flex items-center",
                viewMode === "grid" ? "p-4 flex-col text-center" : "p-3 flex-row gap-3 flex-1"
              )}>
                <Folder className={cn(
                  "text-yellow-500",
                  viewMode === "grid" ? "h-10 w-10 mb-2" : "h-6 w-6"
                )} />
                <span className={`text-sm font-medium truncate flex-1 ${darkMode ? 'text-white' : ''}`}>{folder.name}</span>
                {viewMode === "list" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={darkMode ? 'bg-gray-900 border-gray-700' : ''}>
                      <DropdownMenuItem
                        className={darkMode ? 'text-white focus:bg-gray-800' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameFolderDialog({ open: true, folderId: folder.id, name: folder.name });
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`text-red-600 ${darkMode ? 'focus:bg-gray-800' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
              {viewMode === "grid" && (
                <div className={`px-4 pb-3 flex justify-end ${darkMode ? 'border-gray-700' : ''}`}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={darkMode ? 'bg-gray-900 border-gray-700' : ''}>
                      <DropdownMenuItem
                        className={darkMode ? 'text-white focus:bg-gray-800' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameFolderDialog({ open: true, folderId: folder.id, name: folder.name });
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`text-red-600 ${darkMode ? 'focus:bg-gray-800' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </Card>
          ))}

          {/* New Folder Card */}
          <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
            <DialogTrigger asChild>
              <Card className={cn(
                "border-dashed cursor-pointer transition-colors",
                darkMode ? 'border-gray-600 hover:bg-gray-800/50' : 'hover:bg-accent'
              )}>
                <CardContent className={cn(
                  "flex items-center justify-center",
                  viewMode === "grid" ? "p-4 flex-col text-center" : "p-3 flex-row gap-3"
                )}>
                  <div className={cn(
                    "rounded-full bg-primary/10 flex items-center justify-center",
                    viewMode === "grid" ? "h-10 w-10 mb-2" : "h-6 w-6"
                  )}>
                    <Plus className="text-primary h-5 w-5" />
                  </div>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : ''}`}>New Folder</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className={darkMode ? 'bg-gray-900 border-gray-700' : ''}>
              <DialogHeader>
                <DialogTitle className={darkMode ? 'text-white' : ''}>Create New Folder</DialogTitle>
                <DialogDescription className={darkMode ? 'text-gray-400' : ''}>
                  Enter a name for your new folder
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                className={darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewFolderDialog(false)} className={darkMode ? 'border-gray-600 hover:bg-gray-800' : ''}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Presentations Section */}
      <div className="space-y-2">
        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Presentations</h3>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredShows.length === 0 ? (
          <div className="text-center py-12">
            <Presentation className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-muted-foreground'}`} />
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : ''}`}>No presentations here</h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>
              Store presentations in this folder from the picker
            </p>
            <Button onClick={() => handleOpenStorePicker()}>
              <Plus className="mr-2 h-4 w-4" />
              Store Presentations
            </Button>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {filteredShows.map((show) => (
              <Card
                key={show.id}
                className={cn(
                  "overflow-hidden transition-colors p-0 gap-0 group",
                  darkMode ? 'bg-gray-800/50 border-gray-700' : '',
                  viewMode === "list" && "flex flex-row items-center"
                )}
              >
                {viewMode === "grid" ? (
                  (() => {
                    const previewSlide = Array.isArray(show.slides_data) && show.slides_data.length > 0 ? show.slides_data[0] : null;
                    return (
                  <div className="flex flex-col">
                    <div
                      className="relative aspect-video group cursor-pointer overflow-hidden"
                      style={{
                        backgroundColor: previewSlide?.backgroundColor || (darkMode ? '#0a0a0a' : '#ffffff'),
                        backgroundImage: previewSlide?.backgroundImage ? `url(${previewSlide.backgroundImage})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      onClick={() => router.push(`/editor/${show.id}`)}
                    >
                      {previewSlide && (
                        <div className="absolute inset-0 overflow-hidden">
                          <div
                            style={{
                              width: 960,
                              height: 540,
                              transform: "scale(var(--thumb-scale))",
                              transformOrigin: "top left",
                              position: "absolute",
                              top: 0,
                              left: 0,
                            }}
                            ref={(el) => {
                              if (el) {
                                const parent = el.parentElement;
                                if (parent) {
                                  const scale = parent.offsetWidth / 960;
                                  el.style.setProperty("--thumb-scale", String(scale));
                                  el.style.transform = `scale(${scale})`;
                                }
                              }
                            }}
                          >
                            {(previewSlide.elements || []).map((element: any) => (
                              <div
                                key={element.id}
                                className="absolute"
                                style={{
                                  left: element.x,
                                  top: element.y,
                                  width: element.width,
                                  height: element.height,
                                  fontSize: element.style?.fontSize || undefined,
                                  color: element.style?.color,
                                  fontFamily: `${element.style?.fontFamily || 'Arial'}, sans-serif`,
                                  fontWeight: element.style?.fontWeight,
                                  fontStyle: element.style?.fontStyle,
                                  textAlign: element.style?.textAlign,
                                  textDecoration: element.style?.textDecoration,
                                  backgroundColor: element.type === "shape" ? element.style?.backgroundColor : undefined,
                                  borderRadius: element.style?.borderRadius,
                                  clipPath: element.style?.clipPath,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: element.style?.textAlign === "center" ? "center" : element.style?.textAlign === "right" ? "flex-end" : "flex-start",
                                  overflow: "hidden",
                                }}
                              >
                                {element.type === "text" && (
                                  <span className="w-full px-1" style={{ fontSize: "inherit", lineHeight: 1.2 }}>
                                    {element.content}
                                  </span>
                                )}
                                {element.type === "image" && element.src && (() => {
                                  const cropCSS: React.CSSProperties = {};
                                  if (element.cropShape === "circle" || element.cropShape === "oval") cropCSS.borderRadius = "50%";
                                  else if (element.cropShape === "rounded") cropCSS.borderRadius = "12%";
                                  else if (element.cropShape === "diamond") cropCSS.clipPath = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
                                  else if (element.cropShape === "star") cropCSS.clipPath = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
                                  else if (element.cropShape === "hexagon") cropCSS.clipPath = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
                                  else if (element.cropShape === "pentagon") cropCSS.clipPath = "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)";
                                  return (
                                    <div className="w-full h-full overflow-hidden" style={cropCSS}>
                                      <img src={element.src} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  );
                                })()}
                                {element.type === "video" && (
                                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <Presentation className="w-8 h-8 text-white" />
                                  </div>
                                )}
                                {element.type === "shape" && (
                                  <div className="w-full h-full" style={{ backgroundColor: element.style?.backgroundColor }} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); router.push(`/editor/${show.id}`); }}
                        >
                          <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setMoveDialog({ open: true, showId: show.id }); }}
                        >
                          <FolderOpen className="mr-1 h-3.5 w-3.5" /> Store
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handleDeleteShow(show.id); }}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {getSlideCount(show)} slides
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : ''}`}>{show.name || "Untitled"}</p>
                        <div className={`flex flex-col gap-0.5 text-[0.65rem] ${darkMode ? 'text-gray-500' : 'text-muted-foreground/80'}`}>
                          <span>Created {formatRelativeTime(show.created_at)}</span>
                          <span>Last edited/presented: {formatRelativeTime(show.updated_at || show.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                    );
                  })()
                ) : (
                  <>
                    <div
                      className="p-3 cursor-pointer"
                      onClick={() => router.push(`/editor/${show.id}`)}
                    >
                      <div
                        className="h-12 w-16 rounded flex items-center justify-center"
                        style={{ backgroundColor: getShowPreviewBg(show) }}
                      >
                        <Presentation className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-3 pr-3 cursor-pointer" onClick={() => router.push(`/editor/${show.id}`)}>
                      <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : ''}`}>{show.name || "Untitled"}</p>
                      <div className={`flex items-center gap-2 text-[0.7rem] mb-1 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>
                        <span>{getSlideCount(show)} {getSlideCount(show) === 1 ? 'slide' : 'slides'}</span>
                      </div>
                      <div className={`flex flex-col gap-0.5 text-[0.65rem] ${darkMode ? 'text-gray-500' : 'text-muted-foreground/80'}`}>
                        <span>Created {formatRelativeTime(show.created_at)}</span>
                        <span>Last edited/presented: {formatRelativeTime(show.updated_at || show.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/editor/${show.id}`)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setMoveDialog({ open: true, showId: show.id })} title="Store">
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteShow(show.id)} title="Delete" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Store in Folder Dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(open) => { setMoveDialog({ open, showId: null }); setFolderSearch(""); }}>
        <DialogContent className={darkMode ? 'bg-gray-900 border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={darkMode ? 'text-white' : ''}>Store in Folder</DialogTitle>
            <DialogDescription className={darkMode ? 'text-gray-400' : ''}>
              Select a folder to store this presentation in
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className={`absolute left-2 top-2.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <Input
              placeholder="Search folders..."
              className={`pl-8 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {(!folderSearch || "root (no folder)".includes(folderSearch.toLowerCase())) && (
              <Button
                variant="outline"
                className={`w-full justify-start ${darkMode ? 'border-gray-600 hover:bg-gray-800 text-white' : ''}`}
                onClick={() => handleMoveShow(null)}
              >
                <Home className="mr-2 h-4 w-4" />
                Root (No folder)
              </Button>
            )}
            {allFolders
              .filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
              .map((folder) => (
              <Button
                key={folder.id}
                variant="outline"
                className={`w-full justify-start ${darkMode ? 'border-gray-600 hover:bg-gray-800 text-white' : ''}`}
                onClick={() => handleMoveShow(folder.id)}
              >
                <Folder className="mr-2 h-4 w-4 text-yellow-500" />
                {folder.name}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveDialog({ open: false, showId: null }); setFolderSearch(""); }} className={darkMode ? 'border-gray-600 hover:bg-gray-800' : ''}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Presentations Picker Dialog */}
      <Dialog open={storePickerOpen} onOpenChange={(open) => { setStorePickerOpen(open); setPickerSearch(""); }}>
        <DialogContent className={`max-w-2xl ${darkMode ? 'bg-gray-900 border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={darkMode ? 'text-white' : ''}>Store Presentations</DialogTitle>
            <DialogDescription className={darkMode ? 'text-gray-400' : ''}>
              Select presentations to store in the current folder
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className={`absolute left-2 top-2.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <Input
              placeholder="Search presentations..."
              className={`pl-8 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {allShows
              .filter((s) => (s.name || "").toLowerCase().includes(pickerSearch.toLowerCase()))
              .map((show) => (
              <div
                key={show.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-accent',
                  show.folder_id === currentFolderId && (darkMode ? 'bg-gray-800/50 opacity-50' : 'bg-accent/50 opacity-50')
                )}
                onClick={() => {
                  if (show.folder_id === currentFolderId) return;
                  handleStorePresentation(show.id);
                }}
              >
                <div
                  className="h-12 w-20 rounded flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: getShowPreviewBg(show) }}
                >
                  <Presentation className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : ''}`}>{show.name || "Untitled"}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>
                    {getSlideCount(show)} slides · {formatDate(show.updated_at || show.created_at)}
                    {show.folder_id === currentFolderId && " · Already here"}
                  </p>
                </div>
                {show.folder_id !== currentFolderId && (
                  <Button size="sm" variant="outline" className={darkMode ? 'border-gray-600 text-white' : ''}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Store
                  </Button>
                )}
              </div>
            ))}
            {allShows.filter((s) => (s.name || "").toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 && (
              <div className="text-center py-8">
                <p className={darkMode ? 'text-gray-400' : 'text-muted-foreground'}>No presentations found</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStorePickerOpen(false); setPickerSearch(""); }} className={darkMode ? 'border-gray-600 hover:bg-gray-800' : ''}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderDialog.open} onOpenChange={(open) => setRenameFolderDialog({ open, folderId: null, name: "" })}>
        <DialogContent className={darkMode ? 'bg-gray-900 border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={darkMode ? 'text-white' : ''}>Rename Folder</DialogTitle>
            <DialogDescription className={darkMode ? 'text-gray-400' : ''}>
              Enter a new name for this folder
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={renameFolderDialog.name}
            onChange={(e) => setRenameFolderDialog((prev) => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
            className={darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderDialog({ open: false, folderId: null, name: "" })} className={darkMode ? 'border-gray-600 hover:bg-gray-800' : ''}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder} disabled={!renameFolderDialog.name.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button onClick={() => setError(null)} className="absolute top-1 right-2 text-red-700">×</button>
        </div>
      )}
    </div>
  );
}
