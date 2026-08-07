export type CardType = "link" | "contact" | "map" | "promotions"

export type Card = {
  id: string
  type: CardType
  title: Record<string, string> | null
  image: string | null
  path: string | null
  topic_id: string | null
  rank: number
  is_active: boolean
  locked: boolean
  created_at?: string
}

export type CardsResponse = {
  cards: Card[]
  count?: number
}

export type CardResponse = {
  card: Card
}
