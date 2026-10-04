"""Refresh only the boss arrival master, manifest and SFX sampler."""

import json

from render_drafts import OUT, REPORT, render_boss_arrival, render_reel, verify_outputs


def main():
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    render_boss_arrival()
    verify_outputs()
    manifest["assets"] = [REPORT[-1] if a["id"] == "boss_arrival" else a
                          for a in manifest["assets"]]
    manifest["version"] = max(manifest.get("version", 1), 16)
    manifest["sampler"] = render_reel()
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Updated boss arrival and sampler.")


if __name__ == "__main__":
    main()
