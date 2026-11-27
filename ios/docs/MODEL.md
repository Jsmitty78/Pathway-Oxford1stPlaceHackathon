# Add the object detector

The original Python script uses Ultralytics. The original on-device model is missing. This app therefore ships without weights and states that clearly in live mode.

Use a **detection** model with an image input, class labels, and embedded NMS that Vision exposes as `VNRecognizedObjectObservation`. Raw tensor exports, segmentation, pose and NMS-free outputs are not handled by this adapter.

A starting export command, on a separately configured Python environment with Ultralytics and Core ML export dependencies, is:

```sh
yolo export model=yolo26n.pt format=coreml nms=True imgsz=640
```

This downloads pretrained weights if not present. It creates a new deployment artifact, not the lost original model. Record the installed package versions, model source, export arguments, license and model SHA-256 before distributing it. Follow the [Ultralytics Core ML export guide](https://docs.ultralytics.com/integrations/coreml) for the dependencies and current supported exporter combinations.

1. Rename the resulting package directory to `HazardDetector.mlpackage`.
2. Place it in `ios/PathwayApp/`.
3. Run `python3 ios/generate_project.py` from the repository root.
4. Build in Xcode. Xcode compiles the package into `HazardDetector.mlmodelc`; the app loads it by that name.
5. Verify its model preview identifies objects and that Vision returns recognized-object observations. The UI reports unsupported outputs instead of pretending the detector is active.
6. Test box alignment in portrait at all four corners with a known object. Delivered camera buffers are portrait-oriented; Vision uses `.up`; preview uses aspect-fit. Any crop or rotation change needs an overlay alignment test.

The model is not a trip-hazard classifier. The image-position rule filters ordinary object detections. COCO labels do not include curled rug edges. No distance or reliable floor contact is inferred.

Sources: [Apple Vision Core ML request](https://developer.apple.com/documentation/vision/vncoremlrequest), [Ultralytics Core ML export guide](https://docs.ultralytics.com/integrations/coreml).
