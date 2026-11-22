const formatoCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** 15000 → "$ 15.000" */
export function formatearCop(valor: number): string {
  return formatoCop.format(valor);
}
