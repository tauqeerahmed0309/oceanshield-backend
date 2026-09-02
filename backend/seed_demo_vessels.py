"""
Seed the JSON store with demo Indian vessels for testing.
Run once: python seed_demo_vessels.py
"""

import json
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path("data/db")
DATA_DIR.mkdir(parents=True, exist_ok=True)

now = datetime.now(timezone.utc)

# Indian shipping vessels in Indian waters
DEMO_VESSELS = [
    {
        "id": 1, "mmsi": "419001234", "ship_name": "MV DESH RAKSHAK",
        "imo": "IMO9438201", "callsign": "VTXA1", "flag": "India",
        "type": "Oil Tanker", "latitude": 18.92, "longitude": 72.82,
        "speed": 12.4, "course": 245, "sog": 12.4, "cog": 245,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": True, "anomalyReason": "Sudden course deviation near Mumbai High",
        "anomalySeverity": "CRITICAL",
    },
    {
        "id": 2, "mmsi": "419005678", "ship_name": "MV BHARAT SAMUDRA",
        "imo": "IMO9124567", "callsign": "VTXB2", "flag": "India",
        "type": "Container Ship", "latitude": 18.98, "longitude": 72.75,
        "speed": 18.6, "course": 310, "sog": 18.6, "cog": 310,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 3, "mmsi": "413889012", "ship_name": "MV GARUDA",
        "imo": "IMO9871234", "callsign": "VTWC3", "flag": "India",
        "type": "Crude Oil Tanker", "latitude": 18.81, "longitude": 72.68,
        "speed": 3.1, "course": 120, "sog": 3.1, "cog": 120,
        "timestamp": now.isoformat(), "status": "Restricted Maneuverability",
        "suspicious": True, "anomalyReason": "Unscheduled loitering - AIS gap >4h",
        "anomalySeverity": "HIGH",
    },
    {
        "id": 4, "mmsi": "352990123", "ship_name": "MT CHENNAI EXPRESS",
        "imo": "IMO9554321", "callsign": "VTYU4", "flag": "India",
        "type": "Product Tanker", "latitude": 13.08, "longitude": 80.30,
        "speed": 15.0, "course": 215, "sog": 15.0, "cog": 215,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 5, "mmsi": "477123456", "ship_name": "MV NARMADA",
        "imo": "IMO9654321", "callsign": "VTRL5", "flag": "India",
        "type": "Bulk Carrier", "latitude": 21.15, "longitude": 72.20,
        "speed": 7.2, "course": 180, "sog": 7.2, "cog": 180,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": True, "anomalyReason": "Speed drop from 14kn to 7kn - possible discharge",
        "anomalySeverity": "HIGH",
    },
    {
        "id": 6, "mmsi": "636092123", "ship_name": "MV GODAVARI",
        "imo": "IMO9223311", "callsign": "VTMP6", "flag": "India",
        "type": "LPG Carrier", "latitude": 19.35, "longitude": 72.42,
        "speed": 9.8, "course": 285, "sog": 9.8, "cog": 285,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 7, "mmsi": "566112233", "ship_name": "MV KRISHNA VII",
        "imo": "IMO9112233", "callsign": "VTKR7", "flag": "India",
        "type": "Container Ship", "latitude": 16.80, "longitude": 74.50,
        "speed": 20.1, "course": 340, "sog": 20.1, "cog": 340,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 8, "mmsi": "372445566", "ship_name": "MV TAPTI STAR",
        "imo": "IMO9334455", "callsign": "VTTI8", "flag": "India",
        "type": "Chemical Tanker", "latitude": 20.40, "longitude": 71.80,
        "speed": 11.5, "course": 160, "sog": 11.5, "cog": 160,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 9, "mmsi": "419009999", "ship_name": "MV SAGARMALA",
        "imo": "IMO9765432", "callsign": "VTSM9", "flag": "India",
        "type": "RoRo Cargo", "latitude": 15.40, "longitude": 73.85,
        "speed": 16.3, "course": 320, "sog": 16.3, "cog": 320,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 10, "mmsi": "419008888", "ship_name": "MV ANDAMAN FURY",
        "imo": "IMO9887654", "callsign": "VTAF0", "flag": "India",
        "type": "Passenger/RoRo", "latitude": 11.74, "longitude": 92.72,
        "speed": 14.2, "course": 150, "sog": 14.2, "cog": 150,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 11, "mmsi": "419007777", "ship_name": "MV LAKSHADWEEP",
        "imo": "IMO9998765", "callsign": "VTLW1", "flag": "India",
        "type": "Supply Vessel", "latitude": 10.57, "longitude": 72.64,
        "speed": 8.5, "course": 200, "sog": 8.5, "cog": 200,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 12, "mmsi": "419006666", "ship_name": "MT MANGALA",
        "imo": "IMO9543210", "callsign": "VTMG2", "flag": "India",
        "type": "Oil/Chemical Tanker", "latitude": 17.68, "longitude": 83.22,
        "speed": 11.8, "course": 270, "sog": 11.8, "cog": 270,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 13, "mmsi": "419004444", "ship_name": "MV COROMANDEL",
        "imo": "IMO9321098", "callsign": "VTCC3", "flag": "India",
        "type": "Bulk Carrier", "latitude": 13.22, "longitude": 80.18,
        "speed": 13.5, "course": 45, "sog": 13.5, "cog": 45,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 14, "mmsi": "419003333", "ship_name": "MV PARADIP QUEEN",
        "imo": "IMO9109876", "callsign": "VTPQ4", "flag": "India",
        "type": "Bulk Carrier", "latitude": 20.28, "longitude": 86.62,
        "speed": 10.2, "course": 135, "sog": 10.2, "cog": 135,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 15, "mmsi": "419002222", "ship_name": "MV RAMESWARAM",
        "imo": "IMO9876543", "callsign": "VTRM5", "flag": "India",
        "type": "Fishing Vessel", "latitude": 9.28, "longitude": 79.32,
        "speed": 5.4, "course": 90, "sog": 5.4, "cog": 90,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 16, "mmsi": "419001111", "ship_name": "MV GULF OF MANNAR",
        "imo": "IMO9654309", "callsign": "VTGM6", "flag": "India",
        "type": "Offshore Supply", "latitude": 9.05, "longitude": 78.52,
        "speed": 7.8, "course": 225, "sog": 7.8, "cog": 225,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
]

def seed():
    vessel_file = DATA_DIR / "vessel_positions.json"
    store = {
        "next_id": max(v["id"] for v in DEMO_VESSELS) + 1,
        "records": DEMO_VESSELS
    }
    with open(vessel_file, "w") as f:
        json.dump(store, f, indent=2, default=str)
    print(f"OK Seeded {len(DEMO_VESSELS)} Indian demo vessels to {vessel_file}")
    print(f"  - 3 suspicious vessels (DESH RAKSHAK, GARUDA, NARMADA)")
    print(f"  - {len(DEMO_VESSELS) - 3} normal vessels")
    print(f"  All positions within Indian waters (68-95E, 0-24N)")

if __name__ == "__main__":
    seed()
