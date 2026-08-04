import { createHash } from "node:crypto"
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"

export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    fs.createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")))
  })
}

// Liệt kê mọi file dưới root (đường dẫn tương đối, phân cách "/"). Các entry
// bắt đầu bằng "." bị bỏ qua — trong static đó là các thư mục kỹ thuật của
// chính quá trình restore (.restore-tmp, .old-*), không phải media.
export async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function walk(rel: string) {
    const abs = rel ? path.join(root, rel) : root
    const entries = await fsp.readdir(abs, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      if (entry.name.startsWith("private-")) continue
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await walk(childRel)
      } else if (entry.isFile()) {
        out.push(childRel)
      }
    }
  }
  try {
    await walk("")
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return []
    throw e
  }
  return out.sort()
}
