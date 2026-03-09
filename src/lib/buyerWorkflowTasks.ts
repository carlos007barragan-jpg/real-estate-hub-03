import { supabase } from "@/integrations/supabase/client";
import { addDays, addHours } from "date-fns";

interface TaskDef {
  title: string;
  description: string;
  due_date: string;
  appointment_type?: string;
}

function toISO(date: Date): string {
  return date.toISOString();
}

export function getBuyerOnboardingTasks(consultAlreadyDone: boolean, consultDate?: Date): TaskDef[] {
  const now = new Date();

  if (consultAlreadyDone) {
    // Path B: Consult already completed
    return [
      {
        title: "Upload buyer consult documents & ID",
        description: "Upload the signed buyer consult sheet and client ID to the CRM documents section.",
        due_date: toISO(now),
        appointment_type: "document_upload",
      },
      {
        title: "Update CRM with search criteria",
        description: "Update budget, area of interest, bedrooms, bathrooms, property type, and other search preferences in the lead profile.",
        due_date: toISO(now),
        appointment_type: "crm_update",
      },
      {
        title: "Send matching properties",
        description: "Email or text curated property listings that match the client's search criteria discussed during consult.",
        due_date: toISO(addDays(now, 1)),
      },
      {
        title: "Follow-up call — review sent properties",
        description: "Call the client to review the properties you sent, get feedback, and narrow down preferences.",
        due_date: toISO(addDays(now, 2)),
        appointment_type: "call",
      },
      {
        title: "Schedule property showings",
        description: "Based on client feedback, schedule showings for their top property picks.",
        due_date: toISO(addDays(now, 4)),
      },
    ];
  }

  // Path A: New lead, no consult yet
  return [
    {
      title: "Introduction call",
      description: "Reach out to the lead, introduce yourself, and gather initial information about their property needs.",
      due_date: toISO(now),
      appointment_type: "call",
    },
    {
      title: "Send property options",
      description: "Send initial property listings based on available criteria (budget, area, property type).",
      due_date: toISO(now),
    },
    {
      title: "Schedule Buyer Consult",
      description: "Contact the lead to schedule an in-person buyer consultation. Use the Confirmed/Not Confirmed buttons once you have an answer.",
      due_date: toISO(addDays(now, 1)),
      appointment_type: "buyer_consult_scheduling",
    },
  ];
}

export function getConsultConfirmedTasks(consultDate: Date): TaskDef[] {
  return [
    {
      title: "Confirmation call: Are you still coming?",
      description: "Call the client the day before their buyer consult to confirm attendance and remind them of the time/location.",
      due_date: toISO(addDays(consultDate, -1)),
      appointment_type: "call",
    },
    {
      title: "Final check-in call + send address/details",
      description: "Call a few hours before the appointment to confirm they're still coming. Send the office address, parking info, and any documents to bring.",
      due_date: toISO(addHours(consultDate, -2)),
      appointment_type: "call",
    },
    {
      title: "Upload Buyer Consult sheet & ID to CRM",
      description: "After the buyer consult, upload the signed buyer consult sheet and a copy of the client's ID to the lead's documents.",
      due_date: toISO(addHours(consultDate, 1)),
      appointment_type: "document_upload",
    },
    {
      title: "Update CRM with search criteria",
      description: "After the buyer consult, update the lead profile with detailed search criteria: budget, area, beds/baths, property type, timeframe, financing.",
      due_date: toISO(addHours(consultDate, 1)),
      appointment_type: "crm_update",
    },
  ];
}

export function getConsultNotConfirmedTask(): TaskDef {
  const now = new Date();
  return {
    title: "Re-attempt consult scheduling",
    description: "The buyer consult was not confirmed. Try again to schedule the in-person consultation.",
    due_date: toISO(addDays(now, 1)),
    appointment_type: "buyer_consult_scheduling",
  };
}

export async function insertBuyerTasks(
  leadId: string,
  userId: string,
  tasks: TaskDef[]
): Promise<void> {
  const rows = tasks.map((t) => ({
    lead_id: leadId,
    user_id: userId,
    title: t.title,
    description: t.description,
    due_date: t.due_date,
    status: "pending" as const,
    appointment_type: t.appointment_type || null,
  }));

  const { error } = await supabase.from("tasks").insert(rows);
  if (error) {
    console.error("Error creating buyer workflow tasks:", error);
    throw error;
  }
}
