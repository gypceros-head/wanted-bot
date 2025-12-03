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
require "test_helper"

class PartTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
