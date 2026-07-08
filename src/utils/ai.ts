/**
 * Mock AI Engine for Phase 13
 * 
 * Simulates a conversational LLM connection with strict safety rails.
 * Does not provide medical diagnoses.
 */

export async function askAI(query: string): Promise<string> {
  return new Promise((resolve) => {
    // Simulate network delay for AI processing
    setTimeout(() => {
      const q = query.toLowerCase();
      let response = "I'm here to help you track your health and understand your cycle better! How can I assist you today?";

      // Basic NLP Keyword Matching
      if (q.includes('cramp') || q.includes('pain') || q.includes('hurt')) {
        response = "Cramps are common during the luteal and menstrual phases due to prostaglandins. Staying hydrated, using a heating pad, and gentle stretching can often help manage the discomfort.";
      } else if (q.includes('cycle') || q.includes('period') || q.includes('when')) {
        response = "Based on your recent logs and our Phase 9 prediction engine, your next period is predicted to start in 12 days. You are currently in the Follicular phase.";
      } else if (q.includes('fatigue') || q.includes('tired') || q.includes('sleep')) {
        response = "Fatigue can be linked to hormonal shifts, especially a drop in estrogen or iron levels during menstruation. Prioritizing rest and iron-rich foods might help boost your energy.";
      } else if (q.includes('ovulat') || q.includes('fertil') || q.includes('pregnant')) {
        response = "Your peak fertility window and ovulation are predicted to occur tomorrow. This is typically when estrogen and LH levels surge in your body.";
      }

      // STRICT SAFETY OVERRIDE: Append medical disclaimer to ALL generated responses
      const finalResponse = `${response}\n\n*Disclaimer: I am an AI assistant. Please consult a healthcare professional for medical diagnoses or if symptoms persist.*`;
      
      resolve(finalResponse);
    }, 1500); // 1.5s artificial delay
  });
}
