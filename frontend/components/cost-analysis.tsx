"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Target, ArrowUpDown, Lightbulb, Star, AlertCircle } from "lucide-react"
import type { CostAnalysis } from "@/lib/cost-analyzer"
import type { PCComponent } from "@/lib/pc-components"

interface CostAnalysisProps {
  analysis: CostAnalysis
  components: PCComponent[]
  totalBudget: number
  onComponentReplace?: (oldComponent: PCComponent, newComponent: PCComponent) => void
}

const categoryColors = {
  cpu: "#0891b2",
  gpu: "#0ea5e9",
  motherboard: "#06b6d4",
  ram: "#67e8f9",
  storage: "#a5f3fc",
  psu: "#cffafe",
  case: "#f0f9ff",
  cooling: "#e0f7fa",
}

const categoryNames = {
  cpu: "CPU",
  gpu: "GPU",
  motherboard: "Motherboard",
  ram: "RAM",
  storage: "Storage",
  psu: "PSU",
  case: "Case",
  cooling: "Cooling",
}

export function CostAnalysis({ analysis, components, totalBudget, onComponentReplace }: CostAnalysisProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)

  const { breakdown, alternatives, budgetOptimization, priceEfficiency } = analysis

  const pieData = breakdown
    .filter((item) => item.spent > 0)
    .map((item) => ({
      name: categoryNames[item.category],
      value: item.spent,
      percentage: item.percentage,
    }))

  const barData = breakdown.map((item) => ({
    category: categoryNames[item.category],
    allocated: item.allocated,
    spent: item.spent,
    efficiency: item.efficiency,
  }))

  return (
    <div className="space-y-6">
      <Card className="border-2 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)]">
            <Target className="h-5 w-5 text-cyan-600" />
            Cost Analysis & Optimization
          </CardTitle>
          <CardDescription>Detailed breakdown of your build costs with optimization recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="breakdown" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="breakdown">Budget Breakdown</TabsTrigger>
              <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
              <TabsTrigger value="optimization">Optimization</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            </TabsList>

            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                categoryColors[
                                  breakdown.find((b) => categoryNames[b.category] === entry.name)?.category || "cpu"
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`$${value}`, "Cost"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Budget vs Actual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`$${value}`, ""]} />
                        <Legend />
                        <Bar dataKey="allocated" fill="#e2e8f0" name="Allocated" />
                        <Bar dataKey="spent" fill="#0891b2" name="Spent" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {breakdown.map((item) => (
                      <div key={item.category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: categoryColors[item.category] }} />
                          <span className="font-medium">{categoryNames[item.category]}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Allocated: ${item.allocated.toFixed(0)}</span>
                          <span className="font-semibold">${item.spent}</span>
                          <Badge variant={item.spent > item.allocated ? "destructive" : "default"}>
                            {item.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alternatives" className="space-y-4">
              <div className="grid gap-4">
                {components.map((component) => {
                  const componentAlternatives = alternatives[component.id] || []
                  if (componentAlternatives.length === 0) return null

                  return (
                    <Card key={component.id}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>Alternatives for {component.name}</span>
                          <Badge variant="outline">${component.price}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {componentAlternatives.map((alt, index) => (
                            <div
                              key={alt.component.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{alt.component.name}</span>
                                  <Badge
                                    variant={alt.priceDifference < 0 ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {alt.priceDifference > 0 ? "+" : ""}${alt.priceDifference}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{alt.reasoning}</p>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="flex items-center gap-1">
                                    {alt.performanceDifference > 0 ? (
                                      <TrendingUp className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 text-red-600" />
                                    )}
                                    Performance: {alt.performanceDifference > 0 ? "+" : ""}
                                    {alt.performanceDifference}
                                  </span>
                                  <span>Score: {alt.component.performanceScore}/100</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">${alt.component.price}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onComponentReplace?.(component, alt.component)}
                                >
                                  <ArrowUpDown className="h-3 w-3 mr-1" />
                                  Replace
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="optimization" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <TrendingDown className="h-5 w-5" />
                      Potential Savings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      ${budgetOptimization.canSave.toFixed(0)}
                    </div>
                    <p className="text-sm text-green-700">
                      You could save this much by choosing more cost-effective alternatives without significant
                      performance loss.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <TrendingUp className="h-5 w-5" />
                      Upgrade Potential
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      ${budgetOptimization.canUpgrade.toFixed(0)}
                    </div>
                    <p className="text-sm text-blue-700">
                      Available budget for upgrading components to improve overall performance.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    Optimization Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {budgetOptimization.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="efficiency" className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-cyan-200 bg-cyan-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-cyan-700">
                      <Target className="h-5 w-5" />
                      Efficiency Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-cyan-600 mb-2">{priceEfficiency.score}</div>
                    <p className="text-sm text-cyan-700">Overall price-to-performance ratio</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Star className="h-5 w-5" />
                      Best Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 mb-2">{priceEfficiency.bestValue.length}</div>
                    <p className="text-sm text-green-700">Components with excellent value</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertCircle className="h-5 w-5" />
                      Overpriced
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600 mb-2">{priceEfficiency.overpriced.length}</div>
                    <p className="text-sm text-orange-700">Components that could be optimized</p>
                  </CardContent>
                </Card>
              </div>

              {priceEfficiency.bestValue.length > 0 && (
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Star className="h-5 w-5" />
                      Best Value Components
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {priceEfficiency.bestValue.map((component) => (
                        <div key={component.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="font-medium">{component.name}</span>
                          <Badge className="bg-green-100 text-green-800">Excellent Value</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {priceEfficiency.overpriced.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertCircle className="h-5 w-5" />
                      Consider Alternatives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {priceEfficiency.overpriced.map((component) => (
                        <div key={component.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <span className="font-medium">{component.name}</span>
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            Check Alternatives
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
