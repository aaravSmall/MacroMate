import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function LabelScanScreen() {
  return (
    <PlaceholderScreen
      title="Scan nutrition label"
      description="Take a photo of a nutrition facts panel to auto-fill a new food for you to review."
      edges={['bottom', 'left', 'right']}
    />
  );
}
