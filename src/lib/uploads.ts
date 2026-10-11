import { fileTypeFromBuffer } from "file-type";
import { unzipSync } from "fflate";
import sharp from "sharp";
const extensions = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "hwp",
  "hwpx",
  "docx",
  "pptx",
  "xlsx",
];
export function uploadLimit(name: string, album: boolean, size: number) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  if (
    !(album ? ["jpg", "jpeg", "png", "webp"] : extensions).includes(extension)
  )
    throw new Error("허용되지 않는 파일 형식입니다.");
  if (size <= 0 || size > (album ? 10 : 20) * 1024 * 1024)
    throw new Error(`파일은 ${album ? 10 : 20}MB 이하로 선택해 주세요.`);
  return extension;
}
export async function inspectUpload(
  bytes: Buffer,
  name: string,
  album: boolean,
) {
  const extension = uploadLimit(name, album, bytes.length);
  const detected = await fileTypeFromBuffer(bytes);
  const normalized = extension === "jpeg" ? "jpg" : extension;
  if (["jpg", "png", "webp"].includes(normalized)) {
    if (detected?.ext !== normalized)
      throw new Error("사진 확장자와 실제 형식이 다릅니다.");
    const pipeline = sharp(bytes, {
      limitInputPixels: 40_000_000,
      animated: false,
    }).rotate();
    const original = await pipeline.webp({ quality: 88 }).toBuffer();
    uploadLimit("photo.webp", album, original.length);
    const thumb = album
      ? await sharp(original)
          .resize({
            width: 640,
            height: 480,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 75 })
          .toBuffer()
      : null;
    return { bytes: original, thumb, mime: "image/webp", extension: "webp" };
  }
  if (normalized === "pdf") {
    if (detected?.ext !== "pdf") throw new Error("올바른 PDF가 아닙니다.");
  } else if (normalized === "hwp") {
    if (
      bytes.subarray(0, 8).toString("hex") !== "d0cf11e0a1b11ae1" ||
      !bytes.includes(Buffer.from("HWP Document File"))
    )
      throw new Error("올바른 HWP가 아닙니다.");
  } else {
    const names: string[] = [];
    let mime = "";
    unzipSync(bytes, {
      filter: (file) => {
        names.push(file.name);
        if (file.name === "mimetype" && file.originalSize <= 128) return true;
        return false;
      },
    });
    const small = unzipSync(bytes, {
      filter: (file) => file.name === "mimetype" && file.originalSize <= 128,
    });
    if (small.mimetype) mime = new TextDecoder().decode(small.mimetype);
    if (names.some((n) => /vbaProject|\.exe$|\.js$|\.html$/i.test(n)))
      throw new Error("실행 코드가 포함된 문서는 허용하지 않습니다.");
    const required: Record<string, string> = {
      docx: "word/document.xml",
      pptx: "ppt/presentation.xml",
      xlsx: "xl/workbook.xml",
      hwpx: "Contents/content.hpf",
    };
    if (
      !names.includes(required[normalized]) ||
      (normalized === "hwpx" && !mime.includes("hwp"))
    )
      throw new Error("문서의 실제 형식을 확인해 주세요.");
  }
  const mimes: Record<string, string> = {
    pdf: "application/pdf",
    hwp: "application/x-hwp",
    hwpx: "application/hwp+zip",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return { bytes, thumb: null, mime: mimes[normalized], extension: normalized };
}
