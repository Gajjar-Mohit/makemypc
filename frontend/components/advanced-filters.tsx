"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Filter, X, Search, SlidersHorizontal } from "lucide-react"

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  isVisible: boolean
  onToggle: () => void
}

export interface FilterState {
  budget: [number, number]
  useCase: string[]
  brands: string[]
  performance: string
  compatibility: string[]
  features: string[]
  searchQuery: string
}

const defaultFilters: FilterState = {
  budget: [500, 5000],
  useCase: [],
  brands: [],
  performance: "any",
  compatibility: [],
  features: [],
  searchQuery: "",
}

export function AdvancedFilters({ onFiltersChange, isVisible, onToggle }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    onFiltersChange(updated)
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = filters[key] as string[]
    const updated = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value]
    updateFilters({ [key]: updated })
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border-2 border-cyan-200 hover:border-cyan-300"
      >
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Advanced Filters
      </Button>
    )
  }

  return (
    <Card className="border-2 border-cyan-200 mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <Filter className="h-5 w-5 text-cyan-600" />
              Advanced Filters
            </CardTitle>
            <CardDescription>Refine your PC build recommendations</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="bg-transparent">
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={onToggle} className="bg-transparent">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Components</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by component name, brand, or specs..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Budget Range */}
        <div className="space-y-3">
          <Label>
            Budget Range: ${filters.budget[0]} - ${filters.budget[1]}
          </Label>
          <Slider
            value={filters.budget}
            onValueChange={(value) => updateFilters({ budget: value as [number, number] })}
            max={10000}
            min={200}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>$200</span>
            <span>$10,000+</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Use Cases */}
          <div className="space-y-3">
            <Label>Primary Use Cases</Label>
            <div className="space-y-2">
              {["Gaming", "Video Editing", "3D Rendering", "Office Work", "Streaming", "Programming"].map((useCase) => (
                <div key={useCase} className="flex items-center space-x-2">
                  <Checkbox
                    id={useCase}
                    checked={filters.useCase.includes(useCase.toLowerCase().replace(" ", "-"))}
                    onCheckedChange={() => toggleArrayFilter("useCase", useCase.toLowerCase().replace(" ", "-"))}
                  />
                  <Label htmlFor={useCase} className="text-sm font-normal">
                    {useCase}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div className="space-y-3">
            <Label>Preferred Brands</Label>
            <div className="space-y-2">
              {["Intel", "AMD", "NVIDIA", "ASUS", "MSI", "Corsair", "Samsung", "Western Digital"].map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={brand}
                    checked={filters.brands.includes(brand)}
                    onCheckedChange={() => toggleArrayFilter("brands", brand)}
                  />
                  <Label htmlFor={brand} className="text-sm font-normal">
                    {brand}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Tier */}
        <div className="space-y-2">
          <Label htmlFor="performance">Performance Tier</Label>
          <Select value={filters.performance} onValueChange={(value) => updateFilters({ performance: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select performance tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Performance Level</SelectItem>
              <SelectItem value="budget">Budget (Good for basic tasks)</SelectItem>
              <SelectItem value="mid-range">Mid-Range (Great for most users)</SelectItem>
              <SelectItem value="high-end">High-End (Enthusiast level)</SelectItem>
              <SelectItem value="extreme">Extreme (No compromises)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <Label>Desired Features</Label>
          <div className="flex flex-wrap gap-2">
            {["RGB Lighting", "Quiet Operation", "Overclocking", "WiFi 6", "USB-C", "Ray Tracing", "4K Gaming"].map(
              (feature) => (
                <Badge
                  key={feature}
                  variant={filters.features.includes(feature.toLowerCase().replace(" ", "-")) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-cyan-100 hover:border-cyan-300"
                  onClick={() => toggleArrayFilter("features", feature.toLowerCase().replace(" ", "-"))}
                >
                  {feature}
                </Badge>
              ),
            )}
          </div>
        </div>

        {/* Active Filters Summary */}
        {(filters.useCase.length > 0 || filters.brands.length > 0 || filters.features.length > 0) && (
          <div className="pt-4 border-t">
            <Label className="mb-2 block">Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {filters.useCase.map((use) => (
                <Badge key={use} variant="secondary" className="bg-cyan-100 text-cyan-800">
                  {use.replace("-", " ")}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleArrayFilter("useCase", use)} />
                </Badge>
              ))}
              {filters.brands.map((brand) => (
                <Badge key={brand} variant="secondary" className="bg-blue-100 text-blue-800">
                  {brand}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleArrayFilter("brands", brand)} />
                </Badge>
              ))}
              {filters.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="bg-green-100 text-green-800">
                  {feature.replace("-", " ")}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleArrayFilter("features", feature)} />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
