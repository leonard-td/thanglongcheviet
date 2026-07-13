import { Button, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import CareChannelForm, {
  emptyCareChannelFormValues,
  formValuesToConfig,
  type CareChannelFormValues,
} from "../../../components/care-channel-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"
import type { CareChannelResponse } from "../../../types/care-channel"

const CreateCareChannelPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [values, setValues] = useState<CareChannelFormValues>(
    emptyCareChannelFormValues
  )

  const handleChange = (patch: Partial<CareChannelFormValues>) => {
    setValues((current) => ({ ...current, ...patch }))
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<CareChannelResponse>(`/admin/care-channels`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-channels"] })
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = await mutateAsync({
        name: values.name,
        provider: values.provider,
        notify_orders: values.notifyOrders,
        receive_messages: values.receiveMessages,
        is_active: values.isActive,
        config: formValuesToConfig(values),
      })

      toast.success(t("care-channels.messages.created"))
      navigate(`../${response.care_channel.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-channels.messages.createFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("care-channels.create")}
        subtitle={t("care-channels.hint")}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("care-channels.actions.backToList")}
            </Button>
            <Button
              form="care-channel-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("care-channels.actions.create")}
            </Button>
          </>
        }
      />

      <CareChannelForm
        formId="care-channel-form"
        hideSubmit
        values={values}
        onChange={handleChange}
        isSubmitting={isPending}
        submitLabel={t("care-channels.actions.create")}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  )
}

export default CreateCareChannelPage
