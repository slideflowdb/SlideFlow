"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, LayoutTemplate, Plus, ChevronLeft, ChevronRight, Edit2, ExternalLink, MoreVertical, Pen, Trash2 } from "lucide-react";
import { SLIDE_TEMPLATES, TEMPLATE_GENRES, SlideTemplate } from "@/lib/template-data";

function SlidePreview({ template, size = "small" }: { template: any; size?: "small" | "large" }) {
    const slide = template.slides?.[0] || template.slides_data?.[0];
    if (!slide) return null;
    const scale = size === "small" ? 0.28 : 0.55;
    const width = 960 * scale;
    const height = 540 * scale;

    return (
        <div
            style={{
                width,
                height,
                backgroundColor: slide.backgroundColor,
                backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "relative",
                overflow: "hidden",
                borderRadius: size === "small" ? 6 : 10,
            }}
        >
            {slide.elements.map((el) => (
                <div
                    key={el.id}
                    style={{
                        position: "absolute",
                        left: el.x * scale,
                        top: el.y * scale,
                        width: el.width * scale,
                        height: el.height * scale,
                        backgroundColor: el.style.backgroundColor || "transparent",
                        borderRadius: el.style.borderRadius
                            ? `calc(${el.style.borderRadius} * ${scale})`
                            : undefined,
                        clipPath: el.style.clipPath,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent:
                            el.style.textAlign === "center"
                                ? "center"
                                : el.style.textAlign === "right"
                                    ? "flex-end"
                                    : "flex-start",
                    }}
                >
                    {el.type === "text" && (
                        <span
                            style={{
                                fontSize: (el.style.fontSize || 16) * scale,
                                color: el.style.color || "#000",
                                fontFamily: `${el.style.fontFamily || "Arial"}, var(--font-emoji), sans-serif`,
                                fontWeight: el.style.fontWeight || "normal",
                                fontStyle: el.style.fontStyle || "normal",
                                textAlign: (el.style.textAlign as any) || "left",
                                textDecoration: el.style.textDecoration || "none",
                                width: "100%",
                                lineHeight: 1.3,
                                whiteSpace: "pre-wrap",
                                overflow: "hidden",
                            }}
                        >
                            {el.content}
                        </span>
                    )}
                    {el.type === "image" && el.src && (
                        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                            <img src={el.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                    )}
                    {el.type === "video" && (
                        <div style={{ width: "100%", height: "100%", backgroundColor: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: Math.max(12, 24 * scale), height: Math.max(12, 24 * scale), backgroundColor: "#fff", clipPath: "polygon(0 0, 0 100%, 100% 50%)" }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const genreColors: Record<string, string> = {
    Announcements: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    Corporate: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    Safety: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    Education: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    Events: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    "Social Media": "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30",
};

export default function TemplatesPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("All");
    const [previewTemplate, setPreviewTemplate] = useState<SlideTemplate | null>(null);
    const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [myTemplates, setMyTemplates] = useState<any[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateDescription, setNewTemplateDescription] = useState("");
    const [newTemplateGenre, setNewTemplateGenre] = useState("Corporate");
    const [templateToRename, setTemplateToRename] = useState<any>(null);
    const [nameError, setNameError] = useState("");
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [presentations, setPresentations] = useState<any[]>([]);
    const [importSearchQuery, setImportSearchQuery] = useState("");
    const [templateToImport, setTemplateToImport] = useState<any>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await fetch("/api/shows?isTemplate=true");
                if (res.ok) {
                    const data = await res.json();
                    setMyTemplates(data.shows || []);
                }
            } catch (error) {
                console.error("Failed to fetch custom templates", error);
            } finally {
                setIsLoadingTemplates(false);
            }
        };
        fetchTemplates();
    }, []);

    const validateName = (name: string, ignoreId?: string) => {
        if (!name.trim()) return "Name cannot be empty";
        if (myTemplates.some(t => t.name.toLowerCase() === name.trim().toLowerCase() && t.id !== ignoreId)) {
            return "A template with this name already exists";
        }
        return "";
    };

    const openCreateDialog = () => {
        setNewTemplateName("New Template");
        setNewTemplateDescription("");
        setNewTemplateGenre("Corporate");
        setNameError("");
        setIsCreateDialogOpen(true);
    };

    const openRenameDialog = (template: any) => {
        setTemplateToRename(template);
        setNewTemplateName(template.name);
        setNewTemplateDescription(template.description || "");
        setNewTemplateGenre(template.genre || "Corporate");
        setNameError("");
        setIsRenameDialogOpen(true);
    };

    const handleCreateTemplate = async () => {
        const error = validateName(newTemplateName);
        if (error) {
            setNameError(error);
            return;
        }

        try {
            const response = await fetch("/api/shows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newTemplateName.trim(),
                    description: newTemplateDescription.trim(),
                    genre: newTemplateGenre,
                    isTemplate: true,
                    slidesData: [{
                        id: Math.random().toString(36).substr(2, 9),
                        name: "Slide 1",
                        backgroundColor: "#ffffff",
                        duration: 10,
                        elements: []
                    }]
                }),
            });

            if (!response.ok) throw new Error("Failed to create template");
            const data = await response.json();
            if (data.show?.id) {
                router.push(`/editor/${data.show.id}`);
            }
        } catch (error) {
            console.error("Error creating template:", error);
            setNameError("Failed to create template");
        }
    };

    const handleRenameTemplate = async () => {
        if (!templateToRename) return;
        const error = validateName(newTemplateName, templateToRename.id);
        if (error) {
            setNameError(error);
            return;
        }

        try {
            const response = await fetch("/api/shows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: templateToRename.id,
                    name: newTemplateName.trim(),
                    description: newTemplateDescription.trim(),
                    genre: newTemplateGenre,
                }),
            });

            if (!response.ok) throw new Error("Failed to rename template");
            setMyTemplates(prev => prev.map(t => t.id === templateToRename.id ? { ...t, name: newTemplateName.trim(), description: newTemplateDescription.trim(), genre: newTemplateGenre } : t));
            setIsRenameDialogOpen(false);
            setTemplateToRename(null);
        } catch (error) {
            console.error("Error renaming template:", error);
            setNameError("Failed to rename template");
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        
        try {
            const response = await fetch(`/api/shows?id=${templateId}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to delete template");
            setMyTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch (error) {
            console.error("Error deleting template:", error);
            alert("Failed to delete template");
        }
    };

    const handleImportCustomTemplate = async (template: any) => {
        setTemplateToImport(template);
        setImportSearchQuery("");
        setIsImportModalOpen(true);
        try {
            const res = await fetch("/api/shows");
            if (res.ok) {
                const data = await res.json();
                setPresentations(data.shows || []);
            }
        } catch (error) {
            console.error("Failed to fetch presentations", error);
        }
    };

    const executeImportTemplate = async (targetPresentationId: string) => {
        if (!templateToImport) return;
        setIsImporting(true);
        try {
            const targetPresentation = presentations.find(p => p.id === targetPresentationId);
            if (!targetPresentation) throw new Error("Target presentation not found");

            const clonedSlides = JSON.parse(JSON.stringify(templateToImport.slides_data || [])).map((slide: any, i: number) => ({
                ...slide,
                id: Math.random().toString(36).substr(2, 9),
                duration: slide.duration || 10,
                elements: slide.elements?.map((el: any) => ({
                    ...el,
                    id: Math.random().toString(36).substr(2, 9),
                })) || [],
            }));

            const mergedSlides = [...(targetPresentation.slides_data || []), ...clonedSlides];

            const response = await fetch("/api/shows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: targetPresentationId,
                    slidesData: mergedSlides,
                }),
            });

            if (!response.ok) throw new Error("Failed to append template to presentation");
            router.push(`/editor/${targetPresentationId}`);
        } catch (error) {
            console.error("Error importing template:", error);
            setIsImporting(false);
            alert("Failed to import template into the selected presentation.");
        }
    };

    const filteredMyTemplates = useMemo(() => {
        return myTemplates.filter((t) => {
            if (selectedGenre !== "All" && t.genre !== selectedGenre) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                t.name?.toLowerCase().includes(q) ||
                t.description?.toLowerCase().includes(q) ||
                t.genre?.toLowerCase().includes(q)
            );
        }).reverse();
    }, [myTemplates, searchQuery, selectedGenre]);

    const filteredTemplates = useMemo(() => {
        return SLIDE_TEMPLATES.filter((t) => {
            const matchesGenre = selectedGenre === "All" || t.genre === selectedGenre;
            if (!matchesGenre) return false;

            if (!searchQuery.trim()) return true;

            const q = searchQuery.toLowerCase();
            return (
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.tags.some((tag) => tag.toLowerCase().includes(q))
            );
        }).reverse();
    }, [searchQuery, selectedGenre]);

    const handleUseTemplate = async (template: SlideTemplate) => {
        setIsImporting(true);
        try {
            const clonedSlides = JSON.parse(JSON.stringify(template.slides)).map((slide: any, i: number) => ({
                ...slide,
                id: Math.random().toString(36).substr(2, 9),
                name: `Slide ${i + 1}`,
                elements: slide.elements.map((el: any) => ({
                    ...el,
                    id: Math.random().toString(36).substr(2, 9),
                })),
            }));

            const response = await fetch("/api/shows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: template.name,
                    slidesData: clonedSlides,
                }),
            });

            if (!response.ok) throw new Error("Failed to create show");

            const data = await response.json();
            if (data.show?.id) {
                router.push(`/editor/${data.show.id}`);
            }
        } catch (error) {
            console.error("Error importing template:", error);
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <LayoutTemplate className="h-8 w-8" />
                        Templates
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Choose a template to get started quickly. Click any template to preview and import it into the editor.
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2 shrink-0">
                    <Plus className="h-4 w-4" />
                    Create Template
                </Button>
            </div>

            
            <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    id="template-search"
                    placeholder="Search templates (e.g. warning, menu, school...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            
            <div className="flex flex-wrap gap-2">
                {TEMPLATE_GENRES.map((genre) => (
                    <Button
                        key={genre}
                        id={`genre-filter-${genre.toLowerCase().replace(/\s+/g, "-")}`}
                        variant={selectedGenre === genre ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGenre(genre)}
                        className="rounded-full"
                    >
                        {genre}
                    </Button>
                ))}
            </div>

            {(!isLoadingTemplates && filteredMyTemplates.length > 0) && (
                <div className="pt-4 pb-2 space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight text-primary">My Templates</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredMyTemplates.map((template) => (
                            <Card
                                key={template.id}
                                className="group relative cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 overflow-hidden"
                            >
                                <CardContent className="p-3 relative">
                                    <div className="absolute top-4 right-4 z-20">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/50 backdrop-blur-sm hover:bg-background/80">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameDialog(template); }}>
                                                    <Pen className="h-4 w-4 mr-2" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}>
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="flex justify-center mb-3 bg-muted/30 rounded-lg p-2 h-[140px] items-center text-muted-foreground overflow-hidden">
                                        {template.slides_data?.[0] ? (
                                            <SlidePreview template={template} size="small" />
                                        ) : (
                                            <LayoutTemplate className="h-10 w-10 opacity-50" />
                                        )}
                                    </div>
                                    <div className="space-y-1.5 flex flex-col items-start">
                                        <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                                            {template.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                                            {template.description || "No description."}
                                        </p>
                                        <Badge variant="outline" className={`text-[10px] ${genreColors[template.genre || "Corporate"] || ""}`}>
                                            {template.genre || "Corporate"}
                                        </Badge>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {template.slides_data?.length || 0} slide{(template.slides_data?.length || 0) !== 1 ? "s" : ""} · {new Date(template.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </CardContent>
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3">
                                    <Button size="sm" onClick={() => router.push(`/editor/${template.id}`)} className="w-24">
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleImportCustomTemplate(template)} className="w-24 bg-background">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Import
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="pt-4">
                <h2 className="text-xl font-semibold tracking-tight mb-4">Premade Templates</h2>
            </div>
            
            <p className="text-sm text-muted-foreground">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} found
                {selectedGenre !== "All" && ` in ${selectedGenre}`}
                {searchQuery && ` matching "${searchQuery}"`}
            </p>

            
            {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <LayoutTemplate className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">No templates found</p>
                    <p className="text-muted-foreground text-sm">Try adjusting your search or genre filter</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTemplates.map((template) => (
                        <Card
                            key={template.id}
                            id={`template-card-${template.id}`}
                            className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 overflow-hidden"
                            onClick={() => {
                                setPreviewTemplate(template);
                                setPreviewSlideIndex(0);
                            }}
                        >
                            <CardContent className="p-3">
                                
                                <div className="flex justify-center mb-3 bg-muted/30 rounded-lg p-2">
                                    <SlidePreview template={template} size="small" />
                                </div>

                                
                                <div className="space-y-1.5">
                                    <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                                        {template.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {template.description}
                                    </p>
                                    <Badge variant="outline" className={`text-[10px] ${genreColors[template.genre] || ""}`}>
                                        {template.genre}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            
            <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            {previewTemplate?.name}
                            {previewTemplate && (
                                <Badge variant="outline" className={genreColors[previewTemplate.genre] || ""}>
                                    {previewTemplate.genre}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {previewTemplate?.description}
                        </DialogDescription>
                    </DialogHeader>

                    {previewTemplate && (
                        <div className="space-y-4">
                            
                            <div className="flex justify-center bg-muted/30 rounded-lg p-4">
                                <SlidePreview template={{
                                    ...previewTemplate,
                                    slides: [previewTemplate.slides[previewSlideIndex]],
                                }} size="large" />
                            </div>

                            
                            {previewTemplate.slides.length > 1 && (
                                <div className="flex items-center justify-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={previewSlideIndex === 0}
                                        onClick={() => setPreviewSlideIndex((i) => Math.max(0, i - 1))}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Slide {previewSlideIndex + 1} of {previewTemplate.slides.length}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={previewSlideIndex === previewTemplate.slides.length - 1}
                                        onClick={() => setPreviewSlideIndex((i) => Math.min(previewTemplate.slides.length - 1, i + 1))}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            
                            <div className="text-sm text-muted-foreground">
                                <span>{previewTemplate.slides.length} slide{previewTemplate.slides.length !== 1 ? "s" : ""}</span>
                                <span className="mx-2">·</span>
                                <span>{previewTemplate.slides[0].elements.length} elements</span>
                                <span className="mx-2">·</span>
                                <span>Tags: {previewTemplate.tags.slice(0, 5).join(", ")}</span>
                            </div>

                            
                            <div className="flex gap-3 pt-2">
                                <Button
                                    id="use-template-btn"
                                    className="flex-1"
                                    onClick={() => handleUseTemplate(previewTemplate)}
                                    disabled={isImporting}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {isImporting ? "Creating..." : "Use Template"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPreviewTemplate(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Template</DialogTitle>
                        <DialogDescription>
                            Configure details for your custom template.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="Template name"
                                className={nameError ? "border-red-500" : ""}
                            />
                            {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={newTemplateDescription}
                                onChange={(e) => setNewTemplateDescription(e.target.value)}
                                placeholder="A brief description of this template"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Genre</label>
                            <Select value={newTemplateGenre} onValueChange={setNewTemplateGenre}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select genre" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPLATE_GENRES.filter(g => g !== "All").map(g => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTemplate}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Template Details</DialogTitle>
                        <DialogDescription>
                            Update the name, description, and genre.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="Template name"
                                className={nameError ? "border-red-500" : ""}
                            />
                            {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={newTemplateDescription}
                                onChange={(e) => setNewTemplateDescription(e.target.value)}
                                placeholder="A brief description of this template"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Genre</label>
                            <Select value={newTemplateGenre} onValueChange={setNewTemplateGenre}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select genre" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPLATE_GENRES.filter(g => g !== "All").map(g => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRenameTemplate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Presentation</DialogTitle>
                        <DialogDescription>
                            Choose an existing presentation to append this template into.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search presentations..."
                                value={importSearchQuery}
                                onChange={(e) => setImportSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <ScrollArea className="h-[250px]">
                            {presentations.filter(p => !p.is_template && (p.name || "Untitled").toLowerCase().includes(importSearchQuery.toLowerCase())).length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-10">No presentations found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {presentations
                                        .filter(p => !p.is_template && (p.name || "Untitled").toLowerCase().includes(importSearchQuery.toLowerCase()))
                                        .map(presentation => (
                                            <div
                                                key={presentation.id}
                                                className="flex items-center justify-between p-3 rounded-md border hover:bg-muted cursor-pointer transition-colors"
                                                onClick={() => executeImportTemplate(presentation.id)}
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{presentation.name || "Untitled"}</p>
                                                    <p className="text-xs text-muted-foreground">Updated {new Date(presentation.updated_at).toLocaleDateString()}</p>
                                                </div>
                                                <Button size="sm" variant="secondary" disabled={isImporting}>
                                                    {isImporting ? "Importing..." : "Import Here"}
                                                </Button>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
