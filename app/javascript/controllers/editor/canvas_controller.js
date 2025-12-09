import { Controller } from "@hotwired/stimulus";
import { Canvas, Rect } from "fabric";

export default class extends Controller {
  static targets = ["canvas", "stateField", "nameField"];
  static values = {
    paperColor: String
  };

  connect() {
    console.log("[editor--canvas] connect!", this.canvasTarget);

    const paperColor = this.hasPaperColorValue ? this.paperColorValue : "#f8f0d8";

    this.fabricCanvas = new Canvas(this.canvasTarget, {
      width: 480,
      height: 640
    });

    // 背景色
    this.fabricCanvas.backgroundColor = paperColor;

    // ★ hidden_field（stateField）から初期 JSON を読む
    let initialJson = null;
    if (this.hasStateFieldTarget && this.stateFieldTarget.value) {
      try {
        initialJson = JSON.parse(this.stateFieldTarget.value);
        console.log("[editor--canvas] initialJson", initialJson);
      } catch (e) {
        console.warn("Failed to parse stateField value:", e);
      }
    }

    if (initialJson && Array.isArray(initialJson.objects) && initialJson.objects.length > 0) {
      // Rect を自前復元
      initialJson.objects.forEach((obj) => {
        const type = (obj.type || "").toLowerCase();
        if (type === "rect") {
          const rect = new Rect({
            left:   obj.left   ?? 100,
            top:    obj.top    ?? 100,
            width:  obj.width  ?? 120,
            height: obj.height ?? 80,
            fill:   obj.fill   || "#cc3333",
            scaleX: obj.scaleX ?? 1,
            scaleY: obj.scaleY ?? 1,
            angle:  obj.angle  ?? 0,
            flipX: obj.flipX ?? false,
            flipY: obj.flipY ?? false
          });
          this.fabricCanvas.add(rect);
        }
      });

      if (this.fabricCanvas.getObjects().length === 0) {
        this.addDebugRect();
      }
    } else {
      this.addDebugRect();
    }

    this.fabricCanvas.renderAll();
  }

  addDebugRect() {
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 120,
      height: 80,
      fill: "#cc3333"
    });
    this.fabricCanvas.add(rect);
  }

// ★ フォーム送信の直前に呼ばれる
  handleSubmit(event) {
    // 1. キャンバス状態を JSON にして hidden に書き戻す
    const json = this.fabricCanvas.toJSON();
    console.log("[editor--canvas] handleSubmit", json);

    if (this.hasStateFieldTarget) {
      this.stateFieldTarget.value = JSON.stringify(json);
    }

    // 2. 設計図の名前をポップアップで入力してもらう
    if (this.hasNameFieldTarget) {
      const currentName = this.nameFieldTarget.value || "新しい手配書";
      const newName = window.prompt("設計図の名前を入力してください", currentName);

      // キャンセルされたら送信中止
      if (newName === null) {
        event.preventDefault();
        return;
      }

      // 空ならデフォルト名を入れる
      this.nameFieldTarget.value = newName.trim() === "" ? "新しい手配書" : newName.trim();
    }
    // 3. そのまま submit させる
  }
}
