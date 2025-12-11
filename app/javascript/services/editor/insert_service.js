import * as fabric from "fabric";

export default class InsertService {
  constructor(canvas, nextMetaIndexRef) {
    this.canvas = canvas;
    this.nextMetaIndexRef = nextMetaIndexRef; // { value: number } を渡してもよい
  }

  // ===================================
  // SVG の挿入
  // ===================================
  insertSvg(svgObject, meta = {}) {
    const canvas = this.canvas;
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;

    // サイズ検査（極端な巨大物だけ縮小）
    const bounds = svgObject.getBoundingRect();
    const rawW = bounds.width || 100;
    const rawH = bounds.height || 100;
    const MAX = 3000;

    if (rawW > MAX || rawH > MAX) {
      const scale = MAX / Math.max(rawW, rawH);
      svgObject.scale(scale);
    }

    // メタ情報付与
    const metaIndex = this.generateMetaIndex();

    svgObject.set({
      originX: "center",
      originY: "center",
      left: centerX,
      top: centerY,

      partId:       meta.partId ?? null,
      partName:     meta.partName ?? meta.name ?? null,
      partCategory: meta.partCategory ?? meta.category ?? null,
      toneCode:     meta.toneCode ?? "neutral",

      metaIndex: metaIndex
    });

    // ストローク統一
    this.applyStrokeUniform(svgObject);

    svgObject.setCoords();
    canvas.add(svgObject);
    canvas.setActiveObject(svgObject);
    canvas.requestRenderAll();

    // レイヤー追加を通知
    window.dispatchEvent(
      new CustomEvent("layers:added", {
        detail: {
          index: metaIndex,
          partId: svgObject.partId,
          partName: svgObject.partName,
          partCategory: svgObject.partCategory,
          toneCode: svgObject.toneCode
        }
      })
    );

    return svgObject;
  }

  // ===================================
  // 画像挿入（bitmap）
  // ===================================
  insertImage(img, meta = {}) {
    const canvas = this.canvas;

    const maxW = canvas.getWidth() * 0.6;
    const maxH = canvas.getHeight() * 0.6;

    const rawW = img.width || 100;
    const rawH = img.height || 100;

    const scaleX = maxW / rawW;
    const scaleY = maxH / rawH;
    const scale = Math.min(scaleX, scaleY, 1);

    if (scale !== 1 && scale > 0) {
      img.scale(scale);
    }

    const metaIndex = this.generateMetaIndex();

    img.set({
      originX: "center",
      originY: "center",
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,

      partId:       meta.partId ?? null,
      partName:     meta.partName ?? meta.name ?? null,
      partCategory: meta.partCategory ?? meta.category ?? null,
      toneCode:     meta.toneCode ?? "neutral",

      metaIndex: metaIndex
    });

    img.setCoords();
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();

    window.dispatchEvent(
      new CustomEvent("layers:added", {
        detail: {
          index: metaIndex,
          partId: img.partId,
          partName: img.partName,
          partCategory: img.partCategory,
          toneCode: img.toneCode
        }
      })
    );

    return img;
  }

  // ===================================
  // strokeUniform / 塗り統一
  // ===================================
  applyStrokeUniform(obj) {
    if (!obj) return;

    // グループの場合は子要素に再帰適用
    if (obj.type === "group" && Array.isArray(obj._objects)) {
      obj._objects.forEach((child) => this.applyStrokeUniform(child));
    }

    if (typeof obj.set === "function") {
      const fill = obj.fill;
      const hasFill = !!fill && fill !== "none" && fill !== "transparent";

      const patch = {
        strokeUniform: true,
        objectCaching: false
      };

      if (hasFill) {
        patch.fill = "#BBCCDD"; // 塗り統一色
      }

      obj.set(patch);
    }
  }

  // ===================================
  // metaIndex 採番
  // ===================================
  generateMetaIndex() {
    const idx = this.nextMetaIndexRef.value;
    this.nextMetaIndexRef.value += 1;
    return idx;
  }
}
