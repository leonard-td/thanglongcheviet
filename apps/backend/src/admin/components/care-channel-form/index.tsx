import {
  Button,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  CareChannel,
  CareChannelConfig,
  CareChannelProvider,
} from "../../types/care-channel"

export type CareChannelFormValues = {
  name: string
  provider: CareChannelProvider
  notifyOrders: boolean
  receiveMessages: boolean
  isActive: boolean
  botToken: string
  chatId: string
  appId: string
  secretKey: string
  oaId: string
  accessToken: string
  refreshToken: string
  notifyUserIds: string
}

export const emptyCareChannelFormValues: CareChannelFormValues = {
  name: "",
  provider: "telegram",
  notifyOrders: true,
  receiveMessages: true,
  isActive: true,
  botToken: "",
  chatId: "",
  appId: "",
  secretKey: "",
  oaId: "",
  accessToken: "",
  refreshToken: "",
  notifyUserIds: "",
}

export const channelToFormValues = (
  channel: CareChannel
): CareChannelFormValues => {
  const config = channel.config ?? {}

  return {
    name: channel.name,
    provider: channel.provider,
    notifyOrders: channel.notify_orders,
    receiveMessages: channel.receive_messages,
    isActive: channel.is_active,
    botToken: config.bot_token ?? "",
    chatId: config.chat_id ?? "",
    appId: config.app_id ?? "",
    secretKey: config.secret_key ?? "",
    oaId: config.oa_id ?? "",
    accessToken: config.access_token ?? "",
    refreshToken: config.refresh_token ?? "",
    notifyUserIds: (config.notify_user_ids ?? []).join(", "),
  }
}

export const formValuesToConfig = (
  values: CareChannelFormValues
): CareChannelConfig =>
  values.provider === "telegram"
    ? {
        bot_token: values.botToken.trim(),
        chat_id: values.chatId.trim(),
      }
    : {
        app_id: values.appId.trim(),
        secret_key: values.secretKey.trim(),
        oa_id: values.oaId.trim(),
        access_token: values.accessToken.trim(),
        refresh_token: values.refreshToken.trim(),
        notify_user_ids: values.notifyUserIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      }

type CareChannelFormProps = {
  values: CareChannelFormValues
  onChange: (patch: Partial<CareChannelFormValues>) => void
  /** khi sửa kênh không cho đổi nền tảng — config không tương thích */
  providerLocked?: boolean
  isSubmitting?: boolean
  submitLabel: string
  onSubmit: (event: React.FormEvent) => void
}

const CareChannelForm = ({
  values,
  onChange,
  providerLocked = false,
  isSubmitting = false,
  submitLabel,
  onSubmit,
}: CareChannelFormProps) => {
  const { t } = useTranslation()

  return (
    <form className="flex flex-col gap-6 px-6 py-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="name">{t("care-channels.fields.name")}</Label>
        <Input
          id="name"
          required
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label>{t("care-channels.fields.provider")}</Label>
        <Select
          value={values.provider}
          disabled={providerLocked}
          onValueChange={(value) =>
            onChange({ provider: value as CareChannelProvider })
          }
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="telegram">
              {t("care-channels.provider.telegram")}
            </Select.Item>
            <Select.Item value="zalo_oa">
              {t("care-channels.provider.zalo_oa")}
            </Select.Item>
          </Select.Content>
        </Select>
      </div>

      <div className="flex items-center gap-x-3">
        <Switch
          checked={values.notifyOrders}
          onCheckedChange={(checked) => onChange({ notifyOrders: checked })}
        />
        <div className="flex flex-col">
          <Label>{t("care-channels.fields.notifyOrders")}</Label>
          <span className="text-ui-fg-subtle text-xs">
            {t("care-channels.fields.notifyOrdersHint")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-x-3">
        <Switch
          checked={values.receiveMessages}
          onCheckedChange={(checked) => onChange({ receiveMessages: checked })}
        />
        <div className="flex flex-col">
          <Label>{t("care-channels.fields.receiveMessages")}</Label>
          <span className="text-ui-fg-subtle text-xs">
            {t("care-channels.fields.receiveMessagesHint")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-x-3">
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => onChange({ isActive: checked })}
        />
        <Label>{t("care-channels.fields.active")}</Label>
      </div>

      {values.provider === "telegram" ? (
        <div className="flex flex-col gap-y-4 rounded-lg border p-4">
          <div>
            <Heading level="h3">
              {t("care-channels.fields.telegramSectionTitle")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("care-channels.fields.telegramSectionHint")}
            </Text>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="bot_token">
              {t("care-channels.fields.botToken")}
            </Label>
            <Input
              id="bot_token"
              type="password"
              autoComplete="off"
              placeholder="123456789:AA..."
              value={values.botToken}
              onChange={(e) => onChange({ botToken: e.target.value })}
            />
            <span className="text-ui-fg-subtle text-xs">
              {t("care-channels.fields.secretKeepHint")}
            </span>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="chat_id">{t("care-channels.fields.chatId")}</Label>
            <Input
              id="chat_id"
              placeholder="-1001234567890"
              value={values.chatId}
              onChange={(e) => onChange({ chatId: e.target.value })}
            />
            <span className="text-ui-fg-subtle text-xs">
              {t("care-channels.fields.chatIdHint")}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-y-4 rounded-lg border p-4">
          <div>
            <Heading level="h3">
              {t("care-channels.fields.zaloSectionTitle")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("care-channels.fields.zaloSectionHint")}
            </Text>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="oa_id">{t("care-channels.fields.oaId")}</Label>
              <Input
                id="oa_id"
                value={values.oaId}
                onChange={(e) => onChange({ oaId: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="app_id">{t("care-channels.fields.appId")}</Label>
              <Input
                id="app_id"
                value={values.appId}
                onChange={(e) => onChange({ appId: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="secret_key">
              {t("care-channels.fields.secretKey")}
            </Label>
            <Input
              id="secret_key"
              type="password"
              autoComplete="off"
              value={values.secretKey}
              onChange={(e) => onChange({ secretKey: e.target.value })}
            />
            <span className="text-ui-fg-subtle text-xs">
              {t("care-channels.fields.secretKeepHint")}
            </span>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="access_token">
              {t("care-channels.fields.accessToken")}
            </Label>
            <Textarea
              id="access_token"
              rows={2}
              value={values.accessToken}
              onChange={(e) => onChange({ accessToken: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="refresh_token">
              {t("care-channels.fields.refreshToken")}
            </Label>
            <Textarea
              id="refresh_token"
              rows={2}
              value={values.refreshToken}
              onChange={(e) => onChange({ refreshToken: e.target.value })}
            />
            <span className="text-ui-fg-subtle text-xs">
              {t("care-channels.fields.refreshTokenHint")}
            </span>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="notify_user_ids">
              {t("care-channels.fields.notifyUserIds")}
            </Label>
            <Input
              id="notify_user_ids"
              placeholder="user_id_1, user_id_2"
              value={values.notifyUserIds}
              onChange={(e) => onChange({ notifyUserIds: e.target.value })}
            />
            <span className="text-ui-fg-subtle text-xs">
              {t("care-channels.fields.notifyUserIdsHint")}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button isLoading={isSubmitting} type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

export default CareChannelForm
