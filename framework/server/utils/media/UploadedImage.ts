import type {
  Sharp,
  SharpOptions,
  Metadata,
  FitEnum,
} from 'sharp';
import { promises as fs, ReadStream } from 'fs';
import sharp from 'sharp';
import https from 'https';
import http from 'http';

import getCroppedMediaDim from 'utils/media/getCroppedMediaDim';

export default class UploadedImage {
  filePath: string;
  stream?: ReadStream | http.IncomingMessage;
  sharpOptions?: SharpOptions;
  sharp?: Sharp;
  metadata?: Metadata;
  newHeight = 0;
  newWidth = 0;

  constructor(filePath: string, sharpOptions?: SharpOptions) {
    this.filePath = filePath;
    this.sharpOptions = sharpOptions;
  }

  clone(newOptions?: SharpOptions) {
    if (!process.env.PRODUCTION && !this.stream) {
      ErrorLogger.warn(new Error('UploadedImage.clone: haven\'t read file yet, pointless clone()'));
    }

    const img = new UploadedImage(this.filePath);
    img.stream = this.stream; // Maybe need to clone stream?
    img.sharpOptions = {
      ...this.sharpOptions,
      ...newOptions,
    };
    img.sharp = newOptions ? undefined : this.sharp?.clone();
    img.metadata = newOptions ? undefined : this.metadata;
    img.newHeight = this.newHeight;
    img.newWidth = this.newWidth;
    return img;
  }

  async getImgStream() {
    if (!this.stream) {
      if (this.filePath.startsWith('http:') || this.filePath.startsWith('https:')) {
        this.stream = await new Promise<http.IncomingMessage>(succ => {
          (this.filePath.startsWith('http:') ? http.get : https.get)(
            this.filePath,
            stream2 => {
              succ(stream2);
            },
          );
        });
      } else {
        const handle = await fs.open(this.filePath);
        this.stream = handle.createReadStream();
      }
    }
    return this.stream;
  }

  async getSharpImg() {
    if (!this.sharp) {
      const stream = await this.getImgStream();
      this.sharp = stream.pipe(sharp({
        animated: true,
        ...this.sharpOptions,
      }));
    }
    return TS.defined(this.sharp);
  }

  async getMetadata() {
    if (!this.metadata) {
      const img = await this.getSharpImg();
      this.metadata = await img.metadata();
    }
    return this.newHeight && this.newWidth
      ? {
        ...this.metadata,
        height: this.newHeight,
        width: this.newWidth,
      }
      : {
        ...this.metadata,
        height: this.metadata.pageHeight ?? this.metadata.height,
      };
  }

  async isAnimated() {
    if (this.sharpOptions?.animated === false || this.sharpOptions?.pages === 1) {
      return false;
    }

    const metadata = await this.getMetadata();
    return metadata.pages && metadata.pages > 1;
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
    const img = await this.getSharpImg();
    const { height, width, orientation } = await this.getMetadata();

    if (!height || !width) {
      throw new Error('UploadedImage.crop: invalid image');
    }
    if (top < 0 || left < 0 || right < 0 || bot < 0
      || top + bot > 90 || left + right > 90) {
      throw new Error('UploadedImage.crop: invalid crop');
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
    this.sharp = img
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
    const img = await this.getSharpImg();
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
      this.sharp = img
        .resize({
          height: newHeight,
          width: newWidth,
          fit,
        })
        .withMetadata();
    }
  }

  async getOutput({
    quality = 90,
  } = {}): Promise<{
    buffer: Buffer,
    format: 'webp' | 'jpeg',
    extension: 'webp' | 'jpg',
  }> {
    let img = await this.getSharpImg();
    const isAnimated = await this.isAnimated();

    img = img
      .withMetadata()
      .flatten({
        background: { r: 255, g: 255, b: 255 },
      });
    img = isAnimated
      ? img
        // webp doesn't have enough support, e.g. AWS Rekognition
        .toFormat('webp')
        .webp({
          quality,
          effort: isAnimated ? 0 : 4,
        })
      : img
        .toFormat('jpeg')
        .jpeg({
          quality,
          progressive: true,
        });
    return {
      buffer: await img.toBuffer(),
      format: isAnimated ? 'webp' : 'jpeg',
      extension: isAnimated ? 'webp' : 'jpg',
    };
  }
}
