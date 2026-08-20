import { BookingEntity } from "../domain/bookings.domain";

/**
 * Payload interface for registering a new customer reservation.
 */
export interface CreateBookingDTO {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  roomType: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalAmount: number;
  paymentStatus: "paid" | "unpaid" | "partial" | "partially-paid";
  bookingStatus: "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled";
  paymentMethod: string;
  advanceAmount: number;
  paymentProof?: string;
  remarks?: string;
  bookingSource?: 'direct' | 'agency';
  agencyCommission?: number;
  agentName?: string;
  agentCompany?: string;
  agentAddress?: string;
  agentPhone?: string;
}

export interface AgentDetailsMeta {
  name?: string;
  company?: string;
  address?: string;
  phone?: string;
}

export function encodeAgentIntoRemarks(remarks: string = "", agent: AgentDetailsMeta): string {
  if (!agent.name && !agent.company && !agent.phone && !agent.address) {
    return remarks || "";
  }
  const metaTag = `[AGENT_META:${JSON.stringify(agent)}]`;
  const clean = (remarks || "").replace(/\[AGENT_META:.*?\]/g, "").trim();
  return clean ? `${clean}\n${metaTag}` : metaTag;
}

export function decodeAgentFromRemarks(remarks: string = ""): { cleanRemarks: string; agent: AgentDetailsMeta } {
  if (!remarks) return { cleanRemarks: "", agent: {} };

  const match = remarks.match(/\[AGENT_META:(.*?)\]/);
  if (match && match[1]) {
    try {
      const agent = JSON.parse(match[1]);
      const cleanRemarks = remarks.replace(/\[AGENT_META:.*?\]/g, "").trim();
      return { cleanRemarks, agent };
    } catch (e) {
      console.error("Failed to parse AGENT_META from remarks", e);
    }
  }
  return { cleanRemarks: remarks, agent: {} };
}

/**
 * Maps raw database reservations to Domain Entities.
 */
export class BookingsMapper {
  /**
   * Maps database raw booking row to BookingEntity.
   */
  public static toEntity(row: any): BookingEntity {
    const { cleanRemarks, agent } = decodeAgentFromRemarks(row.remarks || "");
    const agentName = row.agent_name || agent.name || "";
    const agentCompany = row.agent_company || agent.company || "";
    const agentAddress = row.agent_address || agent.address || "";
    const agentPhone = row.agent_phone || agent.phone || "";

    return new BookingEntity(
      row.booking_id,
      row.customer_name,
      row.customer_phone,
      row.customer_email,
      row.customer_address || "",
      row.room_type_id,
      row.room_number,
      row.check_in_date,
      row.check_out_date,
      Number(row.guest_count),
      Number(row.total_amount),
      row.payment_status,
      row.booking_status,
      row.payment_method,
      Number(row.advance_amount || 0),
      row.payment_proof || "",
      cleanRemarks,
      row.created_by_uid,
      row.created_by_name,
      row.created_by_role,
      row.booking_source || 'direct',
      Number(row.agency_commission || 0),
      agentName,
      agentCompany,
      agentAddress,
      agentPhone,
      row.deleted_at,
      row.deleted_by,
      row.delete_reason
    );
  }
}


