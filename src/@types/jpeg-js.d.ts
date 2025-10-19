declare module 'jpeg-js' {
  interface JPEGDecodeOptions {
    useTArray?: boolean;
    formatAsRGBA?: boolean;
  }

  interface JPEGImageData {
    width: number;
    height: number;
    data: Uint8Array;
  }

  function decode(data: ArrayLike<number> | ArrayBuffer, options?: JPEGDecodeOptions): JPEGImageData;

  export { decode, JPEGDecodeOptions, JPEGImageData };
}
