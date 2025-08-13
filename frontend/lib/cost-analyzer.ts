import { componentDatabase, type PCComponent, type ComponentCategory } from "./pc-components"

export interface CostBreakdown {
  category: ComponentCategory
  allocated: number
  spent: number
  percentage: number
  efficiency: number
}

export interface AlternativeComponent {
  component: PCComponent
  priceDifference: number
  performanceDifference: number
  reasoning: string
}

export interface CostAnalysis {
  breakdown: CostBreakdown[]
  alternatives: Record<string, AlternativeComponent[]>
  budgetOptimization: {
    canSave: number
    canUpgrade: number
    recommendations: string[]
  }
  priceEfficiency: {
    score: number
    bestValue: PCComponent[]
    overpriced: PCComponent[]
  }
}

export class CostAnalyzer {
  private calculateBudgetBreakdown(
    components: PCComponent[],
    totalBudget: number,
    allocation: Record<ComponentCategory, number>,
  ): CostBreakdown[] {
    const breakdown: CostBreakdown[] = []

    const categories: ComponentCategory[] = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooling"]

    for (const category of categories) {
      const component = components.find((c) => c.category === category)
      const allocated = allocation[category]
      const spent = component?.price || 0
      const percentage = (spent / totalBudget) * 100
      const efficiency = component ? component.performanceScore / component.price : 0

      breakdown.push({
        category,
        allocated,
        spent,
        percentage,
        efficiency: efficiency * 1000, // Scale for better readability
      })
    }

    return breakdown.sort((a, b) => b.spent - a.spent)
  }

  private findAlternatives(component: PCComponent, budget: number): AlternativeComponent[] {
    const alternatives = componentDatabase
      .filter((c) => c.category === component.category && c.id !== component.id)
      .map((alt) => {
        const priceDifference = alt.price - component.price
        const performanceDifference = alt.performanceScore - component.performanceScore

        let reasoning = ""
        if (priceDifference < 0 && performanceDifference >= -5) {
          reasoning = "Better value - similar performance for less money"
        } else if (priceDifference > 0 && performanceDifference > 10) {
          reasoning = "Performance upgrade - significantly better for the price increase"
        } else if (priceDifference < -50) {
          reasoning = "Budget option - save money with minimal performance loss"
        } else if (performanceDifference > 15) {
          reasoning = "Premium option - top-tier performance"
        } else {
          reasoning = "Alternative option with different trade-offs"
        }

        return {
          component: alt,
          priceDifference,
          performanceDifference,
          reasoning,
        }
      })
      .filter((alt) => alt.component.price <= budget * 1.2) // Allow 20% over budget for upgrades
      .sort((a, b) => {
        // Sort by value efficiency (performance gain per dollar)
        const aEfficiency = a.performanceDifference / Math.abs(a.priceDifference || 1)
        const bEfficiency = b.performanceDifference / Math.abs(b.priceDifference || 1)
        return bEfficiency - aEfficiency
      })
      .slice(0, 3) // Top 3 alternatives

    return alternatives
  }

  private generateOptimizationRecommendations(
    components: PCComponent[],
    breakdown: CostBreakdown[],
    totalBudget: number,
  ): {
    canSave: number
    canUpgrade: number
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let canSave = 0
    let canUpgrade = 0

    // Find overspending categories
    const overspent = breakdown.filter((b) => b.spent > b.allocated * 1.2)
    const underspent = breakdown.filter((b) => b.spent < b.allocated * 0.8)

    if (overspent.length > 0) {
      const category = overspent[0].category
      const savings = overspent[0].spent - overspent[0].allocated
      canSave += savings
      recommendations.push(
        `Consider a more budget-friendly ${category} to save $${Math.round(savings)} while maintaining good performance`,
      )
    }

    if (underspent.length > 0) {
      const category = underspent[0].category
      const available = underspent[0].allocated - underspent[0].spent
      canUpgrade += available
      recommendations.push(
        `You have $${Math.round(available)} left in your ${category} budget - consider upgrading for better performance`,
      )
    }

    // Check for bottlenecks
    const cpu = components.find((c) => c.category === "cpu")
    const gpu = components.find((c) => c.category === "gpu")

    if (cpu && gpu) {
      const performanceDiff = Math.abs(cpu.performanceScore - gpu.performanceScore)
      if (performanceDiff > 20) {
        const weaker = cpu.performanceScore < gpu.performanceScore ? "CPU" : "GPU"
        recommendations.push(`Consider upgrading your ${weaker} to better match your system balance`)
      }
    }

    // Budget utilization
    const totalSpent = components.reduce((sum, c) => sum + c.price, 0)
    const budgetUtilization = (totalSpent / totalBudget) * 100

    if (budgetUtilization < 85) {
      const remaining = totalBudget - totalSpent
      recommendations.push(`You have $${Math.round(remaining)} remaining - consider upgrading key components`)
    } else if (budgetUtilization > 105) {
      const overage = totalSpent - totalBudget
      recommendations.push(`Build is $${Math.round(overage)} over budget - consider more affordable alternatives`)
    }

    return { canSave, canUpgrade, recommendations }
  }

  public analyzeCosts(
    components: PCComponent[],
    totalBudget: number,
    allocation: Record<ComponentCategory, number>,
  ): CostAnalysis {
    const breakdown = this.calculateBudgetBreakdown(components, totalBudget, allocation)

    const alternatives: Record<string, AlternativeComponent[]> = {}
    for (const component of components) {
      alternatives[component.id] = this.findAlternatives(component, totalBudget)
    }

    const budgetOptimization = this.generateOptimizationRecommendations(components, breakdown, totalBudget)

    // Calculate price efficiency
    const avgEfficiency = components.reduce((sum, c) => sum + c.performanceScore / c.price, 0) / components.length
    const bestValue = components.filter((c) => c.performanceScore / c.price > avgEfficiency * 1.2)
    const overpriced = components.filter((c) => c.performanceScore / c.price < avgEfficiency * 0.8)

    const priceEfficiency = {
      score: Math.round(avgEfficiency * 1000),
      bestValue,
      overpriced,
    }

    return {
      breakdown,
      alternatives,
      budgetOptimization,
      priceEfficiency,
    }
  }
}
