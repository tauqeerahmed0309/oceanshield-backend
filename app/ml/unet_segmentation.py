"""
U-Net inference for SAR dark-patch segmentation.

This defines a standard U-Net architecture and a loader for pretrained
weights. Training is NOT included here — train offline on a labeled SAR
oil-spill dataset (e.g. the MKLab Kaggle oil-spill dataset) and save
weights to app/ml/models/unet_weights.pt before running real inference.
"""

import numpy as np
import torch
import torch.nn as nn

from app.config import settings


class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1), nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1), nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.net(x)


class UNet(nn.Module):
    """Small U-Net: 1-channel SAR input -> 1-channel spill probability mask."""

    def __init__(self, in_channels: int = 1, out_channels: int = 1, base: int = 32):
        super().__init__()
        self.enc1 = DoubleConv(in_channels, base)
        self.enc2 = DoubleConv(base, base * 2)
        self.enc3 = DoubleConv(base * 2, base * 4)
        self.pool = nn.MaxPool2d(2)

        self.bottleneck = DoubleConv(base * 4, base * 8)

        self.up3 = nn.ConvTranspose2d(base * 8, base * 4, 2, stride=2)
        self.dec3 = DoubleConv(base * 8, base * 4)
        self.up2 = nn.ConvTranspose2d(base * 4, base * 2, 2, stride=2)
        self.dec2 = DoubleConv(base * 4, base * 2)
        self.up1 = nn.ConvTranspose2d(base * 2, base, 2, stride=2)
        self.dec1 = DoubleConv(base * 2, base)

        self.out_conv = nn.Conv2d(base, out_channels, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        b = self.bottleneck(self.pool(e3))

        d3 = self.dec3(torch.cat([self.up3(b), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))

        return torch.sigmoid(self.out_conv(d1))


class UNetSegmenter:
    def __init__(self, weights_path: str | None = None, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = UNet().to(self.device)
        self.weights_path = weights_path or settings.unet_weights_path
        self._loaded = False

    def load(self):
        try:
            state_dict = torch.load(self.weights_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            self.model.eval()
            self._loaded = True
        except FileNotFoundError as e:
            raise RuntimeError(
                f"U-Net weights not found at {self.weights_path}. "
                "Train the model on a labeled SAR oil-spill dataset first."
            ) from e

    @torch.no_grad()
    def predict(self, sar_image: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        """
        sar_image: single-channel float array (H, W), calibrated/speckle-filtered.
        Returns a binary mask (H, W) of candidate dark-patch pixels.
        """
        if not self._loaded:
            raise RuntimeError("Call .load() before predict().")

        # normalize to [0, 1]
        img = sar_image.astype(np.float32)
        img = (img - img.min()) / (img.ptp() + 1e-6) if img.ptp() > 0 else img

        tensor = torch.from_numpy(img).unsqueeze(0).unsqueeze(0).to(self.device)
        prob_mask = self.model(tensor).squeeze().cpu().numpy()

        return (prob_mask > threshold).astype(np.uint8), prob_mask
