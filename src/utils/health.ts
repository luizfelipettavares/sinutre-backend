// Faixas de IMC segundo a Organização Mundial da Saúde.
export const IMC_RANGES = [
  { label: 'Abaixo do peso', min: 0, max: 18.5, tone: 'warning' },
  { label: 'Peso normal', min: 18.5, max: 25, tone: 'success' },
  { label: 'Sobrepeso', min: 25, max: 30, tone: 'warning' },
  { label: 'Obesidade grau I', min: 30, max: 35, tone: 'error' },
  { label: 'Obesidade grau II', min: 35, max: 40, tone: 'error' },
  { label: 'Obesidade grau III', min: 40, max: Infinity, tone: 'error' },
] as const;

export interface ImcResult {
  value: number;
  label: string;
  tone: string;
  height: number;
  weight: number;
}

// IMC = peso (kg) / altura (m)². Aceita altura em metros ou centímetros.
export function calculateImc(heightInput: number, weight: number): ImcResult {
  const height = heightInput > 3 ? heightInput / 100 : heightInput;
  const value = weight / (height * height);
  const rounded = Math.round(value * 100) / 100;

  const range =
    IMC_RANGES.find((r) => rounded >= r.min && rounded < r.max) ??
    IMC_RANGES[IMC_RANGES.length - 1];

  return {
    value: rounded,
    label: range.label,
    tone: range.tone,
    height,
    weight,
  };
}
