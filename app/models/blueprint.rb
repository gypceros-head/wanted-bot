# == Schema Information
#
# Table name: blueprints
#
#  id              :bigint           not null, primary key
#  dark_ink_color  :string           default("#222222"), not null
#  editor_state    :jsonb            not null
#  light_ink_color :string           default("#cc3333"), not null
#  name            :string           not null
#  paper_color     :string           default("#f8f0d8"), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  post_id         :bigint
#
# Indexes
#
#  index_blueprints_on_post_id  (post_id)
#
# Foreign Keys
#
#  fk_rails_...  (post_id => posts.id)
#
class Blueprint < ApplicationRecord
  belongs_to :post, optional: true

  has_one_attached :preview_image

  has_many :assemblies, dependent: :destroy
  has_many :parts, through: :assemblies

  validates :name, presence: true

  HEX_COLOR_FORMAT = /\A#(?:[0-9a-fA-F]{3}){1,2}\z/

  validates :light_ink_color, format: { with: HEX_COLOR_FORMAT }
  validates :dark_ink_color,  format: { with: HEX_COLOR_FORMAT }
  validates :paper_color,     format: { with: HEX_COLOR_FORMAT }

  # editor_state（Fabric JSON）から assemblies を再生成する
  def sync_assemblies_from_editor_state!
    state = editor_state || {}

    # ★ 新しく追加した meta 配列を優先的に使う
    meta_objects = state["meta"] || []

    ActiveRecord::Base.transaction do
      assemblies.delete_all

      meta_objects.each_with_index do |obj, index|
        part_id = obj["partId"]

        # Part に対応しない（デバッグ Rect 等）はスキップ
        next if part_id.blank?

        assemblies.create!(
          part_id:      part_id,
          layer_order:  index,                       # meta の index 順 = レイヤー順
          position_x:   obj["left"]   || 0.0,
          position_y:   obj["top"]    || 0.0,
          scale_x:      obj["scaleX"] || 1.0,
          scale_y:      obj["scaleY"] || 1.0,
          rotation_deg: obj["angle"]  || 0.0,
          tone_code:    (obj["toneCode"] || "neutral")
        )
      end
    end
  end
end
