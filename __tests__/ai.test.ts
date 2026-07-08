import { askAI } from '../src/utils/ai';

describe('Phase 13 AI Engine Safety Guardrails', () => {
  it('MUST automatically append the strict medical disclaimer when answering symptom questions', async () => {
    const query = 'How do I manage my cramps?';
    const response = await askAI(query);
    
    expect(response).toContain('Disclaimer: I am an AI assistant. Please consult a healthcare professional');
  });

  it('MUST automatically append the medical disclaimer even for generic unrelated greetings', async () => {
    const query = 'Hello there!';
    const response = await askAI(query);
    
    expect(response).toContain('Disclaimer: I am an AI assistant. Please consult a healthcare professional');
  });
  
  it('MUST correctly detect keywords and offer relevant suggestions', async () => {
    const response = await askAI('I am feeling very fatigued today.');
    expect(response).toContain('Fatigue can be linked to hormonal shifts');
  });
});
