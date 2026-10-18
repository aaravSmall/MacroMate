/**
 * On-device text recognition adapter (Apple Vision on iOS, ML Kit on Android, via
 * expo-text-extractor). Free, offline, and nothing leaves the device.
 */
import { extractTextFromImage, isSupported } from 'expo-text-extractor';

export const isTextRecognitionSupported: boolean = isSupported;

/** All recognized text in the image, one recognized line per line. */
export async function recognizeText(imageUri: string): Promise<string> {
  const lines = await extractTextFromImage(imageUri);
  return lines.join('\n');
}
