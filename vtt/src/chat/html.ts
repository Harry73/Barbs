/**
 * Chat messages here are built as HTML strings, with actor, item, and effect names (and trigger text) typed by users
 * dropped into them. Run those through `esc` where they're interpolated, so a name like "Mage's <Wand> & Co" shows as
 * typed instead of breaking the card. Escape at the point of interpolation and nowhere earlier: names travel through
 * flags and socket requests as plain text.
 */
export const esc = (text: string | null | undefined): string => foundry.utils.escapeHTML(String(text ?? ""));
