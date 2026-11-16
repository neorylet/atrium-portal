const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  "Only draft invoices can be deleted":
    "This invoice can't be deleted because it has already been sent.",
  "Cannot revert a sent invoice to draft":
    "A sent invoice can't be moved back to draft.",
  "Paid invoices require paid_on":
    "Please enter the date the invoice was paid.",
  "Paid or void invoices are terminal":
    "Paid or void invoices can't be changed.",
  "Cannot send an invoice without a project":
    "Please choose a project before sending this invoice.",
  "Cannot send an invoice with a non-positive amount":
    "Please enter an amount greater than zero before sending this invoice.",
  "Cannot send an invoice without line items":
    "Please add at least one line item before sending this invoice.",
  "Cannot modify project_id after an invoice leaves draft":
    "The project can't be changed after the invoice has been sent.",
  "Cannot modify org_id after an invoice leaves draft":
    "The organisation can't be changed after the invoice has been sent.",
  "Cannot modify line items on a non-draft invoice.":
    "Line items can only be changed while the invoice is a draft.",
}

const FIELD_TERMS: Record<string, string> = {
  project_id: "project",
  org_id: "organisation",
  invoice_id: "invoice",
  paid_on: "payment date",
  due_on: "due date",
  issued_on: "issue date",
}

function humanizeMessage(message: string): string {
  const friendly = FRIENDLY_ERROR_MESSAGES[message]
  if (friendly) return friendly

  if (message.includes("invoice_items_description_check")) {
    return "Please enter a description for each line item."
  }

  if (message.includes("violates not-null constraint")) {
    return "Please fill in all required fields."
  }

  if (message.includes("duplicate key value violates unique constraint")) {
    return "This record already exists. Please use a different value."
  }

  if (message.includes("violates foreign key constraint")) {
    return "This record is linked to other data and can't be changed."
  }

  if (message.includes("violates check constraint")) {
    return "Some of the information entered isn't valid. Please check the form and try again."
  }

  if (message.includes("permission denied")) {
    return "You don't have permission to do that."
  }

  return Object.entries(FIELD_TERMS).reduce(
    (text, [term, label]) => text.replaceAll(term, label),
    message
  )
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message
  ) {
    return humanizeMessage((error as { message: string }).message)
  }
  return fallback
}
