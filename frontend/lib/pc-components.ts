export interface PCComponent {
  id: string
  name: string
  brand: string
  price: number
  category: ComponentCategory
  specs: Record<string, any>
  compatibility: string[]
  performanceScore: number
  powerConsumption?: number
  imageUrl?: string
}

export type ComponentCategory = "cpu" | "gpu" | "motherboard" | "ram" | "storage" | "psu" | "case" | "cooling"

export interface BuildRecommendation {
  components: PCComponent[]
  totalPrice: number
  performanceScore: number
  compatibilityIssues: string[]
  reasoning: string
}

// Sample component database
export const componentDatabase: PCComponent[] = [
  // CPUs
  {
    id: "cpu-1",
    name: "AMD Ryzen 7 7700X",
    brand: "AMD",
    price: 299,
    category: "cpu",
    specs: {
      cores: 8,
      threads: 16,
      baseClock: "4.5 GHz",
      boostClock: "5.4 GHz",
      socket: "AM5",
      tdp: 105,
    },
    compatibility: ["AM5"],
    performanceScore: 85,
    powerConsumption: 105,
  },
  {
    id: "cpu-2",
    name: "Intel Core i5-13600K",
    brand: "Intel",
    price: 319,
    category: "cpu",
    specs: {
      cores: 14,
      threads: 20,
      baseClock: "3.5 GHz",
      boostClock: "5.1 GHz",
      socket: "LGA1700",
      tdp: 125,
    },
    compatibility: ["LGA1700"],
    performanceScore: 82,
    powerConsumption: 125,
  },
  {
    id: "cpu-3",
    name: "AMD Ryzen 5 7600X",
    brand: "AMD",
    price: 229,
    category: "cpu",
    specs: {
      cores: 6,
      threads: 12,
      baseClock: "4.7 GHz",
      boostClock: "5.3 GHz",
      socket: "AM5",
      tdp: 105,
    },
    compatibility: ["AM5"],
    performanceScore: 78,
    powerConsumption: 105,
  },

  // GPUs
  {
    id: "gpu-1",
    name: "NVIDIA RTX 4070 Ti",
    brand: "NVIDIA",
    price: 799,
    category: "gpu",
    specs: {
      memory: "12GB GDDR6X",
      baseClock: "2310 MHz",
      boostClock: "2610 MHz",
      rayTracing: true,
      dlss: "3.0",
    },
    compatibility: ["PCIe 4.0"],
    performanceScore: 88,
    powerConsumption: 285,
  },
  {
    id: "gpu-2",
    name: "AMD RX 7800 XT",
    brand: "AMD",
    price: 499,
    category: "gpu",
    specs: {
      memory: "16GB GDDR6",
      baseClock: "1295 MHz",
      boostClock: "2430 MHz",
      rayTracing: true,
      fsr: "3.0",
    },
    compatibility: ["PCIe 4.0"],
    performanceScore: 82,
    powerConsumption: 263,
  },
  {
    id: "gpu-3",
    name: "NVIDIA RTX 4060",
    brand: "NVIDIA",
    price: 299,
    category: "gpu",
    specs: {
      memory: "8GB GDDR6",
      baseClock: "1830 MHz",
      boostClock: "2460 MHz",
      rayTracing: true,
      dlss: "3.0",
    },
    compatibility: ["PCIe 4.0"],
    performanceScore: 72,
    powerConsumption: 115,
  },

  // Motherboards
  {
    id: "mb-1",
    name: "ASUS ROG STRIX B650E-E",
    brand: "ASUS",
    price: 329,
    category: "motherboard",
    specs: {
      socket: "AM5",
      chipset: "B650E",
      ramSlots: 4,
      maxRam: "128GB",
      pciSlots: 3,
      wifi: true,
      bluetooth: true,
    },
    compatibility: ["AM5", "DDR5"],
    performanceScore: 85,
    powerConsumption: 25,
  },
  {
    id: "mb-2",
    name: "MSI MAG B760 TOMAHAWK",
    brand: "MSI",
    price: 189,
    category: "motherboard",
    specs: {
      socket: "LGA1700",
      chipset: "B760",
      ramSlots: 4,
      maxRam: "128GB",
      pciSlots: 2,
      wifi: false,
      bluetooth: false,
    },
    compatibility: ["LGA1700", "DDR4", "DDR5"],
    performanceScore: 78,
    powerConsumption: 20,
  },

  // RAM
  {
    id: "ram-1",
    name: "Corsair Vengeance DDR5-5600 32GB",
    brand: "Corsair",
    price: 149,
    category: "ram",
    specs: {
      capacity: "32GB",
      speed: "DDR5-5600",
      modules: 2,
      cas: 36,
      rgb: false,
    },
    compatibility: ["DDR5"],
    performanceScore: 88,
    powerConsumption: 10,
  },
  {
    id: "ram-2",
    name: "G.Skill Trident Z5 RGB DDR5-6000 16GB",
    brand: "G.Skill",
    price: 89,
    category: "ram",
    specs: {
      capacity: "16GB",
      speed: "DDR5-6000",
      modules: 2,
      cas: 30,
      rgb: true,
    },
    compatibility: ["DDR5"],
    performanceScore: 85,
    powerConsumption: 8,
  },

  // Storage
  {
    id: "storage-1",
    name: "Samsung 980 PRO 1TB NVMe",
    brand: "Samsung",
    price: 89,
    category: "storage",
    specs: {
      capacity: "1TB",
      type: "NVMe SSD",
      interface: "PCIe 4.0",
      readSpeed: "7000 MB/s",
      writeSpeed: "5000 MB/s",
    },
    compatibility: ["NVMe", "PCIe 4.0"],
    performanceScore: 92,
    powerConsumption: 7,
  },
  {
    id: "storage-2",
    name: "WD Black SN770 2TB NVMe",
    brand: "Western Digital",
    price: 149,
    category: "storage",
    specs: {
      capacity: "2TB",
      type: "NVMe SSD",
      interface: "PCIe 4.0",
      readSpeed: "5150 MB/s",
      writeSpeed: "4850 MB/s",
    },
    compatibility: ["NVMe", "PCIe 4.0"],
    performanceScore: 88,
    powerConsumption: 8,
  },

  // PSUs
  {
    id: "psu-1",
    name: "Corsair RM850x 850W 80+ Gold",
    brand: "Corsair",
    price: 149,
    category: "psu",
    specs: {
      wattage: 850,
      efficiency: "80+ Gold",
      modular: "Fully Modular",
      fanless: false,
    },
    compatibility: ["ATX"],
    performanceScore: 90,
    powerConsumption: 0,
  },
  {
    id: "psu-2",
    name: "EVGA SuperNOVA 750 G6 750W",
    brand: "EVGA",
    price: 119,
    category: "psu",
    specs: {
      wattage: 750,
      efficiency: "80+ Gold",
      modular: "Fully Modular",
      fanless: false,
    },
    compatibility: ["ATX"],
    performanceScore: 85,
    powerConsumption: 0,
  },

  // Cases
  {
    id: "case-1",
    name: "Fractal Design Define 7",
    brand: "Fractal Design",
    price: 169,
    category: "case",
    specs: {
      formFactor: "Mid Tower",
      maxGpuLength: "440mm",
      maxCpuCoolerHeight: "185mm",
      fans: 3,
      rgb: false,
    },
    compatibility: ["ATX", "mATX", "ITX"],
    performanceScore: 85,
    powerConsumption: 0,
  },

  // Cooling
  {
    id: "cooling-1",
    name: "Noctua NH-D15",
    brand: "Noctua",
    price: 109,
    category: "cooling",
    specs: {
      type: "Air Cooler",
      height: "165mm",
      tdpRating: 250,
      rgb: false,
      fanSpeed: "1500 RPM",
    },
    compatibility: ["AM5", "LGA1700"],
    performanceScore: 90,
    powerConsumption: 5,
  },
]
