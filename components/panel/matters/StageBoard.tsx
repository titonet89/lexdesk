"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, Lock } from "lucide-react";
import { moveMatterStageAction } from "@/app/panel/expedientes/actions";
import { Badge } from "@/components/panel/ui";
import { practiceAreaLabels, stageLabels } from "@/lib/panel/labels";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Stage = Database["public"]["Enums"]["procedural_stage"];
type Area = Database["public"]["Enums"]["practice_area"];

export interface BoardMatter {
  id: string;
  title: string;
  clientName: string | null;
  fileLabel: string | null;
  area: Area;
  stage: Stage;
  isSensitive: boolean;
}

const STAGES = Object.keys(stageLabels) as Stage[];

/**
 * La columna de destino es la que está bajo el puntero (lo que el usuario espera).
 * Con teclado no hay puntero: se usa la superposición del rectángulo.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

function MatterCard({ matter, onMove }: { matter: BoardMatter; onMove: (stage: Stage) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: matter.id, data: { stage: matter.stage } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border border-ink/8 bg-surface p-3 shadow-[0_1px_2px_rgb(15_23_42/0.05)] transition-shadow",
        isDragging && "relative z-20 rotate-1 shadow-xl ring-2 ring-gold-600/40",
      )}
      data-testid="board-card"
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Arrastrar ${matter.title}`}
          className="-ml-1 grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ink-muted/60 hover:bg-ink/5 hover:text-ink active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <Link href={`/panel/expedientes/${matter.id}`} className="min-w-0 flex-1 text-sm leading-snug font-semibold text-ink hover:underline">
          {matter.title}
        </Link>
      </div>
      <p className="mt-1.5 truncate pl-7 text-xs text-ink-muted">
        {[matter.clientName, matter.fileLabel].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-7">
        <Badge>{practiceAreaLabels[matter.area]}</Badge>
        {matter.isSensitive ? (
          <Badge tone="gold">
            <Lock className="size-3" aria-hidden="true" />
            Sensible
          </Badge>
        ) : null}
        <label className="ml-auto">
          <span className="sr-only">Mover {matter.title} a otra etapa</span>
          <select
            value={matter.stage}
            onChange={(event) => onMove(event.target.value as Stage)}
            className="h-7 cursor-pointer rounded-md border border-ink/10 bg-surface px-1.5 text-xs text-ink-muted"
            data-testid="board-move"
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </li>
  );
}

function StageColumn({ stage, matters, onMove }: { stage: Stage; matters: BoardMatter[]; onMove: (id: string, stage: Stage) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`stage-${stage}`}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl border border-ink/6 bg-ink/[0.03] p-2.5 transition-colors",
        isOver && "border-gold-600/40 bg-accent-soft",
      )}
      data-testid={`board-column-${stage}`}
    >
      <h2 id={`stage-${stage}`} className="flex items-center justify-between px-1.5 pt-1 pb-2.5 text-sm font-semibold text-ink">
        {stageLabels[stage]}
        <span className="rounded-full bg-ink/8 px-2 py-0.5 text-xs font-medium text-ink-muted tabular-nums">{matters.length}</span>
      </h2>
      <ul className="flex min-h-24 flex-1 flex-col gap-2">
        {matters.map((matter) => (
          <MatterCard key={matter.id} matter={matter} onMove={(target) => onMove(matter.id, target)} />
        ))}
        {matters.length === 0 ? (
          <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-ink/10 px-3 py-6 text-center text-xs text-ink-muted/70">
            Arrastrá un expediente acá
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/** Tablero Kanban por etapa procesal con arrastre (mouse, touch y teclado) y actualización optimista. */
export function StageBoard({ matters }: { matters: BoardMatter[] }) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimistic, applyMove] = useOptimistic(matters, (current, move: { id: string; stage: Stage }) =>
    current.map((matter) => (matter.id === move.id ? { ...matter, stage: move.stage } : matter)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function move(id: string, stage: Stage) {
    const current = optimistic.find((matter) => matter.id === id);
    if (!current || current.stage === stage) return;
    setError(null);
    startTransition(async () => {
      applyMove({ id, stage });
      const result = await moveMatterStageAction(id, stage);
      if (!result.ok) setError("No se pudo mover el expediente. Probá de nuevo.");
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.over) move(String(event.active.id), event.over.id as Stage);
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Para mover un expediente, presioná espacio o Enter, usá las flechas para elegir la etapa y volvé a presionar espacio o Enter para soltarlo. Escape cancela.",
          },
          announcements: {
            onDragStart: ({ active }) => `Tomaste el expediente ${optimistic.find((m) => m.id === active.id)?.title ?? ""}.`,
            onDragOver: ({ over }) => (over ? `Sobre la etapa ${stageLabels[over.id as Stage]}.` : "Fuera de las etapas."),
            onDragEnd: ({ over }) => (over ? `Expediente movido a ${stageLabels[over.id as Stage]}.` : "Movimiento cancelado."),
            onDragCancel: () => "Movimiento cancelado.",
          },
        }}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0" data-testid="stage-board">
          <div className="flex w-max gap-3">
            {STAGES.map((stage) => (
              <StageColumn key={stage} stage={stage} matters={optimistic.filter((matter) => matter.stage === stage)} onMove={move} />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
