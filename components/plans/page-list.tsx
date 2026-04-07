"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  Search,
  GripVertical,
  FolderPlus,
  FolderOpen,
  FolderClosed,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const FOLDER_ID_PREFIX = "folder:";

interface Plan {
  id: string;
  title: string;
  updatedAt: number;
  folderId?: string | null;
}

export interface PlanFolder {
  id: string;
  name: string;
  sortOrder: number;
}

interface PageListProps {
  plans: Plan[];
  folders: PlanFolder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (folderId?: string | null) => void;
  onReorder: (ids: string[]) => void;
  onMovePlan: (planId: string, folderId: string | null) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onReorderFolders: (ids: string[]) => void;
}

function relativeTime(
  timestamp: number,
  t: (key: TranslationKey) => string
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("plans.justNow");
  if (minutes < 60) return `${minutes}${t("plans.mAgo")}`;
  if (hours < 24) return `${hours}${t("plans.hAgo")}`;
  if (days < 7) return `${days}${t("plans.dAgo")}`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SortablePlanItem({
  plan,
  isActive,
  onSelect,
  onDelete,
  t,
  isDragDisabled,
}: {
  plan: Plan;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: TranslationKey) => string;
  isDragDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(plan.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(plan.id);
          }
        }}
        className={`group w-full flex items-center gap-1.5 rounded-lg px-1.5 py-2 text-left text-sm transition-all cursor-pointer ${
          isActive
            ? "bg-accent text-accent-foreground shadow-sm"
            : "hover:bg-muted/80"
        }`}
      >
        {!isDragDisabled && (
          <button
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-[13px]">{plan.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {relativeTime(plan.updatedAt, t)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(plan.id);
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function FolderSection({
  folder,
  plans,
  activeId,
  onSelect,
  onDelete,
  onCreate,
  onRename,
  onDeleteFolder,
  onMovePlan,
  t,
  isSearching,
  isDragOverThis,
}: {
  folder: PlanFolder;
  plans: Plan[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (folderId: string) => void;
  onRename: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMovePlan: (planId: string, folderId: string | null) => void;
  t: (key: TranslationKey) => string;
  isSearching: boolean;
  isDragOverThis: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: `${FOLDER_ID_PREFIX}${folder.id}`, disabled: isSearching });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const folderPlans = plans.filter((p) => p.folderId === folder.id);
  const highlighted = isOver || isDragOverThis;

  const confirmRename = () => {
    if (renameValue.trim()) {
      onRename(folder.id, renameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="mb-1">
      <div
        className={`group flex items-center gap-1 px-1.5 py-1.5 rounded-md cursor-pointer transition-colors ${
          highlighted
            ? "bg-primary/15 ring-1 ring-primary/40"
            : "hover:bg-muted/60"
        }`}
      >
        {!isSearching && (
          <button
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="shrink-0 p-0.5"
        >
          {open ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FolderClosed className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {renaming ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="h-6 text-xs flex-1"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={confirmRename}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={() => setRenaming(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <span
              className="flex-1 min-w-0 text-xs font-semibold truncate"
              onClick={() => setOpen(!open)}
            >
              {folder.name}
            </span>
            <span className="text-[10px] text-muted-foreground mr-1">
              {folderPlans.length}
            </span>
            <div className="grid grid-cols-[0fr] group-hover:grid-cols-[1fr] transition-[grid-template-columns] duration-200 ease-out shrink-0 overflow-hidden">
              <div className="min-w-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreate(folder.id);
                  }}
                  title={t("plans.newPage")}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenaming(true);
                    setRenameValue(folder.name);
                  }}
                >
                  <Pencil className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5 text-destructive" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="pl-4 space-y-0.5">
          {folderPlans.length === 0 && !highlighted ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              {t("plans.noPagesYet")}
            </p>
          ) : (
            <>
              {folderPlans.map((plan) => (
                <div key={plan.id} className="relative group/item">
                  <SortablePlanItem
                    plan={plan}
                    isActive={plan.id === activeId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    t={t}
                    isDragDisabled={isSearching}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-7 top-1/2 -translate-y-1/2 h-5 w-5 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePlan(plan.id, null);
                    }}
                    title="Move out of folder"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
              {highlighted && folderPlans.length === 0 && (
                <p className="text-[10px] text-primary text-center py-2">
                  Drop here
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function PageList({
  plans,
  folders,
  activeId,
  onSelect,
  onDelete,
  onCreate,
  onReorder,
  onMovePlan,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onReorderFolders,
}: PageListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);

  const filtered = plans.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const isSearching = search.length > 0;

  const rootPlans = isSearching
    ? filtered
    : filtered.filter((p) => !p.folderId);

  const allPlanIds = filtered.map((p) => p.id);
  const folderSortIds = folders.map((f) => `${FOLDER_ID_PREFIX}${f.id}`);
  const allSortableIds = [...folderSortIds, ...allPlanIds];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isDraggingFolder = draggedId?.startsWith(FOLDER_ID_PREFIX) ?? false;
  const draggedPlan =
    draggedId && !isDraggingFolder
      ? plans.find((p) => p.id === draggedId)
      : null;
  const draggedFolder =
    draggedId && isDraggingFolder
      ? folders.find((f) => `${FOLDER_ID_PREFIX}${f.id}` === draggedId)
      : null;

  function handleDragStart(event: DragStartEvent) {
    setDraggedId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    if (isDraggingFolder) return;
    const { over } = event;
    if (!over) {
      setOverFolderId(null);
      return;
    }
    const overId = over.id as string;
    if (overId.startsWith(FOLDER_ID_PREFIX)) {
      setOverFolderId(overId.slice(FOLDER_ID_PREFIX.length));
    } else {
      const overPlan = plans.find((p) => p.id === overId);
      if (overPlan?.folderId) {
        setOverFolderId(overPlan.folderId);
      } else {
        setOverFolderId(null);
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggedId(null);
    setOverFolderId(null);

    if (!over || isSearching) return;

    const activeItemId = active.id as string;
    const overId = over.id as string;

    if (activeItemId.startsWith(FOLDER_ID_PREFIX)) {
      if (!overId.startsWith(FOLDER_ID_PREFIX) || activeItemId === overId) return;
      const oldIndex = folders.findIndex(
        (f) => `${FOLDER_ID_PREFIX}${f.id}` === activeItemId
      );
      const newIndex = folders.findIndex(
        (f) => `${FOLDER_ID_PREFIX}${f.id}` === overId
      );
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(folders, oldIndex, newIndex);
        onReorderFolders(newOrder.map((f) => f.id));
      }
      return;
    }

    if (overId.startsWith(FOLDER_ID_PREFIX)) {
      const targetFolderId = overId.slice(FOLDER_ID_PREFIX.length);
      const draggedItem = plans.find((p) => p.id === activeItemId);
      if (draggedItem?.folderId !== targetFolderId) {
        onMovePlan(activeItemId, targetFolderId);
      }
      return;
    }

    if (activeItemId === overId) return;

    const overPlan = plans.find((p) => p.id === overId);
    const activePlan = plans.find((p) => p.id === activeItemId);

    if (overPlan?.folderId && activePlan?.folderId !== overPlan.folderId) {
      onMovePlan(activeItemId, overPlan.folderId);
      return;
    }

    if (!overPlan?.folderId && activePlan?.folderId) {
      onMovePlan(activeItemId, null);
      return;
    }

    const oldIndex = rootPlans.findIndex((p) => p.id === activeItemId);
    const newIndex = rootPlans.findIndex((p) => p.id === overId);
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const newOrder = arrayMove(rootPlans, oldIndex, newIndex);
      onReorder(newOrder.map((p) => p.id));
    }
  }

  function handleDragCancel() {
    setDraggedId(null);
    setOverFolderId(null);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("plans.pages")}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              onClick={onCreateFolder}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => onCreate()}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={t("plans.newPage")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder={t("plans.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 h-8 text-sm rounded-md border border-border bg-background placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-ring transition-shadow"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={allSortableIds}
            strategy={verticalListSortingStrategy}
          >
          <div className="pb-2 space-y-0.5">
            {!isSearching &&
              folders.map((folder) => (
                <FolderSection
                  key={folder.id}
                  folder={folder}
                  plans={filtered}
                  activeId={activeId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onCreate={(folderId) => onCreate(folderId)}
                  onRename={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  onMovePlan={onMovePlan}
                  t={t}
                  isSearching={isSearching}
                  isDragOverThis={overFolderId === folder.id}
                />
              ))}

            {rootPlans.length === 0 && folders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {search ? t("plans.noMatchingPages") : t("plans.noPagesYet")}
              </p>
            ) : (
              rootPlans.map((plan) => (
                <SortablePlanItem
                  key={plan.id}
                  plan={plan}
                  isActive={plan.id === activeId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  t={t}
                  isDragDisabled={isSearching}
                />
              ))
            )}
          </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {draggedPlan ? (
              <div className="flex items-center gap-1.5 rounded-lg px-1.5 py-2 text-sm bg-accent shadow-md border opacity-90">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-[13px]">
                  {draggedPlan.title}
                </span>
              </div>
            ) : null}
            {draggedFolder ? (
              <div className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm bg-accent shadow-md border opacity-90">
                <FolderClosed className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-semibold text-xs">
                  {draggedFolder.name}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </ScrollArea>
    </div>
  );
}
