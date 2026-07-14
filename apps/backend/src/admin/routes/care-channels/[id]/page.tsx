import {
  Button,
  Copy,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  LoaderFunctionArgs,
  UIMatch,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router-dom"
import { useTranslation } from "react-i18next"
import CareChannelForm, {
  channelToFormValues,
  formValuesToConfig,
  type CareChannelFormValues,
} from "../../../components/care-channel-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"
import type {
  CareChannel,
  CareChannelResponse,
} from "../../../types/care-channel"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params

  const data = await sdk.client.fetch<CareChannelResponse>(
    `/admin/care-channels/${id}`
  )

  return {
    channel: data.care_channel,
  }
}

export const handle = {
  breadcrumb: (match: UIMatch<{ channel: CareChannel }>) => {
    return match.data?.channel?.name ?? "Edit channel"
  },
}

const EditCareChannelPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { channel } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const [values, setValues] = useState<CareChannelFormValues>(
    channelToFormValues(channel)
  )

  const handleChange = (patch: Partial<CareChannelFormValues>) => {
    setValues((current) => ({ ...current, ...patch }))
  }

  const webhookUrl = `${window.location.origin}/webhooks/${
    channel.provider === "telegram" ? "telegram" : "zalo"
  }/${channel.id}`

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/care-channels/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-channels"] })
    },
  })

  const { mutateAsync: deleteChannel, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/care-channels/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-channels"] })
      toast.success(t("care-channels.messages.deleted"))
      navigate("..")
    },
  })

  const { mutateAsync: sendTest, isPending: isTesting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ success: boolean; error: string | null }>(
        `/admin/care-channels/${id}/test`,
        { method: "POST", body: {} }
      ),
  })

  const { mutateAsync: registerWebhook, isPending: isRegistering } =
    useMutation({
      mutationFn: () =>
        sdk.client.fetch<{ success: boolean; webhook_url: string }>(
          `/admin/care-channels/${id}/webhook`,
          { method: "POST", body: {} }
        ),
    })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await mutateAsync({
        name: values.name,
        notify_orders: values.notifyOrders,
        receive_messages: values.receiveMessages,
        is_active: values.isActive,
        config: formValuesToConfig(values),
      })

      toast.success(t("care-channels.messages.updated"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-channels.messages.updateFailed")
      )
    }
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("care-channels.messages.deleteConfirmTitle"),
      description: t("care-channels.messages.deleteConfirmDesc", {
        name: values.name,
      }),
      confirmText: t("care-channels.messages.confirmDelete"),
      cancelText: t("care-channels.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteChannel()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-channels.messages.deleteFailed")
      )
    }
  }

  const handleTest = async () => {
    try {
      const result = await sendTest()
      if (result.success) {
        toast.success(t("care-channels.messages.testSent"))
      } else {
        toast.error(result.error || t("care-channels.messages.testFailed"))
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-channels.messages.testFailed")
      )
    }
  }

  const handleRegisterWebhook = async () => {
    try {
      await registerWebhook()
      toast.success(t("care-channels.webhook.registered"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-channels.webhook.registerFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("care-channels.edit")}
        actions={
          <>
            <Button
              variant="secondary"
              isLoading={isTesting}
              onClick={handleTest}
            >
              {t("care-channels.actions.sendTest")}
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              {t("care-channels.actions.delete")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("care-channels.actions.backToList")}
            </Button>
            <Button
              form="care-channel-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("care-channels.actions.save")}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div>
          <Heading level="h3">{t("care-channels.webhook.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {channel.provider === "telegram"
              ? t("care-channels.webhook.telegramHint")
              : t("care-channels.webhook.zaloHint")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <code className="bg-ui-bg-subtle text-ui-fg-subtle rounded-md px-2 py-1 text-xs">
            {webhookUrl}
          </code>
          <Copy content={webhookUrl} />
          {channel.provider === "telegram" && (
            <Button
              size="small"
              variant="secondary"
              isLoading={isRegistering}
              onClick={handleRegisterWebhook}
            >
              {t("care-channels.webhook.register")}
            </Button>
          )}
        </div>
      </div>

      <CareChannelForm
        formId="care-channel-form"
        hideSubmit
        values={values}
        onChange={handleChange}
        providerLocked
        isSubmitting={isPending}
        submitLabel={t("care-channels.actions.save")}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  )
}

export default EditCareChannelPage
