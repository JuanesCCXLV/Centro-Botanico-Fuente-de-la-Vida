export function enlaceWhatsApp(numero: string, mensaje: string): string {
  const limpio = numero.replace(/\D/g, "");
  return `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
}

/** HU-05 / CP-08: abre el chat con el nombre del producto ya escrito. */
export function buildWhatsAppLink(numero: string, producto: string): string {
  return enlaceWhatsApp(numero, `Hola, quisiera información sobre: ${producto}`);
}
