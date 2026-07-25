import {
  formatBookingMessage,
  formatEventRegistrationMessage,
  formatInquiryMessage,
  formatOrderMessage,
} from "../format"

describe("care-channel message formatters", () => {
  it("formats an order notification", () => {
    const text = formatOrderMessage({
      display_id: 42,
      email: "a@example.com",
      currency_code: "vnd",
      total: 850000,
      items: [
        { title: "Chè Shan Tuyết", quantity: 2 },
        { title: "Trà sen", quantity: 1 },
      ],
      shipping_address: {
        first_name: "Nguyễn",
        last_name: "Văn A",
        phone: "0912345678",
        address_1: "12 Nguyễn Huệ",
        city: "Hà Nội",
      },
    })

    expect(text).toContain("🛒 Đơn hàng mới #42")
    expect(text).toContain("Khách hàng: Nguyễn Văn A")
    expect(text).toContain("SĐT: 0912345678")
    expect(text).toContain("• Chè Shan Tuyết x2")
    expect(text).toContain("Tổng tiền:")
  })

  it("formats a contact inquiry", () => {
    const text = formatInquiryMessage({
      name: "Lan",
      phone: "0909111222",
      email: "lan@example.com",
      service: "Trà đạo",
      message: "Muốn đặt bàn",
      source: "website",
    })

    expect(text).toContain("📩 Khách hàng liên hệ mới")
    expect(text).toContain("Tên: Lan")
    expect(text).toContain("Dịch vụ quan tâm: Trà đạo")
    expect(text).toContain("Nguồn: website")
  })

  it("formats a booking notification with schedule", () => {
    const text = formatBookingMessage({
      name: "Minh",
      phone: "0987654321",
      service: "Thưởng trà",
      preferred_date: "2026-08-01",
      preferred_time: "10:00",
      message: "2 người",
      source: "booking-form",
    })

    expect(text).toContain("📅 Đặt lịch mới")
    expect(text).toContain("Thời gian: 2026-08-01 10:00")
    expect(text).toContain("Ghi chú: 2 người")
  })

  it("formats an event registration", () => {
    const text = formatEventRegistrationMessage({
      eventTitle: "Trà chiều Hồ Gươm",
      name: "Hà",
      phone: "0911000000",
      quantity: 3,
      source: "website",
    })

    expect(text).toContain("🎫 Đăng ký sự kiện mới")
    expect(text).toContain("Sự kiện: Trà chiều Hồ Gươm")
    expect(text).toContain("Số chỗ: 3")
  })

  it("omits empty optional fields", () => {
    const text = formatInquiryMessage({ name: "A", phone: "01" })
    expect(text).not.toContain("Email:")
    expect(text).not.toContain("Dịch vụ")
    expect(text.split("\n")).toEqual([
      "📩 Khách hàng liên hệ mới",
      "Tên: A",
      "SĐT: 01",
    ])
  })
})
