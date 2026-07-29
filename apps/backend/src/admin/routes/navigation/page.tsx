import { useState, useEffect } from "react"
import { Container, Heading, Button, Table, Input } from "@medusajs/ui"
import { Trash, PencilSquare, ListBullet } from "@medusajs/icons"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { sdk } from "../../lib/sdk"

type NavItem = {
  id: string
  label: string
  url: string
  order: number
  parent_id: string | null
  openInNewTab: boolean
  is_active: boolean
}

const NavigationPage = () => {
  const [items, setItems] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [form, setForm] = useState<Partial<NavItem>>({
    label: "",
    url: "/",
    order: 0,
    parent_id: "null",
    openInNewTab: false,
    is_active: true
  })

  const fetchItems = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ navigations: NavItem[] }>(
        "/admin/navigations"
      )
      setItems(data.navigations || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleSubmit = async () => {
    const method = editingId ? "PUT" : "POST"
    const url = editingId ? `/admin/navigations/${editingId}` : "/admin/navigations"
    
    const payload = {
      ...form,
      parent_id: form.parent_id === "null" ? null : form.parent_id
    }

    try {
      await sdk.client.fetch(url, {
        method,
        body: payload,
      })

      setEditingId(null)
      setForm({ label: "", url: "/", order: 0, parent_id: "null", openInNewTab: false, is_active: true })
      fetchItems()
    } catch (e) {
      console.error(e)
    }
  }

  const handleEdit = (item: NavItem) => {
    setEditingId(item.id)
    setForm({
      ...item,
      parent_id: item.parent_id || "null"
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return
    try {
      await sdk.client.fetch(`/admin/navigations/${id}`, { method: "DELETE" })
      fetchItems()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Container>
      <div className="flex justify-between mb-4">
        <Heading level="h1">Navigation Menu</Heading>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 border p-4 rounded-lg flex flex-col gap-4">
          <Heading level="h2">{editingId ? "Edit Item" : "Create Item"}</Heading>
          
          <Input 
            placeholder="Label (e.g. Products)" 
            value={form.label} 
            onChange={(e) => setForm({ ...form, label: e.target.value })} 
          />
          <Input 
            placeholder="URL (e.g. /products)" 
            value={form.url} 
            onChange={(e) => setForm({ ...form, url: e.target.value })} 
          />
          <Input 
            type="number" 
            placeholder="Order" 
            value={form.order} 
            onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} 
          />

          <select 
            className="w-full p-2 border rounded-md"
            value={form.parent_id || "null"} 
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          >
            <option value="null">-- Top Level --</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>

          <Button onClick={handleSubmit}>{editingId ? "Update" : "Create"}</Button>
          {editingId && (
            <Button variant="secondary" onClick={() => {
              setEditingId(null)
              setForm({ label: "", url: "/", order: 0, parent_id: "null" })
            }}>Cancel</Button>
          )}
        </div>

        <div className="col-span-2">
          {loading ? <p>Loading...</p> : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Label</Table.HeaderCell>
                  <Table.HeaderCell>URL</Table.HeaderCell>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Parent ID</Table.HeaderCell>
                  <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map(item => (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.label}</Table.Cell>
                    <Table.Cell>{item.url}</Table.Cell>
                    <Table.Cell>{item.order}</Table.Cell>
                    <Table.Cell>{item.parent_id}</Table.Cell>
                    <Table.Cell className="flex gap-2">
                      <Button variant="transparent" onClick={() => handleEdit(item)}><PencilSquare /></Button>
                      <Button variant="transparent" onClick={() => handleDelete(item.id)}><Trash /></Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </div>
    </Container>
  )
}

export default NavigationPage

export const config = defineRouteConfig({
  label: "Navigation",
  icon: ListBullet,
})
