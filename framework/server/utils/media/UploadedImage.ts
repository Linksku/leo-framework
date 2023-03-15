import type { Sharp, Metadata, FitEnum } from 'sharp';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import https from 'https';
import http from 'http';

import getCroppedMediaDim from 'utils/media/getCroppedMediaDim';

export default class UploadedImage {
  filePath: string;
  img?: Sharp;
  metadata?: Metadata;
  newHeight = 0;
  newWidth = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  clone() {
    const img = new UploadedImage(this.filePath);
    img.img = this.img?.clone();
    img.metadata = this.metadata;
    img.newHeight = this.newHeight;
    img.newWidth = this.newWidth;
    return img;
  }

  async getImg() {
    if (!this.img) {
      if (this.filePath.startsWith('http:') || this.filePath.startsWith('https:')) {
        const stream = await new Promise<http.IncomingMessage>(succ => {
          (this.filePath.startsWith('http:') ? http.get : https.get)(
            this.filePath,
            stream2 => {
              succ(stream2);
            },
          );
        });

        this.img = stream.pipe(sharp());
      } else {
        const handle = await fs.open(this.filePath);
        const stream = handle.createReadStream();
        this.img = stream.pipe(sharp());
      }
    }
    return this.img;
  }

  async getMetadata() {
    if (!this.metadata) {
      const img = await this.getImg();
      this.metadata = await img.metadata();
    }
    return this.newHeight && this.newWidth
      ? {
        ...this.metadata,
        height: this.newHeight,
        width: this.newWidth,
      }
      : this.metadata;
  }

  async crop({
    top,
    left,
    right,
    bot,
  }: {
    top: number,
    left: number,
    right: number,
    bot: number,
  }) {
    const img = await this.getImg();
    const { height, width, orientation } = await this.getMetadata();

    if (!height || !width) {
      throw new Error('UploadedImage.crop: invalid image');
    }
    if (top < 0 || left < 0 || right < 0 || bot < 0
      || top + bot > 90 || left + right > 90) {
      throw new Error('UploadedImage.crop: nvalid crop');
    }

    const oldTop = top;
    const oldLeft = left;
    const oldRight = right;
    const oldBot = bot;
    switch (orientation) {
      case 1:
        break;
      case 2:
        left = oldRight;
        right = oldLeft;
        break;
      case 3:
        top = oldBot;
        left = oldRight;
        right = oldLeft;
        bot = oldTop;
        break;
      case 4:
        top = oldBot;
        bot = oldTop;
        break;
      case 5:
        top = oldLeft;
        left = oldTop;
        right = oldBot;
        bot = oldRight;
        break;
      case 6:
        top = oldRight;
        left = oldTop;
        right = oldBot;
        bot = oldLeft;
        break;
      case 7:
        top = oldRight;
        left = oldBot;
        right = oldTop;
        bot = oldLeft;
        break;
      case 8:
        top = oldLeft;
        left = oldBot;
        right = oldTop;
        bot = oldRight;
        break;
      default:
        break;
    }

    this.newHeight = Math.round((100 - top - bot) / 100 * height);
    this.newWidth = Math.round((100 - left - right) / 100 * width);
    this.img = img
      .extract({
        top: Math.round(top / 100 * height),
        left: Math.round(left / 100 * width),
        height: this.newHeight,
        width: this.newWidth,
      })
      .withMetadata();
  }

  async fit({
    maxDim,
    maxRatio = 1,
    fit = 'cover',
  }: {
    maxDim: number,
    maxRatio?: number,
    fit?: keyof FitEnum,
  }) {
    const img = await this.getImg();
    const { height, width, orientation } = await this.getMetadata();

    if (!height || !width) {
      throw new Error('UploadedImage.fit: invalid image');
    }
    const { newHeight, newWidth } = getCroppedMediaDim({
      height,
      width,
      maxDim,
      maxRatio,
    });

    // Sharp doesn't use EXIF orientation https://sharp.pixelplumbing.com/api-input#metadata
    const isRotated90Deg = orientation && orientation >= 5;
    this.newHeight = isRotated90Deg ? newWidth : newHeight;
    this.newWidth = isRotated90Deg ? newHeight : newWidth;

    if (height !== newHeight || width !== newWidth) {
      this.img = img
        .resize({
          height: newHeight,
          width: newWidth,
          fit,
        })
        .withMetadata();
    }
  }

  // todo: mid/mid export images as webp
  async convertToJpg({
    quality = 90,
  } = {}): Promise<Buffer> {
    const img = await this.getImg();

    return img
      .withMetadata()
      .flatten({
        background: { r: 255, g: 255, b: 255 },
      })
      .toFormat('jpeg')
      .jpeg({
        quality,
        progressive: true,
      })
      .toBuffer();
  }
}
