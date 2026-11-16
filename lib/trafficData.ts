import { Project, Conflict } from "./types";

export type TrafficLevel = "FREE_FLOW" | "MODERATE" | "HEAVY" | "CRITICAL_BOTTLENECK";

export interface TrafficSegment {
  id: string;
  road_name: string;
  road_type: "Arterial" | "Residential";
  coordinates: [number, number][]; // LineString [[lng, lat], ...]
  lanes_total: number;
  lanes_open: number;
  base_speed_kmh: number;
  current_speed_kmh: number;
  congestion_score: number; // 0 to 100
  level: TrafficLevel;
  delay_mins: number;
  color: string;
  glow_color: string;
  cause: string;
  is_construction_impacted: boolean;
  impacted_by_project_id?: string;
  impacted_by_project_title?: string;
  alternate_detour_name?: string;
  detour_coordinates?: [number, number][];
}

export interface PeakPeriodPreset {
  id: string;
  label: string;
  hour: number;
  timeDisplay: string;
  periodName: "Morning Peak" | "Midday Normal" | "Evening Peak" | "Night Shift";
  description: string;
  icon: string;
  headlineMetric: string;
}

export interface CityTrafficSnapshot {
  hourOfDay: number;
  timeString: string;
  activePeriod: PeakPeriodPreset;
  cityCongestionScore: number; // 0-100
  avgSpeedKmh: number;
  totalDelayMins: number;
  activeBottlenecksCount: number;
  activeLaneClosuresCount: number;
  segments: TrafficSegment[];
  corridorAdvisories: string[];
}

export const PEAK_PERIOD_PRESETS: PeakPeriodPreset[] = [
  {
    id: "morning-peak",
    label: "Morning Peak",
    hour: 8.5, // 08:30 AM
    timeDisplay: "08:30 AM",
    periodName: "Morning Peak",
    description: "Intense commuter rush towards Mira Road Railway Station and Western Express Highway NH-48.",
    icon: "🌅",
    headlineMetric: "Severe Station & Highway Congestion (Avg Speed: 12 km/h)",
  },
  {
    id: "midday-regular",
    label: "Midday Regular",
    hour: 13.0, // 01:00 PM
    timeDisplay: "01:00 PM",
    periodName: "Midday Normal",
    description: "Moderate commercial deliveries, municipal maintenance, and local school buses.",
    icon: "☀️",
    headlineMetric: "Optimal Freight & Utility Window (Avg Speed: 34 km/h)",
  },
  {
    id: "evening-peak",
    label: "Evening Peak",
    hour: 19.0, // 07:00 PM
    timeDisplay: "07:00 PM",
    periodName: "Evening Peak",
    description: "Mass return commuter inflow from Mumbai local trains into Shanti Park, Kanakia & Beverly Park.",
    icon: "🌆",
    headlineMetric: "Critical Inflow Gridlock on Kanakia & Shanti Park (Avg Speed: 9 km/h)",
  },
  {
    id: "night-shift",
    label: "Night Shift Works",
    hour: 23.5, // 11:30 PM
    timeDisplay: "11:30 PM",
    periodName: "Night Shift",
    description: "Minimal vehicular load (Free Flow). Official MBMC designated window for heavy asphalt milling & pipe-jacking.",
    icon: "🌙",
    headlineMetric: "Zero Congestion Penalty Window (Avg Speed: 48 km/h)",
  },
];

// Master Geometry Definition of Real Mira Road Arterials & Corridors
const MIRA_ROAD_NETWORK_GEOMETRIES: {
  id: string;
  road_name: string;
  road_type: "Arterial" | "Residential";
  lanes: number;
  base_speed: number;
  coords: [number, number][];
  detour_name: string;
  detour_coords: [number, number][];
}[] = [
  {
    id: "TRF-CORR-001",
    road_name: "Mira Bhayandar Road",
    road_type: "Arterial",
    lanes: 6,
    base_speed: 45,
    coords: [
      [72.8520, 19.2815],
      [72.8570, 19.2825],
      [72.8625, 19.2840],
      [72.8685, 19.2858],
      [72.8750, 19.2880],
    ],
    detour_name: "Divert via 150 Feet Road Bypass & Silver Park Lane",
    detour_coords: [
      [72.8520, 19.2815],
      [72.8525, 19.2890],
      [72.8610, 19.2910],
      [72.8710, 19.2890],
      [72.8750, 19.2880],
    ],
  },
  {
    id: "TRF-CORR-002",
    road_name: "Station Road (Mira Road East)",
    road_type: "Arterial",
    lanes: 4,
    base_speed: 30,
    coords: [
      [72.8530, 19.2790],
      [72.8545, 19.2805],
      [72.8560, 19.2820],
      [72.8580, 19.2835],
    ],
    detour_name: "Divert via Shanti Nagar Internal Sector 2 Ring Road",
    detour_coords: [
      [72.8530, 19.2790],
      [72.8510, 19.2795],
      [72.8520, 19.2830],
      [72.8580, 19.2835],
    ],
  },
  {
    id: "TRF-CORR-003",
    road_name: "Kanakia Road",
    road_type: "Arterial",
    lanes: 4,
    base_speed: 38,
    coords: [
      [72.8585, 19.2820],
      [72.8620, 19.2805],
      [72.8670, 19.2790],
      [72.8720, 19.2775],
    ],
    detour_name: "Divert via Beverly Park South Link",
    detour_coords: [
      [72.8585, 19.2820],
      [72.8615, 19.2855],
      [72.8680, 19.2820],
      [72.8720, 19.2775],
    ],
  },
  {
    id: "TRF-CORR-004",
    road_name: "Shanti Park Main Avenue",
    road_type: "Arterial",
    lanes: 4,
    base_speed: 35,
    coords: [
      [72.8590, 19.2805],
      [72.8615, 19.2818],
      [72.8645, 19.2835],
      [72.8670, 19.2850],
    ],
    detour_name: "Divert via Shanti Garden Society Parallel Arterial",
    detour_coords: [
      [72.8590, 19.2805],
      [72.8605, 19.2785],
      [72.8655, 19.2810],
      [72.8670, 19.2850],
    ],
  },
  {
    id: "TRF-CORR-005",
    road_name: "150 Feet Road",
    road_type: "Arterial",
    lanes: 6,
    base_speed: 50,
    coords: [
      [72.8510, 19.2880],
      [72.8525, 19.2920],
      [72.8540, 19.2955],
      [72.8560, 19.2990],
    ],
    detour_name: "Divert via Maxus Mall Ring Service Road",
    detour_coords: [
      [72.8510, 19.2880],
      [72.8490, 19.2925],
      [72.8520, 19.2965],
      [72.8560, 19.2990],
    ],
  },
  {
    id: "TRF-CORR-006",
    road_name: "Beverly Park Avenue",
    road_type: "Arterial",
    lanes: 4,
    base_speed: 40,
    coords: [
      [72.8610, 19.2830],
      [72.8635, 19.2860],
      [72.8655, 19.2890],
      [72.8680, 19.2915],
    ],
    detour_name: "Divert via Jangid Complex Internal 30m Road",
    detour_coords: [
      [72.8610, 19.2830],
      [72.8590, 19.2865],
      [72.8630, 19.2905],
      [72.8680, 19.2915],
    ],
  },
  {
    id: "TRF-CORR-007",
    road_name: "Western Express Highway Junction",
    road_type: "Arterial",
    lanes: 8,
    base_speed: 60,
    coords: [
      [72.8750, 19.2780],
      [72.8785, 19.2810],
      [72.8815, 19.2845],
      [72.8845, 19.2875],
    ],
    detour_name: "Divert via Ghodbunder Road Interchange Flyover Slipway",
    detour_coords: [
      [72.8750, 19.2780],
      [72.8740, 19.2825],
      [72.8800, 19.2860],
      [72.8845, 19.2875],
    ],
  },
  {
    id: "TRF-CORR-008",
    road_name: "Silver Park Residential Lane",
    road_type: "Residential",
    lanes: 2,
    base_speed: 25,
    coords: [
      [72.8570, 19.2820],
      [72.8585, 19.2835],
      [72.8600, 19.2850],
    ],
    detour_name: "Divert via Pleasant Park Connector",
    detour_coords: [
      [72.8570, 19.2820],
      [72.8560, 19.2840],
      [72.8600, 19.2850],
    ],
  },
];

export function simulateTrafficConditions(
  hour: number,
  activeProjects: Project[] = [],
  activeConflicts: Conflict[] = []
): CityTrafficSnapshot {
  // Normalize hour 0 to 23.99
  const h = Math.max(0, Math.min(23.99, hour));

  // Determine current active peak period preset
  let activePreset = PEAK_PERIOD_PRESETS[1]; // midday default
  if (h >= 7.5 && h <= 11.5) {
    activePreset = PEAK_PERIOD_PRESETS[0]; // Morning Peak
  } else if (h >= 17.0 && h <= 21.5) {
    activePreset = PEAK_PERIOD_PRESETS[2]; // Evening Peak
  } else if (h >= 22.0 || h < 6.0) {
    activePreset = PEAK_PERIOD_PRESETS[3]; // Night Shift
  }

  // Base diurnal traffic demand multiplier curve
  // Peak at 9:00 AM (factor ~1.7) and 7:00 PM (factor ~1.85); trough at 3:00 AM (factor ~0.15)
  let timeMultiplier = 0.4;
  if (h >= 6.0 && h <= 12.0) {
    // Morning rise & peak
    const t = (h - 6.0) / 6.0;
    timeMultiplier = 0.4 + 1.35 * Math.sin(t * Math.PI);
  } else if (h > 12.0 && h < 16.5) {
    // Midday plateau
    timeMultiplier = 0.85;
  } else if (h >= 16.5 && h <= 21.5) {
    // Evening peak
    const t = (h - 16.5) / 5.0;
    timeMultiplier = 0.85 + 1.15 * Math.sin(t * Math.PI);
  } else {
    // Night valley
    timeMultiplier = 0.22;
  }

  let totalSpeed = 0;
  let totalDelay = 0;
  let bottlenecksCount = 0;
  let laneClosuresCount = 0;
  const corridorAdvisories: string[] = [];

  const segments: TrafficSegment[] = MIRA_ROAD_NETWORK_GEOMETRIES.map((geom) => {
    // Check if this road has an ongoing or planned construction project
    const impactingProject = activeProjects.find((p) => {
      const pRoad = (p.road_name || "").toLowerCase();
      const gRoad = geom.road_name.toLowerCase();
      return pRoad.includes(gRoad) || gRoad.includes(pRoad);
    });

    const isImpacted = !!impactingProject;
    let lanesClosed = 0;
    if (isImpacted) {
      lanesClosed = geom.lanes >= 4 ? 1 : 1;
      laneClosuresCount++;
    }

    const openLanes = Math.max(1, geom.lanes - lanesClosed);
    const capacityRatio = openLanes / geom.lanes;

    // Road specific congestion sensitivity
    let corridorBias = 1.0;
    if (geom.road_name.includes("Station Road") && (h >= 7.5 && h <= 11.5)) {
      corridorBias = 1.6; // Station gets extreme morning outbound load
    } else if (geom.road_name.includes("Kanakia") && (h >= 17.5 && h <= 21.0)) {
      corridorBias = 1.55; // Kanakia gets heavy evening residential inflow
    } else if (geom.road_name.includes("Mira Bhayandar Road")) {
      corridorBias = 1.25; // Continuous heavy arterial throughput
    }

    const effectiveLoad = timeMultiplier * corridorBias * (1.0 / capacityRatio);
    const congestionScore = Math.min(98, Math.max(8, Math.round(effectiveLoad * 48)));

    // Speed calculation
    let currentSpeed = Math.round(geom.base_speed * Math.max(0.12, 1.0 - (congestionScore / 100) * 0.85));
    if (isImpacted && currentSpeed > 18) {
      currentSpeed = Math.round(currentSpeed * 0.65);
    }

    let delayMins = 0;
    if (currentSpeed < geom.base_speed) {
      // Approximate 3km corridor delay
      delayMins = Math.round((3.0 / Math.max(4, currentSpeed) - 3.0 / geom.base_speed) * 60);
    }

    // Determine Level & Visual Color
    let level: TrafficLevel = "FREE_FLOW";
    let color = "#10b981"; // Emerald
    let glowColor = "#059669";
    let cause = "Free-flowing urban traffic conditions.";

    if (congestionScore >= 75 || currentSpeed < 12) {
      level = "CRITICAL_BOTTLENECK";
      color = "#ef4444"; // Red
      glowColor = "#dc2626";
      bottlenecksCount++;
      cause = isImpacted
        ? `Severe Bottleneck: ${lanesClosed} Lane Closed for '${impactingProject?.title || impactingProject?.name}'`
        : `Peak Hour Volume Surge: Station/Highway Queuing.`;
      
      corridorAdvisories.push(
        `🚨 ${geom.road_name}: ${delayMins}m Delay. ${geom.detour_name}`
      );
    } else if (congestionScore >= 55 || currentSpeed < 22) {
      level = "HEAVY";
      color = "#f97316"; // Orange
      glowColor = "#ea580c";
      cause = isImpacted
        ? `Heavy Delays: Utility Work Zone Restriction`
        : `Heavy Commuter Traffic Inflow.`;
    } else if (congestionScore >= 35 || currentSpeed < 32) {
      level = "MODERATE";
      color = "#eab308"; // Amber
      glowColor = "#ca8a04";
      cause = "Moderate urban flow with minor intersection queuing.";
    }

    totalSpeed += currentSpeed;
    totalDelay += delayMins;

    return {
      id: geom.id,
      road_name: geom.road_name,
      road_type: geom.road_type,
      coordinates: geom.coords,
      lanes_total: geom.lanes,
      lanes_open: openLanes,
      base_speed_kmh: geom.base_speed,
      current_speed_kmh: currentSpeed,
      congestion_score: congestionScore,
      level,
      delay_mins: delayMins,
      color,
      glow_color: glowColor,
      cause,
      is_construction_impacted: isImpacted,
      impacted_by_project_id: impactingProject?.id,
      impacted_by_project_title: impactingProject?.title || impactingProject?.name,
      alternate_detour_name: geom.detour_name,
      detour_coordinates: geom.detour_coords,
    };
  });

  const avgSpeed = Math.round(totalSpeed / segments.length);
  const cityScore = Math.min(96, Math.max(12, Math.round(timeMultiplier * 50 + (bottlenecksCount * 8))));

  // Format 12-hour time string
  const wholeHours = Math.floor(h);
  const minutes = Math.floor((h - wholeHours) * 60);
  const period = wholeHours >= 12 ? "PM" : "AM";
  const displayHours = wholeHours % 12 === 0 ? 12 : wholeHours % 12;
  const timeString = `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;

  return {
    hourOfDay: h,
    timeString,
    activePeriod: activePreset,
    cityCongestionScore: cityScore,
    avgSpeedKmh: avgSpeed,
    totalDelayMins: totalDelay,
    activeBottlenecksCount: bottlenecksCount,
    activeLaneClosuresCount: laneClosuresCount,
    segments,
    corridorAdvisories: corridorAdvisories.slice(0, 3),
  };
}
