import { Agent } from "../types";

const AGENTS_STORAGE_KEY = "hms_registered_agents";

const INITIAL_REGISTERED_AGENTS: Agent[] = [];

/**
 * Service to manage registered agents locally and across sessions.
 */
export class AgentService {
  /**
   * Retrieves all registered agents from localStorage or empty array.
   */
  public static getRegisteredAgents(): Agent[] {
    if (typeof window === "undefined") return INITIAL_REGISTERED_AGENTS;

    try {
      const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out legacy sample seed data if present
          const filtered = parsed.filter((a: Agent) => !["AGT-001", "AGT-002", "AGT-003"].includes(a.id));
          if (filtered.length !== parsed.length) {
            localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(filtered));
          }
          return filtered;
        }
      }
      return INITIAL_REGISTERED_AGENTS;
    } catch (e) {
      console.error("Failed to load registered agents from localStorage:", e);
      return INITIAL_REGISTERED_AGENTS;
    }
  }

  /**
   * Saves a new agent or updates an existing agent by name / phone.
   */
  public static saveAgent(agentData: Omit<Agent, "id"> & { id?: string }): Agent {
    const agents = this.getRegisteredAgents();

    // Check if agent with same name or phone already exists
    const existingIndex = agents.findIndex(
      a => a.name.trim().toLowerCase() === agentData.name.trim().toLowerCase() ||
          (agentData.phone && a.phone === agentData.phone)
    );

    if (existingIndex >= 0) {
      const updatedAgent: Agent = {
        ...agents[existingIndex],
        ...agentData,
        id: agents[existingIndex].id
      };
      agents[existingIndex] = updatedAgent;
      if (typeof window !== "undefined") {
        localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
      }
      return updatedAgent;
    } else {
      const newAgent: Agent = {
        id: agentData.id || `AGT-${Math.floor(100 + Math.random() * 900)}`,
        name: agentData.name.trim(),
        companyName: agentData.companyName.trim(),
        address: agentData.address.trim(),
        phone: agentData.phone.trim(),
        defaultCommission: agentData.defaultCommission || 0,
        createdAt: new Date().toISOString()
      };
      agents.push(newAgent);
      if (typeof window !== "undefined") {
        localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
      }
      return newAgent;
    }
  }
}
