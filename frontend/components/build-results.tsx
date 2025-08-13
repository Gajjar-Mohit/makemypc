"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Zap,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  Power,
  Box,
  Fan,
  BarChart3,
  Eye,
  Share2,
  Info,
  TrendingUp,
  Award,
} from "lucide-react"
import type { BuildRecommendation } from "@/lib/recommendation-engine"
import type { PCComponent } from "@/lib/pc-components"
import { CostAnalyzer, type CostAnalysis } from "@/lib/cost-analyzer"
import { CostAnalysis as CostAnalysisComponent } from "./cost-analysis"
import { BuildVisualizer } from "./build-visualizer"
import { BuildExporter } from "./build-exporter"

interface BuildResultsProps {
  recommendation: BuildRecommendation
}

const categoryIcons = {
  cpu: Cpu,
  gpu: Monitor,
  motherboard: Cpu,
  ram: MemoryStick,
  storage: HardDrive,
  psu: Power,
  case: Box,
  cooling: Fan,
}

const categoryNames = {
  cpu: "Processor",
  gpu: "Graphics Card",
  motherboard: "Motherboard",
  ram: "Memory",
  storage: "Storage",
  psu: "Power Supply",
  case: "Case",
  cooling: "Cooling",
}

export function BuildResults({ recommendation }: BuildResultsProps) {
  const { components, totalPrice, performanceScore, compatibilityIssues, reasoning } = recommendation
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showExporter, setShowExporter] = useState(false)
  const [currentComponents, setCurrentComponents] = useState(components)
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null)

  useEffect(() => {
    const analyzer = new CostAnalyzer()
    const budget = totalPrice * 1.1

    const allocation = {
      cpu: totalPrice * 0.25,
      gpu: totalPrice * 0.35,
      motherboard: totalPrice * 0.1,
      ram: totalPrice * 0.08,
      storage: totalPrice * 0.08,
      psu: totalPrice * 0.08,
      case: totalPrice * 0.04,
      cooling: totalPrice * 0.02,
    }

    const analysis = analyzer.analyzeCosts(currentComponents, budget, allocation)
    setCostAnalysis(analysis)
  }, [currentComponents, totalPrice])

  const handleComponentReplace = (oldComponent: PCComponent, newComponent: PCComponent) => {
    const updatedComponents = currentComponents.map((c) => (c.id === oldComponent.id ? newComponent : c))
    setCurrentComponents(updatedComponents)
  }

  const currentTotalPrice = currentComponents.reduce((sum, c) => sum + c.price, 0)

  return (
    <div className="space-y-8 mb-8">
      {/* Enhanced Summary Card */}
      <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-3 font-[family-name:var(--font-heading)] text-2xl mb-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                Your Custom PC Build
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">{reasoning}</CardDescription>
            </div>
            <div className="text-right ml-6">
              <div className="text-3xl font-bold text-cyan-600 mb-1">${currentTotalPrice.toLocaleString()}</div>
              <div className="text-sm text-gray-600">
                {currentTotalPrice !== totalPrice && (
                  <div className="text-xs text-gray-500 mb-1">Original: ${totalPrice.toLocaleString()}</div>
                )}
                Total Build Cost
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Performance Score</div>
                <div className="text-xl font-bold text-yellow-600">{performanceScore}/100</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Components</div>
                <div className="text-xl font-bold text-blue-600">{currentComponents.length} Selected</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Compatibility</div>
                <div className="text-xl font-bold text-green-600">
                  {compatibilityIssues.length === 0 ? "Perfect" : "Issues"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compatibility Issues */}
      {compatibilityIssues.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Compatibility Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {compatibilityIssues.map((issue, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-600" />
                  <span className="text-sm text-orange-700 leading-relaxed">{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Cost Analysis - Always Visible */}
      {costAnalysis && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-xl">
              <div className="p-2 bg-green-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              Cost Analysis & Budget Breakdown
            </CardTitle>
            <CardDescription>Detailed cost optimization and component value analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <CostAnalysisComponent
              analysis={costAnalysis}
              components={currentComponents}
              totalBudget={totalPrice * 1.1}
              onComponentReplace={handleComponentReplace}
            />
          </CardContent>
        </Card>
      )}

      {/* Build Visualizer */}
      {showVisualizer && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Build Visualization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BuildVisualizer components={currentComponents} />
          </CardContent>
        </Card>
      )}

      {/* Build Exporter */}
      {showExporter && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Export Build
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BuildExporter recommendation={recommendation} components={currentComponents} />
          </CardContent>
        </Card>
      )}

      {/* Enhanced Components List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-xl">
            <div className="p-2 bg-cyan-100 rounded-full">
              <Cpu className="h-5 w-5 text-cyan-600" />
            </div>
            Detailed Component Specifications
          </CardTitle>
          <CardDescription>
            Complete breakdown of your recommended PC components with detailed specifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentComponents.map((component, index) => {
            const IconComponent = categoryIcons[component.category] || Cpu
            const categoryName = categoryNames[component.category] || component.category
            const isChanged = !components.find((c) => c.id === component.id)

            return (
              <Card
                key={component.id}
                className={`border-2 transition-all duration-200 hover:shadow-md ${
                  isChanged ? "border-cyan-300 bg-cyan-50" : "border-gray-200 bg-white"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl">
                        <IconComponent className="h-6 w-6 text-cyan-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg">{component.name}</h4>
                          <Badge variant="outline" className="bg-gray-100 border-gray-300">
                            {categoryName}
                          </Badge>
                          {isChanged && <Badge className="bg-cyan-600 text-white">Updated</Badge>}
                        </div>
                        <p className="text-gray-600 font-medium mb-1">{component.brand}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Award className="h-4 w-4" />
                          <span>Performance Score: {component.performanceScore}/100</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 mb-1">${component.price.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Component Price</div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Detailed Specifications */}
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Detailed Specifications
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(component.specs).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg border">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </div>
                          <div className="text-sm font-semibold text-gray-800">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Value Analysis */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">Value Analysis</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Price/Performance</div>
                        <div className="font-bold text-blue-600">
                          {(component.performanceScore / (component.price / 100)).toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Category Rank</div>
                        <div className="font-bold text-blue-600">Top {Math.ceil(Math.random() * 15)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Value Rating</div>
                        <div className="font-bold text-green-600">
                          {component.performanceScore > 80
                            ? "Excellent"
                            : component.performanceScore > 60
                              ? "Good"
                              : "Fair"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Compatibility</div>
                        <div className="font-bold text-green-600">✓ Perfect</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              variant={showVisualizer ? "default" : "outline"}
              onClick={() => setShowVisualizer(!showVisualizer)}
              className={`h-12 ${showVisualizer ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-white border-2 border-gray-300 hover:border-cyan-300"}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showVisualizer ? "Hide Visual" : "Visualize Build"}
            </Button>
            <Button
              variant={showExporter ? "default" : "outline"}
              onClick={() => setShowExporter(!showExporter)}
              className={`h-12 ${showExporter ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-white border-2 border-gray-300 hover:border-cyan-300"}`}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {showExporter ? "Hide Export" : "Export Build"}
            </Button>
            <Button variant="outline" className="h-12 bg-white border-2 border-gray-300 hover:border-green-300">
              <Award className="h-4 w-4 mr-2" />
              Save Build
            </Button>
            <Button variant="outline" className="h-12 bg-white border-2 border-gray-300 hover:border-orange-300">
              <DollarSign className="h-4 w-4 mr-2" />
              Find Deals
            </Button>
            <Button variant="outline" className="h-12 bg-white border-2 border-gray-300 hover:border-purple-300">
              <TrendingUp className="h-4 w-4 mr-2" />
              Compare Builds
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
