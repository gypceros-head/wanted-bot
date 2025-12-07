# == Schema Information
#
# Table name: assemblies
#
#  id           :bigint           not null, primary key
#  layer_order  :integer          not null
#  position_x   :float            not null
#  position_y   :float            not null
#  rotation_deg :float            not null
#  scale_x      :float            not null
#  scale_y      :float            not null
#  tone_code    :integer          default(2), not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  blueprint_id :bigint           not null
#  part_id      :bigint           not null
#
# Indexes
#
#  index_assemblies_on_blueprint_id  (blueprint_id)
#  index_assemblies_on_part_id       (part_id)
#  index_assemblies_on_tone_code     (tone_code)
#
# Foreign Keys
#
#  fk_rails_...  (blueprint_id => blueprints.id)
#  fk_rails_...  (part_id => parts.id)
#
class Assembly < ApplicationRecord
  belongs_to :blueprint
  belongs_to :part

  enum tone_code: {
    primary_full:   0,
    primary_tint:   1,
    neutral:        2,
    secondary_tint: 3,
    secondary_full: 4
  }, _prefix: true

  validates :layer_order, presence: true
  validates :position_x, :position_y,
            :scale_x, :scale_y,
            :rotation_deg,
            presence: true
end
