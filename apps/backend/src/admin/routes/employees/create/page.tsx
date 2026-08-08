import { Button, Checkbox, Input, Label, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"
import type {
  EmployeeResponse,
  RbacRolesResponse,
} from "../../../types/employee"

const CreateEmployeePage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [roleIds, setRoleIds] = useState<string[]>([])

  const { data: rolesData } = useQuery<RbacRolesResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/rbac/roles`, {
        query: { limit: 100, offset: 0 },
      }),
    queryKey: ["rbac-roles"],
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<EmployeeResponse>(`/admin/employees`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
  })

  const toggleRole = (id: string) => {
    setRoleIds((current) =>
      current.includes(id)
        ? current.filter((roleId) => roleId !== id)
        : [...current, id]
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = await mutateAsync({
        email,
        password,
        first_name: firstName || null,
        last_name: lastName || null,
        role_ids: roleIds,
      })

      toast.success(t("employees.messages.created"))
      navigate(`../${response.employee.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("employees.messages.createFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("employees.create")}
        subtitle={t("employees.createHint")}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("employees.actions.backToList")}
            </Button>
            <Button
              form="employee-create-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("employees.actions.create")}
            </Button>
          </>
        }
      />

      <form
        id="employee-create-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-y-4 px-6 py-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="email">{t("employees.fields.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="password">{t("employees.fields.password")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-ui-fg-muted text-xs">
              {t("employees.fields.passwordHint")}
            </p>
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="first_name">{t("employees.fields.firstName")}</Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="last_name">{t("employees.fields.lastName")}</Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <Label>{t("employees.fields.roles")}</Label>
          <p className="text-ui-fg-muted text-xs">
            {t("employees.fields.rolesHint")}
          </p>
          <div className="flex flex-col gap-y-2 rounded-md border border-ui-border-base p-3">
            {(rolesData?.roles || []).length === 0 ? (
              <p className="text-ui-fg-muted text-sm">
                {t("employees.fields.noRoles")}
              </p>
            ) : (
              (rolesData?.roles || []).map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-x-2 text-sm"
                >
                  <Checkbox
                    checked={roleIds.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <span>{role.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </form>
    </PageLayout>
  )
}

export default CreateEmployeePage
