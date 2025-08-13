"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Cpu, Monitor, Zap, DollarSign, Sparkles } from "lucide-react"
import { RecommendationEngine, type BuildRecommendation } from "@/lib/recommendation-engine"
import { BuildResults } from "./build-results"
import { AdvancedFilters, type FilterState } from "./advanced-filters"
import { ErrorBoundary } from "./error-boundary"

export function PCBuilderInterface() {
  const [requirements, setRequirements] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [recommendation, setRecommendation] = useState<BuildRecommendation | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    budget: [500, 5000],
    useCase: [],
    brands: [],
    performance: "any",
    compatibility: [],
    features: [],
    searchQuery: "",
  })
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!requirements.trim()) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const engine = new RecommendationEngine()

      // Enhanced requirements with filter context
      const enhancedRequirements = `
        ${requirements}
        
        Budget range: $${filters.budget[0]} - $${filters.budget[1]}
        ${filters.useCase.length > 0 ? `Primary use cases: ${filters.useCase.join(", ")}` : ""}
        ${filters.brands.length > 0 ? `Preferred brands: ${filters.brands.join(", ")}` : ""}
        ${filters.performance !== "any" ? `Performance tier: ${filters.performance}` : ""}
        ${filters.features.length > 0 ? `Desired features: ${filters.features.join(", ")}` : ""}
      `.trim()

      const result = engine.generateRecommendation(enhancedRequirements)
      setRecommendation(result)
    } catch (err) {
      setError("Failed to generate recommendations. Please try again.")
      console.error("Recommendation error:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const exampleRequirements = [
    "Gaming PC for 4K gaming under $2000",
    "Video editing workstation with 32GB RAM",
    "Budget office computer for basic tasks",
    "High-end streaming setup with RGB lighting",
  ]

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 bg-cyan-600 rounded-lg">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-heading)] bg-gradient-to-r from-cyan-600 to-cyan-800 bg-clip-text text-transparent">
                MakeMyPC
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-2">Ready to build your dream PC? Tell us what you need!</p>
            <p className="text-sm text-muted-foreground">
              Describe your requirements in plain English and get personalized component recommendations
            </p>
          </div>
        </div>

        {/* Advanced Filters */}
        <AdvancedFilters
          onFiltersChange={setFilters}
          isVisible={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
        />

        {/* Main Input Interface */}
        <Card className="mb-8 border-2 border-cyan-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              Describe Your Perfect PC
            </CardTitle>
            <CardDescription>
              Tell us about your budget, intended use, performance needs, and any specific preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: I need a gaming PC for 1440p gaming with a budget of $1500. I want to play the latest AAA games at high settings and maybe do some streaming. I prefer NVIDIA graphics and would like RGB lighting..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="min-h-32 resize-none border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400"
              aria-label="PC requirements description"
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Quick examples:</span>
                {exampleRequirements.slice(0, 2).map((example, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-cyan-50 hover:border-cyan-300 text-xs transition-colors"
                    onClick={() => setRequirements(example)}
                  >
                    {example}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                {!showFilters && (
                  <Button variant="outline" onClick={() => setShowFilters(true)} className="bg-transparent">
                    Advanced
                  </Button>
                )}
                <Button
                  onClick={handleAnalyze}
                  disabled={!requirements.trim() || isAnalyzing}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Get Recommendations
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {recommendation && <BuildResults recommendation={recommendation} />}

        {/* Feature Preview Cards - only show when no recommendation */}
        {!recommendation && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-cyan-100 hover:border-cyan-200 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Cpu className="h-4 w-4 text-cyan-600" />
                    </div>
                    <CardTitle className="text-lg font-[family-name:var(--font-heading)]">Smart Matching</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    AI-powered component selection based on your specific needs and compatibility requirements
                  </p>
                </CardContent>
              </Card>

              <Card className="border-cyan-100 hover:border-cyan-200 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-cyan-600" />
                    </div>
                    <CardTitle className="text-lg font-[family-name:var(--font-heading)]">Cost Optimization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Get the best performance per dollar with real-time pricing and budget optimization
                  </p>
                </CardContent>
              </Card>

              <Card className="border-cyan-100 hover:border-cyan-200 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Monitor className="h-4 w-4 text-cyan-600" />
                    </div>
                    <CardTitle className="text-lg font-[family-name:var(--font-heading)]">Visual Builder</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    See your build come together with 3D visualization and compatibility checking
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Examples */}
            <Card className="border-dashed border-cyan-200">
              <CardHeader>
                <CardTitle className="text-lg font-[family-name:var(--font-heading)] text-center">
                  Need inspiration? Try these examples:
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {exampleRequirements.map((example, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-cyan-50 hover:border-cyan-300 p-3 h-auto text-left justify-start text-wrap transition-colors"
                      onClick={() => setRequirements(example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ErrorBoundary>
  )
}
