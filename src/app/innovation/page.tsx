import CategoryAssessmentClient from "@/components/assessment/CategoryAssessmentClient";
import { CATEGORY_CONFIG } from "@/lib/assessment-config";

export default function InnovationPage() {
  return <CategoryAssessmentClient config={CATEGORY_CONFIG.innovation} />;
}
