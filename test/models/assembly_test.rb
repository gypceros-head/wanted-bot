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
#  tone_code    :integer          default("neutral"), not null
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
require "test_helper"

class AssemblyTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
