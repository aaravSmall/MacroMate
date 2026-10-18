import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import { isTextRecognitionSupported, recognizeText } from '@/lib/textRecognition';

import { useLabelScanStore } from '../labelScanStore';
import { EMPTY_FOOD_FORM } from '../logic/foodForm';
import { labelToFoodForm } from '../logic/labelForm';
import { parseNutritionLabel } from '../logic/labelParser';

export type LabelScanState =
  { status: 'idle' } | { status: 'reading' } | { status: 'error'; message: string };

const NOT_A_LABEL =
  "We couldn't find a Nutrition Facts panel in that photo. Try again with the panel flat, well lit, and filling the frame, or enter the food yourself.";

/** Deletes the picker's temporary copy. The photo is only ever read on the device. */
function discard(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // Already gone, or outside the app's cache: nothing to clean up.
  }
}

/**
 * Takes or picks a photo of a Nutrition Facts panel, reads it on the device, and stores the
 * parsed result to prefill the create-food form. Resolves true when a prefill is ready.
 */
export function useLabelScan() {
  const [state, setState] = useState<LabelScanState>({ status: 'idle' });
  const setPrefill = useLabelScanStore((s) => s.setPrefill);

  async function scan(from: 'camera' | 'library'): Promise<boolean> {
    if (!isTextRecognitionSupported) {
      setState({ status: 'error', message: "Text recognition isn't available on this device." });
      return false;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setState({
            status: 'error',
            message:
              'Camera access is off. You can turn it on in Settings, or choose a photo instead.',
          });
          return false;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      }
    } catch {
      setState({
        status: 'error',
        message:
          from === 'camera'
            ? "The camera isn't available here. Choose a photo from your library instead."
            : "We couldn't open your photos.",
      });
      return false;
    }

    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (!uri) {
      setState({ status: 'idle' });
      return false;
    }

    setState({ status: 'reading' });
    try {
      const text = await recognizeText(uri);
      const prefill = labelToFoodForm(parseNutritionLabel(text), EMPTY_FOOD_FORM);
      if (prefill.looksEmpty) {
        setState({ status: 'error', message: NOT_A_LABEL });
        return false;
      }
      setPrefill(prefill);
      setState({ status: 'idle' });
      return true;
    } catch {
      setState({ status: 'error', message: "We couldn't read that photo. Try another one." });
      return false;
    } finally {
      discard(uri);
    }
  }

  return { state, scan };
}
