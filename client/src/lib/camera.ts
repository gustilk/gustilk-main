import { Capacitor } from "@capacitor/core";

export interface PhotoResult {
  dataUrl: string;
}

async function requestCameraPermissions(needCamera: boolean, needPhotos: boolean) {
  const { Camera } = await import("@capacitor/camera");
  const current = await Camera.checkPermissions();

  const toRequest: ("camera" | "photos")[] = [];
  if (needCamera && current.camera !== "granted") toRequest.push("camera");
  if (needPhotos && current.photos !== "granted") toRequest.push("photos");

  if (toRequest.length > 0) {
    const result = await Camera.requestPermissions({ permissions: toRequest });
    if (needCamera && result.camera === "denied") {
      throw new Error("Camera access denied. Please go to Settings → Gûstîlk and enable Camera access.");
    }
    if (needPhotos && result.photos === "denied") {
      throw new Error("Photo library access denied. Please go to Settings → Gûstîlk and enable Photos access.");
    }
  }
}

/**
 * Open a photo picker. On native (iOS/Android) uses the Capacitor Camera plugin
 * which is more reliable than <input type="file"> on iOS. Falls back to a hidden
 * file input on web.
 *
 * @param source "camera" | "photos" | "prompt" (default: "prompt" shows a sheet)
 */
export async function pickPhoto(source: "camera" | "photos" | "prompt" = "prompt"): Promise<PhotoResult | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

      await requestCameraPermissions(
        source === "camera" || source === "prompt",
        source === "photos" || source === "prompt",
      );

      const sourceMap = {
        camera: CameraSource.Camera,
        photos: CameraSource.Photos,
        prompt: CameraSource.Prompt,
      };
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: sourceMap[source],
        quality: 85,
        allowEditing: false,
        correctOrientation: true,
      });
      return photo.dataUrl ? { dataUrl: photo.dataUrl } : null;
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("cancelled") || msg.includes("cancel") || msg.includes("dismissed")) return null;
      throw err;
    }
  }

  // Web: programmatic file input
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = e => resolve({ dataUrl: e.target?.result as string });
      reader.readAsDataURL(file);
    };
    // Some browsers fire oncancel, others just never fire onchange
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Open front-facing camera for a verification selfie.
 * On native uses CameraDirection.Front. On web uses capture="user" hint.
 */
export async function pickSelfie(): Promise<PhotoResult | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource, CameraDirection } = await import("@capacitor/camera");

      await requestCameraPermissions(true, false);

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        quality: 85,
        allowEditing: false,
        correctOrientation: true,
      });
      return photo.dataUrl ? { dataUrl: photo.dataUrl } : null;
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("cancelled") || msg.includes("cancel") || msg.includes("dismissed")) return null;
      throw err;
    }
  }

  // Web: file input with front camera hint
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "user");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = e => resolve({ dataUrl: e.target?.result as string });
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
