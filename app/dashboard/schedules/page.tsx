"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Clock,
  Trash2,
  Edit,
  Image,
  Video,
  FileText,
  CalendarClock,
  X,
  AlertCircle,
  Search,
  ChevronDown,
} from "lucide-react";

interface Show {
  id: number;
  content_id: number | null;
  name: string;
  slides_data: any[];
  start_time: string | null;
  finish_time: string | null;
  created_at: string;
  updated_at: string;
  content?: {
    id: number;
    name: string;
    type: string;
    file_url: string;
  } | null;
}

interface ContentItem {
  id: number;
  name: string;
  type: string;
  file_url: string;
}

function getStatusBadge(show: Show) {
  if (!show.start_time || !show.finish_time) return null;
  const now = new Date();
  const start = new Date(show.start_time);
  const finish = new Date(show.finish_time);

  if (now < start) return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Upcoming</Badge>;
  if (now >= start && now <= finish) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">Ended</Badge>;
}

function getContentIcon(type?: string) {
  switch (type) {
    case "image": return <Image className="h-4 w-4" />;
    case "video": return <Video className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SchedulesPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [allShows, setAllShows] = useState<Show[]>([]);
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShowId, setEditingShowId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formContentId, setFormContentId] = useState("");
  const [formExistingShowId, setFormExistingShowId] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formFinish, setFormFinish] = useState("");
  const [formError, setFormError] = useState("");
  const [showPickerOpen, setShowPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  
  const [conflictWarning, setConflictWarning] = useState<{
    showName: string;
    conflictingId: number | "manual";
    actionToTake: "delete_schedule" | "stop_manual";
  } | null>(null);

  const fetchShows = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shows?scheduled=true");
      const data = await res.json();
      setShows(data.shows || []);
    } catch (err) {
      console.error("Failed to fetch shows:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async () => {
    try {
      const [contentRes, showsRes] = await Promise.all([
        fetch("/api/content/assets?"),
        fetch("/api/shows"),
      ]);
      const contentData = await contentRes.json();
      const showsData = await showsRes.json();
      setAllContent(contentData.assets || []);
      setAllShows(showsData.shows || []);
    } catch (err) {
      console.error("Failed to fetch content:", err);
    }
  };

  useEffect(() => {
    fetchShows();
    fetchContent();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormContentId("");
    setFormExistingShowId("");
    setFormStart("");
    setFormFinish("");
    setFormError("");
    setEditingShowId(null);
    setShowPickerOpen(false);
    setPickerSearch("");
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const toLocalDatetimeString = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toISOFromLocal = (localStr: string) => {
    return new Date(localStr).toISOString();
  };

  const openEdit = (show: Show) => {
    setFormName(show.name);
    setFormContentId(show.content_id?.toString() || "");
    setFormStart(show.start_time ? toLocalDatetimeString(show.start_time) : "");
    setFormFinish(show.finish_time ? toLocalDatetimeString(show.finish_time) : "");
    setEditingShowId(show.id);
    setIsCreateOpen(true);
  };

  const handleSave = async () => {
    setFormError("");

    // No longer requiring content selection

    // Validate: start and finish times are required
    if (!formStart || !formFinish) {
      setFormError("Please set both a start time and finish time.");
      return;
    }

    const isoStart = toISOFromLocal(formStart);
    const isoFinish = toISOFromLocal(formFinish);
    const startDate = new Date(isoStart);
    const finishDate = new Date(isoFinish);

    // Validate: finish must be after start
    if (finishDate <= startDate) {
      setFormError("Finish time must be after the start time.");
      return;
    }

    let manualPresent = null;
    try {
      const activeRes = await fetch("/api/shows/active");
      const activeData = await activeRes.json();
      manualPresent = activeData.manualPresent;
    } catch (e) {
      console.error(e);
    }

    const now = new Date();
    if (manualPresent && startDate <= now) {
      setConflictWarning({
         showName: manualPresent.show_name || "Manual Present",
         conflictingId: "manual",
         actionToTake: "stop_manual"
      });
      return;
    }

    // Validate: no overlapping schedules with existing shows
    const overlapping = shows.find((s) => {
      // Skip the show we're currently editing
      if (editingShowId && s.id === editingShowId) return false;
      if (formExistingShowId && s.id === parseInt(formExistingShowId, 10)) return false;
      if (!s.start_time || !s.finish_time) return false;

      const existingStart = new Date(s.start_time);
      const existingFinish = new Date(s.finish_time);

      // Two time ranges overlap if one starts before the other ends, and vice versa
      return startDate < existingFinish && finishDate > existingStart;
    });

    if (overlapping) {
      setConflictWarning({
         showName: overlapping.name,
         conflictingId: overlapping.id,
         actionToTake: "delete_schedule"
      });
      return;
    }

    await finalizeSave(isoStart, isoFinish);
  };

  const finalizeSave = async (isoStart: string, isoFinish: string) => {

    if (formExistingShowId) {
      try {
        const res = await fetch("/api/shows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: parseInt(formExistingShowId, 10),
            name: formName || undefined,
            startTime: isoStart,
            finishTime: isoFinish,
          }),
        });
        if (res.ok) {
          setIsCreateOpen(false);
          resetForm();
          fetchShows();
          fetchContent();
        }
      } catch (err) {
        console.error("Failed to schedule show:", err);
      }
      return;
    }

    const body: any = {
      name: formName || "Untitled Schedule",
      startTime: isoStart,
      finishTime: isoFinish,
    };

    if (editingShowId) body.id = editingShowId;
    if (formContentId) body.contentId = formContentId;

    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        resetForm();
        fetchShows();
        fetchContent();
      }
    } catch (err) {
      console.error("Failed to save show:", err);
    }
  };

  const handleResolveConflict = async () => {
    if (!conflictWarning) return;
    
    if (conflictWarning.actionToTake === "stop_manual") {
      await fetch("/api/shows/present", { method: "DELETE" });
    } else if (conflictWarning.actionToTake === "delete_schedule" && typeof conflictWarning.conflictingId === "number") {
      await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conflictWarning.conflictingId, startTime: null, finishTime: null }),
      });
    }
    
    setConflictWarning(null);
    const isoStart = toISOFromLocal(formStart);
    const isoFinish = toISOFromLocal(formFinish);
    await finalizeSave(isoStart, isoFinish);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this project from the schedule?")) return;
    try {
      await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, startTime: null, finishTime: null }),
      });
      fetchShows();
    } catch (err) {
      console.error("Failed to remove schedule:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <p className="text-muted-foreground">
            Schedule when content plays on your screens
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      </div>


      {isCreateOpen && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {editingShowId ? "Edit Schedule" : "Create New Schedule"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Schedule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Business Hours Display"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Select Existing Presentation */}
              {!editingShowId && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Select Existing Presentation
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPickerOpen(!showPickerOpen)}
                      className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                    >
                      <span className={formExistingShowId ? "text-foreground" : "text-muted-foreground"}>
                        {formExistingShowId
                          ? allShows.find((s) => s.id === parseInt(formExistingShowId, 10))?.name || "Selected"
                          : "Choose a presentation..."}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showPickerOpen ? "rotate-180" : ""}`} />
                    </button>

                    {showPickerOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              value={pickerSearch}
                              onChange={(e) => setPickerSearch(e.target.value)}
                              placeholder="Search presentations..."
                              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {allShows
                            .filter((s) =>
                              s.name.toLowerCase().includes(pickerSearch.toLowerCase())
                            )
                            .map((show) => (
                              <button
                                key={show.id}
                                type="button"
                                onClick={() => {
                                  setFormExistingShowId(show.id.toString());
                                  if (!formName) setFormName(show.name);
                                  setShowPickerOpen(false);
                                  setPickerSearch("");
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                                  formExistingShowId === show.id.toString() ? "bg-accent/50 font-medium" : ""
                                }`}
                              >
                                <span className="truncate">{show.name}</span>
                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                  {Array.isArray(show.slides_data) ? show.slides_data.length : 0} slides
                                </span>
                              </button>
                            ))}
                          {allShows.filter((s) =>
                            s.name.toLowerCase().includes(pickerSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                              No presentations found
                            </div>
                          )}
                        </div>
                        {formExistingShowId && (
                          <div className="border-t p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFormExistingShowId("");
                                setShowPickerOpen(false);
                                setPickerSearch("");
                              }}
                              className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
                            >
                              Clear selection
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optionally select an existing presentation to schedule
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Finish Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formFinish}
                  onChange={(e) => setFormFinish(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              {formError && (
                <div className="sm:col-span-2 flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingShowId ? "Update Schedule" : "Create Schedule"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
      }


      {
        loading && (
          <div className="text-center py-12 text-muted-foreground">Loading schedules...</div>
        )
      }


      {
        !loading && shows.length > 0 && (
          <div className="grid gap-4">
            {shows.map((show) => (
              <Card key={show.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CalendarClock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{show.name}</CardTitle>
                        {show.content && (
                          <CardDescription className="flex items-center gap-1 mt-0.5">
                            {getContentIcon(show.content.type)}
                            {show.content.name}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(show)}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(show)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(show.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Start</span>
                        <span className="text-sm font-medium">
                          {show.start_time ? formatDateTime(show.start_time) : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Finish</span>
                        <span className="text-sm font-medium">
                          {show.finish_time ? formatDateTime(show.finish_time) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }


      {
        !loading && shows.length === 0 && !isCreateOpen && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Schedules Yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                Create a schedule from here or use the Schedule button in the editor to set times for your content.
              </p>
              <Button onClick={openCreate}>Create Schedule</Button>
            </CardContent>
          </Card>
        )
      }

      <Dialog open={!!conflictWarning} onOpenChange={(open) => { if (!open) setConflictWarning(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Conflict Detected</DialogTitle>
            <DialogDescription>
              There is an active or scheduled show during this time: <strong className="text-foreground">{conflictWarning?.showName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Would you like to stop this conflicting show so your new schedule can play, or do you want to change your scheduled dates?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:space-x-2">
            <Button variant="outline" onClick={() => setConflictWarning(null)}>
              Change Date
            </Button>
            <Button variant="secondary" onClick={() => setConflictWarning(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResolveConflict}>
              Stop Show & Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
