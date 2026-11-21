export function buildWhatsAppLink(numero: string, producto: string): string {
  const limpio = numero.replace(/\D/g, "");
  const mensaje = `Hola, quisiera información sobre: ${producto}`;
  return `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
}