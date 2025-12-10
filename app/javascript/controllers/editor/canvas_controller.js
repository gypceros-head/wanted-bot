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

    const paperColor = this.hasPaperColorValue ? this.paperColorValue : "#f8f0d8";

    this.setupCanvas(paperColor);
    this.restoreFromStateField();
    this.subscribePaletteInsert();

    this.fabricCanvas.renderAll();
  }

  disconnect() {
    console.log("[editor--canvas] disconnect");
    this.unsubscribePaletteInsert();
  }

  // ===== 初期化まわり =====

  setupCanvas(paperColor) {
    this.fabricCanvas = new fabric.Canvas(this.canvasTarget, {
      width: 480,
      height: 640,
      backgroundColor: paperColor
    });

    // 念のため直接プロパティもセット
    this.fabricCanvas.backgroundColor = paperColor;
    this.fabricCanvas.requestRenderAll();
  }

  restoreFromStateField() {
    if (!this.hasStateFieldTarget || !this.stateFieldTarget.value) {
      this.addDebugRectAtCenter();
      return;
    }

    let initialJson = null;

    try {
      initialJson = JSON.parse(this.stateFieldTarget.value);
      console.log("[editor--canvas] initialJson", initialJson);
    } catch (e) {
      console.warn("[editor--canvas] stateField の JSON パースに失敗しました", e);
    }

    if (!initialJson || !Array.isArray(initialJson.objects) || initialJson.objects.length === 0) {
      this.addDebugRectAtCenter();
      return;
    }

    initialJson.objects.forEach((obj) => {
      const type = (obj.type || "").toLowerCase();

      // いまのところ rect のみ再現（将来必要になれば Path 等も追加）
      if (type === "rect") {
        const rect = new fabric.Rect({
          left: obj.left ?? 100,
          top: obj.top ?? 100,
          width: obj.width ?? 120,
          height: obj.height ?? 80,
          fill: obj.fill || "#cc3333",
          scaleX: obj.scaleX ?? 1,
          scaleY: obj.scaleY ?? 1,
          angle: obj.angle ?? 0,
          flipX: obj.flipX ?? false,
          flipY: obj.flipY ?? false
        });

        this.fabricCanvas.add(rect);
      }
    });

    if (this.fabricCanvas.getObjects().length === 0) {
      this.addDebugRectAtCenter();
    }
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

    // ★ 位置情報＋メタ情報をすべて set でまとめて設定
    img.set({
      originX: "center",
      originY: "center",
      left: centerX,
      top: centerY,

      // メタ情報（toJSON で拾いたいもの）
      partId:       meta.partId ? Number(meta.partId) : null,
      partName:     meta.name,
      partCategory: meta.category,
      toneCode:     "neutral"
    });

    img.setCoords();
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();

    // デバッグ用ログ（ちゃんと載っているか確認）
    console.log("[editor--canvas] inserted image meta", {
      partId: img.partId,
      partName: img.partName,
      partCategory: img.partCategory,
      toneCode: img.toneCode
    });
  }

  // ===== デフォルトオブジェクト =====

  // 中央にデバッグ用の赤い四角を置く
  addDebugRectAtCenter() {
    const canvas = this.fabricCanvas;
    if (!canvas) return;

    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;

    const rect = new fabric.Rect({
      left: centerX,
      top: centerY,
      originX: "center",
      originY: "center",
      width: 120,
      height: 80,
      fill: "#cc3333"
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();

    console.log("[editor--canvas] addDebugRectAtCenter added");
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
}