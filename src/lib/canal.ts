// Canal URES TV del cliente. Si cambia la señal o el enlace de la app, se actualiza aquí
// y en la CSP de next.config.ts (media-src / img-src), que importa estas constantes.

/** Señal en vivo (HLS) del servidor del canal. Debe ser https. */
export const CANAL_SENAL_HLS = "https://movil.ejeserver.com/live/urestv.m3u8";

/** Página de descarga de la app Android (AppCreator24). */
export const CANAL_APP_URL = "https://www.appcreator24.com/app4196310-a58bwd";

/** Código QR de descarga que genera AppCreator24. */
export const CANAL_APP_QR = "https://qr.appcreator24.com/qr.php?ida=4196310&c=a58bwd";

export const CANAL_NOMBRE = "URES TV";

/** Origen (protocolo + dominio) de una URL, para la CSP. */
export const origen = (url: string) => new URL(url).origin;
