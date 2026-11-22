#!/usr/bin/env python3
# Build per-browser store packages from extension/. Store review rejects the combined
# service_worker + scripts background key, so each target gets a clean manifest:
#   chrome  -> background.service_worker only, no Firefox-specific keys
#   firefox -> background.scripts only, keep the gecko id + strict_min_version (AMO needs the id)
# Output: dist/blaikhole-<target>-<version>.zip (zip root = manifest.json, as the stores require).
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "extension")
DIST = os.path.join(ROOT, "dist")

base = json.load(open(os.path.join(EXT, "manifest.json")))
version = base["version"]
os.makedirs(DIST, exist_ok=True)


def manifest_for(target):
    m = json.loads(json.dumps(base))  # deep copy
    if target == "chrome":
        m["background"] = {"service_worker": "src/background.js"}
        m.pop("browser_specific_settings", None)  # Firefox-only; keep Chrome's manifest clean
    elif target == "firefox":
        m["background"] = {"scripts": ["src/background.js"]}
        # keep browser_specific_settings: AMO requires an add-on id for MV3
    else:
        raise ValueError(target)
    return m


def build(target):
    m = manifest_for(target)
    out = os.path.join(DIST, f"blaikhole-{target}-{version}.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(m, indent=2) + "\n")
        for dirpath, _, files in os.walk(EXT):
            for f in files:
                fp = os.path.join(dirpath, f)
                rel = os.path.relpath(fp, EXT)
                if rel == "manifest.json":
                    continue
                z.write(fp, rel)
    return out, os.path.getsize(out)


if __name__ == "__main__":
    for t in ("chrome", "firefox"):
        path, size = build(t)
        print(f"built {path}  ({size} bytes)")
