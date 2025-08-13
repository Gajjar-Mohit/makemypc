import { componentDatabase, type PCComponent, type ComponentCategory } from "./pc-components"

export interface UserRequirements {
  budget: number
  primaryUse: string[]
  performance: "budget" | "mid-range" | "high-end" | "enthusiast"
  preferences: {
    brand?: string[]
    rgb?: boolean
    quiet?: boolean
    futureProof?: boolean
  }
}

export interface BuildRecommendation {
  components: PCComponent[]
  totalPrice: number
  performanceScore: number
  compatibilityIssues: string[]
  reasoning: string
}

export class RecommendationEngine {
  private parseRequirements(input: string): UserRequirements {
    const text = input.toLowerCase()

    // Extract budget
    const budgetMatch = text.match(/\$?(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:budget|dollars?|usd)?/i)
    const budget = budgetMatch ? Number.parseInt(budgetMatch[1].replace(",", "")) : 1500

    // Determine primary use
    const primaryUse: string[] = []
    if (text.includes("gaming") || text.includes("game")) primaryUse.push("gaming")
    if (text.includes("streaming") || text.includes("stream")) primaryUse.push("streaming")
    if (text.includes("video editing") || text.includes("editing")) primaryUse.push("video-editing")
    if (text.includes("office") || text.includes("work") || text.includes("productivity")) primaryUse.push("office")
    if (text.includes("3d") || text.includes("rendering") || text.includes("blender")) primaryUse.push("3d-rendering")

    if (primaryUse.length === 0) primaryUse.push("general")

    // Determine performance tier
    let performance: UserRequirements["performance"] = "mid-range"
    if (budget < 800 || text.includes("budget") || text.includes("cheap")) {
      performance = "budget"
    } else if (budget > 2500 || text.includes("high-end") || text.includes("enthusiast") || text.includes("best")) {
      performance = "high-end"
    } else if (budget > 3500 || text.includes("no budget") || text.includes("unlimited")) {
      performance = "enthusiast"
    }

    // Extract preferences
    const preferences: UserRequirements["preferences"] = {}

    if (text.includes("nvidia") || text.includes("rtx")) {
      preferences.brand = ["NVIDIA"]
    } else if (text.includes("amd") || text.includes("radeon")) {
      preferences.brand = ["AMD"]
    }

    if (text.includes("rgb") || text.includes("lighting") || text.includes("colorful")) {
      preferences.rgb = true
    }

    if (text.includes("quiet") || text.includes("silent") || text.includes("noise")) {
      preferences.quiet = true
    }

    if (text.includes("future") || text.includes("upgrade") || text.includes("proof")) {
      preferences.futureProof = true
    }

    return { budget, primaryUse, performance, preferences }
  }

  private getComponentsByCategory(category: ComponentCategory): PCComponent[] {
    return componentDatabase.filter((component) => component.category === category)
  }

  private selectBestComponent(
    components: PCComponent[],
    requirements: UserRequirements,
    allocatedBudget: number,
  ): PCComponent | null {
    let filtered = components.filter((component) => component.price <= allocatedBudget)

    // Apply brand preferences
    if (requirements.preferences.brand) {
      const brandFiltered = filtered.filter((component) => requirements.preferences.brand!.includes(component.brand))
      if (brandFiltered.length > 0) filtered = brandFiltered
    }

    // Apply RGB preference
    if (requirements.preferences.rgb && filtered.some((c) => c.specs.rgb)) {
      filtered = filtered.filter((component) => component.specs.rgb)
    }

    // Sort by performance score and price efficiency
    filtered.sort((a, b) => {
      const aEfficiency = a.performanceScore / a.price
      const bEfficiency = b.performanceScore / b.price
      return bEfficiency - aEfficiency
    })

    return filtered[0] || null
  }

  private calculateBudgetAllocation(requirements: UserRequirements): Record<ComponentCategory, number> {
    const { budget, primaryUse, performance } = requirements

    let allocation: Record<ComponentCategory, number>

    if (primaryUse.includes("gaming")) {
      // Gaming build - prioritize GPU and CPU
      allocation = {
        gpu: budget * 0.35,
        cpu: budget * 0.2,
        motherboard: budget * 0.1,
        ram: budget * 0.08,
        storage: budget * 0.08,
        psu: budget * 0.08,
        case: budget * 0.06,
        cooling: budget * 0.05,
      }
    } else if (primaryUse.includes("video-editing") || primaryUse.includes("3d-rendering")) {
      // Workstation build - prioritize CPU and RAM
      allocation = {
        cpu: budget * 0.3,
        gpu: budget * 0.25,
        ram: budget * 0.15,
        motherboard: budget * 0.1,
        storage: budget * 0.08,
        psu: budget * 0.07,
        case: budget * 0.03,
        cooling: budget * 0.02,
      }
    } else {
      // Balanced build
      allocation = {
        cpu: budget * 0.25,
        gpu: budget * 0.3,
        motherboard: budget * 0.12,
        ram: budget * 0.1,
        storage: budget * 0.1,
        psu: budget * 0.08,
        case: budget * 0.03,
        cooling: budget * 0.02,
      }
    }

    return allocation
  }

  private checkCompatibility(components: PCComponent[]): string[] {
    const issues: string[] = []

    const cpu = components.find((c) => c.category === "cpu")
    const motherboard = components.find((c) => c.category === "motherboard")
    const ram = components.find((c) => c.category === "ram")
    const gpu = components.find((c) => c.category === "gpu")
    const psu = components.find((c) => c.category === "psu")

    // Check CPU-Motherboard compatibility
    if (cpu && motherboard) {
      const cpuSocket = cpu.specs.socket
      const mbSocket = motherboard.specs.socket
      if (cpuSocket !== mbSocket) {
        issues.push(`CPU socket ${cpuSocket} is not compatible with motherboard socket ${mbSocket}`)
      }
    }

    // Check RAM-Motherboard compatibility
    if (ram && motherboard) {
      const ramType = ram.specs.speed.includes("DDR5") ? "DDR5" : "DDR4"
      if (!motherboard.compatibility.includes(ramType)) {
        issues.push(`${ramType} RAM is not compatible with this motherboard`)
      }
    }

    // Check power requirements
    if (psu && components.length > 0) {
      const totalPower = components.reduce((sum, component) => sum + (component.powerConsumption || 0), 0)
      const psuWattage = psu.specs.wattage
      if (totalPower > psuWattage * 0.8) {
        issues.push(`PSU wattage (${psuWattage}W) may be insufficient for total system power (${totalPower}W)`)
      }
    }

    return issues
  }

  public generateRecommendation(input: string): BuildRecommendation {
    const requirements = this.parseRequirements(input)
    const allocation = this.calculateBudgetAllocation(requirements)

    const components: PCComponent[] = []
    let totalPrice = 0

    // Select components in order of importance
    const categories: ComponentCategory[] = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooling"]

    for (const category of categories) {
      const availableComponents = this.getComponentsByCategory(category)
      const remainingBudget = requirements.budget - totalPrice
      const allocatedBudget = Math.min(allocation[category], remainingBudget)

      const selected = this.selectBestComponent(availableComponents, requirements, allocatedBudget)
      if (selected) {
        components.push(selected)
        totalPrice += selected.price
      }
    }

    const compatibilityIssues = this.checkCompatibility(components)
    const performanceScore =
      components.reduce((sum, component) => sum + component.performanceScore, 0) / components.length

    const reasoning = this.generateReasoning(requirements, components)

    return {
      components,
      totalPrice,
      performanceScore: Math.round(performanceScore),
      compatibilityIssues,
      reasoning,
    }
  }

  private generateReasoning(requirements: UserRequirements, components: PCComponent[]): string {
    const { primaryUse, budget, performance } = requirements
    const useCase = primaryUse.join(" and ")

    let reasoning = `Based on your $${budget} budget for ${useCase}, I've selected ${performance} components that offer excellent price-to-performance ratio. `

    const cpu = components.find((c) => c.category === "cpu")
    const gpu = components.find((c) => c.category === "gpu")

    if (cpu) {
      reasoning += `The ${cpu.name} provides ${cpu.specs.cores} cores and ${cpu.specs.threads} threads, perfect for your needs. `
    }

    if (gpu) {
      reasoning += `The ${gpu.name} with ${gpu.specs.memory} will handle your graphics requirements excellently. `
    }

    reasoning += `This build achieves a performance score of ${Math.round(components.reduce((sum, c) => sum + c.performanceScore, 0) / components.length)} while staying within budget.`

    return reasoning
  }
}
