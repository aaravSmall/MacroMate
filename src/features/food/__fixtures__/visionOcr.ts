/**
 * Real Apple Vision output (VNRecognizeTextRequest, .accurate) for rendered Nutrition Facts
 * panels; expo-text-extractor uses the same engine on iOS. Vision reads the label column, then
 * the value column, so values like calories and the serving measure land on separate lines.
 */
export const VISION_STANDARD =
  'Nutrition Facts\n8 servings per container\nServing size\nAmount per serving\nCalories\nTotal Fat 8g\nSaturated Fat 1g\nTrans Fat 0g\nCholesterol 0mg\nSodium 160mg\nTotal Carbohydrate 37g\nDietary Fiber 4g\nTotal Sugars 12g\nIncludes 10g Added Sugars\nProtein 3g\nVitamin D 2mcg\nCalcium 260mg\nIron 8mg\nPotassium 240mg\n2/3 cup (55g)\n230\n% Daily Value*\n10%\n5%\n0%\n7%\n13%\n14%\n20%\n10%\n20%\n45%\n6%';

export const VISION_DRINK =
  'Nutrition Facts\n1 serving per container\nServing size\nCalories\nTotal Fat 0g\nSodium 45mg\nTotal Carbohydrate 39g\nTotal Sugars 39g\nIncludes 39g Added Sugars\nProtein 0g\n1 can (355 mL)\n140\n0%\n2%\n14%\n78%';
