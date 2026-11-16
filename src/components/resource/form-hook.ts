import type { AppFieldExtendedReactFormApi } from "@tanstack/react-form"
import { createFormHook, createFormHookContexts } from "@tanstack/react-form"

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
})

type ResourceFormValues = Record<string, unknown>

// Accepts forms both with and without explicit form-level validators.
/* eslint-disable @typescript-eslint/no-explicit-any */
type ResourceFormApi = AppFieldExtendedReactFormApi<
  ResourceFormValues,
  any, // TOnMount
  any, // TOnChange
  any, // TOnChangeAsync
  any, // TOnBlur
  any, // TOnBlurAsync
  any, // TOnSubmit
  any, // TOnSubmitAsync
  any, // TOnDynamic
  any, // TOnDynamicAsync
  any, // TOnServer
  unknown, // TSubmitMeta
  {}, // TFieldComponents (none registered)
  {} // TFormComponents (none registered)
>
/* eslint-enable @typescript-eslint/no-explicit-any */

export {
  fieldContext,
  formContext,
  useAppForm,
  useFieldContext,
  useFormContext,
}
export type { ResourceFormApi, ResourceFormValues }
