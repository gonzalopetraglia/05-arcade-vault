/**
 * Traducción literal de references/source-assets/snake-assets/sprites.js.
 *
 * Los 22 recortes de fruta con sus coordenadas exactas. La hoja original mide
 * 3790x442 px con fondo transparente; la fila usada empieza en y = 136 y mide
 * 160 px de alto. Origen de la imagen: spriters-resource, Google Snake Game.
 *
 * El único cambio estructural es el mismo que hizo el port de Arkanoid: la
 * carga pasa por una promesa cacheada a nivel de módulo, y quien dibuja recibe
 * la imagen por parámetro en vez de leer un global.
 */

export type Frame = { sx: number; sy: number; sw: number; sh: number };

export type FruitName =
  | "banana"
  | "orange"
  | "grape"
  | "garlic"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "peach"
  | "peanut"
  | "apple"
  | "tomato"
  | "berries"
  | "grapes2"
  | "pineapple"
  | "melon";

export const FRUITS: Record<FruitName, Frame> = {
  banana: { sx: 34, sy: 136, sw: 110, sh: 160 },
  orange: { sx: 186, sy: 136, sw: 150, sh: 160 },
  grape: { sx: 378, sy: 136, sw: 110, sh: 160 },
  garlic: { sx: 540, sy: 136, sw: 130, sh: 160 },
  eggplant: { sx: 712, sy: 136, sw: 130, sh: 160 },
  strawberry: { sx: 894, sy: 136, sw: 110, sh: 160 },
  cherry: { sx: 1066, sy: 136, sw: 110, sh: 160 },
  carrot: { sx: 1228, sy: 136, sw: 130, sh: 160 },
  mushroom: { sx: 1400, sy: 136, sw: 130, sh: 160 },
  broccoli: { sx: 1582, sy: 136, sw: 110, sh: 160 },
  watermelon: { sx: 1734, sy: 136, sw: 150, sh: 160 },
  pepper: { sx: 1906, sy: 136, sw: 150, sh: 160 },
  kiwi: { sx: 2068, sy: 136, sw: 170, sh: 160 },
  lemon: { sx: 2250, sy: 136, sw: 140, sh: 160 },
  peach: { sx: 2432, sy: 136, sw: 130, sh: 160 },
  peanut: { sx: 2604, sy: 136, sw: 130, sh: 160 },
  apple: { sx: 2786, sy: 136, sw: 110, sh: 160 },
  tomato: { sx: 2948, sy: 136, sw: 130, sh: 160 },
  berries: { sx: 3110, sy: 136, sw: 150, sh: 160 },
  grapes2: { sx: 3302, sy: 136, sw: 110, sh: 160 },
  pineapple: { sx: 3454, sy: 136, sw: 150, sh: 160 },
  melon: { sx: 3637, sy: 136, sw: 130, sh: 160 },
};

/** Lista plana de nombres, para elegir una fruta al azar. */
export const FRUIT_NAMES: FruitName[] = Object.keys(FRUITS) as FruitName[];

export const FRUITS_SRC = "/games/snake/fruits.png";

let fruitsPromise: Promise<HTMLImageElement> | null = null;

/**
 * Carga la hoja de frutas una sola vez por sesión. La promesa se cachea a nivel
 * de módulo, así que entrar y salir del juego no vuelve a descargar la imagen.
 */
export function loadFruits(): Promise<HTMLImageElement> {
  if (fruitsPromise) return fruitsPromise;

  fruitsPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Una carga fallida no debe envenenar la caché: el siguiente intento
      // vuelve a pedir la imagen.
      fruitsPromise = null;
      reject(new Error("Failed to load snake fruits atlas"));
    };
    img.src = FRUITS_SRC;
  });

  return fruitsPromise;
}
