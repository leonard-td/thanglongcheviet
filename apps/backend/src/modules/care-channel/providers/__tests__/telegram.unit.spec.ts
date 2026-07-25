import { sendTelegramMessage, setTelegramWebhook } from "../telegram"

describe("telegram provider (mocked)", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("sends a message via Bot API sendMessage", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: { message_id: 99 },
      }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await sendTelegramMessage(
      "token-abc",
      "556450107",
      "hello"
    )

    expect(result).toEqual({ messageId: "99" })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://api.telegram.org/bottoken-abc/sendMessage"
    )
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      chat_id: "556450107",
      text: "hello",
    })
  })

  it("registers a webhook with optional secret_token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: true }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await setTelegramWebhook(
      "token-abc",
      "https://example.com/webhooks/telegram/cch_1",
      "secret-xyz"
    )

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({
      url: "https://example.com/webhooks/telegram/cch_1",
      allowed_updates: ["message"],
      secret_token: "secret-xyz",
    })
  })

  it("throws when Telegram returns ok:false", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: false,
        description: "Forbidden: bot was blocked by the user",
      }),
    }) as unknown as typeof fetch

    await expect(
      sendTelegramMessage("bad-token", "1", "hi")
    ).rejects.toThrow("Forbidden: bot was blocked by the user")
  })

  it("throws when HTTP response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, description: "Unauthorized" }),
    }) as unknown as typeof fetch

    await expect(
      sendTelegramMessage("bad-token", "1", "hi")
    ).rejects.toThrow("Unauthorized")
  })
})
