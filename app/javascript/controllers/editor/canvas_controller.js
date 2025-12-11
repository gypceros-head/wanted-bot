import { Controller } from "@hotwired/stimulus";
import * as fabric from "fabric";

// Connects to data-controller="editor--canvas"
export default class extends Controller {
  static targets = ["canvas", "stateField", "nameField"];
  static values = {
    paperColor: String
  };

  // ===== ライフサイクル =====

 connect() {
    console.log("[editor--canvas] connect!", this.canvasTarget);

    // metaIndex 採番用カウンタ
    this.nextMetaIndex = 0;

    const paperColor = this.hasPaperColorValue ? this.paperColorValue : "#f8f0d8";

    this.setupCanvas(paperColor);
    this.restoreFromStateField();

    // パレットからの挿入イベント購読
    this.subscribePaletteInsert();

    // ★ レイヤー関連イベント購読
    this.subscribeLayerEvents();
    this.setupFabricSelectionEvents();

    this.fabricCanvas.renderAll();
  }

  disconnect() {
    console.log("[editor--canvas] disconnect");

    // パレットからの挿入イベント購読解除
    this.unsubscribePaletteInsert();

    // ★ レイヤー関連イベント購読解除
    this.unsubscribeLayerEvents();

    // ★ Fabric の selection イベント解除
    if (this.fabricCanvas && this.handleFabricSelection) {
      this.fabricCanvas.off("selection:created", this.handleFabricSelection);
      this.fabricCanvas.off("selection:updated", this.handleFabricSelection);
      this.fabricCanvas.off("selection:cleared", this.handleFabricSelection);
    }
  }

  // ===== 初期化まわり =====

  setupCanvas(paperColor) {
    this.fabricCanvas = new fabric.Canvas(this.canvasTarget, {
      width: 480,
      height: 640,
      backgroundColor: paperColor,
      preserveObjectStacking: true
    });

    // 念のため直接プロパティもセット
    this.fabricCanvas.backgroundColor = paperColor;
    this.fabricCanvas.requestRenderAll();

    // ★ 選択状態の変化を監視
    this.handleFabricSelection = this.handleFabricSelection.bind(this);
    this.fabricCanvas.on("selection:created", this.handleFabricSelection);
    this.fabricCanvas.on("selection:updated", this.handleFabricSelection);
    this.fabricCanvas.on("selection:cleared", this.handleFabricSelection);
  }

  setupFabricSelectionEvents() {
    if (!this.fabricCanvas) return;

    // 新しく選択されたとき
    this.fabricCanvas.on("selection:created", (e) => {
      this.handleFabricSelection(e);
    });

    // 選択が更新されたとき（別のオブジェクトに移った等）
    this.fabricCanvas.on("selection:updated", (e) => {
      this.handleFabricSelection(e);
    });

    // 選択がクリアされたとき
    this.fabricCanvas.on("selection:cleared", () => {
      console.log("[editor--canvas] handleFabricSelection (cleared)");

      window.dispatchEvent(
        new CustomEvent("layers:activeChanged", {
          detail: { index: null, objectType: null }
        })
      );
    });
  }

  restoreFromStateField() {
    if (!this.hasStateFieldTarget || !this.stateFieldTarget.value) {
      // 初期状態：空キャンバスのまま
      return;
    }

    let state = null;

    try {
      state = JSON.parse(this.stateFieldTarget.value);
      console.log("[editor--canvas] initialJson", state);
    } catch (e) {
      console.warn("[editor--canvas] stateField の JSON パースに失敗しました", e);
      // パース失敗時も空のまま
      return;
    }

    if (!state || !Array.isArray(state.objects) || state.objects.length === 0) {
      // オブジェクトが無ければ何も復元しない
      return;
    }

    const meta = state.meta || [];

    // 背景色が保存されていれば、先にセットしておく（念のため）
    if (state.background) {
      this.fabricCanvas.backgroundColor = state.background;
    }

    this.fabricCanvas
      .loadFromJSON(state)
      .then(() => {
        const objects = this.fabricCanvas.getObjects();
        console.log("[editor--canvas] loadFromJSON done, objects:", objects.length);

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

        // ★ 既存オブジェクトの metaIndex から「次の採番値」を決める
        let maxMetaIndex = -1;
        objects.forEach((obj) => {
          if (typeof obj.metaIndex === "number" && obj.metaIndex > maxMetaIndex) {
            maxMetaIndex = obj.metaIndex;
          }
        });
        this.nextMetaIndex = maxMetaIndex + 1;
        console.log("[editor--canvas] init nextMetaIndex", this.nextMetaIndex);

        this.fabricCanvas.requestRenderAll();
        console.log("[editor--canvas] canvas renderAll after restore");
      })
      .catch((e) => {
        console.warn("[editor--canvas] loadFromJSON failed", e);
        this.fabricCanvas.requestRenderAll();
      });
  }

  // ===== パレット（左カラム）との連携 =====

  subscribePaletteInsert() {
    // this をバインドした handler を 1 箇所で管理
    this.boundPaletteHandler = this.handlePaletteInsert.bind(this);
    window.addEventListener("palette:insert", this.boundPaletteHandler);
  }

  unsubscribePaletteInsert() {
    if (this.boundPaletteHandler) {
      window.removeEventListener("palette:insert", this.boundPaletteHandler);
    }
  }

  // パーツサムネイルから呼ばれる
  handlePaletteInsert(event) {
    const detail = event.detail || {};
    const { partId, assetUrl, name, category } = detail;

    console.log("[editor--canvas] handlePaletteInsert", detail);

    if (!assetUrl) {
      console.warn("[editor--canvas] assetUrl がありません");
      return;
    }

    const url = assetUrl;
    console.log("[editor--canvas] loading IMAGE from URL (Promise):", url);

    const ImageClass = this.resolveImageClass();
    if (!ImageClass) return;

    const result = ImageClass.fromURL(url, {
      crossOrigin: "anonymous"
    });

    if (!result || typeof result.then !== "function") {
      console.warn(
        "[editor--canvas] fromURL が Promise を返しません。想定外のシグネチャです",
        { result }
      );
      return;
    }

    result
      .then((img) => {
        if (!img) {
          console.warn("[editor--canvas] fromURL の結果 img が null/undefined です");
          return;
        }

        console.log("[editor--canvas] image loaded (Promise)", {
          className: img.constructor && img.constructor.name,
          type: img.type,
          width: img.width,
          height: img.height
        });

        this.insertImageToCenter(img, { partId, name, category });
      })
      .catch((error) => {
        console.error("[editor--canvas] ImageClass.fromURL でエラー発生", error);
      });
  }

  resolveImageClass() {
    const ImageClass = fabric.FabricImage || fabric.Image;

    if (!ImageClass) {
      console.error("[editor--canvas] FabricImage / Image クラスが見つかりません", {
        FabricImage: fabric.FabricImage,
        Image: fabric.Image
      });
      return null;
    }

    if (typeof ImageClass.fromURL !== "function") {
      console.error("[editor--canvas] ImageClass.fromURL が定義されていません", {
        ImageClass
      });
      return null;
    }

    return ImageClass;
  }

  insertImageToCenter(img, meta) {
    const canvas = this.fabricCanvas;
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    // キャンバスの 60% に収まるようスケーリング
    const maxWidth = canvasWidth * 0.6;
    const maxHeight = canvasHeight * 0.6;

    const rawWidth = img.width || 100;
    const rawHeight = img.height || 100;

    const scaleX = maxWidth / rawWidth;
    const scaleY = maxHeight / rawHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    if (scale > 0 && scale !== 1) {
      img.scale(scale);
    }

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // ★ 新しい metaIndex を付与（= 現在のオブジェクト数）
    const newMetaIndex = this.nextMetaIndex++;

    img.set({
      originX: "center",
      originY: "center",
      left: centerX,
      top: centerY,

      // メタ情報
      partId:       meta.partId ? Number(meta.partId) : null,
      partName:     meta.name,
      partCategory: meta.category,
      toneCode:     "neutral",

      // ★ これが重要：レイヤーのユニークインデックス
      metaIndex: newMetaIndex
    });

    img.setCoords();
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();

    console.log("[editor--canvas] inserted image meta", {
      partId: img.partId,
      partName: img.partName,
      metaIndex: img.metaIndex
    });

    // ★ 新規レイヤーを右カラムへ通知（重要）
    window.dispatchEvent(
      new CustomEvent("layers:added", {
        detail: {
          index: newMetaIndex,
          partId: img.partId,
          partName: img.partName,
          partCategory: img.partCategory,
          toneCode: img.toneCode
        }
      })
    );

    // ★ 選択中レイヤーも通知
    this.notifyActiveLayer(img);
  }

  // フォーム送信時
  handleSubmit(event) {
    const canvas = this.fabricCanvas;

    // 1. Fabric 標準の JSON（見た目の再現用）
    const fabricJson = canvas.toJSON();
    console.log("[editor--canvas] handleSubmit fabricJson", fabricJson);

    // 2. Assemblies 用のメタ情報を自前で組み立てる
    const metaObjects = canvas.getObjects().map((obj, index) => {
      // Fabric.Image / Rect など共通で使えるプロパティだけ拾う
      return {
        index,                             // レイヤー順のベース
        type: obj.type || null,
        left: obj.left ?? 0,
        top: obj.top ?? 0,
        scaleX: obj.scaleX ?? 1,
        scaleY: obj.scaleY ?? 1,
        angle: obj.angle ?? 0,
        flipX: obj.flipX ?? false,
        flipY: obj.flipY ?? false,

        // insertImageToCenter で付けたメタ情報
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

    console.log("[editor--canvas] handleSubmit combined json", json);

    // 3. hidden_field に書き戻し
    if (this.hasStateFieldTarget) {
      this.stateFieldTarget.value = JSON.stringify(json);
    }

    // 4. 設計図名の入力は従来どおり
    if (this.hasNameFieldTarget) {
      const currentName = this.nameFieldTarget.value || "新しい手配書";
      const newName = window.prompt("設計図の名前を入力してください", currentName);

      if (newName === null) {
        event.preventDefault();
        return;
      }

      this.nameFieldTarget.value =
        newName.trim() === "" ? "新しい手配書" : newName.trim();
    }
  }

  // =======================================
  // レイヤーイベントの購読 / 解除
  // =======================================

  subscribeLayerEvents() {
    // bind して this を固定
    this.handleLayerSelect = this.handleLayerSelect.bind(this);
    this.handleLayerToggleVisible = this.handleLayerToggleVisible.bind(this); // ← 名称統一
    this.handleLayerMove = this.handleLayerMove.bind(this);
    this.handleLayerRemove = this.handleLayerRemove?.bind(this);

    window.addEventListener("layers:select", this.handleLayerSelect);
    window.addEventListener("layers:toggleVisible", this.handleLayerToggleVisible); // ★ 名称を 'toggleVisible' に揃える
    window.addEventListener("layers:move", this.handleLayerMove);
    window.addEventListener("layers:remove", this.handleLayerRemove);
  }

  unsubscribeLayerEvents() {
    window.removeEventListener("layers:select", this.handleLayerSelect);
    window.removeEventListener("layers:move", this.handleLayerMove);
    window.removeEventListener("layers:toggleVisible", this.handleLayerToggleVisible); // ★ こちらも揃える
    window.removeEventListener("layers:remove", this.handleLayerRemove);
  }

  // =======================================
  // レイヤー操作用ユーティリティ
  // =======================================

  // metaIndex から対応する Fabric オブジェクトを探す
  findObjectByMetaIndex(metaIndex) {
    const canvas = this.fabricCanvas;
    if (!canvas) return null;

    const objects = canvas.getObjects();
    return objects.find((obj) => obj.metaIndex === metaIndex) || null;
  }

  // =======================================
  // レイヤーイベントハンドラ
  // （layers_controller からの CustomEvent を受け取る）
  // =======================================

  // レイヤー行クリック → 該当オブジェクトを選択
  handleLayerSelect(event) {
    const { index } = event.detail || {};
    console.log("[editor--canvas] handleLayerSelect", { index });

    if (index === undefined) return;

    const target = this.findObjectByMetaIndex(index);
    if (!target) {
      console.warn("[editor--canvas] layer select: object not found for index", index);
      return;
    }

    this.fabricCanvas.setActiveObject(target);
    this.fabricCanvas.requestRenderAll();

    // ★ 選択変更をレイヤー一覧へ通知
    this.notifyActiveLayer(target);
  }

  // 表示 / 非表示切り替え
  handleLayerToggleVisible(event) {
    const { index, visible } = event.detail || {};
    console.log("[editor--canvas] handleLayerToggleVisible", { index, visible });

    if (index === undefined) return;

    const target = this.findObjectByMetaIndex(index);
    if (!target) {
      console.warn("[editor--canvas] toggleVisibility: object not found for index", index);
      return;
    }

    target.visible = !!visible;
    target.dirty = true;
    this.fabricCanvas.requestRenderAll();
  }

  // レイヤーの前面 / 背面移動（▲ / ▼）
  handleLayerMove(event) {
    const { index, direction } = event.detail || {};
    console.log("[editor--canvas] handleLayerMove called", { index, direction });

    if (index === undefined || !direction) return;

    const canvas = this.fabricCanvas;
    if (!canvas) {
      console.warn("[editor--canvas] handleLayerMove: canvas is not ready");
      return;
    }

    // metaIndex から対象オブジェクトを取得
    const target = this.findObjectByMetaIndex(index);
    if (!target) {
      console.warn("[editor--canvas] layer move: object not found for index", index);
      return;
    }

    // 現在の描画順をコピー（0 = 最背面, 最後 = 最前面）
    const currentObjects = canvas.getObjects();
    const from = currentObjects.indexOf(target);

    if (from === -1) {
      console.warn("[editor--canvas] layer move: target not found in canvas objects", {
        index,
        target
      });
      return;
    }

    let to = from;
    if (direction === "up") {
      // 1 つ前面へ
      if (from >= currentObjects.length - 1) {
        console.log("[editor--canvas] already at top, cannot move up");
        return;
      }
      to = from + 1;
    } else if (direction === "down") {
      // 1 つ背面へ
      if (from <= 0) {
        console.log("[editor--canvas] already at bottom, cannot move down");
        return;
      }
      to = from - 1;
    } else {
      console.warn("[editor--canvas] handleLayerMove: unknown direction", direction);
      return;
    }

    console.log(
      "[editor--canvas] BEFORE move stack",
      currentObjects.map((obj, i) => ({
        stackIndex: i,
        metaIndex: obj.metaIndex,
        type: obj.type,
        partId: obj.partId,
        visible: obj.visible
      }))
    );

    // ★ 新しい順序を計算（純粋な配列操作）
    const newOrder = currentObjects.slice();           // コピー
    newOrder.splice(from, 1);                          // 元の位置から取り除く
    newOrder.splice(to, 0, target);                    // 新しい位置に挿入

    // ★ いったん全オブジェクトをキャンバスから remove して、
    //   新しい順番で add し直す（順番 = 描画順）
    currentObjects.slice().forEach((obj) => {
      canvas.remove(obj);
    });

    newOrder.forEach((obj) => {
      canvas.add(obj);
    });

    // 選択状態を維持
    canvas.setActiveObject(target);

    console.log(
      "[editor--canvas] AFTER move stack",
      canvas.getObjects().map((obj, i) => ({
        stackIndex: i,
        metaIndex: obj.metaIndex,
        type: obj.type,
        partId: obj.partId,
        visible: obj.visible
      }))
    );

    canvas.requestRenderAll();

    // ★ 移動後のアクティブレイヤーを通知
    this.notifyActiveLayer(target);
  }

  // ★ キャンバス上でオブジェクト選択が変わったときに呼ばれる想定
  handleFabricSelection(fabricEvent) {
    if (!this.fabricCanvas) return;

    // Fabric の activeObject を取得
    const active = this.fabricCanvas.getActiveObject();

    // metaIndex は restore 時や insert 時にセットしている前提
    const metaIndex  = active && typeof active.metaIndex === "number" ? active.metaIndex : null;
    const objectType = active ? active.type : null;

    console.log("[editor--canvas] handleFabricSelection", {
      metaIndex,
      objectType
    });

    // ★ レイヤー側に「今選択中の index はこれ」と通知するイベントを投げる
    window.dispatchEvent(
      new CustomEvent("layers:activeChanged", {
        detail: {
          index: metaIndex,
          objectType: objectType
        }
      })
    );
  }

  // 明示的に「このオブジェクトがアクティブ」と伝えたいとき用のヘルパ
  notifyActiveLayer(obj) {
    const metaIndex = obj ? obj.metaIndex : null;

    window.dispatchEvent(
      new CustomEvent("layers:activeChanged", {
        detail: { index: metaIndex }
      })
    );
  }

  // レイヤー削除（右カラム「削除」ボタンから）
  handleLayerRemove(event) {
    const { index } = event.detail || {};
    console.log("[editor--canvas] handleLayerRemove", { index });

    if (typeof index !== "number" || !this.fabricCanvas) {
      console.warn("[editor--canvas] handleLayerRemove: invalid index or canvas not ready");
      return;
    }

    const canvas = this.fabricCanvas;
    const objects = canvas.getObjects();

    // metaIndex から対象オブジェクトを検索
    const target = objects.find((obj) => obj.metaIndex === index);
    if (!target) {
      console.warn("[editor--canvas] handleLayerRemove: target not found for index", index);
      return;
    }

    const wasActive = canvas.getActiveObject() === target;

    // キャンバスから削除
    canvas.remove(target);

    if (wasActive) {
      canvas.discardActiveObject();
      // アクティブレイヤー無しをレイヤー一覧に通知
      window.dispatchEvent(
        new CustomEvent("layers:activeChanged", {
          detail: { index: null }
        })
      );
    }

    canvas.requestRenderAll();

    console.log("[editor--canvas] removed object", {
      metaIndex: target.metaIndex,
      partId: target.partId,
      type: target.type
    });
  }
}