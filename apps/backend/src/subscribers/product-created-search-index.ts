import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { syncProductUpsert } from "../lib/ask-search-index"

export default async function productCreatedSearchIndexHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncProductUpsert(container, data.id)
}

export const config: SubscriberConfig = {
  event: "product.created",
}
