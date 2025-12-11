import { Controller } from "@hotwired/stimulus";

// スナップ刻み値（ここを変えれば挙動をまとめて調整できます）
const POSITION_SNAP = 10;
const ANGLE_SNAP = 15;
const SCALE_SNAP_PERCENT = 10;

const EPS = 1e-6;

// 「下方向」スナップ: 必ず一つ下のグリッドへ動かす
function snapDownToGrid(value, step) {
  const k = Math.floor(value / step);
  let snapped = k * step;

  // ちょうどグリッド上にいる場合は、必ず一つ下へ
  if (Math.abs(value - snapped) < EPS) {
    snapped -= step;
  }

  return snapped;
}

// 「上方向」スナップ: 既にグリッド上なら一つ上へ、それ以外は次のグリッドへ
function snapUpToGrid(value, step) {
  const k = Math.floor(value / step);
  const snapped = k * step;

  if (Math.abs(value - snapped) < EPS) {
    // ちょうどグリッド上 → さらに一つ上
    return snapped + step;
  } else {
    // それ以外 → 次のグリッド
    return (k + 1) * step;
  }
}

// Connects to data-controller="editor--selection"
export default class extends Controller {
  static targets = [
    "emptyMessage",
    "detailPanel",
    "partName",
    "partCategory",
    "xInput",
    "yInput",
    "angleInput",
    "scaleXInput",
    "scaleYInput"
  ];

  // ==========================
  // ライフサイクル
  // ==========================
  connect() {
    console.log("[editor--selection] connect");

    // 現在選択中パーツの状態
    this.current = {
      index: null,
      partName: null,
      partCategory: null,
      x: 0,
      y: 0,
      angle: 0,
      scaleX: 1,
      scaleY: 1
    };

    // selection:changed を購読（canvas_controller から飛んでくる）
    this.handleSelectionChanged = this.handleSelectionChanged.bind(this);
    window.addEventListener("selection:changed", this.handleSelectionChanged);

    // 初期状態は「未選択」表示
    this.showEmptyState();
  }

  disconnect() {
    window.removeEventListener("selection:changed", this.handleSelectionChanged);
  }

  // ==========================
  // 内部 state ユーティリティ
  // ==========================
  hasSelection() {
    return this.current && this.current.index !== null;
  }

  // ==========================
  // selection:changed を受け取る
  // ==========================
  handleSelectionChanged(event) {
    const detail = event.detail || {};
    const index = detail.index;

    if (index === null || index === undefined) {
      // 選択解除
      this.current.index = null;
      this.showEmptyState();
      return;
    }

    // 選択あり
    this.current = {
      index,
      partName: detail.partName || null,
      partCategory: detail.partCategory || null,
      x: typeof detail.x === "number" ? detail.x : 0,
      y: typeof detail.y === "number" ? detail.y : 0,
      angle: typeof detail.angle === "number" ? detail.angle : 0,
      scaleX: typeof detail.scaleX === "number" ? detail.scaleX : 1,
      scaleY: typeof detail.scaleY === "number" ? detail.scaleY : 1
    };

    this.showDetailState();
    this.updateUIFromState();
  }

  // ==========================
  // 表示状態の切り替え
  // ==========================
  // 未選択状態表示
  showEmptyState() {
    if (this.hasEmptyMessageTarget) {
      this.emptyMessageTarget.classList.remove("hidden");
    }
    if (this.hasDetailPanelTarget) {
      this.detailPanelTarget.classList.add("hidden");
    }
  }

  // 詳細表示状態
  showDetailState() {
    if (this.hasEmptyMessageTarget) {
      this.emptyMessageTarget.classList.add("hidden");
    }
    if (this.hasDetailPanelTarget) {
      this.detailPanelTarget.classList.remove("hidden");
    }
  }

  // 現在 state -> UI に反映
  updateUIFromState() {
    const s = this.current;

    if (this.hasPartNameTarget) {
      this.partNameTarget.textContent = s.partName || "（名称未設定）";
    }
    if (this.hasPartCategoryTarget) {
      this.partCategoryTarget.textContent = s.partCategory
        ? `/ ${s.partCategory}`
        : "/ unknown";
    }

    if (this.hasXInputTarget) {
      this.xInputTarget.value = Math.round(s.x);
    }
    if (this.hasYInputTarget) {
      this.yInputTarget.value = Math.round(s.y);
    }
    if (this.hasAngleInputTarget) {
      this.angleInputTarget.value = Math.round(s.angle);
    }

    const scaleXPercent = Math.round((s.scaleX || 1) * 100);
    const scaleYPercent = Math.round((s.scaleY || 1) * 100);

    if (this.hasScaleXInputTarget) {
      this.scaleXInputTarget.value = scaleXPercent;
    }
    if (this.hasScaleYInputTarget) {
      this.scaleYInputTarget.value = scaleYPercent;
    }
  }

  // ==========================
  // X / Y 座標（スナップ付き）
  // ==========================
  incrementX(event) {
    event.preventDefault();
    this.adjustPosition("x", "up");
  }

  decrementX(event) {
    event.preventDefault();
    this.adjustPosition("x", "down");
  }

  incrementY(event) {
    event.preventDefault();
    this.adjustPosition("y", "up");
  }

  decrementY(event) {
    event.preventDefault();
    this.adjustPosition("y", "down");
  }

  // X/Y の共通処理
  adjustPosition(axis, direction) {
    if (!this.hasSelection()) return;

    const current = this.current[axis] || 0;
    const snapFn = direction === "up" ? snapUpToGrid : snapDownToGrid;
    const next = snapFn(current, POSITION_SNAP);

    this.applyTransform({ [axis]: next });
  }

  updateXFromInput() {
    if (!this.hasSelection()) return;

    const raw = parseFloat(this.xInputTarget.value);
    if (Number.isNaN(raw)) return;

    this.applyTransform({ x: raw });
  }

  updateYFromInput() {
    if (!this.hasSelection()) return;

    const raw = parseFloat(this.yInputTarget.value);
    if (Number.isNaN(raw)) return;

    this.applyTransform({ y: raw });
  }

  // ==========================
  // 回転
  // ==========================
  incrementAngle(event) {
    event.preventDefault();
    if (!this.hasSelection()) return;

    const current = this.current.angle || 0;
    const next = snapUpToGrid(current, ANGLE_SNAP);
    this.applyTransform({ angle: next });
  }

  decrementAngle(event) {
    event.preventDefault();
    if (!this.hasSelection()) return;

    const current = this.current.angle || 0;
    const next = snapDownToGrid(current, ANGLE_SNAP);
    this.applyTransform({ angle: next });
  }

  updateAngleFromInput() {
    if (!this.hasSelection()) return;

    let raw = parseFloat(this.angleInputTarget.value);
    if (Number.isNaN(raw)) return;

    // 角度の範囲はとりあえず -360〜360 にクランプ
    if (raw > 360) raw = 360;
    if (raw < -360) raw = -360;

    this.applyTransform({ angle: raw });
  }

  // ==========================
  // 拡大率 X / Y（%）
  // ==========================
  incrementScaleX(event) {
    event.preventDefault();
    this.adjustScale("scaleX", "up");
  }

  decrementScaleX(event) {
    event.preventDefault();
    this.adjustScale("scaleX", "down");
  }

  incrementScaleY(event) {
    event.preventDefault();
    this.adjustScale("scaleY", "up");
  }

  decrementScaleY(event) {
    event.preventDefault();
    this.adjustScale("scaleY", "down");
  }

  // scaleX/scaleY の共通処理
  adjustScale(axis, direction) {
    if (!this.hasSelection()) return;

    const currentPercent = Math.round((this.current[axis] || 1) * 100);
    const snapFn = direction === "up" ? snapUpToGrid : snapDownToGrid;
    const snapped = snapFn(currentPercent, SCALE_SNAP_PERCENT);
    const nextPercent = Math.max(10, snapped); // ★ 下限 10%

    this.applyTransform({ [axis]: nextPercent / 100.0 });
  }

  updateScaleXFromInput() {
    if (!this.hasSelection()) return;

    let rawPercent = parseFloat(this.scaleXInputTarget.value);
    if (Number.isNaN(rawPercent)) return;

    // 10%〜400% に制限
    if (rawPercent < 10) rawPercent = 10;
    if (rawPercent > 400) rawPercent = 400;

    this.applyTransform({ scaleX: rawPercent / 100.0 });
  }

  updateScaleYFromInput() {
    if (!this.hasSelection()) return;

    let rawPercent = parseFloat(this.scaleYInputTarget.value);
    if (Number.isNaN(rawPercent)) return;

    // 10%〜400% に制限
    if (rawPercent < 10) rawPercent = 10;
    if (rawPercent > 400) rawPercent = 400;

    this.applyTransform({ scaleY: rawPercent / 100.0 });
  }

  // ==========================
  // 共通: state 更新 + Canvas へ通知
  // ==========================
  applyTransform(partial) {
    if (!this.hasSelection()) return;

    // state 更新（Fabric の内部表現に合わせて scale は倍率）
    const next = { ...this.current };

    if (typeof partial.x === "number") next.x = partial.x;
    if (typeof partial.y === "number") next.y = partial.y;
    if (typeof partial.angle === "number") next.angle = partial.angle;
    if (typeof partial.scaleX === "number") next.scaleX = partial.scaleX;
    if (typeof partial.scaleY === "number") next.scaleY = partial.scaleY;

    this.current = next;

    // Canvas 側に伝える payload（存在する項目だけ渡す）
    const payload = {};

    if (typeof partial.x === "number") payload.x = next.x;
    if (typeof partial.y === "number") payload.y = next.y;
    if (typeof partial.angle === "number") payload.angle = next.angle;
    if (typeof partial.scaleX === "number") payload.scaleX = next.scaleX;
    if (typeof partial.scaleY === "number") payload.scaleY = next.scaleY;

    window.dispatchEvent(
      new CustomEvent("selection:transform", {
        detail: payload
      })
    );

    // 自パネルの UI も更新しておく
    this.updateUIFromState();
  }

  // ==========================
  // Enter キーで form submit させず、その場で値を反映
  // ==========================
  suppressEnter(event) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;

    // X
    if (this.hasXInputTarget && target === this.xInputTarget) {
      this.updateXFromInput();
      return;
    }

    // Y
    if (this.hasYInputTarget && target === this.yInputTarget) {
      this.updateYFromInput();
      return;
    }

    // 角度
    if (this.hasAngleInputTarget && target === this.angleInputTarget) {
      this.updateAngleFromInput();
      return;
    }

    // 拡大率 X
    if (this.hasScaleXInputTarget && target === this.scaleXInputTarget) {
      this.updateScaleXFromInput();
      return;
    }

    // 拡大率 Y
    if (this.hasScaleYInputTarget && target === this.scaleYInputTarget) {
      this.updateScaleYFromInput();
      return;
    }
  }
}
