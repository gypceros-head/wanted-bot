import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="editor--layers"
export default class extends Controller {
  static values = {
    index: Number
  };

  static targets = ["list", "visibilityToggle"];

  connect() {
    // listTarget を持っていれば「パネル用インスタンス」
    this.isPanel = this.hasListTarget;

    if (this.isPanel) {
      console.log("[editor--layers] panel connect");

      // 新規レイヤー追加イベントを購読（コンテナだけ）
      this.handleLayerAdded = this.handleLayerAdded.bind(this);
      window.addEventListener("layers:added", this.handleLayerAdded);
    } else {
      console.log("[editor--layers] row connect index", this.indexValue);

      // 行用インスタンスはアクティブ状態の変更を購読
      this.handleActiveChanged = this.handleActiveChanged.bind(this);
      window.addEventListener("layers:activeChanged", this.handleActiveChanged);

      // 初期状態では非アクティブ表示
      this.setActive(false);
    }
  }

  disconnect() {
    if (this.isPanel) {
      window.removeEventListener("layers:added", this.handleLayerAdded);
    } else {
      window.removeEventListener("layers:activeChanged", this.handleActiveChanged);
    }
  }

  // ===== 行：選択 =====
  select(event) {
    if (this.isPanel) return; // パネルでは何もしない
    event.preventDefault();

    const index = this.indexValue;
    if (typeof index !== "number") return;

    console.log("[editor--layers] select", { index });

    window.dispatchEvent(
      new CustomEvent("layers:select", {
        detail: { index }
      })
    );
  }

  // ===== 行：▲ボタン =====
  moveUp(event) {
    if (this.isPanel) return;
    event.preventDefault();

    const index = this.indexValue;
    console.log("[editor--layers] moveUp", { index });

    // 1. キャンバス側へ「レイヤーを上に動かして」と通知
    window.dispatchEvent(
      new CustomEvent("layers:move", {
        detail: { index, direction: "up" }
      })
    );

    // 2. 自分の行 DOM も 1 つ上へ移動
    this.moveRowInDom("up");
  }

  moveDown(event) {
    if (this.isPanel) return;
    event.preventDefault();

    const index = this.indexValue;
    console.log("[editor--layers] moveDown", { index });

    // 1. キャンバス側へ「レイヤーを下に動かして」と通知
    window.dispatchEvent(
      new CustomEvent("layers:move", {
        detail: { index, direction: "down" }
      })
    );

    // 2. 自分の行 DOM も 1 つ下へ移動
    this.moveRowInDom("down");
  }

  // ===== 行 DOM の上下入れ替え =====
  moveRowInDom(direction) {
    if (this.isPanel) return;

    const row = this.element;
    const parent = row.parentElement;
    if (!parent) return;

    if (direction === "up") {
      const prev = row.previousElementSibling;
      if (prev) {
        // 自分を 1 つ上へ
        parent.insertBefore(row, prev);
      }
    } else if (direction === "down") {
      const next = row.nextElementSibling;
      if (next) {
        // 自分の 1 個下の要素を、自分の上に持ってくる = 自分が 1 つ下へ
        parent.insertBefore(next, row);
      }
    }
  }

  // ===== 行：削除 =====
  remove(event) {
    if (this.isPanel) return;

    event.stopPropagation(); // 行クリック(select)を抑止
    event.preventDefault();

    const index = this.indexValue;
    console.log("[editor--layers] remove", { index });

    window.dispatchEvent(
      new CustomEvent("layers:remove", {
        detail: { index }
      })
    );

    // DOM 上から自分の行を削除
    this.element.remove();
  }

  // ===== 行：表示/非表示トグル =====
  toggleVisible(event) {
    if (this.isPanel) return;

    event.stopPropagation();
    const checked = event.currentTarget.checked;
    const index = this.indexValue;

    console.log("[editor--layers] toggleVisible", { index, visible: checked });

    window.dispatchEvent(
      new CustomEvent("layers:toggleVisible", {
        detail: { index, visible: checked }
      })
    );
  }

  // ===== 行：Canvas → レイヤー行のハイライト反映 =====
  handleActiveChanged(event) {
    const activeIndex = event.detail?.index ?? null;

    const isActive =
      activeIndex !== null &&
      typeof activeIndex === "number" &&
      this.indexValue === activeIndex;

    this.setActive(isActive);
  }

  // 行の見た目の切り替え
  setActive(isActive) {
    const el = this.element;

    el.classList.toggle("bg-white", !isActive);
    el.classList.toggle("border-gray-200", !isActive);

    el.classList.toggle("bg-blue-50", isActive);
    el.classList.toggle("border-blue-400", isActive);
  }

  // ===== パネル：新規レイヤー追加時の処理 =====
  handleLayerAdded(event) {
    if (!this.isPanel) return;

    const info = event.detail;
    console.log("[editor--layers] panel handleLayerAdded", info);

    if (!this.hasListTarget) {
      console.warn("[editor--layers] listTarget が見つかりません(panel)");
      return;
    }

    // 1. レイヤー行 DOM を構築
    const row = document.createElement("div");
    row.className =
      "flex items-center gap-2 p-2 rounded border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer";

    row.setAttribute("data-controller", "editor--layers");
    row.setAttribute("data-editor--layers-index-value", info.index);
    row.setAttribute("data-action", "click->editor--layers#select");

    row.innerHTML = `
      <input type="checkbox"
            checked
            class="h-3 w-3 text-blue-600 rounded border-gray-300"
            data-editor--layers-target="visibilityToggle"
            data-action="click->editor--layers#toggleVisible">

      <div class="flex-1">
        <p class="font-semibold text-gray-800">
          レイヤー ${info.index + 1}：${info.partCategory || "unknown"} / ${info.partName || ("Part #" + info.partId)}
        </p>
        <p class="text-gray-500">
          part_id: #${info.partId} / tone: ${info.toneCode || "neutral"}
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <button type="button"
                class="px-1 py-0.5 rounded border border-gray-300 hover:bg-gray-100"
                data-action="click->editor--layers#moveUp">▲</button>
        <button type="button"
                class="px-1 py-0.5 rounded border border-gray-300 hover:bg-gray-100"
                data-action="click->editor--layers#moveDown">▼</button>
      </div>

      <button type="button"
              class="ml-1 px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 text-[11px]"
              data-action="click->editor--layers#remove">
        削除
      </button>
    `;

    // 2. 一番上に追加（「上 = 前面」）
    this.listTarget.prepend(row);

    // 3. Stimulus が新しい行の controller を connect したあとで、
    //    改めて「この metaIndex をアクティブ」と通知する
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("layers:activeChanged", {
          detail: { index: info.index }
        })
      );
    }, 0);
  }
}
