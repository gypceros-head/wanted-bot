import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="editor--palette"
export default class extends Controller {
  static targets = ["tab", "panel", "scrollContainer"];

  // ===== ライフサイクル =====

  connect() {
    console.log("[editor--palette] connect");

    if (this.tabTargets.length === 0 || this.panelTargets.length === 0) return;

    // 初期アクティブタブ：bg-slate-800 がついているもの / なければ先頭
    const activeTab =
      this.tabTargets.find((tab) =>
        tab.classList.contains("bg-slate-800")
      ) || this.tabTargets[0];

    const category = activeTab.dataset.category;
    if (category) {
      this.activateTab(category);
    }
  }

  // ===== タブ切り替え =====

  select(event) {
    event.preventDefault();

    const category = event.currentTarget.dataset.category;
    if (!category) return;

    this.activateTab(category);
  }

  activateTab(category) {
    // タブの見た目切り替え
    this.tabTargets.forEach((tab) => {
      const isActive = tab.dataset.category === category;

      tab.classList.toggle("bg-slate-800", isActive);
      tab.classList.toggle("text-white", isActive);

      tab.classList.toggle("bg-white", !isActive);
      tab.classList.toggle("text-gray-700", !isActive);
    });

    // パネル（カテゴリごとのリスト）表示／非表示
    this.panelTargets.forEach((panel) => {
      const isActive = panel.dataset.category === category;
      panel.classList.toggle("hidden", !isActive);
    });
  }

  // ===== タブスクロール（左右矢印） =====

  scrollLeft() {
    if (!this.hasScrollContainerTarget) return;
    this.scrollContainerTarget.scrollBy({ left: -120, behavior: "smooth" });
  }

  scrollRight() {
    if (!this.hasScrollContainerTarget) return;
    this.scrollContainerTarget.scrollBy({ left: 120, behavior: "smooth" });
  }

  // ===== パーツクリック → Canvas へ通知 =====

  insert(event) {
    event.preventDefault();

    const el = event.currentTarget;
    const partId = el.dataset.partId;
    const assetUrl = el.dataset.partAssetUrl;
    const category = el.dataset.partCategory || "";
    const name = el.title || "";

    console.log("[editor--palette] insert clicked", {
      partId,
      assetUrl,
      category,
      name
    });

    if (!assetUrl) {
      console.warn("[editor--palette] assetUrl がありません");
      return;
    }

    window.dispatchEvent(
      new CustomEvent("palette:insert", {
        detail: {
          partId: partId ? Number(partId) : null,
          assetUrl,
          category,
          name
        }
      })
    );
  }
}
