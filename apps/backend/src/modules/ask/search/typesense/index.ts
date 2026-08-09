export { createTypesenseClient, readTypesenseConfig } from "./client"
export {
  embedTextsCohere,
  productEmbedText,
  COHERE_EMBED_DIMS,
} from "./cohere-embed"
export {
  PRODUCTS_COLLECTION,
  buildProductCollectionSchema,
  type TypesenseProductDoc,
} from "./schemas"
export {
  createTypesenseSearchEngine,
  getTypesenseSearchEngine,
  resetTypesenseSearchEngineCache,
  mapTypesenseHitScore,
} from "./search"
export {
  toProductDoc,
  syncTypesenseCatalog,
  upsertTypesenseProduct,
  deleteTypesenseProduct,
  ensureProductCollection,
  type IndexSyncResult,
} from "./sync"
