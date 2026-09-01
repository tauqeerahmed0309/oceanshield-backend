"""
Multi-layer look-alike filtering pipeline.

A dark SAR patch from U-Net is never declared an oil spill from
segmentation alone. It must pass, in order:
  1. wind_filter        — calm water looks identical to oil at low wind
  2. shape_texture       — shape/texture classifier (Random Forest)
  3. spatial_context      — coastline proximity, known bloom zones
  4. ais_crosscheck       — nearby AIS anomaly correlation (key differentiator)
  5. persistence_check    — permanent-feature exclusion across repeat passes

See processing/correlation_engine.py for how these are chained together.
"""
