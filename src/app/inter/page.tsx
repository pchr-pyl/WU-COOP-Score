import AuthenticatedCategoryAssessmentClient from "@/components/assessment/AuthenticatedCategoryAssessmentClient";
import { CATEGORY_CONFIG } from "@/lib/assessment-config";

export default function InterPage() {
  return <AuthenticatedCategoryAssessmentClient config={CATEGORY_CONFIG.inter} />;
}
