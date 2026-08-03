import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import type NavigationModuleService from "../../../modules/navigation/service"

const CreateMenuSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  activate: z.boolean().optional().default(false),
})

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

/**
 * GET /admin/navigation-menus
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)

  const [menus, count] = await service.listAndCountNavigationMenus(
    {},
    {
      take: Math.min(Number(req.query.limit) || 50, 100),
      skip: Number(req.query.offset) || 0,
      order: { created_at: "ASC" },
    }
  )

  res.json({ menus, count })
}

/**
 * POST /admin/navigation-menus
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const raw = (req.body || {}) as { name?: string; slug?: string; activate?: boolean }
  const body = CreateMenuSchema.parse({
    name: raw.name,
    slug: raw.slug || slugify(raw.name || ""),
    activate: raw.activate,
  })

  if (!body.slug) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Could not derive a valid slug from name"
    )
  }

  const existing = await service.listNavigationMenus(
    { slug: body.slug },
    { take: 1 }
  )
  if (existing.length) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Menu with slug "${body.slug}" already exists`
    )
  }

  const menu = await service.createNavigationMenus({
    name: body.name,
    slug: body.slug,
    is_active: false,
  })

  if (body.activate) {
    await service.setActiveMenu(menu.id)
  }

  const fresh = await service.retrieveNavigationMenu(menu.id)
  res.status(201).json({ menu: fresh })
}
