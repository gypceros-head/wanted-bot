# == Schema Information
#
# Table name: parts
#
#  id                :bigint           not null, primary key
#  asset_path        :string           not null
#  category          :string           not null
#  default_tone_code :integer          default("neutral"), not null
#  name              :string           not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_parts_on_category  (category)
#
class Part < ApplicationRecord
  has_many :assemblies, dependent: :destroy
  has_many :blueprints, through: :assemblies

  enum :category, {
    head_base: "head_base",
    helmet:    "helmet",
    goggle:    "goggle",
    eye:       "eye",
    nose:      "nose",
    mask:      "mask",
    mouth:     "mouth",
    chin:      "chin",
    accessory: "accessory",
    basic:    "basic"
  }, prefix: true

    CATEGORY_MAP = {
    "helmet"    => "helmet",
    "goggle"    => "goggle",
    "eye"       => "eye",
    "nose"      => "nose",
    "mask"      => "mask",
    "mouth"     => "mouth",
    "chin"      => "chin",
    "head_base" => "head_base",
    "accessory" => "accessory",
    "basic"     => "basic",

    "eyes"       => "eye",
    "mouths"     => "mouth",
    "helmets"    => "helmet",
    "goggles"    => "goggle",
    "acc"        => "accessory",
    "basics"     => "basic",
  }.freeze

    CATEGORY_LABELS = {
    "helmet"    => "ヘルメット",
    "goggle"    => "ゴーグル",
    "eye"       => "目",
    "nose"      => "鼻",
    "mask"      => "マスク",
    "mouth"     => "口",
    "chin"      => "あご",
    "head_base" => "頭ベース",
    "accessory" => "アクセサリ",
    "basic"    => "基本図形"
  }.freeze

  def category_label
    CATEGORY_LABELS[category] || category
  end

  enum :default_tone_code, {
    primary_full:   0, # 赤
    primary_tint:   1, # 赤 + 白
    neutral:        2, # 白
    secondary_tint: 3, # 白 + 黒
    secondary_full: 4  # 黒
  }, prefix: true

  validates :category, presence: true
  validates :name, presence: true
  validates :asset_path, presence: true
end
