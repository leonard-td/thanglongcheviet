import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { syncProductDelete } from "../lib/ask-search-index"

export default async function productDeletedSearchIndexHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncProductDelete(container, data.id)
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
