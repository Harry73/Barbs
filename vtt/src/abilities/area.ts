/**
 * Area targeting: place a square, circle, cone, or line on the map, then target the tokens inside it.
 *
 * Uses v14's region placement (which replaced measured templates) without saving the region, so nothing is left on
 * the map. Lines and cones are pinned to the caster and aimed with the mouse; squares and point circles follow the
 * cursor. Circles centered on the caster ("enemies within 20 ft of you") don't need placing at all.
 *
 * Targets come back ordered by distance from the area's origin, so for a line the first target is the first thing
 * the attack hits (Piercing Shot's full-damage target).
 */
import { SYSTEM_ID } from "../config.ts";
import { mirrorFromToken, onSegment, traceBeam, type Mirror, type MirrorKind, type Segment } from "../rules/reflection.ts";
import type { AreaSpec } from "./types.ts";

interface Point {
    x: number;
    y: number;
}

export interface AreaResult {
    tokens: Token.Implementation[];
    /** For reflected beams: which segments (by redirect count) hit each token, by token UUID. A token can be hit by several. */
    segments?: Record<string, number[]>;
    /** Summon IDs of mirrors the beam dispelled. */
    dispelled?: string[];
    notes?: string[];
    /** The placed area's region data, for zones that stay on the map. */
    regionData?: Record<string, unknown>;
}

/** The caster's mirror totems on the current scene. */
function mirrorsOf(actor: Actor.Implementation): { mirror: Mirror; summonId: string }[] {
    const out: { mirror: Mirror; summonId: string }[] = [];
    for (const token of canvas!.tokens!.placeables as Token.Implementation[]) {
        const info = foundry.utils.getProperty(token.actor ?? {}, `flags.${SYSTEM_ID}.mirror`) as { kind: MirrorKind; ownerUuid: string } | undefined;
        if (!info || info.ownerUuid !== actor.uuid) continue;
        const summonId = String(foundry.utils.getProperty(token.actor ?? {}, `flags.${SYSTEM_ID}.summon.summonId`) ?? "");
        out.push({ mirror: mirrorFromToken(token.id ?? "", info.kind, token.center, token.w, token.document.rotation ?? 0), summonId });
    }
    return out;
}

/** Briefly draw a beam's path (with bounces) for the caster. */
function drawSegments(segments: Segment[]): void {
    const graphics = new PIXI.Graphics();
    for (const s of segments) {
        graphics.lineStyle(Math.max(4, s.width / 3), s.redirects ? 0xe0f0ff : 0xffffff, 0.6);
        graphics.moveTo(s.from.x, s.from.y).lineTo(s.to.x, s.to.y);
    }
    canvas!.controls!.addChild(graphics);
    setTimeout(() => graphics.destroy(), 6000);
}

function casterToken(actor: Actor.Implementation): Token.Implementation | null {
    const tokens = actor.getActiveTokens(true) as Token.Implementation[];
    return tokens.find((t) => t.controlled) ?? tokens[0] ?? null;
}

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Does a token's disposition match who the area affects, relative to the caster? */
export function affected(token: Token.Implementation, caster: Token.Implementation | null, affects: AreaSpec["affects"]): boolean {
    if (affects === "all" || !caster) return true;
    const mine = caster.document.disposition;
    const theirs = token.document.disposition;
    if (affects === "allies") return theirs === mine;
    // Enemies: the opposite side. Neutral tokens are nobody's enemy.
    const { FRIENDLY, HOSTILE } = CONST.TOKEN_DISPOSITIONS;
    if (mine === FRIENDLY) return theirs === HOSTILE;
    if (mine === HOSTILE) return theirs === FRIENDLY;
    return theirs !== mine;
}

function finish(tokens: Token.Implementation[], origin: Point): AreaResult {
    tokens.sort((a, b) => distance(a.center, origin) - distance(b.center, origin));
    canvas!.tokens!.setTargets(tokens.map((t) => t.id).filter((id): id is string => !!id));
    return { tokens };
}

/**
 * Let the user place the area, then target what's inside. Returns null if they cancel (Escape or right-click),
 * which cancels the ability.
 */
export async function placeArea(
    actor: Actor.Implementation,
    spec: AreaSpec,
    { reflect = false }: { reflect?: boolean } = {},
): Promise<AreaResult | null> {
    if (!canvas?.ready || !canvas.scene) {
        ui.notifications?.warn("Open a scene to place this ability's area.");
        return null;
    }
    const caster = casterToken(actor);
    const origin = spec.origin ?? (spec.shape === "line" || spec.shape === "cone" ? "caster" : "point");
    const affects = spec.affects ?? "enemies";
    const px = canvas.dimensions!.distancePixels;
    const candidates = (canvas.tokens!.placeables as Token.Implementation[]).filter(
        (t) => t.visible && t !== caster && t.actor && affected(t, caster, affects),
    );
    // "All allies in range" usually includes the caster.
    if (caster && affects !== "enemies") candidates.push(caster);

    if (origin === "caster" && !caster) {
        ui.notifications?.warn(`${actor.name} needs a token on this scene to aim this ability.`);
        return null;
    }

    // "All enemies on the battlefield" and circles around the caster are just filters, no placement needed.
    if (spec.shape === "battlefield") return finish(candidates, caster?.center ?? { x: 0, y: 0 });
    const size = spec.size ?? 5;
    if (spec.shape === "circle" && origin === "caster") {
        const center = caster!.center;
        const radius = size * px + caster!.w / 2;
        return finish(candidates.filter((t) => distance(t.center, center) <= radius), center);
    }

    const start = origin === "caster" ? caster!.center : { x: 0, y: 0 };
    const shapes: Record<string, Record<string, unknown>> = {
        square: { type: "rectangle", x: start.x, y: start.y, width: size * px, height: size * px, anchorX: 0.5, anchorY: 0.5 },
        circle: { type: "circle", x: start.x, y: start.y, radius: size * px },
        cone: { type: "cone", x: start.x, y: start.y, radius: size * px, angle: spec.angle ?? 90, rotation: 0, curvature: "round" },
        line: { type: "line", x: start.x, y: start.y, length: size * px, width: (spec.width ?? 5) * px, rotation: 0 },
    };
    const shape = shapes[spec.shape];

    ui.notifications?.info(
        origin === "caster"
            ? "Aim with the mouse and click to confirm. Right-click or Escape cancels."
            : "Click to place the area. Right-click or Escape cancels.",
    );
    const region = (await canvas.regions!.placeRegion(
        {
            name: "Ability area",
            shapes: [{ ...shape, gridBased: true }],
            color: game.user?.color,
            levels: canvas.level ? [canvas.level.id] : [],
            highlightMode: "coverage",
            displayMeasurements: true,
        } as never,
        {
            create: false,
            allowRotation: origin !== "caster",
            // Keep caster-anchored shapes on the caster and point them at the cursor instead of moving them.
            onMove:
                origin === "caster"
                    ? ({ shape: s, position }: { shape: { updateSource(d: object): void }; position: Point }) => {
                          const c = caster!.center;
                          const rotation = Math.toDegrees(Math.atan2(position.y - c.y, position.x - c.x));
                          s.updateSource({ x: c.x, y: c.y, rotation });
                          return false;
                      }
                    : undefined,
        } as never,
    )) as unknown as { polygonTree: { testPoint(p: Point): boolean }; shapes: { x: number; y: number; rotation?: number }[] } | null;
    if (!region) return null;

    // Line spells bounce off the caster's mirrors (Mirror Mage). Trace the beam and find targets segment by segment.
    const mirrors = reflect && spec.shape === "line" && origin === "caster" ? mirrorsOf(actor) : [];
    if (mirrors.length) {
        const rotation = ((region.shapes[0].rotation ?? 0) * Math.PI) / 180;
        const trace = traceBeam(caster!.center, { x: Math.cos(rotation), y: Math.sin(rotation) }, size * px, (spec.width ?? 5) * px, mirrors.map((m) => m.mirror), {
            widthPerRedirect: (spec.widthPerRedirect ?? 0) * px,
        });
        drawSegments(trace.segments);
        const mirrorTokens = new Set(mirrors.map((m) => m.mirror.id));
        const hits: Record<string, number[]> = {};
        const hitTokens = new Map<string, Token.Implementation>();
        for (const segment of trace.segments) {
            for (const token of candidates) {
                if (mirrorTokens.has(token.id ?? "") || !onSegment(token.center, segment, canvas.grid!.size / 4)) continue;
                const uuid = token.document.uuid ?? "";
                (hits[uuid] ??= []).push(segment.redirects);
                hitTokens.set(uuid, token);
            }
        }
        const result = finish([...hitTokens.values()], caster!.center);
        const redirects = Math.max(0, ...trace.segments.map((s) => s.redirects));
        return {
            ...result,
            segments: hits,
            dispelled: mirrors.filter((m) => trace.dispelled.includes(m.mirror.id)).map((m) => m.summonId).filter(Boolean),
            notes: [...trace.notes, ...(redirects ? [`The beam was redirected up to ${redirects} time(s).`] : [])],
        };
    }

    const placed = region.shapes[0];
    const center = origin === "caster" ? caster!.center : { x: placed.x, y: placed.y };
    return {
        ...finish(
            candidates.filter((t) => region.polygonTree.testPoint(t.center)),
            center,
        ),
        regionData: (region as unknown as { toObject(): Record<string, unknown> }).toObject(),
    };
}
