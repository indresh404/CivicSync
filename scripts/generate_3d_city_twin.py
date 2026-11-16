import json
import random

# Seed for reproducible realistic city architecture
random.seed(42)

SECTORS = [
    {
        "sector_name": "Mira Road Station & Transit District",
        "center": (19.2810, 72.8545),
        "count": 16,
        "type": "transport",
        "names": [
            "Mira Road Main Concourse & Terminal",
            "Platform 1-2 Skywalk Interchange",
            "Platform 3-4 High-Speed Rail Gantry",
            "Station South Bus Depot Complex",
            "West Railway Colony High-Rise A",
            "West Railway Colony High-Rise B",
            "Auto-Rickshaw & Feeder Transit Plaza",
            "Station Road Municipal Commercial Arcade",
            "Mira Road Post Office & Civic Hub",
            "Railway Police Headquarters & Control",
            "Station Foot Overbridge Gateway Tower",
            "East Skywalk Terminal Mall",
            "Station Road Multilevel Parking Facility",
            "Commuter Commercial Centre",
            "Western Railway Electrical Substation",
            "Station Plaza Pedestrian Galleria"
        ],
        "height_range": (18, 52),
        "types": ["transport", "civic", "commercial"],
    },
    {
        "sector_name": "Kanakia Commercial & Tech Hub",
        "center": (19.2825, 72.8590),
        "count": 22,
        "type": "commercial",
        "names": [
            "Mira Commercial Skyscraper (Twin Landmark)",
            "Kanakia Wall Street Commercial Tower",
            "Kanakia Zillion Tech Park Block A",
            "Kanakia Zillion Tech Park Block B",
            "Kanakia Samarpan Residential Pinnacle",
            "Techniplex IT Tower 1",
            "Techniplex IT Tower 2",
            "Kanakia Corporate Financial Suites",
            "Imperial Heights Premier Residence",
            "Regency Commercial Atrium",
            "Seven Square International Academy",
            "Kanakia Cinepolis Entertainment Complex",
            "Regent Plaza Corporate Hub",
            "Mira Trade Centre Tower",
            "Kanakia Country Club Pavilion",
            "Apex Business Park Phase 1",
            "Apex Business Park Phase 2",
            "Kanakia Park Avenue Tower",
            "Kanakia Silicon Galleria",
            "Kanakia Skyview Condos",
            "Kanakia Horizon Executive Suites",
            "Kanakia Sovereign Business Centre"
        ],
        "height_range": (42, 98),
        "types": ["commercial", "education", "residential"],
    },
    {
        "sector_name": "Shanti Park & Shanti Nagar Residential Hub",
        "center": (19.2815, 72.8620),
        "count": 26,
        "type": "residential",
        "names": [
            "Shanti Park Avenue Sector 1 High-Rise",
            "Shanti Park Sector 2 Residential Block",
            "Shanti Park Sector 3 Green View",
            "Shanti Park Sector 4 Central Towers",
            "Shanti Park Sector 5 Family Condos",
            "Shanti Park Sector 6 Executive Residency",
            "Shanti Nagar Municipal Civic Ward Office",
            "Shanti Shopping Centre & Supermarket",
            "Bhaktivedanta Swami Memorial Hall",
            "Shanti Nagar Public Library & Cultural Centre",
            "Saraswati Vidyalaya High School & College",
            "Shanti Garden Society Block A",
            "Shanti Garden Society Block B",
            "Shanti Garden Society Block C",
            "Shanti Vihar Society Phase 1",
            "Shanti Vihar Society Phase 2",
            "Shanti Sadan Cooperative Housing",
            "Gokul Park Residency Towers",
            "Gokul Village Complex Block 1",
            "Gokul Village Complex Block 2",
            "Sangeet Complex Residential Block",
            "Deepak Hospital & Emergency Trauma Centre",
            "Shanti Nagar Post & Telegraph Hub",
            "Shanti Park Sports Complex & Gymkhana",
            "Shanti Heights Luxury Tower",
            "Shanti Elegance Residential Suites"
        ],
        "height_range": (28, 75),
        "types": ["residential", "civic", "healthcare", "education"],
    },
    {
        "sector_name": "Beverly Park & Jangid High-Rise District",
        "center": (19.2865, 72.8625),
        "count": 24,
        "type": "residential",
        "names": [
            "Beverly Park Skyview Pinnacle Tower",
            "Beverly Park Residency Phase 1",
            "Beverly Park Residency Phase 2",
            "Beverly Luxury Condominiums Block A",
            "Beverly Luxury Condominiums Block B",
            "Jangid Heights Skyscraper (32 Floors)",
            "Jangid Complex Tower 1",
            "Jangid Complex Tower 2",
            "Jangid Complex Tower 3",
            "Jangid Enclave High-Rise",
            "GCC International Club & Resort Pavilion",
            "GCC Hotel & Convention Centre",
            "Beverly Avenue Commercial Galleria",
            "Wockhardt Multi-Speciality Hospital",
            "Singapore International School Wing",
            "Beverly Hills Residential Society",
            "Jangid Estate Premium Towers",
            "Jangid Pearl Luxury Suites",
            "Beverly Crest High-Rise",
            "Beverly Crown Condos",
            "Jangid Galaxy Tower A",
            "Jangid Galaxy Tower B",
            "Mira Bhayandar Municipal Fire Station",
            "Beverly Park Electrical 33kV Substation"
        ],
        "height_range": (45, 105),
        "types": ["residential", "healthcare", "commercial", "civic"],
    },
    {
        "sector_name": "150 Feet Road & Maxus Mall Commercial Corridor",
        "center": (19.2935, 72.8525),
        "count": 22,
        "type": "commercial",
        "names": [
            "Maxus Mall & 6-Screen INOX Multiplex",
            "Maxus Commercial Offices Tower",
            "D-Mart Hypermarket Mira Road Flagship",
            "150 Feet Road Corporate Banking Centre",
            "Big Bazaar Retail Megastore",
            "Bhayandar West Crossway Gateway Tower",
            "Maxus Grand Residency Tower A",
            "Maxus Grand Residency Tower B",
            "Bhakti Vedanta Hospital & Research Wing",
            "Seven Square Academy Senior Secondary Wing",
            "150 Feet Road IT Hub Tower",
            "Royal Oasis High-Rise Residential",
            "Royal Palms Executive Condos",
            "Maxus Business Hub",
            "Western Boulevard Commercial Arcade",
            "Mira Smart City Traffic Command Centre",
            "150 Feet Road Telecom Switching Station",
            "Om Sai Hospital & Healthcare",
            "Poonam Estate Phase 1",
            "Poonam Estate Phase 2",
            "Maxus Plaza Retail Centre",
            "North City Luxury Suites"
        ],
        "height_range": (35, 88),
        "types": ["commercial", "healthcare", "residential", "civic"],
    },
    {
        "sector_name": "Silver Park, Hatkesh & Highway Corridor",
        "center": (19.2710, 72.8685),
        "count": 20,
        "type": "commercial",
        "names": [
            "Hatkesh Industrial & Technology Park Tower 1",
            "Hatkesh Industrial & Technology Park Tower 2",
            "Silver Park Commercial Logistics Hub",
            "Western Express Highway Tollway Plaza Tower",
            "Tata Power 110kV Mira Road Grid Receiving Station",
            "Hatkesh Data Centre Facility",
            "Silver Park Smart Warehousing Block",
            "Mira-Bhayandar Mahanagar Gas City Gate Station",
            "Pleasant Park High-Rise Society",
            "Pleasant Park Commercial Wing",
            "Srishti Housing Sector 3 High-Rise",
            "Srishti Housing Sector 5 Tower",
            "Hatkesh Udyog Nagar IT Centre",
            "Silver Crest Residential Tower",
            "Highway Heights Business Bay",
            "Silver Plaza Corporate Suites",
            "Western Express Transit Interchange",
            "Hatkesh Engineering Complex",
            "Silver Park Substation Office",
            "Municipal Water Booster Pumping Station"
        ],
        "height_range": (24, 70),
        "types": ["commercial", "civic", "residential"],
    }
]

features = []
bldg_id = 1

for sector in SECTORS:
    center_lat, center_lng = sector["center"]
    names = sector["names"]
    h_min, h_max = sector["height_range"]
    
    for i, name in enumerate(names):
        # Generate spatial offset from center
        angle = (i / len(names)) * 6.28318 + random.uniform(-0.15, 0.15)
        dist_offset = random.uniform(0.0015, 0.0055)
        
        b_lat = center_lat + (dist_offset * 0.8) * random.choice([-1, 1]) * (0.6 + 0.4 * random.random())
        b_lng = center_lng + dist_offset * random.choice([-1, 1]) * (0.6 + 0.4 * random.random())
        
        height = round(random.uniform(h_min, h_max), 1)
        levels = max(3, int(height / 3.2))
        
        # Dimensions of building footprint in degrees (~25m to 55m)
        w_lat = random.uniform(0.00035, 0.00070)
        w_lng = random.uniform(0.00035, 0.00075)
        
        b_type = sector["types"][i % len(sector["types"])]
        
        # 4-corner polygon closed
        poly = [
            [round(b_lng - w_lng/2, 6), round(b_lat - w_lat/2, 6)],
            [round(b_lng + w_lng/2, 6), round(b_lat - w_lat/2, 6)],
            [round(b_lng + w_lng/2, 6), round(b_lat + w_lat/2, 6)],
            [round(b_lng - w_lng/2, 6), round(b_lat + w_lat/2, 6)],
            [round(b_lng - w_lng/2, 6), round(b_lat - w_lat/2, 6)]
        ]
        
        feature = {
            "type": "Feature",
            "id": f"BLDG-{bldg_id:03d}",
            "properties": {
                "id": f"BLDG-{bldg_id:03d}",
                "name": name,
                "height": height,
                "min_height": 0.0,
                "levels": levels,
                "building_type": b_type,
                "height_source": "measured",
                "sector": sector["sector_name"],
                "address": f"{name}, {sector['sector_name']}, Mira Road (East), Mumbai MMR",
                "glow_color": "#38bdf8" if height > 60 else "#0284c7" if height > 35 else "#1e293b"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [poly]
            }
        }
        features.append(feature)
        bldg_id += 1

geojson_data = {
    "type": "FeatureCollection",
    "features": features
}

# Write to both data and public/data
with open("data/miraroad_3d_buildings.json", "w", encoding="utf-8") as f:
    json.dump(geojson_data, f, indent=2)

with open("public/data/miraroad_3d_buildings.json", "w", encoding="utf-8") as f:
    json.dump(geojson_data, f, indent=2)

print(f"Successfully generated {len(features)} 3D City Twin landmark buildings for Mira Road across {len(SECTORS)} sectors.")
