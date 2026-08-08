import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Switch,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"
import type {
  EmployeeResponse,
  RbacRolesResponse,
} from "../../../types/employee"

const EditEmployeePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [blocked, setBlocked] = useState(false)
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")

  const { data, isLoading } = useQuery<EmployeeResponse>({
    queryFn: () => sdk.client.fetch(`/admin/employees/${id}`),
    queryKey: ["employees", id],
    enabled: !!id,
  })

  const { data: rolesData } = useQuery<RbacRolesResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/rbac/roles`, {
        query: { limit: 100, offset: 0 },
      }),
    queryKey: ["rbac-roles"],
  })

  useEffect(() => {
    if (!data?.employee) {
      return
    }
    setFirstName(data.employee.first_name || "")
    setLastName(data.employee.last_name || "")
    setBlocked(data.employee.blocked)
    setRoleIds(data.employee.roles.map((role) => role.id))
  }, [data])

  const { mutateAsync: updateEmployee, isPending: isUpdating } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<EmployeeResponse>(`/admin/employees/${id}`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      queryClient.invalidateQueries({ queryKey: ["employees", id] })
    },
  })

  const { mutateAsync: setPasswordMutation, isPending: isSettingPassword } =
    useMutation({
      mutationFn: (body: { password: string }) =>
        sdk.client.fetch(`/admin/employees/${id}/password`, {
          method: "POST",
          body,
        }),
    })

  const { mutateAsync: deleteEmployee, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
  })

  const toggleRole = (roleId: string) => {
    setRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((value) => value !== roleId)
        : [...current, roleId]
    )
  }

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await updateEmployee({
        first_name: firstName || null,
        last_name: lastName || null,
        blocked,
        role_ids: roleIds,
      })
      toast.success(t("employees.messages.updated"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("employees.messages.updateFailed")
      )
    }
  }

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8) {
      toast.error(t("employees.messages.passwordTooShort"))
      return
    }
    if (password !== passwordConfirm) {
      toast.error(t("employees.messages.passwordMismatch"))
      return
    }

    try {
      await setPasswordMutation({ password })
      setPassword("")
      setPasswordConfirm("")
      toast.success(t("employees.messages.passwordUpdated"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("employees.messages.passwordUpdateFailed")
      )
    }
  }

  const handleDelete = async () => {
    const name =
      [data?.employee.first_name, data?.employee.last_name]
        .filter(Boolean)
        .join(" ") || data?.employee.email

    const confirmed = await prompt({
      title: t("employees.messages.deleteConfirmTitle"),
      description: t("employees.messages.deleteConfirmDesc", { name }),
      confirmText: t("employees.messages.confirmDelete"),
      cancelText: t("employees.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteEmployee()
      toast.success(t("employees.messages.deleted"))
      navigate("..")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("employees.messages.deleteFailed")
      )
    }
  }

  if (isLoading || !data?.employee) {
    return (
      <PageLayout>
        <div className="px-6 py-4 text-ui-fg-muted">{t("employees.loading")}</div>
      </PageLayout>
    )
  }

  const employee = data.employee

  return (
    <PageLayout>
      <PageHeader
        title={employee.email}
        subtitle={t("employees.editHint")}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("employees.actions.backToList")}
            </Button>
            <Button
              form="employee-edit-form"
              type="submit"
              variant="primary"
              isLoading={isUpdating}
            >
              {t("employees.actions.save")}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-y-8 px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Badge color={blocked ? "red" : "green"}>
            {blocked
              ? t("employees.status.blocked")
              : t("employees.status.active")}
          </Badge>
          {employee.roles.map((role) => (
            <Badge key={role.id} size="2xsmall" color="blue">
              {role.name}
            </Badge>
          ))}
        </div>

        <form
          id="employee-edit-form"
          onSubmit={handleSaveProfile}
          className="flex flex-col gap-y-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label>{t("employees.fields.email")}</Label>
              <Input value={employee.email} disabled />
              <p className="text-ui-fg-muted text-xs">
                {t("employees.fields.emailReadonly")}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2">
              <div>
                <Label>{t("employees.fields.blocked")}</Label>
                <p className="text-ui-fg-muted text-xs">
                  {t("employees.fields.blockedHint")}
                </p>
              </div>
              <Switch checked={blocked} onCheckedChange={setBlocked} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="first_name">
                {t("employees.fields.firstName")}
              </Label>
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
              {(rolesData?.roles || []).map((role) => (
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
              ))}
            </div>
          </div>
        </form>

        <form
          onSubmit={handleSetPassword}
          className="flex flex-col gap-y-4 border-t border-ui-border-base pt-6"
        >
          <div>
            <h3 className="txt-compact-medium-plus">
              {t("employees.passwordSection.title")}
            </h3>
            <p className="text-ui-fg-muted text-sm">
              {t("employees.passwordSection.hint")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="new_password">
                {t("employees.fields.newPassword")}
              </Label>
              <Input
                id="new_password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="confirm_password">
                {t("employees.fields.confirmPassword")}
              </Label>
              <Input
                id="confirm_password"
                type="password"
                minLength={8}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isSettingPassword}
              disabled={!password}
            >
              {t("employees.actions.setPassword")}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-6">
          <h3 className="txt-compact-medium-plus text-ui-fg-error">
            {t("employees.dangerZone.title")}
          </h3>
          <p className="text-ui-fg-muted text-sm">
            {t("employees.dangerZone.hint")}
          </p>
          <div>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              {t("employees.actions.delete")}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default EditEmployeePage
