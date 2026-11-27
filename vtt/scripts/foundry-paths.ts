/**
 * Where Foundry is usually installed, per platform. Scripts take these as defaults; override with FOUNDRY_APP (the
 * app's `resources/app` folder, which has `common/`) and FOUNDRY_DATA (the user data folder, which has `systems/`).
 */
import os from "node:os";
import path from "node:path";

export function defaultAppDir(): string {
    if (process.env.FOUNDRY_APP) return process.env.FOUNDRY_APP;
    switch (process.platform) {
        case "darwin":
            return "/Applications/Foundry Virtual Tabletop.app/Contents/Resources/app";
        case "win32":
            return path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Foundry Virtual Tabletop", "resources", "app");
        default:
            return path.join(os.homedir(), "foundryvtt", "resources", "app");
    }
}

export function defaultDataDir(): string {
    if (process.env.FOUNDRY_DATA) return process.env.FOUNDRY_DATA;
    switch (process.platform) {
        case "darwin":
            return path.join(os.homedir(), "Library", "Application Support", "FoundryVTT", "Data");
        case "win32":
            return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"), "FoundryVTT", "Data");
        default:
            return path.join(os.homedir(), ".local", "share", "FoundryVTT", "Data");
    }
}
