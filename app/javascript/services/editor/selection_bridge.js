export default class SelectionBridge {
  constructor(canvas) {
    this.canvas = canvas;
  }

  // =========================================================
  // selection → canvas 反映
  // =========================================================
  applyTransformFromSelection(detail) {
    const canvas = this.canvas;
    const active = canvas.getActiveObject();
    if (!active) return { success: false };

    const w = canvas.getWidth();
    const h = canvas.getHeight();

    const update = {};

    // 中央座標 → 左上座標へ変換
    if (typeof detail.x === "number") {
      update.left = detail.x + w / 2;
    }
    if (typeof detail.y === "number") {
      update.top = detail.y + h / 2;
    }

    if (typeof detail.angle === "number") {
      update.angle = detail.angle;
    }
    if (typeof detail.scaleX === "number") {
      update.scaleX = detail.scaleX;
    }
    if (typeof detail.scaleY === "number") {
      update.scaleY = detail.scaleY;
    }

    active.set(update);
    active.setCoords();
    canvas.requestRenderAll();

    return { success: true };
  }

  // =========================================================
  // canvas → selection 反映
  // =========================================================
  notifySelectionPanels() {
    const canvas = this.canvas;
    const active = canvas.getActiveObject();

    const metaIndex =
      active && typeof active.metaIndex === "number"
        ? active.metaIndex
        : null;

    // レイヤー（右側）へ通知
    window.dispatchEvent(
      new CustomEvent("layers:activeChanged", {
        detail: { index: metaIndex, objectType: active?.type || null }
      })
    );

    // 選択解除
    if (!active || metaIndex === null) {
      window.dispatchEvent(
        new CustomEvent("selection:changed", { detail: { index: null } })
      );
      return;
    }

    const w = canvas.getWidth();
    const h = canvas.getHeight();

    // 左上座標 → 中央座標へ変換
    const logicalX = (active.left ?? 0) - w / 2;
    const logicalY = (active.top ?? 0) - h / 2;

    window.dispatchEvent(
      new CustomEvent("selection:changed", {
        detail: {
          index: metaIndex,
          partName: active.partName || null,
          partCategory: active.partCategory || null,
          x: logicalX,
          y: logicalY,
          angle: active.angle ?? 0,
          scaleX: active.scaleX ?? 1,
          scaleY: active.scaleY ?? 1
        }
      })
    );
  }
}
