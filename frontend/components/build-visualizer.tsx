"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Monitor, Eye, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import type { PCComponent } from "@/lib/pc-components"

interface BuildVisualizerProps {
  components: PCComponent[]
}

const componentPositions = {
  case: { x: 50, y: 50, width: 200, height: 300 },
  motherboard: { x: 70, y: 100, width: 160, height: 200 },
  cpu: { x: 90, y: 120, width: 40, height: 40 },
  ram: { x: 160, y: 120, width: 60, height: 15 },
  gpu: { x: 90, y: 180, width: 120, height: 30 },
  storage: { x: 200, y: 250, width: 40, height: 20 },
  psu: { x: 70, y: 280, width: 80, height: 40 },
  cooling: { x: 90, y: 120, width: 50, height: 50 },
}

const componentColors = {
  case: "#64748b",
  motherboard: "#16a34a",
  cpu: "#dc2626",
  ram: "#2563eb",
  gpu: "#7c3aed",
  storage: "#ea580c",
  psu: "#0891b2",
  cooling: "#06b6d4",
}

export function BuildVisualizer({ components }: BuildVisualizerProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"2d" | "exploded">("2d")
  const [zoom, setZoom] = useState(1)

  const getComponentByCategory = (category: string) => {
    return components.find((c) => c.category === category)
  }

  const renderComponent = (category: string, position: any, isExploded = false) => {
    const component = getComponentByCategory(category)
    if (!component) return null

    const explodedOffset = isExploded ? { x: (position.x - 150) * 0.3, y: (position.y - 200) * 0.3 } : { x: 0, y: 0 }
    const finalX = position.x + explodedOffset.x
    const finalY = position.y + explodedOffset.y

    return (
      <g
        key={category}
        className="cursor-pointer transition-all duration-300 hover:opacity-80"
        onClick={() => setSelectedComponent(selectedComponent === component.id ? null : component.id)}
      >
        <rect
          x={finalX}
          y={finalY}
          width={position.width}
          height={position.height}
          fill={componentColors[category as keyof typeof componentColors]}
          stroke={selectedComponent === component.id ? "#0891b2" : "#374151"}
          strokeWidth={selectedComponent === component.id ? 3 : 1}
          rx={4}
          className="transition-all duration-200"
        />
        <text
          x={finalX + position.width / 2}
          y={finalY + position.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
          className="font-medium pointer-events-none"
        >
          {category.toUpperCase()}
        </text>
        {selectedComponent === component.id && (
          <circle cx={finalX + position.width + 10} cy={finalY - 5} r="8" fill="#0891b2" className="animate-pulse" />
        )}
      </g>
    )
  }

  const selectedComponentData = selectedComponent ? components.find((c) => c.id === selectedComponent) : null

  return (
    <Card className="border-2 border-cyan-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <Eye className="h-5 w-5 text-cyan-600" />
              Build Visualizer
            </CardTitle>
            <CardDescription>Interactive 3D-style view of your PC build</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "2d" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("2d")}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              2D View
            </Button>
            <Button
              variant={viewMode === "exploded" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("exploded")}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Exploded
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">Visual Build</TabsTrigger>
            <TabsTrigger value="assembly">Assembly Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  disabled={zoom >= 2}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="outline" className="bg-cyan-50">
                Click components to inspect
              </Badge>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Visualization */}
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-4 overflow-hidden">
                  <svg
                    width="100%"
                    height="400"
                    viewBox={`0 0 ${300 / zoom} ${400 / zoom}`}
                    className="border rounded-lg bg-white shadow-inner"
                  >
                    {/* Background grid */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Render components */}
                    {Object.entries(componentPositions).map(([category, position]) =>
                      renderComponent(category, position, viewMode === "exploded"),
                    )}

                    {/* Connection lines for exploded view */}
                    {viewMode === "exploded" &&
                      Object.entries(componentPositions).map(([category, position]) => {
                        const component = getComponentByCategory(category)
                        if (!component || category === "case") return null

                        const explodedOffset = { x: (position.x - 150) * 0.3, y: (position.y - 200) * 0.3 }
                        const startX = position.x + position.width / 2
                        const startY = position.y + position.height / 2
                        const endX = startX + explodedOffset.x
                        const endY = startY + explodedOffset.y

                        return (
                          <line
                            key={`line-${category}`}
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            opacity="0.6"
                          />
                        )
                      })}
                  </svg>
                </div>
              </div>

              {/* Component Details */}
              <div className="space-y-4">
                {selectedComponentData ? (
                  <Card className="border-cyan-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{selectedComponentData.name}</CardTitle>
                      <CardDescription>{selectedComponentData.brand}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Price</span>
                        <Badge variant="outline">${selectedComponentData.price}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Performance</span>
                        <Badge variant="outline">{selectedComponentData.performanceScore}/100</Badge>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Specifications</span>
                        <div className="space-y-1">
                          {Object.entries(selectedComponentData.specs)
                            .slice(0, 4)
                            .map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-muted-foreground capitalize">{key}:</span>
                                <span>{value}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-gray-300">
                    <CardContent className="p-6 text-center">
                      <Monitor className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click on a component to view details</p>
                    </CardContent>
                  </Card>
                )}

                {/* Component Legend */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Components</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(componentColors).map(([category, color]) => {
                        const component = getComponentByCategory(category)
                        return (
                          <div key={category} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                            <span className="capitalize">{category}</span>
                            {component ? (
                              <Badge variant="outline" className="text-xs ml-auto">
                                ✓
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs ml-auto opacity-50">
                                -
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assembly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assembly Order</CardTitle>
                <CardDescription>Recommended order for building your PC</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      component: "case",
                      title: "Prepare the Case",
                      description: "Remove side panels and install standoffs",
                    },
                    {
                      step: 2,
                      component: "psu",
                      title: "Install Power Supply",
                      description: "Mount PSU with fan facing down if case has ventilation",
                    },
                    {
                      step: 3,
                      component: "motherboard",
                      title: "Prepare Motherboard",
                      description: "Install outside the case first",
                    },
                    {
                      step: 4,
                      component: "cpu",
                      title: "Install CPU",
                      description: "Carefully place CPU in socket, no force needed",
                    },
                    {
                      step: 5,
                      component: "cooling",
                      title: "Install CPU Cooler",
                      description: "Apply thermal paste if not pre-applied",
                    },
                    {
                      step: 6,
                      component: "ram",
                      title: "Install RAM",
                      description: "Press firmly until clips snap into place",
                    },
                    {
                      step: 7,
                      component: "storage",
                      title: "Install Storage",
                      description: "Mount SSDs and connect SATA/NVMe drives",
                    },
                    {
                      step: 8,
                      component: "gpu",
                      title: "Install Graphics Card",
                      description: "Insert into top PCIe slot and secure with screws",
                    },
                  ].map((item) => {
                    const component = getComponentByCategory(item.component)
                    return (
                      <div key={item.step} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.title}</h4>
                            {component && (
                              <Badge variant="outline" className="text-xs">
                                {component.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {component ? (
                            <Badge className="bg-green-100 text-green-800">Ready</Badge>
                          ) : (
                            <Badge variant="outline" className="opacity-50">
                              Not Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
