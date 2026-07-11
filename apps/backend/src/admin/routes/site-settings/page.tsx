import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CogSixTooth } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Label, Textarea, Select } from "@medusajs/ui"
import { useState, useEffect } from "react"

const DAY_OPTIONS = [
  { value: "mon_fri", label: "Monday - Friday", vi: "Thứ Hai – Thứ Sáu", en: "Monday – Friday" },
  { value: "sat_sun", label: "Saturday - Sunday", vi: "Thứ Bảy – Chủ Nhật", en: "Saturday – Sunday" },
  { value: "mon_sat", label: "Monday - Saturday", vi: "Thứ Hai – Thứ Bảy", en: "Monday – Saturday" },
  { value: "mon_sun", label: "Monday - Sunday", vi: "Thứ Hai – Chủ Nhật", en: "Monday – Sunday" },
  { value: "everyday", label: "Everyday", vi: "Mỗi ngày", en: "Everyday" },
]

const SiteSettingsRoute = () => {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch current settings
    fetch("/admin/site-settings").then(res => res.json()).then((res: any) => {
      setSettings(res.site_settings || {})
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleHourChange = (index: number, field: string, subfield: string | null, value: string) => {
    const newHours = [...(settings.hours || [])];
    if (!newHours[index]) {
       newHours[index] = { days: { vi: '', en: '' }, time: '' };
    }
    if (subfield) {
      newHours[index][field] = {
        ...(newHours[index][field] || {}),
        [subfield]: value
      }
    } else {
      newHours[index][field] = value
    }
    handleChange("hours", newHours)
  }

  const addHour = () => {
    const newHours = [...(settings.hours || []), { days: { vi: '', en: '' }, time: '' }];
    handleChange("hours", newHours)
  }

  const removeHour = (index: number) => {
    const newHours = [...(settings.hours || [])];
    newHours.splice(index, 1);
    handleChange("hours", newHours)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await fetch("/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      })
      alert("Settings saved successfully!")
    } catch (err) {
      console.error(err)
      alert("Error saving settings")
    }
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <Container className="flex flex-col gap-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Site Settings</Heading>
          <Text className="text-ui-fg-subtle">
            Manage your website's contact information, social links, and operating hours.
          </Text>
        </div>
        <Button onClick={handleSave} isLoading={loading}>Save Settings</Button>
      </div>

      {/* Address */}
      <div className="flex flex-col gap-y-2">
        <Label>Address</Label>
        <Input 
          placeholder="e.g. 1A Lang Ha, Hanoi"
          value={settings.address || ""}
          onChange={(e) => handleChange("address", e.target.value)}
        />
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-y-2">
        <Label>Phone</Label>
        <Input 
          placeholder="e.g. +84 24 3456 7890"
          value={settings.phone || ""}
          onChange={(e) => handleChange("phone", e.target.value)}
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-y-2">
        <Label>Email</Label>
        <Input 
          type="email"
          placeholder="e.g. hello@example.com"
          value={settings.email || ""}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </div>

      {/* Operating Hours */}
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <Label>Operating Hours</Label>
          <Button variant="secondary" size="small" onClick={addHour}>
            Add Row
          </Button>
        </div>
        
        {(settings.hours || []).map((hour: any, index: number) => (
          <div key={index} className="flex flex-col gap-y-2 border p-4 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <Text className="text-ui-fg-subtle text-small font-medium">Row {index + 1}</Text>
              <Button variant="danger" size="small" onClick={() => removeHour(index)}>
                Remove
              </Button>
            </div>
            
            <div className="flex flex-col gap-y-2">
              <Label className="text-xsmall">Days</Label>
              <Select 
                value={DAY_OPTIONS.find(o => o.en === hour.days?.en)?.value} 
                onValueChange={(val) => {
                  const opt = DAY_OPTIONS.find(o => o.value === val);
                  if (opt) {
                    const newHours = [...(settings.hours || [])];
                    newHours[index].days = { vi: opt.vi, en: opt.en };
                    handleChange("hours", newHours);
                  }
                }}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select days" />
                </Select.Trigger>
                <Select.Content>
                  {DAY_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            
            <div className="flex flex-col gap-y-2 mt-2">
              <Label className="text-xsmall">Time</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="time"
                  value={hour.time?.split(/\s*[-–]\s*/)[0] || ""}
                  onChange={(e) => {
                     const parts = hour.time?.split(/\s*[-–]\s*/) || ["", ""];
                     handleHourChange(index, "time", null, `${e.target.value} - ${parts[1] || ""}`);
                  }}
                />
                <Text className="text-ui-fg-subtle"> - </Text>
                <Input 
                  type="time"
                  value={hour.time?.split(/\s*[-–]\s*/)[1] || ""}
                  onChange={(e) => {
                     const parts = hour.time?.split(/\s*[-–]\s*/) || ["", ""];
                     handleHourChange(index, "time", null, `${parts[0] || ""} - ${e.target.value}`);
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {!(settings.hours?.length > 0) && (
          <Text className="text-ui-fg-subtle text-small italic">No operating hours configured.</Text>
        )}
      </div>

      {/* Social Links */}
      <div className="flex flex-col gap-y-2">
        <Label>Facebook URL</Label>
        <Input 
          placeholder="https://facebook.com/..."
          value={settings.facebook || ""}
          onChange={(e) => handleChange("facebook", e.target.value)}
        />
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Site Settings",
  icon: CogSixTooth,
})

export default SiteSettingsRoute
