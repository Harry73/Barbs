// The Foundry CLI ships without type declarations; this covers the one function the pack builder uses.
declare module "@foundryvtt/foundryvtt-cli" {
    export function compilePack(
        src: string,
        dest: string,
        options?: { nedb?: boolean; yaml?: boolean; recursive?: boolean; log?: boolean },
    ): Promise<void>;
}
