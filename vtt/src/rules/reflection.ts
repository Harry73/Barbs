/**
 * Beam reflection geometry for Mirror Mage mirrors. Pure math (canvas pixels), no Foundry APIs.
 *
 * A mirror is a line segment the width of its token, through the token's center, along the token's rotation. Its
 * front faces "down" at rotation 0 (+y on the canvas) and turns with the token.
 *
 *   - A beam hitting a mirror's front reflects off it (angle in = angle out), with its range reset.
 *   - A beam hitting a Convex mirror's back splits into two beams out the front at ±45° from its facing.
 *   - A beam hitting a Concave mirror's back is stored (fired later, by hand).
 *   - A beam hitting a Plane mirror's back is blocked: the mirror is opaque.
 *   - A beam that has already been redirected twice dispels the mirror it hits, and stops there.
 */

export interface Point {
    x: number;
    y: number;
}

export type MirrorKind = "plane" | "convex" | "concave";

export interface Mirror {
    id: string;
    kind: MirrorKind;
    a: Point;
    b: Point;
    /** Unit normal pointing out of the mirror's front. */
    front: Point;
}

export interface Segment {
    from: Point;
    to: Point;
    /** How many times the beam had been redirected when it traveled this segment. */
    redirects: number;
    width: number;
}

export interface Trace {
    segments: Segment[];
    /** Mirrors dispelled by a beam that had already been redirected twice. */
    dispelled: string[];
    notes: string[];
}

const EPS = 1e-6;
const add = (p: Point, q: Point): Point => ({ x: p.x + q.x, y: p.y + q.y });
const sub = (p: Point, q: Point): Point => ({ x: p.x - q.x, y: p.y - q.y });
const mul = (p: Point, k: number): Point => ({ x: p.x * k, y: p.y * k });
const dot = (p: Point, q: Point) => p.x * q.x + p.y * q.y;
const cross = (p: Point, q: Point) => p.x * q.y - p.y * q.x;
const rotate = (p: Point, degrees: number): Point => {
    const r = (degrees * Math.PI) / 180;
    return { x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) };
};

/** A mirror from a token's center, width in pixels, and rotation in degrees. */
export function mirrorFromToken(id: string, kind: MirrorKind, center: Point, width: number, rotation: number): Mirror {
    const along = rotate({ x: 1, y: 0 }, rotation);
    return {
        id,
        kind,
        a: add(center, mul(along, -width / 2)),
        b: add(center, mul(along, width / 2)),
        front: rotate({ x: 0, y: 1 }, rotation),
    };
}

/** Where a ray from `from` along unit `dir` first crosses the mirror, as a distance along the ray, or null. */
function hitDistance(from: Point, dir: Point, mirror: Mirror): number | null {
    const edge = sub(mirror.b, mirror.a);
    const denom = cross(dir, edge);
    if (Math.abs(denom) < EPS) return null; // parallel
    const offset = sub(mirror.a, from);
    const t = cross(offset, edge) / denom; // along the ray
    const u = cross(offset, dir) / denom; // along the mirror, 0..1
    return t > EPS && u >= -EPS && u <= 1 + EPS ? t : null;
}

/** Reflect a direction off a surface with unit normal n. */
function reflect(dir: Point, n: Point): Point {
    return sub(dir, mul(n, 2 * dot(dir, n)));
}

/**
 * Follow a beam from `from` along `dir` for `range` pixels, bouncing off mirrors.
 * @param widthPerRedirect Extra width per redirect (Beam of Brilliance), in pixels.
 */
export function traceBeam(
    from: Point,
    dir: Point,
    range: number,
    width: number,
    mirrors: Mirror[],
    { widthPerRedirect = 0, maxSegments = 16 }: { widthPerRedirect?: number; maxSegments?: number } = {},
): Trace {
    const trace: Trace = { segments: [], dispelled: [], notes: [] };
    const length = Math.hypot(dir.x, dir.y) || 1;
    const queue = [{ from, dir: mul(dir, 1 / length), redirects: 0, ignore: null as string | null }];

    while (queue.length && trace.segments.length < maxSegments) {
        const beam = queue.shift()!;
        const w = width + widthPerRedirect * beam.redirects;
        let nearest: { t: number; mirror: Mirror } | null = null;
        for (const mirror of mirrors) {
            if (mirror.id === beam.ignore || trace.dispelled.includes(mirror.id)) continue;
            const t = hitDistance(beam.from, beam.dir, mirror);
            if (t !== null && t <= range && (!nearest || t < nearest.t)) nearest = { t, mirror };
        }
        if (!nearest) {
            trace.segments.push({ from: beam.from, to: add(beam.from, mul(beam.dir, range)), redirects: beam.redirects, width: w });
            continue;
        }

        const hit = add(beam.from, mul(beam.dir, nearest.t));
        trace.segments.push({ from: beam.from, to: hit, redirects: beam.redirects, width: w });
        const { mirror } = nearest;
        if (beam.redirects >= 2) {
            trace.dispelled.push(mirror.id);
            trace.notes.push(`A twice-redirected beam hit a ${mirror.kind} mirror, dispelling it.`);
            continue;
        }

        const fromFront = dot(beam.dir, mirror.front) < 0;
        const next = (d: Point) => queue.push({ from: hit, dir: d, redirects: beam.redirects + 1, ignore: mirror.id });
        if (fromFront) {
            next(reflect(beam.dir, mirror.front));
        } else if (mirror.kind === "convex") {
            next(rotate(mirror.front, 45));
            next(rotate(mirror.front, -45));
        } else if (mirror.kind === "concave") {
            trace.notes.push("The Concave Mirror stores the beam until the end of the turn (fire it out the front by hand).");
        } else {
            trace.notes.push("The beam hit the back of a Plane Mirror and was blocked.");
        }
    }
    if (queue.length) trace.notes.push("Stopped tracing after too many reflections.");
    return trace;
}

/** Is a point within a segment's width? Used to find the tokens a segment passes through. */
export function onSegment(point: Point, segment: Segment, tolerance = 0): boolean {
    const along = sub(segment.to, segment.from);
    const length = Math.hypot(along.x, along.y);
    if (length < EPS) return false;
    const dir = mul(along, 1 / length);
    const rel = sub(point, segment.from);
    const t = dot(rel, dir);
    if (t < -tolerance || t > length + tolerance) return false;
    return Math.abs(cross(rel, dir)) <= segment.width / 2 + tolerance;
}
