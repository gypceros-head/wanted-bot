export default class LayerService {
  constructor(canvas) {
    this.canvas = canvas; // fabric.Canvas インスタンス
  }

  // ----------------------------------------
  // レイヤー選択: metaIndex → canvas の activeObject を設定
  // ----------------------------------------
  selectLayer(metaIndex) {
    const obj = this.findObjectByMetaIndex(metaIndex);
    if (!obj) return { success: false };

    this.canvas.setActiveObject(obj);
    this.canvas.requestRenderAll();

    return { success: true, object: obj };
  }

  // ----------------------------------------
  // 表示/非表示
  // ----------------------------------------
  toggleVisible(metaIndex, visible) {
    const obj = this.findObjectByMetaIndex(metaIndex);
    if (!obj) return { success: false };

    obj.visible = !!visible;
    obj.dirty = true;
    this.canvas.requestRenderAll();

    return { success: true, object: obj };
  }

  // ----------------------------------------
  // レイヤー移動（▲ up / ▼ down）
  // ----------------------------------------
  moveLayer(metaIndex, direction) {
    const canvas = this.canvas;
    const objects = canvas.getObjects();
    const target = this.findObjectByMetaIndex(metaIndex);

    if (!target) return { success: false };

    const from = objects.indexOf(target);
    if (from === -1) return { success: false };

    let to = from;

    if (direction === "up" && from < objects.length - 1) {
      to = from + 1;
    } else if (direction === "down" && from > 0) {
      to = from - 1;
    } else {
      // 移動不可（トップ/ボトム）
      return { success: false };
    }

    // ★ 新しい順序を配列操作で決定
    const newOrder = objects.slice();
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, target);

    // ★ Fabric に再セット（remove → add で順序を正しく反映）
    objects.slice().forEach((obj) => canvas.remove(obj));
    newOrder.forEach((obj) => canvas.add(obj));

    canvas.setActiveObject(target);
    canvas.requestRenderAll();

    return { success: true, object: target };
  }

  // ----------------------------------------
  // レイヤー削除
  // ----------------------------------------
  removeLayer(metaIndex) {
    const canvas = this.canvas;
    const target = this.findObjectByMetaIndex(metaIndex);
    if (!target) return { success: false };

    const wasActive = canvas.getActiveObject() === target;

    canvas.remove(target);

    if (wasActive) {
      canvas.discardActiveObject();
    }

    canvas.requestRenderAll();

    return {
      success: true,
      object: null,
      wasActive
    };
  }

  // ----------------------------------------
  // ユーティリティ
  // ----------------------------------------
  findObjectByMetaIndex(metaIndex) {
    const objects = this.canvas.getObjects();
    return objects.find((obj) => obj.metaIndex === metaIndex) || null;
  }
}
