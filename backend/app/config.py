"""
Central configuration — loaded from environment variables / .env.
All new SENTRY-SAR / GEE / natural-filter keys are added here.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ------------------------------------------------------------------ #
    # Storage
    # ------------------------------------------------------------------ #
    data_dir: str = "data/db"

    # ------------------------------------------------------------------ #
    # AISStream.io
    # ------------------------------------------------------------------ #
    aisstream_api_key: str = ""
    aisstream_url: str = "wss://stream.aisstream.io/v0/stream"

    # AOI bounding box — Indian waters (legacy single box)
    aoi_bounding_box_lat_min: float = 0.0
    aoi_bounding_box_lon_min: float = 68.0
    aoi_bounding_box_lat_max: float = 23.5
    aoi_bounding_box_lon_max: float = 92.0

    # Multiple bounding boxes — Indian maritime zones
    # Box 1: Arabian Sea + West Coast (Gujarat, Mumbai, Goa, Kerala)
    aoi_bbox_1_lat_min: float = 5.0
    aoi_bbox_1_lon_min: float = 68.0
    aoi_bbox_1_lat_max: float = 23.5
    aoi_bbox_1_lon_max: float = 77.5

    # Box 2: Bay of Bengal + East Coast (Chennai, Visakhapatnam, Kolkata)
    aoi_bbox_2_lat_min: float = 5.0
    aoi_bbox_2_lon_min: float = 77.5
    aoi_bbox_2_lat_max: float = 22.0
    aoi_bbox_2_lon_max: float = 92.0

    # Box 3: Indian Ocean + Lakshadweep + Andaman & Nicobar
    aoi_bbox_3_lat_min: float = 0.0
    aoi_bbox_3_lon_min: float = 68.0
    aoi_bbox_3_lat_max: float = 14.0
    aoi_bbox_3_lon_max: float = 95.0

    # ------------------------------------------------------------------ #
    # Google Earth Engine  (SENTRY-SAR / Sentinel-1 path)
    # ------------------------------------------------------------------ #
    gee_project_id: str = ""
    gee_s1_collection: str = "COPERNICUS/S1_GRD"
    gee_s1_polarizations: str = "VV,VH"          # comma-separated
    gee_s1_instrument_mode: str = "IW"
    gee_s1_orbit_direction: str = "DESCENDING"

    # ------------------------------------------------------------------ #
    # SENTRY-SAR change detection
    # ------------------------------------------------------------------ #
    sentry_sar_change_threshold: float = 3.0      # absolute dB change
    sentry_sar_min_change_area: int = 20           # pixels
    sentry_sar_confidence_threshold: float = 0.70
    sentry_sar_output_format: str = "geojson"
    sentry_sar_temp_dir: str = "data/sentry_sar"

    # ------------------------------------------------------------------ #
    # SENTRY-SAR natural-change filtering
    # ------------------------------------------------------------------ #
    sentry_sar_natural_filter: bool = True
    sentry_sar_water_filter: bool = True
    sentry_sar_vegetation_filter: bool = True
    sentry_sar_agriculture_filter: bool = True
    sentry_sar_flood_filter: bool = True

    # ------------------------------------------------------------------ #
    # Copernicus Data Space (optional, legacy path)
    # ------------------------------------------------------------------ #
    copernicus_client_id: str = ""
    copernicus_client_secret: str = ""

    # ------------------------------------------------------------------ #
    # Open-Meteo  (no key required)
    # ------------------------------------------------------------------ #
    open_meteo_url: str = "https://api.open-meteo.com/v1/forecast"

    # ------------------------------------------------------------------ #
    # Model paths
    # ------------------------------------------------------------------ #
    unet_weights_path: str = "app/ml/models/unet_weights.pt"
    lookalike_model_path: str = "app/ml/models/lookalike_rf.joblib"

    # ------------------------------------------------------------------ #
    # Detection thresholds
    # ------------------------------------------------------------------ #
    confirm_score_threshold: float = 0.7
    anomaly_window_minutes: int = 1
    ais_correlation_radius_km: float = 5.0
    ais_correlation_window_hours: float = 6.0

    # ------------------------------------------------------------------ #
    # ICG / MRCC alerting
    # ------------------------------------------------------------------ #
    icg_alert_webhook_url: str = ""

    # ------------------------------------------------------------------ #
    # Derived helpers
    # ------------------------------------------------------------------ #
    @property
    def aoi_bbox(self) -> list:
        """[[lat_min, lon_min], [lat_max, lon_max]] — single legacy box."""
        return [
            [self.aoi_bounding_box_lat_min, self.aoi_bounding_box_lon_min],
            [self.aoi_bounding_box_lat_max, self.aoi_bounding_box_lon_max],
        ]

    @property
    def aoi_all_bboxes(self) -> list:
        """List of all bounding boxes for worldwide AISStream coverage."""
        return [
            [[self.aoi_bbox_1_lat_min, self.aoi_bbox_1_lon_min],
             [self.aoi_bbox_1_lat_max, self.aoi_bbox_1_lon_max]],
            [[self.aoi_bbox_2_lat_min, self.aoi_bbox_2_lon_min],
             [self.aoi_bbox_2_lat_max, self.aoi_bbox_2_lon_max]],
            [[self.aoi_bbox_3_lat_min, self.aoi_bbox_3_lon_min],
             [self.aoi_bbox_3_lat_max, self.aoi_bbox_3_lon_max]],
        ]

    @property
    def gee_polarizations(self) -> list[str]:
        """Parsed list of polarisation bands, e.g. ['VV', 'VH']."""
        return [p.strip() for p in self.gee_s1_polarizations.split(",") if p.strip()]


settings = Settings()
