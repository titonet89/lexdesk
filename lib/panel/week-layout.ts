/** Rango horario visible de la vista semanal. */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;
const VISIBLE_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const MIN_DURATION = 30;

export interface TimedItem {
  id: string;
  /** Minutos desde la medianoche (hora de Jujuy). */
  start: number;
  end: number;
}

export interface PositionedItem extends TimedItem {
  /** Posición y alto como porcentaje del rango visible. */
  top: number;
  height: number;
  /** Carril dentro del grupo de eventos superpuestos y cantidad de carriles. */
  lane: number;
  lanes: number;
  /** El evento empieza antes o termina después del rango visible. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

/**
 * Ubica los eventos de un día en la grilla horaria: posición vertical según el
 * horario y, si se superponen, carriles lado a lado (asignación voraz por grupo).
 */
export function layoutDay(items: TimedItem[]): PositionedItem[] {
  const sorted = [...items]
    .map((item) => ({ ...item, end: Math.max(item.end, item.start + MIN_DURATION) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const result: PositionedItem[] = [];
  let group: { item: TimedItem; lane: number }[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const { item, lane } of group) {
      const visibleStart = Math.min(Math.max(item.start - DAY_START_HOUR * 60, 0), VISIBLE_MINUTES - MIN_DURATION);
      const visibleEnd = Math.min(Math.max(item.end - DAY_START_HOUR * 60, visibleStart + MIN_DURATION), VISIBLE_MINUTES);
      result.push({
        ...item,
        top: (visibleStart / VISIBLE_MINUTES) * 100,
        height: ((visibleEnd - visibleStart) / VISIBLE_MINUTES) * 100,
        lane,
        lanes,
        clippedStart: item.start < DAY_START_HOUR * 60,
        clippedEnd: item.end > DAY_END_HOUR * 60,
      });
    }
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (group.length > 0 && item.start >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    group.push({ item, lane });
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (group.length > 0) flush();
  return result;
}

/** Posición (%) de una hora del día dentro del rango visible, o null si está fuera. */
export function minutePosition(minutes: number): number | null {
  const offset = minutes - DAY_START_HOUR * 60;
  if (offset < 0 || offset > VISIBLE_MINUTES) return null;
  return (offset / VISIBLE_MINUTES) * 100;
}
