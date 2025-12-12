export default class SerializeService {
  constructor(canvas, metaIndexRef) {
    this.canvas = canvas;           // fabric.Canvas インスタンス
    this.metaIndexRef = metaIndexRef; // { value: number } を参照で受け取る
  }

  // =======================================
  // 1) hidden_field の JSON からキャンバスを復元
  // =======================================
  restoreFromField(rawJson) {
    if (!rawJson) return;

    let state = null;

    try {
      state = JSON.parse(rawJson);
      console.log("[SerializeService] parsed state", state);
    } catch (e) {
      console.warn("[SerializeService] JSON parse failed", e);
      return;
    }

    if (!state || !Array.isArray(state.objects) || state.objects.length === 0) {
      // オブジェクトが無い場合は、背景色だけ適用して終了
      if (state && state.background) {
        this.canvas.backgroundColor = state.background;
        this.canvas.requestRenderAll();
      }
      this.metaIndexRef.value = 0;
      return;
    }

    const meta = state.meta || [];

    // 背景色が保存されていれば適用
    if (state.background) {
      this.canvas.backgroundColor = state.background;
    }

    // Fabric v6 の Promise ベース loadFromJSON
    this.canvas
      .loadFromJSON(state)
      .then(() => {
        const objects = this.canvas.getObjects();
        console.log("[SerializeService] loadFromJSON done, objects:", objects.length);

        objects.forEach((obj, index) => {
          const info = meta[index];
          if (!info) return;

          obj.metaIndex    = info.index ?? index;
          obj.partId       = info.partId ?? null;
          obj.partName     = info.partName ?? null;
          obj.partCategory = info.partCategory ?? null;
          obj.toneCode     = info.toneCode ?? "neutral";

          obj.setCoords();
        });

        // 既存オブジェクトの metaIndex から nextMetaIndex を決定
        let maxMetaIndex = -1;
        objects.forEach((obj) => {
          if (typeof obj.metaIndex === "number" && obj.metaIndex > maxMetaIndex) {
            maxMetaIndex = obj.metaIndex;
          }
        });

        const next = maxMetaIndex + 1;
        this.metaIndexRef.value = next; // InsertService 用カウンタを更新
        console.log("[SerializeService] init nextMetaIndex", next);

        this.canvas.requestRenderAll();
      })
      .catch((e) => {
        console.warn("[SerializeService] loadFromJSON failed", e);
      });
  }

  // =======================================
  // 2) 現在の Canvas 状態を JSON 化（保存用）
  // =======================================
  buildStateJson() {
    const canvas = this.canvas;

    // Fabric 標準 JSON
    const fabricJson = canvas.toJSON();
    console.log("[SerializeService] fabricJson", fabricJson);

    // メタ情報（assemblies 用）を組み立てる
    const objects = canvas.getObjects();
    const metaObjects = objects.map((obj, index) => {
      return {
        index: index,
        type: obj.type || null,
        left: obj.left ?? 0,
        top: obj.top ?? 0,
        scaleX: obj.scaleX ?? 1,
        scaleY: obj.scaleY ?? 1,
        angle: obj.angle ?? 0,
        flipX: obj.flipX ?? false,
        flipY: obj.flipY ?? false,

        partId: obj.partId ?? null,
        partName: obj.partName ?? null,
        partCategory: obj.partCategory ?? null,
        toneCode: obj.toneCode ?? "neutral"
      };
    });

    const json = {
      ...fabricJson,
      meta: metaObjects
    };

    console.log("[SerializeService] combined json", json);
    return json;
  }
}
