// app/javascript/controllers/editor/palette_controller.js
import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="editor--palette"
export default class extends Controller {
  static targets = ["tab", "panel", "scrollContainer"];

  connect() {
    // タブ／パネルが無ければ何もしない
    if (this.tabTargets.length === 0 || this.panelTargets.length === 0) return;

    // 初期アクティブタブ：背景色クラス付き or 先頭
    const activeTab =
      this.tabTargets.find((tab) =>
        tab.classList.contains("bg-slate-800")
      ) || this.tabTargets[0];

    const category = activeTab.dataset.category;
    if (category) {
      this.activateTab(category);
    }
  }

  // タブクリック時
  select(event) {
    event.preventDefault();
    const category = event.currentTarget.dataset.category;
    if (!category) return;
    this.activateTab(category);
  }

  // 指定カテゴリをアクティブ化
  activateTab(category) {
    // タブの見た目切り替え
    this.tabTargets.forEach((tab) => {
      const isActive = tab.dataset.category === category;

      tab.classList.toggle("bg-slate-800", isActive);
      tab.classList.toggle("text-white", isActive);

      tab.classList.toggle("bg-white", !isActive);
      tab.classList.toggle("text-gray-700", !isActive);
    });

    // パネル（カテゴリごとのリスト）を表示／非表示
    this.panelTargets.forEach((panel) => {
      const isActive = panel.dataset.category === category;
      panel.classList.toggle("hidden", !isActive);
    });
  }

  // 左矢印：タブを左方向にスクロール
  scrollLeft() {
    if (!this.hasScrollContainerTarget) return;
    this.scrollContainerTarget.scrollBy({ left: -120, behavior: "smooth" });
  }

  // 右矢印：タブを右方向にスクロール
  scrollRight() {
    if (!this.hasScrollContainerTarget) return;
    this.scrollContainerTarget.scrollBy({ left: 120, behavior: "smooth" });
  }
}
