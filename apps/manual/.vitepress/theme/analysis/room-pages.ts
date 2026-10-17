// The rooms' Analysis pages, one per reference room in each language, as
// VitePress dynamic routes (ADR 0062): each page gets only its own room's data.
import { aimDirection } from '../diagrams/core';
import {
  accuracyComparisonText,
  accuracySummaryText,
  accuracyTimingsText,
} from '../diagrams/files';
import type { AccuracySummary, RoomComparison, RoomPage, Timings } from './types';

/** Every room's page parameters: its name (the page's slug) and its data. */
export function roomPages(): { params: { room: string; page: RoomPage } }[] {
  const summary = JSON.parse(accuracySummaryText()) as AccuracySummary;
  const { rooms } = JSON.parse(accuracyComparisonText()) as { rooms: RoomComparison[] };
  const timings = JSON.parse(accuracyTimingsText()) as Timings;
  return summary.rooms.map((room) => {
    const comparison = rooms.find((r) => r.name === room.name);
    if (!comparison) throw new Error(`comparison.json has no room ${room.name}`);
    return {
      params: {
        room: room.name,
        page: {
          plan: comparison.room.luminaires.map((luminaire) => {
            // Core's own aim, so the plan points where the calculation does.
            const aim = aimDirection({
              tiltDeg: luminaire.tiltDeg ?? 0,
              panDeg: luminaire.panDeg ?? 0,
            });
            return {
              x: luminaire.origin.x,
              z: luminaire.origin.z,
              heightM: luminaire.origin.y,
              aimX: aim.x,
              aimZ: aim.z,
            };
          }),
          summary: room,
          comparison,
          timings: timings.rooms.find((r) => r.name === room.name),
          machine: timings.machine.cpu,
          brightShare: summary.brightShare,
          nearM: summary.nearM,
        },
      },
    };
  });
}
