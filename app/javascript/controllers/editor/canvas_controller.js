import { Controller } from "@hotwired/stimulus";
import InsertService from "../../services/editor/insert_service";
import LayerService from "../../services/editor/layer_service";
import SelectionBridge from "../../services/editor/selection_bridge";
import SerializeService from "../../services/editor/serialize_service";
import * as fabric from "fabric";

// Connects to data-controller="editor--canvas"
export default class extends Controller {
  static targets = ["canvas", "stateField", "nameField", "previewField"];
  static values = {
    paperColor: String
  };

  // =======================================
  // ライフサイクル
  // =======================================

  connect() {
    console.log("[editor--canvas] connect!", this.canvasTarget);

    const paperColor = this.hasPaperColorValue ? this.paperColorValue : "#f8f0d8";

    this.setupCanvas(paperColor);

    // パレットからの挿入イベント購読
    this.subscribePaletteInsert();

    // レイヤー関連イベント購読
    this.subscribeLayerEvents();

    // Fabric selection イベント購読
    this.setupFabricSelectionEvents();

    // 選択パネル（editor--selection）との連携
    this.subscribeSelectionEvents();

    // metaIndex カウンタ（InsertService / SerializeService と共有する参照）
    this.metaIndexRef = { value: 0 };

    this.insertService     = new InsertService(this.fabricCanvas, this.metaIndexRef);
    this.layerService      = new LayerService(this.fabricCanvas);
    this.selectionBridge   = new SelectionBridge(this.fabricCanvas);
    this.serializeService  = new SerializeService(this.fabricCanvas, this.metaIndexRef);

    if (this.hasStateFieldTarget && this.stateFieldTarget.value) {
      this.serializeService.restoreFromField(this.stateFieldTarget.value);
    }

    this.fabricCanvas.renderAll();
  }

  disconnect() {
    console.log("[editor--canvas] disconnect");

    // パレットからの挿入イベント購読解除
    this.unsubscribePaletteInsert();

    // レイヤー関連イベント購読解除
    this.unsubscribeLayerEvents();

    // 選択パネルとの連携解除
    this.unsubscribeSelectionEvents();

    // Fabric の selection / modified イベント解除
    if (this.fabricCanvas && this.handleFabricSelection) {
      this.fabricCanvas.off("selection:created", this.handleFabricSelection);
      this.fabricCanvas.off("selection:updated", this.handleFabricSelection);
      this.fabricCanvas.off("selection:cleared", this.handleFabricSelection);
      this.fabricCanvas.off("object:modified", this.handleFabricSelection);
    }
  }

  // =======================================
  // 初期化まわり（Canvas・復元）
  // =======================================

  setupCanvas(paperColor) {
    Object.assign(fabric.FabricObject.ownDefaults, {
      borderColor: "#db7093",
      // cornerColor: "#db7093",
      cornerStrokeColor: "#db7093",
      cornerStyle: "square",
      transparentCorners: true,
      padding: 4
    });

    this.fabricCanvas = new fabric.Canvas(this.canvasTarget, {
      width: 480,
      height: 640,
      backgroundColor: paperColor,
      preserveObjectStacking: true,
      perPixelTargetFind: true,
      targetFindTolerance: 0
    });

    // 念のため直接プロパティもセット
    this.fabricCanvas.backgroundColor = paperColor;
  }

  setupFabricSelectionEvents() {
    if (!this.fabricCanvas) return;

    // ★ 選択状態の変化を監視
    this.handleFabricSelection = this.handleFabricSelection.bind(this);
    this.fabricCanvas.on("selection:created", this.handleFabricSelection);
    this.fabricCanvas.on("selection:updated", this.handleFabricSelection);
    this.fabricCanvas.on("selection:cleared", this.handleFabricSelection);

    // ★ オブジェクト変形後（ドラッグ終了・回転終了・リサイズ終了）にも反映
    this.fabricCanvas.on("object:modified", this.handleFabricSelection);
  }

  // =======================================
  // フォーム送信（設計図保存）
  // =======================================

  handleSubmit(event) {
    // 1. SerializeService で JSON を構築
    const json = this.serializeService.buildStateJson();

    // 2. hidden_field に書き戻し
    if (this.hasStateFieldTarget) {
      this.stateFieldTarget.value = JSON.stringify(json);
    }

    // 3. PNG を生成して hidden_field に入れる（MVP: dataURLで送る）
    if (this.fabricCanvas && this.hasPreviewFieldTarget) {
      const dataUrl = this.fabricCanvas.toDataURL({
        format: "png",
        multiplier: 2
      });
      this.previewFieldTarget.value = dataUrl;
    }
  }

  // =======================================
  // パレット（左カラム）との連携
  // =======================================

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

  // パーツサムネイルから呼ばれる（SVGベクター版）
  handlePaletteInsert(event) {
    const detail = event.detail || {};
    const { partId, assetUrl, name, category } = detail;

    console.log("[editor--canvas] handlePaletteInsert", detail);

    if (!assetUrl) {
      console.warn("[editor--canvas] assetUrl がありません");
      return;
    }

    const url = assetUrl;
    console.log("[editor--canvas] loading SVG from URL (Promise):", url);

    // Fabric v6 の Promise 版 API を想定
    if (typeof fabric.loadSVGFromURL !== "function") {
      console.error("[editor--canvas] fabric.loadSVGFromURL が見つかりません", fabric);
      return;
    }

    fabric
      .loadSVGFromURL(url)
      .then((result) => {
        // v6 では { objects, options } 形式が返ってくる想定
        const objects = result.objects || result[0] || [];
        const options = result.options || result[1] || {};

        if (!objects || (Array.isArray(objects) && objects.length === 0)) {
          console.warn("[editor--canvas] SVG の objects が空です:", result);
          return;
        }

        console.log("[editor--canvas] SVG loaded (Promise)", {
          objectsCount: Array.isArray(objects) ? objects.length : 1,
          raw: result
        });

        let svgObject;

        if (Array.isArray(objects)) {
          if (objects.length === 1) {
            svgObject = objects[0];
          } else {
            svgObject = new fabric.Group(objects, options);
          }
        } else {
          svgObject = objects;
        }

        if (!svgObject || typeof svgObject.set !== "function") {
          console.warn("[editor--canvas] SVG result is not a fabric object", svgObject);
          return;
        }

        // ベクターパーツをキャンバス中央に追加
        const obj = this.insertService.insertSvg(svgObject, { partId, name, category });
        this.notifyActiveLayer(obj);
      })
      .catch((error) => {
        console.error("[editor--canvas] loadSVGFromURL でエラー発生", error);
      });
  }

  // =======================================
  // レイヤーイベントの購読 / 解除
  // =======================================

  subscribeLayerEvents() {
    // bind して this を固定
    this.handleLayerSelect = this.handleLayerSelect.bind(this);
    this.handleLayerToggleVisible = this.handleLayerToggleVisible.bind(this);
    this.handleLayerMove = this.handleLayerMove.bind(this);
    this.handleLayerRemove = this.handleLayerRemove.bind(this);

    window.addEventListener("layers:select", this.handleLayerSelect);
    window.addEventListener("layers:toggleVisible", this.handleLayerToggleVisible);
    window.addEventListener("layers:move", this.handleLayerMove);
    window.addEventListener("layers:remove", this.handleLayerRemove);
  }

  unsubscribeLayerEvents() {
    if (this.handleLayerSelect) {
      window.removeEventListener("layers:select", this.handleLayerSelect);
    }
    if (this.handleLayerToggleVisible) {
      window.removeEventListener("layers:toggleVisible", this.handleLayerToggleVisible);
    }
    if (this.handleLayerMove) {
      window.removeEventListener("layers:move", this.handleLayerMove);
    }
    if (this.handleLayerRemove) {
      window.removeEventListener("layers:remove", this.handleLayerRemove);
    }
  }

  // レイヤー行クリック → 該当オブジェクトを選択
  handleLayerSelect(event) {
    const { index } = event.detail || {};
    const result = this.layerService.selectLayer(index);

    if (result.success) {
      // selection パネル & layers パネルへ通知
      this.handleFabricSelection();
    }
  }

  // 表示 / 非表示切り替え
  handleLayerToggleVisible(event) {
    const { index, visible } = event.detail || {};
    this.layerService.toggleVisible(index, visible);
  }

  // レイヤーの前面 / 背面移動（▲ / ▼）
  handleLayerMove(event) {
    const { index, direction } = event.detail || {};
    const result = this.layerService.moveLayer(index, direction);

    if (result.success) {
      // 移動後もアクティブを通知
      this.notifyActiveLayer(result.object);
    }
  }

  // レイヤー削除（右カラム「削除」ボタンから）
  handleLayerRemove(event) {
    const { index } = event.detail || {};
    const result = this.layerService.removeLayer(index);

    if (result.success && result.wasActive) {
      window.dispatchEvent(
        new CustomEvent("layers:activeChanged", {
          detail: { index: null }
        })
      );
    }
  }

  // =======================================
  // 選択パネル（editor--selection）との連携
  // =======================================

  subscribeSelectionEvents() {
    this.handleSelectionTransform = this.handleSelectionTransform.bind(this);
    window.addEventListener("selection:transform", this.handleSelectionTransform);
  }

  unsubscribeSelectionEvents() {
    if (this.handleSelectionTransform) {
      window.removeEventListener("selection:transform", this.handleSelectionTransform);
    }
  }

  // selection:transform を受け取り、アクティブオブジェクトに反映
  handleSelectionTransform(event) {
    const detail = event.detail || {};
    const result = this.selectionBridge.applyTransformFromSelection(detail);

    if (result.success) {
      this.selectionBridge.notifySelectionPanels();
    }
  }

  // キャンバス上でオブジェクト選択が変わったときに呼ばれる
  handleFabricSelection(_fabricEvent) {
    this.selectionBridge.notifySelectionPanels();
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
}
