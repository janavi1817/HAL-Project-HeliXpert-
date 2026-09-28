# Vision Models

This directory is intended for local ONNX vision models used by HeliXpert.

## Setup Instructions

1. Download the ResNet50 ONNX model. 
2. Place it here as `resnet50.onnx`.
3. Provide the ImageNet labels file as `imagenet_classes.txt`.

**Example:**
- `resnet50.onnx` (Model weights)
- `imagenet_classes.txt` (List of class labels)

The system uses ONNX Runtime (`CPUExecutionProvider` by default) to run classification completely offline.
