import { AVATAR_OUTPUT_SIZE } from './schemas';

export type CropArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Recorta a área escolhida e devolve um quadrado de 512 px (WebP; JPEG onde não houver). */
export async function cropImage(src: string, area: CropArea): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponível.');

  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );

  const webp = await canvasToBlob(canvas, 'image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.88);
  if (!jpeg) throw new Error('Falha ao gerar a imagem.');
  return jpeg;
}
