import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from '@tauri-apps/api/image';

//image转blob
export const displayImageFromRGBA = (rgbaArray: Uint8Array, width: number, height: number): Promise<Blob> => {
    return new Promise((resolve,reject)=>{
      const imageData = new ImageData(new Uint8ClampedArray(rgbaArray), width, height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if(ctx==null){
        throw new Error("canvas 为null")
      }
      ctx.putImageData(imageData, 0, 0);

      // 方法2: 使用 Blob 和 URL.createObjectURL
      canvas.toBlob((blob) => {
        blob == null ? reject(new Error("blob转换错误")) : resolve(blob)
      }, 'image/png');
    })

}

let interval: any = null;
let attemptCount = 0;
const maxAttempts = 10; // 最大尝试次数
//获取剪切板上的图片，最多尝试10s
export function getClipImage(): Promise<Image> {
  // 如果已经有定时器在运行，则清除之前的定时器
  if (interval !== null) {
    clearInterval(interval);
    interval = null;
    attemptCount = 0; // 重置尝试次数
  }

  return new Promise((resolve, reject) => {
    interval = setInterval(async () => {
      try {
        const clipboardImage = await readImage(); // 假设 readImage 是一个返回 Promise 的函数
        clearInterval(interval); // 成功读取后清除定时器
        interval = null;
        attemptCount = 0; // 重置尝试次数
        resolve(clipboardImage); // 返回读取到的图像数据
      } catch (err) {
        attemptCount++;
        if (attemptCount >= maxAttempts) {
          clearInterval(interval); // 达到最大尝试次数后清除定时器
          interval = null;
          attemptCount = 0; // 重置尝试次数
          reject(new Error('Max attempts reached. Unable to read clipboard image.')); // 抛出错误
        }
      }
    }, 500);
  });

}

export const blobTobase64 = (blob: Blob) => {
    return new Promise<String>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = function (e) {
          if (typeof e.target?.result == 'string') {
            resolve(e.target?.result)
          }else{
            reject(new Error("编码转换错误。"))
          }
          
        }
        reader.readAsDataURL(blob)
      })
}