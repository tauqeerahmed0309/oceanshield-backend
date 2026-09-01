"""
Central configuration, loaded from environment variables (.env).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Storage: JSON files under data/db/ — see app/db/json_store.py.
    # No connection string needed; kept here only in case you want to
    # point it elsewhere later.
    data_dir: str = "data/db"

    # aisstream.io
    aisstream_api_key: str = ""
    aisstream_url: str = "wss://stream.aisstream.io/v0/stream"

    # AOI bounding box
    aoi_bounding_box_lat_min: float = 17.5
    aoi_bounding_box_lon_min: float = 70.5
    aoi_bounding_box_lat_max: float = 19.5
    aoi_bounding_box_lon_max: float = 73.0

    # Copernicus
    copernicus_client_id: str = ""
    copernicus_client_secret: str = ""

    # Open-Meteo
    open_meteo_url: str = "https://api.open-meteo.com/v1/forecast"

    # Model paths
    unet_weights_path: str = "app/ml/models/unet_weights.pt"
    lookalike_model_path: str = "app/ml/models/lookalike_rf.joblib"

    # Thresholds
    confirm_score_threshold: float = 0.7
    anomaly_window_minutes: int = 1
    ais_correlation_radius_km: float = 5.0
    ais_correlation_window_hours: float = 6.0

    # Alerting
    icg_alert_webhook_url: str = ""

    @property
    def aoi_bbox(self):
        """[[lat_min, lon_min], [lat_max, lon_max]] — aisstream.io format."""
        return [
            [self.aoi_bounding_box_lat_min, self.aoi_bounding_box_lon_min],
            [self.aoi_bounding_box_lat_max, self.aoi_bounding_box_lon_max],
        ]


settings = Settings()
