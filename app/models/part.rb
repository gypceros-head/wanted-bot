# == Schema Information
#
# Table name: parts
#
#  id         :bigint           not null, primary key
#  asset_path :string           not null
#  category   :string           not null
#  name       :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
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

  validates :category, presence: true
  validates :name, presence: true
  validates :asset_path, presence: true
end
