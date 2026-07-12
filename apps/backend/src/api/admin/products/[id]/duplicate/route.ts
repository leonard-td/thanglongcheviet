import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import type {
  CreateProductWorkflowInputDTO,
  RemoteQueryFunction,
} from "@medusajs/framework/types"

// handle của product có unique constraint nên bản sao phải có handle mới
const generateUniqueHandle = async (
  query: Omit<RemoteQueryFunction, symbol>,
  baseHandle: string
) => {
  const base = `${baseHandle}-copy`
  let candidate = base

  for (let suffix = 2; ; suffix++) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { handle: candidate },
    })

    if (!data.length) {
      return candidate
    }

    candidate = `${base}-${suffix}`
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "subtitle",
      "description",
      "handle",
      "thumbnail",
      "weight",
      "length",
      "height",
      "width",
      "origin_country",
      "hs_code",
      "mid_code",
      "material",
      "discountable",
      "metadata",
      "collection_id",
      "type_id",
      "categories.id",
      "tags.id",
      "images.url",
      "images.metadata",
      "options.title",
      "options.values.value",
      "sales_channels.id",
      "shipping_profile.id",
      "variants.title",
      "variants.allow_backorder",
      "variants.manage_inventory",
      "variants.weight",
      "variants.length",
      "variants.height",
      "variants.width",
      "variants.origin_country",
      "variants.hs_code",
      "variants.mid_code",
      "variants.material",
      "variants.metadata",
      "variants.options.value",
      "variants.options.option.title",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "variants.prices.min_quantity",
      "variants.prices.max_quantity",
    ],
    filters: { id },
  })

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id ${id} was not found`
    )
  }

  const handle = await generateUniqueHandle(query, product.handle)

  // SKU / barcode cũng unique nên bản sao để trống — người dùng tự đặt lại
  const input: CreateProductWorkflowInputDTO = {
    title: `${product.title} (Copy)`,
    subtitle: product.subtitle ?? undefined,
    description: product.description ?? undefined,
    handle,
    status: "draft",
    thumbnail: product.thumbnail ?? undefined,
    weight: product.weight ?? undefined,
    length: product.length ?? undefined,
    height: product.height ?? undefined,
    width: product.width ?? undefined,
    origin_country: product.origin_country ?? undefined,
    hs_code: product.hs_code ?? undefined,
    mid_code: product.mid_code ?? undefined,
    material: product.material ?? undefined,
    discountable: product.discountable ?? undefined,
    metadata: product.metadata ?? undefined,
    collection_id: product.collection_id ?? undefined,
    type_id: product.type_id ?? undefined,
    category_ids: product.categories?.map((c) => c!.id) ?? [],
    tag_ids: product.tags?.map((tag) => tag!.id) ?? [],
    images:
      product.images?.map((image) => ({
        url: image!.url,
        metadata: image!.metadata ?? undefined,
      })) ?? [],
    options:
      product.options?.map((option) => ({
        title: option!.title,
        values: option!.values?.map((value) => value!.value) ?? [],
      })) ?? [],
    variants:
      product.variants?.map((variant) => {
        // prices đến từ link pricing nên không có trong type suy luận của query.graph
        const prices = (variant as unknown as {
          prices?: {
            amount: number
            currency_code: string
            min_quantity?: number | null
            max_quantity?: number | null
          }[]
        }).prices

        return {
          title: variant!.title,
          allow_backorder: variant!.allow_backorder ?? false,
          manage_inventory: variant!.manage_inventory ?? true,
          weight: variant!.weight ?? undefined,
          length: variant!.length ?? undefined,
          height: variant!.height ?? undefined,
          width: variant!.width ?? undefined,
          origin_country: variant!.origin_country ?? undefined,
          hs_code: variant!.hs_code ?? undefined,
          mid_code: variant!.mid_code ?? undefined,
          material: variant!.material ?? undefined,
          metadata: variant!.metadata ?? undefined,
          options: Object.fromEntries(
            (variant!.options ?? [])
              .filter((o) => o?.option?.title)
              .map((o) => [o!.option!.title, o!.value])
          ),
          prices:
            prices?.map((price) => ({
              amount: price.amount,
              currency_code: price.currency_code,
              min_quantity: price.min_quantity ?? undefined,
              max_quantity: price.max_quantity ?? undefined,
            })) ?? [],
        }
      }) ?? [],
    sales_channels: product.sales_channels?.map((sc) => ({ id: sc!.id })) ?? [],
    shipping_profile_id: product.shipping_profile?.id ?? undefined,
  }

  const { result } = await createProductsWorkflow(req.scope).run({
    input: { products: [input] },
  })

  res.status(201).json({ product: result[0] })
}
