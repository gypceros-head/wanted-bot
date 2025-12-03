# == Schema Information
#
# Table name: blueprints
#
#  id           :bigint           not null, primary key
#  editor_state :jsonb            not null
#  name         :string           not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  post_id      :bigint           not null
#
# Indexes
#
#  index_blueprints_on_post_id  (post_id)
#
# Foreign Keys
#
#  fk_rails_...  (post_id => posts.id)
#
require "test_helper"

class BlueprintTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
