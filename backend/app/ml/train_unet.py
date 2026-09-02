"""
Training script for U-Net SAR Oil Spill Detection Model.

Based on the Zenodo Sentinel-1 SAR Oil Spill Dataset:
https://zenodo.org/record/5764984

This script:
1. Loads SAR images and oil spill masks from the dataset
2. Trains a U-Net segmentation model
3. Saves weights for inference

Usage:
    python -m app.ml.train_unet --data_dir /path/to/zenodo/dataset --epochs 50

Dataset Structure Expected:
    data_dir/
        images/    - SAR image patches (GeoTIFF or PNG)
        masks/     - Binary oil spill masks (same filenames)
"""

import os
import argparse
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
from sklearn.model_selection import train_test_split

from app.ml.unet_segmentation import UNet


class OilSpillDataset(Dataset):
    """Dataset for SAR oil spill segmentation."""
    
    def __init__(self, image_paths, mask_paths, augment=False):
        self.image_paths = image_paths
        self.mask_paths = mask_paths
        self.augment = augment
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        # Load image
        img_path = self.image_paths[idx]
        if img_path.endswith('.npy'):
            image = np.load(img_path)
        else:
            import cv2
            image = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE).astype(np.float32)
        
        # Load mask
        mask_path = self.mask_paths[idx]
        if mask_path.endswith('.npy'):
            mask = np.load(mask_path)
        else:
            import cv2
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE).astype(np.float32)
        
        # Normalize image to [0, 1]
        if image.max() > 1.0:
            image = image / 255.0 if image.max() <= 255.0 else (image - image.min()) / (image.ptp() + 1e-6)
        
        # Normalize mask to binary
        mask = (mask > 0.5).astype(np.float32)
        
        # Ensure same spatial size
        h, w = image.shape[:2]
        target_h, target_w = 256, 256
        
        if (h, w) != (target_h, target_w):
            import cv2
            image = cv2.resize(image, (target_w, target_h))
            mask = cv2.resize(mask, (target_w, target_h), interpolation=cv2.INTER_NEAREST)
        
        # Data augmentation
        if self.augment:
            if np.random.random() > 0.5:
                image = np.flip(image, axis=1).copy()
                mask = np.flip(mask, axis=1).copy()
            if np.random.random() > 0.5:
                image = np.flip(image, axis=0).copy()
                mask = np.flip(mask, axis=0).copy()
            if np.random.random() > 0.5:
                k = np.random.randint(1, 4)
                image = np.rot90(image, k).copy()
                mask = np.rot90(mask, k).copy()
        
        # Add channel dimension
        image = torch.from_numpy(image).unsqueeze(0)  # (1, H, W)
        mask = torch.from_numpy(mask).unsqueeze(0)    # (1, H, W)
        
        return image, mask


class DiceBCELoss(nn.Module):
    """Combined Dice + Binary Cross Entropy loss for better segmentation."""
    
    def __init__(self):
        super().__init__()
        self.bce = nn.BCELoss()
    
    def forward(self, pred, target):
        pred_flat = pred.view(-1)
        target_flat = target.view(-1)
        
        intersection = (pred_flat * target_flat).sum()
        dice_loss = 1 - (2. * intersection + 1) / (pred_flat.sum() + target_flat.sum() + 1)
        bce_loss = self.bce(pred, target)
        
        return dice_loss + bce_loss


def train_model(data_dir, epochs=50, batch_size=8, lr=1e-4, save_path="app/ml/models/unet_weights.pt"):
    """Train U-Net on oil spill dataset."""
    
    data_dir = Path(data_dir)
    images_dir = data_dir / "images"
    masks_dir = data_dir / "masks"
    
    # Find all image-mask pairs
    image_extensions = {'.npy', '.png', '.tif', '.tiff'}
    image_paths = sorted([
        p for p in images_dir.iterdir() 
        if p.suffix.lower() in image_extensions
    ])
    
    mask_paths = []
    valid_image_paths = []
    
    for img_path in image_paths:
        # Try to find matching mask
        mask_path = masks_dir / img_path.name
        if not mask_path.exists():
            # Try different extension
            for ext in image_extensions:
                mask_path = masks_dir / (img_path.stem + ext)
                if mask_path.exists():
                    break
        
        if mask_path.exists():
            valid_image_paths.append(str(img_path))
            mask_paths.append(str(mask_path))
    
    print(f"Found {len(valid_image_paths)} image-mask pairs")
    
    if len(valid_image_paths) < 10:
        print("WARNING: Very few samples found. Consider using a larger dataset.")
        print("Expected: images/ and masks/ directories with matching files")
        return
    
    # Split dataset
    train_imgs, val_imgs, train_masks, val_masks = train_test_split(
        valid_image_paths, mask_paths, test_size=0.2, random_state=42
    )
    
    # Create dataloaders
    train_dataset = OilSpillDataset(train_imgs, train_masks, augment=True)
    val_dataset = OilSpillDataset(val_imgs, val_masks, augment=False)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    # Initialize model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = UNet(in_channels=1, out_channels=1, base=32).to(device)
    
    # Loss and optimizer
    criterion = DiceBCELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
    
    # Training loop
    best_val_loss = float('inf')
    patience_counter = 0
    max_patience = 15
    
    print(f"Training on {device} with {len(train_imgs)} training samples")
    print(f"Validation: {len(val_imgs)} samples")
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0
        for images, masks in train_loader:
            images, masks = images.to(device), masks.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, masks)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
        
        train_loss /= len(train_loader)
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_dice = 0.0
        
        with torch.no_grad():
            for images, masks in val_loader:
                images, masks = images.to(device), masks.to(device)
                outputs = model(images)
                loss = criterion(outputs, masks)
                val_loss += loss.item()
                
                # Calculate Dice coefficient
                pred_binary = (outputs > 0.5).float()
                intersection = (pred_binary * masks).sum()
                dice = (2. * intersection + 1) / (pred_binary.sum() + masks.sum() + 1)
                val_dice += dice.item()
        
        val_loss /= len(val_loader)
        val_dice /= len(val_loader)
        
        scheduler.step(val_loss)
        
        print(f"Epoch [{epoch+1}/{epochs}] Train Loss: {train_loss:.4f} Val Loss: {val_loss:.4f} Dice: {val_dice:.4f}")
        
        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            
            # Save weights
            save_path = Path(save_path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), save_path)
            print(f"  -> Saved best model to {save_path}")
        else:
            patience_counter += 1
            if patience_counter >= max_patience:
                print(f"Early stopping at epoch {epoch+1}")
                break
    
    print(f"\nTraining complete. Best validation loss: {best_val_loss:.4f}")
    print(f"Weights saved to: {save_path}")


def download_zenodo_dataset():
    """
    Download the Zenodo Sentinel-1 SAR Oil Spill Dataset.
    
    Dataset: https://zenodo.org/record/5764984
    
    Returns path to downloaded dataset.
    """
    import urllib.request
    import zipfile
    
    url = "https://zenodo.org/record/5764984/files/oil_spill_dataset.zip"
    zip_path = Path("data/zenodo/oil_spill_dataset.zip")
    extract_dir = Path("data/zenodo/dataset")
    
    if extract_dir.exists():
        print(f"Dataset already exists at {extract_dir}")
        return extract_dir
    
    print(f"Downloading dataset from {url}...")
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    
    urllib.request.urlretrieve(url, str(zip_path))
    
    print("Extracting dataset...")
    with zipfile.ZipFile(str(zip_path), 'r') as zip_ref:
        zip_ref.extractall(str(extract_dir.parent))
    
    zip_path.unlink()  # Remove zip file
    
    print(f"Dataset extracted to {extract_dir}")
    return extract_dir


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train U-Net for SAR oil spill detection")
    parser.add_argument("--data_dir", type=str, help="Path to dataset directory")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--save_path", type=str, default="app/ml/models/unet_weights.pt")
    parser.add_argument("--download", action="store_true", help="Download Zenodo dataset")
    
    args = parser.parse_args()
    
    if args.download:
        data_dir = download_zenodo_dataset()
        args.data_dir = str(data_dir)
    
    if not args.data_dir:
        print("Please provide --data_dir or use --download to get the Zenodo dataset")
        print("Example: python -m app.ml.train_unet --download")
        exit(1)
    
    train_model(
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        save_path=args.save_path
    )
