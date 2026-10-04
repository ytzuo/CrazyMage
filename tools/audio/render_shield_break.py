"""Refresh only the shield fracture master, its manifest entry and the sampler."""

import json

from render_drafts import OUT, REPORT, render_shield_break, render_reel, verify_outputs


def main():
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    render_shield_break()
    verify_outputs()
    manifest["assets"] = [REPORT[-1] if a["id"] == "shield_break" else a
                          for a in manifest["assets"]]
    manifest["version"] = max(manifest.get("version", 1), 9)
    manifest["sampler"] = render_reel()
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Updated shield fracture master and sampler.")


if __name__ == "__main__":
    main()
