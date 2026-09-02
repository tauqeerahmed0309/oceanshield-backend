export const initialVessels = [
  {
    id: "vessel-1",
    name: "MV Ocean Star",
    imo: "9876543",
    mmsi: "367123456",
    type: "Oil Tanker",
    lat: 25.781,
    lng: -90.421,
    speed: 14.5, // Will drop to 2.1 in anomaly
    course: 217,
    destination: "Houston",
    eta: "Aug 19, 18:00 UTC",
    status: "NORMAL", // NORMAL -> ANOMALOUS
    anomalyScore: 12, // 12 -> 87
    risk: "LOW", // LOW -> HIGH
    indicators: {
      speedDeviation: 15, // 15 -> 91
      courseDeviation: 8, // 8 -> 78
      unexpectedStop: 5, // 5 -> 95
      routeDeviation: 12, // 12 -> 64
      aisGap: 10 // 10 -> 52
    }
  },
  {
    id: "vessel-2",
    name: "Atlantic Trader",
    imo: "9345678",
    mmsi: "366987654",
    type: "Cargo Vessel",
    lat: 26.521,
    lng: -88.245,
    speed: 12.2,
    course: 95,
    destination: "Miami",
    eta: "Aug 20, 06:00 UTC",
    status: "WARNING",
    anomalyScore: 72,
    risk: "MEDIUM",
    indicators: {
      speedDeviation: 45,
      courseDeviation: 72,
      unexpectedStop: 10,
      routeDeviation: 68,
      aisGap: 15
    }
  },
  {
    id: "vessel-3",
    name: "Gulf Pioneer",
    imo: "9123456",
    mmsi: "368111222",
    type: "Crude Oil Carrier",
    lat: 27.215,
    lng: -92.512,
    speed: 0.5,
    course: 12,
    destination: "New Orleans",
    eta: "Aug 19, 12:00 UTC",
    status: "CRITICAL",
    anomalyScore: 91,
    risk: "CRITICAL",
    indicators: {
      speedDeviation: 95,
      courseDeviation: 10,
      unexpectedStop: 98,
      routeDeviation: 89,
      aisGap: 40
    }
  },
  {
    id: "vessel-4",
    name: "Sea Horizon",
    imo: "9456712",
    mmsi: "367888999",
    type: "Container Ship",
    lat: 24.812,
    lng: -86.534,
    speed: 15.1,
    course: 280,
    destination: "Veracruz",
    eta: "Aug 21, 14:00 UTC",
    status: "WARNING",
    anomalyScore: 68,
    risk: "MEDIUM",
    indicators: {
      speedDeviation: 20,
      courseDeviation: 60,
      unexpectedStop: 5,
      routeDeviation: 65,
      aisGap: 68
    }
  },
  {
    id: "vessel-5",
    name: "Veracruz Express",
    imo: "9512345",
    mmsi: "345123456",
    type: "Cargo Vessel",
    lat: 22.345,
    lng: -96.212,
    speed: 16.8,
    course: 180,
    destination: "Veracruz",
    eta: "Aug 19, 22:30 UTC",
    status: "NORMAL",
    anomalyScore: 5,
    risk: "LOW",
    indicators: {
      speedDeviation: 5,
      courseDeviation: 4,
      unexpectedStop: 2,
      routeDeviation: 8,
      aisGap: 5
    }
  },
  {
    id: "vessel-6",
    name: "Cozumel Breeze",
    imo: "9623456",
    mmsi: "356789123",
    type: "Passenger Ship",
    lat: 21.123,
    lng: -86.745,
    speed: 19.5,
    course: 150,
    destination: "Cozumel",
    eta: "Aug 19, 20:00 UTC",
    status: "NORMAL",
    anomalyScore: 8,
    risk: "LOW",
    indicators: {
      speedDeviation: 8,
      courseDeviation: 5,
      unexpectedStop: 1,
      routeDeviation: 10,
      aisGap: 3
    }
  },
  {
    id: "vessel-7",
    name: "MV Blue Horizon",
    imo: "9781234",
    mmsi: "368555222",
    type: "Chemical Tanker",
    lat: 25.912,
    lng: -90.210, // Nearby incident
    speed: 13.8,
    course: 225,
    destination: "Galveston",
    eta: "Aug 20, 10:00 UTC",
    status: "NORMAL",
    anomalyScore: 15,
    risk: "LOW",
    indicators: {
      speedDeviation: 12,
      courseDeviation: 15,
      unexpectedStop: 4,
      routeDeviation: 18,
      aisGap: 8
    }
  },
  {
    id: "vessel-8",
    name: "MV Pacific Trader",
    imo: "9218765",
    mmsi: "367444111",
    type: "LNG Carrier",
    lat: 25.612,
    lng: -90.620, // Nearby incident
    speed: 17.2,
    course: 210,
    destination: "Mobile",
    eta: "Aug 20, 02:00 UTC",
    status: "NORMAL",
    anomalyScore: 10,
    risk: "LOW",
    indicators: {
      speedDeviation: 5,
      courseDeviation: 12,
      unexpectedStop: 2,
      routeDeviation: 15,
      aisGap: 6
    }
  },
  {
    id: "vessel-9",
    name: "Gulf Guardian",
    imo: "9311234",
    mmsi: "369222333",
    type: "Patrol Vessel",
    lat: 28.512,
    lng: -94.123,
    speed: 22.0,
    course: 45,
    destination: "Galveston Patrol",
    eta: "Ongoing",
    status: "NORMAL",
    anomalyScore: 4,
    risk: "LOW",
    indicators: {
      speedDeviation: 2,
      courseDeviation: 3,
      unexpectedStop: 1,
      routeDeviation: 5,
      aisGap: 1
    }
  },
  {
    id: "vessel-10",
    name: "Tampico Star",
    imo: "9145678",
    mmsi: "338123456",
    type: "Oil Tanker",
    lat: 22.254,
    lng: -97.354,
    speed: 12.0,
    course: 350,
    destination: "Tampico",
    eta: "Aug 19, 23:45 UTC",
    status: "NORMAL",
    anomalyScore: 11,
    risk: "LOW",
    indicators: {
      speedDeviation: 10,
      courseDeviation: 8,
      unexpectedStop: 3,
      routeDeviation: 12,
      aisGap: 10
    }
  },
  {
    id: "vessel-11",
    name: "Yucatan Pride",
    imo: "9283456",
    mmsi: "355111222",
    type: "Cargo Vessel",
    lat: 20.895,
    lng: -90.312,
    speed: 11.2,
    course: 270,
    destination: "Progreso",
    eta: "Aug 20, 04:00 UTC",
    status: "NORMAL",
    anomalyScore: 9,
    risk: "LOW",
    indicators: {
      speedDeviation: 8,
      courseDeviation: 5,
      unexpectedStop: 4,
      routeDeviation: 9,
      aisGap: 5
    }
  },
  {
    id: "vessel-12",
    name: "Delta Queen",
    imo: "9192834",
    mmsi: "367000111",
    type: "Tugboat",
    lat: 29.112,
    lng: -89.214,
    speed: 8.5,
    course: 180,
    destination: "Port Eads",
    eta: "Aug 19, 19:30 UTC",
    status: "NORMAL",
    anomalyScore: 15,
    risk: "LOW",
    indicators: {
      speedDeviation: 10,
      courseDeviation: 20,
      unexpectedStop: 8,
      routeDeviation: 12,
      aisGap: 15
    }
  },
  {
    id: "vessel-13",
    name: "Slick Explorer",
    imo: "9400234",
    mmsi: "366888444",
    type: "Research Vessel",
    lat: 26.895,
    lng: -91.534,
    speed: 4.2,
    course: 85,
    destination: "Survey Area G",
    eta: "Aug 22, 12:00 UTC",
    status: "NORMAL",
    anomalyScore: 25,
    risk: "LOW",
    indicators: {
      speedDeviation: 15,
      courseDeviation: 30,
      unexpectedStop: 10,
      routeDeviation: 40,
      aisGap: 12
    }
  },
  {
    id: "vessel-14",
    name: "Caribbean Sun",
    imo: "9421357",
    mmsi: "367999888",
    type: "Container Ship",
    lat: 24.123,
    lng: -83.212,
    speed: 18.0,
    course: 85,
    destination: "San Juan",
    eta: "Aug 21, 08:00 UTC",
    status: "NORMAL",
    anomalyScore: 6,
    risk: "LOW",
    indicators: {
      speedDeviation: 4,
      courseDeviation: 5,
      unexpectedStop: 2,
      routeDeviation: 6,
      aisGap: 3
    }
  },
  {
    id: "vessel-15",
    name: "Panama Transit",
    imo: "9568723",
    mmsi: "354999888",
    type: "LNG Carrier",
    lat: 23.456,
    lng: -85.678,
    speed: 19.1,
    course: 120,
    destination: "Panama Canal",
    eta: "Aug 21, 16:30 UTC",
    status: "NORMAL",
    anomalyScore: 7,
    risk: "LOW",
    indicators: {
      speedDeviation: 6,
      courseDeviation: 4,
      unexpectedStop: 1,
      routeDeviation: 9,
      aisGap: 4
    }
  }
];
