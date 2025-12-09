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

  enum category: {
    contour:   "contour",    # 輪郭
    eye:       "eye",        # 目
    mouth:     "mouth",      # 口
    antenna:   "antenna",    # アンテナ
    accessory: "accessory"  # その他
  }, _prefix: true

  enum default_tone_code: {
    primary_full:   0, # 赤
    primary_tint:   1, # 赤 + 白
    neutral:        2, # 白
    secondary_tint: 3, # 白 + 黒
    secondary_full: 4  # 黒
  }, _prefix: true

  validates :category, presence: true
  validates :name, presence: true
  validates :asset_path, presence: true
end
