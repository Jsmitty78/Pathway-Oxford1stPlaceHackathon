"""
hazard_detector.py — Pathway's on-device hazard detector.

ORIGINAL HACKATHON CODE. This is the live YOLO detector written during the
Oxford Venture 2026 Hackathon and is the one substantial piece of the original
implementation that survived. It is preserved deliberately: `isHazard()` below is
the rule that `classifyDetection()` in `src/pathwayEngine.js` is a port of, and
OBJECT_COLOUR / HAZARD_COLOUR are the colours the browser demo reuses.

Only three changes were made for this repository, all noted inline with
`# reconstruction:`
  1. `np.int0` -> `np.intp`         (np.int0 was removed in NumPy 2.0)
  2. an f-string with nested same-type quotes was split out into a variable
     (that syntax is only valid on Python 3.12+)
  3. the file was renamed from `yolo_example_live_2.py`

Nothing else about the detection logic was touched. See docs/RECONSTRUCTION_NOTES.md.

Usage:
    python vision/hazard_detector.py --model yolo26n.pt --camera 0 --hazards

Requirements:
    pip install -r vision/requirements.txt
"""

import argparse
import time
import cv2
from copy import deepcopy
import numpy as np
from ultralytics import YOLO

OBJECT_COLOUR = (0, 255, 0)
OBJECT_THICKNESS = 2
HAZARD_COLOUR = (0, 50, 200)
HAZARD_COLOUR2 = (150, 150)
HAZARD_THICKNESS = 10
OBJ_DICT = {0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 4: 'airplane', 5: 'bus', 6: 'train', 7: 'truck', 8: 'boat', 9: 'traffic light', 10: 'fire hydrant', 11: 'stop sign', 12: 'parking meter', 13: 'bench', 14: 'bird', 15: 'cat', 16: 'dog', 17: 'horse', 18: 'sheep', 19: 'cow', 20: 'elephant', 21: 'bear', 22: 'zebra', 23: 'giraffe', 24: 'backpack', 25: 'umbrella', 26: 'handbag', 27: 'tie', 28: 'suitcase', 29: 'frisbee', 30: 'skis', 31: 'snowboard', 32: 'sports ball', 33: 'kite', 34: 'baseball bat', 35: 'baseball glove', 36: 'skateboard', 37: 'surfboard', 38: 'tennis racket', 39: 'bottle', 40: 'wine glass', 41: 'cup', 42: 'fork', 43: 'knife', 44: 'spoon', 45: 'bowl', 46: 'banana', 47: 'apple', 48: 'sandwich', 49: 'orange', 50: 'broccoli', 51: 'carrot', 52: 'hot dog', 53: 'pizza', 54: 'donut', 55: 'cake', 56: 'chair', 57: 'couch', 58: 'potted plant', 59: 'bed', 60: 'dining table', 61: 'toilet', 62: 'tv', 63: 'laptop', 64: 'mouse', 65: 'remote', 66: 'keyboard', 67: 'cell phone', 68: 'microwave', 69: 'oven', 70: 'toaster', 71: 'sink', 72: 'refrigerator', 73: 'book', 74: 'clock', 75: 'vase', 76: 'scissors', 77: 'teddy bear', 78: 'hair drier', 79: 'toothbrush'}
OBJ_DICT_BACK = dict((i, k) for (k, i) in OBJ_DICT.items())
EXCLUDED_OBJECT_NAMES = ['person', 'bed', 'suitcase', 'couch']
EXCLUDED_OBJECTS = set(id_ for id_ in [OBJ_DICT_BACK[name] for name in EXCLUDED_OBJECT_NAMES])

def draw_rotated_box(frame, cx, cy, w, h, angle_deg, color=OBJECT_COLOUR, thickness=OBJECT_THICKNESS):
    """Draw a rotated rectangle given center, size and angle (degrees)."""
    rect = ((float(cx), float(cy)), (float(w), float(h)), float(angle_deg))
    pts = cv2.boxPoints(rect)  # 4x2 float32
    pts = np.intp(pts)  # reconstruction: was np.int0, removed in NumPy 2.0
    cv2.drawContours(frame, [pts], 0, color, thickness)

def safe_get_box_xyxy(box):
    """Try to extract axis-aligned xyxy if available."""
    # box may be a Boxes object; try common attributes
    try:
        # Ultralytics Boxes: .xyxy (Tensor Nx4) -> take first row
        xy = box.xyxy[0].tolist()
        return [int(x) for x in xy]
    except Exception:
        return None

def safe_get_rotated_box(box):
    """
    Try to extract rotated box coordinates in common formats:
    - xyxyr (cx,cy,w,h,angle) or
    - xywhr or similar.
    Returns (cx,cy,w,h,angle_deg) or None.
    """
    candidates = ["xyxyr", "xywhr", "xywhr", "xywh", "xywhrot"]  # heuristic list
    for attr in candidates:
        try:
            val = getattr(box, attr)
            # Some formats give a tensor Nx5, take first row
            if val is None:
                continue
            arr = val[0].tolist()
            if len(arr) >= 5:
                cx, cy, w, h, angle = arr[0], arr[1], arr[2], arr[3], arr[4]
                # Ultralytics angle may be in radians or degrees; try to detect reasonable range
                if abs(angle) > 10:  # likely degrees already
                    angle_deg = float(angle)
                else:
                    # small value probably radians -> convert
                    angle_deg = float(angle) * 180.0 / np.pi
                return (cx, cy, w, h, angle_deg)
        except Exception:
            continue
    # as a last resort try .xyxy and infer cx,cy,w,h with 0 angle
    try:
        xyxy = box.xyxy[0].tolist()
        x1,y1,x2,y2 = xyxy
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        w = abs(x2 - x1)
        h = abs(y2 - y1)
        return (cx, cy, w, h, 0.0)
    except Exception:
        return None

class WriteTriplet:
    def __init__(self, outs):
        self.outs = outs

    def write(self, *frames):
        for out, frame in zip(self.outs, frames):
            out.write(frame)

    def release(self):
        for out in self.outs:
            out.release()

def isHazard(frame_height, cls, conf, y1, y2=None):
    if y2 is not None:
        return  max(y1, y2) > frame_height*0.65 and min(y1, y2) > frame_height*0.15 and (not cls in EXCLUDED_OBJECTS) and (True if conf is None else conf > 0.5)
    else:
        return y1 > frame_height*0.5 and not cls in EXCLUDED_OBJECTS
    
def main(args):
    with open("log.txt", "wt") as f:
        f.write("")

    # Load model
    print(f"Loading model: {args.model}")
    model = YOLO(args.model)

    # Print class names for reference
    try:
        names = model.names
        print("Model class names:", names)
    except Exception:
        names = {}
        print("Could not read model class names; continuing.")

    cap = cv2.VideoCapture(args.camera if not args.camera.isdigit() else int(args.camera))
    LIVE = args.camera.isdigit() 
    if LIVE:
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
    #cap = cv2.VideoCapture("./media/videos/video1.mp4")
    if not cap.isOpened():
        print("ERROR: could not open camera / video:", args.camera)
        return
    
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) if not LIVE else 15
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    # Initialize the writer: (filename, codec, frames-per-second, (width, height))
    outs = []
    for i in range(3):
        # reconstruction: split out of an f-string with nested same-type quotes,
        # which only parses on Python 3.12+.
        stem = args.camera.split(".")[1] if not LIVE else None
        out_name = f".{stem}_out{i}.mp4" if not LIVE else f"./media/videos/webcam_out{i}.mp4"
        outs.append(cv2.VideoWriter(out_name, fourcc, fps, (frame_width, frame_height)))
    out = WriteTriplet(outs)

    fps_t0 = time.time()
    frames = 0

    while True:
        ret, frame = cap.read()
        frameBoxes, frameHazards = deepcopy(frame), deepcopy(frame)
        if not ret:
            print("End of stream or cannot read frame.")
            break

        # Run inference (Ultralytics accepts numpy BGR images)
        results = model(frame, imgsz=args.imgsz, conf=args.conf, device=args.device)
        # results is a Results object; iterate results[0] for the first (and only) frame
        if len(results) == 0:
            # show frame anyway
            cv2.imshow("live", frame)
            if cv2.waitKey(1) & 0xFF == 27:
                break
            continue

        r = results[0]
        boxes = getattr(r, "boxes", None)  # Boxes object or None

        if boxes is not None:
            frameBoxes, frameHazards = deepcopy(frame), deepcopy(frame)

            # boxes is iterable; each box may have attributes .xyxy, .xyxyr, .cls, .conf
            for i, box in enumerate(boxes):
                # get class and confidence
                try:
                    cls = int(box.cls[0]) if hasattr(box, "cls") else int(box.cls)  # fallback
                except Exception:
                    cls = None
                try:
                    conf = float(box.conf[0]) if hasattr(box, "conf") else float(box.conf)
                except Exception:
                    conf = None

                label = ""
                if cls is not None and names:
                    label = f"{names.get(cls, str(cls))}"
                if conf is not None:
                    label = f"{label} {conf:.2f}".strip()

                # Try axis-aligned first
                xyxy = safe_get_box_xyxy(box)
                if xyxy:
                    x1,y1,x2,y2 = xyxy

                    #print(min(y1, y2), max(y1, y2))

                    cv2.rectangle(frameBoxes, (x1,y1), (x2,y2), OBJECT_COLOUR, OBJECT_THICKNESS)
                    cv2.putText(frameBoxes, label, (max(0,x1), max(15,y1-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, OBJECT_COLOUR, 2)
                    
                    if isHazard(frame_height, cls, conf, y1, y2=y2):
                        with open("log.txt", "at") as f:
                            f.write(f"Low Object {label} detected\n")
                        cv2.rectangle(frameHazards, (x1,y1), (x2,y2), HAZARD_COLOUR, HAZARD_THICKNESS)
                        #cv2.putText(frameHazards, label, (max(0,x1), max(15,y1-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, HAZARD_COLOUR, 2)
                else:
                    # Try rotated / OBB formats
                    rot = safe_get_rotated_box(box)
                    if rot is not None:
                        cx, cy, w, h, angle_deg = rot

                        #if cy > 250:
                        #    with open("log.txt", "at") as f:
                        #        f.write(f"Low Object {label} detected\n")

                        # Draw rotated rectangle
                        draw_rotated_box(frameBoxes, cx, cy, w, h, angle_deg, color=OBJECT_COLOUR, thickness=OBJECT_THICKNESS)
                        # put text near center
                        tx = int(max(0, cx - w/2))
                        ty = int(max(15, cy - h/2 - 6))
                        cv2.putText(frameBoxes, label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.5, OBJECT_COLOUR, 2)

                        if isHazard(frame_height, cls, conf, cy):
                            with open("log.txt", "at") as f:
                                f.write(f"Low Object {label} detected\n")
                            draw_rotated_box(frameHazards, cx, cy, w, h, angle_deg, color=HAZARD_COLOUR2, thickness=HAZARD_THICKNESS)
                            tx = int(max(0, cx - w/2))
                            ty = int(max(15, cy - h/2 - 6))
                            cv2.putText(frameHazards, label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.5, HAZARD_COLOUR2, 2)
                    else:
                        # Nothing to draw for this box
                        #out.write(frame, frame, frame)
                        continue
        else:
            frameBoxes = frame; frameHazards = frame

        # FPS and show
        #frames += 1
        #if frames % 10 == 0:
        #    fps = frames / (time.time() - fps_t0 + 1e-6)
        #    cv2.putText(frame, f"FPS: {fps:.1f}", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

        if args.hazards:
            cv2.imshow("live", frameHazards)
        else:
            cv2.imshow("live", frameBoxes)

        out.write(frame, frameBoxes, frameHazards)
        key = cv2.waitKey(1) & 0xFF
        if key == 27:
            break
        elif key == ord('q'):
            break

    cap.release()
    out.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--model", type=str, default="yolo26n.pt", help="path or name of the YOLO model (default: yolo26n-obb.pt)")
    p.add_argument("--camera", type=str, default="./media/videos/video1.mp4", help="camera index or video file path")
    p.add_argument("--imgsz", type=int, default=640, help="inference image size")
    p.add_argument("--conf", type=float, default=0.25, help="confidence threshold")
    p.add_argument("--device", type=str, default="cpu", help="device to run on, e.g. '0' for CUDA or 'cpu'")
    p.add_argument("--hazards", action=argparse.BooleanOptionalAction, default=False, help="flag to show only hazard boxes on live display")
    args = p.parse_args()
    main(args)

'''
{0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 4: 'airplane', 5: 'bus', 6: 'train', 7: 'truck', 8: 'boat', 9: 'traffic light', 10: 'fire hydrant', 11: 'stop sign', 12: 'parking meter', 13: 'bench', 14: 'bird', 15: 'cat', 16: 'dog', 17: 'horse', 18: 'sheep', 19: 'cow', 20: 'elephant', 21: 'bear', 22: 'zebra', 23: 'giraffe', 24: 'backpack', 25: 'umbrella', 26: 'handbag', 27: 'tie', 28: 'suitcase', 29: 'frisbee', 30: 'skis', 31: 'snowboard', 32: 'sports ball', 33: 'kite', 34: 'baseball bat', 35: 'baseball glove', 36: 'skateboard', 37: 'surfboard', 38: 'tennis racket', 39: 'bottle', 40: 'wine glass', 41: 'cup', 42: 'fork', 43: 'knife', 44: 'spoon', 45: 'bowl', 46: 'banana', 47: 'apple', 48: 'sandwich', 49: 'orange', 50: 'broccoli', 51: 'carrot', 52: 'hot dog', 53: 'pizza', 54: 'donut', 55: 'cake', 56: 'chair', 57: 'couch', 58: 'potted plant', 59: 'bed', 60: 'dining table', 61: 'toilet', 62: 'tv', 63: 'laptop', 64: 'mouse', 65: 'remote', 66: 'keyboard', 67: 'cell phone', 68: 'microwave', 69: 'oven', 70: 'toaster', 71: 'sink', 72: 'refrigerator', 73: 'book', 74: 'clock', 75: 'vase', 76: 'scissors', 77: 'teddy bear', 78: 'hair drier', 79: 'toothbrush'}
people, vehicles, traffic_lights & stop signs, bench, animals, backpack, handbag, suitcase, cutlery, fruits, tech, appliances, teddy bear 

pople, chair, remote, book, teddy bear

'''