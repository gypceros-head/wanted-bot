import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="editor--layers"
export default class extends Controller {
  static values = {
    index: Number
  };

  static targets = ["visibilityToggle"];

  // レイヤー行クリック → 該当パーツを選択
  select(event) {
    const index = this.indexValue;
    console.log("[editor--layers] select", { index });

    window.dispatchEvent(
      new CustomEvent("layers:select", {
        detail: { index }
      })
    );
  }

  // 表示・非表示トグル
  toggleVisibility(event) {
    event.stopPropagation(); // 行クリック(select)が発火しないように
    const index = this.indexValue;
    const visible = event.currentTarget.checked;

    console.log("[editor--layers] toggleVisibility", { index, visible });

    window.dispatchEvent(
      new CustomEvent("layers:toggleVisibility", {
        detail: { index, visible }
      })
    );
  }

  // ==== DOM 上の行を 1 つ上下に動かすユーティリティ ====
  moveRowInDom(direction) {
    const row = this.element;
    const parent = row.parentElement;
    if (!parent) return;

    if (direction === "up") {
      const prev = row.previousElementSibling;
      if (prev) {
        parent.insertBefore(row, prev);
      }
    } else if (direction === "down") {
      const next = row.nextElementSibling;
      if (next) {
        parent.insertBefore(next, row);
      }
    }
  }

  // 上に移動（前面へ）
  moveUp(event) {
    event.stopPropagation();
    const index = this.indexValue;

    console.log("[editor--layers] moveUp", { index });

    // キャンバス側へイベント送信
    window.dispatchEvent(
      new CustomEvent("layers:move", {
        detail: { index, direction: "up" }
      })
    );

    // DOM 上の行も 1 つ上に移動（見た目を合わせる）
    this.moveRowInDom("up");
  }

  // 下に移動（背面へ）
  moveDown(event) {
    event.stopPropagation();
    const index = this.indexValue;

    console.log("[editor--layers] moveDown", { index });

    // キャンバス側へイベント送信
    window.dispatchEvent(
      new CustomEvent("layers:move", {
        detail: { index, direction: "down" }
      })
    );

    // DOM 上の行も 1 つ下に移動（見た目を合わせる）
    this.moveRowInDom("down");
  }
}
