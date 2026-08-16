#!/usr/bin/env python3
import json, sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
names = z.namelist()
manifest = json.loads(z.read("manifest.json"))
print(json.dumps({
  "total": len(names),
  "static_entries": len([n for n in names if n.startswith("static/")]),
  "manifest_static": len(manifest.get("static_files", [])),
  "tables": len(manifest.get("tables", [])),
}))
