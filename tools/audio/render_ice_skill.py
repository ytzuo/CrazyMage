"""Render ice spikes emerging, preserving all other offline audio masters."""

import json

from render_drafts import OUT, REPORT, render_ice_skill, render_reel, verify_outputs


def main():
    path=OUT/"manifest.json"
    manifest=json.loads(path.read_text(encoding="utf-8"))
    render_ice_skill()
    verify_outputs()
    manifest["assets"]=[REPORT[0] if a["id"]=="ice_skill" else a for a in manifest["assets"]]
    manifest["version"]=max(manifest.get("version",1),11)
    manifest["sampler"]=render_reel()
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Updated ice E and sampler; other masters unchanged.")


if __name__ == "__main__":
    main()
